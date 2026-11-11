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
    else if (f === 'apt-live.js') code = inject.live ?? '';
    else code = fs.readFileSync(path.join(publicDir, f), 'utf8');
    // 메인 스크립트는 화면 시작(바텀시트·지도 초기화) 앞까지만: 계산과 목록 그리기 함수까지 실행
    if (code.includes('function recompute()')) code = code.split('let qT=null;')[0];
    vm.runInContext(code, c, { filename: f });
  }
  vm.runInContext('updatePins=()=>{}; recompute(); renderList();', c);
  const out = get('body').innerHTML;
  if (!out || !out.includes('class="row"')) throw new Error('empty preview');
  return out;
}

// 브라우저에서 바로 실행되는 작은 스크립트로 감싼다. 이미 진짜 목록이 그려졌으면 아무것도 안 함
export function previewScript(bodyHTML) {
  // id=aptLoading 유지: 자료 불러오기 실패 시 기존 오류 문구가 이 자리에 뜸. 계산 전엔 눌러도 반응 없게(data-pre는 render()가 지움)
  const note = '<style>#body[data-pre] .row,#body[data-pre] button,#body[data-pre] details{pointer-events:none}</style>'
    + '<div id="aptLoading" class="inline-note" role="status" style="margin:12px 16px 0">순위 불러오는 중 · 잠시 뒤 단지를 눌러 상세를 볼 수 있어요</div>';
  return `(function(){try{var b=document.getElementById('body');if(!b||!document.getElementById('aptLoading'))return;`
    + `if(location.hash||/[?&]q=/.test(location.search))return;`
    + `b.setAttribute('data-pre','');b.style.cursor='progress';b.innerHTML=${JSON.stringify(note + bodyHTML)};}catch(e){}})();`;
}
