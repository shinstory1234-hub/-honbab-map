import assert from 'node:assert/strict';
import { auditRows } from './audit-apt-ranks.mjs';

const flat=(extra={})=>({
  key:'한가람(한양)|안양 동안구 관양동',n:'한가람(한양)',area:'안양 동안구 관양동',
  py:24,rank:1116,score:38,p:84000,dead:0.65,
  m3:{raw:{Q:30},penalties:{price:13},price:{n12:4,last:'2026-03-11'}},...extra
});
const curated=[{
  n:'한가람한양',area:'안양시 동안구 관양동',cat:['정비대기열'],
  sub:'한양, 삼성, 두산 통합재건축 추진'
}];
const prior=[flat({rank:265,score:67.25,p:83712})];
const result=auditRows(10,[flat()],{previous:prior,curated});
const flags=new Set(result.findings.map(x=>x.code));
for(const code of ['RANK_DROP_250','REDEVELOPMENT_STATUS_CONFLICT',
 'REDEVELOPMENT_AGE_TREATMENT','THIN_TRADE_STRONG_PENALTY'])
 assert.ok(flags.has(code),code);
assert.equal(result.curatedMatchedFlats,1);
assert.equal(result.counts.error,0);

const oldSix={key:'x|서울 테스트구 대치동',n:'x',area:'서울 테스트구 대치동',
  py:20,p:59000,rank:12,score:81,dead:0,m3:null};
const changedSix={...oldSix,score:82};
assert.ok(auditRows(6,[changedSix],{previous:[oldSix]}).findings.some(
 x=>x.code==='PROTECTED_SIX_BAND_CHANGED'));

const duplicate=auditRows(10,[flat(),flat()]);
assert.ok(duplicate.findings.some(x=>x.code==='DUPLICATE_FLAT'));
const outside=auditRows(10,[flat({p:105000})]);
assert.ok(outside.findings.some(x=>x.code==='PRICE_BAND_MISMATCH'));
const normal=auditRows(10,[flat({rank:100,dead:0,m3:null})]);
assert.equal(normal.counts.error,0);
console.log('PASS: read-only ranking audit regression fixtures');
