'use strict';
/* 단지 식별 코드 정상화 회귀 검사. 점수 산식과 원천 시세는 변경하지 않음. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.resolve(__dirname,'../public/apt-unitfix.js'),'utf8');
const context={window:{}};
vm.runInNewContext(code,context,{filename:'apt-unitfix.js'});
const u=context.window.UNITFIX,r=context.window.UNITRENT,d=context.window.UNITDROP;
assert.equal(typeof u,'object');
assert.ok(Array.isArray(r)&&Array.isArray(d));
for(const k of [
  '샛별한양1단지|안양 동안구 비산동',
  '송도LuxeOceanSKVIEW|인천 연수구 송도동',
  '고덕국제신도시파라곤|평택시 고덕동',
  '탄현마을동신|고양 일산서구 탄현동',
  '탄현마을삼환|고양 일산서구 탄현동',
  '낙성대현대아파트|서울 관악구 봉천동'
]) assert.equal(u[k],undefined,'검증되지 않은 K-apt 세대수 재적용 금지: '+k);
const curated=u['성원대치2단지아파트|서울 강남구 개포동'];
assert.equal(curated?.[0],1753,'수동 확정 세대수를 잘못된 추정값으로 덮어씀');
assert.ok(Object.keys(u).length>=600,'정상 보정 대량 소실');
console.log('PASS: 6 검증된 식별키, 임대/제외 리스트, 성원대치2 세대수 보호');
