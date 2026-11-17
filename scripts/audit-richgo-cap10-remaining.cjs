#!/usr/bin/env node
/*
 * 6~10억 기존 조사 미확인 1,108개 공개 단지정보 후속 직접 크롤링.
 * 지역별 공개 목록 + 특정 후보의 공개 상세 페이지만 요청한다.
 * 비공개 API, 접근 통제 우회, 페이지 무차별 수집, 운영 데이터 수정 없음.
 * 검증 성공과 실제 용적률 확보를 구별하고 미매칭은 그대로 남긴다.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),SHARDS=6,shard=Number(process.env.SHARD||0);
if(!Number.isInteger(shard)||shard<0||shard>=SHARDS)throw Error('SHARD must be 0..5');
const date='20261118',sleep=t=>new Promise(ok=>setTimeout(ok,t));
const publicBase='https://m.richgo.ai';
const norm=s=>String(s||'').toLowerCase().replace(/아파트|주상복합|단지|\(고층\)|\(저층\)/g,'').replace(/[^가-힣a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;|&#160;/g,' ').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/\s+/g,' ').trim();
const num=v=>{let m=String(v??'').match(/[\d,]+(?:\.\d+)?/);return m?Number(m[0].replace(/,/g,'')):null};
function distance(a,b){if(!a.lat||!a.lng||!b.lat||!b.lng)return null;return Math.round(Math.hypot((a.lat-b.lat)*111100,(a.lng-b.lng)*111100*Math.cos(a.lat*Math.PI/180)));}
function sim(a,b){a=[...norm(a)];b=[...norm(b)];if(!a.length||!b.length)return 0;let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let old=row[0];row[0]=i+1;for(let j=0;j<b.length;j++){let x=row[j+1];row[j+1]=Math.min(row[j+1]+1,row[j]+1,old+(a[i]===b[j]?0:1));old=x;}}return 1-row[b.length]/Math.max(a.length,b.length);}
function district(area){const a=area.split(' ');if(a[0]==='서울'||a[0]==='인천')return {sd:a[0],sgg:a[1],dong:a[a.length-1]};return {sd:'경기',sgg:(a[0].endsWith('시')?a[0]:a[0]+'시')+(a[1]?.endsWith('구')?' '+a[1]:''),dong:a[a.length-1]};}
function readCsv(s){let out=[],row=[],c='',quoted=false;for(let i=0;i<s.length;i++){let x=s[i];if(quoted){if(x==='"'&&s[i+1]==='"'){c+='"';i++;}else if(x==='"')quoted=false;else c+=x;}else if(x==='"')quoted=true;else if(x===','){row.push(c);c='';}else if(x==='\n'){row.push(c.replace(/\r$/,''));out.push(row);row=[];c='';}else c+=x;}if(c||row.length){row.push(c);out.push(row);}const head=out.shift().map(x=>x.replace(/^\uFEFF/,''));return out.filter(x=>x.length===head.length).map(x=>Object.fromEntries(head.map((h,i)=>[h,x[i]])));}
// Fixed 6–10억 scope: preserve verified and cross-band reviewed source records.
const listed=readCsv(fs.readFileSync(root+'/docs/richgo-6to10-full-coverage-20261118.csv','utf8'));
if(listed.length!==1822)throw Error('Expected 1822 unique source apartments');
const all=listed.map(r=>({
  key:r.name+'|'+r.area,name:r.name,area:r.area,
  year:Number(r.year_after_verified)||Number(r.year_before),units:Number(r.units_after_verified)||Number(r.units_before),
  kaptUnits:null,lat:r.lat?Number(r.lat):null,lng:r.lng?Number(r.lng):null,
  far:r.far_after_verified?Number(r.far_after_verified):null,farSource:'cap10 audit baseline',
  py:null,price:null,district:district(r.area),reviewStatus:r.review_status
}));
const keys=new Set(all.map(x=>x.key));if(keys.size!==1822)throw Error('Duplicate source identity');
const todo=all.filter(r=>r.reviewStatus==='not_reviewed');
if(todo.length!==1108)throw Error('Expected 1108 remaining apartments, got '+todo.length);
const groups=new Map();for(const t of todo){const id=t.district.sd+'|'+t.district.sgg;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(t);}
const bins=Array.from({length:SHARDS},()=>({groups:[],total:0}));
for(const [id,rows] of [...groups.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0]))){
 const min=bins.reduce((a,b,i)=>b.total<bins[a].total?i:a,0);bins[min].groups.push(id);bins[min].total+=rows.length;
}
const chosen=new Set(bins[shard].groups),targets=todo.filter(t=>chosen.has(t.district.sd+'|'+t.district.sgg));
if(targets.length!==bins[shard].total)throw Error('Sharding mismatch');
const areas=[...chosen].map(id=>targets.find(x=>x.district.sd+'|'+x.district.sgg===id).district);
console.log('AUDIT_START',JSON.stringify({shard,all:all.length,alreadyReviewed:all.length-todo.length,remaining:todo.length,selected:targets.length,districts:areas.length,distribution:bins.map(x=>x.total)}));
const stats={requests:0,failures:0,rateLimited:0,blocked:0,hubRequests:0,detailRequests:0};
async function get(url){for(let i=0;i<3;i++){try{const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html; charset=utf-8'},signal:AbortSignal.timeout(22000)});
 if(r.status===403||r.status===401){stats.blocked++;return null;}
 if(r.status===429){stats.rateLimited++;await sleep(4000*(i+1));if(stats.rateLimited>=8)throw Error('STOP_RATE_LIMIT');continue;}
 if([500,502,503,504].includes(r.status)){await sleep(1200*(i+1));continue;}
 if(!r.ok){stats.failures++;return null;}
 const body=await r.text();stats.requests++;return body.length>=300?body:null;
 }catch(e){if(String(e).includes('STOP_RATE_LIMIT'))throw e;if(i===2)stats.failures++;else await sleep(1300*(i+1));}}
 return null;}
async function parallel(rows,count,fn){let at=0;const out=new Array(rows.length);await Promise.all(Array.from({length:count},async()=>{while(at<rows.length){let i=at++;out[i]=await fn(rows[i],i);await sleep(420);}}));return out;}
const filters=['','5억-10억','20평대','30평대','40평대이상','대단지','재건축','신축','역세권','5억이하'];
const candidates=new Map();
function pick(tr){const a=tr.match(/<a\b[^>]*href=["']\/realty\/danji\/(a[A-Za-z0-9]{6})(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/);
 if(!a)return null;const name=clean(a[2]).replace(/^\d+\.\s*/,'');const extra=clean(tr.match(/<\/a><span>([^<]+)<\/span>/)?.[1]||tr),dong=extra.match(/([가-힣0-9]+(?:동|가|읍|면|리))\s*·/)?.[1]||'',units=num((extra.match(/([\d,]+)\s*세대/)||[])[1]);
 return {id:a[1],name,dong,units};
}
async function hubs(){const jobs=areas.flatMap(loc=>filters.map(segment=>({loc,segment})));stats.hubRequests=jobs.length;
 await parallel(jobs,3,async job=>{const id=job.loc.sd+'|'+job.loc.sgg;const url=publicBase+'/realty/apt-hub/'+encodeURIComponent(job.loc.sd)+'/'+encodeURIComponent(job.loc.sgg)+(job.segment?'/'+encodeURIComponent(job.segment):'');
  const html=await get(url);if(!html)return;let map=candidates.get(id);if(!map){map=new Map();candidates.set(id,map);}
  for(const tr of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)||[]){const c=pick(tr);if(c&&!map.has(c.id))map.set(c.id,c);}
 });
 console.log('HUB_FINISH',JSON.stringify({shard,lookups:stats.hubRequests,uniqueIds:[...candidates.values()].reduce((n,x)=>n+x.size,0),requests:stats.requests,failures:stats.failures,rateLimited:stats.rateLimited}));
}
function hubScore(t,c){const ss=sim(t.name,c.name),na=norm(t.name),nb=norm(c.name),sub=na.length>=6&&nb.includes(na)||nb.length>=6&&na.includes(nb);
 let value=na===nb?115:sub?84:ss>=.85?Math.round(ss*85):Math.round(ss*65);
 if(c.dong)value+=c.dong===t.district.dong?28:-54;
 if(c.units){const d=Math.abs(t.units-c.units)/Math.max(t.units,c.units);
  value+=d<.02?22:d<.1?12:d>.35?-30:d>.2?-15:0;}
 return value;}
