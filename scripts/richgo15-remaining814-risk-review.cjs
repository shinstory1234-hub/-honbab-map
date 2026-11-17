'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),at=p=>path.join(root,p);
function parse(s){let arr=[],r=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){r.push(v);v=''}else if(c==='\n'){r.push(v.replace(/\r$/,''));arr.push(r);r=[];v=''}else v+=c;}const keys=arr.shift();return arr.filter(r=>r.length===keys.length).map(r=>Object.fromEntries(keys.map((k,j)=>[k,r[j]])));}
const top=parse(fs.readFileSync(at('docs/richgo-10to15-top300-20261118.csv'),'utf8'));
const remaining=parse(fs.readFileSync(at('docs/richgo-10to15-remaining814-20261118.csv'),'utf8'));
if(top.length!==300||remaining.length!==814)throw Error('Unexpected report inventory');
const all=[...top,...remaining],byId=new Map();
for(const r of all)if(r.richgo_id){const a=byId.get(r.richgo_id)||[];a.push(r);byId.set(r.richgo_id,a)}
const risk=[];
for(const r of remaining){
 if(r.verification!=='직접확인')continue;
 const siblings=byId.get(r.richgo_id)||[],combined=siblings.filter(x=>x.name+'|'+x.area!==r.name+'|'+r.area);
 const mr=Number(r.map_units),rr=Number(r.richgo_units),my=Number(r.map_year),ry=Number(r.richgo_year);
 const reasons=[];
 if(combined.length&&siblings.some(x=>x.verification==='집계단위불일치'))reasons.push('shares ID with previously unresolved split group');
 if(combined.length&&siblings.some(x=>x.map_units&&x.richgo_units&&Number(x.map_units)!==Number(x.richgo_units))){
   const rawTotal=siblings.reduce((n,x)=>n+(Number(x.map_units)||0),0);
   if(rr&&Math.abs(rawTotal-rr)/rr<.05&&siblings.every(x=>Number(x.map_units)!==rr))reasons.push('split subgroup sum equals total Richgo complex');
 }
 if(my&&ry&&Math.abs(my-ry)>=8&&mr&&rr&&Math.max(mr/rr,rr/mr)>=1.2)reasons.push('year and household mismatch');
 if(mr&&rr&&Math.max(mr/rr,rr/mr)>=2.5&&r.name.replace(/[^가-힣a-zA-Z]/g,'').length<=8)reasons.push('generic name has >2.5x household mismatch');
 if(reasons.length)risk.push({name:r.name,area:r.area,id:r.richgo_id,origUnits:mr,richgoUnits:rr,origYear:my,richgoYear:ry,matchedName:r.richgo_name,score:r.audit_match_quality,reasons,related:combined.map(x=>({name:x.name,status:x.verification,units:x.map_units}))});
}
const classification={checked:remaining.filter(r=>r.checked_at).length,verified:remaining.filter(r=>r.verification==='직접확인').length,notMatch:remaining.filter(r=>r.verification!=='직접확인').length,missingURLs:remaining.filter(r=>!r.source_url).length,riskyDirect:risk.length};
fs.writeFileSync(at('docs/richgo-10to15-remaining814-risk-review.json'),JSON.stringify({classification,risk},null,2)+'\n');
console.log('REMAINING814_RISK',JSON.stringify(classification));for(const r of risk)console.log('FLAG',r.name,r.area,r.reasons.join(' | '));
