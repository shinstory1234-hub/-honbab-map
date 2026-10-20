/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', has: [{ type: 'host', value: 'apt-6eok.vercel.app' }], destination: '/apt-frame.html' },
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
