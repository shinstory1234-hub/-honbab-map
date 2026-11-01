import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '저평가지도 - 수도권 아파트 저평가·오를 단지',
  description: '서울·경기·인천 6억 이하·6~10억·10~15억 아파트 단지 순위 지도',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
