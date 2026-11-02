/* 저평가지도 6억 초과 탭 현재 시세 반영(2026.11.3)
   - 세 탭(6~10·10~15·15~20억) 단지 자료를 모두 읽고(시세가 올라 탭이 바뀐 단지도 옮겨 가게) 같은 단지는 하나로 합침
   - 시세는 매일 다시 계산되는 window.LIVEP(apt-live.js ← realestate-media /api/backtest/aptlive)로 덮어씀:
     지번·면적대 묶음(신고 단지명 엇갈림 보정), 해제·직거래 제외, 시군구 월지수로 오늘 기준 환산, 최근 거래 가중(반감기 45일) 중위
   - LIVEP에 없는 단지(최근 12개월 4.5억 이상 거래 없음)는 예전 자료 그대로 */
(function(){
  var P=window.PICKS, L=window.LIVEP||null, F=window.FARD||{};
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
    var fd=F[d.n+'|'+d.area], sgg=fd&&fd[6], dong=d.area.split(' ').pop(), rows=sgg&&L[sgg+'|'+dong+'|'+d.n];
    if(!rows||!rows.length) return;
    hit++;
    var types=rows.map(function(r){return {py:r[0],p:r[1],n:r[2],n3:r[3],last:r[4]};});
    var me=types.find(function(t){return t.py===d.py;})
      ||types.slice().sort(function(a,b){return Math.abs(a.py-d.py)-Math.abs(b.py-d.py);})[0];
    d.types=types; d.py=me.py; d.p=me.p; d.live=1;
    var src='최근 12개월 실거래 '+me.n+'건(3개월 '+me.n3+'건, 직거래 제외)을 오늘 기준으로 환산해 최근 거래에 무게를 둔 시세';
    d.headline=d.py+'평 '+eok(d.p)+' · 현재 시세';
    d.deal=src+' '+eok(d.p)+(me.last?' (마지막 거래 '+me.last+')':'');
    d.sub=d.units.toLocaleString()+'세대, '+d.year+'년 입주. 이 평형 '+src+' '+eok(d.p)+'.';
    // 같은 단지 큰 평형 비교값(bench)도 현재 시세로
    var big=types.filter(function(t){return t.py>d.py;}).sort(function(a,b){return b.py-a.py;})[0];
    if(big) d.bench={ppp:Math.round(big.p/big.py),name:'같은 단지 '+big.py+'평 '+eok(big.p)+' · 현재 시세'};
  });
  window.LIVE_HIT=hit;
})();
