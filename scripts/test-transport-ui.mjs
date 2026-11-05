import {run} from './transport-runtime.mjs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const {c}=run(process.argv[2]||'.',10);
const snapshot=()=>vm.runInContext('JSON.stringify(ORDER.map(d=>[d.cxKey,d.py,d.rank,d.sib,d.score]))',c);
const before=snapshot();vm.runInContext('recompute()',c);assert.equal(snapshot(),before);
vm.runInContext('renderList()',c);
const list=c.document.querySelector('#body').innerHTML;
assert.ok(list.includes('장기 급지·세대수·상품성·교통을 반영한 순위'));
assert.ok(list.includes('교통 접근성 5점'));
assert.ok(!list.includes('<dt>교통<small>23점'));
// 클릭 핸들러는 초기화 구간 밖에 있어 VM 표시 검사에서만 대체한다.
c.backToList=()=>{};
vm.runInContext('renderDetail(D.indexOf(ORDER.find(d=>!d.sib)))',c);
const detail=c.document.querySelector('#body').innerHTML;
assert.ok(detail.includes('교통 접근성 <small>종합점수 5%'));
assert.ok(detail.includes('추정 도보'));
assert.ok(detail.includes('1위 / 1434'));
console.log('PASS: 재계산 반복 시 점수·순위 동일, 목록 설명, 단지 기준 순위 분모, 상세 교통 산식');
