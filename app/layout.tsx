import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '아파트맵 - 수도권 아파트 단지 순위',
  description: '서울·경기·인천 6억 이하부터 25~30억까지 가격대별 아파트 단지 순위 지도',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
