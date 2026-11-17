/* Regression coverage for the entire frozen 372-rank Richgo 20~25억 audit.
   Intended for 372 verified cases, all first-party price-band boundaries preserved. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const dir=path.resolve(__dirname,'..'),load=(p)=>fs.readFileSync(path.join(dir,p),'utf8');
const data=JSON.parse(load('docs/richgo-20to25-all372-audit-20261118.json')).audited;
assert.equal(data.length,372,'exactly 372 rank rows must be independently audited');
assert.equal(new Set(data.map(d=>d.rank)).size,372,'rank unique');
assert.equal(new Set(data.map(d=>d.name+'|'+d.area)).size,372,'complex key unique');
const verified=data.filter(x=>x.status==='직접대조');
assert.equal(verified.length,372,'do not declare full completion until all 372 have matching Richgo public pages');
for(const d of verified)assert.ok(Number.isFinite(d.coordinateDistanceM)&&d.coordinateDistanceM<=500,`not the same apartment coordinates, rank ${d.rank}: ${d.name}: ${d.coordinateDistanceM}m`);
const files=['apt-unitfix.js','apt-fard.js','apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js','apt-farfix.js','apt-far-normalize.js'];
function make(cap,patch){
 const c={CAPT:cap,PICKS:[],UGEO:{},HAK:{},FARD:{},PLAT:{},console};c.window=c;vm.createContext(c);
 for(const p of files)vm.runInContext(load('public/'+p),c,{filename:p});
 if(patch)vm.runInContext(load('public/apt-richgo25.js'),c,{filename:'apt-richgo25.js'});
 return c;
}
const base=make(25,false),live=make(25,true);
const key=d=>d.name+'|'+d.area;
const find=(c,k)=>c.PICKS.find(d=>d.n+'|'+d.area===k);
assert.equal(live.RICHGO25_FULL_PATCH?.rankingRows,372);
assert.equal(live.RICHGO25_FULL_PATCH?.verified,372);
let changes={far:0,units:0,year:0},noncomparable=0;
for(const d of verified){
 const k=key(d),b=find(base,k),x=find(live,k);assert.ok(b&&x,'missing '+k);
 const oldF=base.FARD[k],newF=live.FARD[k];
 assert.ok(oldF&&newF,'FARD '+k);
 if(d.richgoFar!==null){
  assert.equal(Number(newF[0]),Number(d.richgoFar),'Richgo FAR '+k);
  if(d.richgoFar!==d.mapFar)changes.far++;
 }
 if(d.unitsComparable===false) {
   noncomparable++;
   assert.equal(x.units,b.units,'do not overwrite distinct block units with whole-site total '+k);
 } else if(d.richgoUnits!==null){
   const effective=(live.UNITFIX_M3||{})[k]?.[0]??(live.UNITFIX||{})[k]?.[0]??x.units;
   assert.equal(effective,d.richgoUnits,'Richgo effective site units '+k);
   if(d.richgoUnits!==d.mapUnits)changes.units++;
 }
 if(d.richgoYear!==null){
  assert.equal(x.year,d.richgoYear,'Richgo completion year '+k);
  if(d.richgoYear!==d.mapYear)changes.year++;
 }
 assert.equal(JSON.stringify(x.types),JSON.stringify(b.types),'prices and flat types unchanged '+k);
}
assert.equal(live.RICHGO25_FULL_PATCH.farDiffs,changes.far);
assert.equal(live.RICHGO25_FULL_PATCH.unitDiffs,changes.units);
assert.equal(live.RICHGO25_FULL_PATCH.yearDiffs,changes.year);
for(const cap of [6,10,15,20,30,35]){
 const old=make(cap,false),cur=make(cap,true);
 assert.equal(cur.RICHGO25_FULL_PATCH,undefined,'never patch cap '+cap);
 assert.equal(JSON.stringify(old.PICKS.map(d=>[d.n,d.area,d.units,d.year,d.types])),JSON.stringify(cur.PICKS.map(d=>[d.n,d.area,d.units,d.year,d.types])),'other cap PICKS '+cap);
 assert.equal(JSON.stringify(old.FARD),JSON.stringify(cur.FARD),'other cap FAR '+cap);
}
console.log('Verified '+verified.length+' Richgo web details; '+JSON.stringify(changes)+' changed, '+noncomparable+' shared K-apt blocks preserved, other six price bands unchanged ✅');
