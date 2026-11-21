/* 상세 거래와 모집공고를 대조한 순위용 검증 보류. 공급 유형을 제외하면
   확인한 마지막 거래일까지 적용해 이후 정상 거래가 집계되면 자동으로 해제한다. */
(function(root){
  const direct='직거래 외에 확인된 매매 표본이 없습니다.';
  const repeat='같은 신고로 보이는 기록이 있어 거래 표본 확인이 필요합니다.';
  const low='최근 두 거래 중 큰 폭으로 낮은 계약에 시세가 집중됐습니다.';
  const rules={
    '11710|신천동|잠실르엘':[[24,'2026-02-27',322599,direct],[30,'2026-02-26',365138,direct]],
    '11680|도곡동|삼성래미안':[[24,'2026-01-12',248352,direct]],
    '11650|서초동|진흥아파트':[[52,'2026-06-15',325860,direct]],
    '11680|청담동|동양파라곤':[[90,'2026-05-21',764923,direct]],
    '11710|방이동|올림픽선수기자촌2단지':[[24,'2025-12-11',173775,direct]],
    '11680|청담동|청담현대3차아파트':[[34,'2026-05-19',188747,direct]],
    '28237|산곡동|부평캐슬&더샵퍼스트':[[16,'',17832,'임대 공급 평형의 동일 날짜 거래로, 일반 매매 시세 확인이 필요합니다.']],
    '28185|송도동|더샵엑스포6단지':[[46,'2026-05-27',61806,'다른 전용면적과 중복 의심 기록이 같은 시세에 묶여 있습니다.']],
    '28185|송도동|더샵엑스포10단지':[[68,'2026-01-14',241337,repeat]],
    '28275|청라동|청라SKVIEW':[[86,'2026-03-31',211116,repeat]],
    '41271|사동|늘푸른':[[58,'2026-10-08',54443,'최근 1층 계약이 평형 시세에 크게 반영됐습니다.',55000]],
    '28177|학익동|엑슬루타워':[[44,'2026-10-13',33000,low,35000]],
  };
  // 날짜·전용면적·층·금액이 같아 독립 표본 여부를 확인할 수 없는 경우.
  const repeats={
    '11470|목동|목동롯데캐슬마에스트로':{30:'2025-12-24'},
    '11470|목동|성원2':{32:'2025-12-02'},
    '11470|목동|목동신시가지1':{34:'2025-12-30',36:'2025-12-26',38:'2025-12-26'},
    '11200|성수동1가|서울숲아이파크리버포레1차':{24:'2026-04-06'},
    '11470|신정동|목동신시가지12':{26:'2025-12-10'},
    '11470|목동|목동신시가지4':{28:'2026-01-15'},
    '11590|흑석동|롯데캐슬에듀포레':{34:'2026-03-26'},
    '11470|목동|트라팰리스웨스턴에비뉴':{50:'2025-12-21'},
    '28185|송도동|송도더샵하버뷰(D13)':{88:'2026-03-07'},
    '28275|청라동|청라SKVIEW':{52:'2026-04-29'},
  };
  function sample(source,row){
    return row[2]>1&&repeats[source]?.[row[0]]===row[4]?1:undefined;
  }
  const names=new Set(Object.keys(rules).map(k=>k.split('|')[2]));
  const matches=(rule,py,p,last)=>rule[0]===py&&(!rule[1]||!last||last.replace(/\./g,'-')<=rule[1])&&(!rule[4]||p<=rule[4]);
  function eligible(source,rows){
    const checks=rules[source];
    return checks?rows.filter(r=>!checks.some(rule=>matches(rule,r[0],r[1],r[4]))):rows;
  }
  function note(d,source,rows){
    const checks=rules[source];
    if(!checks)return;
    for(const rule of checks){
      if(!root.inBand(rule[2])||rows?.some(r=>r[0]===rule[0]&&!matches(rule,r[0],r[1],r[4])))continue;
      (root.LIVE_PRICE_REVIEW??=[]).push({name:d.n,area:d.area,py:rule[0],reason:rule[3]});
    }
  }
  function staticHeld(d){
    if(d.live||!names.has(d.n))return false;
    const key=d.n+'|'+d.area, fd=root.FARD?.[key];
    const checks=rules[fd?.[6]+'|'+d.area.split(' ').pop()+'|'+d.n];
    return checks?.some(rule=>matches(rule,d.py,d.p,d.types?.find(t=>t.py===d.py)?.last));
  }
  root.APT_PRICE_EVIDENCE={eligible,note,staticHeld,sample};
})(typeof window==='undefined'?globalThis:window);
