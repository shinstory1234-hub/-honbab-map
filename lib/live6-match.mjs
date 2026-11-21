import '../public/apt-price-quality.js';

// 서버와 브라우저가 같은 읍·면 및 개편 전후 행정구역 매칭 기준을 사용한다.
export function matchLive(all, want) {
  const out = {};
  const find = globalThis.APT_PRICE_QUALITY.matcher(all);
  let exact = 0, fuzzy = 0;
  for (const key of want) {
    const source = find(key);
    if (!source) continue;
    if (source === key) exact++;
    else fuzzy++;
    out[key] = all[source];
  }
  return { out, exact, fuzzy };
}
