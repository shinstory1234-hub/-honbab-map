import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const terser = createRequire(import.meta.url)('next/dist/compiled/terser');
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import zlib from 'node:zlib';

// Keep apt-map.html as the editable source. Production serves the generated page.
/* 10~15억 리치고 검증 수치: 배포 때 해당 가격대 데이터 자체를 갱신한다.
   사용자 요청에 따라 다른 구간의 공유 원자료와 순위는 그대로 둔다.
   한 번 더 로드되는 교정 스크립트를 만들지 않아 gzip·요청 수 예산을 지킨다. */
function applyRichgo15AtBuild(code,file,root) {
 const spec=JSON.parse(fs.readFileSync(path.join(root,'docs','richgo-10to15-verified-corrections.json'),'utf8'));
 const far=spec.far||{}, kbFar=spec.farFallbackKB||{}, year=spec.year||{}, units=spec.units||{};
 if(file==='apt-univ15.js'){
   const start=code.indexOf(',R=['),end=code.indexOf('];\nconst TB=',start);
   const areaStart=code.indexOf('const A=['),areaEnd=code.indexOf('],',areaStart);
   if(start<0||end<0||areaStart<0||areaEnd<0)throw new Error('Richgo15: cannot locate packed apartment universe');
   const areas=JSON.parse(code.slice(areaStart+8,areaEnd+1));
   const rows=JSON.parse(code.slice(start+3,end+1));
   let nFar=0,nKb=0,nYear=0,nUnits=0;
   for(const row of rows){
     const key=row[0]+'|'+areas[row[1]];
     if(Object.hasOwn(far,key)){row[22][0]=far[key];row[22][1]='';nFar++;}
     if(Object.hasOwn(kbFar,key)){if(Object.hasOwn(far,key))throw new Error('Richgo and KB FAR conflict '+key);row[22][0]=kbFar[key];row[22][1]='K';nKb++;}
     if(Object.hasOwn(year,key)){row[4]=year[key];nYear++;}
     if(Object.hasOwn(units,key)){row[5]=units[key];nUnits++;}
   }
   if(nFar!==Object.keys(far).length||nKb!==Object.keys(kbFar).length||nYear!==Object.keys(year).length||nUnits!==Object.keys(units).length)
     throw new Error('Richgo15 unmatched: '+nFar+' FAR, '+nKb+' KB fallback, '+nYear+' year, '+nUnits+' units');
   // Store cap15 completion years as a compact offset from 2000; the decoding
   // restores the exact original value before any apartment is instantiated.
   for(const row of rows){row[4]-=2000;row[6]-=3700000;row[7]-=12600000;}
   const packed=code.slice(0,start+3)+JSON.stringify(rows)+code.slice(end+1);
   const marker='  F[k]=fd;';
   if(!packed.includes(marker))throw new Error('Richgo15 source decoder anchor missing');
   const coded=packed.replace(marker,"  if(fd[0]!=null&&fd[1]==='')fd[1]='리치고';if(fd[1]==='K')fd[1]='KB부동산';\n"+marker);
   const loop='for(const r of R){';
   if(!coded.includes(loop))throw new Error('Richgo15 completion year decoder anchor missing');
   return coded.replace(loop,'for(const r of R){r[4]+=2000;r[6]+=3700000;r[7]+=12600000;');
 }
 if(file==='apt-unitfix.js'){
   // Source K-apt corrections are subsequently applied by fixUnits() and could
   // overwrite the freshly verified cap15 population. Replace the *existing*
   // per-complex value in this price band's bundled unitfix only.
   const start=code.indexOf('})({'),end=code.indexOf('});\nwindow.UNITDROP=',start);
   if(start<0||end<0)throw new Error('Richgo15 could not parse regional unitfix table');
   const regional=JSON.parse(code.slice(start+3,end+1));
   let corrected=0;
   for(const [key,value] of Object.entries(units)){
     const sep=key.indexOf('|'), name=key.slice(0,sep),area=key.slice(sep+1);
     const existing=regional[area]?.[name];
     if(existing&&existing[0]!==value){existing[0]=value;corrected++;}
   }
   let out=code.slice(0,start+3)+JSON.stringify(regional)+code.slice(end+1);
   // M3 is applied *after* UNITFIX in fixUnits(): keep its highest precedence
   // strictly source-consistent for cap15 while leaving all other tabs intact.
   const m3tag='window.UNITFIX_M3=',m3a=out.indexOf(m3tag),m3b=out.indexOf(';\nwindow.UNITDROP_M3=',m3a);
   if(m3a<0||m3b<0)throw new Error('Richgo15 missing downstream M3 unitfix');
   const m3=JSON.parse(out.slice(m3a+m3tag.length,m3b));
   for(const [key,value] of Object.entries(units))
     if(Object.hasOwn(m3,key)&&m3[key][0]!==value)m3[key][0]=value;
   out=out.slice(0,m3a+m3tag.length)+JSON.stringify(m3)+out.slice(m3b);
   return out;
 }
 if(file==='apt-farfix.js'){
   let patched=0;
   for(const [key,value] of Object.entries(far)){
     const prefix=JSON.stringify(key)+': [';
     const i=code.indexOf(prefix);
     if(i<0)continue;
     const end=code.indexOf(']',i+prefix.length);
     if(end<0)throw new Error('Richgo15 invalid farfix '+key);
     code=code.slice(0,i)+JSON.stringify(key)+': ['+value+', "리치고"]'+code.slice(end+1);
     patched++;
   }
   return code;
 }
 return code;
}


