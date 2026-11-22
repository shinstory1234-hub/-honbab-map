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
var panel=null,tab='home',indicator='base',rankSort='rank';
var bestInGu=new Map();for(const item of D){const gu=item.area.split(' ').slice(0,2).join(' '),old=bestInGu.get(gu);if(!old||item.rank<old.rank)bestInGu.set(gu,item);}
var lineOverlays=[],measureMode='',measurePoints=[],measureBtn=null,overlayState={land:false,road:false},rivals=[null,null];
var name=d=>publicComplexName(d)+' '+d.py+'평';
var rent=d=>Number(d.jeon)>0?+d.jeon:null;
var ratio=d=>rent(d)!=null&&d.p>0?rent(d)/d.p*100:null;
var gap=d=>rent(d)!=null?d.p-rent(d):null;
var rentCoverage=D.filter(d=>rent(d)!=null).length;
var rentAvailable=rentCoverage>=Math.max(50,Math.ceil(D.length*.6));
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
css.textContent+='.search{position:relative}.s2-suggest{position:absolute;top:calc(100% + 5px);left:0;right:0;z-index:300;background:var(--bg);border:1px solid var(--border);border-radius:7px;box-shadow:0 7px 20px #0003;max-height:330px;overflow:auto;padding:5px}.s2-suggest[hidden]{display:none}.s2-suggest button{display:block;border:0;width:100%;text-align:left;padding:10px 11px;background:var(--bg);color:var(--text);cursor:pointer;border-radius:4px}.s2-suggest button:hover,.s2-suggest button:focus-visible{background:var(--bg-subtle);outline:1px solid var(--border)}.s2-suggest b{font-size:13px;display:block}.s2-suggest small{font-size:11px;color:var(--text-tertiary);display:block;margin-top:3px}';
css.textContent+="\n/* Clean UI preview: consistent text-first navigation and compact control density */\n.s2-dialog{border-radius:10px;box-shadow:0 14px 45px #0002}\n.s2-top{padding:17px 2px 12px}.s2-top h2{font-size:19px;letter-spacing:-.04em}\n.s2-tabs{gap:0;padding:0;top:55px;scrollbar-width:none}\n.s2-tabs .s2-btn{border:0;border-bottom:2px solid transparent;border-radius:0!important;padding:13px 14px 11px;background:transparent!important;color:var(--text-tertiary);font-size:13px;font-weight:600}\n.s2-tabs .s2-btn.on{color:var(--text);border-bottom-color:var(--text);font-weight:760}\n.s2-body{padding:12px 2px 10px}.s2-body h3{font-size:15px;letter-spacing:-.03em;margin:23px 0 10px}\n.s2-body h3:first-child{margin-top:7px}\n.s2-btn{border-radius:5px!important;box-shadow:none!important;font-weight:650}\n.s2-flex{gap:0;padding:0;align-items:stretch;flex-wrap:wrap;border-top:1px solid var(--border-soft)}\n.s2-flex .s2-btn{border:0;border-radius:0!important;background:transparent!important;color:var(--text-secondary);padding:12px 14px;border-bottom:1px solid var(--border-soft)}\n.s2-flex .s2-btn.on,.s2-flex .s2-btn[aria-pressed=true]{color:var(--primary-soft-fg);background:transparent!important}\n.s2-cols{gap:0 14px}.s2-cols label{font-size:12px;font-weight:600;padding:10px 0;color:var(--text-secondary)}\n.s2-cols input,.s2-cols select{border:0!important;border-radius:0!important;border-bottom:1px solid var(--border)!important;padding:8px 2px!important;min-height:38px;background:transparent!important;outline-offset:2px}\n.s2-chip{border:0;border-radius:0!important;background:transparent;padding:12px 0;border-bottom:1px solid var(--border-soft)}\n.s2-rows>li{padding:14px 0}.s2-rows>li>.s2-btn{border:0;border-radius:0!important;color:var(--primary-soft-fg);padding:8px 0 8px 12px}\n.s2-body p{line-height:1.65;margin:10px 0 16px}\n.s2-body table{border-collapse:collapse;table-layout:fixed}\n.s2-body th{font-weight:650;color:var(--text-tertiary);border-bottom:1px solid var(--border);padding:12px 6px;text-align:left}\n.s2-body td{border-bottom:1px solid var(--border-soft);padding:12px 6px;line-height:1.5;vertical-align:top}\n.s2-body [id$=Matches] .s2-btn{border:0;border-radius:0!important;border-bottom:1px solid var(--border-soft);width:100%;text-align:left;padding:12px 4px}\n.s2-body #s2Apply,.s2-body #s2RaceRun,.s2-body #s2WAdd{background:var(--text)!important;color:var(--bg)!important;border-radius:5px!important;padding:12px 20px;margin-top:12px}\n.s2-body #s2Clear,.s2-body #s2WClear,.s2-body #s2ClearHistory{color:var(--text-tertiary)}\n.s2-body #s2RaceOutput{overflow-x:auto}\n.s2-body #s2RaceOutput table{min-width:420px}\n.s2-body #s2RaceOutput td,.s2-body #s2RaceOutput th{overflow-wrap:anywhere}\n.s2-body #s2RankRows .s2-rows>li{align-items:baseline}\n.s2-body .s2-control-group{margin:15px 0 18px}\n.s2-body .s2-control-group>h3{margin:0;padding:0 0 9px;border-bottom:1px solid var(--border-soft)}\n.s2-body .s2-control-group .s2-flex{border-top:0}\n.s2-body .s2-control-group .s2-flex .s2-btn{flex:1 1 42%;text-align:left;min-width:0}\n.s2-body .s2-control-group .s2-flex .s2-btn:focus-visible{outline:2px solid var(--primary)}\n.s2-body .s2-actionbar{border-top:0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}\n.s2-body .s2-actionbar .s2-btn{flex:none;border:0}\n.s2-body .s2-actionbar .s2-btn:not(.on){color:var(--text-tertiary)}\n@media(max-width:767px){.s2-dialog{border-radius:12px 12px 0 0!important}.s2-tabs .s2-btn{padding:13px 12px 11px}.s2-body .s2-control-group .s2-flex .s2-btn{flex:1 1 45%}}\n";
css.textContent+="\n.s2-select-overlay{position:fixed;inset:0;z-index:1600;background:rgba(0,0,0,.42);display:flex;align-items:flex-end;justify-content:center}\n.s2-select-panel{width:min(480px,100%);max-height:min(75dvh,620px);overflow:hidden;background:var(--bg);color:var(--text);border-radius:14px 14px 0 0;display:flex;flex-direction:column;padding-bottom:env(safe-area-inset-bottom)}\n.s2-select-panel header{padding:19px 20px 13px;font-size:17px;font-weight:750;letter-spacing:-.025em;border-bottom:1px solid var(--border-soft)}\n.s2-select-options{overflow-y:auto;overscroll-behavior:contain;padding:4px 16px 12px}\n.s2-select-option{width:100%;min-height:48px;display:block;text-align:left;border:0;border-bottom:1px solid var(--border-soft);background:transparent;color:var(--text);font-size:15px;padding:12px 30px 12px 4px;position:relative}\n.s2-select-option.active{font-weight:750;color:var(--primary-soft-fg)}\n.s2-select-option.active:after{content:'✓';position:absolute;right:7px;top:50%;transform:translateY(-50%)}\n.s2-select-option:last-child{border-bottom:0}\n@media(min-width:768px){.s2-select-overlay{align-items:center;padding:24px}.s2-select-panel{border-radius:10px;max-height:75vh}}\n";
css.textContent+="\n.s2-sticky-sort{position:sticky;top:108px;z-index:3;background:var(--bg);padding:10px 0 12px;border-bottom:1px solid var(--border-soft)}\n.s2-sticky-sort label{display:flex!important;align-items:center;justify-content:space-between;gap:16px;font-size:13px!important}\n.s2-sticky-sort select{width:auto!important;min-width:148px;max-width:65%;margin:0!important;padding:7px 24px 7px 10px!important;border:1px solid var(--border)!important;border-radius:5px!important;background:var(--bg)!important;font-size:14px!important;font-weight:700;color:var(--text)!important}\n";
css.textContent+="\n.s2-tabs[hidden],.s2-back[hidden]{display:none!important}\n.s2-top{gap:10px}.s2-top h2{flex:1;font-size:19px}.s2-back{border:0;background:transparent;color:var(--text);font-size:25px;line-height:1;padding:7px 9px 7px 0;cursor:pointer}\n.s2-home-intro{font-size:13px!important;color:var(--text-secondary)!important;margin:8px 0 14px!important}\n.s2-home-list{display:flex;flex-direction:column}.s2-home-item{width:100%;display:flex;align-items:center;gap:12px;text-align:left;background:transparent;color:var(--text);border:0;border-bottom:1px solid var(--border-soft);padding:17px 3px;cursor:pointer;min-height:78px}\n.s2-home-item:first-child{border-top:1px solid var(--border-soft)}.s2-home-text{flex:1;min-width:0}.s2-home-text strong{display:block;font-size:15px;font-weight:740;letter-spacing:-.02em;margin-bottom:5px}.s2-home-text small{display:block;font-size:12px;line-height:1.55;color:var(--text-tertiary);font-weight:400}.s2-home-arrow{font-size:23px;color:var(--text-tertiary);font-weight:300}.s2-home-item:focus-visible,.s2-back:focus-visible{outline:2px solid var(--primary)}\n";
css.textContent+='\n.s2-sort-row{position:static!important;top:auto!important;z-index:auto!important;padding:10px 0 12px;border-bottom:1px solid var(--border-soft)}.s2-sort-row label{display:flex!important;align-items:center;justify-content:space-between;gap:12px;font-size:13px!important}.s2-sort-row select{width:auto!important;min-width:145px;max-width:65%;margin:0!important;padding:9px 28px 9px 12px!important;border:1px solid var(--border)!important;border-radius:5px!important;background:var(--bg)!important;font-size:14px!important;font-weight:700;color:var(--text)!important}\n';
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
function rows(arr){if(!arr.length)return '<p>표시할 단지가 없습니다.</p>';return '<ul class="s2-rows">'+arr.map(d=>'<li><div style="min-width:0"><b>'+esc(name(d))+(bestInGu.get(d.area.split(' ').slice(0,2).join(' '))===d?' <span style="font-size:10px;color:var(--primary-soft-fg)">현 예산 구 1위</span>':'')+'</b><small>'+esc(d.area)+' · 추천 '+d.rank+'위 · '+eokSafe(d.p)+(rent(d)!=null?' · 전세 참고 '+eokSafe(rent(d)):'')+'</small></div><button class="s2-btn" data-s2go="'+D.indexOf(d)+'">보기</button></li>').join('')+'</ul>';}
function searchOptions(arr,selected){return arr.map(([k,label])=>'<option value="'+esc(k)+'"'+(selected===k?' selected':'')+'>'+esc(label)+'</option>').join('');}
var rankTypes=[['rank','추천순'],['price','매수가 낮은순'],['ppp','평당가 낮은순'],['cash','필요 현금 낮은순'],['units','세대수 많은순'],['age','준공 최신순'],['rent','전세가율 높은순'],['deal','거래 많은순']];
function viewTab(){
 var all=inBounds();
 return '<h3>현재 지도 범위</h3><div class="s2-chip">'+(map?'필터에 맞는 <b>'+all.length.toLocaleString()+'개 단지</b> 중 상위 10곳':'지도가 준비되지 않았습니다. 지도 로딩 후 다시 열어주세요.')+'</div>'
 +'<div class="s2-cols s2-sort-row"><label class="s2-wide">정렬 기준<select id="s2Rank">'+searchOptions(rankTypes.filter(x=>rentAvailable||x[0]!=='rent'),rankSort)+'</select></label></div><div id="s2RankRows">'+rows(rank(all,rankSort).slice(0,10))+'</div>'
 +'<h3>핀 숫자 변경</h3><div class="s2-flex">'+[
 ['base','원래 표시'],['rank','추천 순위'],['ppp','평당가'],['far','용적률'],['units','세대수'],['age','준공연도'],...(rentAvailable?[['rent','전세가율'],['gap','갭']]:[])
 ].map(([k,t])=>'<button class="s2-btn'+(indicator===k?' on':'')+'" data-s2pin="'+k+'">'+t+'</button>').join('')+'</div>'
 +'<p>화면에 보이는 핀만 지표를 바꿔 표시합니다. 정렬은 기본 추천 순위에 영향을 주지 않습니다. 전세금은 동일 평형 실거래 확인값이 아닙니다.</p>';
}
function filtersTab(){
 var fld=(key,label,factor)=>'<label>'+label+'<input name="'+key+'" type="number" min="0" step=".1" placeholder="조건 없음" value="'+(filter[key]?(filter[key]/(factor||1)):'')+'"></label>';
 var has=rentAvailable;
 return '<h3>전세·거래 조건</h3><div class="s2-cols">'
 +(has?fld('rentMin','전세 참고금 최소 (억원)',10000)+fld('gapMax','전세 갭 최대 (억원)',10000)+fld('ratioMin','전세가율 최소 (%)')+fld('ratioMax','전세가율 최대 (%)'):'')
 +fld('tradeMin','최근 3개월 거래 최소 (건)')
 +'<label>마지막 거래<select name="days">'+searchOptions([['0','제한 없음'],['90','90일 이내'],['180','180일 이내'],['365','1년 이내']],String(filter.days))+'</select></label></div>'
 +'<div class="s2-actionbar"><button class="s2-btn on" id="s2Apply">필터 적용</button><button class="s2-btn" id="s2Clear">초기화</button></div>'
 +'<p>'+(has?'단지 참고 전세금은 동일 전용면적 계약과 일치하지 않을 수 있습니다. ':'현재 가격대에 검증 가능한 전세·갭 자료가 없어 해당 조건은 숨겼습니다. ')+'월세, 공시가격, 매물 소화기간 및 호가 변화는 자료가 없어 제외합니다.</p>';
}
function navTab(){
 var areas=new Set();D.forEach(d=>{var a=d.area.split(' ');if(a.length>=3)areas.add(a.slice(0,2).join(' '));});
 var opts=[...areas].sort((a,b)=>a.localeCompare(b,'ko')).map(k=>[k,k]);
 return '<h3>지역 이동</h3><div class="s2-cols"><label class="s2-wide">시·구<select id="s2Region"><option value="">지역 선택</option>'+searchOptions(opts,'')+'</select></label></div>'
 +'<div class="s2-control-group"><h3>위치와 확대</h3><div class="s2-flex"><button class="s2-btn" data-s2action="where">◎ 내 위치</button><button class="s2-btn" data-s2action="home">전체 지도</button><button class="s2-btn" data-s2action="zoomIn">확대 +</button><button class="s2-btn" data-s2action="zoomOut">축소 −</button></div>'
 +'</div><div class="s2-control-group"><h3>지도 보기</h3><div class="s2-flex"><button class="s2-btn" data-s2view="ROADMAP">일반</button><button class="s2-btn" data-s2view="HYBRID">위성·항공</button><button class="s2-btn" data-s2overlay="land">지적편집도</button><button class="s2-btn" data-s2overlay="road">로드뷰 위치</button></div>'
 +'</div><div class="s2-control-group"><h3>거리와 면적</h3><div class="s2-flex"><button class="s2-btn" data-s2measure="distance">두 점 거리</button><button class="s2-btn" data-s2measure="area">다각형 면적</button><button class="s2-btn" data-s2measure="clear">표시 지우기</button></div>'
 +'</div><p>측정은 지도상의 직선거리·평면 면적입니다. 실제 보행 경로가 아닙니다. 역사 항공사진 연도 변경은 지원하지 않습니다.</p>';
}
function savedTab(){
 var arr=recent.map(k=>D.find(d=>key(d)===k)).filter(Boolean);
 var seen=new Set(),fav=D.filter(d=>FAV.has(d.cxKey)&&!seen.has(complexRankKey(d))&&seen.add(complexRankKey(d))).sort((a,b)=>a.rank-b.rank);
 return '<h3>최근 본 단지 · 이 기기</h3>'+rows(arr.slice(0,8))+'<h3>관심 단지 · ♥ 저장</h3>'+rows(fav.slice(0,12))
 +'<div class="s2-actionbar"><button id="s2Share" class="s2-btn">조건 포함 링크 복사</button><button id="s2ClearHistory" class="s2-btn">최근 기록 지우기</button></div>'
 +'<p>최근 본 기록과 관심 단지는 이 브라우저에만 저장됩니다. 로그인 없이 기기 간 동기화하지 않습니다.</p>';
}
function rivalsTab(){
 var pool=[],keys=new Set();
 [...recent,...D.filter(d=>FAV.has(d.cxKey)).slice(0,12).map(key),...(inBounds().length?inBounds().slice(0,12):D.slice().sort((a,b)=>a.rank-b.rank).slice(0,16)).map(key)].forEach(k=>{if(keys.has(k))return;keys.add(k);var d=D.find(x=>key(x)===k);if(d)pool.push(d);});
 var select=k=>'<input data-rival-query="'+k+'" type="search" autocomplete="off" placeholder="단지명·동네 검색"><select data-rival="'+k+'"><option value="">단지 선택</option>'+pool.slice(0,25).map(d=>'<option value="'+esc(key(d))+'"'+(rivals[k]===key(d)?' selected':'')+'>'+esc(name(d))+'</option>').join('')+'</select>';
 return '<h3>라이벌 실거래 비교</h3><p>비슷한 전용면적의 두 단지를 골라 최근 분기별 국토부 중위 실거래를 비교합니다.</p>'
 +'<div class="s2-cols"><label>단지 1'+select(0)+'</label><label>단지 2'+select(1)+'</label></div>'
 +'<div class="s2-actionbar"><button class="s2-btn on" id="s2RaceRun">비교하기</button></div>'
 +'<div id="s2RaceOutput" role="status"></div><p>같은 분기 양쪽 각각 2건 이상의 거래만 표시합니다. 다른 전용면적·동·향에 따른 가격차이는 별도 보정하지 않습니다.</p>';
}
function livingTab(){
 const selected=D.find(d=>key(d)===livingPick);
 const recentPool=recent.map(k=>D.find(d=>key(d)===k)).filter(Boolean);
 const pool=[...(selected?[selected]:[]),...(recentPool.length?recentPool:D.slice().sort((a,b)=>a.rank-b.rank).slice(0,10))].filter((d,i,a)=>a.findIndex(x=>key(x)===key(d))===i);
 const chosen=selected||pool[0];if(!chosen)return '<p>분석할 단지가 없습니다.</p>';
 const g=chosen.g||{},cur=chosen.cur;
 const fields=[
 ['교통',cur&&Number.isFinite(cur.m)?cur.n+' · 역까지 직선거리 '+Math.round(cur.m)+'m':'확인된 역 정보 없음',cur&&Number.isFinite(cur.v)?cur.v.toFixed(1)+' / 23점':'평가값 없음'],
 ['직주근접',Number.isFinite(chosen.tbe)?'기준 통근 '+Math.round(chosen.tbe)+'분':'기준 통근 자료 없음',Number.isFinite(chosen.J)?chosen.J.toFixed(1)+' / 9점':'평가값 없음'],
 ['학군',g.scn?'인근 초등학교 '+g.scn:'학교명 자료 없음',Number.isFinite(chosen.E)?chosen.E.toFixed(1)+' / 6점':'평가값 없음'],
 ['생활환경','기존 생활환경 평가',Number.isFinite(chosen.A)?chosen.A.toFixed(1)+'점':'평가값 없음'],
 ['단지 규모',Number.isFinite(chosen.units)?chosen.units.toLocaleString()+'세대':'세대수 자료 없음',Number.isFinite(chosen.U7)?chosen.U7.toFixed(1)+'점':'평가값 없음'],
 ['연식',chosen.year?chosen.year+'년 준공':'준공연도 자료 없음',Number.isFinite(chosen.B)?chosen.B.toFixed(1)+'점':'평가값 없음']
 ];
 return '<h3>실거주 요소별 평가</h3><div class="s2-cols"><label class="s2-wide">단지 선택<select id="s2LivingPick">'+pool.map(d=>'<option value="'+esc(key(d))+'"'+(chosen===d?' selected':'')+'>'+esc(name(d))+'</option>').join('')+'</select></label><label class="s2-wide">다른 단지 검색<input id="s2LivingSearch" type="search" placeholder="단지명 검색" autocomplete="off"></label></div><div id="s2LivingMatches"></div><div class="s2-chip"><b>'+esc(name(chosen))+'</b><br>'+esc(chosen.area)+' · 추천 '+chosen.rank+'위</div><ul class="s2-rows">'+fields.map(x=>'<li><div><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></div><b>'+esc(x[2])+'</b></li>').join('')+'</ul><p>기존 평가값을 실거주 관점에서 설명합니다. 항목마다 배점이 다르므로 합산한 별도 실거주 총점이나 순위가 아닙니다. 동호수별 일조·소음·조망은 평가하지 않았습니다.</p>';
}
var livingPick=null;

