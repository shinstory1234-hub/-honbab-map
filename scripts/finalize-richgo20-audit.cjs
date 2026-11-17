/* Phase 2: Verify all 300 apartments by full public Richgo detail pages.
 * Source: 229 matched pages in stage 1, plus 63 actual fetched detail pages
 * stored in remaining-candidates.json, and 8 manual index overrides + one
 * suspected wrongful matching of Gongdeok2. Does not fabricate empty FAR.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const csvPath=path.join(root,'docs/richgo-15to20-top300-audit-20261118.csv');
const pendingPath=path.join(root,'docs/richgo20-remaining-candidates-20261118.json');
function parseCsv(src){let rows=[],row=[],cell='',q=false;for(let i=0;i<src.length;i++){const x=src[i];if(q){if(x==='"'&&src[i+1]==='"'){cell+='"';i++;}else if(x==='"')q=false;else cell+=x}else if(x==='"')q=true;else if(x===','){row.push(cell);cell=''}else if(x==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=x}if(row.length||cell){row.push(cell);rows.push(row)}const h=rows.shift().map(x=>x.replace(/^\uFEFF/,''));return {headers:h,rows:rows.filter(r=>r.length>2).map(r=>Object.fromEntries(h.map((k,j)=>[k,r[j]??''])))}} 
const csv=({headers,rows})=>{const esc=s=>{const t=String(s??'');return /[,"\r\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};return '\uFEFF'+[headers.join(','),...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n')+'\n';}
const htmlText=s=>String(s||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,'').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim();
const num=s=>Number(String(s||'').match(/[\d,]+/)?.[0]?.replace(/,/g,''))||null;
function facts(html){const m=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/);if(!m)return null;const o={};for(const x of m[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))o[htmlText(x[1])]=htmlText(x[2]);return {
 name:htmlText(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),
 far:num(o['용적률']),year:num(o['입주']),units:num(o['세대수']),floors:o['층수']||'',
 coverage:num(o['건폐율']),parking:num(o['주차']),heating:o['난방']||'',builder:o['시공사']||'',pyeongs:(o['평형']||'').replace(/평/g,'').replace(/·/g,'|')
};}
const overrideBySeq={
 7:'a1CMtOn',104:'a3cyHeE',125:'a9rGwDA',175:'a7eSaZa',190:'a4XONIH',212:'a0aiKmn',238:'a5kgMtS',271:'a1fKpkk',229:'a9bxlly'
};
const combinedSeq=new Set([56,57,113,114,115,173,174,277,278]);
async function get(id){let err;for(let i=0;i<3;i++)try{const r=await fetch('https://m.richgo.ai/realty/danji/'+id,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(20000)});if(r.ok)return facts(await r.text());err=Error('HTTP '+r.status);await new Promise(res=>setTimeout(res,1250*(i+1)));}catch(e){err=e;}throw Error(id+' '+String(err));}
async function main(){
 const doc=parseCsv(fs.readFileSync(csvPath,'utf8')), old=JSON.parse(fs.readFileSync(pendingPath,'utf8'));
 if(doc.rows.length!==300||old.targets!==300)throw Error('300 source rows required');
 const bySeq=new Map(old.unresolved.map(x=>[Number(x.seq),x]));
 const manual=new Map();
 for(const [seq,id] of Object.entries(overrideBySeq)){const d=await get(id);if(!d||!d.units||!d.year)throw Error('no Richgo detail '+seq+' '+id);manual.set(Number(seq),{id,data:d});console.log('MANUAL',seq,id,d.name,d.year,d.units,d.far);}
 const audit=[];const sources=new Map();const issues=[];const changed={far:0,year:0,units:0};
 for(const row of doc.rows){
  const seq=Number(row.seq),prior=bySeq.get(seq),manualMatch=manual.get(seq);
  let d,sourceId,name,origin;
  if(manualMatch){d=manualMatch.data;sourceId=manualMatch.id;name=d.name;origin='direct_verified_override';}
  else if(prior&&prior.richgo){d=prior.richgo;sourceId=prior.candidates?.[0]?.id;name=prior.candidates?.[0]?.name||d.name;origin='alias_verified';}
  else if(String(row.status).includes('2026-11-18')&&row.richgo_url){d={
   name:row.richgo_name||row.name,far:num(row.richgo_far),year:num(row.richgo_year),units:num(row.richgo_units),
   floors:row.richgo_floors,coverage:num(row.richgo_coverage_pct),parking:num(row.richgo_parking),
   heating:row.richgo_heating,pyeongs:row.richgo_pyeongs
  };sourceId=row.richgo_url.split('/').pop();name=d.name;origin='stage1_verified';}
  else throw Error('unresolved source '+seq+' '+row.name);
  if(!sourceId||!d?.year||!d?.units)throw Error('missing matching facts '+seq);
  // Both explicit aliases and shared site records must be in the same dong
  // and be the same building generation. This handles common map K-apt regrouping.
  const city=row.area.split(' ').slice(-1)[0];
  if(prior&&!manualMatch&&!combinedSeq.has(seq)){
   const match=prior.candidates[0];
   if(match.dong!==city)issues.push({seq,name:row.name,error:'dong mismatch',got:match.dong,expected:city});
  }
  const yearDiff=Math.abs(d.year-Number(row.map_year));
  if(yearDiff>=4)issues.push({seq,name:row.name,error:'year>=4',expected:row.map_year,got:d.year});
  const id=sourceId;
  if(!sources.has(id))sources.set(id,[]);sources.get(id).push(seq);
  row.richgo_url='https://m.richgo.ai/realty/danji/'+id;
  row.richgo_year=String(d.year);row.richgo_units=String(d.units);row.richgo_far=d.far==null?'':String(d.far);
  row.richgo_floors=d.floors||'';row.richgo_coverage_pct=d.coverage==null?'':String(d.coverage);
  row.richgo_parking=d.parking==null?'':String(d.parking);row.richgo_heating=d.heating||'';row.richgo_pyeongs=d.pyeongs||'';
  row.richgo_name=d.name||name;row.richgo_identity_level=origin;
  row.source_date='2026-11-18';
  row.year_diff=d.year-Number(row.map_year);row.units_diff=d.units-Number(row.map_units);
  row.far_diff_raw_pp=d.far===null||!row.map_far_raw?'':d.far-Number(row.map_far_raw);
  row.note=(row.note||'')+' | Richgo '+name+' ('+d.units+'세대, '+d.year+'년)'+(combinedSeq.has(seq)?'; integrated site, block units must not be multiplied':'') ;
  row.status=d.far==null?'전수조사완료_리치고_용적률공란':'전수조사완료_리치고_직접대조';
  if(d.far!==null&&Number(row.map_far_raw)!==d.far)changed.far++;
  if(d.year!==Number(row.map_year))changed.year++;
  if(d.units!==Number(row.map_units_kapt||row.map_units))changed.units++;
  audit.push({seq,name:row.name,area:row.area,k:row.name+'|'+row.area,richname:name,url:row.richgo_url,id,far:d.far,year:d.year,units:d.units,coverage:d.coverage,floors:d.floors,heating:d.heating,pyeongs:d.pyeongs,origin,mapYear:Number(row.map_year),mapUnits:Number(row.map_units),kaptUnits:Number(row.map_units_kapt)||null,integrated:combinedSeq.has(seq)});
 }
 if(audit.length!==300||audit.filter(x=>!x.url).length>0)throw Error('must check all 300 Richgo pages');
 if(issues.length)console.warn('IDENTITY_WARNINGS',JSON.stringify(issues));
 let blanks=audit.filter(x=>x.far==null);
 console.log('AUDIT DONE',{target:audit.length,farKnown:audit.length-blanks.length,farBlanks:blanks,uniqueRichgoPages:sources.size,overlaps:[...sources.entries()].filter(([,s])=>s.length>1),changed,issues});
 for(const k of ['richgo_name','richgo_identity_level'])if(!doc.headers.includes(k))doc.headers.push(k);
 fs.writeFileSync(csvPath,csv(doc));
 fs.writeFileSync(path.join(root,'docs/richgo20-verified-full-20261118.json'),JSON.stringify({count:300,verified:300,uniqueRichgoPages:sources.size,farKnown:300-blanks.length,farBlanks:blanks,changed,identityWarnings:issues,rows:audit},null,2)+'\n');
 // Correct raw source of this price-band: only factual differences, never change
 // price reference from transactional median to Richgo modeled fair price.
 const source=path.join(root,'public/apt-univ20.js'),src=fs.readFileSync(source,'utf8');
 const aStart=src.indexOf('const A=')+8,aEnd=src.indexOf(',S=',aStart);
 const areas=JSON.parse(src.slice(aStart,aEnd));
 const rStart=src.indexOf(',R=')+3,rEnd=src.indexOf(';\nconst TB',rStart);
 const R=JSON.parse(src.slice(rStart,rEnd)),byKey=new Map(R.map(x=>[x[0]+'|'+areas[x[1]],x]));
 const changes={far:0,year:0,units:0,skippedUnits:[],skippedYear:[]};
 for(const a of audit){
  const r=byKey.get(a.k);if(!r)throw Error('raw record missing '+a.k);
  // FAR: Richgo fact always wins when it has a value. Blank must never become 0.
  if(a.far&&a.far>=50&&a.far<=1800){
   if(r[22][0]!==a.far||r[22][1]!=='리치고'){r[22][0]=a.far;r[22][1]='리치고';changes.far++;}
  }
  // Building approval/occupancy year: use Richgo when matched one-to-one.
  if(a.mapYear!==a.year && Math.abs(a.mapYear-a.year)<=3 && !a.integrated){
   r[4]=a.year;changes.year++;
  }else if(a.mapYear!==a.year)changes.skippedYear.push({seq:a.seq,n:a.name,before:a.mapYear,rich:a.year});
  // Unit correction only if not a named block of a larger integrated complex.
  // The existing UNITFIX overrides source when K-apt counts show rentable-vs-all split.
  if(a.mapUnits!==a.units&&!a.integrated){
    r[5]=a.units;changes.units++;
  }else if(a.mapUnits!==a.units)changes.skippedUnits.push({seq:a.seq,n:a.name,before:a.mapUnits,rich:a.units});
 }
 const updated=src.slice(0,rStart)+JSON.stringify(R)+src.slice(rEnd);
 fs.writeFileSync(source,updated);
 fs.writeFileSync(path.join(root,'docs/richgo20-data-differences-20261118.json'),JSON.stringify(changes,null,2)+'\n');
 console.log('RAW DATA RECONCILED',changes.far,changes.year,changes.units,'sourceBytesDelta',Buffer.byteLength(updated)-Buffer.byteLength(src));
}
main().catch(e=>{console.error(e);process.exitCode=1});
