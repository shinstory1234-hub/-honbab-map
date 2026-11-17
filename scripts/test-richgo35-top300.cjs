const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function csv(t){const rows=[];let arr=[],v='',q=false;t=t.replace(/^\uFEFF/,'');
for(let i=0;i<t.length;i++){let c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
 else if(c==='"')q=true;else if(c===','){arr.push(v);v='';}else if(c==='\n'){arr.push(v.replace(/\r$/,''));rows.push(arr);arr=[];v='';}else v+=c;}
if(arr.length){arr.push(v.replace(/\r$/,''));rows.push(arr);}const H=rows.shift();return rows.filter(x=>x.length===H.length).map(x=>Object.fromEntries(H.map((k,i)=>[k,x[i]])));}
const rows=csv(read('docs/richgo-over30-current-top300-20261118.csv'));
assert.equal(rows.length,300);
assert.deepEqual(rows.map(x=>Number(x.rank)),Array.from({length:300},(_,i)=>i+1));
const confirmed=rows.filter(x=>x.status==='직접대조');assert.equal(confirmed.length,223);
const eligible=confirmed.filter(x=>Number(x.richgo_far)>0);assert.equal(eligible.length,209);
const school={window:null};school.window=school;vm.runInNewContext(read('public/apt-invest35.js'),school);
assert.equal(school.RICHGO35_RESTORED.length,80);
const apply=(cap)=>{
 const W={CAPT:cap,PICKS:rows.map(x=>({n:x.name,area:x.area,year:+x.map_year||+x.richgo_year,units:+x.map_units||+x.richgo_units,p:666666,types:[{py:34,p:666666}]})),FARD:{},PLAT:{}};
 for(const d of W.PICKS)W.FARD[d.n+'|'+d.area]=[0,''];
 W.window=W;vm.runInNewContext(read('public/apt-r35.js'),W);return W;
};
const W=apply(35);
assert.equal(W.RICHGO35_APPLIED.verified,209);
assert.equal(W.RICHGO35_APPLIED.matched,209);
assert.equal(W.RICHGO35_APPLIED.conflict,0);
for(const x of eligible){
 const k=x.name+'|'+x.area;
 assert.equal(W.FARD[k][0],Number(x.richgo_far),k+' FAR');
 const d=W.PICKS.find(d=>d.n+'|'+d.area===k);
 assert.equal(d.p,666666);assert.equal(d.types[0].p,666666);
}
for(const cap of [6,10,15,20,25,30]){
 const C=apply(cap);assert.equal(C.RICHGO35_APPLIED,undefined);
 assert.ok(Object.values(C.FARD).every(x=>x[0]===0));
}
assert.ok(read('public/apt-univ35.js').includes('O.push(...(root.RICHGO35_RESTORED||[]))'));
assert.ok(read('public/apt-map.html').includes("c>30?'apt-r35.js':''"));
console.log('30억 이상 순위 상위300, 직접확인 223, 용적률 209, 누락복원 80, 타 가격대 불변: PASS');
