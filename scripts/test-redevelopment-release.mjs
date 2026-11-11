/**
 * Release-gate comparison of frozen identical pricing/geo inputs across master and proposed 3-step model.
 * Run: TRANSPORT_INPUTS=/tmp/inputs node scripts/test-redevelopment-release.mjs --baseline-root /tmp/before --out /tmp/report.json
 * Read-only; does not edit either checkout or deploy anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {run} from './transport-runtime.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const opts=new Map(process.argv.slice(2).filter((x,i,a)=>x.startsWith('--')).map(x=>[x,process.argv[process.argv.indexOf(x)+1]]));
const baseline=opts.get('--baseline-root');
assert.ok(baseline&&fs.existsSync(path.resolve(baseline,'public/apt-map.html')),
  '--baseline-root must point to the prior master snapshot');
const caps=[6,10,15,20,25,30];
const record=(root,cap)=>{
  const {c,missing}=run(root,cap);
  assert.deepEqual(missing,[],'Required inputs missing at cap '+cap);
  return JSON.parse(vm.runInContext(`JSON.stringify(ORDER.map(d=>({
    id:d.cxKey+'|'+d.py,key:d.cxKey,n:d.n,area:d.area,py:d.py,
    p:d.p,score:d.score,rank:d.rank,units:d.units,
    model:d.m3?.model||null,bonus:d.m3?.bonuses?.verifiedProgress||0,
    evidence:d.m3?.verifiedProject||null,dead:d.dead,ageQuality:d.m3?.raw?.Q??null
  })))`,c));
};
const output={description:'same frozen input; all six price bands; official stage evidence ranking',root,baseline,
  protectedSixUnchanged:false,errors:[],bands:[]};
for(const cap of caps){
  const old=record(baseline,cap),newRows=record(root,cap);
  const ref=new Map(old.map(x=>[x.id,x])),dst=new Map(newRows.map(x=>[x.id,x]));
  const missing=old.filter(x=>!dst.has(x.id)),added=newRows.filter(x=>!ref.has(x.id));
  const delta=[],withoutEvidence=[];
  for(const x of newRows){
    const y=ref.get(x.id);if(!y)continue;
    if(x.p!==y.p||x.units!==y.units)
      output.errors.push({cap,code:'RAW_PRICE_OR_UNITS_CHANGED',key:x.id,before:{p:y.p,units:y.units},after:{p:x.p,units:x.units}});
    const changed=Math.abs(x.score-y.score)>1e-7;
    if(changed&&!x.evidence)withoutEvidence.push({key:x.id,before:y.score,after:x.score});
    if(changed){
      const expected=Math.min(100,y.score+x.bonus);
      if(x.score>expected+1e-5 || x.score<y.score-1e-7)
        output.errors.push({cap,code:'SCORE_CHANGE_NOT_EXPLAINED_BY_SOURCE',key:x.id,was:y.score,now:x.score,bonus:x.bonus});
      delta.push({key:x.id,oldRank:y.rank,newRank:x.rank,move:y.rank-x.rank,
        scoreDelta:+(x.score-y.score).toFixed(4),bonus:x.bonus,phase:x.evidence?.phase||null});
    }
    const lo=cap===6?0:cap===10?60000:(cap-5)*10000;
    if(x.p<=lo||x.p>cap*10000)output.errors.push({cap,code:'OUTSIDE_PRICE_BAND',key:x.id,p:x.p});
  }
  if(missing.length||added.length)output.errors.push({cap,code:'CANDIDATES_CHANGED',missing:missing.map(x=>x.id).slice(0,5),added:added.map(x=>x.id).slice(0,5)});
  if(withoutEvidence.length)output.errors.push({cap,code:'NON_EVIDENCE_COMPLEX_SCORE_CHANGED',count:withoutEvidence.length,samples:withoutEvidence.slice(0,5)});
  if(cap===6){
    const identical=JSON.stringify(old)===JSON.stringify(newRows);
    output.protectedSixUnchanged=identical;
    if(!identical)output.errors.push({cap,code:'SIX_BAND_PROTECTED_CHANGED',before:old.length,after:newRows.length});
  }
  const oldTop=new Set(old.filter(x=>x.rank<=30).map(x=>x.id));
  const newTop=new Set(newRows.filter(x=>x.rank<=30).map(x=>x.id));
  const entering=[...newTop].filter(x=>!oldTop.has(x));
  const exiting=[...oldTop].filter(x=>!newTop.has(x));
  if(entering.length>3)output.errors.push({cap,code:'TOP30_CHURN_EXCEEDED_LIMIT',count:entering.length});
  output.bands.push({cap,before:old.length,after:newRows.length,
    modifiedScoredUnits:delta.length,missingUnits:missing.length,addedUnits:added.length,
    top30Entered:entering,top30Exited:exiting,
    maxRise:delta.reduce((a,x)=>x.move>a.move?x:a,{move:-Infinity}),
    maxDrop:delta.reduce((a,x)=>x.move<a.move?x:a,{move:Infinity}),
    changedEvidence:delta.filter(x=>x.bonus>0).length,
    samples:delta.slice(0,50)});
}
const testRegistry=fs.readFileSync(path.join(root,'public/apt-redevelopment-evidence.js'),'utf8');
const ctx={window:{}};vm.runInNewContext(testRegistry,ctx,{filename:'apt-redevelopment-evidence.js'});
const verified=ctx.window.APT_REDEV_FACTS||{};
const a5=['한가람(한양)','한가람(삼성)','한가람(두산)'];
for(const n of a5)if(verified[n+'|안양 동안구 관양동']?.zone!=='A-5')
  output.errors.push({code:'A5_MEMBER_NOT_MATCHED',name:n});
if(!output.bands.slice(1).some(x=>x.modifiedScoredUnits>0))
  output.errors.push({code:'NO_DOCUMENTED_PROJECT_RECOGNIZED'});
const json=JSON.stringify(output,null,2)+'\n';
const reportPath=opts.get('--out');
if(reportPath)fs.writeFileSync(path.resolve(reportPath),json);
console.log('REDEVELOPMENT_SCORE_AUDIT',JSON.stringify({protectedSixUnchanged:output.protectedSixUnchanged,errors:output.errors.length,
  bands:output.bands.map(x=>({cap:x.cap,n:x.after,modified:x.modifiedScoredUnits,top30:x.top30Entered.length,
    maxRise:x.maxRise.move,maxDrop:x.maxDrop.move,examples:x.samples.slice(0,4)}))}));
if(output.errors.length)throw Error('Release audit found '+output.errors.length+' blocking error(s). Check full JSON report.');
