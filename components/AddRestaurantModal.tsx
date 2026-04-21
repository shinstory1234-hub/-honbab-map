'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PRICE_LABELS } from '@/lib/honbabScore'

type Props = { isOpen: boolean; onClose: () => void }

export default function AddRestaurantModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({
    name: '', address: '', category: '',
    honbab_level: 1 as 1 | 2 | 3,
    price_range: 1 as 1 | 2 | 3 | 4,
    tags: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const TAG_OPTIONS = ['카운터석', '1인석', '조용한분위기', '빠른회전', '혼밥 손님 많음', '1인 메뉴 있음']

  const toggleTag = (tag: string) => {
    setForm(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }))
  }

  const handleSubmit = async () => {
    if (!form.name || !form.address) return
    setLoading(true)

    // 카카오 지오코딩으로 실제 좌표 가져오기
    let lat = 37.5665, lng = 126.9780
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(form.address)}`,
        { headers: { Authorization: 'KakaoAK 6b2c13135baeeaddb3f9f222af85492d' } }
      )
      const json = await res.json()
      const doc = json.documents?.[0]
      if (doc) { lat = parseFloat(doc.y); lng = parseFloat(doc.x) }
    } catch {}

    const { error } = await supabase.from('restaurants').insert({
      name: form.name, address: form.address,
      category: form.category || '기타',
      lat, lng,
      honbab_level: form.honbab_level,
      price_range: form.price_range,
      honbab_tags: form.tags,
    })
    setLoading(false)
    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm({ name: '', address: '', category: '', honbab_level: 1, price_range: 1, tags: [] })
        onClose()
      }, 1200)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-5 pb-10 md:pb-5 shadow-2xl max-h-[90dvh] overflow-y-auto">
        <h3 className="text-lg font-black text-gray-900 mb-4">🍴 혼밥 식당 제보</h3>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">식당명 *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="예: 이치란 라멘" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">주소 *</label>
            <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              placeholder="예: 서울 마포구 홍대입구역" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">카테고리</label>
            <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="예: 라멘, 한식, 덮밥..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">혼밥 난이도</label>
            <div className="flex gap-2">
              {([{ v: 1, e: '🟢', l: '쉬움' }, { v: 2, e: '🟡', l: '보통' }, { v: 3, e: '🔴', l: '어려움' }] as const).map(({ v, e, l }) => (
                <button key={v} onClick={() => setForm(p => ({ ...p, honbab_level: v }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${form.honbab_level === v ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
                  {e} {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">가격대</label>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2, 3, 4] as const).map(v => (
                <button key={v} onClick={() => setForm(p => ({ ...p, price_range: v }))}
                  className={`py-2 rounded-xl border-2 font-semibold text-xs transition-all ${form.price_range === v ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
                  {PRICE_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 block mb-2">특징 태그</label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.tags.includes(tag) ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || success || !form.name || !form.address}
          className="mt-5 w-full py-3.5 rounded-2xl bg-[#FF6B35] text-white font-bold text-sm disabled:opacity-50 transition-all active:scale-95">
          {success ? '제보 완료! 감사해요 🙏' : loading ? '등록 중...' : '제보하기'}
        </button>
      </div>
    </div>
  )
}
