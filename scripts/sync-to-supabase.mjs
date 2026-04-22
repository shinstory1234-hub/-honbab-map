/**
 * SQLite(카카오 수집 데이터) → Supabase 이식 스크립트
 *
 * 흐름:
 *   1. data/kakao-restaurants.sqlite 에서 전체 장소 로드
 *   2. 혼밥 가능 카테고리 필터링 + honbab_level / category 매핑
 *   3. Supabase restaurants 테이블 기존 데이터 삭제 후 배치 삽입
 *
 * 사용법:
 *   node scripts/sync-to-supabase.mjs
 *   node scripts/sync-to-supabase.mjs --dry-run   ← DB 건드리지 않고 통계만 출력
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

const DRY_RUN = process.argv.includes('--dry-run')
const SQLITE_PATH = './data/kakao-restaurants.sqlite'
const BATCH = 500 // Supabase 배치 삽입 크기

// ===== 카테고리 매핑 =====
// 카카오 category_name 예시: "음식점 > 일식 > 라멘,우동"
// → 마지막 세그먼트를 키워드로 사용

// 혼밥 불가: 이 키워드 포함 시 완전 제외
const EXCLUDED = [
  '뷔페', '횟집', '회집', '생선회', '보쌈', '족발', '해물탕', '아구찜',
  '찜닭', '코스요리', '코스', '갈비탕', '육류,고기', '삼겹살,두루치기',
]

// 혼밥 가능 카테고리 정의
// [키워드[], 표시카테고리, honbab_level, price_range, tags[]]
const CATEGORY_MAP = [
  // ── 면류 ──────────────────────────────────────────────────────
  [['라멘', '츠케멘', '아부라소바'],     '면류', 1, 2, ['카운터석', '혼밥 손님 많음']],
  [['우동', '소바', '냉소바', '막국수'], '면류', 1, 1, ['빠른회전']],
  [['냉면', '물냉면', '비빔냉면'],       '면류', 1, 1, ['빠른회전']],
  [['쌀국수', '퍼', '분짜'],            '면류', 1, 1, []],
  [['파스타', '이탈리안'],              '면류', 2, 2, []],
  [['칼국수', '수제비'],               '면류', 1, 1, []],
  [['짜장', '짬뽕', '중화면', '중화냉면'], '면류', 2, 1, []],

  // ── 밥류 ──────────────────────────────────────────────────────
  [['규동', '돈부리', '오야코동'],       '밥류', 1, 1, ['카운터석', '혼밥 손님 많음']],
  [['볶음밥'],                         '밥류', 1, 1, ['빠른회전']],
  [['카레'],                           '밥류', 1, 1, []],
  [['덮밥'],                           '밥류', 1, 1, []],
  [['솥밥'],                           '밥류', 1, 2, []],
  [['비빔밥'],                         '밥류', 1, 1, []],
  [['국밥', '설렁탕', '해장국', '순댓국', '곰탕'], '밥류', 1, 1, ['빠른회전']],
  [['돈까스', '경양식'],               '밥류', 2, 2, []],
  [['초밥', '스시'],                   '밥류', 2, 3, []],

  // ── 분식 ──────────────────────────────────────────────────────
  [['김밥'],                           '분식', 1, 1, ['빠른회전', '혼밥 손님 많음']],
  [['분식', '떡볶이'],                 '분식', 1, 1, ['빠른회전']],

  // ── 이자카야 (혼술 가능) ──────────────────────────────────────
  [['이자카야', '일본식주점'],          '밥류', 2, 2, []],

  // ── 카페 ──────────────────────────────────────────────────────
  [['카페', '커피', '디저트', '브런치'], '카페', 1, 1, []],

  // ── 패스트푸드 ────────────────────────────────────────────────
  [['패스트푸드', '햄버거', '샌드위치'], '분식', 1, 1, ['빠른회전']],
]

/**
 * 카카오 category_name → { category, honbab_level, price_range, honbab_tags } | null
 * null = 혼밥 불가, 수집 제외
 */
function classify(categoryName) {
  const c = categoryName.toLowerCase()

  // 혼밥 불가 제외
  if (EXCLUDED.some(k => c.includes(k.toLowerCase()))) return null

  for (const [keywords, category, honbab_level, price_range, tags] of CATEGORY_MAP) {
    if (keywords.some(k => c.includes(k.toLowerCase()))) {
      return { category, honbab_level, price_range, honbab_tags: tags }
    }
  }

  return null // 매핑 없는 카테고리는 수집 제외
}

