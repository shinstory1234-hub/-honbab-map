// 방문자 수(오늘/누적). 첫 화면이 다 뜬 뒤 한 번만 불림 — 화면 그리기와 무관.
// 같은 브라우저가 3분 안에 다시 오면 DB 함수(aptmap_visit)에서 안 셈.
export const preferredRegion = 'icn1';
export const maxDuration = 10;
const SB = 'https://qyojvynvdbpkheizrgln.supabase.co/rest/v1/rpc/aptmap_visit';
const KEY = 'sb_publishable_cn49xNe-8Qh8wPc-PpORsQ_qQjxO2R-';

export async function POST(req) {
  let vid = '';
  try { vid = String((await req.json()).v || '').slice(0, 40); } catch (e) {}
  const out = (b, s) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  try {
    const r = await fetch(SB, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(4000),
      headers: { apikey: KEY, authorization: 'Bearer ' + KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ p_vid: vid }),
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    // Display baseline: 90 historical visits + 510 = 600 at reset.
    // Keep original Supabase visitor events and daily counts unchanged.
    if (j && Number.isFinite(Number(j.a))) j.a = Number(j.a) + 510;
    return out(j, 200);
  } catch (e) {
    return out({}, 502);
  }
}
