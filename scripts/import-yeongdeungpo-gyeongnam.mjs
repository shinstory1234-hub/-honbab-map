import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const iconv = require('iconv-lite')

const SUPABASE_URL = 'https://wguqbwopszxayjnnueby.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ===== 공통 필터 =====
const EXCLUDE = new Set([
  '한정식','감자탕','샤브샤브','닭갈비','아귀찜','게요리','해물탕','매운탕',
  '곱창','백숙','전복요리','복어요리','낙지요리','찜닭','삼계탕',
])
const LEVEL1_CATS = new Set(['국밥','해장국','설렁탕','곰탕','냉면','칼국수','추어탕','분식','김밥','죽','초밥','우동','라멘'])
const LEVEL3_CATS = new Set(['생선회','소고기구이','오리요리','육류','뷔페','한식뷔페','쌈밥','해물','닭요리','족발','포장마차','장어','찌개,전골'])
const PRICE1_CATS = new Set(['분식','김밥','죽','카페','국밥','해장국','설렁탕','곰탕','냉면','칼국수','추어탕','우동','라멘'])
const PRICE3_CATS = new Set(['소고기구이','생선회','초밥','이탈리아음식','양식','오리요리','장어'])
const PRICE4_CATS = new Set(['한식뷔페','뷔페'])

function categorize(cat) {
  if (!cat || EXCLUDE.has(cat)) return null
  let honbab_level = 2
  if (LEVEL1_CATS.has(cat)) honbab_level = 1
  else if (LEVEL3_CATS.has(cat)) honbab_level = 3
  let price_range = 2
  if (PRICE1_CATS.has(cat)) price_range = 1
  else if (PRICE3_CATS.has(cat)) price_range = 3
  else if (PRICE4_CATS.has(cat)) price_range = 4
  return { honbab_level, price_range }
}

function makeTags(honbab_level, area) {
  const tags = []
  if (honbab_level === 1) tags.push('혼밥 손님 많음', '빠른회전')
  if (area > 0 && area < 80) tags.push('빠른회전')
  return [...new Set(tags)]
}

// ===== EPSG:2097 → WGS84 근사 변환 =====
function tmToWgs84(x, y) {
  const lat = 38 + (y - 500000) / 111111
  const lng = 127 + (x - 200000) / (111111 * Math.cos(lat * Math.PI / 180))
  return { lat, lng }
}

function isValidKoreaCoord(lat, lng) {
  return lat > 34 && lat < 40 && lng > 124 && lng < 130
}

// ===== CSV 파서 =====
function parseCSV(text, sep = ',') {
  const rows = []
  const lines = text.split('\n')
  let row = [], cell = '', inQuote = false
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQuote = !inQuote }
      else if (c === sep && !inQuote) { row.push(cell.trim()); cell = '' }
      else { cell += c }
    }
    if (!inQuote) { row.push(cell.trim()); rows.push(row); row = []; cell = '' }
    else { cell += '\n' }
  }
  return rows
}

// ===== 배치 삽입 =====
async function batchInsert(restaurants, label) {
  const BATCH = 100
  let inserted = 0, skipped = 0
  for (let i = 0; i < restaurants.length; i += BATCH) {
    const batch = restaurants.slice(i, i + BATCH)
    const { error } = await supabase.from('restaurants').insert(batch)
    if (error) { skipped += batch.length }
    else { inserted += batch.length }
    process.stdout.write(`\r[${label}] 진행: ${Math.min(i+BATCH, restaurants.length)}/${restaurants.length}`)
  }
  console.log(`\n[${label}] 완료: 성공 ${inserted}, 실패 ${skipped}`)
  return inserted
}

// ===== 영등포 동별 중심 좌표 (좌표 없는 행 fallback) =====
const YDP_DONG_COORDS = {
  '영등포동': { lat: 37.5218, lng: 126.9066 },
  '여의도동': { lat: 37.5219, lng: 126.9246 },
  '당산동': { lat: 37.5342, lng: 126.9001 },
  '문래동': { lat: 37.5187, lng: 126.8984 },
  '양평동': { lat: 37.5279, lng: 126.8840 },
  '신길동': { lat: 37.5073, lng: 126.9173 },
  '대림동': { lat: 37.4920, lng: 126.8990 },
  '도림동': { lat: 37.5010, lng: 126.9099 },
}

