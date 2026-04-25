/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef } from 'react'
import { Restaurant } from '@/lib/supabase'

export interface MapBounds {
  sw_lat: number
  sw_lng: number
  ne_lat: number
  ne_lng: number
}

interface MapProps {
  restaurants: Restaurant[]
  selectedId?: string
  voteCounts?: Record<string, number>
  onMarkerClick: (restaurant: Restaurant) => void
  onBoundsChange?: (bounds: MapBounds) => void
  centerTo?: { lat: number; lng: number; level?: number } | null
  userLocation?: { lat: number; lng: number } | null
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#22c55e', 
  2: '#eab308', 
  3: '#ef4444', 
}

const calcHonbabScore = (r: Restaurant, upVotes = 0, downVotes = 0): number => {
  const isHard = r.category.includes('육류') || r.category.includes('고기') || r.category.includes('게') || r.category.includes('대게') || r.category.includes('치킨') || r.category.includes('구이') || r.category.includes('오리')
  const lv = isHard ? 3 : Number(r.honbab_level)
  let baseScore = 60

  if (lv === 1) baseScore = 80
  else if (lv === 2) baseScore = 60
  else if (lv === 3) baseScore = 40

  if (r.category.includes('제과') || r.category.includes('베이커리')) baseScore = 80
  else if (r.category.includes('한식')) baseScore = 70

  const voteScore = Math.max(-10, Math.min(10, (upVotes - downVotes) * 2))
  return Math.max(0, Math.min(100, baseScore + voteScore))
}

