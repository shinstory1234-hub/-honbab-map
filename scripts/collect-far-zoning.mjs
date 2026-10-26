/**
 * 6억지도 전체 단지의 대표 필지 용도지역을 조사해 public/apt-farplan.js를 만든다.
 *
 * 1) 저장된 단지 좌표(없으면 카카오 장소검색) → 대표 지번/PNU
 * 2) 토지이음 공식 열람 페이지 → 실제 용도지역(빈 필지는 인접 필지/확정 단지 표본을 구분 저장)
 * 3) 국가법령정보센터에서 수집한 지자체 조례 → 공동주택/정비사업 용적률
 *
 * KAKAO_REST_API_KEY 환경변수가 필요하다. 중간 결과는 data/far-zoning-cache.json에
 * 체크포인트되므로 중단 후 같은 명령을 실행하면 이어서 처리한다.
 */
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import vm from 'node:vm'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = new URL('../', import.meta.url)
const CACHE_FILE = new URL('../data/far-zoning-cache.json', import.meta.url)
const RULES_FILE = new URL('./far-ordinance-rules.json', import.meta.url)
const OUT = new URL('../public/apt-farplan.js', import.meta.url)
const CHECKED_AT = new Date().toISOString().slice(0, 10)
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY
const args = new Set(process.argv.slice(2))
const all = args.has('--all')
const refresh = args.has('--refresh')
const refreshNearby = args.has('--refresh-nearby')
const inferNearest = args.has('--infer-nearest')
const quiet = args.has('--quiet')
const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const concurrencyArg = process.argv.find(arg => arg.startsWith('--concurrency='))
const concurrency = Math.max(1, Math.min(24, concurrencyArg ? Number(concurrencyArg.split('=')[1]) : 6))
const intervalArg = process.argv.find(arg => arg.startsWith('--interval='))
const eumInterval = Math.max(0, intervalArg ? Number(intervalArg.split('=')[1]) : 1300)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let eumGate = Promise.resolve()
let nextEumAt = 0

if (!KAKAO_KEY && !inferNearest) {
  console.error('KAKAO_REST_API_KEY가 필요합니다. 키는 결과 파일에 저장되지 않습니다.')
  process.exit(1)
}

async function loadInventory() {
  const context = { window: { PICKS: [] } }
  context.window.window = context.window
  vm.createContext(context)
  for (const path of ['public/apt-picks.js', 'public/apt-auto3.js', 'public/apt-fard.js', 'public/apt-univ.js']) {
    vm.runInContext(await readFile(new URL(path, ROOT), 'utf8'), context, { filename: path })
  }
  const { PICKS, UGEO = {}, FARD = {} } = context.window
  return PICKS.map(item => {
    const key = `${item.n}|${item.area}`
    const geo = UGEO[key] || {}
    return {
      key, name: item.n, area: item.area, query: item.q || `${item.n} ${item.area}`,
      year: item.year, stage: item.st || 0, sigungu: FARD[key]?.[6] || '',
      lat: item.lat || geo.lat || null, lng: item.lng || geo.lng || null
    }
  })
}

