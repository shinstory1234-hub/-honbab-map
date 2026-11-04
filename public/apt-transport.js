/* 6억 초과 전용. 사용자 확정 비중 5%, 기존 6억 이하 lineG/score는 변경하지 않는다. */
(function(){
 const clamp=x=>Math.max(0,Math.min(1,x));
 function lines(value){
  const text=String(value||'').replace(/경의[·ㆍ\s]+중앙/g,'경의중앙').replace(/수인[·ㆍ\s]+분당/g,'수인분당').replace(/GTX\s*[-–]?\s*([ABC])/gi,(_,letter)=>'GTX-'+letter.toUpperCase());
  return text.split(/[·ㆍ,/+\s]+/).filter(Boolean).map(raw=>{
   const n=raw.replace(/\(.*?\)|급행|일반열차|일반/g,'');
   let v=.1,t='D';
   if(/^(신분당선|9호선|2호선|GTX(?:-[ABC])?)$/.test(n)){v=1;t='S';}
   else if(/^[578]호선$/.test(n)){v=.8;t='A';}
   else if(/^(?:[1346]호선|수인분당선|분당선)$/.test(n)){v=.7;t='B';}
   else if(/^(공항철도|경춘선|경의중앙선)$/.test(n)){v=.3;t='C';}
   return {name:n,v,t};
  }).filter(l=>l.name);
 }
 const access=min=>Number.isFinite(min)&&min>=0?clamp((20-min)/10):0;
 function candidate(station,line,m,route,future=false,year=null){
  const best=lines(line).sort((a,b)=>b.v-a.v)[0]||{name:'노선 미확인',v:0,t:'미확인'};
  const measured=route&&Number.isFinite(route.minutes)&&route.minutes>=0&&route.source&&route.checkedAt;
  const minutes=measured?route.minutes:Number.isFinite(m)&&m>=0?m*1.25/80:null;
  const discount=future?(Number.isFinite(year)?Math.max(.8,1-.05*Math.max(0,year-2026)):0):1;
  return {station,line:best.name,grade:best.t,lineFactor:best.v,minutes,walking:measured?'실측 경로':'추정 도보',source:measured?route.source:null,future,year,discount,access:access(minutes),score:100*best.v*access(minutes)*discount};
 }
 // 확정 사업만 허용. FUT의 사업별 좌표·목표연도 재사용. 연도 경과만으로 운행 상태를 바꾸지 않는다.
 // 근거: KTDB 2025 국가교통통계 p102, 국토부 2026 업무계획, GTX-C 2026-08-25 민투심.
 const confirmed=new Set(['월판선','인동선','신안산선','동북선','GTX-B','GTX-C','신분당선','9호선','7호선']);
 // >6억 전용 최신 사업기간. 기존 FUT는 <=6억 점수 보존을 위해 수정하지 않음.
 // 국가철도공단 2026.9 사업현황: https://www.kr.or.kr/sub/info.do?m=05010402
 const targetYears={'GTX-B':2031,'GTX-C':2031};
 // 2024년에 개통한 두 구간. 삼성·창릉은 운행 중으로 간주하지 않는다.
 // GTX-A 운영사/국가철도공단의 개통 자료. 기존 역 거리 자료가 있는 환승역만 보완.
 const openGtxA=new Set(['운정중앙역','킨텍스역','대곡역','연신내역','서울역','수서역','성남역','구성역','동탄역']);
 function evaluate(d){
  const routes=(window.APT_STATION_WALKS||{})[d.cxKey]||{}, candidates=[];
  for(const [name,m] of d.g?.sts||[]){
   const match=name.match(/^(.*?)역\s+(.+)$/);if(!match)continue;
   const station=match[1]+'역';
   const ls=lines(match[2]).filter(l=>!/^GTX(?:-[BC])?$/.test(l.name)&&(l.name!=='GTX-A'||openGtxA.has(station)));
   if(openGtxA.has(station)&&!ls.some(l=>l.name==='GTX-A'))ls.push({name:'GTX-A',v:1,t:'S'});
   if(ls.length)candidates.push(candidate(match[1]+'역',ls.map(l=>l.name).join('·'),m,routes[name]));
  }
  const lat=d.g?.lat||d.lat,lng=d.g?.lng||d.lng;
  if(lat&&lng&&typeof FUT!=='undefined')for(const f of FUT){
   if(!f[3])continue;
   const ls=lines(f[1]).filter(l=>confirmed.has(l.name)||(l.name==='1호선'&&f[0]==='회천중앙'));if(!ls.length)continue;
   const name=f[0].replace(/\s+(?:\d+호선|KTX)$/,'');
   const m=hav(lat,lng,f[3][0],f[3][1]);
   for(const l of ls){
    if(candidates.some(c=>!c.future&&c.station===name&&c.line===l.name))continue;
    // 회천중앙은 양주시 2026-07-07 착공 발표의 2030년 목표 사용.
    candidates.push(candidate(name,l.name,m,routes[name+' '+l.name],true,name==='회천중앙'?2030:targetYears[l.name]??f[2]));
   }
  }
  candidates.sort((a,b)=>b.score-a.score||Number(a.future)-Number(b.future));
  return {score:candidates[0]?.score||0,best:candidates[0]||null,candidates};
 }
 function panel(d){
  const t=d.s4?.transport;if(!t)return '';const b=t.best;
  return '<section class="sec"><h3>교통 접근성 <small>종합점수 5%</small></h3><p>'+ (b?esc(b.station+' '+b.line+' '+b.grade+'등급 / '+b.walking+' '+(b.minutes??0).toFixed(1)+'분'+(b.future?' / 개통 예정 '+b.year+'년 목표(저장 자료), 할인계수 '+b.discount:' / 운행 중')):'확인된 역 자료 없음')+'</p><p>교통 '+t.score.toFixed(2)+'점 × 5% = <b>'+ (t.score*.05).toFixed(2)+'점</b></p>'+(b?'<p>100 × 노선 '+b.lineFactor+' × 접근성 '+b.access.toFixed(3)+' × 개통 할인 '+b.discount+'</p>':'')+'<p class="note">추정 도보는 직선거리 × 1.25 ÷ 분속 80m. 역별 최고점 하나만 반영하며 환승 가점과 기존 역 거리 감점은 없습니다. 예정 시점은 확정 개통일이 아니며 지연될 수 있습니다.</p></section>';
 }
 window.APT_TRANSPORT={lines,access,candidate,evaluate,panel};
})();
