/* 상세 거래와 모집공고를 대조한 순위용 검증 보류. 공급 유형을 제외하면
   확인한 마지막 거래일까지 적용해 이후 정상 거래가 집계되면 자동으로 해제한다. */
(function(root){
  const direct='직거래 외에 확인된 매매 표본이 없습니다.';
  const repeat='같은 신고로 보이는 기록이 있어 거래 표본 확인이 필요합니다.';
  const low='최근 두 거래 중 큰 폭으로 낮은 계약에 시세가 집중됐습니다.';
  const rules={
    '11680|청담동|청담현대3차아파트':[[34,'2026-05-19',188747,direct]],
    '28237|산곡동|부평캐슬&더샵퍼스트':[[16,'',17832,'임대 공급 평형의 동일 날짜 거래로, 일반 매매 시세 확인이 필요합니다.']],
    '28185|송도동|더샵엑스포6단지':[[46,'2026-05-27',61806,'다른 전용면적과 중복 의심 기록이 같은 시세에 묶여 있습니다.']],
    '28185|송도동|더샵엑스포10단지':[[68,'2026-01-14',241337,repeat]],
    '28275|청라동|청라SKVIEW':[[86,'2026-03-31',211116,repeat]],
    '41271|사동|늘푸른':[[58,'2026-10-08',54443,'최근 1층 계약이 평형 시세에 크게 반영됐습니다.',55000]],
    '28177|학익동|엑슬루타워':[[44,'2026-10-13',33000,low,35000]],
  };
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
  root.APT_PRICE_EVIDENCE={eligible,note,staticHeld};
})(typeof window==='undefined'?globalThis:window);
