// 국토교통부 아파트 전월세 실거래 조회. 인증키는 서버 환경변수에만 보관한다.
import { unstable_cache } from 'next/cache';
export const preferredRegion='icn1';
export const maxDuration=30;
const API='https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';
const fail=(error,status)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
const xmlText=(item,key)=>{const m=item.match(new RegExp('<'+key+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+key+'>','i'));return m?m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim():'';};
async function load(sgg,ym){
 const key=process.env.MOLIT_RENT_API_KEY||process.env.DATA_GO_KR_SERVICE_KEY;
 if(!key)throw new Error('API_KEY_NOT_CONFIGURED');
 const url=new URL(API);
 url.searchParams.set('serviceKey',key);
 url.searchParams.set('LAWD_CD',sgg);
 url.searchParams.set('DEAL_YMD',ym);
 url.searchParams.set('numOfRows','1000');
 url.searchParams.set('pageNo','1');
 const r=await fetch(url,{signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!r.ok)throw new Error('UPSTREAM_'+r.status);
 const xml=await r.text();
 const code=xmlText(xml,'resultCode');
 if(code&&code!=='00'&&code!=='000')throw new Error('UPSTREAM_CODE_'+code);
 const total=Number(xmlText(xml,'totalCount'))||0;
 if(total>1000)throw new Error('PAGINATION_REQUIRED');
 const items=[...xml.matchAll(new RegExp('<item>([\\s\\S]*?)</item>','g'))].map(m=>{
  const x=m[1],get=k=>xmlText(x,k);
  return {name:get('aptNm'),dong:get('umdNm'),area:Number(get('excluUseAr')),floor:Number(get('floor')),year:Number(get('buildYear')),day:Number(get('dealDay')),deposit:Number(get('deposit').replace(/,/g,'')),monthlyRent:Number(get('monthlyRent').replace(/,/g,'')),contractType:get('contractType')};
 });
 return {regionCode:sgg,month:ym,count:items.length,items};
}
const cached=unstable_cache(load,['molit-rent-v1'],{revalidate:86400});
export async function GET(req){
 const q=new URL(req.url).searchParams,sgg=q.get('sgg')||'',ym=q.get('month')||'';
 if(!/^\\d{5}$/.test(sgg)||!/^20\\d{4}$/.test(ym)||Number(ym.slice(4))<1||Number(ym.slice(4))>12)return fail('INVALID_PARAMETERS',400);
 if(!process.env.MOLIT_RENT_API_KEY&&!process.env.DATA_GO_KR_SERVICE_KEY)return fail('API_KEY_NOT_CONFIGURED',503);
 try{return Response.json(await cached(sgg,ym),{headers:{'cache-control':'public, max-age=300, s-maxage=3600'}});}
 catch(e){console.error('rent API',String(e.message));return fail('RENT_DATA_UNAVAILABLE',502);}
}
