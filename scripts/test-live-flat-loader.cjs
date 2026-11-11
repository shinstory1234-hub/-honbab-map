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
assert.ok(boot.includes("T?'apt-livefix.js':''"),
 'Live overlay must not load for protected 6억 이하');
assert.ok(html.includes("opt:(CAPT===6?"),
 'Protected purchase options must not leak into high-price flats');
console.log('PASS: live price overlay runs after cached price bundle, and never affects protected 6억 tab');
