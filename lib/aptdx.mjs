// (lib) 단지 상세 실거래·하락 레이스 — realestate-media Supabase 읽기 전용 함수(aptmap_dx, aptmap_race) 호출.
// 2026.11.16 리치고 차용 기능. 첫 화면 전송량과 무관: 단지를 눌렀을 때(dx)·하락순 정렬을 골랐을 때(race)만 불림.
// 공개(publishable) 키 — 함수 2개 실행 권한만 있음(실거래 원표는 RLS로 막혀 있음).
import { loadLivePrices } from './live6-match.mjs';

const SB = 'https://qyojvynvdbpkheizrgln.supabase.co/rest/v1/rpc/';
const KEY = 'sb_publishable_cn49xNe-8Qh8wPc-PpORsQ_qQjxO2R-';

async function rpc(fn, body) {
  const r = await fetch(SB + fn, {
    method: 'POST',
    headers: { apikey: KEY, authorization: 'Bearer ' + KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) throw new Error(fn + ' ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}

// 원본 주소·평형별 거래 건수 및 계약일을 대조한 별칭.
const ALIASES = new Map([
  ['41173|비산동|은하수샛별5,6단지', '41173|비산동|샛별한양6(고층1109)'],
  ['41173|비산동|비산동 은하수한양', '41173|비산동|은하수마을한양'],
  ['41173|비산동|샛별한양2,3단지', '41173|비산동|샛별한양4-2'],
  ['41173|관양동|관양동 공작부영', '41173|관양동|공작아파트'],
  ['41173|관양동|관양동 한가람신라', '41173|관양동|한가람(신라)'],
  ['41173|관양동|한가람한양', '41173|관양동|한가람(한양)'],
  ['41173|평촌동|초원7단지부영', '41173|평촌동|초원부영'],
  ['41210|하안동|하안주공3단지', '41210|하안동|주공3'],
  ['41410|산본동|산본주공11단지', '41410|산본동|주공11'],
  ['11350|상계동|상계주공2단지', '11350|상계동|상계주공2(고층)'],
  ['11350|상계동|상계주공3단지', '11350|상계동|상계주공3(고층)'],
  ['11350|상계동|상계주공9단지', '11350|상계동|상계주공9(고층)'],
  ['11350|상계동|상계주공10단지', '11350|상계동|상계주공10(고층)'],
  ['11350|상계동|상계주공11단지', '11350|상계동|상계주공11(고층)'],
  ['11350|상계동|상계주공12단지', '11350|상계동|상계주공12(고층)'],
  ['11350|상계동|상계주공13단지', '11350|상계동|상계주공13(고층)'],
  ['11350|상계동|상계주공14단지', '11350|상계동|상계주공14(고층)'],
]);

function keyParts(k) {
  const [sgg, dong, ...rest] = String(k).split('|');
  return [sgg, dong, rest.join('|')];
}

function comparisonName(name, dong) {
  const prefix = dong.split(' ')[0] + ' ';
  if (name.startsWith(prefix)) name = name.slice(prefix.length);
  return name.replace(/\s+/g, '').replace(/아파트$/, '').replace(/(\d)단지$/, '$1');
}

export function detailSourceKey(k, catalog) {
  const [sgg, dong, name] = keyParts(k);
  const nameKey = comparisonName(name, dong);
  // 읍·면만 남은 표시 주소에서 같은 법정리를 찾는다. 법정리가 지정된
  // 경우에는 그대로 유지하고, 시군구 변경도 확인된 개편 코드에 한정한다.
  const moved = (sgg === '41591' && /^(봉담읍|비봉면)( |$)/.test(dong)) ? '41593'
    : (sgg === '28155' && dong === '가정동') ? '28275' : null;
  let match = null;
  for (const source of catalog) {
    const [code, locality, title] = keyParts(source);
    if (code !== sgg && code !== moved) continue;
    if (locality !== dong && !(/[읍면]$/.test(dong) && locality.startsWith(dong + ' '))) continue;
    if (comparisonName(title, locality) !== nameKey) continue;
    if (match !== null) return null;
    match = source;
  }
  return match;
}

export async function loadDetailCatalog() {
  return Object.keys((await loadLivePrices()).LIVEP);
}

async function readDx(k) {
  const [sgg, dong, name] = keyParts(k);
  if (!/^\d{5}$/.test(sgg || '') || !dong || !name) throw new Error('bad key');
  const j = await rpc('aptmap_dx', { p_sgg: sgg, p_dong: dong, p_name: name });
  if (!Array.isArray(j?.t)) throw new Error('invalid detail response');
  // 거래: [yyyymmdd, 전용㎡(소수 1자리), 층, 만원, 직거래 1/0]
  return { ...j, t: j.t.map(r => [r[0], Math.round(Number(r[1]) * 10) / 10, r[2], Number(r[3]), r[4]]) };
}

// 별칭의 평형을 합치지 않는다. 원본 키로 거래가 조회되면 바로 반환한다.
export async function buildDx(k, getCatalog = loadDetailCatalog) {
  const key = ALIASES.get(k) || k;
  const detail = await readDx(key);
  if (detail.t.length) return key === k ? detail : { ...detail, sourceKey: key };

  const source = detailSourceKey(key, await getCatalog());
  if (!source || source === key) return detail;
  const recovered = await readDx(source);
  return recovered.t.length ? { ...recovered, sourceKey: source } : detail;
}

// {키: [[평, 직전 2년 최고가, 최근 3개월 중위, 최근 3개월 건수], ...]} — 평형별, 최근 3개월 2건 이상만
export async function buildRace() {
  const j = await rpc('aptmap_race2', {});
  const out = {};
  for (const [k, v] of Object.entries(j || {})) out[k] = (v || []).map(r => [r[0], Number(r[1]), Number(r[2]), r[3]]);
  return out;
}
