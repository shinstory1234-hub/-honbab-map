/* 6~10억 상위 300 고유 단지 기준과 리치고 검증 패치 회귀 테스트. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),load=p=>fs.readFileSync(path.join(root,p),'utf8');
const csv=load('docs/richgo-6to10-top300-20261118.csv').replace(/^\ufeff/,'').trim().split(/\r?\n/);assert.equal(csv.length-1,300);
function run(cap){const c={CAPT:cap,PICKS:[],FARD:{},UGEO:{},HAK:{},PLAT:{},console};c.window=c;vm.createContext(c);for(const p of ['public/apt-univ10.js','public/apt-farfix.js','public/apt-far-normalize.js'])vm.runInContext(load(p),c,{filename:p});return c;}
const c=run(10);assert.equal(c.RICHGO10_APPLIED.matched,11);assert.equal(c.RICHGO10_APPLIED.farChanged,11);assert.equal(c.RICHGO10_APPLIED.yearChanged,4);assert.equal(c.RICHGO10_APPLIED.unitsChanged,0);
for(const [key,far,year,units] of [["도덕파크타운1단지|광명시 철산동",274,2001,2351],["도덕파크타운2단지|광명시 철산동",274,2001,2351],["신촌푸르지오|서울 서대문구 북아현동",244,2015,940],["산들마을2단지|성남 중원구 여수동",153,2015,1171],["DMCSK뷰아이파크포레|서울 은평구 수색동",238,2023,1486],["DMC롯데캐슬더퍼스트|서울 은평구 수색동",260,2020,1192],["홍제역해링턴플레이스|서울 서대문구 홍제동",237,2021,1116],["노원롯데캐슬시그니처|서울 노원구 상계동",304,2023,1163],["평촌센텀퍼스트|안양 동안구 호계동",282,2023,2886],["학마을1단지|서울 양천구 신정동",247,2000,639],["송도오션파크베르디움|인천 연수구 송도동",232,2020,1530]]){const d=c.PICKS.find(x=>x.n+'|'+x.area===key);assert.ok(d,key);assert.equal(c.FARD[key][0],far,key);assert.equal(d.year,year,key);assert.equal(d.units,units,key);}
assert.equal(run(6).RICHGO10_APPLIED,undefined);assert.equal(run(15).RICHGO10_APPLIED,undefined);
console.log('6~10 Richgo partial audit: 300 rows inventoried, 15 checked, 11 corrections; cap6/cap15 isolated');
