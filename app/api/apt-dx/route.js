// 단지 상세 실거래(단지를 눌렀을 때만 호출) — 계산은 lib/aptdx.mjs.
// 복원된 역사적 거래 반영: 별도 캐시 버전과 15분 서버 캐시 / 5분 CDN 캐시.
import { unstable_cache } from 'next/cache';
import { buildDx, loadDetailCatalog } from '../../../lib/aptdx.mjs';

export const preferredRegion = 'icn1';
export const maxDuration = 30;

const catalog = unstable_cache(loadDetailCatalog, ['apt-dx-live-catalog'], { revalidate: 3600 });
const cached = unstable_cache(k => buildDx(k, catalog), ['apt-dx-source-key-v1'], { revalidate: 900 });

export async function GET(req) {
  const k = new URL(req.url).searchParams.get('k') || '';
  const json = (body, status, cache) => new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': cache,
  } });
  if (k.length > 120 || !/^\d{5}\|[^|]+\|.+$/.test(k)) return json({ error: 'bad key' }, 400, 'no-store');
  try {
    const detail = await cached(k);
    const cache = detail.t.length ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' : 'public, s-maxage=60';
    return json(detail, 200, cache);
  } catch (e) {
    console.error('apt-dx failed', k, e);
    return json({ error: 'unavailable' }, 502, 'no-store');
  }
}
