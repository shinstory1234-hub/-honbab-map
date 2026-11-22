import { redirect } from 'next/navigation'

// 분석 브랜치 한정: 운영 사이트와 분리된 6억 이하 전체 재순위 미리보기
export default function HomePage() {
  redirect('/rank-preview.html')
}
