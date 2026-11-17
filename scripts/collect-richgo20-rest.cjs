/* Targeted, user-directed crosscheck of the remaining 326 of 626 named apartments against public Richgo apartment detail pages.
 * Reads only public neighborhood hub lists and the matched detail pages.
 * Respect ChatGPT-User robots rule; do not hit internal APIs, private paths or partner API.
 * No global sitemap traversal, no automated redistribution.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),fCsv=path.join(root,'docs/richgo-15to20-remaining326-audit-20261118.csv');
const sleep=t=>new Promise(r=>setTimeout(r,t));
const cleanHtml=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const norm=s=>String(s||'').toLowerCase().replace(/아파트|주상복합|the|더|단지/g,'').replace(/[^가-힣a-z0-9]/gi,'');
function parseCsv(s){const rows=[];let row=[],cell='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c;}else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}const header=rows.shift().map(x=>x.replace(/^\uFEFF/,''));return {header,rows:rows.filter(r=>r.length>2).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]||''])))}} 
function toCsv(headers,rows){const q=x=>{const s=String(x??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};return '\uFEFF'+[headers.join(','),...rows.map(r=>headers.map(k=>q(r[k])).join(','))].join('\n')+'\n';}
function district(area){const a=area.split(' ');if(['서울','인천'].includes(a[0]))return {sd:a[0],sgg:a[1],dong:a.slice(2).join(' ')};return {sd:'경기',sgg:(a[0].includes('시')?a[0]:a[0]+'시')+(a[1]?.endsWith('구')?' '+a[1]:''),dong:a.slice(a[1]?.endsWith('구')?2:1).join(' ')};}
function lev(a,b){const x=[...a],y=[...b],r=Array.from({length:y.length+1},(_,i)=>i);for(let i=0;i<x.length;i++){let old=r[0];r[0]=i+1;for(let j=0;j<y.length;j++){const tmp=r[j+1];r[j+1]=Math.min(r[j+1]+1,r[j]+1,old+(x[i]===y[j]?0:1));old=tmp;}}return 1-r[y.length]/Math.max(1,x.length,y.length);}
function score(t,c){const a=norm(t.name),b=norm(c.name);if(!a||!b)return -999;let s=a===b?82:(a.length>=4&&b.includes(a)||b.length>=4&&a.includes(b))?70:Math.round(lev(a,b)*50);if(a.length>=4&&b.length>=4&&a.slice(-2)===b.slice(-2))s+=5;
 const td=district(t.area).dong;
 if(c.dong&&td===c.dong)s+=25;else if(c.dong&&td!==c.dong)s-=32;
 const n=Number(t.map_units),alt=Number(t.map_units_kapt),v=c.units;
 const delta=Math.min(n>0?Math.abs(v-n)/Math.max(1,n):3,alt>0?Math.abs(v-alt)/Math.max(1,alt):3);
 if(v>0&&delta<=0.01)s+=23;else if(v>0&&delta<=0.08)s+=12;else if(v>0&&delta>0.4)s-=25;else if(v>0&&delta>0.2)s-=12;
 return s;
}
const headers=['User-Agent','Accept'];
let requestCount=0,failCount=0;
async function get(url){for(let attempt=0;attempt<3;attempt++){try{
  const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(19000)});
  if([429,500,502,503,504].includes(r.status)){await sleep(Math.min(25000,1500*2**attempt));continue;}
  const t=await r.text();if(!r.ok)return null;requestCount++;return t;
 }catch(e){if(attempt===2){failCount++;return null;}await sleep(1200*2**attempt);}}return null;}
async function mapLimited(arr,cap,fn){const out=new Array(arr.length);let cursor=0;await Promise.all(Array.from({length:cap},async()=>{while(cursor<arr.length){const i=cursor++;out[i]=await fn(arr[i],i);await sleep(250);}}));return out;}
async function main(){
const {header,rows}=parseCsv(fs.readFileSync(fCsv,'utf8'));
if(rows.length!==326||new Set(rows.map(r=>r.name+'|'+r.area)).size!==300)throw Error('audit is not exactly 326 unique complexes');
const c={};c.window=c;vm.runInNewContext(fs.readFileSync(root+'/public/apt-unitfix.js','utf8'),c);
for(const r of rows){const k=r.name+'|'+r.area;r.map_units_kapt=String(c.UNITFIX?.[k]?.[0]||'');}
const folders=new Map();for(const t of rows){const x=district(t.area),key=x.sd+'|'+x.sgg;t.__district=key;if(!folders.has(key))folders.set(key,x);}
const filters=['','10억-20억','20억이상','20평대','30평대','40평대이상','대단지','재건축','신축','역세권'];
const tasks=[...folders.entries()].flatMap(([key,x])=>filters.map(fl=>({key,sd:x.sd,sgg:x.sgg,fl})));
console.log('AUDIT HUB TASKS',tasks.length,'districts',folders.size);
const candidates=new Map();
await mapLimited(tasks,4,async x=>{
 const p='/realty/apt-hub/'+encodeURIComponent(x.sd)+'/'+encodeURIComponent(x.sgg)+(x.fl?'/'+encodeURIComponent(x.fl):'');
 const html=await get('https://m.richgo.ai'+p);if(!html)return;
 const list=candidates.get(x.key)||new Map();
 for(const tr of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)||[]){
  const a=tr.match(/<a\b[^>]*href="\/realty\/danji\/(a[A-Za-z0-9]{6})(?:\?[^"]*)?"[^>]*>([\s\S]*?)<\/a>/);
  if(!a)continue;
  const name=cleanHtml(a[2]).replace(/^\d+\s*\.\s*/,'').trim(),sp=tr.match(/<\/a><span>([^<]+)<\/span>/);
  const aux=cleanHtml(sp?.[1]||''),dong=aux.match(/(?:^|\s)([가-힣0-9]+(?:동|가|읍|면|리))\s*·/)?.[1]||'';
  const units=Number((aux.match(/([\d,]+)세대/)||[])[1]?.replace(/,/g,''))||0;
  const ob={id:a[1],name,dong,units,district:x.key,from:p};
  if(!list.has(ob.id))list.set(ob.id,ob);
 }
 candidates.set(x.key,list);
});
console.log('HUB FETCH',requestCount,'candidates',[...candidates.values()].reduce((a,m)=>a+m.size,0));
const found=[];
for(const t of rows){const list=[...(candidates.get(t.__district)||new Map()).values()];const ranking=list.map(c=>({...c,score:score(t,c)})).sort((a,b)=>b.score-a.score);t.__rank=ranking.slice(0,3);if(ranking[0]&&ranking[0].score>=48)found.push({target:t,match:ranking[0],margin:ranking[0].score-(ranking[1]?.score??-100)});}
console.log('HUB MATCH CANDIDATE',found.length,'unmapped',326-found.length,'score>=90',found.filter(x=>x.match.score>=90).length);
function factsFrom(html){
 const h=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/),f={};
 if(!h)return null;
 for(const m of h[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[cleanHtml(m[1])]=cleanHtml(m[2]);
 const num=v=>Number(String(v||'').match(/[\d,]+/)?.[0]?.replace(/,/g,''))||null;
 const far=num(f['용적률']),year=num(f['입주']),units=num(f['세대수']);
 const title=cleanHtml(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||'');
 const pyeongs=(f['평형']||'').replace(/평/g,'').replace(/·/g,'|');
 return {name:title,far,year,units,floors:f['층수']||'',coverage:num(f['건폐율']),parking:num(f['주차']),heating:f['난방']||'',builder:f['시공사']||'',pyeongs};
}
const detailed=await mapLimited(found,3,async x=>{
 const page=await get('https://m.richgo.ai/realty/danji/'+x.match.id);
 return {...x,data:page?factsFrom(page):null};
});
let confirmed=0,ambiguous=0,unavailable=0,noFar=0,changed={far:0,units:0,year:0},unresolved=[];
for(const row of rows){
 const f=detailed.find(o=>o.target===row),ranks=row.__rank||[];
 if(!f||!f.data){unavailable++;unresolved.push({seq:row.seq,name:row.name,area:row.area,candidates:ranks});continue;}
 const d=f.data,c=f.match,td=district(row.area).dong;
 const nameOk=norm(row.name)===norm(c.name)||
  norm(row.name).length>=4&&norm(c.name).includes(norm(row.name))||
  norm(c.name).length>=4&&norm(row.name).includes(norm(c.name));
 const unitRatio=Math.min(Math.abs(Number(row.map_units)-d.units)/Math.max(1,Number(row.map_units)),
   Math.abs(Number(row.map_units_kapt||0)-d.units)/Math.max(1,Number(row.map_units_kapt||0)) );
 const yearDiff=Math.abs(Number(row.map_year)-d.year);
 const dongOk=Boolean(c.dong&&c.dong===td);
 const highConfidence=(nameOk&&dongOk&&yearDiff<=3)||(c.score>=98&&yearDiff<=3)||(c.score>=81&&dongOk&&unitRatio<0.05&&yearDiff<=3);
 const secondMargin=f.margin;
 const duplicateTwin=rows.filter(z=>z!==row&&z.__rank?.[0]?.id===c.id&&z.__rank?.[0]?.score>=48).length;
 const approved=highConfidence&&(secondMargin>=8||nameOk)&&duplicateTwin===0;
 row.richgo_url='https://m.richgo.ai/realty/danji/'+c.id;
 row.richgo_year=String(d.year??'');row.richgo_units=String(d.units??'');
 row.richgo_far=String(d.far??'');row.richgo_floors=d.floors;row.richgo_coverage_pct=String(d.coverage??'');row.richgo_parking=String(d.parking??'');
 row.richgo_heating=d.heating;row.richgo_pyeongs=d.pyeongs;row.source_date='2026-11-18';
 row.year_diff=d.year-Number(row.map_year);row.units_diff=d.units-Number(row.map_units);
 row.far_diff_raw_pp=d.far==null?'':Number(row.map_far_raw||0)?d.far-Number(row.map_far_raw):'';
 row.note='Richgo '+d.name+'; index '+c.name+'/'+c.dong+'/'+c.units+' units; score '+c.score+'; margin '+secondMargin+'; same-id-others '+duplicateTwin;
 if(approved){row.status=d.far==null?'2026-11-18_직접대조_용적률공란':'2026-11-18_공개상세직접대조';confirmed++;if(d.far==null)noFar++;else if(d.far!==Number(row.map_far_raw))changed.far++;if(d.units!==Number(row.map_units_kapt||row.map_units))changed.units++;if(d.year!==Number(row.map_year))changed.year++;}
 else {row.status='검증보류_동일성불확실';ambiguous++;unresolved.push({seq:row.seq,name:row.name,area:row.area,candidates:ranks,richgo:d,reason:'confidence='+c.score+' margin='+secondMargin+' yearDiff='+yearDiff+' unitRatio='+unitRatio.toFixed(3)+' duplicate='+duplicateTwin});}
}
const extraCols=['map_units_kapt'];for(const k of extraCols)if(!header.includes(k))header.push(k);
fs.writeFileSync(fCsv,toCsv(header,rows.map(({__district,__rank,...r})=>r)));
const out={targets:326,confirmed,ambiguous,unavailable,noFar,changed,hubRequests:requestCount,requestFailures:failCount,
  districts:folders.size,unresolved:unresolved.slice(0,326)};
fs.writeFileSync(path.join(root,'docs/richgo20-remaining326-candidates-20261118.json'),JSON.stringify(out,null,2)+'\n');
console.log('FINAL RESULT',JSON.stringify({...out,unresolved:undefined}));
if(confirmed<100)console.error('LOW COVERAGE: do not treat as finished');

}
main().catch(e=>{console.error(e);process.exitCode=1});
