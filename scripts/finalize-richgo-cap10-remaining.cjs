#!/usr/bin/env node
'use strict';
/* Combine six source-linked Richgo public-page crawl shards.
 * No cross-band writes; corrections remain cap=10-only at build time.
 * Ambiguous, split/merged, duplicate Richgo IDs and units mismatch are NEVER automatically patched.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),p=x=>path.join(root,x);
const base='docs/richgo-6to10-remaining-parts/',read=x=>fs.readFileSync(p(x),'utf8');
function parseCSV(s){
 const rr=[];let row=[],cell='',q=false;
 for(let i=0;i<s.length;i++){let c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}
 else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rr.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}
 if(cell||row.length){row.push(cell);rr.push(row);}const keys=rr.shift().map(x=>x.replace(/^\ufeff/,''));return {keys,rows:rr.filter(x=>x.length===keys.length).map(v=>Object.fromEntries(keys.map((k,j)=>[k,v[j]])))};
}
const qc=s=>{const v=String(s??'');return /[,"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const emit=(columns,rows)=>'\ufeff'+columns.join(',')+'\n'+rows.map(r=>columns.map(c=>qc(r[c])).join(',')).join('\n')+'\n';
const coverage=parseCSV(read('docs/richgo-6to10-full-coverage-20261118.csv'));
if(coverage.rows.length!==1822)throw Error('current 6to10 source is not 1822');
const targets=new Map(coverage.rows.filter(x=>x.review_status==='not_reviewed').map(x=>[x.name+'|'+x.area,x]));
if(targets.size!==1108)throw Error('original remaining is not 1108, got '+targets.size);
const audits=[],shards=[];
for(let i=0;i<6;i++){
 const f=base+'part'+String(i).padStart(2,'0')+'.json';
 if(!fs.existsSync(p(f)))throw Error('missing shard '+f);
 const s=JSON.parse(read(f));if(s.meta.shard!==i)throw Error('incorrect shard '+f);
 shards.push({shard:i,targets:s.meta.targets,count:s.meta.counts,requests:s.meta.statistics?.requests});
 audits.push(...s.rows);
}
if(audits.length!==1108||new Set(audits.map(x=>x.key)).size!==1108)throw Error('incomplete or duplicated crawl: '+audits.length);
// Overlay corroborated public detail results from the targeted second pass, when all six are present.
const secondFiles=Array.from({length:6},(_,i)=>'docs/richgo-6to10-secondpass-parts/part0'+i+'.json');
const present=secondFiles.filter(f=>fs.existsSync(p(f)));
if(present.length>0&&present.length!==6)throw Error('Partial second-pass evidence: '+present.length+'/6');
let secondPassVerified=0;
if(present.length===6){
 const byKey=new Map();
 for(let i=0;i<6;i++){
  const part=JSON.parse(read(secondFiles[i]));
  if(part.meta.shard!==i)throw Error('second-pass shard mismatch '+i);
  for(const x of part.rows){if(byKey.has(x.key))throw Error('duplicate second pass '+x.key);byKey.set(x.key,x);}
 }
 for(const row of audits){
  if(row.status==='verified')continue;
  const x=byKey.get(row.key);
  if(x?.secondStatus!=='verified_second_pass'||!x.richgo)continue;
  row.status='verified';row.richgo=x.richgo;
  row.match={distanceMeters:x.match?.distanceMeters??null,yearDelta:x.match?.yearDelta??null,unitsRatio:x.match?.unitsRatio??null,nameSimilarity:null,hubScore:x.match?.score??null};
  secondPassVerified++;
 }
 console.log('SECOND_PASS_MERGED',JSON.stringify({rows:byKey.size,additionalVerified:secondPassVerified}));
}

for(const x of audits)if(!targets.has(x.key))throw Error('unexpected audited identity '+x.key);
// Apply independent municipal/dong catalog matches after first and second pass.
const thirdFiles=Array.from({length:6},(_,i)=>'docs/richgo-6to10-thirdpass-parts/part0'+i+'.json');
const availableThird=thirdFiles.filter(f=>fs.existsSync(p(f)));
if(availableThird.length>0&&availableThird.length!==6)throw Error('Partial third-pass evidence: '+availableThird.length+'/6');
let thirdPassVerified=0;
if(availableThird.length===6){
 const byKey=new Map();
 for(let i=0;i<6;i++){
  const batch=JSON.parse(read(thirdFiles[i]));if(batch.meta.shard!==i)throw Error('third-pass shard mismatch '+i);
  for(const x of batch.rows){if(byKey.has(x.key))throw Error('third-pass duplicate '+x.key);byKey.set(x.key,x);}
 }
 for(const row of audits){
  if(row.status==='verified')continue;
  const x=byKey.get(row.key);if(x?.thirdStatus!=='verified_third_pass'||!x.richgo)continue;
  row.status='verified';row.richgo=x.richgo;row.match=x.match;thirdPassVerified++;
 }
 console.log('THIRD_PASS_MERGED',JSON.stringify({rows:byKey.size,additionalVerified:thirdPassVerified}));
}
const duplicatePages=new Map();
for(const row of audits)if(row.richgo?.id){let a=duplicatePages.get(row.richgo.id)||[];a.push(row.key);duplicatePages.set(row.richgo.id,a);}
// Do not reuse the same Richgo page already assigned to a separate verified cap10 complex.
const priorIds=new Map(),previous=JSON.parse(read('docs/richgo-band10-current300-verified.json'));
const idFrom=url=>String(url||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1]||null;
for(const rec of previous.records){const id=idFrom(rec.source_url);if(!id)continue;const a=priorIds.get(id)||new Set();a.add(rec.key);priorIds.set(id,a);}
for(const rec of parseCSV(read('docs/richgo-6to10-crossband-verified415-20261118.csv')).rows){
 const id=idFrom(rec.source_url);if(!id)continue;const a=priorIds.get(id)||new Set();a.add(rec.name+'|'+rec.area);priorIds.set(id,a);
}
const duplicateIds=new Set([...duplicatePages].filter(([id,ks])=>ks.length>1||priorIds.has(id)).map(([id])=>id));
const oldCorrections=JSON.parse(read('scripts/richgo-band10-corrections.json'));
const fixKeys=new Set(oldCorrections.map(x=>x.name+'|'+x.area));
if(oldCorrections.length!==556||fixKeys.size!==556)throw Error('unexpected previous correction count');
const newCorrections=[],reasons={};
const evidenceColumns=['name','area','status','source_url','distance_m','name_similarity','year_before','richgo_year','units_before','richgo_units','far_before','richgo_far','corrected_far','reason','shard'];
const evidence=[];
for(const row of audits){
 const source=targets.get(row.key),r=row.richgo,m=row.match;const richYear=r?.year==null?null:Math.trunc(Number(r.year));let st='crawler_'+row.status,reason='';
 let acceptable=row.status==='verified'&&r&&m&&Number.isFinite(r.year)&&Number.isFinite(r.units)
 &&(!duplicateIds.has(r.id))&&Number.isFinite(Number(r.far))&&Number(r.far)>=60&&Number(r.far)<=1500
 &&Number(r.units)===Number(source.units_after_verified)&&Math.abs(Number(source.year_after_verified)-richYear)<=2
 &&typeof r.url==='string'&&r.url.startsWith('https://m.richgo.ai/realty/danji/');
 if(row.status==='verified'&&duplicateIds.has(r?.id)){st='crawler_shared_scope_review';reason='same Richgo ID points to multiple map entries';}
 else if(row.status==='verified'&&r?.far==null){st='crawler_far_blank';reason='Richgo FAR missing';}
 else if(row.status==='verified'&&r&&Number(r.units)!==Number(source.units_after_verified)){st='crawler_units_mismatch_review';reason='different household aggregation';}
 else if(row.status==='verified'&&!acceptable){st='crawler_identity_review';reason='year/FAR/source identity conditions not met';}
 let farAfter=source.far_after_verified;
 if(acceptable){
   st='crawler_verified';
   const x={name:row.name,area:row.area,far:Number(r.far)};
   if(richYear!==Number(source.year_after_verified))x.year=richYear;
   if(fixKeys.has(row.key))throw Error('original correction conflict '+row.key);
   fixKeys.add(row.key);newCorrections.push(x);
   farAfter=String(x.far);
 }
 source.review_status=st;
 if(r?.url)source.richgo_url=r.url;
 if(r?.far!=null)source.richgo_far=String(r.far);
 if(richYear!=null)source.richgo_year=String(richYear);
 if(r?.units!=null)source.richgo_units=String(r.units);
 if(acceptable){source.far_after_verified=farAfter;if(richYear!==Number(source.year_after_verified))source.year_after_verified=String(richYear);}
 reasons[st]=(reasons[st]||0)+1;
 evidence.push({name:row.name,area:row.area,status:st,source_url:r?.url||'',distance_m:m?.distanceMeters??'',name_similarity:m?.nameSimilarity??'',year_before:row.map.year,richgo_year:richYear??'',units_before:row.map.units,richgo_units:r?.units??'',far_before:row.map.far??'',richgo_far:r?.far??'',corrected_far:acceptable?farAfter:'',reason,shard:row.shard??''});
}
if(Object.values(reasons).reduce((a,b)=>a+b,0)!==1108)throw Error('status accounting error');
const fixes=[...oldCorrections,...newCorrections];
const report=[
 '# 6억~10억 리치고 공개페이지 크롤링 후속조사',
 '',
 '- 원본 1,822개 단지, 기존 조사 기록 714개, 신규 크롤링 대상 1,108개',
 '- 지역별 크롤링 6개 조각 전부 확인. 상세 결과와 각 단지 URL은 JSON 원문 및 CSV에 보관',
 '- 자동 수정은 리치고 동일 단지 ID 중복이 없고 입주연도 2년 이내, 세대수 정확 일치, 용적률 60~1500%인 검증 단지에만 적용',
 '- 기존 6억 이하 및 다른 금액대 입력값을 건드리지 않음',
 '',
 '## 조사 상태',
 ...Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'- '+k+': '+v+'개'),
 '',
 '- 추가 자동 보정: '+newCorrections.length+'개',
 '- 2차 재검증에서 추가 복원된 단지: '+secondPassVerified+'개',
 '- 3차 법정동 공개목록에서 추가 복원된 단지: '+thirdPassVerified+'개',
 '- 최종 보정 파일 항목: '+fixes.length+'개',
 '- 용적률 수치 존재: '+coverage.rows.filter(x=>x.far_after_verified!=='').length+'개',
 '- 단지 매칭 불명확한 항목은 임의 수치를 넣지 않고 별도 검증 대상으로 유지',
 '',
 '## 지역 작업별 원자료',
 ...shards.map(x=>'- 작업 '+x.shard+': '+x.targets+'개, HTTP 성공 '+(x.requests??'?')+'회'),
 '',
 '상세: docs/richgo-6to10-remaining1108-20261118.csv 와 docs/richgo-6to10-remaining-parts/part00.json~part05.json'
].join('\n')+'\n';
const writes={
 'docs/richgo-6to10-remaining1108-20261118.csv':emit(evidenceColumns,evidence),
 'docs/richgo-6to10-full-coverage-20261118.csv':emit(coverage.keys,coverage.rows),
 'scripts/richgo-band10-corrections.json':JSON.stringify(fixes,null,2)+'\n',
 'docs/richgo-6to10-final-audit-20261118.md':report
};
console.log('AGGREGATED',JSON.stringify({reviewed:1108,corrections:newCorrections.length,counts:reasons,duplicatePageIds:duplicateIds.size,secondPassVerified,thirdPassVerified,shards}));
if(process.env.GITHUB_TOKEN&&process.env.GITHUB_REPOSITORY){
 const repo=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME||'audit/richgo-6to10-top300-20261118';
 const headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 (async()=>{for(const [filename,content] of Object.entries(writes)){
  const url='https://api.github.com/repos/'+repo+'/contents/'+filename;
  const current=await fetch(url+'?ref='+encodeURIComponent(branch),{headers});
  if(!current.ok&&current.status!==404)throw Error('GET failed '+filename+' '+current.status);
  const old=current.ok?await current.json():null;
  const body={message:'audit(cap10): finalize 1108 public-page verification '+filename,branch,content:Buffer.from(content).toString('base64')};
  if(old?.sha)body.sha=old.sha;
  const x=await fetch(url,{method:'PUT',headers,body:JSON.stringify(body)});
  if(!x.ok)throw Error('failed to save '+filename+' '+x.status+' '+(await x.text()).slice(0,300));
  console.log('PUBLISHED',filename);
 }} )().catch(e=>{console.error(e.stack);process.exitCode=1});
}else{for(const [f,content] of Object.entries(writes)){fs.mkdirSync(path.dirname(p(f)),{recursive:true});fs.writeFileSync(p(f),content);}}
