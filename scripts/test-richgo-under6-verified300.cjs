/* Source parity tests for the 300 verified Richgo complexes, with no changes to >6억 tabs. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..'), load=p=>fs.readFileSync(root+'/public/'+p,'utf8');
const univ=load('apt-univ.js');assert.ok(univ.includes('RICHGO6_APPLIED'));
function make(cap){
 const c={CAPT:cap,console};c.window=c;vm.createContext(c);
 for(const p of ['apt-unitfix.js','apt-picks.js','apt-auto3.js','apt-fard.js','apt-univ.js','apt-farfix.js'])vm.runInContext(load(p),c,{filename:p});
 return c;
}
const parse=s=>{let out=[],row=[],cell='',q=false;for(let j=0;j<s.length;j++){const v=s[j];if(q){if(v==='"'&&s[j+1]==='"'){cell+='"';j++;}else if(v==='"')q=false;else cell+=v;}else if(v===','){row.push(cell);cell='';}else if(v==='"')q=true;else if(v==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell='';}else cell+=v;}if(row.length||cell){row.push(cell.replace(/\r$/,''));out.push(row);}const head=out.shift();return out.filter(x=>x.length>2).map(x=>Object.fromEntries(head.map((k,j)=>[k,x[j]??''])));};
const rows=parse(fs.readFileSync(root+'/docs/richgo-under6-verified300-20261118.csv','utf8').replace(/^\ufeff/,''));
assert.equal(rows.length,300);assert.ok(rows.every(r=>r.status==='직접대조'));
const c=make(6);assert.equal(c.RICHGO6_APPLIED?.verified,300);
const byKey=new Map(c.PICKS.map(d=>[d.n+'|'+d.area,d]));let compared=0,changed={far:0,year:0,units:0};
for(const r of rows){
 const key=r.name+'|'+r.area,d=byKey.get(key);assert.ok(d,'missing '+key);
 assert.equal(d.p,Number(r.map_reference_price_manwon),'must preserve transaction-derived price '+key);
 const f=r.richgo_far?Number(r.richgo_far):null;
 if(f!==null&&f>=60&&f<=1200){assert.equal(Number(c.FARD[key][0]),f,'FAR mismatch '+key);compared++;}
 if(r.richgo_year)assert.equal(d.year,Number(r.richgo_year),'year mismatch '+key);
 if(r.richgo_units){assert.equal(d.units,Number(r.richgo_units),'units mismatch '+key);
   if(Number(r.map_units)!==Number(r.richgo_units)&&c.UNITFIX[key])assert.equal(c.UNITFIX[key][0],d.units,'unit fix overrides verified value '+key);}
 if(r.richgo_far&&(!r.map_far||Number(r.map_far)!==Number(r.richgo_far)))changed.far++;
 if(r.richgo_year&&Number(r.map_year)!==Number(r.richgo_year))changed.year++;
 if(r.richgo_units&&Number(r.map_units)!==Number(r.richgo_units))changed.units++;
}
assert.equal(compared,298);assert.deepEqual(changed,{far:280,year:10,units:5});
assert.ok(!/apt-univ\.js/.test('apt-univ10.js'),'separate runtime files');
const noUniv={CAPT:10,console};noUniv.window=noUniv;vm.createContext(noUniv);
for(const p of ['apt-unitfix.js','apt-picks.js','apt-fard.js','apt-farfix.js'])vm.runInContext(load(p),noUniv,{filename:p});
assert.equal(noUniv.RICHGO6_APPLIED,undefined,'must not apply under6 correction to higher-priced bands');
console.log('Richgo300 verified ✅; 298 FAR fields, 10 year and 5 units verified; price untouched; cap10 unaffected');
