/* 6억지도 apt-s4.js (8a: 입지 점수 회귀화 · 중복 제거 · 순위 표시 · 큰 평형 비율)
   분위수 S4Q·설정 S4CFG 는 apt-s4q.js(make_comp.py 생성)에서 읽음 — 이 파일보다 먼저 로드.

   ■ 입지 점수 = 순수 위치만. 세대수·학군·초품아·직주·연식·브랜드는 넣지 않음(중복 제거).
     입지 평당가 locV = ln(주변 시세 fw) + 역 도보 보정 WALK + 평지 보정
       · fw: 반경 400m~ 커널로 주변 25년차 이하 단지의 '상품 차이를 뺀' 평당가(급지·노선 프리미엄이 이미 들어 있음), 자기 단지 제외
       · 역 도보: 같은 동 안 회귀 꺾은선(5분까지 0 → 10분 −6.6% → 20분 −18.6% → 30분 −21.5%). 지금 운행 중인 역만(개통 예정역은 여력에만)
       · 평지: 같은 동 안 회귀 — 단지가 역보다 1m 높을 때마다 −0.30%(t −6.3, 50m에서 상한), 낮은 쪽은 효과 없음(t −0.3)
     입지 점수(0~100) = locV 의 유니버스(6억 이하 거래 7,416개 평형) 백분위
   ■ 종합 = 백분위( (1−upW) × [ (1−locMix) × 상승요인 백분위 평균 + locMix × 입지 백분위 ] + upW × 여력 백분위 ) — 가중치는 S4CFG
   ■ 같은 단지 큰 평형 반영 비율 0.75(ln 기준) — 2026 실거래 소형 2,476개 예측 오차 최소(0→.186, .25→.161, .5→.142, .75→.133, 1→.136)
   ■ 화면: '상위 x% · 약 N위/4,708단지' */
function s4Pct(Q,x){ if(x==null||isNaN(x)) return 50; const n=Q.length-1;
  if(x<Q[0]) return 0; if(x>Q[n]) return 100;
  let lo=0; while(lo<n&&Q[lo]<x) lo++; let hi=lo; while(hi<n&&Q[hi+1]<=x) hi++;
  if(Q[lo]===x) return (lo+hi)/2/n*100;
  const a=lo-1, f=(x-Q[a])/(Q[lo]-Q[a]); return (a+f)/n*100; }
const S4CBD=[[37.4979,127.0276],[37.5663,126.9779],[37.5219,126.9245],[37.3948,127.1112]];
function s4J(d){ const g=d.g||{}; if(!g.lat) return null; const km=Math.min(...S4CBD.map(([a,b])=>hav(g.lat,g.lng,a,b)))/1000;
  return jobS(15+1.3*km)*9/15; }
/* 평지(회귀): dh = 단지 높이 − 가장 가까운 역 높이(m). 높이 자료 없으면 유니버스 평균 −2.42% */
const FLATB=-.003, FLATCAP=50, FLATDEF=-.0242;
const flatAdj=dh=>dh==null?FLATDEF:FLATB*Math.min(FLATCAP,Math.max(0,dh));
/* 입지 평당가(ln, 만원/공급평). recompute()에서 d.kfw 계산 뒤 s4Score 전에 호출 */
function locNew(d){ const g=d.g||{};
  const base=d.kfw?d.kfw.fw:(d.fwK??d.fw); if(!base){ d.locV=null; d.loc=d.locOld??0; return; }
  const wm=d.cur&&d.cur.m<99999?walkMin(d.cur.m):null; let wa=wm==null?WALK(40):WALK(Math.min(40,wm)); const fa=flatAdj(g.dh);
  // 개통 예정 역(공사 중·확정, OSM 좌표)이 지금 역보다 80m 이상 가까우면 그 역 도보 기준으로 — 개통까지 1년당 5% 할인(최대 20%). 여력의 적정가(microAdj)와 같은 규칙
  const wa0=wa; let wf=null; if(d.fut&&(!d.cur||d.fut.m<d.cur.m-80)){ wf=walkMin(d.fut.m); const gain=(WALK(Math.min(40,wf))-wa)*d.fut.disc; if(gain>0) wa+=gain; else wf=null; }
  d.locV=Math.log(base)+wa+fa;
  d.locParts={base,wm,wa,wa0,fa,wf,fut:wf!=null?d.fut:null,ppp:Math.round(Math.exp(d.locV))};
  d.loc0=wf!=null?Math.round(s4Pct(S4Q.LOC,d.locV-wa+wa0)*10)/10:null;            // 예정 역을 빼면 입지 백분위
  d.loc=Math.round(s4Pct(S4Q.LOC,d.locV)*10)/10; }
