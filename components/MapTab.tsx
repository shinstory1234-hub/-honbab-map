'use client'

import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Restaurant } from '@/lib/supabase'
import { calcHonbabScore, matchesCategory, HONBAB_EXCLUDED_KEYWORDS } from '@/lib/honbabScore'
import RestaurantCard from '@/components/RestaurantCard'
import RestaurantDetail from '@/components/RestaurantDetail'
import QuickRecommend from '@/components/QuickRecommend'
import { type MapBounds } from '@/components/KakaoMap'

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), { ssr: false })

const CATEGORIES = ['전체', '면류', '밥류', '분식', '카페']
const SORT_OPTIONS = [
  { value: 'score', label: '혼밥지수순' },
  { value: 'level', label: '난이도순' },
  { value: 'name', label: '이름순' },
] as const

type SortBy = 'score' | 'level' | 'name'

type KakaoPlace = {
  id: string
  place_name: string
  category_name: string
  road_address_name: string
  address_name: string
  x: string
  y: string
}

type CategoryResult = { category: string; honbab_level: 1 | 2 | 3; price_range: 1 | 2 | 3 | 4 }

function mapKakaoCategory(catName: string): CategoryResult | null {
  const c = catName.toLowerCase()

  // 혼밥 불가 — 추가/표시 차단
  if (HONBAB_EXCLUDED_KEYWORDS.some(k => c.includes(k))) return null

  // 카페
  if (c.includes('카페') || c.includes('커피') || c.includes('디저트') || c.includes('브런치'))
    return { category: '카페', honbab_level: 1, price_range: 1 }

  // 면류
  if (c.includes('라멘') || c.includes('츠케멘') || c.includes('아부라소바') ||
      c.includes('우동') || c.includes('소바') || c.includes('냉면') ||
      c.includes('쌀국수') || c.includes('퍼') || c.includes('분짜') ||
      c.includes('파스타') || c.includes('칼국수') || c.includes('수제비') || c.includes('막국수'))
    return { category: '면류', honbab_level: 1, price_range: 2 }

  // 분식
  if (c.includes('분식') || c.includes('떡볶이') || c.includes('김밥'))
    return { category: '분식', honbab_level: 1, price_range: 1 }

  // 밥류 — 규동/돈부리/카레/덮밥/볶음밥/비빔밥/솥밥
  if (c.includes('규동') || c.includes('돈부리') || c.includes('오야코') ||
      c.includes('볶음밥') || c.includes('카레') || c.includes('덮밥') ||
      c.includes('솥밥') || c.includes('비빔밥'))
    return { category: '밥류', honbab_level: 1, price_range: 2 }

  // 이자카야 (혼술 가능)
  if (c.includes('이자카야') || c.includes('일본식주점'))
    return { category: '밥류', honbab_level: 2, price_range: 2 }

  // 1인 삼겹살 전문점 (카카오 카테고리명에 '1인' 포함 시)
  if ((c.includes('삼겹살') || c.includes('구이')) && c.includes('1인'))
    return { category: '밥류', honbab_level: 1, price_range: 2 }

  // 일식 기타 (돈까스, 초밥 등)
  if (c.includes('일식') || c.includes('초밥') || c.includes('돈까스'))
    return { category: '밥류', honbab_level: 2, price_range: 2 }

  // 한식 (국밥/해장국 계열)
  if (c.includes('국밥') || c.includes('설렁탕') || c.includes('해장국') || c.includes('순댓국'))
    return { category: '밥류', honbab_level: 1, price_range: 1 }

  // 중식 면류 (짜장/짬뽕)
  if (c.includes('짜장') || c.includes('짬뽕') || c.includes('중화'))
    return { category: '면류', honbab_level: 2, price_range: 2 }

  return { category: '기타', honbab_level: 2, price_range: 2 }
}

