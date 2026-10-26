const LINEP={S:.18,G:.13,WP:.09};   // 신분당선(회귀) / GTX(운행 중 GTX-A 경기 구간 실측) / 월판선(판단)
/* GTX 프리미엄 실측(2026.10.25): 운행 중인 GTX-A 경기 5개 역(운정중앙·킨텍스·대곡·성남·구성) 1km 안 단지의 2017→2026 실거래 상승률을,
   같은 시·군·구 2.5km 밖·연식 ±3년 단지 중위와 비교. 역별 초과상승 −2.6(성남, 분당선 이미 있음) · +9.8(킨텍스) · +12.7(대곡) · +18.3(운정) · +41.3(구성)%p,
   역 중위 +12.7%p → 13%. 2017년은 이미 노선 확정 뒤라 '확정~개통 사이에 더 붙은 몫'이고, 지금 공사·확정 단계인 GTX-B·C에 남은 몫과 같은 성격.
   역마다 편차가 커서(기존 철도가 좋은 역은 0 근처) 정확도는 낮음 — '가정 아닌 근사 실측'으로 표시 */
/* 6억지도 apt-s4.js (8a: 입지 점수 회귀화 · 중복 제거 · 순위 표시 · 큰 평형 비율)
   분위수 S4Q·설정 S4CFG 는 apt-s4q.js(make_comp.py 생성)에서 읽음 — 이 파일보다 먼저 로드.

   ■ 입지 점수 = 순수 위치만. 세대수·학군·초품아·직주·연식·브랜드는 넣지 않음(중복 제거).
     입지 평당가 locV = ln(주변 시세 fw) + 역 도보 보정 WALK + 평지 보정
       · fw: 반경 400m~ 커널로 주변 25년차 이하 단지의 '상품 차이를 뺀' 평당가(급지·노선 프리미엄이 이미 들어 있음), 자기 단지 제외
       · 역 도보: 같은 동 안 회귀 꺾은선(5분까지 0 → 10분 −6.6% → 20분 −18.6% → 30분 −21.5%). 지금 운행 중인 역만(개통 예정역은 여력에만)
       · 평지: 같은 동 안 회귀 — 단지가 역보다 1m 높을 때마다 −0.30%(t −6.3, 50m에서 상한), 낮은 쪽은 효과 없음(t −0.3)
     입지 점수(0~100) = locV 의 유니버스(6억 이하 거래 평형 전체, 개수는 S4CFG.types) 백분위
   ■ 종합 = 백분위( (1−upW) × [ (1−locMix) × 상승요인 백분위 평균 + locMix × 입지 백분위 ] + upW × 여력 백분위 ) — 가중치는 S4CFG
   ■ 같은 단지 큰 평형 반영 비율 0.75(ln 기준) — 2026 실거래 소형 2,476개 예측 오차 최소(0→.186, .25→.161, .5→.142, .75→.133, 1→.136)
   ■ 화면: '상위 x% · N위/화면의 평형 수'(d.rank, 이 화면 안 순위) — 유니버스 추정 순위 d.urank 는 따로 */
function s4Pct(Q,x){ if(x==null||isNaN(x)) return 50; const n=Q.length-1;
  if(x<Q[0]) return 0; if(x>Q[n]) return 100;
  let lo=0; while(lo<n&&Q[lo]<x) lo++; let hi=lo; while(hi<n&&Q[hi+1]<=x) hi++;
  if(Q[lo]===x) return (lo+hi)/2/n*100;
  const a=lo-1, f=(x-Q[a])/(Q[lo]-Q[a]); return (a+f)/n*100; }
const S4CBD=[[37.4979,127.0276],[37.5663,126.9779],[37.5219,126.9245],[37.3948,127.1112]];
function s4J(d){ const g=d.g||{}; if(!g.lat) return null; const km=Math.min(...S4CBD.map(([a,b])=>hav(g.lat,g.lng,a,b)))/1000;
  return jobS(15+1.3*km)*9/15; }
