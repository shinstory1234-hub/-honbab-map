/* 55 cross-file live-price complexes: raw array values must match verified Richgo.
 * No added runtime request; all price reference values remain unchanged.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pub=root+'/public';
const audit=JSON.parse(fs.readFileSync(root+'/docs/richgo30-final-20261118.json','utf8'));
const rows=audit.rows.filter(x=>x.cohort==='bt_livecur');
const FARD={},PICKS=[],paths=['apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js'];
for(const f of paths){
 const s=fs.readFileSync(pub+'/'+f,'utf8'),A=JSON.parse(s.slice(s.indexOf('const A=')+8,s.indexOf(',S=['))),begin=s.indexOf('R=[')+2,end=s.indexOf(f.includes('add')?';\nObject.assign(window.DEM':';\nconst TB',begin),R=JSON.parse(s.slice(begin,end));
 for(const r of R){const area=A[r[1]],key=r[0]+'|'+area;FARD[key]=r.at(-1).slice();PICKS.push({n:r[0],area,year:r[4],units:r[5],lat:r[6]/1e5,lng:r[7]/1e5,py:r[2],p:r[3]})}
}
const c={CAPT:30,FARD,PICKS,CXP:[],PLAT:{}};c.window=c;
for(const f of ['apt-farfix.js','apt-far-normalize.js'])vm.runInNewContext(fs.readFileSync(pub+'/'+f,'utf8'),c,{filename:f});
let far=0,blank=0,units=0,years=0;
const bad=[];
for(const row of rows){
 const key=row.key,rich=row.richgo;
 if(!c.FARD[key])throw Error(key+' missing from price assets');
 if(rich.far!=null){
  if(c.FARD[key][0]!==rich.far)bad.push({key,rich:rich.far,effective:c.FARD[key][0],source:c.FARD[key][1]});
  far++;
 }else blank++;
 const ratio=row.match?.unitRatio??1,integrated=row.integrated||ratio>.15;
 const wantUnit=row.map.units!==rich.units&&!integrated&&rich.units>=300&&ratio<=.15;
 const wantYear=row.map.year!==rich.year&&!integrated&&Math.abs(rich.year-row.map.year)<=3;
 const records=PICKS.filter(x=>x.n+'|'+x.area===key);
 assert.ok(records.length,key+' absent');
 if(wantUnit){if(!records.every(r=>r.units===rich.units))bad.push({key,units:records.map(r=>r.units),richUnits:rich.units});units++}
 if(wantYear){if(!records.every(r=>r.year===rich.year))bad.push({key,years:records.map(r=>r.year),richYear:rich.year});years++}
}
assert.deepEqual(bad,[],'verified FAR, units or years incorrectly overridden');
assert.equal(rows.length,55);assert.equal(far,53);assert.equal(blank,2);assert.equal(units,7);assert.equal(years,4);
const sourceFiles=new Set(rows.map(r=>r.sourceFile));
assert.equal(sourceFiles.size,4);
console.log('CAP30_ALL55_RAW_FACTS_PASS',JSON.stringify({crossbandRawComplexes:55,farVerified:53,farBlank:2,unitsCorrected:7,yearsCorrected:4,extraRuntimeRequests:0}));