export default function MapTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [filterLevel, setFilterLevel] = useState<0 | 1 | 2 | 3>(0)
  const [filterCategory, setFilterCategory] = useState('전체')
  const [sortBy, setSortBy] = useState<SortBy>('score')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locQuery, setLocQuery] = useState('')
  const [locSuggestions, setLocSuggestions] = useState<{ place_name: string; lat: number; lng: number }[]>([])
  const [centerTo, setCenterTo] = useState<{ lat: number; lng: number; level?: number } | null>(null)
  const [kakaoResults, setKakaoResults] = useState<KakaoPlace[]>([])
  const [kakaoLoading, setKakaoLoading] = useState(false)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const boundsRef = useRef<MapBounds | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchByBounds = useCallback(async (bounds: MapBounds) => {
    setLoading(true)
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .gte('lat', bounds.sw_lat)
      .lte('lat', bounds.ne_lat)
      .gte('lng', bounds.sw_lng)
      .lte('lng', bounds.ne_lng)
      .limit(1000)
    if (data) setRestaurants(data as Restaurant[])
    setLoading(false)
  }, [])

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    boundsRef.current = bounds
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchByBounds(bounds), 400)
  }, [fetchByBounds])

  // 투표 수 로드 (한 번만)
  useEffect(() => {
    supabase.from('honbab_votes').select('restaurant_id, vote_type').then(({ data: votes }) => {
      if (votes) {
        const counts: Record<string, number> = {}
        votes.forEach((v: { restaurant_id: string; vote_type: string }) => {
          if (v.vote_type === 'up') counts[v.restaurant_id] = (counts[v.restaurant_id] || 0) + 1
        })
        setVoteCounts(counts)
      }
    })
  }, [])

  const handleLevelUpdated = useCallback((id: string, newLevel: 1 | 2 | 3) => {
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, honbab_level: newLevel } : r))
    setSelectedRestaurant(prev => prev?.id === id ? { ...prev, honbab_level: newLevel } : prev)
  }, [])

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) { setLocSuggestions([]); return }
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
        { headers: { Authorization: 'KakaoAK 6b2c13135baeeaddb3f9f222af85492d' } }
      )
      const json = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLocSuggestions(json.documents?.map((d: any) => ({ place_name: d.place_name, lat: parseFloat(d.y), lng: parseFloat(d.x) })) || [])
    } catch { setLocSuggestions([]) }
  }, [])

  const handleLocInput = (val: string) => {
    setLocQuery(val)
    if (locDebounceRef.current) clearTimeout(locDebounceRef.current)
    locDebounceRef.current = setTimeout(() => searchLocation(val), 300)
  }

  const selectLocation = (place: { place_name: string; lat: number; lng: number }) => {
    setLocQuery(place.place_name)
    setLocSuggestions([])
    setCenterTo({ lat: place.lat, lng: place.lng, level: 4 })
  }

  const handlePriceUpdated = useCallback((id: string, newPrice: 1 | 2 | 3 | 4) => {
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, price_range: newPrice } : r))
    setSelectedRestaurant(prev => prev?.id === id ? { ...prev, price_range: newPrice } : prev)
  }, [])

  const searchKakaoRestaurants = useCallback(async () => {
    if (!searchQuery.trim()) return
    setKakaoLoading(true)
    setKakaoResults([])
    try {
      const params = new URLSearchParams({ query: searchQuery, size: '10' })
      if (boundsRef.current) {
        params.set('x', String((boundsRef.current.sw_lng + boundsRef.current.ne_lng) / 2))
        params.set('y', String((boundsRef.current.sw_lat + boundsRef.current.ne_lat) / 2))
        params.set('radius', '3000')
      }
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, {
        headers: { Authorization: 'KakaoAK 6b2c13135baeeaddb3f9f222af85492d' }
      })
      const json = await res.json()
      setKakaoResults(json.documents || [])
    } catch { setKakaoResults([]) }
    setKakaoLoading(false)
  }, [searchQuery])

  const addFromKakao = useCallback(async (place: KakaoPlace) => {
    if (addingIds.has(place.id) || addedIds.has(place.id)) return
    const mapped = mapKakaoCategory(place.category_name)
    if (!mapped) return // 혼밥 불가 카테고리
    setAddingIds(prev => new Set(prev).add(place.id))
    const addr = place.road_address_name || place.address_name
    const { data, error } = await supabase.from('restaurants').insert({
      name: place.place_name, address: addr,
      lat: parseFloat(place.y), lng: parseFloat(place.x),
      ...mapped, honbab_tags: [],
      up_votes: 0, down_votes: 0, price_good_votes: 0, price_bad_votes: 0, edit_count: 0,
    }).select().single()
    setAddingIds(prev => { const s = new Set(prev); s.delete(place.id); return s })
    if (!error && data) {
      setAddedIds(prev => new Set(prev).add(place.id))
      setRestaurants(prev => [...prev, data as Restaurant])
    }
  }, [addingIds, addedIds])

  const filtered = useMemo(() => {
    let list = restaurants
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    }
    if (filterCategory !== '전체') list = list.filter(r => matchesCategory(r, filterCategory))
    if (filterLevel !== 0) list = list.filter(r => r.honbab_level === filterLevel)

    return [...list].sort((a, b) => {
      if (sortBy === 'score') return calcHonbabScore(b, voteCounts[b.id] || 0) - calcHonbabScore(a, voteCounts[a.id] || 0)
      if (sortBy === 'level') return a.honbab_level - b.honbab_level
      return a.name.localeCompare(b.name)
    })
  }, [restaurants, searchQuery, filterCategory, filterLevel, sortBy, voteCounts])

  return (
    <div className="flex h-full relative">
      {/* ===== 데스크탑 왼쪽 패널 ===== */}
      <div className="hidden md:flex flex-col w-96 bg-white border-r border-gray-100 overflow-hidden shrink-0">
        {/* 위치 검색 */}
        <div className="p-3 pb-0 relative">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <span className="text-blue-400 text-sm shrink-0">📍</span>
            <input value={locQuery} onChange={e => handleLocInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') { setLocQuery(''); setLocSuggestions([]) } }}
              placeholder="위치 검색 (예: 영등포역, 여의도, 부평)" className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
            {locQuery && <button onClick={() => { setLocQuery(''); setLocSuggestions([]) }} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>}
          </div>
          {locSuggestions.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              {locSuggestions.map((s, i) => (
                <button key={i} onClick={() => selectLocation(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 text-xs">📍</span>
                  {s.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 식당 검색 */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="식당명, 주소, 음식 종류" className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">✕</button>}
          </div>
        </div>

        {/* 빠른 추천 */}
        <div className="px-3 pt-3">
          <QuickRecommend restaurants={filtered} voteCounts={voteCounts} onSelect={setSelectedRestaurant} />
        </div>

        {/* 카테고리 필터 */}
        <div className="px-3 pt-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filterCategory === cat ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 난이도 필터 + 정렬 */}
        <div className="px-3 pt-2 pb-2 flex items-center justify-between border-b border-gray-100">
          <div className="flex gap-1">
            {([0, 1, 2, 3] as const).map(lv => (
              <button key={lv} onClick={() => setFilterLevel(lv)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterLevel === lv ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {lv === 0 ? '전체' : lv === 1 ? '🟢' : lv === 2 ? '🟡' : '🔴'}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
            className="text-xs text-gray-600 bg-gray-100 rounded-lg px-2 py-1 focus:outline-none">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 식당 목록 */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
          <p className="text-xs text-gray-400 font-semibold mb-1">
            {loading ? '로딩 중...' : `${filtered.length}개의 식당`}
          </p>
          {filtered.map(r => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              voteCount={voteCounts[r.id] || 0}
              selected={selectedRestaurant?.id === r.id}
              onClick={() => setSelectedRestaurant(r)}
            />
          ))}

          {/* 카카오 장소 검색으로 추가 */}
          {searchQuery.trim() && (
            <div className="mt-1 border-t border-gray-100 pt-3">
              {kakaoResults.length === 0 ? (
                <button onClick={searchKakaoRestaurants} disabled={kakaoLoading}
                  className="w-full py-2.5 text-xs text-blue-500 font-bold bg-blue-50 rounded-xl border border-blue-100 disabled:opacity-50 active:scale-95 transition-all">
                  {kakaoLoading ? '카카오 검색 중...' : '🔍 카카오에서 더 찾기'}
                </button>
              ) : (
                <>
                  <p className="text-xs text-gray-400 font-semibold mb-2">카카오 검색 결과 — 추가하면 지도에 표시돼요</p>
                  {kakaoResults.map(place => {
                    const catLabel = place.category_name.split('>').pop()?.trim() || place.category_name
                    const mapped = mapKakaoCategory(place.category_name)
                    const excluded = mapped === null
                    return (
                      <div key={place.id} className={`rounded-xl p-3 mb-2 flex items-start justify-between gap-2 border ${excluded ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{place.place_name}</p>
                          <p className={`text-xs font-medium ${excluded ? 'text-gray-400' : 'text-blue-500'}`}>{catLabel}</p>
                          <p className="text-xs text-gray-400 truncate">{place.road_address_name || place.address_name}</p>
                          <p className="text-xs mt-0.5">
                            {excluded ? '⛔ 혼밥 불가 카테고리' : mapped.honbab_level === 1 ? '🟢 혼밥 쉬움' : mapped.honbab_level === 3 ? '🔴 혼밥 어려움' : '🟡 혼밥 보통'}
                          </p>
                        </div>
                        {!excluded && (
                          <button onClick={() => addFromKakao(place)}
                            disabled={addingIds.has(place.id) || addedIds.has(place.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${addedIds.has(place.id) ? 'bg-green-100 text-green-600' : 'bg-blue-500 text-white disabled:opacity-50'}`}>
                            {addedIds.has(place.id) ? '✓ 추가됨' : addingIds.has(place.id) ? '...' : '+ 추가'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={() => setKakaoResults([])} className="w-full text-xs text-gray-400 py-1.5 hover:text-gray-600">접기 ▲</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== 지도 영역 ===== */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          restaurants={filtered}
          selectedId={selectedRestaurant?.id}
          onMarkerClick={setSelectedRestaurant}
          onBoundsChange={handleBoundsChange}
          centerTo={centerTo}
        />

        {/* 모바일 상단 검색 */}
        <div className="md:hidden absolute top-3 left-3 right-3 z-10">
          <div className="flex items-center gap-2 bg-white rounded-2xl shadow-lg px-3 py-2">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="식당명, 주소 검색" className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400">✕</button>}
          </div>
        </div>

        {/* 모바일 카테고리 필터 */}
        <div className="md:hidden absolute top-16 left-0 right-0 z-10 px-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all ${
                  filterCategory === cat ? 'bg-[#FF6B35] text-white' : 'bg-white text-gray-600'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 로딩 인디케이터 */}
        {loading && (
          <div className="absolute top-3 right-3 z-10 md:top-auto md:bottom-6 bg-white rounded-full shadow px-3 py-1.5 text-xs text-gray-500 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            로딩 중...
          </div>
        )}

        {/* 모바일 리스트 토글 버튼 */}
        <button
          onClick={() => setMobileListOpen(true)}
          className="md:hidden absolute bottom-6 left-4 z-10 flex items-center gap-2 bg-white text-gray-700 rounded-full shadow-lg px-4 py-2.5 text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>목록 {filtered.length}</span>
        </button>
      </div>

      {/* 모바일 식당 목록 바텀시트 */}
      {mobileListOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobileListOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-3xl max-h-[70dvh] flex flex-col">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="px-4 pb-2 flex items-center justify-between">
              <p className="font-bold text-gray-900 text-sm">{filtered.length}개의 식당</p>
              <div className="flex gap-1">
                {([0, 1, 2, 3] as const).map(lv => (
                  <button key={lv} onClick={() => setFilterLevel(lv)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${filterLevel === lv ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {lv === 0 ? '전체' : lv === 1 ? '🟢' : lv === 2 ? '🟡' : '🔴'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4 flex flex-col gap-2">
              {filtered.map(r => (
                <RestaurantCard key={r.id} restaurant={r} voteCount={voteCounts[r.id] || 0}
                  selected={selectedRestaurant?.id === r.id}
                  onClick={() => { setSelectedRestaurant(r); setMobileListOpen(false) }} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 식당 상세 */}
      {selectedRestaurant && (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onLevelUpdated={handleLevelUpdated}
          onPriceUpdated={handlePriceUpdated}
        />
      )}
    </div>
  )
}
