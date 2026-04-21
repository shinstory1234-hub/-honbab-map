/** @type {import('next').NextConfig} */
const nextConfig = {
  // 카카오맵 스크립트 도메인 허용
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.kakao.com *.kakaocdn.net *.daumcdn.net;",
          },
        ],
      },
    ]
  },
}

export default nextConfig
