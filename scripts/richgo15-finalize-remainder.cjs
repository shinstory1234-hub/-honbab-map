'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),p=part=>path.join(root,part);
const C='docs/richgo-10to15-top300-20261118.csv',J='docs/richgo-10to15-verified-corrections.json';
const rules=[
[2,'a2onybk','combined'],[3,'a2onybk','combined'],[4,'a4YlOBx','combined'],[15,'a5yIHnd','combined'],
[17,'a6EBVDi','direct'],[18,'a6EBVDi','combined'],[19,'a2tiFHI','direct'],[25,'a1Iqbuh','combined'],
[33,'a4QtqUW','direct'],[54,'a0dfOyV','combined'],[59,'a9rGwDA','direct'],[63,'a3poZOb','combined'],
[73,'a0dfOyV','combined'],[83,'a8yTkte','combined'],[96,'a1qAnuP','direct'],[122,'a9YfvrV','direct'],
[128,'a0TxnAu','combined'],[139,'a3oKyNG','direct'],[141,'a9exVnA','combined'],[166,'a5QUUYV','direct'],
[174,'a9xRxWV','combined'],[175,'a9xRxWV','combined'],[176,'a9xRxWV','combined'],[177,'a9xRxWV','combined'],
[183,'a1cQIXZ','direct'],[191,'a4CROLe','direct'],[212,'a9uWCTL','direct'],[214,'a0KwfOa','direct'],
[282,'a3MLtkM','combined'],[297,'a1hIszJ','direct']
];
function parseCSV(s){let tab=[],row=[],v='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];
 if(quoted){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')quoted=false;else v+=c;}
 else if(c==='"')quoted=true;else if(c===','){row.push(v);v='';}
 else if(c==='\n'){row.push(v.replace(/\r$/,''));tab.push(row);row=[];v='';}
 else v+=c;
}const header=tab.shift();return {header,rows:tab.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((k,j)=>[k,r[j]])))};}
const esc=v=>{v=String(v??'');return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const num=v=>{if(v==null||String(v).trim()==='')return null;return Number(String(v).replaceAll(',','').replace(/[^\d.-]/g,''))};
const clean=s=>String(s??'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/ig,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const agent='Mozilla/5.0 (compatible; AptMapDataAudit/1.0; +https://github.com/shinstory1234-hub/-honbab-map)';
async function fetchText(id){
 const url='https://m.richgo.ai/realty/danji/'+id;
 for(let i=0;i<3;i++){try{
  const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'user-agent':agent,'accept-language':'ko-KR,ko;q=0.9'}});
  if(r.ok)return await r.text();
  if(r.status===403||r.status===429)throw Error('Richgo rate or access restricted: '+r.status);
 }catch(e){if(i===2)throw e}
 await new Promise(resolve=>setTimeout(resolve,350*(i+1)));
 }throw Error('Richgo fetch failed: '+url);
}
function getFacts(html,id){
 const at=html.indexOf('<dl class="facts">');
 if(at<0)throw Error('No facts section '+id);
 const facts={},s=html.slice(at+18,html.indexOf('</dl>',at));
 for(const m of s.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))facts[clean(m[1])]=clean(m[2]);
 const head=html.slice(Math.max(0,at-500),at),hs=[...head.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
 const name=clean(hs.at(-1)?.[1]||'').replace(/단지 정보$/,'');
 const title=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||'');
 const year=Number((facts['입주']||'').match(/(?:19|20)\d{2}/)?.[0]||0);
 const units=num(facts.세대수),far=num(facts.용적률);
 if(!name||!year||!units||far==null)throw Error('Bad Richgo page '+id+' '+JSON.stringify(facts));
 const prices={};
 const pos=html.indexOf('평형별 시세',at),section=pos<0?'':html.slice(pos,html.indexOf('</table>',pos)+8);
 for(const tr of section.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
  const cols=[...tr[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/g)].map(x=>clean(x[1])),py=parseInt(cols[0],10);
  if(py>0&&cols.length>=3)prices[py]=[cols[1],cols[2]];
 }
 return {id,url:'https://m.richgo.ai/realty/danji/'+id,name,title,year,units,far,coverage:num(facts.건폐율),parking:num((facts.주차||'').split('대')[0]),floors:facts.층수||'',heating:facts.난방||'',builder:facts.시공사||'',pyeongs:facts.평형||'',prices};
}
async function main(){
 const {header,rows}=parseCSV(fs.readFileSync(p(C),'utf8')),spec=JSON.parse(fs.readFileSync(p(J),'utf8'));
 if(rows.length!==300||rules.length!==30)throw Error('Not the approved 300/30 inventory');
 const unresolved=rows.filter(x=>x.verification!=='직접확인');
 if(unresolved.length!==30)throw Error('Unexpected unresolved count: '+unresolved.length);
 for(const [seq] of rules)if(!unresolved.some(x=>Number(x.seq)===seq))throw Error('Target row missing '+seq);
 const unique=[...new Set(rules.map(x=>x[1]))],facts=new Map();let i=0;
 await Promise.all(Array.from({length:5},async()=>{while(i<unique.length){const id=unique[i++];facts.set(id,getFacts(await fetchText(id),id));}}));
 const result=[];
 for(const [seq,id,mode] of rules){
  const row=rows.find(x=>Number(x.seq)===seq),site=facts.get(id),dong=row.area.split(' ').at(-1);
  if(!site.title.includes(dong))throw Error('Dong mismatch '+seq+' '+site.title);
  if(mode==='direct'&&Number(row.map_year)!==site.year)throw Error('Year mismatch for '+seq+' '+row.name);
  const key=row.name+'|'+row.area,changes=[],samePy=site.prices[Number(row.py)];
  Object.assign(row,{richgo_name:site.name,richgo_id:id,richgo_year:String(site.year),richgo_units:String(site.units),
   richgo_far:String(site.far),richgo_floors:site.floors,richgo_coverage:site.coverage==null?'':String(site.coverage),
   richgo_parking:site.parking==null?'':String(site.parking),richgo_heating:site.heating,richgo_builder:site.builder,
   richgo_pyeongs:site.pyeongs,source_url:site.url,checked_at:'2026-11-18',
   audit_discovery:'richgo_public_detail_manual_identity',evidence:'리치고 공개 상세 원문·단지 집계단위 검증'});
  if(samePy){row.richgo_same_py_sale=samePy[0];row.richgo_same_py_jeonse=samePy[1];}
  if(mode==='direct'){
   row.verification='직접확인';
   for(const field of ['far','year','units'])if(Number(row['map_'+field]||0)!==site[field]){spec[field][key]=site[field];changes.push(field);}
   row.action=changes.length?'변경':'동일';
   row.notes='동일 단지 직접 대조: '+site.name+', '+site.units+'세대. 기존 '+row.map_units+'세대. 교정: '+(changes.join(', ')||'없음');
  }else{
   row.verification='집계단위불일치';
   row.action='집계단위확인';
   row.notes='리치고 직접확인: '+site.name+' '+site.units+'세대(용적률 '+site.far+'%). 아파트맵 '+row.name+' '+row.map_units+'세대. 통합단지·개별단지의 집계가 달라 동일 값으로 간주하여 원자료를 덮어쓰지 않음. '+site.url;
  }
  result.push({seq,name:row.name,area:row.area,mode,old:{units:row.map_units,year:row.map_year,far:row.map_far},richgo:site,changes});
 }
 for(const field of ['far','year','units'])for(const [key,value] of Object.entries(spec[field]||{})){
  const r=rows.find(x=>x.name+'|'+x.area===key);
  if(!r||r.verification!=='직접확인'||Number(r['richgo_'+field])!==Number(value))throw Error('Correction source parity '+field+' '+key);
 }
 fs.writeFileSync(p(C),header.join(',')+'\n'+rows.map(r=>header.map(k=>esc(r[k])).join(',')).join('\n')+'\n');
 fs.writeFileSync(p(J),JSON.stringify(spec,null,2)+'\n');
 const summary={date:'2026-11-18',checked:300,direct:rows.filter(x=>x.verification==='직접확인').length,aggregateExceptions:rows.filter(x=>x.verification==='집계단위불일치').length,far:Object.keys(spec.far).length,year:Object.keys(spec.year).length,units:Object.keys(spec.units).length};
 fs.writeFileSync(p('docs/richgo-10to15-remaining-final-evidence.json'),JSON.stringify({summary,items:result},null,2)+'\n');
 const status=JSON.parse(fs.readFileSync(p('docs/richgo-10to15-crawl-status.json'),'utf8'));
 fs.writeFileSync(p('docs/richgo-10to15-crawl-status.json'),JSON.stringify({...status,finalReview:summary,remainingUnreviewed:0},null,2)+'\n');
 console.log('RICHGO300_FINAL',JSON.stringify(summary));
}
main().catch(e=>{console.error(e);process.exitCode=1});
