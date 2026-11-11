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
    var types=rows.map(function(r){return {
      py:r[0],p:r[1],n:r[2],n3:r[3],last:r[4],
      // upstream 실거래 기반: 최신 동일 면적대·동일 날짜의 실제 계약 중앙값(만원).
      // 없으면 null로 두고 12개월 가중중위만 사용한다.
      lastSale:Number.isFinite(Number(r[5]))&&Number(r[5])>0?Number(r[5]):null
    };});
    /* M3 전체 중간 가격대: 12개월 중위 추정이 가장 최근 정상 중개
       실거래보다 낮으면, 최근 275일·해당 평형 표본 2건 이상·급격한
       단일 이상값(추정치 대비 +25% 초과)을 제외한 범위에서
       실제 마지막 계약가를 가격대 분류와 표시 추정치의 하한으로 쓴다.
       거래일·금액은 상위 API가 거래 취소와 직거래를 제외한 값이다.
       6억 이하와 25억 이상은 기존 값을 보존한다. */
    if(window.CAPT>6&&window.CAPT<30){
      types.forEach(function(t){
        if(!(t.lastSale>t.p&&t.p>0&&t.n>=2))return;
        var millis=Date.parse(String(t.last||'')+'T00:00:00Z');
        if(!Number.isFinite(millis))return;
        var age=Math.max(0,(Date.now()-millis)/86400000);
        if(age>275)return;
        // 25억 이상 보호 구간으로 가격을 이동시키지 않는다.
        // 그 경우는 높은 최신 거래 근거만 표시하고 별도 가격위험 감점을 적용한다.
        if(t.lastSale>=250000){ t.latestAbove25=1; return; }
        if(t.lastSale>t.p*1.25){ t.latestFarAboveEstimate=1; return; }
        t.pBeforeLatest=t.p;
        t.p=Math.round(t.lastSale);
        t.latestPriceFloor=1;
      });
    }
    /* M3 중간 가격대: 같은 단지에서 면적이 더 큰 평형의 가격이
       거래가 충분한 작은 평형보다 낮아지는 역전 현상을 막는다.
       12개월 가중중위는 급등장에 후행하므로 작은 평형의 관측 시세를
       '추정가격 하한'으로 쓸 뿐 현재 호가나 실거래가라고 주장하지 않는다.
       인접한 두 평형(차이 6평 이내), 작은 평형 거래 5건 이상,
       가격 차이가 25% 이내인 경우에만 보정하고 원래 추정치는 따로 보존한다.
       6억 이하, 25억 이상은 가격도 기존 결과를 보존한다. */
    if(window.CAPT>6&&window.CAPT<30){
      var ordered=types.slice().sort(function(a,b){return a.py-b.py;});
      ordered.forEach(function(t){
        if(!(t.py>=18&&t.n>=2&&t.p>0)) return;
        var smaller=ordered.filter(function(u){
          return u.py<t.py&&t.py-u.py<=6&&u.n>=5&&u.p>0;
        });
        if(!smaller.length) return;
        var reference=smaller.reduce(function(a,u){return u.p>a.p?u:a;},smaller[0]);
        if(t.p<reference.p&&t.p>=reference.p*.75){
          t.pBeforeGuard=t.p;
          t.p=Math.round(reference.p);
          t.priceGuardFrom=reference.py;
          t.priceGuardEvidence=reference.n;
        }
      });
    }
    /* 새 아파트도 '표본 부족' 자체로 점수를 깎지는 않지만,
       근접한 큰 평형 거래가 충분한데 소형의 단독 이상 저가 계약을
       정상 시세로 오인하는 경우는 예산대 확정 추천에서 제외한다.
       6억 이하와 25억 이상 기존 시세·가격대는 수정하지 않는다.
       동일 단지 유사 평형 가격과 너무 크게 어긋난 표본만 검증 보류. */
    if(window.CAPT>6&&window.CAPT<30){
      types.forEach(function(t){
        if(!(t.n<=2 && t.n3===0 && t.p>0 && t.py>=12))return;
        var lastMs=Date.parse(String(t.last||'')+'T00:00:00Z');
        if(!Number.isFinite(lastMs)||(Date.now()-lastMs)<90*86400000)return;
        var comps=types.filter(function(u){return u!==t&&u.n>=5&&u.p>0&&Math.abs(u.py-t.py)<=8;});
        if(!comps.length)return;
        var estimates=comps.map(function(u){return {py:u.py,p:u.p,expected:u.p*t.py/u.py,anchorN:u.n};});
        // 정상 거래 5건 이상 비교군이 환산해 주는 값보다 22% 넘게 싸면
        // 현재 구매 가능가격이 확인될 때까지 순위 후보에서 제외한다.
        var best=estimates.sort(function(a,b){return Math.abs(a.py-t.py)-Math.abs(b.py-t.py);})[0];
        if(t.p<best.expected*.78){
          t.priceReview=1;
          t.priceReviewAnchorPy=best.py;
          t.priceReviewReason='유사 평형 실거래와 가격 괴리';
          (window.LIVE_PRICE_REVIEW=window.LIVE_PRICE_REVIEW||[]).push({
            name:d.n,area:d.area,py:t.py,oldPrice:t.p,anchorPy:best.py,anchorPrice:best.p
          });
        }
      });
    }
    /*
       LIVEP는 일부 단지에서 한 평형만 내려오며, 그때 기존 유니버스의
       나머지 정상 거래 평형을 모두 지워 버리던 문제를 복구한다.
       원본 평형은 apt-univ10/15/20/30 합집합에서 이미 확보했다.
       동일 평형은 최신 LIVEP를 우선하고, LIVEP가 아예 제공하지 않은
       평형만 12개월 거래 3건 이상인 경우 보조 자료로 보존한다.
       보조 자료의 가격은 현재가가 아닌 저장된 참조가격으로 명시한다.
       모든 고가 탭에 동일 규칙을 적용하고, 6억 이하에서는 로드하지 않는다.
    */
    var snapshot=d.types||[];
    var currentPys=new Set(types.map(function(t){return t.py;}));
    var recovered=snapshot.filter(function(t){
      return Number.isFinite(Number(t.py))&&Number(t.py)>=13&&
        Number.isFinite(Number(t.p))&&Number(t.p)>0&&
        Number(t.n)>=3&&!currentPys.has(Number(t.py));
    }).map(function(t){return {...t,snapshotOnly:1,n3:Number(t.n3)||0};});
    if(recovered.length){
      (window.LIVE_MISSING_TYPES=window.LIVE_MISSING_TYPES||[]).push({
        name:d.n,area:d.area,liveKey:sourceKey,
        restored:recovered.map(function(t){return {py:t.py,p:t.p,n:t.n};})
      });
    }
    var mergedTypes=types.concat(recovered);
    var me=mergedTypes.find(function(t){return t.py===d.py;})
      ||mergedTypes.slice().sort(function(a,b){return Math.abs(a.py-d.py)-Math.abs(b.py-d.py);})[0];
    d.types=mergedTypes; d.py=me.py; d.p=me.p; d.live=1; d.liveKey=sourceKey;
    d.snapshotOnly=!!me.snapshotOnly;
    var src=me.snapshotOnly?
      '실시간 실거래 조회에서 해당 평형이 누락되어 기존 수집 시세를 임시 사용(현재가 재확인 필요)':
      me.latestPriceFloor?'최근 정상 중개 실거래 '+me.last+'의 '+eok(me.lastSale)+'을 하한으로 적용한 추정 시세':
      ('최근 12개월 실거래 '+me.n+'건(3개월 '+me.n3+'건, 직거래 제외)을 오늘 기준으로 환산해 최근 거래에 무게를 둔 시세');
    d.headline=d.py+'평 '+eok(d.p)+(me.snapshotOnly?' · 기존 수집 참고시세':' · 현재 시세');
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
    var ok=e.types.filter(function(t){return !t.priceReview&&!odd(t,e.types,e);}); if(ok.length===e.types.length) continue;
    drop+=e.types.length-ok.length;
    if(!ok.length){ P.splice(j,1); continue; }
    e.types=ok;
    if(!ok.some(function(t){return t.py===e.py;})){   // 대표 평형이 빠졌으면 가장 가까운 평형으로
      var me3=ok.slice().sort(function(a,b){return Math.abs(a.py-e.py)-Math.abs(b.py-e.py);})[0]; e.py=me3.py; e.p=me3.p; e.headline=e.py+'평 '+eok(e.p)+' · 현재 시세'; } }
  window.LIVE_DROP=drop;
  window.LIVE_HIT=hit;
})();

