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
// 오래된 거래가 예산 상단에 붙어 있으면, 상승장을 무시하고
// 예전 가격을 '오늘 이 예산으로 살 수 있다'고 승격시키지 않는다.
const nearCap=flat(7,125);nearCap.p=191000; // 20억의 95.5%
const untouched=score(nearCap);
assert.equal(untouched.penalties.price,untouched.price.penalty,'상단 경계의 오래된 가격은 그대로 보수적으로 취급');
const freshEnough=flat(7,125);freshEnough.p=175000;
const relaxed=score(freshEnough);
assert.equal(relaxed.penalties.price,3,'예산 상단에서 충분히 떨어져 있는 가격만 완화');
const protectedCap=score(flat(5,210),30);
assert.equal(protectedCap.penalties.price,0,'25~30억 거래량 감점 기존 제외 정책 보호');
assert.equal(score(flat(5,120),6),null,'6억 이하 기존 평가 모델 보호');
// 10~15억 구간은 도심 교통 비중을 높이되 다른 가격대는 기존 배점을 지킨다.
for(const cap of [10,15,20,25,30]){
  const d=flat(9,35); d.p=cap*10000-5000;
  d.s4.transport.candidates=[{minutes:5,lineFactor:1,future:false}];
  const result=M3.compute(d,cap);
  const planned=cap===15?{G:.38,J:.10,T:.18,U:.17,Q:.14,S:.03}
                        :{G:.35,J:.10,T:.15,U:.20,Q:.15,S:.05};
  for(const [key,weight] of Object.entries(planned)){
    assert.ok(Math.abs(result.parts[key]-result.raw[key]*weight)<1e-8,
      `${cap}억 구간 ${key} 평가 가중치 보호`);
  }
}
// 공통 M3 신규 급지 게이트를 일반 단지에 일괄 적용하면 안 된다.
// 공식 통합 단지의 분산 규모 가점만 장기 급지에 연동한다.
const example=flat(9,35);example.p=125000;example.units=3045;example.s4.pG=54;
const aggregate={G:54,J:60,T:55,U:95.1125,Q:100};
const ordinary=M3.compute(example,15);
const master=M3.compute(example,15,aggregate);
const expectedGate=(54-45)/(70-45);
assert.equal(ordinary.raw.U,ordinary.baseRaw.U,'일반 단지 규모는 급지 게이트 일괄 적용 금지');
assert.ok(Math.abs(master.raw.U-(50+(aggregate.U-50)*expectedGate))<1e-7,'통합 단지 규모 가점만 검증된 급지에 연동');
assert.equal(master.raw.Q,100,'신축 자체 품질 점수는 급지 때문에 깎지 않음');
assert.equal(M3.compute(example,10,aggregate).raw.U,aggregate.U,'6~10억의 기존 M3 규모점수 보호');
assert.equal(M3.compute(example,20,aggregate).raw.U,aggregate.U,'15~20억의 기존 M3 규모점수 보호');
const frontend=fs.readFileSync(path.resolve(__dirname,'../public/apt-map.html'),'utf8');
assert.ok(frontend.includes("if(d.p>=60000)"),'6억 이상 임의 주담대 칸 숨김 유지');
assert.ok(frontend.includes('public-factor-scores'),'신축/학군/대단지/브랜드/역세권 점수 안내 유지');
assert.ok(frontend.includes('세부 산식 비공개'),'구체적인 가중치 공개 금지');
console.log('PASS: 3/5/7점 신뢰도, K-apt 통합단지 급지 연동, 일반 신축 품질 및 타 가격대 보호, 주담대 노출 금지, 단지 항목별 점수');
