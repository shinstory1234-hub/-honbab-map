/* 15억~20억 전체 원자료 626단지 중 선행 감사 300개를 제외한 나머지 326개 생성.
 * 단지는 고정 순위의 301~554위 다음 미등재 단지 72개까지 빠짐없이 포함한다.
 */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const pathFile=root+'/docs/richgo-15to20-remaining326-audit-20261118.csv';
const src=fs.readFileSync(root+'/public/apt-univ20.js','utf8');
const A=JSON.parse(src.slice(src.indexOf('const A=')+8,src.indexOf(',S=')));
const R=JSON.parse(src.slice(src.indexOf(',R=')+3,src.indexOf(';\nconst TB')));
const byKey=new Map(R.map(r=>[r[0]+'|'+A[r[1]],r]));
if(R.length!==626||byKey.size!==626)throw Error('expected 626 unique raw complexes');
const ranks=fs.readFileSync(root+'/public/apt-invest20.js','utf8').match(/window\.APT_INV_RANK\[20\]=(\{.*?\});/s);
if(!ranks)throw Error('no rank list');const obj=JSON.parse(ranks[1]),ranked=new Map();
for(const [key,pos] of Object.entries(obj).sort((a,b)=>a[1]-b[1])){const pair=key.split('|').slice(0,2).join('|');if(!ranked.has(pair))ranked.set(pair,pos)}
if(ranked.size!==554)throw Error('rank expected 554 complexes');
const old=fs.readFileSync(root+'/docs/richgo20-verified-full-20261118.json','utf8'),prior=JSON.parse(old);
if(prior.rows.length!==300)throw Error('need first 300 audits');
const known=new Set(prior.rows.map(x=>x.k));
const keys=[...ranked.keys(),...byKey.keys().filter(k=>!ranked.has(k))];
if(keys.length!==626||keys.filter(k=>!known.has(k)).length!==326)throw Error('missing ranked or raw complexes');
const c={};c.window=c;vm.runInNewContext(fs.readFileSync(root+'/public/apt-unitfix.js','utf8'),c);
const header=['seq','rank_first_py','name','area','map_py','map_price_manwon','map_year','map_units','map_far_raw','map_far_source_raw','map_lat','map_lng','map_types_py','richgo_year','richgo_units','richgo_far','richgo_floors','richgo_coverage_pct','richgo_parking','richgo_heating','richgo_pyeongs','richgo_url','status','source_date','year_diff','units_diff','far_diff_raw_pp','note','map_units_kapt','richgo_name','richgo_identity_level'];
const quote=s=>{const t=String(s??'');return /[,\"\n\r]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t};
let rows=[];
for(let i=0;i<keys.length;i++){
 const k=keys[i];if(known.has(k))continue;const r=byKey.get(k);if(!r)throw Error('no raw row '+k);
 const name=r[0],area=A[r[1]];
 const v={
  seq:String(i+1),rank_first_py:ranked.get(k)??'',name,area,map_py:r[2],map_price_manwon:r[3],map_year:r[4],map_units:r[5],
  map_far_raw:r[22]?.[0]??'',map_far_source_raw:r[22]?.[1]??'',map_lat:r[6]/1e5,map_lng:r[7]/1e5,
  map_types_py:r[8].filter((_,i)=>i%4===0).join('|'),status:'미조회',map_units_kapt:c.UNITFIX?.[k]?.[0]??''
 };
 rows.push(header.map(h=>quote(v[h])).join(','));
}
if(rows.length!==326)throw Error('bad rest count '+rows.length);
fs.writeFileSync(pathFile,'\uFEFF'+header.join(',')+'\n'+rows.join('\n')+'\n');
console.log('PREPARED AUDIT: total raw 626, fixed ranks 554, unranked raw 72, first completed 300, remaining 326');
