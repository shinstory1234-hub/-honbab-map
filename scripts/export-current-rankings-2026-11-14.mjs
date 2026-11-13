import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {run} from './transport-runtime.mjs';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'exports', '2026-11-14');
const CAPS = [6, 10, 15, 20, 25, 30];
const CAP_NAMES = {6:'6억 이하',10:'6~10억',15:'10~15억',20:'15~20억',25:'20~25억',30:'25~30억'};
const SRC = 'https://realestate-media.vercel.app/api/backtest';
const urls = {
  'apt-geo.js': `${SRC}/aptgeo?export=js`,
  'apt-live.js': `${SRC}/aptlive`,
  'apt-live6.js': 'https://aptmap-kr.vercel.app/api/apt-live6',
};

async function download(url, dest) {
  const res = await fetch(url, {signal: AbortSignal.timeout(90000), headers:{'cache-control':'no-cache'}});
  if (!res.ok) throw new Error(`Data download failed (${res.status}): ${url}`);
  const body = await res.text();
  if (!body || body.length < 100) throw new Error(`Unexpected empty data: ${url}`);
  fs.writeFileSync(dest, body);
  return body.length;
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'aptmap-current-inputs-'));
process.env.TRANSPORT_INPUTS=tmp;
try {
  console.log('Fetching the same live input endpoints as the production website...');
  for(const [file,url] of Object.entries(urls)) console.log(file, await download(url,path.join(tmp,file)), 'characters');
  for(const file of ['apt-geo.js','apt-live.js','apt-live6.js']) {
    const s=fs.readFileSync(path.join(tmp,file),'utf8');
    const o={};o.window=o;vm.runInNewContext(s,o);
    if(file==='apt-geo.js' && Object.keys(o.GEOFIX||{}).length<1000)throw new Error('Geo data missing');
    if(file!=='apt-geo.js' && Object.keys(o.LIVEP||{}).length<100)throw new Error('Current pricing data missing in '+file);
  }
  const all=[], groups=[], bandInfo=[];
  for(const cap of CAPS){
    const {c, missing}=run(ROOT, cap);
    if(missing.length)throw new Error(`Missing files cap=${cap}: ${missing.join(',')}`);
    const raw=vm.runInContext(`JSON.stringify(ORDER.map(d=>({rank:d.rank,name:d.n,area:d.area,py:d.py,price:d.p,score:d.score,year:d.year,units:d.units,unitsOwn:d.unitsOwn??null,key:d.cxKey,masterKey:d.masterComplexKey??null,priceTradeCount:d.types?.find(t=>t.py===d.py)?.n??null,priceTradeCount3m:d.types?.find(t=>t.py===d.py)?.n3??null,priceLatestTrade:d.types?.find(t=>t.py===d.py)?.last??null})))`,c);
    const rows=JSON.parse(raw);
    if(rows.length<30)throw new Error(`Only ${rows.length} rows in cap ${cap}`);
    const unique=new Set();
    for(const [i,d] of rows.entries()){
      if(!Number.isFinite(d.rank)||!Number.isFinite(d.score)||!Number.isFinite(d.price)||!d.name)throw new Error(`Invalid ranked row cap ${cap}, index ${i}`);
      const row={가격대:CAP_NAMES[cap],순위:d.rank,단지명:d.name,지역:d.area,평형_평:d.py,시세_만원:d.price,종합점수:+d.score.toFixed(4),준공연도:d.year??'',세대수:d.unitsOwn||d.units||'',최근12개월거래건수:d.priceTradeCount??'',최근3개월거래건수:d.priceTradeCount3m??'',최근거래일:d.priceLatestTrade||'',단지식별키:d.key||'',통합단지키:d.masterKey||''};
      all.push(row);
      const k=cap+'|'+d.rank;
      if(!unique.has(k)){unique.add(k);groups.push(row);}
    }
    const totalRanks=new Set(rows.map(r=>r.rank)).size;
    if(totalRanks!==Math.max(...rows.map(r=>r.rank)))throw new Error(`Noncontiguous ranks cap=${cap}`);
    bandInfo.push({가격대:CAP_NAMES[cap],순위대상단지수:totalRanks,평형포함행수:rows.length,시세계산기준:c.LIVEP_AT||''});
    console.log(`Computed ${CAP_NAMES[cap]}: ${totalRanks} ranks, ${rows.length} flats, LIVEP_AT ${c.LIVEP_AT}`);
  }
  fs.mkdirSync(OUT,{recursive:true});
  function csv(rows){const keys=Object.keys(rows[0]);const quote=v=>{const s=String(v??'');return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};return '\uFEFF'+keys.map(quote).join(',')+'\r\n'+rows.map(r=>keys.map(k=>quote(r[k])).join(',')).join('\r\n')+'\r\n';}
  fs.writeFileSync(path.join(OUT,'aptmap-rankings-by-complex.csv'),csv(groups));
  fs.writeFileSync(path.join(OUT,'aptmap-rankings-all-flats.csv'),csv(all));
  fs.writeFileSync(path.join(OUT,'rankings-source.json'),JSON.stringify({generatedAt:new Date().toISOString(),gitCommit:process.env.GITHUB_SHA||null,source:urls,bands:bandInfo},null,2)+'\n');
  console.log('Export successful:',groups.length,'complex ranks,',all.length,'all flats');
}catch(err){console.error(err);process.exitCode=1;}finally{fs.rmSync(tmp,{recursive:true,force:true});}
