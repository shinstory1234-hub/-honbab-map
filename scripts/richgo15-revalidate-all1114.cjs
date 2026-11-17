'use strict';
/* Independently re-fetch all linked Richgo pages; record source inconsistencies and identity risks */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),at=p=>path.join(root,p);
function parseCSV(s){const rows=[];let r=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){r.push(v);v=''}else if(c==='\n'){r.push(v.replace(/\r$/,''));rows.push(r);r=[];v=''}else v+=c}const h=rows.shift();return rows.filter(r=>r.length===h.length).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
const num=s=>s==null||s===''?null:Number(String(s).replace(/,/g,'').replace(/[^\d.-]/g,''));
const norm=s=>String(s||'').toLowerCase().replace(/[^\uac00-\ud7a30-9a-z]/g,'');
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/ig,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const stages=s=>[...new Set([...String(s||'').matchAll(/(\d{1,2})(차|단지)/g)].map(x=>x[1]+x[2]))];
const prefix='https://m.richgo.ai/realty/danji/',agent='Mozilla/5.0 (compatible; AptMapRecheck/1.0; +https://github.com/shinstory1234-hub/-honbab-map)';
function facts(html,id){if(typeof html!=='string')return {id,error:String(html?.error||'unavailable')};
 const a=html.indexOf('<dl class="facts">');if(a<0)return {id,error:'facts_missing'};
 const f={};for(const m of html.slice(a+18,html.indexOf('</dl>',a)).matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);
 const headings=[...html.slice(Math.max(0,a-500),a).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
 return {id,name:clean(headings.at(-1)?.[1]||'').replace(/\s*단지 정보$/,'').trim(),
 title:clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||''),
 units:num(f.세대수),far:num(f.용적률),year:num((f.입주||'').match(/(?:19|20)\d{2}/)?.[0]),
 floors:f.층수||'',coverage:num(f.건폐율)};
}
async function main(){
 const rows=['docs/richgo-10to15-top300-20261118.csv','docs/richgo-10to15-remaining814-20261118.csv'].flatMap(p=>parseCSV(fs.readFileSync(at(p),'utf8')));
 if(rows.length!==1114||new Set(rows.map(r=>r.name+'|'+r.area)).size!==1114)throw Error('Expected 1114 unique');
 const spec=JSON.parse(fs.readFileSync(at('docs/richgo-10to15-verified-corrections.json'),'utf8'));
 const ids=[...new Set(rows.map(r=>r.richgo_id||r.source_url?.slice(prefix.length)).filter(s=>/^a[A-Za-z0-9]{6}$/.test(s||'')))];
 const map=new Map,groups=new Map;let next=0,requests=0,errors=0,finished=0;
 async function fetchRichgo(id){for(let i=0;i<3;i++){try{requests++;const res=await fetch(prefix+id,{signal:AbortSignal.timeout(16000),headers:{'user-agent':agent}});if(res.ok)return await res.text();if([401,403,429].includes(res.status))throw Error('ACCESS '+res.status);}catch(e){if(i===2){errors++;return {error:String(e)};}}await new Promise(ok=>setTimeout(ok,220+i*350));}errors++;return {error:'HTTP_ERR'};}
 await Promise.all(Array.from({length:8},async()=>{while(next<ids.length){const id=ids[next++],site=facts(await fetchRichgo(id),id);map.set(id,site);finished++;if(finished%100===0)console.log('REVALIDATE_PROGRESS',JSON.stringify({done:finished,total:ids.length,errors}));}}));
 const checks=[];
 for(const r of rows){
  const id=r.richgo_id||r.source_url?.slice(prefix.length),site=map.get(id),key=r.name+'|'+r.area,why=[];
  if(id){const v=groups.get(id)||[];v.push(r);groups.set(id,v);}
  const old={far:num(r.map_far),year:num(r.map_year),units:num(r.map_units)},prior={far:num(r.richgo_far),year:num(r.richgo_year),units:num(r.richgo_units)};
  if(!site||site.error)why.push('DETAIL_UNAVAILABLE');
  else{
   if(!norm(site.title).includes(norm(r.area.split(' ').at(-1))))why.push('NEIGHBORHOOD_MISMATCH');
   for(const f of ['far','year','units'])if(prior[f]!=null&&prior[f]!==site[f])why.push('SITE_'+f.toUpperCase()+'_CHANGED');
   const a=stages(r.name),b=stages(site.name);if(a.length&&b.length&&!a.some(x=>b.includes(x)))why.push('DIFFERENT_BLOCK_OR_PHASE');
   if(old.year&&site.year&&Math.abs(old.year-site.year)>=3)why.push('YEAR_DELTA_3PLUS');
   if(old.units&&site.units&&Math.max(old.units/site.units,site.units/old.units)>=2)why.push('HOUSEHOLDS_RATIO_2PLUS');
   if(norm(r.name)!==norm(site.name)&&!norm(site.name).includes(norm(r.name))&&!norm(r.name).includes(norm(site.name)))why.push('NAME_NOT_SUBSTRING');
  }
  checks.push({seq:+r.seq,name:r.name,area:r.area,siteId:id||'',verification:r.verification,old,prior,site:site||null,
   corrections:Object.fromEntries(['far','year','units'].filter(f=>Object.hasOwn(spec[f],key)).map(f=>[f,spec[f][key]])),reasons:why});
 }
 for(const x of checks){const group=groups.get(x.siteId)||[],direct=group.filter(r=>r.verification==='직접확인');
  if(direct.length>1){x.reasons.push('SHARED_RICHGO_ID_'+direct.length);if(new Set(direct.map(r=>r.map_year)).size>1)x.reasons.push('SHARED_ID_CONFLICTING_YEARS');}
 }
 const risk=checks.filter(x=>x.verification==='직접확인'&&x.reasons.some(t=>['DIFFERENT_BLOCK_OR_PHASE','SHARED_ID_CONFLICTING_YEARS','YEAR_DELTA_3PLUS','NEIGHBORHOOD_MISMATCH','HOUSEHOLDS_RATIO_2PLUS'].includes(t)));
 const count={total:rows.length,uniqueLinkedPages:ids.length,refetched:map.size,requestAttempts:requests,fetchErrors:errors,
  sitesChanged:checks.filter(x=>x.reasons.some(t=>t.startsWith('SITE_'))).length,
  stageConflict:checks.filter(x=>x.reasons.includes('DIFFERENT_BLOCK_OR_PHASE')).length,
  yearConflict:checks.filter(x=>x.reasons.includes('YEAR_DELTA_3PLUS')).length,
  highRiskDirect:risk.length};
 fs.writeFileSync(at('docs/richgo-10to15-revalidate1114-source.json'),JSON.stringify({asOf:'2026-11-18',count,rows:checks},null,2)+'\n');
 fs.writeFileSync(at('docs/richgo-10to15-revalidate1114-risk.json'),JSON.stringify({count,risk},null,2)+'\n');
 console.log('INDEPENDENT_RICHGO_REVALIDATION',JSON.stringify(count));
 console.log('DIFFERENT_PHASE',JSON.stringify(risk.filter(x=>x.reasons.includes('DIFFERENT_BLOCK_OR_PHASE')).map(x=>({seq:x.seq,name:x.name,matched:x.site?.name,reason:x.reasons}))));
}
main().catch(e=>{console.error(e);process.exitCode=1});
