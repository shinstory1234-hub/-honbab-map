#!/usr/bin/env node
/* 3rd pass: public administrative-dong Richgo listings instead of limited hub search pages. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const shard=Number(process.env.SHARD||0);if(!Number.isInteger(shard)||shard<0||shard>5)throw Error('Invalid shard');
const pre='docs/richgo-6to10-remaining-parts/part0'+shard+'.json',sec='docs/richgo-6to10-secondpass-parts/part0'+shard+'.json';
const first=JSON.parse(fs.readFileSync(pre,'utf8')),second=JSON.parse(fs.readFileSync(sec,'utf8'));
const confirmedSecond=new Set(second.rows.filter(x=>x.secondStatus==='verified_second_pass').map(x=>x.key));
const todo=first.rows.filter(x=>x.status!=='verified'&&!confirmedSecond.has(x.key));
const z={CAPT:10,PICKS:[],FARD:{},UGEO:{},HAK:{},console};z.window=z;
vm.createContext(z);vm.runInContext(fs.readFileSync('public/apt-univ10.js','utf8'),z,{timeout:30000});
const sleep=t=>new Promise(r=>setTimeout(r,t));
const norm=s=>String(s||'').toLowerCase().replace(/아파트|주상복합|단지|고층|저층/g,'').replace(/[^가-힣a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
const num=s=>{const m=String(s||'').match(/[0-9,]+(?:\.[0-9]+)?/);return m?Number(m[0].replace(/,/g,'')):null};
const yd=s=>{const m=String(s||'').match(/(?:19|20)\d{2}/);return m?Number(m[0]):null};
function sim(a,b){a=[...norm(a)];b=[...norm(b)];if(!a.length||!b.length)return 0;const r=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let old=r[0];r[0]=i+1;for(let j=0;j<b.length;j++){const old2=r[j+1];r[j+1]=Math.min(old2+1,r[j]+1,old+(a[i]===b[j]?0:1));old=old2;}}return 1-r[b.length]/Math.max(a.length,b.length);}
function distance(a,b){return Number.isFinite(a?.lat)&&Number.isFinite(a?.lng)&&Number.isFinite(b?.lat)&&Number.isFinite(b?.lng)?
 Math.round(Math.hypot((a.lat-b.lat)*111100,(a.lng-b.lng)*111100*Math.cos(a.lat*Math.PI/180))):null;}
const stats={requests:0,failures:0,blocked:0,limited:0,regions:0,dongs:0,details:0};
async function get(url){for(let n=0;n<3;n++){try{const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html; charset=utf-8'},signal:AbortSignal.timeout(23000)});
 if([401,403].includes(r.status)){stats.blocked++;return null;}
 if(r.status===429){stats.limited++;if(stats.limited>7)throw Error('rate limit; stop');await sleep(3500*(n+1));continue;}
 if([500,502,503,504].includes(r.status)){await sleep(1200*(n+1));continue;}
 if(!r.ok){stats.failures++;return null;}const text=await r.text();stats.requests++;return text.length>100?text:null;
 }catch(e){if(String(e).includes('rate limit; stop'))throw e;if(n===2)stats.failures++;else await sleep(900*(n+1));}}return null;}
async function parallel(items,workers,fn){let at=0,out=new Array(items.length);await Promise.all(Array.from({length:Math.min(workers,items.length)},async()=>{while(at<items.length){const i=at++;out[i]=await fn(items[i]);await sleep(370);}}));return out;}
function linkList(page,pattern){const out=[];for(const m of (page||'').matchAll(pattern))out.push({code:m[1],name:clean(m[2])});return out;}
function parseDistrict(page){const out=[];for(const m of (page||'').matchAll(/<a\b[^>]*href=["'](?:https:\/\/m\.richgo\.ai)?\/realty\/region\/(\d{10})["'][^>]*>([\s\S]*?)<\/a>/gi)){
 out.push({code:m[1],name:clean(m[2])});}return [...new Map(out.map(x=>[x.code,x])).values()];}
function parseDong(page){
 const out=[];
 for(const script of (page||'').matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{const o=JSON.parse(script[1]);for(const block of [o].flat()){for(const el of block?.itemListElement||[]){const id=String(el.url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/);if(id&&el.name)out.push({id:id[1],name:String(el.name)});}}}catch(e){}
 }
 if(!out.length)for(const m of (page||'').matchAll(/<a\b[^>]*href=["'](?:https:\/\/m\.richgo\.ai)?\/realty\/danji\/(a[A-Za-z0-9]{6})(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi)){
  out.push({id:m[1],name:clean(m[2]).replace(/[0-9·]+평.*$/,'')});
 }
 return [...new Map(out.map(x=>[x.id,x])).values()];
}
function details(html,id){const f={},match=(html||'').match(/<dl class="facts">([\s\S]*?)<\/dl>/);
 if(!match)return null;
 for(const m of match[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const g=html.match(/"latitude":([0-9.]+),\s*"longitude":([0-9.]+)/);
 return {id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),
  far:num(f['용적률']),year:yd(f['입주']),units:num(f['세대수']),lat:g?+g[1]:null,lng:g?+g[2]:null,
  floors:f['층수']||'',heating:f['난방']||'',pyeongs:f['평형']||'',parking:f['주차']||'',
  street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||'',url:'https://m.richgo.ai/realty/danji/'+id};
}
async function main(){
 const targets=todo.map(t=>({...t,code:String(z.FARD?.[t.key]?.[6]||''),dong:t.area.split(' ').at(-1)}));
 const districtCodes=[...new Set(targets.map(t=>t.code).filter(c=>/^\d{5}$/.test(c)))];
 console.log('THIRD_START',JSON.stringify({shard,targets:targets.length,districtCodes:districtCodes.length}));
 const regionPages=new Map();
 await parallel(districtCodes,3,async code=>{stats.regions++;const html=await get('https://m.richgo.ai/realty/region/'+code+'00000');regionPages.set(code,parseDistrict(html));});
 const dongPages=new Map(),requested=new Map();
 for(const t of targets){
  const links=regionPages.get(t.code)||[],matches=links.filter(x=>x.name===t.dong||x.name.startsWith(t.dong+' ')||x.name.startsWith(t.dong+'('));
  const best=matches.length?matches[0]:links.find(x=>x.name.startsWith(t.dong));
  if(best){const url='https://m.richgo.ai/realty/region/'+best.code;requested.set(url,true);t.dongUrl=url;}
 }
 await parallel([...requested.keys()],3,async url=>{stats.dongs++;const html=await get(url);dongPages.set(url,parseDong(html));});
 const ranked=new Map(),ids=new Set();
 for(const t of targets){
  const candidates=(dongPages.get(t.dongUrl)||[]).map(c=>{
   const dn=norm(t.dong),tn=norm(t.name),cn=norm(c.name);
   const a=tn.startsWith(dn)?tn.slice(dn.length):tn,b=cn.startsWith(dn)?cn.slice(dn.length):cn;
   const similarity=Math.max(sim(a,b),sim(t.name,c.name));
   return {...c,sim:similarity,exact:a===b||tn===cn};
  }).sort((a,b)=>(b.exact-a.exact)||b.sim-a.sim);
  const shortlist=candidates.filter(c=>c.sim>=.42||c.exact).slice(0,5);
  ranked.set(t.key,shortlist);for(const c of shortlist)ids.add(c.id);
 }
 const fact=new Map();await parallel([...ids],3,async id=>{stats.details++;const html=await get('https://m.richgo.ai/realty/danji/'+id);fact.set(id,html?details(html,id):null);});
 const results=[];let additionalVerified=0,farKnown=0,farBlank=0;
 for(const t of targets){
  const candidates=(ranked.get(t.key)||[]).map(c=>{
   const f=fact.get(c.id);if(!f||!f.year||!f.units)return null;
   const meters=distance(t.map,f),yearDiff=Math.abs(t.map.year-f.year),unitsRatio=Math.abs(t.map.units-f.units)/Math.max(t.map.units,f.units);
   const namesim=Math.max(c.sim,sim(t.name,f.name));
   const accepted=(yearDiff<=2&&unitsRatio<=.01&&((meters!=null&&meters<=150&&namesim>=.55)||
     (meters!=null&&meters<=250&&namesim>=.85)||(c.exact&&f.street.includes(t.dong))));
   const score=(c.exact?100:0)+namesim*100+(meters==null?0:Math.max(-100,80-meters/4))-(yearDiff*8);
   return {c,f,meters,yearDiff,unitsRatio,namesim,accepted,score};
  }).filter(Boolean).sort((a,b)=>b.score-a.score);
  const accepted=candidates.filter(x=>x.accepted),tie=accepted.length>1&&accepted[0].score-accepted[1].score<12;
  const best=accepted.length&&!tie?accepted[0]:null;
  if(best){additionalVerified++;if(best.f.far==null)farBlank++;else farKnown++;}
  results.push({key:t.key,name:t.name,area:t.area,oldStatus:t.status,thirdStatus:best?'verified_third_pass':tie?'ambiguous':'still_unresolved',
   richgo:best?.f||null,match:best?{distanceMeters:best.meters,yearDelta:best.yearDiff,unitsRatio:best.unitsRatio,nameSimilarity:best.namesim,method:'official_dong_catalog'}:null,
   dongCatalog:t.dongUrl||'',candidates:candidates.slice(0,4).map(x=>({id:x.c.id,name:x.f.name,far:x.f.far,units:x.f.units,year:x.f.year,distance:x.meters,nameSimilarity:x.namesim,accepted:x.accepted}))});
 }
 const out={meta:{shard,targets:targets.length,additionalVerified,farKnown,farBlank,remaining:targets.length-additionalVerified,stats},rows:results};
 const output='/tmp/richgo-cap10-thirdpass'+shard+'.json',file='docs/richgo-6to10-thirdpass-parts/part0'+shard+'.json';
 fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n');console.log('THIRD_FINISH',JSON.stringify(out.meta));
 if(process.env.GITHUB_TOKEN){
  const body={message:'audit(cap10): 3rd-pass public dong-catalog matching shard '+shard,branch:process.env.GITHUB_REF_NAME,content:fs.readFileSync(output).toString('base64')};
  for(let n=0;n<12;n++){
   const r=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/'+file,{method:'PUT',headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify(body)});
   if(r.ok){console.log('GITHUB_ARCHIVED',file);return;}
   if(r.status!==409&&r.status!==422)throw Error('archive failed '+r.status+' '+(await r.text()).slice(0,240));
   await sleep(2000+n*900);
  }throw Error('Cannot archive thirdpass shard '+shard);
 }
}
main().catch(e=>{console.error('THIRD_FAILED',e.stack||e);process.exitCode=1});