// ===== 1. 영등포 처리 =====
console.log('\n=== 영등포 처리 중 ===')
const ydpBuf = readFileSync('C:/Users/신경승/honbab-map/restaurant-data-seoul yeongdeungpo.csv')
const ydpText = iconv.decode(ydpBuf, 'euc-kr')
const ydpRows = parseCSV(ydpText)
const ydpHeaders = ydpRows[0]

const idxStatus = ydpHeaders.findIndex(h => h.includes('영업상태명'))
const idxName   = ydpHeaders.findIndex(h => h.includes('사업장명'))
const idxAddr   = ydpHeaders.findIndex(h => h.includes('도로명주소'))
const idxCat    = ydpHeaders.findIndex(h => h.includes('위생업태명'))
const idxArea   = ydpHeaders.findIndex(h => h.includes('시설총규모'))
const idxX      = ydpHeaders.findIndex(h => h.includes('좌표정보(X)'))
const idxY      = ydpHeaders.findIndex(h => h.includes('좌표정보(Y)'))

console.log('컬럼 확인:', { idxStatus, idxName, idxAddr, idxCat, idxX, idxY })

const ydpRestaurants = []
const seen = new Set()
let coordFromTM = 0, coordFromDong = 0, noCoord = 0

for (const row of ydpRows.slice(1)) {
  if (row.length < 20) continue
  const status = row[idxStatus]?.trim()
  if (!status?.includes('영업')) continue

  // 컬럼 밀림 감지: idxName 위치에 5자리 우편번호가 있으면 shift=1
  const shift = /^\d{5}$/.test(row[idxName]?.trim()) ? 1 : 0

  const name = row[idxName + shift]?.trim()
  const addr = row[idxAddr]?.trim() + (shift ? ', ' + (row[idxAddr + 1]?.trim() || '') : '')
  const cat  = row[idxCat + shift]?.trim() || ''
  const area = parseFloat(row[idxArea + shift]) || 0

  if (!name || !addr) continue
  const info = categorize(cat)
  if (!info) continue

  // 좌표 추출: shift 적용 후 TM 변환 시도
  let lat, lng
  const rawX = parseFloat(row[idxX + shift])
  const rawY = parseFloat(row[idxY + shift])
  if (!isNaN(rawX) && !isNaN(rawY)) {
    const c = tmToWgs84(rawX, rawY)
    if (isValidKoreaCoord(c.lat, c.lng)) {
      lat = c.lat; lng = c.lng; coordFromTM++
    }
  }

  // TM 좌표 없으면 주소에서 동 추출해 fallback
  if (lat === undefined) {
    let base = null
    for (const [dong, coord] of Object.entries(YDP_DONG_COORDS)) {
      if (addr.includes(dong)) { base = coord; break }
    }
    if (!base) {
      // 기본: 영등포구 중심
      base = { lat: 37.5163, lng: 126.9069 }
    }
    lat = base.lat + (Math.random() - 0.5) * 0.02
    lng = base.lng + (Math.random() - 0.5) * 0.02
    coordFromDong++
  }

  const key = `${name}|${lat.toFixed(4)}`
  if (seen.has(key)) continue
  seen.add(key)

  ydpRestaurants.push({
    name, address: addr.trim(), lat, lng, category: cat || '한식',
    honbab_level: info.honbab_level,
    price_range: info.price_range,
    honbab_tags: makeTags(info.honbab_level, area),
  })
}

console.log(`영등포 필터 결과: ${ydpRestaurants.length}개 (TM좌표: ${coordFromTM}, 동추정: ${coordFromDong})`)
const ydpInserted = await batchInsert(ydpRestaurants, '영등포')

// ===== 2. 경남 처리 =====
console.log('\n=== 경남 처리 중 ===')
const gnBuf = readFileSync('C:/Users/신경승/honbab-map/restaurant-data-gyeongnam.csv')
const gnText = iconv.decode(gnBuf, 'euc-kr')
const gnRows = parseCSV(gnText)

