#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const json=p=>JSON.parse(read(p));
function csv(t){const rows=[];let row=[],cell='',quote=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(quote){if(c==='"'&&t[i+1]==='"'){cell+='"';i++;}else if(c==='"')quote=false;else cell+=c;}
 else if(c==='"')quote=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}
 if(cell||row.length){row.push(cell);rows.push(row);}const cols=rows.shift().map(x=>x.replace(/^\ufeff/,''));return rows.filter(r=>r.length===cols.length).map(row=>Object.fromEntries(cols.map((c,i)=>[c,row[i]])));
}
const all=csv(read('docs/richgo-6to10-full-coverage-20261118.csv'));
const first343=csv(read('docs/richgo-6to10-final343-20261118.csv'));
const final237=csv(read('docs/richgo-6to10-force237-final-20261118.csv'));
const missing=csv(read('docs/richgo-6to10-force237-no-source-20261118.csv'));
const fixes=json('scripts/richgo-band10-corrections.json');
assert.equal(all.length,1822);assert.equal(first343.length,343);assert.equal(final237.length,237);
assert.equal(fixes.length,1635);assert.equal(missing.length,41);
assert.equal(new Set(all.map(x=>x.name+'|'+x.area)).size,1822);
assert.equal(new Set(fixes.map(x=>x.name+'|'+x.area)).size,fixes.length);
const verified=all.filter(x=>x.review_status.includes('verified'));
assert.equal(verified.length,1781);assert.equal(all.length-verified.length,missing.length);
const farCount=all.filter(x=>x.far_after_verified!=='').length;
assert.equal(farCount,1748);assert.equal(all.length-farCount,74);
const allKeys=new Map(all.map(x=>[x.name+'|'+x.area,x]));
const fixKeys=new Map(fixes.map(x=>[x.name+'|'+x.area,x]));
for(const v of missing){
 const key=v.name+'|'+v.area;
 assert.ok(allKeys.has(key),'unresolved complex not in original 1822: '+key);
 assert.ok(!allKeys.get(key).review_status.includes('verified'),'false verification of '+key);
 assert.equal(v.richgo_url,'','wrongly marked unmatched row with source URL');
}
let checked=0,clear=0;
for(const row of all){
 const key=row.name+'|'+row.area;
 if(!row.review_status.startsWith('audit8_richgo_verified')&&!row.review_status.startsWith('audit9_richgo_verified'))continue;
 checked++;
 const fix=fixKeys.get(key);
 assert.ok(fix,'missing Richgo correction '+key);
 assert.ok(/^https:\/\/m\.richgo\.ai\/realty\/danji\/a[A-Za-z0-9]{6}$/.test(row.richgo_url),'missing authentic Richgo page '+key);
 assert.equal(+row.units_after_verified,+fix.units,'household values inconsistent '+key);
 assert.equal(+row.year_after_verified,+fix.year,'year inconsistent '+key);
 assert.equal(+row.richgo_units,+fix.units,'Richgo unit evidence inconsistent '+key);
 assert.equal(+row.richgo_year,+fix.year,'Richgo completion year inconsistent '+key);
 if(fix.clearFar===true){
  clear++;assert.equal(row.far_after_verified,'','Richgo empty FAR not cleared '+key);
 }else{assert.ok(fix.far>=60&&fix.far<=1500);assert.equal(+row.richgo_far,fix.far);assert.equal(+row.far_after_verified,fix.far);}
}
assert.equal(checked,196,'187 catalog + 9 manual alias source rows must be accounted for');
const budget=json('scripts/perf-budget.json');
assert.equal(budget.gzipBytesPerTab['6'],1189209);
assert.equal(budget.gzipBytesPerTab['10'],1512771);
assert.equal(budget.maxRequestsPerTab,9);
console.log('PASS Richgo-first cap10: 1822 apartments, 1781 source-matched, 41 detailed source exceptions, 1635 updates, 74 FAR blanks, 196 newly linked Richgo identities, '+clear+' authentically blank FAR');
