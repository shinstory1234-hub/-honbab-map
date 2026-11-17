#!/usr/bin/env node
/* Fourth-pass identity audit: all 343 unresolved cap10 complexes.
 * Public Richgo details, public indexed listings, existing three-pass candidate evidence.
 * No inauthentic URLs, no private APIs, no bypassing throttling, no automatic site changes.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),shard=Number(process.env.SHARD||0),SHARDS=6;
if(!Number.isInteger(shard)||shard<0||shard>=SHARDS)throw Error('Invalid shard '+shard);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function csv(t){
 const records=[];let row=[],cell='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}
 else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));records.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}
 if(cell||row.length){row.push(cell);records.push(row);}
 const fields=records.shift().map(x=>x.replace(/^\ufeff/,''));return records.filter(x=>x.length===fields.length).map(values=>Object.fromEntries(fields.map((x,i)=>[x,values[i]])));
}
const coverage=csv(read('docs/richgo-6to10-full-coverage-20261118.csv'));
if(coverage.length!==1822)throw Error('Unexpected cap10 population');
const unresolved=coverage.filter(r=>!r.review_status.includes('verified'));
if(unresolved.length!==343)throw Error('Unexpected remaining scope '+unresolved.length);
const todo=unresolved.filter((_,i)=>i%SHARDS===shard);
const getJSON=f=>JSON.parse(read(f));
const prior=new Map(),pageOwners=new Map();
function key(x){return x.name+'|'+x.area}
function idOf(url){return String(url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1]||null;}
const stats={requests:0,failed:0,blocked:0,limited:0,indexSearch:0,detailRequests:0};
const candidates=new Map();
for(const d of coverage){
 const id=idOf(d.richgo_url);if(id){const owners=pageOwners.get(id)||new Set();owners.add(key(d));pageOwners.set(id,owners);}
}
const first=new Map(),second=new Map(),third=new Map();
for(let i=0;i<SHARDS;i++){
 const f=getJSON('docs/richgo-6to10-remaining-parts/part0'+i+'.json');
 for(const row of f.rows)first.set(row.key,row);
 const s=getJSON('docs/richgo-6to10-secondpass-parts/part0'+i+'.json');
 for(const row of s.rows)second.set(row.key,row);
 const t=getJSON('docs/richgo-6to10-thirdpass-parts/part0'+i+'.json');
 for(const row of t.rows)third.set(row.key,row);
}
function norm(s){return String(s||'').toLowerCase().replace(/아파트|주상복합|고층|저층|단지|the|에이치/gi,'').replace(/[^a-z0-9가-힣]/g,'');}
function normDong(s){return String(s||'').replace(/[^가-힣0-9]/g,'')}
function editSim(a,b){a=[...norm(a)];b=[...norm(b)];if(!a.length||!b.length)return 0;const z=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){let prior=z[0];z[0]=i+1;for(let j=0;j<b.length;j++){const v=z[j+1];z[j+1]=Math.min(v+1,z[j]+1,prior+(a[i]===b[j]?0:1));prior=v;}}return 1-z[b.length]/Math.max(a.length,b.length);}
function namedMatch(a,b,dong){const c=normDong(dong),an=norm(a),bn=norm(b),dn=norm(c);
 const x=an.startsWith(dn)&&dn?an.slice(dn.length):an,y=bn.startsWith(dn)&&dn?bn.slice(dn.length):bn;
 return Math.max(editSim(a,b),editSim(x,y));}
function distance(a,b){const x=+a.lat,y=+a.lng;if(!(x>0&&y>0&&b?.lat>0&&b?.lng>0))return null;return Math.round(Math.hypot((x-b.lat)*111100,(y-b.lng)*111100*Math.cos(x*Math.PI/180)));}
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
const number=s=>{const m=String(s||'').match(/[0-9,]+(?:\.[0-9]+)?/);return m?Number(m[0].replace(/,/g,'')):null;};
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function fetchText(url){for(let n=0;n<3;n++){try{const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html,application/rss+xml; charset=utf-8'},signal:AbortSignal.timeout(22000)});
 if(r.status===401||r.status===403){stats.blocked++;return null;}
 if(r.status===429){stats.limited++;if(stats.limited>=8)throw Error('STOP_RATE_LIMIT');await sleep(3000*(n+1));continue;}
 if([500,502,503,504].includes(r.status)){await sleep(1000*(n+1));continue;}
 if(!r.ok){stats.failed++;return null;}stats.requests++;const txt=await r.text();return txt.length>=80?txt:null;
 }catch(e){if(String(e).includes('STOP_RATE_LIMIT'))throw e;if(n===2)stats.failed++;else await sleep(1100*(n+1));}}return null;}
async function pool(items,size,fn){let cur=0;const results=new Array(items.length);
 await Promise.all(Array.from({length:Math.min(items.length,size)},async()=>{while(cur<items.length){const i=cur++;results[i]=await fn(items[i],i);await sleep(500);}}));return results;}
function parseDetail(html,id){
 const tag=html?.match(/<dl class="facts">([\s\S]*?)<\/dl>/),f={};
 if(!tag)return null;
 for(const m of tag[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const geo=html.match(/"latitude":([0-9.]+),\s*"longitude":([0-9.]+)/),year=String(f['입주']||'').match(/(?:19|20)\d{2}/);
 return {id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),far:number(f['용적률']),
 year:year?Number(year[0]):null,units:number(f['세대수']),lat:geo?Number(geo[1]):null,lng:geo?Number(geo[2]):null,
 street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||'',url:'https://m.richgo.ai/realty/danji/'+id,
 info:clean(f['층수']||'')};
}
function variants(x){const a=[x.name,x.name.replace(/\([^)]*\)/g,'').replace(/[0123456789]단지/g,''),x.name.replace(/^(?:\S+?동)\s*/,'')];
 return [...new Set(a.map(s=>s.replace(/아파트/g,'').trim()).filter(s=>norm(s).length>=3))].slice(0,2);}
