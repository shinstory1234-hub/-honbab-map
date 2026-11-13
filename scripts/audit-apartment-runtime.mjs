/**
 * 전 가격대 런타임 정합성 검사. 실시간 apt-live.js / apt-geo.js 입력 고정 후 실행.
 * TRANSPORT_INPUTS=./snapshot node scripts/audit-apartment-runtime.mjs
 * No scoring changes, no deployment and no silent fallback on missing inputs.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {run} from './transport-runtime.mjs';
const root=path.resolve(process.argv[2]||'.');
const outputs=[];
let failed=false;
for(const cap of [6,10,15,20,25,30]){
  try{
    const {c,rows,missing}=run(root,cap);
    if(missing.length){
      outputs.push({cap,status:'BLOCKED_MISSING_INPUTS',missing});
      failed=true; continue;
    }
    const details=JSON.parse(vm.runInContext(
      'JSON.stringify(ORDER.map(d=>({key:d.cxKey,name:d.n,area:d.area,py:d.py,p:d.p,units:d.units,score:d.score,rank:d.rank,sourceKey:d.liveKey||null})))',c));
    const low=cap===6?0:cap===10?60000:(cap-5)*10000,high=cap*10000;
    const bandErrors=details.filter(d=>!(d.p>low&&d.p<=high));
    const duplicates=[];const keys=new Set();
    for(const d of details){
      const k=d.key+'|'+d.py;
      if(keys.has(k))duplicates.push(k);
      keys.add(k);
    }
    const rankErrors=details.filter((d,i)=>d.rank!==i+1||(i>0&&details[i-1].score<d.score));
    const badUnits=details.filter(d=>!Number.isFinite(d.units)||d.units<=0);
    const badPrices=details.filter(d=>!Number.isFinite(d.p)||d.p<=0);
    outputs.push({cap,status:bandErrors.length||duplicates.length||rankErrors.length||badUnits.length||badPrices.length?'FAIL':'PASS',
      rows:details.length,bandErrors:bandErrors.slice(0,200),duplicateKeys:duplicates.slice(0,200),
      rankErrorCount:rankErrors.length,badUnitCount:badUnits.length,badPriceCount:badPrices.length});
    if(bandErrors.length||duplicates.length||rankErrors.length||badUnits.length||badPrices.length)failed=true;
  }catch(e){
    failed=true;outputs.push({cap,status:'ERROR',error:String(e?.stack||e)});
  }
}
const dir=path.join(root,'audit-outputs');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'apartment-runtime-audit.json'),
  JSON.stringify({scope:'all six runtime price bands using frozen live and geo input',generatedAt:new Date().toISOString(),outputs},null,2)+'\n');
console.log(JSON.stringify(outputs.map(({cap,status,rows,missing,bandErrors,duplicateKeys,rankErrorCount,badUnitCount,badPriceCount,error})=>
  ({cap,status,rows,missing,bandErrorCount:bandErrors?.length,duplicateCount:duplicateKeys?.length,rankErrorCount,badUnitCount,badPriceCount,error})),null,2));
if(failed)process.exitCode=1;
