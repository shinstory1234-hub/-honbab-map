// (lib) 단지 상세 실거래·하락 레이스 — realestate-media Supabase 읽기 전용 함수(aptmap_dx, aptmap_race) 호출.
// 2026.11.16 리치고 차용 기능. 첫 화면 전송량과 무관: 단지를 눌렀을 때(dx)·하락순 정렬을 골랐을 때(race)만 불림.
// 공개(publishable) 키 — 함수 2개 실행 권한만 있음(실거래 원표는 RLS로 막혀 있음).
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

// k = '시군구코드|법정동|단지명' (apt-curlive.js와 같은 키)
export async function buildDx(k) {
  const [sgg, dong, ...rest] = String(k).split('|');
  const name = rest.join('|');
  if (!/^\d{5}$/.test(sgg || '') || !dong || !name) throw new Error('bad key');
  const j = await rpc('aptmap_dx', { p_sgg: sgg, p_dong: dong, p_name: name });
  // 거래: [yyyymmdd, 전용㎡(소수 1자리), 층, 만원, 직거래 1/0]
  j.t = (j.t || []).map(r => [r[0], Math.round(Number(r[1]) * 10) / 10, r[2], Number(r[3]), r[4]]);
  return j;
}

// {키: [면적대, 직전 2년 최고가, 최근 3개월 중위, 최근 3개월 건수]}
export async function buildRace() {
  const j = await rpc('aptmap_race', {});
  const out = {};
  for (const [k, v] of Object.entries(j || {})) out[k] = [v[0], Number(v[1]), Number(v[2]), v[3]];
  return out;
}
