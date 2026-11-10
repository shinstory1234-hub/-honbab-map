/* Apartment Map M3 — provisional scoring, 6 < price < 25e8 only.
 * Data calibration and historical out-of-sample tests are still pending.
 * Cap 6 and cap 30 MUST continue to use the original s4 scoring untouched.
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
  return [10,15,20,25].includes(cap)&&Number(d?.p)>60000&&Number(d?.p)<250000;
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
  const score=clamp(Object.values(parts).reduce((sum,v)=>sum+v,0)-density-hill);
  return {score,raw,parts,penalties:{density,hill},model:'M3 (가중치 백테스트 전)'};
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
  return 'M3 종합 '+f(m.score)+'점 = '+parts.map(([label,key,w])=>label+' '+f(m.raw[key])+' × '+w+'%').join(' + ')+(m.penalties.density?' − 고밀도 '+f(m.penalties.density):'')+(m.penalties.hill?' − 언덕 '+f(m.penalties.hill):'')+' · 검증 전 잠정 산식';
 }
 function why(d){
  const m=d.m3;if(!m)return '';
  return 'M3 급지 '+m.raw.G.toFixed(0)+' · 직주 '+m.raw.J.toFixed(0)+' · 교통 '+m.raw.T.toFixed(0)+' · '+(d.unitsOwn??d.units).toLocaleString()+'세대 · 상품성 '+m.raw.Q.toFixed(0)+' · 평형 '+m.raw.S.toFixed(0)+' (가중치 검증 전)';
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
 root.APT_M3=Object.freeze({active,compute,apply,detail,why,transportScore,weights});
})(window);

