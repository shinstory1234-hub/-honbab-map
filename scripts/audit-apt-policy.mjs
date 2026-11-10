/**
 * Static design checks. Review findings are NOT assertions that an apartment is misranked.
 * No site/DB/network write; safe to run on a separate audit branch.
 * Run: node scripts/audit-apt-policy.mjs [--out /tmp/apt-policy.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=x=>fs.readFileSync(path.join(root,'public',x),'utf8');
export function inspectPolicy({m3,map,s4}){
 const findings=[],push=(code,severity,description,evidence)=>findings.push({code,severity,description,evidence});
 const fn=m3.slice(m3.indexOf('function compute('),m3.indexOf('function apply('));
 if(fn.includes('Q:Number.isFinite(years)')&&fn.includes('ageCurve')&&!/stOf\(|stage\(|redevelop|reconstruction|정비단계|재건축\s*진행/.test(fn))
   push('REDEVELOPMENT_PROGRESS_NOT_IN_M3_QUALITY','review',
    'M3 quality is based on building age, not declared redevelopment progress',
    'public/apt-m3.js compute(): Q uses 2026-year and ageCurve');
 if(/const score=clamp\([^\n]*-pricePenalty\)/.test(fn))
   push('PRICE_CONFIDENCE_DEDUCTED_FROM_QUALITY_SCORE','review',
    'Trade-evidence uncertainty lowers the same headline ranking score as building quality; distinguish purchase feasibility from quality',
    'public/apt-m3.js compute(): score subtracts pricePenalty');
 const fsStart=map.indexOf('function featureKeys(d)');
 const fsEnd=map.indexOf('const FILTERS',fsStart);
 const badges=fsStart>=0?map.slice(fsStart,fsEnd):'';
 const diff=badges.indexOf("else if(d.dead>=.5)");
 const stage=badges.indexOf("else if(stage>=35)");
 if(diff>=0&&stage>=0&&diff<stage)
   push('FEASIBILITY_BADGE_OVERRIDES_DECLARED_STAGE','review',
    'A difficult estimated feasibility value takes priority over a positive official-stage badge, so wording can be misread as project prohibition',
    'public/apt-map.html featureKeys: difficulty conditional precedes stage conditional');
 if(s4.includes('if(high)ta.w=0'))
   push('HIGH_BAND_WALK_PENALTY_DISABLED','info',
    'Upper-band walking penalty is disabled in S4; M3 transport separately considers access. Test transit consistency before editing either.',
    'public/apt-s4.js: if(high)ta.w=0');
 if(!m3.includes('root.APT_M3='))
   push('M3_RUNTIME_NOT_REGISTERED','error','M3 scoring module missing export','public/apt-m3.js');
 return findings;
}
function main(){
 const data={m3:read('apt-m3.js'),map:read('apt-map.html'),s4:read('apt-s4.js')};
 const result={readOnly:true,source:'committed_source_code',liveDataVerified:false,
  timestamp:new Date().toISOString(),findings:inspectPolicy(data)};
 if(process.argv.includes('--out')){
   const i=process.argv.indexOf('--out'),file=process.argv[i+1];if(!file)throw Error('--out requires path');
   fs.writeFileSync(path.resolve(file),JSON.stringify(result,null,2)+'\n');
 }
 console.log(JSON.stringify(result,null,2));
 if(result.findings.some(f=>f.severity==='error'))process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
