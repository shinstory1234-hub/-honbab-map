/**
 * 카카오 로컬 API → SQLite 음식점 수집 파이프라인
 *
 * 사용법:
 *   KAKAO_REST_API_KEY=<키> node scripts/collect-kakao.mjs
 *
 * .env.local에 KAKAO_REST_API_KEY가 있으면 자동으로 읽습니다.
 */

import { createDbAdapter } from './db-adapter.mjs'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// ===== .env.local 자동 로드 =====
function loadEnv() {
  const envPath = '.env.local'
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

const KAKAO_KEY = process.env.KAKAO_REST_API_KEY
if (!KAKAO_KEY) {
  console.error('오류: 환경변수 KAKAO_REST_API_KEY가 없습니다.')
  console.error('  KAKAO_REST_API_KEY=<키> node scripts/collect-kakao.mjs')
  process.exit(1)
}

// ===== 설정 =====
const RADIUS      = 500   // 검색 반경 (m) — 500m (밀집 지역 누락 방지)
const LAT_STEP    = 0.004 // 격자 간격 위도 (~444m, 반경과 겹치도록)
const LNG_STEP    = 0.005 // 격자 간격 경도 (~443m @서울 위도)
const MAX_PAGE    = 3     // 카카오 API 최대 페이지
const PAGE_SIZE   = 15    // 카테고리 검색 최대 size (1~15), 3페이지 × 15 = 45개/격자
const DELAY_MS    = 150   // 요청 간 딜레이 (ms)
const CHECKPOINT  = './data/checkpoint.json'
const SAVE_EVERY  = 20    // N개 격자마다 체크포인트 저장

// ===== 수집 대상 지역 바운딩 박스 =====
const REGIONS = [
  { name: '서울',   lat: [37.413, 37.715], lng: [126.734, 127.269] },
  { name: '인천',   lat: [37.279, 37.631], lng: [126.392, 126.976] },
  { name: '고양',   lat: [37.586, 37.737], lng: [126.730, 126.965] },
  { name: '부천',   lat: [37.462, 37.545], lng: [126.748, 126.900] },
  { name: '성남',   lat: [37.340, 37.480], lng: [127.058, 127.212] },
  { name: '대전',   lat: [36.193, 36.478], lng: [127.284, 127.565] },
  { name: '대구',   lat: [35.771, 35.972], lng: [128.490, 128.755] },
  { name: '광주',   lat: [35.073, 35.270], lng: [126.754, 126.988] },
  { name: '부산',   lat: [35.018, 35.398], lng: [128.817, 129.318] },
  { name: '순천',   lat: [34.837, 34.990], lng: [127.380, 127.628] },
  { name: '광양',   lat: [34.878, 35.130], lng: [127.528, 127.798] },
]

// ===== 격자 생성 =====
function buildGrid(regions) {
  const grid = []
  for (const region of regions) {
    const [latMin, latMax] = region.lat
    const [lngMin, lngMax] = region.lng

    for (let lat = latMin; lat <= latMax + 1e-9; lat = +(lat + LAT_STEP).toFixed(7)) {
      for (let lng = lngMin; lng <= lngMax + 1e-9; lng = +(lng + LNG_STEP).toFixed(7)) {
        grid.push({ lat: +lat.toFixed(6), lng: +lng.toFixed(6), region: region.name })
      }
    }
  }
  return grid
}

// ===== 체크포인트 =====
function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return new Set()
  try {
    const { completed } = JSON.parse(readFileSync(CHECKPOINT, 'utf-8'))
    return new Set(completed)
  } catch {
    return new Set()
  }
}

function saveCheckpoint(completed) {
  writeFileSync(CHECKPOINT, JSON.stringify({ completed: [...completed] }, null, 0))
}

// ===== 카카오 API =====
async function fetchPage(lat, lng, page) {
  const params = new URLSearchParams({
    category_group_code: 'FD6',
    x: String(lng),
    y: String(lat),
    radius: String(RADIUS),
    page: String(page),
    size: String(PAGE_SIZE),
    sort: 'distance',
  })

  const res = await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${params}`, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 120)}`)
  }

  return res.json()
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ===== 진행률 표시 =====
function printProgress({ region, cellsDone, total, inserted, dup, lat, lng }) {
  const pct = ((cellsDone / total) * 100).toFixed(1)
  process.stdout.write(
    `\r[${region}] ${cellsDone}/${total} (${pct}%) | 신규: ${inserted.toLocaleString()} | 중복: ${dup.toLocaleString()} | 현재: ${lat},${lng}   `
  )
}

// ===== 메인 =====
async function main() {
  const db = createDbAdapter()
  db.init()

  const grid      = buildGrid(REGIONS)
  const completed = loadCheckpoint()
  const remaining = grid.filter((c) => !completed.has(`${c.lat},${c.lng}`))
  const total     = remaining.length

  console.log(`격자 총 ${grid.length.toLocaleString()}개 | 완료: ${completed.size.toLocaleString()}개 | 남은: ${total.toLocaleString()}개`)
  if (total === 0) {
    console.log('모든 격자 수집 완료. 종료합니다.')
    db.close()
    return
  }

  let inserted  = 0
  let dup       = 0
  let cellsDone = 0
  let errorCnt  = 0

  for (const cell of remaining) {
    const key = `${cell.lat},${cell.lng}`

    for (let page = 1; page <= MAX_PAGE; page++) {
      try {
        const json   = await fetchPage(cell.lat, cell.lng, page)
        const places = json.documents ?? []

        for (const place of places) {
          const ok = db.upsert({
            place_id:            place.id,
            place_name:          place.place_name,
            category_name:       place.category_name,
            category_group_code: place.category_group_code,
            category_group_name: place.category_group_name,
            phone:               place.phone,
            address_name:        place.address_name,
            road_address_name:   place.road_address_name,
            x:                   place.x,
            y:                   place.y,
            place_url:           place.place_url,
          })
          ok ? inserted++ : dup++
        }

        // 결과가 size보다 적거나 is_end이면 다음 페이지 없음
        if (places.length < PAGE_SIZE || json.meta?.is_end) break

        await sleep(DELAY_MS)
      } catch (err) {
        errorCnt++
        // 오류 격자는 스킵하고 계속 진행
        process.stdout.write(`\n[오류] 격자 ${key} 페이지 ${page}: ${err.message}\n`)
        break
      }
    }

    completed.add(key)
    cellsDone++

    if (cellsDone % SAVE_EVERY === 0) saveCheckpoint(completed)

    printProgress({ region: cell.region, cellsDone, total, inserted, dup, lat: cell.lat, lng: cell.lng })

    await sleep(DELAY_MS)
  }

  saveCheckpoint(completed)
  console.log(`\n\n수집 완료!`)
  console.log(`  신규 삽입: ${inserted.toLocaleString()}개`)
  console.log(`  중복 스킵: ${dup.toLocaleString()}개`)
  if (errorCnt) console.log(`  오류 격자: ${errorCnt}개 (체크포인트 미저장 → 재실행 시 재시도됨)`)

  db.close()
}

main().catch((err) => {
  console.error('\n치명적 오류:', err)
  process.exit(1)
})
