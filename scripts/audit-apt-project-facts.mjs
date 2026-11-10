/**
 * Dated project evidence compared with actual apartment candidate data.
 * Read-only. No scoring adjustments. Records do not imply completion of a project.
 * Run TRANSPORT_INPUTS=... node scripts/audit-apt-project-facts.mjs --root /tmp/aptmap-master --out /tmp/apt-project-facts.json
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {run} from './transport-runtime.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const fromArg=key=>{const i=process.argv.indexOf(key);return i===-1?null:process.argv[i+1];};
const root=path.resolve(fromArg('--root')||path.join(dir,'..'));
const sourceFile=path.resolve(fromArg('--evidence')||path.join(dir,'../docs/audit-redevelopment-registry.json'));
const clean=s=>String(s||'').replace(/\s+/g,'').replace(/[()（）.,·\-]/g,'').replace(/아파트$/,'');
const place=s=>String(s||'').trim().replace(/^(안양|성남|수원|고양)시 /,'$1 ');
const id=(name,area)=>clean(name)+'|'+place(area);

export function compareProject(project, candidates){
 const out={project_id:project.id,project_name:project.project_name,status:project.status,
   status_basis:project.evidence?.map(e=>({date:e.date,url:e.url,type:e.type}))||[],
   members:[],observations:[],issues:[]};
 const memberSum=(project.members||[]).reduce((a,x)=>a+x.existing_units,0);
 if(memberSum!==project.existing_households_project)
   out.issues.push({severity:'error',code:'PROJECT_MEMBER_SUM_DIFFERS_FROM_SOURCE',
    member_sum:memberSum,declared_sum:project.existing_households_project});
 const candidatesById=new Map();
 for(const c of candidates){const key=id(c.n,c.area);
   if(!candidatesById.has(key))candidatesById.set(key,[]);
   candidatesById.get(key).push(c);
 }
 for(const member of project.members||[]){
   const matched=candidatesById.get(id(member.name,member.area))||[];
   const unique=new Map();
   for(const x of matched)if(!unique.has(x.key))unique.set(x.key,x);
   const data=[...unique.values()],units=[...new Set(data.map(x=>x.units).filter(Number.isFinite))];
   out.members.push({name:member.name,area:member.area,reference_units:member.existing_units,
     candidate_units:units,flat_count:matched.length,
     caps:[...new Set(matched.map(x=>x.cap))].sort((a,b)=>a-b)});
   if(!data.length)out.issues.push({severity:'review',code:'PROJECT_MEMBER_NOT_IN_RELEVANT_PRICE_BANDS',
     member:member.name,detail:'May be legitimately outside available price ranges'});
   if(units.length&&units.some(n=>n!==member.existing_units))
     out.issues.push({severity:'review',code:'EXISTING_HOUSEHOLDS_CONFLICT',
       member:member.name,model_units:units,evidence_units:member.existing_units});
   for(const x of matched){
     out.observations.push({cap:x.cap,name:x.n,py:x.py,p:x.p,rank:x.rank,score:x.score,
       units:x.units,year:x.year,stage:x.stage,dead:x.dead,
       quality_age_score:x.m3?.raw?.Q??null,price_penalty:x.m3?.penalties?.price??null});
     if(x.dead>=.5){
       out.issues.push({severity:'review',code:'ACTIVE_PLAN_WITH_DIFFICULTY_BADGE',
         member:x.n,cap:x.cap,py:x.py,detail:'Official plan is at public-review stage; model-financial feasibility should not override stage wording'});
     }
   }
 }
 return out;
}
function getCandidates(){
 let list=[];
 for(const cap of [10,15,20,25,30]){
  const result=run(root,cap);
  if(result.missing?.length)throw Error('Missing '+cap+' assets '+result.missing.join(','));
  const obj=JSON.parse(vm.runInContext(`JSON.stringify(ORDER.map(d=>({
     cap:${cap}, key:d.cxKey,n:d.n,area:d.area,py:d.py,p:d.p,rank:d.rank,score:d.score,
     year:d.year,units:d.units,stage:typeof stOf==='function'?stOf(d):null,
     dead:d.dead||0,m3:d.m3||null})))`,result.c));
  list.push(...obj);
 }
 return list;
}
function main(){
 const reg=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
 if(!reg.projects?.length)throw Error('Evidence registry is empty');
 const candidates=getCandidates(),projects=reg.projects.map(p=>compareProject(p,candidates));
 const issues=projects.flatMap(x=>x.issues);
 const report={source:'dated_grounded_project_registry',sourceFile,
  dataSnapshot:'frozen backup if TRANSPORT_INPUTS used; NOT real-time government data',
  currentHouseholdsCannotBeReplacedByFuturePlan:true,
  projects,issues:{error:issues.filter(x=>x.severity==='error').length,
    review:issues.filter(x=>x.severity==='review').length}};
 const out=fromArg('--out');if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 if(report.issues.error)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
