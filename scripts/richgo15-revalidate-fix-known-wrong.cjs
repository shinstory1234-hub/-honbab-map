'use strict';
/** Correct independently disproved Richgo matches using 4 verified replacement pages.
 * Keep remodeling completion year distinct from original building year.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),at=p=>path.join(root,p);
const files=['docs/richgo-10to15-top300-20261118.csv','docs/richgo-10to15-remaining814-20261118.csv'];
const specFile='docs/richgo-10to15-verified-corrections.json';
function parse(s){const table=[];let r=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){r.push(v);v=''}else if(c==='\n'){r.push(v.replace(/\r$/,''));table.push(r);r=[];v=''}else v+=c}const h=table.shift();return {h,rows:table.filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,j)=>[k,x[j]])))};}
const enc=s=>{s=String(s??'');return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/&#x([0-9a-f]+);/ig,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const num=s=>s==null||s===''?null:Number(String(s).replace(/,/g,'').replace(/[^\d.-]/g,''));
const replacement=[
 {seq:279,id:'a6rNDte',units:1743,year:2016,token:'골드파크1차'},
 {seq:462,id:'a3YPzVc',units:963,year:2018,token:'백련산4차'},
 {seq:927,id:'a4FYnXO',units:958,year:2019,token:'해링턴플레이스1단지'},
 {seq:1110,id:'a1wiFrS',units:913,year:2015,token:'동탄역신안인스빌리베라'}
];
const source='https://m.richgo.ai/realty/danji/';
async function readSite(id){let out='';for(let i=0;i<3;i++){try{const r=await fetch(source+id,{headers:{'user-agent':'Mozilla/5.0 (compatible; AptMapRecheck/1.0; +https://github.com/shinstory1234-hub/-honbab-map)'},signal:AbortSignal.timeout(15000)});if(r.ok){out=await r.text();break;}if([403,429].includes(r.status))throw Error('Richgo access '+r.status);}catch(e){if(i===2)throw e;}await new Promise(resolve=>setTimeout(resolve,400+300*i));}if(!out)throw Error('No response '+id);const a=out.indexOf('<dl class="facts">');if(a<0)throw Error('Richgo facts missing '+id);const f={};for(const m of out.slice(a+18,out.indexOf('</dl>',a)).matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g))f[clean(m[1])]=clean(m[2]);const head=[...out.slice(Math.max(0,a-500),a).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];return {name:clean(head.at(-1)?.[1]||'').replace(/\s*단지 정보$/,'').trim(),title:clean(out.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]||''),year:num(f.입주?.match(/(?:19|20)\d{2}/)?.[0]),units:num(f.세대수),far:num(f.용적률),floors:f.층수||'',coverage:num(f.건폐율),parking:num((f.주차||'').split('대')[0]),heating:f.난방||'',builder:f.시공사||'',pyeongs:f.평형||''};}
async function main(){
 const original=files.map(f=>parse(fs.readFileSync(at(f),'utf8'))),all=original.flatMap(x=>x.rows),spec=JSON.parse(fs.readFileSync(at(specFile),'utf8'));
 if(all.length!==1114)throw Error('Unexpected inventory length');
 const sites=new Map;await Promise.all(replacement.map(async x=>{sites.set(x.id,await readSite(x.id))}));
 const proof=[];
 for(const item of replacement){
  const r=all.find(r=>+r.seq===item.seq),site=sites.get(item.id);
  if(!r||r.verification!=='직접확인')throw Error('Unexpected existing state '+item.seq);
  if(site.year!==item.year||site.units!==item.units||!site.name.replace(/\s/g,'').includes(item.token)||!site.title.includes(r.area.split(' ').at(-1)))
    throw Error('Replacement page failed identity proof '+item.seq+' '+JSON.stringify(site));
  const key=r.name+'|'+r.area,before={name:r.richgo_name,id:r.richgo_id,year:r.richgo_year,units:r.richgo_units,far:r.richgo_far};
  for(const field of ['far','year','units'])delete spec[field][key];
  Object.assign(r,{richgo_name:site.name,richgo_id:item.id,richgo_year:String(site.year),richgo_units:String(site.units),richgo_far:site.far==null?'':String(site.far),
   richgo_floors:site.floors,richgo_coverage:site.coverage==null?'':String(site.coverage),richgo_parking:site.parking==null?'':String(site.parking),
   richgo_heating:site.heating,richgo_builder:site.builder,richgo_pyeongs:site.pyeongs,source_url:source+item.id,
   evidence:'2026-11-18 직접 재조회, 법정동·단지명·준공연도·세대수 4중 검증',audit_discovery:'independent_specific_entity_replacement',verification:'직접확인'});
  const changed=[];for(const f of ['far','year','units']){const v=site[f],old=num(r['map_'+f]);if(v!=null&&v!==old&&f==='far'&&(v<50||v>1500))throw Error('Invalid FAR '+item.seq);if(v!=null&&v!==old){spec[f][key]=v;changed.push(f);}}
  r.action=changed.length?'변경':'동일';r.notes='동일 법정동의 다른 차수로 잘못 연결된 기존 페이지 '+before.id+'를 '+item.id+'로 수정. 재확인 결과 '+site.name+' '+site.units+'세대, 입주 '+site.year+'년, 용적률 '+(site.far??'미기재')+'%. '+source+item.id;
  proof.push({seq:item.seq,name:r.name,area:r.area,previous:before,verified:{id:item.id,values:site},changes:changed});
 }
 // K-apt has the 5th complex: 2011, 407 homes; Richgo prior candidate is 4th block (2010, 730 homes).
 const wrong=all.find(r=>+r.seq===845);if(!wrong||!wrong.richgo_name?.includes('4단지')||+wrong.map_units!==407||+wrong.map_year!==2011)throw Error('Wrong-complex evidence no longer matches');
 const key=wrong.name+'|'+wrong.area,old={id:wrong.richgo_id,name:wrong.richgo_name,year:wrong.richgo_year,units:wrong.richgo_units,far:wrong.richgo_far};
 for(const f of ['far','year','units'])delete spec[f][key];
 Object.assign(wrong,{verification:'리치고후보불일치',action:'원본유지',richgo_id:'',richgo_name:'',richgo_year:'',richgo_units:'',richgo_far:'',source_url:'',evidence:'K-apt/국토부 건축물대장: 광명역세권휴먼시아5단지 407세대 2011년; 기존 리치고 후보는 4단지',audit_discovery:'independent_wrong_building_rejected'});
 wrong.notes='기존 자료가 광명역세권휴먼시아4단지 '+old.units+'세대 '+old.year+'년이므로 5단지 407세대 2011년과 서로 다름. 잘못된 리치고 후보 적용 취소. https://statnorth.kr/apt/경기/광명시/소하동-광명역세권휴먼시아5단지-e414d7ee67d4';
 proof.push({seq:845,name:wrong.name,area:wrong.area,previous:old,decision:'wrong 4th stage rejected; original preserved'});
 // Distinguish original 1992 construction from 2024 remodeling; ranking measures current refurbishment.
 const re=all.find(r=>+r.seq===642);if(!re||re.map_year!=='2024'||re.richgo_year!=='1992')throw Error('Remodel verification changed');
 delete spec.year[re.name+'|'+re.area];re.notes='리치고의 1992년은 오금아남 최초 준공연도이고, 2024년은 송파더플래티넘 리모델링 준공연도. 아파트맵 리모델링 완료연도 2024년 유지. 출처 https://www.hankyung.com/article/2024020796816';
 re.audit_discovery='remodel_original_vs_2024_year_separated';
 proof.push({seq:642,name:re.name,siteOriginalYear:1992,remodelCompletionYear:2024,decision:'preserve 2024 modernized completion year',source:'https://www.hankyung.com/article/2024020796816'});
 for(let i=0;i<files.length;i++){const {h,rows}=original[i];fs.writeFileSync(at(files[i]),h.join(',')+'\n'+rows.map(r=>h.map(k=>enc(r[k])).join(',')).join('\n')+'\n');}
 fs.writeFileSync(at(specFile),JSON.stringify(spec,null,2)+'\n');
 const summary={fixes:proof.length,replacementPageChecks:replacement.length,wrongBuildingRemoved:1,remodelYearPreserved:1,
  verified:all.filter(r=>r.verification==='직접확인').length,aggregate:all.filter(r=>r.verification==='집계단위불일치').length,
  unknown:all.filter(r=>!['직접확인','집계단위불일치'].includes(r.verification)).length,
  far:Object.keys(spec.far).length,year:Object.keys(spec.year).length,units:Object.keys(spec.units).length};
 fs.writeFileSync(at('docs/richgo-10to15-revalidation-corrections.json'),JSON.stringify({asOf:'2026-11-18',summary,proof},null,2)+'\n');
 console.log('SOURCE_CORRECTION_RESULT',JSON.stringify(summary));
}
main().catch(e=>{console.error(e);process.exitCode=1});
