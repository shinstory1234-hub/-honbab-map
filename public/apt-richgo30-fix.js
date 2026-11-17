/* 25~30억 탭의 리치고 공개 단지정보 직접 검증값 (2026-11-18). 근거: docs/richgo-25to30-audit-20261118.csv
   기존 용적률 정규화 이후 적용. 타 가격대와 실거래가·평형·순위 산식을 건드리지 않는다. */
(function(W){
  if(W.CAPT!==30||!W.FARD||!Array.isArray(W.PICKS))return;
  const rows=[["래미안그레이튼(진달래2차)|서울 강남구 역삼동",266,464,2010],["한양아파트|서울 송파구 송파동",157,576,1983],["양지마을(5단지)(한양515-529)|성남 분당구 수내동",157,1430,1992],["경희궁자이(2단지)|서울 종로구 홍파동",252,1148,2017],["서울숲리버뷰자이|서울 성동구 행당동",280,1034,2018],["목동신시가지7|서울 양천구 목동",125,2550,1986],["목동신시가지14|서울 양천구 신정동",146,3100,1987],["명수대현대|서울 동작구 흑석동",247,660,1988],["목동신시가지5|서울 양천구 목동",116,1848,1986],["한양|서울 광진구 자양동",156,444,1983],["목동신시가지3|서울 양천구 목동",122,1588,1986],["목동신시가지4|서울 양천구 목동",124,1382,1986],["한신서래|서울 서초구 반포동",216,414,1987],["개포우성3차|서울 강남구 개포동",179,405,1984]];
  const byKey=new Map(W.PICKS.map(d=>[d.n+'|'+d.area,d]));
  let applied=0,changed=0,skipped=0;
  for(const [key,far,units,year] of rows){
    const d=byKey.get(key),f=W.FARD[key];
    if(!d||!f||Number(d.units)!==units||Number(d.year)!==year){skipped++;continue;}
    applied++;
    if(Number(f[0])!==far||f[1]!=='리치고(직접확인)'){
      if(Number(f[0])!==far)changed++;
      f[0]=far;f[1]='리치고(직접확인)';
    }
  }
  W.APT_RICHGO30_AUDIT={verified:rows.length,applied,changed,skipped};
})(window);
