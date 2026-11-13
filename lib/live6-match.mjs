// 6억 탭 실거래 키 맞추기(2026.11.14). 키 = 시군구코드|동|단지명.
// 정확히 같은 키가 없으면 ① 읍·면 지역: 실거래 원자료는 '오남읍 양지리'처럼 리까지 붙어 있어 첫 단어(읍·면)로 맞춤
// ② 행정구역 개편(화성 4구·인천 제물포/영종구 등)으로 시군구코드가 달라진 경우: 시도(앞 2자리)+동+단지명으로 맞춤.
// 둘 다 후보가 정확히 하나일 때만 인정(이름이 같은 다른 단지로 잘못 붙지 않게).
export function matchLive(all, want) {
  const out = {};
  const idxA = new Map(), idxB = new Map();
  const add = (m, k, v) => { const a = m.get(k); if (a) { if (a !== v) m.set(k, null); } else if (a !== null) m.set(k, v); };
  for (const key of Object.keys(all)) {
    const [sgg, dong, ...rest] = key.split('|'); const name = rest.join('|'); const d0 = String(dong || '').split(' ')[0];
    add(idxA, sgg + '|' + d0 + '|' + name, key);
    add(idxB, String(sgg).slice(0, 2) + '|' + d0 + '|' + name, key);
  }
  let exact = 0, fuzzy = 0;
  for (const k of want) {
    if (all[k]) { out[k] = all[k]; exact++; continue; }
    const [sgg, dong, ...rest] = k.split('|'); const name = rest.join('|');
    const m = idxA.get(sgg + '|' + dong + '|' + name) || idxB.get(String(sgg).slice(0, 2) + '|' + dong + '|' + name);
    if (m) { out[k] = all[m]; fuzzy++; }
  }
  return { out, exact, fuzzy };
}
