#!/usr/bin/env node
/* Public Richgo full-neighborhood catalog pass for every remaining 6~10eok complex.
 * Matches the Richgo name and coordinates, not a stale public search index result.
 * Runs in 6 GitHub Actions shards. No non-public API, no writes to production.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),shard=Number(process.env.SHARD||0),N=6;
if(!Number.isInteger(shard)||shard<0||shard>=N)throw Error('shard range');
function csv(text){
 const rows=[];let row=[],v='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
 else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}else if(c!=='\r')v+=c;}
 if(v||row.length){row.push(v);rows.push(row);}const h=rows.shift().map(x=>x.replace(/^\ufeff/,''));return rows.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));
}
const sources=csv(fs.readFileSync('docs/richgo-6to10-full-coverage-20261118.csv','utf8'));
const missing=csv(fs.readFileSync('docs/richgo-6to10-unresolved237-20261118.csv','utf8'));
if(sources.length!==1822||missing.length!==237)throw Error('Input scope changed');
const sourceByKey=new Map(sources.map(x=>[x.name+'|'+x.area,x]));
const third=new Map(),areaDongs=new Map(),fourth=new Map();
for(let i=0;i<N;i++){
 const f=JSON.parse(fs.readFileSync('docs/richgo-6to10-thirdpass-parts/part0'+i+'.json','utf8'));
 for(const r of f.rows){third.set(r.key,r);if(r.dongCatalog)areaDongs.set(r.area,r.dongCatalog);}
 const a=JSON.parse(fs.readFileSync('docs/richgo-6to10-final343-parts/part0'+i+'.json','utf8'));
 for(const r of a.rows)fourth.set(r.key,r);
}
const picks=missing.filter((_,i)=>i%N===shard).map(x=>({...x,key:x.name+'|'+x.area,lat:+(sourceByKey.get(x.name+'|'+x.area)?.lat||0),lng:+(sourceByKey.get(x.name+'|'+x.area)?.lng||0)}));
const normalize=s=>String(s||'').toLowerCase().replace(/(\d{2,4}~\d{2,4}동)/g,'').replace(/\([^)]*(?:~|블록|블럭|동|bl)[^)]*\)/gi,'').replace(/bl\d+[-\d]*/gi,'').replace(/은평뉴타운|동탄시범|아파트|주상복합|시범|단지|고층|저층|the|광교/gi,'').replace(/[^가-힣a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
function sim(a,b){a=[...normalize(a)];b=[...normalize(b)];if(!a.length||!b.length)return 0;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let q=row[0];row[0]=i+1;for(let j=0;j<b.length;j++){const z=row[j+1];row[j+1]=Math.min(row[j+1]+1,row[j]+1,q+(a[i]===b[j]?0:1));q=z;}}return 1-row[b.length]/Math.max(a.length,b.length);}
function identity(a,b){
 const x=normalize(a),y=normalize(b);
 let best=sim(a,b);
 if(x.length>=4&&y.length>=4&&(x.includes(y)||y.includes(x)))best=Math.max(best,.86);
 return best;
}
function distance(t,p){return t.lat>30&&t.lng>110&&p.lat>30&&p.lng>110?
 Math.round(Math.hypot((t.lat-p.lat)*111100,(t.lng-p.lng)*111100*Math.cos(t.lat*Math.PI/180))):null;}
function num(v){const m=String(v||'').match(/[0-9,]+(?:\.[0-9]+)?/);return m?Number(m[0].replace(/,/g,'')):null;}
function extract(html,id){
 const d=(html||'').match(/<dl class="facts">([\s\S]*?)<\/dl>/);if(!d)return null;
 const obj={};for(const m of d[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))obj[clean(m[1])]=clean(m[2]);
 const g=html.match(/"latitude":([0-9.]+),\s*"longitude":([0-9.]+)/);
 const yy=String(obj['입주']||'').match(/(?:19|20)\d{2}/);
 return {id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),
 far:num(obj['용적률']),units:num(obj['세대수']),year:yy?Number(yy[0]):null,lat:g?Number(g[1]):null,lng:g?Number(g[2]):null,
 url:'https://m.richgo.ai/realty/danji/'+id,street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||''};
}
function parseCatalog(html){
 const list=[];
 for(const block of (html||'').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{for(const v of [JSON.parse(block[1])].flat())for(const el of v?.itemListElement||[]){
   const m=String(el.url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/);
   if(m&&el.name)list.push({id:m[1],name:String(el.name)});}}catch(e){}
 }
 if(!list.length)for(const m of (html||'').matchAll(/<a\b[^>]*href=["'](?:https:\/\/m\.richgo\.ai)?\/realty\/danji\/(a[A-Za-z0-9]{6})(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi))list.push({id:m[1],name:clean(m[2]).replace(/[0-9·]+평.*$/,'')});
 return [...new Map(list.map(x=>[x.id,x])).values()];
}
function parseRegion(html,dong){
 const rows=[];for(const m of (html||'').matchAll(/<a\b[^>]*href=["'](?:https:\/\/m\.richgo\.ai)?\/realty\/region\/(\d{10})["'][^>]*>([\s\S]*?)<\/a>/gi)){
  rows.push({code:m[1],name:clean(m[2])});}
 return rows.find(x=>x.name===dong)?.code||rows.find(x=>x.name.startsWith(dong+' '))?.code||rows.find(x=>x.name.startsWith(dong))?.code||null;
}
const sleep=t=>new Promise(r=>setTimeout(r,t)),stats={req:0,failed:0,blocked:0,limited:0,regions:0,dongPages:0,details:0,listed:0,staleIds:0};
async function get(url){
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html;charset=utf-8'},signal:AbortSignal.timeout(24000)});
   if(r.status===401||r.status===403){stats.blocked++;return null;}
   if(r.status===429){stats.limited++;if(stats.limited>=10)throw Error('STOP_ON_429');await sleep(3500*(attempt+1));continue;}
   if([500,502,503,504].includes(r.status)){await sleep(1000*(attempt+1));continue;}
   if(!r.ok){stats.failed++;return null;}stats.req++;const html=await r.text();return html.length>80?html:null;
  }catch(e){if(String(e).includes('STOP_ON_429'))throw e;if(attempt>=2)stats.failed++;else await sleep(1300*(attempt+1));}
 }
 return null;
}
async function parallel(list,workers,fn){
 let i=0;const ret=new Array(list.length);await Promise.all(Array.from({length:Math.min(workers,list.length)},async()=>{
  while(i<list.length){const ix=i++;ret[ix]=await fn(list[ix]);await sleep(275);}
 }));return ret;
}
const z={CAPT:10,PICKS:[],FARD:{},UGEO:{},HAK:{},console};z.window=z;
vm.createContext(z);vm.runInContext(fs.readFileSync('public/apt-univ10.js','utf8'),z,{timeout:30000});
const groupBy=new Map(),areaMap=new Map();
for(const t of picks){const pre=third.get(t.key);let region=pre?.dongCatalog||areaDongs.get(t.area)||null;
 if(region){t.dongUrl=region;}
 else{
  const raw=String(z.FARD?.[t.key]?.[6]||'');
  if(/^\d{5}$/.test(raw))t.districtUrl='https://m.richgo.ai/realty/region/'+raw+'00000';
 }
 const dong=t.area.split(' ').at(-1);
 t.dong=dong;
 areaMap.set(t.area,t);
 if(t.districtUrl){const group=groupBy.get(t.districtUrl)||[];group.push(t);groupBy.set(t.districtUrl,group);}
}
async function main(){
 // Recover the regional catalog even when previous passes had no listed name match.
 await parallel([...groupBy],2,async([url,targets])=>{
  stats.regions++;const html=await get(url);if(!html)return;
  for(const t of targets){const found=parseRegion(html,t.dong);if(found)t.dongUrl='https://m.richgo.ai/realty/region/'+found;}
 });
 const distinct=[...new Set(picks.map(t=>t.dongUrl).filter(Boolean))],catalog=new Map();
 await parallel(distinct,3,async(url)=>{
  stats.dongPages++;const html=await get(url);const list=parseCatalog(html);stats.listed+=list.length;catalog.set(url,list);
 });
 const requestIds=new Set(),perItem=new Map();
 for(const t of picks){
  const rows=catalog.get(t.dongUrl)||[],existing=fourth.get(t.key)?.candidates||[];
  const ranked=rows.map(x=>({...x,similarity:identity(t.name,x.name)})).sort((a,b)=>b.similarity-a.similarity);
  let subset=ranked.filter(x=>x.similarity>=.22).slice(0,35);
  // If the name is a legacy alias and the list is short, inspect all details by location.
  if(subset.length<=2&&ranked.length<=85)subset=ranked.slice(0,85);
  const dedup=new Map(subset.map(x=>[x.id,x]));
  for(const x of existing){if(x.id&&!dedup.has(x.id))dedup.set(x.id,{id:x.id,name:x.name,similarity:identity(t.name,x.name),from:'previous'});}
  perItem.set(t.key,[...dedup.values()]);
  for(const x of dedup.values())requestIds.add(x.id);
 }
 console.log('CATALOG_FETCH_START',JSON.stringify({shard,targets:picks.length,dongPages:distinct.length,catalogIds:stats.listed,details:requestIds.size}));
 const details=new Map();
 await parallel([...requestIds],3,async id=>{stats.details++;const html=await get('https://m.richgo.ai/realty/danji/'+id);details.set(id,html?extract(html,id):null);});
 const output=[];
 for(const t of picks){
  const row=sourceByKey.get(t.key),options=(perItem.get(t.key)||[]).map(a=>{
   const f=details.get(a.id);if(!f)return null;
   const d=distance(t,f),s=identity(t.name,f.name||a.name),yearDist=f.year==null?null:Math.abs((+row.year_after_verified||+row.year_before)-f.year);
   const unitsDiff=f.units!=null?Math.abs((+row.units_after_verified||+row.units_before)-f.units):null;
   const unitsRatio=unitsDiff==null?null:unitsDiff/Math.max(f.units,+row.units_after_verified,1);
   const confidence=s>=.9&&d!=null&&d<=450?'same_name':s>=.62&&d!=null&&d<=300?'same_area_alias':s>=.3&&d!=null&&d<=120?'geo_alias':d!=null&&d<=200?'nearby_only':'unrelated';
   const score=s*135+(d==null?-60:Math.max(-150,100-d/2))+
      (yearDist==null?-10:Math.max(-24,20-yearDist*7))+
      (unitsRatio==null?0:Math.max(-25,20-unitsRatio*24))+
      (confidence==='same_name'?30:confidence==='same_area_alias'?15:0);
   return {id:f.id,name:f.name,area:t.area,url:f.url,units:f.units,far:f.far,year:f.year,
    lat:f.lat,lng:f.lng,distance_m:d,similarity:+s.toFixed(3),year_delta:yearDist,
    unit_delta:unitsDiff,unit_ratio:unitsRatio==null?null:+unitsRatio.toFixed(3),
    confidence,score:+score.toFixed(1),street:f.street};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  output.push({key:t.key,name:t.name,area:t.area,originalStatus:t.reason_code,originalUnits:+row.units_after_verified,
   originalYear:+row.year_after_verified,originalFar:row.far_after_verified?+row.far_after_verified:null,
   dongCatalog:t.dongUrl||null,candidateCount:options.length,
   candidates:options.slice(0,10)});
 }
 const file='docs/richgo-6to10-force237-catalog-parts/part0'+shard+'.json';
 const summary={date:'2026-11-18',shard,targets:picks.length,stats,catalogTargets:picks.filter(t=>t.dongUrl).length,
  withCandidate:output.filter(x=>x.candidates.length).length,
  strongName:output.filter(x=>x.candidates.some(z=>z.confidence==='same_name')).length,
  alias:output.filter(x=>x.candidates.some(z=>z.confidence==='same_area_alias'||z.confidence==='geo_alias')).length};
 const obj={meta:summary,rows:output},json=JSON.stringify(obj,null,2)+'\n';fs.writeFileSync('/tmp/richgo-force237-'+shard+'.json',json);
 console.log('CATALOG_FETCH_DONE',JSON.stringify(summary));
 if(!process.env.GITHUB_TOKEN)return;
 const base='https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/'+file;
 const token=process.env.GITHUB_TOKEN,headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const body={branch:process.env.GITHUB_REF_NAME,message:'audit(cap10): discover all Richgo neighborhood catalog candidates for unresolved 237 shard '+shard,content:Buffer.from(json).toString('base64')};
 for(let n=0;n<14;n++){
  const r=await fetch(base,{method:'PUT',headers,body:JSON.stringify(body)});
  if(r.ok){console.log('CATALOG_SAVED',file);return;}
  if(r.status!==409&&r.status!==422)throw Error('GitHub save '+r.status+' '+(await r.text()).slice(0,400));
  await sleep(2300+n*750);
 }
 throw Error('GitHub save conflict '+file);
}
main().catch(e=>{console.error('CATALOG_FAILED',e.stack||String(e));process.exitCode=1;});
