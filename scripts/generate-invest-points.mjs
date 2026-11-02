#!/usr/bin/env node
/*
 * 6억 초과 탭 상위 500행의 인근 중학교·2025 진학 공시를 결합해
 * public/apt-invest.js를 만든다.
 *
 * 학교 위치: 교육부/한국교육시설안전원 전국초중등학교위치표준데이터
 * 진학 실적: 학교알리미 2025 공시(과학고·외고/국제고·자사고)를 정리한 allinfo.today
 * 주의: 가장 가까운 학교는 배정 학교를 뜻하지 않는다. 화면에도 같은 주의를 표시한다.
 */
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PUBLIC=path.join(ROOT,'public');
const COORD_URL='https://raw.githubusercontent.com/wooni2004/housing-price-forecasting/main/data/%EC%A0%84%EA%B5%AD%EC%B4%88%EC%A4%91%EB%93%B1%ED%95%99%EA%B5%90%EC%9C%84%EC%B9%98%ED%91%9C%EC%A4%80%EB%8D%B0%EC%9D%B4%ED%84%B0.csv';
const LOCAL_COORD=process.env.APT_SCHOOL_COORD||path.resolve(ROOT,'../school-source/data/전국초중등학교위치표준데이터.csv');
const CAPS=[10,15,20];
const PAGES=109;

function csvRow(s){
  const out=[]; let v='', q=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='"'){
      if(q&&s[i+1]==='"'){v+='"';i++;} else q=!q;
    }else if(c===','&&!q){out.push(v);v='';}else v+=c;
  }
  out.push(v); return out;
}
function provinceOf(address){
  if(address.startsWith('서울')) return '서울특별시';
  if(address.startsWith('인천')) return '인천광역시';
  if(address.startsWith('경기')) return '경기도';
  return '';
}
function hav(a,b,c,d){
  const R=6371000, rad=Math.PI/180, p1=a*rad,p2=c*rad, dp=(c-a)*rad,dl=(d-b)*rad;
  const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
async function get(url,tries=3){
  let last;
  for(let n=0;n<tries;n++){
    try{
      const r=await fetch(url,{headers:{'user-agent':'apt-map-data-builder/1.0'}});
      if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r;
    }catch(e){ last=e; await new Promise(r=>setTimeout(r,700*(n+1))); }
  }
  throw last;
}
async function coordBytes(){
  try{return await fs.readFile(LOCAL_COORD);}catch{}
  return Buffer.from(await (await get(COORD_URL)).arrayBuffer());
}
async function loadSchools(){
  const text=new TextDecoder('euc-kr').decode(await coordBytes());
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean), head=csvRow(lines.shift());
  const ix=Object.fromEntries(head.map((v,i)=>[v,i]));
  return lines.map(csvRow).filter(r=>r[ix['학교급구분']]==='중학교'&&r[ix['운영상태']]==='운영').map(r=>{
    const address=r[ix['소재지도로명주소']]||r[ix['소재지지번주소']]||'';
    return {name:r[ix['학교명']],address,province:provinceOf(address),district:address.split(/\s+/).slice(1,3).join(' '),lat:+r[ix['위도']],lng:+r[ix['경도']]};
  }).filter(s=>s.province&&Number.isFinite(s.lat)&&Number.isFinite(s.lng));
}
function parseRates(html){
  const out=[], re=/<h3>([^<]+)<\/h3><p>([^<]+)<!-- --> · <!-- -->([^<]+)<!-- --> · 졸업생 <!-- -->(\d+)<!-- -->명<\/p><\/div><strong>([\d.]+)<small>%<\/small><\/strong>[\s\S]*?aria-label="[^"]*?진학률 [\d.]+%, 과학고 (\d+)명, 외고\/국제고 (\d+)명, 자사고 (\d+)명"/g;
  let m; while((m=re.exec(html))) out.push({name:m[1],province:m[2],district:m[3],graduates:+m[4],rate:+m[5],science:+m[6],foreign:+m[7],private:+m[8]});
  return out;
}
async function loadRates(){
  const pages=Array.from({length:PAGES},(_,i)=>i+1), out=[];
  const workers=Array.from({length:18},async()=>{
    while(pages.length){
      const page=pages.shift(), html=await (await get(`https://allinfo.today/education?view=schools&year=2025&min=0&page=${page}`)).text();
      const rows=parseRates(html);
      if(!rows.length) throw new Error(`진학률 ${page}쪽 파싱 실패`);
      out.push(...rows);
      process.stdout.write(`\r진학률 ${out.length.toLocaleString()}개교 수집`);
    }
  });
  await Promise.all(workers); process.stdout.write('\n');
  const seen=new Map(); for(const r of out) seen.set(`${r.province}|${r.district}|${r.name}`,r);
  return [...seen.values()];
}
async function universe(cap){
  const window={PICKS:[]}, context=vm.createContext({window,console});
  vm.runInContext(await fs.readFile(path.join(PUBLIC,`apt-univ${cap}.js`),'utf8'),context,{filename:`apt-univ${cap}.js`});
  return window;
}
async function targets(cap,win){
  const snap=JSON.parse(await fs.readFile(path.join(PUBLIC,`apt-snap${cap}-2026-11-01-m2.json`),'utf8'));
  const rows=snap.rows.slice(0,1000), complexes=new Map(win.PICKS.map(d=>[`${d.n}|${d.area}`,d]));
  return rows.map(r=>({rank:r[0],name:r[1],area:r[2],py:r[3],d:complexes.get(`${r[1]}|${r[2]}`)}));
}
function rateFor(s,rates){
  const same=rates.filter(r=>r.name===s.name&&r.province===s.province);
  if(same.length<2) return same[0]||null;
  return same.find(r=>s.address.includes(r.district.split(/\s+/).pop()))||same[0];
}

