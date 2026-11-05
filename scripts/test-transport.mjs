import {run} from './transport-runtime.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {gzipSync} from 'node:zlib';
const before=process.argv[2],after=process.argv[3]||'.';
const report={date:'2026-11-04',baseline:'b723a3c',inputs:{},bands:{},validation:{}};
for(const f of ['apt-live.js','apt-geo.js'])report.inputs[f]=crypto.createHash('sha256').update(fs.readFileSync(process.env.TRANSPORT_INPUTS+'/'+f)).digest('hex');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(after+'/public/apt-transport.js','utf8'),ctx);const T=ctx.window.APT_TRANSPORT;
for(const [l,v]of [['신분당선',1],['9호선 급행',1],['GTX-A',1],['GTX-B',1],['GTX-C',1],['2호선',1],['5호선',.8],['7호선',.8],['8호선',.8],['1호선',.7],['3호선',.7],['4호선',.7],['6호선',.7],['수인·분당선',.7],['수인분당선',.7],['경의·중앙선',.3],['경의중앙선',.3],['공항철도',.3],['경춘선',.3],['인천2호선',.1],['서해선',.1]])assert.equal(Math.max(...T.lines(l).map(x=>x.v)),v,l);
for(const [m,a]of [[5,1],[10,1],[12,.8],[15,.5],[18,.2],[20,0],[21,0]])assert.ok(Math.abs(T.access(m)-a)<1e-12);
const measured={minutes:15,source:'검증용 경로',checkedAt:'2026-11-04'};
assert.equal(T.candidate('A','신분당선',100,measured).score,50);
assert.equal(T.candidate('B','경의중앙선',320).score,30);
assert.equal(T.candidate('환승','신분당선·경의중앙선',320).score,100);
assert.equal(T.candidate('예정','GTX-B',320,null,true,2030).score,80);
assert.equal(T.candidate('예정','GTX-B',320,null,true,null).score,0);
assert.equal(T.evaluate({g:{sts:[['A역 신분당선',960],['B역 경의중앙선',320]]}}).score,50);
assert.equal(T.lines('우이신설선')[0].name,'우이신설선');
assert.equal(T.lines('gtx-a')[0].v,1);
assert.equal(T.evaluate({g:{sts:[['수서역 3호선',320]]}}).score,100);
assert.equal(T.evaluate({g:{sts:[['삼성역 GTX-A',320]]}}).score,0);
ctx.FUT=[['9호선 4단계 1','9호선(신설)',2029,[1,1]],['9호선 4단계 2','9호선(신설)',2029,[1,2]],['계획역','미확정선',2027,[1,1]],['C역','GTX-C',2028,[1,1]]];ctx.hav=(_a,_b,_c,d)=>d===2?320:960;
const future=T.evaluate({g:{lat:1,lng:1,sts:[]}});
assert.equal(future.best.station,'9호선 4단계 2');assert.equal(future.score,85);assert.equal(future.candidates.length,3);assert.equal(future.candidates.find(c=>c.line==='GTX-C').discount,.8);
ctx.FUT=[];
report.validation.unitTests='PASS';
const inventory={};
for(const cap of [6,10,15,20,25,30]){
 const old=run(before,cap),now=run(after,cap);assert.deepEqual(old.missing,[]);assert.deepEqual(now.missing,[]);
 if(cap===6){assert.deepEqual(now.rows,old.rows);report.validation.six={rows:now.rows.length,exactMatch:true};console.log('6억 이하 완전 동일',now.rows.length);continue;}
 const prior=new Map(old.rows.map(r=>[r.key+'|'+r.py,r]));
 for(const n of now.rows){const o=prior.get(n.key+'|'+n.py);assert.ok(o);for(const k of ['pU','pG','pQ','za','dp','peakBonus'])assert.deepEqual(n.s4[k],o.s4[k],k);assert.equal(n.s4.ta.h,o.s4.ta.h);assert.equal(n.s4.ta.mb,o.s4.ta.mb);assert.equal(n.s4.ta.w,0);assert.ok(n.s4.transport.score>=0&&n.s4.transport.score<=100);const s=n.s4;const expected=Math.max(0,Math.min(100,s.pU*.25+s.pG*.5+s.pQ*.2+s.transport.score*.05-s.za.sm+s.za.pp-s.ta.h+s.ta.mb));assert.ok(Math.abs(n.score-expected)<1e-9);for(const [name]of n.sts||[]){const l=name.match(/역\s+(.+)$/)?.[1]||'';inventory[l]=T.lines(l);}}
 const oldRep=old.rows.filter(r=>!r.sib),newRep=now.rows.filter(r=>!r.sib);assert.equal(new Set(newRep.map(r=>r.key)).size,newRep.length);
 newRep.forEach((r,i)=>{assert.equal(r.rank,i+1);if(i)assert.ok(newRep[i-1].score>=r.score);});
 const prev=new Map(oldRep.map(r=>[r.key,r]));const changes=newRep.map(n=>{const o=prev.get(n.key);return {name:n.n,area:n.area,before:o.rank,after:n.rank,change:o.rank-n.rank,oldPy:o.py,newPy:n.py,oldScore:o.score,newScore:n.score,transport:n.s4.transport.best,stations:n.sts};});
 report.bands[cap]={count:newRep.length,rows:now.rows.length,top100:changes.filter(r=>r.before<=100||r.after<=100),top20Before:changes.filter(r=>r.before<=20).sort((a,b)=>a.before-b.before),top20After:changes.slice(0,20),rises:changes.filter(r=>r.change>0).sort((a,b)=>b.change-a.change).slice(0,20),falls:changes.filter(r=>r.change<0).sort((a,b)=>a.change-b.change).slice(0,20),dmc:changes.filter(r=>/DMCSK뷰아이파크포레/.test(r.name)),sinbundang:changes.filter(r=>(r.stations||[]).some(([n,m])=>/신분당/.test(n)&&m*1.25/80<=20)),gyeongui:changes.filter(r=>(r.stations||[]).some(([n,m])=>/경의.?중앙/.test(n)&&m*1.25/80<=20)),all:changes};
 console.log(cap,newRep.length,report.bands[cap].dmc.map(r=>[r.before,r.after,r.oldScore,r.newScore]));
}
report.validation.otherFactors='PASS';report.validation.lines=inventory;report.validation.backtest='미실시: 과거 시점별 운행 노선, 보행 경로, 당시 투자 대상 전체 이력 자료가 없어 현재 교통을 과거에 적용하는 오류를 피함.';
fs.mkdirSync(after+'/docs',{recursive:true});fs.writeFileSync(after+'/docs/transport-comparison.json.gz',gzipSync(JSON.stringify(report)));
let md='# 6억 초과 교통 5% 개편 검증\n\n2026-11-04. 동일한 운영 입력 자료로 전후 재계산. 6억 이하는 '+report.validation.six.rows+'개 평형의 점수, 순위 및 평가 구성 전체가 정확히 동일.\n\n'+report.validation.backtest+'\n\n';
const table=rows=>'| 단지 | 지역 | 이전 | 이후 | 상승폭 | 이전 평형 | 이후 평형 | 이전 점수 | 이후 점수 | 교통점수 |\n|---|---|---:|---:|---:|---:|---:|---:|---:|---:|\n'+rows.map(r=>`| ${r.name} | ${r.area} | ${r.before} | ${r.after} | ${r.change} | ${r.oldPy} | ${r.newPy} | ${r.oldScore.toFixed(3)} | ${r.newScore.toFixed(3)} | ${(r.transport?.score||0).toFixed(3)} |`).join('\n')+'\n\n';
for(const [cap,b]of Object.entries(report.bands)){md+='## '+(cap==='10'?6:+cap-5)+'~'+cap+'억 구간\n\n';for(const [key,title]of [['top20Before','이전 상위 20'],['top20After','이후 상위 20'],['rises','상승폭 20'],['falls','하락폭 20'],['dmc','DMC SK뷰아이파크포레'],['sinbundang','신분당선 추정 도보 20분 이내'],['gyeongui','경의중앙선 추정 도보 20분 이내'],['top100','전후 상위 100 합집합']])md+='### '+title+'\n\n'+table(b[key]);}
fs.writeFileSync(after+'/docs/transport-comparison.md',md);console.log('PASS: 모든 평형의 정확한 산식, 다른 요소 유지, 중복제거와 점수 순서');
