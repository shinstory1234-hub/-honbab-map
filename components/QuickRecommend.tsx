'use client'

import { useState } from 'react'
import { Restaurant } from '@/lib/supabase'

export const PRICE_LABELS: Record<number, string> = {
  1: '만원 이하',
  2: '1~2만원',
  3: '2~3만원',
  4: '3만원 이상',
}

export function calcHonbabScore(restaurant: Restaurant, upVotes = 0, downVotes = 0): number {
  const lv = restaurant.honbab_level as number
  let baseScore = 60 

  if (lv === 1) baseScore = 80
  else if (lv === 2) baseScore = 60
  else if (lv === 3) baseScore = 40

  if (restaurant.category.includes('제과') || restaurant.category.includes('베이커리') || restaurant.category.includes('빵') || restaurant.category.includes('디저트')) baseScore = 80
  else if (restaurant.category.includes('한식')) baseScore = 70
  else if (restaurant.category.includes('중식') || restaurant.category.includes('짜장') || restaurant.category.includes('짬뽕')) baseScore = 60

  const voteScore = Math.max(-10, Math.min(10, (upVotes - downVotes) * 2))
  return Math.max(0, Math.min(100, baseScore + voteScore))
}

export function getHonbabGrade(score: number) {
  if (score >= 90) return { label: '혼밥 성지', emoji: '🏆', color: 'text-green-600', bg: 'bg-green-50' }
  if (score >= 80) return { label: '추천', emoji: '⭐', color: 'text-blue-600', bg: 'bg-blue-50' }
  if (score >= 60) return { label: '보통', emoji: '👌', color: 'text-yellow-600', bg: 'bg-yellow-50' }
  return { label: '도전', emoji: '😅', color: 'text-red-500', bg: 'bg-red-50' }
}

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const LEVEL_INFO: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: '쉬움', emoji: '🟢', color: 'text-green-600' },
  2: { label: '보통', emoji: '🟡', color: 'text-yellow-600' },
  3: { label: '어려움', emoji: '🔴', color: 'text-red-500' },
}

type Props = {
  restaurants: Restaurant[]
  voteCounts: Record<string, number>
  onSelect: (r: Restaurant) => void
}

type State = 'idle' | 'loading' | 'results' | 'empty' | 'error'

export default function QuickRecommend({ restaurants, voteCounts, onSelect }: Props) {
  const [state, setState] = useState<State>('idle')
  const [results, setResults] = useState<Restaurant[]>([])

  const getPriceLabel = (r: Restaurant) => {
    if (r.price_range === 1) return '가성비'
    if (r.price_range === 3) return '프리미엄'
    if (r.price_range === 4) return '고급'
    return '표준'
  }

  const handleRecommend = () => {
    setState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const near = restaurants.filter(r => getDistance(latitude, longitude, r.lat, r.lng) <= 500)
        let candidates = near.filter(r => calcHonbabScore(r, voteCounts[r.id] || 0) >= 80)
        if (candidates.length < 3) {
          candidates = near.filter(r => calcHonbabScore(r, voteCounts[r.id] || 0) >= 60)
        }
        if (candidates.length < 3) candidates = near
        if (candidates.length === 0) { setState('empty'); return }
        // 랜덤 셔플 후 3개
        const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 3)
        setResults(shuffled)
        setState('results')
      },
      () => setState('error')
    )
  }

  if (state === 'idle') {
    return (
      <button
        onClick={handleRecommend}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6B35] text-white rounded-xl font-semibold text-sm shadow-md hover:bg-orange-500 transition-all active:scale-95 w-full"
      >
        <span className="text-base">⚡</span>
        <span>지금 근처 혼밥 추천</span>
      </button>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-100 text-orange-500 rounded-xl text-sm font-semibold w-full">
        <span className="animate-pulse">📍</span>
        <span>위치 확인 중...</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="bg-gray-100 rounded-xl p-3 w-full">
        <p className="text-xs text-gray-500 mb-2">위치 접근 권한이 필요해요</p>
        <button onClick={() => setState('idle')} className="text-xs text-[#FF6B35] font-semibold">다시 시도</button>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="bg-gray-100 rounded-xl p-3 w-full">
        <p className="text-xs text-gray-500 mb-2">반경 500m 내 식당이 없어요 🥲</p>
        <button onClick={() => setState('idle')} className="text-xs text-[#FF6B35] font-semibold">다시 시도</button>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-700">⚡ 근처 혼밥 추천</p>
        <button onClick={() => setState('idle')} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
      </div>
      <div className="flex flex-col gap-2">
        {results.map(r => {
          const score = calcHonbabScore(r, voteCounts[r.id] || 0)
          const grade = getHonbabGrade(score)
          const level = LEVEL_INFO[r.honbab_level]
          return (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setState('idle') }}
              className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:border-orange-200 transition-all text-left"
            >
              <span className="text-xl">{grade.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{r.name}</p>
                <p className="text-xs text-gray-400">{level.emoji} {level.label} · {getPriceLabel(r)}</p>
              </div>
              <span className={`text-sm font-black ${grade.color}`}>{score}점</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

