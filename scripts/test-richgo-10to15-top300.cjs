/* 10~15억 조사 300개 인벤토리와 리치고 용적률 교정이 cap15에만 적용되는지 확인 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const csv=fs.readFileSync(path.join(root,'docs/richgo-10to15-top300-20261118.csv'),'utf8');
function parse(s){let rows=[],row=[],cell='',q=false;for(let i=0;i<s.length;i++){let c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}if(row.length||cell){row.push(cell);rows.push(row);}let header=rows.shift();return rows.map(x=>Object.fromEntries(header.map((k,j)=>[k,x[j]??''])))}
const records=parse(csv),key=r=>r.name+'|'+r.area;
assert.equal(records.length,300);
assert.equal(new Set(records.map(key)).size,300);
const corrected=records.filter(r=>r.action==='변경');assert.equal(corrected.length,8);
assert.ok(corrected.every(r=>r.richgo_far&&r.source_url&&r.map_units===r.richgo_units));
const code=fs.readFileSync(path.join(root,'public/apt-richgo15.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');
assert.match(html,/c===15\?'apt-richgo15\.js'/);
for(const cap of [6,10,15,20,25,30]){
 const far=Object.fromEntries(corrected.map(r=>[key(r),[r.map_far?r.map_far*1:null,r.map_far_source]]));
 const w={CAPT:cap,FARD:far};const ctx={window:w};vm.createContext(ctx);vm.runInContext(code,ctx);
 assert.equal(Boolean(w.RICHGO15_APPLIED),cap===15,'wrong cap '+cap);
 for(const r of corrected)assert.equal(far[key(r)][0],cap===15?Number(r.richgo_far):(r.map_far?Number(r.map_far):null),'FAR '+key(r)+' cap '+cap);
}
console.log('Richgo 10–15 top300 audit OK: 300 distinct, 8 corrected FAR, cap15 only');
