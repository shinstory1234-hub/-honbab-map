/* Verifies read-only 300-complex input and cap=6-only Richgo corrections. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..'), load=p=>fs.readFileSync(root+'/public/'+p,'utf8');
const source=load('apt-research6-600.js');const i=source.indexOf('/* Richgo cross-check of 300 distinct');
assert.ok(i>=0,'verified Richgo patch missing');const patch=source.slice(i);
function baseline(cap){
 const c={CAPT:cap,console};c.window=c;vm.createContext(c);
 for(const p of ['apt-unitfix.js','apt-picks.js','apt-auto3.js','apt-fard.js','apt-univ.js','apt-farfix.js'])vm.runInContext(load(p),c,{filename:p});
 return c;
}
const c=baseline(6),before=new Map(c.PICKS.map(d=>[d.n+'|'+d.area,{year:d.year,units:d.units,p:d.p,far:c.FARD[d.n+'|'+d.area]?.[0]}]));
const parse=s=>{let out=[],row=[],cell='',q=false;for(let j=0;j<s.length;j++){const v=s[j];if(q){if(v==='"'&&s[j+1]==='"'){cell+='"';j++;}else if(v==='"')q=false;else cell+=v;}else if(v==='"')q=true;else if(v===','){row.push(cell);cell='';}else if(v==='\n'){row.push(cell.replace(/\r$/,''));out.push(row);row=[];cell='';}else cell+=v;}if(row.length||cell){row.push(cell.replace(/\r$/,''));out.push(row);}const head=out.shift();return out.filter(x=>x.length>2).map(x=>Object.fromEntries(head.map((k,j)=>[k,x[j]??''])));};
const rows=parse(fs.readFileSync(root+'/docs/richgo-under6-verified300-20261118.csv','utf8').replace(/^\ufeff/,''));
assert.equal(rows.length,300);
vm.runInContext(patch,c,{filename:'Richgo-overrides-under6'});
assert.equal(c.RICHGO6_APPLIED?.verified,300);
let differs={far:0,year:0,units:0};const byKey=new Map(c.PICKS.map(d=>[d.n+'|'+d.area,d]));
for(const r of rows){
 const key=r.name+'|'+r.area, d=byKey.get(key);assert.ok(d,'missing mapped complex '+key);
 const orig=before.get(key);assert.ok(orig);
 assert.equal(d.p,orig.p,'must not overwrite MOLIT transaction-based price '+key);
 if(r.richgo_far&&Number(r.richgo_far)>=60&&Number(r.richgo_far)<=1200){
   assert.equal(Number(c.FARD[key][0]),Number(r.richgo_far),'FAR differs '+key);
 }
 if(r.richgo_year)assert.equal(d.year,Number(r.richgo_year),'year differs '+key);
 if(r.richgo_units)assert.equal(d.units,Number(r.richgo_units),'unit count differs '+key);
 if(r.richgo_far&&(!r.map_far||Number(r.map_far)!==Number(r.richgo_far)))differs.far++;
 if(Number(r.richgo_year)!==Number(r.map_year))differs.year++;
 if(Number(r.richgo_units)!==Number(r.map_units))differs.units++;
}
assert.deepEqual(differs,{far:280,year:10,units:5});
const over=baseline(10),overPrice=over.PICKS[0].p;vm.runInContext(patch,over);
assert.equal(over.RICHGO6_APPLIED,undefined,'must not touch over-6億 price bands');
assert.equal(over.PICKS[0].p,overPrice);
console.log('verified300 Richgo source match OK; 6억 corrections:',c.RICHGO6_APPLIED);
