#!/usr/bin/env node
/* Richgo public-source manual identity reconciliations for legacy complex aliases.
 * Every source URL is drawn from the complete publicly crawled administrative-dong listing.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
function csv(t){
 let arr=[],row=[],s='',quoted=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(quoted){if(c==='"'&&t[i+1]==='"'){s+='"';i++;}else if(c==='"')quoted=false;else s+=c;}
 else if(c==='"')quoted=true;else if(c===','){row.push(s);s='';}else if(c==='\n'){row.push(s.replace(/\r$/,''));arr.push(row);row=[];s='';}else if(c!=='\r')s+=c;}
 if(s||row.length){row.push(s);arr.push(row);}const cols=arr.shift().map(x=>x.replace(/^\ufeff/,''));return {cols,rows:arr.filter(r=>r.length===cols.length).map(r=>Object.fromEntries(cols.map((k,i)=>[k,r[i]])))};
}
const toCSV=(cols,rows)=>'\ufeff'+cols.join(',')+'\n'+rows.map(r=>cols.map(k=>{const s=String(r[k]??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n')+'\n';
const mapping=[
 ['진양상가','서울 중구 충무로4가','a9QcWYI'],
 ['주공2','서울 노원구 월계동','a2yQdLu'],
 ['동아(1차)','인천 부평구 부평동','a3QBfAn'],
 ['더샵지제역센트럴파크1BL','평택시 동삭동','a3DVJSm'],
 ['우만주공2단지','수원 팔달구 우만동','a0OGzUG'],
 ['백송마을(엘지에스케이)','부천 원미구 상동','a3jMqAl'],
 ['성원1차이화','의왕시 오전동','a5FZIKR'],
 ['SK','용인 기흥구 서천동','a0UXjDH'],
 ['진도','남양주시 와부읍','a8hBBMb'],
];
const coverage=csv(rd('docs/richgo-6to10-full-coverage-20261118.csv'));
const final=csv(rd('docs/richgo-6to10-force237-final-20261118.csv'));
const fixes=JSON.parse(rd('scripts/richgo-band10-corrections.json'));
const catalogs=Array.from({length:6},(_,i)=>JSON.parse(rd('docs/richgo-6to10-force237-catalog-parts/part0'+i+'.json'))).flatMap(x=>x.rows);
if(coverage.rows.length!==1822||final.rows.length!==237||fixes.length!==1626||mapping.length!==9)throw Error('Original data scope changed');
const byKey=new Map(coverage.rows.map(x=>[x.name+'|'+x.area,x])),audits=new Map(final.rows.map(x=>[x.name+'|'+x.area,x])),samples=new Map(catalogs.map(x=>[x.key,x])),already=new Set(fixes.map(x=>x.name+'|'+x.area));
const recorded=[];
for(const [name,area,id] of mapping){
 const key=name+'|'+area,source=byKey.get(key),row=audits.get(key),e=samples.get(key);
 if(!source||!row||!e||row.richgo_url||source.review_status.includes('verified')||already.has(key))throw Error('Resolved or missing name '+key);
 const matches=e.candidates.filter(x=>x.id===id);
 if(matches.length!==1)throw Error('Richgo source missing from full public neighborhood catalog '+key);
 const selected=matches[0],other=e.candidates.filter(x=>x.id!==id&&x.score>selected.score+10&&x.distance_m<150);
 const sameYear=Math.abs(selected.year-Number(source.year_after_verified))<=2,near=selected.distance_m!=null&&selected.distance_m<=900;
 if(!sameYear||!near||!Number.isInteger(selected.units)||selected.units<1||other.length>0)throw Error('Manual identity evidence does not uniquely fit '+key);
 const far=Number.isFinite(selected.far)&&selected.far>=60&&selected.far<=1500;
 const fix={name,area,year:selected.year,units:selected.units};
 if(far)fix.far=selected.far;else fix.clearFar=true;
 fixes.push(fix);already.add(key);
 const old={units:Number(source.units_after_verified),year:Number(source.year_after_verified),far:source.far_after_verified};
 source.review_status='audit9_richgo_verified_manual_alias';
 source.units_after_verified=String(selected.units);source.year_after_verified=String(selected.year);
 source.far_after_verified=far?String(selected.far):'';
 source.richgo_year=String(selected.year);source.richgo_units=String(selected.units);
 source.richgo_far=far?String(selected.far):'';source.richgo_url=selected.url;
 row.final_status=source.review_status;row.matching_method='full_public_catalog_manual_alias';
 row.richgo_name=selected.name;row.richgo_url=selected.url;
 row.richgo_far=far?String(selected.far):'';row.richgo_units=String(selected.units);
 row.richgo_year=String(selected.year);row.richgo_distance_m=String(selected.distance_m);
 row.name_similarity=String(selected.similarity);
 row.unit_difference=String(selected.unit_delta);
 row.reason='Richgo site same complex confirmed by public area, position, source entity number, completion year and distinctive legacy alias';
 recorded.push({name,area,original:old,source:{url:selected.url,name:selected.name,far:selected.far,year:selected.year,units:selected.units,distance_m:selected.distance_m}});
}
if(recorded.length!==9||new Set(fixes.map(x=>x.name+'|'+x.area)).size!==fixes.length)throw Error('Source correction count or uniqueness mismatch');
const pending=final.rows.filter(x=>!x.richgo_url);
const verified=coverage.rows.filter(x=>x.review_status.includes('verified')).length;
const far=coverage.rows.filter(x=>x.far_after_verified!=='').length;
const report=rd('docs/richgo-6to10-force237-final-report-20261118.md')+[
 '',
 '## 9차 공개 리치고 원본 개별 명칭 재검증',
 '- 최초 237개 보류 단지에 대한 행정동 전체 목록 재조사 후 이름이 서로 달라 보수적 자동 추출에서 남은 9개를 정식 공개 상세페이지와 대조하여 추가 수정',
 '- 목록: docs/richgo-6to10-force237-manual9-20261118.json',
 '- 누적 리치고 단지 동일성 확인 '+verified+'개, 최종 보류 '+pending.length+'개, 최종 수정 '+fixes.length+'개',
 '- 용적률 수치 존재 '+far+'개, 리치고 공란 포함 미확인 '+(1822-far)+'개',
 '- 복수 블록으로 합쳐진 아파트맵 단지명과 다른 명칭의 중복 단지는 다른 리치고 물리적 단지의 수치를 억지로 넣지 않고 남겨둠',
 ''
].join('\n');
const payload={
 'scripts/richgo-band10-corrections.json':JSON.stringify(fixes,null,2)+'\n',
 'docs/richgo-6to10-full-coverage-20261118.csv':toCSV(coverage.cols,coverage.rows),
 'docs/richgo-6to10-force237-final-20261118.csv':toCSV(final.cols,final.rows),
 'docs/richgo-6to10-force237-no-source-20261118.csv':toCSV(final.cols,pending),
 'docs/richgo-6to10-force237-final-report-20261118.md':report,
 'docs/richgo-6to10-force237-manual9-20261118.json':JSON.stringify(recorded,null,2)+'\n'
};
console.log('RICHGO_MANUAL9',JSON.stringify({additional:recorded.length,verified,pending:pending.length,totalFixes:fixes.length,far,farMissing:1822-far}));
async function save(){
 if(!process.env.GITHUB_TOKEN){for(const [file,content] of Object.entries(payload)){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),content);}return;}
 const repo=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME,h={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 for(const [file,content] of Object.entries(payload)){
  const url='https://api.github.com/repos/'+repo+'/contents/'+file;let okay=false;
  for(let i=0;i<10;i++){
   const old=await fetch(url+'?ref='+encodeURIComponent(branch),{headers:h});if(!old.ok&&old.status!==404)throw Error('GET '+old.status+' '+file);
   const meta=old.ok?await old.json():null;
   const body={branch,message:'audit(cap10): finish 9 manually confirmed Richgo public source aliases '+file,content:Buffer.from(content).toString('base64')};
   if(meta?.sha)body.sha=meta.sha;
   const response=await fetch(url,{method:'PUT',headers:h,body:JSON.stringify(body)});
   if(response.ok){console.log('COMMITTED',file);okay=true;break;}
   if(![409,422].includes(response.status))throw Error('PUT '+file+' '+response.status+' '+(await response.text()).slice(0,300));
   await new Promise(r=>setTimeout(r,1500+i*600));
  }
  if(!okay)throw Error('Repeated GitHub conflicts '+file);
 }
}
save().catch(e=>{console.error('RICHGO_MANUAL9_FAILED',e.stack||String(e));process.exitCode=1});
