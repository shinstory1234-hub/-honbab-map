const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const all=JSON.parse(fs.readFileSync(root+'/docs/richgo20-verified-all626-20261118.json','utf8'));
const rest=JSON.parse(fs.readFileSync(root+'/docs/richgo20-verified-rest326-20261118.json','utf8'));
const first=JSON.parse(fs.readFileSync(root+'/docs/richgo20-verified-full-20261118.json','utf8'));
assert.equal(all.rawComplexes,626);assert.equal(all.rankedUnique,554);assert.equal(all.unrankedUnique,72);
assert.equal(rest.count,326);assert.equal(rest.confirmed,326);assert.equal(first.count,300);
assert.equal(all.rows.length,626);assert.equal(new Set(all.rows.map(r=>r.k)).size,626);
const FARcount=all.rows.filter(r=>r.far!==null).length;
assert.equal(FARcount,621);assert.equal(all.sourceFARBlank.length,5);
assert.equal(all.restMatches.stage1+all.restMatches.geo+all.restMatches.manual,326);
const src=fs.readFileSync(root+'/public/apt-univ20.js','utf8');
const A=JSON.parse(src.slice(src.indexOf('const A=')+8,src.indexOf(',S=')));
const R=JSON.parse(src.slice(src.indexOf(',R=')+3,src.indexOf(';\nconst TB')));
assert.equal(R.length,626);
const by=new Map(R.map(r=>[r[0]+'|'+A[r[1]],r]));
assert.equal(by.size,626);
const W={CAPT:20,PICKS:[],UGEO:{},HAK:{},FARD:{},UNITFIX:{},PLAT:{},CXP:null};W.window=W;vm.createContext(W);
for(const name of ['apt-unitfix.js','apt-fard.js','apt-univ20.js','apt-farfix.js','apt-far-normalize.js'])
 vm.runInContext(fs.readFileSync(root+'/public/'+name,'utf8'),W,{filename:name});
assert.equal(W.PICKS.length,626);
const live=new Map(W.PICKS.map(x=>[x.n+'|'+x.area,x]));
for(const a of all.rows){
 const raw=by.get(a.k),v=live.get(a.k);
 assert.ok(raw,'missing raw apartment '+a.k);assert.ok(v,'missing runtime apartment '+a.k);
 if(a.far!=null){
  assert.equal(raw[22][0],a.far,'raw Richgo FAR '+a.k);
  assert.equal(raw[22][1],'R','packed Richgo source code '+a.k);
  assert.equal(W.FARD[a.k]?.[0],a.far,'actual live FAR after fallbacks '+a.k);
 }
 const validurl=typeof a.url==='string'&&/^https:\/\/m\.richgo\.ai\/realty\/danji\/a[A-Za-z0-9]{6}$/.test(a.url);
 assert.ok(validurl,'missing Richgo evidence '+a.k);
 assert.equal(v.p,a.mapUnits===undefined?raw[3]:raw[3],'transactional median unchanged '+a.k);
 if(a.seq>300&&!a.integrated){
  assert.equal(v.units,a.units,'one-to-one Richgo units '+a.k);
  if(W.UNITFIX[a.k]&&a.far!=null)assert.equal(W.UNITFIX[a.k][0],a.units,'last unitfix override '+a.k);
 }
}
console.log('PASS: all 626 original apartment complexes mapped; 621 Richgo FAR parity; 5 public-source FAR blanks; 326 remaining fully verified; run-time overrides consistent.');
