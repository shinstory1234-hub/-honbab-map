// Regression: months without recorded transactions must not be connected by an apparent price trend.
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
function lineOf(rows) {
  const html = chart(rows, 'all');
  const match = html.match(/<path d="([^"]+)"/);
  assert.ok(match, 'chart must include the monthly median line');
  return {path: match[1], html};
}

const sparse = lineOf([
  trade(20240105, 34000), trade(20240205, 34500),
  trade(20250505, 47000), trade(20250605, 47500),
]);
assert.equal((sparse.path.match(/M/g) || []).length, 2, 'a missing year must split the trend into separate paths');
assert.equal((sparse.path.match(/L/g) || []).length, 2);
assert.match(sparse.html, /자료 누락 여부는 별도 확인/);

const monthly = lineOf([
  trade(20240105, 34000), trade(20240205, 34500), trade(20240305, 35000),
]);
assert.equal((monthly.path.match(/M/g) || []).length, 1, 'consecutive months should remain connected');
assert.equal((monthly.path.match(/L/g) || []).length, 2);
assert.doesNotMatch(monthly.html, /자료 누락 여부는 별도 확인/);

const oneMissingMonth = lineOf([
  trade(20240105, 34000), trade(20240305, 35000),
]);
assert.equal((oneMissingMonth.path.match(/M/g) || []).length, 2, 'a missing calendar month must not be interpolated');
console.log('PASS: historical transaction chart gap regression');
