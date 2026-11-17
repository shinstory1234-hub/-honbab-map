/* 15~20억 price-band: verified Richgo rows only; reject accidental changes in other bands. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function csvParse(src) {
 const out=[],rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<src.length;i++) {
  const c=src[i];
  if(quoted){if(c==='"'&&src[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
  else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row);}
 const head=rows.shift();
 return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(head.map((k,i)=>[k.replace(/^\uFEFF/,'').trim(),r[i]||''])));
}
const audit=csvParse(fs.readFileSync(root+'/docs/richgo-15to20-top300-audit-20261118.csv','utf8'));
assert.equal(audit.length,300,'the top 300 are unique apartment complexes, not 300 floorplan rows');
assert.equal(new Set(audit.map(r=>r.name+'|'+r.area)).size,300);
assert.equal(audit.filter(r=>r.status==='2026-11-18_공개상세직접대조').length,10);
assert.equal(audit.filter(r=>r.status==='2026-11-16_기존검증재사용').length,14);
assert.equal(audit.filter(r=>r.status==='미조회'||r.status.startsWith('검증보류_')).length,276);
const inv=fs.readFileSync(root+'/public/apt-invest20.js','utf8');
const ranked=JSON.parse(inv.match(/window\.APT_INV_RANK\[20\]=(\{.*?\});/s)[1]);
const sorted=Object.entries(ranked).sort((a,b)=>a[1]-b[1]),distinct=new Map();
for(const [k,rank] of sorted){const parts=k.split('|'),id=parts[0]+'|'+parts[1];if(!distinct.has(id))distinct.set(id,rank);}
const names=[...distinct.keys()].slice(0,300);
assert.deepEqual(audit.map(r=>r.name+'|'+r.area),names,'audit must cover the exact top 300');
const code=fs.readFileSync(root+'/public/apt-far-normalize.js','utf8');
function run(cap) {
 const window={CAPT:cap,CXP:null,FARD:{},PICKS:[],UNITFIX:{}};
 for(const r of audit){
  const k=r.name+'|'+r.area;
  window.FARD[k]=[111,'L',null,null,null,null,null];
  window.PICKS.push({n:r.name,area:r.area,year:Number(r.map_year),units:Number(r.map_units)});
  window.UNITFIX[k]=[Number(r.map_units),Number(r.map_units),0,'k'];
 }
 vm.runInNewContext(code,{window},{filename:'apt-far-normalize.js'});
 return window;
}
const audited=run(20);
assert.equal(audited.RICHGO20_AUDIT?.verified,24);
assert.equal(audited.RICHGO20_AUDIT?.direct,10);
for(const r of audit.filter(r=>/직접대조|기존검증재사용/.test(r.status))){
 const k=r.name+'|'+r.area,far=Number(r.richgo_far);
 assert.equal(audited.FARD[k][0],far,k+' FAR');
 assert.match(audited.FARD[k][1],/리치고 단지정보 검증/,k+' provenance');
 const u=audited.PICKS.find(d=>d.n+'|'+d.area===k);
 if(r.status.includes('직접대조')){
  assert.equal(u.year,Number(r.richgo_year),k+' year');
  assert.equal(u.units,Number(r.richgo_units),k+' units');
  assert.equal(audited.UNITFIX[k][0],Number(r.richgo_units),k+' unitfix');
 }
}
for(const cap of [6,10,15,25,30,35]){
 const w=run(cap);
 assert.equal(w.RICHGO20_AUDIT,undefined,'must not touch other band '+cap);
 for(const r of audit){
  const k=r.name+'|'+r.area;
  assert.equal(w.FARD[k][0],111,'FAR changed outside cap 20: '+cap+' '+k);
  const d=w.PICKS.find(d=>d.n+'|'+d.area===k);
  assert.equal(d.units,Number(r.map_units),'units changed outside cap 20: '+cap+' '+k);
 }
}
console.log('Richgo 15-20억 OK: top 300 mapped, 10 direct + 14 prior verified, 276 pending, other caps untouched');
