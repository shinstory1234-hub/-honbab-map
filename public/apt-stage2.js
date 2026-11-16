/* 아파트맵 2단계: 열 때만 실행하는 지도·목록 탐색 도구. 랭킹 산식 변경 없음. */
(function(){
'use strict';
if(window.APT2)return;
var esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var fnum=v=>Number.isFinite(+v)?+v:null;
var eokSafe=v=>Number.isFinite(+v)?eok(+v):'자료 없음';
var key=d=>d.cxKey+'|'+d.py;
var recKey='aptRecent_'+CAPT;
var recent=[];try{recent=JSON.parse(localStorage.getItem(recKey)||'[]');if(!Array.isArray(recent))recent=[];}catch(e){}
var filter={rentMin:0,gapMax:0,ratioMin:0,ratioMax:0,tradeMin:0,days:0};
var panel=null,tab='view',indicator='base',rankSort='rank';
var bestInGu=new Map();for(const item of D){const gu=item.area.split(' ').slice(0,2).join(' '),old=bestInGu.get(gu);if(!old||item.rank<old.rank)bestInGu.set(gu,item);}
var lineOverlays=[],measureMode='',measurePoints=[],measureBtn=null,overlayState={land:false,road:false},rivals=[null,null];
var name=d=>publicComplexName(d)+' '+d.py+'평';
var rent=d=>Number(d.jeon)>0?+d.jeon:null;
var ratio=d=>rent(d)!=null&&d.p>0?rent(d)/d.p*100:null;
var gap=d=>rent(d)!=null?d.p-rent(d):null;
var date=d=>(priceEv(d)?.last||'').replace(/\D/g,'').slice(0,8);
var inUse=()=>Object.values(filter).some(x=>x>0);
var css=document.createElement('style');
css.textContent=[
'#apt2Launcher{position:absolute;z-index:5;right:12px;top:147px;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:8px 11px;border-radius:5px;font-size:13px;font-weight:730;box-shadow:var(--shadow-float)}',
'.s2-shade{position:fixed;inset:0;z-index:1200;background:#0007;display:flex;justify-content:center;align-items:center;padding:12px}',
'.s2-dialog{width:min(590px,100%);max-height:85dvh;overflow:auto;background:var(--bg);color:var(--text);border-radius:12px;padding:0 16px 18px;box-shadow:0 8px 40px #0003}',
'.s2-top{position:sticky;top:0;background:var(--bg);z-index:2;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-soft);padding:13px 0}',
'.s2-top h2{font-size:19px;font-weight:760;margin:0}',
'.s2-btn{font-size:12px;font-weight:720;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:5px;padding:9px 11px;cursor:pointer}',
'.s2-btn.on,.s2-btn[aria-pressed=true]{color:var(--primary-soft-fg);border-color:var(--primary);background:var(--primary-soft-bg)}',
'.s2-tabs,.s2-flex{display:flex;flex-wrap:wrap;gap:6px;padding:9px 0}',
'.s2-tabs{position:sticky;top:49px;z-index:2;background:var(--bg);flex-wrap:nowrap;overflow:auto;border-bottom:1px solid var(--border-soft)}',
'.s2-tabs .s2-btn{flex:none}',
'.s2-body{padding:10px 0 8px}',
'.s2-body h3{font-size:15px;font-weight:760;margin:16px 0 8px}',
'.s2-body p{font-size:12px;line-height:1.6;color:var(--text-tertiary);margin:8px 0 12px}',
'.s2-rows{padding:0;list-style:none;margin:4px 0}',
'.s2-rows>li{padding:10px 0;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between;gap:8px}',
'.s2-rows b{font-size:13px;display:block;line-height:1.5}',
'.s2-rows small{font-size:11px;display:block;line-height:1.65;color:var(--text-tertiary)}',
'.s2-cols{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px}',
'.s2-cols label{display:block;font-size:12px;color:var(--text-secondary);font-weight:700}',
'.s2-cols select,.s2-cols input{width:100%;min-height:39px;margin-top:4px;border-radius:5px;border:1px solid var(--border);background:var(--bg);color:var(--text);padding:8px;font-size:15px}',
'.s2-wide{grid-column:1/-1}',
'.s2-chip{background:var(--bg-subtle);padding:10px 12px;border:1px solid var(--border-soft);border-radius:6px;font-size:13px;line-height:1.7}',
'.s2-toast{position:fixed;z-index:1400;bottom:22px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:11px 15px;border-radius:6px;box-shadow:0 2px 12px #0004;font-size:13px;max-width:85vw}',
'.s2-measure{position:absolute;left:12px;bottom:20px;z-index:30;background:var(--bg);color:var(--text);border:1px solid var(--border);padding:9px 11px;border-radius:5px;font-weight:750;font-size:12px}',
'@media(max-width:767px){.s2-shade{padding:0;align-items:flex-end}.s2-dialog{max-height:81dvh;border-radius:14px 14px 0 0}.s2-tabs{top:49px}#apt2Launcher{top:147px}}'
].join('');
document.head.appendChild(css);
function note(t){var o=document.getElementById('s2Toast');if(!o){o=document.createElement('div');o.id='s2Toast';o.className='s2-toast';o.setAttribute('role','status');document.body.appendChild(o);}o.textContent=t;o.hidden=false;clearTimeout(note.t);note.t=setTimeout(()=>{o.hidden=true;},2900);}
function remember(d){var k=key(d);recent=[k,...recent.filter(x=>x!==k)].slice(0,12);try{localStorage.setItem(recKey,JSON.stringify(recent));}catch(e){}}
function passes(d){
 var r=rent(d),ra=ratio(d),ga=gap(d),ev=priceEv(d);
 if(filter.rentMin&&(r==null||r<filter.rentMin))return false;
 if(filter.gapMax&&(ga==null||ga>filter.gapMax))return false;
 if(filter.ratioMin&&(ra==null||ra<filter.ratioMin))return false;
 if(filter.ratioMax&&(ra==null||ra>filter.ratioMax))return false;
 if(filter.tradeMin&&(!ev||+ev.n3<filter.tradeMin))return false;
 if(filter.days){var dt=date(d),min=new Date(Date.now()-filter.days*864e5).toISOString().slice(0,10).replace(/-/g,'');if(!dt||dt<min)return false;}
 return true;
}
function cash(d){return money(d).cash;}
function inBounds(){
 if(!map)return [];
 var b=map.getBounds(),seen=new Set(),a=[];
 for(var d of D){var k=complexRankKey(d);if(seen.has(k)||!d._pos||!b.contain(d._pos)||!visible(d))continue;seen.add(k);a.push(d);}
 return a;
}
function rank(arr,by){
 var fs={rank:(a,b)=>a.rank-b.rank,price:(a,b)=>a.p-b.p,ppp:(a,b)=>a.p/a.py-b.p/b.py,cash:(a,b)=>cash(a)-cash(b),
 units:(a,b)=>unitN(b)-unitN(a),age:(a,b)=>b.year-a.year,rent:(a,b)=>(ratio(b)??-1)-(ratio(a)??-1),deal:(a,b)=>dealN(b)-dealN(a)};
 return arr.sort((a,b)=>(fs[by]||fs.rank)(a,b)||a.rank-b.rank);
}
function rows(arr){if(!arr.length)return '<p>표시할 단지가 없습니다.</p>';return '<ul class="s2-rows">'+arr.map(d=>'<li><div style="min-width:0"><b>'+esc(name(d))+(bestInGu.get(d.area.split(' ').slice(0,2).join(' '))===d?' <span style="font-size:10px;color:var(--primary-soft-fg)">구 추천 1위</span>':'')+'</b><small>'+esc(d.area)+' · 추천 '+d.rank+'위 · '+eokSafe(d.p)+(rent(d)!=null?' · 전세 참고 '+eokSafe(rent(d)):'')+'</small></div><button class="s2-btn" data-s2go="'+D.indexOf(d)+'">보기</button></li>').join('')+'</ul>';}
function searchOptions(arr,selected){return arr.map(([k,label])=>'<option value="'+esc(k)+'"'+(selected===k?' selected':'')+'>'+esc(label)+'</option>').join('');}
var rankTypes=[['rank','추천순'],['price','매수가 낮은순'],['ppp','평당가 낮은순'],['cash','필요 현금 낮은순'],['units','세대수 많은순'],['age','준공 최신순'],['rent','전세가율 높은순'],['deal','거래 많은순']];
function viewTab(){
 var all=inBounds();
 return '<h3>현재 지도 범위</h3><div class="s2-chip">필터에 맞는 <b>'+all.length.toLocaleString()+'개 단지</b> 중 상위 10곳</div>'
 +'<div class="s2-cols"><label class="s2-wide">정렬 기준<select id="s2Rank">'+searchOptions(rankTypes,rankSort)+'</select></label></div><div id="s2RankRows">'+rows(rank(all,rankSort).slice(0,10))+'</div>'
 +'<h3>핀 숫자 변경</h3><div class="s2-flex">'+[
 ['base','원래 표시'],['rank','추천 순위'],['ppp','평당가'],['far','용적률'],['units','세대수'],['age','준공연도'],['rent','전세가율'],['gap','갭']
 ].map(([k,t])=>'<button class="s2-btn'+(indicator===k?' on':'')+'" data-s2pin="'+k+'">'+t+'</button>').join('')+'</div>'
 +'<p>화면에 보이는 핀만 지표를 바꿔 표시합니다. 정렬은 기본 추천 순위에 영향을 주지 않습니다. 전세금은 동일 평형 실거래 확인값이 아닙니다.</p>';
}
function filtersTab(){
 var fld=(key,label,factor)=>'<label>'+label+'<input name="'+key+'" type="number" min="0" step=".1" placeholder="조건 없음" value="'+(filter[key]?(filter[key]/(factor||1)):'')+'"></label>';
 return '<h3>전세·거래 조건</h3><div class="s2-cols">'
 +fld('rentMin','전세 참고금 최소 (억원)',10000)+fld('gapMax','전세 갭 최대 (억원)',10000)
 +fld('ratioMin','전세가율 최소 (%)')+fld('ratioMax','전세가율 최대 (%)')
 +fld('tradeMin','최근 3개월 거래 최소 (건)')
 +'<label>마지막 거래<select name="days">'+searchOptions([['0','제한 없음'],['90','90일 이내'],['180','180일 이내'],['365','1년 이내']],String(filter.days))+'</select></label></div>'
 +'<div class="s2-flex"><button class="s2-btn on" id="s2Apply">필터 적용</button><button class="s2-btn" id="s2Clear">초기화</button></div>'
 +'<p>단지 참고 전세금은 같은 전용면적의 계약으로 검증되지 않았습니다. 월세, 공시가격, 매물 소화기간 및 호가 변화는 공식 데이터가 없어 제외합니다.</p>';
}
function navTab(){
 var areas=new Set();D.forEach(d=>{var a=d.area.split(' ');if(a.length>=3)areas.add(a.slice(0,2).join(' '));});
 var opts=[...areas].sort((a,b)=>a.localeCompare(b,'ko')).map(k=>[k,k]);
 return '<h3>지역 이동</h3><div class="s2-cols"><label class="s2-wide">시·구<select id="s2Region"><option value="">지역 선택</option>'+searchOptions(opts,'')+'</select></label></div>'
 +'<div class="s2-flex"><button class="s2-btn" data-s2action="where">◎ 내 위치</button><button class="s2-btn" data-s2action="home">전체 지도</button><button class="s2-btn" data-s2action="zoomIn">확대 +</button><button class="s2-btn" data-s2action="zoomOut">축소 −</button></div>'
 +'<h3>지도 보기</h3><div class="s2-flex"><button class="s2-btn" data-s2view="ROADMAP">일반</button><button class="s2-btn" data-s2view="HYBRID">위성·항공</button><button class="s2-btn" data-s2overlay="land">지적편집도</button><button class="s2-btn" data-s2overlay="road">로드뷰 위치</button></div>'
 +'<h3>거리·면적 측정</h3><div class="s2-flex"><button class="s2-btn" data-s2measure="distance">두 점 거리</button><button class="s2-btn" data-s2measure="area">다각형 면적</button><button class="s2-btn" data-s2measure="clear">표시 지우기</button></div>'
 +'<p>측정은 지도상의 직선거리·평면 면적입니다. 실제 보행 경로가 아닙니다. 역사 항공사진 연도 변경은 지원하지 않습니다.</p>';
}
function savedTab(){
 var arr=recent.map(k=>D.find(d=>key(d)===k)).filter(Boolean);
 var seen=new Set(),fav=D.filter(d=>FAV.has(d.cxKey)&&!seen.has(complexRankKey(d))&&seen.add(complexRankKey(d))).sort((a,b)=>a.rank-b.rank);
 return '<h3>최근 본 단지 · 이 기기</h3>'+rows(arr.slice(0,8))+'<h3>관심 단지 · ♥ 저장</h3>'+rows(fav.slice(0,12))
 +'<div class="s2-flex"><button id="s2Share" class="s2-btn">탐색 링크 공유</button><button id="s2ClearHistory" class="s2-btn">최근 기록 지우기</button></div>'
 +'<p>최근 본 기록과 관심 단지는 이 브라우저에만 저장됩니다. 로그인 없이 기기 간 동기화하지 않습니다.</p>';
}
function rivalsTab(){
 var pool=[],keys=new Set();
 [...recent,...D.filter(d=>FAV.has(d.cxKey)).slice(0,12).map(key),...inBounds().slice(0,12).map(key)].forEach(k=>{if(keys.has(k))return;keys.add(k);var d=D.find(x=>key(x)===k);if(d)pool.push(d);});
 var select=k=>'<select data-rival="'+k+'"><option value="">단지 선택</option>'+pool.slice(0,25).map(d=>'<option value="'+esc(key(d))+'"'+(rivals[k]===key(d)?' selected':'')+'>'+esc(name(d))+'</option>').join('')+'</select>';
 return '<h3>라이벌 실거래 비교</h3><p>비슷한 전용면적의 두 단지를 골라 최근 분기별 국토부 중위 실거래를 비교합니다.</p>'
 +'<div class="s2-cols"><label>단지 1'+select(0)+'</label><label>단지 2'+select(1)+'</label></div>'
 +'<div class="s2-flex"><button class="s2-btn on" id="s2RaceRun">비교하기</button></div>'
 +'<div id="s2RaceOutput" role="status"></div><p>같은 분기 양쪽 각각 2건 이상의 거래만 표시합니다. 다른 전용면적·동·향에 따른 가격차이는 별도 보정하지 않습니다.</p>';
}
var contents={view:viewTab,filters:filtersTab,nav:navTab,saved:savedTab,rivals:rivalsTab},tabnames=[['view','현재 화면'],['filters','추가 조건'],['nav','지도'],['saved','저장함'],['rivals','라이벌']];
function open(t){if(t)tab=t;if(!panel){panel=document.createElement('div');panel.className='s2-shade';panel.id='s2Shade';panel.innerHTML='<section class="s2-dialog" role="dialog" aria-modal="true" aria-label="탐색 도구"><header class="s2-top"><h2>탐색 도구</h2><button class="s2-btn" id="s2Close">닫기 ×</button></header><nav class="s2-tabs" role="tablist"></nav><div class="s2-body"></div></section>';document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target===panel)close();});document.addEventListener('keydown',escClose);}paint();}
function escClose(e){if(e.key==='Escape')close();}
function close(){if(panel){panel.remove();panel=null;document.removeEventListener('keydown',escClose);}}
function bindRows(){panel?.querySelectorAll('[data-s2go]').forEach(b=>b.onclick=()=>{var i=+b.dataset.s2go;close();select(i,false);});}
function paint(){
 if(!panel)return;
 var tabs=panel.querySelector('.s2-tabs'),body=panel.querySelector('.s2-body');
 tabs.innerHTML=tabnames.map(([k,v])=>'<button class="s2-btn'+(tab===k?' on':'')+'" data-s2tab="'+k+'" role="tab" aria-selected="'+(tab===k)+'">'+v+'</button>').join('');
 body.innerHTML=contents[tab]();panel.querySelector('#s2Close').onclick=close;
 tabs.querySelectorAll('[data-s2tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.s2tab;paint();});bindRows();
 if(tab==='view'){
  body.querySelector('#s2Rank').onchange=e=>{rankSort=e.target.value;body.querySelector('#s2RankRows').innerHTML=rows(rank(inBounds(),rankSort).slice(0,10));bindRows();};
  body.querySelectorAll('[data-s2pin]').forEach(b=>b.onclick=()=>{indicator=b.dataset.s2pin;close();applyPins();note('핀 지표: '+b.textContent);});
 }
 if(tab==='filters'){
  body.querySelector('#s2Apply').onclick=()=>{var next={};for(var k of ['rentMin','gapMax','ratioMin','ratioMax','tradeMin','days']){var v=+body.querySelector('[name='+k+']').value;if(v<0||!Number.isFinite(v)){note('입력값을 확인하세요');return;}next[k]=k==='rentMin'||k==='gapMax'?Math.round(v*10000):v;}if(next.ratioMin&&next.ratioMax&&next.ratioMin>next.ratioMax){note('전세가율 최소가 최대보다 높습니다.');return;}filter=next;state.sel=null;state.lim=50;close();render();note('추가 조건을 적용했습니다.');};
  body.querySelector('#s2Clear').onclick=()=>{filter={rentMin:0,gapMax:0,ratioMin:0,ratioMax:0,tradeMin:0,days:0};state.sel=null;close();render();note('추가 조건을 초기화했습니다.');};
 }
 if(tab==='nav')bindNav(body);
 if(tab==='saved'){
  body.querySelector('#s2Share').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);note('탐색 링크를 복사했습니다.');}catch(e){prompt('링크 복사',location.href);}};
  body.querySelector('#s2ClearHistory').onclick=()=>{recent=[];try{localStorage.removeItem(recKey);}catch(e){}paint();};
 }
 if(tab==='rivals'){
  body.querySelectorAll('[data-rival]').forEach(s=>s.onchange=e=>{rivals[+s.dataset.rival]=e.target.value||null;});
  body.querySelector('#s2RaceRun').onclick=race;
 }
}
function bindNav(b){
 b.querySelector('#s2Region').onchange=e=>{
  var v=e.target.value;if(!v||!map)return;
  var found=D.filter(d=>d.area.startsWith(v)&&d._pos).slice(0,2000);
  if(!found.length){note('해당 지역의 단지 위치가 아직 없습니다.');return;}
  var bounds=new kakao.maps.LatLngBounds();found.forEach(d=>bounds.extend(d._pos));close();map.setBounds(bounds,40,40,45,40);browseMap();
 };
 b.querySelectorAll('[data-s2action]').forEach(btn=>btn.onclick=()=>{
  var v=btn.dataset.s2action;if(v==='home'){close();goHome();return;}
  if(v==='where'){navigator.geolocation?.getCurrentPosition(p=>{map.setLevel(5);map.setCenter(new kakao.maps.LatLng(p.coords.latitude,p.coords.longitude));close();browseMap();},()=>note('위치 권한이 필요합니다.'),{timeout:10000});return;}
  if(map){map.setLevel(Math.max(1,Math.min(13,map.getLevel()+(v==='zoomIn'?-1:1))));close();}
 });
 b.querySelectorAll('[data-s2view]').forEach(btn=>btn.onclick=()=>{if(!map)return;map.setMapTypeId(kakao.maps.MapTypeId[btn.dataset.s2view]);close();});
 b.querySelectorAll('[data-s2overlay]').forEach(btn=>btn.onclick=()=>{if(!map)return;var kind=btn.dataset.s2overlay,k=kind==='land'?'USE_DISTRICT':'ROADVIEW',id=kakao.maps.MapTypeId[k];if(overlayState[kind])map.removeOverlayMapTypeId(id);else map.addOverlayMapTypeId(id);overlayState[kind]=!overlayState[kind];close();note(btn.textContent+(overlayState[kind]?' 켬':' 끔'));});
 b.querySelectorAll('[data-s2measure]').forEach(btn=>btn.onclick=()=>{close();startMeasure(btn.dataset.s2measure);});
}
function indicatorOf(d){
 switch(indicator){
 case 'rank':return d.rank+'위';case 'ppp':return Math.round(d.p/d.py).toLocaleString()+'만/평';
 case 'far':{var v=landOf(d);return v?Math.round(v[2])+'%':'미확인';}
 case 'units':return unitN(d).toLocaleString()+'세대';case 'age':return d.year?d.year+'년':'미확인';
 case 'rent':return ratio(d)==null?'미확인':Math.round(ratio(d))+'%';
 case 'gap':return gap(d)==null?'미확인':eokSafe(gap(d));
 default:return null;
 }
}
function applyPins(){
 if(!map)return;
 for(var o of pins){if(!o.on||!o.el)continue;var d=D[o.i];if(indicator==='base'){if(o.el.querySelector('.s2-pinval'))o.el.innerHTML=pinHTML(d);continue;}
 var v=indicatorOf(d),old=o.el.querySelector('.s2-pinval');
 if(old)old.textContent=v;
 else o.el.innerHTML='<div><span class="sc">'+d.rank+'위</span><span><b class="s2-pinval">'+esc(v)+'</b><small>'+esc(d.s||'')+'</small></span></div>';
 }
}
function resetMeasure(){measureMode='';measurePoints=[];lineOverlays.forEach(o=>o.setMap(null));lineOverlays=[];measureBtn?.remove();measureBtn=null;}
function startMeasure(mode){
 resetMeasure();if(mode==='clear')return;if(!map)return;
 measureMode=mode;measureBtn=document.createElement('button');measureBtn.className='s2-measure';measureBtn.textContent=mode==='distance'?'거리 재는 중 · 취소':'면적 재는 중 · 완료';
 measureBtn.onclick=()=>{if(measureMode==='area'&&measurePoints.length>=3){finishArea();return;}resetMeasure();};
 document.querySelector('.mapwrap')?.appendChild(measureBtn);
 note(mode==='distance'?'지도에서 시작점과 끝점을 누르세요':'지도에서 세 점 이상 순서대로 누른 뒤 완료');
}
function finishArea(){
 if(measurePoints.length<3){note('세 점 이상 선택하세요');return;}
 var poly=new kakao.maps.Polygon({path:measurePoints.map(p=>new kakao.maps.LatLng(p[0],p[1])),strokeWeight:2,strokeColor:'#0066ff',fillColor:'#0066ff',fillOpacity:.14});poly.setMap(map);lineOverlays.push(poly);
 var a=typeof poly.getArea==='function'?poly.getArea():null;
 note(Number.isFinite(a)?'대략 '+Math.round(a).toLocaleString()+'㎡':'면적 계산을 지원하지 않습니다.');measureMode='';measureBtn?.remove();measureBtn=null;
}
function measureMapClick(e){
 if(!measureMode||!e?.latLng)return;measurePoints.push([e.latLng.getLat(),e.latLng.getLng()]);
 if(measureMode==='distance'&&measurePoints.length===2){var [a,b]=measurePoints;var poly=new kakao.maps.Polyline({path:measurePoints.map(p=>new kakao.maps.LatLng(p[0],p[1])),strokeWeight:3,strokeColor:'#0066ff'});poly.setMap(map);lineOverlays.push(poly);measureMode='';measureBtn?.remove();measureBtn=null;note('직선거리 '+fmtM(hav(a[0],a[1],b[0],b[1])));}
 else if(measureMode==='area')note(measurePoints.length+'점 선택됨 · 완료 버튼으로 측정');
}
function mapReady(){if(!map||mapReady.bound===map)return;mapReady.bound=map;kakao.maps.event.addListener(map,'click',measureMapClick);kakao.maps.event.addListener(map,'idle',()=>{if(indicator!=='base')setTimeout(applyPins,50);});}
function install(){
 document.getElementById('apt2MapLazy')?.remove();
 if(!document.getElementById('apt2Launcher')){var wrap=document.querySelector('.mapwrap');if(wrap){var btn=document.createElement('button');btn.id='apt2Launcher';btn.textContent='지도 도구';btn.type='button';btn.onclick=()=>open('view');wrap.appendChild(btn);}}
 document.querySelectorAll('[data-ap2]').forEach(b=>b.onclick=()=>open(b.dataset.ap2||'view'));
 mapReady();applyPins();
}
function median(a){if(!a.length)return null;a=a.slice().sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
async function race(){
 var dest=panel?.querySelector('#s2RaceOutput');if(!dest)return;
 var pair=rivals.map(k=>D.find(d=>key(d)===k));
 if(pair.some(x=>!x)||key(pair[0])===key(pair[1])){dest.innerHTML='<p>서로 다른 두 단지를 선택하세요.</p>';return;}
 dest.textContent='실거래 자료 조회 중…';
 try{
  if(!window.aptLkey){await new Promise((yes,no)=>{var s=document.createElement('script');s.src='/apt-dx.js?v=9';s.onload=yes;s.onerror=no;document.head.appendChild(s);});}
  var data=await Promise.all(pair.map(async d=>{
   var k=window.aptLkey(d);if(!k)return null;
   var res=await fetch('/api/apt-dx?k='+encodeURIComponent(k));if(!res.ok)return null;
   var j=await res.json(),a={};
   for(var t of j.t||[]){
    if(!t||t[4]||t[2]<=2||Math.abs(t[1]/3.3058/.76-d.py)>4||t[3]<=0)continue;
    var day=String(t[0]),quarter=day.slice(0,4)+' '+Math.ceil(+day.slice(4,6)/3)+'분기';(a[quarter]=a[quarter]||[]).push(t[3]);
   }
   return a;
  }));
  if(!dest.isConnected)return;
  if(data.some(x=>!x)){dest.innerHTML='<p>해당 단지의 실거래 자료가 부족합니다.</p>';return;}
  var quarters=Object.keys(data[0]).filter(k=>data.every(d=>(d[k]||[]).length>=2)).sort().reverse().slice(0,6).reverse();
  if(!quarters.length){dest.innerHTML='<p>같은 분기, 양쪽 각 2건 이상 실거래가 없어 비교를 보류합니다.</p>';return;}
  dest.innerHTML='<table style="width:100%;font-size:12px;text-align:left"><thead><tr><th>분기</th><th>'+esc(name(pair[0]))+'</th><th>'+esc(name(pair[1]))+'</th></tr></thead><tbody>'
    +quarters.map(k=>'<tr><td>'+k+'</td>'+data.map(d=>'<td>'+eokSafe(median(d[k]))+' <small>('+d[k].length+'건)</small></td>').join('')+'</tr>').join('')+'</tbody></table>'
    +'<p>전용면적 근사치와 분기 중위값 비교이며 서로 다른 동·층·향 보정은 하지 않았습니다.</p>';
 }catch(e){if(dest.isConnected)dest.innerHTML='<p>실거래 자료를 확인하지 못했습니다.</p>';}
}
function reset(){filter={rentMin:0,gapMax:0,ratioMin:0,ratioMax:0,tradeMin:0,days:0};indicator='base';resetMeasure();applyPins();}
window.APT2={install,open,passes,inUse,remember,mapReady,applyPins,reset};
install();
})();
