// (lib) 6억 이하 탭 현재 시세(2026.11.14 속도 보정): 상위 내보내기(aptlive?min=0, 약 1.5MB·전국 오피스텔 포함)에서
// 6억 탭 단지(apt-picks.js·apt-auto3.js) 키만 골라 보낸다. 키 규칙은 public/apt-curlive.js와 같음(시군구|동|단지명, 고층 별칭).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import '../public/apt-price-evidence.js';
import { matchLive } from './live6-match.mjs';


const UP = 'https://realestate-media.vercel.app/api/backtest/aptlive?min=0';
const ALIASES = {
  '상계주공14|서울 노원구 상계동': '11350|상계동|상계주공14(고층)',
  '상계주공10|서울 노원구 상계동': '11350|상계동|상계주공10(고층)',
  '상계주공2|서울 노원구 상계동': '11350|상계동|상계주공2(고층)',
  '주공8|광명시 하안동': '41210|하안동|주공8(고층)',
  '비산동 은하수한양|안양 동안구 비산동': '41173|비산동|은하수마을한양',
  '송내동 우성|부천 소사구 송내동': '41194|송내동|우성',
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

// 실패하면 throw — 호출한 쪽에서 처리
export async function buildLive6() {
  const r = await fetch(UP, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(55_000) });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const c = {}; c.window = c;
  vm.runInNewContext(await r.text(), c);
  const all = c.LIVEP || {}, want = keys();
  const { out: m, sources } = matchLive(all, want);   // 읍·면 '리' 표기, 시군구 개편 코드 차이까지 맞춤(lib/live6-match.mjs)
  // 속도: 6억 넘는 평형은 6억 탭에서 안 쓰므로 뺌. 전부 6억 넘으면 '탭에서 빠짐' 판단용으로 가장 싼 평형 1개만 남김(gzip 약 −17%)
  const out = {};
  for (const [k, rows] of Object.entries(m)) {
    const verified = globalThis.APT_PRICE_EVIDENCE.eligible(sources[k], rows);
    const { rows: valid } = globalThis.APT_PRICE_QUALITY.review(verified);
    if (!valid.length) { out[k] = []; continue; } // 철회·검증 보류 시 정적 시세 복귀 금지
    const b = valid.filter(x => x[1] > 0 && x[1] <= 60000);
    out[k] = b.length ? b : [valid.reduce((a, x) => x[1] < a[1] ? x : a)];
  }
  return `window.LIVEP=${JSON.stringify(out)};window.LIVEP_AT=${JSON.stringify(c.LIVEP_AT || null)};`;
}
// 단지 목록 파일(FILES) 내용 해시 — 캐시 키용
export function live6Version() {
  const h = createHash('sha1'), pub = path.join(process.cwd(), 'public');
  for (const f of FILES) { try { h.update(fs.readFileSync(path.join(pub, f))); } catch {} }
  // Vercel unstable_cache는 배포 간 공유된다. 목록 데이터뿐 아니라
  // 라이브 가격 필터·이름 별칭 매칭 코드 변경 때도 키가 바뀌어야 한다.
  h.update(fs.readFileSync(path.join(pub, 'apt-price-evidence.js')));
  h.update(buildLive6.toString());
  h.update(matchLive.toString());
  h.update(globalThis.APT_PRICE_QUALITY.matcher.toString());
  h.update(globalThis.APT_PRICE_QUALITY.review.toString());
  return h.digest('hex').slice(0, 12);
}
