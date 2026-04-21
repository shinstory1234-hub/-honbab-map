'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function AddRestaurantModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    category: '',
    honbab_level: 1 as 1 | 2 | 3,
    tags: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const TAG_OPTIONS = ['카운터석', '1인석', '조용한분위기', '빠른회전', '혼밥 손님 많음', '1인 메뉴 있음']

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.address) return
    setLoading(true)

    // 주소로 좌표 변환은 실제 환경에서 카카오 지오코딩 API 필요
    // 여기서는 서울 중심 좌표로 임시 처리
    const { error } = await supabase.from('restaurants').insert({
      name: form.name,
      address: form.address,
      category: form.category || '기타',
      lat: 37.5665 + (Math.random() - 0.5) * 0.02,
      lng: 126.9780 + (Math.random() - 0.5) * 0.02,
      honbab_level: form.honbab_level,
      honbab_tags: form.tags,
    })

    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm({ name: '', address: '', category: '', honbab_level: 1, tags: [] })
        onClose()
      }, 1200)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-10 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-4">혼밥 식당 제보하기</h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">식당명 *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 혼밥식당"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">주소 *</label>
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="예: 서울 마포구 홍대입구역"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">음식 카테고리</label>
            <input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="예: 라멘, 덮밥, 분식..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">혼밥 난이도</label>
            <div className="flex gap-3">
              {([
                { v: 1, emoji: '🟢', label: '쉬움' },
                { v: 2, emoji: '🟡', label: '보통' },
                { v: 3, emoji: '🔴', label: '어려움' },
              ] as const).map(({ v, emoji, label }) => (
                <button
                  key={v}
                  onClick={() => setForm((p) => ({ ...p, honbab_level: v }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                    form.honbab_level === v
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">특징 태그 (복수 선택 가능)</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    form.tags.includes(tag)
                      ? 'border-orange-400 bg-orange-50 text-orange-600'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || success || !form.name || !form.address}
          className="mt-5 w-full py-3.5 rounded-2xl bg-[#FF6B35] text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95"
        >
          {success ? '제보 완료! 감사해요 🙏' : loading ? '등록 중...' : '제보하기'}
        </button>
      </div>
    </div>
  )
}
