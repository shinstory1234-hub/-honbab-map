'use client'

import { Restaurant } from '@/lib/supabase'

export const PRICE_LABELS: Record<number, string> = {
  1: '만원 이하',
  2: '1~2만원',
  3: '2~3만원',
  4: '3만원 이상',
}

export function calcHonbabScore(restaurant: Restaurant, upVotes = 0, downVotes = 0): number {
  const levelScore = restaurant.honbab_level === 1 ? 40 : restaurant.honbab_level === 2 ? 20 : 0
  const priceScore = restaurant.price_range === 1 ? 30 : restaurant.price_range === 2 ? 20 : restaurant.price_range === 3 ? 10 : 0
  const tagScore = Math.min((restaurant.honbab_tags?.length ?? 0) * 5, 20)
  const voteScore = Math.max(-10, Math.min(10, (upVotes - downVotes) * 2))
  return levelScore + priceScore + tagScore + voteScore
}

export function getHonbabGrade(score: number) {
  if (score >= 80) return { label: '혼밥 성지', emoji: '🏆', color: 'text-orange-600', bg: 'bg-orange-50' }
  if (score >= 60) return { label: '추천', emoji: '⭐', color: 'text-blue-600', bg: 'bg-blue-50' }
  if (score >= 40) return { label: '평범', emoji: '👌', color: 'text-gray-600', bg: 'bg-gray-50' }
  return { label: '도전', emoji: '😅', color: 'text-red-500', bg: 'bg-red-50' }
}

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
