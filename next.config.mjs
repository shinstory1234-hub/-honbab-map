/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // 대표 주소 undervalued-map: 카카오 지도 키에 도메인 등록(2026.11.3) → iframe 없이 지도 페이지를 바로
        { source: '/', has: [{ type: 'host', value: 'undervalued-map.vercel.app' }], destination: '/apt-map.html' },
        // 6억지도 고정 입지 데이터: 같은 출처로 프록시(CSP script-src 'self' 유지)
        { source: '/apt-geo.js', destination: 'https://realestate-media.vercel.app/api/backtest/aptgeo?export=js' },
        // 현재 시세(매일 크론이 다시 계산, 2026.11.3)
        { source: '/apt-live.js', destination: 'https://realestate-media.vercel.app/api/backtest/aptlive' },
      ],
    }
  },
  async redirects() {
    return [
      // 옛 주소(apt-6eok·honbab-map) → 새 대표 주소로 자동 이동(공유된 링크 유지, 쿼리 ?cap= 그대로 전달)
      ...['apt-6eok.vercel.app', 'honbab-map.vercel.app'].flatMap((h) => [
        { source: '/apt-map.html', has: [{ type: 'host', value: h }], destination: 'https://undervalued-map.vercel.app/', permanent: true },
        { source: '/:path*', has: [{ type: 'host', value: h }], destination: 'https://undervalued-map.vercel.app/:path*', permanent: true },
      ]),
      // 새 주소에서 지도 페이지를 직접 열면 짧은 주소(/?cap=)로
      { source: '/apt-map.html', has: [{ type: 'host', value: 'undervalued-map.vercel.app' }], destination: '/', permanent: false },
    ]
  },
  async headers() {
    return [
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