/* 경사(회귀, 2026.10.25 재추정): 기본 R = 반경 500m 안 가장 낮은 곳보다 이 단지가 얼마나 높은가(m, apt-dem.js 지형 자료 — 모든 단지).
   같은 동 안끼리 '상품 차이를 뺀 평당가 ÷ 주변 시세'를 회귀: 25년차 이하 1,351곳 R 1m당 −0.25%(t −7.7, 상한 30/50/80m 모두 비슷).
   보행 경로를 계산한 의심 단지는 apt-walk.js의 부담 z(낮은 도로→단지 대표점, 여러 방향 중 가장 쉬운 경로)를 0~80m 상당으로 환산한다.
   저경사 대조군 평균은 10m 상당, 표준편차 1마다 10m를 더한다(더포레스트힐 z=2.47 → 34.7m). 도로 연결 신뢰도 B는 전부,
   C는 65%만 기존 R과 섞고 D는 기존 R을 유지한다. 부담 지수(0~100)는 설명용이고, 순위는 포화되지 않는 z를 써서 심한 단지끼리도 구분한다.
   예전 기준 '역보다 높이'(dh, 1,563곳만 자료)는 R과 함께 넣으면 효과 없음(+0.03%, t 0.5) → R로 교체. 자료 없으면 중위 12.5m */
const FLATB=-.0025, FLATCAP=80, FLATDEF=FLATB*12.5;
const hR=d=>{ const v=(window.DEM||{})[d.cxKey||gkey(d)]; return v?v[0]:null; };
const flatAdj=R=>R==null?FLATDEF:FLATB*Math.min(FLATCAP,Math.max(0,R));
const hW=d=>(window.WALK_GRADE||{})[d.cxKey||gkey(d)]||null;
const hSlopeR=d=>{ const R=hR(d), v=hW(d); if(!v) return R;
  const z=+v[1]||0, w=v[2]===2?1:v[2]===1?.65:0; if(!w) return R;
  const routeR=Math.max(0,Math.min(80,10+10*z)), base=R==null?12.5:R;
  return routeR*w+base*(1-w); };
