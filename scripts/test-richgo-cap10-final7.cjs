#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
function csv(t){
 let rows=[],r=[],s='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){s+='"';i++;}else if(c==='"')q=false;else s+=c;}
 else if(c==='"')q=true;else if(c===','){r.push(s);s='';}else if(c==='\n'){r.push(s.replace(/\r$/,''));rows.push(r);r=[];s='';}else if(c!=='\r')s+=c;}
 if(s||r.length){r.push(s);rows.push(r);}
 const h=rows.shift().map(x=>x.replace(/^\ufeff/,''));return rows.filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])));
}
const source=csv(fs.readFileSync('docs/richgo-6to10-full-coverage-20261118.csv','utf8'));
const all=csv(fs.readFileSync('docs/richgo-6to10-final343-20261118.csv','utf8'));
const unresolved=csv(fs.readFileSync('docs/richgo-6to10-unresolved237-20261118.csv','utf8'));
const fixes=JSON.parse(fs.readFileSync('scripts/richgo-band10-corrections.json','utf8'));
assert.equal(source.length,1822);
assert.equal(all.length,343);
assert.equal(unresolved.length,237);
assert.equal(fixes.length,1439);
assert.equal(new Set(source.map(x=>x.name+'|'+x.area)).size,1822);
assert.equal(new Set(all.map(x=>x.name+'|'+x.area)).size,343);
assert.equal(new Set(unresolved.map(x=>x.name+'|'+x.area)).size,237);
assert.equal(new Set(fixes.map(x=>x.name+'|'+x.area)).size,1439);
const unverified=source.filter(x=>!x.review_status.includes('verified'));
assert.equal(unverified.length,237);
assert.equal(source.filter(x=>x.review_status.includes('verified')).length,1585);
assert.equal(source.filter(x=>x.far_after_verified==='').length,132);
const exceptionKeys=new Set(unresolved.map(x=>x.name+'|'+x.area));
for(const s of unverified)assert.ok(exceptionKeys.has(s.name+'|'+s.area),'missing exception classification: '+s.name);
for(const x of fixes){
 assert.ok(Number.isFinite(x.far)||Number.isInteger(x.units)||Number.isInteger(x.year),'Correction missing source data');
 if(x.far!=null)assert.ok(x.far>=60&&x.far<=1500);
 if(x.year!=null)assert.ok(Number.isInteger(x.year));
 if(x.units!=null)assert.ok(Number.isInteger(x.units)&&x.units>0);
}
const budget=JSON.parse(fs.readFileSync('scripts/perf-budget.json','utf8'));
assert.equal(budget.gzipBytesPerTab['10'],1512771,'cap10 network budget cannot increase');
assert.equal(budget.gzipBytesPerTab['6'],1189209,'under6 budget cannot change');
const report=fs.readFileSync('docs/richgo-6to10-unresolved237-report-20261118.md','utf8');
assert.match(report,/237개/);
console.log('FINAL CAP10 AUDIT PASS: 1822 inspected; 1585 identity verified; 237 documented exceptions; 1439 cap10 corrections; 132 FAR blank');