async function kakao(path, params) {
  const url = new URL(`https://dapi.kakao.com${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { stdout } = await execFileAsync('curl', [
        '-L', '-sS', '--fail-with-body', '--max-time', '30',
        '-H', `Authorization: KakaoAK ${KAKAO_KEY}`, url.href
      ], { maxBuffer: 2 * 1024 * 1024 })
      return JSON.parse(stdout)
    } catch {
      await delay(800 * 2 ** attempt)
    }
  }
  throw new Error('카카오 API 반복 실패')
}

async function locate(item) {
  if (item.lat && item.lng) return { lat: item.lat, lng: item.lng, method: 'stored', placeAddress: null }
  let payload = await kakao('/v2/local/search/keyword.json', { query: item.query, size: 5 })
  const dong = item.area.split(' ').at(-1)
  let docs = payload.documents || []
  const normalize = value => `${value || ''}`.replace(/아파트|단지|주상복합/g, '').replace(/[^0-9가-힣a-z]/gi, '').toLowerCase()
  const bigrams = value => {
    const normalized = normalize(value)
    return new Set([...normalized].slice(0, -1).map((char, index) => char + normalized[index + 1]))
  }
  const wanted = normalize(item.name)
  const wantedBigrams = bigrams(item.name)
  const score = doc => {
    const candidate = normalize(doc.place_name)
    const candidateBigrams = bigrams(doc.place_name)
    const overlap = [...wantedBigrams].filter(pair => candidateBigrams.has(pair)).length
    const similarity = overlap / Math.max(1, new Set([...wantedBigrams, ...candidateBigrams]).size)
    return (doc.address_name?.includes(dong) ? 40 : 0)
      + (/아파트/.test(`${doc.place_name} ${doc.category_name}`) ? 20 : 0)
      + (candidate.includes(wanted) || wanted.includes(candidate) ? 100 : 0)
      + similarity * 60
  }
  let hit = docs.toSorted((a, b) => score(b) - score(a))[0]
  let method = 'kakao-place'
  if (!hit) {
    const lot = item.name.match(/\(([산\s]*\d+(?:-\d+)?)\)/)?.[1]
      || item.name.match(/(?<!\d)(\d{3,}(?:-\d+)?)$/)?.[1]
    if (lot) {
      const addressPayload = await kakao('/v2/local/search/address.json', { query: `${item.area} ${lot}` })
      hit = addressPayload.documents?.[0]
      method = 'kakao-address-lot'
    }
  }
  if (!hit) {
    const names = new Set([
      item.name.replace(/\([^)]*\)/g, ''),
      item.name.replace(/(\d+)\s*,\s*\d+(단지)/, '$1$2'),
      item.name.split(',')[0],
      item.name.replace(/주공/g, ''),
      item.name.replace(/\d+차$/, ''),
      item.name.match(/^(.+?단지)/)?.[1],
      item.name.replace(/\d+블록$/, '')
    ].filter(Boolean).map(name => name.trim()).filter(Boolean))
    const aliases = {
      '은하수샛별5,6단지': ['은하수5단지', '샛별6단지'],
      '삼산타운2단지두산위브': ['삼산타운2단지'],
      '옥정중앙역중흥S클래스센텀시티1블록': ['중흥S클래스센텀시티', '옥정중앙역중흥S클래스']
    }[item.name] || []
    aliases.forEach(name => names.add(name))
    for (const name of names) {
      payload = await kakao('/v2/local/search/keyword.json', { query: `${name} ${item.area}`, size: 5 })
      docs = payload.documents || []
      hit = docs.toSorted((a, b) => score(b) - score(a))[0]
      if (hit) {
        method = 'kakao-place-fallback'
        break
      }
    }
  }
  if (!hit) throw new Error('단지 좌표를 찾지 못함')
  return { lat: Number(hit.y), lng: Number(hit.x), method, placeAddress: hit.address_name || null }
}

function pnuFromAddress(address, bCode) {
  if (!bCode || !address?.main_address_no) return null
  return `${bCode}${address.mountain_yn === 'Y' ? '2' : '1'}${address.main_address_no.padStart(4, '0')}${(address.sub_address_no || '').padStart(4, '0')}`
}

function lotFromAddressName(addressName) {
  const match = `${addressName || ''}`.match(/\s(산\s*)?(\d+)(?:-(\d+))?$/)
  return match ? { mountain: Boolean(match[1]), main: match[2], sub: match[3] || '' } : null
}

async function parcel(position) {
  const { lat, lng } = position
  const [payload, regions] = await Promise.all([
    kakao('/v2/local/geo/coord2address.json', { x: lng, y: lat }),
    kakao('/v2/local/geo/coord2regioncode.json', { x: lng, y: lat })
  ])
  const bCode = regions.documents?.find(region => region.region_type === 'B')?.code
  for (const doc of payload.documents || []) {
    let address = doc.address
    if (!Number(address?.main_address_no)) {
      const fallback = lotFromAddressName(position.placeAddress)
      if (fallback) address = {
        ...address,
        mountain_yn: fallback.mountain ? 'Y' : 'N',
        main_address_no: fallback.main,
        sub_address_no: fallback.sub,
        address_name: position.placeAddress
      }
    }
    const pnu = pnuFromAddress(address, bCode)
    if (pnu) return { pnu, address: address.address_name }
  }
  throw new Error('대표 지번/PNU를 찾지 못함')
}

async function curlEum(pnu) {
  const target = `http://www.eum.go.kr/web/ar/lu/luLandDet.jsp?pnu=${pnu}&isNoScr=script&mode=search`
  let last
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      let release
      const previous = eumGate
      eumGate = new Promise(resolve => { release = resolve })
      await previous
      await delay(Math.max(0, nextEumAt - Date.now()))
      nextEumAt = Date.now() + eumInterval
      release()
      const requestTarget = `${target}&_cb=${CHECKED_AT.replaceAll('-', '')}-${attempt}-${Date.now()}`
      const { stdout } = await execFileAsync('curl', [
        '-L', '-sS', '--max-time', '60', '-w', '\n__HTTP_STATUS__:%{http_code}',
        '-H', 'X-Return-Format: html', `https://r.jina.ai/${requestTarget}`
      ], { maxBuffer: 20 * 1024 * 1024 })
      const status = Number(stdout.match(/__HTTP_STATUS__:(\d+)\s*$/)?.[1] || 0)
      const html = stdout.replace(/\n__HTTP_STATUS__:\d+\s*$/, '')
      if (status === 429) {
        const cooldown = 15000 * (attempt + 1)
        nextEumAt = Math.max(nextEumAt, Date.now() + cooldown)
        await delay(cooldown)
        throw new Error('토지이음 중계 호출 제한(429)')
      }
      if (status !== 200) throw new Error(`토지이음 중계 HTTP ${status || '오류'}`)
      if (!html.includes(`name="pnu" value="${pnu}"`) && !html.includes(`id="pnu" value="${pnu}"`)) {
        throw new Error('토지이음이 해당 필지를 반환하지 않음')
      }
      return { html, source: target }
    } catch (error) {
      last = error
      if (!/429/.test(error.message)) await delay(2500 * (attempt + 1))
    }
  }
  throw last
}

