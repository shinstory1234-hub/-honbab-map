import fs from 'node:fs';
import path from 'node:path';
import {previewHTML} from '../lib/apt-preview.mjs';

const UP='https://realestate-media.vercel.app/api/backtest';
const get=async u=>{
 const r=await fetch(u,{signal:AbortSignal.timeout(55000)});
 if(!r.ok)throw new Error(u+' '+r.status);
 return r.text();
};
const [geo,live]=await Promise.all([get(UP+'/aptgeo?export=js'),get(UP+'/aptlive')]);
console.log('UPSTREAM',geo.length,live.length);
const data=previewHTML(path.join(process.cwd(),'public'),30,{geo,live,withAuditRows:true});
if(!data||!Array.isArray(data.rows)||!data.rows.length)throw new Error('No visible data');
fs.mkdirSync('docs',{recursive:true});
fs.writeFileSync('/tmp/richgo25to30-rank-targets.json',JSON.stringify(data,null,2));
console.log('TARGET_SUMMARY',JSON.stringify({totalUniqueVisible:data.total,selected:data.rows.length,sample:data.rows.slice(0,5)}));
