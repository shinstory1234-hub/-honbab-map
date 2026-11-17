/* Completes all 626 unique complexes in the 15-20b raw source. User-directed,
 * public-page apartment matching with name/geo/year/units cross-check.
 * The last 326 contain 247 direct matches, 70 geo-corroborated matches,
 * and 9 source-specific resolutions. Never replace transactional prices.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),restPath=root+'/docs/richgo-15to20-remaining326-audit-20261118.csv';
const geopath=root+'/docs/richgo20-rest-geo-20261118.json',rpath=root+'/docs/richgo20-remaining326-candidates-20261118.json';
const first=JSON.parse(fs.readFileSync(root+'/docs/richgo20-verified-full-20261118.json','utf8'));
const geo=JSON.parse(fs.readFileSync(geopath,'utf8')),prior=JSON.parse(fs.readFileSync(rpath,'utf8'));
function parseCsv(s){let rs=[],row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c}else if(c==='"')q=true;else if(c===','){row.push(v);v=''}else if(c==='\n'){row.push(v.replace(/\r$/,''));rs.push(row);row=[];v=''}else v+=c;}const h=rs.shift().map(x=>x.replace(/^\uFEFF/,''));return {head:h,rows:rs.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))}} 
function csv({head,rows}){const q=x=>{const s=String(x??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};return '\uFEFF'+[head.join(','),...rows.map(r=>head.map(h=>q(r[h])).join(','))].join('\n')+'\n';}
function htext(s){return String(s||'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'').replace(/&#x27;/g,"'").replace(/&amp;/g,'&').trim();}
function n(s){return Number(String(s??'').match(/[\d,]+/)?.[0]?.replace(/,/g,''))||null;}
function parse(html,id){
 const facts=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/);if(!facts)throw Error('no Richgo detail '+id);
 const info={};for(const m of facts[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))info[htext(m[1])]=htext(m[2]);
 const point=html.match(/"latitude":([0-9.]+),"longitude":([0-9.]+)/);
 return {id,name:html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||'',year:n(info['입주']),units:n(info['세대수']),far:n(info['용적률']),
 floors:info['층수']||'',coverage:n(info['건폐율']),parking:n(info['주차']),heating:info['난방']||'',pyeongs:(info['평형']||'').replace(/평/g,'').replace(/·/g,'|'),lat:point?Number(point[1]):null,lng:point?Number(point[2]):null};
}
async function fetchPage(id){for(let attempt=0;attempt<4;attempt++)try{const r=await fetch('https://m.richgo.ai/realty/danji/'+id,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(22000)});if(r.ok)return parse(await r.text(),id);if(r.status===404)throw Error('404 Richgo '+id);}catch(e){if(attempt===3)throw e;await new Promise(resolve=>setTimeout(resolve,1100*(attempt+1)));}throw Error('page unavailable '+id);}
const manual={
 334:'a1iTaOV',447:'a9ncrOA',503:'a4zbqFY',
 505:'a9xRxWV',506:'a9xRxWV',507:'a9xRxWV',
 527:'a5zuQMV',592:'a7jIYjf',593:'a7jIYjf',608:'a7sMjCh'
};
const protectedYears=new Set([334,527]);
const sourceMismatchNotes={
 334:'리모델링 명칭/준공연도: 원본 1984, 리치고 개량후 2024 표기. 연도 유지',
 527:'리모델링/준공연도: 원본 2024, 리치고 기존 1992 표기. 연도 유지',
 447:'리치고 1차 통합 1531세대 중 원본 2단지 565세대. 별도 2차와 구분',
 505:'리치고 그린타운 통합 1774세대에 대우, 럭키, 화성 시공 포함',
 506:'리치고 그린타운 통합 1774세대에 대우, 럭키, 화성 시공 포함',
 507:'리치고 그린타운 통합 1774세대에 대우, 럭키, 화성 시공 포함',
 592:'리치고 탑타워빌 통합단지로 원본 기산 블록 450세대',
 593:'리치고 탑타워빌 통합단지로 원본 쌍용 블록 450세대'
};
async function main(){
 const doc=parseCsv(fs.readFileSync(restPath,'utf8'));assert.equal(doc.rows.length,326);assert.equal(prior.targets,326);assert.equal(geo.count,79);
 const unresolved=new Map(prior.unresolved.map(x=>[Number(x.seq),x]));
 const geos=new Map(geo.rows.map(x=>[Number(x.seq),x]));
 const set=new Map();for(const r of doc.rows)assert.ok(!set.set(Number(r.seq),r).has(-1));
 const special=new Map();
 for(const id of new Set(Object.values(manual)))special.set(id,await fetchPage(id));
 const clean=[];
 for(const row of doc.rows){
   const seq=Number(row.seq),ge=geos.get(seq);let source,method,dist=null,alias='';
   if(manual[seq]){source=special.get(manual[seq]);method='public_page_manual_match';alias=source.name;}
   else if(ge){
     if(!ge.approved||!ge.matched)throw Error('unresolved geo '+seq+' '+row.name);
     source=ge.candidates.find(x=>x.id===ge.matched);if(!source)throw Error('geo missing candidate '+seq);
     method='public_page_geo_match';dist=source.meters;alias=source.name;
   }else{
     // Already directly matched by Richgo name, district, units and year in previous audit.
     if(!String(row.status).startsWith('2026-11-18_'))throw Error('not confirmed stage1 '+seq);
     const id=row.richgo_url.split('/').pop();
     source={id,name:row.richgo_name||row.name,far:n(row.richgo_far),year:n(row.richgo_year),units:n(row.richgo_units),
       floors:row.richgo_floors,coverage:n(row.richgo_coverage_pct),parking:n(row.richgo_parking),heating:row.richgo_heating,pyeongs:row.richgo_pyeongs};
     method='public_page_direct_match';alias=source.name;
   }
   if(!source.id||!source.year||!source.units||!(/^a[A-Za-z0-9]{6}$/).test(source.id))throw Error('invalid matched page '+seq);
   if(protectedYears.has(seq)&&String(row.name)!==source.name)throw Error('renovation name mismatch '+seq);
   const key=row.name+'|'+row.area,year0=Number(row.map_year),units0=Number(row.map_units);
   const fact={seq,name:row.name,area:row.area,k:key,id:source.id,url:'https://m.richgo.ai/realty/danji/'+source.id,richname:source.name,
     far:source.far??null,year:source.year,units:source.units,coverage:source.coverage??null,
     parking:source.parking??null,floors:source.floors||'',heating:source.heating||'',pyeongs:source.pyeongs||'',
     method,sourceGeoMeters:dist,mapYear:year0,mapUnits:units0,kaptUnits:n(row.map_units_kapt),
     yearDiff:source.year-year0,unitsDiff:source.units-units0,extraNote:sourceMismatchNotes[seq]||''};
   clean.push(fact);
 }
 assert.equal(clean.length,326);assert.equal(new Set(clean.map(x=>x.k)).size,326);
 const mergedKeys=new Set([...first.rows.map(x=>x.k),...clean.map(x=>x.k)]);
 assert.equal(mergedKeys.size,626);
 const sourceCounts=new Map();for(const r of [...first.rows,...clean])sourceCounts.set(r.id,(sourceCounts.get(r.id)||0)+1);
 for(const r of clean){
   r.integrated=sourceCounts.get(r.id)>1||[447,503,520,554,619].includes(r.seq)||((Math.abs(r.unitsDiff)/Math.max(1,r.mapUnits)>0.20)&&Math.abs(r.unitsDiff)>100);
   if(r.sourceGeoMeters!=null&&r.sourceGeoMeters>500&&!r.extraNote)throw Error('far-away geo match '+r.seq+' '+r.sourceGeoMeters);
   const row=set.get(r.seq);
   row.richgo_name=r.richname;row.richgo_url=r.url;row.richgo_far=r.far??'';row.richgo_year=r.year;row.richgo_units=r.units;
   row.richgo_floors=r.floors;row.richgo_coverage_pct=r.coverage??'';row.richgo_parking=r.parking??'';
   row.richgo_heating=r.heating;row.richgo_pyeongs=r.pyeongs;row.source_date='2026-11-18';
   row.year_diff=r.yearDiff;row.units_diff=r.unitsDiff;row.far_diff_raw_pp=r.far==null||!row.map_far_raw?'':r.far-Number(row.map_far_raw);
   row.richgo_identity_level=r.method;row.source_distance_m=r.sourceGeoMeters??'';
   row.complex_scope=r.integrated?'통합 단지/세대수 주의':'개별단지';
   row.note=(row.note||'')+' | verified '+r.richname+' '+r.id+(r.extraNote?' | '+r.extraNote:'');
   row.status=r.far==null?'전수조사완료_리치고_용적률공란':'전수조사완료_리치고_직접대조';
 }
 for(const col of ['richgo_name','richgo_identity_level','source_distance_m','complex_scope'])if(!doc.head.includes(col))doc.head.push(col);
 fs.writeFileSync(restPath,csv(doc));
 const S=fs.readFileSync(root+'/public/apt-univ20.js','utf8');
 const aa=JSON.parse(S.slice(S.indexOf('const A=')+8,S.indexOf(',S=')));
 const begin=S.indexOf(',R=')+3,end=S.indexOf(';\nconst TB',begin);
 const R=JSON.parse(S.slice(begin,end)),by=new Map(R.map(x=>[x[0]+'|'+aa[x[1]],x]));
 assert.equal(R.length,626);
 const changed={far:0,year:0,units:0,preservedYear:[],preservedUnits:[],noFAR:[]};
 for(const a of clean){
   const r=by.get(a.k);if(!r)throw Error('no mapped row '+a.k);
   assert.equal(r[3],Number(set.get(a.seq).map_price_manwon),'price must remain original');
   if(a.far!=null){
     if(a.far<50||a.far>1800)throw Error('implausible FAR '+a.k+' '+a.far);
     if(r[22][0]!==a.far || r[22][1]!=='R'){r[22][0]=a.far;r[22][1]='R';changed.far++;}
   }else changed.noFAR.push({seq:a.seq,name:a.name,area:a.area,source:a.url});
   if(a.mapYear!==a.year){
     if(Math.abs(a.yearDiff)<=3&&!protectedYears.has(a.seq)&&!a.integrated){r[4]=a.year;changed.year++;}
     else changed.preservedYear.push({seq:a.seq,name:a.name,map:a.mapYear,rich:a.year,reason:a.extraNote||'통합 단지'});
   }
   if(a.mapUnits!==a.units){
     if(!a.integrated){r[5]=a.units;changed.units++;}
     else changed.preservedUnits.push({seq:a.seq,name:a.name,map:a.mapUnits,rich:a.units});
   }
 }
 const output=S.slice(0,begin)+JSON.stringify(R)+S.slice(end);
 fs.writeFileSync(root+'/public/apt-univ20.js',output);
 const all=[...first.rows,...clean];
 const summary={rawComplexes:626,rankedUnique:554,unrankedUnique:72,first300:300,remaining:326,
   firstFARKnown:first.rows.filter(r=>r.far!=null).length,remainingFARKnown:clean.filter(r=>r.far!=null).length,
   sourceFARBlank:all.filter(r=>r.far==null).map(r=>({seq:r.seq,name:r.name,area:r.area,url:r.url})),
   uniqueRichgoPageIds:new Set(all.map(r=>r.id)).size,
   restMatches:{stage1:clean.filter(r=>r.method==='public_page_direct_match').length,
     geo:clean.filter(r=>r.method==='public_page_geo_match').length,
     manual:clean.filter(r=>r.method==='public_page_manual_match').length},
   changed,rows:all
 };
 fs.writeFileSync(root+'/docs/richgo20-verified-rest326-20261118.json',JSON.stringify({count:326,confirmed:326,changed,rows:clean},null,2)+'\n');
 fs.writeFileSync(root+'/docs/richgo20-verified-all626-20261118.json',JSON.stringify(summary,null,2)+'\n');
 // Prune only superseded entries from 2026-11-16 fallback lookup; current verified
 // raw Richgo values take priority. No build payload budget increases allowed.
 const normalizePath=root+'/public/apt-far-normalize.js',base=fs.readFileSync(normalizePath,'utf8');
 const keyset=new Set(all.filter(r=>r.far!=null).map(r=>r.k));
 const h=k=>{let z=5381;for(let i=0;i<k.length;i++)z=((z*33)^k.charCodeAt(i))>>>0;return z.toString(36).padStart(7,'0')};
 const payloads=[...base.matchAll(/const p='([a-z0-9]+)',m=new Map\(\)/g)],chunksizes=[11,7,10];
 assert.equal(payloads.length,3,'expected 3 legacy lookup tables');
 let next=base,pruned=[0,0,0];
 for(let i=payloads.length-1;i>=0;i--){
   const p=payloads[i],size=chunksizes[i];
   const set=new Set([...keyset].map(k=>i===1?h(k).slice(-4):h(k)));
   const kept=[];for(let x=0;x<p[1].length;x+=size){
     const chunk=p[1].slice(x,x+size),id=chunk.slice(0,i===1?4:7);
     if(set.has(id))pruned[i]++;else kept.push(chunk);
   }
   next=next.slice(0,p.index)+"const p='"+kept.join('')+"',m=new Map()"+next.slice(p.index+p[0].length);
 }
 fs.writeFileSync(normalizePath,next);
 console.log('ALL626',JSON.stringify({total:summary.rawComplexes,verified:all.length,
   farVerified:summary.firstFARKnown+summary.remainingFARKnown,farBlank:summary.sourceFARBlank,
   matches:summary.restMatches,changed,legacyPruned:pruned,
   performanceScriptBytesDelta:Buffer.byteLength(next)-Buffer.byteLength(base),
   rawDataBytesDelta:Buffer.byteLength(output)-Buffer.byteLength(S)},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
