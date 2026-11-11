/**
 * Export every ranked apartment flat from the exact site ranking runtime.
 * Inputs are the chosen current or explicitly dated snapshots.
 * Read-only: no edits to app, score formula, database or deployed assets.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {run} from './transport-runtime.mjs';
const dest=path.resolve(process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'./exported-rankings');
const root=process.cwd(), caps=[6,10,15,20,25,30];
const labels={6:'6억이하',10:'6-10억',15:'10-15억',20:'15-20억',25:'20-25억',30:'25-30억'};
const headers=['가격대','순위','단지명','지역','평형','표시가격_만원','종합점수','준공연도','세대수','평가모델',
 '단지키','평형데이터출처','소속원본단지','공식정비사업단계','가격신뢰도감점',
 '입지_원점수','직주근접_원점수','교통_원점수','단지규모_원점수','상품성_원점수','기타_원점수',
 '위도','경도','역거리_m','최근12개월거래수','최근3개월거래수','마지막거래일'];
const num=x=>typeof x==='number'&&Number.isFinite(x)?Math.round(x*10000)/10000:x??'';
const csvRow=row=>row.map(v=>{let s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s}).join(',');
const toRow=(o,cap)=>[labels[cap],o.rank,o.n,o.area,o.py,o.p,num(o.score),
  o.year,o.units,o.model,o.key,o.source,o.memberKey,o.progress,o.pricePenalty,
  num(o.rawG),num(o.rawJ),num(o.rawT),num(o.rawU),num(o.rawQ),num(o.rawS),
  o.lat,o.lng,o.stationDist,o.n12,o.n3,o.last];
fs.mkdirSync(dest,{recursive:true});
const all=[], counts=[];
for(const cap of caps){
  const {c,missing}=run(root,cap);
  if(missing.length)throw new Error('Input missing '+cap+': '+missing.join(', '));
  const rows=JSON.parse(vm.runInContext(`JSON.stringify(ORDER.map(d=>{
    const t=(d.types||[]).find(x=>x.py===d.py)||{};
    const r=d.m3?.raw||{}, g=d.g||{};
    return {rank:d.rank,n:d.n,area:d.area,py:d.py,p:d.p,score:d.score,year:d.year,units:d.units,
      model:d.m3?.model||d.s4?.model||'legacy',key:d.cxKey+'|'+d.py,
      source:d.live?'현재실거래_계산시세':'저장_기준시세',memberKey:d.masterComplexKey||'',
      progress:d.m3?.verifiedProject?.phase||'',pricePenalty:d.m3?.penalties?.price??null,
      rawG:r.G??null,rawJ:r.J??null,rawT:r.T??null,rawU:r.U??null,rawQ:r.Q??null,rawS:r.S??null,
      lat:g.lat??d.lat??null,lng:g.lng??d.lng??null,
      stationDist:g.st??null,n12:t.n??null,n3:t.n3??null,last:t.last??null};
  }))`,c));
  const lo=cap===6?0:cap===10?60000:(cap-5)*10000,hi=cap*10000;
  for(const row of rows){
    if(!(row.p>lo&&row.p<=hi))throw Error('Incorrect price band '+cap+' '+row.n+' '+row.p);
    if(!(row.rank>0&&Number.isFinite(row.score)))throw Error('Bad rank/score '+cap+' '+row.n);
  }
  const keys=rows.map(d=>d.key);if(new Set(keys).size!==keys.length)throw Error('Duplicate flat '+cap);
  const ranked=rows.map(o=>toRow(o,cap));
  fs.writeFileSync(path.join(dest,'아파트맵_전체순위_'+labels[cap]+'.csv'),
    '\uFEFF'+[headers,...ranked].map(csvRow).join('\r\n')+'\r\n');
  all.push(...ranked);
  counts.push({가격대:labels[cap],평형수:rows.length,단지수:new Set(rows.map(d=>d.memberKey||d.n+'|'+d.area)).size,
    최고순위:Math.min(...rows.map(x=>x.rank)),최종순위:Math.max(...rows.map(x=>x.rank))});
  console.log('EXPORT_BAND',JSON.stringify({cap,rows:rows.length,first:rows[0]&&{name:rows[0].n,rank:rows[0].rank}}));
}
fs.writeFileSync(path.join(dest,'아파트맵_6개가격대_전체단지_순위_raw.csv'),
  '\uFEFF'+[headers,...all].map(csvRow).join('\r\n')+'\r\n');
const metadata={exportedAt:new Date().toISOString(),source:'아파트맵 master 순위 계산 엔진',
  priceDataSource:process.env.APT_RANK_INPUT_KIND||'저장된 실거래/좌표 스냅샷',frozenAt:process.env.APT_RANK_FROZEN_DATE||'',
  bands:counts,totalFlats:all.length,distinction:'현재 매물 호가가 아니라 국토교통부 신고 실거래를 기반으로 산정한 표시가격',
  disclaimer:'순위는 가격대별로 독립적으로 산정되며, 동일 단지의 여러 평형이 동일 순위를 가질 수 있음. 상위권 추천 등급은 투자 수익률 보장 아님.'};
fs.writeFileSync(path.join(dest,'데이터설명.json'),JSON.stringify(metadata,null,2)+'\n');
fs.writeFileSync(path.join(dest,'읽어주세요.txt'),
  '아파트맵 전체 평형별 순위 raw 추출\n'+
  '기준: '+metadata.priceDataSource+'\n추출일시: '+metadata.exportedAt+'\n전체 평형 행수: '+all.length+'\n'+
  '구간별 자료는 독립 순위입니다. 6억 이하 모델은 별도 보존 중입니다.\n'+
  '표시가격 단위: 만원. 마지막 실거래 신고 이후 현재 매물 호가와 다를 수 있습니다.\n');
console.log('EXPORT_DONE',JSON.stringify({dir:dest,rows:all.length,bands:counts,source:metadata.priceDataSource}));
