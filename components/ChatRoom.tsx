'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, Message, ChatRoom } from '@/lib/supabase'
import { getNickname } from '@/lib/honbabScore'

type Props = {
  room: ChatRoom
  onBack: () => void
}

function timeStr(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatRoomView({ room, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [participants, setParticipants] = useState(0)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const nickname = getNickname()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 초기 메시지 로드
    supabase.from('messages').select('*').eq('room_id', room.id).order('created_at').then(({ data }) => {
      if (data) setMessages(data as Message[])
    })

    // 참여자 수 증가 (fetch → +1 → set)
    supabase.from('chat_rooms').select('participants_count').eq('id', room.id).single().then(({ data }) => {
      const current = data?.participants_count ?? 0
      const next = current + 1
      supabase.from('chat_rooms').update({ participants_count: next }).eq('id', room.id)
      setParticipants(next)
    })

    // Realtime: 다른 사람 메시지만 (내가 보낸 건 send()에서 즉시 추가)
    const channel = supabase.channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${room.id}`
      }, payload => {
        const msg = payload.new as Message
        // 내가 보낸 메시지는 이미 추가됐으므로 중복 방지
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.from('chat_rooms').select('participants_count').eq('id', room.id).single().then(({ data }) => {
        const current = data?.participants_count ?? 1
        supabase.from('chat_rooms').update({ participants_count: Math.max(0, current - 1) }).eq('id', room.id)
      })
    }
  }, [room.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!content.trim() || sending) return
    setSending(true)
    const text = content.trim()
    setContent('')
    const { data, error } = await supabase
      .from('messages')
      .insert({ room_id: room.id, content: text, author: nickname })
      .select()
      .single()
    if (data && !error) {
      // 내 메시지 즉시 추가 (realtime 중복 방지는 id 체크로)
      setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message])
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full tab-panel">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{room.restaurant?.name || '채팅방'}</p>
          <p className="text-xs text-gray-400">{room.restaurant?.category}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-500 font-semibold bg-green-50 px-2 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>{participants}명</span>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-2 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-2xl mb-1">💬</p>
            <p className="text-sm">첫 번째 메시지를 보내보세요!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMine = msg.author === nickname
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {!isMine && <p className="text-xs text-gray-500 font-semibold mb-1 ml-1">{msg.author}</p>}
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                isMine ? 'bg-[#FF6B35] text-white rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              <p className="text-xs text-gray-400 mt-0.5 mx-1">{timeStr(msg.created_at)}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="p-3 border-t border-gray-100 bg-white flex gap-2 shrink-0">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="메시지를 입력하세요"
          className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          onClick={send}
          disabled={!content.trim() || sending}
          className="w-10 h-10 bg-[#FF6B35] text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all"
        >
          <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