const ZONE_NAMES = [
  '제1종전용주거지역', '제2종전용주거지역',
  '제1종일반주거지역', '제2종일반주거지역', '제3종일반주거지역',
  '준주거지역', '중심상업지역', '일반상업지역', '근린상업지역',
  '유통상업지역', '전용공업지역', '일반공업지역', '준공업지역',
  '보전녹지지역', '생산녹지지역', '자연녹지지역',
  '보전관리지역', '생산관리지역', '계획관리지역', '농림지역', '자연환경보전지역'
]

function parseZoneNames(html) {
  const raw = html.match(/var\s+sehUcodeListExt\s*=\s*"([^"]*)"/)?.[1] || ''
  return [...new Set([...raw.matchAll(/uname=([^}\]]+)/g)]
    .map(match => match[1].trim())
    .filter(Boolean))]
}

function parseZones(html) {
  return parseZoneNames(html).filter(name => ZONE_NAMES.includes(name))
}

function authorityFor(sigungu) {
  if (sigungu.startsWith('11')) return '서울특별시'
  if (sigungu.startsWith('28')) return '인천광역시'
  const prefix = sigungu.slice(0, 4)
  return ({
    '4111': '수원시', '4113': '성남시', '4115': '의정부시', '4117': '안양시',
    '4119': '부천시', '4121': '광명시', '4122': '평택시', '4127': '안산시',
    '4128': '고양시', '4131': '구리시', '4136': '남양주시', '4137': '오산시',
    '4139': '시흥시', '4141': '군포시', '4143': '의왕시', '4145': '하남시',
    '4146': '용인시', '4148': '파주시', '4157': '김포시', '4159': '화성시',
    '4161': '광주시', '4163': '양주시'
  })[prefix] || null
}

function chooseZone(zones) {
  // 복수 용도지역이면 정비사업 가능 면적을 과대평가하지 않도록 가장 낮은 한도를 쓴다.
  return zones[0] || null
}

function distanceMeters(a, b) {
  const toRad = value => value * Math.PI / 180
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat)
  const dLat = lat2 - lat1, dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(h))
}

