import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {run} from './transport-runtime.mjs';

// Both roots must contain the same live-price and geographic input snapshots.
const [before,after]=process.argv.slice(2);
assert.ok(before&&after,'Usage: node scripts/test-apt-performance.mjs <before> <after>');
const report=[];
const snapshot=c=>vm.runInContext('JSON.stringify(ORDER.map(d=>({key:d.cxKey,py:d.py,p:d.p,rank:d.rank,score:d.score,s4:d.s4,band:d.band,fw:d.fw,kfw:d.kfw,kfwRb:d.kfwRb,locParts:d.locParts,fair:d.fair,up:d.up,m:d.m})))',c);
function timed(fn){const start=performance.now(),value=fn();return {ms:performance.now()-start,value};}
for(const cap of [6,10,15,20,25,30]){
 const a=timed(()=>run(before,cap)),b=timed(()=>run(after,cap));
 assert.deepEqual(a.value.missing,[]);assert.deepEqual(b.value.missing,[]);
 assert.deepEqual(b.value.rows,a.value.rows,cap+': scores, ranks and components changed');
 assert.equal(snapshot(b.value.c),snapshot(a.value.c),cap+': detail calculations changed');
 const warmA=timed(()=>vm.runInContext('recompute()',a.value.c));
 const warmB=timed(()=>vm.runInContext('recompute()',b.value.c));
 assert.equal(snapshot(b.value.c),snapshot(a.value.c),cap+': repeated calculation changed');
 if(cap===10){
  // Simulate geographic updates, an amended walking route, and future-station changes.
  const mutate=`const changed=D.find(d=>d.g&&d.g.lat&&d.g.sts?.length);const g=GEO[gkey(changed)];g.lat+=.001;g.sts[0][1]+=160;
   window.APT_STATION_WALKS={[changed.cxKey]:{[g.sts[0][0]]:{minutes:12,source:'test',checkedAt:'2026-11-09'}}};
   FUT[0][3][0]+=.002; FUTPOS[0]=FUT[0][3]; recompute();`;
  vm.runInContext(mutate,a.value.c);vm.runInContext(mutate,b.value.c);
  // The legacy future-distance cache must be invalidated explicitly in the baseline.
  vm.runInContext('score.fc=null;recompute()',a.value.c);
  assert.equal(snapshot(b.value.c),snapshot(a.value.c),'updated coordinates/routes must invalidate caches');
 }
 const row={cap,rows:b.value.rows.length,exactMatch:true,beforeLoadMs:Math.round(a.ms),afterLoadMs:Math.round(b.ms),beforeRecomputeMs:Math.round(warmA.ms),afterRecomputeMs:Math.round(warmB.ms)};
 report.push(row);console.log(JSON.stringify(row));
}
fs.writeFileSync(after+'/docs/apt-performance-results-2026-11-09.json',JSON.stringify(report,null,2)+'\n');
console.log('PASS: all price bands and detailed calculations match, including input changes');
