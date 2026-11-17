import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {patchRichgoCap10Source} from './apply-richgo-band10.mjs';

const root=path.resolve('.');
const input=fs.readFileSync('public/apt-univ10.js','utf8');
const patched=patchRichgoCap10Source(input,root);
const records=JSON.parse(fs.readFileSync('scripts/richgo-band10-corrections.json','utf8'));
const audited=JSON.parse(fs.readFileSync('docs/richgo-band10-current300-verified.json','utf8'));
assert.equal(audited.scope,300);
assert.equal(audited.records.length,300,'all 300 complexes must be audited');
const inputCsv=fs.readFileSync('docs/richgo-band10-current300-input.csv','utf8').replace(/^\ufeff/,'').split(/\r?\n/);
assert.equal(inputCsv.filter(x=>x.trim()).length,301,'exactly 300 current-rank candidates');
const apply=code=>{
 const c={PICKS:[],FARD:{},UGEO:{},HAK:{},CAPT:10,console}; c.window=c;
 vm.createContext(c);vm.runInContext(code,c);return c;
};
const original=apply(input),newer=apply(patched);
assert.equal(original.PICKS.length,newer.PICKS.length);
assert.deepEqual(Object.keys(original.FARD).sort(),Object.keys(newer.FARD).sort());
const toKey=d=>d.n+'|'+d.area;
const before=new Map(original.PICKS.map(x=>[toKey(x),x]));
const after=new Map(newer.PICKS.map(x=>[toKey(x),x]));
const checked=new Set(records.map(x=>x.name+'|'+x.area));
let found=0;
for(const [k,old] of before){
 const now=after.get(k);assert.ok(now,k);assert.equal(now.p,old.p,'price must not change '+k);
 assert.deepEqual(Array.from(now.types, t=>({py:t.py,p:t.p})),Array.from(old.types,t=>({py:t.py,p:t.p})),'per-flat prices must not change '+k);
 const b=original.FARD[k],a=newer.FARD[k];
 if(!checked.has(k)){assert.equal(now.year,old.year,'year changed outside correction set '+k);
  assert.equal(now.units,old.units,'units changed outside correction set '+k);
  assert.equal(a?.[0],b?.[0],'FAR changed outside correction set '+k);
 } else found++;
}
assert.equal(found,records.length,'all correction complex identities matched');
for(const x of records){
 const k=x.name+'|'+x.area;
 const d=after.get(k);assert.ok(d);
 if(x.far!==undefined)assert.equal(newer.FARD[k][0],x.far,k);
 if(x.year!==undefined)assert.equal(d.year,x.year,k);
 if(x.units!==undefined)assert.equal(d.units,x.units,k);
}
const statuses=Object.groupBy(audited.records,r=>r.status);
console.log('Richgo band10 300 audit PASS;',records.length,'unique corrected;',Object.fromEntries(Object.entries(statuses).map(([k,v])=>[k,v.length])));