function fillFromNearestComplex(cache, inventory) {
  const validDonors = inventory.filter(item => {
    const row = cache[item.key]
    return row?.zones?.some(zone => /주거지역/.test(zone)) && !row.nearbyMeters && !row.nearbyComplexMeters
  })
  let filled = 0
  for (const item of inventory) {
    const row = cache[item.key] || {}
    const greenOnlySample = row.nearbyMeters && row.zones?.length
      && !row.zones.some(zone => /주거지역/.test(zone))
      && row.zones.every(zone => /녹지지역|관리지역|농림지역|자연환경보전지역/.test(zone))
    if (row.zones?.length && !greenOnlySample) continue
    if (row.nearbyComplexMeters) continue
    if (!Number.isFinite(row.lat) || !Number.isFinite(row.lng)) continue
    const donor = validDonors
      .filter(candidate => candidate.area === item.area)
      .map(candidate => ({ item: candidate, row: cache[candidate.key], distance: distanceMeters(row, cache[candidate.key]) }))
      .filter(candidate => candidate.distance <= 2000)
      .toSorted((a, b) => a.distance - b.distance)[0]
    if (!donor) continue
    cache[item.key] = {
      ...row,
      parcelZones: row.zones || [],
      representativePnu: row.representativePnu || row.pnu || null,
      zones: donor.row.zones,
      pnu: donor.row.pnu,
      address: donor.row.address,
      source: donor.row.source,
      nearbyComplexMeters: Math.round(donor.distance),
      nearbyComplexKey: donor.item.key,
      checkedAt: CHECKED_AT,
      error: undefined
    }
    filled++
  }
  return filled
}

async function writeOutput(cache, rules, inventory) {
  const output = {}
  for (const item of inventory) {
    const row = cache[item.key]
    if (!row?.zones?.length) continue
    const authority = authorityFor(item.sigungu)
    const candidates = row.zones.map(zone => ({ zone, rule: rules.authorities?.[authority]?.zones?.[zone] }))
    const usable = candidates.filter(candidate => candidate.rule?.redevelopment)
    const selected = usable.sort((a, b) => a.rule.redevelopment - b.rule.redevelopment)[0]
      || { zone: chooseZone(row.zones), rule: null }
    output[item.key] = [
      selected.zone,
      selected.rule?.general || null,
      selected.rule?.redevelopment || null,
      authority,
      row.pnu,
      row.checkedAt,
      row.nearbyComplexMeters ? `인근 확정 단지 ${row.nearbyComplexMeters}m 표본` : (row.nearbyMeters ? `인접 필지 ${row.nearbyMeters}m 표본` : (row.zones.length > 1 ? '복수 용도지역·최저 한도 적용' : '대표 필지')),
      row.source,
      row.zones,
      selected.rule?.basis || rules.authorities?.[authority]?.basis || 'unknown',
      selected.rule?.source || rules.authorities?.[authority]?.source || null,
      row.nearbyComplexKey || null,
      row.parcelZones || null
    ]
  }
  const banner = `/* 자동 생성: 토지이음 대표·인접 필지 용도지역 + 국가법령정보센터 지자체 조례.\n` +
    `   [용도지역, 일반한도, 정비사업 적용한도, 지자체, PNU, 확인일, 판정, 토지이음 출처, 전체 용도지역, 규칙근거, 규칙출처, 인근표본단지, 대표필지원용도지역] */\n`
  await writeFile(OUT, `${banner}window.FARPLAN=${JSON.stringify(output)};\n`)
  return Object.keys(output).length
}

await mkdir(new URL('../data/', import.meta.url), { recursive: true })
let cache = {}
try { cache = JSON.parse(await readFile(CACHE_FILE, 'utf8')) } catch {}
let rules = { authorities: {} }
try { rules = JSON.parse(await readFile(RULES_FILE, 'utf8')) } catch {
  console.error('먼저 npm run apt:far-rules를 실행해 지자체 조례표를 만드세요.')
  process.exit(1)
}

const inventory = await loadInventory()
const targets = inventory
  .filter(item => all || item.stage >= 35 || 2026 - item.year >= 27)
  .filter(() => !inferNearest)
  .filter(item => refresh || (refreshNearby && cache[item.key]?.nearbyMeters) || !cache[item.key]?.zones?.length)
  .slice(0, limit)

