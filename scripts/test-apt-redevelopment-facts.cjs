'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const pub=path.join(__dirname,'../public');
const win={CAPT:10};
const ctx={window:win,console};
vm.runInNewContext(fs.readFileSync(path.join(pub,'apt-redevelopment-evidence.js'),'utf8'),ctx);
vm.runInNewContext(fs.readFileSync(path.join(pub,'apt-m3.js'),'utf8'),ctx);
const M=win.APT_M3, facts=win.APT_REDEV_FACTS;
for(const n of ['한가람(한양)','한가람(삼성)','한가람(두산)']){
 const f=facts[n+'|안양 동안구 관양동'];
 assert.equal(f.zone,'A-5');
 assert.equal(f.phase,'public_review');
 assert.match(f.url,/anyang\.go\.kr/);
}
const flat=(name,area='안양 동안구 관양동')=>({
 n:name,area,year:1995,units:952,py:24,p:84000,
 s4:{pG:65,pJ:70,transport:{candidates:[]},density:{pen:0},ta:{h:0}},
 types:[{py:24,n:4,n3:0,last:'2026-03-11'}]
});
const direct=flat('한가람(한양)'),regular=flat('인근구축');
const exact=M.compute(direct,10),control=M.compute(regular,10);
assert.ok(exact&&control);
assert.equal(exact.bonuses.verifiedProgress,1.25);
assert.equal(exact.verifiedProject.zone,'A-5');
assert.equal(exact.score-control.score,1.25);
for(const name of ['G','J','T','U','Q','S'])assert.equal(exact.raw[name],control.raw[name]);
assert.equal(direct.units,952,'Planned units must never overwrite current units');
assert.equal(exact.penalties.price,control.penalties.price,'Price confidence protection unchanged');
const designated=flat('꿈마을한신','안양 동안구 평촌동');
assert.equal(M.compute(designated,10).bonuses.verifiedProgress,2.5);
assert.equal(M.compute(flat('한가람(한양)','다른시 관양동'),10).bonuses.verifiedProgress,0,
 'Same-name apartment in different area must not receive bonus');
assert.equal(M.compute(direct,6),null,'<=6억 uses legacy scorer');
const html=fs.readFileSync(path.join(pub,'apt-map.html'),'utf8');
assert.ok(html.includes("CAPT===6"),'protected 6억 branches must remain');
assert.ok(html.includes("정비계획공람"),'official consultation badge absent');
assert.ok(html.includes("추정 분담금 부담"),'feasibility is not legal status');
console.log('PASS: source/date/project and status bonus, raw units/quality/price parity, name disambiguation and <=6억 protection');
