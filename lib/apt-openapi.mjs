/**
 * 국토교통부 공공데이터 응답 처리: 인증키는 서버에만 보관합니다.
 * XML(JSON 반환 API도 포함) 공통 처리. 외부 데이터의 식별자는 엄격히 검증합니다.
 */
export function nameKey(s) {
  return String(s || '').normalize('NFKC').toLowerCase()
    .replace(/\([^)]*(?:고층|저층|구분)\)/g, '')
    .replace(/(?:아파트|apt)$/i, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}
export function textDecode(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_m, v) => {
    if (v[0] === '#') {
      const num = v[1].toLowerCase() === 'x' ? parseInt(v.slice(2), 16) : parseInt(v.slice(1), 10);
      return num > 0 && num <= 0x10ffff ? String.fromCodePoint(num) : '';
    }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[v.toLowerCase()] || '';
  });
}
export function xmlTags(raw) {
  const out = {};
  const rx = /<([a-zA-Z][a-zA-Z0-9_]*)\b[^>]*>([^<]*)<\/\1>/g;
  for (const m of String(raw).matchAll(rx)) out[m[1]] = textDecode(m[2]).trim();
  return out;
}
export function parseGovernment(body) {
  const s = String(body || '').trim();
  if (!s || s.length > 20_000_000) throw new Error('EMPTY_OR_TOO_LARGE');
  if (/^\s*[{[]/.test(s)) {
    const d = JSON.parse(s);
    const r = d.response || d;
    const h = r.header || {};
    const code = String(h.resultCode ?? h.resultcode ?? '00');
    if (!['00', '000', '0', '0000'].includes(code)) throw new Error('PROVIDER_' + code);
    const b = r.body || {};
    const item = b.items?.item ?? b.items ?? b.item ?? [];
    return {items: Array.isArray(item) ? item : item ? [item] : [], total: Number(b.totalCount || b.total_count || 0)};
  }
  // XML only: no general XML parser dependencies; extract the public API's fixed <item> schema.
  const head = xmlTags((/<header\b[^>]*>([\s\S]*?)<\/header>/i.exec(s) || [,''])[1]);
  const code = String(head.resultCode ?? '00');
  if (!['00', '000', '0', '0000'].includes(code)) throw new Error('PROVIDER_' + code);
  if (/<(?:!DOCTYPE|!ENTITY)\b/i.test(s)) throw new Error('UNEXPECTED_XML');
  const items = [];
  for (const m of s.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    if (items.length >= 15000) throw new Error('TOO_MANY_ITEMS');
    items.push(xmlTags(m[1]));
  }
  const total = Number((/<totalCount>([^<]*)<\/totalCount>/i.exec(s)||[])[1] || 0);
  return {items, total};
}
export function openDataKey() {
  const raw = process.env.MOLIT_API_KEY || process.env.PUBLIC_DATA_SERVICE_KEY || process.env.KAPT_API_KEY || '';
  // 공공데이터의 인코딩 키가 저장돼 있어도 한 번만 인코딩하도록 복원.
  if (!raw.trim()) throw new Error('API_KEY_NOT_CONFIGURED');
  const key = raw.trim();
  try { return /%[0-9a-fA-F]{2}/.test(key) ? decodeURIComponent(key) : key; } catch { return key; }
}
export function validKey(raw) {
  const parts = String(raw||'').split('|');
  if (!/^\d{5}$/.test(parts[0]||'') || parts.length < 3) return null;
  const dong = parts[1]?.trim(), name = parts.slice(2).join('|').trim();
  if (!/^[\p{L}\p{N} ()·.-]{1,36}$/u.test(dong||'') || !name || name.length>110 || /[<>]/.test(name)) return null;
  return {sgg:parts[0],dong,name};
}
export async function govtGet(path, query, timeout=11000) {
  if (!/^\/1613000\/[A-Za-z0-9_/-]+$/.test(path)) throw new Error('BAD_PATH');
  const url = new URL('https://apis.data.go.kr'+path);
  for (const [k,v] of Object.entries({...query,serviceKey:openDataKey()}))url.searchParams.set(k,String(v));
  const r = await fetch(url, { cache:'no-store', signal:AbortSignal.timeout(timeout) });
  if(!r.ok)throw new Error('API_HTTP_'+r.status);
  const text = await r.text();
  return parseGovernment(text);
}
export function safeJson(payload,status=200) {
  return Response.json(payload,{status,headers:{'Cache-Control':status===200?'public, s-maxage=3600, stale-while-revalidate=86400':'no-store'}});
}
