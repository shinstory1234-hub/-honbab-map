import assert from 'node:assert/strict';
import { checkSnapshot } from './audit-apt-snapshots.mjs';
const columns=['rank','name','area','py','price_manwon','score','pG','pU'];
const row=(rank,name,price,score,pG=50,pU=50)=>[rank,name,'안양 동안구 관양동',24,price,score,pG,pU];
const doc=rows=>({date:'2026-11-03',cols:columns,rows});
const base=checkSnapshot(10,doc([row(1,'한가람(한양)',83712,80)]));
assert.equal(base.errors.length,0);
const invalid=checkSnapshot(10,doc([
  row(1,'한가람(한양)',83712,80),
  row(2,'한가람(한양)',83712,81),
  row(4,'너무저렴',40075,60)
]));
const errors=new Set(invalid.errors.map(e=>e.code));
for(const key of ['DUPLICATED_UNIT','SCORE_ORDER_INVERTED','RANK_NOT_SEQUENTIAL','PRICE_OUTSIDE_BAND'])
  assert.ok(errors.has(key),key);
const curated=[{n:'한가람한양',area:'안양시 동안구 관양동',cat:['정비대기열'],
 sub:'한가람 한양 삼성 두산 통합재건축 추진'}];
const flagged=checkSnapshot(10,doc([row(1,'평촌일반단지',80000,90),row(2,'한가람(한양)',85000,50)]),curated);
assert.equal(flagged.curatedRedevelopmentMatchedUnits,1);
const low=checkSnapshot(10,doc(Array.from({length:1002},(_,i)=>row(i+1,'단지'+i,85000,80-(i*.01)))),curated);
assert.equal(low.errors.length,0);
const snapshotWithRedevelopment=checkSnapshot(10,doc([
 ...Array.from({length:1001},(_,i)=>row(i+1,'대조단지'+i,85000,90-(i*.02))),
 row(1002,'한가람(한양)',85000,50)
]),curated);
assert.ok(snapshotWithRedevelopment.flags.some(x=>x.code==='REDEVELOPMENT_LOW_RANK_REVIEW'));
assert.equal(checkSnapshot(6,doc([row(1,'경계',60000,90)])).errors.length,0);
assert.ok(checkSnapshot(6,doc([row(1,'경계',60001,90)])).errors.some(x=>x.code==='PRICE_OUTSIDE_BAND'));
console.log('PASS: historical snapshot audit detects duplicate, band mismatch, rank/score errors and redevelopment review');
