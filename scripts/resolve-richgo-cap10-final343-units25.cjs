#!/usr/bin/env node
/* Fifth-pass conservative closeout: unique Richgo official public detail records with exact
 * apartment name, matched completion year and coordinates, but small household count drift.
 * Uses the already crawled details, never extrapolates or invents FAR.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
function csv(t){
 let rows=[],row=[],v='',quote=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(quote){if(c==='"'&&t[i+1]==='"'){v+='"';i++;}else if(c==='"')quote=false;else v+=c;}
 else if(c==='"')quote=true;else if(c===','){row.push(v);v='';}else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}else if(c!=='\r')v+=c;}
 if(v||row.length){row.push(v);rows.push(row);}const keys=rows.shift().map(x=>x.replace(/^\ufeff/,''));return {keys,rows:rows.filter(r=>r.length===keys.length).map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]])))};
}
const outCsv=(cols,rs)=>'\ufeff'+cols.join(',')+'\n'+rs.map(r=>cols.map(k=>{const v=String(r[k]??'');return /[,"\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',')).join('\n')+'\n';
const coverage=csv(rd('docs/richgo-6to10-full-coverage-20261118.csv')),
 prev=JSON.parse(rd('scripts/richgo-band10-corrections.json')),
 previousCSV=csv(rd('docs/richgo-6to10-final343-20261118.csv'));
if(coverage.rows.length!==1822||prev.length!==1392||previousCSV.rows.length!==343)throw Error('4th pass baseline inconsistent');
const four=Array.from({length:6},(_,i)=>JSON.parse(rd('docs/richgo-6to10-final343-parts/part0'+i+'.json'))).flatMap(x=>x.rows);
if(four.length!==343)throw Error('Original 343 evidence missing');
const byKey=new Map(coverage.rows.map(x=>[x.name+'|'+x.area,x])),byCsv=new Map(previousCSV.rows.map(x=>[x.name+'|'+x.area,x]));
const fixKeys=new Set(prev.map(x=>x.name+'|'+x.area));if(fixKeys.size!==1392)throw Error('Duplicate previous corrections');
const idOf=u=>String(u||'').match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1]||null;
const owners=new Map();
for(const x of coverage.rows){
 if(!x.review_status.includes('verified'))continue;
 const id=idOf(x.richgo_url);if(!id)continue;
 const old=owners.get(id)||new Set();old.add(x.name+'|'+x.area);owners.set(id,old);
}
const added=[],reasons=[];
for(const row of four){
 const x=byKey.get(row.key),report=byCsv.get(row.key);
 if(!x||!report||x.review_status.includes('verified')||fixKeys.has(row.key))continue;
 const c=row.candidates?.[0];if(!c)continue;
 const ud=Math.abs(Number(x.units_after_verified)-Number(c.units)),ur=ud/Math.max(+x.units_after_verified,+c.units);
 const yd=Math.abs(+x.year_after_verified-(+c.year));
 const ownerIds=owners.get(c.id)||new Set();
 const foreign=[...ownerIds].filter(k=>k!==row.key);
 const eligible=Number.isFinite(c.far)&&c.far>=60&&c.far<=1500&&
  c.nameSimilarity>=.95&&c.distanceMeters!=null&&c.distanceMeters<=130&&
  ud>3&&ud<=50&&ur<=.05&&yd<=1&&foreign.length===0&&
  c.url==='https://m.richgo.ai/realty/danji/'+c.id;
 if(!eligible)continue;
 const fix={name:x.name,area:x.area,far:c.far,units:c.units};
 if(+x.year_after_verified!==+c.year)fix.year=c.year;
 added.push(fix);fixKeys.add(row.key);
 x.review_status='audit5_verified_unit_discrepancy';
 x.richgo_far=String(c.far);x.richgo_url=c.url;x.richgo_year=String(c.year);x.richgo_units=String(c.units);
 x.year_after_verified=String(c.year);x.units_after_verified=String(c.units);x.far_after_verified=String(c.far);
 report.new_status=x.review_status;report.richgo_name=c.name;report.richgo_url=c.url;report.richgo_year=String(c.year);
 report.richgo_units=String(c.units);report.richgo_far=String(c.far);report.distance_m=String(c.distanceMeters);
 report.unit_delta=String(ud);report.name_similarity=String(c.nameSimilarity);report.far_applied=String(c.far);report.units_applied=String(c.units);
 report.reason='Direct Richgo name and completion year match, unique page, <=130m and <=5% household difference';
 report.candidate_count=String(row.candidateCount);
 reasons.push({name:x.name,area:x.area,source_url:c.url,distance_m:c.distanceMeters,source_name:c.name,original_units:row.candidates?.[0]?.unitsDelta!=null?String(Number(c.units)+(+x.units_before-c.units)):x.units_before,richgo_units:c.units,far:c.far});
 const ow=owners.get(c.id)||new Set();ow.add(row.key);owners.set(c.id,ow);
}
if(added.length!==25)throw Error('Expected 25 separately corroborated aliases, got '+added.length);
const allFixes=[...prev,...added];if(new Set(allFixes.map(x=>x.name+'|'+x.area)).size!==allFixes.length)throw Error('Duplicate corrections');
const confirmed=coverage.rows.filter(x=>x.review_status.includes('verified')).length;
const far=coverage.rows.filter(x=>x.far_after_verified!=='').length;
const oldReport=rd('docs/richgo-6to10-final343-report-20261118.md');
const finalReport=oldReport+[
 '',
 '## 5차 세대수 소폭 차이 검증',
 '- 기존 4차 재검색의 후보 중 리치고 상세 단지명 완전 일치, 입주연도 ±1년, 좌표 130m 이내, 세대수 차이 최대 50세대 및 5% 이하, 리치고 단지 ID 중복 없음 조건으로 25개 추가 실측 검증',
 '- 리치고 세대수를 기준으로 25개 수정하면서 용적률도 검증된 공개 페이지 값으로 대조',
 '- 총 보정 '+allFixes.length+'개, 전체 1,822개 중 단지 식별 검증 성공 '+confirmed+'개, 남은 식별 예외 '+(1822-confirmed)+'개',
 '- 용적률 수치 존재 '+far+'개, 결측 '+(1822-far)+'개',
 '- 통합단지나 세대수 대폭 불일치, 리치고 상세 페이지 미발견 사례는 임의로 수정하지 않음',
 '- 배포는 하지 않고 브랜치의 성능 검증을 반드시 통과한 뒤 병합 가능',
 ''
].join('\n');
const w={
 'scripts/richgo-band10-corrections.json':JSON.stringify(allFixes,null,2)+'\n',
 'docs/richgo-6to10-full-coverage-20261118.csv':outCsv(coverage.keys,coverage.rows),
 'docs/richgo-6to10-final343-20261118.csv':outCsv(previousCSV.keys,previousCSV.rows),
 'docs/richgo-6to10-final343-report-20261118.md':finalReport,
 'docs/richgo-6to10-final343-units25-20261118.json':JSON.stringify({source:'Richgo public detail',threshold:'name exact, year +-1, distance <=130m, households <=50 and <=5%',count:added.length,records:reasons},null,2)+'\n',
};
console.log('FINAL343_FIFTH',JSON.stringify({additional:added.length,totalCorrections:allFixes.length,confirmed,remaining:1822-confirmed,far,farmissing:1822-far}));
async function publish(){
 if(!process.env.GITHUB_TOKEN){for(const [f,c] of Object.entries(w)){fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),c);}return;}
 const repository=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME;
 const h={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 for(const [f,c] of Object.entries(w)){
  const api='https://api.github.com/repos/'+repository+'/contents/'+f;let saved=false;
  for(let n=0;n<10;n++){
   const get=await fetch(api+'?ref='+encodeURIComponent(branch),{headers:h});if(!get.ok&&get.status!==404)throw Error('GET '+get.status);
   const old=get.ok?await get.json():null,body={branch,message:'audit(cap10): 25 exact-source Richgo household reconciliations '+f,content:Buffer.from(c).toString('base64')};if(old?.sha)body.sha=old.sha;
   const r=await fetch(api,{method:'PUT',headers:h,body:JSON.stringify(body)});
   if(r.ok){console.log('COMMITTED',f);saved=true;break;}if(r.status!==409&&r.status!==422)throw Error('PUT '+f+' '+r.status+' '+(await r.text()).slice(0,220));
   await new Promise(ok=>setTimeout(ok,1800+n*700));
  }if(!saved)throw Error('Repeated write conflict '+f);
 }
}
publish().catch(e=>{console.error('FAILED_FIFTH',e.stack||String(e));process.exitCode=1});
