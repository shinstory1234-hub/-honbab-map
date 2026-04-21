import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: '혼밥맵 - 혼자 밥 먹기 좋은 식당 찾기',
  description: '혼밥하기 좋은 주변 식당을 찾아드려요',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`}
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-gray-100">{children}</body>
    </html>
  )
}
