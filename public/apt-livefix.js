/* 6억 초과 탭의 순위용 실거래 시세. 가격대를 나누기 전에 동일 기준으로 검증한다. */
(function(){
  var P=window.PICKS, L=window.LIVEP||null;
  /* 2026.11.9: 표시 이름과 실거래 원자료 이름의 확인된 대응표.
     아래 네 단지의 기존 평형 구성·거래 건수가 원자료의 고층 구분과 일치한다.
     저층 거래를 합치거나 괄호·단지번호를 일괄 제거하지 않는다. 시세와 급지가 같은 키를 쓴다.
     이 파일은 6억 초과에서만 로드되며 함수에도 가격대 조건을 둬 6억 이하를 보존한다. */
  var aliases={
    '상계주공14|서울 노원구 상계동':'11350|상계동|상계주공14(고층)',
    '상계주공10|서울 노원구 상계동':'11350|상계동|상계주공10(고층)',
    '상계주공2|서울 노원구 상계동':'11350|상계동|상계주공2(고층)',
    '주공8|광명시 하안동':'41210|하안동|주공8(고층)',
    '송내동 우성|부천 소사구 송내동':'41194|송내동|우성',
    '신별내퇴계원어울림|남양주시 퇴계원읍':'41360|퇴계원읍 퇴계원리|신별내퇴계원어울림',
    '한일베라체|화성 만세구 향남읍':'41591|향남읍 행정리|한일베라체'
  };
  var quality=window.APT_PRICE_QUALITY, findSource=L&&quality.matcher(L);
  window.aptSourceKey=function(d){
    if(d.liveKey)return d.liveKey;
    var k=d.n+'|'+d.area, fd=(window.FARD||{})[k], sgg=fd&&fd[6];
    if(window.CAPT>6&&Object.prototype.hasOwnProperty.call(aliases,k)) return aliases[k];
    var key=sgg?sgg+'|'+d.area.split(' ').pop()+'|'+d.n:null;
    return findSource&&findSource(key)||key;
  };
  if(!P||!P.length) return;
  var eok=function(v){var e=Math.floor(v/10000),m=Math.round(v%10000/100)*100;return e?(m?e+'억 '+m.toLocaleString():e+'억'):m.toLocaleString()+'만';};
  // ① 같은 단지 합치기(타입 합집합, 앞 파일 값 유지)
  var by={}, out=[];
  for(var i=0;i<P.length;i++){ var d=P[i], k=d.n+'|'+d.area, o=by[k];
    if(!o){ by[k]=d; out.push(d); continue; }
    (d.types||[]).forEach(function(t){ if(!o.types.some(function(u){return u.py===t.py;})) o.types.push(t); }); }
  P.length=0; Array.prototype.push.apply(P,out);
  window.LIVE_ON=!!L; if(!L) return;
  var hit=0, drop=0, withdrawn={}, asOf=Date.parse(window.LIVEP_AT);
  P.forEach(function(d){
    var sourceKey=window.aptSourceKey(d), rows=sourceKey&&L[sourceKey];
    if(!rows) return;
    var checked=quality.review(rows);
    if(!checked.rows.length){
      withdrawn[d.n+'|'+d.area]=1;
      return;
    }
    hit++; drop+=checked.held.size;
    var types=checked.rows.map(function(r){return {
      py:r[0],p:r[1],n:r[2],n3:r[3],last:r[4],
      priceConflict:checked.conflicts.has(r[0]),
      lastSale:Number(r[5])>0?Number(r[5]):null
    };});
    types.forEach(function(t){
      if(t.p<=60000||t.p>=250000||t.n<2||!(t.lastSale>t.p))return;
      var last=Date.parse(t.last);
      if(!Number.isFinite(last)||!Number.isFinite(asOf)||asOf-last>275*86400000)return;
      if(t.lastSale>=250000)t.latestAbove25=1;
      else if(t.lastSale>t.p*1.25)t.latestFarAboveEstimate=1;
    });
    var me=types.find(function(t){return t.py===d.py;})
      ||types.slice().sort(function(a,b){return Math.abs(a.py-d.py)-Math.abs(b.py-d.py);})[0];
    d.types=types; d.py=me.py; d.p=me.p; d.live=1; d.liveKey=sourceKey;
    var src='최근 12개월 실거래 '+me.n+'건(3개월 '+me.n3+'건, 직거래 제외)을 오늘 기준으로 환산해 최근 거래에 무게를 둔 시세';
    d.headline=d.py+'평 '+eok(d.p)+' · 현재 시세';
    d.deal=src+' '+eok(d.p)+(me.last?' (마지막 거래 '+me.last+')':'');
    d.sub=d.units.toLocaleString()+'세대, '+d.year+'년 입주. 이 평형 '+src+' '+eok(d.p)+'.';
    // 같은 단지 큰 평형 비교값(bench)도 현재 시세로
    var big=types.filter(function(t){return t.py>d.py;}).sort(function(a,b){return b.py-a.py;})[0];
    if(big) d.bench={ppp:Math.round(big.p/big.py),name:'같은 단지 '+big.py+'평 '+eok(big.p)+' · 현재 시세'};
    else if(checked.held.size&&/^같은 단지 /.test(d.bench?.name||''))d.bench=null;
  });
  for(var wi=P.length-1;wi>=0;wi--){
    if(withdrawn[P[wi].n+'|'+P[wi].area]) P.splice(wi,1);
  }
  window.LIVE_DROP=drop;
  window.LIVE_HIT=hit;
})();