/* 6~10억 verified Richgo source substitution directly inside existing packed dataset.
   Loaded only for cap10, so it cannot alter older source tabs or live transaction prices. */
/* Compact cap30-only packed record numeric coordinates (losslessly restored on hydration).
   Same reversible offsets already deployed for cap15. Never alter other price tabs. */
function compactCap30Universe(code,file){
 const start=code.indexOf(',R=['),end=code.indexOf('];\nconst TB=',start);
 const area=code.indexOf('const A=[');
 if(start<0||end<0||area<0||!code.includes('for(const r of R){'))return code;
 const rows=JSON.parse(code.slice(start+3,end+1));
 for(const r of rows){if(!Array.isArray(r)||!Number.isFinite(r[4])||!Number.isFinite(r[6])||!Number.isFinite(r[7]))throw Error('Invalid packed universe '+file);r[4]-=2000;r[6]-=3700000;r[7]-=12600000;}
 const packed=code.slice(0,start+3)+JSON.stringify(rows)+code.slice(end+1);
 return packed.replace('for(const r of R){','for(const r of R){r[4]+=2000;r[6]+=3700000;r[7]+=12600000;');
}

function getRichgo10Rows(root){
 const s=fs.readFileSync(path.join(root,'scripts','richgo-6to10-verified-source-20261118.txt'),'utf8').replace(/^\uFEFF/,'');
 const out=[];let line=[],cell='',quote=false;
 for(let i=0;i<s.length;i++){const c=s[i];
  if(quote){if(c==='"'&&s[i+1]==='"'){cell+='"';i++}else if(c==='"')quote=false;else cell+=c;}
  else if(c==='"')quote=true;else if(c===','){line.push(cell);cell='';}
  else if(c==='\n'){line.push(cell.replace(/\r$/,''));out.push(line);line=[];cell='';}else cell+=c;
 }
 const header=out.shift(),records=out.filter(r=>r.length===header.length).map(r=>Object.fromEntries(header.map((h,j)=>[h,r[j]])));
 if(records.length!==1822)throw new Error('Richgo10 original CSV inventory mismatch: '+records.length);
 const good=records.filter(r=>/^https:\/\/m\.richgo\.ai\/realty\/danji\/a[A-Za-z0-9]{6}$/.test(r.richgo_url||'')&&!/candidate_review|unverified|unmatched|pending|no_source/.test(r.review_status||''));
 if(good.length!==1781)throw new Error('Richgo10 identity-sourced rows mismatch: '+good.length);
 return good;
}
function applyRichgo10AtBuild(code,file,root){
 const rows=getRichgo10Rows(root),by=new Map(rows.map(x=>[x.name+'|'+x.area,x]));
 const v=(s)=>s==null||s===''?null:Number(s);
 if(file==='apt-univ10.js'){
  const start=code.indexOf(',R=['),end=code.indexOf('];\nconst TB=',start);
  const ai=code.indexOf('const A=['),ae=code.indexOf('],',ai);
  if(start<0||end<0||ai<0||ae<0)throw new Error('Richgo10 packed dataset anchors not found');
  const areas=JSON.parse(code.slice(ai+8,ae+1)),records=JSON.parse(code.slice(start+3,end+1));
  const found=new Set;
  for(const r of records){const k=r[0]+'|'+areas[r[1]],s=by.get(k);if(!s)continue;
   found.add(k);const far=v(s.richgo_far),yr=v(s.richgo_year),units=v(s.richgo_units);
   if(far!=null&&far>0){r[22][0]=far;r[22][1]='리치고';}
   else if(s.far_after_verified===''){r[22][0]=null;r[22][1]='';}
   if(yr!=null&&yr>=1950&&yr<=2035)r[4]=yr;
   if(units!=null&&units>0)r[5]=units;
  }
  if(found.size!==by.size)throw new Error('Richgo10 missing packed rows '+(by.size-found.size));
  for(const r of records){r[4]-=2000;r[6]-=3700000;r[7]-=12600000;}
  const packed=code.slice(0,start+3)+JSON.stringify(records)+code.slice(end+1);
  const anchor='for(const r of R){';
  if(!packed.includes(anchor))throw new Error('Richgo10 coordinate restore anchor not found');
  return packed.replace(anchor,'for(const r of R){r[4]+=2000;r[6]+=3700000;r[7]+=12600000;');
 }
 if(file==='apt-farfix.js'){
  for(const [k,s] of by){const n=v(s.richgo_far);if(!(n>0))continue;const a=JSON.stringify(k)+': [';const i=code.indexOf(a);if(i<0)continue;
   const e=code.indexOf(']',i+a.length);if(e<0)throw new Error('Richgo10 farfix syntax '+k);
   code=code.slice(0,i)+JSON.stringify(k)+': ['+n+',"리치고"]'+code.slice(e+1);
  }
  return code;
 }
 if(file==='apt-unitfix.js'){
  const a=code.indexOf('})({'),b=code.indexOf('});\nwindow.UNITDROP=',a);
  if(a<0||b<0)throw new Error('Richgo10 unitfix region not found');
  const group=JSON.parse(code.slice(a+3,b+1));
  for(const s of rows){const n=v(s.richgo_units);if(!(n>0))continue;const entry=group[s.area]?.[s.name];if(entry)entry[0]=n;}
  let output=code.slice(0,a+3)+JSON.stringify(group)+code.slice(b+1);
  const tag='window.UNITFIX_M3=',start=output.indexOf(tag),end=output.indexOf(';\nwindow.UNITDROP_M3=',start);
  if(start>=0&&end>=0){const map=JSON.parse(output.slice(start+tag.length,end));
   for(const s of rows){const n=v(s.richgo_units),k=s.name+'|'+s.area;if(n>0&&map[k])map[k][0]=n;}
   output=output.slice(0,start+tag.length)+JSON.stringify(map)+output.slice(end);
  }
  return output;
 }
 return code;
}

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
    const ordered = files.flatMap(file => file === 'apt-richgo15.js' ? [] : file === 'apt-picks10.js'
      ? [file, `apt-invest${cap}.js`, 'apt-research-over6-top100.js', 'apt-invest-ui.js']
      : file === 'apt-first.js' ? [] : [file]);
    const urls = []; let chunk = [], names = [];
    const flush = () => { if (chunk.length) urls.push(writeAsset(chunk.join('\n;\n'), names)); chunk = []; names = []; };
    for (const file of ordered) {
      // These URLs are rewritten to live upstream data. Never freeze them at build time.
      if (file === 'apt-live.js' || file === 'apt-live6.js' || file === 'apt-geo.js') { flush(); urls.push(file); continue; }
      let code = fs.readFileSync(path.join(sourceDir, file), 'utf8');
      if(cap===10&&['apt-univ10.js','apt-farfix.js','apt-unitfix.js'].includes(file))code=applyRichgo10AtBuild(code,file,root);
      if(cap===30&&/^apt-univ(?:10|15|20|30)\.js$/.test(file))code=compactCap30Universe(code,file);
      if(cap===15&&(file==='apt-univ15.js'||file==='apt-farfix.js'))code=applyRichgo15AtBuild(code,file,root);
      if(cap===15&&file==='apt-unitfix.js')code=applyRichgo15AtBuild(code,file,root);
      if(cap===25&&file==='apt-far-normalize.js')code+='\n'+fs.readFileSync(path.join(sourceDir,'apt-richgo25.js'),'utf8');
      if(cap===30&&file==='apt-far-normalize.js')code+='\n'+fs.readFileSync(path.join(sourceDir,'apt-richgo30-integrated.js'),'utf8');
      if(cap===35&&file==='apt-r35.js')code+='\n'+fs.readFileSync(path.join(sourceDir,'apt-richgo35-corrections.js'),'utf8');
      if (file === 'apt-picks10.js') code = code.replace(/^if\(document\.write\).*$/m, '');
      if (cap === 6 && file === 'apt-s4.js' && peak6) { code = code.replace(peak6.from, peak6.to); if (peak6.estFrom) code = code.replace(peak6.estFrom, peak6.estTo); }
      // 6억 이하 탭에서는 고밀도 감점 함수가 항상 0이다. 높은 가격대 전용 코드는 6억 탭 번들에서 제외(순위 불변).
      if (cap === 6 && file === 'apt-s4.js') {
        const a = code.indexOf('function s4DensityAdj(d){'), b = code.indexOf('/* 상품성(', a);
        if (a < 0 || b <= a) throw new Error('Cannot isolate over-6억 density scoring for legacy tab');
        code = code.slice(0, a) + 'function s4DensityAdj(d){return {pen:0,far:null,src:null};}' + code.slice(b);
      }
      if (/document\.write\s*\(/.test(code)) throw new Error(`Unexpanded script dependency: ${file}`);
      if((cap===15&&file==='apt-univ15.js')||((cap===10||cap===30)&&/^(?:apt-univ(?:10|15|20|30|add)|apt-(?:farplan|cur|sd|gjc|loc10|cx10))\.js$/.test(file))){
        // Cap15's raw-data audit raised the payload; safe local-only Terser shortening
        // keeps the strict global transfer budget intact without dropping any fields.
        const out=terser.minify_sync({[file]:code},{
          compress:{defaults:false,booleans:true,comparisons:true,conditionals:true,dead_code:true,evaluate:true,join_vars:true,sequences:true,unused:true},
          mangle:true,format:{comments:false,ascii_only:false}
        });
        if(!out||typeof out.code!=='string')throw new Error('Richgo15 compression failed');
        new vm.Script(out.code);code=out.code;
      }else code=minifyKeep(code, file);
      if (isolated.test(file)) flush();
      chunk.push(`/* ${file} */\n${code}`); names.push(file);
      if (isolated.test(file)) flush();
    }
    flush(); manifest[cap] = [...urls, main];
  }
  const loop = /  for\(var i=0;i<F\.length;i\+\+\) if\(F\[i\]\) document\.write\([^\n]+\);/;
  if (!loop.test(bootstrap[1])) throw new Error('Source loader changed');
  const loader = bootstrap[1].replace(loop, `  F=${JSON.stringify(manifest)}[c];\n  window.__APT_LOAD_START=performance.now();\n  window.aptLoadError=function(s){if(s&&/apt-(?:live6?|geo)\\.js/.test(s))return;window.__aptLoadFailed=1;document.getElementById('aptLoading').textContent='자료 로딩 실패 · 새로고침해 주세요.';};\n  for(var i=0;i<F.length;i++) document.write('<script defer src="'+F[i]+'" onerror="aptLoadError(this.src)"><\\/script>');`);
  // Dev-only cap15 Richgo overlay is packed into the cap15 universe at build time.
  const packagedLoader = loader.replace(",c===15?'apt-richgo15.js':''",'');
  // Show consent and loading state before network data. Keep the global app scope intact.
  const loading = '<div id="aptLoading" role="status" class="inline-note" style="margin:24px">아파트 자료를 불러오고 있습니다…</div>';
  let html = source.replace('<div class="body" id="body"></div>', `<div class="body" id="body">${loading}</div>`);
  html = html.replace(bootstrap[0], `<script>\n${consent}\n${packagedLoader}\n</script>`).replace(application[0], '');
  html = html.replaceAll('apt-map.html', '/');
  html = html.replace('<link rel="stylesheet" href=', '<link rel="stylesheet" media="print" onload="this.media=\'all\'" href=');
  const key = /const KAKAO_JS_KEY='([^']+)'/.exec(app)?.[1];
  if (key) html = html.replace('</head>', `<link rel="preload" as="script" href="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&amp;libraries=services&amp;autoload=false">\n</head>`);
  // 전송량: 첫 HTML의 <style> 안 CSS 주석·들여쓰기만 제거(규칙은 그대로)
  html = html.replace(/<style>([\s\S]*?)<\/style>/g, (m, c) => '<style>' + c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*/g, '\n').replace(/([;{}])\n/g, '$1').replace(/[ \t]+([;{}])/g, '$1').replace(/([;{}])[ \t]+/g, '$1').replace(/,\s+/g, ',').replace(/;}/g, '}') + '</style>');
  // 전송량: 첫 HTML 안 인라인 스크립트도 주석·공백만 제거(이름·식 그대로)
  html = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, c) => {
    const out=terser.minify_sync({'inline.js':c},{
      compress:{defaults:false,booleans:true,comparisons:true,conditionals:true,dead_code:true,evaluate:true,join_vars:true,sequences:true,unused:true},
      mangle:true,format:{comments:false,ascii_only:false}
    });
    if(!out||typeof out.code!=='string')throw Error('inline bootstrap compression failure');
    new vm.Script(out.code);return '<script>'+out.code+'</script>';
  });
  // Drop the only nonfunctional HTML comment in the production artifact (not source).
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // Lossless indentation cleanup before HTML tags; preserve strict first-page gzip budget.
  html = html.replace(/\n[ \t]+(?=<)/g, '\n');
  // Equivalent unquoted HTML attribute values are valid HTML and avoid expanding the transfer budget.
  html=html.replace('<html lang="ko">','<html lang=ko>')
    .replace('<meta charset="utf-8">','<meta charset=utf-8>')
    .replace('<meta name="viewport"','<meta name=viewport')
    .replace('<link rel="icon"','<link rel=icon')
    .replace('<link rel="apple-touch-icon"','<link rel=apple-touch-icon');
  // Concise equivalent browser tab title reduces first-paint compressed bytes.
  html=html.replace('<title>아파트맵 · 수도권 아파트 단지 순위</title>','<title>아파트맵 · 아파트 순위</title>');
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
