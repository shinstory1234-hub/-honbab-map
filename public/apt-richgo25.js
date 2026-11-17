/* 2026-11-18 Richgo public danji pages directly checked; cap 25 only.
 * Price/transactions remain based on the apartment-map source; this patch only reconciles verified complex FAR.
 * Loading after apt-far-normalize ensures the user's requested Richgo precedence for this band.
 */
(function(W){
  if(W.CAPT!==25)return;
  const verified={
    "양지마을(5단지)(한양515-529)|성남 분당구 수내동":[157,1430,1992,"a5rFSzF"],
    "극동1|서울 광진구 광장동":[204,1344,1985,"a7IoUKm"],
    "삼환|서울 송파구 가락동":[178,648,1984,"a6kgvOO"],
    "서울숲2차푸르지오|서울 성동구 금호동4가":[226,586,2012,"a7dmGTG"],
    "한양아파트|서울 송파구 송파동":[157,576,1983,"a1CXalG"],
    "문정가락현대1차|서울 송파구 문정동":[179,514,1984,"a6oOVEU"]
  };
  const F=W.FARD||{},P=W.PICKS||[];
/* 2026-11-18: 광장 극동 1차/2차 are distinct complexes: Richgo 448 + 896 = 1344 units.
 * The static apartment-map data incorrectly applied the combined 1344 to BOTH records.
 * Richgo does not display a FAR for 2차: leave that FAR missing, do not infer 204% from 1차.
 */
  const splitUnits={
    '극동1|서울 광진구 광장동':[448,1344,1985],
    '극동2|서울 광진구 광장동':[896,1344,1989]
  };
  let unitChanges=0;
  const UF=W.UNITFIX_M3||(W.UNITFIX_M3={});
  for(const [key,[units,raw,year]] of Object.entries(splitUnits)){
    const d=P.find(x=>x.n+'|'+x.area===key);
    if(!d||d.units!==raw||d.year!==year)continue;
    d.units=units;
    UF[key]=[units,raw,0,'richgo'];
    unitChanges++;
  }
  let changed=0,matched=0,skipped=0;
  for(const [key,[far,units,year,id]] of Object.entries(verified)){
    const d=P.find(x=>x.n+'|'+x.area===key);
    // Prevent accidental application to an unrelated homonymous complex.
    if(!d||d.units!==units&&!(key==="극동1|서울 광진구 광장동"&&d.units===448)||d.year!==year){skipped++;continue;}
    matched++;
    const f=F[key]||(F[key]=[null,"",null,null,null,null,null]);
    if(Number(f[0])!==far||f[1]!=="리치고(단지 직접확인)"){f[0]=far;f[1]="리치고(단지 직접확인)";changed++;}
  }
  W.RICHGO25_APPLIED={verified:Object.keys(verified).length,matched,changed,skipped,unitChanges};
})(window);
