/* 아파트맵 리치고 참고 7개 기능 — 상세를 열었을 때만 로드, 기존 순위 계산 불변.
 * 실거래: /api/apt-dx; 통학구역: /api/apt-school; 주변 시설: 카카오 지도 SDK.
 * 외부 데이터가 없으면 자료 없음으로 표시하며 배치도·주차·관리비를 추정하지 않는다.
 */
(function(){
'use strict';
if(window.APT_RICHGO) return;
var css=document.createElement('style');
css.textContent=[
'.ru-root{margin:16px 20px 25px;border-top:1px solid var(--border);padding-top:18px}',
'.ru-root h3{margin:0 0 12px;font-size:17px;letter-spacing:-.03em}',
'.ru-summary{margin:10px 20px 12px;padding:15px 16px;border:1px solid var(--border);border-radius:7px;background:var(--bg-subtle)}',
'.ru-summary h3{margin:0 0 10px;font-size:16px;font-weight:800}',
'.ru-sums{display:grid;grid-template-columns:1fr 1fr;gap:16px}',
'.ru-sums h4{margin:0 0 5px;font-size:13px;color:var(--text-secondary)}',
'.ru-sums ul{padding-left:18px;margin:0}.ru-sums li{font-size:12.5px;line-height:1.65;margin:3px 0;word-break:keep-all}',
'.ru-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:thin;padding:1px 0 11px}',
'.invest-essay p{font-size:13px;line-height:1.65}.invest .dxmore{display:block;width:100%;min-height:44px;margin:14px 0 0;padding:11px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);color:var(--primary-soft-fg);font-size:13px;font-weight:750;line-height:1.5;text-align:center;cursor:pointer}.invest .dxmore:hover{background:var(--primary-soft-bg)}',
'.ru-tabs button{flex:none;padding:8px 12px;border:1px solid var(--border);border-radius:5px;font-size:12.5px;font-weight:700;background:var(--bg)}',
'.ru-tabs button[aria-pressed=true]{background:var(--primary-soft-bg);border-color:var(--primary);color:var(--primary-soft-fg)}',
'@media(max-width:560px){.ru-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.ru-tabs button{width:100%;white-space:normal;min-height:43px}}',
'.ru-content{padding:3px 0 0;font-size:13px;line-height:1.6}.ru-content p{margin:7px 0;color:var(--text-secondary);word-break:keep-all}',
'.ru-list{list-style:none;padding:0;margin:9px 0}.ru-list li{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-soft)}',
'.ru-list li strong{font-weight:750}.ru-list li small{display:block;color:var(--text-tertiary);font-size:11.5px;line-height:1.55}',
'.ru-list li em{font-style:normal;font-weight:750;white-space:nowrap;font-variant-numeric:tabular-nums}',
'.ru-muted{color:var(--text-tertiary);font-size:12px}.ru-warning{background:var(--bg-subtle);border:1px solid var(--border-soft);border-radius:5px;padding:11px;margin-top:10px}',
'.ru-action{background:var(--primary);color:#fff;border:0;border-radius:5px;min-height:40px;padding:9px 14px;font-weight:750;font-size:13px}',
'.ru-action:disabled{opacity:.55}.ru-input{background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:10px;width:100%;font-size:15px;min-width:0}',
'.ru-map{height:285px;border:1px solid var(--border);border-radius:6px;background:var(--bg-subtle);overflow:hidden;margin:12px 0}',
'.ru-flex{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:9px 0}',
'.ru-flex button{border:1px solid var(--border);border-radius:5px;padding:7px 10px;font-size:12.5px}',
'.ru-flex button[aria-pressed=true]{border-color:var(--primary);color:var(--primary-soft-fg)}',
'.ru-table{width:100%;border-collapse:collapse;font-size:12px}.ru-table th,.ru-table td{padding:10px 6px;text-align:left;border-bottom:1px solid var(--border-soft);vertical-align:top}',
'.ru-table th{color:var(--text-tertiary);font-weight:650}.ru-table th:last-child,.ru-table td:last-child{text-align:right}',
'.ru-note{font-size:11.5px;color:var(--text-tertiary);margin-top:11px;line-height:1.55}',
'.ru-chart{width:100%;height:120px;display:block;margin:10px 0}.ru-empty{padding:15px 0;color:var(--text-tertiary)}',
'@media(max-width:560px){.ru-sums{grid-template-columns:1fr;gap:13px}.ru-summary{margin:10px 14px}.ru-root{margin:15px 14px 25px}.ru-tabs button{padding:8px 10px}.ru-map{height:265px}}'
].join('');
document.head.appendChild(css);
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function n(x){if(x==null||String(x).trim()==='')return null;var v=Number(x);return Number.isFinite(v)?v:null;}
function name(d){return typeof publicComplexName==='function'?publicComplexName(d):d.n;}
function key(d){return d.n+'|'+d.area;}
function money(x){return n(x)!=null?eok(Number(x)):'확인 불가';}
function fmt(v){return Number(v).toLocaleString('ko-KR');}
function dateVal(x){var s=String(x||''); if(!/^\d{8}$/.test(s))return null;var t=Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8));return Number.isFinite(t)?t:null;}
function median(arr){if(!arr.length)return null;arr=arr.slice().sort(function(a,b){return a-b;});var m=Math.floor(arr.length/2);return arr.length%2?arr[m]:(arr[m-1]+arr[m])/2;}
function yearStart(months){var t=new Date();return Date.UTC(t.getUTCFullYear(),t.getUTCMonth()-months,t.getUTCDate());}
function coord(d){if(d._pos&&d._pos.getLat)return [d._pos.getLat(),d._pos.getLng()];var g=d.g||{};if(n(g.lat)!=null&&n(g.lng)!=null)return [+g.lat,+g.lng];return null;}
function distance(lat,lng,a,b){var r=Math.PI/180;return 6371000*2*Math.asin(Math.sqrt(Math.sin((lat-a)*r/2)**2+Math.cos(lat*r)*Math.cos(a*r)*Math.sin((lng-b)*r/2)**2));}
function chip(title,val,detail){return '<li><div><strong>'+esc(title)+'</strong><small>'+esc(detail||'')+'</small></div><em>'+esc(val)+'</em></li>';}
function getRoot(b){return b&&b.querySelector('.ru-root');}
function alive(b,d){return b&&b.isConnected&&document.getElementById('body')===b&&b.querySelector('.identity h2')&&String(b.querySelector('.identity h2').textContent||'').includes(name(d));}
function prosCons(d){
  var plus=[],minus=[],units=typeof unitN==='function'?unitN(d):d.units,ev=typeof priceEv==='function'?priceEv(d):null,g=d.g||{},cur=d.cur||null;
  if(units>=1000)plus.push(fmt(units)+'세대 대단지');
  if(d.year>=2018)plus.push(d.year+'년 입주 · 비교적 신축');
  if(cur&&Number.isFinite(cur.m)&&cur.m<=800)plus.push(esc(cur.n)+' 직선거리 '+Math.round(cur.m)+'m');
  if(g.sc!=null&&g.sc<=400)plus.push('인근 초등학교 직선거리 '+Math.round(g.sc)+'m (배정 별도)');
  if(d.rank&&d.rank<=30)plus.push('현재 가격대 추천 '+d.rank+'위');
  if(cur&&Number.isFinite(cur.m)&&cur.m>=1300)minus.push('가까운 역까지 직선거리 '+Math.round(cur.m)+'m');
  if(ev&&ev.n3===0)minus.push('해당 평형 최근 3개월 실거래 근거 없음');
  else if(ev&&ev.n3>0&&ev.n3<3)minus.push('해당 평형 최근 3개월 거래 '+ev.n3+'건 · 가격 근거 적음');
  if(Number.isFinite(d.conf)&&d.conf<.6)minus.push('가격 비교 근거 신뢰도가 낮음');
  if(d.year&&2026-d.year>=30)minus.push('준공 '+(2026-d.year)+'년차 · 유지보수 및 정비사업 조건 확인');
  if(d.locParts&&d.locParts.fut)minus.push('예정 철도는 일정과 실제 출입구 위치 확인 필요');
  if(!minus.length)minus.push('주차·관리비·향 등 개별 실거주 조건 확인 필요');
  if(!plus.length)plus.push('객관적인 장점 자료를 추가 확인해야 합니다');
  return '<section class="ru-summary" aria-label="단지 핵심 장단점"><h3>장점과 확인할 점</h3><div class="ru-sums"><div><h4>좋은 점 '+Math.min(3,plus.length)+'개</h4><ul>'+plus.slice(0,3).map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div><div><h4>확인할 점 '+Math.min(3,minus.length)+'개</h4><ul>'+minus.slice(0,3).map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div></div></section>';
}
function peersOf(d){
  var a=D.filter(function(x){return x!==d&&x.cxKey!==d.cxKey&&x.area.split(' ').slice(0,2).join(' ')===d.area.split(' ').slice(0,2).join(' ')&&Math.abs(x.py-d.py)<=5&&x.p>0;});
  a.sort(function(x,y){
    function score(o){var same=o.area===d.area?0:1;
      return same*3+Math.abs(o.py-d.py)*1.6+Math.abs(o.year-d.year)/12+Math.abs(Math.log(o.p/d.p))*5;}
    return score(x)-score(y);
  });
  var used=new Set();return a.filter(function(x){var k=x.cxKey;if(used.has(k))return false;used.add(k);return true;}).slice(0,3);
}
var tradeCache=new Map(),rentCache=new Map();
function loadRent(k){
  if(rentCache.has(k))return rentCache.get(k);
  var p=fetch('/api/apt-rent?k='+encodeURIComponent(k)).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();})
    .catch(function(e){rentCache.delete(k);throw e;});
  rentCache.set(k,p);return p;
}
function loadTrade(d){
  var k=typeof window.aptLkey==='function'?window.aptLkey(d):null;
  if(!k)return Promise.resolve({error:'실거래 조회 키 없음'});
  if(tradeCache.has(k))return tradeCache.get(k);
  var req=fetch('/api/apt-dx?k='+encodeURIComponent(k),{credentials:'same-origin'}).then(function(r){
    if(!r.ok)throw Error('HTTP '+r.status);return r.json();
  }).then(function(v){return v&&Array.isArray(v.t)?v:{error:'거래 원본 없음'};})
    .catch(function(e){tradeCache.delete(k);return {error:'실거래 자료 조회 실패 ('+e.message+')'};});
  tradeCache.set(k,req);return req;
}
function ensureDx(){
  if(typeof window.aptLkey==='function')return Promise.resolve(true);
  return new Promise(function(ok){
    var settled=false;
    function done(){if(settled)return;settled=true;ok(typeof window.aptLkey==='function');}
    function fallback(){var s=document.createElement('script');s.src='/apt-dx.js?v=17';s.onload=done;s.onerror=done;document.head.appendChild(s);}
    if(typeof loadDx==='function'){try{loadDx(done);}catch(e){fallback();}}else fallback();
    setTimeout(done,10000);
  });
}
function priceTrades(raw,d){
  var a=raw&&Array.isArray(raw.t)?raw.t:[],target=d.py*3.3058*.76;
  return a.filter(function(t){return Array.isArray(t)&&!t[4]&&n(t[1])!=null&&n(t[3])>0&&Math.abs(+t[1]-target)<=5&&dateVal(t[0])!=null&&n(t[2])>=3;});
}
function segment(tx,from,to){return tx.filter(function(t){var s=dateVal(t[0]);return s>=from&&s<to;}).map(function(t){return +t[3];});}
function change(price1,price0){return price1!=null&&price0!=null&&price0>0?((price1/price0-1)*100):null;}
function labelPct(x){return x==null?'표본 부족':(x>0?'+':'')+x.toFixed(1)+'%';}
function rivalsView(d,box){
  var peers=peersOf(d);
  var chosen=[d].concat(peers);
  box.innerHTML='<h4>비슷한 아파트의 실거래 경쟁력</h4><p>같은 시·구, 비슷한 평형을 우선으로 경쟁 단지를 자동 선정했습니다. 3개월 이상 시차가 있는 실거래는 직접 비교하지 않습니다.</p>'
    +'<ul class="ru-list">'+chosen.map(function(x){return chip(name(x),money(x.p)+' · '+x.py+'평','추천 '+x.rank+'위 · '+x.area+(x===d?' · 현재 단지':''));}).join('')+'</ul>'
    +'<button type="button" class="ru-action" data-ru-race>실거래로 가격 변화 비교</button><div data-ru-race-result aria-live="polite"></div>'
    +'<p class="ru-note">단지 선택은 자동이며 추천 순위와 모델 점수를 변경하지 않습니다. 시세와 실제 계약가는 다를 수 있습니다.</p>';
  var btn=box.querySelector('[data-ru-race]'),out=box.querySelector('[data-ru-race-result]');
  btn.onclick=async function(){
    btn.disabled=true;out.textContent='실거래 자료를 확인하고 있습니다…';
    if(!(await ensureDx())){out.textContent='실거래 연결을 불러올 수 없습니다.';btn.disabled=false;return;}
    var loaded=await Promise.all(chosen.map(loadTrade));
    if(!box.isConnected)return;
    var now=Date.now(),c12=yearStart(12),c24=yearStart(24);
    var rows=chosen.map(function(x,i){var t=priceTrades(loaded[i],x),curr=segment(t,c12,now),prev=segment(t,c24,c12);
      var a=curr.length>=3?median(curr):null,b=prev.length>=3?median(prev):null;
      return {d:x,n:curr.length,m:a,change:change(a,b),err:loaded[i].error};
    });
    out.innerHTML='<table class="ru-table"><thead><tr><th>단지·평형</th><th>최근 12개월 중위</th><th>전년 구간 대비</th></tr></thead><tbody>'+rows.map(function(x){
      return '<tr><td><strong>'+esc(name(x.d))+'</strong><br><span class="ru-muted">'+x.d.py+'평 · '+x.n+'건'+(x.err?' · 조회 오류':'')+'</span></td><td>'+(x.m==null?'표본 부족':money(x.m))+'</td><td>'+labelPct(x.change)+'</td></tr>';
    }).join('')+'</tbody></table><p class="ru-note">직거래·1~2층 제외, 같은 평형 추정 전용면적 ±5㎡, 각 기간 최소 3건일 때만 중위가격 산출. 전년 구간은 12~24개월 전입니다. 면적·향·품질 차이를 별도 보정하지 않습니다.</p>';
    btn.disabled=false;
  };
}
function volumeView(d,box){
  var ev=typeof priceEv==='function'?priceEv(d):null;
  box.innerHTML='<h4>실거래 유동성</h4><ul class="ru-list">'
    +chip('선택 평형 최근 3개월',ev&&n(ev.n3)!=null?fmt(ev.n3)+'건':'자료 없음','현재 순위 데이터에 기록된 거래건수')
    +chip('선택 평형 최근 12개월',ev&&n(ev.n)!=null?fmt(ev.n)+'건':'자료 없음','가격 근거용 거래건수')
    +'</ul><button class="ru-action" data-ru-volume>전체 단지 거래회전율 확인</button><div data-ru-volume-result aria-live="polite"></div>'
    +'<p class="ru-note">거래가 표시되지 않는 것은 거래가 0건이었다는 의미가 아닙니다. 자료 누락 여부를 별도로 확인해야 합니다.</p>';
  box.querySelector('[data-ru-volume]').onclick=async function(){
    var btn=this,out=box.querySelector('[data-ru-volume-result]');btn.disabled=true;out.textContent='조회 중…';
    if(!(await ensureDx())){out.textContent='실거래 연결을 불러올 수 없습니다.';btn.disabled=false;return;}
    var raw=await loadTrade(d);if(!box.isConnected)return;
    if(raw.error||!Array.isArray(raw.t)||!raw.t.length){out.innerHTML='<div class="ru-warning">실거래 원본이 조회되지 않습니다. 거래 없음과 데이터 누락을 구분할 수 없습니다.</div>';btn.disabled=false;return;}
    var c3=yearStart(3),c6=yearStart(6),c12=yearStart(12),now=Date.now(),a=raw.t.filter(function(t){return Array.isArray(t)&&!t[4]&&dateVal(t[0])&&n(t[3])>0;});
    var count=function(from,to){return a.filter(function(t){var v=dateVal(t[0]);return v>=from&&v<to;}).length;};
    var recent=count(c3,now),prior=count(c6,c3),annual=count(c12,now);
    var households=typeof unitN==='function'?unitN(d):null,turnover=annual>0&&households>0?annual/households*100:null;
    out.innerHTML='<ul class="ru-list">'+chip('전체 평형 최근 3개월',fmt(recent)+'건','실거래 조회 결과 · 직거래 제외')+
      chip('직전 3개월',fmt(prior)+'건','직거래 제외')+
      chip('최근 12개월',fmt(annual)+'건','조회된 계약 기준')+
      chip('최근 12개월 거래회전율',turnover==null?'계산 불가':turnover.toFixed(2)+'%',households?'단지 '+fmt(households)+'세대 대비 · 참고':'세대수 자료 없음')+
      chip('3개월 거래량 변화',prior?labelPct((recent/prior-1)*100):'비교 불가','직전 구간 0건이면 변화율 미표시')+'</ul>'
      +'<p class="ru-note">거래회전율은 계약 건수 ÷ 세대수로 계산하며 실제 소유권 이전 비율과 다를 수 있습니다. 실거래 API의 단지 매칭·갱신 지연·취소 반영 여부를 확인해야 합니다.</p>';
    btn.disabled=false;
  };
}
function livingView(d,box){
  var units=typeof unitN==='function'?unitN(d):d.units||null,far=n(d.m3&&d.m3.far);
  box.innerHTML='<h4>실거주 기본정보</h4><ul class="ru-list">'
    +chip('세대수',units?fmt(units)+'세대':'자료 미확보','아파트맵의 단지 구분 기준')
    +chip('입주연도',d.year?d.year+'년':'자료 미확보','기존 단지 기본정보')
    +chip('용적률',far!=null?Math.round(far)+'%':'자료 미확보','기존 등록 자료 기준')
    +'</ul><div data-ru-kapt-result role="status">공식 K-apt 단지정보를 확인하고 있습니다…</div>';
  var out=box.querySelector('[data-ru-kapt-result]');
  (async function(){
    if(!(await ensureDx())){if(out.isConnected)out.innerHTML='<p class="ru-warning">단지 식별정보를 불러올 수 없습니다.</p>';return;}
    var k=window.aptLkey(d);
    if(!k){if(out.isConnected)out.innerHTML='<p class="ru-warning">해당 단지의 국토부 시군구코드 매칭이 없어 K-apt 자료를 임의로 연결하지 않습니다.</p>';return;}
    try{
      var r=await fetch('/api/apt-kapt?k='+encodeURIComponent(k)+'&units='+encodeURIComponent(units||'')),v=await r.json();
      if(!out.isConnected)return;
      if(!r.ok||v.status==='unavailable'){out.innerHTML='<p class="ru-warning">K-apt 조회가 불가능합니다. 인증키·서비스 권한 또는 원본 서버를 확인해 주세요.</p>';return;}
      if(v.status!=='ok'&&v.status!=='unit-conflict'){out.innerHTML='<p class="ru-warning">'+esc(v.message||'공식 단지 식별정보가 일치하지 않습니다.')+'</p>';return;}
      out.innerHTML='<ul class="ru-list">'
        +chip('K-apt 관리단지 세대수',v.households?fmt(v.households)+'세대':'미공개',v.kaptName||'')
        +chip('동수',n(v.buildingCount)!=null?fmt(v.buildingCount)+'개동':'미공개','K-apt 관리단지 단위')
        +chip('최고층',n(v.topFloor)!=null?fmt(v.topFloor)+'층':'미공개','단지 대표 최고층')
        +chip('난방방식',v.heating||'미공개','K-apt 기본정보')
        +chip('지상·지하 주차',n(v.parkingTotal)!=null?fmt(v.parkingTotal)+'대':'미공개',n(v.parkingGround)!=null&&n(v.parkingUnderground)!=null?'지상 '+fmt(v.parkingGround)+'대 · 지하 '+fmt(v.parkingUnderground)+'대':'주차 구성 미확인')
        +chip('세대당 주차',v.verified&&n(v.parkingPerHousehold)!=null?v.parkingPerHousehold.toFixed(2)+'대':'계산 보류','K-apt 관리단지 공식 세대수 대비')
        +chip('관리비','확인된 월별 금액 없음','공용관리비·개별사용료·장기수선충당금의 범위가 달라 별도 대사 필요')
        +'</ul><p class="ru-note">출처: '+esc(v.source||'K-apt')+' · 단지코드 '+esc(v.kaptCode||'')+'. '+esc(v.note||'')+'</p>';
    }catch(e){if(out.isConnected)out.innerHTML='<p class="ru-warning">K-apt 서버 또는 네트워크 요청에 실패했습니다.</p>';}
  })();
}
var schoolRadius=3000,nearbySchoolCache=new Map();
function nearbySchool(p,level){
  var cacheKey=p.join('|')+'|'+level;
  if(nearbySchoolCache.has(cacheKey))return nearbySchoolCache.get(cacheKey);
  var result=new Promise(function(resolve,reject){
    var services=kakao.maps.services;
    var location=new kakao.maps.LatLng(p[0],p[1]);
    new services.Places().keywordSearch(level,function(items,status,pagination){
      if(status===services.Status.ZERO_RESULT){resolve(null);return;}
      if(status!==services.Status.OK){reject(new Error('학교 지도 검색 실패'));return;}
      for(var item of items){
        var schoolName=String(item.place_name||'').trim();
        if(!schoolName.endsWith(level)||n(item.y)==null||n(item.x)==null)continue;
        var meters=distance(p[0],p[1],Number(item.y),Number(item.x));
        if(meters<=schoolRadius){resolve({name:schoolName,meters:Math.round(meters)});return;}
      }
      if(pagination&&pagination.hasNextPage)pagination.nextPage();
      else resolve(null);
    },{category_group_code:'SC4',location:location,radius:schoolRadius,sort:services.SortBy.DISTANCE});
  }).catch(function(error){nearbySchoolCache.delete(cacheKey);throw error;});
  nearbySchoolCache.set(cacheKey,result);
  return result;
}
function fillNearbySchool(row,p,level,schoolName,meters){
  if((schoolName&&meters!=null)||!p||!sdk())return;
  var value=row.querySelector('em'),detail=row.querySelector('small'),initialDetail=detail.textContent;
  if(!schoolName)value.textContent='조회 중';
  nearbySchool(p,level).then(function(school){
    if(!row.isConnected)return;
    if(school){
      value.textContent=school.name;
      detail.textContent='카카오 지도 · 직선 '+fmt(school.meters)+'m · 실제 배정과 별개';
    }else if(!schoolName){
      value.textContent='미확인';
      detail.textContent='반경 3km 지도 검색 결과 없음';
    }
  }).catch(function(){
    if(!row.isConnected||schoolName)return;
    value.textContent='미확인';
    detail.textContent=meters!=null?initialDetail:'지도 학교 검색에 실패했습니다.';
  });
}
function schoolView(d,box){
  var g=d.g||{},hak=typeof hakH==='function'?hakH(d):null,p=coord(d);
  var school=(window.APT_INV_SCHOOL||{})[key(d)];
  var hasPublicMiddle=school&&school[0]&&n(school[1])!=null;
  var elementary=n(g.sc),middle=hasPublicMiddle?n(school[1]):n(hak&&hak[4]);
  var middleName=hasPublicMiddle?school[0]:hak&&hak[3];
  var middleSource=hasPublicMiddle?'학교 위치 공공데이터 · ':'';
  if(elementary===99999)elementary=null;
  box.innerHTML='<h4>학군과 통학 정보</h4><ul class="ru-list">'
    +chip('인근 초등학교',g.scn||'미확인',elementary!=null?'단지 대표좌표 직선 '+fmt(Math.round(elementary))+'m · 실제 배정과 별개':'학교 거리 자료 없음')
    +chip('주변 수학·영어 학원',hak&&n(hak[0])!=null?fmt(hak[0])+'곳':'확인 불가','반경 1km 교과학원 집계')+chip('인근 중학교',middleName||'미확인',middle!=null?middleSource+'직선 '+fmt(middle)+'m · 실제 배정과 별개':'거리 자료 없음')
    +'</ul><button type="button" class="ru-action" data-ru-school>공식 초등 통학구역 확인</button><div data-ru-school-result aria-live="polite"></div>'
    +'<p class="ru-note">교육 성과·중학교 진학률은 검증된 공식 자료 없이 등급으로 추정하지 않습니다.</p>';
  var rows=box.querySelector('.ru-list').children;
  fillNearbySchool(rows[0],p,'초등학교',g.scn,elementary);
  fillNearbySchool(rows[2],p,'중학교',middleName,middle);
  box.querySelector('[data-ru-school]').onclick=async function(){
    var btn=this,out=box.querySelector('[data-ru-school-result]');btn.disabled=true;out.textContent='공식 학구도 대사 결과를 확인하고 있습니다…';
    try{var r=await fetch('/api/apt-school?k='+encodeURIComponent(key(d)));if(!r.ok)throw Error('HTTP '+r.status);var data=await r.json();
      if(!box.isConnected)return;
      if(data.matched&&Array.isArray(data.zones)&&data.zones.length){
        out.innerHTML='<ul class="ru-list">'+data.zones.map(function(z){return chip(z.s||z.z||'통학구역','일치',z.type||'공식 통학구역 대표좌표 대사');}).join('')+'</ul>'
          +'<p class="ru-note">기준 '+esc(data.asOf||'미상')+' · '+esc(data.source||'공식 학구도')+'. '+esc(data.caveat||'최종 배정은 교육지원청 확인 필요')+'</p>';
      }else out.innerHTML='<div class="ru-warning">공식 통학구역 자동 매칭 자료가 없습니다. 인근 학교가 실제 배정 학교라는 뜻은 아닙니다.</div>';
    }catch(e){if(box.isConnected)out.textContent='공식 통학구역 조회가 일시적으로 불가능합니다.';}finally{if(box.isConnected)btn.disabled=false;}
  };
}
function sdk(){return !!(window.kakao&&kakao.maps&&kakao.maps.Map&&kakao.maps.services&&kakao.maps.services.Places);}
function makeMap(d,box,mode){
  var p=coord(d);if(!p){box.innerHTML='<p class="ru-empty">이 단지의 정확한 지도 좌표가 없어 지도를 열 수 없습니다.</p>';return;}
  var title=mode==='dong'?'단지 동 위치 확인':'단지 주변 1km 생활권';
  box.innerHTML='<h4>'+title+'</h4><p>'+(mode==='dong'?'지도 항공사진으로 건물 위치를 확인합니다. 동 번호·층수·세대수와 개별 동 거래는 검증된 원본 자료가 없어 자동으로 표시하지 않습니다.':'단지 중심 직선거리 1km 안의 시설을 지도에서 검색합니다. 실제 보행 시간과 다릅니다.')+'</p>'
    +(mode==='dong'?'<div class="ru-flex"><label style="flex:1;min-width:160px"><span class="ru-muted">동 번호 검색 (지도 업체 검색 결과)</span><input class="ru-input" data-ru-dong-input placeholder="예: 101동" maxlength="12"></label><button class="ru-action" data-ru-dong-search>검색</button></div>':
    '<div class="ru-flex">'+[['SW8','지하철'],['SC4','학교'],['AC5','학원'],['HP8','병원'],['MT1','마트'],['FUT','예정 철도']].map(function(x,i){return '<button type="button" data-ru-poi="'+x[0]+'" aria-pressed="'+(i===0)+'">'+x[1]+'</button>';}).join('')+'</div>')
    +'<div class="ru-map" data-ru-map aria-label="'+title+'"></div><div data-ru-place-list aria-live="polite"></div>'
    +'<p class="ru-note">지도·시설 정보: 카카오 지도. 위성사진과 외부 검색 결과는 건축물대장이나 공식 동 배치도의 대체 자료가 아닙니다.</p>';
  var el=box.querySelector('[data-ru-map]'),list=box.querySelector('[data-ru-place-list]');
  if(!sdk()){list.textContent='카카오 지도 SDK를 불러오지 못했습니다. 지도 로딩 후 다시 시도해 주세요.';return;}
  var pos=new kakao.maps.LatLng(p[0],p[1]),map=new kakao.maps.Map(el,{center:pos,level:mode==='dong'?3:5,
    mapTypeId:mode==='dong'?kakao.maps.MapTypeId.HYBRID:kakao.maps.MapTypeId.ROADMAP});
  var markers=[],svc=new kakao.maps.services.Places(),circle=null;
  new kakao.maps.Marker({map:map,position:pos,title:name(d)});
  if(mode!=='dong'){circle=new kakao.maps.Circle({center:pos,radius:1000,strokeWeight:2,strokeColor:'#0066ff',strokeOpacity:.7,fillColor:'#0066ff',fillOpacity:.035});circle.setMap(map);}
  function clear(){markers.forEach(function(m){m.setMap(null);});markers=[];}
  function plot(items){clear();
    items.forEach(function(x){var la=+x.y,ln=+x.x;if(!Number.isFinite(la)||!Number.isFinite(ln))return;
      var m=new kakao.maps.Marker({position:new kakao.maps.LatLng(la,ln),map:map,title:x.place_name});markers.push(m);
    });
    list.innerHTML=items.length?'<ul class="ru-list">'+items.slice(0,8).map(function(x){return chip(x.place_name,fmt(Math.round(distance(p[0],p[1],+x.y,+x.x)))+'m',x.road_address_name||x.address_name||'');}).join('')+'</ul>':'<p class="ru-empty">조건에 맞는 검색 결과가 없습니다.</p>';
  }
  if(mode==='dong'){
    box.querySelector('[data-ru-dong-search]').onclick=function(){
      var q=box.querySelector('[data-ru-dong-input]').value.trim().replace(/\s/g,'');
      if(!/^\d{1,4}동$/.test(q)){list.textContent='101동처럼 동 번호를 입력해 주세요.';return;}
      list.textContent='지도 업체에서 동 위치를 검색하고 있습니다…';
      svc.keywordSearch(name(d)+' '+q,function(data,status){
        if(!el.isConnected)return;
        if(status!==kakao.maps.services.Status.OK){list.textContent='지도 검색에서 해당 동을 확인하지 못했습니다.';clear();return;}
        var filtered=data.filter(function(x){return new RegExp('(^|[^0-9])'+q.replace('동','')+'동').test(x.place_name||'')&&distance(p[0],p[1],+x.y,+x.x)<700;}).slice(0,5);
        plot(filtered);
        if(filtered.length)list.insertAdjacentHTML('beforeend','<p class="ru-note">동 번호는 지도 업체의 장소명 검색 결과입니다. 건축물대장과 일치 여부를 별도로 확인해야 합니다.</p>');
      },{location:pos,radius:1000,size:15});
    };
  }else{
    function query(k){list.textContent='주변 시설을 검색하고 있습니다…';
      if(k==='FUT'){
        var future=typeof FUT!=='undefined'&&Array.isArray(FUT)?FUT:[];
        plot(future.filter(function(f){return f[3]&&distance(p[0],p[1],f[3][0],f[3][1])<=1000;}).map(function(f){return {place_name:f[0]+' · '+f[1],y:f[3][0],x:f[3][1],road_address_name:'예정 '+f[2]+'년 · 계획 변동 가능'};}));
        return;
      }
      svc.categorySearch(k,function(data,status){
      if(!el.isConnected)return;
      if(status!==kakao.maps.services.Status.OK){list.textContent='검색 결과가 없거나 지도 서비스를 이용할 수 없습니다.';clear();return;}
      plot(data.filter(function(x){return distance(p[0],p[1],+x.y,+x.x)<=1000;}));
    },{location:pos,radius:1000,size:15,sort:kakao.maps.services.SortBy.DISTANCE});}
    box.querySelectorAll('[data-ru-poi]').forEach(function(btn){btn.onclick=function(){
      box.querySelectorAll('[data-ru-poi]').forEach(function(x){x.setAttribute('aria-pressed',String(x===btn));});
      query(btn.getAttribute('data-ru-poi'));
    };});
    query('SW8');
  }
  setTimeout(function(){if(el.isConnected)map.relayout();},100);
}
function trendView(d,box){
  box.innerHTML='<h4>실거래 가격 추이</h4><p>국토부 매매 실거래 기반 가격과 거래량입니다. 거래가 없는 달은 임의로 연결하지 않습니다.</p><div data-ru-trend role="status">가격 추이 확인 중…</div>';
  var out=box.querySelector('[data-ru-trend]');
  (async function(){
    if(!(await ensureDx())){if(out.isConnected)out.innerHTML='<p class="ru-warning">실거래 차트 표시 기능을 불러오지 못했습니다.</p>';return;}
    var raw=await loadTrade(d);
    if(!out.isConnected)return;
    if(raw.error){out.innerHTML='<p class="ru-warning">'+esc(raw.error)+'</p><button type="button" class="ru-action" data-trend-retry>다시 시도</button>';
      var retry=out.querySelector('[data-trend-retry]');if(retry)retry.onclick=function(){trendView(d,box);};return;}
    if(typeof window.APTDXChart==='function')window.APTDXChart(d,raw,out);
    else out.innerHTML='<p class="ru-warning">차트 모듈이 준비되지 않았습니다.</p>';
  })();
}
function rentView(d,box){
  box.innerHTML='<h4>전세·월세 실제 계약</h4><p>국토교통부에서 신고된 아파트 임대차 계약입니다. 선택 평형과 유사한 전용면적만 표시합니다.</p>'
    +'<div data-ru-rent-results role="status">최근 6개월 전월세 계약을 조회하고 있습니다…</div>';
  var out=box.querySelector('[data-ru-rent-results]');
  (async function(){
    if(!(await ensureDx())){if(out.isConnected)out.innerHTML='<div class="ru-warning">단지 식별키를 불러오지 못했습니다.</div>';return;}
    var k=window.aptLkey(d);
    if(!k){if(out.isConnected)out.innerHTML='<div class="ru-warning">시군구·법정동·단지명 식별키가 없어 매칭을 진행할 수 없습니다.</div>';return;}
    try{
      var v=await loadRent(k);
      if(!out.isConnected)return;
      var target=d.py*3.3058*.76,rows=(v.rows||[]).filter(function(x){return n(x.area)!=null&&Math.abs(x.area-target)<=5;});
      var lease=rows.filter(function(x){return x.kind==='전세';}),monthly=rows.filter(function(x){return x.kind==='월세';});
      var prices=lease.map(function(x){return n(x.deposit);}).filter(function(x){return x>0;});
      var med=median(prices);
      var sale=n(d.p),ratio=med>0&&sale>0?med/sale*100:null;
      out.innerHTML='<ul class="ru-list">'+chip('최근 6개월 해당 평형 전세',fmt(lease.length)+'건','전세보증금 중위가격은 거래 3건 이상일 때 표시')
        +chip('전세 실거래 중위가격',lease.length>=3?money(med):'표본 부족','보증금 단위: 만원')
        +chip('매매 시세 대비 전세가율',lease.length>=3&&ratio!=null?ratio.toFixed(1)+'%':'계산 불가','전세 실거래 중위 ÷ 기존 아파트맵 산출 매매 시세 · 서로 다른 기준')
        +chip('최근 6개월 해당 평형 월세',fmt(monthly.length)+'건','보증금과 월세를 분리하여 표시')+'</ul>'
        +(rows.length?'<table class="ru-table"><thead><tr><th>계약일·면적</th><th>구분</th><th>보증금 / 월세</th></tr></thead><tbody>'
           +rows.slice(0,12).map(function(x){return '<tr><td>'+esc(x.date)+'<br>'+esc(x.area)+'㎡ · '+esc(x.floor||'?')+'층</td><td>'+esc(x.kind)+(x.contractType?' <small>'+esc(x.contractType)+'</small>':'')+'</td><td>'+money(x.deposit)+(x.monthlyRent?'<br>월 '+fmt(x.monthlyRent)+'만원':'')+'</td></tr>';}).join('')+'</tbody></table>':
        '<p class="ru-empty">일치하는 전세·월세 계약을 찾지 못했습니다. 단지명 변경·미신고·자료 누락 가능성이 있습니다.</p>')
        +(v.complete?'':'<div class="ru-warning">일부 계약월 조회가 실패했습니다. 아래 건수는 부분 수집 자료이며 거래가 없다는 뜻이 아닙니다.</div>')
        +'<p class="ru-note">출처: '+esc(v.source||'국토교통부')+' · 확인 계약월 '+esc((v.monthsChecked||[]).join(', ')||'미확인')+' · 동일 평형 전용면적은 공급면적 환산 추정치 ±5㎡입니다. 동·호수는 공개되지 않습니다. 신고 지연과 계약갱신이 포함될 수 있습니다.</p>';
    }catch(e){if(out.isConnected)out.innerHTML='<div class="ru-warning">임대차 조회 중 네트워크 오류가 발생했습니다.</div>';}
  })();
}
var views=[
['trend','실거래 차트',trendView],
['rivals','라이벌 비교',rivalsView],
['volume','거래 유동성',volumeView],
['living','실거주',livingView],
['rent','전세·월세',rentView],
['school','학군',schoolView],
['near','주변 생활권',function(d,b){makeMap(d,b,'near');}],
['dong','동 위치',function(d,b){makeMap(d,b,'dong');}]
];
function removeOldSummary(b){
  b.querySelectorAll('section[data-ap1-panel]').forEach(function(s){
    var h=s.querySelector('h3');if(h&&/한눈에 보기/.test(h.textContent))s.remove();
  });
}
function attach(d,b,i){
  if(!b||!alive(b,d))return;
  if(b.dataset.ruDetail===key(d)+'|'+d.py&&getRoot(b)){removeOldSummary(b);return;}
  b.querySelectorAll('.ru-summary,.ru-root,.ru-quick').forEach(function(x){x.remove();});
  removeOldSummary(b);
  b.dataset.ruDetail=key(d)+'|'+d.py;
  var summary=document.createElement('div');summary.innerHTML=prosCons(d);
  var k=b.querySelector('dl.kpis'),id=b.querySelector('section.identity');
  if(k)k.after(summary.firstElementChild);else if(id)id.after(summary.firstElementChild);
  var root=document.createElement('section');root.className='ru-root';
  root.innerHTML='<h3>상세 분석 <small style="font-size:12px;font-weight:500;color:var(--text-tertiary)">원하는 항목만 열기</small></h3><div class="ru-tabs" role="group" aria-label="상세 분석 메뉴">'
    +views.map(function(v){return '<button type="button" data-ru-tab="'+v[0]+'" aria-pressed="false">'+v[1]+'</button>';}).join('')
    +'</div><div class="ru-content" data-ru-content aria-live="polite" hidden></div>';
  var summaryEl=b.querySelector('.ru-summary');if(summaryEl)summaryEl.after(root);else b.appendChild(root);
  var panel=root.querySelector('[data-ru-content]'),active=null;
  function show(v,keepOpen){if(active===v[0]&&keepOpen)return;if(active===v[0]){active=null;panel.hidden=true;panel.innerHTML='';root.querySelectorAll('[data-ru-tab]').forEach(function(x){x.setAttribute('aria-pressed','false');});return;}
    active=v[0];panel.hidden=false;root.querySelectorAll('[data-ru-tab]').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.ruTab===v[0]));});panel.innerHTML='';
    if(alive(b,d))v[2](d,panel);
  }
  root.querySelectorAll('[data-ru-tab]').forEach(function(btn){btn.onclick=function(){var v=views.find(function(x){return x[0]===btn.dataset.ruTab;});if(v)show(v);};});
  if(id){
    var quick=document.createElement('div');quick.className='ru-flex ru-quick';quick.setAttribute('role','group');quick.setAttribute('aria-label','상세 바로가기');
    [['trend','실거래'],['rent','전월세'],['living','입지']].forEach(function([key,label]){
      var btn=document.createElement('button');btn.type='button';btn.textContent=label;
      btn.onclick=function(){
        var chart=key==='trend'&&b.querySelector('.dxbox');
        if(chart){chart.scrollIntoView({block:'start'});return;}
        show(views.find(function(v){return v[0]===key;}),true);
        root.scrollIntoView({block:'start'});
      };
      quick.appendChild(btn);
    });
    id.appendChild(quick);
  }
  if(typeof aptLayout==='function')aptLayout(b);
}
window.APT_RICHGO={attach:attach,version:'2026-11-18'};
})();
