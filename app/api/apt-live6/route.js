// 6억 이하 탭 현재 시세 — 계산은 lib/live6.mjs.
// 속도(2026.11.15): 결과를 Vercel 데이터 캐시(전 지역·배포 간 공유)에 10분 보관 + 만료 뒤엔 이전 값을 즉시 주고 뒤에서 갱신.
// 예전엔 배포 직후·지역 CDN 캐시가 비면 매번 상위 1.5MB를 받아 다시 계산했음. 함수는 서울(icn1)에서 실행.
import { unstable_cache } from 'next/cache';
import { buildLive6 } from '../../../lib/live6.mjs';

export const maxDuration = 60;
export const preferredRegion = 'icn1';

const cachedLive6 = unstable_cache(buildLive6, ['apt-live6-v1'], { revalidate: 600 });

export async function GET() {
  const js = (body, cache) => new Response(body, { headers: {
    'content-type': 'application/javascript; charset=utf-8', 'cache-control': cache,
  } });
  try {
    return js(await cachedLive6(), 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('apt-live6 failed', e);
    // 실패하면 고정 시세로 그대로 뜬다(apt-curlive.js가 LIVEP 없으면 아무것도 안 함)
    return js('', 'public, max-age=0, s-maxage=60');
  }
}
