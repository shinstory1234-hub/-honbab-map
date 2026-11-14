/** @type {import('next').NextConfig} */
const MAIN = 'aptmap-kr.vercel.app'   // 대표 주소(2026.11.3, 사이트 이름 아파트맵). 카카오 지도 키 SDK 도메인에 https://aptmap-kr.vercel.app 등록 필요
// 옛 주소: 카카오 등록이 끝나기 전까지 지도가 끊기지 않게 undervalued-map은 그대로 지도를 보여줌 — Vercel에서 도메인을 떼면 이 줄은 자연히 쓰이지 않음
const SERVE = [MAIN, 'undervalued-map.vercel.app']
const nextConfig = {
  // 첫 화면 미리보기 API가 서버에서 지도와 같은 계산 코드를 실행하도록 생성된 자료 파일을 함께 배포
  outputFileTracingIncludes: { '/api/apt-first': ['./public/apt-map-fast.html', './public/apt-assets/**/*', './public/apt-*.js'], '/api/apt-live6': ['./public/apt-*.js'] },
  async rewrites() {
    return {
      beforeFiles: [
        ...SERVE.map((h) => ({ source: '/', has: [{ type: 'host', value: h }], destination: '/apt-map-fast.html' })),
        // 고정 입지 데이터: 같은 출처로 프록시(CSP script-src 'self' 유지)
        { source: '/apt-geo.js', destination: 'https://realestate-media.vercel.app/api/backtest/aptgeo?export=js' },
        // 현재 시세(매일 크론이 다시 계산, 2026.11.3)
        { source: '/apt-live.js', destination: 'https://realestate-media.vercel.app/api/backtest/aptlive' },
        // 6억 이하 탭 현재 시세(2026.11.14): 6억 탭 단지만 골라 보내는 자체 API(속도: 1.5MB → 탭 단지분만)
        { source: '/apt-live6.js', destination: '/api/apt-live6' },
        // 실제 최근 수집·가격 재계산 기준일: 정기 갱신 지연을 숨기지 않고 이용자에게 표시
        { source: '/apt-freshness.json', destination: 'https://realestate-media.vercel.app/api/backtest/aptfreshness' },
      ],
    }
  },
  async redirects() {
    return [
      // 더 이상 안 쓰는 주소(apt-6eok·honbab-map) → 대표 주소(Vercel에서 도메인을 떼기 전까지 공유 링크 유지)
      ...['apt-6eok.vercel.app', 'honbab-map.vercel.app'].flatMap((h) => [
        { source: '/apt-map.html', has: [{ type: 'host', value: h }], destination: `https://${MAIN}/`, permanent: true },
        { source: '/:path*', has: [{ type: 'host', value: h }], destination: `https://${MAIN}/:path*`, permanent: true },
      ]),
      // 지도 페이지를 직접 열면 짧은 주소(/?cap=)로
      ...SERVE.map((h) => ({ source: '/apt-map.html', has: [{ type: 'host', value: h }], destination: '/', permanent: false })),
    ]
  },
  async headers() {
    return [
      { source: '/apt-assets/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.kakao.com *.kakaocdn.net *.daumcdn.net t1.daumcdn.net; frame-src 'self' *.kakao.com; img-src 'self' data: *.kakaocdn.net *.daumcdn.net;",
          },
        ],
      },
    ]
  },
}
export default nextConfig

