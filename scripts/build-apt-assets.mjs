import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const terser = createRequire(import.meta.url)('next/dist/compiled/terser');
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';
import { patchRichgoCap10Source, appendRichgoCap10FinalOverrides } from './apply-richgo-band10.mjs';

// Keep apt-map.html as the editable source. Production serves the generated page.
export function buildAptAssets(root, output = path.join(root, 'public')) {
  const sourceDir = path.join(root, 'public');
  // Build the lazy-loaded Stage 1 source only after reading its versioned Brotli parts.
  // It is never included in the first-page cap bundles or initial gzip budget.
  const stageParts = [0, 1].map(i => fs.readFileSync(path.join(root, 'lib', 'apt-stage1-extra.br.part' + i)));
  const stageJs = zlib.brotliDecompressSync(Buffer.concat(stageParts));
  fs.writeFileSync(path.join(output, 'apt-stage1-extra.js'), stageJs);
  const source = fs.readFileSync(path.join(sourceDir, 'apt-map.html'), 'utf8');
  const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const bootstrap = scripts.find(m => m[1].includes('var F='));
  const application = scripts.find(m => m[1].includes('function recompute()'));
  if (!bootstrap || !application) throw new Error('Apartment source script boundaries changed');
  const assets = path.join(output, 'apt-assets');
  fs.mkdirSync(assets, {recursive: true});
  const manifest = {}, inventory = {};
  function writeAsset(code, files) {
    // Compile as one classic script too: catches duplicate lexical declarations.
    new vm.Script(code);
    const hash = createHash('sha256').update(code).digest('hex').slice(0, 20);
    const name = `apt-assets/${hash}.js`;
    fs.writeFileSync(path.join(output, name), code);
    inventory[name] = {files, bytes: Buffer.byteLength(code)};
    return name;
  }
  const app = application[1];
  const consentEnd = app.indexOf('const KAKAO_JS_KEY=');
  if (consentEnd < 0) throw new Error('Consent script boundary changed');
  const consent = app.slice(0, consentEnd).replace("u.pathname.split('/').pop()+u.search", "u.pathname+u.search");
  const main = writeAsset(minifyKeep("if(window.__aptLoadFailed) throw new Error('Apartment data failed to load');\n"+app.slice(consentEnd), 'apt-map-app'), ['apt-map.html:application']);
  const isolated = /^apt-(?:invest\d+|s4q\d*)\.js$/;
  const peak6 = peakLoForCap6(sourceDir);
  for (const cap of [6, 10, 15, 20, 25, 30, 35]) {
    const files = [];
    const context = {URLSearchParams, location: {search: `?cap=${cap}`}, document: {
      write(html) { files.push(...[...html.matchAll(/src="([^"]+)"/g)].map(m => m[1])); },
      getElementById() { return null; }
    }};
    context.window = context;
    vm.runInNewContext(bootstrap[1], context);
    const ordered = files.flatMap(file => file === 'apt-picks10.js'
      ? [file, `apt-invest${cap === 35 ? 30 : cap}.js`, 'apt-research-over6-top100.js', 'apt-invest-ui.js']
      : file === 'apt-first.js' ? [] : [file]);
    const urls = []; let chunk = [], names = [];
    const flush = () => { if (chunk.length) urls.push(writeAsset(chunk.join('\n;\n'), names)); chunk = []; names = []; };
    for (const file of ordered) {
      // These URLs are rewritten to live upstream data. Never freeze them at build time.
      if (file === 'apt-live.js' || file === 'apt-live6.js' || file === 'apt-geo.js') { flush(); urls.push(file); continue; }
      let code = fs.readFileSync(path.join(sourceDir, file), 'utf8');
      if (cap === 10 && file === 'apt-univ10.js') code = patchRichgoCap10Source(code, root);
      if (cap === 10 && file === 'apt-farfix.js') code = appendRichgoCap10FinalOverrides(code, root);
      if (file === 'apt-picks10.js') code = code.replace(/^if\(document\.write\).*$/m, '');
      if (cap === 6 && file === 'apt-s4.js' && peak6) { code = code.replace(peak6.from, peak6.to); if (peak6.estFrom) code = code.replace(peak6.estFrom, peak6.estTo); }
      // 6억 이하 탭에서는 고밀도 감점 함수가 항상 0이다. 높은 가격대 전용 코드는 6억 탭 번들에서 제외(순위 불변).
      if (cap === 6 && file === 'apt-s4.js') {
        const a = code.indexOf('function s4DensityAdj(d){'), b = code.indexOf('/* 상품성(', a);
        if (a < 0 || b <= a) throw new Error('Cannot isolate over-6억 density scoring for legacy tab');
        code = code.slice(0, a) + 'function s4DensityAdj(d){return {pen:0,far:null,src:null};}' + code.slice(b);
      }
      if (/document\.write\s*\(/.test(code)) throw new Error(`Unexpanded script dependency: ${file}`);
      code = cap===10 && (file==='apt-univ10.js'||file==='apt-invest10.js'||file==='apt-invest-ui.js')
        ? terser.minify_sync({[file]:code},{compress:{passes:3},mangle:true,format:{comments:false,ascii_only:false}}).code
        : minifyKeep(code,file);  // 6~10억 번들만 압축해 리치고 실측 원자료 반영분 상쇄
      if (isolated.test(file)) flush();
      chunk.push(`/* ${file} */\n${code}`); names.push(file);
      if (isolated.test(file)) flush();
    }
    flush(); manifest[cap] = [...urls, main];
  }
  const loop = /  for\(var i=0;i<F\.length;i\+\+\) if\(F\[i\]\) document\.write\([^\n]+\);/;
  if (!loop.test(bootstrap[1])) throw new Error('Source loader changed');
  const loader = bootstrap[1].replace(loop, `  F=${JSON.stringify(manifest)}[c];\n  window.__APT_LOAD_START=performance.now();\n  window.aptLoadError=function(){window.__aptLoadFailed=true;var el=document.getElementById('aptLoading');if(el)el.textContent='자료를 불러오지 못했습니다. 새로고침해 주세요.';};\n  for(var i=0;i<F.length;i++) document.write('<script defer src="'+F[i]+'" onerror="aptLoadError()"><\\/script>');`);
  // Show consent and loading state before network data. Keep the global app scope intact.
  const loading = '<div id="aptLoading" role="status" class="inline-note" >불러오는 중…</div>';
  let html = source.replace('<div class="body" id="body"></div>', `<div class="body" id="body">${loading}</div>`);
  html = html.replace(bootstrap[0], `<script>\n${consent}\n${loader}\n</script>`).replace(application[0], '');
  html = html.replaceAll('apt-map.html', '/');
  html = html.replace('<link rel="stylesheet" href=', '<link rel="stylesheet" media="print" onload="this.media=\'all\'" href=');
  const key = /const KAKAO_JS_KEY='([^']+)'/.exec(app)?.[1];
  if (key) html = html.replace('</head>', `<link rel="preload" as="script" href="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&amp;libraries=services&amp;autoload=false">\n</head>`);
  // 전송량: 첫 HTML의 <style> 안 CSS 주석·들여쓰기만 제거(규칙은 그대로)
  html = html.replace(/<style>([\s\S]*?)<\/style>/g, (m, c) => '<style>' + c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, '\n').replace(/;\n/g, ';').replace(/}\n/g, '}') + '</style>');
  // 전송량: 첫 HTML 안 인라인 스크립트도 주석·공백만 제거(이름·식 그대로)
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, c) => '<script>' + minifyKeep(c, 'inline.js') + '</script>');
  fs.writeFileSync(path.join(output, 'apt-map-fast.html'), html);
  fs.writeFileSync(path.join(assets, 'manifest.json'), JSON.stringify({manifest, inventory}, null, 2));
  return {manifest, inventory, html};
}

