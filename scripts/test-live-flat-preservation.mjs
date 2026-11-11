/**
 * Six-band read-only release gate against the immediate production master.
 * Exact same frozen prices and coordinates used for both checkouts.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {run} from './transport-runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pos=process.argv.indexOf('--before');
assert.ok(pos>=0,'--before is required');
const before=path.resolve(process.argv[pos+1]);
assert.ok(fs.existsSync(path.join(before,'public/apt-map.html')),'baseline master checkout required');
function dump(folder,cap){
 const {c,missing}=run(folder,cap);
 assert.deepEqual(missing,[],'missing runtime inputs for '+cap);
 return JSON.parse(vm.runInContext(`JSON.stringify({
  rows: ORDER.map(d=>({
    id:d.n+'|'+d.area+'|'+d.py,n:d.n,area:d.area,py:d.py,p:d.p,
    rank:d.rank,score:d.score,units:d.units,master:d.masterComplexKey||null,
    live:!!d.live,liveKey:d.liveKey||null,
    hasMatchingTrade:!!(d.liveKey&&window.LIVEP?.[d.liveKey]?.some(t=>t[0]===d.py))
  })),
  liveTypeTotal:Object.values(window.LIVEP||{}).reduce((sum,rows)=>sum+rows.length,0)
 })`,c));
}
const result={date:new Date().toISOString(),before,root,readOnly:true,protectedSixUnchanged:false,bands:[],errors:[]};
const caps=[6,10,15,20,25,30];
for(const cap of caps){
 const old=dump(before,cap),now=dump(root,cap);
 const byId=new Map(old.rows.map(x=>[x.id,x])),newIds=new Set(now.rows.map(x=>x.id));
 const added=now.rows.filter(x=>!byId.has(x.id)),lost=old.rows.filter(x=>!newIds.has(x.id));
 const lo=cap===6?0:cap===10?60000:(cap-5)*10000;
 const priceOut=now.rows.filter(x=>x.p<=lo||x.p>cap*10000);
 const updated=now.rows.filter(x=>{
  const o=byId.get(x.id);return o&&(o.p!==x.p||o.units!==x.units||Math.abs(o.score-x.score)>1e-7);
 });
 const changedPrices=updated.filter(x=>{const o=byId.get(x.id);return o.p!==x.p||o.units!==x.units});
 const unsafeChanges=changedPrices.filter(x=>x.units!==byId.get(x.id).units||!x.hasMatchingTrade);
 const unsupportedAdditions=added.filter(x=>!x.hasMatchingTrade);
 const previousTop=new Set(old.rows.filter(x=>x.rank<=30).map(x=>x.id));
 const newTop=new Set(now.rows.filter(x=>x.rank<=30).map(x=>x.id));
 const topEntered=[...newTop].filter(x=>!previousTop.has(x));
 const topExited=[...previousTop].filter(x=>!newTop.has(x));
 const dupeCount=now.rows.length-newIds.size;
 if(cap===6){
  result.protectedSixUnchanged=JSON.stringify(old.rows)===JSON.stringify(now.rows);
  if(!result.protectedSixUnchanged)result.errors.push({cap,code:'PROTECTED_SIX_BAND_CHANGED'});
 }
 if(dupeCount)result.errors.push({cap,code:'DUPLICATE_FLATS',count:dupeCount});
 if(priceOut.length)result.errors.push({cap,code:'OUTSIDE_PRICE_RANGE',samples:priceOut.slice(0,5)});
 if(lost.length)result.errors.push({cap,code:'PREVIOUSLY_LISTED_FLATS_LOST',count:lost.length,samples:lost.slice(0,6)});
 if(unsupportedAdditions.length)result.errors.push({cap,code:'NO_LIVE_TRADE_SOURCE_FOR_ADDED',count:unsupportedAdditions.length,samples:unsupportedAdditions.slice(0,8)});
 if(unsafeChanges.length)result.errors.push({cap,code:'NO_LIVE_TRADE_SOURCE_FOR_REPRICING',count:unsafeChanges.length,samples:unsafeChanges.slice(0,8)});
 if(topEntered.length>6)result.errors.push({cap,code:'TOP30_ENTRY_CHANGE_TOO_LARGE',count:topEntered.length,samples:topEntered.slice(0,8)});
 const irvine=now.rows.filter(x=>x.n==='평촌어바인퍼스트');
 result.bands.push({cap,old:old.rows.length,now:now.rows.length,added:added.length,lost:lost.length,
  existingRepriced:changedPrices.length,previousScoresChanged:updated.length,topEntered,topExited,
  noSourceAdded:unsupportedAdditions.length,noSourceRepriced:unsafeChanges.length,
  sampleAdded:added.slice(0,15),irvine});
 console.log('CAP_DIFF',JSON.stringify({cap,old:old.rows.length,now:now.rows.length,added:added.length,lost:lost.length,
  changedPrices:changedPrices.length,changedScores:updated.length,unverifiedAdded:unsupportedAdditions.length,
  unverifiedRepriced:unsafeChanges.length,topEntered:topEntered.length,
  topEnteredDetails:topEntered.slice(0,6).map(x=>now.rows.find(d=>d.id===x)),
  irvine}));
}
const cap10=result.bands.find(x=>x.cap===10),cap15=result.bands.find(x=>x.cap===15);
for(const [cap,py] of [[10,18],[15,24],[15,30],[15,34]]){
 const band=cap===10?cap10:cap15;
 if(!band.irvine.some(x=>x.py===py&&x.p>(cap===10?60000:100000)&&x.p<=cap*10000&&x.hasMatchingTrade))
  result.errors.push({code:'IRVINE_VALID_LIVE_FLAT_MISSING',cap,py});
}
const i=process.argv.indexOf('--out');
if(i>=0)fs.writeFileSync(path.resolve(process.argv[i+1]),JSON.stringify(result,null,2)+'\n');
console.log('RELEASE_SUMMARY',JSON.stringify({sixExact:result.protectedSixUnchanged,errors:result.errors,
 bands:result.bands.map(x=>({cap:x.cap,old:x.old,new:x.now,added:x.added,lost:x.lost,
 repriced:x.existingRepriced,changedScores:x.previousScoresChanged,topEntered:x.topEntered.length}))}));
if(result.errors.length)process.exitCode=1;
