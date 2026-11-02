/* 6억 초과 탭 투자포인트
 * 1~100위: 단지별 생활권·거래·정비사업 조사형 원고
 * 101~1,000위: 기존 정형자료 요약
 */
(function(){
  const style=document.createElement('style');
  style.textContent=`
  .invest{margin:18px 24px 0;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--bg)}
  .invest-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px}.invest-head h3{font-size:16px;font-weight:750;letter-spacing:-.035em}.invest-head span{font-size:11.5px;color:var(--text-tertiary);white-space:nowrap}
  .invest-lead{display:block;padding:14px;border-radius:5px;background:var(--bg-subtle);font-size:16px;line-height:1.55;letter-spacing:-.025em;word-break:keep-all}
  .invest-essay{padding:4px 0}.invest-essay h4{margin:18px 0 5px;font-size:14px}.invest-essay p{font-size:13.5px;line-height:1.78;color:var(--text-secondary);white-space:pre-line;word-break:keep-all}
  .invest-list>div{display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;padding:12px 0;border-bottom:1px solid var(--border-soft)}.invest-list dt{font-size:12px;font-weight:700;color:var(--primary-soft-fg)}.invest-list dd{font-size:13px;line-height:1.7;color:var(--text-secondary);word-break:keep-all}
  .invest-mini{margin-top:14px;padding-top:12px;border-top:1px solid var(--border-soft)}.invest-mini h4{margin-bottom:8px;font-size:13px}.invest-mini ul{display:flex;flex-direction:column;gap:6px;list-style:none}.invest-mini li{font-size:12.5px;line-height:1.6;color:var(--text-secondary)}.invest-mini li:before{content:'•';margin-right:7px;color:var(--primary-soft-fg)}
  .invest-source{margin-top:12px;font-size:11px;line-height:1.6;color:var(--text-tertiary)}.invest-source a{color:inherit;text-decoration:underline;text-underline-offset:2px}.invest-note{margin-top:11px;font-size:11.5px;line-height:1.65;color:var(--text-tertiary);word-break:keep-all}`;
  document.head.appendChild(style);

  const AREA={
    '과천시 원문동':['정부과천청사역과 과천 중심 생활권, 문원초·문원중 교육수요를 함께 보는 지역이다. 위버필드는 신축 상품성, 래미안슈르는 단지 규모와 가격이 핵심 비교축이다.','과천 신축·준신축끼리 가격 차이가 작아질 때는 연식보다 역·학교까지 실제 동선과 평형별 거래량이 가격을 가른다.','과천 단지·학교 비교','https://m.richgo.ai/realty/danji/a4zroyp'],
    '광명시 철산동':['철산역 생활권과 광명 학원가 접근성은 강점이지만 도덕산 쪽 단지는 철산역까지 경사와 버스 의존도를 따로 봐야 한다. 도덕파크타운은 면적, 철산래미안자이는 역세권·연식이 비교축이다.','철산동이라는 이름만으로 역세권을 동일하게 보지 말고 단지 출입구별 경사와 실제 보행시간을 확인해야 한다.','철산동 단지 실거래','https://apt.zaritalk.com/complex/%EC%B2%A0%EC%82%B0%EB%8F%99-%EB%8F%84%EB%8D%95%ED%8C%8C%ED%81%AC%ED%83%80%EC%9A%B41%EB%8B%A8%EC%A7%80-1772'],
    '광명시 하안동':['하안사거리 상권과 철산 학원가를 공유하는 대규모 주공 생활권이다. 단지별 정비계획과 대지지분이 달라 같은 하안주공이라도 사업 속도와 예상 분담금을 따로 봐야 한다.','재건축 기대가 가격에 반영돼 있어 정비구역·통합 범위·공공기여와 분담금 자료가 없는 단계에서는 신축 가격을 바로 대입하면 안 된다.','하안동 재건축 개요','https://news.propad.kr/gwangmyeong-hanam-apartment-market-analysis-2026/'],
    '서울 강남구':['일원·수서권은 3호선과 수인분당선, SRT 수서역, 대치 학원가 접근성이 겹치는 생활권이다. 소형은 강남 진입 총액을 낮추지만 가족 실거주 면적과 거래표본이 제한될 수 있다.','재건축 연한만으로 사업성을 판단하지 말고 용적률·대지지분·임대주택 비중과 단지별 공식 정비단계를 구분해야 한다.','강남구 정비사업 현황','https://cleanup.seoul.go.kr/cleanup/bsnssttus/lsubBsnsSttus.do'],
    '서울 강동구':['고덕·명일권은 5호선과 학원가, 대단지 신축 주거환경이 가격을 지지한다. 신축은 학교 배정 변화와 동 위치를, 구축은 정비사업 단계와 대지지분을 따로 봐야 한다.','명일동 재건축은 단지마다 단계가 다르고 고덕 신축은 같은 생활권 안에서도 역거리·학교 배정에 따라 선호 차이가 크다.','강동구 정비사업 현황','https://cleanup.seoul.go.kr/cleanup/bsnssttus/lsubBsnsSttus.do?cpage=1&pageSize=100'],
    '서울 강서구':['등촌·가양 택지지구는 9호선 접근성과 한강변 대단지라는 공통점이 있지만 역거리·용적률·소형 비중이 단지별로 다르다. 개발 가이드라인과 개별 정비사업 단계는 구분해야 한다.','택지지구 가이드라인은 개별 단지의 정비구역 지정이나 확정 용적률이 아니다. 공식 고시 전 수치를 매수가격에 선반영하지 않는 편이 안전하다.','가양·등촌 계획 확인','https://aptlens.co.kr/insights/gangseo-series-3-gayang-deungchon-plan'],
    '서울 관악구':['봉천동 대단지들은 서울대입구·봉천역 접근성과 관악산 방향 구릉지라는 특성이 함께 있다. 관악푸르지오·두산은 역 접근성, 벽산블루밍은 규모와 내부 생활시설이 비교축이다.','같은 봉천동이라도 고저차와 버스 의존도가 크게 달라 지도상 직선거리보다 단지 출입구에서 역까지 실제 보행을 확인해야 한다.','관악구 단지 거래 비교','https://insight.hermessangmin.com/regions/gwanak/'],
    '서울 광진구':['현대프라임은 강변역과 동서울터미널, 한강변 생활권을 동시에 누리는 구의동 대표 대단지다. 소형은 2호선 접근성을 낮은 총액으로 사는 대신 면적과 동별 소음 차이를 감수한다.','강변북로·터미널 방향 동은 소음과 조망 차이가 크고 24평 가격이 대형과 같은 비율로 움직인다고 단정하면 안 된다.','현대프라임 교통·거래','https://www.subwayking.kr/apt/11215-33'],
    '서울 구로구':['신도림 대림1·2차는 1·2호선 환승과 디큐브시티 상권을 이용하는 대규모 구축 생활권이다. 역과 학교까지 동별 거리, 주차와 수리 상태가 가격을 가른다.','신도림 프리미엄이 이미 가격에 반영된 만큼 같은 예산의 영등포·문래 단지와 전용면적 및 전세수요를 함께 비교해야 한다.','구로구 단지 거래','https://xn--9z2b11sikh7te8l.com/danji/11530/index.html'],
    '서울 노원구':['상계·중계 택지지구는 4·7호선과 은행사거리 학원가 접근성이 핵심이다. 상계주공은 단지별 정비단계와 용적률, 중계 단지는 학원가까지 실제 동선이 가치 차이를 만든다.','상계주공을 한 묶음으로 보지 말고 정비계획 공람·정비구역 지정·조합 단계와 대지지분을 단지별로 확인해야 한다.','상계주공 정비계획 사례','https://map.galta.kr/z/CLU-z1-3h2lmJkKZRb1hcqpN2B0yA/%EC%83%81%EA%B3%84%EC%A3%BC%EA%B3%B56%EB%8B%A8%EC%A7%80%EC%95%84%ED%8C%8C%ED%8A%B8'],
    '서울 도봉구':['창동역 1·4호선, GTX-C 계획과 서울아레나 개발을 함께 보는 생활권이다. 창동주공3단지는 대단지와 다양한 평형이 장점이지만 재건축은 정비계획 입안 단계부터 확인해야 한다.','GTX-C와 재건축 기대가 동시에 가격에 반영될 수 있어 개통·정비 일정을 확정 수익처럼 계산하면 안 된다.','창동주공3 정비계획','https://www.inews24.com/view/mrlted/1990663'],
    '서울 동대문구':['답십리·전농은 청량리 교통 거점의 배후 생활권이다. 청솔우성은 대단지와 가격, 전농SK는 청량리 접근성과 생활편의가 비교축이며 실제 역까지는 버스·도보 조합을 봐야 한다.','청량리 개발 호재를 단지 가격에 그대로 적용하지 말고 역까지 실제 이동시간과 주변 신축 대비 연식·주차 차이를 확인해야 한다.','동대문 학교군','https://dbedu.sen.go.kr/CMS/civilapp/civilapp02/civilapp0201/civilapp020101/index.html'],
    '서울 동작구':['상도·대방권은 7호선·신림선과 여의도 접근성이 장점이다. 단지마다 역과의 고저차가 다르고 소형 구축은 총액 장점과 주차·평면 제약을 함께 봐야 한다.','상도동은 언덕과 출입구 차이가 크고 대방동은 철도와 간선도로 소음을 확인해야 한다.','동작구 거래 비교','https://fitlook.org/r/11590/'],
    '서울 마포구':['마포는 도심·여의도 접근성과 학원·상권이 가격을 지지한다. 성산시영은 재건축과 소형 유동성, 대흥동태영은 6호선·경의선 접근, 신축은 연식 프리미엄이 핵심이다.','성산시영은 재건축 기대와 낮은 전세가율을 함께 보고 신축 소형은 같은 단지 중형 대비 평당가와 실거주 면적을 확인해야 한다.','마포 주요 단지 비교','https://aptsonpoom.com/danji/A12185004'],
    '서울 서대문구':['가재울·DMC 생활권은 경의중앙선·6호선·DMC 업무지구 접근성과 대단지 주거환경이 장점이다. 남가좌현대는 가격과 면적, DMC래미안e편한세상은 연식과 규모가 비교축이다.','단지 이름의 DMC보다 가좌역·디지털미디어시티역까지 실제 이동시간과 초등학교 배정, 내부 동 위치를 우선 확인해야 한다.','DMC래미안e편한세상','https://m.richgo.ai/realty/danji/a3KIxeN'],
    '서울 서초구':['내곡지구는 강남권 신축 주거환경을 상대적으로 낮은 총액으로 확보하는 대신 철도보다 버스·차량 의존도가 높은 생활권이다.','서초구라는 행정구 프리미엄보다 신분당선·3호선 환승까지 실제 시간, 차량 정체와 거래량을 먼저 봐야 한다.','학교알리미','https://www.schoolinfo.go.kr/si/po/pnsipo_a01_s0.do'],
    '서울 성동구':['행당·금호·왕십리는 도심 접근성과 2·5호선, 수인분당선 생활권이 겹친다. 행당 대단지는 역세권과 평지, 금호 단지는 한강 접근성과 경사를 각각 따져야 한다.','성동구 평균가격을 그대로 적용하지 말고 행당·금호의 지형과 역 접근성, 같은 단지 내 동별 고저차를 가격에 반영해야 한다.','성동구 단지 거래','https://www.fitlook.org/r/11200/'],
    '서울 성북구':['돈암·길음은 4호선과 내부순환로, 대단지 중심 생활권이다. 한신한진은 4천세대 규모와 단지 내부 교통, 길음뉴타운은 역·학교 접근성이 비교축이다.','돈암동 대단지는 구릉지와 동별 역거리 차이가 커 마을버스 의존도와 겨울철 보행을 확인해야 한다.','돈암 한신한진 생활권','https://m.richgo.ai/realty/danji/a0dfOyV'],
    '서울 송파구':['송파는 강남 접근성과 대단지 주거환경이 강점이지만 단지 성격은 재건축 구축, 위례 신축, 잠실 대단지로 크게 갈린다. 같은 가격대라도 면적과 사업 위험이 전혀 다르다.','재건축은 공식 단계와 분담금, 신축 소형은 평당가와 면적, 위례는 철도 접근성을 각각 따로 확인해야 한다.','올림픽선수촌 정비사업','https://www.yna.co.kr/view/AKR20260324032300003'],
    '서울 양천구':['목동은 학원가와 학교 수요, 재건축 기대가 동시에 가격을 지지한다. 신시가지 단지는 모두 정비구역 지정 이후 절차에 들어갔지만 방식과 후속 단계가 단지별로 다르다.','정비구역 지정만으로 이주·입주 시기가 확정된 것은 아니며 신탁·조합 방식, 공공기여, 대지지분과 추가분담금을 구분해야 한다.','목동 14개 단지 정비 현황','https://seonjeom.com/i/mokdong-reconstruction-progress/'],
    '서울 영등포구':['신길뉴타운은 여의도 접근성과 7호선, 신안산선 계획을 함께 보는 신축 생활권이다. 영등포푸르지오는 1호선·도심 접근성과 대단지 구축 가격이 비교축이다.','신안산선 일정은 변동 가능성이 있고 소형은 거래표본이 적어 중형 시세와 같은 비율로 움직인다고 보기 어렵다.','영등포 주요 단지 비교','https://aptsonpoom.com/post/r-11560-31'],
    '서울 용산구':['용산 삼성래미안은 도심·여의도 접근성과 4·6호선 생활권을 함께 보는 대단지다. 용산 개발계획보다 현재 역거리와 학교, 단지 경사·동 위치가 실거주 가격을 가른다.','용산 개발계획을 가격에 중복 반영하지 말고 철도·도로 소음과 동별 조망, 구축 수선비를 확인해야 한다.','학교알리미','https://www.schoolinfo.go.kr/si/po/pnsipo_a01_s0.do'],
    '서울 중구':['약수하이츠와 남산타운은 3·6호선, 5·6호선 접근성과 도심 직주근접이 장점이다. 남산 자락의 경사와 단지 규모, 역까지 동별 이동 차이가 핵심이다.','지도상 역세권이어도 급경사와 대단지 내부 이동이 길 수 있고 동일 평형도 조망·동·층에 따라 가격 차이가 크다.','학교알리미','https://www.schoolinfo.go.kr/si/po/pnsipo_a01_s0.do'],
    '성남 분당구':['분당은 판교 직주근접과 학원가, 1기 신도시 정비사업이 가격을 지지한다. 선도지구·2차 특별정비구역·미선정 단지를 구분하고 통합 범위와 사업시행자 지정 여부를 확인해야 한다.','특별정비구역 선정은 입주나 분담금 확정이 아니며 통합 동의율, 공공기여와 공사비가 실제 사업성을 좌우한다.','분당 정비사업 현황','https://hana.bloggerjd.com/bundang-reconstruction/'],
    '안양 동안구':['평촌은 학원가와 4호선, 1기 신도시 정비 기대가 핵심이다. 초원·샛별·공작은 통합구역과 역거리, 인덕원대우는 인덕원 교통과 구축 상품성을 따로 봐야 한다.','2026년 주민제안은 특별정비구역 확정이 아니며 선정 경쟁, 기준용적률, 공공기여와 분담금 검토가 남아 있다.','평촌 특별정비구역 제안','https://v.daum.net/v/20260803134426364']
  };

  const SPECIAL={
    '시범한양|성남 분당구 서현동':['서현역·학원가를 누리는 시범단지 소형, 2차 특별정비구역은 장기 변수','시범한양은 시범한신과 시범단지1 통합 정비를 추진하며 2026년 9월 2차 특별정비구역 지정 대상에 포함됐다. 아직 사업시행인가·관리처분 단계가 아니므로 작은 평형의 분담금과 신축 배정면적을 확인해야 한다.','2026.09','시범단지1 2차 특별정비구역 지정 대상 선정'],
    '시범한신|성남 분당구 서현동':['서현 중심 입지와 통합재건축을 함께 보는 시범한신','시범한신은 시범한양과 시범단지1 통합 정비 구역으로 추진된다. 현재 가격에는 서현역·학원가라는 완성된 입지와 초기 정비 기대가 함께 들어가 있어 통합 범위와 평형별 권리가액을 따로 봐야 한다.','2026.09','시범단지1 2차 특별정비구역 지정 대상 선정'],
    '시범우성|성남 분당구 서현동':['서현 생활권과 선도지구의 속도를 함께 사는 시범우성','시범우성·시범현대·장안건영 통합 구역은 1차 선도지구이며 2026년 사업시행자 지정과 설계사 선정까지 진행됐다. 앞선 단계는 장점이지만 통합심의·사업시행인가·분담금 확정까지 남은 절차가 많다.','2026.06','통합 구역 사업시행자 지정'],
    '시범현대|성남 분당구 서현동':['서현역 생활권의 선도지구, 사업 속도와 분담금을 같이 볼 시범현대','시범현대는 시범우성·장안건영과 통합 재건축을 추진하며 사업시행자 지정과 설계사 선정 단계까지 진행됐다. 단지별 대지지분과 평형 구성이 달라 통합 사업 안에서도 예상 분담금은 같지 않다.','2026','사업시행자 지정·설계사 선정'],
    '양지마을(5단지)(한양501-514)|성남 분당구 수내동':['수내역·학원가와 선도지구 사업 속도가 겹치는 양지마을 한양','양지마을 통합 재건축은 사업시행자 지정 뒤 정비사업 위원회를 구성했고 시공자 선정 준비에 들어갔다. 수내 생활권은 완성돼 있지만 소형 평형의 권리가액과 신축 배정면적은 관리처분 전까지 변동 가능성이 크다.','2026.10','정비사업 위원회 구성·시공자 선정 준비'],
    '상계주공6(고층)|서울 노원구 상계동':['노원역 생활권 대단지, 정비계획 공람 단계까지 온 상계주공6','상계주공6단지는 2026년 7월 정비계획·정비구역 지정안 주민공람이 진행됐다. 계획 세대수와 공공기여는 심의 과정에서 달라질 수 있어 현재 안을 확정 사업성으로 보면 안 된다.','2026.07','정비계획·정비구역 지정안 주민공람'],
    '창동주공3단지(해등마을)|서울 도봉구 창동':['창동역·GTX-C와 재건축 초기 절차를 함께 보는 대단지','창동주공3단지는 2026년 7월 정비계획 입안제안서를 도봉구에 접수했다. 주민공람·서울시 심의 전 단계이므로 GTX-C와 재건축을 모두 확정 프리미엄으로 계산하지 않는 편이 안전하다.','2026.07','정비계획 입안제안서 접수'],
    '삼익그린2차|서울 강동구 명일동':['명일역·학원가에 조합설립 단계가 더해진 삼익그린2차','삼익그린2차는 정비구역 지정 후 2021년 조합설립인가를 받은 사업장이다. 사업시행인가·관리처분 전이므로 공사비와 조합원 분담금, 평형 배정기준을 최신 총회자료로 확인해야 한다.','2021.07','재건축 조합설립인가'],
    '올림픽선수기자촌2단지|서울 송파구 방이동':['올림픽공원 입지와 초대형 재건축을 함께 보는 선수촌 소형','올림픽선수촌 재건축은 최고 45층·9,218가구 구상이 제시됐고 2026년 설계사 선정 지원 절차가 진행됐다. 24평은 거래표본이 매우 얇아 실제 매물의 대지지분·층·향을 우선 확인해야 한다.','2026.03','재건축 설계사 선정 지원 절차 진행'],
    '성산시영(대우)|서울 마포구 성산동':['마포 소형 재건축의 대표주자, 거래 유동성과 낮은 전세가율을 같이 볼 단지','성산시영은 3,710세대 대단지이고 소형 거래가 활발하지만 전세가율이 낮아 갭투자 부담이 크다. 정비사업 기대가 높을수록 대지지분·추가분담금과 장기 보유 금융비용을 함께 계산해야 한다.'],
    '성산시영(유원)|서울 마포구 성산동':['성산시영 통합 생활권의 24평, 재건축 기대와 자금 부담을 함께 볼 선택지','성산시영은 시공사 표기와 무관하게 하나의 대단지 생활권과 정비 이슈를 공유한다. 다만 평형별 대지지분과 거래량이 달라 24평은 소형 대표 평형과 별도로 가격을 비교해야 한다.'],
    '초원부영|안양 동안구 평촌동':['평촌역·학원가 소형 대단지, 특별정비구역 경쟁과 높은 제안용적률이 변수','초원부영 A-13구역은 2026년 특별정비계획 주민제안을 제출했고 제안 용적률은 기준 상한을 넘는 345%였다. 아직 최종 지정 전이므로 추가 공공기여와 선정 결과를 확인해야 한다.','2026.08','A-13 특별정비계획 주민제안 접수'],
    '샛별한양6(고층1109)|안양 동안구 비산동':['평촌 학원가 접근과 통합정비 가능성을 함께 보는 샛별한양6','샛별한양6은 은하수한양5와 묶인 A-4구역 주민제안 대상이다. 주민제안은 지정 확정이 아니며 단지 통합 범위와 평형별 대지지분을 확인해야 한다.','2026.08','A-4 특별정비계획 주민제안 접수'],
    '샛별마을한양4-1|안양 동안구 비산동':['평촌 생활권 소형 구축, 샛별 통합정비의 범위부터 확인할 단지','샛별마을 일대는 여러 통합구역으로 나뉘어 주민제안이 진행돼 단지명이 비슷해도 포함 구역이 다를 수 있다. 최신 고시도면에서 해당 동·필지 포함 여부를 먼저 확인해야 한다.'],
    '목동신시가지1|서울 양천구 목동':['목동 학군과 한강 접근성을 갖춘 1단지 소형, 신탁방식 후속 절차가 관건','목동 1단지는 정비구역 지정 이후 신탁방식 사업을 준비한다. 서부 목동 입지와 학군은 강점이지만 역거리와 공공기여, 평형별 대지지분을 함께 봐야 한다.'],
    '목동신시가지10|서울 양천구 신정동':['목동 학원가 접근과 재건축을 함께 보는 10단지 22평','목동 10단지는 정비구역 지정 이후 신탁방식으로 후속 절차를 추진한다. 22평은 총액 접근성이 장점이지만 신축 평형 배정과 추가분담금은 보수적으로 봐야 한다.'],
    '목동신시가지12|서울 양천구 신정동':['조합설립까지 진행된 목동12단지, 사업 속도와 22평 권리가액을 같이 볼 단지','목동 12단지는 2026년 2월 조합설립인가를 받았다. 다른 목동 단지보다 단계가 앞서지만 사업시행인가·관리처분과 공사비 확정이 남아 있다.','2026.02','재건축 조합설립인가'],
    '목동신시가지13|서울 양천구 신정동':['통합심의를 통과한 목동13단지, 22평 분담금이 핵심 변수','목동 13단지는 신탁방식으로 추진하며 2026년 9월 통합심의를 조건부 통과했다. 후속 보완과 시공자 선정, 분담금 산정이 남아 있다.','2026.09','서울시 통합심의 조건부 통과'],
    '목동신시가지14|서울 양천구 신정동':['양천공원·학원가를 누리는 목동14단지 소형, 신탁사업 속도를 확인할 단지','목동 14단지는 정비구역 지정 후 신탁방식 후속 절차를 추진한다. 22평은 학군 진입 총액을 낮추지만 대형과 대지지분·권리가액이 달라 별도 계산이 필요하다.']
  };

  function profile(d){
    const key=Object.keys(AREA).sort((a,b)=>b.length-a.length).find(k=>d.area.startsWith(k));
    return AREA[key]||[`${d.area}의 현재 생활권과 같은 가격대 대체 단지를 함께 비교해야 한다.`,'공식 자료가 없는 개발계획은 매수가격에 선반영하지 않는 편이 안전하다.','학교알리미','https://www.schoolinfo.go.kr/si/po/pnsipo_a01_s0.do'];
  }
  function nearestStation(d){return ((d.g&&d.g.sts)||[]).slice().sort((a,b)=>a[1]-b[1])[0]||null;}
  function education(d){
    const s=(window.APT_INV_SCHOOL||{})[gkey(d)],h=(window.HAK||{})[gkey(d)];
    if(!s)return h&&h[0]!=null?`반경 1km 수학·영어 학원은 ${h[0].toLocaleString()}곳이다. 배정 학교는 교육지원청 확인이 필요하다.`:'배정 학교와 통학동선은 교육지원청·현장에서 별도 확인해야 한다.';
    let x=`좌표상 가장 가까운 중학교는 ${s[0]}로 약 ${fmtM(s[1])}다. `;
    if(s[2]!=null)x+=`2025 공시 졸업생 ${s[2]}명 중 과학고 ${s[4]}명, 외고·국제고 ${s[5]}명, 자사고 ${s[6]}명으로 합계 ${s[3].toFixed(1)}%다. `;
    if(h&&h[0]!=null)x+=`반경 1km 수학·영어 학원은 ${h[0].toLocaleString()}곳이다.`;
    return x;
  }
  function trade(d,rank){
    const e=priceEv(d),other=(d.types||[]).filter(t=>t.py!==d.py).sort((a,b)=>Math.abs(a.py-d.py)-Math.abs(b.py-d.py))[0];
    let x=`${d.py}평 표시 시세는 ${eok(d.p)}, 이 가격대 고정순위 ${rank}위다. `;
    if(e)x+=`최근 12개월 ${e.n}건·최근 3개월 ${e.n3}건${e.last?`, 마지막 거래 ${e.last}`:''}을 가격 근거로 썼다. `;
    if(other)x+=`같은 단지 인접 평형 ${other.py}평은 ${eok(other.p)}로 면적 1평당 가격과 총액 차이를 함께 비교해야 한다. `;
    x+=e&&e.n<5?'거래표본이 5건보다 적어 개별 매물의 층·향·수리 상태가 더 중요하다.':'거래가 있어도 저층·고층, 향과 내부수리 여부를 나눠 비교해야 한다.';
    return x;
  }
  function risk(d,p,special){
    const age=2026-d.year,land=landOf(d),hill=hR(d),stage=stOf(d),bits=[];
    if(age>=27)bits.push(stage>=35?'공식 정비 단계와 최신 총회자료 확인':'공식 정비 단계 전이라면 재건축 기대 선반영 금지');
    if(land)bits.push(`${d.py}평 대지지분 약 ${(land[0]/3.3058).toFixed(1)}평 추정·용적률 약 ${Math.round(land[2])}%`);
    if(d.dead>=.5)bits.push('현재 모형상 재건축 사업성 낮음 위험');if(hill!=null&&hill>=20)bits.push(`주변 최저점보다 약 ${hill}m 높은 지형`);if(d.reg==='toheo')bits.push('토지거래허가·실거주 요건');
    return `${special?special[1]+' ':''}${p[1]} ${bits.join('. ')}${bits.length?'.':''}`;
  }
  function title(d,special){
    if(special)return special[0];const st=nearestStation(d),age=2026-d.year,near=st&&st[1]<=700?`${st[0].replace(/ \S+$/,'')} 도보권`:st?`${st[0].replace(/ \S+$/,'')} 생활권`:`${d.area.split(' ').pop()} 생활권`;
    if(age<=10)return `${near}의 ${age}년차 ${d.units.toLocaleString()}세대, ${d.py}평 희소성을 볼 단지`;
    if(d.tags&&d.tags.includes('재건축'))return `${near} 구축 대단지, 정비사업 단계와 ${d.py}평 사업성을 따로 볼 선택지`;
    return `${near} ${d.units.toLocaleString()}세대, ${d.py}평 ${eok(d.p)}의 가격 경쟁력을 볼 단지`;
  }

  function researched(d,rank){
    const p=profile(d),special=SPECIAL[gkey(d)]||null,st=nearestStation(d),age=2026-d.year,ev=priceEv(d),land=landOf(d);
    let traffic=st?`${st[0].replace(/ \S+$/,'')}까지 좌표상 ${fmtM(st[1])}, 도보 약 ${Math.round(walkMin(st[1]))}분 추정이다. ${d.tbj?`${d.tbj} 방향 모형 통근은 ${Math.round(d.tbe)}분이다. `:''}`:'반경 3km 안에 점수에 반영된 철도역이 없어 버스·환승 동선을 먼저 확인해야 한다. ';
    if(d.locParts&&d.locParts.fut)traffic+=`${d.locParts.fut.n}역은 ${d.locParts.fut.year}년 목표 자료로 반영됐지만 일정과 출입구 위치는 바뀔 수 있다. `;
    const checks=[`${d.py}평 최근 12개월 거래 ${ev?ev.n:'미확인'}건${ev&&ev.last?` · 마지막 ${ev.last}`:''}`];
    if(st)checks.push(`${st[0].replace(/ \S+$/,'')}까지 단지 출입구 기준 실제 보행시간 확인`);checks.push('배정 중학교는 교육지원청에 확인');
    if(age>=20)checks.push('주차·배관·승강기·장기수선계획과 내부 수리비 확인');if(age>=27||d.tags&&d.tags.includes('재건축'))checks.push('정비사업 고시·대지지분·조합원 지위·추가분담금 확인');if(land)checks.push(`대지지분 ${(land[0]/3.3058).toFixed(1)}평은 용적률 기반 추정치 · 등기부 재확인`);
    const timeline=[];if(special&&special[2])timeline.push([special[2],special[3]]);if(d.locParts&&d.locParts.fut)timeline.push([`${d.locParts.fut.year} 목표`,`${d.locParts.fut.n}역(${d.locParts.fut.line}) · 일정 변동 가능`]);
    const source=special?`<a href="${p[3]}" target="_blank" rel="noopener">${esc(p[2])}</a>, 국토교통부 실거래, 학교알리미, 건축물대장·정비사업 공개자료`:'국토교통부 실거래, 학교알리미, 건축물대장 공개자료';
    return `<section class="invest invest-researched"><div class="invest-head"><h3>핵심 투자포인트</h3><span class="tnum">단지별 조사 1차 · 고정순위 ${rank}위</span></div><strong class="invest-lead">${esc(title(d,special))}</strong><div class="invest-essay"><h4>① 생활권과 상품성</h4><p>${esc(`${d.year}년 입주한 ${d.units.toLocaleString()}세대, ${d.py}평형이다. ${p[0]}`)}</p><h4>② 교통과 학군</h4><p>${esc(traffic+education(d))}</p><h4>③ 평형과 거래 근거</h4><p>${esc(trade(d,rank))}</p><h4>④ 단지별 확인 변수</h4><p>${esc(risk(d,p,special))}</p></div>${timeline.length?`<div class="invest-mini"><h4>확인할 일정</h4><ul>${timeline.map(t=>`<li><b>${esc(t[0])}</b> ${esc(t[1])}</li>`).join('')}</ul></div>`:''}<div class="invest-mini"><h4>사기 전에 확인</h4><ul>${checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><p class="invest-source">조사 기준 2026.11.02 · 주요 출처: ${source}. 가장 가까운 학교는 배정 학교를 뜻하지 않는다.</p></section>`;
  }
  function summary(d,rank){
    const station=nearestStation(d),school=(window.APT_INV_SCHOOL||{})[gkey(d)],hak=(window.HAK||{})[gkey(d)],age=2026-d.year,stage=stOf(d),land=landOf(d),pe=priceEv(d),hill=hR(d),flags=[];
    if(station&&station[1]<=700)flags.push(`${station[0].replace(/ \S+$/,'')} 도보권`);else if(station&&station[1]<=1500)flags.push(`${station[0].replace(/ \S+$/,'')} 생활권`);if(school&&school[1]<=300)flags.push(`${school[0]} 인접`);if(d.units>=1000)flags.push(`${d.units.toLocaleString()}세대 대단지`);if(age<=10)flags.push(`${age}년차 신축급`);
    const lead=flags.slice(0,3).join(' · ')||`${CAPTXT} 고정순위 상위 1,000행에 든 ${d.py}평형`;
    const traffic=station?`${station[0].replace(/ \S+$/,'')}까지 좌표상 ${fmtM(station[1])}, 도보 약 ${Math.round(walkMin(station[1]))}분 추정. ${d.tbj?`${d.tbj} 방향 모형 통근 ${Math.round(d.tbe)}분.`:''}`:'반경 3km 안 점수에 반영된 철도역이 없어 출퇴근 동선을 직접 확인해야 한다.';
    let edu=school?`가장 가까운 중학교는 ${school[0]}로 약 ${fmtM(school[1])}. ${school[2]!=null?`2025 공시 특목·자사고 진학 합계 ${school[3].toFixed(1)}%. `:'진학 공시는 미결합. '}`:'';if(hak&&hak[0]!=null)edu+=`반경 1km 수학·영어 학원 ${hak[0].toLocaleString()}곳.`;if(!edu)edu='학교·학원 자료는 현장 확인이 필요하다.';
    let product=`${d.year}년 입주, ${d.units.toLocaleString()}세대. ${d.py}평 최근 시세 ${eok(d.p)}, 고정순위 ${rank}위.`;if(land)product+=` 대지지분 약 ${(land[0]/3.3058).toFixed(1)}평 추정(용적률 ${Math.round(land[2])}%).`;
    const danger=[];if(age>=27)danger.push(stage>=35?'공식 정비 단계·분담금 확인':'재건축 기대 선반영 금지');if(d.dead>=.5)danger.push('사업성 낮음 위험');if(hill!=null&&hill>=25)danger.push(`주변 최저점보다 약 ${hill}m 높음`);if(d.reg==='toheo')danger.push('토지거래허가·실거주 요건 확인');if(pe&&pe.n<5)danger.push(`최근 12개월 거래 ${pe.n}건`);if(!danger.length)danger.push('층·향·동별 가격과 주차·수선 상태 확인');
    return `<section class="invest"><div class="invest-head"><h3>자동 요약</h3><span class="tnum">고정순위 ${rank}위</span></div><strong class="invest-lead">${esc(lead)}</strong><dl class="invest-list"><div><dt>교통</dt><dd>${esc(traffic)}</dd></div><div><dt>학군</dt><dd>${esc(edu)}</dd></div><div><dt>단지</dt><dd>${esc(product)}</dd></div><div><dt>확인</dt><dd>${esc(danger.join(' · '))}</dd></div></dl><p class="invest-note">101~1,000위는 아직 단지별 전수조사 전인 자동 요약이다.</p></section>`;
  }
  function panel(d){const rank=((window.APT_INV_RANK||{})[CAPT]||{})[`${gkey(d)}|${d.py}`];if(!rank)return '';return rank<=100?researched(d,rank):summary(d,rank);}
  function install(){
    if(window.__aptInvestInstalled||typeof window.renderDetail!=='function')return;window.__aptInvestInstalled=true;const original=window.renderDetail;
    window.renderDetail=function(i){
      original(i);
      const body=document.getElementById('body'),d=D[i],lede=body&&body.querySelector('.lede'),html=panel(d),rank=((window.APT_INV_RANK||{})[CAPT]||{})[`${gkey(d)}|${d.py}`];
      if(rank<=100){const cat=body&&body.querySelector('.identity .cat');if(cat)cat.textContent=cat.textContent.replace('전체 단지 자동 수집','단지별 조사 1차 반영');}
      if(lede&&html)lede.insertAdjacentHTML('afterend',html);
    };
    if(typeof state!=='undefined'&&state.sel!=null)window.renderDetail(state.sel);
  }
  setTimeout(install,0);document.addEventListener('DOMContentLoaded',install,{once:true});
})();
