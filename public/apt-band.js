/* 6억지도 순위 범위(평가 4번) — recompute()가 ORDER·rank를 정한 뒤 호출: s10Band();
   비중 가정 범위: 채택한 (기본 모델 내부 세대수40%·입지40%·여력20%, 총90점) 주변에서 가드레일(상위 50곳 언덕·역 먼 단지 비율 ≤ 전체 기저율)을 통과하는 설정들
   각 설정에서 페이지 전체 단지의 순위를 다시 매겨 중앙값·최소~최대 범위를 d.band=[중앙, 최고, 최저]로 둠. 등급은 중앙 순위 기준. */
window.S10PLAUS=[[.25,.2],[.5,.1],[.5,.2],[.5,.3],[.75,.2]];   // 채택 설정(기본 모델 내부 세대수40%·입지40%·여력20%, 총90점) 주변
function s10Band(){ const n=D.length, M=D.map(()=>[]);
  for(const [lm,uw] of S10PLAUS){
    const sc=D.map((d,i)=>{ const s=d.s4; if(!s) return -1; return s4Total((1-uw)*((1-lm)*s.pU+lm*s.pLoc)+uw*s.pUp,s.rawDp||0,s.peakBonus||0,s4EditorialFirst(d)); });
    const o=sc.map((v,i)=>i).sort((a,b)=>Number(s4EditorialFirst(D[b]))-Number(s4EditorialFirst(D[a]))||sc[b]-sc[a]); o.forEach((i,r)=>M[i].push(r+1)); }
  D.forEach((d,i)=>{ const v=M[i].slice().sort((a,b)=>a-b), med=v[Math.floor(v.length/2)];
    d.band=[med,v[0],v[v.length-1]];
    const t=med/n; d.btier=t<=.01?'상위 1%':t<=.05?'상위 5%':t<=.1?'상위 10%':t<=.25?'상위 25%':'그 외'; }); }
const s10BandTxt=d=>d.s4&&d.s4.editorialFirst?'운영자 예외 지정 · 1위 고정':d.band?`${d.btier} · 약 ${d.band[0].toLocaleString()}위(비중 가정에 따라 ${d.band[1].toLocaleString()}~${d.band[2].toLocaleString()}위)`:'';
