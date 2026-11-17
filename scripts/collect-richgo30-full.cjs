/* 25억~30억 전수 감사: 218 원본 + 현재 가격대 보완 후보 전부.
 * 지역별 리치고 공개 허브와 이미 검증된 단지 링크를 대상으로 수집한다.
 * 이름, 행정동, 입주연도, 세대수, 지리 좌표를 교차 확인한다.
 * 단지 동일성이 불분명하면 오류값을 자동 반영하지 않는다.
 * 오직 사용자 지정 273개, 공개 페이지 대상으로만 조회한다.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),date='20261118';
const out=root+'/docs/richgo30-full-audit-'+date+'.json';
const snapshot=root+'/docs/richgo25to30-fallback-targets-20261118.json';
const knownPath=root+'/docs/richgo30-known-links-20261118.json';
const SL=t=>new Promise(r=>setTimeout(r,t)), N=s=>String(s??'').replace(/[\s(){}]/g,'').toLowerCase().replace(/아파트|주상복합/g,'').replace(/[^가-힣a-z0-9]/g,'');
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#x27;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
function geoDist(a,b){if(!a?.lat||!b?.lat||!a?.lng||!b?.lng)return null;return Math.round(Math.hypot((a.lat-b.lat)*111100,(a.lng-b.lng)*111100*Math.cos(a.lat*Math.PI/180)));}
function similarity(a,b){a=[...N(a)];b=[...N(b)];if(!a.length||!b.length)return 0;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let old=row[0];row[0]=i+1;for(let j=0;j<b.length;j++){const t=row[j+1];row[j+1]=Math.min(row[j+1]+1,row[j]+1,old+(a[i]===b[j]?0:1));old=t;}}return 1-row[b.length]/Math.max(a.length,b.length);}
function district(a){let x=a.split(' ');if(x[0]==='서울'||x[0]==='인천')return {sd:x[0],sgg:x[1],dong:x[x.length-1]};return {sd:'경기',sgg:(x[0].endsWith('시')?x[0]:x[0]+'시')+(x[1]?.endsWith('구')?' '+x[1]:''),dong:x[x.length-1]};}
function rowsFromUniv(file){const t=fs.readFileSync(root+'/public/'+file,'utf8'),a=JSON.parse(t.slice(t.indexOf('const A=')+8,t.indexOf(',S=['))),k=t.indexOf('R=['),q=file.includes('add')?t.indexOf(';\nObject.assign(window.DEM',k):t.indexOf(';\nconst TB',k);
 const R=JSON.parse(t.slice(k+2,q));return R.map((r,i)=>({name:r[0],area:a[r[1]],year:r[4],units:r[5],py:r[2],price:r[3],far:r.at(-1)[0],farSource:r.at(-1)[1],lat:r[6]/1e5,lng:r[7]/1e5,rawIndex:i,source:file}));}
const sources=['apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js'];
const byKey=new Map();
for(const src of sources){for(const r of rowsFromUniv(src)){const k=r.name+'|'+r.area;if(!byKey.has(k)||src==='apt-univ30.js')byKey.set(k,r)}}
const raw=rowsFromUniv('apt-univ30.js'),targetMap=new Map();
for(const r of raw)targetMap.set(r.name+'|'+r.area,{...r,cohort:'raw30'});
for(const r of JSON.parse(fs.readFileSync(snapshot,'utf8')).rows){const k=r.name+'|'+r.area,prior=targetMap.get(k);
 if(prior){prior.cohort='raw30+bt_livecur';continue;}
 const indexed=byKey.get(k);
 if(indexed)targetMap.set(k,{...indexed,cohort:'bt_livecur'});
}
const targets=[...targetMap.values()].map((r,i)=>({...r,seq:i+1,key:r.name+'|'+r.area}));
const prior=JSON.parse(fs.readFileSync(knownPath,'utf8'));
const counted={targets:targets.length,raw:raw.length,fallback:new Set(targets.filter(r=>r.cohort==='bt_livecur').map(r=>r.key)).size};
assert.equal(counted.targets,273,'Target count changed: re-check snapshot, do not silently skip complexes');
assert.equal(new Set(targets.map(r=>r.key)).size,targets.length,'duplicate apartments');
console.log('INIT',JSON.stringify(counted));
const city=new Map();
for(const t of targets){const d=district(t.area);t.district=d;const k=d.sd+'|'+d.sgg;(city.get(k)||city.set(k,d).get(k));}
let fetched=0,failures=0,blocked=0;
async function get(url){for(let i=0;i<3;i++){try{const r=await fetch(url,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(19000)});
 if(r.status===429){blocked++;await SL(2500*(i+1));continue;}
 if([500,502,503,504].includes(r.status)){await SL(1100*(i+1));continue;}
 if(!r.ok){failures++;return null;}
 const s=await r.text();fetched++;return s;
 }catch(e){if(i===2)failures++;await SL(1000*(i+1));}}return null;}
async function parallel(items,n,fn){let next=0;const out=new Array(items.length);await Promise.all(Array.from({length:n},async()=>{while(next<items.length){const i=next++;out[i]=await fn(items[i],i);await SL(200);}}));return out;}
const filters=['','20억이상','10억-20억','30평대','40평대이상','대단지','재건축','역세권','신축'];
const tasks=[...city.entries()].flatMap(([id,loc])=>filters.map(segment=>({id,loc,segment})));
console.log('DISTRICTS',city.size,'HUB_REQUESTS',tasks.length);
const hub=new Map();
await parallel(tasks,5,async x=>{
 const u='https://m.richgo.ai/realty/apt-hub/'+encodeURIComponent(x.loc.sd)+'/'+encodeURIComponent(x.loc.sgg)+(x.segment?'/'+encodeURIComponent(x.segment):'');
 const html=await get(u);if(!html)return;
 const c=hub.get(x.id)||new Map();
 for(const tr of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)||[]){
   const a=tr.match(/<a\b[^>]*href="\/realty\/danji\/(a[A-Za-z0-9]{6})(?:\?[^"]*)?"[^>]*>([\s\S]*?)<\/a>/);if(!a)continue;
   const label=clean(a[2]).replace(/^\d+\s*\.\s*/,'').trim();
   const extra=clean(tr.match(/<\/a><span>([^<]+)<\/span>/)?.[1]||tr),dong=extra.match(/([가-힣0-9]+(?:동|가|읍|면|리))\s*·/)?.[1]||'';
   const units=Number(extra.match(/([\d,]+)세대/)?.[1]?.replace(/,/g,''))||null;
   if(!c.has(a[1]))c.set(a[1],{id:a[1],name:label,dong,units});
 }
 hub.set(x.id,c);
});
console.log('HUB_DONE',JSON.stringify({fetched,failures,ids:[...hub.values()].reduce((n,x)=>n+x.size,0)}));
function scoreHub(t,c){
 const a=N(t.name),b=N(c.name),sim=similarity(t.name,c.name);
 let s=a===b?110:((a.length>4&&b.includes(a))||(b.length>4&&a.includes(b)))?83:Math.round(sim*65);
 if(c.dong)s+=c.dong===t.district.dong?24:-23;
 if(c.units){const ratio=Math.abs(c.units-t.units)/Math.max(c.units,t.units);s+=ratio<.01?19:ratio<.09?10:ratio>.35?-15:0;}
 return s;
}
const candidates=new Map(),usedIds=new Set();
for(const t of targets){
 const k=t.district.sd+'|'+t.district.sgg;
 const c=[...(hub.get(k)||new Map()).values()].map(o=>({...o,score:scoreHub(t,o),origin:'public_hub'})).sort((a,b)=>b.score-a.score);
 const direct=prior[t.key];
 if(direct){c.unshift({id:direct.id,name:t.name,dong:t.district.dong,units:t.units,score:180,origin:direct.where})}
 const unique=new Map();
 for(const entry of c){if(!unique.has(entry.id))unique.set(entry.id,entry)}
 const list=[...unique.values()].filter((o,i)=>o.score>=49||i===0&&o.score>=44).slice(0,4);
 candidates.set(t.key,list);
 list.forEach(x=>usedIds.add(x.id));
}
console.log('MATCH_CANDIDATES',JSON.stringify({complexesWithCandidates:[...candidates.values()].filter(a=>a.length).length,uniquePages:usedIds.size,priorHits:targets.filter(t=>prior[t.key]).length}));
const facts=new Map();
function num(v){const x=String(v||'').match(/[\d,]+/);return x?Number(x[0].replace(/,/g,'')):null}
function details(html,id){
 const part=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/),vals={};
 if(part)for(const m of part[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))vals[clean(m[1])]=clean(m[2]);
 const loc=html.match(/"latitude":([0-9.]+),"longitude":([0-9.]+)/);
 return {id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),far:num(vals['용적률']),units:num(vals['세대수']),year:num(vals['입주']),coverage:num(vals['건폐율']),parking:num(vals['주차']),floor:vals['층수']||'',heating:vals['난방']||'',builder:vals['시공사']||'',pyeongs:vals['평형']||'',lat:loc?+loc[1]:null,lng:loc?+loc[2]:null,street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||'',facts:!!part};
}
await parallel([...usedIds],5,async id=>{const html=await get('https://m.richgo.ai/realty/danji/'+id);facts.set(id,html?details(html,id):{id,missing:true})});
console.log('DETAIL_DONE',JSON.stringify({pages:usedIds.size,fetched,failures,missing:[...facts.values()].filter(x=>x.missing).length}));
const rows=[],counter={approved:0,partial:0,missing:0,ambiguous:0,farMatched:0,farBlank:0,farDifferent:0,unitsDifferent:0,yearsDifferent:0,geoApproved:0,priorApproved:0};
const matchUse=new Map();
for(const t of targets){
 const list=(candidates.get(t.key)||[]).map(c=>{
   const v=facts.get(c.id);if(!v||v.missing||!v.facts||!v.year||!v.units)return null;
   const distance=geoDist(t,v),sim=similarity(t.name,c.name),richSim=similarity(t.name,v.name);
   const yearDelta=Math.abs(t.year-v.year),unitRatio=Math.abs(v.units-t.units)/Math.max(v.units,t.units);
   const nameOk= N(t.name)===N(v.name)||richSim>=.87||(N(t.name).length>=5&&N(v.name).includes(N(t.name)));
   const areaOk=!v.street||v.street.includes(t.district.dong)|| (distance!=null&&distance<200);
   const geoOk=distance!=null&&distance<=125,nearby=distance!=null&&distance<=300;
   let trusted=yearDelta<=3&&areaOk&&((nameOk&&unitRatio<=.22)||(geoOk&&Math.max(sim,richSim)>.57)||(distance!=null&&distance<60&&Math.max(sim,richSim)>.40));
   if(yearDelta>4||distance!=null&&distance>600)trusted=false;
   const points=c.score+((distance!=null)?Math.max(-75,50-distance/8):0)+(nameOk?22:0)-yearDelta*5-(unitRatio>.50?20:0);
   return {...c,v,distance,sim,richSim,yearDelta,unitRatio,nameOk,areaOk,geoOk,nearby,trusted,points};
 }).filter(Boolean).sort((a,b)=>b.points-a.points);
 const ok=list.filter(x=>x.trusted);
 const chosen=ok[0]||null;
 const ambiguous=ok.length>1&&ok[0].id!==ok[1].id&&(ok[0].points-ok[1].points<8);
 const status=chosen&&!ambiguous?'direct_verified':ambiguous?'ambiguous':list.length?'review_needed':'unmatched';
 const selected=chosen&&!ambiguous?chosen:null;
 if(selected){matchUse.set(selected.id,(matchUse.get(selected.id)||0)+1);counter.approved++;
    if(selected.distance!=null&&selected.distance<=125)counter.geoApproved++;
    if(selected.origin!=='public_hub')counter.priorApproved++;
    if(selected.v.far==null)counter.farBlank++;
    else{counter.farMatched++;if(selected.v.far!==t.far)counter.farDifferent++;}
    if(selected.v.units!==t.units)counter.unitsDifferent++;
    if(selected.v.year!==t.year)counter.yearsDifferent++;
 }else if(status==='ambiguous')counter.ambiguous++;
 else if(status==='unmatched')counter.missing++;
 else counter.partial++;
 rows.push({seq:t.seq,key:t.key,name:t.name,area:t.area,cohort:t.cohort,sourceFile:t.source,rawIndex:t.rawIndex,
 map:{year:t.year,units:t.units,far:t.far,far_source:t.farSource,lat:t.lat,lng:t.lng,py:t.py,price:t.price},
 status,richgo:selected?{...selected.v,url:'https://m.richgo.ai/realty/danji/'+selected.id}:null,
 match:selected?{method:selected.origin,distance_m:selected.distance,yearDiff:selected.v.year-t.year,unitRatio:selected.unitRatio,score:Math.round(selected.points),sourceId:selected.id}:null,
 rejected:list.filter(x=>!selected||x.id!==selected.id).slice(0,3).map(x=>({id:x.id,name:x.v.name||x.name,nearbyMeters:x.distance,score:Math.round(x.points),year:x.v.year,units:x.v.units})),
 candidates:(candidates.get(t.key)||[]).map(x=>x.id)
 });
}
for(const row of rows){if(row.richgo){row.integrated=(matchUse.get(row.richgo.id)>1||row.match.unitRatio>.20)}}
const full={metadata:{createdAt:'2026-11-18',scope:'25억초과 30억이하 실거래 후보 및 30억 원본 전수',cohort:counted,requests:fetched,failedRequests:failures,rateLimits:blocked,hubDistricts:city.size,hubTasks:tasks.length,sourcePages:usedIds.size,counts:counter,verified:counter.approved,total:rows.length},rows};
fs.writeFileSync(out,JSON.stringify(full,null,2)+'\n');
function csv(v){let h=['seq','name','area','cohort','sourceFile','map_far','richgo_far','far_delta','map_units','richgo_units','map_year','richgo_year','distance_m','match_method','integrated','status','richgo_url'];let q=x=>{let s=String(x??'');return /[,\"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};return '\uFEFF'+[h.join(','),...v.map(r=>[r.seq,r.name,r.area,r.cohort,r.sourceFile,r.map.far,r.richgo?.far,r.richgo?.far!=null&&r.map.far!=null?r.richgo.far-r.map.far:'',r.map.units,r.richgo?.units,r.map.year,r.richgo?.year,r.match?.distance_m,r.match?.method,r.integrated,r.status,r.richgo?.url].map(q).join(','))].join('\n')+'\n';}
fs.writeFileSync(root+'/docs/richgo30-full-audit-'+date+'.csv',csv(rows));
console.log('AUDIT_FINAL',JSON.stringify(full.metadata));
if(counter.approved<targets.length)console.log('UNRESOLVED',JSON.stringify(rows.filter(r=>r.status!=='direct_verified').map(r=>({seq:r.seq,name:r.name,area:r.area,status:r.status}))));
