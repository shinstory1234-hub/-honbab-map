// 하락 레이스(정렬에서 '최고가 대비 하락순'을 골랐을 때만 호출) — 계산은 lib/aptdx.mjs.
// DB 집계가 4초 걸려서 데이터 캐시 6시간 + CDN 6시간, 만료 뒤엔 이전 값 즉시 응답.
import { unstable_cache } from 'next/cache';
import { buildRace } from '../../../lib/aptdx.mjs';

export const preferredRegion = 'icn1';
export const maxDuration = 60;

const cached = unstable_cache(buildRace, ['apt-race-v3'], { revalidate: 21600 });

export async function GET() {
  const json = (body, status, cache) => new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': cache,
  } });
  try {
    return json(await cached(), 200, 'public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('apt-race failed', e);
    return json({}, 502, 'public, max-age=0, s-maxage=60');
  }
}
