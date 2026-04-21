'use client'

import { useState, useEffect } from 'react'
import { supabase, Restaurant } from '@/lib/supabase'
import { calcHonbabScore, getHonbabGrade, PRICE_LABELS, getNickname, addCheckin } from '@/lib/honbabScore'

const LEVEL_INFO: Record<number, { label: string; emoji: string; color: string; bg: string }> = {
  1: { label: '쉬움', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-50' },
  2: { label: '보통', emoji: '🟡', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  3: { label: '어려움', emoji: '🔴', color: 'text-red-500', bg: 'bg-red-50' },
}

type VoteCounts = { 1: number; 2: number; 3: number }

type Props = {
  restaurant: Restaurant | null
  onClose: () => void
  onLevelUpdated?: (id: string, newLevel: 1 | 2 | 3) => void
}

export default function RestaurantDetail({ restaurant, onClose, onLevelUpdated }: Props) {
  const [votes, setVotes] = useState<VoteCounts>({ 1: 0, 2: 0, 3: 0 })
  const [voting, setVoting] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)

  useEffect(() => {
    if (!restaurant) return
    setCheckedIn(false)
    fetchVotes(restaurant.id)
  }, [restaurant])

  const fetchVotes = async (id: string) => {
    const { data } = await supabase.from('honbab_votes').select('vote').eq('restaurant_id', id)
    if (data) {
      const counts: VoteCounts = { 1: 0, 2: 0, 3: 0 }
      data.forEach(v => { counts[v.vote as 1 | 2 | 3]++ })
      setVotes(counts)
    }
  }

  const handleVote = async (vote: 1 | 2 | 3) => {
    if (!restaurant || voting) return
    setVoting(true)
    await supabase.from('honbab_votes').insert({ restaurant_id: restaurant.id, vote })
    const { data } = await supabase.from('honbab_votes').select('vote').eq('restaurant_id', restaurant.id)
    if (data && data.length > 0) {
      const counts: VoteCounts = { 1: 0, 2: 0, 3: 0 }
      data.forEach(v => { counts[v.vote as 1 | 2 | 3]++ })
      setVotes(counts)
      const avg = data.reduce((s, v) => s + v.vote, 0) / data.length
      const newLevel = Math.round(avg) as 1 | 2 | 3
      await supabase.from('restaurants').update({ honbab_level: newLevel }).eq('id', restaurant.id)
      onLevelUpdated?.(restaurant.id, newLevel)
    }
    setVoting(false)
  }

  const handleCheckin = async () => {
    if (!restaurant || checkedIn) return
    const nickname = getNickname()
    addCheckin(restaurant.id, restaurant.name)
    await supabase.from('checkins').insert({ restaurant_id: restaurant.id, nickname })
    setCheckedIn(true)
  }

  if (!restaurant) return null

  const level = LEVEL_INFO[restaurant.honbab_level]
  const totalVotes = votes[1] + votes[2] + votes[3]
  const score = calcHonbabScore(restaurant, totalVotes)
  const grade = getHonbabGrade(score)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 md:absolute md:bottom-auto md:top-0 md:right-0 md:w-96 md:h-full md:z-20 bg-white md:border-l md:border-gray-100 md:shadow-xl rounded-t-3xl md:rounded-none overflow-y-auto max-h-[85dvh] md:max-h-full">
        {/* 핸들 (모바일) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="p-5 pb-8">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">{restaurant.name}</h2>
              <p className="text-sm text-gray-400 mt-0.5">{restaurant.category}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 혼밥 지수 */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${grade.bg} mb-4`}>
            <div>
              <p className="text-xs text-gray-500 font-medium">직장인 혼밥 지수</p>
              <p className={`text-2xl font-black ${grade.color}`}>{score}점</p>
            </div>
            <div className="text-right">
              <p className="text-2xl">{grade.emoji}</p>
              <p className={`text-sm font-bold ${grade.color}`}>{grade.label}</p>
            </div>
          </div>

          {/* 난이도 + 가격 */}
          <div className="flex gap-2 mb-4">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl ${level.bg}`}>
              <span className="text-lg">{level.emoji}</span>
              <div>
                <p className="text-xs text-gray-400">혼밥 난이도</p>
                <p className={`text-sm font-bold ${level.color}`}>{level.label}</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-xs text-gray-400">가격대</p>
                <p className="text-sm font-bold text-gray-700">{PRICE_LABELS[restaurant.price_range] || '미정'}</p>
              </div>
            </div>
          </div>

          {/* 태그 */}
          {restaurant.honbab_tags && restaurant.honbab_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {restaurant.honbab_tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-500 text-xs font-semibold rounded-full border border-orange-100">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 주소 */}
          <div className="flex items-start gap-2 text-sm text-gray-500 mb-5 px-1">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{restaurant.address}</span>
          </div>

          {/* 유저 투표 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-1">이 식당 혼밥 어때요?</p>
            <p className="text-xs text-gray-400 mb-3">투표하면 난이도가 자동으로 업데이트돼요</p>
            <div className="flex gap-2">
              {([
                { v: 1, label: '쉬움', emoji: '👍', color: 'border-green-400 bg-green-50 text-green-600' },
                { v: 2, label: '보통', emoji: '😐', color: 'border-yellow-400 bg-yellow-50 text-yellow-600' },
                { v: 3, label: '어려움', emoji: '👎', color: 'border-red-400 bg-red-50 text-red-500' },
              ] as const).map(({ v, label, emoji, color }) => (
                <button
                  key={v}
                  onClick={() => handleVote(v)}
                  disabled={voting}
                  className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border-2 font-semibold text-xs transition-all disabled:opacity-60 ${color}`}
                >
                  <span className="text-lg mb-0.5">{emoji}</span>
                  <span>{label}</span>
                  <span className="text-xs font-normal opacity-70 mt-0.5">{votes[v]}명</span>
                </button>
              ))}
            </div>
            {totalVotes > 0 && (
              <p className="text-xs text-gray-400 text-center mt-2">총 {totalVotes}명 참여</p>
            )}
          </div>

          {/* 체크인 */}
          <button
            onClick={handleCheckin}
            disabled={checkedIn}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
              checkedIn
                ? 'bg-green-100 text-green-600 cursor-default'
                : 'bg-[#FF6B35] text-white hover:bg-orange-500 active:scale-95'
            }`}
          >
            {checkedIn ? '✅ 오늘 혼밥 완료!' : '🍱 오늘 여기서 혼밥했어요'}
          </button>
        </div>
      </div>
    </>
  )
}
