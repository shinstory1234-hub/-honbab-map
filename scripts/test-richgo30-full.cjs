/* Verification gate: full 273-case cap30 audit, 218 raw-source correction.
 * Validate effective FAR after legacy scripts, price immutability and build invariants.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'public');
const report=JSON.parse(fs.readFileSync(root+'/docs/richgo30-final-20261118.json','utf8')),applied=JSON.parse(fs.readFileSync(root+'/docs/richgo30-applied-20261118.json','utf8'));
assert.equal(report.rows.length,273);assert.equal(report.rows.filter(x=>x.status==='direct_verified').length,273);
assert.equal(report.rows.filter(x=>x.richgo?.far!=null).length,260);
assert.equal(report.rows.filter(x=>x.richgo?.far==null).length,13);
assert.equal(new Set(report.rows.map(x=>x.key)).size,273);
const raw=fs.readFileSync(dir+'/apt-univ30.js','utf8'),A=JSON.parse(raw.slice(raw.indexOf('const A=')+8,raw.indexOf(',S=['))),p=raw.indexOf('R=['),R=JSON.parse(raw.slice(p+2,raw.indexOf(';\nconst TB',p)));
assert.equal(R.length,218);assert.equal(applied.rawSourceRows,218);assert.equal(applied.targetCohort,273);
const byKey=new Map(R.map(r=>[r[0]+'|'+A[r[1]],r]));
const sourceReport=new Map(report.rows.map(x=>[x.key,x]));
const FARD=Object.fromEntries(R.map(r=>[r[0]+'|'+A[r[1]],r.at(-1).slice()]));
const c={CAPT:30,CXP:[],PICKS:[],FARD,PLAT:{}};c.window=c;
for(const f of ['apt-farfix.js','apt-far-normalize.js'])vm.runInNewContext(fs.readFileSync(dir+'/'+f,'utf8'),c,{filename:f});
const mismatches=[],priceChanges=[],wrongIdentity=[],missingFarRows=[];
for(const [key,r] of byKey){
 const row=sourceReport.get(key);assert.ok(row,'missing source audit row '+key);
 if(!row.richgo||row.status!=='direct_verified'||!row.match)wrongIdentity.push(key);
 const proof=applied.proof.find(x=>x.key===key);
 assert.ok(proof,'missing immutable change proof '+key);
 if(proof.old.price!==r[3]||row.map.price!==r[3])priceChanges.push(key);
 if(row.richgo.far!=null){
   if(r.at(-1)[0]!==row.richgo.far||c.FARD[key]?.[0]!==row.richgo.far)
     mismatches.push({key,raw:r.at(-1)[0],effective:c.FARD[key]?.[0],richgo:row.richgo.far,source:c.FARD[key]?.[1]});
 }else missingFarRows.push(key);
}
assert.deepEqual(wrongIdentity,[],'unverified identities');
assert.deepEqual(priceChanges,[],'original prices changed');
assert.deepEqual(mismatches,[],'FAR differs from Richgo after runtime overrides');
assert.equal(applied.proof.length,218);
console.log('CAP30_ALL_PASS',JSON.stringify({sourceRecords:218,candidates:273,identityVerified:273,richgoFarNumeric:260,richgoFarBlank:13,rawFarBlank:missingFarRows.length,changed:applied.changed}));
