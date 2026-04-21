'use client'

import { useState, useEffect } from 'react'
import { supabase, Restaurant, HonbabTip } from '@/lib/supabase'
import { calcHonbabScore, getHonbabGrade, PRICE_LABELS, getNickname, addCheckin } from '@/lib/honbabScore'

const LEVEL_INFO = {
  1: { label: '쉬움', emoji: '🟢', color: 'text-green-600', bg: 'bg-green-50' },
  2: { label: '보통', emoji: '🟡', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  3: { label: '어려움', emoji: '🔴', color: 'text-red-500', bg: 'bg-red-50' },
} as const

type PriceVoteCounts = { 1: number; 2: number; 3: number; 4: number }

type Props = {
  restaurant: Restaurant | null
  onClose: () => void
  onLevelUpdated?: (id: string, newLevel: 1 | 2 | 3) => void
  onPriceUpdated?: (id: string, newPrice: 1 | 2 | 3 | 4) => void
}

export default function RestaurantDetail({ restaurant, onClose, onLevelUpdated, onPriceUpdated }: Props) {
  const [upVotes, setUpVotes] = useState(0)
  const [downVotes, setDownVotes] = useState(0)
  const [priceVotes, setPriceVotes] = useState<PriceVoteCounts>({ 1: 0, 2: 0, 3: 0, 4: 0 })
  const [tips, setTips] = useState<HonbabTip[]>([])
  const [tipInput, setTipInput] = useState('')
  const [voting, setVoting] = useState(false)
  const [priceVoting, setPriceVoting] = useState(false)
  const [submittingTip, setSubmittingTip] = useState(false)
  const [checkedIn, setCheckedIn] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editField, setEditField] = useState('category')
  const [editValue, setEditValue] = useState('')
  const [closedReported, setClosedReported] = useState(false)

  useEffect(() => {
    if (!restaurant) return
    setCheckedIn(false)
    setShowEditForm(false)
    setClosedReported(false)
    setTipInput('')
    setEditValue('')
    fetchVotes(restaurant.id)
    fetchPriceVotes(restaurant.id)
    fetchTips(restaurant.id)
  }, [restaurant?.id])

  const fetchVotes = async (id: string) => {
    const { data } = await supabase.from('honbab_votes').select('vote_type').eq('restaurant_id', id)
    if (data) {
      setUpVotes(data.filter(v => v.vote_type === 'up').length)
      setDownVotes(data.filter(v => v.vote_type === 'down').length)
    }
  }

  const fetchPriceVotes = async (id: string) => {
    const { data } = await supabase.from('price_votes').select('vote').eq('restaurant_id', id)
    if (data) {
      const counts: PriceVoteCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }
      data.forEach(v => { counts[v.vote as 1 | 2 | 3 | 4]++ })
      setPriceVotes(counts)
    }
  }

  const fetchTips = async (id: string) => {
    const { data } = await supabase.from('honbab_tips').select('*').eq('restaurant_id', id).order('created_at', { ascending: false }).limit(5)
    if (data) setTips(data as HonbabTip[])
  }

  const handleVote = async (type: 'up' | 'down') => {
    if (!restaurant || voting) return
    setVoting(true)
    await supabase.from('honbab_votes').insert({ restaurant_id: restaurant.id, vote_type: type })
    const newUp = type === 'up' ? upVotes + 1 : upVotes
    const newDown = type === 'down' ? downVotes + 1 : downVotes
    setUpVotes(newUp)
    setDownVotes(newDown)
    const total = newUp + newDown
    let newLevel: 1 | 2 | 3 = restaurant.honbab_level
    if (total >= 10) {
      if (newDown / total >= 0.7) newLevel = 3
      else if (newUp / total >= 0.7) newLevel = 1
      else newLevel = 2
    }
    const update: Record<string, unknown> = { up_votes: newUp, down_votes: newDown }
    if (newLevel !== restaurant.honbab_level) update.honbab_level = newLevel
    await supabase.from('restaurants').update(update).eq('id', restaurant.id)
    if (newLevel !== restaurant.honbab_level) onLevelUpdated?.(restaurant.id, newLevel)
    setVoting(false)
  }

  const handlePriceVote = async (vote: 1 | 2 | 3 | 4) => {
    if (!restaurant || priceVoting) return
    setPriceVoting(true)
    await supabase.from('price_votes').insert({ restaurant_id: restaurant.id, vote })
    const newCounts = { ...priceVotes, [vote]: priceVotes[vote] + 1 }
    setPriceVotes(newCounts)
    const total = newCounts[1] + newCounts[2] + newCounts[3] + newCounts[4]
    const avg = (newCounts[1] + newCounts[2] * 2 + newCounts[3] * 3 + newCounts[4] * 4) / total
    const newPrice = Math.round(avg) as 1 | 2 | 3 | 4
    await supabase.from('restaurants').update({ price_range: newPrice }).eq('id', restaurant.id)
    onPriceUpdated?.(restaurant.id, newPrice)
    setPriceVoting(false)
  }

  const handleTipSubmit = async () => {
    if (!restaurant || !tipInput.trim() || submittingTip) return
    setSubmittingTip(true)
    await supabase.from('honbab_tips').insert({ restaurant_id: restaurant.id, nickname: getNickname(), tip: tipInput.trim() })
    setTipInput('')
    await fetchTips(restaurant.id)
    setSubmittingTip(false)
  }

  const handleClosedReport = async () => {
    if (!restaurant || closedReported) return
    await supabase.from('edit_suggestions').insert({
      restaurant_id: restaurant.id, field: 'status',
      old_value: 'open', new_value: 'closed', nickname: getNickname(),
    })
    setClosedReported(true)
  }

  const handleEditSubmit = async () => {
    if (!restaurant || !editValue.trim()) return
    const oldValue = editField === 'category' ? restaurant.category : editField === 'price_range' ? String(restaurant.price_range) : ''
    await supabase.from('edit_suggestions').insert({
      restaurant_id: restaurant.id, field: editField,
      old_value: oldValue, new_value: editValue.trim(), nickname: getNickname(),
    })
    await supabase.from('restaurants').update({ edit_count: (restaurant.edit_count || 0) + 1 }).eq('id', restaurant.id)
    setEditValue('')
    setShowEditForm(false)
  }

  const handleCheckin = async () => {
    if (!restaurant || checkedIn) return
    addCheckin(restaurant.id, restaurant.name)
    await supabase.from('checkins').insert({ restaurant_id: restaurant.id, nickname: getNickname() })
    setCheckedIn(true)
  }

  if (!restaurant) return null

  const level = LEVEL_INFO[restaurant.honbab_level]
  const totalVotes = upVotes + downVotes
  const upPct = totalVotes > 0 ? Math.round((upVotes / totalVotes) * 100) : 0
  const downPct = totalVotes > 0 ? 100 - upPct : 0
  const totalPriceVotes = priceVotes[1] + priceVotes[2] + priceVotes[3] + priceVotes[4]
  const score = calcHonbabScore(restaurant, totalVotes)
  const grade = getHonbabGrade(score)

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 md:absolute md:bottom-auto md:top-0 md:right-0 md:w-96 md:h-full md:z-20 bg-white md:border-l md:border-gray-100 md:shadow-xl rounded-t-3xl md:rounded-none overflow-y-auto max-h-[85dvh] md:max-h-full">
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
                <p className="text-xs text-gray-400">가격대 {totalPriceVotes > 0 ? `(${totalPriceVotes}명)` : ''}</p>
                <p className="text-sm font-bold text-gray-700">{PRICE_LABELS[restaurant.price_range] || '미정'}</p>
              </div>
            </div>
          </div>

          {/* 태그 */}
          {restaurant.honbab_tags && restaurant.honbab_tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {restaurant.honbab_tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-orange-50 text-orange-500 text-xs font-semibold rounded-full border border-orange-100">{tag}</span>
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

          {/* 업/다운 투표 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-3">
            <p className="text-sm font-bold text-gray-700 mb-3">이 식당 혼밥 어때요?</p>
            {totalVotes > 0 && (
              <div className="mb-3">
                <div className="flex overflow-hidden rounded-full h-3 mb-1">
                  <div className="bg-green-400 transition-all duration-500" style={{ width: `${upPct}%` }} />
                  <div className="bg-red-400 transition-all duration-500" style={{ width: `${downPct}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 font-semibold">👍 {upPct}% ({upVotes}명)</span>
                  <span className="text-red-500 font-semibold">{downPct}% ({downVotes}명) 👎</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleVote('up')} disabled={voting}
                className="flex-1 py-2.5 rounded-xl border-2 border-green-400 bg-green-50 text-green-600 font-bold text-sm disabled:opacity-60 active:scale-95 transition-all">
                👍 혼밥 하기 좋아요
              </button>
              <button onClick={() => handleVote('down')} disabled={voting}
                className="flex-1 py-2.5 rounded-xl border-2 border-red-400 bg-red-50 text-red-500 font-bold text-sm disabled:opacity-60 active:scale-95 transition-all">
                👎 혼밥 힘들어요
              </button>
            </div>
            {totalVotes > 0 && <p className="text-xs text-gray-400 text-center mt-2">총 {totalVotes}명 참여</p>}
          </div>

          {/* 가격 투표 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-3">
            <p className="text-sm font-bold text-gray-700 mb-3">실제 가격대가 어때요?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { v: 1, label: '저렴', emoji: '💚', color: 'border-green-400 bg-green-50 text-green-600' },
                { v: 2, label: '보통', emoji: '🟡', color: 'border-yellow-400 bg-yellow-50 text-yellow-600' },
                { v: 3, label: '비쌈', emoji: '🟠', color: 'border-orange-400 bg-orange-50 text-orange-600' },
                { v: 4, label: '고급', emoji: '💎', color: 'border-purple-400 bg-purple-50 text-purple-600' },
              ] as const).map(({ v, label, emoji, color }) => (
                <button key={v} onClick={() => handlePriceVote(v)} disabled={priceVoting}
                  className={`flex flex-col items-center py-2.5 rounded-xl border-2 font-semibold text-xs disabled:opacity-60 active:scale-95 transition-all ${color}`}>
                  <span className="text-base mb-0.5">{emoji}</span>
                  <span>{label}</span>
                  <span className="opacity-70 mt-0.5">{priceVotes[v]}명</span>
                </button>
              ))}
            </div>
            {totalPriceVotes > 0 && <p className="text-xs text-gray-400 text-center mt-2">총 {totalPriceVotes}명 참여</p>}
          </div>

          {/* 혼밥 꿀팁 */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-3">
            <p className="text-sm font-bold text-gray-700 mb-3">💡 혼밥 꿀팁</p>
            {tips.length > 0 ? (
              <div className="flex flex-col gap-2 mb-3">
                {tips.map(t => (
                  <div key={t.id} className="bg-white rounded-xl px-3 py-2.5">
                    <p className="text-xs text-orange-400 font-bold mb-0.5">{t.nickname}</p>
                    <p className="text-sm text-gray-700">{t.tip}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-3">아직 꿀팁이 없어요. 첫 번째로 남겨보세요!</p>
            )}
            <div className="flex gap-2">
              <input value={tipInput} onChange={e => setTipInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTipSubmit()}
                placeholder="예: 점심 피크타임 피하면 여유로워요" maxLength={100}
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-400 bg-white" />
              <button onClick={handleTipSubmit} disabled={!tipInput.trim() || submittingTip}
                className="px-3 py-2 bg-orange-400 text-white rounded-xl text-sm font-bold disabled:opacity-50 shrink-0">
                {submittingTip ? '...' : '등록'}
              </button>
            </div>
          </div>

          {/* 폐업신고 + 정보수정 */}
          <div className="flex gap-2 mb-3">
            <button onClick={handleClosedReport} disabled={closedReported}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${closedReported ? 'border-gray-200 text-gray-400 bg-gray-50' : 'border-red-200 text-red-500 bg-red-50'}`}>
              {closedReported ? '✅ 신고 완료' : '🚫 폐업 신고'}
            </button>
            <button onClick={() => setShowEditForm(v => !v)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold border-2 border-blue-200 text-blue-500 bg-blue-50 active:scale-95 transition-all">
              ✏️ 정보 수정 제안{restaurant.edit_count ? ` (${restaurant.edit_count}회)` : ''}
            </button>
          </div>

          {showEditForm && (
            <div className="bg-blue-50 rounded-2xl p-4 mb-3 border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-2">수정할 항목 선택</p>
              <select value={editField} onChange={e => setEditField(e.target.value)}
                className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none bg-white">
                <option value="category">카테고리</option>
                <option value="price_range">가격대</option>
                <option value="honbab_tags">혼밥 태그</option>
                <option value="hours">운영시간</option>
              </select>
              <input value={editValue} onChange={e => setEditValue(e.target.value)}
                placeholder="올바른 정보를 입력해주세요"
                className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none bg-white" />
              <button onClick={handleEditSubmit} disabled={!editValue.trim()}
                className="w-full py-2 bg-blue-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                제안하기
              </button>
            </div>
          )}

          {/* 체크인 */}
          <button onClick={handleCheckin} disabled={checkedIn}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${checkedIn ? 'bg-green-100 text-green-600 cursor-default' : 'bg-[#FF6B35] text-white hover:bg-orange-500 active:scale-95'}`}>
            {checkedIn ? '✅ 오늘 혼밥 완료!' : '🍱 오늘 여기서 혼밥했어요'}
          </button>
        </div>
      </div>
    </>
  )
}
