'use client'

import { useEffect, useRef } from 'react'
import { Restaurant } from '@/lib/supabase'

export type MapBounds = { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number }

type Props = {
  restaurants: Restaurant[]
  selectedId?: string | null
  onMarkerClick: (restaurant: Restaurant) => void
  onBoundsChange?: (bounds: MapBounds) => void
  centerTo?: { lat: number; lng: number; level?: number } | null
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kakao: any
    __kakaoMapLoaded?: boolean
  }
}

const LEVEL_COLORS: Record<number, string> = { 1: '#22c55e', 2: '#eab308', 3: '#ef4444' }

const CLUSTER_STYLES = [
  { width: '40px', height: '40px', background: 'rgba(255,107,53,0.9)', borderRadius: '20px', color: '#fff', textAlign: 'center', lineHeight: '40px', fontSize: '13px', fontWeight: '700', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' },
  { width: '50px', height: '50px', background: 'rgba(220,38,38,0.9)', borderRadius: '25px', color: '#fff', textAlign: 'center', lineHeight: '50px', fontSize: '15px', fontWeight: '700', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' },
]

function loadKakaoScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    if (!apiKey) { reject(new Error('Missing NEXT_PUBLIC_KAKAO_MAP_KEY')); return }
    if (window.__kakaoMapLoaded) { resolve(); return }
    const existing = document.getElementById('kakao-map-sdk')
    if (existing) {
      existing.addEventListener('load', () => { window.kakao.maps.load(() => { window.__kakaoMapLoaded = true; resolve() }) })
      return
    }
    const script = document.createElement('script')
    script.id = 'kakao-map-sdk'
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false&libraries=clusterer`
    script.onload = () => { window.kakao.maps.load(() => { window.__kakaoMapLoaded = true; resolve() }) }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function createMarkerImage(color: string) {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36"><circle cx="14" cy="14" r="12" fill="${color}" stroke="white" stroke-width="2.5"/><polygon points="14,36 8,24 20,24" fill="${color}"/><circle cx="14" cy="14" r="5" fill="white" opacity="0.5"/></svg>`)
  const size = new window.kakao.maps.Size(28, 36)
  const option = { offset: new window.kakao.maps.Point(14, 36) }
  return new window.kakao.maps.MarkerImage(`data:image/svg+xml;charset=utf-8,${svg}`, size, option)
}

export default function KakaoMap({ restaurants, selectedId, onMarkerClick, onBoundsChange, centerTo }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<{ marker: any; restaurant: Restaurant }[]>([])

  useEffect(() => {
    loadKakaoScript().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return
      mapRef.current.style.height = window.innerHeight + 'px'

      const center = new window.kakao.maps.LatLng(37.5665, 126.9780)
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: 4 })
      mapInstanceRef.current = map
      map.relayout()
      map.setCenter(center)

      const clusterer = new window.kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minLevel: 5,
        gridSize: 80,
        styles: CLUSTER_STYLES,
      })
      clustererRef.current = clusterer

      // bounds 변경 시 콜백 (idle = 이동/줌 완료 후)
      const emitBounds = () => {
        if (!onBoundsChange) return
        const bounds = map.getBounds()
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        onBoundsChange({ sw_lat: sw.getLat(), sw_lng: sw.getLng(), ne_lat: ne.getLat(), ne_lng: ne.getLng() })
      }
      window.kakao.maps.event.addListener(map, 'idle', emitBounds)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          map.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
        }, () => {
          // 위치 거부 시 초기 bounds 즉시 emit
          emitBounds()
        })
      } else {
        emitBounds()
      }

      const handleResize = () => {
        if (mapRef.current) mapRef.current.style.height = window.innerHeight + 'px'
        map.relayout()
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }).catch(e => console.error('[KakaoMap] init error:', e))
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !clustererRef.current) return
    clustererRef.current.clear()
    markersRef.current = []

    const markers = restaurants.map(restaurant => {
      const color = LEVEL_COLORS[restaurant.honbab_level] || '#888'
      const image = createMarkerImage(color)
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(restaurant.lat, restaurant.lng),
        image,
        title: restaurant.name,
      })
      window.kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(restaurant))
      markersRef.current.push({ marker, restaurant })
      return marker
    })

    clustererRef.current.addMarkers(markers)
  }, [restaurants, onMarkerClick])

  // 외부에서 지도 이동
  useEffect(() => {
    if (!mapInstanceRef.current || !centerTo) return
    const pos = new window.kakao.maps.LatLng(centerTo.lat, centerTo.lng)
    mapInstanceRef.current.setCenter(pos)
    if (centerTo.level) mapInstanceRef.current.setLevel(centerTo.level)
  }, [centerTo])

  // 선택된 마커 강조
  useEffect(() => {
    if (!mapInstanceRef.current) return
    markersRef.current.forEach(({ marker, restaurant }) => {
      const color = selectedId === restaurant.id ? '#FF6B35' : LEVEL_COLORS[restaurant.honbab_level] || '#888'
      marker.setImage(createMarkerImage(color))
    })
  }, [selectedId])

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
}
