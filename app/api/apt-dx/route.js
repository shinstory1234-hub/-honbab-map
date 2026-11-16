// 단지 상세 실거래(단지를 눌렀을 때만 호출) — 계산은 lib/aptdx.mjs.
// 데이터 캐시 6시간(전 지역·배포 간 공유) + CDN 6시간, 만료 뒤엔 이전 값 즉시 응답.
import { unstable_cache } from 'next/cache';
import { buildDx } from '../../../lib/aptdx.mjs';

export const preferredRegion = 'icn1';
export const maxDuration = 30;

const cached = unstable_cache(buildDx, ['apt-dx-v2'], { revalidate: 21600 });

export async function GET(req) {
  const k = new URL(req.url).searchParams.get('k') || '';
  const json = (body, status, cache) => new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': cache,
  } });
  if (k.length > 120) return json({ error: 'bad key' }, 400, 'no-store');
  try {
    return json(await cached(k), 200, 'public, max-age=600, s-maxage=21600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('apt-dx failed', k, e);
    return json({ error: 'unavailable' }, 502, 'public, max-age=0, s-maxage=60');
  }
}
