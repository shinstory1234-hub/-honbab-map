'use strict';
/* 1,114-complex cap15 full-band audit invariants; zero changes to other bands. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),file=name=>path.join(root,name);
function readCSV(s){let table=[],row=[],cell='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c;}else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell.replace(/\r$/,''));table.push(row);row=[];cell=''}else cell+=c;}const h=table.shift();return table.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
const remaining=file('docs/richgo-10to15-remaining814-20261118.csv');
if(!fs.existsSync(remaining)){console.log('Full cap15 pending: 814 evidence not yet committed');process.exit(0)}
const a=readCSV(fs.readFileSync(file('docs/richgo-10to15-top300-20261118.csv'),'utf8'));
const b=readCSV(fs.readFileSync(remaining,'utf8'));
assert.equal(a.length,300,'top300 invariant');
assert.equal(b.length,814,'remaining814 inventory');
const rows=[...a,...b],key=x=>x.name+'|'+x.area,byKey=new Map(rows.map(x=>[key(x),x]));
assert.equal(byKey.size,1114,'1114 distinct apartment names and neighborhoods');
const src=fs.readFileSync(file('public/apt-univ15.js'),'utf8'),si=src.indexOf('const A=['),ei=src.indexOf('],',si),sr=src.indexOf(',R=['),er=src.indexOf('];\nconst TB=',sr);
const areas=JSON.parse(src.slice(si+8,ei+1)),packed=JSON.parse(src.slice(sr+3,er+1));
assert.equal(packed.length,1114,'packed universe size');
const univ=new Set(packed.map(x=>x[0]+'|'+areas[x[1]]));assert.equal(univ.size,1114);
for(const k of byKey.keys())assert.ok(univ.has(k),'unexpected apartment '+k);
const spec=JSON.parse(fs.readFileSync(file('docs/richgo-10to15-verified-corrections.json'),'utf8'));
for(const field of ['far','units','year']){
 for(const [k,v] of Object.entries(spec[field]||{})){
  const row=byKey.get(k);
  assert.ok(row,'correction outside cap15 inventory '+k);
  assert.ok(['직접확인','리치고집계기준적용','리치고명칭기준적용'].includes(row.verification),'not Richgo-evidenced '+k);
  assert.equal(Number(row['richgo_'+field]),Number(v),'value differs from stored Richgo evidence '+k);
  assert.ok(/^https:\/\/m\.richgo\.ai\/realty\/danji\/a[A-Za-z0-9]{6}$/.test(row.source_url),'source page missing '+k);
 }
}
for(const [k,v] of Object.entries(spec.farFallbackKB||{})){
 const row=byKey.get(k);
 assert.ok(row&&row.richgo_far==='','KB fallback when Richgo FAR is blank');
 assert.equal(Number(row.fallback_far),Number(v));
 assert.ok(/^https:\/\/kbland\.kr\/se\/c\//.test(row.fallback_source_url));
}
/* 2026-11-18 independent revalidation: explicit identity proof, not merely shared dong/name */
for(const [n,id] of [[279,'a6rNDte'],[462,'a3YPzVc'],[927,'a4FYnXO'],[1110,'a1wiFrS']]){
 const r=rows.find(x=>Number(x.seq)===n);
 assert.ok(r&&r.verification==='직접확인','corrected row must be validated '+n);
 assert.equal(r.richgo_id,id,'wrong Richgo phase linked to '+r.name);
 assert.equal(r.source_url,'https://m.richgo.ai/realty/danji/'+id,'corrected source link '+n);
}
const gm=rows.find(x=>Number(x.seq)===845);
assert.equal(gm.verification,'리치고명칭기준적용','5th phase must follow the actual Richgo 5th page');
assert.equal(gm.richgo_id,'a6yOdDi','5th phase must NOT reuse the 4th phase');
assert.equal(spec.units[key(gm)],731);assert.equal(spec.year[key(gm)],2009);assert.equal(spec.far[key(gm)],159);
const remodel=rows.find(x=>Number(x.seq)===642);
assert.equal(Number(remodel.map_year),2024);
assert.equal(Number(remodel.richgo_year),1992);
assert.ok(!Object.hasOwn(spec.year,key(remodel)),'do not substitute old construction year for 2024 remodeling completion');
/* Development overlay must be bit-exact with the cap15 build corrections, and must
 * not silently alter any of the other six price bands. */
const vm=require('node:vm'),overlay=fs.readFileSync(file('public/apt-richgo15.js'),'utf8');
for(const cap of [6,10,15,20,25,30,35]){
 const FARD=Object.fromEntries(rows.map(x=>[key(x),[x.map_far?Number(x.map_far):null,x.map_far_source||'']]));
 const PICKS=rows.map(x=>({n:x.name,area:x.area,year:Number(x.map_year),units:Number(x.map_units)}));
 const W={CAPT:cap,FARD,PICKS};vm.runInNewContext(overlay,{window:W},{timeout:10000});
 for(const x of rows){const k=key(x),v=FARD[k],correct=cap===15;
  const siteFar=spec.far[k],kb=spec.farFallbackKB?.[k];
  const expected=correct?(siteFar??kb??(x.map_far?Number(x.map_far):null)):(x.map_far?Number(x.map_far):null);
  assert.equal(v[0],expected,'FAR in cap '+cap+': '+k);
  if(correct&&siteFar!=null)assert.equal(v[1],'리치고','FAR provenance '+k);
  if(correct&&kb!=null)assert.equal(v[1],'KB부동산','KB provenance '+k);
 }
 for(const x of PICKS){const k=x.n+'|'+x.area,r=byKey.get(k);
  assert.equal(x.year,cap===15?(spec.year[k]??Number(r.map_year)):Number(r.map_year),'year price-band isolation '+cap+': '+k);
  assert.equal(x.units,cap===15?(spec.units[k]??Number(r.map_units)):Number(r.map_units),'units price-band isolation '+cap+': '+k);
 }
}

const direct=rows.filter(x=>x.verification==='직접확인'),exceptions=rows.filter(x=>x.verification!=='직접확인');
assert.ok(b.every(x=>x.checked_at&&x.audit_discovery),'every remaining row must have had a check');
const report={total:rows.length,first300:a.length,remaining814:b.length,remainingVerified:b.filter(x=>x.verification==='직접확인').length,
 remainingUnmatched:b.filter(x=>x.verification!=='직접확인').length,fullBandVerified:direct.length,
 sourceLinks:rows.filter(x=>!!x.source_url).length,farCorrections:Object.keys(spec.far).length,
 yearCorrections:Object.keys(spec.year).length,unitCorrections:Object.keys(spec.units).length,
 kbFallback:Object.keys(spec.farFallbackKB||{}).length,exceptions:exceptions.length};
console.log('Richgo full-band identity audit OK',JSON.stringify(report));

/* 2026-11-18 user-requested Richgo precedence across 31 merged/segmented + 2 identified cases */
assert.equal(rows.filter(x=>x.verification==='리치고집계기준적용').length,32);
assert.equal(rows.filter(x=>x.verification==='리치고명칭기준적용').length,2);
assert.equal(rows.filter(x=>!['직접확인','리치고집계기준적용','리치고명칭기준적용'].includes(x.verification)).length,5);
