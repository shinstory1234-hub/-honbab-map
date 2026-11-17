/* Cap25-only audit regression. Run: node scripts/test-richgo-20to25-verified.cjs */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=n=>fs.readFileSync(path.join(root,'public',n),'utf8');
const sources=['apt-unitfix.js','apt-fard.js','apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js','apt-farfix.js','apt-far-normalize.js'];
function make(cap){
  const c={CAPT:cap,PICKS:[],UGEO:{},HAK:{},FARD:{},PLAT:{},console};c.window=c;vm.createContext(c);
  for(const p of sources)vm.runInContext(load(p),c,{filename:p});
  return c;
}
const k=(n,area)=>n+'|'+area;
const base25=make(25),pre1=base25.PICKS.find(d=>k(d.n,d.area)==='극동1|서울 광진구 광장동'),
  pre2=base25.PICKS.find(d=>k(d.n,d.area)==='극동2|서울 광진구 광장동');
assert.equal(pre1.units,1344);assert.equal(pre2.units,1344);
const baselinePrices=new Map(base25.PICKS.map(d=>[k(d.n,d.area),JSON.stringify(d.types)]));
vm.runInContext(load('apt-richgo25.js'),base25,{filename:'apt-richgo25.js'});
assert.equal(base25.RICHGO25_APPLIED.verified,6);
assert.equal(base25.RICHGO25_APPLIED.matched,6);
assert.equal(base25.RICHGO25_APPLIED.skipped,0);
assert.equal(base25.RICHGO25_APPLIED.unitChanges,2);
const far={
 '양지마을(5단지)(한양515-529)|성남 분당구 수내동':157,
 '극동1|서울 광진구 광장동':204,
 '삼환|서울 송파구 가락동':178,
 '서울숲2차푸르지오|서울 성동구 금호동4가':226,
 '한양아파트|서울 송파구 송파동':157,
 '문정가락현대1차|서울 송파구 문정동':179
};
for(const [key,expected] of Object.entries(far)){
 assert.equal(base25.FARD[key][0],expected,key);
 assert.equal(base25.FARD[key][1],'리치고(단지 직접확인)',key);
}
for(const [name,units] of [['극동1',448],['극동2',896]]){
 const key=k(name,'서울 광진구 광장동'),d=base25.PICKS.find(d=>k(d.n,d.area)===key);
 assert.equal(d.units,units);
 assert.equal(base25.UNITFIX_M3[key][0],units);
}
for(const d of base25.PICKS)assert.equal(JSON.stringify(d.types),baselinePrices.get(k(d.n,d.area)),'prices must be unchanged');
assert.equal(base25.FARD['극동2|서울 광진구 광장동'][0],null,'Richgo does not publish 2차 FAR');
for(const cap of [6,10,15,20,30,35]){
 const c=make(cap),k1=k('극동1','서울 광진구 광장동'),k2=k('극동2','서울 광진구 광장동');
 const b1=c.PICKS.find(d=>k(d.n,d.area)===k1),b2=c.PICKS.find(d=>k(d.n,d.area)===k2);
 const units=[b1.units,b2.units],farBefore=JSON.stringify(c.FARD[k1]);
 vm.runInContext(load('apt-richgo25.js'),c);
 assert.deepEqual([b1.units,b2.units],units,'cap '+cap+' units');
 assert.equal(JSON.stringify(c.FARD[k1]),farBefore,'cap '+cap+' FAR');
 assert.equal(c.RICHGO25_APPLIED,undefined,'cap '+cap+' metadata');
}
const html=load('apt-map.html');
assert.match(html,/T&&c===25\?'apt-richgo25\.js'/);
assert.ok(html.indexOf("T?'apt-far-normalize.js'")<html.indexOf("T&&c===25?'apt-richgo25.js'"));
console.log('Richgo cap25 verified: 6 FAR records, 2 split-unit corrections, other bands unchanged ✅');
