/* Run: node scripts/test-richgo-over30-audit.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const src=fs.readFileSync(root+'/public/apt-richgo35-corrections.js','utf8');
const html=fs.readFileSync(root+'/public/apt-map.html','utf8');
const rows=JSON.parse(src.match(/const rows=(\[[^\n]+\]);/)[1]);
assert.equal(rows.length,19,'19 independent individual-page validations');
assert.ok(html.includes("c===35?'apt-richgo35-corrections.js':''"),'30억 이상 분리 로딩');
assert.ok(html.indexOf("T?'apt-far-normalize.js':''")<html.indexOf("c===35?'apt-richgo35-corrections.js':''"),'FAR normalization must precede correction');

function execute(cap,initial){
  const W={CAPT:cap,PICKS:initial||rows.map(([n,area,units,year,far])=>({n,area,units,year,p:420000,types:[{py:34,p:420000}]})),FARD:{},PLAT:{}};
  for(const d of W.PICKS)W.FARD[d.n+'|'+d.area]=[0,'',null];
  W.window=W;vm.runInNewContext(src,W,{filename:'apt-richgo35-corrections.js'});
  return W;
}
const W=execute(35);
assert.equal(W.RICHGO35_APPLIED.reviewed,19);
assert.equal(W.RICHGO35_APPLIED.matched,19);
assert.equal(W.RICHGO35_APPLIED.filledFar,19);
assert.equal(W.RICHGO35_APPLIED.changedUnits,0);
for(const [name,area,units,year,far,id] of rows){
 const key=name+'|'+area,d=W.PICKS.find(x=>x.n===name&&x.area===area);
 assert.ok(d,key);
 assert.equal(d.year,year,key+' move-in year');
 assert.equal(d.units,units,key+' units');
 assert.equal(d.p,420000,'trade price unchanged');
 assert.equal(d.types[0].p,420000,'flat price unchanged');
 assert.equal(Number(W.FARD[key][0]),far,'FAR '+key);
 assert.equal(W.FARD[key][1],'리치고 공개 단지정보');
 assert.equal(W.RICHGO35_SOURCES[key],'https://m.richgo.ai/realty/danji/'+id);
}
const noCap=execute(30);
assert.equal(noCap.RICHGO35_APPLIED,undefined,'25~30억 unmodified');
assert.ok(Object.values(noCap.FARD).every(x=>x[0]===0));
assert.equal(execute(6).RICHGO35_APPLIED,undefined,'6억 이하 unmodified');
const bad=execute(35,[{n:'래미안원베일리',area:'서울 서초구 반포동',units:2991,year:2023,p:420000}]);
assert.equal(bad.RICHGO35_APPLIED.conflicts.length,1,'reject likely wrong building');
assert.equal(bad.FARD['래미안원베일리|서울 서초구 반포동'][0],0);
console.log('Richgo cap35 19 source records, protected other price bands and conflict gate: PASS');
