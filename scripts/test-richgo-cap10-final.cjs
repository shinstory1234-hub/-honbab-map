'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
function csvCount(p){const t=fs.readFileSync(p,'utf8').trim().split(/\r?\n/);return t.length-1;}
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const parts=Array.from({length:6},(_,i)=>read('docs/richgo-6to10-remaining-parts/part0'+i+'.json'));
const all=parts.flatMap(x=>x.rows);const ids=new Set(all.map(x=>x.key));
assert.equal(all.length,1108);assert.equal(ids.size,1108);
assert.equal(csvCount('docs/richgo-6to10-remaining1108-20261118.csv'),1108);
assert.equal(csvCount('docs/richgo-6to10-full-coverage-20261118.csv'),1822);
const f=read('scripts/richgo-band10-corrections.json');
assert.equal(new Set(f.map(x=>x.name+'|'+x.area)).size,f.length);
for(const row of f){
 assert.ok(row.far==null||(Number.isFinite(row.far)&&row.far>=60&&row.far<=1500),'invalid FAR '+row.name);
 assert.ok(row.year==null||Number.isInteger(row.year),'invalid year '+row.name);
 assert.ok(row.units==null||Number.isInteger(row.units),'invalid units '+row.name);
}
const report=fs.readFileSync('docs/richgo-6to10-final-audit-20261118.md','utf8');
assert.ok(report.includes('1,108')&&report.includes('1,822'));
const build=fs.readFileSync('scripts/build-apt-assets.mjs','utf8');
assert.match(build,/cap === 10 && file === 'apt-univ10.js'/);
assert.match(build,/cap === 10 && file === 'apt-farfix.js'/);
console.log('PASS 1108 source-linked records + 1822 coverage + cap10 isolation, corrections='+f.length);
