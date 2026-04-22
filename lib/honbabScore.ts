import { Restaurant } from './supabase'

export function calcHonbabScore(restaurant: Restaurant, upVotes = 0, downVotes = 0): number {
  const levelScore = restaurant.honbab_level === 1 ? 40 : restaurant.honbab_level === 2 ? 20 : 0
  const priceScore = restaurant.price_range === 1 ? 30 : restaurant.price_range === 2 ? 20 : restaurant.price_range === 3 ? 10 : 0
  const tagScore = Math.min((restaurant.honbab_tags?.length ?? 0) * 5, 20)
  const voteScore = Math.max(-10, Math.min(10, (upVotes - downVotes) * 2))
  return levelScore + priceScore + tagScore + voteScore
}

// 중복 투표 방지 — localStorage 기반
const VOTE_KEY = 'honbab_voted'
export function getMyVote(restaurantId: string): 'up' | 'down' | null {
  if (typeof window === 'undefined') return null
  try {
    const map = JSON.parse(localStorage.getItem(VOTE_KEY) || '{}')
    return map[restaurantId] ?? null
  } catch { return null }
}
export function saveMyVote(restaurantId: string, type: 'up' | 'down') {
  if (typeof window === 'undefined') return
  try {
    const map = JSON.parse(localStorage.getItem(VOTE_KEY) || '{}')
    map[restaurantId] = type
    localStorage.setItem(VOTE_KEY, JSON.stringify(map))
  } catch {}
}

export function getHonbabGrade(score: number): { emoji: string; label: string; color: string; bg: string } {
  if (score >= 80) return { emoji: '🏆', label: '혼밥 최적', color: 'text-orange-500', bg: 'bg-orange-50' }
  if (score >= 60) return { emoji: '✅', label: '혼밥 가능', color: 'text-green-600', bg: 'bg-green-50' }
  return { emoji: '⚠️', label: '혼밥 주의', color: 'text-yellow-600', bg: 'bg-yellow-50' }
}

export const PRICE_LABELS: Record<number, string> = {
  1: '₩ 저렴',
  2: '₩₩ 보통',
  3: '₩₩₩ 비쌈',
  4: '₩₩₩₩ 고급',
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '면류': ['라멘', '츠케멘', '아부라소바', '우동', '소바', '냉소바', '냉면', '중화냉면', '쌀국수', '퍼', '분짜', '파스타', '칼국수', '수제비', '막국수', '면'],
  '밥류': ['규동', '돈부리', '오야코동', '볶음밥', '카레', '덮밥', '솥밥', '비빔밥', '김밥', '삼겹살', '이자카야'],
  '분식': ['분식', '떡볶이', '순대', '튀김'],
  '카페': ['카페', '커피', '디저트', '브런치'],
}

// 혼밥 불가 키워드 — 카카오 검색 결과 필터링에 사용
export const HONBAB_EXCLUDED_KEYWORDS = [
  '뷔페', '횟집', '회집', '보쌈', '족발', '해물탕', '아구찜', '찜닭', '코스요리',
]

export function matchesCategory(restaurant: Restaurant, category: string): boolean {
  if (category === '전체') return true
  const keywords = CATEGORY_KEYWORDS[category] || [category]
  return keywords.some(k => restaurant.category.toLowerCase().includes(k.toLowerCase()))
}

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function getNickname(): string {
  if (typeof window === 'undefined') return '익명'
  let n = localStorage.getItem('honbab_nickname')
  if (!n) {
    n = '혼밥러' + Math.floor(Math.random() * 9000 + 1000)
    localStorage.setItem('honbab_nickname', n)
  }
  return n
}

export type CheckinRecord = { restaurantId: string; restaurantName: string; date: string }

export function getCheckins(): CheckinRecord[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('honbab_checkins') || '[]') } catch { return [] }
}

export function addCheckin(restaurantId: string, restaurantName: string): void {
  const checkins = getCheckins()
  checkins.unshift({ restaurantId, restaurantName, date: new Date().toISOString() })
  localStorage.setItem('honbab_checkins', JSON.stringify(checkins.slice(0, 100)))
}
