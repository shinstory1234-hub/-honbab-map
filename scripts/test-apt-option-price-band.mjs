/**
 * Prove that a temporary one-line fix prevents a <6억 purchase-option
 * candidate leaking into all 6억+ rankings. Never deploys or changes master.
 *
 * Required --temp-root: a disposable Git worktree OUTSIDE this repository.
 * TRANSPORT_INPUTS must point to restored frozen JS backups.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {run} from './transport-runtime.mjs';
const option='--temp-root';
const ix=process.argv.indexOf(option),root=ix<0?null:path.resolve(process.argv[ix+1]||'');
assert.ok(root&&path.resolve(root)!==path.resolve(process.cwd()),'A disposable --temp-root is required');
assert.ok(root.startsWith('/tmp/')||root.includes('/_temp/'),
  'Refuse to modify anything outside a disposable /tmp/ or CI runner _temp directory');
const file=path.join(root,'public/apt-map.html');
const orig=fs.readFileSync(file,'utf8');
const beforeText="opt:(window.OPT||{})[d.n]||null";
const afterText="opt:(CAPT===6?(window.OPT||{})[d.n]:null)||null";
assert.ok(orig.includes(beforeText),'Option initializer marker is missing');
assert.ok(!orig.includes(afterText),'Option band rule already installed');
const caps=[6,10,15,20,25,30];
const read=cap=>{
 const result=run(root,cap);
 assert.deepEqual(result.missing,[],'Required runtime input JS files must exist');
 return JSON.parse(vm.runInContext(`JSON.stringify(ORDER.map(d=>({
  key:d.cxKey,rank:d.rank,score:d.score,p:d.p,py:d.py,hasOption:!!d.opt
 })))`,result.c));
};
const initial=new Map(caps.map(cap=>[cap,read(cap)]));
fs.writeFileSync(file,orig.replace(beforeText,afterText));
let patched;
try{patched=new Map(caps.map(cap=>[cap,read(cap)]));}
finally{fs.writeFileSync(file,orig);}
assert.deepEqual(patched.get(6),initial.get(6),'6억 이하 rankings must remain byte-for-byte identical');
const findings=[];
for(const cap of caps.filter(x=>x>6)){
 const a=initial.get(cap),b=patched.get(cap);
 const id=x=>x.key+'|'+x.py;
 const bIds=new Set(b.map(id)),aIds=new Set(a.map(id));
 const removed=a.filter(x=>!bIds.has(id(x)));
 const added=b.filter(x=>!aIds.has(id(x)));
 const lo=cap===10?60000:(cap-5)*10000;
 const bad=b.filter(x=>x.p<=lo||x.p>cap*10000);
 findings.push({cap,before:a.length,after:b.length,removed,added,
   remainingPriceBandViolations:bad.map(x=>({key:x.key,py:x.py,p:x.p,rank:x.rank})),
   top30Change:a.slice(0,30).map(id).join('|')!==b.slice(0,30).map(id).join('|')});
 const affectedKeys=new Set(a.filter(x=>x.hasOption).map(x=>x.key));
 assert.ok(removed.every(x=>x.hasOption&&x.p<=lo),
   'The fix must not remove a legitimate non-option candidate');
 assert.ok(added.every(x=>affectedKeys.has(x.key)&&x.p>lo&&x.p<=cap*10000),
   'Only genuine in-band flats of an option-bearing complex may be added');
 assert.equal(bad.length,0,'No >6억 price-band candidate may be outside its band');
}
const output={readonlyTest:true,siteFilesRestored:true,protectedSixUnchanged:true,findings};
const outArg=process.argv.indexOf('--out');
if(outArg>=0)fs.writeFileSync(path.resolve(process.argv[outArg+1]),JSON.stringify(output,null,2)+'\n');
console.log('CANDIDATE_OPTION_FIX',JSON.stringify(output));