const [schools,rates]=await Promise.all([loadSchools(),loadRates()]);
const rankByCap={}, schoolOut={}, stats={};
for(const cap of CAPS){
  const win=await universe(cap), rows=await targets(cap,win), ranks={}; let matched=0;
  for(const row of rows){
    ranks[`${row.name}|${row.area}|${row.py}`]=row.rank;
    if(!row.d) continue;
    const key=`${row.name}|${row.area}`;
    if(schoolOut[key]) continue;
    let nearest=null,dist=Infinity;
    for(const s of schools){ const m=hav(row.d.lat,row.d.lng,s.lat,s.lng); if(m<dist){dist=m;nearest=s;} }
    const q=rateFor(nearest,rates);
    schoolOut[key]=q?[nearest.name,Math.round(dist),q.graduates,q.rate,q.science,q.foreign,q.private,nearest.address]:[nearest.name,Math.round(dist),null,null,null,null,null,nearest.address];
  }
  for(const row of rows) if(schoolOut[`${row.name}|${row.area}`]?.[2]!=null) matched++;
  rankByCap[cap]=ranks;
  stats[cap]={rows:rows.length,complexes:new Set(rows.map(r=>`${r.name}|${r.area}`)).size,schoolRows:matched};
}
for(const cap of CAPS){
  const keys=new Set(Object.keys(rankByCap[cap]).map(k=>k.split('|').slice(0,2).join('|')));
  const capSchools=Object.fromEntries([...keys].map(k=>[k,schoolOut[k]]).filter(x=>x[1]));
  const js=`/* 자동 생성: scripts/generate-invest-points.mjs
   대상: ${cap===10?'6~10억':cap===15?'10~15억':'15~20억'} 탭 고정순위 상위 1,000행.
   학교: 가장 가까운 중학교(배정 학교 아님). 진학률: 학교알리미 2025 공시의 과학고+외고·국제고+자사고 합계. */
window.APT_INV_RANK=window.APT_INV_RANK||{}; window.APT_INV_RANK[${cap}]=${JSON.stringify(rankByCap[cap])};
window.APT_INV_SCHOOL=${JSON.stringify(capSchools)};
window.APT_INV_META=${JSON.stringify({asof:'2026-11-02',schoolPosition:'전국초중등학교위치표준데이터',schoolOutcome:'학교알리미 2025 공시',stats:stats[cap]})};
`;
  await fs.writeFile(path.join(PUBLIC,`apt-invest${cap}.js`),js);
}
console.log(JSON.stringify({schools:schools.length,rates:rates.length,stats},null,2));
