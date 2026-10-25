import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '6억지도 - 6억 이하 특이점 단지 지도',
  description: '서울·경기·인천 6억 이하 아파트 단지 순위 지도',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