const getMarkerEmoji = (category: string) => {
  if (!category) return '🍽️';
  const c = category.toLowerCase();
  if (c.includes('카페') || c.includes('커피')) return '☕';
  if (c.includes('초밥') || c.includes('스시')) return '🍣';
  if (c.includes('라멘') || c.includes('라면') || c.includes('면')) return '🍜';
  if (c.includes('돈카츠') || c.includes('돈까스')) return '🍱';
  if (c.includes('피자')) return '🍕';
  if (c.includes('버거') || c.includes('햄버거')) return '🍔';
  if (c.includes('치킨')) return '🍗';
  if (c.includes('국밥') || c.includes('해장')) return '🥣';
  if (c.includes('분식') || c.includes('떡볶이')) return '🥢';
  if (c.includes('카레')) return '🍛';
  if (c.includes('샐러드') || c.includes('샌드위치')) return '🥗';
  if (c.includes('술') || c.includes('이자카야') || c.includes('포차')) return '🍺';
  return '🍽️';
}

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    const win = window as any;
    if (win.kakao && win.kakao.maps) {
      resolve(); return;
    }
    const s = document.createElement('script')
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=clusterer`
    s.onload = () => win.kakao.maps.load(() => resolve());
    document.head.appendChild(s)
  })
}

export default function KakaoMap({ restaurants, selectedId, onMarkerClick, onBoundsChange, centerTo, userLocation }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<any>(null)
  const ovs = useRef<any[]>([])
  const locMarker = useRef<any>(null)
  const onBoundsChangeRef = useRef(onBoundsChange)

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange
  }, [onBoundsChange])

  useEffect(() => {
    loadScript().then(() => {
      if (!mapRef.current || mapInst.current) return
      const k = (window as any).kakao
      
      const m = new k.maps.Map(mapRef.current, { 
        center: new k.maps.LatLng(37.5665, 126.9780), 
        level: 3 
      })
      mapInst.current = m

      const emit = () => {
        if (onBoundsChangeRef.current) {
          const b = m.getBounds()
          const sw = b.getSouthWest()
          const ne = b.getNorthEast()
          onBoundsChangeRef.current({
            sw_lat: sw.getLat(),
            sw_lng: sw.getLng(),
            ne_lat: ne.getLat(),
            ne_lng: ne.getLng()
          })
        }
      }
      k.maps.event.addListener(m, 'idle', emit)
    })
  }, [])

  // 내 위치 마커 전용 효과
  useEffect(() => {
    const m = mapInst.current
    const k = (window as any).kakao
    if (!m || !k || !userLocation) return

    if (locMarker.current) locMarker.current.setMap(null)

    const el = document.createElement('div')
    el.style.cssText = `
      width: 20px;
      height: 20px;
      background-color: #3b82f6;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
      z-index: 100;
    `
    const o = new k.maps.CustomOverlay({
      position: new k.maps.LatLng(userLocation.lat, userLocation.lng),
      content: el,
      zIndex: 100,
      yAnchor: 0.5
    })
    o.setMap(m)
    locMarker.current = o
  }, [userLocation])

  // 중심 이동 처리
  useEffect(() => {
    if (mapInst.current && centerTo) {
      const k = (window as any).kakao
      const m = mapInst.current
      const lat = centerTo.lat
      const lng = centerTo.lng
      const moveLatLon = new k.maps.LatLng(lat, lng)
      
      m.setCenter(moveLatLon)
      m.relayout()
      
      // 사이드바 오프셋 보정
      const projection = m.getProjection()
      const point = projection.pointFromCoords(moveLatLon)
      const isMobile = window.innerWidth <= 768
      const sidebarWidth = isMobile ? 0 : 384
      const offsetX = sidebarWidth / 2
      const adjustedPoint = new k.maps.Point(point.x - offsetX, point.y)
      const adjustedLatLng = projection.coordsFromPoint(adjustedPoint)
      
      m.setCenter(adjustedLatLng)
      m.setLevel(4)
    }
  }, [centerTo])

  const handleGeolocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords
      const k = (window as any).kakao
      const m = mapInst.current
      if (!m || !k) return

      const moveLatLon = new k.maps.LatLng(lat, lng)
      m.setCenter(moveLatLon)
      m.relayout()

      // 사이드바 오프셋 보정
      const projection = m.getProjection()
      const point = projection.pointFromCoords(moveLatLon)
      const isMobile = window.innerWidth <= 768
      const sidebarWidth = isMobile ? 0 : 384
      const offsetX = sidebarWidth / 2
      const adjustedPoint = new k.maps.Point(point.x - offsetX, point.y)
      const adjustedLatLng = projection.coordsFromPoint(adjustedPoint)

      m.setCenter(adjustedLatLng)
      m.setLevel(4)

      // 내 위치 마커 업데이트
      const el = document.createElement('div')
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background-color: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
        z-index: 100;
      `
      if (locMarker.current) locMarker.current.setMap(null)
      const o = new k.maps.CustomOverlay({
        position: moveLatLon,
        content: el,
        zIndex: 100,
        yAnchor: 0.5
      })

      o.setMap(m)
      locMarker.current = o
    })
  }

  useEffect(() => {
    const m = mapInst.current
    if (!m) return
    ovs.current.forEach(o => o.setMap(null))
    ovs.current = []
    const k = (window as any).kakao

    restaurants.forEach((r) => {
      const emoji = getMarkerEmoji(r.category)
      const bgColor = LEVEL_COLORS[r.honbab_level as 1 | 2 | 3] || '#22c55e'
      const isSelected = r.id === selectedId
      const score = calcHonbabScore(r, voteCounts?.[r.id] || 0, 0)
      
      const container = document.createElement('div')
      container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      `

      const el = document.createElement('div')
      el.style.cssText = `
        width: ${isSelected ? '44px' : '36px'};
        height: ${isSelected ? '44px' : '36px'};
        background-color: ${bgColor};
        border: ${isSelected ? '3px solid #FF6B35' : '2px solid white'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${isSelected ? '24px' : '20px'};
        transition: all 0.1s ease-in-out;
        z-index: 2;
      `
      el.innerHTML = `<span>${emoji}</span>`
      container.appendChild(el)
      
      if (score >= 90 || isSelected) {
        const label = document.createElement('div')
        label.style.cssText = `
          background-color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          margin-top: 4px;
          border: 1px solid #eee;
          white-space: nowrap;
          color: #333;
        `
        label.innerText = r.name
        container.appendChild(label)
      }

      container.onclick = (e) => {
        e.stopPropagation()
        onMarkerClick(r)
      }
      container.onmouseenter = () => { if (!isSelected) el.style.transform = 'scale(1.15)' }
      container.onmouseleave = () => { if (!isSelected) el.style.transform = 'scale(1)' }

      const o = new k.maps.CustomOverlay({ 
        position: new k.maps.LatLng(r.lat, r.lng), 
        content: container, 
        yAnchor: 0.8 // 중심점 조정
      })
      o.setMap(m); 
      ovs.current.push(o)
    })
  }, [restaurants, selectedId, voteCounts, onMarkerClick])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <button 
        onClick={handleGeolocation}
        className="absolute bottom-6 right-6 z-10 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center text-xl hover:bg-gray-50 active:scale-95 transition-all"
        title="현재 위치로 이동"
      >
        📍
      </button>
    </div>
  )
}
