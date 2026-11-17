import fs from 'node:fs';
import path from 'node:path';
import {previewHTML} from '../lib/apt-preview.mjs';

const UP='https://realestate-media.vercel.app/api/backtest';
const get=async u=>{
 const r=await fetch(u,{signal:AbortSignal.timeout(55000)});
 if(!r.ok)throw new Error(u+' '+r.status);
 return r.text();
};
// Live price endpoint currently returns 503 on its last-trade lookup.
 // Reconstruct the same published aggregate from bt_livecur through read-only SQL,
 // without the optional latest-trade 6th field (not used in the cap30 model).
const dataDir=path.join(process.cwd(),'docs/richgo25to30-live-parts');
const live=fs.readdirSync(dataDir).filter(x=>/part\\d+\\.js/.test(x)).sort()
  .map(x=>fs.readFileSync(path.join(dataDir,x),'utf8')).join('\\n');
const geo=await get(UP+'/aptgeo?export=js');
console.log('SOURCE_SNAPSHOT',geo.length,live.length);
const data=previewHTML(path.join(process.cwd(),'public'),30,{geo,live,withAuditRows:true});
if(!data||!Array.isArray(data.rows)||!data.rows.length)throw new Error('No visible data');
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('/tmp/richgo25to30-rank-targets.json',JSON.stringify(data,null,2));
console.log('TARGET_SUMMARY',JSON.stringify({totalUniqueVisible:data.total,selected:data.rows.length,sample:data.rows.slice(0,5)}));
