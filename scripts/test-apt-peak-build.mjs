import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'apt-peak-test-'));
try{
 for(const p of ['scripts','public'])fs.mkdirSync(path.join(root,p));
 fs.copyFileSync(new URL('./build-apt-peak.mjs',import.meta.url),path.join(root,'scripts/build-apt-peak.mjs'));
 const band=(name,sgg,ab,cur,n)=>({name,sgg,dong:'검증동',by:2020,ab,cur,n,peak:100,r:cur/100,peakN:2});
 const bands=[band('가중단지','11111',50,90,1),band('가중단지','11111',55,120,3),band('가중단지','11111',50,100,1),band('미달단지','11111',50,94,4),band('동명단지','11111',50,110,1),band('동명단지','22222',50,120,1)];
 const evidence={status:{ready:true,total:924,counts:{done:924},errors:[],rows:1234},pages:[{areaBasis:'round',offset:0,total:6,scanned:6,next:null,bands}]};
 const file=path.join(root,'evidence.json');
 const run=()=>{fs.writeFileSync(file,JSON.stringify(evidence));return spawnSync(process.execPath,[path.join(root,'scripts/build-apt-peak.mjs'),file],{encoding:'utf8'});};
 assert.equal(run().status,0);const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'public/apt-peak.js'),'utf8'),context);
 assert.equal(context.window.PEAK['가중단지|검증동'],1.1);
 assert.equal(Object.keys(context.window.PEAK).length,1);
 assert.equal(context.window.PEAK_PEER_BASE['미달단지|검증동'][0],.94);
 assert.equal(context.window.PEAK_PEER_BASE['동명단지|검증동'],undefined);
 const output=fs.readFileSync(path.join(root,'public/apt-peak.js'),'utf8');
 evidence.pages[0].total=7;assert.notEqual(run().status,0);
 assert.equal(fs.readFileSync(path.join(root,'public/apt-peak.js'),'utf8'),output);
 evidence.pages[0].total=6;evidence.status.counts.done=923;assert.notEqual(run().status,0);
 console.log('PASS: n weighting, threshold, cross-district collision exclusion and incomplete-export refusal');
}finally{fs.rmSync(root,{recursive:true,force:true});}
