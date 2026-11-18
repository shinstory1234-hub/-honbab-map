/* 30억 이상(CAPT 35) 공개 리치고 단지정보 개별 대조, 2026-11-18.
 * 각 출처는 docs/richgo-over30-audit-20261118.csv. 타 가격대에는 로드하지 않는다.
 * 국가 실거래 시세/평형/순위 모델은 변경하지 않으며, 단지 동일성(이름+지역+세대수) 확인 후에만 적용.
 * 공식 원본과 리치고가 다르더라도 사용자 요청에 따라 이 브랜치에서는 리치고 표기를 우선한다.
 */
(function(W){
  'use strict';
  if(W.CAPT!==35||!Array.isArray(W.PICKS))return;
  const rows=[["래미안원베일리","서울 서초구 반포동",2990,2023,299,"a8ysXJE"],["래미안원펜타스","서울 서초구 반포동",641,2024,299,"a9YMOSF"],["아크로리버파크","서울 서초구 반포동",1612,2016,299,"a3QuPzX"],["반포자이","서울 서초구 반포동",3410,2009,270,"a6jGQXZ"],["래미안퍼스티지","서울 서초구 반포동",2444,2009,269,"a1GKgZM"],["메이플자이","서울 서초구 잠원동",3307,2025,296,"a4qLSFI"],["신반포르엘","서울 서초구 잠원동",330,2023,299,"a0Fhmcn"],["잠실르엘","서울 송파구 신천동",1865,2026,299,"a5YFxWm"],["갤러리아포레","서울 성동구 성수동1가",230,2011,399,"a9UzMBR"],["아크로서울포레스트","서울 성동구 성수동1가",280,2021,599,"a8oncCj"],["나인원한남","서울 용산구 한남동",341,2019,147,"a1fSGYw"],["한남더힐","서울 용산구 한남동",600,2011,120,"a1HHjwH"],["브라이튼N40","서울 강남구 논현동",148,2022,199,"a5pxwri"],["목동신시가지3","서울 양천구 목동",1588,1986,122,"a6bwQVq"],["목동신시가지5","서울 양천구 목동",1848,1986,116,"a2AEaaR"],["목동신시가지7","서울 양천구 목동",2550,1986,125,"a6OaHQh"],["한양1차(영동한양)","서울 강남구 압구정동",936,1977,211,"a1aWokz"],["한양2","서울 강남구 압구정동",296,1978,143,"a5TvlRH"],["한양3","서울 강남구 압구정동",312,1978,198,"a5sghGy"]];
  const byKey=new Map();
  for(const d of W.PICKS){const key=d.n+'|'+d.area;if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(d);}
  const audit={reviewed:rows.length,present:0,matched:0,changedFar:0,filledFar:0,changedYear:0,changedUnits:0,unchanged:0,notLoaded:[],conflicts:[]};
  const references=W.RICHGO35_SOURCES=W.RICHGO35_SOURCES||Object.create(null);
  for(const [name,area,units,year,far,id] of rows){
    const key=name+'|'+area;
    const matched=byKey.get(key)||[];
    if(!matched.length){audit.notLoaded.push(key);continue;}
    audit.present++;
    if(matched.length!==1||Number(matched[0].units)!==units){
      audit.conflicts.push({key,observed:matched.map(d=>({units:d.units,year:d.year})),expectedUnits:units});
      continue;
    }
    const d=matched[0],f=W.FARD=W.FARD||{},prev=f[key],u=prev||[null,'',null,null,null,null,null];
    if(Number(d.year)!==year){d.year=year;audit.changedYear++;}
    // 세대수 불일치는 단지가 잘못 매칭됐을 수 있으므로 일괄 덮어쓰지 않는다.
    const old=Number(u[0]),had=Number.isFinite(old)&&old>0;
    if(!had){audit.filledFar++;}
    else if(Math.abs(old-far)>0.000001){audit.changedFar++;}
    else if(Number(d.year)===year){audit.unchanged++;}
    u[0]=far;u[1]='리치고 공개 단지정보';f[key]=u;
    // PLAT는 별도 사업성/표시 계산이 참조하는 용적률 근거값.
    const P=W.PLAT=W.PLAT||{};
    P[key]=[1,'리치고 공개 단지정보',far];
    references[key]='https://m.richgo.ai/realty/danji/'+id;
    audit.matched++;
  }
  W.RICHGO35_APPLIED=audit;
})(window);
