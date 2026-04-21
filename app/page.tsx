'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase, Restaurant } from '@/lib/supabase'
import BottomSheet from '@/components/BottomSheet'
import ReportModal from '@/components/ReportModal'
import AddRestaurantModal from '@/components/AddRestaurantModal'

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), { ssr: false })

type FilterLevel = 0 | 1 | 2 | 3

const FILTER_BUTTONS: { level: FilterLevel; label: string }[] = [
  { level: 0, label: '전체' },
  { level: 1, label: '🟢 쉬움' },
  { level: 2, label: '🟡 보통' },
  { level: 3, label: '🔴 어려움' },
]

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filterLevel, setFilterLevel] = useState<FilterLevel>(0)
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [reportTarget, setReportTarget] = useState<Restaurant | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fetchRestaurants = async () => {
      const { data } = await supabase.from('restaurants').select('*')
      if (data) setRestaurants(data as Restaurant[])
    }
    fetchRestaurants()
  }, [])

  const handleMarkerClick = useCallback((restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
  }, [])

  const filteredBySearch = searchQuery.trim()
    ? restaurants.filter((r) =>
        r.name.includes(searchQuery) || r.address.includes(searchQuery) || r.category.includes(searchQuery)
      )
    : restaurants

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden">
      {/* 카카오맵 */}
      <KakaoMap
        restaurants={filteredBySearch}
        filterLevel={filterLevel}
        onMarkerClick={handleMarkerClick}
      />

      {/* 상단 검색바 */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 bg-white rounded-2xl shadow-md px-4 py-2.5">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="식당명, 주소, 음식 종류 검색"
            className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 하단 필터 버튼 */}
      <div className="absolute bottom-6 left-0 right-0 z-10 px-4">
        <div className="flex gap-2 justify-center">
          {FILTER_BUTTONS.map(({ level, label }) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-4 py-2 rounded-full text-sm font-semibold shadow-md transition-all ${
                filterLevel === level
                  ? 'bg-[#FF6B35] text-white scale-105'
                  : 'bg-white text-gray-600 hover:bg-orange-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 플로팅 제보 버튼 */}
      <button
        onClick={() => setAddModalOpen(true)}
        className="absolute bottom-20 right-4 z-10 w-14 h-14 bg-[#FF6B35] text-white rounded-full shadow-xl flex items-center justify-center text-2xl font-light hover:bg-orange-500 transition-all active:scale-95"
      >
        +
      </button>

      {/* 바텀시트 */}
      <BottomSheet
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        onReport={(r) => {
          setSelectedRestaurant(null)
          setReportTarget(r)
        }}
      />

      {/* 난이도 제보 모달 */}
      <ReportModal
        restaurant={reportTarget}
        onClose={() => setReportTarget(null)}
      />

      {/* 식당 추가 모달 */}
      <AddRestaurantModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
    </div>
  )
}
