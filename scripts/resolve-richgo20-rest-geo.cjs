/* Public Richgo geo-coordinate corroboration for stage-1 uncertain 15-20b complexes.
 * Candidate pages only; no sitewide crawling or internal APIs.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const pending=JSON.parse(fs.readFileSync(root+'/docs/richgo20-remaining326-candidates-20261118.json','utf8'));
function parseCSV(s){let rows=[],row=[],cell='',q=false;for(let i=0;i<s.length;i++){const x=s[i];if(q){if(x==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(x==='"')q=false;else cell+=x}else if(x==='"')q=true;else if(x===','){row.push(cell);cell=''}else if(x==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=x}const h=rows.shift().map(x=>x.replace(/^\uFEFF/,''));return rows.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))}
const current=parseCSV(fs.readFileSync(root+'/docs/richgo-15to20-remaining326-audit-20261118.csv','utf8'));
const bySeq=new Map(current.map(x=>[Number(x.seq),x]));
const known={
 307:'a7TXBrD',313:'a6ttktz',377:'a7RLHeE',449:'a3ICSyU',
 496:'a0SrMTu',515:'a7TXBrD',619:'a0KvURQ'
};
const ids=new Set(Object.values(known));
for(const r of pending.unresolved)for(const c of r.candidates||[])ids.add(c.id);
const queue=[...ids];const results={};
const delay=t=>new Promise(ok=>setTimeout(ok,t));
let count=0,errors=0;
async function fetchFact(id){for(let attempt=0;attempt<3;attempt++){try{
 const r=await fetch('https://m.richgo.ai/realty/danji/'+id,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(24000)});
 if(!r.ok){await delay(1200*(attempt+1));continue;}const s=await r.text(),geo=s.match(/"latitude":([0-9.]+),"longitude":([0-9.]+)/),facts=s.match(/<dl class="facts">([\s\S]*?)<\/dl>/);
 const m={};if(facts){for(const t of facts[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))m[t[1].replace(/<[^>]*>/g,'').trim()]=t[2].replace(/<[^>]*>/g,'').trim()}
 const num=x=>Number((String(x||'').match(/[\d,]+/)||[])[0]?.replace(/,/g,''))||null;
 return {id,name:s.match(/<meta name="keywords" content="([^,]+),/)?.[1]||'',lat:geo?Number(geo[1]):null,lng:geo?Number(geo[2]):null,year:num(m['입주']),units:num(m['세대수']),far:num(m['용적률']),coverage:num(m['건폐율']),parking:num(m['주차']),floors:m['층수']||'',heating:m['난방']||'',pyeongs:(m['평형']||'').replace(/평/g,'').replace(/·/g,'|'),street:s.match(/"streetAddress":"([^"]+)"/)?.[1]||'',status:'fetched'};
 }catch(e){if(attempt===2)console.error('FETCH_ERR',id,String(e));}await delay(1100*(attempt+1));}
 return {id,status:'failed'};
}
const workers=Array.from({length:4},async()=>{while(queue.length){const id=queue.shift();results[id]=await fetchFact(id);count++;await delay(200)}});Promise.all(workers).then(()=>{
 const dist=(x,y)=>Math.hypot((x.lat-y.lat)*111100,(x.lng-y.lng)*111100*Math.cos(y.lat*Math.PI/180));
 const resolutions=[];
 for(const row of pending.unresolved){
  const seq=Number(row.seq),src=bySeq.get(seq),geo={lat:Number(src.map_lat),lng:Number(src.map_lng)};
  const cand=[...new Set([known[seq],...(row.candidates||[]).map(c=>c.id)].filter(Boolean))].map(id=>{
   const d=results[id];if(!d||!d.lat)return {id,missing:true};
   const meters=Math.round(dist(geo,d)),years=Math.abs(Number(src.map_year)-d.year),unitsRatio=+(Math.abs(Number(src.map_units)-d.units)/Math.max(1,Number(src.map_units))).toFixed(3),kaptRatio=src.map_units_kapt?+(Math.abs(Number(src.map_units_kapt)-d.units)/Math.max(1,Number(src.map_units_kapt))).toFixed(3):null;
   return {...d,meters,yearDiff:years,unitsRatio,kaptRatio,manualId:known[seq]===id};
  }).sort((a,b)=>(a.meters??999999)-(b.meters??999999));
  const selected=cand.find(x=>x.manualId&&x.meters<500)||cand.find(x=>x.meters<125&&x.yearDiff<=3&&(x.unitsRatio<=0.15||x.kaptRatio<=0.05))||null;
  resolutions.push({seq,name:src.name,area:src.area,source:{lat:geo.lat,lng:geo.lng,year:Number(src.map_year),units:Number(src.map_units)},matched: selected?.id||null,approved:!!selected,reason: selected?'distance+year+units':'requires review',candidates:cand});
 }
 const confirmed=resolutions.filter(x=>x.approved).length;
 console.log('GEOCHECK',JSON.stringify({targets:pending.unresolved.length,uniqueIds:ids.size,downloads:count,failed:Object.values(results).filter(x=>x.status==='failed').length,confirmed,remaining:resolutions.length-confirmed}));
 console.log('UNRESOLVED',JSON.stringify(resolutions.filter(x=>!x.approved).map(x=>({seq:x.seq,name:x.name,top:x.candidates.slice(0,2).map(y=>({id:y.id,n:y.name,dist:y.meters,year:y.year,units:y.units}))}))));
 fs.writeFileSync(root+'/docs/richgo20-rest-geo-20261118.json',JSON.stringify({count:resolutions.length,confirmed,remaining:resolutions.length-confirmed,rows:resolutions},null,2)+'\n');
}).catch(e=>{console.error(e);process.exitCode=1});
