/* 25~30억 스냅샷: 리치고 단지 직접 검증 14곳의 실제 FARD 종착값을 확인 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.join(__dirname,'../public'),source=fs.readFileSync(path.join(dir,'apt-univ30.js'),'utf8');
const a=source.indexOf('const A=')+8,b=source.indexOf(',S=[');
const A=JSON.parse(source.slice(a,b)),start=source.indexOf('R=['),end=source.indexOf(';\nconst TB',start);
const R=JSON.parse(source.slice(start+2,end));
const rows=[["래미안그레이튼(진달래2차)|서울 강남구 역삼동",266,464,2010],["한양아파트|서울 송파구 송파동",157,576,1983],["양지마을(5단지)(한양515-529)|성남 분당구 수내동",157,1430,1992],["경희궁자이(2단지)|서울 종로구 홍파동",252,1148,2017],["서울숲리버뷰자이|서울 성동구 행당동",280,1034,2018],["목동신시가지7|서울 양천구 목동",125,2550,1986],["목동신시가지14|서울 양천구 신정동",146,3100,1987],["명수대현대|서울 동작구 흑석동",247,660,1988],["목동신시가지5|서울 양천구 목동",116,1848,1986],["한양|서울 광진구 자양동",156,444,1983],["목동신시가지3|서울 양천구 목동",122,1588,1986],["목동신시가지4|서울 양천구 목동",124,1382,1986],["한신서래|서울 서초구 반포동",216,414,1987],["개포우성3차|서울 강남구 개포동",179,405,1984]];
const listed=R.filter(r=>r[8].some((x,i)=>i%4===1&&x>250000&&x<=300000));
assert.equal(listed.length,139,'정적 25~30억 후보 수가 바뀜 — CSV 재생성 필요');
const FARD=Object.fromEntries(R.map(r=>[r[0]+'|'+A[r[1]],r.at(-1).slice()]));
const c={CAPT:30,CXP:[],PICKS:[],FARD,PLAT:{}};c.window=c;
for(const f of ['apt-farfix.js','apt-far-normalize.js'])vm.runInNewContext(fs.readFileSync(path.join(dir,f),'utf8'),c,{filename:f});
for(const [k,far,units,year] of rows){
 const r=listed.find(r=>r[0]+'|'+A[r[1]]===k);
 assert.ok(r,'정적 25~30억 후보에 없음: '+k);
 assert.equal(r[5],units,'세대수 변경: '+k);assert.equal(r[4],year,'준공연도 변경: '+k);
 assert.equal(c.FARD[k][0],far,'리치고와 최종 용적률 불일치: '+k);
}
for(const k of ['경희궁자이(2단지)|서울 종로구 홍파동','서울숲리버뷰자이|서울 성동구 행당동']){
 assert.equal(c.FARD[k][1],'리치고','리치고 우선 출처 미반영: '+k);
}
const html=fs.readFileSync(path.join(dir,'apt-map.html'),'utf8');
assert.ok(!html.includes('apt-richgo30-fix.js'),'추가 런타임 파일을 로드하지 않아야 함');
console.log('리치고 직접 대조 14곳 최종 FAR 일치, 변경 2곳, 신규 런타임 없음, 원본 후보 139곳 확인');