/* 사용자 기록 매물: 외부 매물사이트를 자동 수집하거나 삭제를 거래 완료로 오인하지 않는다. */
var watchKey='aptListingWatch_v1',watch=[];try{watch=JSON.parse(localStorage.getItem(watchKey)||'[]');if(!Array.isArray(watch))watch=[];}catch(e){}
function persistWatch(){try{localStorage.setItem(watchKey,JSON.stringify(watch.slice(-100)));}catch(e){note('기기 저장 공간이 부족합니다.');}}
function watchTab(){
 const entries=watch.slice().reverse().slice(0,25);
 return '<h3>매물 호가 기록 · 직접 입력</h3><div class="s2-cols"><label>매물 식별명<input id="s2WName" maxlength="70" placeholder="예: 단지명 101동 12층"></label><label>호가 (억원)<input id="s2WPrice" type="number" min=".01" max="1000" step=".01" placeholder="예: 8.5"></label></div><div class="s2-flex"><button class="s2-btn on" id="s2WAdd">호가 기록</button></div><p>같은 식별명으로 다시 기록하면 호가 변화와 최초 기록 후 경과일을 계산합니다. 매물 삭제는 매매 완료가 아니므로 실제 소화 기간으로 표시하지 않습니다.</p><h3>내 기록</h3>'
 +(entries.length?'<ul class="s2-rows">'+entries.map((w,i)=>{const prior=watch.slice(0,watch.indexOf(w)).reverse().find(x=>x.n===w.n);const first=watch.find(x=>x.n===w.n);const diff=prior?((w.p-prior.p)/100).toFixed(2):null;return '<li><div><b>'+esc(w.n)+'</b><small>'+esc(w.at.slice(0,10))+' · 최초 기록 후 '+Math.max(0,Math.floor((Date.parse(w.at)-Date.parse(first.at))/864e5))+'일'+(diff!==null?' · 직전 대비 '+(diff>0?'+':'')+diff+'억원':' · 최초 기록')+'</small></div><b>'+((w.p/100).toFixed(2))+'억</b></li>';}).join('')+'</ul>':'<p>직접 기록한 매물이 없습니다.</p>')
 +'<div class="s2-flex"><button class="s2-btn" id="s2WClear">내 기록 전체 삭제</button></div>';
}
/* 평형 목록은 단지별 보유 데이터 범위에서만 제공. 향·배치도는 추정하지 않는다. */
var typesPick=null;
function typesTab(){
 const d=D.find(x=>key(x)===typesPick)||recent.map(k=>D.find(x=>key(x)===k)).find(Boolean)||D[0];
 if(!d)return '<p>단지 자료가 없습니다.</p>';
 const types=(d.types||[]).slice().sort((a,b)=>a.py-b.py);
 return '<h3>평형 구성</h3><div class="s2-cols"><label class="s2-wide">단지 검색<input id="s2TypesSearch" type="search" placeholder="단지명 검색" autocomplete="off"></label></div><div id="s2TypesMatches"></div><div class="s2-chip"><b>'+esc(name(d))+'</b> · '+esc(d.area)+'</div>'
 +(types.length?'<ul class="s2-rows">'+types.map(t=>'<li><div><b>'+esc(t.py)+'평</b><small>최근 12개월 매매 '+(Number.isFinite(+t.n)?+t.n:'미확인')+'건 · 최근 3개월 '+(Number.isFinite(+t.n3)?+t.n3:'미확인')+'건</small></div><b>'+esc(t.last||'날짜 미확인')+'</b></li>').join('')+'</ul>':'<p>평형별 자료가 없습니다.</p>')
 +'<p>동 배치도·향·호수별 일조와 조망은 확인된 원본 도면이 없어 표시하지 않습니다. 평형 목록은 전용면적별 실제 타입 도면을 뜻하지 않습니다.</p><h3>층별 거래 비교</h3><button class="s2-btn on" id="s2FloorLoad">이 단지 층별 실거래 조회</button><div id="s2FloorOut" role="status"></div>';
}
async function floorLoad(d,out){
 out.textContent='최근 실거래 조회 중…';
 try{
  if(!window.aptLkey)await new Promise((ok,fail)=>{const x=document.createElement('script');x.src='/apt-dx.js?v=15';x.onload=ok;x.onerror=fail;document.head.appendChild(x);});
  const k=window.aptLkey(d);if(!k)throw Error('key');
  const res=await fetch('/api/apt-dx?k='+encodeURIComponent(k));if(!res.ok)throw Error('fetch');
  const data=await res.json(),tx=data.t||[],target=d.py*3.3058*.76;
  const recentCut=Date.now()-548*864e5,groups=[[],[],[]];
  for(const t of tx){if(!Array.isArray(t)||t[4]||!Number.isFinite(+t[2])||!Number.isFinite(+t[3])||t[3]<=0||Math.abs(t[1]-target)>5)continue;
   const day=String(t[0]);if(!/^\d{8}$/.test(day)||Date.UTC(+day.slice(0,4),+day.slice(4,6)-1,+day.slice(6,8))<recentCut)continue;
   const f=+t[2];if(f<=2)groups[0].push(+t[3]);else if(f<=9)groups[1].push(+t[3]);else groups[2].push(+t[3]);
  }
  if(!out.isConnected)return;
  out.innerHTML='<ul class="s2-rows">'+['1~2층','3~9층','10층 이상'].map((label,i)=>'<li><b>'+label+'</b><div>'+ (groups[i].length>=3?'<b>'+eokSafe(median(groups[i]))+'</b>':'<b>표본 부족</b>')+'<small>'+groups[i].length+'건</small></div></li>').join('')+'</ul><p>최근 18개월 · 해당 평형 추정 전용면적 ±5㎡ · 직거래 제외 · 3건 이상일 때만 중위가격 표시. 층별 적정 호가나 로열동 판정이 아닙니다.</p>';
 }catch(e){if(out.isConnected)out.textContent='층별 실거래를 확보하지 못했습니다.';}
}
function bindTypeSearch(body){
 const input=body.querySelector('#s2TypesSearch'),matches=body.querySelector('#s2TypesMatches');
 input.oninput=()=>{matches.innerHTML=(input.value.trim()?searchIndex(input.value):[]).map(d=>'<button class="s2-btn" data-s2type="'+D.indexOf(d)+'">'+esc(name(d))+'</button>').join('');
 matches.querySelectorAll('[data-s2type]').forEach(b=>b.onclick=()=>{typesPick=key(D[+b.dataset.s2type]);paint();});};
 body.querySelector('#s2FloorLoad').onclick=()=>floorLoad(D.find(x=>key(x)===(typesPick||''))||recent.map(k=>D.find(x=>key(x)===k)).find(Boolean)||D[0],body.querySelector('#s2FloorOut'));
}
function homeTab(){
 const menus=[
 ['view','지도 안의 아파트','현재 지도에 보이는 단지 중 추천 상위 10곳을 확인하고 정렬합니다.'],
 ['filters','상세 필터','최근 거래 건수와 마지막 거래일 등으로 아파트를 좁혀 찾습니다.'],
 ['rivals','실거래 비교','두 단지를 선택해 분기별 실거래 가격을 비교합니다.'],
 ['saved','관심·최근 본 단지','저장하거나 최근 확인한 아파트를 다시 봅니다.'],
 ['nav','지도 설정과 측정','지역 이동, 지도 종류 변경, 거리와 면적 측정을 이용합니다.'],
 ['living','생활환경 평가','교통, 통근, 학교, 단지 규모 등 평가 항목을 확인합니다.'],
 ['types','평형과 층별 거래','평형 구성과 층별 실거래 가격을 확인합니다.'],
 ['watch','내 매물 호가 기록','직접 입력한 매물의 호가 변화를 기록합니다.']
 ];
 return '<p class="s2-home-intro">원하는 작업을 선택하세요. 각 메뉴에서 무엇을 할 수 있는지 확인할 수 있습니다.</p><div class="s2-home-list">'+menus.map(([k,title,desc])=>'<button type="button" class="s2-home-item" data-s2menu="'+k+'"><span class="s2-home-text"><strong>'+title+'</strong><small>'+desc+'</small></span><span class="s2-home-arrow" aria-hidden="true">›</span></button>').join('')+'</div>';
}
var contents={home:homeTab,view:viewTab,filters:filtersTab,nav:navTab,saved:savedTab,rivals:rivalsTab,living:livingTab,types:typesTab,watch:watchTab},tabnames=[['view','현재 화면'],['filters','추가 조건'],['nav','지도'],['saved','저장함'],['rivals','라이벌'],['living','실거주'],['types','평형·층'],['watch','호가 기록']];
function open(t){mapReady();tab=t||'home';if(!panel){panel=document.createElement('div');panel.className='s2-shade';panel.id='s2Shade';panel.innerHTML='<section class="s2-dialog" role="dialog" aria-modal="true" aria-label="아파트 탐색"><header class="s2-top"><button type="button" class="s2-back" id="s2Back" hidden aria-label="전체 메뉴로 돌아가기">←</button><h2>아파트 탐색</h2><button class="s2-btn" id="s2Close">닫기 ×</button></header><nav class="s2-tabs" role="tablist" hidden></nav><div class="s2-body"></div></section>';document.body.appendChild(panel);panel.addEventListener('click',e=>{if(e.target===panel)close();});document.addEventListener('keydown',escClose);}paint();}
function escClose(e){if(e.key==='Escape')close();}
function close(){if(panel){panel.remove();panel=null;document.removeEventListener('keydown',escClose);}}
function bindRows(){panel?.querySelectorAll('[data-s2go]').forEach(b=>b.onclick=()=>{var i=+b.dataset.s2go;close();select(i,false);});}

