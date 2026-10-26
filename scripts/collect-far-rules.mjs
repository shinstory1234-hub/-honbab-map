/**
 * 각 지자체의 최신 도시계획조례에서 용도지역별 용적률을 수집한다.
 *
 * 출처: 국가법령정보센터 자치법규 원문. 결과와 중간 원문은 data/ 아래에
 * 저장되며(.gitignore), 공개용 결과는 scripts/far-ordinance-rules.json이다.
 * 실패한 지자체만 다음 실행에서 다시 시도하므로 중단 후 재실행해도 된다.
 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const CACHE_DIR = new URL('../data/far-rules/', import.meta.url)
const OUT = new URL('./far-ordinance-rules.json', import.meta.url)
const CHECKED_AT = new Date().toISOString().slice(0, 10)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const AUTHORITIES = {
  '11': '서울특별시',
  '28': '인천광역시',
  '4111': '수원시', '4113': '성남시', '4115': '의정부시',
  '4117': '안양시', '4119': '부천시', '4121': '광명시',
  '4122': '평택시', '4127': '안산시', '4128': '고양시',
  '4131': '구리시', '4136': '남양주시', '4137': '오산시',
  '4139': '시흥시', '4141': '군포시', '4143': '의왕시',
  '4145': '하남시', '4146': '용인시', '4148': '파주시',
  '4157': '김포시', '4159': '화성시', '4161': '광주시',
  '4163': '양주시'
}

const ZONES = [
  '제1종전용주거지역', '제2종전용주거지역',
  '제1종일반주거지역', '제2종일반주거지역', '제3종일반주거지역',
  '준주거지역', '중심상업지역', '일반상업지역', '근린상업지역',
  '유통상업지역', '전용공업지역', '일반공업지역', '준공업지역',
  '보전녹지지역', '생산녹지지역', '자연녹지지역',
  '보전관리지역', '생산관리지역', '계획관리지역', '농림지역', '자연환경보전지역'
]

// 국토계획법 시행령 제85조제1항의 용도지역별 최대 범위. 지자체 원문을
// 일시적으로 읽지 못해도 '서울 300%' 같은 임의값 대신 해당 용도지역의
// 법정 상한을 명시적으로 사용한다. 실제 조례·정비계획은 이보다 낮을 수 있다.
const NATIONAL_CAPS = {
  '제1종전용주거지역': 100, '제2종전용주거지역': 150,
  '제1종일반주거지역': 200, '제2종일반주거지역': 250,
  '제3종일반주거지역': 300, '준주거지역': 500,
  '중심상업지역': 1500, '일반상업지역': 1300, '근린상업지역': 900,
  '유통상업지역': 1100, '전용공업지역': 300, '일반공업지역': 350,
  '준공업지역': 400, '보전녹지지역': 80, '생산녹지지역': 100,
  '자연녹지지역': 100, '보전관리지역': 80, '생산관리지역': 80,
  '계획관리지역': 100, '농림지역': 80, '자연환경보전지역': 80
}

async function curl(url, format = 'html') {
  let last
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { stdout } = await execFileAsync('curl', [
        '-L', '-sS', '--fail-with-body', '--max-time', '45',
        '-H', `X-Return-Format: ${format}`, `https://r.jina.ai/${url}`
      ], { maxBuffer: 20 * 1024 * 1024 })
      return stdout
    } catch (error) {
      last = error
      await delay(2000 * (attempt + 1))
    }
  }
  throw last
}

async function ordinanceText(authority) {
  await mkdir(CACHE_DIR, { recursive: true })
  const cache = new URL(`${authority}.md`, CACHE_DIR)
  try { return await readFile(cache, 'utf8') } catch {}

  const slug = `${encodeURIComponent('자치법규')}/${encodeURIComponent(`${authority}도시계획조례`)}`
  const wrapperUrl = `https://www.law.go.kr/${slug}`
  const wrapper = await curl(wrapperUrl, 'html')
  const src = wrapper.match(/<iframe[^>]+src="([^"]*ordinInfoP[^\"]+)"/i)?.[1]
    ?.replaceAll('&amp;', '&')
  if (!src) throw new Error('국가법령정보센터 조례 본문 주소를 찾지 못함')
  const bodyUrl = new URL(src, 'https://www.law.go.kr').href
  const text = await curl(bodyUrl, 'markdown')
  await writeFile(cache, text)
  return text
}

function article(text) {
  const lines = text.split(/\r?\n/)
  let start = lines.findIndex(line => /제\d+조(?:의\d+)?\s*\([^)]*용도지역[^)]*용적률/.test(line))
  if (start < 0) start = lines.findIndex(line => /용도지역[^\n]{0,20}용적률/.test(line))
  if (start < 0) throw new Error('용도지역별 용적률 조항을 찾지 못함')
  let end = start + 1
  while (end < lines.length && end < start + 120) {
    if (end > start + 5 && /^제\d+조(?:의\d+)?\s*\(/.test(lines[end])) break
    end++
  }
  return lines.slice(start, end).join('\n')
}

function zoneClause(text, zone) {
  const start = text.indexOf(zone)
  if (start < 0) return null
  const rest = text.slice(start)
  const next = ZONES
    .map(name => rest.indexOf(name, zone.length))
    .filter(index => index > 0)
  const end = next.length ? Math.min(...next) : Math.min(rest.length, 900)
  return rest.slice(0, end).replace(/\s+/g, ' ').trim()
}

function percentValues(clause) {
  return [...clause.matchAll(/([0-9]{2,4})(?:\s*퍼센트|\s*%)/g)]
    .map(match => Number(match[1]))
    .filter(value => value >= 40 && value <= 1500)
}

function percentAfter(clause, pattern, maxDistance = 350) {
  const match = clause.match(pattern)
  if (!match) return null
  return percentValues(clause.slice(match.index, match.index + maxDistance))[0] || null
}

function parseRules(text) {
  const section = article(text)
  const zones = {}
  for (const zone of ZONES) {
    const clause = zoneClause(section, zone)
    if (!clause) continue
    const values = percentValues(clause)
    if (!values.length) continue
    const apartment = percentAfter(clause, /공동주택/)
    const redevelopment = percentAfter(clause, /도시\s*및\s*주거환경정비법|재건축|재개발|정비사업/)
    zones[zone] = {
      general: values[0],
      apartment: apartment || values[0],
      redevelopment: redevelopment || apartment || values[0],
      excerpt: clause.slice(0, 700)
    }
  }
  return { article: section.split('\n')[0].trim(), zones }
}

let current = { checkedAt: CHECKED_AT, authorities: {} }
try { current = JSON.parse(await readFile(OUT, 'utf8')) } catch {}
current.checkedAt = CHECKED_AT

const retryAll = process.argv.includes('--refresh')
const fallbackOnly = process.argv.includes('--fallback-only')
const authorityArg = process.argv.find(arg => arg.startsWith('--authority='))?.split('=')[1]
for (const authority of [...new Set(Object.values(AUTHORITIES))]) {
  if (authorityArg && authority !== authorityArg) continue
  if (fallbackOnly) continue
  if (!retryAll && current.authorities?.[authority]?.basis !== 'national-ceiling' && Object.keys(current.authorities?.[authority]?.zones || {}).length) {
    console.log(`건너뜀 ${authority} (기존 결과)`)
    continue
  }
  try {
    const text = await ordinanceText(authority)
    const parsed = parseRules(text)
    const localSource = `https://www.law.go.kr/자치법규/${encodeURIComponent(`${authority}도시계획조례`)}`
    for (const rule of Object.values(parsed.zones)) {
      rule.basis = 'local-ordinance'
      rule.source = localSource
    }
    current.authorities[authority] = {
      ...parsed,
      source: localSource,
      checkedAt: CHECKED_AT,
      basis: 'local-ordinance'
    }
    await writeFile(OUT, `${JSON.stringify(current, null, 2)}\n`)
    console.log(`완료 ${authority}: ${Object.keys(parsed.zones).length}개 용도지역`)
  } catch (error) {
    console.error(`실패 ${authority}: ${error.message}`)
  }
  await delay(1200)
}


// 네트워크 실패는 수집 전체를 막지 않는다. 각 항목에 fallback임을 저장해
// 화면에서도 지자체 조례값과 법정 상한을 서로 다르게 표시한다.
for (const authority of [...new Set(Object.values(AUTHORITIES))]) {
  if (current.authorities?.[authority]?.basis !== 'national-ceiling' && Object.keys(current.authorities?.[authority]?.zones || {}).length) continue
  current.authorities[authority] = {
    article: '국토의 계획 및 이용에 관한 법률 시행령 제85조제1항',
    zones: Object.fromEntries(Object.entries(NATIONAL_CAPS).map(([zone, value]) => [zone, {
      general: value, apartment: value, redevelopment: value,
      excerpt: `${zone} 법정 최대 범위 상한 ${value}% (지자체 조례 원문 재수집 필요)`,
      basis: 'national-ceiling',
      source: 'https://www.law.go.kr/법령/국토의계획및이용에관한법률시행령/제85조'
    }])),
    source: 'https://www.law.go.kr/법령/국토의계획및이용에관한법률시행령/제85조',
    checkedAt: CHECKED_AT,
    basis: 'national-ceiling'
  }
  console.warn(`대체 ${authority}: 지자체 조례 대신 국토계획법 시행령 상한`)
}

for (const row of Object.values(current.authorities)) {
  for (const [zone, value] of Object.entries(NATIONAL_CAPS)) {
    if (row.zones[zone]) continue
    row.zones[zone] = {
      general: value, apartment: value, redevelopment: value,
      excerpt: `${zone} 법정 최대 범위 상한 ${value}% (해당 지자체 조례 조항 미확인)`,
      basis: 'national-ceiling',
      source: 'https://www.law.go.kr/법령/국토의계획및이용에관한법률시행령/제85조'
    }
  }
}
await writeFile(OUT, `${JSON.stringify(current, null, 2)}\n`)

const localCount = Object.values(current.authorities).filter(row => row.basis !== 'national-ceiling').length
console.log(`규칙 수집 완료: ${Object.keys(current.authorities).length}/${new Set(Object.values(AUTHORITIES)).size}개 지자체 (조례 ${localCount}, 법정 상한 대체 ${Object.keys(current.authorities).length - localCount})`)

