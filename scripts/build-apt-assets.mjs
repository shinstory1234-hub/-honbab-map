import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';

// Keep apt-map.html as the editable source. Production serves the generated page.
export function buildAptAssets(root, output = path.join(root, 'public')) {
  const sourceDir = path.join(root, 'public');
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
  const main = writeAsset("if(window.__aptLoadFailed) throw new Error('Apartment data failed to load');\n"+app.slice(consentEnd), ['apt-map.html:application']);
  const isolated = /^apt-(?:invest\d+|s4q\d*)\.js$/;
  for (const cap of [6, 10, 15, 20, 25, 30]) {
    const files = [];
    const context = {URLSearchParams, location: {search: `?cap=${cap}`}, document: {
      write(html) { files.push(...[...html.matchAll(/src="([^"]+)"/g)].map(m => m[1])); },
      getElementById() { return null; }
    }};
    context.window = context;
    vm.runInNewContext(bootstrap[1], context);
    const ordered = files.flatMap(file => file === 'apt-picks10.js'
      ? [file, `apt-invest${cap}.js`, 'apt-research-over6-top100.js', 'apt-invest-ui.js']
      : file === 'apt-first.js' ? [] : [file]);
    const urls = []; let chunk = [], names = [];
    const flush = () => { if (chunk.length) urls.push(writeAsset(chunk.join('\n;\n'), names)); chunk = []; names = []; };
    for (const file of ordered) {
      // These URLs are rewritten to live upstream data. Never freeze them at build time.
      if (file === 'apt-live.js' || file === 'apt-live6.js' || file === 'apt-geo.js') { flush(); urls.push(file); continue; }
      let code = fs.readFileSync(path.join(sourceDir, file), 'utf8');
      if (file === 'apt-picks10.js') code = code.replace(/^if\(document\.write\).*$/m, '');
      if (/document\.write\s*\(/.test(code)) throw new Error(`Unexpanded script dependency: ${file}`);
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
  const loading = '<div id="aptLoading" role="status" class="inline-note" style="margin:24px">아파트 자료를 불러오고 있습니다…</div>';
  let html = source.replace('<div class="body" id="body"></div>', `<div class="body" id="body">${loading}</div>`);
  html = html.replace(bootstrap[0], `<script>\n${consent}\n${loader}\n</script>`).replace(application[0], '');
  html = html.replaceAll('apt-map.html', '/');
  html = html.replace('<link rel="stylesheet" href=', '<link rel="stylesheet" media="print" onload="this.media=\'all\'" href=');
  const key = /const KAKAO_JS_KEY='([^']+)'/.exec(app)?.[1];
  if (key) html = html.replace('</head>', `<link rel="preload" as="script" href="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&amp;libraries=services&amp;autoload=false">\n</head>`);
  fs.writeFileSync(path.join(output, 'apt-map-fast.html'), html);
  fs.writeFileSync(path.join(assets, 'manifest.json'), JSON.stringify({manifest, inventory}, null, 2));
  return {manifest, inventory, html};
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
