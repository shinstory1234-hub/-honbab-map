/* Public Richgo pages, parallel, source-linked, exact matching. No partner API.
 * Naver/Daum only discover publicly indexed IDs. Rate limits are honored.
 * Usage: node scripts/richgo15-public-audit.cjs [--limit=25] [--concurrency=6]
 */
'use strict';
const fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const input=path.join(root,'docs/richgo-10to15-top300-20261118.csv');
const corrections=path.join(root,'docs/richgo-10to15-verified-corrections.json');
const auditPath=path.join(root,'docs/richgo-10to15-crawl-status.json');
const concurrency=Math.max(1,Math.min(8,Number((process.argv.find(x=>x.startsWith('--concurrency='))||'--concurrency=6').split('=')[1])));
const limit=Number((process.argv.find(x=>x.startsWith('--limit='))||'--limit=300').split('=')[1]);
const timeoutMs=30000;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const userAgent='Mozilla/5.0 (compatible; AptMapDataAudit/1.0; +https://github.com/shinstory1234-hub/-honbab-map)';
let blocked=false,searchCalls=0,pageCalls=0,errors=0;
function readCSV(s){const grid=[];let row=[],cell='',quote=false;
 for(let i=0;i<s.length;i++){let c=s[i];
  if(quote){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c;}
  else if(c==='"')quote=true;else if(c===','){row.push(cell);cell='';}
  else if(c==='\n'){row.push(cell.replace(/\r$/,''));grid.push(row);row=[];cell='';}
  else cell+=c;
 }if(row.length||cell){row.push(cell);grid.push(row)}
 const header=grid.shift().map(x=>x.replace(/^\uFEFF/,''));
 return {header,records:grid.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,j)=>[k,r[j]])))};
}
function csvCell(s){s=String(s??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function writeCSV(header,rows){return header.join(',')+'\n'+rows.map(r=>header.map(k=>csvCell(r[k])).join(',')).join('\n')+'\n';}
function num(x){if(x==null||x==='')return null;const n=Number(String(x).replaceAll(',','').replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:null;}
function norm(s){return String(s||'').toLowerCase().replace(/이편한세상/g,'e편한세상').replace(/[^가-힣a-z0-9]/g,'').replace(/아파트/g,'');}
function decode(s){return String(s??'').replace(/&#x([0-9a-f]+);/ig,(_,v)=>String.fromCodePoint(parseInt(v,16))).replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(+v)).replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function clean(s){return decode(s).replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();}
async function fetchPage(url){if(blocked)return null;try{
 const res=await fetch(url,{signal:AbortSignal.timeout(timeoutMs),headers:{'user-agent':userAgent,'accept-language':'ko-KR,ko;q=0.9,en;q=0.5'}});
 if([401,403,429].includes(res.status)){console.log('BLOCKED',res.status,url);blocked=true;return null;}
 if(!res.ok)return null;
 return await res.text();
 }catch(e){errors++;if(errors<=10)console.log('HTTP-FAIL',String(e).slice(0,140),url);return null;}
}
function urlCandidates(html){if(!html)return [];
 let t=html.replaceAll('\\u002F','/').replaceAll('\\/','/').replaceAll('&amp;','&');
 const matches=[...t.matchAll(/(?:m\.richgo\.ai\/realty\/danji\/|m%2Erichgo%2Eai%2Frealty%2Fdanji%2F)(a[A-Za-z0-9]{6})/ig)];
 return [...new Set(matches.map(x=>x[1]))].slice(0,15);
}
function getSiteFacts(html,id){
 if(!html)return null;
 const idx=html.indexOf('<dl class="facts">');
 if(idx<0)return null;
 const rawFacts=html.slice(idx+18,html.indexOf('</dl>',idx));
 const facts={};
 for(const m of rawFacts.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))facts[clean(m[1])]=clean(m[2]);
 const h=html.slice(Math.max(0,idx-500),idx);
 const headings=[...h.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
 const heading=clean(headings.length?headings[headings.length-1][1]:'');
 const name=heading.replace(/\s*단지 정보\s*$/,'');
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const sales=html.slice(html.indexOf('<h2>평형별 시세</h2>',idx),html.indexOf('</table>',html.indexOf('<h2>평형별 시세</h2>',idx))+8);
 const prices={};
 for(const tr of sales.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
  const parts=[...tr[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/g)].map(x=>clean(x[1]));
  const py=parseInt(parts[0],10);if(py>0&&parts.length>=3)prices[py]=[parts[1],parts[2]];
 }
 const y=String(facts['입주']||'').match(/\b(19|20)\d{2}(?:\.\d{1,2})?/);
 const year=y?Number(y[0].slice(0,4)):null;
 const coverage=num(facts['건폐율']),far=num(facts['용적률']),units=num(facts['세대수']);
 const parking=num((facts['주차']||'').split('대')[0]);
 return {id,name,title,year,yearMonth:y?.[0]||'',units,far,coverage,parking,floors:facts['층수']||'',
  heating:facts['난방']||'',builder:facts['시공사']||'',pyeongs:facts['평형']||'',prices,
  url:'https://m.richgo.ai/realty/danji/'+id};
}
const codeEquivalence=(name1,name2)=>{
 const a=norm(name1),b=norm(name2);
 if(!a||!b)return 0;
 if(a===b)return 1;
 if(a.length>=4&&b.length>=4&&(a.includes(b)||b.includes(a)))return Math.min(a.length,b.length)/Math.max(a.length,b.length)*0.65+0.35;
 // character sequence similarity (for renamed and grouped complexes)
 const M=new Array(b.length+1).fill(0).map((_,j)=>j);
 for(let i=1;i<=a.length;i++){let prev=M[0];M[0]=i;for(let j=1;j<=b.length;j++){const old=M[j];M[j]=Math.min(old+1,M[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}
 return 1-M[b.length]/Math.max(a.length,b.length);
};
function identity(record,fact){
 const dong=record.area.split(' ').at(-1),prefix=norm(dong).replace(/동$/,'');
 const site=norm(fact.name),shortName=site.startsWith(prefix)?site.slice(prefix.length):site;
 const score=Math.max(codeEquivalence(record.name,fact.name),codeEquivalence(record.name,shortName));
 const dongMatch=norm(fact.title).includes(norm(dong));
 const unitsMatch=num(record.map_units)===fact.units&&fact.units>0;
 const yearMatch=num(record.map_year)===fact.year;
 // Do not stamp an aggregated 3,028-household town onto each smaller split complex.
 const safe=!!(fact.year&&fact.units&&dongMatch&&(
   score>=0.90||(unitsMatch&&score>=0.55)||(unitsMatch&&yearMatch&&score>=0.20)
 ));
 return {safe,score,dongMatch,unitsMatch,yearMatch,quality:score+Number(dongMatch)*0.25+Number(unitsMatch)*0.32+Number(yearMatch)*0.16};
}
async function getById(id){
 if(!/^a[A-Za-z0-9]{6}$/.test(id))return null;
 if(detailCache.has(id))return detailCache.get(id);
 const promise=(async()=>{pageCalls++;
   let html=await fetchPage('https://m.richgo.ai/realty/danji/'+id);
   if(!html&&!blocked){await delay(500);html=await fetchPage('https://m.richgo.ai/realty/danji/'+id);}
   return getSiteFacts(html,id);
 })();
 detailCache.set(id,promise);
 return promise;
}

/* Richgo's publicly-indexed district/dong pages include complete JSON-LD apartment lists.
 * Site robots.txt explicitly allows realty/danji and region listings. This avoids search
 * engines (Naver responded 403) and avoids the restricted high-volume partner/MCP APIs. */
const regionCatalog=new Map(),districtAudit={};
const detailCache=new Map();
async function pool(items,n,fn){let next=0;const out=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(next<items.length){const i=next++;try{out[i]=await fn(items[i],i)}catch(e){errors++;console.log('POOL-ERROR',String(e).slice(0,150),items[i]);}}}));
 return out;
}
function subregionLinks(html){
 const list=[];
 for(const m of (html||'').matchAll(/<a\b[^>]*href="(?:https:\/\/m\.richgo\.ai)?\/realty\/region\/(\d{10})"[^>]*>([\s\S]*?)<\/a>/gi)){
   const name=clean(m[2]);if(name)list.push({code:m[1],label:name});
 }
 return list;
}
function jsonList(html){
 const list=[];
 for(const m of (html||'').matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)){
  try{const obj=JSON.parse(m[1]),group=[obj].flat();
   for(const o of group){for(const el of o?.itemListElement||[]){
    const id=String(el.url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/);
    if(id&&el.name)list.push({id:id[1],name:String(el.name)});
   }}
  }catch(e){/* other JSON-LD schema is unrelated */}
 }
 if(!list.length)for(const m of (html||'').matchAll(/<a\b[^>]*href="(?:https:\/\/m\.richgo\.ai)?\/realty\/danji\/(a[A-Za-z0-9]{6})"[^>]*>([\s\S]*?)<\/a>/gi)){
  list.push({id:m[1],name:clean(m[2]).replace(/[\d·]+평.*$/,'')});
 }
 return [...new Map(list.map(x=>[x.id,x])).values()];
}
async function buildCatalog(records){
 const w={PICKS:[],FARD:{},UGEO:{},HAK:{},CAPT:15};
 new Function('window',fs.readFileSync(path.join(root,'public/apt-univ15.js'),'utf8'))(w);
 const sggMap=new Map();
 for(const row of records){
  const fd=w.FARD[row.name+'|'+row.area],code=String(fd?.[6]||'');
  if(/^\d{5}$/.test(code))sggMap.set(row.name+'|'+row.area,code);
 }
 const districts=[...new Set(sggMap.values())].sort();
 console.log('CATALOG_DISTRICTS',districts.length,'distinct areas',new Set(records.map(x=>x.area)).size);
 const pageMap=new Map();
 await pool(districts,4,async code=>{
  const html=await fetchPage('https://m.richgo.ai/realty/region/'+code+'00000');
  const links=subregionLinks(html);
  pageMap.set(code,links);
  districtAudit[code]={links:links.length,status:html?'read':'no_public_page'};
 });
 const pages=new Map();
 for(const row of records){
  const code=sggMap.get(row.name+'|'+row.area),dong=row.area.split(' ').at(-1);
  const links=pageMap.get(code)||[];
  const match=links.filter(l=>l.label.startsWith(dong)||l.label===dong).sort((a,b)=>a.label.length-b.label.length)[0];
  if(match){const url='https://m.richgo.ai/realty/region/'+match.code;if(!pages.has(url))pages.set(url,new Set());pages.get(url).add(row.area);}
 }
 console.log('CATALOG_DONG_PAGES',pages.size);
 const entries=[...pages.entries()];
 await pool(entries,4,async([url,areas])=>{
  const html=await fetchPage(url),list=jsonList(html);
  for(const area of areas)regionCatalog.set(area,list);
  if(!list.length)console.log('DONG_EMPTY',url,Array.from(areas).join(';'));
 });
 console.log('CATALOG_READY',JSON.stringify({districts:districts.length,dongs:pages.size,catalogAreas:regionCatalog.size,withRows:records.filter(r=>regionCatalog.has(r.area)).length,
  withComplex:records.filter(r=>(regionCatalog.get(r.area)||[]).some(x=>codeEquivalence(x.name,r.name)>.65)).length}));
}
async function lookup(record,index){
 const dong=record.area.split(' ').at(-1),prefix=norm(dong).replace(/동$/,'');
 const list=(regionCatalog.get(record.area)||[]).map(x=>{
   const candidateName=norm(x.name);
   const shortName=candidateName.startsWith(prefix)?candidateName.slice(prefix.length):candidateName;
   return {id:x.id,name:x.name,score:Math.max(codeEquivalence(record.name,x.name),codeEquivalence(record.name,shortName))};
 }).sort((a,b)=>b.score-a.score);
 const old=new Set();
 for(const u of [record.richgo_id,record.source_url]){const m=String(u||'').match(/a[A-Za-z0-9]{6}/);if(m)old.add(m[0]);}
 // All same-dong candidates are checked, including shortened official names.
 const ids=[...new Set([...list.filter(x=>x.score>=0.32).map(x=>x.id),...old,...list.filter(x=>x.score<0.32).map(x=>x.id)])];
 let best=null;
 for(const id of ids){
   if(blocked)break;
   const fact=await getById(id);if(!fact)continue;
   const match=identity(record,fact),candidate={fact,match};
   if(!best||candidate.match.quality>best.match.quality)best=candidate;
   if(match.safe)return {...candidate,discovery:list.some(x=>x.id===id)?'richgo_dong_catalog':'previous_link'};
 }
 return best?{...best,discovery:'richgo_dong_candidate_unverified'}:null;
}
function changed(record,field,source){const old=num(record['map_'+field]);return source!=null&&old!==source;}
const {header,records}=readCSV(fs.readFileSync(input,'utf8'));
if(records.length!==300||new Set(records.map(r=>r.name+'|'+r.area)).size!==300)throw Error('Expected 300 unique complexes');
const extra=['richgo_name','richgo_builder','richgo_pyeongs','richgo_same_py_sale','richgo_same_py_jeonse','checked_at','audit_discovery','audit_match_quality'];
for(const k of extra)if(!header.includes(k))header.push(k);
const onlyUnresolved=process.argv.includes('--unresolved-only');
const targetIndices=records.map((r,i)=>i).filter(i=>!onlyUnresolved||!['직접확인','기존직접대조','기존검증확인'].includes(records[i].verification));
const count=Math.min(targetIndices.length,limit);
let done=0,confirmed=0,different=0,notFound=0,ambiguous=0;
async function processRecord(i){
 const row=records[i];
 const lookupResult=await lookup(row,i);
 row.checked_at=today;
 if(!lookupResult){notFound++;row.audit_discovery='no_indexed_result';row.notes=(row.notes?row.notes+' | ':'')+'Direct Richgo dong catalog and known IDs checked; no confirmed matching page';done++;return;}
 const {fact,match,discovery}=lookupResult;
 row.audit_discovery=discovery;row.audit_match_quality=match.score.toFixed(3);
 // Require complex identity before altering any existing raw value.
 if(!match.safe){
   ambiguous++;
   row.audit_discovery='possible_candidate_'+discovery;
   row.notes=(row.notes?row.notes+' | ':'')+'Candidate '+fact.name+' ('+fact.units+' households) does not pass name/neighborhood/household validation; '+fact.url;
   done++;return;
 }
 Object.assign(row,{
  richgo_name:fact.name,richgo_year:String(fact.year||''),richgo_units:String(fact.units||''),richgo_far:fact.far==null?'':String(fact.far),
  richgo_floors:fact.floors,richgo_coverage:fact.coverage==null?'':String(fact.coverage),
  richgo_parking:fact.parking==null?'':String(fact.parking),richgo_heating:fact.heating,
  richgo_builder:fact.builder,richgo_pyeongs:fact.pyeongs,richgo_id:fact.id,source_url:fact.url,
  evidence:'리치고 공개 단지정보 '+today,verification:'직접확인'
 });
 const samePy=fact.prices[Number(row.py)];
 row.richgo_same_py_sale=samePy?.[0]||'';
 row.richgo_same_py_jeonse=samePy?.[1]||'';
 const changes=[];
 for(const k of ['year','units','far'])if(changed(row,k,fact[k]))changes.push(k+': '+(row['map_'+k]||'blank')+' -> '+fact[k]);
 if(changes.length){row.action='변경';different++;}else row.action='동일';
 row.notes=changes.join('; ');
 confirmed++;done++;
 if(done%25===0)console.log('PROGRESS',JSON.stringify({done,count,confirmed,different,notFound,ambiguous,searchCalls,pageCalls,errors}));
}
let next=0;
const workers=Array.from({length:concurrency},()=>async()=>{while(!blocked){const pos=next++;if(pos>=count)break;const i=targetIndices[pos];try{await processRecord(i)}catch(e){errors++;done++;console.log('AUDIT-ERROR',i,String(e).slice(0,220));}}});
(async()=>{
 await buildCatalog(records);
 await Promise.all(workers.map(w=>w()));
 // Keep previously verified corrections if fewer than 300 reviewed due connectivity.
 const existing=JSON.parse(fs.readFileSync(corrections,'utf8')),spec={...existing,asOf:today,far:{...existing.far},year:{...existing.year},units:{...(existing.units||{})}};
 for(const row of records){
  if(row.verification!=='직접확인'&&row.verification!=='기존검증확인'&&row.verification!=='기존직접대조')continue;
  const key=row.name+'|'+row.area;
  const rf=num(row.richgo_far),ry=num(row.richgo_year),ru=num(row.richgo_units);
  if(rf!=null&&rf>=50&&rf<=1500&&changed(row,'far',rf))spec.far[key]=rf;
  if(ry!=null&&ry>=1950&&ry<=2035&&changed(row,'year',ry))spec.year[key]=ry;
  if(ru!=null&&ru>=10&&ru<=50000&&changed(row,'units',ru))spec.units[key]=ru;
 }
 fs.writeFileSync(input,writeCSV(header,records));
 fs.writeFileSync(corrections,JSON.stringify(spec,null,2)+'\n');
 const summary={asOf:today,total:records.length,processed:done,confirmed,changedRows:different,ambiguous,notFound,blocked,searchCalls,pageCalls,errors,
  storedVerified:records.filter(x=>x.verification==='직접확인'||x.verification==='기존검증확인'||x.verification==='기존직접대조').length,
  farCorrections:Object.keys(spec.far).length,yearCorrections:Object.keys(spec.year).length,unitsCorrections:Object.keys(spec.units).length};
 fs.writeFileSync(auditPath,JSON.stringify(summary,null,2)+'\n');
 console.log('FINAL_REPORT',JSON.stringify(summary));
 if(blocked)process.exitCode=3;
})().catch(e=>{console.error(e);process.exitCode=2;});
