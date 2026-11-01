/* 저평가지도 순위 범위 — recompute()가 ORDER·rank를 정한 뒤 호출: s10Band();
   비중 가정 범위(s14, 2026.11.1): 이 탭에서 채택한 비중(S4CFG의 locMix·upW·gW)과, 그중 하나씩만 격자 한 칸(입지 비율 ±0.25, 적정가 대비 ±0.1, 장기 급지 ±0.1) 옮긴 설정들.
   각 설정에서 페이지 전체 단지의 순위를 다시 매겨 중앙값·최소~최대 범위를 d.band=[중앙, 최고, 최저]로 둠. 등급은 중앙 순위 기준. */
function s10Plaus(){ const C=window.S4CFG||{}, lm=C.locMix??.5, uw=C.upW??.2, gw=C.gW||0, out=[[lm,uw,gw]];
  const ok=(a,b,c)=>a>=0&&a<=1&&b>=0&&c>=0&&b+c<=.6;
  for(const [a,b,c] of [[lm-.25,uw,gw],[lm+.25,uw,gw],[lm,uw-.1,gw],[lm,uw+.1,gw],[lm,uw,gw-.1],[lm,uw,gw+.1]]) if(ok(a,b,c)) out.push([+a.toFixed(2),+b.toFixed(2),+c.toFixed(2)]);
  return out; }
function s10Band(){ const n=D.length, M=D.map(()=>[]);
  for(const [lm,uw,gw] of s10Plaus()){
    const sc=D.map((d,i)=>{ const s=d.s4; if(!s) return -1; return s4Total((1-uw-gw)*((1-lm)*s.pU+lm*s.pLoc)+uw*s.pUp+gw*(s.pG??50),s.rawDp||0,s.peakBonus||0); });
    const o=sc.map((v,i)=>i).sort((a,b)=>sc[b]-sc[a]); o.forEach((i,r)=>M[i].push(r+1)); }
  D.forEach((d,i)=>{ const v=M[i].slice().sort((a,b)=>a-b), med=v[Math.floor(v.length/2)];
    d.band=[med,v[0],v[v.length-1]];
    const t=med/n; d.btier=t<=.01?'상위 1%':t<=.05?'상위 5%':t<=.1?'상위 10%':t<=.25?'상위 25%':'그 외'; }); }
const s10BandTxt=d=>d.band?`${d.btier} · 약 ${d.band[0].toLocaleString()}위(비중 가정에 따라 ${d.band[1].toLocaleString()}~${d.band[2].toLocaleString()}위)`:'';
