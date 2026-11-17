/* 검증된 14개만 25~30억 탭에 적용되는지 검사 */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('node:path').join(__dirname,'../public/apt-richgo30-fix.js'),'utf8');
const rows=[["래미안그레이튼(진달래2차)|서울 강남구 역삼동",266,464,2010],["한양아파트|서울 송파구 송파동",157,576,1983],["양지마을(5단지)(한양515-529)|성남 분당구 수내동",157,1430,1992],["경희궁자이(2단지)|서울 종로구 홍파동",252,1148,2017],["서울숲리버뷰자이|서울 성동구 행당동",280,1034,2018],["목동신시가지7|서울 양천구 목동",125,2550,1986],["목동신시가지14|서울 양천구 신정동",146,3100,1987],["명수대현대|서울 동작구 흑석동",247,660,1988],["목동신시가지5|서울 양천구 목동",116,1848,1986],["한양|서울 광진구 자양동",156,444,1983],["목동신시가지3|서울 양천구 목동",122,1588,1986],["목동신시가지4|서울 양천구 목동",124,1382,1986],["한신서래|서울 서초구 반포동",216,414,1987],["개포우성3차|서울 강남구 개포동",179,405,1984]];
function check(cap){
 const c={CAPT:cap,FARD:{},PICKS:[],console};c.window=c;
 for(const [k,far,units,year] of rows){const [n,area]=k.split('|');c.PICKS.push({n,area,units,year,p:272000,types:[{py:33,p:272000}]});c.FARD[k]=[far+1,'L'];}
 c.FARD['unrelated|서울 강남구']=[300,'L'];
 vm.runInNewContext(src,c);
 for(const [k,far] of rows){assert.equal(c.FARD[k][0],cap===30?far:far+1);if(cap===30)assert.equal(c.FARD[k][1],'리치고(직접확인)');}
 assert.deepEqual(c.FARD['unrelated|서울 강남구'],[300,'L']);
 assert.ok(c.PICKS.every(d=>d.p===272000&&d.types[0].p===272000));
 if(cap===30){assert.equal(c.APT_RICHGO30_AUDIT.applied,14);assert.equal(c.APT_RICHGO30_AUDIT.changed,14);}
 else assert.equal(c.APT_RICHGO30_AUDIT,undefined);
}
check(30);for(const c of [6,10,15,20,25,35])check(c);
const html=fs.readFileSync(require('node:path').join(__dirname,'../public/apt-map.html'),'utf8');
assert.ok(html.includes("c===30?'apt-richgo30-fix.js':''"));
console.log('25~30억 verified 14: FAR parity OK, identity checks OK, 6/10/15/20/25/35 unaffected');
