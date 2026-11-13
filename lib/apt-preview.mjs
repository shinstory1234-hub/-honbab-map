// 첫 화면 미리보기(2026.11.11): 휴대폰이 수천 개 평형 점수를 다 계산할 때까지(5~10초) 빈 화면이던 문제.
// 서버가 같은 코드·같은 데이터로 한 번 계산한 기본 목록 HTML을 미리 내려주고, 휴대폰 계산이 끝나면 그 결과로 교체한다.
// 순위 규칙은 브라우저와 100% 같은 코드(apt-assets)를 그대로 실행하므로 따로 관리할 산식이 없다.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

export function previewHTML(publicDir, cap, inject = {}) {
  const noop = () => {};
  const mkEl = () => ({ style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, setAttribute: noop, removeAttribute: noop, hasAttribute: () => false, getAttribute: () => '',
    scrollIntoView: noop, querySelector: () => null, querySelectorAll: () => [], appendChild: noop, append: noop, innerHTML: '', textContent: '' });
  const els = new Map();
  const get = s => { const k = String(s).replace(/^#/, ''); if (!els.has(k)) els.set(k, mkEl()); return els.get(k); };
  const c = {
    console: { log: noop, warn: noop, info: noop, error: noop }, URL, URLSearchParams, performance,
    location: { search: `?cap=${cap}&ok=1`, href: `https://aptmap-kr.vercel.app/?cap=${cap}`, pathname: '/', hash: '' },
    history: { replaceState: noop, pushState: noop },
    localStorage: { getItem: () => null, setItem: noop }, sessionStorage: { getItem: () => null, setItem: noop },
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop, requestAnimationFrame: noop, cancelAnimationFrame: noop,
    addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), innerHeight: 800, innerWidth: 1280,
    fetch: () => new Promise(noop),
    document: { getElementById: get, querySelector: get, querySelectorAll: () => [], createElement: mkEl, head: mkEl(), body: mkEl(), addEventListener: noop, title: '' },
  };
  c.window = c; c.parent = c; c.self = c; vm.createContext(c);

  const html = fs.readFileSync(path.join(publicDir, 'apt-map-fast.html'), 'utf8');
  const boot = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('var F='));
  if (!boot) throw new Error('loader not found');
  const files = [];
  c.document.write = s => { for (const m of s.matchAll(/src="([^"]+)"/g)) files.push(m[1]); };
  vm.runInContext(boot, c);
  for (const f of files) {
    let code;
    if (f === 'apt-geo.js') code = inject.geo ?? 'window.GEOFIX={};';
    else if (f === 'apt-live.js' || f === 'apt-live6.js') code = inject.live ?? '';
    else code = fs.readFileSync(path.join(publicDir, f), 'utf8');
    // 메인 스크립트는 화면 시작(바텀시트·지도 초기화) 앞까지만: 계산과 목록 그리기 함수까지 실행
    if (code.includes('function recompute()')) code = code.split('let qT=null;')[0] + '\nvar inMetroP=(la,ln)=>la>36.85&&la<38.3&&ln>126.3&&ln<127.95;';
    vm.runInContext(code, c, { filename: f });
  }
  vm.runInContext('updatePins=()=>{}; recompute(); renderList();', c);
  const out = get('body').innerHTML;
  if (!out || !out.includes('class="row"')) throw new Error('empty preview');
  if (!inject.withPins) return out;
  // 지도 핀(2026.11.11): 브라우저 renderMap과 같은 순서(점수 높은 순, 같은 단지는 한 번)·같은 좌표 규칙
  const pins = JSON.parse(vm.runInContext(`(()=>{ const idx=D.map((d,i)=>i).sort((a,b)=>D[b].score-D[a].score), seen=new Set(), out=[];
    for(const i of idx){ const d=D[i]; if(!visible(d,false)) continue; const k=complexRankKey(d); if(seen.has(k)) continue;
      const g=GEO[gkey(d)]; const lat=d.lat||(g&&g.lat), lng=d.lat?d.lng:(g&&g.lng); if(!lat||!inMetroP(lat,lng)) continue;
      seen.add(k); out.push([+lat.toFixed(5),+lng.toFixed(5),d.rank,short(cashOf(d)),d.s||'',d.tier.c]); if(out.length>=${PIN_MAX}) break; }
    return JSON.stringify(out); })()`, c));
  // 처음 보이는 범위: 브라우저 init과 같이 위치가 있는 모든 단지를 담는 범위(핀 수 제한과 무관) — 계산 끝나고 지도가 튀지 않게
  const bounds = JSON.parse(vm.runInContext(`(()=>{ let a=90,b=180,c2=-90,d2=-180; for(const d of D){ const g=GEO[gkey(d)]; const la=d.lat||(g&&g.lat), ln=d.lat?d.lng:(g&&g.lng); if(!la||!inMetroP(la,ln)) continue; a=Math.min(a,la); b=Math.min(b,ln); c2=Math.max(c2,la); d2=Math.max(d2,ln); } return JSON.stringify(a<90?[a,b,c2,d2]:null); })()`, c));
  if (bounds) pins.bounds = bounds;
  return { html: out, pins, key: vm.runInContext('KAKAO_JS_KEY', c) };
}
const PIN_MAX = 1500;

// 브라우저에서 바로 실행되는 작은 스크립트로 감싼다. 이미 진짜 목록이 그려졌으면 아무것도 안 함
export function previewScript(bodyHTML, pins = null, key = '') {
  // id=aptLoading 유지: 자료 불러오기 실패 시 기존 오류 문구가 이 자리에 뜸. 계산 전엔 눌러도 반응 없게(data-pre는 render()가 지움)
  const note = '<style>#body[data-pre] .row,#body[data-pre] button,#body[data-pre] details{pointer-events:none}</style>'
    + '<div id="aptLoading" class="inline-note" role="status" style="margin:12px 16px 0">순위 불러오는 중 · 잠시 뒤 단지를 눌러 상세를 볼 수 있어요</div>';
  return `(function(){try{var b=document.getElementById('body');if(!b||!document.getElementById('aptLoading'))return;`
    + `if(location.hash||/[?&]q=/.test(location.search))return;`
    + `b.setAttribute('data-pre','');b.style.cursor='progress';b.innerHTML=${JSON.stringify(note + bodyHTML)};}catch(e){}})();`
    + (pins && pins.length && key ? pinScript(pins, key) : '');
}

// 지도 미리보기: 카카오 지도를 먼저 띄우고 서버가 계산한 핀을 브라우저와 같은 겹침 규칙으로 표시.
// 계산이 끝나면 본 화면이 같은 지도(window.__preMap.map)를 이어받고 미리보기 핀은 지움 — 지도가 다시 그려지거나 튀지 않음
function pinScript(pins, key) {
  return `;(function(){try{
var P=${JSON.stringify(pins)},BB=${JSON.stringify(pins.bounds || null)},K=${JSON.stringify(key)},sp=new URLSearchParams(location.search);
if(location.hash||sp.has('q')||sp.has('vlat')||window.__preMap)return;
var el=document.getElementById('map');if(!el)return;
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
function go(){kakao.maps.load(function(){
 if(window.__aptEngineMap)return;
 var mob=matchMedia('(max-width:767px)').matches,map=new kakao.maps.Map(el,{center:new kakao.maps.LatLng(37.45,127.0),level:9}),ovs=[],moved=false,pos=P.map(function(p){return new kakao.maps.LatLng(p[0],p[1]);});
 var B=new kakao.maps.LatLngBounds();if(BB){B.extend(new kakao.maps.LatLng(BB[0],BB[1]));B.extend(new kakao.maps.LatLng(BB[2],BB[3]));}else pos.forEach(function(x){B.extend(x);});if(pos.length)map.setBounds(B,60,40,mob?150:40,40);
 function draw(){var pr=map.getProjection(),W=el.clientWidth,H=el.clientHeight,far=map.getLevel()>8,pw=far?78:116,ph=far?30:40,placed=[],cand=0,n=0;
  ovs.forEach(function(o){o.setMap(null);});ovs=[];
  for(var i=0;i<P.length;i++){var q=pr.containerPointFromCoords(pos[i]);if(!(q.x>-pw&&q.x<W+pw&&q.y>-ph&&q.y<H+ph*2))continue;cand++;
   if(!((!far||cand<=300)&&n<400))continue;var r=[q.x-pw/2,q.y-ph-6,q.x+pw/2,q.y-6],hit=false;
   for(var j=0;j<placed.length;j++){var t=placed[j];if(r[0]<t[2]&&r[2]>t[0]&&r[1]<t[3]&&r[3]>t[1]){hit=true;break;}}if(hit)continue;placed.push(r);n++;
   var d=document.createElement('div');d.className='mk'+(far?' far':'');d.style.setProperty('--chip',P[i][5]);
   d.innerHTML='<div><span class="sc">'+P[i][2].toLocaleString()+'위</span><span><b>'+P[i][3]+'</b><small>'+esc(P[i][4])+'</small></span></div>';
   var o=new kakao.maps.CustomOverlay({position:pos[i],content:d,xAnchor:0,yAnchor:0,zIndex:P.length-i});o.setMap(map);ovs.push(o);}
  var c=document.getElementById('mapcount');if(c)c.textContent='순위 불러오는 중';}
 var off=function(){moved=true;};kakao.maps.event.addListener(map,'dragstart',off);kakao.maps.event.addListener(map,'zoom_changed',function(){if(window.__preMapSettled)moved=true;});
 kakao.maps.event.addListener(map,'idle',function(){window.__preMapSettled=true;if(window.__preMap&&window.__preMap.live)draw();});
 window.__preMap={map:map,live:true,moved:function(){return moved;},clear:function(){this.live=false;ovs.forEach(function(o){o.setMap(null);});ovs=[];kakao.maps.event.removeListener(map,'dragstart',off);}};
 draw();
});}
if(window.kakao&&kakao.maps&&kakao.maps.load)go();else{var s=document.createElement('script');s.src='https://dapi.kakao.com/v2/maps/sdk.js?appkey='+K+'&libraries=services&autoload=false';s.onload=go;document.head.appendChild(s);window.__aptSdk=s;}
}catch(e){}})();`;
}