function score(target,page){
 const meters=distance(target,page),yy=Math.abs(+target.year_after_verified-page.year),u=+target.units_after_verified;
 const ud=Math.abs(u-page.units),ur=ud/Math.max(u,page.units),sim=namedMatch(target.name,page.name,target.area.split(' ').at(-1));
 const sameYear=yy<=2,strictUnits=ud===0,nearUnits=ud<=3||ur<=.003;
 const precise=meters!=null&&meters<=90,near=meters!=null&&meters<=180;
 const valid=page.units>0&&page.year>0&&sameYear&&(precise&&strictUnits&&sim>=.35||
   near&&strictUnits&&sim>=.58||precise&&nearUnits&&sim>=.82);
 const aliasPossible=page.units>0&&page.year>0&&sameYear&&near&&sim>=.52&&ur<.05;
 const points=sim*100+(meters==null?0:Math.max(-130,75-meters/3))-(yy*6)-(ur*160)+(strictUnits?30:0);
 return {page,meters,yearDelta:yy,unitDifference:ud,unitRatio:ur,nameSimilarity:+sim.toFixed(3),valid,aliasPossible,score:+points.toFixed(1)};
}
async function main(){
 const ids=new Set(),targets=todo.map(t=>({...t,__key:key(t),candidateIds:new Set(),from:[]}));
 for(const t of targets){
  const a=first.get(t.__key),b=second.get(t.__key),c=third.get(t.__key);
  const add=(id,src)=>{if(/^a[A-Za-z0-9]{6}$/.test(id||'')){t.candidateIds.add(id);t.from.push(src+':'+id);ids.add(id);}};
  add(idOf(t.richgo_url),'old-top300');add(a?.richgo?.id,'first');add(b?.richgo?.id,'second');add(c?.richgo?.id,'third');
  for(const z of a?.candidates||[])add(z.id,'first-candidate');
  for(const z of b?.candidates||[])add(z.id,'second-candidate');
  for(const z of c?.candidates||[])add(z.id,'third-candidate');
 }
 // For previously unmatched apartments, use the public search index to discover hidden aliases.
 const searchTargets=targets.filter(t=>!t.candidateIds.size||t.review_status==='crawler_unmatched'||['unmatched','name_mismatch','dong_mismatch','name_ambiguous'].includes(t.review_status));
 await pool(searchTargets,2,async t=>{
  for(const alias of variants(t)){
   stats.indexSearch++;
   const q='site:m.richgo.ai/realty/danji/ "'+alias+'" "'+t.area.split(' ').at(-1)+'"';
   const html=await fetchText('https://www.bing.com/search?format=rss&q='+encodeURIComponent(q));
   const found=new Set();
   for(const m of (html||'').matchAll(/(?:https?:\/\/)?m\.richgo\.ai\/realty\/danji\/(a[A-Za-z0-9]{6})/g))found.add(m[1]);
   for(const id of found){t.candidateIds.add(id);ids.add(id);t.from.push('public-index:'+id);}
   if(found.size>=2)break;
  }
 });
 console.log('FOURTH_CANDIDATES',JSON.stringify({shard,targets:targets.length,indexSearch:stats.indexSearch,uniqueDetailIds:ids.size}));
 const facts=new Map();
 await pool([...ids],3,async id=>{stats.detailRequests++;const html=await fetchText('https://m.richgo.ai/realty/danji/'+id);facts.set(id,html?parseDetail(html,id):null);});
 const results=[],st={verified_exact:0,verified_units_small_delta:0,verified_no_far:0,shared_identity:0,source_scope_mismatch:0,unresolved:0};
 for(const t of targets){
  const matches=[...t.candidateIds].map(id=>{const f=facts.get(id);return f?score(t,f):null;}).filter(Boolean).sort((a,b)=>b.score-a.score);
  const acceptable=matches.filter(x=>x.valid),best=acceptable[0],tie=acceptable[1]&&Math.abs(best.score-acceptable[1].score)<18;
  const owned=best?[...(pageOwners.get(best.page.id)||new Set())].filter(k=>k!==t.__key):[];
  const sharedScope=best&&owned.length>0;
  const chosen=best&&!tie&&!sharedScope?best:null;
  const plausible=matches.some(x=>x.aliasPossible||x.valid)||!!t.candidateIds.size;
  const status=chosen?(chosen.page.far==null?'verified_no_far':chosen.unitDifference>0?'verified_units_small_delta':'verified_exact'):
    best&&(sharedScope||tie)?'shared_identity':plausible?'source_scope_mismatch':'unresolved';
  st[status]++;
  results.push({
   key:t.__key,name:t.name,area:t.area,oldStatus:t.review_status,
   status,matched:!!chosen,source:chosen?.page||null,match:chosen?{meters:chosen.meters,yearDelta:chosen.yearDelta,unitDelta:chosen.unitDifference,ratio:chosen.unitRatio,nameSimilarity:chosen.nameSimilarity}:null,
   candidateCount:matches.length,existingSourceIds:[...t.candidateIds],problems:best?{duplicatePriorOwners:owned,scoreTie:!!tie,richgoFarBlank:best.page.far==null}:null,
   candidates:matches.slice(0,4).map(x=>({id:x.page.id,name:x.page.name,units:x.page.units,year:x.page.year,far:x.page.far,
      url:x.page.url,distanceMeters:x.meters,nameSimilarity:x.nameSimilarity,unitsDelta:x.unitDifference,score:x.score,valid:x.valid})),
  });
 }
 const output={meta:{date:'2026-11-18',shard,targetCount:targets.length,universe:1822,totalUnresolved:343,statistics:stats,counts:st},rows:results};
 const local='/tmp/richgo-cap10-final343-part'+shard+'.json';
 const file='docs/richgo-6to10-final343-parts/part0'+shard+'.json';
 fs.writeFileSync(local,JSON.stringify(output,null,2)+'\n');console.log('FOURTH_RESULT',JSON.stringify(output.meta));
 if(process.env.GITHUB_TOKEN){
  const api='https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/'+file;
  const payload={message:'audit(cap10): resolve pending 343 Richgo source identities shard '+shard,branch:process.env.GITHUB_REF_NAME,content:fs.readFileSync(local).toString('base64')};
  for(let n=0;n<12;n++){const r=await fetch(api,{method:'PUT',headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify(payload)});
   if(r.ok){console.log('GITHUB_ARCHIVED',file);return;}if(r.status!==409&&r.status!==422)throw Error('github archive '+r.status+' '+(await r.text()).slice(0,300));await sleep(2000+n*900);}
  throw Error('github commit collisions');
 }
}
main().catch(e=>{console.error('FOURTH_FAILED',e.stack||String(e));process.exitCode=1});
