import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wguqbwopszxayjnnueby.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'
const KAKAO_REST_KEY = '6b2c13135baeeaddb3f9f222af85492d'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 카카오 카테고리 → 우리 시스템 매핑
function mapCategory(catName) {
  const c = catName.toLowerCase()
  if (c.includes('카페') || c.includes('커피') || c.includes('디저트') || c.includes('브런치'))
    return { category: '카페', honbab_level: 1, price_range: 1 }
  if (c.includes('분식'))
    return { category: '분식', honbab_level: 1, price_range: 1 }
  if (c.includes('패스트푸드') || c.includes('패스트 푸드'))
    return { category: '패스트푸드', honbab_level: 1, price_range: 1 }
  if (c.includes('냉면'))
    return { category: '냉면집', honbab_level: 1, price_range: 1 }
  if (c.includes('술집') || c.includes('호프') || c.includes('맥주') || c.includes('와인바') ||
      c.includes('칵테일') || c.includes('포차') || c.includes('이자카야') || c.includes('바,'))
    return { category: '주점', honbab_level: 3, price_range: 2 }
  if (c.includes('일식') || c.includes('라멘') || c.includes('초밥') || c.includes('우동') || c.includes('돈까스'))
    return { category: '일식', honbab_level: 2, price_range: 2 }
  if (c.includes('중국') || c.includes('중식'))
    return { category: '중식', honbab_level: 2, price_range: 2 }
  if (c.includes('양식') || c.includes('이탈리안') || c.includes('피자') || c.includes('파스타') || c.includes('스테이크'))
    return { category: '양식', honbab_level: 2, price_range: 3 }
  if (c.includes('치킨') || c.includes('통닭'))
    return { category: '치킨', honbab_level: 2, price_range: 1 }
  if (c.includes('한식') || c.includes('국밥') || c.includes('설렁탕') || c.includes('해장국') || c.includes('찌개'))
    return { category: '한식', honbab_level: 2, price_range: 2 }
  if (c.includes('고기') || c.includes('구이') || c.includes('삼겹살') || c.includes('갈비'))
    return { category: '고기구이', honbab_level: 3, price_range: 3 }
  if (c.includes('뷔페'))
    return { category: '뷔페', honbab_level: 2, price_range: 3 }
  return null // 매핑 안 되면 기존 유지
}

// 이름 유사도 체크 (한 쪽이 다른 쪽을 포함하거나 50% 이상 겹치면 OK)
function isSimilarName(a, b) {
  const normalize = s => s.replace(/\s/g, '').toLowerCase()
  const na = normalize(a), nb = normalize(b)
  if (na.includes(nb) || nb.includes(na)) return true
  // 공통 글자 비율
  const shorter = na.length < nb.length ? na : nb
  const longer = na.length < nb.length ? nb : na
  let matched = 0
  for (const ch of shorter) { if (longer.includes(ch)) matched++ }
  return matched / shorter.length >= 0.6
}

// 카카오 키워드 검색으로 카테고리 가져오기
async function fetchKakaoCategory(name, lat, lng) {
  try {
    const params = new URLSearchParams({
      query: name, x: String(lng), y: String(lat), radius: '200', size: '3'
    })
    const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    })
    const json = await res.json()
    const docs = json.documents || []
    // 이름이 비슷한 결과 중 첫 번째
    const match = docs.find(d => isSimilarName(d.place_name, name))
    return match ? match.category_name : null
  } catch { return null }
}

const BATCH = 20
let updated = 0, noMatch = 0, noMap = 0
let page = 0
const PAGE_SIZE = 1000

console.log('카테고리 재조정 시작...')
console.log('(카카오에서 식당명으로 검색해서 실제 카테고리 가져오는 중)')

while (true) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, lat, lng, category')
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  if (error) { console.error('조회 실패:', error.message); break }
  if (!data || data.length === 0) break

  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH)

    const results = await Promise.all(
      batch.map(async (r) => {
        const catName = await fetchKakaoCategory(r.name, r.lat, r.lng)
        if (!catName) return { id: r.id, result: 'noMatch' }
        const mapped = mapCategory(catName)
        if (!mapped) return { id: r.id, result: 'noMap' }
        return { id: r.id, result: 'ok', ...mapped }
      })
    )

    for (const r of results) {
      if (r.result === 'noMatch') { noMatch++; continue }
      if (r.result === 'noMap') { noMap++; continue }
      await supabase.from('restaurants').update({
        category: r.category,
        honbab_level: r.honbab_level,
        price_range: r.price_range,
      }).eq('id', r.id)
      updated++
    }

    const total = page * PAGE_SIZE + Math.min(i + BATCH, data.length)
    process.stdout.write(`\r진행: ${total} | 업데이트: ${updated} | 카카오없음: ${noMatch} | 매핑없음: ${noMap}`)
    await new Promise(r => setTimeout(r, 400))
  }

  if (data.length < PAGE_SIZE) break
  page++
}

console.log(`\n\n완료! 업데이트: ${updated}, 카카오 미검색: ${noMatch}, 카테고리 매핑없음: ${noMap}`)
