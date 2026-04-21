import { Restaurant } from './supabase'

export function calcHonbabScore(restaurant: Restaurant, voteCount = 0): number {
  const levelScore = restaurant.honbab_level === 1 ? 40 : restaurant.honbab_level === 2 ? 20 : 0
  const priceScore = restaurant.price_range === 1 ? 30 : restaurant.price_range === 2 ? 20 : restaurant.price_range === 3 ? 10 : 0
  const tagScore = Math.min((restaurant.honbab_tags?.length ?? 0) * 5, 20)
  const voteScore = Math.min(voteCount * 2, 10)
  return levelScore + priceScore + tagScore + voteScore
}

export function getHonbabGrade(score: number): { emoji: string; label: string; color: string; bg: string } {
  if (score >= 80) return { emoji: '🏆', label: '혼밥 최적', color: 'text-orange-500', bg: 'bg-orange-50' }
  if (score >= 60) return { emoji: '✅', label: '혼밥 가능', color: 'text-green-600', bg: 'bg-green-50' }
  return { emoji: '⚠️', label: '혼밥 주의', color: 'text-yellow-600', bg: 'bg-yellow-50' }
}

export const PRICE_LABELS: Record<number, string> = {
  1: '1만원 이하',
  2: '1.5만원 이하',
  3: '2만원 이하',
  4: '2만원 이상',
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '한식': ['한식', '덮밥', '칼국수', '국밥', '비빔밥', '찌개', '백반'],
  '일식': ['라멘', '스시', '우동', '카레', '돈까스', '일식', '초밥'],
  '중식': ['중식', '짜장', '짬뽕', '마라', '딤섬'],
  '양식': ['파스타', '피자', '스테이크', '햄버거', '양식', '리조또'],
  '분식': ['분식', '떡볶이', '라면', '순대', '튀김'],
  '카페': ['카페', '커피', '디저트', '브런치'],
  '고기': ['고기', '삼겹살', '갈비', '치킨', '구이', '바베큐'],
}

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
