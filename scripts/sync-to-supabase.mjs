/**
 * SQLite(카카오 수집 데이터) → Supabase 이식 스크립트
 *
 * 흐름:
 *   1. data/kakao-restaurants.sqlite 에서 전체 장소 로드
 *   2. 혼밥 가능 카테고리 필터링 + honbab_level / category / price_range 매핑
 *   3. Supabase restaurants 기존 데이터 전체 삭제 후 배치 삽입
 *
 * 사용법:
 *   node scripts/sync-to-supabase.mjs              ← 실제 반영
 *   node scripts/sync-to-supabase.mjs --dry-run    ← 통계만 출력, DB 건드리지 않음
 *
 * 카카오 API는 자체 category_name이 정확하므로 (예: "음식점 > 카페,디저트 > 카페")
 * CSV 기반의 잘못된 카테고리 문제(카페인데 경양식 등)가 근본적으로 해결됩니다.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// ===== .env.local 자동 로드 =====
function loadEnv() {
  if (!existsSync('.env.local')) return
  for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

const DRY_RUN    = process.argv.includes('--dry-run')
const SQLITE_PATH = './data/kakao-restaurants.sqlite'
const BATCH       = 500

// ===== 카테고리 분류 설정 =====
// 카카오 category_name 형식: "음식점 > 일식 > 라멘,우동"
// → 소문자 변환 후 키워드 포함 여부로 판단

// 혼밥 불가: 해당 키워드 포함 시 완전 제외
const EXCLUDED_KEYWORDS = [
  '뷔페', '횟집', '회집', '생선회', '참치회',
  '보쌈', '족발', '해물탕', '아구찜', '아구',
  '찜닭', '코스요리', '한정식',
  '육류,고기',          // 일반 고깃집
  '삼겹살,두루치기',    // 일반 삼겹살집
  '호프,요리주점',      // 술집
  '실내포장마차',       // 술집
  '감자탕',            // 대용량
  '사철탕', '영양탕',  // 대용량
  '장어',              // 대용량
  '해물,생선',         // 횟집 계열
]

// 혼밥 가능 매핑: [키워드[], 표시카테고리, honbab_level, price_range, honbab_tags[]]
// 위에서부터 먼저 매칭된 규칙이 적용됨
const CATEGORY_MAP = [
  // ── 카페 (CE7 포함) ──────────────────────────────────────────────
  [['카페', '커피', '디저트', '브런치', '제과,베이커리', '베이커리', '파리바게뜨', '뚜레쥬르', '아이스크림', '간식', '샐러드', '스무디'], '카페', 1, 1, []],

  // ── 면류 ────────────────────────────────────────────────────────
  [['라멘', '츠케멘', '아부라소바'],          '면류', 1, 2, ['카운터석', '혼밥 손님 많음']],
  [['우동', '소바', '냉소바', '막국수'],      '면류', 1, 1, ['빠른회전']],
  [['냉면'],                                '면류', 1, 1, ['빠른회전']],
  [['쌀국수', '퍼', '분짜', '베트남'],       '면류', 1, 1, []],
  [['칼국수', '수제비'],                     '면류', 1, 1, []],
  [['국수'],                                '면류', 1, 1, ['빠른회전']],
  [['파스타', '이탈리안'],                   '면류', 2, 2, []],
  [['짜장', '짬뽕', '중화면', '중화냉면', '중국요리'], '면류', 2, 1, []],

  // ── 밥류 ────────────────────────────────────────────────────────
  [['규동', '돈부리', '오야코동'],            '밥류', 1, 1, ['카운터석', '혼밥 손님 많음']],
  [['볶음밥'],                               '밥류', 1, 1, ['빠른회전']],
  [['카레'],                                '밥류', 1, 1, []],
  [['덮밥'],                                '밥류', 1, 1, []],
  [['솥밥'],                                '밥류', 1, 2, []],
  [['비빔밥'],                              '밥류', 1, 1, []],
  [['국밥', '설렁탕', '해장국', '순댓국', '곰탕'], '밥류', 1, 1, ['빠른회전']],
  [['찌개', '전골', '두부'],                 '밥류', 2, 1, []],
  [['돈까스', '경양식'],                    '밥류', 2, 2, []],
  [['초밥', '스시'],                        '밥류', 2, 3, []],
  [['치킨', 'BBQ', 'BHC', '교촌', '굽네', '네네', '닭강정'], '밥류', 2, 2, []],
  [['샤브샤브'],                            '밥류', 2, 2, []],
  [['양꼬치'],                              '밥류', 2, 2, []],
  [['한식', '백반', '정식'],                '밥류', 2, 1, []],
  [['일식'],                               '밥류', 2, 2, []],
  [['양식', '피자'],                        '밥류', 2, 2, []],
  [['순대'],                               '분식', 1, 1, ['빠른회전']],

  // ── 분식 ────────────────────────────────────────────────────────
  [['김밥'],                                '분식', 1, 1, ['빠른회전', '혼밥 손님 많음']],
  [['분식', '떡볶이'],                      '분식', 1, 1, ['빠른회전']],
  [['패스트푸드', '햄버거', '샌드위치'],      '분식', 1, 1, ['빠른회전']],

  // ── 이자카야 / 혼술 가능 바 ─────────────────────────────────────
  [['이자카야', '일본식주점', '와인바', '칵테일바', '와인'], '밥류', 2, 2, []],
]

function classify(categoryName) {
  const c = categoryName.toLowerCase()

  if (EXCLUDED_KEYWORDS.some(k => c.includes(k.toLowerCase()))) return null

  for (const [keywords, category, honbab_level, price_range, honbab_tags] of CATEGORY_MAP) {
    if (keywords.some(k => c.includes(k.toLowerCase()))) {
      return { category, honbab_level, price_range, honbab_tags }
    }
  }

  return null // 매핑 없는 카테고리 제외
}

// ===== 메인 =====
async function main() {
  if (!existsSync(SQLITE_PATH)) {
    console.error(`SQLite 파일 없음: ${SQLITE_PATH}`)
    console.error('먼저 node scripts/collect-kakao.mjs 를 실행하세요.')
    process.exit(1)
  }

  // SQLite 로드
  const Database = require('better-sqlite3')
  const db = new Database(SQLITE_PATH, { readonly: true })
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM places').get().cnt
  console.log(`SQLite 총 장소: ${total.toLocaleString()}개`)

  const rows = db.prepare('SELECT * FROM places').all()
  db.close()

  // 분류
  const valid = []
  const stats = { excluded: 0, noMatch: 0, ok: 0 }
  const byCat = {}

  for (const row of rows) {
    const result = classify(row.category_name ?? '')
    if (result === null) {
      const isExcluded = EXCLUDED_KEYWORDS.some(k => (row.category_name ?? '').toLowerCase().includes(k.toLowerCase()))
      isExcluded ? stats.excluded++ : stats.noMatch++
      continue
    }

    valid.push({
      name:             row.place_name,
      address:          row.road_address_name || row.address_name,
      lat:              parseFloat(row.y),
      lng:              parseFloat(row.x),
      category:         result.category,
      honbab_level:     result.honbab_level,
      honbab_tags:      result.honbab_tags,
      price_range:      result.price_range,
      up_votes:         0,
      down_votes:       0,
      price_good_votes: 0,
      price_bad_votes:  0,
      edit_count:       0,
    })
    byCat[result.category] = (byCat[result.category] || 0) + 1
    stats.ok++
  }

  // 통계 출력
  console.log('\n[필터링 결과]')
  console.log(`  혼밥 가능 (삽입 대상): ${stats.ok.toLocaleString()}개`)
  console.log(`  혼밥 불가 제외:        ${stats.excluded.toLocaleString()}개`)
  console.log(`  카테고리 미매핑 제외:  ${stats.noMatch.toLocaleString()}개`)
  console.log('\n[카테고리별]')
  for (const [cat, cnt] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt.toLocaleString()}개`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run 모드: Supabase 미반영. 종료합니다.')
    return
  }

  // Supabase 연결
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    || 'https://wguqbwopszxayjnnueby.supabase.co'
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 기존 데이터 전체 삭제
  console.log('\n기존 Supabase restaurants 데이터 삭제 중...')
  const { error: delErr } = await supabase.from('restaurants').delete().not('id', 'is', null)
  if (delErr) { console.error('삭제 실패:', delErr.message); process.exit(1) }
  console.log('삭제 완료.')

  // 배치 삽입
  console.log(`배치 삽입 시작 (${BATCH}개씩, 총 ${valid.length.toLocaleString()}개)...`)
  let inserted = 0, failed = 0

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH)
    const { error } = await supabase.from('restaurants').insert(batch)
    if (error) {
      console.error(`\n배치 오류 [${i}~${i + batch.length}]:`, error.message)
      failed += batch.length
    } else {
      inserted += batch.length
    }
    process.stdout.write(`\r  진행: ${Math.min(i + BATCH, valid.length).toLocaleString()} / ${valid.length.toLocaleString()}`)
  }

  console.log(`\n\n완료!`)
  console.log(`  삽입 성공: ${inserted.toLocaleString()}개`)
  if (failed > 0) console.log(`  실패:     ${failed.toLocaleString()}개`)
}

main().catch(err => { console.error(err); process.exit(1) })
