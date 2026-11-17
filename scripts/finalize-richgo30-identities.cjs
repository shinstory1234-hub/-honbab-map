/* Curated last-mile identity resolution, with explicit independent source evidence.
 * Existing 251 confirmed rows remain intact. No unchecked value is written to the map.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const doc=JSON.parse(fs.readFileSync(root+'/docs/richgo30-resolved-20261118.json','utf8'));
const rows=doc.rows;
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const n=s=>{const m=String(s||'').match(/[\d,]+/);return m?Number(m[0].replace(/,/g,'')):null};
const norm=s=>String(s||'').toLowerCase().replace(/아파트|단지|주상복합/g,'').replace(/[^가-힣a-z0-9]/g,'');
const dist=(a,b)=>a.lat&&a.lng&&b.lat&&b.lng?Math.round(Math.hypot((a.lat-b.lat)*111100,(a.lng-b.lng)*111100*Math.cos(a.lat*Math.PI/180))):null;
const fixes=[
 [26,'a3KxKuI','옥수파크힐스 1~16동 통합',true],
 [27,'a3KxKuI','옥수파크힐스 17~25동 통합',true],
 [35,'a2nPFBj','광장 현대8단지 부분 블록',true],
 [63,'a2ghzUo','목동한신청구 역순 표기',false],
 [89,'a8TEIry','방배래미안아트힐 역순 표기',false],
 [90,'a1uHXaN','방배현대1차 개별 단지명 별칭',false],
 [93,'a5YsLrc','삼호4차=방배신삼호; 리치고 재건축사업 r3raNkK 동일 단지',false],
 [107,'a4jUpCZ','우면동 대림 동명이인 분리',false],
 [125,'a9qMtUf','역삼럭키=도곡동 럭키(963)',false],
 [127,'a5pqmuN','아카데미스위트 1단지 표기',false],
 [129,'a0ckFyC','개포한신=한신(개포)',false],
 [130,'a7SLCFG','도곡한신=한신엠비씨',false],
 [198,'a4WLcCX','백현8단지 e편한세상 명칭',false],
 [202,'a5bpJTY','봇들7단지 엔파트 명칭',false],
 [212,'a4suMIg','상록라이프 통합 750세대 부분',true],
 [231,'a2hzIsC','분당 시범 삼성한신 통합 단지 이름',true],
 [232,'a2hzIsC','분당 시범 삼성한신 통합 단지 이름',true],
 [233,'a0iVqsU','상록우성 정식 단지명 별칭',false],
 [254,'a4CROLe','논현신동아=신동아(22)',false],
 [272,'a7TXBrD','분당 아이파크 통합 1071세대 내 동별 기록',true],
];
let fetched=0;
async function detail(id){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch('https://m.richgo.ai/realty/danji/'+id,{headers:{'User-Agent':'ChatGPT-User','Accept':'text/html'},signal:AbortSignal.timeout(19000)});
 if(r.ok){fetched++;const html=await r.text(),s=html.match(/<dl class="facts">([\s\S]*?)<\/dl>/),f={};if(s)for(const v of s[1].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(v[1])]=clean(v[2]);const p=html.match(/"latitude":([0-9.]+),"longitude":([0-9.]+)/);
 return {id,name:clean(html.match(/<meta name="keywords" content="([^,]+),/)?.[1]||''),year:n(f['입주']),units:n(f['세대수']),far:n(f['용적률']),coverage:n(f['건폐율']),parking:n(f['주차']),floor:f['층수']||'',heating:f['난방']||'',builder:f['시공사']||'',pyeongs:f['평형']||'',lat:p?Number(p[1]):null,lng:p?Number(p[2]):null};}
 }catch(e){}await new Promise(done=>setTimeout(done,700*(attempt+1)))}return null;}
async function named(q){try{const r=await fetch('https://m.richgo.ai/api/mcp',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:11,method:'tools/call',params:{name:'search_apartments',arguments:{query:q}}}),signal:AbortSignal.timeout(22000)});if(!r.ok)return [];const j=await r.json(),v=j.result?.structuredContent||{};return (v.results||[]).map(x=>x.danji_id).filter(x=>/^a[A-Za-z0-9]{6}$/.test(x));}catch(e){return []}}
const memo=new Map();
const lookup=async id=>{if(!memo.has(id))memo.set(id,await detail(id));return memo.get(id)};
async function main(){
 const added=[],failed=[];
 async function approve(row,id,rule,integrated,opts={}){
  if(row.status==='direct_verified')return;
  const src=await lookup(id);if(!src||!src.year||!src.units||!src.lat){failed.push({seq:row.seq,id,reason:'source facts missing'});return}
  const meter=dist(row.map,src),yearDiff=Math.abs(row.map.year-src.year),unitsRatio=Math.abs(row.map.units-src.units)/Math.max(row.map.units,src.units);
  const name=norm(src.name),region=row.area.split(' ').at(-1);
  const maxDist=integrated?430:170;
  let accepted=meter!=null&&meter<=maxDist&&yearDiff<=2;
  if(!integrated&&unitsRatio>.10)accepted=false;
  if(integrated&&row.seq===26||integrated&&row.seq===27){
    const both=rows.find(x=>x.seq===(row.seq===26?27:26));
    accepted=accepted&&row.map.units+both.map.units===src.units&&name.includes('옥수');
  }
  if(row.seq===35)accepted=accepted&&name.includes('현대8');
  if([231,232].includes(row.seq))accepted=accepted&&unitsRatio<.01&&(name.includes('삼성')||name.includes('한신'));
  if(row.seq===272)accepted=accepted&&name.includes('아이파크');
  // require name overlap for non-geo-exact aliases, except exact units/year/near.
  if(meter>45&&unitsRatio>=.04&&!integrated&& !norm(row.name).includes(name)&&!name.includes(norm(row.name)))accepted=false;
  if(!accepted){failed.push({seq:row.seq,id,name:src.name,units:src.units,year:src.year,distance:meter,unitRatio:unitsRatio,reason:'identity guard'});return}
  row.status='direct_verified';row.richgo={...src,url:'https://m.richgo.ai/realty/danji/'+id};
  row.match={method:'curated_legacy_alias_verified_by_public_geo',distance_m:meter,yearDiff:src.year-row.map.year,unitRatio:unitsRatio,sourceId:id,rule};
  row.integrated=integrated||unitsRatio>.20;
  added.push({seq:row.seq,key:row.key,id,far:src.far,distance:meter,units:src.units,year:src.year,rule});
 }
 for(const [seq,id,rule,integrated] of fixes){
  const row=rows.find(x=>x.seq===seq);
  if(!row)throw Error('missing '+seq);
  await approve(row,id,rule,integrated);
 }
 const missing=[
 {seq:24,queries:['성수동 현대아이파크','성수 현대I-PARK','성수동2가 아이파크','성수동 현대']},
 {seq:93,queries:['방배신삼호','신삼호','방배동 신삼호']},
 {seq:273,queries:['공덕삼성래미안3차','공덕 삼성래미안3차','공덕 래미안3차']},
 ];
 let mcpCount=0;
 for(const spec of missing){
  const row=rows.find(x=>x.seq===spec.seq);
  const ids=new Set();
  for(const q of spec.queries){mcpCount++;for(const id of await named(q))ids.add(id);if(ids.size>=10)break}
  const candidates=[];
  for(const id of ids){const src=await lookup(id);if(!src?.year||!src?.units)continue;const meter=dist(row.map,src),ratio=Math.abs(src.units-row.map.units)/Math.max(src.units,row.map.units),yearDiff=Math.abs(src.year-row.map.year);
   candidates.push({id,src,meter,ratio,yearDiff,score:((meter??9999)<100?50:0)+(ratio<.02?40:0)+(yearDiff<=2?30:0)});
  }
  candidates.sort((a,b)=>b.score-a.score);
  const match=candidates.find(x=>x.meter!=null&&x.meter<=160&&x.yearDiff<=2&&x.ratio<=.05);
  if(match)await approve(row,match.id,'official MCP named result with geo/year/units verified',false);
  else failed.push({seq:row.seq,reason:'no identically sourced Richgo detail',candidates:candidates.slice(0,5).map(x=>({id:x.id,name:x.src.name,meters:x.meter,yearDiff:x.yearDiff,unitsRatio:x.ratio}))});
 }
 const total=rows.filter(x=>x.status==='direct_verified').length,far=rows.filter(x=>x.status==='direct_verified'&&x.richgo?.far!=null).length;
 const report={metadata:{target:273,verified:total,farVerified:far,farBlank:total-far,remaining:273-total,lastPassAdded:added.length,sourcePages:fetched,officialMcpQueries:mcpCount},added,failed,
 rows};
 fs.writeFileSync(root+'/docs/richgo30-final-20261118.json',JSON.stringify(report,null,2)+'\n');
 console.log('FINAL_273',JSON.stringify(report.metadata));
 console.log('REMAINING',JSON.stringify(rows.filter(x=>x.status!=='direct_verified').map(x=>({seq:x.seq,name:x.name,area:x.area}))));
 console.log('FAILURES',JSON.stringify(failed));
}
main().catch(e=>{console.error('FINALIZE_ERROR',e.stack||String(e));process.exitCode=1});
