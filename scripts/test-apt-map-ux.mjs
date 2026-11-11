import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../public/apt-map.html',import.meta.url),'utf8');
for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const section=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Missing '+start);return html.slice(a,b);
};
assert.match(html,/const visible=\(d,withSearch=true\)/);
assert.match(html,/!withSearch\|\|!state\.q\|\|textMatches\(d\)/);
assert.match(html,/visible\(d,false\)/);
assert.match(html,/sibs\(d\)\.filter\(x=>visible\(x\)\)/);
assert.match(html,/if\(state\.browse&&state\.sel==null\) renderList\(\)/);
assert.match(html,/const viewport=state\.browse&&map\?map\.getBounds\(\):null/);
assert.match(html,/viewport\.contain\(d\._pos\)/);
assert.match(html,/kakao\.maps\.event\.addListener\(map,'dragstart',browseMap\)/);
assert.match(html,/kakao\.maps\.event\.addListener\(map,'click',browseMap\)/);
assert.match(html,/url\.searchParams\.set\('vlat'/);
assert.match(html,/url\.searchParams\.set\('vlng'/);
assert.match(html,/url\.searchParams\.set\('vlevel'/);
assert.match(html,/else if\(restoreFullBoundsOnReady\|\|\(!savedMapView&&!mapInteracted\)\)/);
assert.match(html,/kakao\.maps\.event\.addListener\(map,'zoom_changed'/);
assert.match(html,/const peek=Math\\.max\\(0,H-132\\)/);
assert.match(html,/Math\\.abs\\(dx\\)>9&&Math\\.abs\\(dx\\)>Math\\.abs\\(dy\\)\\*1\\.1/);
assert.match(html,/document\\.querySelectorAll\\('\\.captab a'\\)/);
assert.match(html,/aria-label="\\$\\{esc\\(publicComplexName\\(d\\)\\+' '\\+d\\.py\\+'평 상세보기'\\)\\}"/);
assert.match(html,/id="emptyReset"/);
assert.match(html,/const scattered=hit\\.length>12/);
assert.match(html,/restoreFullBoundsOnReady=!homeB/);
assert.match(html,/const fromHash=\\(\\)=>\\{ let h=''\\;try\\{/);
assert.match(html,/kakao\\.maps\\.event\\.addListener\\(map,'dragstart',browseMap\\)/);
const vsrc=section('const savedMapView=','const state=');
const view=(search)=>new Function('location',vsrc+';return savedMapView;')({search});
assert.deepEqual(JSON.parse(JSON.stringify(view('?vlat=37.39&vlng=126.96&vlevel=5'))),{lat:37.39,lng:126.96,level:5});
assert.equal(view('?vlat=abc&vlng=126.96&vlevel=5'),null);
assert.equal(view('?vlat=37.39&vlng=126.96&vlevel=99'),null);

const mapSource=section('function renderMap(){','function close(){');
function runPins(query){
 const D=Array.from({length:2010},(_,i)=>({
  n:i===2005?'래미안하이어스':'다른단지'+i,
  score:2010-i,
  _pos:{x:i<2000?-5000-i:i<2005?60+(i-2000)*60:85,y:i<2000?50:120},
  tier:{c:'#222'}
 }));
 const pins=D.map((_,i)=>({i,on:false,el:null,ov:null}));
 const state={q:query,sel:null},node={clientWidth:450,clientHeight:500,textContent:''};
 const map={getProjection:()=>({containerPointFromCoords:p=>p}),getLevel:()=>9};
 const $=()=>node;
 const visible=(d,withSearch=true)=>!withSearch||!query||d.n.includes(query);
 const textMatches=(d,q)=>d.n.includes(q);
 const materializePin=o=>{
  const classes=new Set();
  o.el={classList:{classes,toggle(k,on){if(on)classes.add(k);else classes.delete(k);}}};
  o.ov={setMap(){}};
 };
 const run=new Function('map','pins','D','state','$','materializePin','complexRankKey',
  'textMatches','visible','shownN',mapSource+';renderMap();');
 run(map,pins,D,state,$,materializePin,d=>d.n,textMatches,visible,0);
 return {pins,count:node.textContent};
}
for(const q of ['','하이어스']){
 const result=runPins(q),local=result.pins.filter(x=>x.i>=2000&&x.on);
 assert.ok(local.length>=3,'Offscreen rank cap hid local pins: '+q);
 if(q){
  assert.ok(result.pins[2005].on);
  assert.ok(result.pins[2005].el.classList.classes.has('match'));
  assert.match(result.count,/검색 단지 파란색 표시/);
 }
}
console.log('PASS: script syntax, viewport persistence, map search isolation, highlighted and neighboring pins');
