#!/usr/bin/env node
/* Conservative evidence-only merge of all 343 fourth-pass public Richgo details.
 * Correct sources only when year, unique address/coordinates, unit identity and FAR prove the same complex.
 * Leave scope conflicts unresolved; never change under-6 or other price-band files.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
function parseCSV(t){
 const all=[];let row=[],cell='',quoted=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(quoted){if(c==='"'&&t[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
 else if(c==='"')quoted=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));all.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}
 if(cell||row.length){row.push(cell);all.push(row);}
 const cols=all.shift().map(c=>c.replace(/^\ufeff/,''));return {cols,rows:all.filter(r=>r.length===cols.length).map(r=>Object.fromEntries(cols.map((c,i)=>[c,r[i]])))};
}
const writeCsv=(columns,rows)=>'\ufeff'+columns.join(',')+'\n'+rows.map(r=>columns.map(k=>{const v=String(r[k]??'');return /[,"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\n')+'\n';
const source=parseCSV(rd('docs/richgo-6to10-full-coverage-20261118.csv'));
if(source.rows.length!==1822)throw Error('Cap10 population changed');
const unresolved=source.rows.filter(x=>!x.review_status.includes('verified'));
if(unresolved.length!==343)throw Error('Expected exactly 343 pending source identities; got '+unresolved.length);
const rows=[];const shardMeta=[];
for(let i=0;i<6;i++){
 const f='docs/richgo-6to10-final343-parts/part0'+i+'.json';
 if(!fs.existsSync(path.join(root,f)))throw Error('Missing final343 evidence '+f);
 const p=JSON.parse(rd(f));if(p.meta.shard!==i)throw Error('Shard mismatch');
 rows.push(...p.rows);shardMeta.push(p.meta);
}
if(rows.length!==343||new Set(rows.map(x=>x.key)).size!==343)throw Error('343 audit evidence is incomplete or duplicated');
const sourceByKey=new Map(source.rows.map(x=>[x.name+'|'+x.area,x]));
const allKeys=new Set(sourceByKey.keys()),existing=new Map();
const previous=JSON.parse(rd('scripts/richgo-band10-corrections.json'));
for(const x of previous){const k=x.name+'|'+x.area;if(existing.has(k))throw Error('Previous correction duplicates '+k);existing.set(k,x);}
if(existing.size!==1340)throw Error('Previous 1340 verified corrections changed');
const idOf=url=>String(url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1]||null;
const confirmedPageOwners=new Map();
for(const s of source.rows){
 if(!s.review_status.includes('verified'))continue;
 const id=idOf(s.richgo_url);if(!id)continue;
 const owners=confirmedPageOwners.get(id)||new Set();owners.add(s.name+'|'+s.area);confirmedPageOwners.set(id,owners);
}
const candidateOwners=new Map();
for(const row of rows){const id=row.source?.id;if(!id||!row.matched)continue;const items=candidateOwners.get(id)||[];items.push(row.key);candidateOwners.set(id,items);}
const tieIds=new Set([...candidateOwners].filter(([id,arr])=>arr.length>1).map(([id])=>id));
const newFixes=[],finalRows=[],totals={new_verified_far:0,new_verified_no_far:0,new_units_modified:0,old_scope_conflict:0,duplicate_source:0,identity_review:0,no_source:0};
for(const row of rows){
 const s=sourceByKey.get(row.key);if(!s||s.review_status!==row.oldStatus)throw Error('Out-of-scope or stale identity '+row.key);
 const r=row.source,m=row.match;let result='unresolved_no_source',reason='',fix=null;
 const existingOwners=r?[...(confirmedPageOwners.get(r.id)||[])].filter(k=>k!==row.key):[];
 const collision=!!r&&(existingOwners.length>0||tieIds.has(r.id));
 const valid=row.matched&&r&&m&&r.url==='https://m.richgo.ai/realty/danji/'+r.id&&
  Number.isInteger(Number(r.year))&&Number(r.year)>=1960&&Number.isInteger(Number(r.units))&&Number(r.units)>0&&
  Math.abs(Number(s.year_after_verified)-Number(r.year))<=2&&m.meters!=null&&m.meters<=180&&
  (Number(s.units_after_verified)===Number(r.units)||m.unitDelta<=3)&&m.nameSimilarity>=.35&&
  (m.nameSimilarity>=.58||m.meters<=90);
 if(valid&&!collision){
  const hasFar=r.far!=null&&Number.isFinite(Number(r.far))&&Number(r.far)>=60&&Number(r.far)<=1500;
  if(hasFar){
   fix={name:s.name,area:s.area,far:Number(r.far)};
   if(Number(s.year_after_verified)!==Number(r.year))fix.year=Number(r.year);
   if(Number(s.units_after_verified)!==Number(r.units)){
    fix.units=Number(r.units);totals.new_units_modified++;
   }
   if(existing.has(row.key))throw Error('Conflicting previous correction '+row.key);
   newFixes.push(fix);result='audit4_verified_far';totals.new_verified_far++;
   s.far_after_verified=String(fix.far);
   s.year_after_verified=String(fix.year??s.year_after_verified);
   s.units_after_verified=String(fix.units??s.units_after_verified);
  }else{result='audit4_verified_far_missing';totals.new_verified_no_far++;}
  s.review_status=result;
  s.richgo_url=r.url;s.richgo_year=String(r.year);s.richgo_units=String(r.units);
  if(hasFar)s.richgo_far=String(r.far);
 }else{
  if(collision){result='audit4_duplicate_source_review';reason='Richgo ID already assigned to another apartment or source alias collision';totals.duplicate_source++;}
  else if(r){result='audit4_source_scope_review';reason='Identity, year, units, distance or source URL validation failed';totals.old_scope_conflict++;}
  else if(row.candidateCount>0){result='audit4_candidate_review';reason='Richgo candidate records exist but none passes strong entity identity checks';totals.identity_review++;}
  else{result='audit4_no_source';reason='No matching public Richgo detail source';totals.no_source++;}
  s.review_status=result;
 }
 finalRows.push({name:s.name,area:s.area,old_status:row.oldStatus,new_status:result,
  map_year:s.year_before,map_units:s.units_before,richgo_name:r?.name??'',richgo_url:r?.url??'',
  richgo_year:r?.year??'',richgo_units:r?.units??'',richgo_far:r?.far??'',
  latitude:s.lat,longitude:s.lng,distance_m:m?.meters??'',unit_delta:m?.unitDelta??'',
  name_similarity:m?.nameSimilarity??'',far_applied:fix?.far??'',units_applied:fix?.units??'',reason,
  best_candidate:row.candidates?.[0]?.url??'',candidate_count:row.candidateCount});
}
if(finalRows.length!==343)throw Error('Incomplete final 343 rows');
const changes=[...previous,...newFixes],fixedKeys=new Set(changes.map(x=>x.name+'|'+x.area));
if(fixedKeys.size!==changes.length)throw Error('Duplicate corrected complex');
if([...fixedKeys].some(k=>!allKeys.has(k)))throw Error('Unexpected corrected entity outside cap10');
if(Object.values(totals).reduce((a,b)=>a+b,0)!==343+totals.new_units_modified)throw Error('Status accounting invariant failed');
const status=Object.groupBy(source.rows,x=>x.review_status);
const confirmed=source.rows.filter(x=>x.review_status.includes('verified')).length;
const farCount=source.rows.filter(x=>x.far_after_verified!=='').length;
const report=[
 '# 6억~10억 리치고 보류 343개 추가 웹 검증',
 '',
 '## 조사 범위',
 '- 이전 전수조사에서 식별 보류된 343개를 6개 지역 분할로 공개 리치고 상세페이지와 공개 검색 목록을 다시 조사',
 '- 4차 크롤링 결과는 docs/richgo-6to10-final343-parts/part00.json ~ part05.json에 단지별 원자료, URL, 좌표 거리, 세대수 및 검증 사유로 저장',
 '- 대상 343개 모두 별도 판정 및 CSV 저장. **전체 재검토와 343개 전부의 동일성 검증 성공은 다름**',
 '',
 '## 4차 판정',
 ...Object.entries(totals).map(([k,v])=>'- '+k+': '+v+'개'),
 '- 이 중 new_units_modified는 이미 신규 검증 건에 포함된 세대수 보정 수로 중복 집계된다',
 '',
 '## 가격 구간 전체',
 '- 전체 단지: 1,822개',
 '- 리치고 식별 검증 성공: '+confirmed+'개',
 '- 검증 보류 또는 리치고 대조 미확정: '+(1822-confirmed)+'개',
 '- 4차 반영 후 원본과 보정 기준 용적률 존재: '+farCount+'개, 공란 '+(1822-farCount)+'개',
 '- 6~10억 전용 보정 전체: '+changes.length+'개 (기존 1,340개 + 신규 '+newFixes.length+'개)',
 '',
 '## 원칙',
 '- 공개 리치고 출처 URL과 현재 단지 주소, 준공연도, 세대수, 좌표를 동시 대조',
 '- 통합단지 또는 중복 페이지는 잘못된 FAR를 복사하지 않고 보류',
 '- 리치고에서 용적률이 없으면 임의 기입 금지',
 '- 6억 이하와 다른 가격대 raw 데이터, 실거래가, 개별 평형 가격은 변경하지 않음',
 '- 운영 배포 없음. 이 브랜치 빌드 속도 예산 검증 후 병합 가능',
 ''
].join('\n');
const writes={
 'docs/richgo-6to10-final343-20261118.csv':writeCsv(['name','area','old_status','new_status','map_year','map_units','richgo_name','richgo_url','richgo_year','richgo_units','richgo_far','latitude','longitude','distance_m','unit_delta','name_similarity','far_applied','units_applied','reason','best_candidate','candidate_count'],finalRows),
 'docs/richgo-6to10-full-coverage-20261118.csv':writeCsv(source.cols,source.rows),
 'scripts/richgo-band10-corrections.json':JSON.stringify(changes,null,2)+'\n',
 'docs/richgo-6to10-final343-report-20261118.md':report
};
console.log('FINAL343_AGGREGATED',JSON.stringify({targets:343,newCorrections:newFixes.length,totalCorrections:changes.length,confirmed,remaining:1822-confirmed,farCount,statusTotals:totals,requests:shardMeta.map(x=>x.statistics.requests)}));
async function publish(){
 if(!process.env.GITHUB_TOKEN){
  for(const [f,content] of Object.entries(writes)){const output=path.join(root,f);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,content);}
  return;
 }
 const repo=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME,headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 for(const [file,content] of Object.entries(writes)){
  const u='https://api.github.com/repos/'+repo+'/contents/'+file;
  let ok=false;
  for(let n=0;n<10;n++){
   const r=await fetch(u+'?ref='+encodeURIComponent(branch),{headers});
   if(!r.ok&&r.status!==404)throw Error('Read error '+r.status+' '+file);
   const old=r.ok?await r.json():null;
   const body={branch,message:'audit(cap10): reconcile 343 pending identity pages '+file,content:Buffer.from(content).toString('base64')};if(old?.sha)body.sha=old.sha;
   const p=await fetch(u,{method:'PUT',headers,body:JSON.stringify(body)});
   if(p.ok){console.log('GITHUB_PUBLISHED',file);ok=true;break;}
   if(p.status!==409&&p.status!==422)throw Error('Cannot publish '+file+' HTTP '+p.status+' '+(await p.text()).slice(0,300));
   await new Promise(z=>setTimeout(z,2000+n*900));
  }if(!ok)throw Error('Repeated GitHub commit conflicts '+file);
 }
}
publish().catch(e=>{console.error('FINAL343_PUBLISH_FAILED',e.stack||String(e));process.exitCode=1});
