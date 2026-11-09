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
/* 2026.11.9 확인값: L=건축물대장·공식 단지정보 기준 실측 용적률. */
Object.assign(window.FARD=window.FARD||{}, {
  '한남동리첸시아|서울 용산구 한남동':[499,'L',0,.37,96,31608,'11170'],
  '송파더플래티넘|서울 송파구 오금동':[430,'L',0,.387,0,30566,'11710']
});
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
    if(walkMin(futureDistances(g.lat,g.lng)[k])>15) return; const v=pr*Math.max(.8,1-.05*(F[2]-2026)); if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} ${F[1].replace(/\(.*?\)/g,'')}(${F[2]} 예정)`; } });
  // GTX 한 정거장 환승권(판단, 2026.10.26): 도보 10분 안 지하철역이 있고 GTX 역(운행·예정)이 2.5km 안이면 GTX 프리미엄의 절반(개통 전 할인 동일)
  if(lp<LINEP.G/2&&wm!=null&&wm<=10&&typeof FUTPOS!=='undefined'&&FUTPOS&&g.lat) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f||!/GTX/.test(F[1])) return;
    const m=futureDistances(g.lat,g.lng)[k]; if(m>2500||walkMin(m)<=15) return; const v=LINEP.G/2*Math.max(.8,1-.05*(F[2]-2026)); if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} GTX 한 정거장 환승권(${F[2]} 예정)`; } });
  // GTX 버스·연계 접근권(판단, 2026.10.26): 도보 15분(1.2km) 밖이어도 4km까지는 버스 등으로 이용 — 프리미엄 절반에서 거리에 따라 0으로
  if(typeof FUTPOS!=='undefined'&&FUTPOS&&g.lat) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f||!/GTX/.test(F[1])) return;
    const m=futureDistances(g.lat,g.lng)[k]; if(walkMin(m)<=15||m>4000) return; const v=LINEP.G/2*clamp01((4000-m)/(4000-1200))*Math.max(.8,1-.05*(F[2]-2026));
    if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} GTX 버스·연계 접근(${(m/1000).toFixed(1)}km · ${F[2]} 예정)`; } });
  // 장기 앵커(s14, 2026.11.1): 동(洞) 급지가 2017·2020·2023 평균보다 지금 높아진 만큼(OS, apt-gjl.js)을 입지에서 뺌 — 최근 급등으로 오른 주변 시세를 장기 급지 수준으로 되돌림.
  //   페이지 상단 S4CFG.anchor(1=전부 차감). 내려간 동네(OS<0)는 그만큼 올려 줌(대칭). 동 자료 없으면 0
  const gjl=(window.S4GJL||{})[d.area], gfk=((window.FARD||{})[d.n+'|'+d.area]||[])[6],
    gjKey=window.CAPT>6?(typeof window.aptSourceKey==='function'?window.aptSourceKey(d):gfk?gfk+'|'+d.area.split(' ').pop()+'|'+d.n:null):null,
    gjc=gjKey&&window.S4GJC?window.S4GJC[gjKey]:null;   // 6억 초과: 현재 시세와 동일한 단지 식별키로 단지 급지를 연결
  d.gj=gjc!=null?gjc:(gjl?gjl[0]:null); d.gjc=gjc!=null; d.os=gjl?gjl[1]:0; const anc=((window.S4CFG||{}).anchor||0)*d.os;
  d.locV=Math.log(base)+wa+fa+lp-anc;
  d.locParts={base,base0,dw,own,wm,wa,wa0,fa,lp,lpl,wf,fut:wf!=null?d.fut:null,anc,os:d.os,gj:d.gj,ppp:Math.round(Math.exp(d.locV))};
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
/* 전고점: 2021-07~2022-06 상위 3건 평균(2건 이상, 현재 DB와 동일한 반올림 5㎡ 구간), 현재 거래수 n 가중 단지 비율.
   비교 거래 없는 2023년 이후 신축은 주변 비교군 비율을 참고로 계산.
   2026.11.1: 순위 점수에서 제외하고 배지·상세 표시만 함 — 예측력 검증이 안 됐고(고점 이후 구간이 2022→26 하나뿐),
   고점 기간 거래가 없는 2022년 이후 신축은 구조적으로 받을 수 없어 신축에 불리했음. PEAKW_OVERRIDE로 실험용 가점만 켤 수 있음. */
const PEAKW=window.PEAKW_OVERRIDE??0;
const s4PeakKey=d=>d.n+'|'+(d.area||'').trim().split(/\s+/).pop();
function s4PeakRatio(d){
  const r=(window.PEAK||{})[s4PeakKey(d)];
  return typeof r==='number'&&Number.isFinite(r)&&r>=.95?r:null;
}
/* 비교 거래 없는 2023년 이후 신축만: 가까운 비슷한 준신축의 고점 회복률을 보수적으로 전이.
   미돌파 비교군도 포함한다. 단지별 한 표, 상위 5곳. 1/2/3곳 이상 신뢰도 1/3·2/3·1,
   직접 가점의 절반(최대 5점)에 신뢰도를 곱한다. 직접 가점과 중복 가산하지 않는다. */
function s4PeerPeak(d){
  const B=window.PEAK_PEER_BASE||{}, g=d.g||{};
  if(d.year<2023||!Number.isFinite(d.year)||!g.lat||!g.lng||!(d.units>0)||!(d.py>0)||B[s4PeakKey(d)]||typeof SIB==='undefined') return null;
  const candidates=[];
  // 속도(2026.11.2): d와 무관한 후보 조건은 재계산 회차마다 한 번만 걸러 둠 — 결과는 동일
  if(!s4PeerPeak.c||s4PeerPeak.c.v!==window.__RCV) s4PeerPeak.c={v:window.__RCV,list:Object.values(SIB).filter(group=>{ const x=group[0], e=B[s4PeakKey(x)], h=x.g||{};
    return e&&x.year<=2022&&e[1]===x.year&&Number.isFinite(e[0])&&e[0]>0&&e[2]>0&&h.lat&&h.lng&&x.units>0&&!x.opt&&stOf(x)<35; })};
  for(const group of s4PeerPeak.c.list){
    const x=group[0], e=B[s4PeakKey(x)], h=x.g||{};
    if(x.cxKey===d.cxKey||x.year<d.year-8) continue;
    const unitRatio=x.units/d.units; if(unitRatio<1/3||unitRatio>3) continue;
    const m=hav(g.lat,g.lng,h.lat,h.lng); if(!Number.isFinite(m)||m>2500) continue;
    const py=group.reduce((best,t)=>Math.abs(Math.log(t.py/d.py))<Math.abs(Math.log(best/d.py))?t.py:best,group[0].py);
    const sizeRatio=py/d.py; if(sizeRatio<1/1.35||sizeRatio>1.35) continue;
    const weight=Math.exp(-.5*(m/1000)**2-(d.year-x.year)/5-Math.abs(Math.log(unitRatio))-Math.abs(Math.log(sizeRatio)))*Math.min(1,e[2]/10);
    if(weight>0)candidates.push({n:x.n,area:x.area,m,r:e[0],weight});
  }
  const peers=candidates.sort((a,b)=>b.weight-a.weight||a.n.localeCompare(b.n)).slice(0,5);
  if(!peers.length)return null;
  const sw=peers.reduce((s,p)=>s+p.weight,0), r=peers.reduce((s,p)=>s+p.r*p.weight,0)/sw;
  const confidence=Math.min(1,peers.length/3), bonus=PEAKW*.5*confidence*clamp01((r-1)/.10);
  return {r,confidence,bonus,peers};
}
/* 운영자 지정 비교 규칙(센텀퍼스트 ← 어바인퍼스트)은 2026.11.1 삭제: 모든 단지에 같은 규칙. */
const s4Total=(base,penalty,peak)=>100*clamp01((base-penalty+Math.max(0,peak||0))/100);   // 세대수·입지·적정가 대비 백분위 가중평균 − 구축 감점 (전고점 가점은 PEAKW=0이라 기본 0)
function s4ScoreDetail(d){ const s=d.s4; if(!s)return '';
  const w=s.w||{u:.4,l:.4,p:.2}, f=x=>(+x.toFixed(3)).toString();
  if((window.S4CFG||{}).model==='m2') { const z=s.za||{sm:0,pp:0}, dn=s.density||{pen:0}, zt=(z.sm?` − 소형 ${z.sm.toFixed(1)}`:'')+(z.pp?` ${z.pp>0?'+':'−'} 단지 내 평당가 ${Math.abs(z.pp).toFixed(1)}(큰 평형보다 평당가 ${z.ppr>=1?'+':''}${((z.ppr-1)*100).toFixed(0)}%, 같은 크기 평형 보통 ${z.ppx>=1?'+':''}${(((z.ppx||1)-1)*100).toFixed(0)}%)`:'')+(dn.pen?` − 고밀도 ${dn.pen.toFixed(1)}(용적률 ${Math.round(dn.far)}%)`:'');
    const ta=s.ta||{h:0,w:0}, tt=(ta.h?` − 언덕 ${ta.h.toFixed(1)}(주변 대비 +${Math.round(ta.R)}m)`:'')+(ta.w?` − 역 거리 ${ta.w.toFixed(1)}(${ta.wm!=null?`도보 ${Math.round(ta.wm)}분`:'3km 안에 역 없음'})`:'')+(ta.mb?` + 초대형 단지 ${ta.mb.toFixed(1)}`:'');
    return `종합 ${(zt||tt?d.score:s.modelComp).toFixed(1)}점 = 세대수 ${s.pU.toFixed(0)}×${f(w.u)} + 장기 급지 ${(s.pG??50).toFixed(0)}×${f(w.g)}${w.q?` + 상품성 ${(s.pQ??50).toFixed(0)}${s.qrb?'(재건축 대상, 감가 멈춤)':''}×${f(w.q)}`:''}${s.transport?` + 교통 ${s.transport.score.toFixed(1)}×0.05`:''}${zt||tt?` (${s.modelComp.toFixed(1)})`+zt+tt:''} · 입지·재건축 사업성은 참고 표시, 순위 미반영`; }
  return `종합 ${s.modelComp.toFixed(1)}점 = 세대수 ${s.pU.toFixed(0)}${d.uGate?`(원래 ${d.uGate.raw.toFixed(0)}, 입지 약해 대단지 가점 ${Math.round(d.uGate.g*100)}%만 인정)`:''}×${f(w.u)} + 입지 ${s.pLoc.toFixed(0)}×${f(w.l)} + 적정가 대비 ${s.pUp.toFixed(0)}×${f(w.p)}${w.g?` + 장기 급지 ${(s.pG??50).toFixed(0)}×${f(w.g)}`:''}${s.dp?` − 구축 감점 ${s.dp.toFixed(1)}`:''}${s.peakBonus?` + ${s.peakPeer?'주변 추정 가점':'전고점 가점'} ${s.peakBonus.toFixed(1)}`:''}`;
}
/* 종합 */
/* 6억 초과 탭 평형 보정(2026.11.3, 판단) — m2 종합(세대수 + 장기 급지)은 평형을 안 봐서 상급지 소형이 자동으로 상위에 오던 문제.
   ① 소형 감점: 재건축 대상이 아닌 평형은 24평(전용 60㎡) 이상 0 → 16평(전용 40㎡) 이하 −12. 15억 넘는 돈이면 같은 돈으로 다른 곳 국평이
      대안이고, 40㎡대는 1~2인 수요뿐이라 매수층이 좁음. 재건축 대상은 대지지분 가치를 감안해 절반만 감점(2026.11.3).
   ② 단지 안 평당가 비교(34평 미만만): 같은 단지 더 큰 평형(최근 시세, 가격대 무관) 평당가 중위 대비 이 평형 평당가. 15% 비싸면 −PPYW, 15% 싸면 +PPYW.
      재건축 단지는 대지지분이 면적에 비례하므로 단지 안에선 대지지분 평당가 비교와 같음. 다른 평형이 없으면 0 */
const SMALLW=12, PPYW=3, DENSITYW=8;   // 기준값. m2는 가격대별 실구매 대안을 반영해 아래에서 조정한다.
function s4SizeAdj(d){
  if(!(window.CAPT>6)) return {sm:0,pp:0,ppr:null,old:false};
  const age=2026-d.year, fr=((window.FARD||{})[d.cxKey||(d.n+'|'+d.area)]||[])[0], rm=isRemodel(d)||!!(d.m&&d.m.rm),
    old=!rm&&!((d.dead||0)>=.25)&&((d.st||0)>=35||(age>=27&&(fr!=null?fr<=250:age>=30)));   // 사업성 낮음·어려움(대지지분 부족)이면 소형 면제 안 함 — 면제 근거가 '가치=대지지분'이므로   // 리모델링 단지는 재건축처럼 대지지분 가치가 없으니 소형 감점 면제 안 함(2026.11.3)
  // 34평 미만 평형만, 자기보다 큰 평형과 비교(큰 평형은 원래 평당가가 낮아 큰 평형끼리 비교하면 늘 '싸 보임' → 대형 가점 쏠림, 2026.11.3 점검)
  // 재건축 대상 소형도 절반은 감점(2026.11.3, 판단): 대지지분 가치를 감안해도 15억 넘는 20평대 이하는 같은 돈 국평 대비 매수층이 좁음
  /* 2026.11.7 조정: 59㎡(24평)를 하한으로 보고 그보다 작은 평형을 연속 감점 — 24평 0 → 20평 −6 → 16평 이하 −12. 재건축 대상은 3/4만 적용
     6~10억 탭 상위 30개 중 29개가 10~20평대(12평 재건축·14평 신축까지)이던 문제. 24평 이상(요즘 대세인 59㎡)은 그대로라 '평수 줄여 급지 올리기'는 유지 */
  const smallW=(window.S4CFG||{}).model==='m2'&&window.CAPT>10?16:SMALLW,
    sm=smallW*clamp01((24-d.py)/8)*(old?.75:1), r=s4RawPPR(d);
  if(r==null) return {sm,pp:0,ppr:null,old};
  /* 기대 비율(2026.11.3): 작은 평형이 큰 평형보다 평당가가 비싼 정도는 평형마다 다름(24평은 크게, 30평은 조금) — 고정값 1.10을 쓰면 30평은 늘 '싸 보여' 가점,
     24평은 거의 다 상한 감점(예: 힐스테이트e편한세상문정 30평 +2.6 vs 24평 단지들 −3). 이 탭 평형들의 실제 비율 중위를 평형(2평 단위)별로 써서, 같은 크기끼리 비교 */
  const ex=s4PPRExp(d.py), q=r/ex;
  return {sm,pp:-PPYW*Math.max(-1,Math.min(1,(q-1)/.15)),ppr:r,ppx:ex,old}; }
function s4PPRExp(py){ if(!window.PPYEXP&&typeof D!=='undefined'&&D.length){ const g={}; D.forEach(x=>{ const r=s4RawPPR(x); if(r==null) return; const b=Math.round(x.py/2)*2; (g[b]=g[b]||[]).push(r); });
    const m={}; for(const b in g){ const v=g[b].sort((a,c)=>a-c); if(v.length>=15) m[b]=v[v.length>>1]; } window.PPYEXP=m; }
  const m=window.PPYEXP||{}, b=Math.round(py/2)*2; return m[b]!=null?m[b]:1+.1*Math.max(0,34-py)/10; }
function s4RawPPR(d){ const me=d.p/d.py;
  const o=d.py>=34?[]:(d.types||[]).filter(t=>t.py>d.py&&t.p>0&&t.p/t.py>=me*.55).map(t=>t.p/t.py);
  // 가격대 밖 큰 평형: 자료의 '같은 단지 N평 시세'(bench, 만원/평)도 비교에 넣음 — types는 이 탭 가격대 안 평형뿐이라 84㎡ 이상이 대개 빠져 있음
  const bm=d.bench&&/^같은 단지 (\d+)평/.exec(d.bench.name||''); if(d.py<34&&bm&&+bm[1]>d.py&&d.bench.ppp>=me*.55) o.push(d.bench.ppp);
  o.sort((a,b)=>a-b);
  if(!o.length) return null;
  const med=o.length%2?o[o.length>>1]:(o[o.length/2-1]+o[o.length/2])/2; return me/med; }
/* 고밀도 주거 감점: 이름이 주상복합인지가 아니라 확인된 용적률로 비교한다.
   건축물대장·정비계획 실측(F/L)만 일반 단지에 사용하고, MIXHI는 건축물대장에서 용적률 600% 이상과 업무·오피스텔 혼용을 확인한 표라 600%로 보완한다.
   추정 용적률(E/T)은 감점하지 않아 추정 오차가 순위를 크게 바꾸지 않게 한다. */
function s4DensityAdj(d){
  if(!(window.CAPT>6)) return {pen:0,far:null,src:null};
  const key=d.cxKey||(d.n+'|'+d.area), f=((window.FARD||{})[key]||[]), src=String(f[1]||''), raw=Number(f[0]),
    mix=!!(window.MIXHI&&MIXHI.has((d.area||'').split(' ').pop()+'|'+d.n)), measured=src==='F'||src==='L'||/건축물대장|정비계획|실측/.test(src),
    far=mix?Math.max(Number.isFinite(raw)?raw:0,600):(measured&&Number.isFinite(raw)?raw:null);
  if(far==null||far<=400) return {pen:0,far,src:mix?'MIXHI':src};
  const densityW=(window.S4CFG||{}).model==='m2'?(window.CAPT<=10?12:window.CAPT<=15?10:DENSITYW):DENSITYW;
  return {pen:densityW*clamp01((far-400)/200),far,src:mix?'MIXHI':src}; }
/* 상품성(2026.11.3, 판단, S4CFG.qW) — m2(세대수 + 급지)만으로는 연식이 0점 처리돼 '좋은 자리의 늙은 대단지'가 자동으로 상위에 오던 문제.
   연식 곡선: 0~5년 100 → 10년 85 → 15년 72 → 20년 60 → 25년 45 → 30년 30 → 40년 20.
   재건축 대상(정비 단계 35+ 또는 27년차+ 용적률 250% 이하 추정, 리모델링 아님)이고 사업성 막힘이 아니면 최소 55 — 가치가 건물이 아니라 대지지분이라 감가를 멈춤.
   사업성 낮음·어려움(dead ≥ .25)·리모델링은 연식 곡선 그대로 */
const PRODC=[[0,100],[5,100],[10,85],[15,72],[20,60],[25,45],[30,30],[40,20]];
/* 준공 리모델링은 설비·외관·주차가 신축에 가깝지만 기존 골조와 평면 제약이 남는다. 입주연도만으로 신축 100점을 주지 않고 90점에서 막는다. */
const S4REMODEL_DONE=new Set(['송파더플래티넘|서울 송파구 오금동']);
/* 세대수 25%는 유지하되, 10억 초과 탭은 탭 안 백분위만 쓰지 않는다. 같은 단지의 여러 평형 수와 표본 구성에 따라 점수가 흔들리는 문제를 줄이기 위해
   10~15억은 기존 백분위와 보수적 절대곡선을 절반씩 혼합하고, 15~20억은 보수적 절대곡선, 20억 초과는 완화 절대곡선을 쓴다.
   6~10억과 6억 이하는 기존 백분위를 그대로 유지한다. */
const S4UNIT_STRICT=[[300,20],[400,32],[500,43],[700,58],[1000,72],[1500,86],[2000,94],[3000,100]],
  S4UNIT_MID=[[300,30],[400,42],[500,52],[700,66],[1000,79],[1500,90],[2000,96],[3000,100]];
/* 통합 명칭 중 실제 매매 가능한 일반분양 단지의 소유 세대수. 정비사업성 계산은 기존 지구 자료를 유지하고 최종 세대수 점수·표시만 바로잡는다. */
const S4OWN_UNITS=new Map([
  ['등촌1,2단지주공아파트|서울 강서구 등촌동',505],
  ['등촌7,8단지주공아파트|서울 강서구 등촌동',445]
]);
function s4Curve(points,x){ if(x<=points[0][0])return points[0][1]; for(let i=1;i<points.length;i++){ const a=points[i-1],b=points[i]; if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]); } return points[points.length-1][1]; }
function s4UnitScore(d,pct){
  const own=S4OWN_UNITS.get(d.cxKey||(d.n+'|'+d.area)), units=own??d.units, rel=own?s4Pct(S4Q.U7,unS(own)):pct;
  if(!((window.S4CFG||{}).model==='m2')||window.CAPT<=10) return rel;
  const abs=s4Curve(window.CAPT<=20?S4UNIT_STRICT:S4UNIT_MID,units||0);
  return window.CAPT===15?(rel+abs)/2:abs;
}
function s4Prod(d){ const age=Math.max(0,2026-d.year); let v=20;
  for(let i=1;i<PRODC.length;i++){ const [a0,v0]=PRODC[i-1],[a1,v1]=PRODC[i]; if(age<=a1){ v=v0+(v1-v0)*(age-a0)/(a1-a0); break; } }
  if(S4REMODEL_DONE.has(d.cxKey||(d.n+'|'+d.area))) v=Math.min(v,90);
  const fr=((window.FARD||{})[d.cxKey||(d.n+'|'+d.area)]||[])[0], rm=isRemodel(d)||!!(d.m&&d.m.rm),
    rb=!rm&&!((d.dead||0)>=.25)&&((d.st||0)>=35||(age>=27&&(fr!=null?fr<=250:age>=30)));
  /* 재건축 하한(2026.11.5, S4CFG.rbFloor): 6~20억 탭은 45 — 55면 분당 등 1기 신도시 구축이 상품성으로 과하게 받쳐짐(재건축 고평가). 다른 탭은 55 유지 */
  const fl=(window.S4CFG||{}).rbFloor??55;
  return {v:rb?Math.max(v,fl):v, rb}; }
function s4Score(d){ const Q=S4Q, C=window.S4CFG||{factors:['U7','A','E','J'],locMix:.5,upW:.2};
  const ownUnits=S4OWN_UNITS.get(d.cxKey||(d.n+'|'+d.area));
  d.unitsOwn=ownUnits??null;
  /* 세대수 포화(2026.11.3, 판단, S4CFG.uCap): 대단지 효과는 일정 규모 넘으면 더 안 커짐 — uCap세대 이상은 같은 점수 */
  const J=s4J(d), v={U7:C.uCap?Math.min(d.U7,unS(C.uCap)):d.U7,A:d.A,E:d.E,J};
  const p={}; for(const f of ['U7','A','E','J']) p[f]=s4Pct(Q[f],v[f]);
  p.U7=s4UnitScore(d,p.U7);
  const pLoc=d.locV==null?s4Pct(Q.LOC,null):s4Pct(Q.LOC,d.locV), pUp=s4Pct(Q.UP,d.upR);
  /* 세대수 효과 입지 연동(2026.11.3, S4CFG.uGate=[a,b]): 세대수 백분위의 50 초과분(대단지 가점)을 입지 백분위 a→b 구간에서 0→100%만 인정.
     근거(6억 이하 매칭 1,535단지, 시·구 중위 대비 초과상승, 대단지 pU80+ − 소단지 pU<50): 입지 0~40 +4.0/−5.7/+2.3%p(평균 +0.2) ·
     40~70 +5.1/−2.8/+0.7(+1.0) · 70+ +5.7/−1.8/+6.4(+3.4) — 17→20/20→23/23→26. 입지 약한 대단지의 세대수 가점은 과거에 실현되지 않았음.
     50 미만(소단지 감점)은 그대로 둠 — 입지 약한 소단지를 끌어올리지 않기 위해 */
  const UG=C.uGate; d.uGate=null;
  if(UG&&p.U7>50){ const g=clamp01((pLoc-UG[0])/(UG[1]-UG[0])); if(g<1){ d.uGate={raw:p.U7,g}; p.U7=50+(p.U7-50)*g; } }
  const fs=C.factors||[], ld=fs.length?fs.reduce((s,f)=>s+p[f],0)/fs.length:0;
  // 구축 감점: ① 재건축 막힌 구축 20 × z(apt-map.html DEAD) ② 정비 이슈 없는 구축(공식 단계 35 미만 · 리모델링 아님) — 사람들이 들어갈 유인이 적음(판단):
  //   15년차 0 → 25년차 OLDW점, 그 뒤 유지. 두 감점은 더함(큰 쪽만 쓰면 다른 구축이 내려가며 막힌 구축이 상대적으로 올라감)
  const age=2026-d.year, noIssue=stOf(d)<35&&!isRemodel(d)&&!(d.m&&d.m.rm), oldp=noIssue?OLDW*clamp01((age-15)/10)*(1-((d.m&&d.m.fz&&d.m.fz.f)||0)*clamp01((age-25)/5))*(1-(d.areaMv||0)):0;   // × (1 − 동네 정비 진행률)   // 25→30년차에 사업성(f) 좋은 단지는 재건축 기대가 유인이라 감점을 덜어 줌
  // 입지가 좋을수록 구축 감점을 덜어 줌(판단, 2026.10.26): 재건축이 어려워도 좋은 자리는 실거주 수요가 버팀 — 입지 백분위 80→100에서 감점 ×1→×0.5
  // m2(6억 초과 통합 모델): 일반 구축 감점은 끄고, 재건축 사업성 막힘 감점(대지지분·용적률 → 분담금 비율 → 사업성, 6억 이하 탭과 같은 DEAD 규칙)만 적용 — S4CFG.noPen
  const deadP=(d.dead||0)*(typeof DEAD!=='undefined'&&DEAD.comp||0);
  const dp=C.noPen?0:(deadP+oldp)*(1-.5*clamp01((pLoc-80)/20)); d.oldp=C.noPen?0:oldp;   // m2(2026.11.1): 재건축 사업성은 감점하지 않고 위험 표시만(감점 시 과거 세 구간 모두 성과 하락, 감점 크기 근거 없음)
  const peakR=s4PeakRatio(d), peakPeer=peakR==null?s4PeerPeak(d):null;   // 표시용(배지·상세)
  const peakBonus=peakR==null?(peakPeer?peakPeer.bonus:0):PEAKW*clamp01((peakR-1)/.10);
  /* 급지 점수(2026.11.3, S4CFG.gAbs·gMix): 백분위만 쓰면 '몇 번째냐'만 남아 상급지끼리의 차이가 사라짐
     (도곡렉슬 위치가치 1.28 vs 과천 0.93 — 평당가 1.4배 차이인데 백분위로는 99 vs 96). 원값을 고정 눈금(gAbs[0] → 0점, gAbs[1] → 100점)으로 옮긴 직선 점수와
     기존 백분위를 gMix : (1−gMix)로 섞음 — 직선만 쓰면 6~10억 탭에서 급지 변별력이 너무 줄고(입지 약한 대단지 신축이 상위로), 백분위만 쓰면 20억 넘는 탭에서 강남·과천·고덕이 한 덩어리가 됨 */
  const GL=C.gAbs, gW=(Q.G&&C.gW)||0, pGl=(GL&&d.gj!=null)?100*clamp01((d.gj-GL[0])/(GL[1]-GL[0])):null, pGp=Q.G?s4Pct(Q.G,d.gj):null;
  let pG=pGl==null?pGp:pGp==null?pGl:(C.gMix??1)*pGl+(1-(C.gMix??1))*pGp;   // gMix: 직선 비중(나머지는 백분위)   // 장기 급지(s14): 동 급지 2017~2026 평균의 유니버스 백분위
  const qW=C.qW||0, pq=qW?s4Prod(d):null; let pQ=pq?pq.v:null;
  const high=typeof CAPT!=='undefined'&&CAPT>6&&C.model==='m2', tW=high?.05:0, effectiveGW=high?.50:gW;
  const gMissing=high&&d.gj==null; if(gMissing)pG=0;   // 급지 자료가 없으면 중립 50점으로 상위 노출하지 않는다.
  let qGate=null; if(high&&window.CAPT===10&&pQ>50){ const g=clamp01((pG-45)/25); if(g<1){qGate={raw:pQ,g};pQ=50+(pQ-50)*g;} }
  const transport=high?APT_TRANSPORT.evaluate(d):null;
  /* 세대수 가점 급지 연동(2026.11.5, S4CFG.gGate=[a,b], 6~20억 탭): 세대수 백분위의 50 초과분(대단지 가점)을 장기 급지 a→b에서 0→100%만 인정.
     6억 탭 uGate와 같은 원리 — 급지 약한 대단지 신축(신월 목센위브·수색 DMC·일산 요진 등)이 세대수만으로 상위에 오던 문제 */
  const GG=C.gGate; let ldx=ld;
  if(GG&&p.U7>50&&pG!=null){ const g=clamp01((pG-GG[0])/(GG[1]-GG[0])); if(g<1){ d.uGate={raw:p.U7,g}; p.U7=50+(p.U7-50)*g; ldx=fs.length?fs.reduce((s,f)=>s+p[f],0)/fs.length:0; } }
  const lead=fs.length?(1-C.locMix)*ldx+C.locMix*pLoc:pLoc, base=(1-C.upW-effectiveGW-qW-tW)*lead+C.upW*pUp+effectiveGW*(pG??50)+qW*(pQ??50)+tW*(transport?.score||0);
  const comp=s4Total(base,dp,peakBonus), modelComp=comp;
  const wl=fs.length?C.locMix:1, w={u:(1-C.upW-effectiveGW-qW-tW)*(1-wl),l:(1-C.upW-effectiveGW-qW-tW)*wl,p:C.upW,g:effectiveGW,q:qW};
  d.s4={pU:p.U7,pA:p.A,pE:p.E,pJ:p.J,ld,pUp,pLoc,pG,pQ,qrb:pq?pq.rb:false,qGate,gMissing,J,dp,rawDp:dp,peakR,peakBonus,peakPeer,modelComp,w};
  if(high){d.s4.transport=transport;d.s4.w.t=tW;}
  const za=s4SizeAdj(d); d.s4.za=za;
  /* 언덕·역 거리 감점(2026.11.3, 판단, m2만): 급지는 주변 단지 평균이라 같은 동네 안에서 언덕 위·역에서 먼 단지를 구분 못 함(예: e편한세상신촌 주변 대비 +45m).
     언덕: 주변 최저점 대비 높이 10m 0 → 52m −6(7m당 −1). 6억 이하 탭 회귀(1m당 −0.30%, 50m 상한)와 같은 방향.
     역 거리: 지금 운행 중인 역 도보 10분 0 → 25분 −5. 6억 이하 탭 회귀(10분 −6.6% → 20분 −18.6%)와 같은 방향 */
  let ta={h:0,w:0}; if(C.model==='m2'){ const R=typeof hR==='function'?hR(d):null, wm=d.locParts?d.locParts.wm:null;
    if(R!=null) ta.h=6*clamp01((R-10)/42); ta.w=wm!=null?5*clamp01((wm-10)/15):(d.g&&d.g.lat?5:0); /* 3km 안에 역이 없으면 최대 감점(2026.11.3 — 이전엔 자료 없음으로 0점 처리돼 역 없는 단지가 오히려 유리) */ ta.R=R; ta.wm=wm; }
  /* 초대형 단지 가점(2026.11.3, 사용자 판단, S4CFG.mega=[시작, 만점 세대수, 점수]): 5천 세대 넘는 단지(헬리오시티·올림픽파크포레온·파크리오·잠실엘스 등)는
     단지 안에 학교·상권·커뮤니티가 갖춰지고 거래가 많아 그 동네 대장 역할 — 세대수 점수(로그, 2천 세대에서 포화)로는 이 차이가 안 잡힘. 경계에서 점수가 튀지 않게 시작~만점 사이는 비례 */
  if(high)ta.w=0;
  const MG=C.mega, mb=MG?MG[2]*clamp01((d.units-MG[0])/(MG[1]-MG[0])):0; ta.mb=mb;
  const density=s4DensityAdj(d); d.s4.density=density;
  d.s4.ta=ta; const adj=Math.max(0,Math.min(100,comp-za.sm+za.pp-ta.h-ta.w+mb-density.pen));
  const pc=s4Pct(Q.COMP,adj); d.score=adj; d.comp=comp;                     // 0~100, 모든 단지 공통 산식
  d.top=Math.max(.1,Math.round((100-pc)*10)/10);                                   // 상위 x%
  d.urank=Math.max(1,Math.round((100-pc)/100*((C.complexes)||4708))); }           // 약 N위/4,708단지
const s4RankTxt=d=>{ const n=(typeof D!=='undefined'&&D.length)||1, r=d.rank||d.urank||0, t=Math.max(.1,r/n*100); return `이 화면 상위 ${t<1?t.toFixed(1):Math.max(1,Math.round(t))}% · ${r.toLocaleString()}위/${n.toLocaleString()}개 평형`; };
/* 간략 상세에서도 지형 정보는 공개한다. 높이차(m)와 보행 부담 지수의 단위를 구분. */
function terrainPanel(d){
  const values=(window.DEM||{})[d.cxKey||gkey(d)]||[], R=hR(d), inside=values[1], walk=hW(d);
  const height=x=>Number.isFinite(x)?`${x}<i>m</i>`:'자료 없음';
  const terrain=R==null?'지형 자료 없음':R<10?'평지 기준':R>=30?'언덕 기준':'평지·언덕 사이';
  return `<section class="sec terrain-panel"><h3>지형·경사 <small>${terrain}</small></h3><div class="score tnum">
    <div><span class="l">주변 대비 높이<small>반경 500m 안 최저 지점 대비 단지 대표점 높이</small></span><span class="v">${height(R)}</span></div>
    <div><span class="l">단지 주변 높이차<small>단지 중심 120m 안 지형 높이차</small></span><span class="v">${height(inside)}</span></div>
    <div><span class="l">보행 경로 분석<small>${walk?`보행 부담 지수(0~100) · 경로 신뢰도 ${walk[2]===2?'B':walk[2]===1?'C':'D(지형값 유지)'}`:R==null?'별도 보행 경로 분석 없음':'별도 보행 경로 분석 없음 · 현재 지형 높이로 경사 보정'}</small></span><span class="v">${walk?Math.round(walk[0])+'<i>/100</i>':'자료 없음'}</span></div>
  </div><p class="note">지형 격자에서 계산한 높이차입니다. 실제 도로의 경사도(%)나 동별 출입구 경사와는 다를 수 있습니다.</p></section>`;
}
/* 상세 화면 '입지 점수' 섹션(교체용) */
function locPanel(d){ const L=d.locParts;
  if(!L) return `<section class="sec"><h3>입지 점수 <small>계산 중</small></h3></section>`;
  const pc=x=>(x>=0?'+':'')+(x*100).toFixed(1)+'%';
  return `<section class="sec"><h3>입지 점수 <small>${d.loc.toFixed(1)} / 100 · ${window.CAPTXT||"6억 이하"} ${((window.S4CFG||{}).types||0).toLocaleString()}개 평형 중 백분위</small></h3><div class="score tnum">
    <div><span class="l">주변 시세(위치 가치)<small>${d.kfw?`반경 ${Math.round(d.kfw.bw*2/100)/10}km 안 25년차 이하 단지 ${d.kfw.nn}곳의 상품 차이를 뺀 평당가(자기 단지 제외)`:esc((d.fwsrc||'').split(' · 같은 단지')[0])}</small></span><span class="v">${Math.round(L.base).toLocaleString()}<i>만/평</i></span></div>${L.dw?`
    <div><span class="l">이 단지 시세 반영<small>주변 ${Math.round(L.base0).toLocaleString()}만에 이 단지 시세가 말하는 위치가치 ${Math.round(L.own).toLocaleString()}만을 ${Math.round(L.dw*100)}% 섞음 — 상권·경사·생활권 차이는 단지 시세에 들어 있음${d.dead>=.5?' · 재건축 막힌 구축은 더 많이':d.disp>.3?' · 주변 시세가 엇갈려 더 많이':d.rbw>0?' · 재건축 기대가 낀 만큼 덜':''}</small></span><span class="v">${((L.base/L.base0-1)*100).toFixed(1)}<i>%</i></span></div>`:''}
    <div><span class="l">역 도보<small>${L.wm==null?'3km 안에 역 없음':`${esc((d.cur&&d.cur.n)||'')} 도보 약 ${Math.round(L.wm)}분`}${L.fut?` → <b>개통 예정 ${esc(L.fut.n)}역(${esc(L.fut.line)}, ${L.fut.year}년 목표) 도보 약 ${Math.round(L.wf)}분</b> 기준, 개통 전 ${Math.round((1-L.fut.disc)*100)}% 할인`:''} · 같은 동 안 실거래 회귀</small></span><span class="v">${pc(L.wa)}</span></div>
    <div><span class="l">노선 프리미엄<small>${L.lp?`${esc(L.lpl)} 도보 15분 안 — 신분당선은 같은 동 안 실거래 회귀 +18%, GTX는 운행 중 GTX-A 역 주변 실측 +13%(역마다 편차 큼), 월판선 +9%(가정), 인동선은 인덕원·동탄 환승역까지 2정거장 이내 +9%·3~4정거장 +4%로 가정(개통 전 할인)`:'도보 15분 안에 신분당선·GTX·월판선 없음 — 다른 노선끼리는 실거래상 차이가 오차 범위라 같게 봄'}</small></span><span class="v">${pc(L.lp||0)}</span></div>
    <div><span class="l">경사<small>${hR(d)!=null?`반경 500m 안 가장 낮은 곳보다 ${hR(d)}m 높음${(window.DEM[d.cxKey]||[])[1]>=30?` · 단지 안 높이차 ${window.DEM[d.cxKey][1]}m`:''}`:'높이 자료 없음(중위값)'}${hW(d)&&hW(d)[2]?` · 실제 보행 부담 ${Math.round(hW(d)[0])}/100 반영`:''} · 1m 상당마다 −0.25%</small></span><span class="v">${pc(L.fa)}</span></div>
    ${L.anc?`<div><span class="l">최근 급등분 차감<small>이 동네(동) 급지가 2017·2020·2023년 평균보다 지금 ${pc(L.os)} ${L.os>=0?'높아짐':'낮아짐'} — 최근 오른 만큼은 장기 급지로 되돌려 계산(내려간 곳은 올려 줌)</small></span><span class="v">${pc(-L.anc)}</span></div>`:''}
    <div><span class="l">입지 평당가<small>세대수·학군·초품아·직주·연식·브랜드는 입지 점수에 넣지 않음(상승 요인·적정가에서 따로 반영)</small></span><span class="v">${L.ppp.toLocaleString()}<i>만/평</i></span></div>
  </div></section>`; }

