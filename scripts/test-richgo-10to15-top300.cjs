/* Richgo 10~15억 검증: 300개 감사목록, 출처, FAR/연식/세대수, 구간별 격리 회귀검사 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function parse(s){let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(quoted){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c;}
  else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 const columns=rows.shift();return rows.filter(r=>r.length===columns.length).map(r=>Object.fromEntries(columns.map((k,j)=>[k,r[j]])));
}
const records=parse(fs.readFileSync(path.join(root,'docs/richgo-10to15-top300-20261118.csv'),'utf8'));
const spec=JSON.parse(fs.readFileSync(path.join(root,'docs/richgo-10to15-verified-corrections.json'),'utf8'));
const key=r=>r.name+'|'+r.area,byKey=new Map(records.map(r=>[key(r),r]));
assert.equal(records.length,300,'inventory must contain 300 complexes');
assert.equal(byKey.size,300,'duplicates forbidden');
assert.ok(records.every(r=>r.seq&&r.snapshot_rank&&r.name&&r.area),'incomplete ranking');
for(const field of ['far','year','units']){
 const original='map_'+field, external='richgo_'+field;
 const changes=Object.entries(spec[field]||{});
 for(const [k,value] of changes){
  const r=byKey.get(k);
  assert.ok(r,'correction not in top300: '+k);
  assert.ok(['직접확인','기존직접대조','기존검증확인'].includes(r.verification),'unverified '+field+' '+k);
  assert.equal(Number(r[external]),Number(value),'must equal Richgo source '+field+' '+k);
  assert.ok(r.source_url&&r.source_url.startsWith('https://m.richgo.ai/realty/danji/'),'source URL missing '+k);
  assert.notEqual(Number(r[original]||0),Number(value),'redundant correction '+field+' '+k);
 }
}
const allReview=records.every(r=>r.verification==='직접확인'||r.verification==='집계단위불일치');
assert.ok(allReview,'all 300 must have direct or aggregate verification');
assert.equal(records.filter(r=>r.verification==='집계단위불일치').length,19,'19 explicitly documented aggregate exceptions');
const kbPairs=Object.entries(spec.farFallbackKB||{});
assert.equal(kbPairs.length,2,'two independently sourced KB FAR fallbacks');
for(const [key,value] of kbPairs){
 const r=byKey.get(key);
 assert.ok(r&&r.richgo_far==='','fallback only if Richgo FAR blank '+key);
 assert.equal(Number(r.fallback_far),Number(value),'fallback source numerical match '+key);
 assert.ok(r.fallback_source_url?.startsWith('https://kbland.kr/se/c/'),'KB source URL '+key);
}
const source=fs.readFileSync(path.join(root,'public/apt-richgo15.js'),'utf8');
const build=fs.readFileSync(path.join(root,'scripts/build-apt-assets.mjs'),'utf8');
const html=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');
assert.ok(html.includes("c===15?'apt-richgo15.js'"));
assert.ok(build.includes('applyRichgo15AtBuild(code,file,root)'));
assert.ok(build.includes("if(cap===15&&(file==='apt-univ15.js'||file==='apt-farfix.js'))"));
assert.ok(build.includes("file === 'apt-richgo15.js' ? []"));
assert.ok(build.includes('packagedLoader'));
assert.ok(build.includes("file==='apt-unitfix.js'"),'verified cap15 counts must override shared unitfix');
assert.ok(build.includes("spec.farFallbackKB"),'cap15 build must fill two sourced FAR gaps');
const keyList=new Set([...Object.keys(spec.far||{}),...Object.keys(spec.farFallbackKB||{}),...Object.keys(spec.year||{}),...Object.keys(spec.units||{})]);
for(const cap of [6,10,15,20,25,30,35]){
 const FAR=Object.fromEntries([...new Set([...Object.keys(spec.far||{}),...Object.keys(spec.farFallbackKB||{})])].map(k=>{const r=byKey.get(k);return [k,[r.map_far?Number(r.map_far):null,r.map_far_source||'']]}));
 const PICKS=[...keyList].map(k=>{const r=byKey.get(k);return {n:r.name,area:r.area,year:Number(r.map_year),units:Number(r.map_units)}});
 const W={CAPT:cap,FARD:FAR,PICKS};const ctx={window:W};vm.createContext(ctx);vm.runInContext(source,ctx);
 for(const [k,value] of Object.entries(spec.far||{})){
  const r=byKey.get(k);
  assert.equal(FAR[k][0],cap===15?Number(value):(r.map_far?Number(r.map_far):null),'FAR cap '+cap+' '+k);
 }
 for(const [k,value] of kbPairs){
  assert.equal(FAR[k][0],cap===15?Number(value):null,'KB fallback FAR cap '+cap+' '+k);
  if(cap===15)assert.equal(FAR[k][1],'KB부동산','fallback provenance '+k);
 }
 for(const d of PICKS){
  const k=d.n+'|'+d.area,r=byKey.get(k);
  assert.equal(d.year,cap===15&&(k in spec.year)?Number(spec.year[k]):Number(r.map_year),'year cap '+cap+' '+k);
  assert.equal(d.units,cap===15&&(k in spec.units)?Number(spec.units[k]):Number(r.map_units),'units cap '+cap+' '+k);
 }
}
console.log('Richgo top300 audit ✅',JSON.stringify({rows:records.length,far:Object.keys(spec.far||{}).length,year:Object.keys(spec.year||{}).length,units:Object.keys(spec.units||{}).length,verified:records.filter(r=>r.verification==='직접확인').length,aggregateExceptions:19,kbFARFallback:2}));