console.log(`용도지역 수집 시작: ${targets.length}곳 (전체 ${inventory.length}곳, 기존 ${Object.keys(cache).length}곳, 동시 ${concurrency}개)`)
let done = 0
let processed = 0
async function collectOne(item) {
  let diagnostics = {}
  try {
    const position = await locate(item)
    diagnostics = { lat: position.lat, lng: position.lng, locationMethod: position.method }
    let lot = await parcel(position)
    const representativePnu = lot.pnu
    diagnostics = { ...diagnostics, pnu: lot.pnu, address: lot.address }
    let result = await curlEum(lot.pnu)
    let rawZoneNames = parseZoneNames(result.html)
    diagnostics = { ...diagnostics, rawZoneNames, source: result.source }
    let zones = parseZones(result.html)
    let nearbyMeters = 0
    if (!zones.length) {
      const samples = [
        [30, 0], [-30, 0], [0, 30], [0, -30],
        [60, 0], [-60, 0], [0, 60], [0, -60],
        [100, 0], [-100, 0], [0, 100], [0, -100]
      ]
      const seenPnus = new Set([lot.pnu])
      const sampleCandidates = []
      for (const [north, east] of samples) {
        const samplePosition = {
          lat: position.lat + north / 111000,
          lng: position.lng + east / 88000,
          placeAddress: null
        }
        const sampleLot = await parcel(samplePosition).catch(() => null)
        if (!sampleLot || seenPnus.has(sampleLot.pnu)) continue
        seenPnus.add(sampleLot.pnu)
        const sampleResult = await curlEum(sampleLot.pnu).catch(() => null)
        if (!sampleResult) continue
        const sampleZones = parseZones(sampleResult.html)
        if (!sampleZones.length) continue
        sampleCandidates.push({
          lot: sampleLot,
          result: sampleResult,
          zones: sampleZones,
          rawZoneNames: parseZoneNames(sampleResult.html),
          nearbyMeters: Math.round(Math.hypot(north, east)),
          residential: sampleZones.some(zone => /주거지역/.test(zone))
        })
      }
      const selectedSample = sampleCandidates.toSorted((a, b) =>
        Number(b.residential) - Number(a.residential) || a.nearbyMeters - b.nearbyMeters
      )[0]
      if (selectedSample) {
        ({ lot, result, zones, rawZoneNames, nearbyMeters } = selectedSample)
        diagnostics = {
          ...diagnostics, representativePnu, pnu: lot.pnu, address: lot.address,
          rawZoneNames, source: result.source, nearbyMeters
        }
      }
    }
    if (!zones.length) throw new Error(`기본 용도지역을 찾지 못함 (${rawZoneNames.join(', ') || '원문 목록 비어 있음'})`)
    cache[item.key] = {
      pnu: lot.pnu, address: lot.address, zones,
      lat: position.lat, lng: position.lng, locationMethod: position.method,
      checkedAt: CHECKED_AT, source: result.source,
      ...(nearbyMeters ? { representativePnu, nearbyMeters } : {})
    }
    done++
    processed++
    if (!quiet || processed % 50 === 0) console.log(`[${processed}/${targets.length}] 성공 ${done} · ${item.name}: ${zones.join(', ')}`)
  } catch (error) {
    cache[item.key] = { ...(cache[item.key] || {}), ...diagnostics, error: error.message, checkedAt: CHECKED_AT }
    console.error(`[${++processed}/${targets.length}] ${item.name}: 실패 - ${error.message}`)
  }
  await delay(300)
}

for (let start = 0; start < targets.length; start += concurrency) {
  await Promise.all(targets.slice(start, start + concurrency).map(collectOne))
  await writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`)
  if (processed % 24 === 0) await writeOutput(cache, rules, inventory)
}

const inferred = fillFromNearestComplex(cache, inventory)
if (inferred) {
  await writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`)
  console.log(`인근 확정 단지로 보완: ${inferred}곳`)
}
const count = await writeOutput(cache, rules, inventory)
console.log(`완료: apt-farplan.js ${count}/${inventory.length}곳, 조례 ${Object.keys(rules.authorities || {}).length}개 지자체`)

