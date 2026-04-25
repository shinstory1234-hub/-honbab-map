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
  onMarkerClick: (restaurant: Restaurant) => void
  onBoundsChange?: (bounds: MapBounds) => void
  centerTo?: { lat: number; lng: number; level?: number } | null
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#eab308',
  3: '#ef4444',
}

const getMarkerEmoji = (category: string) => {
  if (!category) return '🍽️'
  const c = category
  if (c.includes('카페') || c.includes('커피')) return '☕'
  if (c.includes('초밥') || c.includes('스시')) return '🍣'
  if (c.includes('라멘') || c.includes('라면')) return '🍜'
  if (c.includes('돈카츠') || c.includes('돈까스')) return '🍱'
  if (c.includes('피자')) return '🍕'
  if (c.includes('버거') || c.includes('햄버거')) return '🍔'
  if (c.includes('치킨')) return '🍗'
  if (c.includes('국밥') || c.includes('해장')) return '🥣'
  if (c.includes('분식') || c.includes('떡볶이')) return '🥢'
  if (c.includes('카레')) return '🍛'
  if (c.includes('샐러드') || c.includes('샌드위치')) return '🥗'
  if (c.includes('이자카야') || c.includes('포차')) return '🍺'
  if (c.includes('빵') || c.includes('베이커리') || c.includes('디저트')) return '🥐'
  if (c.includes('쌀국수')) return '🍜'
  if (c.includes('삼겹살') || c.includes('구이')) return '🥩'
  if (c.includes('한식')) return '🍚'
  if (c.includes('중식') || c.includes('짜장') || c.includes('짬뽕')) return '🥡'
  if (c.includes('양식') || c.includes('파스타')) return '🍝'
  return '🍽️'
}

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    const win = window as any
    if (win.kakao && win.kakao.maps) { resolve(); return }
    const s = document.createElement('script')
    s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=clusterer`
    s.onload = () => win.kakao.maps.load(() => resolve())
    document.head.appendChild(s)
  })
}

function getBounds(m: any): MapBounds {
  const b = m.getBounds()
  return {
    sw_lat: b.getSouthWest().getLat(),
    sw_lng: b.getSouthWest().getLng(),
    ne_lat: b.getNorthEast().getLat(),
    ne_lng: b.getNorthEast().getLng(),
  }
}

export default function KakaoMap({ restaurants, selectedId, onMarkerClick, onBoundsChange, centerTo }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<any>(null)
  const ovs = useRef<any[]>([])
  const onBoundsChangeRef = useRef(onBoundsChange)
  onBoundsChangeRef.current = onBoundsChange

  useEffect(() => {
    loadScript().then(() => {
      if (!mapRef.current || mapInst.current) return
      const k = (window as any).kakao

      const m = new k.maps.Map(mapRef.current, {
        center: new k.maps.LatLng(37.5665, 126.9780),
        level: 4
      })
      mapInst.current = m

      const emit = () => {
        if (onBoundsChangeRef.current) {
          onBoundsChangeRef.current(getBounds(m))
        }
      }

      k.maps.event.addListener(m, 'idle', emit)

      // 현재 위치로 이동
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude
            const lng = pos.coords.longitude
            m.setCenter(new k.maps.LatLng(lat, lng))
            m.setLevel(4)

            // 현재 위치 파란 마커
            const myEl = document.createElement('div')
            myEl.style.cssText = 'width:16px;height:16px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);'
            new k.maps.CustomOverlay({
              position: new k.maps.LatLng(lat, lng),
              content: myEl,
              yAnchor: 0.5
            }).setMap(m)

            // 이동 완료 후 bounds 업데이트
            setTimeout(emit, 300)
          },
          () => {
            // 위치 거부 시 서울 중심
            emit()
          },
          { timeout: 10000, maximumAge: 60000 }
        )
      } else {
        emit()
      }
    })
  }, [])

  // centerTo 변경 시 지도 이동
  useEffect(() => {
    if (!centerTo || !mapInst.current) return
    const k = (window as any).kakao
    mapInst.current.setCenter(new k.maps.LatLng(centerTo.lat, centerTo.lng))
    if (centerTo.level) mapInst.current.setLevel(centerTo.level)
  }, [centerTo])

  // 마커 렌더링
  useEffect(() => {
    const m = mapInst.current
    if (!m) return
    ovs.current.forEach(o => o.setMap(null))
    ovs.current = []
    const k = (window as any).kakao

    restaurants.forEach((r) => {
      const emoji = getMarkerEmoji(r.category)
      const bgColor = LEVEL_COLORS[r.honbab_level] || '#22c55e'
      const isSelected = r.id === selectedId

      const el = document.createElement('div')
      el.style.cssText = `
        width:${isSelected ? '44px' : '36px'};
        height:${isSelected ? '44px' : '36px'};
        background-color:${bgColor};
        border:${isSelected ? '3px solid #FF6B35' : '2px solid white'};
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${isSelected ? '24px' : '20px'};
        cursor:pointer;
        box-shadow:0 4px 10px rgba(0,0,0,0.3);
        transition:all 0.1s ease-in-out;
      `
      el.innerHTML = `<span>${emoji}</span>`
      el.onclick = () => onMarkerClick(r)
      el.onmouseenter = () => { if (!isSelected) el.style.transform = 'scale(1.15)' }
      el.onmouseleave = () => { if (!isSelected) el.style.transform = 'scale(1)' }

      const o = new k.maps.CustomOverlay({
        position: new k.maps.LatLng(r.lat, r.lng),
        content: el,
        yAnchor: 0.5
      })
      o.setMap(m)
      ovs.current.push(o)
    })
  }, [restaurants, selectedId, onMarkerClick])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}
