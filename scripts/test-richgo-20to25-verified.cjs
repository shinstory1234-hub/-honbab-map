/* cap25-only Richgo audit regression: node scripts/test-richgo-20to25-verified.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),load=n=>fs.readFileSync(path.join(root,'public',n),'utf8');
const src=['apt-unitfix.js','apt-fard.js','apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js','apt-farfix.js','apt-far-normalize.js'];
const key=d=>d.n+'|'+d.area;
function make(cap,patch){
 const c={CAPT:cap,PICKS:[],UGEO:{},HAK:{},FARD:{},PLAT:{},console};
 c.window=c;vm.createContext(c);
 for(const n of src)vm.runInContext(load(n),c,{filename:n});
 if(patch)vm.runInContext(load('apt-richgo25.js'),c,{filename:'apt-richgo25.js'});
 return c;
}
const b=make(25,false),originalTypes=b.PICKS.map(d=>JSON.stringify(d.types));
const originalMap=new Map(b.PICKS.map(d=>[key(d),{units:d.units,year:d.year}]));
const expected=[
 ['경희궁의아침2단지|서울 종로구 내수동',658,90],
 ['경희궁의아침3단지|서울 종로구 내수동',590,150],
 ['경희궁자이(3단지)|서울 종로구 평동',241,589],
 ['경희궁자이(2단지)|서울 종로구 홍파동',252,1148],
 ['용산e편한세상|서울 용산구 신계동',250,867],
 ['강촌|서울 용산구 이촌동',339,1001],
 ['동부센트레빌|서울 용산구 이촌동',295,309],
 ['북한강(성원)|서울 용산구 이촌동',376,340],
 ['이촌코오롱(A)|서울 용산구 이촌동',317,834],
 ['현대한강|서울 용산구 이촌동',383,516],
 ['용산파크자이|서울 용산구 한강로1가',789,310],
 ['양지마을(5단지)(한양515-529)|성남 분당구 수내동',157,1430],
 ['극동1|서울 광진구 광장동',204,448],
 ['극동2|서울 광진구 광장동',null,896],
 ['삼환|서울 송파구 가락동',178,648],
 ['서울숲2차푸르지오|서울 성동구 금호동4가',226,586],
 ['한양아파트|서울 송파구 송파동',157,576],
 ['문정가락현대1차|서울 송파구 문정동',179,514]
];
const patched=make(25,true);
assert.deepEqual(JSON.parse(JSON.stringify(patched.RICHGO25_APPLIED)),{
 verified:18,farVerified:17,farValueChanges:5,unitChanges:7,excludedBelow300:2,skipped:0
});
for(const [k,far,units] of expected){
 const d=patched.PICKS.find(x=>key(x)===k);
 assert.ok(d,'missing candidate '+k);
 assert.equal(d.units,units,k+' units');
 if(far!==null){assert.equal(patched.FARD[k][0],far,k+' FAR');assert.match(patched.FARD[k][1],/^리치고\((?:단지|상위300|전체372) 직접확인\)$/,k+' source');}
 else assert.equal(patched.FARD[k][0],null,k+' FAR stays missing');
 if(originalMap.get(k).units!==units)assert.equal(patched.UNITFIX_M3[k][0],units,k+' fixUnits precedence');
}
for(const name of ['경희궁의아침2단지','경희궁의아침3단지'])
 assert.ok(patched.UNITDROP_M3.includes(name+'|서울 종로구 내수동'),'exclude below 300');
for(let i=0;i<patched.PICKS.length;i++)assert.equal(JSON.stringify(patched.PICKS[i].types),originalTypes[i],'price unchanged index '+i);
for(const cap of [6,10,15,20,30,35]){
 const c=make(cap,false),p=make(cap,true);
 assert.equal(p.RICHGO25_APPLIED,undefined);
 assert.deepEqual(c.PICKS.map(d=>d.units),p.PICKS.map(d=>d.units),'other cap units '+cap);
 assert.equal(JSON.stringify(c.FARD),JSON.stringify(p.FARD),'other cap FAR '+cap);
}
const builder=fs.readFileSync(root+'/scripts/build-apt-assets.mjs','utf8');
assert.ok(builder.includes("cap === 25 && file === 'apt-far-normalize.js'"),'cap25-only corrections in existing bundle');
assert.ok(!load('apt-map.html').includes("T&&c===25?'apt-richgo25.js'"),'no HTML loader inflation');
console.log('PASS: 18 audited, 5 FAR corrections, 7 household corrections, 2 under-300 excluded, other tabs unchanged');
