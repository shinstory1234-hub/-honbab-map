import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectPolicy } from './audit-apt-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,'public',name),'utf8');
const codes=new Set(inspectPolicy({m3:read('apt-m3.js'),map:read('apt-map.html'),s4:read('apt-s4.js')}).map(x=>x.code));
for(const x of ['REDEVELOPMENT_PROGRESS_NOT_IN_M3_QUALITY',
 'PRICE_CONFIDENCE_DEDUCTED_FROM_QUALITY_SCORE',
 'FEASIBILITY_BADGE_OVERRIDES_DECLARED_STAGE'])assert.ok(codes.has(x),x);
// Fixed minimal fixture distinguishes stable rules from arbitrary code changes.
const fixture=inspectPolicy({
 m3:`function compute(){const raw={Q:Number.isFinite(years)?interp(2026-years,ageCurve):50};const score=clamp(100-pricePenalty);return {score}}function apply(){}root.APT_M3=1;`,
 map:"function featureKeys(d){else if(d.dead>=.5) bad(); else if(stage>=35) good();}const FILTERS=[]",
 s4:"if(high)ta.w=0"
});
const fixtureCodes=new Set(fixture.map(x=>x.code));
assert.ok(fixtureCodes.has('FEASIBILITY_BADGE_OVERRIDES_DECLARED_STAGE'));
assert.ok(fixtureCodes.has('PRICE_CONFIDENCE_DEDUCTED_FROM_QUALITY_SCORE'));
console.log('PASS: design-policy scans detect redevelopment/score/label regression patterns');