function s2SelectSheet(select){
 if(!select||select.disabled||document.querySelector('.s2-select-overlay'))return;
 const opts=[...select.options].filter(o=>!o.disabled&&!o.hidden);
 if(!opts.length)return;
 const overlay=document.createElement('div');overlay.className='s2-select-overlay';
 const dialog=document.createElement('section');dialog.className='s2-select-panel';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 const label=select.closest('label')?.childNodes[0]?.textContent?.trim()||select.getAttribute('aria-label')||'선택';
 const head=document.createElement('header');head.textContent=label;dialog.appendChild(head);
 const list=document.createElement('div');list.className='s2-select-options';
 opts.forEach(o=>{const b=document.createElement('button');b.type='button';b.textContent=o.textContent;b.className='s2-select-option'+(o.value===select.value?' active':'');b.setAttribute('aria-pressed',String(o.value===select.value));b.onclick=()=>{const changed=select.value!==o.value;select.value=o.value;close();if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));};list.appendChild(b);});
 dialog.appendChild(list);overlay.appendChild(dialog);
 const close=()=>{document.removeEventListener('keydown',esc);overlay.remove();};
 const esc=e=>{if(e.key==='Escape')close();};
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 document.addEventListener('keydown',esc);document.body.appendChild(overlay);
 // Do not scroll the underlying dialog when opening the option sheet.
 list.scrollTop=0;
}
function bindS2Selects(){
 if(!panel)return;
 panel.querySelectorAll('.s2-body select').forEach(select=>{
  select.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||e.pointerType==='touch'||e.pointerType==='pen'){e.preventDefault();s2SelectSheet(select);}});
  select.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();s2SelectSheet(select);}});
 });
}
function paint(){
 if(!panel)return;
 var tabs=panel.querySelector('.s2-tabs'),body=panel.querySelector('.s2-body');
 tabs.innerHTML='';tabs.hidden=true;
 const back=panel.querySelector('#s2Back'),title=panel.querySelector('.s2-top h2');
 back.hidden=tab==='home';title.textContent=tab==='home'?'아파트 탐색':({view:'지도 안의 아파트',filters:'상세 필터',nav:'지도 설정과 측정',saved:'관심·최근 본 단지',rivals:'실거래 비교',living:'생활환경 평가',types:'평형과 층별 거래',watch:'내 매물 호가 기록'}[tab]||'아파트 탐색');
 body.innerHTML=(contents[tab]||homeTab)();panel.querySelector('#s2Close').onclick=close;
 back.onclick=()=>{tab='home';paint();};
 body.querySelectorAll('[data-s2menu]').forEach(b=>b.onclick=()=>{tab=b.dataset.s2menu;paint();panel.querySelector('.s2-dialog').scrollTop=0;});
 bindRows();bindS2Selects();
 if(tab==='view'){
  body.querySelector('#s2Rank').onchange=e=>{rankSort=e.target.value;body.querySelector('#s2RankRows').innerHTML=rows(rank(inBounds(),rankSort).slice(0,10));bindRows();};
  body.querySelectorAll('[data-s2pin]').forEach(b=>b.onclick=()=>{indicator=b.dataset.s2pin;close();applyPins();note('핀 지표: '+b.textContent);});
 }
 if(tab==='filters'){
  body.querySelector('#s2Apply').onclick=()=>{var next={};for(var k of ['rentMin','gapMax','ratioMin','ratioMax','tradeMin','days']){var field=body.querySelector('[name='+k+']'),v=field?+field.value:0;if(v<0||!Number.isFinite(v)){note('입력값을 확인하세요');return;}next[k]=k==='rentMin'||k==='gapMax'?Math.round(v*10000):v;}if(next.ratioMin&&next.ratioMax&&next.ratioMin>next.ratioMax){note('전세가율 최소가 최대보다 높습니다.');return;}filter=next;state.sel=null;state.lim=50;close();render();note('추가 조건을 적용했습니다.');};
  body.querySelector('#s2Clear').onclick=()=>{clearFilters();state.sel=null;close();render();note('추가 조건을 초기화했습니다.');};
 }
 if(tab==='nav')bindNav(body);
 if(tab==='saved'){
  body.querySelector('#s2Share').onclick=async()=>{
   const u=new URL(location.href);
   const f={v:1,filter,sort:state.sort,fav:state.f,pb:state.pb,size:state.size,age:state.age,q:state.q,rank:rankSort};
   u.searchParams.set('s2',JSON.stringify(f));
   if(map){const c=map.getCenter();u.searchParams.set('vlat',c.getLat().toFixed(5));u.searchParams.set('vlng',c.getLng().toFixed(5));u.searchParams.set('vlevel',String(map.getLevel()));}
   try{await navigator.clipboard.writeText(u.href);note('조건과 지도 위치를 포함한 링크를 복사했습니다.');}catch(e){prompt('링크 복사',u.href);}
  };
  body.querySelector('#s2ClearHistory').onclick=()=>{recent=[];try{localStorage.removeItem(recKey);}catch(e){}paint();};
 }
 if(tab==='types')bindTypeSearch(body);
 if(tab==='watch'){
  body.querySelector('#s2WAdd').onclick=()=>{
   const n=body.querySelector('#s2WName').value.trim(),p=+body.querySelector('#s2WPrice').value;
   if(n.length<3||n.length>70||!Number.isFinite(p)||p<=0||p>1000){note('식별명 3자 이상과 유효한 호가를 입력하세요.');return;}
   watch.push({n,p:Math.round(p*100),at:new Date().toISOString()});watch=watch.slice(-100);persistWatch();paint();note('호가를 기록했습니다.');
  };
  body.querySelector('#s2WClear').onclick=()=>{if(!confirm('이 기기의 모든 매물 기록을 삭제할까요?'))return;watch=[];persistWatch();paint();};
 }
 if(tab==='living'){
  const picker=body.querySelector('#s2LivingPick'),input=body.querySelector('#s2LivingSearch'),matches=body.querySelector('#s2LivingMatches');
  picker.onchange=e=>{livingPick=e.target.value;paint();};
  input.oninput=()=>{
   const q=input.value.trim(),found=q?searchIndex(q):[];
   matches.innerHTML=found.map(d=>'<button type="button" class="s2-btn" data-s2living="'+D.indexOf(d)+'">'+esc(name(d))+' · '+esc(d.area)+'</button>').join('');
   matches.querySelectorAll('[data-s2living]').forEach(b=>b.onclick=()=>{livingPick=key(D[+b.dataset.s2living]);paint();});
  };
 }
 if(tab==='rivals'){
  body.querySelectorAll('[data-rival]').forEach(s=>s.onchange=e=>{rivals[+s.dataset.rival]=e.target.value||null;});
  body.querySelectorAll('[data-rival-query]').forEach(input=>input.oninput=()=>{
   const k=+input.dataset.rivalQuery,q=input.value.trim();
   const choices=q?searchIndex(q):D.slice().sort((a,b)=>a.rank-b.rank).slice(0,20);
   const select=body.querySelector('[data-rival="'+k+'"]');
   select.innerHTML='<option value="">단지 선택</option>'+choices.map(d=>'<option value="'+esc(key(d))+'">'+esc(name(d))+' · '+esc(d.area)+'</option>').join('');
   if(rivals[k]&&choices.some(d=>key(d)===rivals[k]))select.value=rivals[k];
   else rivals[k]=null;
  });
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
 b.querySelectorAll('[data-s2view]').forEach(btn=>btn.onclick=()=>{if(!map)return;map.setMapTypeId(kakao.maps.MapTypeId[btn.dataset.s2view]);if(btn.dataset.s2view==='ROADMAP'){for(const kind of ['land','road']){const id=kakao.maps.MapTypeId[kind==='land'?'USE_DISTRICT':'ROADVIEW'];map.removeOverlayMapTypeId(id);overlayState[kind]=false;}}close();note(btn.dataset.s2view==='ROADMAP'?'일반 지도로 변경했습니다.':'위성 지도로 변경했습니다.');});
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

function searchIndex(query){
 const q=query.trim().toLocaleLowerCase();if(!q)return [];
 const found=[],used=new Set();
 for(const d of D){
  const group=complexRankKey(d);if(used.has(group)||!visible(d,false))continue;
  const full=(d.n||'').toLocaleLowerCase(),region=(d.area||'').toLocaleLowerCase();
  const station=(d.cur?.n||'').toLocaleLowerCase(),school=(d.g?.scn||'').toLocaleLowerCase();
  const nick=townOf(d).toLocaleLowerCase();
  const score=full===q?0:full.startsWith(q)?1:full.includes(q)?2:region.includes(q)?3:station.includes(q)?4:school.includes(q)?5:nick.includes(q)?6:99;
  if(score===99)continue;used.add(group);found.push({d,score});
 }
 found.sort((a,b)=>a.score-b.score||a.d.rank-b.d.rank);
 return found.slice(0,7).map(x=>x.d);
}
function bindSearch(){
 const input=document.getElementById('q'),wrap=input?.closest('.search');
 if(!input||!wrap||wrap.querySelector('#s2Suggest'))return;
 const pop=document.createElement('div');pop.id='s2Suggest';pop.className='s2-suggest';pop.setAttribute('role','listbox');pop.hidden=true;wrap.appendChild(pop);
 let timer;
 const paint=()=>{
  if(!input.isConnected)return;
  const q=input.value.trim();
  if(!q||document.activeElement!==input){pop.hidden=true;return;}
  const matches=searchIndex(q);
  pop.innerHTML=matches.map(d=>'<button type="button" data-s2match="'+D.indexOf(d)+'" role="option"><b>'+esc(name(d))+'</b><small>'+esc(d.area)+(Number.isInteger(d.rank)?' · 추천 '+d.rank+'위':'')+(d.cur?.n?' · 인근역 '+esc(d.cur.n):'')+'</small></button>').join('');
  pop.hidden=!matches.length;
 };
 input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(paint,65);});
 input.addEventListener('focus',paint);
 input.addEventListener('blur',()=>{clearTimeout(timer);setTimeout(()=>pop.hidden=true,170);});
 input.addEventListener('keydown',e=>{if(!pop.hidden&&e.key==='ArrowDown'){e.preventDefault();pop.querySelector('button')?.focus();}if(e.key==='Escape')pop.hidden=true;},true);
 pop.addEventListener('keydown',e=>{
  const buttons=[...pop.querySelectorAll('button')],idx=buttons.indexOf(document.activeElement);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,idx+(e.key==='ArrowDown'?1:-1)))]?.focus();}
  if(e.key==='Escape'){e.preventDefault();pop.hidden=true;input.focus();}
 });
 pop.addEventListener('click',e=>{
  const button=e.target.closest('[data-s2match]');if(!button)return;
  const i=+button.dataset.s2match;if(!D[i])return;
  pop.hidden=true;input.blur();select(i,false);
 });
 paint();
}
function importShare(){
 const raw=new URL(location.href).searchParams.get('s2');if(!raw||raw.length>1800)return;
 try{
  const data=JSON.parse(raw);if(!data||data.v!==1||!data.filter||typeof data.filter!=='object')return;
  const next={};
  for(const k of ['rentMin','gapMax','ratioMin','ratioMax','tradeMin','days']){
   const v=Number(data.filter[k]);next[k]=Number.isFinite(v)&&v>=0&&v<=1e7?v:0;
  }
  if(!rentAvailable)next.rentMin=next.gapMax=next.ratioMin=next.ratioMax=0;
  filter=next;
  if(SORTS.some(row=>row[0]===data.sort))state.sort=data.sort;
  if(['all','fav','top','mid','interest','explore','flat','job50','free'].includes(data.fav))state.f=data.fav;
  if(PB.some(row=>row[0]===data.pb))state.pb=data.pb;
  if(SIZES.some(row=>row[0]===data.size))state.size=data.size;
  if(AGES.some(row=>row[0]===data.age))state.age=data.age;
  if(rankTypes.some(row=>row[0]===data.rank))rankSort=data.rank;
  if(typeof data.q==='string'){state.q=data.q.slice(0,60);document.getElementById('q').value=state.q;}
  state.lim=50;render();note('공유된 탐색 조건을 적용했습니다.');
 }catch(e){console.warn('stage2 shared query invalid',e);}
}

