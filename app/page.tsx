import { redirect } from 'next/navigation'

// 혼밥맵 서비스 종료 — 루트는 저평가지도로
export default function HomePage() {
  redirect('/apt-map.html')
}
