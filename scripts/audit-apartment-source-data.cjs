'use strict';
/**
 * Apartment-map source-data integrity audit. READ-ONLY.
 * node scripts/audit-apartment-source-data.cjs
 * Checks source bundles before live-price overlay; findings are review candidates, not proof.
 * Does not change the protected <=6억 model or any band weights.
 */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const FILES=[
  {file:'apt-univ.js',band:'<=6',min:0,max:60000},
  {file:'apt-univ10.js',band:'6-10',min:60000,max:100000},
  {file:'apt-univ15.js',band:'10-15',min:100000,max:150000},
  {file:'apt-univ20.js',band:'15-20',min:150000,max:200000},
  {file:'apt-univ30.js',band:'20-30 source supplement',min:200000,max:300000}
];
const rows=[],findings=[],stats=[];
function report(kind,severity,row,detail){
  findings.push({type:kind,severity,band:row?.band||'',file:row?.file||'',
    key:row?.key||'',name:row?.n||'',area:row?.area||'',py:row?.py??'',
    price:row?.p??'',detail:String(detail)});
}
function distanceM(a,b){
  const rad=Math.PI/180;
  const x=(a.lng-b.lng)*Math.cos(((a.lat+b.lat)/2)*rad);
  return 111195*Math.hypot(a.lat-b.lat,x);
}
function load(file){
  const filename=path.join(ROOT,'public',file);
  const window={PICKS:[],UGEO:{},HAK:{},FARD:{}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{window}, {filename,timeout:30000});
  return window;
}
for(const spec of FILES){
  const src=load(spec.file);
  let outOfBand=0,missingStation=0,inv=0,cap=0;
  for(const d of src.PICKS){
    const key=d.n+'|'+d.area, st=src.UGEO[key]?.st;
    const row={...d,key,file:spec.file,band:spec.band,st,types:Array.isArray(d.types)?d.types:[]};
    rows.push(row);
    if(!(d.p>spec.min&&d.p<=spec.max)){
      outOfBand++;
      report('selected_price_outside_band','critical',row,'선택 평형 가격 '+d.p+'만원, 기준 ('+spec.min+','+spec.max+']만원');
    }
    if(d.p===spec.max){
      cap++;
      report('exact_upper_boundary','review',row,'가격대 상한과 정확히 일치: 시세 상한 잘림 여부 검증 필요');
    }
    if(st===99999||st===null||st===undefined){
      missingStation++;
      report('no_nearest_station','review',row,'원천 역거리 '+st+'; 실제 교통 부재와 데이터 결측을 구분해야 함');
    }
    const flats=row.types.slice().sort((a,b)=>a.py-b.py);
    for(let i=1;i<flats.length;i++){
      const small=flats[i-1],large=flats[i];
      if(large.py>small.py&&large.p<small.p*0.90){
        inv++;
        report('price_inversion_gt10pct','review',row,
          small.py+'평 '+small.p+'만원('+small.n+'건) > '+large.py+'평 '+large.p+'만원('+large.n+'건). 저층·특수거래 교차 확인');
      }
    }
  }
  stats.push({file:spec.file,band:spec.band,rows:src.PICKS.length,
    selectedOutOfBand:outOfBand,exactUpperBoundary:cap,
    stationUnknown:missingStation,priceInversion:inv});
}
const byKey=new Map(),byCoordinate=new Map(),bySignature=new Map();
for(const row of rows){
  if(!byKey.has(row.key))byKey.set(row.key,[]);
  byKey.get(row.key).push(row);
  const coord=row.lat.toFixed(5)+'|'+row.lng.toFixed(5);
  if(!byCoordinate.has(coord))byCoordinate.set(coord,[]);
  byCoordinate.get(coord).push(row);
  if(row.types.length>=2){
    const sig=row.area+'|'+row.types.map(t=>[t.py,t.p,t.n,t.n3].join(':')).sort().join(';');
    if(!bySignature.has(sig))bySignature.set(sig,[]);
    bySignature.get(sig).push(row);
  }
}
for(const [key,items] of byKey){
  if(items.length<2)continue;
  for(const field of ['year','units']){
    const variants=new Set(items.map(d=>d[field]));
    if(variants.size>1)report('cross_band_'+field+'_mismatch','critical',items[0],
      '동일 단지의 가격대별 '+field+' 불일치: '+[...variants].join(','));
  }
  if(items.some(d=>distanceM(d,items[0])>200)){
    report('cross_band_coordinates_mismatch','critical',items[0],'동일 단지의 서로 다른 좌표가 200m 이상');
  }
}
for(const items of byCoordinate.values()){
  const unique=new Set(items.map(d=>d.key));
  if(unique.size<2)continue;
  const first=items[0];
  report('shared_coordinates','review',first,
    unique.size+'개 단지 동일 좌표: '+[...unique].join(' / '));
}
for(const items of bySignature.values()){
  const unique=new Set(items.map(d=>d.key));
  if(unique.size<2)continue;
  report('identical_multisize_price_vector','priority',items[0],
    '다평형 가격·거래건수 완전 동일: '+[...unique].join(' / '));
}
const unitFile=path.join(ROOT,'public','apt-unitfix.js');
if(fs.existsSync(unitFile)){
  const w={};
  vm.runInNewContext(fs.readFileSync(unitFile,'utf8'),{window:w},{filename:unitFile,timeout:30000});
  const corrected=w.UNITFIX||{}, official=Object.entries(corrected).filter(([k,v])=>v[3]==='k');
  const byOfficialTotal=new Map();
  for(const [k,v] of official){
    const area=k.split('|').slice(1).join('|');
    const marker=area+'|'+v[0];
    if(!byOfficialTotal.has(marker))byOfficialTotal.set(marker,[]);
    byOfficialTotal.get(marker).push({key:k,original:v[1],official:v[0]});
  }
  for(const list of byOfficialTotal.values()){
    if(list.length<2)continue;
    // Same official unit count can legitimately apply to multiple sub-blocks.
    // This is a review signal only; never merge purely on matching totals.
    report('shared_kapt_total','review',{key:list[0].key,n:list[0].key.split('|')[0],area:list[0].key.split('|')[1]},
      list.map(v=>v.key+'='+v.official+'(raw '+v.original+')').join('; '));
  }
}
const counts=Object.fromEntries([...new Set(findings.map(f=>f.type))].sort().map(type=>
  [type,findings.filter(f=>f.type===type).length]));
