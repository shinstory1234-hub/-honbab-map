'use client'

import { useState, useEffect } from 'react'
import { supabase, ChatRoom, Restaurant } from '@/lib/supabase'
import ChatRoomView from '@/components/ChatRoom'

const LEVEL_EMOJI: Record<number, string> = { 1: '🟢', 2: '🟡', 3: '🔴' }

export default function ChatTab() {
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true)
      const { data: roomData } = await supabase.from('chat_rooms').select('*')
      if (!roomData) { setLoading(false); return }

      const restaurantIds = roomData.map(r => r.restaurant_id)
      const { data: restaurants } = await supabase.from('restaurants').select('*').in('id', restaurantIds)
      const restMap: Record<string, Restaurant> = {}
      restaurants?.forEach(r => { restMap[r.id] = r as Restaurant })

      setRooms(roomData.map(r => ({ ...r, restaurant: restMap[r.restaurant_id] })) as ChatRoom[])
      setLoading(false)
    }
    fetchRooms()
  }, [])

  if (selectedRoom) {
    return <ChatRoomView room={selectedRoom} onBack={() => setSelectedRoom(null)} />
  }

  return (
    <div className="flex flex-col h-full tab-panel bg-gray-50">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <h2 className="font-black text-gray-900">💬 혼밥방</h2>
        <p className="text-xs text-gray-400 mt-0.5">식당별 실시간 채팅방</p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm text-gray-400">채팅방이 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rooms.map(room => {
              const r = room.restaurant
              if (!r) return null
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all flex items-center gap-3"
                >
                  {/* 아이콘 */}
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center text-lg shrink-0">
                    🍴
                  </div>
                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-bold text-gray-900 text-sm truncate">{r.name}</p>
                      <span className="text-sm">{LEVEL_EMOJI[r.honbab_level]}</span>
                    </div>
                    <p className="text-xs text-gray-400">{r.category}</p>
                  </div>
                  {/* 참여자 */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      <span>{room.participants_count}명</span>
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
