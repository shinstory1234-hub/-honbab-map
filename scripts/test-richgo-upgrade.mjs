/* 리치고 업그레이드 소스 검사. DB 및 운영 순위에는 접근하지 않는다. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const js=fs.readFileSync(path.join(root,'public/apt-richgo-upgrade.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');
new vm.Script(js,{filename:'apt-richgo-upgrade.js'});
assert.match(html,/loadRichgo=cb/,'동적 로더가 있어야 합니다.');
assert.match(html,/APT_RICHGO\.attach\(d,b,i\)/,'상세 화면 호출이 있어야 합니다.');
assert.doesNotMatch(js,/\bD\s*\.\s*(?:sort|splice|push)\s*\(/,'전체 후보 데이터 변경 금지');
assert.doesNotMatch(js,/\b(?:d|x)\s*\.\s*(?:score|rank|s4)\s*=/,'순위·평가값 변경 금지');
assert.match(js,/aria-pressed/,'분석 항목 열기와 닫기 상태 필요');
assert.match(js,/data-ru-race/,'라이벌 비교 진입점 필요');
assert.match(js,/data-ru-volume/,'유동성 조회 진입점 필요');
assert.match(js,/data-ru-school/,'학교 조회 진입점 필요');
assert.match(js,/data-ru-poi/,'주변 생활권 진입점 필요');
assert.match(js,/data-ru-dong-search/,'동 위치 조회 진입점 필요');
const context={
 window:{},
 document:{
  head:{appendChild(){}},
  createElement(tag){return {tagName:tag.toUpperCase(),style:{},textContent:''};}
 }
};
vm.runInNewContext(js,context,{timeout:2000});
assert.equal(typeof context.window.APT_RICHGO.attach,'function');
console.log('PASS: 7개 기능 모듈 구문·진입점·순위 불변');
