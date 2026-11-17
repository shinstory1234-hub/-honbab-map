/* Price-band-isolated dynamic FAR correction: external 55 complexes.
 * Cap30 must match 53 verified FAR, seven separately confirmed unit counts
 * and four build years; cap25 must behave exactly as before.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pub=root+'/public';
const audit=JSON.parse(fs.readFileSync(root+'/docs/richgo30-final-20261118.json','utf8'));
const rows=audit.rows.filter(x=>x.cohort==='bt_livecur'),out=fs.readFileSync(pub+'/apt-far-normalize.js','utf8');
const k=out.indexOf('/* Verified Richgo cap30-only overlay');
assert.ok(k>0,'source-isolated overlay missing');
const old=out.slice(0,k);
const FARD={},PICKS=[],files=['apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js'];
for(const f of files){
 const s=fs.readFileSync(pub+'/'+f,'utf8'),A=JSON.parse(s.slice(s.indexOf('const A=')+8,s.indexOf(',S=['))),begin=s.indexOf('R=[')+2,end=s.indexOf(f.includes('add')?';\nObject.assign(window.DEM':';\nconst TB',begin),R=JSON.parse(s.slice(begin,end));
 for(const r of R){const area=A[r[1]],key=r[0]+'|'+area;FARD[key]=r.at(-1).slice();PICKS.push({n:r[0],area,year:r[4],units:r[5],lat:r[6]/1e5,lng:r[7]/1e5,py:r[2],p:r[3]})}
}
const run=(cap,code)=>{
const c={CAPT:cap,FARD:JSON.parse(JSON.stringify(FARD)),PICKS:JSON.parse(JSON.stringify(PICKS)),CXP:[],PLAT:{}};c.window=c;
for(const f of ['apt-farfix.js'])vm.runInNewContext(fs.readFileSync(pub+'/'+f,'utf8'),c,{filename:f});
vm.runInNewContext(code,c,{filename:'apt-far-normalize.js'});
return c;
};
const base=run(25,old),check25=run(25,out),check30=run(30,out);
assert.deepEqual(JSON.parse(JSON.stringify(check25.FARD)),JSON.parse(JSON.stringify(base.FARD)),'cap25 FAR affected by cap30-only patch');
assert.deepEqual(JSON.parse(JSON.stringify(check25.PICKS)),JSON.parse(JSON.stringify(base.PICKS)),'cap25 units/year affected by cap30-only patch');
let far=0,units=0,years=0;
for(const row of rows){
 const key=row.key,rich=row.richgo;
 assert.ok(check30.FARD[key],key+' not in current map assets');
 if(rich.far!=null){
  assert.equal(check30.FARD[key][0],rich.far,key+' effective FAR mismatch');
  assert.equal(check30.FARD[key][1],'R',key+' Richgo source priority missing');
  far++;
 }
 const u=row.match.unitRatio??1,integrated=row.integrated||u>.15;
 const sourceUnit=row.map.units!==rich.units&&!integrated&&rich.units>=300&&u<=.15;
 const sourceYear=row.map.year!==rich.year&&!integrated&&Math.abs(rich.year-row.map.year)<=3;
 const member=check30.PICKS.find(x=>x.n+'|'+x.area===key);
 assert.ok(member,key+' row missing');
 if(sourceUnit){assert.equal(member.units,rich.units,key+' unit mismatch');units++}
 if(sourceYear){assert.equal(member.year,rich.year,key+' year mismatch');years++}
}
assert.equal(rows.length,55);assert.equal(far,53);assert.equal(units,7);assert.equal(years,4);
console.log('CAP30_LIVE_MATCH',JSON.stringify({externalSourceCandidates:55,verifiedFar:53,blankFar:2,unitsCorrected:7,yearsCorrected:4,cap25Unchanged:true}));
