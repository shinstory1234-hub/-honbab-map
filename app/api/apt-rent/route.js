// 국토교통부 전월세 실거래: 단지 클릭 시에만 시군구×계약월 캐시 조회.
// 공개 API는 동/호를 제공하지 않는다. 단지명과 법정동이 모두 일치할 때만 집계.
import { unstable_cache } from 'next/cache';
import { govtGet, nameKey, validKey, safeJson } from '../../../lib/apt-openapi.mjs';

export const preferredRegion='icn1';
export const maxDuration=60;
const ENDPOINT='/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';
const getMonth=unstable_cache(async (sgg,ym)=>{
  const first=await govtGet(ENDPOINT,{LAWD_CD:sgg,DEAL_YMD:ym,numOfRows:5000,pageNo:1},17000);
  // 더 많은 자료가 있는 지역은 페이지 끝까지 가져오기 전 '0건'이나 '전체'로 표기하지 않는다.
  if(first.total>15000) throw new Error('RESULT_EXCEEDS_SAFE_LIMIT');
  let rows=[...first.items],page=2;
  while(rows.length<first.total && page<=3){
    const next=await govtGet(ENDPOINT,{LAWD_CD:sgg,DEAL_YMD:ym,numOfRows:5000,pageNo:page++},17000);
    if(!next.items.length) throw new Error('TRUNCATED_API_PAGE');
    rows.push(...next.items);
  }
  if(rows.length<first.total) throw new Error('TRUNCATED_API_PAGE');
  return rows;
},['apt-rent-district-month-v1'],{revalidate:86400});

function number(v){const n=Number(String(v||'').replace(/,/g,''));return Number.isFinite(n)?n:null;}
function makeRows(items,dong,apt){
  const wanted=nameKey(apt);
  const result=[];
  for(const t of items){
    if(nameKey(t.aptNm)!==wanted || String(t.umdNm||'').replace(/\s/g,'')!==dong.replace(/\s/g,'')) continue;
    const deposit=number(t.deposit),monthlyRent=number(t.monthlyRent),area=number(t.excluUseAr),floor=number(t.floor);
    const y=Number(t.dealYear),m=Number(t.dealMonth),day=Number(t.dealDay);
    if(!Number.isInteger(y)||y<2010||y>2100||m<1||m>12||day<1||day>31||deposit==null||deposit<0||monthlyRent==null||monthlyRent<0||area==null||area<10||area>350)continue;
    const date=[y,String(m).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
    if(!Number.isFinite(Date.parse(date+'T00:00:00Z')))continue;
    result.push({date,area:Math.round(area*10)/10,floor,deposit,monthlyRent,kind:monthlyRent===0?'전세':'월세',contractType:String(t.contractType||'').trim(),contractTerm:String(t.contractTerm||'').trim()});
  }
  return result;
}
function monthCodes(count){
  const t=new Date(Date.now()+9*3600000);const year=t.getUTCFullYear(),month=t.getUTCMonth();
  return Array.from({length:count},(_,i)=>{const d=new Date(Date.UTC(year,month-i,1));return d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0');});
}
export async function GET(req){
  const k=validKey(new URL(req.url).searchParams.get('k'));
  if(!k)return safeJson({error:'단지 식별키가 올바르지 않습니다.'},400);
  const months=monthCodes(6);
  const got=await Promise.allSettled(months.map(m=>getMonth(k.sgg,m)));
  const incomplete=got.some(x=>x.status==='rejected');
  if(got.every(x=>x.status==='rejected')){
    console.error('apt-rent: all months failed',k.sgg,got.map(x=>String(x.reason?.message||'ERROR')));
    return safeJson({error:'전월세 원본 API를 불러오지 못했습니다. 인증키와 활용승인 및 네트워크를 확인하세요.',status:'unavailable'},503);
  }
  const items=[];
  for(const x of got)if(x.status==='fulfilled')items.push(...makeRows(x.value,k.dong,k.name));
  const unique=new Map();for(const t of items)unique.set([t.date,t.area,t.floor,t.deposit,t.monthlyRent,t.contractType].join('|'),t);
  const matched=[...unique.values()].sort((a,b)=>b.date.localeCompare(a.date)||b.deposit-a.deposit);
  return safeJson({
    status:incomplete?'partial':'ok',
    complete:!incomplete,
    monthsChecked:months.filter((_m,i)=>got[i].status==='fulfilled'),
    source:'국토교통부 아파트 전월세 실거래가 자료',
    sourceUrl:'https://www.data.go.kr/data/15126474/openapi.do',
    matching:'법정동·단지명 정확 일치(정규화), 동일 전용면적은 화면에서 별도 필터',
    rows:matched.slice(0,160),
    totalMatched:matched.length,
    caveat:'원천 자료에는 계약 해제 여부와 동·호수 정보가 없을 수 있습니다. 신고 지연 및 갱신계약이 포함되며 모든 계약을 포괄하지 않습니다.'
  });
}
