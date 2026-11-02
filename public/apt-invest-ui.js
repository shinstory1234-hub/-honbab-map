/* 6억 초과 탭 상위 1,000 투자포인트: 목록은 건드리지 않고 상세 화면에만 삽입 */
(function(){
  const style=document.createElement('style');
  style.textContent=`
  .invest{margin:18px 24px 0;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--bg)}
  .invest-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}
  .invest-head h3{font-size:16px;font-weight:750;letter-spacing:-.035em}
  .invest-head span{font-size:11.5px;color:var(--text-tertiary);white-space:nowrap}
  .invest-lead{display:block;padding:12px 14px;border-radius:5px;background:var(--bg-subtle);font-size:15px;line-height:1.55;letter-spacing:-.025em;word-break:keep-all}
  .invest-list>div{display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;padding:12px 0;border-bottom:1px solid var(--border-soft)}
  .invest-list dt{font-size:12px;font-weight:700;color:var(--primary-soft-fg)}
  .invest-list dd{font-size:13px;line-height:1.7;color:var(--text-secondary);word-break:keep-all}
  .invest-note{margin-top:11px;font-size:11.5px;line-height:1.65;color:var(--text-tertiary);word-break:keep-all}`;
  document.head.appendChild(style);

  function panel(d){
    const ranks=(window.APT_INV_RANK||{})[CAPT]||{}, fixedRank=ranks[`${gkey(d)}|${d.py}`];
    if(!fixedRank) return '';
    const g=d.g||{}, station=(g.sts||[]).slice().sort((a,b)=>a[1]-b[1])[0], school=(window.APT_INV_SCHOOL||{})[gkey(d)], hak=(window.HAK||{})[gkey(d)], age=2026-d.year, stage=stOf(d), land=landOf(d), pe=priceEv(d), hill=hR(d);
    const flags=[];
    if(station&&station[1]<=700) flags.push(`${station[0].replace(/ \S+$/,'')} 도보권`);
    else if(station&&station[1]<=1500) flags.push(`${station[0].replace(/ \S+$/,'')} 생활권`);
    if(school&&school[1]<=300) flags.push(`${school[0]} 인접`);
    if(d.units>=1000) flags.push(`${d.units.toLocaleString()}세대 대단지`);
    if(age<=10) flags.push(`${age}년차 신축급`);
    else if(stage>=35) flags.push('정비사업 공식 단계 자료 있음');
    const lead=flags.slice(0,3).join(' · ')||`${CAPTXT} 고정순위 상위 1,000행에 든 ${d.py}평형`;
    let traffic='';
    if(station){
      const sn=station[0].replace(/ \S+$/,''), lines=(g.sts||[]).filter(x=>x[0].replace(/ \S+$/,'')===sn).map(x=>x[0].split(' ').slice(1).join(' ')).filter(Boolean);
      traffic=`${sn}까지 좌표상 ${fmtM(station[1])}, 도보 약 ${Math.round(walkMin(station[1]))}분 추정${lines.length?` (${[...new Set(lines)].join('·')})`:''}. ${d.tbj?`${d.tbj} 방향 모형 통근 ${Math.round(d.tbe)}분.`:''}`;
    }else traffic=`반경 3km 안 점수에 반영된 철도역이 없다. ${d.tbj?`${d.tbj} 방향 모형 통근 ${Math.round(d.tbe)}분으로 버스·환승 동선을 먼저 확인해야 한다.`:'출퇴근 동선을 직접 확인해야 한다.'}`;
    if(d.locParts&&d.locParts.fut) traffic+=` 예정 ${d.locParts.fut.n}역은 ${d.locParts.fut.year}년 목표 자료이며 지연 가능성을 별도로 봐야 한다.`;
    let education='';
    if(school){
      education=`단지 좌표에서 가장 가까운 중학교는 ${school[0]}로 약 ${fmtM(school[1])}. `;
      if(school[2]!=null) education+=`2025 공시 졸업생 ${school[2]}명 중 과학고 ${school[4]}명, 외고·국제고 ${school[5]}명, 자사고 ${school[6]}명으로 합계 ${school[3].toFixed(1)}%. `;
      else education+='학교명과 2025 진학 공시가 정확히 결합되지 않아 진학률은 표시하지 않았다. ';
    }
    if(hak&&hak[0]!=null) education+=`반경 1km 수학·영어 학원 ${hak[0].toLocaleString()}곳${hak[1]>hak[0]?`, 인근 학원가 접근값 ${Math.round(hak[1])}곳 상당`:''}.`;
    if(!education) education='인근 중학교·학원 데이터가 없어 현장 확인이 필요하다.';
    let product=`${d.year}년 입주, ${age}년차, ${d.units.toLocaleString()}세대. ${d.py}평 최근 시세 ${eok(d.p)}이며 이 가격대 고정순위 ${fixedRank}위.`;
    if(d.s4&&d.s4.pG!=null) product+=` 장기 급지는 상위 ${Math.max(1,Math.round(100-d.s4.pG))}% 수준.`;
    if(land) product+=` 이 평형 대지지분은 실측 용적률 기준 약 ${(land[0]/3.3058).toFixed(1)}평 추정(용적률 ${Math.round(land[2])}%).`;
    const risk=[];
    if(age>=27) risk.push(stage>=35?'공식 정비 단계와 사업성·분담금 추정을 함께 확인':'27년차 이상이지만 공식 정비 단계 전이라 재건축 기대를 선반영하지 말 것');
    if(d.dead>=.5) risk.push('현재 자료상 재건축 사업성 낮음 위험 표시');
    if(hill!=null&&hill>=25) risk.push(`주변 최저점보다 약 ${hill}m 높은 지형`);
    if(d.reg==='toheo') risk.push('토지거래허가·실거주 요건 확인');
    if(pe&&pe.n<PRICE_THIN) risk.push(`이 평형 최근 12개월 거래 ${pe.n}건으로 가격 근거가 얇음`);
    if(!risk.length) risk.push('층·향·동별 가격 차이, 주차·수선 상태와 실제 통학·출퇴근 동선을 현장에서 확인');
    return `<section class="invest"><div class="invest-head"><h3>핵심 투자포인트</h3><span class="tnum">2026.11.01 고정순위 ${fixedRank}위</span></div><strong class="invest-lead">${esc(lead)}</strong><dl class="invest-list"><div><dt>교통</dt><dd>${esc(traffic)}</dd></div><div><dt>학군</dt><dd>${esc(education)}</dd></div><div><dt>단지</dt><dd>${esc(product)}</dd></div><div><dt>확인</dt><dd>${esc(risk.join(' · '))}</dd></div></dl><p class="invest-note">가장 가까운 중학교는 배정 학교를 뜻하지 않습니다. 배정은 교육지원청에 확인해야 하며, 진학률은 학교알리미 2025 공시의 과학고+외고·국제고+자사고 합계로 학교 전체의 교육 수준이나 향후 수익률을 뜻하지 않습니다.</p></section>`;
  }

  function install(){
    if(window.__aptInvestInstalled||typeof window.renderDetail!=='function') return;
    window.__aptInvestInstalled=true;
    const original=window.renderDetail;
    window.renderDetail=function(i){
      original(i);
      const body=document.getElementById('body'), lede=body&&body.querySelector('.lede'), html=panel(D[i]);
      if(lede&&html) lede.insertAdjacentHTML('afterend',html);
    };
    if(typeof state!=='undefined'&&state.sel!=null) window.renderDetail(state.sel);
  }
  setTimeout(install,0);
  document.addEventListener('DOMContentLoaded',install,{once:true});
})();
