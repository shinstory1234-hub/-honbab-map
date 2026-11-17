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
  if (s.startsWith('<') && !/<response\b/i.test(s)) throw new Error('UNEXPECTED_XML_RESPONSE');
  if (/^\s*[{[]/.test(s)) {
    const d = JSON.parse(s);
    if (d.OpenAPI_ServiceResponse || d.cmmMsgHeader || d.error || d.errorCode) throw new Error('PROVIDER_ERROR_ENVELOPE');
    const r = d.response || d;
    if (!r || typeof r !== 'object' || Array.isArray(r) || !r.header || !r.body) throw new Error('MALFORMED_API_RESPONSE');
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
// 별도 아파트맵 프로젝트에 공공데이터 인증키가 없을 때는, 이미 해당 키가
// 안전하게 등록된 같은 사용자 소유 realestate-media 서버의 제한된 API로 요청한다.
// 서비스 키는 두 프로젝트 사이에도 URL/클라이언트로 전달하지 않는다.
const OPEN_DATA_ROUTES = {
  '/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent': 'rent',
  '/1613000/AptListService4/getSigunguAptList4': 'list',
  '/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5': 'basic',
  '/1613000/AptBasisInfoServiceV5/getAphusDtlInfoV5': 'detail',
};
export async function govtGet(path, query, timeout=11000) {
  const mode = OPEN_DATA_ROUTES[path];
  if (!mode) throw new Error('UNSUPPORTED_PUBLIC_DATA_SERVICE');
  const ownKey = (process.env.MOLIT_API_KEY || process.env.PUBLIC_DATA_SERVICE_KEY || process.env.KAPT_API_KEY || '').trim();
  let url;
  if (ownKey) {
    url = new URL('https://apis.data.go.kr' + path);
    for (const [k,v] of Object.entries({...query, serviceKey:openDataKey()}))
      url.searchParams.set(k,String(v));
  } else {
    url = new URL('https://realestate-media.vercel.app/api/backtest/aptmap-open-data');
    url.searchParams.set('mode',mode);
    if(mode==='rent'){url.searchParams.set('sgg',String(query.LAWD_CD));url.searchParams.set('ym',String(query.DEAL_YMD));}
    if(mode==='list')url.searchParams.set('sgg',String(query.sigunguCode));
    if(mode==='basic'||mode==='detail')url.searchParams.set('kapt',String(query.kaptCode));
    url.searchParams.set('page',String(query.pageNo||1));
  }
  const r = await fetch(url, { cache:'no-store', signal:AbortSignal.timeout(timeout+6000) });
  if(!r.ok)throw new Error((ownKey?'API_HTTP_':'BRIDGE_HTTP_')+r.status);
  return parseGovernment(await r.text());
}
export function safeJson(payload,status=200) {
  return Response.json(payload,{status,headers:{'Cache-Control':status===200?'public, s-maxage=3600, stale-while-revalidate=86400':'no-store'}});
}
