'use client'

import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Restaurant } from '@/lib/supabase'
import RestaurantCard from '@/components/RestaurantCard'
import RestaurantDetail from '@/components/RestaurantDetail'
import QuickRecommend from '@/components/QuickRecommend'
import { type MapBounds } from '@/components/KakaoMap'

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), { ssr: false })

const CATEGORIES = ['전체', '면류', '밥류', '분식', '카페']
const SORT_OPTIONS = [
  { value: 'score', label: '혼밥지수순' },
  { value: 'level', label: '쉬움순' },
  { value: 'name', label: '이름순' },
] as const

const calcHonbabScore = (r: Restaurant, upVotes: number) => {
  let score = r.honbab_level === 1 ? 80 : r.honbab_level === 2 ? 60 : 40
  score += upVotes * 2
  return Math.min(score, 100)
}

const matchesCategory = (r: Restaurant, filterCat: string) => {
  if (filterCat === '전체') return true
  if (filterCat === '면류') return r.category.includes('라멘') || r.category.includes('우동') || r.category.includes('소바') || r.category.includes('쌀국수') || r.category.includes('냉면')
  if (filterCat === '밥류') return r.category.includes('국밥') || r.category.includes('비빔밥') || r.category.includes('솥밥') || r.category.includes('덮밥') || r.category.includes('한식')
  if (filterCat === '분식') return r.category.includes('분식') || r.category.includes('떡볶이') || r.category.includes('김밥')
  if (filterCat === '카페') return r.category.includes('카페') || r.category.includes('커피') || r.category.includes('디저트') || r.category.includes('베이커리')
  return r.category.includes(filterCat)
}

type SortBy = 'score' | 'level' | 'name'

export default function MapTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [filterLevel, setFilterLevel] = useState<0 | 1 | 2 | 3>(0)
  const [filterCategory, setFilterCategory] = useState('전체')
  const [sortBy, setSortBy] = useState<SortBy>('score')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(false)
  const [locQuery, setLocQuery] = useState('')
  const [locSuggestions, setLocSuggestions] = useState<{ place_name: string; lat: number; lng: number }[]>([])
  const [centerTo, setCenterTo] = useState<{ lat: number; lng: number; level?: number } | null>(null)
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

  const handlePriceUpdated = useCallback((id: string, newPrice: 1 | 2 | 3 | 4) => {
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, price_range: newPrice } : r))
    setSelectedRestaurant(prev => prev?.id === id ? { ...prev, price_range: newPrice } : prev)
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

  // 초기 로드 시 내 위치로 자동 이동
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenterTo({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            level: 4
          })
        },
        (err) => console.error('초기 위치 획득 실패:', err)
      )
    }
  }, [])

  const filtered = useMemo(() => {
    let list = [...restaurants]
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q) || r.category.toLowerCase().includes(q))
    }
    if (filterCategory !== '전체') list = list.filter(r => matchesCategory(r, filterCategory))
    if (filterLevel !== 0) list = list.filter(r => r.honbab_level === filterLevel)

    // 중복 제거 강화: ID 기준
    const seen = new Set<string>()
    const uniqueList = list.filter(r => {
      if (!r.id || seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })

    return uniqueList.sort((a, b) => {
      if (sortBy === 'score') return calcHonbabScore(b, voteCounts[b.id] || 0) - calcHonbabScore(a, voteCounts[a.id] || 0)
      if (sortBy === 'level') return a.honbab_level - b.honbab_level
      return a.name.localeCompare(b.name)
    })
  }, [restaurants, searchQuery, filterCategory, filterLevel, sortBy, voteCounts])

  return (
    <div className="flex h-full relative">
      <div className="hidden md:flex flex-col w-96 bg-white border-r border-gray-100 overflow-hidden shrink-0">
        <div className="p-3 pb-0 relative">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <span className="text-blue-400 text-sm shrink-0">📍</span>
            <input value={locQuery} onChange={e => handleLocInput(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Escape') { setLocQuery(''); setLocSuggestions([]) } }}
              placeholder="위치 검색 (예: 영등포역, 여의도, 부평)"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
          </div>
          {locSuggestions.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              {locSuggestions.map((s, i) => (
                <button key={i} onClick={() => selectLocation(s)}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 border-b border-gray-50 last:border-0">
                  {s.place_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="식당명, 주소, 음식 종류" className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400" />
          </div>
        </div>

        <div className="px-3 pt-3">
          <QuickRecommend restaurants={filtered} voteCounts={voteCounts} onSelect={setSelectedRestaurant} />
        </div>

        <div className="px-3 pt-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filterCategory === cat ? 'bg-[#FF6B35] text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pt-2 pb-2 flex items-center justify-between border-b border-gray-100">
          <div className="flex gap-1">
            {([0, 1, 2, 3] as const).map(lv => (
              <button key={lv} onClick={() => setFilterLevel(lv)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold ${filterLevel === lv ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {lv === 0 ? '전체' : lv === 1 ? '🟢' : lv === 2 ? '🟡' : '🔴'}
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
            className="text-xs text-gray-600 bg-gray-100 rounded-lg px-2 py-1 outline-none">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-2">
          {loading && <p className="text-center text-sm text-gray-400 py-4">불러오는 중...</p>}
          {!loading && filtered.length === 0 && <p className="text-center text-sm text-gray-400 py-4">주변 식당이 없어요</p>}
          {filtered.map(r => (
            <RestaurantCard key={r.id} restaurant={r} voteCount={voteCounts[r.id] || 0} selected={selectedRestaurant?.id === r.id} onClick={() => setSelectedRestaurant(r)} />
          ))}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <KakaoMap
          restaurants={filtered}
          onMarkerClick={setSelectedRestaurant}
          onBoundsChange={handleBoundsChange}
          centerTo={centerTo}
        />
      </div>

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
