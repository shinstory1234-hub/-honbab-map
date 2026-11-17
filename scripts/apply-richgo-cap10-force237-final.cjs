#!/usr/bin/env node
/* Richgo-first cap10 source reconciliation.
 * Use the public Richgo catalog + detailed page as source of record for name,
 * household count, completion year and FAR of a physically identified apartment.
 * No values are generated from guessed sources.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function csv(t){
 let arr=[],r=[],v='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
 else if(c==='"')q=true;else if(c===','){r.push(v);v='';}else if(c==='\n'){r.push(v.replace(/\r$/,''));arr.push(r);r=[];v='';}else if(c!=='\r')v+=c;}
 if(v||r.length){r.push(v);arr.push(r);}const cols=arr.shift().map(x=>x.replace(/^\ufeff/,''));return {cols,rows:arr.filter(r=>r.length===cols.length).map(r=>Object.fromEntries(cols.map((k,i)=>[k,r[i]])))};
}
function outCsv(cols,rows){return '\ufeff'+cols.join(',')+'\n'+rows.map(r=>cols.map(k=>{const s=String(r[k]??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n')+'\n';}
const coverage=csv(read('docs/richgo-6to10-full-coverage-20261118.csv')),
 previous=csv(read('docs/richgo-6to10-unresolved237-20261118.csv')),
 fixes=JSON.parse(read('scripts/richgo-band10-corrections.json')),
 entries=Array.from({length:6},(_,i)=>JSON.parse(read('docs/richgo-6to10-force237-catalog-parts/part0'+i+'.json')));
if(coverage.rows.length!==1822||previous.rows.length!==237||fixes.length!==1439)throw Error('Baseline changed');
const crawled=entries.flatMap(x=>x.rows);
if(crawled.length!==237||new Set(crawled.map(x=>x.key)).size!==237)throw Error('Missing all 237 neighborhood audit records');
const coverageByKey=new Map(coverage.rows.map(x=>[x.name+'|'+x.area,x]));
const currentFixes=new Map(fixes.map(x=>[x.name+'|'+x.area,x]));
const sourceOwner=new Map();
for(const s of coverage.rows)if(s.review_status.includes('verified')){
 const id=String(s.richgo_url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1];
 if(id){const owners=sourceOwner.get(id)||new Set();owners.add(s.name+'|'+s.area);sourceOwner.set(id,owners);}
}
const isNumeric=n=>typeof n==='number'&&Number.isFinite(n);
function eligible(t,c){
 if(!c||!isNumeric(c.units)||c.units<1||!Number.isInteger(c.year)||c.year<1960||!/^https:\/\/m\.richgo\.ai\/realty\/danji\/a[A-Za-z0-9]{6}$/.test(c.url))return false;
 const d=c.distance_m,ss=c.similarity,dy=c.year_delta,units=c.unit_ratio;
 if(d==null||d<0)return false;
 // Deliberately ignore Richgo-vs-legacy household count differences for direct identity matches.
 if(ss>=.97 && d<=650)return true;
 if(ss>=.83 && d<=380)return true;
 if(ss>=.61 && d<=240 && (dy==null||dy<=5))return true;
 if(ss>=.38 && d<=80 && dy!=null&&dy<=3 && units!=null&&units<=.35)return true;
 if(ss>=.24 && d<=75 && dy!=null&&dy<=2 && units===0)return true;
 if(ss>=.97 && d<=1200 && dy!=null&&dy<=2 && units===0)return true;
 return false;
}
const resolved=[],pending=[],allOut=[],count={original:237,richgoConfirmed:0,sourceMissing:0,farUnavailable:0,ambiguous:0,nonMatching:0,sharedSourcePages:0,
 withFar:0,correctedFar:0,correctedUnits:0,correctedYear:0,baselineCorrections:1439},sharedIdList=[];
for(const original of previous.rows){
 const key=original.name+'|'+original.area,source=coverageByKey.get(key);
 if(!source||source.review_status.includes('verified')||currentFixes.has(key))throw Error('Unexpected baseline identity '+key);
 const scan=crawled.find(x=>x.key===key);
 if(!scan)throw Error('Missing public page audit '+key);
 const all=scan.candidates||[];
 const shortlisted=all.filter(c=>eligible(source,c)).sort((a,b)=>b.score-a.score);
 let chosen=shortlisted[0]||null,reason='';
 if(!chosen){reason=all.length?'identity_mismatch':'source_not_found';count[all.length?'nonMatching':'sourceMissing']++;}
 else if(shortlisted.length>1&&
   shortlisted[1].id!==chosen.id&&shortlisted[1].score>=chosen.score-13&&
   shortlisted[1].similarity>=chosen.similarity-.03){
    chosen=null;reason='ambiguous_two_Richgo_pages';count.ambiguous++;
 }
 if(chosen){
  const pageId=chosen.id,existing=[...(sourceOwner.get(pageId)||new Set())].filter(k=>k!==key);
  const validFar=isNumeric(chosen.far)&&chosen.far>=60&&chosen.far<=1500;
  // Directly sourced Richgo values win even when legacy household and completion year differ.
  const fix={name:source.name,area:source.area,units:chosen.units,year:chosen.year};
  if(validFar){fix.far=chosen.far;count.withFar++;if(String(chosen.far)!==String(source.far_after_verified))count.correctedFar++;}
  else{fix.clearFar=true;count.farUnavailable++;}
  if(Number(source.units_after_verified)!==chosen.units)count.correctedUnits++;
  if(Number(source.year_after_verified)!==chosen.year)count.correctedYear++;
  fixes.push(fix);currentFixes.set(key,fix);resolved.push(key);count.richgoConfirmed++;
  source.review_status=existing.length?'audit8_richgo_verified_shared_catalog':'audit8_richgo_verified_catalog';
  source.year_after_verified=String(chosen.year);source.units_after_verified=String(chosen.units);
  source.far_after_verified=validFar?String(chosen.far):'';
  source.richgo_year=String(chosen.year);source.richgo_units=String(chosen.units);
  source.richgo_far=validFar?String(chosen.far):'';
  source.richgo_url=chosen.url;
  if(existing.length){count.sharedSourcePages++;sharedIdList.push({name:source.name,id:pageId,sharedWith:existing});}
  const s=sourceOwner.get(pageId)||new Set();s.add(key);sourceOwner.set(pageId,s);
  reason=existing.length?'confirmed_Richgo_shared_source':'confirmed_Richgo_direct_source';
 }else pending.push(key);
 allOut.push({name:source.name,area:source.area,old_reason:original.reason_code,
  final_status:chosen?source.review_status:reason,matching_method:chosen?.confidence||'',
  richgo_name:chosen?.name||'',richgo_url:chosen?.url||'',
  richgo_far:chosen?.far??'',richgo_units:chosen?.units??'',richgo_year:chosen?.year??'',
  richgo_distance_m:chosen?.distance_m??'',name_similarity:chosen?.similarity??'',
  unit_difference:chosen?.unit_delta??'',shared_page_count:chosen?[...(sourceOwner.get(chosen.id)||[])].length:0,
  alternative_public_urls:all.slice(0,4).map(x=>x.url).join(';'),catalog_url:scan.dongCatalog||'',
  source_candidates:scan.candidateCount,reason});
}
if(count.richgoConfirmed+pending.length!==237||new Set(fixes.map(x=>x.name+'|'+x.area)).size!==fixes.length)throw Error('Incorrect final count or duplicate correction');
const verified=coverage.rows.filter(x=>x.review_status.includes('verified')).length,far=coverage.rows.filter(x=>x.far_after_verified!=='').length;
const noSource=allOut.filter(x=>!x.richgo_url);
const report=[
 '# 6억~10억원 리치고 직접 기준 전수 대조',
 '',
 '## 적용 원칙',
 '- 아파트맵 원래 세대수와 준공연도가 리치고 상세페이지와 다르더라도 동일 단지라고 확인되면 리치고 값을 적용한다.',
 '- 단지명, 행정동 공개목록, 좌표 거리, 후보 중복 여부를 확인한다. 서로 다른 아파트로 밝혀진 후보 값은 복사하지 않는다.',
 '- 리치고 상세페이지에 용적률이 공란이면 과거의 미검증 수치를 유효한 리치고 값처럼 표시하지 않는다.',
 '- 물리적 단지 매칭이 없는 경우 리치고 데이터가 존재한다고 가정하지 않는다.',
 '',
 '## 처리 결과',
 '- 6~10억원 단지 전체: 1,822개',
 '- 기존 출처 동일성 검증 성공: 1,585개',
 '- 이번 공개 행정동 전체 목록 재조회 대상: 237개',
 '- 이번 신규 리치고 직접 검증 성공: '+count.richgoConfirmed+'개',
 '- 최종 출처 대응 성공 단지: '+verified+'개',
 '- 상세페이지 불명확하거나 타 단지 후보만 있는 단지: '+pending.length+'개',
 '- 6~10억원 보정 총 '+fixes.length+'개, 이번 '+count.richgoConfirmed+'개 추가',
 '- 용적률 숫자 확보 '+far+'개, 공란 '+(1822-far)+'개',
 '- 이번 세대수 차이를 리치고 기준으로 수정한 단지 '+count.correctedUnits+'개, 준공연도 '+count.correctedYear+'개, 용적률 숫자 변경 '+count.correctedFar+'개',
 '- 단지 구분이 중복되는 리치고 페이지를 참조한 행 '+count.sharedSourcePages+'개',
 '- 미매칭 사유: 출처 페이지 미발견 '+count.sourceMissing+', 후보 타 단지 '+count.nonMatching+', 후보 둘 이상 모호 '+count.ambiguous+', 페이지 FAR 없음 '+count.farUnavailable+'개',
 '',
 '## 원자료와 검증',
 '- 모든 공개 출처 후보 및 원본 지역 링크: docs/richgo-6to10-force237-catalog-parts/part00.json ~ part05.json',
 '- 237개 전체 Richgo 대조 기록: docs/richgo-6to10-force237-final-20261118.csv',
 '- 원자료와 리치고를 연결할 수 없는 경우: docs/richgo-6to10-force237-no-source-20261118.csv',
 '- 리치고 동일 페이지가 여러 아파트맵 항목에 연결되는 사례: docs/richgo-6to10-force237-shared-source-20261118.json',
 '- 기존 6억 이하 및 타 가격대 원본 데이터와 초기 로딩 성능 상한을 바꾸지 않음',
 '- 운영 배포하지 않음',
 ''
].join('\n');
const cols=['name','area','old_reason','final_status','matching_method','richgo_name','richgo_url','richgo_far','richgo_units','richgo_year','richgo_distance_m','name_similarity','unit_difference','shared_page_count','alternative_public_urls','catalog_url','source_candidates','reason'];
const payload={
 'scripts/richgo-band10-corrections.json':JSON.stringify(fixes,null,2)+'\n',
 'docs/richgo-6to10-full-coverage-20261118.csv':outCsv(coverage.cols,coverage.rows),
 'docs/richgo-6to10-force237-final-20261118.csv':outCsv(cols,allOut),
 'docs/richgo-6to10-force237-no-source-20261118.csv':outCsv(cols,noSource),
 'docs/richgo-6to10-force237-shared-source-20261118.json':JSON.stringify(sharedIdList,null,2)+'\n',
 'docs/richgo-6to10-force237-final-report-20261118.md':report
};
console.log('RICHGO_FORCE237_FINAL',JSON.stringify({total:1822,verified,stillUnmatched:pending.length,far,farMissing:1822-far,allCorrections:fixes.length,stats:count}));
async function publish(){
 if(!process.env.GITHUB_TOKEN){for(const [p,c] of Object.entries(payload)){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),c);}return;}
 const repo=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME;
 const headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 for(const [file,content] of Object.entries(payload)){
  const url='https://api.github.com/repos/'+repo+'/contents/'+file;
  let saved=false;
  for(let n=0;n<12;n++){
   const get=await fetch(url+'?ref='+encodeURIComponent(branch),{headers});
   if(!get.ok&&get.status!==404)throw Error('Cannot read '+file+' HTTP '+get.status);
   const old=get.ok?await get.json():null;
   const body={branch,message:'audit(cap10): apply Richgo public source truth to identified unverified 237 complexes '+file,content:Buffer.from(content).toString('base64')};
   if(old?.sha)body.sha=old.sha;
   const res=await fetch(url,{method:'PUT',headers,body:JSON.stringify(body)});
   if(res.ok){saved=true;console.log('GITHUB_SAVED',file);break;}
   if(res.status!==409&&res.status!==422)throw Error('Cannot publish '+file+' '+res.status+' '+(await res.text()).slice(0,200));
   await new Promise(r=>setTimeout(r,2000+n*750));
  }
  if(!saved)throw Error('Too many update conflicts '+file);
 }
}
publish().catch(e=>{console.error('FORCE237_APPLY_FAILED',e.stack||String(e));process.exitCode=1});
