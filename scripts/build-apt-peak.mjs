/** Generate the small public ratio map from authenticated collector evidence.
 * Usage: node scripts/build-apt-peak.mjs /absolute/path/to/evidence.json
 * Evidence must contain {status, pages}; credentials are never inputs to this script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];
if(!input)throw new Error('Pass the authenticated collector evidence JSON path');
const raw=fs.readFileSync(input,'utf8'), evidence=JSON.parse(raw);
const status=evidence.status;
if(status?.ready!==true||status.total!==924||status.counts?.done!==924||status.errors?.length)throw new Error('Collection is incomplete');
const pages=[...evidence.pages].sort((a,b)=>a.offset-b.offset);
const total=pages[0]?.total;
if(!Number.isSafeInteger(total)||total<1)throw new Error('Missing current-band count');
let offset=0,bandCount=0;const seen=new Set(),bandIds=new Set(),complexes=new Map();
for(const page of pages){
 if(page.areaBasis!=='round'||page.offset!==offset||page.total!==total||page.scanned!==Math.min(50,total-offset)||!Array.isArray(page.bands)||page.bands.length>page.scanned)throw new Error('Incomplete or inconsistent pagination');
 const next=offset+page.scanned;
 if(page.next!==(next<total?next:null))throw new Error('Invalid next cursor');
 for(const b of page.bands){
  if(!b.sgg||!b.name||!b.dong||!Number.isFinite(+b.ab)||+b.ab%5!==0||![+b.cur,+b.n,b.peak,b.r].every(v=>Number.isFinite(v)&&v>0)||![2,3].includes(b.peakN)||Math.abs(b.r-Number(b.cur)/b.peak)>1e-10)throw new Error('Invalid band evidence');
  const id=JSON.stringify([b.sgg,b.name,b.dong,b.ab]);bandIds.add(id);
  const row=JSON.stringify([b.sgg,b.name,b.dong,b.by,b.ab,b.n,b.cur,b.peak]);
  if(seen.has(row))throw new Error('Duplicate current-row evidence');seen.add(row);
  const key=JSON.stringify([b.sgg,b.name,b.dong]);const c=complexes.get(key)||{sgg:b.sgg,name:b.name,dong:b.dong,weight:0,weighted:0,bands:0};
  c.weight+=Number(b.n);c.weighted+=b.r*Number(b.n);c.bands++;complexes.set(key,c);bandCount++;
 }
 offset=next;
}
if(offset!==total)throw new Error('Evidence does not cover all current bands');
const byKey=new Map();for(const c of complexes.values()){const key=c.name+'|'+c.dong;const items=byKey.get(key)||[];items.push(c);byKey.set(key,items);}
const output={},collisions=[];
for(const [key,items] of [...byKey].sort(([a],[b])=>a.localeCompare(b,'ko'))){
 // name|dong cannot distinguish same-named complexes in different districts.
 if(items.length!==1){collisions.push(key);continue;}
 const c=items[0],r=c.weighted/c.weight;if(r>=.95)output[key]=+r.toFixed(6);
}
// Editorial display names are connected only through audited, explicit aliases.
const aliasFile=path.join(root,'scripts/apt-peak-aliases.json');
const aliases=fs.existsSync(aliasFile)?JSON.parse(fs.readFileSync(aliasFile,'utf8')):{};
let appliedAliases=0;
for(const [display,source] of Object.entries(aliases)){
 if(output[source]==null)continue;
 if(output[display]!=null&&output[display]!==output[source])throw new Error('Conflicting display alias');
 output[display]=output[source];appliedAliases++;
}
const digest=createHash('sha256').update(raw).digest('hex');
const meta={period:['2021-07-01','2022-06-30'],method:'top 3 uncanceled amounts per round(area/5)*5 band, at least 2; cur/mean weighted by bt_aggcur.n',tasks:924,trades:status.rows,currentRows:total,eligibleCurrentRows:bandCount,eligibleBands:bandIds.size,eligibleComplexes:complexes.size,exportedComplexes:Object.keys(output).length-appliedAliases,exportedKeys:Object.keys(output).length,omittedAmbiguousKeys:collisions,appliedAliases,evidenceSha256:digest};
fs.writeFileSync(path.join(root,'public/apt-peak.js'),'/* 2021-07~2022-06 전고점 대비 현재 시세. 생성: scripts/build-apt-peak.mjs; 근거: docs/apt-peak.md */\nwindow.PEAK='+JSON.stringify(output)+';\n');
fs.writeFileSync(path.join(root,'scripts/apt-peak-metadata.json'),JSON.stringify(meta,null,2)+'\n');
console.log(JSON.stringify(meta,null,2));