function install(){
 document.getElementById('apt2MapLazy')?.remove();
 if(!document.getElementById('apt2Launcher')){var wrap=document.querySelector('.mapwrap');if(wrap){var btn=document.createElement('button');btn.id='apt2Launcher';btn.textContent='지도 도구';btn.type='button';btn.onclick=()=>open();wrap.appendChild(btn);}}
 document.querySelectorAll('[data-ap2]').forEach(b=>b.onclick=()=>open(b.dataset.ap2));
 mapReady();bindSearch();applyPins();
}
function median(a){if(!a.length)return null;a=a.slice().sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
async function race(){
 var dest=panel?.querySelector('#s2RaceOutput');if(!dest)return;
 var pair=rivals.map(k=>D.find(d=>key(d)===k));
 if(pair.some(x=>!x)||key(pair[0])===key(pair[1])){dest.innerHTML='<p>서로 다른 두 단지를 선택하세요.</p>';return;}
 if(Math.abs(pair[0].py-pair[1].py)>Math.max(2,pair[0].py*.12)){dest.innerHTML='<p>평형 차이가 큽니다. ±12% 이내의 유사 평형을 선택하세요.</p>';return;}
 dest.textContent='공통 전용면적대의 실거래를 조회하고 있습니다…';
 try{
  if(!window.aptLkey){await new Promise((yes,no)=>{var s=document.createElement('script');s.src='/apt-dx.js?v=15';s.onload=yes;s.onerror=no;document.head.appendChild(s);});}
  const api=await Promise.all(pair.map(async d=>{
   const k=window.aptLkey(d);if(!k)return null;
   const res=await fetch('/api/apt-dx?k='+encodeURIComponent(k));if(!res.ok)return null;
   const j=await res.json();return j?.t||[];
  }));
  if(api.some(x=>!x)){dest.innerHTML='<p>해당 단지의 실거래를 확보하지 못했습니다.</p>';return;}
  const bucket=t=>Math.round(t[1]/5)*5;
  const good=(rows,d)=>rows.filter(t=>Array.isArray(t)&&!t[4]&&t[2]>2&&t[3]>0&&Math.abs(t[1]-d.py*3.3058*.76)<=9);
  const pools=api.map((rows,i)=>good(rows,pair[i]));
  const common=[...new Set(pools[0].map(bucket))].filter(x=>pools[1].some(t=>bucket(t)===x));
  if(!common.length){dest.innerHTML='<p>두 단지의 공통 실거래 전용면적대가 없습니다.</p>';return;}
  const target=pair.reduce((sum,d)=>sum+d.py*3.3058*.76,0)/2;
  common.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));
  const selectedArea=common[0],minDate=Date.now()-548*864e5;
  const data=pools.map(rows=>{
   const result={};
   for(const t of rows){
    if(bucket(t)!==selectedArea)continue;
    const dt=String(t[0]);if(!/^\d{8}$/.test(dt))continue;
    const day=Date.UTC(+dt.slice(0,4),+dt.slice(4,6)-1,+dt.slice(6,8));
    if(day<minDate||day>Date.now())continue;
    const quarter=dt.slice(0,4)+' '+Math.ceil(+dt.slice(4,6)/3)+'분기';
    (result[quarter]=result[quarter]||[]).push(t[3]);
   }
   return result;
  });
  if(!dest.isConnected)return;
  if(data.some(x=>!x)){dest.innerHTML='<p>해당 단지의 실거래 자료가 부족합니다.</p>';return;}
  var quarters=Object.keys(data[0]).filter(k=>data.every(d=>(d[k]||[]).length>=2)).sort().reverse().slice(0,6).reverse();
  if(!quarters.length){dest.innerHTML='<p>최근 18개월 동안 같은 면적대·같은 분기에 양쪽 각각 2건 이상의 거래가 없어 비교를 보류합니다.</p>';return;}
  dest.innerHTML='<p><b>공통 전용 '+selectedArea+'㎡대 · 최근 18개월</b></p><table style="width:100%;font-size:12px;text-align:left"><thead><tr><th>분기</th><th>'+esc(name(pair[0]))+'</th><th>'+esc(name(pair[1]))+'</th></tr></thead><tbody>'
    +quarters.map(k=>'<tr><td>'+k+'</td>'+data.map(d=>'<td>'+eokSafe(median(d[k]))+' <small>('+d[k].length+'건)</small></td>').join('')+'</tr>').join('')+'</tbody></table>'
    +'<p>공통 5㎡ 면적대의 분기별 중위값입니다. 동·층·향 차이는 보정하지 않았습니다.</p>';
 }catch(e){if(dest.isConnected)dest.innerHTML='<p>실거래 자료를 확인하지 못했습니다.</p>';}
}
function clearFilters(){filter={rentMin:0,gapMax:0,ratioMin:0,ratioMax:0,tradeMin:0,days:0};}
function reset(){clearFilters();indicator='base';resetMeasure();applyPins();}
async function searchAll(button, query){
 const out=button.parentElement.querySelector('#searchAllResults');
 button.disabled=true;
 out.textContent='다른 가격대를 확인하는 중…';
 try{
  const p=new URLSearchParams({q:query,cap:String(CAPT)});
  const response=await fetch('/api/apt-first?'+p);
  if(!response.ok)throw Error('search unavailable');
  const {results,partial}=await response.json();
  if(!out.isConnected)return;
  if(!results.length)out.textContent=partial?'일부 가격대를 확인하지 못했습니다. 잠시 후 다시 검색하세요.':'다른 가격대에도 일치하는 단지가 없습니다.';
  else{
   const labels={6:'6억 이하',10:'6~10억',15:'10~15억',20:'15~20억',25:'20~25억',30:'25~30억',35:'30억 이상'};
   out.innerHTML='<ul>'+results.map(([cap,name,area,py,price,key])=>{
    const url=new URL('/',location.origin);
    url.searchParams.set('cap',String(cap));
    url.hash=encodeURIComponent(key+'|'+py);
    return '<li><a href="'+esc(url.pathname+url.search+url.hash)+'">'+esc(name)+' '+py+'평 · '+esc(eok(price))+' · '+labels[cap]+'</a><br><small>'+esc(area)+'</small></li>';
   }).join('')+'</ul>'+(partial?'<small>일부 가격대는 조회되지 않았습니다.</small>':'');
  }
 }catch(e){out.textContent='전체 가격대 검색을 불러오지 못했습니다. 다시 시도하세요.';}
 finally{button.disabled=false;}
}
window.APT2={searchAll,install,open,passes,inUse,clearFilters,remember,mapReady,applyPins,reset,importShare,searchIndex};
install();
})();