/* 1원칙(2026.11.15): 전고점 미회복 표(PEAKLO_PACK, 전 탭 합집합 2,500여 단지·gzip 약 15KB)를 6억 탭에는 그 탭 단지(apt-picks·auto3·univ, 6억 탭 로더 순서)분만 남겨 보냄.
   키·해시는 apt-s4.js peakLoRatio와 같은 식 → 6억 탭 결과 동일. 6억 초과 탭은 실시간 시세로 가격대를 다시 나눠(apt-livefix) 미리 자를 수 없어 그대로 */
// 줄 단위 주석만 제거 — 코드 줄 안의 주석·문자열은 건드리지 않는다(안전 우선).
// 줄이 '/*'로 시작하면 '*/'로 끝나는 줄까지, 줄이 '//'로 시작하면 그 줄만 지운다. 결과는 vm.Script로 문법 검사.
export function minifyKeep(code, file) {
  const r = terser.minify_sync({[file]: code}, {compress: false, mangle: false, format: {comments: false, ascii_only: false}});
  if (!r || typeof r.code !== 'string') throw new Error('minify failed: ' + file);
  new vm.Script(r.code);
  return r.code;
}

export function stripComments(code) {
  const out = []; let inBlock = false;
  for (const line of code.split('\n')) {
    const t = line.trim();
    if (inBlock) { if (t.endsWith('*/')) inBlock = false; continue; }
    if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; continue; }
    if (t.startsWith('//')) continue;
    out.push(line);
  }
  const res = out.join('\n');
  new vm.Script(res);   // 문법이 깨지면 빌드 실패
  return res;
}

