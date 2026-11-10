/**
 * No network / no deployment / no DB writes.
 * Audit committed HISTORICAL snapshots; this does NOT validate current live rankings.
 * Run: node scripts/audit-apt-snapshots.mjs [--out /tmp/apt-snapshot-audit.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SNAPSHOTS=[
  [6,'apt-snap6-2026-11-01-s14.json'],
  [10,'apt-snap10-2026-11-03-m2.json'],
  [15,'apt-snap15-2026-11-03-m2.json'],
  [20,'apt-snap20-2026-11-03-m2.json']
];
const BANDS=[6,10,15,20,25,30];
const slug=s=>String(s||'').replace(/\s+/g,'').replace(/[()（）.,·\-]/g,'').replace(/아파트$/,'');
const location=s=>String(s||'').trim().replace(/^(안양|성남|수원|고양)시 /,'$1 ');
const identity=(n,a)=>slug(n)+'|'+location(a);
const STAGE=/(통합\s*재건축|재건축\s*추진|정비대기열|주민제안\s*접수)/;

export function checkSnapshot(cap,document,curated=[]){
  const out={cap,date:document?.date||null,source:'historical_snapshot',rows:0,errors:[],flags:[],
    curatedMatchedUnits:0,curatedRedevelopmentMatchedUnits:0};
  if(!document||!Array.isArray(document.cols)||!Array.isArray(document.rows)){
    out.errors.push({code:'INVALID_SNAPSHOT',detail:'Missing cols or rows'});return out;
  }
  const cols=document.cols, ix=Object.fromEntries(cols.map((s,i)=>[s,i]));
  for(const name of ['rank','name','area','py','price_manwon','score','pG','pU']){
    if(ix[name]===undefined){out.errors.push({code:'MISSING_COLUMN',column:name});return out;}
  }
  const hi=cap*10000,lo=cap===6?0:cap===10?60000:(cap-5)*10000;
  const byName=new Map(), seen=new Set();
  for(const c of curated){
    if(!c.n||!c.area)continue;
    const id=identity(c.n,c.area),list=byName.get(id)||[];
    list.push(c);byName.set(id,list);
  }
  let prevScore=Infinity;
  for(const [i,row] of document.rows.entries()){
    const d=Object.fromEntries(cols.map((key,j)=>[key,row[j]]));out.rows++;
    const key=identity(d.name,d.area)+'|'+d.py;
    if(seen.has(key))out.errors.push({code:'DUPLICATED_UNIT',key});
    seen.add(key);
    if(!Number.isFinite(d.score)||d.score<0||d.score>100)
      out.errors.push({code:'SCORE_OUT_OF_RANGE',rank:d.rank,key,score:d.score});
    if(!Number.isSafeInteger(d.rank)||d.rank!==i+1)
      out.errors.push({code:'RANK_NOT_SEQUENTIAL',rank:d.rank,index:i,key});
    if(d.score>prevScore+.000001)
      out.errors.push({code:'SCORE_ORDER_INVERTED',rank:d.rank,key,score:d.score,prevScore});
    prevScore=d.score;
    if(!Number.isFinite(d.price_manwon)||d.price_manwon<=lo||d.price_manwon>hi)
      out.errors.push({code:'PRICE_OUTSIDE_BAND',rank:d.rank,key,price:d.price_manwon});
    const matches=byName.get(identity(d.name,d.area))||[];
    if(matches.length===1){
      out.curatedMatchedUnits++;
      const c=matches[0];
      const redevelopment=(c.cat||[]).includes('정비대기열')||STAGE.test([c.headline,c.sub,c.stage_text].join(' '));
      if(redevelopment)out.curatedRedevelopmentMatchedUnits++;
      if(redevelopment&&cap>6&&d.rank>1000)
        out.flags.push({code:'REDEVELOPMENT_LOW_RANK_REVIEW',rank:d.rank,name:d.name,area:d.area,py:d.py,
          evidence:'Curated project record; redevelopment progress must be checked separately from financial feasibility',
          note:'Historical rank only, not a confirmed error'});
    }else if(matches.length>1){
      out.flags.push({code:'AMBIGUOUS_CURATED_NAME',rank:d.rank,name:d.name,area:d.area,py:d.py});
    }
    if(cap>6&&d.rank<=100&&d.pG<=30){
      out.flags.push({code:'TOP100_WEAK_LONG_TERM_LOCATION',rank:d.rank,name:d.name,area:d.area,py:d.py,pG:d.pG,
        note:'Review only: other positive factors might justify rank'});
    }
    if(cap>6&&d.rank>1000&&d.pG>=85&&d.pU>=85){
      out.flags.push({code:'STRONG_LOCATION_AND_UNITS_LOW_RANK',rank:d.rank,name:d.name,area:d.area,py:d.py,pG:d.pG,pU:d.pU,
        note:'Review only: size, sale reliability and quality may justify rank'});
    }
  }
  out.coverage={curatedMatchedUnits:out.curatedMatchedUnits,
    curatedRedevelopmentMatchedUnits:out.curatedRedevelopmentMatchedUnits,
    matchedSharePct:out.rows?+(100*out.curatedMatchedUnits/out.rows).toFixed(2):0};
  return out;
}
function loadCurated(){
  // Only use static already-committed records; external authoritative status is NOT being verified.
  const entries=[];
  for(const [file,global] of [['apt-data.js','D'],['apt-auto.js','AUTO']]){
    const content=fs.readFileSync(path.join(ROOT,'public',file),'utf8');
    // Extract directly with Node vm to keep window-scoped browser globals out of the audit environment.
    const vm=requireVm();
    const c={window:{}};vm.runInNewContext(content,c,{filename:file,timeout:3000});
    if(Array.isArray(c.window[global]))entries.push(...JSON.parse(JSON.stringify(c.window[global])));
  }
  const unique=new Map();for(const x of entries){
    const key=identity(x.n,x.area);
    if(!unique.has(key))unique.set(key,x);
    else{const prev=unique.get(key); if((x.cat||[]).includes('정비대기열')&&!(prev.cat||[]).includes('정비대기열'))unique.set(key,x);}
  }
  return [...unique.values()];
}
function requireVm(){return vm;}
import vm from 'node:vm';
function main(){
  const curated=loadCurated(),reports=[];
  for(const [cap,filename] of SNAPSHOTS){
    const file=path.join(ROOT,'public',filename);
    if(!fs.existsSync(file)){reports.push({cap,status:'blocked',reason:'Snapshot missing'});continue;}
    const doc=JSON.parse(fs.readFileSync(file,'utf8'));
    const result=checkSnapshot(cap,doc,curated);
    reports.push({...result,status:result.errors.length?'errors':'historical_snapshot_checked'});
  }
  for(const cap of BANDS.filter(c=>!SNAPSHOTS.some(s=>s[0]===c)))
    reports.push({cap,status:'not_available',reason:'No committed historical snapshot; current live ranking was not audited'});
  const report={readOnly:true,generatedAt:new Date().toISOString(),dataMode:'historical_snapshots_only',
    currentLiveRankingVerified:false,officialRedevelopmentStatusesVerified:false,
    curatedEntries:curated.length,bands:reports,
    summary:{historicalRowsReviewed:reports.reduce((s,r)=>s+(r.rows||0),0),
      errors:reports.reduce((s,r)=>s+(r.errors?.length||0),0),
      reviewFlags:reports.reduce((s,r)=>s+(r.flags?.length||0),0),
      noHistoricalSnapshot:[25,30]}};
  const destIndex=process.argv.indexOf('--out');
  if(destIndex>=0){
    const target=process.argv[destIndex+1];if(!target)throw Error('--out requires file path');
    fs.writeFileSync(path.resolve(target),JSON.stringify(report,null,2)+'\n');
  }
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(report.summary.errors>0)process.exitCode=1;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
