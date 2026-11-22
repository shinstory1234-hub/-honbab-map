/* 6억 이하 탭 현재 시세(2026.11.14)
   - 예전: 6억 탭은 2026.10.21까지의 고정 시세(apt-cur.js)만 썼음 → 순위가 실거래를 따라가지 않았음
   - 지금: 매일 다시 계산되는 window.LIVEP(apt-live6.js ← realestate-media /api/backtest/aptlive?min=0)로
     window.CUR(단지명|지역 → [평, 시세, 12개월 건수, 3개월 건수, 마지막 거래])를 덮어씀.
     본문(apt-map.html)이 CUR로 평형·가격대(6억 이하)를 다시 고르므로, 6억을 넘은 평형은 빠지고 순위도 다시 계산됨.
   - 평촌센텀퍼스트는 기존 자료를 그대로 두고 순위 1위로 고정(PIN_FIRST, 본문 순위 계산에서 사용).
   - LIVEP에 없는 단지(최근 12개월 실거래 없음)는 예전 자료 그대로 */
(function(){
  if(window.CAPT!==6) return;
  window.PIN_FIRST=['평촌센텀퍼스트|안양 동안구 호계동'];
  var L=window.LIVEP, P=window.PICKS;
  window.LIVE_ON=!!L;
  if(!L||!P||!P.length) return;
  var CUR=window.CUR=window.CUR||{}, FD=window.FARD||{};
  var keep={}; window.PIN_FIRST.forEach(function(k){ keep[k]=1; });
  var evidence=window.APT_PRICE_EVIDENCE;
  var dot=function(s){ return String(s||'').replace(/-/g,'.'); };
  var hit=0, seen={}, LU=window.CUR_LIVE_U={}, held=window.CUR_LIVE_HELD={};
  for(var i=0;i<P.length;i++){
    var d=P[i], k=d.n+'|'+d.area;
    /* 2026.11.14 버그 수정: 예전엔 자동 수집 단지(d.u, 6억 탭 2,755곳 중 2,421곳)를 건너뛰어 실제로 매일 시세가 바뀐 단지가
       326곳뿐이었음 → 자동 수집 단지도 덮어씀(본문은 CUR_LIVE에 표시된 자동 수집 단지만 CUR을 사용) */
    if(seen[k]||keep[k]) continue; seen[k]=1;
    var src=evidence.keyFor(d,FD), rows=src&&L[src];
    evidence.note(d,src,rows);
    if(!rows) continue;
    if(!rows.length){
      // 상위 집계에서 철회한 평형: 이전 정적 시세로 되돌아가지 않도록 명시적 제외.
      CUR[k]=[[0,Number.MAX_SAFE_INTEGER,0,0,null]];
      if(d.u) LU[k]=1;
      hit++;
      continue;
    }
    // 30평 3억의 매매 계약과 표본을 상세 원본에서 확인하지 못했다.
    // 이 가격의 재노출만 막고 이후 새 시세와 나머지 평형은 정상 반영한다.
    const usable=rows.filter(r=>{
      if(r[0]<0){held[k]=src;evidence.reviewNote(d,-r[0],r[2]===1);return false;}
      if(src==='41150|용현동|힐스테이트탑석'&&r[0]===30&&r[1]===30000){
        (window.LIVE_PRICE_REVIEW??=[]).push({name:d.n,area:d.area,py:30,reason:'상세 매매 기록과 시세가 달라 확인이 필요합니다.'});
        return false;
      }
      return true;
    });
    CUR[k]=usable.map(function(r){ return [r[0], r[1], r[2], r[3], dot(r[4])]; });
    if(d.u) LU[k]=1;
    hit++;
  }
  window.LIVE_HIT=hit;
})();
