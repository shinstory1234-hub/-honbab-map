'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),build=fs.readFileSync(path.join(root,'scripts/build-apt-assets.mjs'),'utf8');
assert.ok(build.includes('applyRichgo15AtBuild'));
assert.ok(build.includes('applyRichgo10AtBuild'));
for(const cap of [25,30,35])assert.ok(build.includes('cap==='+cap));
for(const file of ['apt-richgo25.js','apt-richgo30-integrated.js','apt-r35.js','apt-richgo35-corrections.js','apt-invest35.js'])assert.ok(fs.existsSync(path.join(root,'public',file)));
const s=fs.readFileSync(path.join(root,'public/apt-map.html'),'utf8');assert.ok(s.includes("c===35?'apt-r35.js'"));
console.log('All-band source integration wiring OK');
