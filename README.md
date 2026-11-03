# 저평가지도

서울·경기·인천 가격대별 아파트 단지 순위 지도(https://aptmap-kr.vercel.app). 정적 페이지 `public/apt-map.html`과 데이터 파일 `public/apt-*.js`로 이루어져 있고,
Next.js는 배포 셸 역할만 합니다(`next.config.mjs`: `aptmap-kr.vercel.app` 루트 → `apt-map.html`, 옛 주소 이동, `apt-geo.js` 프록시, CSP).

- 카카오 지도 JavaScript 키(`106bb734…`)의 SDK 도메인에 `https://aptmap-kr.vercel.app`이 등록돼 있어야 지도가 뜹니다.
- 옛 주소 `apt-6eok.vercel.app`·`honbab-map.vercel.app`은 새 주소로 영구 이동(308), `undervalued-map.vercel.app`은 카카오 등록 전환기간 동안 지도를 그대로 보여줌(삭제 예정). 저장소·Vercel 프로젝트 이름(honbab-map)은 예전 혼밥맵에서 물려받은 것.

```bash
npm install
npm run dev   # http://localhost:3000/apt-map.html
```
