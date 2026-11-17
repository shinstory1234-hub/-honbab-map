// K-apt 공동주택 목록→기본·상세정보. 검증된 단지코드로만 주차·난방 수치 제공.
import { unstable_cache } from 'next/cache';
import { govtGet, nameKey, validKey, safeJson } from '../../../lib/apt-openapi.mjs';

export const preferredRegion='icn1';
export const maxDuration=30;
const BASE='/1613000/';
const listByDistrict=unstable_cache(async(sgg)=>{
  const rows=await govtGet(BASE+'AptListService4/getSigunguAptList4',{sigunguCode:sgg,numOfRows:3000,pageNo:1,dataType:'JSON'},14000);
  if(rows.total>rows.items.length)throw Error('KAPT_LIST_INCOMPLETE');
  return rows.items;
},['apt-kapt-district-v1'],{revalidate:604800});
const detailByCode=unstable_cache(async(code)=>{
  const [a,b]=await Promise.all([
    govtGet(BASE+'AptBasisInfoServiceV5/getAphusBassInfoV5',{kaptCode:code,dataType:'JSON'},14000),
    govtGet(BASE+'AptBasisInfoServiceV5/getAphusDtlInfoV5',{kaptCode:code,dataType:'JSON'},14000)
  ]);
  const basic=a.items[0],detail=b.items[0];
  if(!basic||!detail)throw Error('KAPT_DETAILS_MISSING');
  return {basic,detail};
},['apt-kapt-basic-details-v1'],{revalidate:604800});
const num=x=>{if(x==null||String(x).trim()==='')return null;const n=Number(String(x).replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:null;};
function sameDong(v,dong){return String(v||'').replace(/\s/g,'').includes(String(dong||'').replace(/\s/g,''));}
function selectCandidate(list,key){
  const target=nameKey(key.name);
  const names=list.filter(i=>nameKey(i.kaptName)===target && (!i.bjdCode||String(i.bjdCode).slice(0,5)===key.sgg) && /^A\d{7,12}$/.test(String(i.kaptCode||'')));
  const local=names.filter(i=>{
    const address=[i.as3,i.as4,i.kaptAddr,i.bjdName].filter(Boolean).join(' ');
    // 지역정보가 없으면 상세정보 조회 후 검증. 주소가 있을 때 다른 동이면 절대 혼용하지 않는다.
    return !address || sameDong(address,key.dong);
  });
  return local;
}
export async function GET(req){
  const u=new URL(req.url),key=validKey(u.searchParams.get('k'));
  if(!key)return safeJson({error:'단지 식별키가 올바르지 않습니다.'},400);
  try{
    const list=await listByDistrict(key.sgg);
    const found=selectCandidate(list,key);
    if(found.length===0)return safeJson({status:'unmatched',source:'K-apt',message:'단지명과 주소가 일치하는 공식 K-apt 단지를 찾지 못했습니다.'});
    if(found.length>1)return safeJson({status:'ambiguous',source:'K-apt',message:'동일 이름의 K-apt 단지가 여러 곳이므로 잘못된 정보를 표시하지 않습니다.'});
    const code=found[0].kaptCode;
    const {basic,detail}=await detailByCode(code);
    const address=String(basic.kaptAddr||'')+' '+String(basic.doroJuso||'');
    if(nameKey(basic.kaptName)!==nameKey(key.name) || !sameDong(address,key.dong)
      || (basic.bjdCode && String(basic.bjdCode).slice(0,5)!==key.sgg))
      return safeJson({status:'unmatched',source:'K-apt',message:'K-apt 상세정보의 단지명 또는 법정동이 다릅니다.'});
    const households=num(basic.kaptdaCnt),ground=num(detail.kaptdPcnt),underground=num(detail.kaptdPcntu);
    const parking=ground!=null && underground!=null?ground+underground:null;
    const expected=num(u.searchParams.get('units'));
    const unitConflict=expected>0&&households>0&&Math.abs(expected-households)/Math.max(expected,households)>.15;
    return safeJson({
      status:unitConflict?'unit-conflict':'ok',
      verified:!unitConflict,
      source:'K-apt 국토교통부 공동주택 기본·상세 정보',
      sourceUrl:'https://www.data.go.kr/data/15058453/openapi.do',
      kaptCode:code,
      kaptName:String(basic.kaptName),
      address:String(basic.kaptAddr||''),
      households,
      buildingCount:num(basic.kaptDongCnt),
      topFloor:num(basic.kaptTopFloor),
      heating:String(basic.codeHeatNm||'')||null,
      parkingGround:ground,
      parkingUnderground:underground,
      parkingTotal:parking,
      parkingPerHousehold:parking!=null&&households>0?Math.round(parking/households*100)/100:null,
      note:unitConflict?'아파트맵의 세대수와 K-apt 관리단지 세대수가 15% 넘게 달라 주차율을 표시하지 않습니다. 관리단지 통합·분리 여부를 확인해야 합니다.':'K-apt 관리단지 기준입니다. 개별 매매단지와 관리 경계가 다를 수 있습니다.'
    });
  }catch(e){
    console.error('apt-kapt lookup failed',key.sgg,e?.message);
    return safeJson({status:'unavailable',error:'공식 K-apt 자료 조회에 실패했습니다. 인증키 승인·목록 API 권한 또는 원본 서버를 확인하세요.'},503);
  }
}
