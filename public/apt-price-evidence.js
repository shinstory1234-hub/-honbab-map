/* 상세 거래와 모집공고를 대조한 순위용 검증 보류. 공급 유형을 제외하면
   확인한 마지막 거래일까지 적용해 이후 정상 거래가 집계되면 자동으로 해제한다. */
(function(root){
  // 순위와 상세 실거래가 같은 원천 단지명을 사용한다.
  const aliases={
    '상계주공14|서울 노원구 상계동':'11350|상계동|상계주공14(고층)',
    '상계주공10|서울 노원구 상계동':'11350|상계동|상계주공10(고층)',
    '상계주공2|서울 노원구 상계동':'11350|상계동|상계주공2(고층)',
    '주공8|광명시 하안동':'41210|하안동|주공8(고층)',
    '비산동 은하수한양|안양 동안구 비산동':'41173|비산동|은하수마을한양',
    '송내동 우성|부천 소사구 송내동':'41194|송내동|우성',
    '신별내퇴계원어울림|남양주시 퇴계원읍':'41360|퇴계원읍 퇴계원리|신별내퇴계원어울림',
    '한일베라체|화성 만세구 향남읍':'41591|향남읍 행정리|한일베라체',
  };
  function keyFor(d,far){
    if(d.liveKey)return d.liveKey;
    const key=d.n+'|'+d.area, sgg=far?.[key]?.[6];
    return aliases[key]||(sgg?sgg+'|'+d.area.split(' ').pop()+'|'+d.n:null);
  }
  const direct='직거래 외에 확인된 매매 표본이 없습니다.';
  const repeat='같은 신고로 보이는 기록이 있어 거래 표본 확인이 필요합니다.';
  const mixed='최근 직거래를 빼면 오래된 매매 한 건만 확인됩니다.';
  const low='최근 두 거래 중 큰 폭으로 낮은 계약에 시세가 집중됐습니다.';
  const rules={
    '11380|진관동|상림마을7단지아이파크(730~742동)BL1-14':[[68,'2026-04-01',86962,direct]],
    '11440|용강동|이편한세상마포리버파크':[[34,'2026-04-10',210624,mixed]],
    '11215|광장동|워커힐':[[66,'2026-06-29',254402,direct]],
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
    '41287|가좌동|가좌마을7단지꿈에그린':{64:'2026-03-17'},
    '11470|목동|롯데캐슬위너':{46:['2026-07-18',3,2]},
    '11470|신정동|목동신시가지14':{44:['2026-03-06',4,2]},
    '11590|신대방동|롯데낙천대':{44:['2026-05-18',3,2]},
    '28155|운남동|영종자이':{46:['2026-02-07',4,2],56:['2026-07-18',5,3]},
    '28185|송도동|더샵엑스포10단지':{52:['2026-04-01',3,2]},
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
    const match=repeats[source]?.[row[0]];
    if(!match)return;
    if(typeof match==='string')return row[2]===2&&match===row[4]?1:undefined;
    if(match[0]===row[4]&&match[1]===row[2])return match[2];
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
  function reviewNote(d,py,stale){
    (root.LIVE_PRICE_REVIEW??=[]).push({name:d.n,area:d.area,py,
      reason:stale?'180일 넘은 단일 거래로 시세 확인이 필요합니다.':undefined});
  }
  function staticHeld(d){
    if(d.live||!names.has(d.n))return false;
    const checks=rules[keyFor(d,root.FARD)];
    return checks?.some(rule=>matches(rule,d.py,d.p,d.types?.find(t=>t.py===d.py)?.last));
  }
  root.APT_PRICE_EVIDENCE={keyFor,eligible,note,reviewNote,staticHeld,sample};
})(typeof window==='undefined'?globalThis:window);
