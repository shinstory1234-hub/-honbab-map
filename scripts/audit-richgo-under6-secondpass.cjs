#!/usr/bin/env node
/* Second-pass targeted public-page lookup for under6 unmatched apartments.
 * Only previously unmatched/review-needed named complexes. No production mutation.
 * Corroborate area, name, units, year and coordinates. No private endpoints or bypass.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),shard=Number(process.env.SHARD||0);
if(!Number.isInteger(shard)||shard<0||shard>5)throw Error('invalid shard');
const input=JSON.parse(fs.readFileSync(root+'/docs/richgo-under6-full-parts/part0'+shard+'.json','utf8'));
const pending=input.rows.filter(r=>!['verified','verified_shared_scope_review'].includes(r.status));
const SL=t=>new Promise(resolve=>setTimeout(resolve,t));
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
const N=s=>String(s||'').toLowerCase().replace(/아파트|주상복합|단지/g,'').replace(/[^가-힣a-z0-9]/g,'');
const dist=(a,b)=>a?.lat&&a?.lng&&b?.lat&&b?.lng?Math.round(Math.hypot((a.lat-b.lat)*111100,(a.lng-b.lng)*111100*Math.cos(a.lat*Math.PI/180))):null;
function district(s){const a=s.split(' ');if(['서울','인천'].includes(a[0]))return {sd:a[0],sgg:a[1],dong:a[a.length-1]};return {sd:'경기',sgg:(a[0].endsWith('시')?a[0]:a[0]+'시')+(a[1]?.endsWith('구')?' '+a[1]:''),dong:a[a.length-1]};}
function similarity(a,b){a=[...N(a)];b=[...N(b)];if(!a.length||!b.length)return 0;let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let old=row[0];row[0]=i+1;for(let j=0;j<b.length;j++){let z=row[j+1];row[j+1]=Math.min(row[j+1]+1,row[j]+1,old+(a[i]===b[j]?0:1));old=z;}}return 1-row[b.length]/Math.max(a.length,b.length);}
function core(name,dong){const n=N(name),d=N(dong);return n.startsWith(d)&&n.length>d.length+1?n.slice(d.length):n;}
const num=v=>{const m=String(v||'').match(/[0-9,]+(?:\.[0-9]+)?/);return m?Number(m[0].replace(/,/g,'')):null};
const stat={attempted:0,fetched:0,error:0,blocked:0,limited:0,bing:0,hub:0,detail:0};
async function get(url){for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html,application/rss+xml'},signal:AbortSignal.timeout(18000)});
 if(r.status===403||r.status===401){stat.blocked++;return null;}
 if(r.status===429){stat.limited++;if(stat.limited>=8)throw Error('rate limit, stop');await SL(3000+attempt*3000);continue;}
 if([500,502,503,504].includes(r.status)){await SL(1200*(attempt+1));continue;}
 if(!r.ok){stat.error++;return null;}let body=await r.text();stat.fetched++;return body.length>100?body:null;
 }catch(e){if(String(e).includes('rate limit, stop'))throw e;if(attempt===1)stat.error++;else await SL(1000);}}return null;}
async function pool(items,n,fn){let cur=0,ret=new Array(items.length);await Promise.all(Array.from({length:n},async()=>{while(cur<items.length){let i=cur++;ret[i]=await fn(items[i],i);await SL(520);}}));return ret;}
const dirs=new Map();for(const r of pending){const loc=district(r.area),id=loc.sd+'|'+loc.sgg;dirs.set(id,loc);r.__d=id;r.__dong=loc.dong;}
const hubs=new Map();
await pool([...dirs.entries()],2,async([id,d])=>{stat.hub++;const u='https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent(d.sd)+'/'+encodeURIComponent(d.sgg);const page=await get(u);if(!page)return;const map=new Map();
for(const tr of page.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)||[]){const m=tr.match(/<a\b[^>]*href=["']\/realty\/danji\/(a[A-Za-z0-9]{6})[^"']*["'][^>]*>([\s\S]*?)<\/a>/);
 if(!m)continue;const label=clean(m[2]).replace(/^\d+\.\s*/,'');
 const extra=clean(tr.match(/<\/a><span>([^<]+)<\/span>/)?.[1]||tr);
 const dong=extra.match(/([가-힣0-9]+(?:동|가|읍|면|리))\s*·/)?.[1]||'',units=num((extra.match(/([\d,]+)세대/)||[])[1]);
 map.set(m[1],{id:m[1],name:label,dong,units,method:'region_hub'});
}hubs.set(id,map);});
function score(t,c){const tn=core(t.name,t.__dong),cn=core(c.name,t.__dong);
 const namesame=tn===cn,contains=tn.length>=4&&cn.includes(tn)||cn.length>=4&&tn.includes(cn),similarityScore=similarity(tn,cn);
 let point=namesame?125:contains?105:similarityScore>=.8?similarityScore*95:similarityScore*55;
 if(c.dong)point+=c.dong===t.__dong?27:-60;
 if(c.units){const m=Math.abs(c.units-t.map.units)/Math.max(c.units,t.map.units);
  point+=m<=.02?24:m<=.12?12:m>.35?-26:0;
 }
 return point;}
