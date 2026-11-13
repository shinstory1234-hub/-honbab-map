'use strict';
/**
 * Prevent the full price universe from being overwritten by older cached prices.
 * Required as a permanent test, including after the fix branch is merged.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../public/apt-map.html'),'utf8');
const boot=html.slice(html.indexOf('var F=['),html.indexOf('for(var i=0;i<F.length'));
const pLive=boot.indexOf("'apt-live.js'");
const pOld=boot.indexOf("'apt-cur.js'");
const pFix=boot.indexOf("'apt-livefix.js'");
assert.ok(pLive>=0&&pOld>=0&&pFix>=0,'Missing required price input assets');
assert.ok(pLive<pOld&&pOld<pFix,
 'Live price overlay must run after historic apt-cur.js, otherwise valid price bands vanish');
assert.ok(boot.includes("T?'apt-livefix.js':'apt-curlive.js'"),
 '6억 초과는 apt-livefix.js, 6억 이하는 apt-curlive.js(2026.11.14부터 매일 실거래)로 시세를 덮어써야 함');
const pLive6=boot.indexOf("'apt-live6.js'"), pCurLive=boot.indexOf("'apt-curlive.js'");
assert.ok(pLive6>=0&&pLive6<pOld&&pOld<pCurLive,'6억 탭 현재 시세(apt-live6.js)는 apt-cur.js 뒤 apt-curlive.js에서 덮어써야 함');
assert.ok(html.includes("opt:(CAPT===6?"),
 'Protected purchase options must not leak into high-price flats');
console.log('PASS: live price overlay runs after cached price bundle in every tab (6억 이하: apt-live6 → apt-curlive)');
