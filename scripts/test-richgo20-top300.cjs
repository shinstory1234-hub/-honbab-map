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

const records=fs.readFileSync(root+'/public/apt-univ20.js','utf8');
const aStart=records.indexOf('const A=')+8,aEnd=records.indexOf(',S=',aStart);
const areas=JSON.parse(records.slice(aStart,aEnd));
const rStart=records.indexOf(',R=')+3,rEnd=records.indexOf(';\nconst TB',rStart);
const raw=JSON.parse(records.slice(rStart,rEnd));
const rawByKey=new Map(raw.map(r=>[r[0]+'|'+areas[r[1]],r]));
assert.equal(rawByKey.size,raw.length,'key collisions');
const touched=new Map([
 ['래미안슈르|과천시 원문동',195],
 ['헬리오시티|서울 송파구 가락동',285],
 ['과천위버필드|과천시 원문동',227],
 ['행당한진타운|서울 성동구 행당동',294],
 ['올림픽파크포레온|서울 강동구 둔촌동',273],
 ['남산타운|서울 중구 신당동',231],
]);
for(const [key,far] of touched){
 const row=rawByKey.get(key);
 assert.ok(row,'raw missing '+key);
 assert.equal(row[22][0],far,'FAR not corrected: '+key);
 assert.equal(row[22][1],'리치고','FAR provenance: '+key);
}
const garak='가락(1차)쌍용아파트|서울 송파구 가락동';
assert.equal(rawByKey.get(garak)[5],2064,'Richgo units correction');
function load(cap){
 const window={CAPT:cap,PICKS:[],UNITFIX:{},CXP:null,PLAT:{},UGEO:{},HAK:{},console};
 for(const name of ['apt-unitfix.js','apt-fard.js','apt-univ20.js','apt-farfix.js','apt-far-normalize.js']){
  vm.runInNewContext(fs.readFileSync(root+'/public/'+name,'utf8'),{window},{filename:name});
 }
 return window;
}
const actual=load(20);
for(const r of audit.filter(r=>/직접대조|기존검증재사용/.test(r.status))){
 const key=r.name+'|'+r.area,far=Number(r.richgo_far);
 assert.equal(actual.FARD[key]?.[0],far,'final FAR differs from verified Richgo '+key);
}
assert.equal(actual.PICKS.find(d=>d.n+'|'+d.area===garak).units,2064,'Garak units in raw PICKS');
assert.equal(actual.UNITFIX['래미안슈르|과천시 원문동'][0],3143,'existing K-apt correction retained');
assert.equal(actual.UNITFIX['행당한진타운|서울 성동구 행당동'][0],2123,'existing K-apt correction retained');
assert.equal(actual.PICKS.filter(d=>audit.some(a=>a.name===d.n&&a.area===d.area)).length,300);
assert.ok(!fs.readFileSync(root+'/public/apt-far-normalize.js','utf8').includes('RICHGO20_AUDIT'),'no redundant runtime override');
console.log('Richgo 15-20억 audit: 300 source records, 24 existing/verifiable FARs, 6 newly restored, 1 new raw units correction; no extra runtime payload');
