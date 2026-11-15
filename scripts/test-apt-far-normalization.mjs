import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..');
const load=(c,name)=>vm.runInContext(fs.readFileSync(path.join(root,'public',name),'utf8'),c,{filename:name});
const ctx=cap=>{const c={CAPT:cap,PICKS:[],FARD:{},UGEO:{},HAK:{},PLAT:{}};c.window=c;vm.createContext(c);for(const f of ['apt-fard.js','apt-univ10.js','apt-univ15.js','apt-univ20.js','apt-univ30.js','apt-univadd.js','apt-cx10.js'])load(c,f);return c;};
const a=ctx(10);load(a,'apt-farfix.js');load(a,'apt-far-normalize.js');
assert.ok(a.APT_FAR_AUDIT.matched>=2600);
assert.ok(a.APT_FAR_AUDIT.filled>=1700);
assert.equal(a.APT_FAR_AUDIT.conflicts,0);
assert.equal(a.FARD['세운푸르지오헤리시티|서울 중구 인현동2가'][0],938);
assert.equal(a.FARD['세운푸르지오헤리시티|서울 중구 인현동2가'][1],'L');
assert.equal(a.APT_FAR_PASS2_N,82,'2차 검증 원본은 정확히 82곳');
assert.equal(a.FARD['신동아|서울 동대문구 용두동'][0],275.58);
assert.equal(a.FARD['주공3|서울 강서구 등촌동'][0],230.32);
assert.equal(a.FARD['주공3(886)|군포시 당동'][1],'L');
assert.equal(a.APT_FAR_WEB_N,171,'3차 KB/리치고 일치 검증값 171건');
for(const [key,far,source] of [
 ['반포미도2차아파트|서울 서초구 반포동',200,'KB부동산'],
 ['목동신시가지5|서울 양천구 목동',116,'KB부동산'],
 ['전농우성|서울 동대문구 전농동',228,'KB부동산'],
 ['우성|서울 서초구 양재동',198,'리치고'],
 ['한신잠실코아|서울 송파구 신천동',390,'리치고'],
 ['일산요진와이시티|고양 일산동구 백석동',510,'KB부동산']
]){assert.equal(a.FARD[key][0],far,key+' FAR');assert.equal(a.FARD[key][1],source,key+' source');}
assert.notEqual(a.FARD['삼익|서울 영등포구 여의도동'][1],'리치고','리치고 공란 8곳 값 임의 대입 금지');
const after=JSON.stringify(a.FARD);load(a,'apt-far-normalize.js');assert.equal(JSON.stringify(a.FARD),after,'idempotence');
const b=ctx(6),b0=JSON.stringify(b.FARD);load(b,'apt-far-normalize.js');assert.equal(JSON.stringify(b.FARD),b0,'6억 이하 불변');
console.log('PASS FAR normalization',JSON.stringify(a.APT_FAR_AUDIT));
