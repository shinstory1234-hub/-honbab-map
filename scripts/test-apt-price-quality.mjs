import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { matchLive } from '../lib/live6-match.mjs';

const { review } = globalThis.APT_PRICE_QUALITY;
const row = (size, price, total, recent = 0) => [size, price, total, recent, '2026-08-17'];
const small = row(24, 75000, 2);
const big = row(28, 58000, 1);
assert.deepEqual(review([small, big]).rows, [], '양쪽 모두 오래된 저표본이면 둘 다 보류');

const verifiedSmall = row(24, 75000, 8, 3);
const verifiedBig = row(28, 58000, 6, 2);
assert.deepEqual(review([verifiedSmall, big]).rows, [verifiedSmall]);
assert.deepEqual(review([small, verifiedBig]).rows, [verifiedBig]);
const verified = review([verifiedSmall, verifiedBig]);
assert.deepEqual(verified.rows, [verifiedSmall, verifiedBig], '충분한 거래는 시세 보존');
assert.deepEqual([...verified.conflicts], [24, 28], '남은 가격 차이에 참고 표시');
assert.deepEqual(review([row(24, 55000, 1), row(28, 59000, 2)]).rows.map(r=>r[1]), [55000, 59000]);
assert.deepEqual(review([row(24, 75000, 1, 1), row(28, 58000, 1, 1)]).rows.map(r=>r[1]), [75000, 58000]);

const standard = '41591|향남읍 행정리|테스트';
const key = '41591|향남읍|테스트';
assert.equal(matchLive({[standard]: []}, [key]).out[key].length, 0, '원본 철회 보존');
assert.equal(matchLive({[standard]: [big], '41591|향남읍 다른리|테스트': [small]}, [key]).out[key], undefined);

const read = name => fs.readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');
for(const cap of [10,15,20,25,30,35]){
  const d={n:'테스트',area:'화성 만세구 향남읍',py:28,p:60182,units:400,year:2008};
  const ctx={CAPT:cap,PICKS:[d],FARD:{'테스트|화성 만세구 향남읍':[0,0,0,0,0,0,'41591']},
    LIVEP:{[standard]: [[28,58681,3,0,'2026-08-17',62000]]}, LIVEP_AT:'2026-11-19'};
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(read('apt-price-quality.js'),ctx);
  vm.runInContext(read('apt-livefix.js'),ctx);
  assert.equal(d.p,58681,'가격대별로 동일 원자료 시세 적용');
  assert.equal(d.liveKey,standard);
}

const html=read('apt-map.html');
const start=html.indexOf('function mergeSite('), end=html.indexOf('function fixUnits(',start);
const merger=vm.runInNewContext(html.slice(start,end)+'; mergeSite',{
  GEO:{},gkey:d=>d.n,DUPOUT:[],
});
const site={area:'서울 송파구 방이동',units:5540,year:1988,lat:37.51,lng:127.13};
const one={...site,n:'올림픽선수기자촌1단지',liveKey:'11710|방이동|올림픽선수기자촌1단지',types:[{py:34,p:277541,n:15}]};
const two={...site,n:'올림픽선수기자촌2단지',liveKey:'11710|방이동|올림픽선수기자촌2단지',types:[{py:60,p:474282,n:1}]};
const ranked={CAPT:35,PICKS:[{...one,auto:1},{...two,auto:1}]};
ranked.window=ranked;
vm.runInNewContext(read('apt-gjc.js').split('window.S4GJC=')[0],ranked);
assert.equal(ranked.PICKS.length,2,'급지 계산용 단지 통합도 별도 실거래 식별자를 보존');
assert.equal(merger([one,two]).length,2,'별도 단지 거래를 공유 좌표 때문에 합치지 않음');
assert.equal(one.types.length,1);
console.log('PASS: 단일 시세, 취약한 역전 보류, 근거 있는 가격차 보존, 단지 식별');
