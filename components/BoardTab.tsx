'use client'

import { useState, useEffect } from 'react'
import { supabase, Post, Comment } from '@/lib/supabase'
import { getNickname } from '@/lib/honbabScore'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function PostDetailView({ post, onBack }: { post: Post; onBack: () => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // 조회수: DB에서 현재 값 읽어서 +1 (stale 클라이언트 값 사용 방지)
    supabase.from('posts').select('views').eq('id', post.id).single().then(({ data }) => {
      supabase.from('posts').update({ views: (data?.views ?? 0) + 1 }).eq('id', post.id)
    })
    supabase.from('comments').select('*').eq('post_id', post.id).order('created_at').then(({ data }) => {
      if (data) setComments(data as Comment[])
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  const sendComment = async () => {
    if (!content.trim() || sending) return
    setSending(true)
    const author = getNickname()
    const { data } = await supabase.from('comments').insert({ post_id: post.id, content: content.trim(), author }).select().single()
    if (data) setComments(prev => [...prev, data as Comment])
    setContent('')
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full tab-panel">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-bold text-gray-900 text-sm flex-1 truncate">{post.title}</h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* 본문 */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-600">{post.author}</span>
            <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
            <span className="text-xs text-gray-400 ml-auto">조회 {post.views}</span>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* 댓글 */}
        <div className="p-4">
          <p className="text-xs font-bold text-gray-500 mb-3">댓글 {comments.length}개</p>
          <div className="flex flex-col gap-3">
            {comments.map(c => (
              <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                  <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-700">{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 댓글 입력 */}
      <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
          placeholder="댓글을 입력하세요"
          className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          onClick={sendComment}
          disabled={!content.trim() || sending}
          className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
        >
          등록
        </button>
      </div>
    </div>
  )
}

function WriteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!title.trim() || !content.trim() || loading) return
    setLoading(true)
    const author = getNickname()
    await supabase.from('posts').insert({ title: title.trim(), content: content.trim(), author })
    setLoading(false)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl p-5 pb-8 md:pb-5 shadow-2xl">
        <h3 className="text-lg font-black text-gray-900 mb-4">글쓰기</h3>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-orange-400"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-32 resize-none focus:outline-none focus:border-orange-400 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500">취소</button>
          <button onClick={submit} disabled={!title.trim() || !content.trim() || loading} className="flex-1 py-3 rounded-xl bg-[#FF6B35] text-white text-sm font-bold disabled:opacity-50">
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BoardTab() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [writeOpen, setWriteOpen] = useState(false)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  const fetchPosts = async () => {
    setLoading(true)
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false })
    if (data) {
      setPosts(data as Post[])
      // 댓글 수 조회
      const { data: counts } = await supabase.from('comments').select('post_id')
      if (counts) {
        const map: Record<string, number> = {}
        counts.forEach((c: { post_id: string }) => { map[c.post_id] = (map[c.post_id] || 0) + 1 })
        setCommentCounts(map)
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  if (selectedPost) {
    return <PostDetailView post={selectedPost} onBack={() => { setSelectedPost(null); fetchPosts() }} />
  }

  return (
    <div className="flex flex-col h-full tab-panel bg-gray-50">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-black text-gray-900">📋 자유게시판</h2>
        <button
          onClick={() => setWriteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6B35] text-white rounded-xl text-sm font-semibold"
        >
          <span>+</span> 글쓰기
        </button>
      </div>

      {/* 게시글 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm text-gray-400">첫 번째 글을 작성해보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map(post => (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-orange-200 hover:shadow-sm transition-all"
              >
                <p className="font-bold text-gray-900 text-sm mb-1 truncate">{post.title}</p>
                <p className="text-xs text-gray-400 truncate mb-2">{post.content}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="font-semibold text-gray-600">{post.author}</span>
                  <span>{timeAgo(post.created_at)}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <span>💬 {commentCounts[post.id] || 0}</span>
                    <span className="ml-2">👁 {post.views}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {writeOpen && <WriteModal onClose={() => setWriteOpen(false)} onSuccess={fetchPosts} />}
    </div>
  )
}
