'use strict';
/* 가격 신뢰도 감점 변경은 정상 거래와 허위 저가 우려를 동시에 검증한 뒤 배포한다. */
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../public/apt-m3.js'),'utf8');
const win={CAPT:20};
vm.runInNewContext(code,{window:win,console});
const M3=win.APT_M3;
assert.ok(M3&&typeof M3.compute==='function');
const dateDaysAgo=days=>new Date(Date.now()-days*86400000).toISOString().slice(0,10);
function flat(n12,age,{invert=false,raised=false,beyond=false,year=2008}={}){
  return {
    n:'회귀검증단지',area:'서울 테스트구',year,units:950,p:170000,py:24,
    s4:{pG:70,pJ:75,transport:{candidates:[]},density:{pen:0},ta:{h:0}},
    types:[{
      py:24,n:n12,n3:0,last:dateDaysAgo(age),
      ...(invert?{pBeforeGuard:150000}:{}),
      ...(raised?{latestPriceFloor:1,lastSale:170000,pBeforeLatest:165000}:{}),
      ...(beyond?{latestAbove25:1,lastSale:260000}:{}),
    }],
  };
}
const score=(d,cap=20)=>M3.compute(d,cap);
for(const [n12,age,want] of [
  [5,120,3],
  [7,210,5],
  [9,290,7],
  [20,120,3],
]){
  const r=score(flat(n12,age));
  assert.equal(r.penalties.price,want,`최근 12개월 ${n12}건, 마지막 거래 ${age}일 전 상한`);
  assert.ok(r.price.warn,'가격 위험 경고는 종합점수 감점을 낮춰도 유지되어야 함');
}
for(const [n12,age] of [[1,210],[2,120],[4,120]]){
  const r=score(flat(n12,age));
  assert.equal(r.penalties.price,r.price.penalty,'거래 5건 미만이면 임의로 상향해서는 안 됨');
}
for(const flag of [{invert:true},{raised:true},{beyond:true}]){
  const r=score(flat(7,120,flag));
  assert.equal(r.penalties.price,r.price.penalty,'가격 역전, 최근 실거래 하한, 가격대 경계 위험에서는 감점 완화 금지');
}
const protectedCap=score(flat(5,210),30);
assert.equal(protectedCap.penalties.price,0,'25~30억 거래량 감점 기존 제외 정책 보호');
assert.equal(score(flat(5,120),6),null,'6억 이하 기존 평가 모델 보호');
console.log('PASS: 3/5/7점, 소표본 제외, 이상 가격 제외, 6억 이하/25~30억 보호');