const queued=new Map(),candidate=new Map(),lookup=[];
for(const r of pending){let source=[...(hubs.get(r.__d)||new Map()).values()];
 for(const c of r.candidates||[]){if(!source.some(x=>x.id===c.id))source.push({id:c.id,name:r.name,dong:r.__dong,units:c.units,method:'previous_candidate'});}
 const ranked=source.map(x=>({...x,score:score(r,x)})).sort((a,b)=>b.score-a.score);
 candidate.set(r.key,ranked.filter(x=>x.score>=78).slice(0,4));
 if(!candidate.get(r.key).length)lookup.push(r);
}
console.log('SECOND_INIT',JSON.stringify({shard,pending:pending.length,regionalDistricts:dirs.size,regionalCandidateCoverage:pending.length-lookup.length,searches:lookup.length,network:stat}));
let bingUsed=0;
const searches=await pool(lookup,2,async r=>{
 if(stat.blocked>12||stat.limited>=8)return [];
 const queries=[r.name,r.name.replace(/^\S+(?:동|가)\s+/,'')];
 const found=[];
 for(const q of [...new Set(queries)]){
  stat.bing++;let terms='site:m.richgo.ai/realty/danji/ "'+q+'" "'+r.__dong+'"';
  const page=await get('https://www.bing.com/search?format=rss&q='+encodeURIComponent(terms));if(!page)continue;
  for(const m of page.matchAll(/(?:https?:\/\/)?m\.richgo\.ai\/realty\/danji\/(a[A-Za-z0-9]{6})/g))if(!found.includes(m[1]))found.push(m[1]);
  if(found.length)break;
 }
 return found.slice(0,3);
});
for(let i=0;i<lookup.length;i++){const r=lookup[i],list=candidate.get(r.key);for(const id of searches[i]||[]){if(!list.some(x=>x.id===id))list.push({id,score:100,method:'public_search_index',dong:r.__dong,name:r.name});}}
for(const r of pending)for(const c of candidate.get(r.key)||[])queued.set(c.id,true);
const pageFacts=new Map(),ids=[...queued.keys()];
await pool(ids,3,async id=>{stat.detail++;let html=await get('https://m.richgo.ai/realty/danji/'+id);if(!html){pageFacts.set(id,null);return;}
 const facts=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/),f={};if(facts)for(const m of facts[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const geo=html.match(/"latitude":([0-9.]+),\s*"longitude":([0-9.]+)/);
 const yearMatch=String(f['입주']||'').match(/(?:19|20)\d{2}/);
 const info={id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),units:num(f['세대수']),year:yearMatch?Number(yearMatch[0]):null,far:num(f['용적률']),floors:f['층수']||'',coverage:num(f['건폐율']),parking:num(f['주차']),heating:f['난방']||'',builder:f['시공사']||'',pyeongs:f['평형']||'',lat:geo?Number(geo[1]):null,lng:geo?Number(geo[2]):null,street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||'',facts:!!facts};
 pageFacts.set(id,info);
});
let verified=0,farKnown=0,farBlank=0,disputes=0;const results=[];
for(const r of pending){let ranked=(candidate.get(r.key)||[]).map(c=>{const f=pageFacts.get(c.id);if(!f||!f.facts||!f.year||!f.units)return null;
 const meters=dist(r.map,f),matchName=Math.max(similarity(core(r.name,r.__dong),core(c.name,r.__dong)),similarity(core(r.name,r.__dong),core(f.name,r.__dong)));
 const exact=core(r.name,r.__dong)===core(f.name,r.__dong)||core(r.name,r.__dong)===core(c.name,r.__dong);
 const textMatch=core(f.name,r.__dong).includes(core(r.name,r.__dong))&&core(r.name,r.__dong).length>=4;
 const years=Math.abs(r.map.year-f.year);
 const ur=Math.min(Math.abs(r.map.units-f.units)/Math.max(r.map.units,f.units),r.map.kaptUnits?Math.abs(r.map.kaptUnits-f.units)/Math.max(r.map.kaptUnits,f.units):1);
 const geo=meters!=null&&meters<=125,geoclose=meters!=null&&meters<=250;
 const nameOk=exact||textMatch||matchName>=.83;
 const accepted=(geo&&years<=3&&(matchName>=.45||ur<=.18))||
   (geoclose&&years<=2&&nameOk&&ur<=.25)||
   (nameOk&&years<=2&&ur<=.13&&(c.dong===r.__dong||f.street.includes(r.__dong)||c.method==='public_search_index'));
 const invalid=meters!=null&&meters>500||years>6;
 const points=c.score+(geo?55:meters==null?0:Math.max(-70,45-meters/8))+(exact?25:0)-years*5-(ur>.2?15:0);
 return {c,f,meters,matchName,years,ur,accepted:accepted&&!invalid,points};
 }).filter(Boolean).sort((a,b)=>b.points-a.points);
 const confident=ranked.filter(x=>x.accepted),first=confident[0];
 const collision=confident.length>=2&&confident[1].c.id!==first.c.id&&first.points-confident[1].points<10;
 const selected=first&&!collision?first:null;
 if(selected){verified++;if(selected.f.far==null)farBlank++;else farKnown++;}
 if(collision)disputes++;
 results.push({name:r.name,area:r.area,key:r.key,originalStatus:r.status,secondStatus:selected?'verified_second_pass':collision?'ambiguous':'still_unresolved',
  richgo:selected?{...selected.f,url:'https://m.richgo.ai/realty/danji/'+selected.f.id}:null,
  match:selected?{distanceMeters:selected.meters,yearDelta:selected.years,unitsRatio:selected.ur,method:selected.c.method,score:Math.round(selected.points)}:null,
  candidates:ranked.slice(0,3).map(c=>({id:c.c.id,name:c.f.name,year:c.f.year,units:c.f.units,far:c.f.far,distanceMeters:c.meters,accepted:c.accepted,score:Math.round(c.points)}))});
}
const out={meta:{shard,originalPending:pending.length,additionalVerified:verified,additionalFarKnown:farKnown,farBlank,stillPending:pending.length-verified,collisions:disputes,network:stat,method:'region hub + named indexed pages + coordinates + year + units'},rows:results};
const local='/tmp/richgo-under6-secondpass'+shard+'.json',file='docs/richgo-under6-secondpass-parts/part0'+shard+'.json';fs.writeFileSync(local,JSON.stringify(out,null,2)+'\n');
console.log('SECOND_FINAL',JSON.stringify(out.meta));
if(process.env.GITHUB_TOKEN){const payload={message:'audit(under6): second-pass specific-source matching for shard '+shard,branch:process.env.GITHUB_REF_NAME,content:fs.readFileSync(local).toString('base64')};
let done=false;for(let t=0;t<12;t++){const r=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/'+file,{method:'PUT',headers:{Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(r.ok){done=true;console.log('ARCHIVED',file);break;}if(r.status!==409&&r.status!==422)throw Error('Cannot save '+r.status+' '+(await r.text()).slice(0,200));await SL(2000+t*850);}
 if(!done)throw Error('Cannot save 2nd pass shard '+shard);
}
