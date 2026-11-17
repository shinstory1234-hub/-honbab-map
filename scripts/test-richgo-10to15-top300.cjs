/* 10~15억 리치고 검증 회귀검사 — 배포 빌드는 별도 CI 단계에서 수행. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const raw=fs.readFileSync(path.join(root,'docs/richgo-10to15-top300-20261118.csv'),'utf8');
function csv(s){let rows=[],row=[],cell='',q=false;for(let i=0;i<s.length;i++){
const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c;}
else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}
else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;
}const h=rows.shift();return rows.filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,j)=>[k,x[j]])));}
const rows=csv(raw),key=r=>r.name+'|'+r.area;
assert.equal(rows.length,300);
assert.equal(new Set(rows.map(key)).size,300);
const changes=rows.filter(r=>r.action==='변경'),spec=JSON.parse(fs.readFileSync(path.join(root,'docs/richgo-10to15-verified-corrections.json'),'utf8'));
assert.equal(changes.length,22);
assert.equal(Object.keys(spec.far).length,22);
for(const r of changes){assert.equal(Number(spec.far[key(r)]),Number(r.richgo_far));assert.equal(r.richgo_units,r.map_units);assert.ok(r.source_url);}
assert.equal(spec.year['힐스테이트신촌|서울 서대문구 북아현동'],2020);
const html=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');
assert.ok(html.includes("c===15?'apt-richgo15.js'"));
const source=fs.readFileSync(path.join(root,'public/apt-richgo15.js'),'utf8');
for(const cap of [6,10,15,20,25,30]){
 const far=Object.fromEntries(changes.map(r=>[key(r),[r.map_far?Number(r.map_far):null,r.map_far_source]]));
 const w={CAPT:cap,FARD:far,PICKS:[{n:'힐스테이트신촌',area:'서울 서대문구 북아현동',year:2023}]};
 const context={window:w};vm.createContext(context);vm.runInContext(source,context);
 assert.equal(w.PICKS[0].year,cap===15?2020:2023);
 for(const r of changes)assert.equal(far[key(r)][0],cap===15?Number(r.richgo_far):(r.map_far?Number(r.map_far):null));
}
const build=fs.readFileSync(path.join(root,'scripts/build-apt-assets.mjs'),'utf8');
assert.ok(build.includes('applyRichgo15AtBuild(code,file,root)'));
assert.ok(build.includes("if(cap===15&&(file==='apt-univ15.js'||file==='apt-farfix.js'))"));
assert.ok(build.includes("file === 'apt-richgo15.js' ? []"));
assert.ok(build.includes('packagedLoader'));
console.log('Richgo 10-15 top300 OK: 300 records, 22 corrected FAR and 1 year; cap15 isolation');