function parseDetail(html,id){const tag=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/),f={};if(tag)for(const m of tag[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const geo=html.match(/"latitude":([0-9.]+),\s*"longitude":([0-9.]+)/);
 const name=clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||'');
 return {id,name,far:num(f['용적률']),units:num(f['세대수']),year:num(f['입주']),coverage:num(f['건폐율']),parking:num(f['주차']),floors:f['층수']||'',heating:f['난방']||'',builder:f['시공사']||'',pyeongs:f['평형']||'',lat:geo?Number(geo[1]):null,lng:geo?Number(geo[2]):null,street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||'',factAvailable:!!tag};
}
async function main(){await hubs();
 const ranked=new Map(),idset=new Set();
 for(const t of targets){let id=t.district.sd+'|'+t.district.sgg,list=[...(candidates.get(id)||new Map()).values()].map(c=>({...c,score:hubScore(t,c)})).sort((a,b)=>b.score-a.score);
  const shortlist=list.filter((c,i)=>c.score>=70&&(i<3||c.score>=112)).slice(0,4);
  ranked.set(t.key,shortlist);for(const c of shortlist)idset.add(c.id);
 }
 const facts=new Map(),pages=[...idset];stats.detailRequests=pages.length;
 await parallel(pages,3,async id=>{const html=await get(publicBase+'/realty/danji/'+id);facts.set(id,html?parseDetail(html,id):null);});
 console.log('DETAIL_FINISH',JSON.stringify({shard,pages:pages.length,requests:stats.requests,failures:stats.failures,rateLimited:stats.rateLimited}));
 const rows=[],idusage=new Map(),counters={verified:0,farMatched:0,farBlank:0,diffFar:0,diffYear:0,diffUnits:0,ambiguous:0,unmatched:0,unavailable:0,review:0,geoVerified:0,integrated:0};
 for(const t of targets){let inspected=(ranked.get(t.key)||[]).map(c=>{const f=facts.get(c.id);if(!f||!f.factAvailable||!f.units||!f.year)return null;
  const meters=distance(t,f),nameSim=Math.max(sim(t.name,f.name),sim(t.name,c.name)),yearDiff=Math.abs(t.year-f.year),
  unitsDelta=Math.min(Math.abs(t.units-f.units)/Math.max(t.units,f.units),t.kaptUnits?Math.abs(t.kaptUnits-f.units)/Math.max(t.kaptUnits,f.units):1);
  const precise=meters!=null&&meters<=125,geographic=meters!=null&&meters<=250;
  const nameExact=norm(t.name)===norm(f.name)||norm(t.name)===norm(c.name);
  const sameDong=c.dong===t.district.dong,unitOk=unitsDelta<=0.01,yearOk=yearDiff<=2;
  const trusted=(precise&&yearOk&&unitOk&&nameSim>=.65)||(geographic&&yearOk&&unitOk&&nameSim>=.82)||(sameDong&&yearOk&&unitOk&&nameExact);
  const rejected=meters!=null&&meters>500||yearDiff>8;
  const approved=trusted&&!rejected&&f.far!==0;
  const points=c.score+(meters!=null?Math.max(-100,50-meters/7):0)+(nameExact?24:0)-yearDiff*5-(unitsDelta>.2?20:0);
  return {c,f,meters,nameSim,yearDiff,unitsDelta,sameDong,approved,points};
 }).filter(Boolean).sort((a,b)=>b.points-a.points);
 const valid=inspected.filter(x=>x.approved),top=valid[0]||null;
 const collision=valid.length>1&&valid[1].c.id!==valid[0].c.id&&valid[0].points-valid[1].points<10;
 const approved=top&&!collision;
 const kind=approved?'verified':collision?'ambiguous':!ranked.get(t.key)?.length?'unmatched':inspected.length?'review_needed':'unavailable';
 const selected=approved?top:null;
 if(selected){idusage.set(selected.c.id,(idusage.get(selected.c.id)||0)+1);counters.verified++;if(selected.meters!=null&&selected.meters<=125)counters.geoVerified++;
  if(selected.f.far==null)counters.farBlank++;else{counters.farMatched++;if(Number(selected.f.far)!==Number(t.far))counters.diffFar++;}
  if(selected.f.year!==t.year)counters.diffYear++;if(selected.f.units!==t.units)counters.diffUnits++;
 }else if(kind==='ambiguous')counters.ambiguous++;else if(kind==='unmatched')counters.unmatched++;else if(kind==='unavailable')counters.unavailable++;else counters.review++;
 const rich=selected?.f;
 rows.push({key:t.key,name:t.name,area:t.area,source:'Richgo public apartment detail',sourceDate:date,
  map:{year:t.year,units:t.units,kaptUnits:t.kaptUnits,far:t.far,farSource:t.farSource,price:t.price,py:t.py,lat:t.lat,lng:t.lng},
  status:kind,richgo:rich?{...rich,url:publicBase+'/realty/danji/'+rich.id}:null,
  match:selected?{distanceMeters:selected.meters,yearDelta:selected.yearDiff,unitsRatio:+selected.unitsDelta.toFixed(4),nameSimilarity:+selected.nameSim.toFixed(3),hubScore:selected.c.score}:null,
  candidates:inspected.slice(0,3).map(x=>({id:x.c.id,score:Math.round(x.points),distance:x.meters,year:x.f.year,units:x.f.units}))});
 }
 for(const r of rows){if(r.richgo&&idusage.get(r.richgo.id)>1){r.integrated=true;counters.integrated++;r.status='verified_shared_scope_review';}}
 // Published as evidence only; no data changes to the site or ranking.
 const report={meta:{date,shard,targets:targets.length,previouslyReviewed:714,wholeUniverse:1822,remainingUniverse:1108,districts:areas.length,statistics:stats,counts:counters},rows};
 const file='docs/richgo-6to10-remaining-parts/part'+String(shard).padStart(2,'0')+'.json';
 const local='/tmp/richgo-6to10-remaining-part'+shard+'.json';fs.writeFileSync(local,JSON.stringify(report,null,2)+'\n');
 console.log('AUDIT_FINISH',JSON.stringify(report.meta));
 if(process.env.GITHUB_TOKEN){const api='https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY+'/contents/'+file;
  const content=Buffer.from(fs.readFileSync(local)).toString('base64');let saved=false;
  for(let attempt=0;attempt<12;attempt++){const response=await fetch(api,{method:'PUT',headers:{'Authorization':'Bearer '+process.env.GITHUB_TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({message:'audit(cap10): store Richgo remaining comparison shard '+shard+' ('+targets.length+' apartments)',branch:process.env.GITHUB_REF_NAME,content})});
   if(response.ok){saved=true;console.log('GITHUB_COMMITTED',file);break;}
   const x=await response.text();if(response.status!==409&&response.status!==422)throw Error('GitHub archive failed '+response.status+' '+x.slice(0,200));
   await sleep(2000+attempt*900);
  }
  if(!saved)throw Error('Could not archive shard '+shard+' due to concurrent commits');
 }
}
main().catch(e=>{console.error('AUDIT_FAILED',e.stack||String(e));process.exitCode=1});
