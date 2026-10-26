import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={console,window:{PEAKW_OVERRIDE:10},clamp01:x=>Math.max(0,Math.min(1,x)),stOf:()=>40,isRemodel:()=>false};
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../public/apt-s4q.js',import.meta.url),'utf8'),context);
context.S4Q=context.window.S4Q;context.S4CFG=context.window.S4CFG;
vm.runInContext(fs.readFileSync(new URL('../public/apt-s4.js',import.meta.url),'utf8'),context);
const score=r=>{context.window.PEAK=r===undefined?undefined:{'검증단지|검증동':r};context.d={n:'검증단지',area:'서울 검증구 검증동',year:2000,U7:5,A:3,E:3,upR:0,locV:7};vm.runInContext('s4Score(d)',context);return context.d;};
const base=score(undefined).score;
for(const r of [undefined,null,'1.1',NaN,Infinity,-Infinity,0,.949])assert.equal(score(r).score,base);
for(const [r,bonus]of [[.95,0],[.99,0],[1,0],[1.025,2.5],[1.05,5],[1.1,10],[2,10]]){
 const d=score(r);assert.ok(Number.isFinite(d.score));assert.ok(Math.abs(d.s4.peakBonus-bonus)<1e-10);assert.ok(Math.abs(d.score-base-bonus)<1e-10);
}
assert.equal(score(1.1).s4.peakR,1.1);
context.d.area='서울 다른구 다른동';vm.runInContext('s4Score(d)',context);assert.equal(context.d.score,base);
console.log('PASS: actual scorer missing/invalid/threshold/linear/saturation ratios, dong matching and unchanged base factors');
// A known below-peak donor must dilute the estimate; duplicate floor plans are one peer.
context.window.PEAK={};context.window.PEAK_PEER_BASE={};context.SIB={};context.hav=()=>500;context.stOf=()=>0;
const target={n:'신축',area:'서울 검증구 검증동',year:2023,py:20,units:1000,g:{lat:37,lng:127},cxKey:'target'};
function donor(n,r){const x={...target,n,year:2020,cxKey:n};context.window.PEAK_PEER_BASE[n+'|검증동']=[r,2020,20];context.SIB[n]=[x,{...x,py:22}];return x;}
context.target=target;const peer=()=>vm.runInContext('s4PeerPeak(target)',context);
assert.equal(peer(),null);
donor('상승',1.2);assert.equal(peer().peers.length,1);assert.ok(Math.abs(peer().bonus-5/3)<1e-10);
donor('하락',.8);assert.equal(peer().peers.length,2);assert.ok(Math.abs(peer().r-1)<1e-10);assert.equal(peer().bonus,0);
donor('상승2',1.2);assert.ok(peer().bonus>0&&peer().bonus<=5);
context.SIB.상승[0].year=2000;assert.equal(peer().peers.length,2);
context.target={...target,year:2021};assert.equal(peer(),null);
context.target=target;context.window.PEAK_PEER_BASE['신축|검증동']=[.8,2023,20];assert.equal(peer(),null);
console.log('PASS: peer eligibility, one-peer confidence, floor-plan deduplication, losing peers and known own evidence');

assert.equal(vm.runInContext('s4Total(100,0,10)',context),100);
assert.equal(vm.runInContext('s4Total(0,100,0)',context),0);
assert.equal(vm.runInContext('s4Total(100,0,1000)',context),100);
assert.equal(vm.runInContext('s4Total(80,10,5)',context),68);
context.editorial={n:'평촌센텀퍼스트',area:'안양 동안구 호계동',py:14};
assert.equal(vm.runInContext('s4EditorialFirst(editorial)',context),true);
context.editorial.area='다른 지역';assert.equal(vm.runInContext('s4EditorialFirst(editorial)',context),false);
console.log('PASS: 100-point allocation, upper/lower bounds and exact editorial identity');
context.orderRows=[{n:'다른단지',score:100},{n:'평촌센텀퍼스트',area:'안양 동안구 호계동',py:14,score:100},{n:'셋째단지',score:90}];
assert.equal(vm.runInContext("s4EditorialOrder(orderRows).map(d=>d.n).join(',')",context),'평촌센텀퍼스트,다른단지,셋째단지');
console.log('PASS: editorial first place survives tied scores and preserves other relative order');