const slopeAdj=d=>flatAdj(hSlopeR(d));
/* 입지 평당가(ln, 만원/공급평). recompute()에서 d.kfw 계산 뒤 s4Score 전에 호출 */
function locNew(d){ const g=d.g||{};
  let base=d.kfw?d.kfw.fw:(d.fwK??d.fw); if(!base){ d.locV=null; d.loc=d.locOld??0; return; }
  // 자기 시세가 말하는 위치가치(단지 모든 평형, 거래 가중)를 섞음: 주변 시세는 길 건너 신도시·다른 생활권 신축까지 끌어오지만
  // 상권·경사·생활권 차이는 그 단지 시세에 이미 들어 있음. 재건축 기대가 시세에 낀 만큼(rbw × (1 − z))은 덜 믿고,
  // 재건축 막힌 구축은 z × 0.75 이상(apt-map.html DEAD 주석)
  const own=cxOwnLoc(d), base0=base;
  let dw=own>0?Math.max(LOCOWN*(1-(d.rbw||0)*(1-(d.dead||0))),(d.dead||0)*S4BLEND,(d.disp||0)*S4BLEND):0;   // disp: 주변 시세가 엇갈림(apt-map.html)
  if(dw) base=Math.exp((1-dw)*Math.log(base)+dw*Math.log(own));
  const wm=d.cur&&d.cur.m<99999?walkMin(d.cur.m):null; let wa=wm==null?WALK(40):WALK(Math.min(40,wm)); const fa=slopeAdj(d);
  // 개통 예정 역(공사 중·확정, OSM 좌표)이 지금 역보다 80m 이상 가까우면 그 역 도보 기준으로 — 개통까지 1년당 5% 할인(최대 20%). 여력의 적정가(microAdj)와 같은 규칙
  const wa0=wa; let wf=null; if(d.fut&&(!d.cur||d.fut.m<d.cur.m-80)){ wf=walkMin(d.fut.m); const gain=(WALK(Math.min(40,wf))-wa)*d.fut.disc; if(gain>0) wa+=gain; else wf=null; }
  // 노선 프리미엄(도보 15분 안): 같은 동 안 실거래 회귀에서 오차 대비 확실한 건 신분당선 +18%(±4.5%)뿐 — 나머지 노선 차이(0~7%, 오차 ±2~4%)는 구분 안 함(노선이 좋은 동네의 가치는 주변 시세에 이미 들어 있음).
  // 개통 예정: GTX +13%(GTX-A 실측), 신분당선 연장 +18%(회귀), 월판선 +9%(판단), 그 외 0 — 개통 전 할인 적용
  let lp=0, lpl='';
  if((g.sts||[]).some(([n,m])=>/신분당/.test(n)&&walkMin(m)<=15)){ lp=LINEP.S; lpl='신분당선'; }
  if(typeof FUTPOS!=='undefined'&&FUTPOS&&g.lat) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f) return; const pr=F[4]!=null?F[4]:/GTX/.test(F[1])?LINEP.G:/신분당/.test(F[1])?LINEP.S:/월판/.test(F[1])?LINEP.WP:0;   // 인동선은 역마다: 인덕원(GTX-C·4호선·월판선)·동탄(GTX-A·SRT) 환승 허브까지 2정거장 이내 +9%, 3~4정거장 +4%, 그 밖 0(판단) if(!pr) return;
    if(walkMin(hav(g.lat,g.lng,f[0],f[1]))>15) return; const v=pr*Math.max(.8,1-.05*(F[2]-2026)); if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} ${F[1].replace(/\(.*?\)/g,'')}(${F[2]} 예정)`; } });
  // GTX 한 정거장 환승권(판단, 2026.10.26): 도보 10분 안 지하철역이 있고 GTX 역(운행·예정)이 2.5km 안이면 GTX 프리미엄의 절반(개통 전 할인 동일)
  if(lp<LINEP.G/2&&wm!=null&&wm<=10&&typeof FUTPOS!=='undefined'&&FUTPOS&&g.lat) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f||!/GTX/.test(F[1])) return;
    const m=hav(g.lat,g.lng,f[0],f[1]); if(m>2500||walkMin(m)<=15) return; const v=LINEP.G/2*Math.max(.8,1-.05*(F[2]-2026)); if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} GTX 한 정거장 환승권(${F[2]} 예정)`; } });
  d.locV=Math.log(base)+wa+fa+lp;
  d.locParts={base,base0,dw,own,wm,wa,wa0,fa,lp,lpl,wf,fut:wf!=null?d.fut:null,ppp:Math.round(Math.exp(d.locV))};
  const futLp=/예정/.test(lpl)?lp:0; d.loc0=(wf!=null||futLp)?Math.round(s4Pct(S4Q.LOC,d.locV-wa+wa0-futLp)*10)/10:null;            // 예정 역을 빼면 입지 백분위
  d.loc=Math.round(s4Pct(S4Q.LOC,d.locV)*10)/10; }
const LOCOWN=(window.S4LOCOWN!=null)?S4LOCOWN:.5;
function cxOwnLoc(d){ const S=typeof sibs==='function'?sibs(d):[d]; let sw=0,sl=0;
  for(const x of S){ if(!(x.me>0)||!x.g) continue; const age=2026-x.year, w=Math.max(1,(priceEv(x)||{n:1}).n);
    const v=x.me/(Math.exp(AGEC(age))*SIZE(x.py,age)*microAdj(x,'gen')[0]); if(v>0){ sw+=w; sl+=w*Math.log(v); } }
  return sw?Math.exp(sl/sw):0; }
