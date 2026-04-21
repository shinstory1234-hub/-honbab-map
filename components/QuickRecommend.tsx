'use client'

import { useState } from 'react'
import { Restaurant } from '@/lib/supabase'
import { calcHonbabScore, getHonbabGrade, getDistance, PRICE_LABELS } from '@/lib/honbabScore'

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
                <p className="text-xs text-gray-400">{level.emoji} {level.label} · {PRICE_LABELS[r.price_range]}</p>
              </div>
              <span className={`text-sm font-black ${grade.color}`}>{score}점</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
