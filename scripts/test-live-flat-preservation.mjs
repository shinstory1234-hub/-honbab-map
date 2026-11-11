/**
 * Read-only ranking release gate. Compares exact same frozen price/geo input with
 * current master; checks the entire six-band universe, not a hand-picked example.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {run} from './transport-runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const i=process.argv.indexOf('--before');
const before=path.resolve(i>=0?process.argv[i+1]:'');
assert.ok(i>=0&&fs.existsSync(path.join(before,'public/apt-map.html')),'--before worktree required');
const dump=(root,cap)=>{
 const {c,missing}=run(root,cap);
 assert.deepEqual(missing,[],'missing input for '+cap);
 const json=vm.runInContext(`JSON.stringify({
  candidates:ORDER.map(d=>({id:d.n+'|'+d.area+'|'+d.py,n:d.n,area:d.area,
   py:d.py,p:d.p,rank:d.rank,score:d.score,units:d.units,archived:!!d.snapshotOnly,
   bonus:d.m3?.bonuses?.verifiedProgress||0,master:d.masterComplexKey||null})),
  backups:window.LIVE_MISSING_TYPES||[],bandOut:BANDOUT,smallOut:SMALLOUT
 })`,c);
 const details=JSON.parse(json);
 details.preLive=c.__APT_PRELIVE||[];
 return details;
};
const report={generatedAt:new Date().toISOString(),baseline:before,after:root,readOnly:true,
  sixUnchanged:false,errors:[],bands:[]};
for(const cap of [6,10,15,20,25,30]){
 const old=dump(before,cap),nw=dump(root,cap);
 const ref=new Map(old.candidates.map(x=>[x.id,x])),now=new Map(nw.candidates.map(x=>[x.id,x]));
 if(new Set(nw.candidates.map(x=>x.id)).size!==nw.candidates.length)
   report.errors.push({cap,code:'DUPLICATE_FLAT'});
 if(cap===6){
   report.sixUnchanged=JSON.stringify(old.candidates)===JSON.stringify(nw.candidates);
   if(!report.sixUnchanged)report.errors.push({cap,code:'FROZEN_SIX_BAND_CHANGED'});
 }
 const low=cap===6?0:(cap===10?60000:(cap-5)*10000);
 const outOfBand=nw.candidates.filter(x=>x.p<=low||x.p>cap*10000);
 if(outOfBand.length)report.errors.push({cap,code:'OUTSIDE_PRICE_RANGE',count:outOfBand.length,
   sample:outOfBand.slice(0,5)});
 const added=nw.candidates.filter(x=>!ref.has(x.id));
 const lost=old.candidates.filter(x=>!now.has(x.id));
 const modified=nw.candidates.filter(x=>{
   const o=ref.get(x.id);return o&&(x.p!==o.p||x.units!==o.units||Math.abs(x.score-o.score)>1e-6);
 });
 const modifiedPrices=modified.filter(x=>x.p!==ref.get(x.id).p||x.units!==ref.get(x.id).units);
 // Restored candidates must be sourced from the archived unit-size database, not invented.
 const unmarkedAdded=added.filter(x=>!x.archived);
 if(unmarkedAdded.length)report.errors.push({cap,code:'NEWLY_ADDED_NOT_ARCHIVED',count:unmarkedAdded.length,sample:unmarkedAdded.slice(0,6)});
 if(modifiedPrices.length)report.errors.push({cap,code:'OLD_FLAT_PRICE_OR_HOUSEHOLDS_CHANGED',count:modifiedPrices.length,
    samples:modifiedPrices.slice(0,5)});
 if(lost.length)report.errors.push({cap,code:'PREVIOUS_VALID_FLAT_DISAPPEARED',count:lost.length,
    samples:lost.slice(0,6)});
 // Newly restored flat must have correct n/area/py and price; no false cross-band publication.
 const oldTop=new Set(old.candidates.filter(x=>x.rank<=30).map(x=>x.id));
 const newTop=new Set(nw.candidates.filter(x=>x.rank<=30).map(x=>x.id));
 const entered=[...newTop].filter(x=>!oldTop.has(x));
 const missing=[...oldTop].filter(x=>!newTop.has(x));
 if(entered.length>6)report.errors.push({cap,code:'TOO_MUCH_TOP30_CHURN',entered:entered.length,sample:entered.slice(0,6)});
 const irvine=nw.candidates.filter(x=>x.n==='평촌어바인퍼스트');
 const oldIrvine=old.candidates.filter(x=>x.n==='평촌어바인퍼스트');
 report.bands.push({cap,before:old.candidates.length,after:nw.candidates.length,added:added.length,lost:lost.length,
    backedUpComplexes:nw.backups.length,backedUpFlats:nw.backups.reduce((n,x)=>n+x.restored.length,0),
    changedExistingScore:modified.length,changedExistingPrice:modifiedPrices.length,
    top30Entered:entered,top30Exited:missing,
    newFlatSamples:added.slice(0,30),irvineBefore:oldIrvine,irvineAfter:irvine,preLive:nw.preLive});
 console.log('CAP_DIFF',JSON.stringify({cap,old:old.candidates.length,new:nw.candidates.length,
  added:added.length,lost:lost.length,backedUpComplexes:nw.backups.length,
  backedUpTypes:nw.backups.reduce((n,x)=>n+x.restored.length,0),
  changedExistingScore:modified.length,changedExistingPrice:modifiedPrices.length,
  top30Entered:entered.length,preLive:nw.preLive,irvineBefore:oldIrvine,irvineAfter:irvine,firstAdded:added.slice(0,7)}));
}
const ir10=report.bands.find(x=>x.cap===10),ir15=report.bands.find(x=>x.cap===15);
if(!ir10.irvineAfter.some(x=>x.py>=18&&x.p>60000&&x.p<=100000))
 report.errors.push({code:'IRVINE_MISSING_6_TO_10',details:ir10.irvineAfter});
if(!ir15.irvineAfter.some(x=>x.py===24&&x.p>100000&&x.p<=150000))
 report.errors.push({code:'IRVINE_MISSING_10_TO_15',details:ir15.irvineAfter});
if(!ir15.irvineAfter.some(x=>x.py===34&&x.p>100000&&x.p<=150000))
 report.errors.push({code:'IRVINE_MISSING_34_PYEONG',details:ir15.irvineAfter});
const reportPath=process.argv.indexOf('--out');
if(reportPath>=0)fs.writeFileSync(path.resolve(process.argv[reportPath+1]),JSON.stringify(report,null,2)+'\n');
console.log('RELEASE_SUMMARY',JSON.stringify({sixUnchanged:report.sixUnchanged,errors:report.errors,
 bands:report.bands.map(({cap,before,after,added,lost,backedUpComplexes,backedUpFlats,top30Entered,changedExistingScore})=>
  ({cap,before,after,added,lost,backedUpComplexes,backedUpFlats,top30Entered:top30Entered.length,changedExistingScore}))}));
if(report.errors.length)process.exitCode=1;
