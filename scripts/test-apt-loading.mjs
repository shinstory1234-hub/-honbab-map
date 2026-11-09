import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {run} from './transport-runtime.mjs';
import {buildAptAssets} from './build-apt-assets.mjs';

const [before, after] = process.argv.slice(2);
assert.ok(before && after, 'Usage: node scripts/test-apt-loading.mjs <before> <after>');
const built = buildAptAssets(after);
assert.equal(buildAptAssets(after).html, built.html, 'build must be deterministic and repeatable');
const snapshot = c => vm.runInContext('JSON.stringify(ORDER.map(d=>({key:d.cxKey,py:d.py,p:d.p,rank:d.rank,score:d.score,s4:d.s4,band:d.band,fw:d.fw,kfw:d.kfw,kfwRb:d.kfwRb,locParts:d.locParts,fair:d.fair,up:d.up,m:d.m})))', c);
const results = [];
for (const cap of [6, 10, 15, 20, 25, 30]) {
  const baseline = run(before, cap), compiled = run(after, cap, true);
  assert.deepEqual(baseline.missing, []); assert.deepEqual(compiled.missing, []);
  assert.deepEqual(compiled.rows, baseline.rows, `${cap}: ranking changed`);
  assert.equal(snapshot(compiled.c), snapshot(baseline.c), `${cap}: detail calculations changed`);
  const sync = snapshot(compiled.c);
  let slices = 0, maxSliceMs = 0;
  compiled.c.setTimeout = callback => setTimeout(() => {
    const start = performance.now(); slices++; callback();
    maxSliceMs = Math.max(maxSliceMs, performance.now() - start);
  }, 0);
  await vm.runInContext('recomputeAsync()', compiled.c);
  assert.equal(snapshot(compiled.c), sync, `${cap}: asynchronous scoring changed results`);
  assert.ok(slices > 1, 'initial scoring must yield to the browser');
  const urls = built.manifest[cap];
  assert.ok(urls.includes('apt-geo.js'));
  assert.equal(urls.includes('apt-live.js'), cap > 6, 'live prices must not be bundled');
  results.push({cap, rows: compiled.rows.length, requests: urls.length, exactMatch: true, slices, maxSliceMs: Math.round(maxSliceMs)});
  console.log(JSON.stringify(results.at(-1)));
}
const shared = built.manifest[10].filter(url => built.manifest[15].includes(url));
assert.equal(shared.length, 7, 'high-price tabs should share 7 of 9 URLs');
fs.mkdirSync(after + '/docs', {recursive: true});
fs.writeFileSync(after + '/docs/apt-loading-results-2026-11-10.json', JSON.stringify(results, null, 2) + '\n');
console.log('PASS: bundled and sliced calculation exactly preserves every price band');
