// 6억 이하 탭 현재 시세(2026.11.14 속도 보정): 상위 내보내기(aptlive?min=0, 약 1.5MB·전국 오피스텔 포함)에서
// 6억 탭 단지(apt-picks.js·apt-auto3.js) 키만 골라 보낸다. 키 규칙은 public/apt-curlive.js와 같음(시군구|동|단지명, 고층 별칭).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const maxDuration = 60;

const UP = 'https://realestate-media.vercel.app/api/backtest/aptlive?min=0';
const ALIASES = {
  '상계주공14|서울 노원구 상계동': '11350|상계동|상계주공14(고층)',
  '상계주공10|서울 노원구 상계동': '11350|상계동|상계주공10(고층)',
  '상계주공2|서울 노원구 상계동': '11350|상계동|상계주공2(고층)',
  '주공8|광명시 하안동': '41210|하안동|주공8(고층)',
};

const FILES = ['apt-unitfix.js', 'apt-sd.js', 'apt-picks.js', 'apt-auto3.js', 'apt-gj.js', 'apt-loc.js', 'apt-cx.js', 'apt-fard.js', 'apt-hak.js', 'apt-univ.js'];
let KEYS = null;
function keys() {
  if (KEYS) return KEYS;
  const pub = path.join(process.cwd(), 'public');
  const c = { console, CAPT: 6, CAPLO: 0, CAPHI: 60000, location: { search: '' }, document: { getElementById: () => null, querySelectorAll: () => [] } };
  c.window = c; c.inBand = p => p > 0 && p <= 60000;
  vm.createContext(c);
  // 6억 탭 로더(apt-map.html)에서 단지 목록(PICKS)과 시군구(FARD)를 채우는 파일들, 같은 순서
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(pub, f), 'utf8'), c, { filename: f });
  const out = new Set(), FD = c.FARD || {};
  for (const d of c.PICKS || []) {
    const k = d.n + '|' + d.area;
    if (ALIASES[k]) { out.add(ALIASES[k]); continue; }
    const sgg = FD[k] && FD[k][6];
    if (sgg) out.add(sgg + '|' + d.area.split(' ').pop() + '|' + d.n);
  }
  return (KEYS = out);
}

export async function GET() {
  const js = (body, cache) => new Response(body, { headers: {
    'content-type': 'application/javascript; charset=utf-8', 'cache-control': cache,
  } });
  try {
    const r = await fetch(UP, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(55_000) });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const c = {}; c.window = c;
    vm.runInNewContext(await r.text(), c);
    const all = c.LIVEP || {}, want = keys(), out = {};
    for (const k of want) if (all[k]) out[k] = all[k];
    return js(`window.LIVEP=${JSON.stringify(out)};window.LIVEP_AT=${JSON.stringify(c.LIVEP_AT || null)};`,
      'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('apt-live6 failed', e);
    // 실패하면 고정 시세로 그대로 뜬다(apt-curlive.js가 LIVEP 없으면 아무것도 안 함)
    return js('', 'public, max-age=0, s-maxage=60');
  }
}
