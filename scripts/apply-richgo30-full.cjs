/* Apply only confirmed Richgo cap30 source facts to its raw 218-unit segment.
 * Preserve reference prices, ranking model, other price-band source files.
 * No updates for unverified identity, missing FAR, merged units, renovated year.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),sourcePath=root+'/public/apt-univ30.js',reportPath=root+'/docs/richgo30-resolved-20261118.json';
const audit=JSON.parse(fs.readFileSync(reportPath,'utf8')),all=audit.rows;
assert.equal(all.length,273);
const s=fs.readFileSync(sourcePath,'utf8'),A=JSON.parse(s.slice(s.indexOf('const A=')+8,s.indexOf(',S=[')));
const beg=s.indexOf('R=[')+2,end=s.indexOf(';\nconst TB',beg),R=JSON.parse(s.slice(beg,end));
assert.equal(R.length,218);
const refs=new Map(all.map(x=>[x.key,x])),updated={far:0,source:0,units:0,year:0,farUnavailable:[],notVerified:[],sourceShared:[],unitsPreserved:[],yearsPreserved:[]};
const proof=[];
for(const r of R){
 const key=r[0]+'|'+A[r[1]],x=refs.get(key);assert.ok(x,'source complex missing from full cohort: '+key);
 if(x.status!=='direct_verified'||!x.richgo){updated.notVerified.push(key);continue}
 const d=x.richgo,fd=r.at(-1),before={far:fd[0],source:fd[1],units:r[5],year:r[4],price:r[3]};
 if(d.far!=null){
   assert.ok(d.far>=50&&d.far<=1800,'implausible FAR '+key);
   if(fd[0]!==d.far){fd[0]=d.far;updated.far++}
   if(fd[1]!=='R'){fd[1]='R';updated.source++}
 }else updated.farUnavailable.push(key);
 // The maps contain parent complexes and subblocks. Keep the current individual
 // block units unless both the expected unit count and source identity match.
 const ratio=x.match?.unitRatio??1,merged=x.integrated||ratio>.15;
 if(d.units!==r[5]){
   if(!merged&&d.units>=300&&ratio<=.15){
     r[5]=d.units;updated.units++;
   }else updated.unitsPreserved.push({key,map:r[5],rich:d.units,reason:'integrated or not enough identity evidence'});
 }
 if(d.year!==r[4]){
   if(!merged&&Math.abs(d.year-r[4])<=3&&d.year>1960){r[4]=d.year;updated.year++}
   else updated.yearsPreserved.push({key,map:r[4],rich:d.year,reason:'integrated, historical or renovated year'});
 }
 assert.equal(r[3],before.price,'price regression '+key);
 proof.push({key,url:d.url,method:x.match?.method||'',geo_m:x.match?.distance_m,old:before,after:{far:fd[0],units:r[5],year:r[4]}});
}
fs.writeFileSync(sourcePath,s.slice(0,beg)+JSON.stringify(R)+s.slice(end));
const summary={createdAt:'2026-11-18',targetCohort:all.length,rawSourceRows:R.length,
  sourceConfirmed:proof.length,rawUnverified:updated.notVerified.length,
  changed:{far:updated.far,sourcePriority:updated.source,units:updated.units,year:updated.year},
  farUnreported:updated.farUnavailable,unverified:updated.notVerified,
  unitsPreserved:updated.unitsPreserved,yearsPreserved:updated.yearsPreserved,proof};
fs.writeFileSync(root+'/docs/richgo30-applied-20261118.json',JSON.stringify(summary,null,2)+'\n');
console.log('CAP30_SOURCE_APPLIED',JSON.stringify({allCohort:summary.targetCohort,rawSourceRows:R.length,confirmed:proof.length,
  farChanges:updated.far,farMissing:updated.farUnavailable.length,unitsChanged:updated.units,yearsChanged:updated.year,unknown:updated.notVerified.length}));