const GN_COORDS = {
  '창원': { lat: 35.2278, lng: 128.6817 },
  '진주': { lat: 35.1802, lng: 128.1076 },
  '통영': { lat: 34.8544, lng: 128.4333 },
  '사천': { lat: 35.0045, lng: 128.0645 },
  '김해': { lat: 35.2285, lng: 128.8890 },
  '밀양': { lat: 35.5036, lng: 128.7467 },
  '거제': { lat: 34.8800, lng: 128.6213 },
  '양산': { lat: 35.3350, lng: 129.0378 },
  '의령': { lat: 35.3222, lng: 128.2619 },
  '함안': { lat: 35.2723, lng: 128.4061 },
  '창녕': { lat: 35.5445, lng: 128.4917 },
  '고성': { lat: 34.9736, lng: 128.3226 },
  '남해': { lat: 34.8375, lng: 127.8925 },
  '하동': { lat: 35.0677, lng: 127.7514 },
  '산청': { lat: 35.4154, lng: 127.8742 },
  '함양': { lat: 35.5196, lng: 127.7253 },
  '거창': { lat: 35.6867, lng: 127.9100 },
  '합천': { lat: 35.5666, lng: 128.1659 },
  '포항': { lat: 36.0190, lng: 129.3435 },
  '경주': { lat: 35.8562, lng: 129.2247 },
  '구미': { lat: 36.1195, lng: 128.3444 },
  '영주': { lat: 36.8057, lng: 128.6236 },
  '영천': { lat: 35.9731, lng: 128.9380 },
  '상주': { lat: 36.4108, lng: 128.1591 },
  '문경': { lat: 36.5862, lng: 128.1863 },
  '경산': { lat: 35.8248, lng: 128.7415 },
  '안동': { lat: 36.5684, lng: 128.7294 },
  '군위': { lat: 36.2393, lng: 128.5729 },
  '의성': { lat: 36.3527, lng: 128.6974 },
  '청송': { lat: 36.4358, lng: 129.0572 },
  '영양': { lat: 36.6672, lng: 129.1123 },
  '영덕': { lat: 36.4153, lng: 129.3654 },
  '청도': { lat: 35.6476, lng: 128.7348 },
  '고령': { lat: 35.7278, lng: 128.2639 },
  '성주': { lat: 35.9195, lng: 128.2835 },
  '칠곡': { lat: 35.9959, lng: 128.4015 },
  '예천': { lat: 36.6577, lng: 128.3521 },
  '봉화': { lat: 36.8931, lng: 128.7320 },
  '울진': { lat: 36.9930, lng: 129.4015 },
  '울릉': { lat: 37.4844, lng: 130.9055 },
}

const gnRestaurants = []
const gnSeen = new Set()

for (const row of gnRows.slice(1)) {
  if (row.length < 5) continue
  const name = row[1]?.trim()
  const cat  = row[3]?.trim() || ''
  const addr = row[4]?.trim() || ''

  if (!name || !addr) continue
  const info = categorize(cat)
  if (!info) continue

  let baseCoord = null
  for (const [city, coord] of Object.entries(GN_COORDS)) {
    if (addr.includes(city)) { baseCoord = coord; break }
  }
  if (!baseCoord) continue

  const lat = baseCoord.lat + (Math.random() - 0.5) * 0.04
  const lng = baseCoord.lng + (Math.random() - 0.5) * 0.04

  const key = `${name}|${addr.substring(0, 20)}`
  if (gnSeen.has(key)) continue
  gnSeen.add(key)

  gnRestaurants.push({
    name, address: addr, lat, lng, category: cat || '한식',
    honbab_level: info.honbab_level,
    price_range: info.price_range,
    honbab_tags: makeTags(info.honbab_level, 0),
  })
}

console.log(`경남 필터 결과: ${gnRestaurants.length}개`)
const gnInserted = await batchInsert(gnRestaurants, '경남')

// ===== 채팅방 생성 =====
console.log('\n=== 채팅방 생성 중 ===')
const { data: existingRooms } = await supabase.from('chat_rooms').select('restaurant_id')
const existingIds = new Set((existingRooms || []).map(r => r.restaurant_id))

const { data: allRestaurants } = await supabase.from('restaurants').select('id')
const missing = (allRestaurants || []).filter(r => !existingIds.has(r.id))

if (missing.length > 0) {
  for (let i = 0; i < missing.length; i += 500) {
    const batch = missing.slice(i, i + 500).map(r => ({ restaurant_id: r.id, participants_count: 0 }))
    await supabase.from('chat_rooms').insert(batch)
  }
  console.log(`채팅방 ${missing.length}개 생성`)
} else {
  console.log('생성할 채팅방 없음')
}

console.log(`\n===== 최종 완료 =====`)
console.log(`영등포: ${ydpInserted}개 / 경남: ${gnInserted}개`)
