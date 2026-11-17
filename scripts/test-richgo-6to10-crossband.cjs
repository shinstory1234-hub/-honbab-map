/* Audit release guard for the 6–10억 Richgo cross-band source reuse. */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
function csv(text){
  const rows=[],head=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){let c=text[i];if(quote){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quote=false;else cell+=c;}
   else if(c==='"')quote=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}
  if(cell||row.length){row.push(cell);rows.push(row);}
  const cols=rows.shift().map(x=>x.replace(/^\ufeff/,''));return rows.filter(x=>x.length===cols.length).map(x=>Object.fromEntries(cols.map((k,j)=>[k,x[j]])));
}
const all=csv(read('docs/richgo-6to10-full-coverage-20261118.csv'));
const newEvidence=csv(read('docs/richgo-6to10-crossband-verified415-20261118.csv'));
const old=JSON.parse(read('docs/richgo-band10-current300-verified.json'));
const corrections=JSON.parse(read('scripts/richgo-band10-corrections.json'));
assert.equal(all.length,1822,'the entire current 6–10억 universe must be enumerated');
assert.equal(new Set(all.map(x=>x.name+'|'+x.area)).size,all.length,'duplicate complex identity');
assert.equal(old.records.length,300,'previous source evidence must be preserved');
assert.equal(newEvidence.length,415,'cross-band evidence must cover 415 distinct complexes');
assert.ok(corrections.length>=556,'all 556 previously verified cap10 corrections must be preserved');
assert.equal(new Set(corrections.map(x=>x.name+'|'+x.area)).size,corrections.length,'duplicate correction');
const reviewed=all.filter(x=>x.review_status!=='not_reviewed');
assert.equal(reviewed.length,714,'714 of 1822 should be source-linked');
assert.equal(all.length-reviewed.length,1108,'1108 must remain explicitly unreviewed');
const original=new Map(all.map(x=>[x.name+'|'+x.area,x]));
const corrected=new Map(corrections.map(x=>[x.name+'|'+x.area,x]));
for(const row of newEvidence){
  const key=row.name+'|'+row.area,source=original.get(key),fix=corrected.get(key);
  assert.ok(source&&fix,'missing verified source or correction '+key);
  assert.ok(row.source_url.startsWith('https://m.richgo.ai/realty/danji/'),'missing link '+key);
  assert.equal(source.review_status,'crossband_verified_'+row.verification_source,'review mark mismatch '+key);
  assert.equal(Number(row.richgo_units),Number(row.map_units),'household mismatch '+key);
  assert.equal(Number(row.richgo_far),Number(fix.far),'FAR mismatch '+key);
  assert.ok(Number(row.richgo_far)>=60&&Number(row.richgo_far)<=1500,'FAR out of range '+key);
  assert.ok(!row.richgo_year||Math.abs(Number(row.richgo_year)-Number(row.map_year))<=2,'completion-year conflict '+key);
}
const build=read('scripts/build-apt-assets.mjs');
assert.match(build,/cap === 10 && file === 'apt-univ10.js'/,'corrections must only affect cap 10');
assert.match(build,/cap === 10 && file === 'apt-farfix.js'/,'final FAR overlay must only affect cap 10');
console.log('6–10억 Richgo PASS: 1822 total, 714 reviewed, 415 reused, 556 corrections, 1108 remaining');
