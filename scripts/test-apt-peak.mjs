import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={console,window:{PEAKW_OVERRIDE:20},clamp01:x=>Math.max(0,Math.min(1,x)),stOf:()=>40,isRemodel:()=>false};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../public/apt-s4q.js',import.meta.url),'utf8'),context);
context.S4Q=context.window.S4Q;context.S4CFG=context.window.S4CFG;
vm.runInContext(fs.readFileSync(new URL('../public/apt-s4.js',import.meta.url),'utf8'),context);
const score=r=>{context.window.PEAK=r===undefined?undefined:{'검증단지|검증동':r};context.d={n:'검증단지',area:'서울 검증구 검증동',year:2000,U7:5,A:3,E:3,upR:0,locV:7};vm.runInContext('s4Score(d)',context);return context.d;};
const base=score(undefined).score;
for(const r of [undefined,null,'1.1',NaN,Infinity,-Infinity,0,.949])assert.equal(score(r).score,base);
for(const [r,bonus]of [[.95,0],[.99,0],[1,0],[1.025,5],[1.05,10],[1.1,20],[2,20]]){
 const d=score(r);assert.ok(Number.isFinite(d.score));assert.ok(Math.abs(d.s4.peakBonus-bonus)<1e-10);assert.ok(Math.abs(d.score-base-bonus)<1e-10);
}
assert.equal(score(1.1).s4.peakR,1.1);
context.d.area='서울 다른구 다른동';vm.runInContext('s4Score(d)',context);assert.equal(context.d.score,base);
console.log('PASS: actual scorer missing/invalid/threshold/linear/saturation ratios, dong matching and unchanged base factors');
