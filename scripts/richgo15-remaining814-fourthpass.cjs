'use strict';
/* Fourth-pass exact Richgo matching: independently named subcomplexes and verified 1988 Ha-gye Hyundai. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),csvPath=path.join(root,'docs/richgo-10to15-remaining814-20261118.csv'),jsonPath=path.join(root,'docs/richgo-10to15-verified-corrections.json');
const specs=[
 [435,'a7rFudH','direct','신동아'],
 [445,'a0lUGCq','direct','현대,우성'],
 [738,'a6AtYvW','direct','대우'],
 [739,'a2tDRsZ','direct','동신'],
 [353,'a4qEeIw','combined','전농삼성'],
 [466,'a5USULw','combined','구파발9단지래미안'],
 [787,'a6PTEyj','combined','아름2단지한성']
];
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/ig,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function readCSV(s){let rows=[],row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c===','){row.push(v);v=''}else if(c==='"')q=true;else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v=''}else v+=c}const h=rows.shift();return {h,rows:rows.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])))}}
const enc=x=>{x=String(x??'');return /[",\r\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};
const num=x=>{if(!x)return null;const n=Number(String(x).replaceAll(',','').replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:null};
async function fetchSite(id){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch('https://m.richgo.ai/realty/danji/'+id,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'Mozilla/5.0 (compatible; AptMapDataAudit/1.0; +https://github.com/shinstory1234-hub/-honbab-map)'}});if(r.ok)return await r.text();if([403,429].includes(r.status))throw Error('Rate-restricted '+r.status);}catch(e){if(attempt===2)throw e}await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}throw Error('Failed Richgo '+id)}
function detail(html,id){
 const a=html.indexOf('<dl class="facts">');if(a<0)throw Error('Richgo facts missing '+id);const s=html.slice(a+18,html.indexOf('</dl>',a)),f={};
 for(const m of s.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const names=[...html.slice(Math.max(0,a-500),a).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];const name=clean(names.at(-1)?.[1]||'').replace(/단지 정보$/,'').trim(),title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const y=Number((f['입주']||'').match(/(?:19|20)\d{2}/)?.[0]||0),u=num(f['세대수']),far=num(f['용적률']);
 if(!name||!title||!y||!u)throw Error('Missing detail required '+id);
 return {id,url:'https://m.richgo.ai/realty/danji/'+id,name,title,year:y,units:u,far,floors:f['층수']||'',coverage:num(f['건폐율']),parking:num((f['주차']||'').split('대')[0]),heating:f['난방']||'',builder:f['시공사']||'',pyeongs:f['평형']||''};
}
async function main(){
 const {h,rows}=readCSV(fs.readFileSync(csvPath,'utf8')),spec=JSON.parse(fs.readFileSync(jsonPath,'utf8'));if(rows.length!==814)throw Error('Expected 814');
 const lookup=new Map;await Promise.all(specs.map(async([seq,id])=>lookup.set(seq,detail(await fetchSite(id),id))));
 const log=[];
 for(const [seq,id,mode,alias] of specs){
  const row=rows.find(x=>+x.seq===seq),f=lookup.get(seq),key=row?.name+'|'+row?.area;
  if(!row||row.verification==='직접확인')throw Error('Invalid target or already matched '+seq);
  const dong=row.area.split(' ').at(-1);
  if(!f.title.includes(dong)||f.year!==+row.map_year||!f.name.replace(/\s+/g,'').includes(alias.replace(/\s+/g,'')))throw Error('Not same verified complex '+seq+' '+f.name+' '+f.title);
  if(mode==='direct'&&seq===435&&(f.units!==960||f.year!==1993))throw Error('Invalid group 435');
  if(mode==='direct'&&seq===445&&(f.units!==1320||f.year!==1988))throw Error('Invalid correct Hyundai vs another');
  if(mode==='direct'&&(seq===738||seq===739)&&!(f.units===492&&row.map_units==='984'))throw Error('Split population must sum 984 '+seq);
  Object.assign(row,{richgo_name:f.name,richgo_id:id,richgo_year:String(f.year),richgo_units:String(f.units),richgo_far:f.far==null?'':String(f.far),
   richgo_floors:f.floors,richgo_coverage:f.coverage==null?'':String(f.coverage),richgo_parking:f.parking==null?'':String(f.parking),richgo_heating:f.heating,
   richgo_builder:f.builder,richgo_pyeongs:f.pyeongs,source_url:f.url,checked_at:'2026-11-18',
   evidence:'리치고 동일 단지 실명 및 지역·준공연도·관리단지 분할 검증',audit_discovery:'fourth_pass_source_identity_check'});
  const changes=[];
  if(mode==='direct'){
   row.verification='직접확인';
   for(const field of ['far','year','units']){
    const val=f[field];if(val==null||field==='far'&&(val<50||val>1500))continue;
    if(Number(row['map_'+field]||0)!==val){spec[field][key]=val;changes.push(field);}
   }
   row.action=changes.length?'변경':'동일';
   row.notes='리치고 실명 확인 '+f.name+', '+f.units+'세대, '+f.year+'년. 이전 분할·합산 오류 교정 '+(changes.join(',')||'없음')+' '+f.url;
  }else{
   row.verification='집계단위불일치';row.action='집계단위확인';
   row.notes='같은 지역·준공의 리치고 후보 '+f.name+' '+f.units+'세대와 아파트맵 '+row.map_units+'세대가 다른 집계 단위여서 값 복사 보류. '+f.url;
   for(const field of ['far','year','units'])delete spec[field][key];
  }
  log.push({seq,name:row.name,area:row.area,classification:mode,site:f,changes});
 }
 fs.writeFileSync(csvPath,h.join(',')+'\n'+rows.map(r=>h.map(k=>enc(r[k])).join(',')).join('\n')+'\n');
 fs.writeFileSync(jsonPath,JSON.stringify(spec,null,2)+'\n');
 const summary={total:814,verified:rows.filter(x=>x.verification==='직접확인').length,aggregate:rows.filter(x=>x.verification==='집계단위불일치').length,
  unidentified:rows.filter(x=>x.verification==='리치고후보불일치'||x.verification==='리치고단지미확인').length,
  far:Object.keys(spec.far).length,year:Object.keys(spec.year).length,units:Object.keys(spec.units).length};
 fs.writeFileSync(path.join(root,'docs/richgo-10to15-remaining814-fourthpass-evidence.json'),JSON.stringify({summary,entries:log},null,2)+'\n');
 console.log('FOURTH_PASS_814',JSON.stringify(summary));
}
main().catch(e=>{console.error(e);process.exitCode=1});
