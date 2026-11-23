// 첫 화면 미리보기(2026.11.11): 휴대폰 계산이 끝나기 전에 기본 순위 목록을 바로 보여 주는 작은 스크립트.
// 브라우저와 같은 코드·같은 데이터(입지 고정값·현재 시세)로 서버가 한 번 계산하고, CDN 캐시를 짧게 유지해 최근 가격 계산과 시차를 줄인다.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
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

/* 속도(2026.11.15): 미리보기 계산(서버에서 3~6초)을 Vercel 데이터 캐시에 보관 — 전 지역·배포 간 공유, 5분이 지나면 이전 값을 바로 주고 뒤에서 다시 계산.
   예전엔 배포 직후나 지역 CDN 캐시가 비면 첫 화면 목록이 4~6초 늦게 떴음(실측 6억 4.2초·6~10억 5.9초). 6억 탭 시세는 자기 API를 HTTP로 다시 부르지 않고 직접 계산 */
async function buildPreview(cap) {
  const [geo, live] = await Promise.all([text(`${UP}/aptgeo?export=js`), cap > 6 ? text(`${UP}/aptlive?priceRule=median90`) : buildLive6()]);
  const { html, pins, key, searchRows } = previewHTML(path.join(process.cwd(), 'public'), cap, { geo, live, withPins: true });
  return { script: previewScript(html, pins, key), searchRows };
}
// 캐시 키에 자산 버전(apt-assets/manifest.json = 코드·자료 내용 해시)을 넣음 — 코드·자료가 바뀐 배포 뒤 예전 순위 미리보기가 잠깐 뜨던 문제(2026.11.15 30억 탭 1위가 신반포르엘→원베일리로 바뀌어 보임) 방지
const VER = (() => { try { return createHash('sha1').update(fs.readFileSync(path.join(process.cwd(), 'public', 'apt-assets', 'manifest.json'))).digest('hex').slice(0, 12); } catch { return 'dev'; } })();
const cachedPreview = unstable_cache(buildPreview, ['apt-first-v5', VER], { revalidate: 300 });

async function searchBands(query, cap) {
  const term = query.replace(/\s+/g, '').toLocaleLowerCase();
  if (term.length < 2 || term.length > 80) return Response.json({ results: [], partial: false }, { status: 400 });
  const bands = [...CAPS].filter(band => band !== cap);
  const settled = await Promise.allSettled(bands.map(band => cachedPreview(band)));
  const found = [];
  for (const [index, result] of settled.entries()) {
    if (result.status !== 'fulfilled') continue;
    for (const row of result.value.searchRows) {
      const name = row[0].replace(/\s+/g, '').toLocaleLowerCase();
      const match = name === term ? 0 : name.startsWith(term) ? 1 : name.includes(term) ? 2 : 3;
      if (match < 3 || row[1].replace(/\s+/g, '').includes(term)) found.push([match, bands[index], ...row]);
    }
  }
  found.sort((a, b) => a[0] - b[0] || a[5] - b[5]);
  const partial = settled.some(result => result.status === 'rejected');
  return Response.json({ results: found.slice(0, 15).map(row => row.slice(1)), partial }, {
    headers: { 'cache-control': partial ? 'no-store' : 'public, max-age=60, s-maxage=180' },
  });
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const cap = Number(params.get('cap')) || 6;
  if (params.has('q')) return searchBands(params.get('q'), cap);
  const js = (body, cache) => new Response(body, { headers: {
    'content-type': 'application/javascript; charset=utf-8', 'cache-control': cache,
  } });
  if (!CAPS.has(cap)) return js('', 'public, max-age=0, s-maxage=86400');
  try {
    const { script } = await cachedPreview(cap);
    return js(script, 'public, max-age=0, s-maxage=300, stale-while-revalidate=300');
  } catch (e) {
    console.error('apt-first preview failed', cap, e);
    // 실패해도 지도는 평소대로 뜬다(미리보기만 생략). 짧게 캐시해 곧 다시 시도
    return js('', 'public, max-age=0, s-maxage=60');
  }
}
