/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', has: [{ type: 'host', value: 'apt-6eok.vercel.app' }], destination: '/apt-frame.html' },
        // 6억지도 고정 입지 데이터: 같은 출처로 프록시(CSP script-src 'self' 유지)
        { source: '/apt-geo.js', destination: 'https://realestate-media.vercel.app/api/backtest/aptgeo?export=js' },
      ],
    }
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
