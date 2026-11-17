/* Richgo cap15 raw-data audit regression: 300 inventory, 22 FAR values, 1 year, other caps unchanged. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const csv=fs.readFileSync(path.join(root,'docs/richgo-10to15-top300-20261118.csv'),'utf8');
function parse(s){
 const table=[];let row=[],cell='',quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c;}
  else if(c==='"')quoted=true;
  else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));table.push(row);row=[];cell='';}
  else cell+=c;
 }
 const h=table.shift();
 return table.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));
}
const records=parse(csv),key=r=>r.name+'|'+r.area;
assert.equal(records.length,300);
assert.equal(new Set(records.map(key)).size,300);
const changes=records.filter(r=>r.action==='변경');
assert.equal(changes.length,22);
assert.ok(changes.every(r=>r.richgo_far&&r.source_url&&r.map_units===r.richgo_units));
const normalizer=fs.readFileSync(path.join(root,'public/apt-far-normalize.js'),'utf8');
const last=normalizer.lastIndexOf('(function(W){');
assert.ok(last>0,'packed 4th pass not found');
const finalPass=normalizer.slice(last);
const html=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');
assert.ok(html.includes("'apt-far-normalize.js'"));
assert.ok(!html.includes("apt-richgo15.js"),'no redundant loader allowed');
for(const cap of [6,10,15,20,25,30]){
 const far=Object.fromEntries(changes.map(r=>[key(r),[r.map_far?Number(r.map_far):null,r.map_far_source||'']]));
 const w={CAPT:cap,FARD:far,PICKS:[{n:'힐스테이트신촌',area:'서울 서대문구 북아현동',year:2023}]};
 const ctx={window:w};vm.createContext(ctx);vm.runInContext(finalPass,ctx);
 assert.equal(w.PICKS[0].year,cap===15?2020:2023,'year limited to cap15');
 for(const r of changes){
   if(cap===15){assert.equal(far[key(r)][0],Number(r.richgo_far));assert.equal(far[key(r)][1],'리치고(직접대조)');}
   else assert.notEqual(far[key(r)][1],'리치고(직접대조)','cross-cap FAR rewrite: '+key(r));
 }
}
console.log('Richgo 10–15 audit OK: 300 unique complexes; 22 FAR fixes + 1 year fix; cap15 only');
