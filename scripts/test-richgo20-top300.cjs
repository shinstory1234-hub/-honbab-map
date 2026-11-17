/* Richgo 15~20억: 300 verified rows, exact active FAR/units and transaction-price immutability. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const audit=JSON.parse(fs.readFileSync(root+'/docs/richgo20-verified-full-20261118.json','utf8'));
const records=audit.rows;
assert.equal(audit.count,300);assert.equal(audit.verified,300);assert.equal(records.length,300);
assert.equal(new Set(records.map(r=>r.k)).size,300);
assert.equal(records.filter(r=>r.far!=null).length,299);
assert.deepEqual(records.filter(r=>r.far==null).map(r=>r.name),['산호']);
const src=fs.readFileSync(root+'/public/apt-univ20.js','utf8');
const area=JSON.parse(src.slice(src.indexOf('const A=')+8,src.indexOf(',S=')));
const rr=JSON.parse(src.slice(src.indexOf(',R=')+3,src.indexOf(';\nconst TB')));
const by=new Map(rr.map(r=>[r[0]+'|'+area[r[1]],r]));
const priceCSV=fs.readFileSync(root+'/docs/richgo-15to20-top300-audit-20261118.csv','utf8');
const priceRows=[];{
 let row=[],cell='',quoted=false,lines=[];
 for(let i=0;i<priceCSV.length;i++){const c=priceCSV[i];if(quoted){if(c==='"'&&priceCSV[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));lines.push(row);row=[];cell='';}else cell+=c;}const head=lines.shift().map(x=>x.replace(/^\uFEFF/,''));for(const x of lines.filter(r=>r.length===head.length))priceRows.push(Object.fromEntries(head.map((k,i)=>[k,x[i]])));
}
assert.equal(priceRows.length,300);
const statusSet=new Set(priceRows.map(r=>r.status));
assert.ok([...statusSet].every(s=>s.startsWith('전수조사완료_리치고_')),'all 300 examined and documented');
const ranked=JSON.parse(fs.readFileSync(root+'/public/apt-invest20.js','utf8').match(/window\.APT_INV_RANK\[20\]=(\{.*?\});/s)[1]);
const uniq=new Map();for(const [key,r] of Object.entries(ranked).sort((a,b)=>a[1]-b[1])){const p=key.split('|'),k=p[0]+'|'+p[1];if(!uniq.has(k))uniq.set(k,r);}
assert.deepEqual(records.map(r=>r.k),[...uniq.keys()].slice(0,300),'must cover exactly the first 300 unique rank complexes');
const W={CAPT:20,PICKS:[],FARD:{},UNITFIX:{},PLAT:{},UGEO:{},HAK:{},CXP:null};W.window=W;
vm.createContext(W);
for(const filename of ['apt-unitfix.js','apt-fard.js','apt-univ20.js','apt-farfix.js','apt-far-normalize.js'])
 vm.runInContext(fs.readFileSync(root+'/public/'+filename,'utf8'),W,{filename});
const dw=new Map(W.PICKS.map(d=>[d.n+'|'+d.area,d]));
const oneToOne=records.filter(r=>!r.integrated);
for(const r of records){
 const d=dw.get(r.k),raw=by.get(r.k);
 assert.ok(d&&raw,'missing map complex '+r.k);
 if(r.far!=null){
   assert.equal(raw[22][0],r.far,'raw FAR '+r.k);
   assert.equal(raw[22][1],'R','losslessly packed Richgo FAR provenance '+r.k);
   assert.equal(W.FARD[r.k][0],r.far,'final active FAR '+r.k);
 }
 const snap=priceRows.find(x=>x.name+'|'+x.area===r.k);
 assert.equal(d.p,Number(snap.map_price_manwon),'must not substitute modeled Richgo price for transactional median '+r.k);
 if(!r.integrated){
   assert.equal(d.units,r.units,'raw units '+r.k);
   if(W.UNITFIX[r.k])assert.equal(W.UNITFIX[r.k][0],r.units,'runtime unitfix priority '+r.k);
 }
}
assert.ok(records.every(x=>x.url.startsWith('https://m.richgo.ai/realty/danji/a')));
const cap10={CAPT:10,PICKS:[],FARD:{},UNITFIX:{},PLAT:{},UGEO:{},HAK:{},CXP:null};cap10.window=cap10;
vm.createContext(cap10);
for(const filename of ['apt-unitfix.js','apt-fard.js','apt-univ20.js'])
 vm.runInContext(fs.readFileSync(root+'/public/'+filename,'utf8'),cap10,{filename});
assert.ok(oneToOne.some(r=>cap10.UNITFIX[r.k]&&cap10.UNITFIX[r.k][0]!==r.units),'CAPT!==20 must not overwrite existing Kapt unit fixes');
console.log('PASS: 300/300 unique complexes, 299 Richgo FAR verified, 1 source blank, transaction price unchanged, unitfix prioritized only in CAPT20');
