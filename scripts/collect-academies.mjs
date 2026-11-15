#!/usr/bin/env node
/* 수도권 학원 전수 수집 (10억+ 탭 학군 점수용).
 * 카카오 로컬 카테고리 검색(AC5 학원)을 사각형 분할로 돌려 서울·경기·인천 학원을 모두 모은다.
 * 한 사각형 결과가 45건을 넘으면 4등분해 다시 조회 → 누락 없이 전수.
 * 출력: data/academies.json  [[id, lng, lat, 분류코드], ...]
 *   분류코드 M=수학, E=영어(외국어), I=입시·보습·교과, O=기타(예체능·성인 등 — 학군 집계 제외)
 * 필요: KAKAO_REST_API_KEY (GitHub Actions secret). 키는 결과에 저장하지 않는다.
 */
import fs from 'node:fs'
import path from 'node:path'

const KEY = process.env.KAKAO_REST_API_KEY
if (!KEY) { console.error('KAKAO_REST_API_KEY가 필요합니다.'); process.exit(1) }
const OUT = path.resolve('data/academies.json')
const BBOX = [126.30, 36.90, 127.90, 38.30] // 서울·경기·인천 전체
const delay = ms => new Promise(r => setTimeout(r, ms))
let calls = 0

async function search(rect, page) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json')
  url.searchParams.set('category_group_code', 'AC5')
  url.searchParams.set('rect', rect.map(v => v.toFixed(6)).join(','))
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', '15')
  for (let attempt = 0; attempt < 5; attempt++) {
    calls++
    try {
      const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
      if (res.status === 429) { await delay(2000 * 2 ** attempt); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      if (attempt === 4) throw e
      await delay(800 * 2 ** attempt)
    }
  }
}

function classify(doc) {
  const s = `${doc.category_name || ''} ${doc.place_name || ''}`
  if (/수학|매쓰|math/i.test(s)) return 'M'
  if (/영어|외국어|어학|english|잉글리시/i.test(s)) return 'E'
  if (/입시|보습|교과|종합학원|단과|논술|국어|과학/.test(s)) return 'I'
  return 'O'
}

const seen = new Map()
async function crawl(rect, depth = 0) {
  const first = await search(rect, 1)
  const total = first?.meta?.total_count ?? 0
  if (total > 45 && depth < 14) {
    const [x1, y1, x2, y2] = rect, mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    for (const r of [[x1, y1, mx, my], [mx, y1, x2, my], [x1, my, mx, y2], [mx, my, x2, y2]]) await crawl(r, depth + 1)
    return
  }
  const docs = [...(first?.documents || [])]
  for (let p = 2; p <= 3 && !(docs.length >= total); p++) {
    const more = await search(rect, p)
    docs.push(...(more?.documents || []))
    if (more?.meta?.is_end) break
  }
  for (const d of docs) if (!seen.has(d.id)) seen.set(d.id, [d.id, +(+d.x).toFixed(5), +(+d.y).toFixed(5), classify(d)])
  if (calls % 200 === 0) console.log(`calls ${calls}, academies ${seen.size}`)
}

// 위도 0.1° × 경도 0.1° 격자부터 시작(빈 칸은 1회 호출로 끝남)
for (let x = BBOX[0]; x < BBOX[2]; x += 0.1)
  for (let y = BBOX[1]; y < BBOX[3]; y += 0.1)
    await crawl([x, y, Math.min(x + 0.1, BBOX[2]), Math.min(y + 0.1, BBOX[3])])

const rows = [...seen.values()]
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(rows))
const byCls = rows.reduce((a, r) => (a[r[3]] = (a[r[3]] || 0) + 1, a), {})
console.log(`done: calls ${calls}, academies ${rows.length}`, byCls)
