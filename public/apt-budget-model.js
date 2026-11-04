/* 가격대별 주거 선택 모델. 6억 이하와 20억 초과는 호출하지 않는다.
   연구는 평가축의 근거이며 배점과 꺾은선은 공개된 정책 판단이다. docs/budget-model.md */
(function(){
  'use strict';
  const VERSION='budget-2026-11-05';
  const profiles={
    10:{name:'입지와 접근성',weights:{location:45,rail:20,age:10,space:10,education:5,terrain:5,scale:5},space:[[12,0],[16,25],[20,60],[24,85],[30,95],[34,100]]},
    15:{name:'입지와 생활환경의 균형',weights:{location:40,rail:20,age:10,space:10,education:10,terrain:5,scale:5},space:[[12,0],[16,15],[20,45],[24,75],[30,93],[34,100]]},
    20:{name:'입지와 공간의 균형',weights:{location:40,rail:15,age:10,space:15,education:10,terrain:5,scale:5},space:[[12,0],[16,5],[20,30],[24,65],[30,90],[34,100]]}
  };
  const labels={location:'장기 급지',rail:'현재 철도 접근성',age:'연식',space:'공간 규모',education:'교과학원 접근',terrain:'지형',scale:'단지 규모'};
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const clamp=x=>Math.max(0,Math.min(100,x));
  function curve(points,x){if(!finite(x))return null;if(x<=points[0][0])return points[0][1];for(let i=1;i<points.length;i++){const [a,v]=points[i-1],[b,w]=points[i];if(x<=b)return v+(w-v)*(x-a)/(b-a);}return points.at(-1)[1];}
  const active=()=>!!profiles[window.CAPT];
  function rail(d,transport){
    const observed=Array.isArray(d.g?.sts);
    if(!observed)return {score:null,best:null,observed:false};
    const candidates=(transport?.candidates||[]).filter(c=>!c.future&&finite(c.minutes)&&c.grade!=='미확인').map(c=>{
      const access=curve([[0,100],[5,100],[10,90],[15,60],[20,30],[30,0]],c.minutes)/100;
      // 보행 접근을 우선. 기존 노선계수의 영향은 노선 만점 중 35%로 제한한다.
      return {...c,access,score:access*(65+35*c.lineFactor)};
    }).sort((a,b)=>b.score-a.score||a.minutes-b.minutes);
    // 원자료에 역이 있지만 전부 해석 실패한 경우는 비역세권으로 단정하지 않는다.
    if(d.g.sts.length&&!candidates.length)return {score:null,best:null,observed:false};
    return {score:candidates[0]?.score??0,best:candidates[0]||null,observed:true};
  }
  function evaluate(d,cap,inputs){
    const profile=profiles[cap];if(!profile)return null;
    const r=rail(d,inputs.transport), h=inputs.hak, R=inputs.terrain;
    const age=finite(d.year)&&d.year>1800&&d.year<=2026?2026-d.year:null;
    const scores={
      location:finite(d.gj)&&finite(inputs.pG)?clamp(inputs.pG):null,
      rail:r.score,
      age:curve([[0,100],[5,100],[10,90],[15,80],[20,70],[30,50],[40,30],[50,20]],age),
      space:finite(d.py)&&d.py>0?curve(profile.space,d.py):null,
      education:Array.isArray(h)&&finite(h[1])&&h[1]>=0?clamp(100*Math.log(Math.max(h[1],15)/15)/Math.log(350/15)):null,
      terrain:finite(R)?curve([[0,100],[10,100],[30,70],[50,40],[80,0]],Math.max(0,R)):null,
      scale:finite(d.units)&&d.units>0?curve([[0,0],[300,30],[500,55],[1000,85],[1500,95],[2000,100]],d.units):null
    };
    let score=0,coverage=0,lower=0;const parts={};
    for(const [key,weight] of Object.entries(profile.weights)){
      const known=scores[key]!==null,value=known?scores[key]:50,points=value*weight/100;
      parts[key]={label:labels[key],value:scores[key],weight,points};score+=points;
      if(known){coverage+=weight;lower+=points;}
    }
    const issues=[];
    if(!r.observed)issues.push('현재 역 자료 미확인');
    else if(!r.best||r.best.minutes>=20)issues.push('현재 철도 도보 접근 불편: 버스 경로 별도 확인');
    if(finite(R)&&R>=40)issues.push('주변 대비 높이차 큼: 실제 보행 경사 확인');
    if(age!==null&&age>=30)issues.push('준공 30년 이상: 주차와 수선 상태 확인');
    if((d.dead||0)>=.25)issues.push('재건축 사업성 추정 낮음: 분담금과 사업계획 확인');
    const ev=(d.types||[]).find(t=>t.py===d.py);
    if(ev&&finite(ev.n)&&ev.n<3)issues.push('해당 평형 거래 근거 적음: 시세 확인');
    const missing=Object.keys(parts).filter(k=>parts[k].value===null);
    const status=missing.length?'자료 확인 필요':issues.length?'조건 확인 필요':'기본 항목 확인';
    return {version:VERSION,profile:profile.name,cap,score,parts,coverage,lower,upper:lower+100-coverage,missing,issues,status,rail:r,age,terrain:R,
      excluded:['주차','관리 상태','배정학교와 통학 경로','버스 및 실제 통근시간','생활시설 접근']};
  }
  function apply(d){
    if(!active())return;
    const b=evaluate(d,window.CAPT,{pG:d.s4.pG,transport:d.s4.transport,hak:(window.HAK||{})[d.cxKey],terrain:typeof hSlopeR==='function'?hSlopeR(d):null});
    d.s4.budget=b;d.score=b.score;d.comp=b.score;
    // 이전 모델의 보정값이 화면에서 신규 점수의 근거로 오인되지 않도록 갱신한다.
    d.s4.modelComp=b.score;d.s4.pQ=b.parts.age.value;d.s4.qrb=false;
    d.s4.za={sm:0,pp:0,ppr:null,old:false};d.s4.ta={h:0,w:0,mb:0};
  }
  function detail(d){const b=d.s4?.budget;if(!b)return '';
    return `종합 ${b.score.toFixed(1)}점 = `+Object.values(b.parts).map(p=>`${p.label} ${p.value===null?'미확인(중립 50)':p.value.toFixed(1)} × ${p.weight}%`).join(' + ');
  }
  function why(d){const b=d.s4?.budget;if(!b)return '';
    return `${b.profile} 기준 · 장기 급지 ${(b.parts.location.value??50).toFixed(0)}점 · 현재 철도 ${b.rail.score===null?'미확인':b.rail.score.toFixed(0)+'점'} · ${d.py}평 공간 ${b.parts.space.value?.toFixed(0)??'미확인'}점 · ${b.status}`;
  }
  function panel(d){const b=d.s4?.budget;if(!b)return '';const p=b.rail.best;
    return `<section class="sec"><h3>가격대별 평가 <small>${esc(b.profile)} · ${b.score.toFixed(1)}점</small></h3><div class="score tnum">${Object.values(b.parts).map(x=>`<div><span class="l">${esc(x.label)}<small>비중 ${x.weight}%${x.value===null?' · 자료 미확인':''}</small></span><span class="v">${x.value===null?'미확인':x.value.toFixed(1)}<i> / 100</i></span></div>`).join('')}</div><p>${esc(why(d))}</p><p>현재 철도: ${p?esc(p.station+' '+p.line+' / '+p.walking+' '+p.minutes.toFixed(1)+'분'):b.rail.observed?'수집 범위 안 이용 가능한 현재 역 없음':'자료 미확인'}. 예정 노선은 현재 점수에 넣지 않습니다.</p><p class="note">공간은 사이트의 평형 구간으로 비교하며 실측 전용면적이나 방 수가 아닙니다. 교과학원 접근은 교육시설 분포이며 배정학교나 학교 성적이 아닙니다. 연식은 건물 상태 전체를 뜻하지 않습니다.</p>${b.missing.length?`<p><b>자료 확인 필요</b>: ${b.missing.map(k=>labels[k]).join(', ')}. 확인 항목 비중 ${b.coverage}%. 미확인 항목을 0~100점으로 놓으면 종합 ${b.lower.toFixed(1)}~${b.upper.toFixed(1)}점이며, 순위 계산에는 중립 50점을 사용합니다.</p>`:''}<p><b>${esc(b.status)}</b>${b.issues.length?'<br>'+b.issues.map(esc).join('<br>'):': 점수에 사용한 기본 항목에 추가 확인 조건이 없습니다.'}</p><p class="note">전 단지 미평가 항목: ${b.excluded.join(', ')}. 확인된 하자가 없다는 판정이나 매수 추천 보증이 아닙니다. 가중치는 공개된 판단 기준이며 수익률로 검증한 최적값이 아닙니다. <a href="/budget-method.html" target="_blank" rel="noopener">산식과 근거 보기</a></p></section>`;
  }
  window.APT_BUDGET={VERSION,profiles,labels,active,curve,rail,evaluate,apply,detail,why,panel};
})();
