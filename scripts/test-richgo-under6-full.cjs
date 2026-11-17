const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
function csv(s){let rows=[],r=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){r.push(v);v=''}else if(c==='\n'){r.push(v.replace(/\r$/,''));rows.push(r);r=[];v=''}else v+=c;}const h=rows.shift();return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
const files=['apt-unitfix.js','apt-picks.js','apt-auto3.js','apt-fard.js','apt-univ.js','apt-farfix.js'];
function load(cap,before=false){let c={CAPT:cap,console};c.window=c;vm.createContext(c);for(const f of files){if(cap!==6&&f==='apt-univ.js')continue;const s=before?cp.execFileSync('git',['show','154824b:public/'+f],{encoding:'utf8',maxBuffer:10e6}):fs.readFileSync('public/'+f,'utf8');vm.runInContext(s,c,{filename:f});}return c;}
const before=load(6,true),after=load(6),rows=csv(fs.readFileSync('docs/richgo-under6-applied-far-20261118.csv','utf8'));
assert.ok(rows.length>=2128);let changed=0;
for(const r of rows){const k=r.name+'|'+r.area;assert.equal(after.FARD[k]?.[0],+r.new_far,k);if(before.FARD[k]?.[0]!==+r.new_far)changed++;}
assert.equal(JSON.stringify(before.PICKS),JSON.stringify(after.PICKS),'all picks, prices, coordinates, units and years preserved');
assert.equal(JSON.stringify(before.UGEO),JSON.stringify(after.UGEO),'map and station coordinates preserved');
assert.equal(JSON.stringify(before.HAK),JSON.stringify(after.HAK),'school data preserved');
for(const cap of [10,15,20,25,30,35]){let a=load(cap,true),b=load(cap);assert.equal(JSON.stringify(a.FARD),JSON.stringify(b.FARD),'other band FAR '+cap);assert.equal(JSON.stringify(a.PICKS),JSON.stringify(b.PICKS),'other band picks '+cap);}
console.log(JSON.stringify({sourceParity:rows.length,changedInRuntime:changed,allOtherPickFieldsUnchanged:true,higherBandsUnchanged:true}));
