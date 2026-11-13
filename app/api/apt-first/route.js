// 첫 화면 미리보기(2026.11.11): 휴대폰 계산이 끝나기 전에 기본 순위 목록을 바로 보여 주는 작은 스크립트.
// 브라우저와 같은 코드·같은 데이터(입지 고정값·현재 시세)로 서버가 한 번 계산하고, CDN이 1시간(만료 후 하루는 이전 값 즉시) 캐시한다.
import path from 'node:path';
import { previewHTML, previewScript } from '../../../lib/apt-preview.mjs';

export const maxDuration = 60;

const UP = 'https://realestate-media.vercel.app/api/backtest';
const CAPS = new Set([6, 10, 15, 20, 25, 30]);

async function text(url) {
  const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return r.text();
}

export async function GET(request) {
  const cap = Number(new URL(request.url).searchParams.get('cap')) || 6;
  const js = (body, cache) => new Response(body, { headers: {
    'content-type': 'application/javascript; charset=utf-8', 'cache-control': cache,
  } });
  if (!CAPS.has(cap)) return js('', 'public, max-age=0, s-maxage=86400');
  try {
    const [geo, live] = await Promise.all([text(`${UP}/aptgeo?export=js`), text(cap > 6 ? `${UP}/aptlive` : `${UP}/aptlive?min=0`)]);
    const { html, pins, key } = previewHTML(path.join(process.cwd(), 'public'), cap, { geo, live, withPins: true });
    return js(previewScript(html, pins, key), 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  } catch (e) {
    console.error('apt-first preview failed', cap, e);
    // 실패해도 지도는 평소대로 뜬다(미리보기만 생략). 짧게 캐시해 곧 다시 시도
    return js('', 'public, max-age=0, s-maxage=60');
  }
}
