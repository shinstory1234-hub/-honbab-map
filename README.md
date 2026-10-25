# 6억지도

서울·경기·인천 6억 이하 아파트 단지 순위 지도. 정적 페이지 `public/apt-map.html`과 데이터 파일 `public/apt-*.js`로 이루어져 있고,
Next.js는 배포 셸 역할만 합니다(`next.config.mjs`: `apt-6eok.vercel.app` 루트 → `apt-frame.html`, `apt-geo.js` 프록시, CSP).

- `apt-frame.html`은 `https://honbab-map.vercel.app/apt-map.html`을 띄우므로 honbab-map 배포·도메인은 유지해야 합니다.
- 루트(`/`)는 `/apt-map.html`로 이동합니다. (예전 혼밥맵 앱은 서비스 종료로 삭제)

```bash
npm install
npm run dev   # http://localhost:3000/apt-map.html
```
