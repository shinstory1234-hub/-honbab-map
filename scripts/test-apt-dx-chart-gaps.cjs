// Regression: the rolling median smooths sparse months without crossing months with no transactions.
// Execute: node scripts/test-apt-dx-chart-gaps.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/apt-dx.js'), 'utf8');
function extract(start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, 'chart function source markers must be present');
  return source.slice(i, j);
}
const snippet = [
  extract('  function eo(v){', '  function ymd(n){'),
  extract('  function tms(n){', '  function pct(x){'),
  extract('  function bad(t){', '  function drawDx('),
].join('\n');
class ChartDate extends Date {
  static now() { return Date.UTC(2026, 10, 18, 12); }
}
const chart = vm.runInNewContext(snippet + '\nchart;', {Date: ChartDate});
function trade(date, amount) {
  return [date, 39.5, 10, amount, 0];
}
function month(yyyymm, amount) {
  return [3, 7, 12, 19, 25].map(day => trade(yyyymm * 100 + day, amount + (day - 12) * 50));
}
function lineOf(rows) {
  const html = chart(rows, 'all');
  const match = html.match(/<path d="([^"]+)"/);
  assert.ok(match, 'chart must include the rolling median line');
  return {path: match[1], html};
}

const sparse = lineOf([
  ...month(202401, 34000), ...month(202402, 34500),
  ...month(202505, 47000), ...month(202506, 47500),
]);
assert.equal((sparse.path.match(/M/g) || []).length, 2, 'a missing year must split the trend into separate paths');
assert.equal((sparse.path.match(/L/g) || []).length, 2);
assert.match(sparse.html, /자료 누락 여부를 별도로 확인/);

const monthly = lineOf([
  ...month(202401, 34000), ...month(202402, 34500), ...month(202403, 35000),
]);
assert.equal((monthly.path.match(/M/g) || []).length, 1, 'consecutive months should remain connected');
assert.equal((monthly.path.match(/L/g) || []).length, 2);
assert.doesNotMatch(monthly.html, /자료 누락 여부를 별도로 확인/);

const oneSparseMonth = lineOf([
  ...month(202401, 34000), ...month(202402, 34500),
  trade(20240305, 37000), trade(20240315, 38000),
  ...month(202404, 35000), ...month(202405, 35500),
]);
assert.equal((oneSparseMonth.path.match(/M/g) || []).length, 1, 'earlier trades support the median for a sparse month');
assert.equal((oneSparseMonth.path.match(/L/g) || []).length, 4);
assert.equal((oneSparseMonth.html.match(/fill="#94a3b8" fill-opacity/g) || []).length, 22);

const irvine = [
  [20260820, 58000], [20260907, 45000], [20260909, 45000], [20260912, 56500],
  [20260914, 45000], [20260922, 51000], [20260928, 48500], [20261009, 61800],
  [20261014, 63000], [20261015, 55000], [20261016, 59500], [20261017, 62000],
  [20261020, 63000], [20261021, 47500], [20261030, 63000], [20261105, 61500],
  [20261109, 47000], [20261109, 49000],
].map(([date, price]) => trade(date, price));
const irvineChart = lineOf(irvine);
const lastPoint = irvineChart.path.match(/L(\d+\.\d) (\d+\.\d)$/);
assert.ok(lastPoint, 'the final point must be connected to the trend');
const low = 45000 - (63000 - 45000) * .08;
const high = 63000 + (63000 - 45000) * .08;
const expectedY = 14 + (high - 55750) / (high - low) * (170 - 14 - 40);
assert.equal(lastPoint[1], '332.0', 'the latest point uses the current date');
assert.equal(lastPoint[2], expectedY.toFixed(1), 'the latest point is the 18-trade median of 55,750만원');
assert.equal((irvineChart.html.match(/fill="#94a3b8" fill-opacity/g) || []).length, 18);
assert.match(irvineChart.html, /최근 3개월 실거래 중위가/);

const lowVolume = chart([trade(20260923, 96000), trade(20261003, 88500)], 'all');
assert.doesNotMatch(lowVolume, /<path d=/, 'two single trades must not look like a falling trend');
assert.equal((lowVolume.match(/fill="#94a3b8" fill-opacity/g) || []).length, 2);
assert.equal((lowVolume.match(/<rect /g) || []).length, 2);

const repeatedSamples = [
  trade(20260722, 135000),
  trade(20260804, 136000), trade(20260804, 136500),
  trade(20260909, 140000), trade(20261024, 148000),
];
const repeatedSamplesChart = chart(repeatedSamples, 'all');
assert.doesNotMatch(repeatedSamplesChart, /<path d=|실거래 중위가/);
assert.equal((repeatedSamplesChart.match(/fill="#94a3b8" fill-opacity/g) || []).length, 5);

const sparseMonth = lineOf([
  ...month(202401, 34000), ...month(202402, 34500), trade(20240310, 40000),
  ...month(202404, 35000), ...month(202405, 35500),
]);
assert.equal((sparseMonth.path.match(/M/g) || []).length, 2, 'a month with only one transaction date breaks the line');

const singleTrade = chart([trade(20261003, 88500)], 'all');
assert.match(singleTrade, /<svg/);
assert.match(singleTrade, /fill="#94a3b8" fill-opacity/);
assert.doesNotMatch(singleTrade, /NaN|<path d=/);
console.log('PASS: rolling transaction median, sample thresholds and historical gaps');
