import '../public/apt-price-quality.js';
import vm from 'node:vm';

export async function loadLivePrices() {
  const r = await fetch('https://realestate-media.vercel.app/api/backtest/aptlive?min=0', {
    next: { revalidate: 3600 }, signal: AbortSignal.timeout(55_000),
  });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const c = {};
  c.window = c;
  vm.runInNewContext(await r.text(), c);
  if (!c.LIVEP || Object.keys(c.LIVEP).length === 0) throw new Error('empty live prices');
  return c;
}

// 서버와 브라우저가 같은 읍·면 및 개편 전후 행정구역 매칭 기준을 사용한다.
export function matchLive(all, want) {
  const out = {}, sources = {};
  const find = globalThis.APT_PRICE_QUALITY.matcher(all);
  let exact = 0, fuzzy = 0;
  for (const key of want) {
    const source = find(key);
    if (!source) continue;
    if (source === key) exact++;
    else fuzzy++;
    out[key] = all[source];
    sources[key] = source;
  }
  return { out, sources, exact, fuzzy };
}