/* 같은 단지 큰 평형: ln 기준가 = 0.25×커널 + 0.75×큰 평형이 말하는 위치가치 */
const S4BLEND=(window.S4CFG&&S4CFG.blend!=null)?S4CFG.blend:.75;
function s4BlendOwnLarge(d,fw){ const b=d.bench||{}, n=b.name||''; if(!b.ppp||!/같은 단지/.test(n)) return fw;
  const bpy=+((n.match(/(\d+)평/)||[0,0])[1]); if(!(bpy>=d.py+5)) return fw;
  const age=2026-d.year, [mk]=microAdj(d,'gen'); const own=b.ppp/(Math.exp(AGEC(age))*SIZE(bpy,age)*mk);
  d.s4own=Math.round(own); return Math.round(Math.exp((1-S4BLEND)*Math.log(fw)+S4BLEND*Math.log(own))); }
const OLDW=window.OLDW_OVERRIDE??10;   // 원천레이크파크 6→약 40위, 벽산5단지 43→약 90위(판단)
/* 종합 */
function s4Score(d){ const Q=S4Q, C=window.S4CFG||{factors:['U7','A','E','J'],locMix:.5,upW:.2};
  const J=s4J(d), v={U7:d.U7,A:d.A,E:d.E,J};
  const p={}; for(const f of ['U7','A','E','J']) p[f]=s4Pct(Q[f],v[f]);
  const fs=C.factors||[], ld=fs.length?fs.reduce((s,f)=>s+p[f],0)/fs.length:0;
  const pLoc=d.locV==null?s4Pct(Q.LOC,null):s4Pct(Q.LOC,d.locV), pUp=s4Pct(Q.UP,d.upR);
  // 구축 감점: ① 재건축 막힌 구축 20 × z(apt-map.html DEAD) ② 정비 이슈 없는 구축(공식 단계 35 미만 · 리모델링 아님) — 사람들이 들어갈 유인이 적음(판단):
  //   15년차 0 → 25년차 OLDW점, 그 뒤 유지. 두 감점은 더함(큰 쪽만 쓰면 다른 구축이 내려가며 막힌 구축이 상대적으로 올라감)
  const age=2026-d.year, noIssue=stOf(d)<35&&!isRemodel(d)&&!(d.m&&d.m.rm), oldp=noIssue?OLDW*clamp01((age-15)/10)*(1-((d.m&&d.m.fz&&d.m.fz.f)||0)*clamp01((age-25)/5))*(1-(d.areaMv||0)):0;   // × (1 − 동네 정비 진행률)   // 25→30년차에 사업성(f) 좋은 단지는 재건축 기대가 유인이라 감점을 덜어 줌
  const dp=(d.dead||0)*(typeof DEAD!=='undefined'&&DEAD.comp||0)+oldp; d.oldp=oldp;
  const lead=fs.length?(1-C.locMix)*ld+C.locMix*pLoc:pLoc, comp=(1-C.upW)*lead+C.upW*pUp-dp;
  d.s4={pU:p.U7,pA:p.A,pE:p.E,pJ:p.J,ld,pUp,pLoc,J,dp};
  const pc=s4Pct(Q.COMP,comp); d.score=comp; d.comp=comp;                     // 점수 = 세 백분위의 가중평균 그대로(백분위의 백분위는 상위권이 99점대로 뭉쳐 차이가 안 보였음)
  d.top=Math.max(.1,Math.round((100-pc)*10)/10);                                   // 상위 x%
  d.urank=Math.max(1,Math.round((100-pc)/100*((C.complexes)||4708))); }           // 약 N위/4,708단지
