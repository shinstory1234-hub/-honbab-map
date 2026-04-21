'use client'

import { useState, useEffect } from 'react'
import { getCheckins, CheckinRecord, getNickname } from '@/lib/honbabScore'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function MyPageModal({ isOpen, onClose }: Props) {
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [nickname, setNickname] = useState('')
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCheckins(getCheckins())
      setNickname(getNickname())
    }
  }, [isOpen])

  const thisMonth = checkins.filter(c => {
    const d = new Date(c.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const frequencyMap: Record<string, { name: string; count: number }> = {}
  checkins.forEach(c => {
    if (!frequencyMap[c.restaurantId]) frequencyMap[c.restaurantId] = { name: c.restaurantName, count: 0 }
    frequencyMap[c.restaurantId].count++
  })
  const topRestaurant = Object.values(frequencyMap).sort((a, b) => b.count - a.count)[0]

  const saveNickname = () => {
    if (nicknameInput.trim()) {
      localStorage.setItem('honbab_nickname', nicknameInput.trim())
      setNickname(nicknameInput.trim())
    }
    setEditingNickname(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-t-3xl md:rounded-3xl p-6 pb-10 md:pb-6 shadow-2xl max-h-[80dvh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-gray-900">🍱 내 혼밥 기록</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 닉네임 */}
        <div className="bg-orange-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">내 닉네임</p>
          {editingNickname ? (
            <div className="flex gap-2">
              <input
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                className="flex-1 border border-orange-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                autoFocus
              />
              <button onClick={saveNickname} className="text-sm font-bold text-[#FF6B35]">저장</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900">{nickname}</p>
              <button onClick={() => { setNicknameInput(nickname); setEditingNickname(true) }} className="text-xs text-[#FF6B35] font-semibold">변경</button>
            </div>
          )}
        </div>

        {/* 이번 달 통계 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-[#FF6B35]">{thisMonth.length}</p>
            <p className="text-xs text-gray-500 mt-1">이번 달 혼밥 횟수</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-[#FF6B35]">{Object.keys(frequencyMap).length}</p>
            <p className="text-xs text-gray-500 mt-1">방문한 식당 수</p>
          </div>
        </div>

        {/* 자주 간 식당 */}
        {topRestaurant && (
          <div className="bg-orange-50 rounded-2xl p-4 mb-4">
            <p className="text-xs text-gray-400 mb-1">가장 자주 간 식당</p>
            <p className="font-bold text-gray-900">{topRestaurant.name}</p>
            <p className="text-xs text-[#FF6B35] font-semibold">{topRestaurant.count}번 방문</p>
          </div>
        )}

        {/* 방문 히스토리 */}
        {checkins.length > 0 ? (
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">방문 기록</p>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin">
              {checkins.map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">{c.restaurantName}</p>
                  <p className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">🍱</p>
            <p className="text-sm text-gray-400">아직 체크인 기록이 없어요</p>
            <p className="text-xs text-gray-300 mt-1">식당 상세에서 체크인해보세요!</p>
          </div>
        )}
      </div>
    </div>
  )
}
