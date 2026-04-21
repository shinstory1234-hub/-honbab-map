'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Restaurant } from '@/lib/supabase'
import { calcHonbabScore, matchesCategory } from '@/lib/honbabScore'
import RestaurantCard from '@/components/RestaurantCard'
import RestaurantDetail from '@/components/RestaurantDetail'
import QuickRecommend from '@/components/QuickRecommend'
import { type MapBounds } from '@/components/KakaoMap'

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), { ssr: false })

const CATEGORIES = ['전체', '한식', '일식', '중식', '양식', '분식', '카페', '고기']
const SORT_OPTIONS = [
  { value: 'score', label: '혼밥지수순' },
  { value: 'level', label: '난이도순' },
  { value: 'name', label: '이름순' },
] as const

type SortBy = 'score' | 'level' | 'name'

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
  const boundsRef = useRef<MapBounds | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    supabase.from('honbab_votes').select('restaurant_id').then(({ data: votes }) => {
      if (votes) {
        const counts: Record<string, number> = {}
        votes.forEach((v: { restaurant_id: string }) => { counts[v.restaurant_id] = (counts[v.restaurant_id] || 0) + 1 })
        setVoteCounts(counts)
      }
    })
  }, [])

  const handleLevelUpdated = useCallback((id: string, newLevel: 1 | 2 | 3) => {
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, honbab_level: newLevel } : r))
    setSelectedRestaurant(prev => prev?.id === id ? { ...prev, honbab_level: newLevel } : prev)
  }, [])

  const handlePriceUpdated = useCallback((id: string, newPrice: 1 | 2 | 3 | 4) => {
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, price_range: newPrice } : r))
    setSelectedRestaurant(prev => prev?.id === id ? { ...prev, price_range: newPrice } : prev)
  }, [])

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
        {/* 검색 */}
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
        </div>
      </div>

      {/* ===== 지도 영역 ===== */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          restaurants={filtered}
          selectedId={selectedRestaurant?.id}
          onMarkerClick={setSelectedRestaurant}
          onBoundsChange={handleBoundsChange}
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
