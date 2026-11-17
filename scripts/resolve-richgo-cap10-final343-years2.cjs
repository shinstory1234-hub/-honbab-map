#!/usr/bin/env node
/* Exact Richgo identity and household proof corrects two outlier completion years. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
function csv(t){
 const rows=[];let row=[],v='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}
 else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}else if(c!=='\r')v+=c;}
 if(v||row.length){row.push(v);rows.push(row);}const cols=rows.shift().map(x=>x.replace(/^\ufeff/,''));return {cols,rows:rows.filter(r=>r.length===cols.length).map(r=>Object.fromEntries(cols.map((c,i)=>[c,r[i]])))};
}
const emit=(h,rs)=>'\ufeff'+h.join(',')+'\n'+rs.map(r=>h.map(k=>{const s=String(r[k]??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n')+'\n';
const coverage=csv(rd('docs/richgo-6to10-full-coverage-20261118.csv')),
 audits=csv(rd('docs/richgo-6to10-final343-20261118.csv')),
 fixes=JSON.parse(rd('scripts/richgo-band10-corrections.json')),
 samples=Array.from({length:6},(_,i)=>JSON.parse(rd('docs/richgo-6to10-final343-parts/part0'+i+'.json'))).flatMap(x=>x.rows);
if(coverage.rows.length!==1822||audits.rows.length!==343||fixes.length!==1437)throw Error('6th pass baseline missing');
const confirmed=new Map(),all=new Map(coverage.rows.map(x=>[x.name+'|'+x.area,x]));
for(const x of coverage.rows)if(x.review_status.includes('verified')){const id=x.richgo_url.match(/\/realty\/danji\/(a[A-Za-z0-9]{6})/)?.[1];if(id)confirmed.set(id,x.name+'|'+x.area);}
const csvMap=new Map(audits.rows.map(x=>[x.name+'|'+x.area,x])),fixed=new Set(fixes.map(x=>x.name+'|'+x.area));
const targets=new Set(['DMC아트포레자이|서울 은평구 수색동','홍제역해링턴플레이스|서울 서대문구 홍제동']);
const applied=[],proof=[];
for(const row of samples){
 if(!targets.has(row.key))continue;
 const s=all.get(row.key),r=csvMap.get(row.key);if(!s||!r||s.review_status.includes('verified')||fixed.has(row.key))throw Error('Unexpected previous confirmation '+row.key);
 const accepted=(row.candidates||[]).filter(c=>c.nameSimilarity===1&&
  c.distanceMeters!=null&&c.distanceMeters<=65&&
  c.units===Number(s.units_after_verified)&&Math.abs(c.year-Number(s.year_after_verified))===3&&
  c.far>=60&&c.far<=1500&&confirmed.get(c.id)==null);
 if(accepted.length!==1)throw Error('Ambiguous year candidate '+row.key);
 const c=accepted[0],x={name:s.name,area:s.area,far:c.far,year:c.year};
 applied.push(x);fixed.add(row.key);s.review_status='audit7_verified_year_corrected';
 s.year_after_verified=String(c.year);s.far_after_verified=String(c.far);
 s.richgo_year=String(c.year);s.richgo_far=String(c.far);s.richgo_units=String(c.units);s.richgo_url=c.url;
 r.new_status=s.review_status;r.richgo_name=c.name;r.richgo_url=c.url;r.richgo_year=String(c.year);
 r.richgo_units=String(c.units);r.richgo_far=String(c.far);r.distance_m=String(c.distanceMeters);
 r.unit_delta='0';r.name_similarity=String(c.nameSimilarity);r.far_applied=String(c.far);
 r.reason='Richgo directly confirms identity, units and location; original construction year was 3 years newer than public completion year';
 proof.push({name:s.name,area:s.area,map_year:s.year_before,verified_richgo_year:c.year,units:c.units,far:c.far,source:c.url,meters:c.distanceMeters});
}
if(applied.length!==2)throw Error('Two independent year corrections required, got '+applied.length);
const end=[...fixes,...applied];if(new Set(end.map(x=>x.name+'|'+x.area)).size!==end.length)throw Error('Duplicate fixes');
const verified=coverage.rows.filter(x=>x.review_status.includes('verified')).length;
const far=coverage.rows.filter(x=>x.far_after_verified!=='').length;
console.log('SEVENTH_RECONCILIATION',JSON.stringify({additional:2,verified,remaining:1822-verified,totalCorrections:end.length,far,farMissing:1822-far}));
const report=rd('docs/richgo-6to10-final343-report-20261118.md')+
 '\n## 7차 리치고 입주연도 오류 직접 대조\n'+
 '- DMC아트포레자이(672세대, 원본 2026년 → 리치고 2023년)와 홍제역해링턴플레이스(1,116세대, 원본 2024년 → 리치고 2021년)의 동일 단지 및 준공연도를 직접 검증하고 수정\n'+
 '- 검증 대상 원래 343개 중 신규 식별 매칭 2개, 전체 '+verified+'개 확인, 검증 보류 '+(1822-verified)+'개\n'+
 '- 최종 보정 '+end.length+'건, 용적률 숫자 존재 '+far+'개, 공란 '+(1822-far)+'개\n';
const payload={
 'docs/richgo-6to10-full-coverage-20261118.csv':emit(coverage.cols,coverage.rows),
 'docs/richgo-6to10-final343-20261118.csv':emit(audits.cols,audits.rows),
 'scripts/richgo-band10-corrections.json':JSON.stringify(end,null,2)+'\n',
 'docs/richgo-6to10-final343-report-20261118.md':report,
 'docs/richgo-6to10-final343-years2-20261118.json':JSON.stringify(proof,null,2)+'\n'
};
async function save(){
 if(!process.env.GITHUB_TOKEN){for(const [f,c] of Object.entries(payload)){fs.mkdirSync(path.dirname(path.join(root,f)),{recursive:true});fs.writeFileSync(path.join(root,f),c);}return;}
 const repo=process.env.GITHUB_REPOSITORY,branch=process.env.GITHUB_REF_NAME,h={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 for(const [file,content] of Object.entries(payload)){
  const url='https://api.github.com/repos/'+repo+'/contents/'+file,old=await fetch(url+'?ref='+encodeURIComponent(branch),{headers:h});
  if(!old.ok&&old.status!==404)throw Error('GET '+old.status);
  const meta=old.ok?await old.json():null,body={branch,message:'audit(cap10): directly verify two Richgo year discrepancies '+file,content:Buffer.from(content).toString('base64')};if(meta?.sha)body.sha=meta.sha;
  const r=await fetch(url,{method:'PUT',headers:h,body:JSON.stringify(body)});if(!r.ok)throw Error('PUT '+r.status+' '+file+' '+(await r.text()).slice(0,240));
  console.log('PUBLISHED',file);
 }
}
save().catch(e=>{console.error('SEVENTH_FAILED',e.stack||String(e));process.exitCode=1});