/* 같은 단지 큰 평형: ln 기준가 = 0.25×커널 + 0.75×큰 평형이 말하는 위치가치 */
const S4BLEND=(window.S4CFG&&S4CFG.blend!=null)?S4CFG.blend:.75;
function s4BlendOwnLarge(d,fw){ const b=d.bench||{}, n=b.name||''; if(!b.ppp||!/같은 단지/.test(n)) return fw;
  const bpy=+((n.match(/(\d+)평/)||[0,0])[1]); if(!(bpy>=d.py+5)) return fw;
  const age=2026-d.year, [mk]=microAdj(d,'gen'); const own=b.ppp/(Math.exp(AGEC(age))*SIZE(bpy,age)*mk);
  d.s4own=Math.round(own); return Math.round(Math.exp((1-S4BLEND)*Math.log(fw)+S4BLEND*Math.log(own))); }
/* 종합 */
function s4Score(d){ const Q=S4Q, C=window.S4CFG||{factors:['U7','A','E','J'],locMix:.5,upW:.2};
  const J=s4J(d), v={U7:d.U7,A:d.A,E:d.E,J};
  const p={}; for(const f of ['U7','A','E','J']) p[f]=s4Pct(Q[f],v[f]);
  const fs=C.factors||[], ld=fs.length?fs.reduce((s,f)=>s+p[f],0)/fs.length:0;
  const pLoc=d.locV==null?s4Pct(Q.LOC,null):s4Pct(Q.LOC,d.locV), pUp=s4Pct(Q.UP,d.upR);
  const lead=fs.length?(1-C.locMix)*ld+C.locMix*pLoc:pLoc, comp=(1-C.upW)*lead+C.upW*pUp;
  d.s4={pU:p.U7,pA:p.A,pE:p.E,pJ:p.J,ld,pUp,pLoc,J};
  const pc=s4Pct(Q.COMP,comp); d.score=comp; d.comp=comp;                     // 점수 = 세 백분위의 가중평균 그대로(백분위의 백분위는 상위권이 99점대로 뭉쳐 차이가 안 보였음)
  d.top=Math.max(.1,Math.round((100-pc)*10)/10);                                   // 상위 x%
  d.urank=Math.max(1,Math.round((100-pc)/100*((C.complexes)||4708))); }           // 약 N위/4,708단지
const s4RankTxt=d=>{ const n=(typeof D!=='undefined'&&D.length)||1, r=d.rank||d.urank||0, t=Math.max(.1,r/n*100); return `상위 ${t<1?t.toFixed(1):Math.max(1,Math.round(t))}% · ${r.toLocaleString()}위/${n.toLocaleString()}곳`; };
/* 상세 화면 '입지 점수' 섹션(교체용) */
function locPanel(d){ const L=d.locParts;
  if(!L) return `<section class="sec"><h3>입지 점수 <small>계산 중</small></h3></section>`;
  const pc=x=>(x>=0?'+':'')+(x*100).toFixed(1)+'%';
  return `<section class="sec"><h3>입지 점수 <small>${d.loc.toFixed(1)} / 100 · 6억 이하 7,184개 평형 중 백분위</small></h3><div class="score tnum">
    <div><span class="l">주변 시세(위치 가치)<small>${d.kfw?`반경 ${Math.round(d.kfw.bw*2/100)/10}km 안 25년차 이하 단지 ${d.kfw.nn}곳의 상품 차이를 뺀 평당가(자기 단지 제외)`:esc((d.fwsrc||'').split(' · 같은 단지')[0])}</small></span><span class="v">${Math.round(L.base).toLocaleString()}<i>만/평</i></span></div>
    <div><span class="l">역 도보<small>${L.wm==null?'3km 안에 역 없음':`${esc((d.cur&&d.cur.n)||'')} 도보 약 ${Math.round(L.wm)}분`}${L.fut?` → <b>개통 예정 ${esc(L.fut.n)}역(${esc(L.fut.line)}, ${L.fut.year}년 목표) 도보 약 ${Math.round(L.wf)}분</b> 기준, 개통 전 ${Math.round((1-L.fut.disc)*100)}% 할인`:''} · 같은 동 안 실거래 회귀</small></span><span class="v">${pc(L.wa)}</span></div>
    <div><span class="l">평지<small>${d.g&&d.g.dh!=null?`가장 가까운 역보다 ${Math.abs(Math.round(d.g.dh))}m ${d.g.dh>0?'높음':'낮음'}`:'높이 자료 없음(평균값)'} · 1m 높을 때마다 −0.3%</small></span><span class="v">${pc(L.fa)}</span></div>
    <div><span class="l">입지 평당가<small>세대수·학군·초품아·직주·연식·브랜드는 입지 점수에 넣지 않음(상승 요인·적정가에서 따로 반영)</small></span><span class="v">${L.ppp.toLocaleString()}<i>만/평</i></span></div>
  </div></section>`; }