const s4RankTxt=d=>{ const n=(typeof D!=='undefined'&&D.length)||1, r=d.rank||d.urank||0, t=Math.max(.1,r/n*100); return `이 화면 상위 ${t<1?t.toFixed(1):Math.max(1,Math.round(t))}% · ${r.toLocaleString()}위/${n.toLocaleString()}개 평형`; };
/* 상세 화면 '입지 점수' 섹션(교체용) */
function locPanel(d){ const L=d.locParts;
  if(!L) return `<section class="sec"><h3>입지 점수 <small>계산 중</small></h3></section>`;
  const pc=x=>(x>=0?'+':'')+(x*100).toFixed(1)+'%';
  return `<section class="sec"><h3>입지 점수 <small>${d.loc.toFixed(1)} / 100 · 6억 이하 ${((window.S4CFG||{}).types||0).toLocaleString()}개 평형 중 백분위</small></h3><div class="score tnum">
    <div><span class="l">주변 시세(위치 가치)<small>${d.kfw?`반경 ${Math.round(d.kfw.bw*2/100)/10}km 안 25년차 이하 단지 ${d.kfw.nn}곳의 상품 차이를 뺀 평당가(자기 단지 제외)`:esc((d.fwsrc||'').split(' · 같은 단지')[0])}</small></span><span class="v">${Math.round(L.base).toLocaleString()}<i>만/평</i></span></div>${L.dw?`
    <div><span class="l">이 단지 시세 반영<small>주변 ${Math.round(L.base0).toLocaleString()}만에 이 단지 시세가 말하는 위치가치 ${Math.round(L.own).toLocaleString()}만을 ${Math.round(L.dw*100)}% 섞음 — 상권·경사·생활권 차이는 단지 시세에 들어 있음${d.dead>=.5?' · 재건축 막힌 구축은 더 많이':d.disp>.3?' · 주변 시세가 엇갈려 더 많이':d.rbw>0?' · 재건축 기대가 낀 만큼 덜':''}</small></span><span class="v">${((L.base/L.base0-1)*100).toFixed(1)}<i>%</i></span></div>`:''}
    <div><span class="l">역 도보<small>${L.wm==null?'3km 안에 역 없음':`${esc((d.cur&&d.cur.n)||'')} 도보 약 ${Math.round(L.wm)}분`}${L.fut?` → <b>개통 예정 ${esc(L.fut.n)}역(${esc(L.fut.line)}, ${L.fut.year}년 목표) 도보 약 ${Math.round(L.wf)}분</b> 기준, 개통 전 ${Math.round((1-L.fut.disc)*100)}% 할인`:''} · 같은 동 안 실거래 회귀</small></span><span class="v">${pc(L.wa)}</span></div>
    <div><span class="l">노선 프리미엄<small>${L.lp?`${esc(L.lpl)} 도보 15분 안 — 신분당선은 같은 동 안 실거래 회귀 +18%, GTX는 운행 중 GTX-A 역 주변 실측 +13%(역마다 편차 큼), 월판선 +9%(가정), 인동선은 인덕원·동탄 환승역까지 2정거장 이내 +9%·3~4정거장 +4%로 가정(개통 전 할인)`:'도보 15분 안에 신분당선·GTX·월판선 없음 — 다른 노선끼리는 실거래상 차이가 오차 범위라 같게 봄'}</small></span><span class="v">${pc(L.lp||0)}</span></div>
    <div><span class="l">경사<small>${hR(d)!=null?`반경 500m 안 가장 낮은 곳보다 ${hR(d)}m 높음${(window.DEM[d.cxKey]||[])[1]>=30?` · 단지 안 높이차 ${window.DEM[d.cxKey][1]}m`:''}`:'높이 자료 없음(중위값)'}${hW(d)&&hW(d)[2]?` · 실제 보행 부담 ${Math.round(hW(d)[0])}/100 반영`:''} · 1m 상당마다 −0.25%</small></span><span class="v">${pc(L.fa)}</span></div>
    <div><span class="l">입지 평당가<small>세대수·학군·초품아·직주·연식·브랜드는 입지 점수에 넣지 않음(상승 요인·적정가에서 따로 반영)</small></span><span class="v">${L.ppp.toLocaleString()}<i>만/평</i></span></div>
  </div></section>`; }
