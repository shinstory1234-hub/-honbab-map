// Regression: the median line only connects consecutive months with enough transactions.
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
const chart = vm.runInNewContext(snippet + '\nchart;', {Date, Math, Number, Object, Array, String, isFinite});
function trade(date, amount) {
  return [date, 39.5, 10, amount, 0];
}
function month(yyyymm, amount) {
  return [5, 12, 19].map(day => trade(yyyymm * 100 + day, amount + (day - 12) * 50));
}
function lineOf(rows) {
  const html = chart(rows, 'all');
  const match = html.match(/<path d="([^"]+)"/);
  assert.ok(match, 'chart must include the monthly median line');
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
assert.equal((oneSparseMonth.path.match(/M/g) || []).length, 2, 'a month with two trades must split the line');
assert.equal((oneSparseMonth.path.match(/L/g) || []).length, 2);
assert.equal((oneSparseMonth.html.match(/fill="#94a3b8" fill-opacity/g) || []).length, 14);

const lowVolume = chart([trade(20260923, 96000), trade(20261003, 88500)], 'all');
assert.doesNotMatch(lowVolume, /<path d=/, 'two single trades must not look like a falling trend');
assert.equal((lowVolume.match(/fill="#94a3b8" fill-opacity/g) || []).length, 2);
assert.equal((lowVolume.match(/<rect /g) || []).length, 2);

const singleTrade = chart([trade(20261003, 88500)], 'all');
assert.match(singleTrade, /<svg/);
assert.match(singleTrade, /fill="#94a3b8" fill-opacity/);
assert.doesNotMatch(singleTrade, /NaN|<path d=/);
console.log('PASS: transaction chart median thresholds and historical gaps');
