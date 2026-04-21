import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const iconv = require('iconv-lite')

const SUPABASE_URL = 'https://wguqbwopszxayjnnueby.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'
const KAKAO_KEY = '6b2c13135baeeaddb3f9f222af85492d'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== CSV 파싱 =====
function parseCSV(text) {
  const rows = []
  const lines = text.split('\n')
  let row = [], cell = '', inQuote = false
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQuote = !inQuote }
      else if (c === ',' && !inQuote) { row.push(cell.trim()); cell = '' }
      else { cell += c }
    }
    if (!inQuote) { row.push(cell.trim()); rows.push(row); row = []; cell = '' }
    else { cell += '\n' }
  }
  return rows
}

// ===== 카카오 지오코딩 =====
async function geocode(address) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } })
  const json = await res.json()
  const doc = json.documents?.[0]
  if (!doc) return null
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) }
}

// ===== 필터 기준 =====
const EXCLUDE = new Set([
  '한정식','감자탕','샤브샤브','닭갈비','아귀찜','게요리','해물탕','매운탕',
  '곱창','백숙','전복요리','복어요리','낙지요리','찜닭','삼계탕','',
])

const LEVEL1_CATS = new Set([
  '국밥','해장국','설렁탕','곰탕','냉면','칼국수','추어탕',
  '분식','김밥','죽','초밥','우동','라멘',
])
const LEVEL3_CATS = new Set([
  '생선회','소고기구이','오리요리','육류','뷔페','한식뷔페',
  '쌈밥','해물','닭요리','족발','포장마차','장어','찌개,전골',
])

const PRICE1_CATS = new Set(['분식','김밥','죽','카페','국밥','해장국','설렁탕','곰탕','냉면','칼국수','추어탕','우동','라멘'])
const PRICE3_CATS = new Set(['소고기구이','생선회','초밥','이탈리아음식','양식','오리요리','장어'])
const PRICE4_CATS = new Set(['한식뷔페','뷔페'])

// ===== 데이터 처리 =====
const buf = readFileSync('C:/Users/신경승/honbab-map/restaurant-data.csv')
const text = iconv.decode(buf, 'euc-kr')
const rows = parseCSV(text)
const data = rows.slice(1).filter(r => r.length > 11)

const candidates = []
const seen = new Set()

data.forEach(r => {
  const name = r[0]?.trim()
  const cat = r[1]?.trim() || ''
  const addr = (r[6] || r[7] || '').trim()
  const area = parseFloat(r[9]) || 0
  const standing = parseInt(r[24]) || 0
  const seating = parseInt(r[25]) || 0

  if (!name || EXCLUDE.has(cat)) return
  if (!addr) return
  const key = `${name}|${addr}`
  if (seen.has(key)) return
  seen.add(key)

  let honbab_level = 2
  if (LEVEL1_CATS.has(cat)) honbab_level = 1
  else if (LEVEL3_CATS.has(cat)) honbab_level = 3

  let price_range = 2
  if (PRICE1_CATS.has(cat)) price_range = 1
  else if (PRICE3_CATS.has(cat)) price_range = 3
  else if (PRICE4_CATS.has(cat)) price_range = 4

  const honbab_tags = []
  if (standing > 0) honbab_tags.push('카운터석')
  if (honbab_level === 1) honbab_tags.push('혼밥 손님 많음')
  if (area > 0 && area < 80) honbab_tags.push('빠른회전')
  if (cat === '카페') honbab_tags.push('1인석')
  if (seating === 0 && standing > 0) honbab_tags.push('1인 메뉴 있음')

  candidates.push({ name, address: addr, category: cat || '한식', honbab_level, price_range, honbab_tags })
})

console.log(`총 ${candidates.length}개 후보, 카카오 지오코딩 시작...`)

// ===== 지오코딩 + 배치 삽입 =====
const BATCH = 50
let inserted = 0, failed = 0, skipped = 0

for (let i = 0; i < candidates.length; i += BATCH) {
  const batch = candidates.slice(i, i + BATCH)

  // 지오코딩 (병렬, 단 초당 10건 제한 고려)
  const withCoords = await Promise.all(
    batch.map(async (item) => {
      const coords = await geocode(item.address)
      if (!coords) return null
      return { ...item, lat: coords.lat, lng: coords.lng }
    })
  )

  const valid = withCoords.filter(Boolean)
  skipped += batch.length - valid.length

  if (valid.length === 0) continue

  const { error } = await supabase.from('restaurants').insert(valid)
  if (error) {
    console.error(`배치 ${Math.floor(i/BATCH)+1} 실패:`, error.message)
    failed += valid.length
  } else {
    inserted += valid.length
    process.stdout.write(`\r진행: ${i + batch.length}/${candidates.length} (성공: ${inserted}, 주소없음: ${skipped})`)
  }

  // 카카오 API 부하 방지 (50건당 0.5초)
  await new Promise(r => setTimeout(r, 500))
}

console.log(`\n완료! 성공: ${inserted}, 실패: ${failed}, 주소변환실패: ${skipped}`)
