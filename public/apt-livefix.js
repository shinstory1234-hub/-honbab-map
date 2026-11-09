/* 저평가지도 6억 초과 탭 현재 시세 반영(2026.11.3)
   - 세 탭(6~10·10~15·15~20억) 단지 자료를 모두 읽고(시세가 올라 탭이 바뀐 단지도 옮겨 가게) 같은 단지는 하나로 합침
   - 시세는 매일 다시 계산되는 window.LIVEP(apt-live.js ← realestate-media /api/backtest/aptlive)로 덮어씀:
     법정동·단지명·면적대 묶음(2026.11.3 수정: 예전엔 '구+번지'로 묶어 다른 동 같은 번지 단지 거래가 섞였음), 해제·직거래 제외,
     시군구 월지수로 오늘 기준 환산, 최근 거래 가중(반감기 45일) 중위 — 환산값은 최근 12개월 실거래 최저×0.95~최고×1.05 안으로 제한
   - LIVEP에 없는 단지(최근 12개월 4.5억 이상 거래 없음)는 예전 자료 그대로 */
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
    '주공8|광명시 하안동':'41210|하안동|주공8(고층)'
  };
  window.aptSourceKey=function(d){
    var k=d.n+'|'+d.area, fd=(window.FARD||{})[k], sgg=fd&&fd[6];
    if(window.CAPT>6&&Object.prototype.hasOwnProperty.call(aliases,k)) return aliases[k];
    return sgg?sgg+'|'+d.area.split(' ').pop()+'|'+d.n:null;
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
  var hit=0;
  P.forEach(function(d){
    var sourceKey=window.aptSourceKey(d), rows=sourceKey&&L[sourceKey];
    if(!rows||!rows.length) return;
    hit++;
    var types=rows.map(function(r){return {py:r[0],p:r[1],n:r[2],n3:r[3],last:r[4]};});
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
  });
  /* 이상 거래 평형 제외: 기존 단지에서 최근 12개월 거래 2건 이하이고 같은 단지 다른 평형과 가격이 비정상적으로 역전되면 제외한다.
     입주 3년 이내 신축은 등기·입주 진행으로 거래량이 적은 것이 정상일 수 있어 이 거래량 규칙을 적용하지 않는다. */
  var drop=0, odd=function(t,ts,d){ if((2026-(d.year||0))<=3||t.n>2) return false;
      var sm=ts.filter(function(u){return u.py<t.py&&u.n>=3;}).reduce(function(m,u){return Math.max(m,u.p);},0); if(sm>0&&t.p<sm) return true;
      /* 큰 평형(거래 3건 이상)보다 평당가가 15% 넘게 싸도 특수 거래(예: 올림픽선수기자촌2단지 62㎡ 1건 16.6억 — 84㎡는 28~32억) */
      var bp=ts.filter(function(u){return u.py>t.py&&u.n>=3;}).reduce(function(m,u){return Math.max(m,u.p/u.py);},0); return bp>0&&t.p/t.py<bp*.85; };
  for(var j=P.length-1;j>=0;j--){ var e=P[j]; if(!e.live||!e.types) continue;
    var ok=e.types.filter(function(t){return !odd(t,e.types,e);}); if(ok.length===e.types.length) continue;
    drop+=e.types.length-ok.length;
    if(!ok.length){ P.splice(j,1); continue; }
    e.types=ok;
    if(!ok.some(function(t){return t.py===e.py;})){   // 대표 평형이 빠졌으면 가장 가까운 평형으로
      var me3=ok.slice().sort(function(a,b){return Math.abs(a.py-e.py)-Math.abs(b.py-e.py);})[0]; e.py=me3.py; e.p=me3.p; e.headline=e.py+'평 '+eok(e.p)+' · 현재 시세'; } }
  window.LIVE_DROP=drop;
  window.LIVE_HIT=hit;
})();

