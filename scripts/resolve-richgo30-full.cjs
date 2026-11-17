/* Richgo cap30 identity follow-up for all initially unresolved complexes.
 * Uses only public detail pages and named official MCP search, never a sitewide scrape.
 * Geographic distance and construction/year/units are mandatory cross-checks.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),baseFile=root+'/docs/richgo30-full-audit-20261118.json',outFile=root+'/docs/richgo30-resolved-20261118.json';
const initial=JSON.parse(fs.readFileSync(baseFile,'utf8')),rows=initial.rows;
const sleep=n=>new Promise(r=>setTimeout(r,n));
const N=s=>String(s??'').toLowerCase().replace(/아파트|주상복합|단지/g,'').replace(/[^가-힣a-z0-9]/g,'');
function nameScore(a,b){a=[...N(a)];b=[...N(b)];if(!a.length||!b.length)return 0;let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){let old=row[0];row[0]=i+1;for(let j=0;j<b.length;j++){let x=row[j+1];row[j+1]=Math.min(row[j]+1,row[j+1]+1,old+(a[i]===b[j]?0:1));old=x;}}return 1-row[b.length]/Math.max(a.length,b.length);}
function dist(la,ln,y,x){if(!la||!ln||!y||!x)return null;return Math.round(Math.hypot((la-y)*111100,(ln-x)*111100*Math.cos(la*Math.PI/180)));}
const clean=s=>String(s??'').replace(/<[^>]*>/g,'').replace(/&#x27;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const num=s=>{let m=String(s||'').match(/[\d,]+/);return m?Number(m[0].replace(/,/g,'')):null};
function parse(html,id){const a=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/),f={};if(a)for(let p of a[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(p[1])]=clean(p[2]);
let co=html.match(/"latitude":([0-9.]+),"longitude":([0-9.]+)/);
return {id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),units:num(f['세대수']),year:num(f['입주']),far:num(f['용적률']),coverage:num(f['건폐율']),parking:num(f['주차']),floor:f['층수']||'',heating:f['난방']||'',builder:f['시공사']||'',pyeongs:f['평형']||'',lat:co?+co[1]:null,lng:co?+co[2]:null,street:html.match(/"streetAddress":"([^"]+)"/)?.[1]||'',facts:!!a};}
async function fetchPage(id){for(let n=0;n<3;n++){try{let r=await fetch('https://m.richgo.ai/realty/danji/'+id,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(19000)});if(r.ok)return parse(await r.text(),id);if(r.status===404)return null;}catch(e){}await sleep(800*(n+1));}return null;}
const mcpCache=new Map(),pageCache=new Map();let calls=0,mcpErrors=0,pages=0;
async function search(q){if(mcpCache.has(q))return mcpCache.get(q);if(calls>=100)return [];
 calls++;try{const r=await fetch('https://m.richgo.ai/api/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:calls,method:'tools/call',params:{name:'search_apartments',arguments:{query:q.slice(0,40)}}}),signal:AbortSignal.timeout(22000)});
 if(r.status===429){mcpErrors++;await sleep(3500);return []}
 if(!r.ok){mcpErrors++;return []}
 let res=await r.json(),s=res.result?.structuredContent;
 if(!s&&res.result?.content?.[0]?.text){try{s=JSON.parse(res.result.content[0].text)}catch(e){}}
 const array=(s?.results||[]).filter(x=>/^a[A-Za-z0-9]{6}$/.test(x.danji_id||''));mcpCache.set(q,array);await sleep(250);return array;
 }catch(e){mcpErrors++;return []}}
function distinct(a){return [...new Set(a.filter(Boolean))]}
function queries(t){const name=t.name,area=t.area,dong=area.split(' ').at(-1);const simple=name.replace(/\([^)]*\)/g,'').replace(/아파트/g,'').replace(/\d+(?:동|단지)\s*~\s*\d+(?:동|단지)/g,'').replace(/(?:1|2|3|4)단지$/,'').trim();return distinct([simple,name,dong+' '+simple,dong+' '+name].filter(x=>x.length>1)).slice(0,4)}
async function page(id){if(!pageCache.has(id)){pages++;pageCache.set(id,await fetchPage(id))}return pageCache.get(id)}
function confidence(t,d){
 const meter=dist(t.map.lat,t.map.lng,d.lat,d.lng);
 const ratio=(d.units&&t.map.units)?Math.abs(d.units-t.map.units)/Math.max(d.units,t.map.units):1;
 const yr=d.year?Math.abs(t.map.year-d.year):100;
 const name=nameScore(t.name,d.name), a=N(t.name),b=N(d.name);
 const parent=a.length>=5&&(b.includes(a)||a.includes(b))&&Math.min(a.length,b.length)>=4;
 const exact=a===b,close=name>=.48;
 if(meter==null||meter>550||yr>3||!d.year||!d.units||!d.facts)return {ok:false,meter,ratio,yr,name,why:'year/geo/facts'};
 const strongName=exact||parent||name>.82;
 const unitsClose=ratio<=.09;
 const geographicUnits=meter<=110&&unitsClose&&(close||exact||parent);
 const parentScope=meter<=450&&yr<=2&&strongName&&(ratio<=.09||parent);
 const smallClose=meter<=50&&yr<=2&&ratio<=.20&&name>=.36;
 const trust=geographicUnits||parentScope||smallClose;
 const strength=(strongName?80:0)+(unitsClose?27:0)+Math.max(0,50-meter/7)+Math.round(name*25)-yr*12-(ratio>.35?18:0);
 return {ok:trust,meter,ratio,yr,name,strength,why:trust?'source matched':'low similarity or blended project'};
}
async function main(){
 const unresolved=rows.filter(x=>x.status!=='direct_verified');
 console.log('SECOND_PASS_INPUT',unresolved.length);
 const resolution=[];
 for(const t of unresolved){
   let ids=distinct(t.candidates||[]);
   if(t.status==='unmatched'||ids.length===0||!ids.some(x=>x.length===7)){
      for(const q of queries(t)){const hits=await search(q);for(const x of hits)ids.push(x.danji_id);ids=distinct(ids);if(ids.length>=8)break}
   }else if(t.status==='review_needed'&&ids.length<2){
      // Existing candidate looks wrong or incomplete: look up alternate spelling.
      for(const q of queries(t).slice(0,2)){const hits=await search(q);ids=distinct([...ids,...hits.map(x=>x.danji_id)]);}
   }
   // Previous known pages first; no more than 12 candidates per single named complex.
   ids=ids.slice(0,12);
   const considered=[];
   for(const id of ids){const d=await page(id);if(!d)continue;const c=confidence(t,d);considered.push({id,...c,source:d})}
   considered.sort((a,b)=>(b.ok?1:0)-(a.ok?1:0)||b.strength-a.strength);
   const acceptable=considered.filter(x=>x.ok);
   const chosen=acceptable[0]||null,ambiguous=acceptable.length>1&&(acceptable[0].strength-acceptable[1].strength<12)&&acceptable[0].id!==acceptable[1].id;
   if(chosen&&!ambiguous){
     const d=chosen.source;t.status='direct_verified';t.richgo={...d,url:'https://m.richgo.ai/realty/danji/'+chosen.id};
     t.match={method:'official_named_search_and_geo',distance_m:chosen.meter,yearDiff:d.year-t.map.year,unitRatio:chosen.ratio,score:chosen.strength,sourceId:chosen.id};
     t.integrated=chosen.ratio>.20;
   }
   resolution.push({seq:t.seq,name:t.name,area:t.area,applied:!!chosen&&!ambiguous,chosen:chosen?.id||null,ambiguous,options:considered.slice(0,5).map(({id,meter,ratio,yr,name,ok,strength})=>({id,meter,ratio,yr,name,ok,strength}))});
   if(resolution.length%10===0)console.log('SECOND_PASS_PROGRESS',JSON.stringify({done:resolution.length,total:unresolved.length,approved:resolution.filter(x=>x.applied).length,calls,pages}));
 }
 const counts={total:rows.length,verified:rows.filter(x=>x.status==='direct_verified').length,farKnown:rows.filter(x=>x.status==='direct_verified'&&x.richgo?.far!=null).length,
   farBlank:rows.filter(x=>x.status==='direct_verified'&&x.richgo?.far==null).length,unresolved:rows.filter(x=>x.status!=='direct_verified').length,secondPassAdded:resolution.filter(x=>x.applied).length,mcpCalls:calls,mcpErrors,sourcePagesFetched:pages};
 const all={metadata:{...initial.metadata,secondPass:counts},rows,resolution};
 fs.writeFileSync(outFile,JSON.stringify(all,null,2)+'\n');
 fs.writeFileSync(root+'/docs/richgo30-secondpass-20261118.json',JSON.stringify({counts,resolution},null,2)+'\n');
 console.log('SECOND_PASS_FINAL',JSON.stringify(counts));
 console.log('REMAINING',JSON.stringify(rows.filter(r=>r.status!=='direct_verified').map(r=>({seq:r.seq,name:r.name,area:r.area}))));
}
main().catch(e=>{console.error('SECOND_PASS_ERROR',e.stack||String(e));process.exitCode=1});
