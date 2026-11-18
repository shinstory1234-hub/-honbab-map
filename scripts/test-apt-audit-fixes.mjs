import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { previewScript } from '../lib/apt-preview.mjs';

const read = name => fs.readFileSync(new URL('../public/' + name, import.meta.url), 'utf8');
const html = read('apt-map.html');
const boot = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(match => match[1].includes('var F='))[1];
const band = cap => {
  const context = { URLSearchParams, location: { search: '?cap=' + cap },
    document: { write() {}, getElementById() {} } };
  context.window = context;
  vm.runInNewContext(boot, context);
  return context.inBand;
};
assert.equal(band(6)(60000), true);
assert.equal(band(10)(60000), false);
assert.equal(band(30)(300000), false);
assert.equal(band(35)(300000), true);

const makeContext = (cap, d, sourceKey, rows) => {
  const k = d.n + '|' + d.area;
  const context = { CAPT: cap, PICKS: [d], FARD: { [k]: [200, 'L', 0, 0, 0, 0, sourceKey.split('|')[0]] },
    LIVEP: { [sourceKey]: rows } };
  context.window = context;
  return context;
};
const d = { n: '테스트단지', area: '서울 중구 입정동', py: 24, p: 57000, units: 500, year: 2025 };
const high = makeContext(10, d, '11140|입정동|테스트단지', [
  [20, 60100, 8, 6, new Date().toISOString().slice(0, 10), null],
  [24, 57000, 7, 1, new Date().toISOString().slice(0, 10), 61000],
]);
vm.runInNewContext(read('apt-livefix.js'), high);
assert.equal(d.types.find(type => type.py === 24).p, 57000);

const low = makeContext(6, { n: '힐스테이트탑석', area: '의정부시 용현동' },
  '41150|용현동|힐스테이트탑석', [[24, 45588, 4, 3, '2026-10-22'], [30, 30000, 13, 1, '2026-10-19']]);
vm.runInNewContext(read('apt-curlive.js'), low);
assert.equal(low.CUR['힐스테이트탑석|의정부시 용현동'].length, 1);
assert.equal(low.LIVE_PRICE_REVIEW[0].py, 30);

const start = html.indexOf('function listRepresentatives(');
const end = html.indexOf('const displayRank=', start);
const context = { complexRankKey: row => row.key };
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);
const rows = [
  { key: 'a', p: 92108, py: 34, score: 53.29, rank: 23 },
  { key: 'b', p: 72000, py: 30, score: 45.00, rank: 40 },
  { key: 'a', p: 64050, py: 18, score: 25.25, rank: 23 },
];
assert.equal(context.listRepresentatives(rows, 'price', false)[0].p, 64050);
assert.equal(context.listRepresentatives(rows, 'rank', true)[0].p, 92108);
assert.equal(context.listRepresentatives(rows.slice(1), 'rank', true)[0].key, 'b');
assert.match(previewScript('<div class="row"></div>'), /\.rk\{visibility:hidden\}/);
console.log('PASS: 6/30억 경계, 시세 검증 보류, 평형 정렬, 초기 순위 표시');
