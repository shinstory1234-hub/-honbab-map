'use strict';
/* Correct Richgo aliases where verified neighborhood, stage/block code, year and physical complex coincide. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const csvPath=path.join(root,'docs/richgo-10to15-remaining814-20261118.csv'),specPath=path.join(root,'docs/richgo-10to15-verified-corrections.json');
const proof=[
 [330,'a0BWwsg','direct','호반써밋자양'],
 [467,'a6fZaNq','direct','마고정11단지'],
 [468,'a3YowZk','direct','마고정3단지'],
 [469,'a9ScTbN','direct','마고정2단지'],
 [473,'a6wJeBo','direct','상림1단지롯데캐슬'],
 [475,'a2azqhU','direct','우물골7단지'],
 [476,'a7XASvX','direct','우물골6단지'],
 [1032,'a5sCUud','direct','대지마을3차2단지현대홈타운'],
 [789,'a4zbqFY','direct','정든한진8차'],
 [1063,'a0KvURQ','combined','메타폴리스']
];
function parse(s){const all=[];let row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c}else if(c==='"')q=true;else if(c===','){row.push(v);v=''}else if(c==='\n'){row.push(v.replace(/\r$/,''));all.push(row);row=[];v=''}else v+=c}const head=all.shift();return {head,rows:all.filter(x=>x.length===head.length).map(x=>Object.fromEntries(head.map((k,i)=>[k,x[i]])))}}
const esc=s=>{s=String(s??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/ig,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const number=s=>{if(!s)return null;let n=Number(String(s).replaceAll(',','').replace(/[^\d.-]/g,''));return Number.isFinite(n)?n:null};
const normalize=s=>String(s||'').replace(/[\s()（）·,]/g,'').toLowerCase();
const agent='Mozilla/5.0 (compatible; AptMapDataAudit/1.0; +https://github.com/shinstory1234-hub/-honbab-map)';
async function fetchText(id){const u='https://m.richgo.ai/realty/danji/'+id;for(let i=0;i<3;i++){try{const res=await fetch(u,{signal:AbortSignal.timeout(18000),headers:{'user-agent':agent}});if(res.ok)return await res.text();if([401,403,429].includes(res.status))throw Error('Rate limit '+res.status);}catch(e){if(i===2)throw e;}await new Promise(done=>setTimeout(done,450+i*350))}throw Error('Unreachable '+u)}
function facts(html,id){const x=html.indexOf('<dl class="facts">');if(x<0)throw Error('Missing Richgo fact section '+id);const map={};for(const m of html.slice(x+18,html.indexOf('</dl>',x)).matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))map[clean(m[1])]=clean(m[2]);
 const hs=[...html.slice(Math.max(0,x-500),x).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)],name=clean(hs.at(-1)?.[1]||'').replace(/단지 정보$/,'').trim(),title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||'');
 const year=Number(map['입주']?.match(/(?:19|20)\d{2}/)?.[0]||0),units=number(map['세대수']),far=number(map['용적률']);
 if(!year||!units||!name||!title)throw Error('Missing Richgo essential facts '+id);
 return {name,title,year,units,far,id,url:'https://m.richgo.ai/realty/danji/'+id,
 floors:map['층수']||'',coverage:number(map['건폐율']),parking:number((map['주차']||'').split('대')[0]),heating:map['난방']||'',builder:map['시공사']||'',pyeongs:map['평형']||''};
}
async function main(){
 const {head,rows}=parse(fs.readFileSync(csvPath,'utf8')),spec=JSON.parse(fs.readFileSync(specPath,'utf8'));if(rows.length!==814)throw Error('Invalid 814 row count');
 const ids=[...new Set(proof.map(x=>x[1]))],cache=new Map;let idx=0;
 await Promise.all(Array.from({length:5},async()=>{while(idx<ids.length){const id=ids[idx++];cache.set(id,facts(await fetchText(id),id))}}));
 const evidence=[];
 for(const [seq,id,kind,expected] of proof){
  const r=rows.find(x=>Number(x.seq)===seq);if(!r||r.verification==='직접확인')throw Error('Already direct verified '+seq);
  const f=cache.get(id),key=r.name+'|'+r.area,dong=r.area.split(' ').at(-1);
  if(!f.title.includes(dong))throw Error('Different legal neighborhood: '+seq+' '+f.title);
  if(f.year!==Number(r.map_year))throw Error('Different completion year: '+seq+' '+f.year+'/'+r.map_year);
  if(!normalize(f.name).includes(normalize(expected)))throw Error('Expected Richgo alias mismatch '+seq+' '+f.name+'/'+expected);
  const ratio=Math.max(f.units/Number(r.map_units),Number(r.map_units)/f.units);
  if(kind==='direct'&&ratio>1.3)throw Error('Large difference prevents direct identity '+seq);
  if(kind==='combined'&&ratio<=1.5)throw Error('Combined classification needs meaningful count difference '+seq);
  Object.assign(r,{richgo_name:f.name,richgo_id:f.id,richgo_year:String(f.year),richgo_units:String(f.units),richgo_far:f.far==null?'':String(f.far),
   richgo_floors:f.floors,richgo_coverage:f.coverage==null?'':String(f.coverage),richgo_parking:f.parking==null?'':String(f.parking),
   richgo_heating:f.heating,richgo_builder:f.builder,richgo_pyeongs:f.pyeongs,
   source_url:f.url,checked_at:'2026-11-18',audit_discovery:'block_id_manual_public_Richgo_details'});
  const changed=[];
  if(kind==='direct'){
   r.verification='직접확인';
   const vals={far:f.far,year:f.year,units:f.units};
   for(const field of Object.keys(vals)){const v=vals[field];if(v==null||field==='far'&&(v<50||v>1500))continue;
     if(Number(r['map_'+field]||0)!==v){spec[field][key]=v;changed.push(field)}
   }
   r.action=changed.length?'변경':'동일';r.evidence='리치고 공개 단지 상세: 법정동·준공연도·단지 별칭 및 블록번호 교차대조';
   r.notes='정확한 리치고 단지 찾음: '+f.name+' '+f.units+'세대, 준공 '+f.year+'년. 기존 '+r.map_units+'세대. 변경: '+(changed.join(',')||'없음')+'. '+f.url;
  }else{
   r.verification='집계단위불일치';r.action='집계단위확인';
   r.notes='리치고 '+f.name+'는 '+f.units+'세대이나 원본 '+r.name+' '+r.map_units+'세대와 집계 차이. 동일 단지라도 집계 단위 판별 전 개별값 덮지 않음. '+f.url;
   for(const field of ['far','year','units'])delete spec[field][key];
  }
  evidence.push({seq,name:r.name,area:r.area,method:kind,richgo:f,changed,originalUnits:Number(r.map_units)});
 }
 fs.writeFileSync(csvPath,head.join(',')+'\n'+rows.map(x=>head.map(k=>esc(x[k])).join(',')).join('\n')+'\n');
 fs.writeFileSync(specPath,JSON.stringify(spec,null,2)+'\n');
 const stats={total:rows.length,verified:rows.filter(x=>x.verification==='직접확인').length,
  aggregate:rows.filter(x=>x.verification==='집계단위불일치').length,
  unidentified:rows.filter(x=>x.verification==='리치고후보불일치'||x.verification==='리치고단지미확인').length,
  farCorrections:Object.keys(spec.far).length,yearCorrections:Object.keys(spec.year).length,unitCorrections:Object.keys(spec.units).length};
 fs.writeFileSync(path.join(root,'docs/richgo-10to15-remaining814-thirdpass-evidence.json'),JSON.stringify({stats,items:evidence},null,2)+'\n');
 console.log('THIRD_PASS_814',JSON.stringify(stats));
}
main().catch(err=>{console.error(err);process.exitCode=1});
