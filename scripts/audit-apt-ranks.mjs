/**
 * Read-only apartment ranking audit. Writes nothing to the site or database.
 * Run: node scripts/audit-apt-ranks.mjs [--baseline-root /path/to/old/checkout] [--out /tmp/apt-audit.json]
 * Live-price / geo assets are required by transport-runtime.mjs. Missing inputs are BLOCKED, never PASS.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { run } from './transport-runtime.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT=path.resolve(HERE,'..');
const CAPS=[6,10,15,20,25,30];
const clean=x=>String(x||'').replace(/\s+/g,'').replace(/[()（）.,·\-]/g,'').replace(/아파트$/,'');
const place=x=>String(x||'').trim().replace(/^안양시 /,'안양 ').replace(/^성남시 /,'성남 ').replace(/^수원시 /,'수원 ').replace(/^고양시 /,'고양 ');
const id=x=>[clean(x.n),place(x.area)].join('|');
const rowId=x=>x.key+'|'+x.py;

export function auditRows(cap,rows,{previous=[],curated=[]}={}){
  const findings=[], seen=new Set(), old=new Map(previous.map(x=>[rowId(x),x]));
  const curatedById=new Map();
  for(const item of curated){
    if(!item||!item.n||!item.area)continue;
    const k=id(item), a=curatedById.get(k)||[];a.push(item);curatedById.set(k,a);
  }
  const push=(severity,code,d,detail)=>findings.push({severity,code,key:d?.key??'',name:d?.n??'',area:d?.area??'',py:d?.py??null,rank:d?.rank??null,detail});
  let matched=0;
  for(const d of rows){
    if(seen.has(rowId(d)))push('error','DUPLICATE_FLAT',d,'Same complex and supply-pyeong occurs more than once');
    seen.add(rowId(d));
    if(!Number.isFinite(d.score)||d.score<0||d.score>100)push('error','BAD_SCORE',d,'Score outside 0..100');
    if(!Number.isSafeInteger(d.rank)||d.rank<=0)push('error','BAD_RANK',d,'Rank is missing or invalid');
    if(!Number.isFinite(d.p)||d.p<=0)push('error','BAD_PRICE',d,'Current price missing or invalid');
    const expectedLo=cap===6?0:cap===10?60000:(cap-5)*10000, hi=cap*10000;
    if(Number.isFinite(d.p)&&(d.p<=expectedLo||d.p>hi))push('error','PRICE_BAND_MISMATCH',d,'Price '+d.p+' not in ('+expectedLo+', '+hi+']');
    const prior=old.get(rowId(d));
    if(prior){
      const delta=d.rank-prior.rank;
      if(delta>=250)push('review','RANK_DROP_250',d,'Rank '+prior.rank+' -> '+d.rank+' (down '+delta+')');
      if(prior.rank<=100&&d.rank>300)push('review','TOP100_EJECTED',d,'Previously top 100, now outside top 300');
      if(cap===6&&(prior.score!==d.score||prior.rank!==d.rank||prior.p!==d.p))
        push('error','PROTECTED_SIX_BAND_CHANGED',d,'<=6억 protected price/score/rank changed');
    } else if(cap===6&&previous.length)push('error','PROTECTED_SIX_BAND_ADDED',d,'New <=6억 unit absent from baseline');
    const matches=curatedById.get(id(d))||[];
    if(matches.length===1){
      matched++;
      const ref=matches[0];
      const redevelop=(ref.cat||[]).includes('정비대기열')||/통합\s*재건축|재건축\s*추진/.test([ref.headline,ref.sub].join(' '));
      if(redevelop&&d.dead>=.5){
        push('review','REDEVELOPMENT_STATUS_CONFLICT',d,'Curated redevelopment progress conflicts with estimated \'재건축 어려움\' label. Progress and economic feasibility must be reviewed separately.');
      }
      if(redevelop&&cap>6&&d.m3&&d.m3.raw?.Q<=30){
        push('review','REDEVELOPMENT_AGE_TREATMENT',d,'Redevelopment candidate receives old-building quality score '+d.m3.raw.Q+'; check whether scheme progress is separately reflected.');
      }
    } else if(matches.length>1)push('review','CURATED_MATCH_AMBIGUOUS',d,'Multiple curated entries normalize to same name/area');
    if(cap>6&&d.m3&&d.m3.penalties?.price>=8&&d.m3.price?.n12<5){
      push('review','THIN_TRADE_STRONG_PENALTY',d,'Price confidence penalty '+d.m3.penalties.price+'; annual trades '+d.m3.price.n12+', last '+(d.m3.price.last||'unknown'));
    }
  }
  if(cap===6&&previous.length){
    const current=new Set(rows.map(rowId));
    for(const oldRow of previous)if(!current.has(rowId(oldRow)))
      push('error','PROTECTED_SIX_BAND_REMOVED',oldRow,'Previously present <=6억 unit is now absent');
  }
  const counts={error:0,review:0};
  findings.forEach(f=>counts[f.severity]++);
  return {cap,rows:rows.length,curatedMatchedFlats:matched,counts,findings};
}
function getCurated(root){
  const filename=path.join(root,'public/apt-data.js');
  if(!fs.existsSync(filename))return {rows:[],note:'apt-data.js not found'};
  try{
    const context={window:{}};vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});
    return {rows:Array.isArray(context.window.D)?JSON.parse(JSON.stringify(context.window.D)):[],note:null};
  }catch(e){return {rows:[],note:'Cannot parse curated records: '+e.message};}
}
function getRows(root,cap){
  const result=run(root,cap);
  if(result.missing?.length)throw Error('Required inputs missing: '+result.missing.join(', '));
  const raw=vm.runInContext(`JSON.stringify(ORDER.map(d=>({
    key:d.cxKey,n:d.n,area:d.area,py:d.py,rank:d.rank,score:d.score,p:d.p,
    dead:d.dead??0,year:d.year,units:d.units,m3:d.m3||null
  })))`,result.c);
  const rows=JSON.parse(raw);
  if(!rows.length)throw Error('No ranked rows returned');
  return rows;
}
function argVal(key){const i=process.argv.indexOf(key);return i<0?null:process.argv[i+1]||null;}
function main(){
  const root=path.resolve(argVal('--root')||DEFAULT_ROOT);
  const baselineRoot=argVal('--baseline-root')?path.resolve(argVal('--baseline-root')):null;
  const output=argVal('--out');
  const {rows:curated,note}=getCurated(root);
  const report={time:new Date().toISOString(),root,baselineRoot,readOnly:true,curatedEntries:curated.length,curatedReadWarning:note,
    notice:'Review flags are diagnostic, not proof of incorrect values. Full coverage requires live-price and geographic inputs; blocked bands are never validated.',bands:[]};
  for(const cap of CAPS){
    try{
      const rows=getRows(root,cap),old=baselineRoot?getRows(baselineRoot,cap):[];
      const result=auditRows(cap,rows,{previous:old,curated});
      report.bands.push({...result,status:'audited',baselineCompared:!!baselineRoot});
    }catch(e){
      report.bands.push({cap,status:'blocked',reason:e.message,counts:null,findings:[]});
    }
  }
  report.status=report.bands.some(b=>b.status==='blocked')?'INCOMPLETE':
    report.bands.some(b=>b.counts.error)?'ERRORS_FOUND':'AUDITED_WITH_REVIEW_FLAGS';
  const json=JSON.stringify(report,null,2)+'\n';
  if(output)fs.writeFileSync(path.resolve(output),json);
  process.stdout.write(json);
  if(report.status==='INCOMPLETE'||report.status==='ERRORS_FOUND')process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
