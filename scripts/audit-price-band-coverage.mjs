/**
 * Read-only investigation into missing flats across all price tabs.
 * Each tab's inputs and sorted output are read using the actual production runtime.
 * A name match is diagnostics only; the audit never edits prices or apartments.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run} from './transport-runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const caps=[10,15,20,25,30];
const report={run:'price-band-universe-audit',bands:[],asOf:new Date().toISOString(),readOnly:true};
const listings=[];
for(const cap of caps){
  const {c,missing}=run(root,cap);
  if(missing?.length)throw Error('Missing inputs: '+missing.join(', '));
  const source=JSON.parse(vm.runInContext(`JSON.stringify(PICKS.map(d=>({
    n:d.n,area:d.area,py:d.py,p:d.p,units:d.units,live:d.live||0,
    liveKey:d.liveKey||null,sourceKey:typeof aptSourceKey==='function'?aptSourceKey(d):null,
    types:(d.types||[]).map(t=>({py:t.py,p:t.p,n:t.n,n3:t.n3,review:t.priceReview||0,last:t.last})),
  })))`,c));
  const listed=JSON.parse(vm.runInContext(`JSON.stringify(ORDER.map(d=>({
    n:d.n,area:d.area,py:d.py,p:d.p,rank:d.rank,score:d.score,units:d.units
  })))`,c));
  const discards=JSON.parse(vm.runInContext(`JSON.stringify({
    band:BANDOUT,small:SMALLOUT,removedUnits:DUPOUT,rights:RIGHTSOUT,
    current:CUROUT,types:TYPEOUT,
    liveDrop:window.LIVE_DROP||0,liveHits:window.LIVE_HIT||0
  })`,c));
  const irvineSource=source.filter(x=>/어바인퍼스트/.test(x.n));
  const irvineRanks=listed.filter(x=>/어바인퍼스트/.test(x.n));
  const irvineDiscards=Object.fromEntries(Object.entries(discards).filter(([k,v])=>Array.isArray(v))
    .map(([k,v])=>[k,v.filter(x=>JSON.stringify(x).includes('어바인퍼스트'))]));
  const ix=new Set(listed.map(d=>d.n+'|'+d.area+'|'+d.py));
  const lo=cap===10?60000:(cap-5)*10000,hi=cap*10000;
  let missingFlat=[],available=0;
  for(const s of source)for(const t of s.types){
    if(!(t.p>lo&&t.p<=hi)||t.py<13)continue;
    available++;
    const key=s.n+'|'+s.area+'|'+t.py;
    if(!ix.has(key))missingFlat.push({n:s.n,area:s.area,py:t.py,p:t.p,unit:s.units,sourceKey:s.sourceKey,live:s.live,
      reason:discards.band.some(x=>x[0]===s.n&&x[2]===t.py)?'BANDOUT':
      discards.small.some(x=>x[0]===s.n)?'SMALLOUT':
      discards.removedUnits.some(x=>x[0]===s.n)?'DUPOUT':
      discards.rights.some(x=>x[0]===s.n)?'RIGHTSOUT':
      discards.current.some(x=>x[0]===s.n)?'CUROUT':
      discards.types.some(x=>x[0]===s.n&&x[2]===t.py)?'TYPEOUT':'UNEXPLAINED'});
  }
  let band={cap,candidateComplexes:source.length,listedFlats:listed.length,availableFlats:available,
    missingFlats:missingFlat.length,missingReasons:Object.entries(missingFlat.reduce((a,x)=>(a[x.reason]=(a[x.reason]||0)+1,a),{})),
    firstMissing:missingFlat.slice(0,70),irvine:{source:irvineSource,listed:irvineRanks,discards:irvineDiscards},
    discardsCount:Object.fromEntries(Object.entries(discards).filter(([k,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])),
    liveDrop:discards.liveDrop,liveHits:discards.liveHits
  };
  report.bands.push(band);
  listings.push({cap,source,listed});
  console.log('CAP_DIAG',JSON.stringify({cap,count:band.listedFlats,source:band.candidateComplexes,
    missing:band.missingFlats,reasons:band.missingReasons,firstMissing:band.firstMissing.slice(0,5),
    irvine:band.irvine}));
}
const u=new Map();
for(const {cap,source,listed}of listings)for(const s of source){
 const id=s.n+'|'+s.area;
 if(!u.has(id))u.set(id,{n:s.n,area:s.area,allTypes:new Map(),seenCaps:new Set(),listedCaps:new Map()});
 const o=u.get(id);o.seenCaps.add(cap);
 for(const t of s.types){
   if(!Number.isFinite(t.p))continue;
   // Price data may vary across tabs because source correction rules differ.
   const k=t.py+'|'+t.p; if(!o.allTypes.has(k))o.allTypes.set(k,{py:t.py,p:t.p,caps:[]});
   o.allTypes.get(k).caps.push(cap);
 }
 for(const d of listed.filter(d=>d.n===s.n&&d.area===s.area)){
   if(!o.listedCaps.has(d.py+'|'+d.p))o.listedCaps.set(d.py+'|'+d.p,new Set());
   o.listedCaps.get(d.py+'|'+d.p).add(cap);
 }
}
const coverage=[];
for(const u0 of u.values()){
 for(const t of u0.allTypes.values()){
  if(t.p<=60000||t.p>300000)continue;
  const correctCap=caps.find(c=>(c===10?60000:(c-5)*10000)<t.p&&t.p<=c*10000);
  const present=listings.find(x=>x.cap===correctCap)?.listed.some(x=>x.n===u0.n&&x.area===u0.area&&x.py===t.py);
  if(!present)coverage.push({name:u0.n,area:u0.area,py:t.py,p:t.p,expectedCap:correctCap,
    availableInSourceCaps:t.caps,listedCaps:[...u0.listedCaps.entries()].filter(([k])=>k.startsWith(t.py+'|')).map(([k,v])=>({value:k,caps:[...v]}))});
 }
}
report.crossBand={distinctSourceComplexes:u.size,missingFromOwnPriceTab:coverage.length,samples:coverage.slice(0,170)};
console.log('CROSS_BAND',JSON.stringify({sourceComplexes:u.size,missingFlats:coverage.length,examples:coverage.slice(0,50)}));
const i=process.argv.indexOf('--out');if(i>=0)fs.writeFileSync(path.resolve(process.argv[i+1]),JSON.stringify(report,null,2)+'\n');
