/* Apartment Map M3 — provisional scoring for 6억 초과~30억 이하.
 * Cap 6 retains the legacy model. Cap 30 uses M3 without transaction-volume penalty.
 * Weights need historical backtesting. Results are experimental.
 */
(function(root){
 'use strict';
 const weights=Object.freeze({G:.35,J:.10,T:.15,U:.20,Q:.15,S:.05});
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
  const penalty=clamp(volume+(newborn?Math.min(3,stale):stale)+(inversion?3:0)+(latestRaised?2:0)+(latestBeyondBand?12:0),0,20);
  const warn=inversion||latestRaised||latestBeyondBand||penalty>=4||(n12<5&&!newborn)||(n3===0&&ageDays!=null&&ageDays>90)||(ageDays!=null&&ageDays>180);
  const level=penalty>=8?'high':warn?'medium':'ok';
  return {known:true,n12,n3,last:date,ageDays,newborn,volume,stale,penalty,warn,level,
    inversion,rawPrice:inversion?t.pBeforeGuard:null,referencePy:t.priceGuardFrom||null,
    latestRaised,lastSale:latestRaised?t.lastSale:null,rawWeightedPrice:latestRaised?t.pBeforeLatest:null,
    latestBeyondBand,latestBeyondSale:latestBeyondBand?t.lastSale:null};
 }
 function compute(d,cap=root.CAPT){
  if(!active(d,cap))return null;
  const s=d.s4||{};
  const years=Number(d.year);
  const raw={
   G:Number.isFinite(s.pG)?s.pG:50,
   J:Number.isFinite(s.pJ)?s.pJ:50,
   T:transportScore(s.transport?.candidates),
   U:interp(Number(d.unitsOwn??d.units)||0,unitCurve),
   Q:Number.isFinite(years)&&years>=1950?interp(Math.max(0,2026-years),ageCurve):50,
   S:interp(Number(d.py)||0,sizeCurve),
  };
  const parts=Object.fromEntries(Object.entries(weights).map(([k,w])=>[k,raw[k]*w]));
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
  const reliableVolume=price.known && price.n12>=5
    && !price.inversion && !price.latestRaised && !price.latestBeyondBand;
  const maxPricePenalty=(price.ageDays!=null && price.ageDays>270)?7:
    (price.ageDays!=null && price.ageDays>180)?5:3;
  const pricePenalty=cap===30?0:
    reliableVolume?Math.min(price.penalty,maxPricePenalty):price.penalty;
  const score=clamp(Object.values(parts).reduce((sum,v)=>sum+v,0)-density-hill-jubok-pricePenalty);
  return {score,raw,parts,price,penalties:{density,hill,jubok,price:pricePenalty},
    far:s.density?.far??null,farSrc:s.density?.src??'',
    model:'M3 (가중치·가격 근거 감점 백테스트 전)'};
 }
 function apply(d){
  const m=compute(d);
  if(!m)return;
  d.m3=m;
  d.score=m.score;
  d.comp=m.score;
 }
 function detail(d){
  const m=d.m3;if(!m)return '';
  const f=x=>Number(x??0).toFixed(1);
  const parts=[['장기 급지','G',35],['직주','J',10],['교통','T',15],['세대수','U',20],['상품성','Q',15],['평형 효용','S',5]];
  return 'M3 종합 '+f(m.score)+'점 = '+parts.map(([label,key,w])=>label+' '+f(m.raw[key])+' × '+w+'%').join(' + ')+(m.penalties.density?' − 고밀도 '+f(m.penalties.density):'')+(m.penalties.hill?' − 언덕 '+f(m.penalties.hill):'')+(m.penalties.jubok?' − 주상복합 '+f(m.penalties.jubok):'')+(m.penalties.price?' − 가격 신뢰도 '+f(m.penalties.price):'')+' · 검증 전 잠정 산식';
 }
 function why(d){
  const m=d.m3;if(!m)return '';
  return 'M3 급지 '+m.raw.G.toFixed(0)+' · 직주 '+m.raw.J.toFixed(0)+' · 교통 '+m.raw.T.toFixed(0)+' · '+(d.unitsOwn??d.units).toLocaleString()+'세대 · 상품성 '+m.raw.Q.toFixed(0)+' · 평형 '+m.raw.S.toFixed(0)+(m.penalties.price?' · 시세 신뢰도 감점 −'+m.penalties.price.toFixed(0)+'점':'')+(m.penalties.density?' · 용적률 감점 −'+m.penalties.density.toFixed(0)+'점':'')+(m.penalties.jubok?' · 주상복합 감점 −'+m.penalties.jubok+'점':'')+' (가중치 검증 전)';
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

