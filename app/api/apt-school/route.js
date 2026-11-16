/* 한국교육시설안전원 2026-09-20 초등학교 통학구역 공식 SHP 대사.
 * 대표 위치 좌표와 공식 폴리곤의 공간 포함 여부를 사전 계산했다.
 * 5,340개 단지 키를 FNV-1a(UTF-8) 해시로 압축하고 후보를 개별 조회한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
export const preferredRegion = 'icn1';
let index;
function schoolIndex() {
  if (index) return index;
  const chunks = Array.from({ length: 7 }, (_, i) =>
    fs.readFileSync(path.join(process.cwd(), 'lib', 'apt-schoolzone-202609.br.part' + i))
  );
  index = JSON.parse(brotliDecompressSync(Buffer.concat(chunks)).toString('utf8'));
  return index;
}
function hashKey(key) {
  let h = 2166136261;
  for (const byte of Buffer.from(key, 'utf8')) h = Math.imul(h ^ byte, 16777619) >>> 0;
  return h;
}
function lookup(key) {
  const idx = schoolIndex(), a = idx.m, k = hashKey(key);
  let lo = 0, hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m][0] < k) lo = m + 1;
    else hi = m;
  }
  if (lo >= a.length || a[lo][0] !== k) return null;
  const z = idx.z[a[lo][1]];
  return [{ z: z[0], s: z[1], type: z[2], id: z[3] }];
}
export function GET(req) {
  const k = new URL(req.url).searchParams.get('k') || '';
  if (k.length > 180) return Response.json({ error: 'bad key' }, { status: 400 });
  try {
    const zones = lookup(k);
    return Response.json({
      asOf: '2026-09-20',
      source: '한국교육시설안전원 초등학교 통학구역 공간정보',
      sourceUrl: 'https://schoolzone.emac.kr/publicData/publicDataList.do',
      zones, matched: !!zones,
      caveat: '아파트 대표좌표 기준 공간대사입니다. 경계, 공동학구 및 입학시점에 따라 달라질 수 있어 교육지원청 최종 확인이 필요합니다.'
    }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=2592000' } });
  } catch (e) {
    console.error('apt school zone unavailable', e);
    return Response.json({ error: '학교 학구도 자료를 불러올 수 없습니다.' }, { status: 503 });
  }
}
