'use client'

import { Restaurant } from '@/lib/supabase'
import { calcHonbabScore, getHonbabGrade, PRICE_LABELS } from '@/lib/honbabScore'

const LEVEL_INFO: Record<number, { label: string; emoji: string; color: string; bg: string }> = {
  1: { label: '쉬움', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-50' },
  2: { label: '보통', emoji: '🟡', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  3: { label: '어려움', emoji: '🔴', color: 'text-red-500', bg: 'bg-red-50' },
}

type Props = {
  restaurant: Restaurant
  voteCount?: number
  selected?: boolean
  onClick: () => void
}

export default function RestaurantCard({ restaurant, voteCount = 0, selected, onClick }: Props) {
  const score = calcHonbabScore(restaurant, voteCount)
  const grade = getHonbabGrade(score)
  const level = LEVEL_INFO[restaurant.honbab_level]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all ${
        selected
          ? 'border-[#FF6B35] bg-orange-50 shadow-md'
          : 'border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{restaurant.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{restaurant.category}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${grade.bg} shrink-0 ml-2`}>
          <span className="text-sm">{grade.emoji}</span>
          <span className={`text-xs font-bold ${grade.color}`}>{score}점</span>
        </div>
      </div>

      {/* 뱃지 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${level.bg} ${level.color}`}>
          {level.emoji} {level.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {PRICE_LABELS[restaurant.price_range] || '가격 미정'}
        </span>
      </div>

      {/* 태그 */}
      {restaurant.honbab_tags && restaurant.honbab_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {restaurant.honbab_tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 등급 라벨 */}
      <div className="mt-2 flex items-center gap-1">
        <span className={`text-xs font-semibold ${grade.color}`}>{grade.label}</span>
        {voteCount > 0 && <span className="text-xs text-gray-400">· 투표 {voteCount}명</span>}
      </div>
    </button>
  )
}
