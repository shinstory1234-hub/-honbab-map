import '../public/apt-price-quality.js';
import vm from 'node:vm';
import verifiedDetailKeys from './apt-dx-verified-keys.json' with { type: 'json' };

export async function loadLivePrices() {
  const r = await fetch('https://realestate-media.vercel.app/api/backtest/aptlive?min=0&priceRule=median90', {
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
    // 상세 거래에서 원천 신고명까지 검증한 일대일 매칭을 재사용한다.
    // 둘 이상 합친 복합단지는 가격을 무작정 섞지 않고 기존처럼 미확정으로 남긴다.
    const verified = verifiedDetailKeys[key];
    const [sgg, dong, ...names] = key.split('|');
    const name = names.join('|');
    const shortKey = name.startsWith(dong + ' ') ? sgg + '|' + dong + '|' + name.slice(dong.length + 1) : null;
    const source = find(key)
      || (typeof verified === 'string' && Object.hasOwn(all, verified) ? verified : null)
      || (shortKey && Object.hasOwn(all, shortKey) ? shortKey : null);
    if (!source) continue;
    if (source === key) exact++;
    else fuzzy++;
    out[key] = all[source];
    sources[key] = source;
  }
  return { out, sources, exact, fuzzy };
}
