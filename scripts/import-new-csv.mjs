import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const iconv = require('iconv-lite')

const SUPABASE_URL = 'https://wguqbwopszxayjnnueby.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'
const KAKAO_KEY = '6b2c13135baeeaddb3f9f222af85492d'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== 카카오 지오코딩 =====
async function geocode(address) {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })
    const json = await res.json()
    const doc = json.documents?.[0]
    if (!doc) return null
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) }
  } catch {
    return null
  }
}

// ===== CSV 파싱 (따옴표 처리) =====
function parseCSVLine(line) {
  const cells = []
  let cell = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuote = !inQuote }
    else if (c === ',' && !inQuote) { cells.push(cell.trim()); cell = '' }
    else { cell += c }
  }
  cells.push(cell.trim())
  return cells
}

// ===== 카테고리 매핑 =====
// 서울 CSV 업태 기준 혼밥 가능 카테고리만 포함
const HONBAB_CATS = new Set(['분식','김밥(도시락)','냉면집','패스트푸드','까페','일식','경양식'])

// honbab_level: 1=혼밥최적, 2=가능, 3=어려움
const LEVEL1 = new Set(['분식','김밥(도시락)','냉면집','패스트푸드','까페'])
const LEVEL3 = new Set(['경양식'])

// price_range: 1=저렴, 2=보통, 3=비쌈
const PRICE1 = new Set(['분식','김밥(도시락)','냉면집','패스트푸드','까페'])
const PRICE3 = new Set(['일식','경양식'])

function buildRestaurant(name, addr, cat, isIncheon = false) {
  if (!name || !addr) return null
  // 인천은 업태 없으므로 전체 포함, 서울은 혼밥 카테고리만
  if (!isIncheon && !HONBAB_CATS.has(cat)) return null

  let honbab_level = 2
  if (LEVEL1.has(cat)) honbab_level = 1
  else if (LEVEL3.has(cat)) honbab_level = 3

  let price_range = 2
  if (PRICE1.has(cat)) price_range = 1
  else if (PRICE3.has(cat)) price_range = 3

  const honbab_tags = []
  if (honbab_level === 1) honbab_tags.push('혼밥 손님 많음')

  return { name, address: addr, category: cat || '기타', honbab_level, price_range, honbab_tags }
}

// ===== 인천 CSV 파싱 (컬럼: 관할기관, 업소명, 업종, 업소주소) =====
function parseIncheon() {
  const buf = readFileSync('C:/Users/신경승/honbab-map/인천광역시_일반음식점현황_20260115.csv')
  const text = iconv.decode(buf, 'euc-kr')
  const lines = text.split('\n').filter(l => l.trim())
  const results = []
  const seen = new Set()

  for (const line of lines.slice(1)) {
    const r = line.split(',')
    const name = r[1]?.trim()
    const addr = r[3]?.trim()
    const item = buildRestaurant(name, addr, '기타', true) // 인천은 업태 없음 → 전체 포함
    if (!item) continue
    const key = `${name}|${addr}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push(item)
  }
  return results
}

// ===== 서울 CSV 파싱 (공통 포맷: 영업상태명[4], 도로명주소[12], 사업장명[14], 업태구분명[18]) =====
function parseSeoul(filename) {
  const buf = readFileSync(`C:/Users/신경승/honbab-map/${filename}`)
  const text = iconv.decode(buf, 'euc-kr')
  const lines = text.split('\n').filter(l => l.trim())
  const results = []
  const seen = new Set()

  for (const line of lines.slice(1)) {
    const r = parseCSVLine(line)
    const status = r[4]?.trim()
    if (status === '폐업') continue

    const name = r[14]?.trim()
    const addr = r[12]?.trim()
    const cat = r[18]?.trim() || '한식'
    if (!addr) continue

    const item = buildRestaurant(name, addr, cat, false)
    if (!item) continue
    const key = `${name}|${addr}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push(item)
  }
  return results
}

// ===== 데이터 수집 =====
console.log('CSV 파싱 중...')
const incheon = parseIncheon()
const seoulYD = parseSeoul('restaurant-data-seoul yeongdeungpo.csv')
const seoul = parseSeoul('서울시 일반음식점 인허가 정보.csv')

const allRestaurants = [...incheon, ...seoulYD, ...seoul]
// 전체 중복 제거
const finalSeen = new Set()
const candidates = allRestaurants.filter(r => {
  const key = `${r.name}|${r.address}`
  if (finalSeen.has(key)) return false
  finalSeen.add(key)
  return true
})

console.log(`인천: ${incheon.length}개, 서울영등포: ${seoulYD.length}개, 서울시: ${seoul.length}개`)
console.log(`중복제거 후 총 ${candidates.length}개 → 지오코딩 시작...`)

// ===== 기존 데이터 삭제 =====
console.log('기존 DB 데이터 삭제 중...')
const { error: delErr } = await supabase.from('restaurants').delete().not('id', 'is', null)
if (delErr) {
  console.error('삭제 실패:', delErr.message)
  process.exit(1)
}
console.log('삭제 완료. 지오코딩 + 삽입 시작...')

// ===== 지오코딩 + 배치 삽입 =====
const BATCH = 30
let inserted = 0, failed = 0, skipped = 0

for (let i = 0; i < candidates.length; i += BATCH) {
  const batch = candidates.slice(i, i + BATCH)

  const withCoords = await Promise.all(
    batch.map(async (item) => {
      const coords = await geocode(item.address)
      if (!coords) return null
      return { ...item, lat: coords.lat, lng: coords.lng }
    })
  )

  const valid = withCoords.filter(Boolean)
  skipped += batch.length - valid.length

  if (valid.length > 0) {
    const { error } = await supabase.from('restaurants').insert(valid)
    if (error) {
      console.error(`\n배치 오류:`, error.message)
      failed += valid.length
    } else {
      inserted += valid.length
    }
  }

  process.stdout.write(`\r진행: ${Math.min(i + BATCH, candidates.length)}/${candidates.length} | 성공: ${inserted} | 주소실패: ${skipped}`)

  // API 부하 방지
  await new Promise(r => setTimeout(r, 300))
}

console.log(`\n\n완료! 성공: ${inserted}, DB오류: ${failed}, 주소변환실패: ${skipped}`)
