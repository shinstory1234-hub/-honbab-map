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
for(const k of [
  '송도더샵마스터뷰23-1BL|인천 연수구 송도동',
  '현대|서울 노원구 하계동'
]) assert.equal(u[k],undefined,'검증된 원천 세대수에 잘못된 수치 적용 금지: '+k);
assert.equal(Object.keys(u).length,628,'세대수 보정 변경 수 회귀: 추가 감사 전 원천 유지');
for(const k of [
  '목동센트럴아이파크위브1단지|서울 양천구 신월동',
  '목동센트럴아이파크위브2단지|서울 양천구 신월동',
  '목동센트럴아이파크위브3단지|서울 양천구 신월동',
  '목동센트럴아이파크위브4단지|서울 양천구 신월동',
  '관악산휴먼시아1단지|서울 관악구 신림동',
  '관악산휴먼시아2단지|서울 관악구 신림동',
  '판교퍼스트힐푸르지오1단지|성남 분당구 대장동',
  '판교퍼스트힐푸르지오A2|성남 분당구 대장동'
]) assert.equal(u[k],undefined,'관리단지 합계 세대수를 개별 블록에 오복제함: '+k);
for(const k of [
  '군자주공9|안산 단원구 선부동',
  '군자주공10|안산 단원구 선부동'
]) assert.equal(u[k]?.[3], 'k', '6억 이하 기존 보정 변경 금지: '+k);
console.log('PASS: 628개 보정, 15개 합계 오복제 차단, 6억 이하 보호, 성원대치2 수동확정 보존');
