'use client'

import { useEffect, useRef } from 'react'
import { Restaurant } from '@/lib/supabase'

type Props = {
  restaurants: Restaurant[]
  filterLevel: 0 | 1 | 2 | 3
  onMarkerClick: (restaurant: Restaurant) => void
}

const LEVEL_COLOR: Record<number, string> = {
  1: '#22c55e',
  2: '#eab308',
  3: '#ef4444',
}

const LEVEL_EMOJI: Record<number, string> = {
  1: '🟢',
  2: '🟡',
  3: '🔴',
}

declare global {
  interface Window {
    kakao: typeof kakao
    __kakaoMapLoaded?: boolean
  }
}

function loadKakaoScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
    console.log('[KakaoMap] NEXT_PUBLIC_KAKAO_MAP_KEY:', apiKey)

    if (!apiKey) {
      console.error('[KakaoMap] API 키가 없습니다! .env.local 또는 Vercel 환경변수를 확인하세요.')
      reject(new Error('Missing NEXT_PUBLIC_KAKAO_MAP_KEY'))
      return
    }

    if (window.__kakaoMapLoaded) {
      console.log('[KakaoMap] 스크립트 이미 로드됨')
      resolve()
      return
    }
    const existing = document.getElementById('kakao-map-sdk')
    if (existing) {
      existing.addEventListener('load', () => {
        window.kakao.maps.load(() => {
          window.__kakaoMapLoaded = true
          resolve()
        })
      })
      return
    }
    const script = document.createElement('script')
    script.id = 'kakao-map-sdk'
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`
    console.log('[KakaoMap] 스크립트 로드 시작:', script.src)
    script.onload = () => {
      console.log('[KakaoMap] 스크립트 로드 완료')
      window.kakao.maps.load(() => {
        window.__kakaoMapLoaded = true
        console.log('[KakaoMap] kakao.maps.load 완료')
        resolve()
      })
    }
    script.onerror = (e) => {
      console.error('[KakaoMap] 스크립트 로드 실패:', e)
      reject(new Error('Kakao script load failed'))
    }
    document.head.appendChild(script)
  })
}

export default function KakaoMap({ restaurants, filterLevel, onMarkerClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])

  useEffect(() => {
    loadKakaoScript().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return

      // 컨테이너 높이를 px로 명시 (dvh 미지원 대비)
      mapRef.current.style.height = window.innerHeight + 'px'

      console.log('[KakaoMap] 컨테이너 크기:', {
        offsetWidth: mapRef.current.offsetWidth,
        offsetHeight: mapRef.current.offsetHeight,
        clientWidth: mapRef.current.clientWidth,
        clientHeight: mapRef.current.clientHeight,
        styleHeight: mapRef.current.style.height,
      })

      const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.9780)
      const map = new window.kakao.maps.Map(mapRef.current, {
        center: defaultCenter,
        level: 4,
      })
      mapInstanceRef.current = map
      console.log('[KakaoMap] 지도 인스턴스 생성 완료')

      // 지도 컨테이너 크기 재계산 (빈 화면 방지)
      map.relayout()
      map.setCenter(defaultCenter)

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          map.setCenter(new window.kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
        })
      }

      // 브라우저 리사이즈 시 재계산
      const handleResize = () => {
        if (mapRef.current) mapRef.current.style.height = window.innerHeight + 'px'
        map.relayout()
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }).catch((e) => console.error('[KakaoMap] 초기화 실패:', e))
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    const filtered = filterLevel === 0
      ? restaurants
      : restaurants.filter((r) => r.honbab_level === filterLevel)

    filtered.forEach((restaurant) => {
      const color = LEVEL_COLOR[restaurant.honbab_level]
      const emoji = LEVEL_EMOJI[restaurant.honbab_level]

      const el = document.createElement('div')
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;'
      el.innerHTML = `
        <div style="background:white;border:2.5px solid ${color};border-radius:20px;
          padding:4px 10px;font-size:12px;font-weight:700;color:#1a1a1a;
          white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.18);
          display:flex;align-items:center;gap:4px;">
          <span>${emoji}</span><span>${restaurant.name}</span>
        </div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
          border-top:7px solid ${color};margin-top:-1px;"></div>
      `
      el.addEventListener('click', () => onMarkerClick(restaurant))

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(restaurant.lat, restaurant.lng),
        content: el,
        map: mapInstanceRef.current!,
        yAnchor: 1,
      })
      overlaysRef.current.push(overlay)
    })
  }, [restaurants, filterLevel, onMarkerClick])

  return <div ref={mapRef} style={{ width: '100%', height: '100vh', minHeight: '100vh' }} />
}
