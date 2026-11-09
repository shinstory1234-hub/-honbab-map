import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {run} from './transport-runtime.mjs';

// Usage: node scripts/test-apt-identity.mjs <baseline-root> <updated-root>
// Both roots must use the same apt-live.js and apt-geo.js input snapshot.
const [before,after]=process.argv.slice(2);
assert.ok(before&&after,'baseline-root and updated-root are required');
const targets=new Map([
  ['상계주공14|서울 노원구 상계동','11350|상계동|상계주공14(고층)'],
  ['상계주공10|서울 노원구 상계동','11350|상계동|상계주공10(고층)'],
  ['상계주공2|서울 노원구 상계동','11350|상계동|상계주공2(고층)'],
  ['주공8|광명시 하안동','41210|하안동|주공8(고층)']
]);
const code=fs.readFileSync(path.join(after,'public/apt-livefix.js'),'utf8');
const fixture={CAPT:10,PICKS:[],FARD:{'상계주공2|다른시 상계동':[null,null,0,0,0,0,'99999']}};
fixture.window=fixture;vm.createContext(fixture);vm.runInContext(code,fixture);
assert.equal(fixture.aptSourceKey({n:'상계주공2',area:'다른시 상계동'}),'99999|상계동|상계주공2');
assert.equal(fixture.aptSourceKey({n:'상계주공20',area:'서울 노원구 상계동'}),null);
assert.equal(fixture.aptSourceKey({n:'상계주공2(저층)',area:'서울 노원구 상계동'}),null);
fixture.CAPT=6;
assert.equal(fixture.aptSourceKey({n:'상계주공2',area:'서울 노원구 상계동'}),null);

const extract=`JSON.stringify(ORDER.map(d=>({key:d.cxKey,n:d.n,py:d.py,p:d.p,rank:d.rank,score:d.score,gj:d.gj,gjc:d.gjc,live:d.live,liveKey:d.liveKey,ev:priceEv(d)})))`;
for(const cap of [6,10,15,20,25,30]){
  const old=run(before,cap),now=run(after,cap);
  assert.deepEqual(old.missing,[]);assert.deepEqual(now.missing,[]);
  if(cap===6){assert.deepEqual(now.rows,old.rows);console.log(JSON.stringify({cap,rows:now.rows.length,exactMatch:true}));continue;}
  const a=JSON.parse(vm.runInContext(extract,old.c)),b=JSON.parse(vm.runInContext(extract,now.c));
  const prior=new Map(a.map(r=>[r.key+'|'+r.py,r]));
  const priorScores=new Map(old.rows.map(r=>[r.key+'|'+r.py,r.s4]));
  const newScores=new Map(now.rows.map(r=>[r.key+'|'+r.py,r.s4]));
  b.forEach((r,i)=>{assert.ok(Number.isFinite(r.score));assert.equal(r.rank,i+1);if(i)assert.ok(b[i-1].score>=r.score);});
  assert.equal(new Set(b.map(r=>r.key+'|'+r.py)).size,b.length);
  for(const r of b.filter(r=>targets.has(r.key))){
    const key=targets.get(r.key),row=now.c.LIVEP[key].find(t=>t[0]===r.py);
    assert.equal(r.live,1);assert.equal(r.liveKey,key);assert.equal(r.gjc,true);assert.equal(r.gj,now.c.S4GJC[key]);
    assert.equal(r.p,row[1]);assert.equal(r.ev.last,row[4]);
    assert.ok(r.p>(cap===10?60000:(cap-5)*10000)&&r.p<=cap*10000);
  }
  const snapshot=JSON.stringify(b);vm.runInContext('recompute()',now.c);
  assert.equal(vm.runInContext(extract,now.c),snapshot,'repeated recompute must be stable');
  const changed=b.filter(r=>{const p=prior.get(r.key+'|'+r.py);return !p||p.score!==r.score||p.p!==r.p;});
  const indirect=changed.filter(r=>!targets.has(r.key));
  for(const r of indirect){
    const id=r.key+'|'+r.py,p=prior.get(id),s=priorScores.get(id),t=newScores.get(id);
    assert.ok(p,'only mapped complexes may gain new size rows');assert.equal(r.p,p.p);
    for(const k of ['transport','density','ta'])assert.deepEqual(t[k],s[k],r.n+': '+k);
    assert.equal(t.za.sm,s.za.sm);assert.equal(t.za.ppr,s.za.ppr);
    // Aliases now participate in the existing geographic smoothing and percentile universe.
    // Those data-dependent terms (G and its U/Q gates, PPYEXP) can affect other rows.
    const expected=.5*(t.pG-s.pG)+.25*(t.pU-s.pU)+.2*(t.pQ-s.pQ)+(t.za.pp-s.za.pp);
    assert.ok(Math.abs((r.score-p.score)-expected)<1e-9,r.n+': unexplained score change');
  }
  console.log(JSON.stringify({cap,rows:b.length,changed:changed.length,maxIndirectDelta:Math.max(0,...indirect.map(r=>Math.abs(r.score-prior.get(r.key+'|'+r.py).score))),targets:b.filter(r=>targets.has(r.key)&&r.py===24).map(r=>({name:r.n,before:prior.get(r.key+'|'+r.py)?.rank,after:r.rank,price:r.p,score:r.score}))}));
}
console.log('PASS: identity, source consistency, price bands, deterministic ranking and frozen <=6억 results');