const output={scope:'static source layer only, before runtime/live overlay',generatedAt:new Date().toISOString(),
  files:stats,sourceRows:rows.length,uniqueSourceKeys:byKey.size,counts,findings};
const dir=path.join(ROOT,'audit-outputs');
fs.mkdirSync(dir,{recursive:true});
const jsonPath=path.join(dir,'apartment-source-data-audit.json');
fs.writeFileSync(jsonPath,JSON.stringify(output,null,2)+'\n');
const csvHeaders=['severity','type','band','file','key','py','price','detail'];
function csv(s){return '"'+String(s??'').replace(/"/g,'""')+'"';}
fs.writeFileSync(path.join(dir,'apartment-source-data-findings.csv'),
  [csvHeaders.map(csv).join(','),...findings.map(f=>csvHeaders.map(k=>csv(f[k])).join(','))].join('\n')+'\n');
const reportLines=['# 아파트맵 원천 정합성 검사','', '검사 대상: 정적 자동수집 원천 5개 파일 (실시간 시세 반영 전).',
  '검사 범위는 6개 가격대 최종 운영 순위 전체가 아님. 다른 평형과 운영 필터는 별도 점검 필요.','',
  '| 원천 파일 | 원천 단지행 | 가격대 위반 | 역거리 불명 | 10% 초과 가격 역전 |',
  '|---|---:|---:|---:|---:|',
  ...stats.map(s=>'| '+s.file+' | '+s.rows+' | '+s.selectedOutOfBand+' | '+s.stationUnknown+' | '+s.priceInversion+' |'),
  '', '총 원천 행: '+rows.length+', 고유 이름·지역 키: '+byKey.size+'개.','',
  '## 분류별 검토 후보 수',...Object.entries(counts).map(([k,v])=>'- '+k+': '+v+'건'),
  '', '주의: 좌표 동일·평형 역전·교통 결측은 오류로 단정하지 않는다. 공식 단지코드, 거래원본, 역 DB 대조 후 확정한다.',
  '가중치·운영 파일은 수정하지 않았다.'];
fs.writeFileSync(path.join(dir,'apartment-source-data-summary.md'),reportLines.join('\n')+'\n');
console.log(JSON.stringify({sourceRows:rows.length,uniqueKeys:byKey.size,files:stats,counts,outputDir:dir},null,2));
