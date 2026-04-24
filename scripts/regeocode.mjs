import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wguqbwopszxayjnnueby.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'
const KAKAO_KEY = '6b2c13135baeeaddb3f9f222af85492d'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 주소에서 괄호/불필요한 정보 제거
function cleanAddress(addr) {
  return addr
    .replace(/\([^)]*\)/g, '') // 괄호 제거: (2층 주안동) → ''
    .replace(/\[[^\]]*\]/g, '') // 대괄호 제거
    .replace(/\d+층.*$/g, '')   // "2층 이후" 제거
    .replace(/지상\d+층.*/g, '') // "지상1층" 제거
    .replace(/지하\d+층.*/g, '') // "지하1층" 제거
    .trim()
}

// 1차: 주소로 지오코딩
async function geocodeByAddress(address) {
  try {
    const cleaned = cleanAddress(address)
    if (cleaned.length < 5) return null
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(cleaned)}`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
    )
    const json = await res.json()
    const doc = json.documents?.[0]
    if (!doc) return null
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) }
  } catch { return null }
}

// 2차: 식당명+주소 앞부분으로 키워드 검색 fallback
async function geocodeByKeyword(name, address) {
  try {
    // 주소에서 시/구/동까지만 추출 (예: "인천광역시 미추홀구")
    const region = address.split(' ').slice(0, 2).join(' ')
    const query = `${name} ${region}`.trim()
    if (query.length < 3) return null
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`,
      { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
    )
    const json = await res.json()
    const doc = json.documents?.[0]
    if (!doc) return null
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) }
  } catch { return null }
}

const BATCH = 30
let updated = 0, fallback = 0, failed = 0
const PAGE_SIZE = 1000

// 다음 실행 시 node scripts/regeocode.mjs 26 처럼 시작 페이지 지정 가능
// 25,690개 처리했으니 다음엔 node scripts/regeocode.mjs 25
const START_PAGE = parseInt(process.argv[2] || '0')
let page = START_PAGE

console.log(`재지오코딩 시작 (${START_PAGE}페이지부터, 주소정제 + 이름 fallback)...\n`)

while (true) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, address')
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (error) { console.error('조회 실패:', error.message); break }
  if (!data || data.length === 0) break

  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (r) => {
        // 1차: 주소 정제 후 지오코딩
        let coords = await geocodeByAddress(r.address)
        let method = 'address'

        // 2차: 실패 시 식당명+지역으로 키워드 검색
        if (!coords) {
          coords = await geocodeByKeyword(r.name, r.address)
          method = 'keyword'
        }

        return { id: r.id, coords, method }
      })
    )

    for (const r of results) {
      if (!r.coords) { failed++; continue }
      await supabase.from('restaurants').update({ lat: r.coords.lat, lng: r.coords.lng }).eq('id', r.id)
      if (r.method === 'address') updated++
      else fallback++
    }

    const total = page * PAGE_SIZE + Math.min(i + BATCH, data.length)
    process.stdout.write(`\r진행: ${total}/전체 | 주소: ${updated} | 이름검색: ${fallback} | 실패: ${failed}`)
    await new Promise(r => setTimeout(r, 300))
  }

  if (data.length < PAGE_SIZE) break
  page++
}

console.log(`\n\n완료! 주소지오코딩: ${updated}, 이름fallback: ${fallback}, 실패: ${failed}`)
