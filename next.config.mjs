/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // 대표 주소 undervalued-map: 카카오 지도 키가 honbab-map.vercel.app에만 등록돼 있어 그 페이지를 감싸서(apt-frame.html) 보여줌
        { source: '/', has: [{ type: 'host', value: 'undervalued-map.vercel.app' }], destination: '/apt-frame.html' },
        // 6억지도 고정 입지 데이터: 같은 출처로 프록시(CSP script-src 'self' 유지)
        { source: '/apt-geo.js', destination: 'https://realestate-media.vercel.app/api/backtest/aptgeo?export=js' },
      ],
    }
  },
  async redirects() {
    return [
      // 옛 주소(apt-6eok) → 새 대표 주소로 자동 이동(공유된 링크 유지, 쿼리 ?cap= 그대로 전달)
      { source: '/apt-map.html', has: [{ type: 'host', value: 'apt-6eok.vercel.app' }], destination: 'https://undervalued-map.vercel.app/', permanent: true },
      { source: '/:path*', has: [{ type: 'host', value: 'apt-6eok.vercel.app' }], destination: 'https://undervalued-map.vercel.app/:path*', permanent: true },
      // 새 주소에서 지도 페이지를 직접 열면 감싼 화면으로(카카오 키 도메인 제한)
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
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.kakao.com *.kakaocdn.net *.daumcdn.net t1.daumcdn.net; frame-src 'self' *.kakao.com https://honbab-map.vercel.app; img-src 'self' data: *.kakaocdn.net *.daumcdn.net;",
          },
        ],
      },
    ]
  },
}
export default nextConfig
