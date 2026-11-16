/* 선택 단지 1곳의 보행 경로 및 15분 영역을 도로망 기준으로 조회한다.
 * OpenStreetMap Valhalla 공용 서버에 무차별 전수 요청하지 않으며 사용자 요청만 캐시.
 */
import { unstable_cache } from 'next/cache';
export const preferredRegion = 'icn1';
export const maxDuration = 25;
const BASE = 'https://valhalla1.openstreetmap.de';
const HEAD = { 'X-Client-Id': 'aptmap-kr.vercel.app (apartment walkability, user requested)' };
const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': status === 200
    ? 'public, max-age=300, s-maxage=604800, stale-while-revalidate=2592000'
    : 'no-store' }
});
function point(raw) {
  const v = String(raw || '').split(',').map(Number);
  if (v.length !== 2 || v.some(x => !Number.isFinite(x))
      || v[0] < 36.85 || v[0] > 38.3 || v[1] < 126.3 || v[1] > 127.95) return null;
  return v.map(x => Math.round(x * 100000) / 100000);
}
function distance(a, b) {
  const r = Math.PI / 180, lat = (a[0] + b[0]) / 2 * r;
  return Math.hypot((a[0] - b[0]) * 111000, (a[1] - b[1]) * 111000 * Math.cos(lat));
}
async function call(path, input) {
  const url = BASE + '/' + path + '?json=' + encodeURIComponent(JSON.stringify(input));
  const res = await fetch(url, {
    headers: HEAD, cache: 'no-store', signal: AbortSignal.timeout(13000)
  });
  if (!res.ok) throw new Error('walk service ' + res.status);
  return res.json();
}
const routeCache = unstable_cache(async (a, b) => {
  const j = await call('route', {
    locations: [{ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }],
    costing: 'pedestrian', units: 'kilometers',
    directions_options: { units: 'kilometers' }
  });
  const summary = j?.trip?.summary, leg = j?.trip?.legs?.[0];
  if (!summary || !Number.isFinite(summary.time) || !Number.isFinite(summary.length))
    throw new Error('no pedestrian route');
  return {
    minutes: Math.round(summary.time / 60 * 10) / 10,
    meters: Math.round(summary.length * 1000),
    polyline: leg?.shape || '', source: 'OpenStreetMap Valhalla'
  };
}, ['apt-walk-path-v1'], { revalidate: 604800 });
const isoCache = unstable_cache(async (a) => {
  const j = await call('isochrone', {
    locations: [{ lat: a[0], lon: a[1] }],
    costing: 'pedestrian', contours: [{ time: 15 }],
    polygons: true, generalize: 30
  });
  const geo = j?.features?.[0]?.geometry;
  if (!geo) throw new Error('no walkable contour');
  let rings = geo.type === 'Polygon' ? [geo.coordinates[0]]
    : geo.type === 'MultiPolygon' ? geo.coordinates.map(p => p[0]) : [];
  rings = rings.slice(0, 5).map(r => r
    .filter((p, i) => i % Math.max(1, Math.ceil(r.length / 400)) === 0)
    .map(p => [+p[1].toFixed(5), +p[0].toFixed(5)]))
    .filter(r => r.length >= 3);
  if (!rings.length) throw new Error('empty contour');
  return { rings, source: 'OpenStreetMap Valhalla' };
}, ['apt-walk-iso-v1'], { revalidate: 604800 });
export async function GET(req) {
  const u = new URL(req.url), a = point(u.searchParams.get('a')),
    b = point(u.searchParams.get('b')), iso = u.searchParams.get('iso') === '1';
  if (!a || (!iso && !b) || (!iso && distance(a, b) > 3500))
    return json({ error: '유효한 수도권 내 좌표가 필요합니다.' }, 400);
  try { return json(iso ? await isoCache(a) : await routeCache(a, b)); }
  catch (e) {
    console.error('apt-walk-route', e?.message);
    return json({ error: '보행 경로를 확인할 수 없습니다. 외부 서버가 일시적으로 제한되었을 수 있습니다.' }, 503);
  }
}