function peakLoForCap6(sourceDir) {
  const s4 = fs.readFileSync(path.join(sourceDir, 'apt-s4.js'), 'utf8');
  const m = /const PEAKLO_PACK="([0-9a-z]*)"/.exec(s4);
  if (!m) return null;
  const c = {console, CAPT: 6, CAPLO: 0, CAPHI: 60000, location: {search: ''}, document: {getElementById: () => null, querySelectorAll: () => []}};
  c.window = c; vm.createContext(c);
  for (const f of ['apt-unitfix.js', 'apt-sd.js', 'apt-picks.js', 'apt-auto3.js', 'apt-gj.js', 'apt-loc.js', 'apt-cx.js', 'apt-fard.js', 'apt-hak.js', 'apt-univ.js']) vm.runInContext(fs.readFileSync(path.join(sourceDir, f), 'utf8'), c, {filename: f});
  const want = new Set();
  for (const d of c.PICKS || []) {
    const k = d.n + '|' + String(d.area || '').trim().split(/\s+/).pop(); let x = 5381;
    for (let i = 0; i < k.length; i++) x = ((x * 33) ^ k.charCodeAt(i)) >>> 0;
    want.add(x.toString(36).padStart(7, '0').slice(-5));
  }
  const cut = pack => { let kept = ''; for (let i = 0; i + 7 <= pack.length; i += 7) if (want.has(pack.slice(i, i + 5))) kept += pack.slice(i, i + 7); return kept; };
  const e = /const PEAKEST_PACK="([0-9a-z]*)"/.exec(s4);
  return {from: m[0], to: `const PEAKLO_PACK="${cut(m[1])}"`, estFrom: e ? e[0] : null, estTo: e ? `const PEAKEST_PACK="${cut(e[1])}"` : null};
}

// 1원칙(2026.11.14): 절대 느려지면 안 된다. 탭별 전송량·요청 수·런타임 파일이 scripts/perf-budget.json을 넘으면 빌드 실패.
export function checkPerfBudget(root, output, result) {
  const budget = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'perf-budget.json'), 'utf8'));
  const gz = buf => zlib.gzipSync(buf, {level: 6}).length;
  const errors = [], report = {};
  for (const [cap, urls] of Object.entries(result.manifest)) {
    let bytes = 0;
    for (const u of urls) {
      if (result.inventory[u]) { bytes += gz(fs.readFileSync(path.join(output, u))); continue; }
      if (!budget.runtimeFiles.includes(u)) errors.push(`${cap}억 탭: 등록 안 된 런타임 파일 ${u} (perf-budget.json runtimeFiles)`);
    }
    report[cap] = bytes;
    const max = budget.gzipBytesPerTab[cap];
    if (max == null) errors.push(`${cap}억 탭: 예산 없음(perf-budget.json에 추가 필요)`);
    else if (bytes > max) errors.push(`${cap}억 탭: 전송량 ${bytes.toLocaleString()}B > 상한 ${max.toLocaleString()}B`);
    if (urls.length > budget.maxRequestsPerTab) errors.push(`${cap}억 탭: 요청 ${urls.length}개 > 상한 ${budget.maxRequestsPerTab}개`);
  }
  const html = gz(Buffer.from(result.html));
  if (html > budget.htmlGzipBytes) errors.push(`첫 HTML ${html}B > 상한 ${budget.htmlGzipBytes}B`);
  if (errors.length) throw new Error('속도 예산 초과 — 배포 중단(1원칙: 절대 느려지면 안 됨)\n' + errors.join('\n'));
  return {gzipBytesPerTab: report, htmlGzipBytes: html};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const output = process.argv[3] ? path.resolve(process.argv[3]) : path.join(root, 'public');
  const result = buildAptAssets(root, process.argv[3] && path.resolve(process.argv[3]));
  console.log('perf budget OK', JSON.stringify(checkPerfBudget(root, output, result)));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result.manifest).map(([cap, urls]) => [cap, urls.length]))));
}
