'use client'

import { Restaurant } from '@/lib/supabase'

type Props = {
  restaurant: Restaurant | null
  onClose: () => void
  onReport: (restaurant: Restaurant) => void
}

const LEVEL_INFO: Record<number, { label: string; emoji: string; color: string; bg: string }> = {
  1: { label: '쉬움', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-50' },
  2: { label: '보통', emoji: '🟡', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  3: { label: '어려움', emoji: '🔴', color: 'text-red-500', bg: 'bg-red-50' },
}

export default function BottomSheet({ restaurant, onClose, onReport }: Props) {
  const isOpen = restaurant !== null

  if (!isOpen) return null

  const level = LEVEL_INFO[restaurant.honbab_level]

  return (
    <>
      {/* 딤 배경 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-3xl shadow-2xl bottom-sheet ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-2">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{restaurant.category}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 혼밥 난이도 */}
          <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${level.bg} mb-4`}>
            <span className="text-2xl">{level.emoji}</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">혼밥 난이도</p>
              <p className={`text-base font-bold ${level.color}`}>{level.label}</p>
            </div>
          </div>

          {/* 태그 */}
          {restaurant.honbab_tags && restaurant.honbab_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {restaurant.honbab_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-full border border-orange-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 주소 */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-5">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{restaurant.address}</span>
          </div>

          {/* 제보 버튼 */}
          <button
            onClick={() => onReport(restaurant)}
            className="w-full py-3 rounded-2xl border-2 border-orange-400 text-orange-500 font-semibold text-sm hover:bg-orange-50 transition-colors"
          >
            혼밥 난이도 제보하기
          </button>
        </div>
      </div>
    </>
  )
}
