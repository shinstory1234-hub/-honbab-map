import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '혼밥맵 - 혼자 밥 먹기 좋은 식당 찾기',
  description: '혼밥하기 좋은 주변 식당을 찾아드려요',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