// ===== 메인 =====
async function main() {
  // SQLite 로드
  if (!existsSync(SQLITE_PATH)) {
    console.error(`SQLite 파일 없음: ${SQLITE_PATH}`)
    console.error('먼저 node scripts/collect-kakao.mjs 를 실행하세요.')
    process.exit(1)
  }

  const Database = require('better-sqlite3')
  const db = new Database(SQLITE_PATH, { readonly: true })
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM places').get().cnt
  console.log(`SQLite 총 장소: ${total.toLocaleString()}개`)

  // 분류
  const rows = db.prepare('SELECT * FROM places').all()
  db.close()

  const valid = []
  const stats = { excluded: 0, noMatch: 0, ok: 0 }

  for (const row of rows) {
    const result = classify(row.category_name ?? '')
    if (result === null) {
      if (EXCLUDED.some(k => (row.category_name ?? '').toLowerCase().includes(k.toLowerCase()))) {
        stats.excluded++
      } else {
        stats.noMatch++
      }
      continue
    }

    valid.push({
      name:         row.place_name,
      address:      row.road_address_name || row.address_name,
      lat:          parseFloat(row.y),
      lng:          parseFloat(row.x),
      category:     result.category,
      honbab_level: result.honbab_level,
      honbab_tags:  result.honbab_tags,
      price_range:  result.price_range,
      up_votes:     0,
      down_votes:   0,
      price_good_votes: 0,
      price_bad_votes:  0,
      edit_count:   0,
      // 카카오 place_id를 메타로 보존 (나중에 재동기화 시 중복방지용)
      kakao_id:     row.place_id,
    })
    stats.ok++
  }

  // 카테고리별 통계 출력
  const byCat = {}
  for (const r of valid) byCat[r.category] = (byCat[r.category] || 0) + 1

  console.log('\n[필터링 결과]')
  console.log(`  혼밥 가능: ${stats.ok.toLocaleString()}개`)
  console.log(`  혼밥 불가 제외: ${stats.excluded.toLocaleString()}개`)
  console.log(`  카테고리 미매핑(제외): ${stats.noMatch.toLocaleString()}개`)
  console.log('\n[카테고리별]')
  for (const [cat, cnt] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt.toLocaleString()}개`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run 모드: Supabase에 쓰지 않고 종료합니다.')
    return
  }

  // Supabase 연결
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wguqbwopszxayjnnueby.supabase.co'
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndndXFid29wc3p4YXlqbm51ZWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM3ODUsImV4cCI6MjA5MjMzOTc4NX0.7jD5WjjlgdcMUB8zXv8UraPZcleG5k9Cmpl-FtcU-C0'

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 기존 데이터 전체 삭제
  console.log('\n기존 Supabase 데이터 삭제 중...')
  const { error: delErr } = await supabase.from('restaurants').delete().not('id', 'is', null)
  if (delErr) {
    console.error('삭제 실패:', delErr.message)
    process.exit(1)
  }
  console.log('삭제 완료.')

  // kakao_id 컬럼 없으면 그냥 제거 (스키마에 없는 경우 대비)
  // → 먼저 테스트 삽입으로 컬럼 존재 여부 확인
  let useKakaoId = true
  {
    const testRow = { ...valid[0] }
    const { error } = await supabase.from('restaurants').insert(testRow).select('id').single()
    if (error && error.message.includes('kakao_id')) {
      useKakaoId = false
      console.log('(kakao_id 컬럼 없음 → 제외하고 진행)')
    } else if (!error) {
      // 테스트 삽입 성공 → 해당 행 삭제 후 배치에 포함
      await supabase.from('restaurants').delete().not('id', 'is', null)
    }
  }

  if (!useKakaoId) {
    for (const r of valid) delete r.kakao_id
  }

  // 배치 삽입
  console.log(`\nSupabase 배치 삽입 시작 (${BATCH}개씩)...`)
  let inserted = 0
  let failed = 0

  for (let i = 0; i < valid.length; i += BATCH) {
    const batch = valid.slice(i, i + BATCH)
    const { error } = await supabase.from('restaurants').insert(batch)
    if (error) {
      console.error(`\n배치 오류 (${i}~${i + batch.length}):`, error.message)
      failed += batch.length
    } else {
      inserted += batch.length
    }
    process.stdout.write(`\r삽입 중: ${Math.min(i + BATCH, valid.length).toLocaleString()} / ${valid.length.toLocaleString()}`)
  }

  console.log(`\n\n완료! 삽입: ${inserted.toLocaleString()}개 | 실패: ${failed.toLocaleString()}개`)
}

main().catch(err => { console.error(err); process.exit(1) })
