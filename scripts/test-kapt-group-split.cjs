'use strict';
/* K-apt 통합 관리단지를 분리해버리는 오류를 방지하는 회귀검사.
 * 각 구분단지의 실제 세대수 합계로 하나의 공식 통합 단지임을 입증한다. */
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
assert.ok(html.includes('CAPT>6&&CAPT<30&&MASTER_COMPLEX_KEY.has(key)'),
  '6억 이하와 25~30억 보호, 나머지 공식 통합 단지 합산 규칙 누락');
assert.ok(html.includes('d.masterComplexKey=MASTER_COMPLEX_KEY.get(key)'),
  '공식 통합 단지에 단일 순위 키를 부여해야 함');
assert.ok(!html.includes('d.units=SPLIT_UNIT_COUNT.get(key)'),
  'K-apt 전체 세대수를 각 블록 원본 세대수로 나누는 이전 오류 재발');
console.log('PASS: 통합 K-apt 3,045세대 유지, 단지 순위 1개, 기존 구분단지 합계 검증, 보호 구간');
