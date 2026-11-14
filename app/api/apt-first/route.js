// 첫 화면 미리보기(2026.11.11): 휴대폰 계산이 끝나기 전에 기본 순위 목록을 바로 보여 주는 작은 스크립트.
// 브라우저와 같은 코드·같은 데이터(입지 고정값·현재 시세)로 서버가 한 번 계산하고, CDN이 1시간(만료 후 하루는 이전 값 즉시) 캐시한다.
import path from 'node:path';
import { unstable_cache } from 'next/cache';
import { buildLive6 } from '../../../lib/live6.mjs';
import { previewHTML, previewScript } from '../../../lib/apt-preview.mjs';

export const maxDuration = 60;
export const preferredRegion = 'icn1';

const UP = 'https://realestate-media.vercel.app/api/backtest';
const CAPS = new Set([6, 10, 15, 20, 25, 30, 35]);

async function text(url) {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.text();
}

/* 속도(2026.11.15): 미리보기 계산(서버에서 3~6초)을 Vercel 데이터 캐시에 보관 — 전 지역·배포 간 공유, 10분 지나면 이전 값을 바로 주고 뒤에서 다시 계산.
   예전엔 배포 직후나 지역 CDN 캐시가 비면 첫 화면 목록이 4~6초 늦게 떴음(실측 6억 4.2초·6~10억 5.9초). 6억 탭 시세는 자기 API를 HTTP로 다시 부르지 않고 직접 계산 */
async function buildPreview(cap) {
  const [geo, live] = await Promise.all([text(`${UP}/aptgeo?export=js`), cap > 6 ? text(`${UP}/aptlive`) : buildLive6()]);
  const { html, pins, key } = previewHTML(path.join(process.cwd(), 'public'), cap, { geo, live, withPins: true });
  return previewScript(html, pins, key);
}
const cachedPreview = unstable_cache(buildPreview, ['apt-first-v1'], { revalidate: 600 });

export async function GET(request) {
  const cap = Number(new URL(request.url).searchParams.get('cap')) || 6;
  const js = (body, cache) => new Response(body, { headers: {
    'content-type': 'application/javascript; charset=utf-8', 'cache-control': cache,
  } });
  if (!CAPS.has(cap)) return js('', 'public, max-age=0, s-maxage=86400');
  try {
    return js(await cachedPreview(cap), 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('apt-first preview failed', cap, e);
    // 실패해도 지도는 평소대로 뜬다(미리보기만 생략). 짧게 캐시해 곧 다시 시도
    return js('', 'public, max-age=0, s-maxage=60');
  }
}
