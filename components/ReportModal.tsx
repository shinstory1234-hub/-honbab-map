'use client'

import { useState } from 'react'
import { supabase, Restaurant } from '@/lib/supabase'

type Props = {
  restaurant: Restaurant | null
  onClose: () => void
}

export default function ReportModal({ restaurant, onClose }: Props) {
  const [level, setLevel] = useState<1 | 2 | 3>(1)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!restaurant) return null

  const handleSubmit = async () => {
    setLoading(true)
    const { error } = await supabase.from('honbab_reports').insert({
      restaurant_id: restaurant.id,
      reported_level: level,
      comment,
    })
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setComment('')
        onClose()
      }, 1200)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 mb-1">혼밥 난이도 제보</h3>
        <p className="text-sm text-gray-500 mb-4">{restaurant.name}</p>

        <p className="text-sm font-semibold text-gray-700 mb-2">혼밥 난이도</p>
        <div className="flex gap-3 mb-4">
          {([
            { v: 1, emoji: '🟢', label: '쉬움' },
            { v: 2, emoji: '🟡', label: '보통' },
            { v: 3, emoji: '🔴', label: '어려움' },
          ] as const).map(({ v, emoji, label }) => (
            <button
              key={v}
              onClick={() => setLevel(v)}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                level === v
                  ? 'border-orange-400 bg-orange-50 text-orange-600'
                  : 'border-gray-200 text-gray-500'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        <p className="text-sm font-semibold text-gray-700 mb-2">한줄 코멘트 (선택)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="혼밥 경험을 간단히 적어주세요"
          className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:border-orange-400"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || success}
          className="mt-4 w-full py-3.5 rounded-2xl bg-[#FF6B35] text-white font-bold text-base disabled:opacity-60 transition-all active:scale-95"
        >
          {success ? '제보 완료! 감사해요 🙏' : loading ? '제보 중...' : '제보하기'}
        </button>
      </div>
    </div>
  )
}
