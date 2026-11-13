/* Apartment Map M3 — provisional scoring for 6억 초과~30억 이하.
 * Cap 6 retains the legacy model. Cap 30 uses M3 without transaction-volume penalty.
 * Weights need historical backtesting. Results are experimental.
 */
(function(root){
 'use strict';
 // 10~15억: 도심 입지·철도 접근성 대비 대단지·면적을 과도하게 우대한
 // 구간을 전수 검증하여 균형을 보정한다. 다른 가격대의 검증된 순위는 유지한다.
 const weights=Object.freeze({G:.38,J:.10,T:.18,U:.17,Q:.14,S:.03});
 const baselineWeights=Object.freeze({G:.35,J:.10,T:.15,U:.20,Q:.15,S:.05});
 const unitCurve=[[100,0],[200,15],[300,27],[500,43],[700,55],[1000,66],[1500,78],[2000,87],[3000,95],[5000,100]];
 const ageCurve=[[0,100],[5,100],[10,85],[15,72],[20,60],[25,45],[30,30],[40,20]];
 const sizeCurve=[[10,0],[16,20],[20,48],[24,76],[30,93],[34,100]];
 const accessCurve=[[0,1],[5,.95],[10,.80],[15,.50],[20,.20],[25,0]];
 const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
 const n=(x,def=50)=>Number.isFinite(Number(x))?Number(x):def;
 function interp(v,curve){
  if(v<=curve[0][0])return curve[0][1];
  for(let i=1;i<curve.length;i++){const [a,x]=curve[i-1],[b,y]=curve[i];if(v<=b)return x+(y-x)*(v-a)/(b-a)}
  return curve[curve.length-1][1];
 }
 function transportScore(candidates){
  let operating=0,planned=0;
  for(const c of candidates||[]){
   if(!Number.isFinite(c?.minutes)||!Number.isFinite(c?.lineFactor))continue;
   const value=100*c.lineFactor*interp(c.minutes,accessCurve);
   if(c.future)planned=Math.max(planned,value*.35);
   else operating=Math.max(operating,value);
  }
  return operating>0?clamp(operating+.25*Math.max(0,planned-operating)):Math.min(35,planned);
 }
 function active(d,cap=root.CAPT){
  return [10,15,20,25,30].includes(cap)&&Number(d?.p)>60000&&Number(d?.p)<=300000;
 }
 // 가격의 불확실성은 '아파트 품질'이 아니라 예산 내 실매수 가능성에 대한 위험이다.
 // 검증 전 정책값: 준공 2년 이내는 거래량 부족만으로 감점하지 않는다.
 function priceConfidence(d,now=new Date()){
  const t=(d.types||[]).find(x=>Number(x.py)===Number(d.py));
  if(!t || !Number.isFinite(Number(t.n))) return {known:false,penalty:0,warn:false,level:'unknown'};
  const n12=Math.max(0,Number(t.n));
  const n3=Math.max(0,Number(t.n3)||0);
  const date=String(t.last||'').replace(/\./g,'-').slice(0,10);
  const parsed=/^20\d\d-\d\d-\d\d$/.test(date)?Date.parse(date+'T00:00:00Z'):NaN;
  const ageDays=Number.isFinite(parsed)?Math.max(0,Math.floor((now.getTime()-parsed)/86400000)):null;
  const newborn=Number.isFinite(Number(d.year)) && Number(d.year)>=now.getUTCFullYear()-2;
  const volume=newborn?0:n12===0?14:n12===1?11:n12===2?9:n12<=4?6:n12<=9?2:0;
  const stale=ageDays==null?3:ageDays>270?8:ageDays>180?7:ageDays>90?3:0;
  const inversion=Number.isFinite(Number(t.pBeforeGuard))&&t.pBeforeGuard>0;
  const latestRaised=!!(t.latestPriceFloor&&t.lastSale>0&&t.pBeforeLatest>0);
  const latestBeyondBand=!!(t.latestAbove25||t.latestFarAboveEstimate);
  // 마지막 계약가가 중위 추정치를 초과하면 시세 후행 위험을 별도 표시한다.
  // 25억 이상 보호 구간 또는 극단적 시세 괴리가 있는 경우 가격을 임의 변경하지 않고
  // 주거 품질이 아닌 예산 내 구매 가능성에 대한 위험 감점을 적용한다.
  // 같은 단지 교차검증(2026.11.14): 거래 1~4건 평형이라도 같은 단지에서 거래 많고 최근 거래가 있는 평형(12개월 5건+, 120일 안)과
  // 평당가가 맞으면(아래 need 참고) 가격이 현재 시세와 맞는다고 보고 거래 부족·경과 감점을 70%/50% 줄임.
  // 옆 단지 역전 전수점검: 래미안에스티움 20평·힐스테이트신촌 16평·당산센트럴아이파크 18평 등 좋은 신축이 거래 1건 평형 하나 때문에
  // 18~19점 감점돼 같은 구역 구축보다 100~400계단 아래로 밀림. 싸게 찍힌 오래된 단일 거래는 평당가 검증에서 걸러져 감점 유지.
  let corroborated=null;
  if(n12<5){
    const recent=x=>{const s=String(x.last||'').replace(/\./g,'-').slice(0,10),q=Date.parse(s+'T00:00:00Z');return Number.isFinite(q)&&(now.getTime()-q)/86400000<=120;};
    const liquid=(d.types||[]).filter(x=>Number(x.py)!==Number(t.py)&&Number(x.n)>=5&&Number(x.p)>0&&Number(x.py)>0&&recent(x))
      .sort((a,b)=>Math.abs(a.py-t.py)-Math.abs(b.py-t.py))[0];
    // 작은 평형은 평당가가 원래 더 비쌈 → 평형 차 1평당 +1%p(최대 +10%) 이상이어야 '현재 시세와 맞음', 큰 평형은 1평당 −1%p(최저 85%)
    if(liquid){ const r=(t.p/t.py)/(liquid.p/liquid.py), gap=Math.abs(t.py-liquid.py), need=Number(t.py)<Number(liquid.py)?1+Math.min(.10,.01*gap):Math.max(.85,1-.01*gap);
      if(r>=need) corroborated={py:liquid.py,ratio:r}; }
  }
  const volEff=corroborated?volume*.3:volume, staleEff=corroborated?stale*.5:stale;
  const penalty=clamp(volEff+(newborn?Math.min(3,staleEff):staleEff)+(inversion?3:0)+(latestRaised?2:0)+(latestBeyondBand?12:0),0,20);
  const warn=inversion||latestRaised||latestBeyondBand||penalty>=4||(n12<5&&!newborn)||(n3===0&&ageDays!=null&&ageDays>90)||(ageDays!=null&&ageDays>180);
  const level=penalty>=8?'high':warn?'medium':'ok';
  return {known:true,n12,n3,last:date,ageDays,newborn,volume,stale,penalty,warn,level,corroborated,
    inversion,rawPrice:inversion?t.pBeforeGuard:null,referencePy:t.priceGuardFrom||null,
    latestRaised,lastSale:latestRaised?t.lastSale:null,rawWeightedPrice:latestRaised?t.pBeforeLatest:null,
    latestBeyondBand,latestBeyondSale:latestBeyondBand?t.lastSale:null};
 }
 // 직주근접(2026.11.12): 기존 pJ는 업무지구(강남·시청·여의도·판교) 7.7km 안이면 전부 최고점이라
 // 탭 단지 60~90%가 같은 백분위(약 80)에 몰리고, 조금만 벗어난 고덕·둔촌·과천·상계는 26~44로 급락했다.
 // 업무지구별로 직선거리 3km 100점 → 20km 0점, 2급은 ×0.7.
 //  1급: 강남·시청·여의도·판교(기존 S4CBD) + 잠실·용산 / 2급: 마곡, 반도체벨트(수원 삼성디지털시티·기흥/화성·평택·SK하이닉스 이천 — 묶어서 한 곳으로 침)
 // 여러 업무지구로 출퇴근 가능한지: 가장 가까운 곳 점수(3→20km) × (0.75 + 0.25 × 다른 업무지구 접근도).
 // 다른 업무지구 접근도 = 2위 + 0.5×3위 (각 3→25km, 합 100 이상이면 만점). 한 곳만 되면 ×0.75(감점), 겹치면 ×1.
 // → 여의도·마곡만 되는 인천·일산은 낮게, 판교+강남·잠실이 되는 분당, 강남+판교+용산이 되는 과천은 유지.
 const M3_CBD=[[37.5133,127.1001,1,'잠실'],[37.5299,126.9648,1,'용산'],[37.5602,126.8254,.7,'마곡'],
  [37.2580,127.0530,.7,'반도체'],[37.2190,127.0700,.7,'반도체'],[37.0210,127.0480,.7,'반도체'],[37.2060,127.4780,.7,'반도체']];
 function commuteScore(d,s){
  const g=d.g||{};
  if(typeof S4CBD==='undefined'||!Number.isFinite(g.lat)||!Number.isFinite(g.lng))return Number.isFinite(s.pJ)?s.pJ:50;
  const cbd=S4CBD.map(([a,b],i)=>[a,b,1,'c'+i]).concat(M3_CBD), rad=Math.PI/180, near={}, far={};
  for(const [a,b,w,k] of cbd){const x=(b-g.lng)*rad*Math.cos((a+g.lat)/2*rad),y=(a-g.lat)*rad,km=6371*Math.sqrt(x*x+y*y);
   const v=w*clamp(100*(1-(km-3)/17)), u=w*clamp(100*(1-(km-3)/22)); if(!(near[k]>=v)){near[k]=v;} if(!(far[k]>=u))far[k]=u;}
  const top=Object.keys(near).sort((x,y)=>near[y]-near[x])[0], rest=Object.keys(far).filter(k=>k!==top).map(k=>far[k]).sort((x,y)=>y-x);
  return clamp(near[top]*(.75+.25*Math.min(1,((rest[0]||0)+.5*(rest[1]||0))/100)));
 }
 function compute(d,cap=root.CAPT,integratedSite=null){
  if(!active(d,cap))return null;
  const s=d.s4||{};
  const years=Number(d.year);
  const raw={
   G:integratedSite?.G??(Number.isFinite(s.pG)?s.pG:50),
   J:integratedSite?.J??commuteScore(d,s),
   T:integratedSite?.T??transportScore(s.transport?.candidates),
   U:integratedSite?.U??interp(Number(d.unitsOwn??d.units)||0,unitCurve),
   Q:integratedSite?.Q??(Number.isFinite(years)&&years>=1950?interp(Math.max(0,2026-years),ageCurve):50),
   S:interp(Number(d.py)||0,sizeCurve),
  };
  // 공식 K-apt 통합 관리단지의 단지 규모는 전체 공식 세대수를 유지한다.
  // 다만 여러 구분 블록에 분산된 규모의 추가 프리미엄을 해당 단지의
  // 세대수 가중 장기 급지에 연동한다. 일반 단지의 상품성까지 무차별
  // 감점하면 좋은 역세권 신축이 100~300위씩 떨어져 백테스트 전에는 금지한다.
  // 실제 순위 검증: 10~15억 통합단지에만 기존 S4 급지 게이트 적용.
  // 직주 점수도 급지에 연동: 급지 약한 외곽 단지가 업무지구 거리만으로 오르지 않게 급지 45 이하 ×0.5 → 70 이상 ×1
  // 과천 급지 보정(2026.11.14, 경승 결정): 실거래상 위치가치는 높지만(2017~2026 평균이 가락·마포 수준)
  // '서울 > 경기' 원칙에 따라 15억 이상 탭(15~20·20~25·25~30억)에서만 장기 급지 −3점. 6억 이하·6~15억 탭 불변.
  if([20,25,30].includes(cap)&&/^과천/.test(String(d.area||'')))raw.G=Math.max(0,raw.G-3);
  if(!integratedSite){ const jg=clamp((raw.G-45)/25,0,1); raw.J=raw.J*(.5+.5*jg); }
  const baseRaw={...raw};
  if(cap===15&&integratedSite){
    const gg=Array.isArray(root.S4CFG?.gGate)?root.S4CFG.gGate:[45,70];
    const gate=clamp((raw.G-gg[0])/(gg[1]-gg[0]),0,1);
    if(raw.U>50)raw.U=50+(raw.U-50)*gate;
  }
  const effectiveWeights=cap===15?weights:baselineWeights;
  const parts=Object.fromEntries(Object.entries(effectiveWeights).map(([k,w])=>[k,raw[k]*w]));
  const density=Number.isFinite(s.density?.pen)?s.density.pen:0;
  const hill=Number.isFinite(s.ta?.h)?s.ta.h*.5:0;
  // 용적률과 별개로 혼합용도 건축물의 주거 상품성/전용률 위험을 평가한다.
  // 미확인 단지는 감점하지 않고, CXP 건물용도 또는 공식 단지정보로 확인된 곳만 적용.
  const mixed=typeof isJubok==='function'&&isJubok(d) || (Array.isArray(d.cx)&&Number(d.cx[3])===1);
  const jubok=mixed?6:0;
  const price=priceConfidence(d);
  // 고가 아파트는 회전율이 낮아 거래량 부족을 품질 점수에 반영하지 않는다.
  // 거래 부족에 대한 사실·신뢰도 경고 자체는 유지한다.
  // 실거래 표본이 충분한 평형이 거래공백만으로 단지 경쟁력 평가에서
  // 과도하게 밀리지 않도록 하되, 오래된 시세는 더 보수적으로 취급한다.
  // 12개월 5건 미만, 평형 간 가격 역전/하한 보정, 최근 실거래와 큰 괴리 등
  // 가격 자체의 검증 위험이 있으면 감점 완화를 일절 적용하지 않는다.
  // 최근 3개월 거래가 없고 마지막 거래가 90일 이상 지났는데 표시가격이
  // 현재 가격구간 상한의 90% 이상이면, 상승장에 해당 가격대로 구매할 수
  // 있는지 불확실하다. 충분한 과거 표본이 있어도 감점을 풀지 않는다.
  const nearUnverifiedCeiling=price.n3===0
    && price.ageDays!=null && price.ageDays>90
    && Number(d.p)>=cap*10000*.90;
  const reliableVolume=price.known && price.n12>=5
    && !price.inversion && !price.latestRaised && !price.latestBeyondBand
    && !nearUnverifiedCeiling;
  const maxPricePenalty=(price.ageDays!=null && price.ageDays>270)?7:
    (price.ageDays!=null && price.ageDays>180)?5:3;
  const pricePenalty=cap===30?0:
    reliableVolume?Math.min(price.penalty,maxPricePenalty):price.penalty;
  // 실제 고시 또는 공람 공고로 소속 단지와 단계가 확인된 정비사업만 인정한다.
  // 공람은 정비구역 지정이나 사업시행인가가 아니며, 계획 신축 세대수를 현재 세대수로 대체하지 않는다.
  // 상품성 Q는 현재 주택의 연식으로 그대로 평가하고, 추진 단계는 별도의 소폭 보정으로 구분한다.
  const project=root.APT_REDEV_FACTS?.[d.n+'|'+d.area]||null;
  const verifiedProgress=project?.phase==='operator_designated'?2.5:
    project?.phase==='public_review'?1.25:0;
  // 초소형 보정(2026.11.12 전수조사): 14평 이하(전용 약 35㎡ 이하, 원룸·1.5룸)는 가족 실거주 평형이 아니어서
  // 상급지 입지·대단지 점수만으로 탭 1~5위를 차지하던 문제(파크리오·수서 신동아·성원대치2 14평 등)를 막는다.
  // 25년 이상 구축의 15~18평은 재건축 기대 소형으로 같은 문제가 생겨(가양·강변 16평 등) 추가로 낮춘다.
  // 24평(59㎡)과 신축 16~18평(헬리오시티·올림픽파크포레온 등)은 감점하지 않는다.
  const flatPy=Number(d.py)||0, flatAge=Number.isFinite(years)?2026-years:0;
  // 2026.11.14 전수 재점검: 8/4점으로는 의도가 안 지켜졌음 — 파크리오 14평이 10~15억 1위, 6~10억 상위 30위 중 9곳이
  // 25년 이상 구축 16~18평(거여1·강변·가양6·현대리버빌 16~18평 등). 14평 이하 18점, 25년 이상 구축 18평 이하 +9점으로 강화.
  const tiny=(flatPy>0&&flatPy<=14?18:0)+(flatPy>0&&flatPy<=18&&flatAge>=25?9:0);
  const score=clamp(Object.values(parts).reduce((sum,v)=>sum+v,0)-density-hill-jubok-pricePenalty-tiny+verifiedProgress);
  return {score,raw,baseRaw,parts,price,penalties:{density,hill,jubok,price:pricePenalty,tiny},
    bonuses:{verifiedProgress},verifiedProject:project?{zone:project.zone,phase:project.phase,date:project.date}:null,
    far:s.density?.far??null,farSrc:s.density?.src??'',
    model:'M3 (공식 정비 진행 단계·가격 근거 감점 백테스트 전)'};
 }
 function apply(d,integratedSite=null){
  const m=compute(d,root.CAPT,integratedSite);
  if(!m)return;
  d.m3=m;
  d.score=m.score;
  d.comp=m.score;
 }
 function detail(d){
  const m=d.m3;if(!m)return '';
  const f=x=>Number(x??0).toFixed(1);
  const w=root.CAPT===15?weights:baselineWeights;
  const parts=[['장기 급지','G'],['직주','J'],['교통','T'],['세대수','U'],['상품성','Q'],['평형 효용','S']].map(([label,key])=>[label,key,w[key]*100]);
  return 'M3 종합 '+f(m.score)+'점 = '+parts.map(([label,key,w])=>label+' '+f(m.raw[key])+' × '+w+'%').join(' + ')+(m.penalties.density?' − 고밀도 '+f(m.penalties.density):'')+(m.penalties.hill?' − 언덕 '+f(m.penalties.hill):'')+(m.penalties.jubok?' − 주상복합 '+f(m.penalties.jubok):'')+(m.penalties.price?' − 가격 신뢰도 '+f(m.penalties.price):'')+(m.penalties.tiny?' − 초소형 평형 '+f(m.penalties.tiny):'')+(m.bonuses?.verifiedProgress?' + 공고 검증 정비진행 '+f(m.bonuses.verifiedProgress):'')+' · 검증 전 잠정 산식';
 }
 function why(d){
  const m=d.m3;if(!m)return '';
  return 'M3 급지 '+m.raw.G.toFixed(0)+' · 직주 '+m.raw.J.toFixed(0)+' · 교통 '+m.raw.T.toFixed(0)+' · '+(d.unitsOwn??d.units).toLocaleString()+'세대 · 상품성 '+m.raw.Q.toFixed(0)+' · 평형 '+m.raw.S.toFixed(0)+(m.penalties.price?' · 시세 신뢰도 감점 −'+m.penalties.price.toFixed(0)+'점':'')+(m.penalties.density?' · 용적률 감점 −'+m.penalties.density.toFixed(0)+'점':'')+(m.penalties.jubok?' · 주상복합 감점 −'+m.penalties.jubok+'점':'')+(m.verifiedProject?' · 정비사업 확인':'')+' (가중치 검증 전)';
 }
 const oldPanel=root.APT_TRANSPORT?.panel;
 if(oldPanel){
  root.APT_TRANSPORT.panel=function(d){
   const m=d.m3;
   if(!m)return oldPanel(d);
   const t=d.s4?.transport,b=t?.best;
   const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   return '<section class="sec"><h3>M3 교통 접근성 <small>종합의 15%</small></h3><p>'
       +(b?safe(b.station+' '+b.line+' '+b.grade+'등급 / '+b.walking+' '+(b.minutes??0).toFixed(1)+'분'):'확인된 역 자료 없음')
       +'</p><p>교통 '+m.raw.T.toFixed(1)+'점 × 15% = <b>'+m.parts.T.toFixed(2)+'점</b></p>'
       +'<p class="note">운행 중인 역 우선, 도보 0~25분 연속 평가. 미개통 노선은 할인 반영. M3 가중치는 과거 시점 검증 전 잠정값입니다.</p></section>';
  };
 }
 root.APT_M3=Object.freeze({active,compute,apply,detail,why,transportScore,priceConfidence,weights});
})(window);

