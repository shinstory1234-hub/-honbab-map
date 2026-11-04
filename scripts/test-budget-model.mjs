import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import crypto from 'node:crypto';
import {run} from './transport-runtime.mjs';
const baseline=process.argv[2];assert.ok(baseline,'baseline required');
const report={baseline:'84a9925afbada8cf5411ee44f11dca0cd661eb51',asof:'2026-11-05',bands:{},sources:{}};
for(const f of ['apt-geo.js','apt-live.js'])report.sources[f]=crypto.createHash('sha256').update(fs.readFileSync('public/'+f)).digest('hex');
function reps(rows){const out=[],seen=new Set();for(const r of rows.toSorted((a,b)=>b.score-a.score)){if(!seen.has(r.key)){out.push(r);seen.add(r.key);}}return out;}
for(const cap of [6,10,15,20,25,30]){
 const old=run(baseline,cap),now=run('.',cap);assert.deepEqual(old.missing,[]);assert.deepEqual(now.missing,[]);
 if([6,25,30].includes(cap)){assert.deepEqual(now.rows,old.rows);report.bands[cap]={rows:now.rows.length,exactMatch:true};console.log(cap,'EXACT',now.rows.length);continue;}
 const before=new Map(old.rows.map(r=>[r.key+'|'+r.py,r])),oldReps=new Map(old.rows.filter(r=>!r.sib).map(r=>[r.key,r]));
 const bRows=now.rows;assert.equal(bRows.length,old.rows.length);
 for(const r of bRows){const b=r.s4.budget;assert.ok(b);assert.ok(before.has(r.key+'|'+r.py));assert.ok(Number.isFinite(r.score)&&r.score>=0&&r.score<=100);assert.ok(Math.abs(Object.values(b.parts).reduce((v,p)=>v+p.weight,0)-100)<1e-12);assert.ok(Math.abs(r.score-Object.values(b.parts).reduce((v,p)=>v+p.points,0))<1e-9);assert.ok(r.score>=b.lower-1e-9&&r.score<=b.upper+1e-9);assert.ok(!b.rail.best?.future);assert.equal(r.s4.qrb,false);assert.deepEqual([r.s4.za.sm,r.s4.za.pp,r.s4.ta.h,r.s4.ta.mb],[0,0,0,0]);assert.equal(r.s4.pG,before.get(r.key+'|'+r.py).s4.pG);}
 const rr=bRows.filter(r=>!r.sib);rr.forEach((r,i)=>{assert.equal(r.rank,i+1);if(i)assert.ok(rr[i-1].score>=r.score);});assert.equal(new Set(rr.map(r=>r.key)).size,rr.length);
 // Different weights/space preferences must actually change the same hypothetical home's scores.
 const API=now.c.APT_BUDGET,home={year:2015,py:24,units:1000,gj:.5,g:{sts:[]}},inp={pG:70,transport:{candidates:[]},hak:[80,80],terrain:10};
 const ten=API.evaluate(home,10,inp),twenty=API.evaluate(home,20,inp);assert.notEqual(ten.score,twenty.score);assert.ok(ten.parts.space.value>twenty.parts.space.value);
 // Reconstruction status, price, and future infrastructure cannot increase current quality.
 const same=API.evaluate({...home,st:80,dead:0,p:199999},cap,inp),normal=API.evaluate(home,cap,inp);assert.equal(same.score,normal.score);
 const future=API.evaluate(home,cap,{...inp,transport:{candidates:[{future:true,score:100,minutes:1,grade:'S',lineFactor:1}]}});assert.equal(future.score,normal.score);
 assert.equal(API.evaluate(home,6,inp),null);assert.equal(API.evaluate(home,25,inp),null);
 const missing=API.evaluate({...home,g:{}},cap,{...inp,hak:null});assert.ok(missing.missing.includes('rail'));assert.ok(missing.upper>missing.lower);
 // Monotonicity over economically meaningful ranges, holding all else fixed.
 for(const [key,values,increasing] of [['py',[12,16,20,24,30,34,40],true],['units',[300,500,1000,1500,2000,5000],true],['year',[1976,1986,1996,2006,2016,2026],true]]){let prev=-Infinity;for(const v of values){const s=API.evaluate({...home,[key]:v},cap,inp).score;assert.ok(s>=prev-1e-9);prev=s;}}
 for(const key of ['scale','space']){assert.equal(API.evaluate({...home,units:5000,py:40},cap,inp).parts[key].value,100);}
 const walk=(min)=>API.rail({g:{sts:[['A역 2호선',1]]}},{candidates:[{future:false,minutes:min,grade:'S',lineFactor:1}]}).score;
 for(let m=0;m<40;m+=.5)assert.ok(walk(m)>=walk(m+.5));
 // Actual render functions, including full detail and repeat calculations.
 vm.runInContext('renderList()',now.c);const list=now.c.document.querySelector('#body').innerHTML;assert.ok(list.includes('가격대별 순위'));assert.ok(list.includes('/budget-method.html'));
 now.c.backToList=()=>{};vm.runInContext('renderDetail(D.indexOf(ORDER.find(d=>!d.sib)))',now.c);const html=now.c.document.querySelector('#body').innerHTML;assert.ok(html.includes('가격대별 평가'));assert.ok(html.includes('현재 철도:'));assert.ok(!html.includes('종합점수 5%'));assert.ok(!html.includes('<b>신설역 주의</b>'));
 const snap=()=>vm.runInContext('JSON.stringify(ORDER.map(d=>[d.cxKey,d.py,d.rank,d.score]))',now.c);const first=snap();vm.runInContext('recompute()',now.c);assert.equal(snap(),first);
 const changes=rr.map(r=>({name:r.n,area:r.area,before:oldReps.get(r.key).rank,after:r.rank,py:r.py,oldPy:oldReps.get(r.key).py,score:r.score,oldScore:oldReps.get(r.key).score,coverage:r.s4.budget.coverage,issues:r.s4.budget.issues}));
 // +/-20% perturbation of one component, renormalising all weights, without fitting ranks.
 const sensitivity=[];
 for(const key of Object.keys(rr[0].s4.budget.parts))for(const factor of [.8,1.2]){const reranked=reps(bRows.map(r=>{const ps=r.s4.budget.parts,weight=ps[key].weight,score=(r.score+ps[key].points*(factor-1))*100/(100+weight*(factor-1));return {...r,score};}));const top=new Set(rr.slice(0,20).map(r=>r.key));sensitivity.push({key,factor,top20Overlap:reranked.slice(0,20).filter(r=>top.has(r.key)).length});}
 const sample=[];for(const [lo,hi]of [[0,.1],[.1,.5],[.5,1]]){const group=changes.filter(r=>r.before>rr.length*lo&&r.before<=rr.length*hi).sort((a,b)=>crypto.createHash('sha256').update(a.name+'|'+a.area).digest('hex').localeCompare(crypto.createHash('sha256').update(b.name+'|'+b.area).digest('hex')));sample.push(...group.slice(0,10));}
 const keys=Object.keys(rr[0].s4.budget.parts),correlations=[];
 for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
  const pairs=rr.map(r=>[r.s4.budget.parts[keys[i]].value,r.s4.budget.parts[keys[j]].value]).filter(p=>p.every(x=>x!==null));
  const n=pairs.length,mx=pairs.reduce((s,p)=>s+p[0],0)/n,my=pairs.reduce((s,p)=>s+p[1],0)/n;
  const xy=pairs.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0),xx=pairs.reduce((s,p)=>s+(p[0]-mx)**2,0),yy=pairs.reduce((s,p)=>s+(p[1]-my)**2,0);
  correlations.push({a:keys[i],b:keys[j],r:xx&&yy?xy/Math.sqrt(xx*yy):null,n});
 }
 report.bands[cap]={rows:bRows.length,complexes:rr.length,missingByFactor:Object.fromEntries(Object.keys(rr[0].s4.budget.parts).map(k=>[k,bRows.filter(r=>r.s4.budget.parts[k].value===null).length])),top20:changes.slice(0,20),largestChanges:changes.toSorted((a,b)=>Math.abs(b.before-b.after)-Math.abs(a.before-a.after)).slice(0,20),sample30:sample,sensitivity,correlations};
 console.log(cap,rr.length,'PASS','top20 overlap',Math.min(...sensitivity.map(s=>s.top20Overlap)));
}
fs.writeFileSync('docs/budget-model-validation.json',JSON.stringify(report,null,2)+'\n');console.log('PASS all');
