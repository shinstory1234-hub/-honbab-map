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
  // 속도(2026.11.14): 예정 역 거리 배열은 단지마다 한 번만 꺼내고, 역별 노선 판정(정규식)은 한 번만 — 결과 동일
  const FD=(typeof FUTPOS!=='undefined'&&FUTPOS&&g.lat)?futureDistances(g.lat,g.lng):null, FM=FD?s4FutMeta():null;
  if(FD) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f) return; const pr=FM[k].pr;   // 인동선은 역마다: 인덕원(GTX-C·4호선·월판선)·동탄(GTX-A·SRT) 환승 허브까지 2정거장 이내 +9%, 3~4정거장 +4%, 그 밖 0(판단) if(!pr) return;
    if(walkMin(FD[k])>15) return; const v=pr*Math.max(.8,1-.05*(F[2]-2026)); if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} ${F[1].replace(/\(.*?\)/g,'')}(${F[2]} 예정)`; } });
  // GTX 한 정거장 환승권(판단, 2026.10.26): 도보 10분 안 지하철역이 있고 GTX 역(운행·예정)이 2.5km 안이면 GTX 프리미엄의 절반(개통 전 할인 동일)
  if(lp<LINEP.G/2&&wm!=null&&wm<=10&&FD) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f||!FM[k].gtx) return;
    const m=FD[k]; if(m>2500||walkMin(m)<=15) return; const v=LINEP.G/2*Math.max(.8,1-.05*(F[2]-2026)); if(v>lp){ lp=v; lpl=`${F[0].split(' ')[0]} GTX 한 정거장 환승권(${F[2]} 예정)`; } });
  // GTX 버스·연계 접근권(판단, 2026.10.26): 도보 15분(1.2km) 밖이어도 4km까지는 버스 등으로 이용 — 프리미엄 절반에서 거리에 따라 0으로
  if(FD) FUT.forEach((F,k)=>{ const f=FUTPOS[k]; if(!f||!FM[k].gtx) return;
    const m=FD[k]; if(walkMin(m)<=15||m>4000) return; const v=LINEP.G/2*clamp01((4000-m)/(4000-1200))*Math.max(.8,1-.05*(F[2]-2026));
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
let S4FM=null, S4FM_SRC=null;
function s4FutMeta(){ if(S4FM_SRC!==FUT){ S4FM_SRC=FUT; S4FM=FUT.map(F=>({pr:F[4]!=null?F[4]:/GTX/.test(F[1])?LINEP.G:/신분당/.test(F[1])?LINEP.S:/월판/.test(F[1])?LINEP.WP:0, gtx:/GTX/.test(F[1])})); } return S4FM; }
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
/* 22년 전고점 미회복 감점(2026.11.14, 경승 결정: "전고점 못 넘은 단지는 크게 감점, 거래 없던 신축은 제외").
   비율 = 현재 실거래 시세(bt_livecur, 평형별 12개월 거래수 가중) ÷ 2021.7~2022.6 고점(면적 5㎡ 구간별 상위 3건 평균). 100% 미만 2,523곳만 수록.
   고점 기간 거래가 없던 단지(2022년 이후 신축 등)는 자료 없음 → 감점 없음. 사이트 단지명과 원자료 이름이 다른 곳(상계주공14단지 ↔ 상계주공14(고층) 등)은 대응해 둠.
   형식: 단지키(단지명|동) djb2 해시 base36 끝 5자 + 비율 2자리(%). 전 단지 5,158곳 해시 충돌 0 확인. 생성: realestate-media DB 조회(2026-11-14).
   감점: 6억 초과 탭 25 × (100%−비율)/25%p, 6억 이하 탭 35 × 같은 비율(점수 분포 폭이 1.4배라 같은 강도로 맞춤). 75% 이하 만점. */
const PEAKLO_PACK="00wsa9701xo97703b3g8103l5g6705uab77065nj83067y09306cwo8507n1l5907o8o7307r896307ua49308jwk9508mm77508stf8709286790985y770b2gq830b6m8730bc8l810bl9d750c254990c916690ccko730cmvo750cvwk750dcli790dcod650dyjp910ezec710fc44890fe7l810g08i810hdtw830i4h9970i87h750jeel710k283770l16w730l3o0750l5fs830lf5t950lttf690lyfk730mapo890n9sk670njby750o73d950ohwg910olhx870pe5x930q369750qm9f830qpbk810rtex770s0wx830sazs770tq1h750tte8690uhlp770uv4d570v3ml910w7m1750wj2d710wkrf910x9vj690xa8d770xoq3850xthp750z3i4910zbo5770zh2l810ztb297102do7311d0p6711ln59512i9x8512r957714nbh9714qnk8714tm5511625u8516kg4711710597173k877175t19917cua9317pi19918qe37719gwk851aunh791b6h5751bcrv971c9a5791dp5o951elqg671glhc951gyod751h01y931i1wg951irvd851jf2d991jiat971jptx871jzo8791kfbh831minl931mjsk711mu4o951mvdl791n7gq691ngu4711oi0g771pcc1891phef651pmxo991py2w851skls871sqc8811stx6731t1qb591taa5891tczp951tfwg751tigl751uiw0811uk3g791uxcu631vb9p831xcwb791ybko811ymp0831ysbb931ywjq831zgyc931zxmi871zyxd7920gyd89211q16521ptd9523wkd7324v0o7527cu97527upe9328qmt7928t0177295s8932a3ll792bqel832bx6i892cn7b632d290692dg6t652dxpl852e0jo772egch672ewtq752fhss812gcqp772i6lx952ifss812ilfp872jfrh972jmqp792k8l6812l1tb992lh9c752lusc892mc29772mddl712mhz8792neg0772npew852nub9752o48d752owh4872p8ll752pkl4672pp88952ptch912px9p922qt8o752r4v0772rl2o952rlgp772rzyl772sqop912tfg4652ua9x732udog612wcv2852wilh692wpat552wqd0732x4ms772ykvg812yl95792yug8872z4ip792ziyq832ziz57731kec8531u8b73323hp8132r9f83336w08533tvs6733vzx873449c9534vg665358sb5536xjl73389dw7938r7o79397i47339ims913bfe2993bkyh833cdt0893d0ga913eqbr873f1w9693fmlc833fmqg693fq06873g5b6633g81g773gf25893gs3n753i4hd693jea9913k7m5813k9eh713l95w693ltjp893m1gy713n9q6893nuao633omul673pnu6733r0v9953rjt0853rt7t873tuvl933u45s733u4t8873v749933v931813ve3p773w329953w8go793wp1w733x9zd773xeyd733xsdo933xw2p713yxds813yzoc8740cl68140mgb9940nwk7140tlj8340vxw7941hc49341qul9941tjl7541ye179433b595433rv6543zll81445d77344ary8944wg68745vgc8746lta9946sbz7147dpw7547rdw91498jy7349osu9549swl814ap4c874avfh754brtk914buo5734c1oq594c8ql814cxif774d871814dpzq894dqxg814dubl714ept1834eszc894eu6t754f0qd994fdde694g3yh894gfbo854hckc894hcu9894hhs8914hvf1694hwk9994hzce874ipqw734j01l834j37x794j3y4934jzq2914kayx894kdzh734lwy4934lyts794m5a5954nnny894o1js854oh76934ooz1794pj5t874q1wy734rkx9694tfsp734tjlf674tupw934unvi774urhd794w003834wowu854wuv5754wv10714xmhj994y0dh854yez8794yg3g814ylqx834yqh8814yrq9734yyil8750m0b7351ka96351mea6951ngx9353t1z77548qg6554b6w6555jcb7155ma99155sbn7356bmt8556nyk93571b4655781p6557r1l7157td87157wt97558wi589599el895ab44835b08g935b3mb715ca7k975ch1b835cv3d775cyb1735e0wp795f3yq755fcuk755fcyx875ftrx715fwy0615h8ag775ie30755iph5795its8955kr5g935kxqf875lgup855ly5h635m5id775mh2p695mt3d955n5g7775nuay715p3qa735p8od775pe45735pgis615qcy9775qrr5835qx9g855r6i1675rdm5975rrqc755sjfl795skvz715tfk0875tkyp575tm1k615txj8795w2e9755x6p0775xf0c775xf0t935yami835yjdt795yqsx755zsug996024s7560hl477611a289618qx7161b997161ekq9762rbu77633n08164fmh75658h87965a2o8765m0t7966cmh63677pc95677ys8167gzz796860j8368iyg8369zmr776avng856bh7t696bklt836cwi4776f0bd916hqdg716hryl676i25o936idht776jj5g856k4pg976kees836kqxl796l1ix736ljjm836m918816mgzl776n4sc796nmw1756nqnk756numh896oba5716oug9816p4t4756pjde756pxtc716qbne756r49g996sdyh956sq7w856sum9556swti776thtl756tye6716uezd676uh0d836utxa976uzet796vpm9996vpt4756vwel756weip856wpqw936x077896xctz896xdv5856xi8y796ynq08570cuw7170mbk6970smm7570ya4697181x9371pxg91720yx8572o1579744ho85745zw7774elm9975k4x85771hg5977fe96777hs87778hdw9778x1m857ay9g757bqi7797c7kh737c8u4757ca8l937cgsg777cmgw757cpdr717cqg8977d12g997e3fv937gbji617h3r8997hd7e857hnou937i49l957iog0897iso8897itqw977jgi1837jli0737llr0717lrx8737myrt937nx3w717ogpo837opet777or9c917ow7r777ozm7757pwhw937q4dn977qj8o697quy8637rlz3697rsvu977ryeg737szg1957t4c4777t61h697tabl897tcks857ue12747uf73697v47w877vjx9897w28l897wkeo817wwsa917xodl777xskc797z14x857z2sw817z31o657z5j9697zv2o838004p99803ex73806206580pbl7181iv971821c87582ao06782bwc798403x8984gd58584px99184rb771852mn85855y17185i297985na56585uix73863b8778677m8587b798187xig83881n88789qqk7989r2l758aeco658atqh828b74s798bmxh978c5ta658cxp4848ddg1798depa968dysf798f1q7958hmts918hqez738i26k778i57u918jfqd778jk10738lrms798lsir998m8dp858mbqe838mnyj858mqsu878o0q0958osrg798oyl4798pvxa698r1io918r68x898rm55738rsvo978s5vk898tayp758tn51898twlj778ubjb978ucyk958w3yz858wtm8778zovp678zp2d8390cd37791tk179929wu85933037993ux96795wjk9196shz9196xbd89978kt8797ch577982cb8398tre9798y3a7699b8p8099i19719agc8739ax4k699bjfd959bwz9979c9nh799d8fk799dvkh759fna5779g2i4879gav8899gzyb619h2ss779hety779jg5s779jlcc759kd78739klh8759ku34859m34t859mkbq939ndza719nzpb899o17w699osi1979oxhg919p3i8999pi7l839plsc719pq0r759qcxx839qun4959rsok699t53g699t6rd799tjsa839utg0779wm9p859xaf4919xhal919yba1959ydcs659z08v739zhlt859zq1h819zu9p959zyog69a04up69a09xp99a0yog77a15h491a16ty73a1io061a2e6981a2mdl75a2ok881a36lv85a3cis97a3dno69a3l3t93a44gh73a4l6189a4tgh91a4tnz71a4us169a5gee77a5koz87a6luj77a7h1l89a7ozp87a7spw76a82si85a86hs87a8c2j99a99dl81a9dms71a9h0t89aadne69aaxx583acghp77acl1t95adh6l91ae40087aeyvd91af01d61ah0fc85ah8vi75ahr4x73ailrt75aiue899aj5lx85ajyeb77akp7481alf3s77alh8869allm581an21d83an3ho99anhz865aorij69aowon81aoxbp77apkym83aq8po97aqc1680as2r595aslyp67at83w67aukvr71aus8u79avef177avefq79avn7h61aw0k079ayfy187b08sh87b1l7l77b225s72b24bm79b25fk89b2wzj71b5bzp73b5ji179b5nai95b61co85b6g8881b743073b76ls91b79xh63b7brk81b84ot83b86j477b87qh65b9id595barvw73bbf3q95bbfkk99bbtwl79bby4i81bcmbs85bcrf893bd2s575bexml99bey5c63bf8mk69bfd9l57bfg0077bgcm499bi1bs91bioux73bjhtk69bjrmg75bjzsc93bkjkj75bkv1299bllgy45bm0eh80bm61g95bm7xd71bmpyh93bmvpg93bn6kp77bnf6679boyv569bp5n485bpfq077bpr1p73bqp2g77br4ww85bsbtm77bsgwk97bsoxy95bt1fy97bta9v95bttmd65bu4j975buf2l75bwyvy65bxpsx77by34c63bz09d79bzoq987bzxxg71c16l099c197d73c1aj173c1o5g77c1r6p87c27ko89c2jtt65c2uyn81c3d1w67c3ief71c3qs081c3sv479c49mb99c5h9479c6vsg95c7m2p93c82ij91cagww69cb97977cbtix97cbv1789cc5ad95ccakk69ccu7t93cd3dj75cdfnk87cdpmd97cdx8p61ce4g485ceacg77cef6a73cg8v875cggas73cghl169cgiz781chnlo71chu3l71ci8x489ciy9s93cjml595ck5t085ckfc875cli2a73clirw71clv1s79cmcsy97cmvfk73cn1b081cn9j087cnizr61cns4w67cp1rg69cpe3675cppen69cppx197cpsne97cq1no91cq35g87cq7th69crc8o75crw9q91cs6xw75cszmj89ctrzm97ctssp89cu48z71cuaew81cufht69culut99cv6uo59cvt7481cvvqu64cw7lo97cw9dw89cwkgg83cwmco77cwnm083cww0093cxpjo87cy7u475cy8vk73czgy573cznsk91d0sx487d2mcv93d35do75d3kqc99d48si93d4hok85d4uuk85d51c177d579a67d5vt599d6nlg65d6ssn73d7l5569d7pnb83d7wsi65d85sc83db5el85dbpzv85dc1i887dce9p79dcewv73dck6o81dcrm087dd57981dd84s93ddgeh83dehe477dei9p81dex4w63df0hs93dfb9u71dfm4m59dfxdb69dg1go75dg2jc83dg7vd87dg8mo99dg9ki63dgfco85dh9i477dhag579di9us79diup889dixqh89dlfe495dlflm79dmeog83dn62582dnizz75do3tg75do5dk79do67n79dob4c75dq2b485dq4no85dq83873dqkqc79dr8qc83ds7hs97dstx487dtso279duvus97duxgo99duzbx73dvcys91dvv6077dvzbd61dw7w975dwe2965dwf6s69dwf7m81dxahx97dxsys97dyiv977dylv881dz76g89e02us97e1w6l93e1zng83e2zst73e315w73e3j8875e3pk473e6yyo73e742463e796591e7bhb79e7xfg89e87uw67e8t1z93e98th87e9u1o75ea5j081ea6m579eaew692ealb973eapoo69eapy567ebiuh95ecqpy73edasl79ee6jj83eegbz93efj5p77eg0hs87eg2tf71eg2ys77eg6ld99egbvp81eh1qr79eh3r495eh9rg65ehk5495ehy6m95ei1g175ei5ex67eiqxx71ejrll99ejzuw99ekhdc85el8s485eligx57ello081elo1o91elrfk79en2a981enia479enmrh85eo93485eobb577eojk099eokuf75eoq1s75ep1lk81epu5581epu6u81eqslc77eqyd969erysk63ethm469euhkc87euv6s83ev4ds73ev62s85ew4t273ewawp69ewqz573exhft73exiyo93exrrt57ey29o81ey35c67ey5ic91eyam993eyhqb83ez0my75ez4xi94ez77c93ezpd183f0v0r69f12g891f1ow871f22yp75f26ko77f2hkc85f2j8w59f33oi77f35xb79f37v859f3lkh99f3pg987f3sgu87f49iw87f4eis97f4in093f5ac979f5czx99f67ss91f6ful85f6q2m71f6ru179f7oa183f7uvs65f7xpt81f808l65f8j1o91f8mn297fa6he67faaun75favel87fb32k79fb53u77fb6m997fbkm381fc3mg83fceu673fcmm073fdr8h85feanz75feih869ff61d73ff7qr59fg4t573fg8nl89fgi4s75fhkbe79fhrz069fj5ng93fjt3375fkar997fl45l73fl6s891fl70p81flhmd71fma3373fmynx77fo51r71fop9h77fpf6579fpj4989fpxu391fpzdd79fq2fy75fq3dh71fr7jc73frl2c83frnme87frr0s89frrsg65fs9ld73fszbi75ft0ng99ftumn73fu2ir71fu59v91fuahq73fupvg75futt673fuvvm77fv5q395fv6e191fvi4l73fvlw871fvwse93fwkds81fwu8w65fwv0d87fydrh79fyjyq79fz1r573fz4ot95fzduh89g0ppy73g13ib81g14j579g1f2c81g1q3981g1suq71g2lzd73g2nrv87g35mh83g4syt71g55lt69g5hps81g62as81g76p893g87yt93g9cs487g9oxf89gaf3x83gb2wd73gb37173gbnz189gbw4973gcalj81gcw1s97gdexe95gdikl85gdpel83ge7i587ge93w77geqys95gey3g95gf8i891ghclm63ghzev69gihd269gijmo75giw5p77gj8s089gjuas91gjxo077gki4881gkpks99gkyag91glacm81glc4979glleh89gm6gt75gmz7485godt271gogd773gon7887gookm87goss985goxrz91gozx491gp6ug87gpgxp73gplm495gpsos67gpyns77gpznp97gr26p79gr92x99grgi879grj2481grt3b67gttnp67gubmf83gum4491gutpy79gw2z667gwcxt81gwpwp97gy5ex63gyu8475gz8wt69h00kk75h0qi977h26qw95h2abl87h2kc081h33mt77h36ac83h3wdw89h4erw75h6c1591h6hcq81h6vbk73h768c75h7bxc81h7hn187h7ktq77h80ow95h847z61haoj493hby2895hdpww81hds2991hegr581hf3qw69hf45971hfeao79hhjts75hhkxd93hikok83hiuk069hj5v281hk4x493hl5dc81hlcrd77hlmdc95hm67s75hmfmb73hmlqe67hnsu671ho0ij67hoaw881hoblg81hoij899hqc8p67hrj8y73hruxw97hs33o79hsazl65hsfxt75hsv3g85htm2p81htn4o79htwlh71htxo087hv31881hv4q893hw3pu77hwbng91hwezd93hwno875hwqge71hx0g879hycpk73hyfwt79hylp769hyobk93hz6y075i0evi87i181l87i1joo99i44ql89i4aec87i4t6477i5yi575i6fol83i6frp87i75dn75i7jrc87i8gs567i8y8275i9zr277iaf1p91iav6n67ic2st85icqw279id1aw93id1gq73id9it89ief0x87ietot87igi0w67ih5ec91iha2075ihkkx81ihmfl89ihngl75ii9wt83iilfc97ijfvc93ijqpk81ijvma73ikab967il3ss75ildln89imwf877in8l197inx5p99iog5581ipi4p79ipko173ipwok75iq5og77iqy4d83ir51w75irdxw83iridl83is97d97it52w67iu49993iudnd97iupfa61iuq1d77iuted85ivqfo77iw4ts73iw5ek77iwh8g89iwphs99ixies91ixix469iydvn95iyeqd77iyjf563izhig93izmvu85izpww69izs2r63izy5573izza991j040t89j0bjo95j0uy095j13j987j3njd77j3ot471j4pv477j59og89j5hks67j5qos73j6cs597j6d7u91j72o061j7ifh77j7vxk95j8fp495j8gor89j8qrs79jab9269jad4x95jb3p879jdnig85jfb2491jfmkr77jghq499jhnhl81jioil99jiqf071jjobp89jk0d273jkdt579jl0rk99jlqno93jm47571jnkes85jnopb99jon8g93jp33g77jp9uc95jqpia67jr04071jrdjh87jrppg79jsc6y99jstap69ju10w81ju12o75juyxk75jvnmt87jwskv75jx6ww89jxbfn69jxgas91jxjxo73jy5l199jyyaw79k0bew73k0nv083k1bag99k1o3h79k23d195k39kp87k3bho79k3k6r85k47hu69k4my991k5rur99k5z2l81k6mq181k6udx81k8ihx77k8l1s73k8r1p80ka29c93kagtb75kavno81kawix83kazu183kbh9573kbirh57kbtlk89kcj6w79kcp7o91kcpu579kcrah81kdcsx95kdnnb81keijt73kf4ls63kf7rs91khmn081ki9ri79kj9gu95kjj3765kl8t765kloc175klpa475kmdfk99kmfba85kn61577knb3x75kpwcr73kqa2o91kqzv973krxy975kss4h75kt8gc65ku1qs79ku4rg71ku72985kuapy85kuhp169kujqw97kvw8169kvxu879kwwbw73ky61581kykzw93l01hp93l0kp083l0l3c95l1oh898l1tdm81l2btd87l2kpr75l2s5p73l4pyt83l68md99l6gms69l6i4479l6twp91l74wl73l7cko71l7wax85l8tho79l8z4x73l8zq873l9a4761l9qar91lauy269laxtc83lb2t865lchkw77ld3yi71ldryb67le5us79leal283leg4d73leqm193lewcm91leyod87lf1t885lffml65lfiyo83lfkj897lgns173lgsjs91lgtxc95li04q89lijch77lip2e73liyev79lk4m195llcou89llval63lmor977ln06973ln28w81ln3x481lnde569lnux973loafx71lod0c79lp55569lq0ua99lqn4x73lse2d73lurzb77lw6ox99lxsbs65lyv0367lz1mz99lz2z875lzekl77lzzzj85m0clb75m0om175m15p067m24nr77m2aox95m35nd65m3n4673m3vdt73m3w3c69m3wyp69m4sg397m4v8l75m4z8c69m54yx89m5hh481m6kre77m73s187m797c99m7ibx73m7sla73m8kzk77m8ysu81m96sc71ma6d057madx387mbf9p95mbqpy85mbrvp67mcne287mcwbu83mdcnt65mdfso75mdlcm73me33197meln499merik63mfeo677mfq7r81mgp0k75mhf0379mi62069mj05583mj5bt75mkas985mkkr973mkpzo71ml2u993mm82073mmazj93mmsp575mnc0977mnjs287mp1ag73mpb3s87mpfdu73mpsft67mq3c081mrv0y77msbsh83mspol77msqjj77msuck93mtc6z69mttrd73mvwec87mw90l77mwgco71mxdwk81mxgec71mxsoo91mzln593n05xg75n07t285n0t5163n0v0269n0x9179n2ve089n38al89n3l1691n47h493n4nu575n4wnw73n5c8u83n5jqc71n6lk081n7ew893n7h7k81n7yl585n8a0071n8l1c73n8qho93n9csd65n9kbi71n9vg171n9x3183nak7c81nazy071nbkek75nbzd897nbzgc73nd4ew81ndyk671neacj79neenj79nejlg77nf2zg89ng2b177ng9fb87ngvb075ngxm271nh88179nho0383nhtg493nhwg599nhyqe91nhz0173nixox71nj98p75njb3173nk08673nkh6x79nkja681nko3d67nkv2g89nkzc179nlc5a79nlr5b81nm02083nmi9977nmxoz73nnzch67no4lp75noxlc67npxkd77nqea871nqjr269nqyjj93nr44l87nrrlk73ns0ed79nsr9891nsxwx73ntir175ntmil67ntnv875ntpf067nunq997nux2h89nvdbw79nvlup81nvnjn67nvv1v69nw5a989nwdjc65nwjbl99nwmzs73nx95b83nxcay81nyie867nyxq997nz8qa67o0bkt93o0cah67o0mgx73o0qsp71o1ary75o1vwq81o1xqg85o29h889o2as595o2n3b61o2pig67o3h7d87o4fj467o4uyx75o6u7l71o717w85o7wx185o80o487o8ozp95o8vhk97o9rm583oajzo71oaqvx83obt4475obtis91oemwe81of4lm91of8ee75ofcho71ofryo73ogkp883oh66k99oh7ul87ohg8u79oiech75ojcjl77ojjag83ok95179okgcc81ol7m979oli6z71olvz579olygn71om1bt87omhvn89onlhf67oo0ls71oomd067oot9167op5a083opbik93oqaic87oqq1093ork7w83os0pk95osljm83oswso79ot0nv99otqng91ouo3o61ouvge69ovmvj73owakt83owgcd79ox1s573ox80a77oxry799oxu7b91oy0i961oyimk91oylmw91ozcu875ozoel99p04ix91p0sz375p1dds89p2vto77p30mk87p3az975p3wqr79p49ua99p566r95p56rx75p5fy599p5rpj61p63oo69p6go989p6ljx77p7hae77p8p4x83p91gi91p96md69p996o69pa0hd95pa9fx75pae6o77pbfqh79pbhu893pbuqd75pbwdb69pc7dd85pd06c79pdlc473pdsqt77pdxh177pgbg897phlt195pif1e73pixpl71plizl85pmgy981pn4kx99pnc1r81pnwgc85pobed73pqdtb67pqitp65preni81ptpc979pu2eo89pupl099pvq8161pwn8g95pwo4t87pwumk83pwvn271pzghf73pzsep67q0isd71q0vf091q0zvp83q1lyo83q1vtp91q217p79q3ij597q4n3a75q4nll81q4pad73q4szh79q56da61q5l2845q5mg985q66jr69q7crp73q7qpt73q831163q9ppq93qadgs85qagfg91qao9v75qaszu85qb22d81qd00w93qd9u687qe0qt89qe6cd99qem2s91qesnd73qfh3965qgkas81qgo2l75qgpef89qhfec93qi6wx89qiivh89qk8wx83qkdhk81qlmsw69qm2e085qm33w97qmsp376qndet83qo6l987qp38p83qq2iw71qq6jf77qqz0187qr4rg83qr9q675qrnwe51qrr6497qsb4b83qswv399qtcv885qukzk73quv6l95quwaf75quzn191qvjxa85qvzrt89qwi7u79qyjj869qyyf787qz8q575qz9es89qzn5y99r1j2n85r1l5p65r1y3r73r29or81r2svo73r335687r3b1d65r3ce681r3o9p81r3wwc85r4gpx77r4t8t63r50ue93r6mu789r6n5j75r723a75r74zw77r798773r8a4577r96e869r9jl171r9y7r93radzp87raspd71rb19w93rb34k67rbfzs71rcjy563rcyb571rd3i473rdedl79rdott73rekvw87req6b85rfyyw75rg2mu91rgawx91rgyao91ri48n71rijkk71risj581rjewo93rjgxg83rjmo471rjnng89rjrvc71rjs7069rkhg199rkmmu83rle8h94rluwk79rluz989rlvu083rm8f177rmr5f69rn9vf65robdp99rojwk81ronvo69rp7vq71rq79y69rrd4g89rrdv377rro8o65rs19589rsi3x95rsu3b91rsybq87rty2885rvejo87rvhhi65rvu4j61rw56191rwbxz81rwyfd41rx0f773rymm575rz2ag77rz31x79rz55k93rz94k87s0oor73s102y81s1krg79s2hty77s2mh591s3d3673s4g1075s4l8i81s4sew87s551477s55v895s5qpl87s5ryd77s66e179s6iu485s6j7z94s6kq277s7cnq75s859r77s8fiu91sakhh83sao4a69saoq199sbc0879sbuug85scymw85sff3v71sfq2r83sfzik75sg28q85sh9nm67sixxx97sj6sl71sj97981sjpv573skjps75sm0pw95sm2n993sm86p65smlvh47snf5k93snsys75so3hs87soscy89spcg373sqhbl75srxd669ss19l93ss2kv81sth8t81sufqw79suhhe91svbtw81svqi977svunc73swtrw71sy8rx69sypvs73sze1485szrnb89t0mpx99t16tl93t1icl65t1ipg75t1m7r75t1wlr85t3i5c75t3yed77t4ldz75t4m1p63t61zr91t64pu73t69ae99t6kqh81t6tlh73t74vx89t7udd45t7un377t8ai267t9vg165t9xbx73tauos73tbhe483tbw5881tcgn197tenhb69tf1un81tfcpx71tfnwk81tg7ah85th1is79thi4x87thmo273ti3fo87tibrw99tilb099tiql995tj00397tj3mc63tjhpv65tjmv277tjz8o95tmgw085tml5573tmqe077tmwj191tnwl279toga865tolnt75tpdw171tpekx85tqlnr67trijh95trtzl87ts8ex81tsmwn87tsuq797tszd867ttq2s67tu0f777tu0rr99tudp983tuzyt79tvil485twt9s77twy9h73txdh979txdwk73txrxt89txtlx87txvpw57tyq7069u0bd857u0f0879u17s999u1vrs87u288097u28nf95u2gm477u2iyo71u2lal81u31ko97u3zex71u4ozh97u502g87u869c99u8lf987u8med99u8z6h71u95v475u98po97ua18l85ub5np65ubcm199ubssh89ucu0893udgs981udrjl75uha7167uhza085uikgu81ukdyo65uln0x79umc7i99umw0v93unlq069uo19m89uodu583uoo4u85uoo6881up95v79uqodc83usirx77utgfk63uuhxj75uujca79uuqik73uwib883uwnpl83uwyls65ux8gd81uydhp82uzg7x77uzjcw79v0b4g91v1itp91v1v0p85v1va267v2vxl81v3fu071v4oe179v55zn81v5nid85v5ua471v78cg89v7fcd49v7wwd89v89nx79v93ok73v94wk81v9ku071va2xu85vbpso71vbvpt67vco0e69vg5lo79vgo7h95vgs6k87vha5o85vhbp097vi03e77vi3s579vijd289viwcq75vjiyc99vjmie73vjpxs77vjyt581vka3h77vld0b97vly7781vm5ot69vm7fe63vnhoq77vojd375voovk67vorb979vppv981vquh879vrpcc69vs20877vsav973vss5187vszb791vt2r891vtpsj75vtwg481vtx3971vuq0883vw3hv89vwnwp99vyc2165vygwp73vyiyv93vyw1899vyx1h97vz6f175vzymh73w04fr91w05jl77w0m4w97w2unm67w2y3k97w3ps471w5b2o79w5iek75w5nqo99w71bw93w7dds87w8iqg77w9vvl89waiel81wb0n887wb16w85wbki895wbz5k89wche169wchyt93wctkp73wdp8k73we1xq79we3tv91welht97wfntp83wg5df51wg8h069wgrg275whdtr81wiaci61wibkh99wimjj77wj7fu97wj7zd91wjbd297wjq1j75wjt0o75wkcco61wketu73wl1ga75wl8wk99wmag879wmkoq65wmwtg67wo62c67woupx65wp3q977wpb0t75wpr1189wpzcg97wrjyv87wrt9d95ws16c79wscks93wt0rc79wt67l83wttjc73wu26w99wv1hs71wwt2979wx1xs99wxoyx77wyjoy69wynf279wyrc897x05hy75x0c9g87x0jql85x0og083x14lv59x23n481x260o77x2u3t67x2x7695x2z0673x4j5t71x5i9881x66xp73x683999x6ew467x74up77x83xk69x8d6d79x916e87x9eit87xaatp77xajw577xbd3m69xblyw81xc2kt93xcssc65xcvng71xe4aw71xf78n77xfek581xffva65xfvas83xgkv185xhea487xilm591xj1ox87xj37267xjl9h89xjvys79xk8ed67xlipp73xmcsr87xmue995xon7c49xopa483xpz9h81xq3bs81xr8u395xraah87xrt0s99xs6i671xsvrs77xtu7p77xu12r81xvhqc91xvhy895xwnr481xwolo61xx73l79xxgc187xyfib95xygi375xyvmg79xz6jd69xz8wu65xzuih99y03f171y03nz65y0ewl77y0fhl87y12po99y1dxx97y1e4b75y1iwx81y1rd193y1smk69y2o8x71y40my71y47ej83y4ar979y4ydc93y53d573y555g63y5aup81y5gky67y69dk75y7mha89y89bm57y8qm279y9fi491yarst85yb18i67yb7zw75ybf7293ybp0d83ydts279ydwei71ye2on93yeame75yebnp73yesi585yfek389yg0hs79yg8a687ygaad69ygdt977ygjm173ygshq71ygugp69ygz2477yh1e063yh4nd65yil3t71yjbit83yjcjt75ylevl85ymouw93ymqo673ynj5185ynu0k77yoo0w81yorpr83youqt67yp7p391ypsrl81yqpc967yrm7i81yrolg67yrs6t91ys9m075ysev199yt34s97ytmyz75ytxbg65yu8td79yu9bs65yuej971yufwx69yuirl69yuu0c83yv63x81ywpq071ywt5d75yxlk077yxn0197yxu0085yxuff79yy2ld85yyexb89yyqfh83yz52s59yz7w071yzu7x75z03fs79z0w1v77z1eq485z2gix79z2gp179z5bcg75z69fk69z6gb081z6k3w69z6nw877z7m9y87z8g1g63z997j71z9jgs97zado081zafv087zbadi73zbgro77zbr2l77zcyz079zd8s981zef4499zeng081zeq2875zeurc93zf4bh93zfi4x95zfkbw65zhad393zhcvh81zja9295zjubl95zkno467zlbd381zlv9o75zlvhi69zlwwj71zmu0069znqmw65zoig889zoj3775zoky463zoohh85zopd875zp7mr73zpi1p85zpz5w63zq5zp67zq62873zrd7075zree475zrlmz89zruhg75zs4as83zsc0799zsej861zstsh77zsz9g85ztdst93ztmtl75zubyk77zudzk91zv62067zvcno85zwuh999zx3qf79zx5ew81zxbz679zxhn257zxjs587zxtlt75zxyqj67zy70083zz37z71";
const PEAKLO_MAP=(()=>{const m=new Map();for(let i=0;i+7<=PEAKLO_PACK.length;i+=7)m.set(PEAKLO_PACK.slice(i,i+5),+PEAKLO_PACK.slice(i+5,i+7));return m;})();
function peakLoRatio(d){ const s=d.n+'|'+String(d.area||'').trim().split(/\s+/).pop(); let x=5381; for(let i=0;i<s.length;i++)x=((x*33)^s.charCodeAt(i))>>>0;
  const r=PEAKLO_MAP.get(x.toString(36).padStart(7,'0').slice(-5)); return Number.isFinite(r)?r:null; }
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
    if(Math.abs(h.lat-g.lat)*111194>2600) continue;   // 속도(2026.11.14): 위도 차만으로 2.5km 밖이 확실하면 거리 계산 생략(대권거리 ≥ 위도 차) — 결과 동일
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
function s4ScoreDetail(d){ if(d.m3&&window.APT_M3)return APT_M3.detail(d); const s=d.s4; if(!s)return '';
  const w=s.w||{u:.4,l:.4,p:.2}, f=x=>(+x.toFixed(3)).toString();
  if((window.S4CFG||{}).model==='m2') { const z=s.za||{sm:0,pp:0}, dn=s.density||{pen:0}, zt=(z.sm?` − 소형 ${z.sm.toFixed(1)}`:'')+(z.pp?` ${z.pp>0?'+':'−'} 단지 내 평당가 ${Math.abs(z.pp).toFixed(1)}(큰 평형보다 평당가 ${z.ppr>=1?'+':''}${((z.ppr-1)*100).toFixed(0)}%, 같은 크기 평형 보통 ${z.ppx>=1?'+':''}${(((z.ppx||1)-1)*100).toFixed(0)}%)`:'')+(dn.pen?` − 고밀도 ${dn.pen.toFixed(1)}(용적률 ${Math.round(dn.far)}%)`:'');
    const ta=s.ta||{h:0,w:0}, tt=(ta.h?` − 언덕 ${ta.h.toFixed(1)}(주변 대비 +${Math.round(ta.R)}m)`:'')+(ta.w?` − 역 거리 ${ta.w.toFixed(1)}(${ta.wm!=null?`도보 ${Math.round(ta.wm)}분`:'3km 안에 역 없음'})`:'')+(ta.mb?` + 초대형 단지 ${ta.mb.toFixed(1)}`:'');
    return `종합 ${(zt||tt?d.score:s.modelComp).toFixed(1)}점 = 세대수 ${s.pU.toFixed(0)}×${f(w.u)} + 장기 급지 ${(s.pG??50).toFixed(0)}×${f(w.g)}${w.q?` + 상품성 ${(s.pQ??50).toFixed(0)}${s.qrb?'(재건축 대상, 감가 멈춤)':''}×${f(w.q)}`:''}${s.transport?` + 교통 ${s.transport.score.toFixed(1)}×0.05`:''}${zt||tt?` (${s.modelComp.toFixed(1)})`+zt+tt:''} · 입지·재건축 사업성은 참고 표시, 순위 미반영`; }
  return `종합 ${s.modelComp.toFixed(1)}점 = 세대수 ${s.pU.toFixed(0)}${d.uGate?`(원래 ${d.uGate.raw.toFixed(0)}, 입지 약해 대단지 가점 ${Math.round(d.uGate.g*100)}%만 인정)`:''}×${f(w.u)} + 입지 ${s.pLoc.toFixed(0)}×${f(w.l)} + 적정가 대비 ${s.pUp.toFixed(0)}×${f(w.p)}${w.g?` + 장기 급지 ${(s.pG??50).toFixed(0)}×${f(w.g)}`:''}${s.dp?` − 구축 감점 ${s.dp.toFixed(1)}`:''}${s.peakBonus?` + ${s.peakPeer?'주변 추정 가점':'전고점 가점'} ${s.peakBonus.toFixed(1)}`:''}${s.jb6?` − 주상복합 ${s.jb6}`:''}${s.pk6?` − 전고점 미회복 ${s.pk6.toFixed(1)}(22년 고점 대비 ${s.pk6r}%)`:''}`;
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
    mix=!!(window.MIXHI&&MIXHI.has((d.area||'').split(' ').pop()+'|'+d.n)), measured=src==='F'||src==='L'||/건축물대장|정비계획|실측/.test(src);
  /* M3 보완: FARD 누락 단지도 이미 구축한 단지 좌표·건축정보 CXP의
     실제 용적률 열([4])을 재사용한다. 좌표/세대수 일치 여부를 함께 검사해
     이웃 건물의 초고밀도 용적률을 잘못 빌려오는 위험을 제한한다.
     25억 이상 기존 모델은 변경하지 않는다. */
  const c=d.cx, g=d.g||{}, k=Number(c&&c[4]), units=Number(d.units)||0,
    near=Array.isArray(c)&&Number.isFinite(Number(g.lat))&&Number.isFinite(Number(g.lng))?
      Math.hypot((Number(c[0])-Number(g.lat))*111000,
        (Number(c[1])-Number(g.lng))*111000*Math.cos(Number(g.lat)*Math.PI/180)):Infinity,
    similar=!units||!Number(c&&c[2])||(Number(c[2])/units>=.55&&Number(c[2])/units<=1.8),
    cxFar=window.CAPT<30&&window.APT_M3&&near<=135&&similar&&Number.isFinite(k)&&k>=120&&k<=1800?k:null,
    verified=measured&&Number.isFinite(raw)&&raw>0?raw:null,
    far=mix?Math.max(verified||0,cxFar||0,600):(verified!=null?verified:cxFar),
    farSrc=mix?'MIXHI'+(cxFar!=null?'+CXP':''):verified!=null?src:cxFar!=null?'CXP(단지 건축정보)':src;
  if(far==null||far<=400) return {pen:0,far,src:farSrc};
  const densityW=(window.S4CFG||{}).model==='m2'?(window.CAPT<=10?12:window.CAPT<=15?10:DENSITYW):DENSITYW;
  return {pen:densityW*clamp01((far-400)/200),far,src:farSrc}; }
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
  /* 6억 이하 주상복합 감점(2026.11.14, 경승 결정 '주복은 확 내려야'): 기존엔 재건축 점수만 −40%라 서초이오빌 같은 주상복합이
     입지 백분위만으로 상위 100위에 4개 평형씩 올라왔음. 6억 탭에서만 종합 −20점. 6억 초과 탭은 apt-m3.js 주상복합 감점 그대로 */
  const jb6=(window.CAPT===6&&typeof isJubok==='function'&&isJubok(d))?(C.jb6??20):0; d.s4.jb6=jb6;
  const pk6r=window.CAPT===6?peakLoRatio(d):null, pk6=Number.isFinite(pk6r)?35*clamp01((100-pk6r)/25):0; d.s4.pk6=pk6; d.s4.pk6r=pk6r;
  d.s4.ta=ta; const adj=Math.max(0,Math.min(100,comp-za.sm+za.pp-ta.h-ta.w+mb-density.pen-jb6-pk6));
  const pc=s4Pct(Q.COMP,adj); d.score=adj; d.comp=comp;                     // 0~100, 모든 단지 공통 산식
  d.top=Math.max(.1,Math.round((100-pc)*10)/10);                                   // 상위 x%
  d.urank=Math.max(1,Math.round((100-pc)/100*((C.complexes)||4708))); }           // 약 N위/4,708단지
const s4RankTxt=d=>{ const byComplex=!!d.m3, n=byComplex?((typeof NCX!=='undefined'&&NCX)||1):((typeof D!=='undefined'&&D.length)||1), r=d.rank||d.urank||0, t=Math.max(.1,r/n*100); return `이 화면 상위 ${t<1?t.toFixed(1):Math.max(1,Math.round(t))}% · ${r.toLocaleString()}위/${n.toLocaleString()}개 ${byComplex?'단지':'평형'}`; };
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

