#!/usr/bin/env node
/* Sixth pass: high-confidence correction of wrongly aggregated raw household counts.
 * Richgo exact complex-name equivalence, same construction year, unique source page,
 * geographic distance <=200 m; no near-name guess and no shared source pages.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function parseCSV(t){
 const rows=[];let row=[],cell='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}
 else if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else if(c!=='\r')cell+=c;}
 if(cell||row.length){row.push(cell);rows.push(row);}
 const cols=rows.shift().map(c=>c.replace(/^\ufeff/,''));return {cols,rows:rows.filter(r=>r.length===cols.length).map(x=>Object.fromEntries(cols.map((c,i)=>[c,x[i]])))};
}
const emit=(cols,rows)=>'\ufeff'+cols.join(',')+'\n'+rows.map(r=>cols.map(k=>{const v=String(r[k]??'');return /[,"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\n')+'\n';
const all=parseCSV(read('docs/richgo-6to10-full-coverage-20261118.csv')),
 tab=parseCSV(read('docs/richgo-6to10-final343-20261118.csv')),
 fixes=JSON.parse(read('scripts/richgo-band10-corrections.json')),
 evidence=Array.from({length:6},(_,i)=>JSON.parse(read('docs/richgo-6to10-final343-parts/part0'+i+'.json'))).flatMap(x=>x.rows);
if(all.rows.length!==1822||tab.rows.length!==343||fixes.length!==1417||evidence.length!==343)throw Error('Invalid baseline before 6th pass');
const byKey=new Map(all.rows.map(x=>[x.name+'|'+x.area,x])),csvByKey=new Map(tab.rows.map(x=>[x.name+'|'+x.area,x]));
const fixed=new Set(fixes.map(x=>x.name+'|'+x.area)),idOf=s=>String(s||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1]||null;
const owners=new Map();
for(const row of all.rows){if(!row.review_status.includes('verified'))continue;const id=idOf(row.richgo_url);if(!id)continue;
 const a=owners.get(id)||new Set();a.add(row.name+'|'+row.area);owners.set(id,a);}
const submitted=[],proof=[];
for(const e of evidence){
 const x=byKey.get(e.key),t=csvByKey.get(e.key);if(!x||!t||fixed.has(e.key)||x.review_status.includes('verified'))continue;
 if(/저층|고층|임대|오피스텔/.test(x.name))continue;
 const list=(e.candidates||[]).filter(c=>
   c.name.length>=6&&c.nameSimilarity>=.95&&c.distanceMeters!=null&&c.distanceMeters<=200&&
   Number.isInteger(c.year)&&Math.abs(+x.year_after_verified-c.year)<=2&&
   Number.isInteger(c.units)&&c.units>0&&Number.isInteger(c.far)&&c.far>=60&&c.far<=1500&&
   (Math.abs(+x.units_after_verified-c.units)/Math.max(+x.units_after_verified,c.units))>.05&&
   c.url==='https://m.richgo.ai/realty/danji/'+c.id&&
   !(owners.get(c.id)||new Set()).has(e.key)&&!(owners.get(c.id)||new Set()).size);
 // There can be multiple dissimilar candidates nearby, but only one exact-name match.
 if(list.length!==1)continue;
 const c=list[0];
 const fix={name:x.name,area:x.area,far:c.far,year:c.year,units:c.units};
 submitted.push(fix);fixed.add(e.key);
 x.review_status='audit6_verified_source_scope_correction';x.far_after_verified=String(c.far);
 x.year_after_verified=String(c.year);x.units_after_verified=String(c.units);
 x.richgo_year=String(c.year);x.richgo_far=String(c.far);x.richgo_units=String(c.units);x.richgo_url=c.url;
 t.new_status=x.review_status;t.richgo_name=c.name;t.richgo_url=c.url;t.richgo_year=String(c.year);
 t.richgo_units=String(c.units);t.richgo_far=String(c.far);t.distance_m=String(c.distanceMeters);
 t.unit_delta=String(Math.abs(+t.map_units-c.units));t.name_similarity=String(c.nameSimilarity);
 t.far_applied=String(c.far);t.units_applied=String(c.units);
 t.reason='Physical complex identity verified by exact Richgo name, same completion year, <=200m coordinate proximity and unique source page. Corrected outdated merged unit count.';
 const u=owners.get(c.id)||new Set();u.add(e.key);owners.set(c.id,u);
 proof.push({name:x.name,area:x.area,original_units:x.units_before,richgo_units:c.units,richgo_far:c.far,
  source_name:c.name,url:c.url,meters:c.distanceMeters,year_before:x.year_before,year_after:c.year});
}
if(submitted.length!==20)throw Error('Expected 20 strongly verified scope corrections, got '+submitted.length);
const result=[...fixes,...submitted];if(new Set(result.map(x=>x.name+'|'+x.area)).size!==result.length)throw Error('Duplicate cap10 corrections');
const verified=all.rows.filter(r=>r.review_status.includes('verified')).length;
const far=all.rows.filter(r=>r.far_after_verified!=='').length;
const prior=read('docs/richgo-6to10-final343-report-20261118.md');
const report=prior+'\n## 6차 단지 범위와 세대수 원본 오류 복원\n'+
 '- 리치고 단지 이름 정확 대응, 입주연도 차이 2년 이내, 좌표 거리 200미터 이하, 소스 URL 독립 확인 및 FAR 수치가 있는 건 중 원본 세대수 5% 초과 오류 20개를 추가 복원\n'+
 '- 기존 세대수 대량 오류를 리치고 공개 상세 실측 세대수로 정정. 출처와 비교 수치는 docs/richgo-6to10-final343-source20-20261118.json 참조\n'+
 '- 단지 식별 검증 성공 '+verified+'개, 검증 보류 '+(1822-verified)+'개, 용적률 수치 확보 '+far+'개, 공란 '+(1822-far)+'개, 전체 보정 '+result.length+'개\n'+
 '- 리치고 페이지 중복과 통합단지 분리 불확실, 공개 출처 없는 단지는 이번 자동 수정에서 제외\n';
console.log('SIXTH_RECONCILIATION',JSON.stringify({added:submitted.length,totalCorrections:result.length,verified,remaining:1822-verified,far,blank:1822-far}));
const w={
 'scripts/richgo-band10-corrections.json':JSON.stringify(result,null,2)+'\n',
 'docs/richgo-6to10-full-coverage-20261118.csv':emit(all.cols,all.rows),
 'docs/richgo-6to10-final343-20261118.csv':emit(tab.cols,tab.rows),
 'docs/richgo-6to10-final343-report-20261118.md':report,
 'docs/richgo-6to10-final343-source20-20261118.json':JSON.stringify({date:'2026-11-18',count:proof.length,evidence:proof},null,2)+'\n'
};
async function publish(){
 if(!process.env.GITHUB_TOKEN){for(const [p,c] of Object.entries(w)){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),c);}return;}
 const repo=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME;
 const headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 for(const [file,content] of Object.entries(w)){
  const url='https://api.github.com/repos/'+repo+'/contents/'+file;let success=false;
  for(let n=0;n<9;n++){const v=await fetch(url+'?ref='+encodeURIComponent(branch),{headers});
   if(!v.ok&&v.status!==404)throw Error('GET '+v.status+' '+file);
   const old=v.ok?await v.json():null,body={message:'audit(cap10): restore exact-name Richgo grouped household error '+file,branch,content:Buffer.from(content).toString('base64')};if(old?.sha)body.sha=old.sha;
   const r=await fetch(url,{method:'PUT',headers,body:JSON.stringify(body)});
   if(r.ok){success=true;console.log('COMMITTED',file);break;}
   if(r.status!==409&&r.status!==422)throw Error('PUT '+r.status+' '+file+' '+(await r.text()).slice(0,250));
   await new Promise(ok=>setTimeout(ok,1800+n*650));
  }if(!success)throw Error('Too many update conflicts '+file);
 }
}
publish().catch(e=>{console.error('SIXTH_FAILED',e.stack||String(e));process.exitCode=1});
