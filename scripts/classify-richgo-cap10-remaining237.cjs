#!/usr/bin/env node
/* Classification of irreconcilable public Richgo source discrepancies after all six cap10 audits.
 * Every remaining complex has one explicit reason with source page, candidate metadata.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),rd=p=>fs.readFileSync(path.join(root,p),'utf8');
function csv(text){
 let rows=[],r=[],v='',q=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
 else if(c==='"')q=true;else if(c===','){r.push(v);v='';}else if(c==='\n'){r.push(v.replace(/\r$/,''));rows.push(r);r=[];v='';}else if(c!=='\r')v+=c;}
 if(v||r.length){r.push(v);rows.push(r);}const h=rows.shift().map(x=>x.replace(/^\ufeff/,''));return {h,rows:rows.filter(x=>x.length===h.length).map(x=>Object.fromEntries(h.map((k,i)=>[k,x[i]])))};
}
const toCsv=(h,rows)=>'\ufeff'+h.join(',')+'\n'+rows.map(row=>h.map(k=>{const s=String(row[k]??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n')+'\n';
const coverage=csv(rd('docs/richgo-6to10-full-coverage-20261118.csv')).rows,
 audit=csv(rd('docs/richgo-6to10-final343-20261118.csv')).rows,
 first=Array.from({length:6},(_,i)=>JSON.parse(rd('docs/richgo-6to10-final343-parts/part0'+i+'.json'))).flatMap(x=>x.rows),
 fixes=JSON.parse(rd('scripts/richgo-band10-corrections.json'));
if(coverage.length!==1822||audit.length!==343||first.length!==343||fixes.length!==1439)throw Error('Missing final audited cap10 dataset');
const unresolved=coverage.filter(r=>!r.review_status.includes('verified'));
if(unresolved.length!==237)throw Error('Expected 237 remaining exceptions, got '+unresolved.length);
const byId=new Map(first.map(x=>[x.key,x])),auditById=new Map(audit.map(x=>[x.name+'|'+x.area,x]));
const labels={
 SOURCE_NOT_FOUND:'리치고 공개 상세페이지를 찾지 못함',
 COMBINED_OR_ALIAS:'동일 리치고 단지 페이지에 복수 아파트맵 단지명이 대응함',
 UNIT_SCOPE_CONFLICT:'일치 후보가 있으나 세대수 또는 원본 단지 범위가 크게 다름',
 COMPLETION_YEAR_CONFLICT:'주소·이름이 가까우나 입주연도 불일치',
 POSITION_CONFLICT:'단지 좌표가 멀리 떨어져 다른 단지일 가능성',
 NAME_IDENTITY_CONFLICT:'리치고 단지명과 아파트맵 이름이 다른 주택 단지를 가리킬 가능성',
 FAR_UNAVAILABLE:'리치고 상세 용적률이 공란',
 IDENTITY_UNRESOLVED:'리치고 후보가 있으나 단지 동일성을 1대1로 확정할 근거가 부족함'
};
const entries=[],counts={};for(const source of unresolved){
 const key=source.name+'|'+source.area,a=byId.get(key),row=auditById.get(key);
 if(!a||!row)throw Error('Missing original evidence '+key);
 const candidates=a.candidates||[],best=candidates[0]||null,near=candidates.find(x=>x.distanceMeters!=null&&x.distanceMeters<=250)||best;
 let reason;
 if(source.review_status==='audit4_duplicate_source_review'||a.status==='shared_identity')reason='COMBINED_OR_ALIAS';
 else if(candidates.length===0)reason='SOURCE_NOT_FOUND';
 else if(near&&near.nameSimilarity>=.65&&near.distanceMeters!=null&&near.distanceMeters<=220&&
   Math.abs(+source.year_after_verified-near.year)<=2&&
   near.unitsDelta/Math.max(1,+source.units_after_verified,+near.units)>=.08)reason='UNIT_SCOPE_CONFLICT';
 else if(near&&near.nameSimilarity>=.75&&near.distanceMeters!=null&&near.distanceMeters<=220&&Math.abs(+source.year_after_verified-near.year)>2)
  reason='COMPLETION_YEAR_CONFLICT';
 else if(best&&best.distanceMeters!=null&&best.distanceMeters>500)reason='POSITION_CONFLICT';
 else if(best&&best.nameSimilarity<.4)reason='NAME_IDENTITY_CONFLICT';
 else if(best?.far==null)reason='FAR_UNAVAILABLE';
 else reason='IDENTITY_UNRESOLVED';
 counts[reason]=(counts[reason]||0)+1;
 entries.push({name:source.name,area:source.area,reason_code:reason,reason:labels[reason],
 old_review_status:row.old_status,current_status:source.review_status,
 map_units:source.units_after_verified,map_year:source.year_after_verified,map_far:source.far_after_verified,
 source_name:best?.name??'',source_url:best?.url??'',source_far:best?.far??'',source_units:best?.units??'',
 source_year:best?.year??'',distance_m:best?.distanceMeters??'',name_similarity:best?.nameSimilarity??'',
 map_source_count:candidates.length,other_candidates:candidates.slice(1,4).map(x=>x.url).join(';')});
}
if(Object.values(counts).reduce((sum,n)=>sum+n,0)!==237)throw Error('Exception categories do not sum to 237');
const verified=coverage.filter(r=>r.review_status.includes('verified')).length;
const far=coverage.filter(r=>r.far_after_verified!=='').length;
const unresolvedWithValues=unresolved.filter(r=>r.far_after_verified!=='').length;
const summary=[
 '# 6억~10억 리치고 전수검증 최종 예외 237개 상세 분류',
 '',
 '## 최종 결론',
 '- 전체 1,822개 단지에 대해 기존 자료와 6차까지의 공개 웹 대조를 시행했고, 각 단지는 검증 완료 또는 근거 있는 예외로 분류했다.',
 '- 단지 동일성 1대1 검증 성공: '+verified+'개',
 '- 동일성 검증을 통과하지 못한 예외: 237개. **343개 재검토 완료가 343개 모두 리치고와 일치함을 뜻하지는 않는다.**',
 '- 최종 보정 기록: '+fixes.length+'개. 용적률 숫자 존재 '+far+'개, 결측 '+(1822-far)+'개.',
 '- 식별 예외 중 기존 데이터에 FAR 숫자가 있는 경우도 '+unresolvedWithValues+'개 있다. 이는 리치고 검증값이 아니다.',
 '',
 '## 미확정 237개 사유별 수',
 ...Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,n])=>'- '+labels[k]+': '+n+'개'),
 '',
 '## 대응 원칙',
 '- 통합단지인 경우 1개 리치고 페이지 값을 여러 아파트맵 단지에 무조건 복사하지 않는다.',
 '- 원본 집계 세대수와 리치고의 개별 단지 세대수가 다르다면 공식 단지 범위를 확인해 분할 매핑할 필요가 있다.',
 '- 공개 상세페이지가 없거나 FAR가 없으면 임의로 수치를 생성하지 않는다.',
 '- 남은 237개에 대해 관련 후보 링크, 좌표 거리, 연도, 세대수, 사유를 docs/richgo-6to10-unresolved237-20261118.csv에 모두 수록했다.',
 '- 6억원 이하 원본과 타 금액대 단지 데이터는 수정하지 않았고 운영에 배포하지 않았다.',
 ''
].join('\n');
const writes={
 'docs/richgo-6to10-unresolved237-20261118.csv':toCsv(['name','area','reason_code','reason','old_review_status','current_status','map_units','map_year','map_far','source_name','source_url','source_far','source_units','source_year','distance_m','name_similarity','map_source_count','other_candidates'],entries),
 'docs/richgo-6to10-unresolved237-report-20261118.md':summary
};
console.log('FINAL_EXCEPTIONS',JSON.stringify({total:1822,verified,remaining:entries.length,farMissing:1822-far,corrections:fixes.length,counts}));
async function save(){
 if(!process.env.GITHUB_TOKEN){for(const [p,c] of Object.entries(writes)){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),c);}return;}
 const rep=process.env.GITHUB_REPOSITORY,br=process.env.GITHUB_REF_NAME,headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 for(const [file,content] of Object.entries(writes)){
  const url='https://api.github.com/repos/'+rep+'/contents/'+file;
  const read=await fetch(url+'?ref='+encodeURIComponent(br),{headers});
  if(!read.ok&&read.status!==404)throw Error('GET '+read.status);
  const prev=read.ok?await read.json():null,body={branch:br,message:'docs(cap10): classify all 237 unresolved Richgo identity exceptions '+file,content:Buffer.from(content).toString('base64')};
  if(prev?.sha)body.sha=prev.sha;
  const result=await fetch(url,{method:'PUT',headers,body:JSON.stringify(body)});
  if(!result.ok)throw Error('Cannot publish '+file+' '+result.status+' '+(await result.text()).slice(0,230));
  console.log('PUBLISHED',file);
 }
}
save().catch(e=>{console.error('EXCEPTION_REPORT_FAILED',e.stack||String(e));process.exitCode=1});
