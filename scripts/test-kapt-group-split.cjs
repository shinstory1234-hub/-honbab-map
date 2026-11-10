'use strict';
/* 공식 통합 단지 세대수의 중복 매칭을 검출하고, 원본 각 단지의 세대수 합계가
 * 정확히 통합 총 세대수에 일치하는 경우에만 구분단지 세대수를 사용할 것. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../public');
const data=fs.readFileSync(path.join(root,'apt-unitfix.js'),'utf8');
const html=fs.readFileSync(path.join(root,'apt-map.html'),'utf8');
const sandbox={window:{},Map,Set,Object,Number};
vm.runInNewContext(data,sandbox);
const start=html.indexOf('function verifiedSplitUnitCounts(){');
const end=html.indexOf('\nconst SPLIT_UNIT_COUNT=verifiedSplitUnitCounts();',start);
assert.ok(start>0&&end>start,'구분단지 통합 세대수 검증 규칙 누락');
vm.runInNewContext(html.slice(start,end)+'\nwindow.__TEST_BLOCK_COUNTS=verifiedSplitUnitCounts();',sandbox);
const corrections=sandbox.window.__TEST_BLOCK_COUNTS;
assert.ok(corrections instanceof Map);
const focus={
  '목동센트럴아이파크위브1단지':592,
  '목동센트럴아이파크위브2단지':962,
  '목동센트럴아이파크위브3단지':574,
  '목동센트럴아이파크위브4단지':917,
};
for(const [name,units] of Object.entries(focus)){
  const key=name+'|서울 양천구 신월동';
  assert.equal(corrections.get(key),units,name+' 구분단지 세대수 불일치');
}
assert.equal(Object.values(focus).reduce((a,b)=>a+b,0),3045,'목동 통합 세대수 대사 실패');
assert.ok(corrections.size>=14,'통합 K-apt 집계 오매칭 사례가 소실됨');
assert.ok(!corrections.has('다산리버펠리체1단지|남양주시 다산동'),'합계 불일치 단지는 수정 금지');
assert.ok(!corrections.has('벽산블루밍1단지|용인 수지구 죽전동'),'합계 불일치 단지는 수정 금지');
assert.ok(html.includes('CAPT!==6&&CAPT!==30&&SPLIT_UNIT_COUNT.has(key)'),
  '6억 이하와 25~30억 기존 모델 보호 필터 누락');
console.log('PASS: K-apt 통합세대수 중복 검증, 4개 목동 구분단지, 미검증 단지 제외, 보호 구간');
