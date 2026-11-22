# 6~10억 단지 순위 근거 개별 교차검증: 1차 (2026-11-23)

## 검증 범위와 정확한 작업 상태

- **총 대상:** 아파트맵 원본 2026-11-20 기준 1,650개 관리단지·3,316개 평형.
- **완료한 개별 외부 근거 조사:** **29건**. 이 가운데 새 추천순위 1~100위에 속하는 것은 **27건**, 나머지 2건은 기존 상위순위에서 급변한 단지의 추가 조사. 신규/기존 순위가 겹치는 단지는 한 번만 집계.
- **아직 개별 외부 근거 미검증:** **1,621개 단지**. 새 순위 1~100위 내부에서는 **73개** 미검증.
- 거래금액 확인, 동일 주택형·층·신고시점 대조, 단지 규모와 주차, 법정 재건축 단계 등의 독립 사실 확인을 시도. 2차 집계사이트의 국토부 실거래 재제공 정보를 교차 참조했고, 사업인가 상태는 가능할 때 광명시·안양시·서울시 공식 자료를 우선.
- **주의:** 이 일괄 조사 중 국토교통부 원본 개별 거래를 1,650개 전부 내려받아 계약 해제와 직거래 분류를 직접 대조한 것은 아님. 2차 제공업체 사이 정보 불일치와 데이터 시차가 남아 있으며 여기에 기록한 거래 일부도 원거래 정정 가능.
- **결론:** 이전 1,650위 자동 재평가 순위는 **미확정**. 자동 1위의 저주차, 상계 구축단지 주차, 재건축 법정 단계 차이, 원시세가 10억 구간 경계를 넘는 사례 등 독립 근거를 발견했으므로 기존 자동 순위를 그대로 게시하면 안 됨.
- **매물 존재 여부:** 판단 요인에서 제외. **운영 사이트:** 미변경, 별도 분석 브랜치에만 저장.

## 즉시 수정·보류해야 하는 주요 판단

### 거여4단지: 10억 경계에 걸리는 실거래

새 모델 19위, 공급 16~17평형(전용39.6㎡). 2026-07-03 9억9,500만원, 2026-09-11 10억4,000만원 신고를 다른 조회처에서 교차 확인. 기존 8억9,143만원 추정가격을 최신 구간 결정가격으로 무비판적으로 쓰는 것은 위험하며 6~10억 구간에 계속 속하는지 유효거래 전체를 재집계해야 한다.

출처: [1](https://apt.zaritalk.com/complex/%EA%B1%B0%EC%97%AC%EB%8F%99-%EA%B1%B0%EC%97%AC4%EB%8B%A8%EC%A7%80-23722), [2](https://apt.zippoom.com/%EB%B6%80%EB%8F%99%EC%82%B0/%EC%84%9C%EC%9A%B8-%EC%86%A1%ED%8C%8C%EA%B5%AC-%EA%B1%B0%EC%97%AC%EB%8F%99-%EA%B1%B0%EC%97%AC4%EB%8B%A8%EC%A7%80/zugpk1/%EB%A7%A4%EB%A7%A4/17%ED%8F%89)

### 하안주공10·11: 재건축법적 상태 불충분 반영

광명시 고시 제2025-329호는 2025-12-10 정비구역 지정 및 사업시행자 지정을 명시. 모델상 주공10의 정비단계 수치 1에 약 1.45점 보정만 부과하는 것은 단계의 가치를 재건축 실현가능성에 반영했다고 보기 어려움. 사업비·대지지분·용적률·비례율·분담금 자료 전까지 기존3위도 새70위도 최종 판단 불가능.

출처: [1](https://www.gm.go.kr/pt/user/nftcBbs/BD_selectNftcBbsDetail.do?q_nftcBbsCode=1001&q_nftcBbsMgtno=64249), [2](https://www.eum.go.kr/web/gs/gv/gvGosiDet.jsp?chrgorg=&enddt=&geul_yn=Y&gihyung_yn=&gosino=&mobile_yn&pageNo=851&prj_cat_cd=&prj_nm=&selSggCd=&select2=&select_3=&seq=628074&silsi_yn=&startdt=&zonenm=)

### 초원부영: 정비 추진 단계가 원모형 누락

안양시 공식 2026-08-31 A-13 특별정비계획(안) 주민공람, 2026-11-10 대신자산신탁 업무협약 보도. 2026-11 원본 'APT_REDEV_FACTS'에는 초원부영 공람 내역이 존재하는 반면 'APT_REDEV_STAGE' 조회표에는 매칭 단계 값이 없음. 현재 공람과 협약 자체를 확정 인허가로 과대평가하면 안 되지만 관련 정보 누락은 수정해야 함.

출처: [1](https://www.anyang.go.kr/main/selectEminwonView.do?key=263&not_ancmt_mgt_no=84797), [2](https://www.yna.co.kr/view/AKR20261110040700008)

### 남성아파트: 사업시행인가 확인

서울시 정비사업 정보몽땅에는 '남성아파트 주택재건축정비사업조합' 사업시행인가로 명시. 민간 정보의 후속단계 추정과 달리 공식 공개상태를 우선. 해당 단지 가격 근거는 18평 9.86억원·지난 12개월 2건에 의존하며 공사비·조합원 분담금과 사업권리 검증 미완료.

출처: [1](https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do?cpage=1&pageSize=2000), [2](https://cleanup.seoul.go.kr/cafe/mastr-cleanup-bsnsSumry/execute.do?cafeId=560900000009Q09&div=sumry&stepSeCode=102)

## 주차 등 실거주 상품성의 원모델 누락

신규 순위 1위 **초록(화곡동)** 주차 424대/625세대(약0.68대), 4위 **신동아(용두동)** 448대/772세대(약0.58대), 6위 **상계주공1(고층)** 약0.45대 등 저주차 구형단지의 현재 점수를 전적으로 뒷받침할 수 없음. 이전 모형 상품성 값이 모든 주차·경사·건물관리비·내진·동간거리·주변혐오시설 정보를 개별 검증한 결과는 아님.

**삼부컨비니언**은 총 주차대수 제공처 간 287대와 393대라는 충돌이 있으므로 원천 공동주택관리정보와 건축물대장 우선 확인이 필요. 주차보정 확정 전에 단지별 부설주차장 출처를 구분해야 함.

## 조사 사례 전체(29개)

| 자동새순위 | 단지 | 수정/보류 판단 | 근거 |
|---:|---|---|---|
| 1 | 초록 | 자동 1위 보류·상품성 감점 필요 | [거래·단지 1](https://ajumuny.com/realestate/complex?name=%EC%B4%88%EB%A1%9D&region=11500) / [교차 2](https://kbland.kr/se/c/454) |
| 2 | 마곡 한진해모로 | 상위 후보이나 자동 2위 확정 보류 | [거래·단지 1](https://wooaapt.wooahouse.com/apt/%EB%A7%88%EA%B3%A1-%ED%95%9C%EC%A7%84%ED%95%B4%EB%AA%A8%EB%A1%9C-9814ed/) / [교차 2](https://kbland.kr/se/c/12556) |
| 3 | 미아동부센트레빌 | 상위권 방어 가능·정확한 3위는 미확정 | [거래·단지 1](https://wooaapt.wooahouse.com/apt/%EB%AF%B8%EC%95%84%EB%8F%99%EB%B6%80%EC%84%BC%ED%8A%B8%EB%A0%88%EB%B9%8C-f04d4c/) / [교차 2](https://aptsonpoom.com/danji/A14280502) |
| 4 | 신동아 (용두동) | 자동 4위 하향 재검토 | [거래·단지 1](https://statnorth.kr/apt/%EC%84%9C%EC%9A%B8/%EB%8F%99%EB%8C%80%EB%AC%B8%EA%B5%AC/%EC%9A%A9%EB%91%90%EB%8F%99-%EC%8B%A0%EB%8F%99%EC%95%84-7e7e8760bb89) / [교차 2](https://kbland.kr/se/c/1242) |
| 5 | 건영2 (중계동) | 자동 5위 재검토 | [거래·단지 1](https://wooaapt.wooahouse.com/apt/%EC%A4%91%EA%B3%84%EA%B1%B4%EC%98%812%EC%B0%A8-d39828/) / [교차 2](https://www.aptfit.co.kr/complex/A13972601) |
| 6 | 상계주공1(고층) | 자동 6위 하향 재검토 | [거래·단지 1](https://cy-on.kr/trades/2092/) / [교차 2](https://aptvs.co.kr/apt/A13983105) |
| 7 | 삼부컨비니언 | 자동 7위 하향 검토 및 주차원천 검증 | [거래·단지 1](https://ajumuny.com/realestate/complex?name=%EC%82%BC%EB%B6%80%EC%BB%A8%EB%B9%84%EB%8B%88%EC%96%B8&region=11290) / [교차 2](https://ilsangkit.co.kr/real-estate/apt-sale/seoul/seongbuk/%EC%82%BC%EB%B6%80%EC%BB%A8%EB%B9%84%EB%8B%88%EC%96%B8) |
| 8 | 동아하이빌아파트 (천호동) | 가격 일치·평균대비 47.5% 저평가 주장은 보류 | [거래·단지 1](https://wooaapt.wooahouse.com/apt/%EC%B2%9C%ED%98%B8%EB%8F%99%EC%95%84%ED%95%98%EC%9D%B4%EB%B9%8C-387fbb/) / [교차 2](https://cy-on.kr/trades/8196/) |
| 9 | 성원2 (목동) | 가격 실거래 확인·면적체계 재확인 | [거래·단지 1](https://theibtime.com/apt/c/2958) / [교차 2](https://son-poom.co.kr/apt/%EC%84%9C%EC%9A%B8-%EC%96%91%EC%B2%9C%EA%B5%AC/%EB%AA%A9%EB%8F%99-709-2/%EC%84%B1%EC%9B%902) |
| 10 | 양평벽산블루밍 | 실거래 확인·비교가격표본 보강 | [거래·단지 1](https://apt.zippoom.com/%EB%B6%80%EB%8F%99%EC%82%B0/%EC%84%9C%EC%9A%B8-%EC%98%81%EB%93%B1%ED%8F%AC%EA%B5%AC-%EC%96%91%ED%8F%89%EB%8F%992%EA%B0%80-%EC%96%91%ED%8F%89%EB%B2%BD%EC%82%B0%EB%B8%94%EB%A3%A8%EB%B0%8D%EC%95%84%ED%8C%8C%ED%8A%B8/itpqby/%EB%A7%A4%EB%A7%A4/20%ED%8F%89) / [교차 2](https://m.richgo.ai/realty/danji/a8qwpkQ?priceType=meme&pyeongType=20) |
| 11 | 초원부영 | 공식 정비추진 미반영·장점 상향 검토, 완공 확정 가정 금지 | [거래·단지 1](https://www.anyang.go.kr/main/selectEminwonView.do?key=263&not_ancmt_mgt_no=84797) / [교차 2](https://www.yna.co.kr/view/AKR20261110040700008) |
| 12 | DMC한양 | 상위권 가능·공람단계와 정비계획의 영향 재평가 | [거래·단지 1](https://apt.zaritalk.com/complex/%EB%B6%81%EA%B0%80%EC%A2%8C%EB%8F%99-DMC%ED%95%9C%EC%96%91-22477) / [교차 2](https://jaegebal.com/develops/5100/asks) |
| 13 | 우성5 (신길동) | 10억원 경계에서 시세 재검증 | [거래·단지 1](https://zip-sisse.com/apt/11560-14jfo1a) / [교차 2](https://www.jipgam.kr/seoul/apt/11560-14.html) |
| 14 | 상계주공1(저층) | 가격대 유지 가능·34평 공사비/대지지분 별도 평가 필요 | [거래·단지 1](https://statnorth.kr/apt/%EC%84%9C%EC%9A%B8/%EB%85%B8%EC%9B%90%EA%B5%AC/%EC%83%81%EA%B3%84%EB%8F%99-%EC%83%81%EA%B3%84%EC%A3%BC%EA%B3%B51%EC%A0%80%EC%B8%B5-c5608be693da) / [교차 2](https://theibtime.com/apt/c/391) |
| 15 | 한보구암마을 | 자동 상대 할인 36.2%의 검증 보류 | [거래·단지 1](https://kbland.kr/c/530) / [교차 2](https://aptchu.com/apt/11500-156) |
| 16 | 창신쌍용2 | 실거래 확인·층수 보정 재점검 | [거래·단지 1](https://theibtime.com/apt/c/10) / [교차 2](https://apt.zaritalk.com/complex/%EC%B0%BD%EC%8B%A0%EB%8F%99-%EC%B0%BD%EC%8B%8D%EC%9A%A92-25216) |
| 17 | 등촌1,2단지주공아파트 | 시세 확인·단지 통합관리 세대수 검증 | [거래·단지 1](https://theibtime.com/apt/c/664) / [교차 2](https://www.naezipscan.com/map/building/c11500100001796) |
| 19 | 거여4단지 | 가장 시급한 원시세 업데이트·6~10억 유지 재검토 | [거래·단지 1](https://lottes.co.kr/apartments/geoyeo-4.html) / [교차 2](https://apt.zippoom.com/%EB%B6%80%EB%8F%99%EC%82%B0/%EC%84%9C%EC%9A%B8-%EC%86%A1%ED%8C%8C%EA%B5%AC-%EA%B1%B0%EC%97%AC%EB%8F%99-%EA%B1%B0%EC%97%AC4%EB%8B%A8%EC%A7%80/zugpk1/%EB%A7%A4%EB%A7%A4/16%ED%8F%89) |
| 20 | 길음뉴타운경남아너스빌 | 평형·시세 재대조, 상대가치 5.6%를 확정마진으로 보지 않음 | [거래·단지 1](https://zipsaja.com/complexes/31691-%EC%A0%95%EB%A6%89%EB%8F%99-%EA%B8%B8%EC%9D%8C%EB%89%B4%ED%83%80%EC%9A%B4%EA%B2%BD%EB%82%A8%EC%95%84%EB%84%88%EC%8A%A4%EB%B9%8C?area=115) / [교차 2](https://apt.peoplentools.com/i/%EA%B8%B8%EC%9D%8C%EB%89%B4%ED%83%80%EC%9A%B4%EA%B2%BD%EB%82%A8%EC%95%84%EB%84%88%EC%8A%A4%EB%B9%8C-%EC%8B%A4%EA%B1%B0%EB%9E%98%EA%B0%80-%EC%84%B1%EB%B6%81%EA%B5%AC-%EC%A0%95%EB%A6%89%EB%8F%99) |
| 21 | 중계센트럴파크 | 가격 근거 확인·자동 시세 약6% 상향 편향 여부 검토 | [거래·단지 1](https://chungyakalji.com/complex/A10027601) / [교차 2](https://www.aptsite.kr/apartment/35474) |
| 22 | 남성 (문래동2가) | 공식 단계는 확인·분담금과 원시세 확인 전 순위 확정 보류 | [거래·단지 1](https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do?cpage=1&pageSize=2000) / [교차 2](https://jaegebal.com/gnotices/ydp-gs-2026-108?develop=2752&from=develop) |
| 23 | 상계주공6(고층) | 가격대 교차검증 양호·정확한 23위 미확정 | [거래·단지 1](https://seoulzen.com/apartment/c9b61fdf2d6581/?chartArea=58.01%E3%8E%A1&chartKind=sale) / [교차 2](https://budongsan.gwiin.co.kr/complex?name=%EC%83%81%EA%B3%84%EC%A3%BC%EA%B3%B56%28%EA%B3%A0%EC%B8%B5%29&sigungu=%EC%84%9C%EC%9A%B8+%EB%85%B8%EC%9B%90%EA%B5%AC) |
| 26 | 경남아너스빌(1356-0) | 34평 원시세 상향 보정 필요성 검토 | [거래·단지 1](https://zipsaja.com/complexes/35367-%EB%AF%B8%EC%95%84%EB%8F%99-%EA%B2%BD%EB%82%A8%EC%95%84%EB%84%88%EC%8A%A4%EB%B9%8C-1356-0?area=115) / [교차 2](https://zip-sisse.com/apt/11305-1pb41x9) |
| 27 | 길음뉴타운데시앙 | 가격 확인·언덕과 교통 감점 재검토 | [거래·단지 1](https://www.jipgam.kr/seoul/apt/11290-53.html) / [교차 2](https://m.richgo.ai/realty/danji/a6ImAcS?priceType=meme&pyeongType=46) |
| 28 | 동양엔파트 | 가격 확인·직거래 제외 후 중위가격 검증 | [거래·단지 1](https://ajumuny.com/realestate/complex?name=%EB%8F%99%EC%96%91%EC%97%94%ED%8C%8C%ED%8A%B8&region=11350) / [교차 2](https://home.hanbogi.com/apt/11350-214/) |
| 40 | 강동리엔파크14단지 | 기존 1위 정당성 부족 의견은 유지하되 새 40위 수치도 미확정 | [거래·단지 1](https://aptchu.com/apt/11740-4802) / [교차 2](https://chungyakalji.com/complex/A10024412) |
| 70 | 하안주공10단지 | 기존3→새70위의 확정 판정 취소·재건축 사업성 정밀 검증 필요 | [거래·단지 1](https://www.gm.go.kr/pt/user/nftcBbs/BD_selectNftcBbsDetail.do?q_nftcBbsCode=1001&q_nftcBbsMgtno=64249) / [교차 2](https://www.gg.go.kr/onnuri/mbiz/home/GHMT_0000000000181/main.do) |
| 101 | e편한세상염창 | 표시가격 허위라고 단정 금지, 동일면적 최신가격 부족으로 기존6·새101위 모두 보류 | [거래·단지 1](https://cy-on.kr/trades/4638/) / [교차 2](https://howmuchapt.com/c/11500-7907) |
| 282 | 평촌어바인퍼스트 | 18평급의 가격근거는 검증; 기존36→새282위는 광역 비교모형 가중치 영향으로 정확한 수치 미확정 | [거래·단지 1](https://land.openblog.com/apt/41173-2100) / [교차 2](https://todayhouseprice.kr/apart.php?all_area=N&apart_name=%ED%8F%89%EC%B4%8C%EC%96%B4%EB%B0%94%EC%9D%B8%ED%8D%BC%EC%8A%A4%ED%8A%B8&area_main_name=%EA%B2%BD%EA%B8%B0%EB%8F%84&dong=%ED%98%B8%EA%B3%84%EB%8F%99&size=60) |

## 사례별 거래·단지·사업 검증 내용

### 1위 초록

**외부 대조:** 2026-10-20 전용59㎡ 9억원 거래, 1998년 준공 625세대, 주차 424대/625세대=0.68대. 표시가격은 교차검증되지만 구형 단지 상품성을 반영하지 않은 가격차액 24.3%를 그대로 저평가 마진이라고 볼 수 없음.

**현재 판단:** 자동 1위 보류·상품성 감점 필요. 단지 최종 서열 미확정.

출처: [조회자료 1](https://ajumuny.com/realestate/complex?name=%EC%B4%88%EB%A1%9D&region=11500), [조회자료 2](https://kbland.kr/se/c/454)

### 2위 마곡 한진해모로

**외부 대조:** 2026-09-23 전용84.93㎡ 2층 9억원; 방화동579, 2004년 준공 354세대, 주차 366대(1.03대/세대). 이름의 마곡과 실제 방화동 생활권을 구별해야 함.

**현재 판단:** 상위 후보이나 자동 2위 확정 보류. 단지 최종 서열 미확정.

출처: [조회자료 1](https://wooaapt.wooahouse.com/apt/%EB%A7%88%EA%B3%A1-%ED%95%9C%EC%A7%84%ED%95%B4%EB%AA%A8%EB%A1%9C-9814ed/), [조회자료 2](https://kbland.kr/se/c/12556)

### 3위 미아동부센트레빌

**외부 대조:** 2026-11-04 전용59㎡ 9층 10억원, 2006년 준공 480세대, 주차 563대/480세대≈1.17대. 동급 일부 노후 단지 대비 단지 효용 확인.

**현재 판단:** 상위권 방어 가능·정확한 3위는 미확정. 단지 최종 서열 미확정.

출처: [조회자료 1](https://wooaapt.wooahouse.com/apt/%EB%AF%B8%EC%95%84%EB%8F%99%EB%B6%80%EC%84%BC%ED%8A%B8%EB%A0%88%EB%B9%8C-f04d4c/), [조회자료 2](https://aptsonpoom.com/danji/A14280502)

### 4위 신동아 (용두동)

**외부 대조:** 2026-11-14 전용58.59㎡ 6층 9.77억원 일치. 1994년 772세대, 주차 448대(0.58대/세대); 24평 상품성 단점이 자동 상위 4위에 충분히 반영되지 않음.

**현재 판단:** 자동 4위 하향 재검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://statnorth.kr/apt/%EC%84%9C%EC%9A%B8/%EB%8F%99%EB%8C%80%EB%AC%B8%EA%B5%AC/%EC%9A%A9%EB%91%90%EB%8F%99-%EC%8B%A0%EB%8F%99%EC%95%84-7e7e8760bb89), [조회자료 2](https://kbland.kr/se/c/1242)

### 5위 건영2 (중계동)

**외부 대조:** 1991년 742세대, 주차 세대당 0.76대. 전용84㎡ 2026-09-08 2층 8.3억원 거래, 자동 대표가 8.657억원과 큰 괴리는 아니나 상위 5위를 뒷받침하는 주거상품 경쟁력이 약함.

**현재 판단:** 자동 5위 재검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://wooaapt.wooahouse.com/apt/%EC%A4%91%EA%B3%84%EA%B1%B4%EC%98%812%EC%B0%A8-d39828/), [조회자료 2](https://www.aptfit.co.kr/complex/A13972601)

### 6위 상계주공1(고층)

**외부 대조:** 2026-10-24 전용58.01㎡ 7층 7.25억원 확인. 단지 통합정보 기준 주차 세대당 약0.45대. 가격 메리트 대비 주차·노후화·정비사업 소요시간 감점 필요.

**현재 판단:** 자동 6위 하향 재검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://cy-on.kr/trades/2092/), [조회자료 2](https://aptvs.co.kr/apt/A13983105)

### 7위 삼부컨비니언

**외부 대조:** 2026-10-09 전용84㎡ 13층 9.19억원. 주차자료에 K-apt 287대(0.42대/세대)와 KB 393대(0.57대/세대) 불일치; 두 경우 모두 주차 취약, 특히 원천자료 재검증 필요.

**현재 판단:** 자동 7위 하향 검토 및 주차원천 검증. 단지 최종 서열 미확정.

출처: [조회자료 1](https://ajumuny.com/realestate/complex?name=%EC%82%BC%EB%B6%80%EC%BB%A8%EB%B9%84%EB%8B%88%EC%96%B8&region=11290), [조회자료 2](https://ilsangkit.co.kr/real-estate/apt-sale/seoul/seongbuk/%EC%82%BC%EB%B6%80%EC%BB%A8%EB%B9%84%EB%8B%88%EC%96%B8)

### 8위 동아하이빌아파트 (천호동)

**외부 대조:** 2026-10-03 전용59.98㎡ 3층 8.5억원 거래 확인. 자동 비교모델이 인근 대비 47.5% 격차를 산출하였으나 대조 동급 신축·역세권의 이질성이 큰지 별도 통제가 필요.

**현재 판단:** 가격 일치·평균대비 47.5% 저평가 주장은 보류. 단지 최종 서열 미확정.

출처: [조회자료 1](https://wooaapt.wooahouse.com/apt/%EC%B2%9C%ED%98%B8%EB%8F%99%EC%95%84%ED%95%98%EC%9D%B4%EB%B9%8C-387fbb/), [조회자료 2](https://cy-on.kr/trades/8196/)

### 9위 성원2 (목동)

**외부 대조:** 2026-10-11 전용77.17㎡ 13층 9.9억원 거래 확인. 전용77㎡와 전용84.73㎡ 등의 평형을 동등한 30평으로 섞지 말고 공급평형 체계·층을 일치시켜야 함.

**현재 판단:** 가격 실거래 확인·면적체계 재확인. 단지 최종 서열 미확정.

출처: [조회자료 1](https://theibtime.com/apt/c/2958), [조회자료 2](https://son-poom.co.kr/apt/%EC%84%9C%EC%9A%B8-%EC%96%91%EC%B2%9C%EA%B5%AC/%EB%AA%A9%EB%8F%99-709-2/%EC%84%B1%EC%9B%902)

### 10위 양평벽산블루밍

**외부 대조:** 2026-08-27 전용51㎡ 11층 9.85억원 거래 확인. 이 면적 실거래 표본이 제한적이며 단순 주변 중위가 비교가 상품성 프리미엄을 반영하는지 유보.

**현재 판단:** 실거래 확인·비교가격표본 보강. 단지 최종 서열 미확정.

출처: [조회자료 1](https://apt.zippoom.com/%EB%B6%80%EB%8F%99%EC%82%B0/%EC%84%9C%EC%9A%B8-%EC%98%81%EB%93%B1%ED%8F%AC%EA%B5%AC-%EC%96%91%ED%8F%89%EB%8F%992%EA%B0%80-%EC%96%91%ED%8F%89%EB%B2%BD%EC%82%B0%EB%B8%94%EB%A3%A8%EB%B0%8D%EC%95%84%ED%8C%8C%ED%8A%B8/itpqby/%EB%A7%A4%EB%A7%A4/20%ED%8F%89), [조회자료 2](https://m.richgo.ai/realty/danji/a8qwpkQ?priceType=meme&pyeongType=20)

### 11위 초원부영

**외부 대조:** 2026-10-10 전용60㎡ 약9억원 거래. 1992년 1,743세대, 평촌역 인접. 안양시 2026-08-31 A-13 특별정비계획(안) 주민공람; 2026-11-10 대신자산신탁과 주민대표단 업무협약. 두 사건은 확정 정비구역지정·사업시행인가가 아님. 모델 단계표에는 초원부영 누락.

**현재 판단:** 공식 정비추진 미반영·장점 상향 검토, 완공 확정 가정 금지. 단지 최종 서열 미확정.

출처: [조회자료 1](https://www.anyang.go.kr/main/selectEminwonView.do?key=263&not_ancmt_mgt_no=84797), [조회자료 2](https://www.yna.co.kr/view/AKR20261110040700008)

### 12위 DMC한양

**외부 대조:** 2026-11-01 전용65.34㎡ 4층 9.7억원 거래 확인. 1987년 준공 660세대. 2026-10 신통기획 관련 정비구역 지정 공람 증거가 있으나 지정 완료와 구별.

**현재 판단:** 상위권 가능·공람단계와 정비계획의 영향 재평가. 단지 최종 서열 미확정.

출처: [조회자료 1](https://apt.zaritalk.com/complex/%EB%B6%81%EA%B0%80%EC%A2%8C%EB%8F%99-DMC%ED%95%9C%EC%96%91-22477), [조회자료 2](https://jaegebal.com/develops/5100/asks)

### 13위 우성5 (신길동)

**외부 대조:** 전용84.98㎡ 기준 2026년 9월 일반매매 추정 10억원, 1993년 321세대. 실제 계약 1건과 최빈 시세 차이를 검증하여 10억 경계와 중개거래 여부 확인 필요.

**현재 판단:** 10억원 경계에서 시세 재검증. 단지 최종 서열 미확정.

출처: [조회자료 1](https://zip-sisse.com/apt/11560-14jfo1a), [조회자료 2](https://www.jipgam.kr/seoul/apt/11560-14.html)

### 14위 상계주공1(저층)

**외부 대조:** 1988년 준공 816세대. 2026-10-01 전용84.41㎡ 약7.9억원 및 2026년 8~11월 84㎡ 7.58~7.9억원 거래로 8.11억원 추정치보다 다소 낮음.

**현재 판단:** 가격대 유지 가능·34평 공사비/대지지분 별도 평가 필요. 단지 최종 서열 미확정.

출처: [조회자료 1](https://statnorth.kr/apt/%EC%84%9C%EC%9A%B8/%EB%85%B8%EC%9B%90%EA%B5%AC/%EC%83%81%EA%B3%84%EB%8F%99-%EC%83%81%EA%B3%84%EC%A3%BC%EA%B3%B51%EC%A0%80%EC%B8%B5-c5608be693da), [조회자료 2](https://theibtime.com/apt/c/391)

### 15위 한보구암마을

**외부 대조:** 가양동 359세대, 주차 298대(세대당 0.83). 24평형의 2026-05-29 1층 7.8억원 거래와 모델 8.34억원을 같은 층/기간 가격으로 간주할 수 없음. 최근 3개월 거래 공백.

**현재 판단:** 자동 상대 할인 36.2%의 검증 보류. 단지 최종 서열 미확정.

출처: [조회자료 1](https://kbland.kr/c/530), [조회자료 2](https://aptchu.com/apt/11500-156)

### 16위 창신쌍용2

**외부 대조:** 2026-10-19 전용64.66㎡ 1층 8.5억원. 표본이 저층 거래라 같은 주택형의 중고층 비교가격과 구분해야 한다.

**현재 판단:** 실거래 확인·층수 보정 재점검. 단지 최종 서열 미확정.

출처: [조회자료 1](https://theibtime.com/apt/c/10), [조회자료 2](https://apt.zaritalk.com/complex/%EC%B0%BD%EC%8B%A0%EB%8F%99-%EC%B0%BD%EC%8B%8D%EC%9A%A92-25216)

### 17위 등촌1,2단지주공아파트

**외부 대조:** 2026-10-27 전용49.94㎡ 6층 9.85억원 확인. 단지 세대수 일부 자료에 505세대, 일부 통합자료에 2,175세대가 제시돼 관리단지 경계를 재확인해야 함.

**현재 판단:** 시세 확인·단지 통합관리 세대수 검증. 단지 최종 서열 미확정.

출처: [조회자료 1](https://theibtime.com/apt/c/664), [조회자료 2](https://www.naezipscan.com/map/building/c11500100001796)

### 19위 거여4단지

**외부 대조:** 자동 대표 전용39㎡ 16평형 약8.91억원. 2026-09-11 동일 39㎡가 10.4억원에 거래돼 가격대 10억원 경계 자체에 의문. 다른 49㎡ 13.5억원 거래와는 구분.

**현재 판단:** 가장 시급한 원시세 업데이트·6~10억 유지 재검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://lottes.co.kr/apartments/geoyeo-4.html), [조회자료 2](https://apt.zippoom.com/%EB%B6%80%EB%8F%99%EC%82%B0/%EC%84%9C%EC%9A%B8-%EC%86%A1%ED%8C%8C%EA%B5%AC-%EA%B1%B0%EC%97%AC%EB%8F%99-%EA%B1%B0%EC%97%AC4%EB%8B%A8%EC%A7%80/zugpk1/%EB%A7%A4%EB%A7%A4/16%ED%8F%89)

### 20위 길음뉴타운경남아너스빌

**외부 대조:** 모형 34평 9.35억원. 동일 공급 34평 전용84.9㎡의 2026.08~09 거래가격은 8.5~9.05억원 등으로 나와 모델 대표 시세가 최신 동일 평형 중위수보다 높을 수 있음. 114㎡ 34평 전용 표시와 구분 필수.

**현재 판단:** 평형·시세 재대조, 상대가치 5.6%를 확정마진으로 보지 않음. 단지 최종 서열 미확정.

출처: [조회자료 1](https://zipsaja.com/complexes/31691-%EC%A0%95%EB%A6%89%EB%8F%99-%EA%B8%B8%EC%9D%8C%EB%89%B4%ED%83%80%EC%9A%B4%EA%B2%BD%EB%82%A8%EC%95%84%EB%84%88%EC%8A%A4%EB%B9%8C?area=115), [조회자료 2](https://apt.peoplentools.com/i/%EA%B8%B8%EC%9D%8C%EB%89%B4%ED%83%80%EC%9A%B4%EA%B2%BD%EB%82%A8%EC%95%84%EB%84%88%EC%8A%A4%EB%B9%8C-%EC%8B%A4%EA%B1%B0%EB%9E%98%EA%B0%80-%EC%84%B1%EB%B6%81%EA%B5%AC-%EC%A0%95%EB%A6%89%EB%8F%99)

### 21위 중계센트럴파크

**외부 대조:** 2016년 준공 457세대, 주차 약1.03대. 동일 34평 전용84.75㎡ 2026-09-12 12층 9억원 거래로 자동시세 9.58억원보다 낮음.

**현재 판단:** 가격 근거 확인·자동 시세 약6% 상향 편향 여부 검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://chungyakalji.com/complex/A10027601), [조회자료 2](https://www.aptsite.kr/apartment/35474)

### 22위 남성 (문래동2가)

**외부 대조:** 서울시 공식 정비사업 정보몽땅에 남성아파트 재건축은 '사업시행인가' 단계(2021년 인가, 2026년 정정). 단순 1983년 준공 단지와 같은 연식감점 적용 불가; 관리처분인가라고 일부 2차 사이트가 적지만 공적 상태와 충돌하므로 그대로 수용하지 않음. 기존 18평 약9.86억원 가격은 거래 2건에 기초.

**현재 판단:** 공식 단계는 확인·분담금과 원시세 확인 전 순위 확정 보류. 단지 최종 서열 미확정.

출처: [조회자료 1](https://cleanup.seoul.go.kr/cleanup/bsnssttus/lscrMainIndx.do?cpage=1&pageSize=2000), [조회자료 2](https://jaegebal.com/gnotices/ydp-gs-2026-108?develop=2752&from=develop)

### 23위 상계주공6(고층)

**외부 대조:** 2026-10-20 전용59.2㎡ 9층 8.35억원 거래 확인. 자동 대표 8.53억원과 약2% 수준 차이, 동일 단지의 고층/저층/소형평형을 혼합해서 가격추정하지 않을 것.

**현재 판단:** 가격대 교차검증 양호·정확한 23위 미확정. 단지 최종 서열 미확정.

출처: [조회자료 1](https://seoulzen.com/apartment/c9b61fdf2d6581/?chartArea=58.01%E3%8E%A1&chartKind=sale), [조회자료 2](https://budongsan.gwiin.co.kr/complex?name=%EC%83%81%EA%B3%84%EC%A3%BC%EA%B3%B56%28%EA%B3%A0%EC%B8%B5%29&sigungu=%EC%84%9C%EC%9A%B8+%EB%85%B8%EC%9B%90%EA%B5%AC)

### 26위 경남아너스빌(1356-0)

**외부 대조:** 강북구 미아동 전용84.87㎡ 2026-10 기준 9.18억원 내외 거래가 확인돼 자동 대표 8.738억원보다 높을 가능성. 다른 전용114㎡ 10.5억원과 혼동 금지.

**현재 판단:** 34평 원시세 상향 보정 필요성 검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://zipsaja.com/complexes/35367-%EB%AF%B8%EC%95%84%EB%8F%99-%EA%B2%BD%EB%82%A8%EC%95%84%EB%84%88%EC%8A%A4%EB%B9%8C-1356-0?area=115), [조회자료 2](https://zip-sisse.com/apt/11305-1pb41x9)

### 27위 길음뉴타운데시앙

**외부 대조:** 2026-11-07 전용114㎡ 약8.7억원 거래 확인. 1999년 514세대, 언덕 지형 및 교통 불리함을 감안하면 46평 가격이 낮다는 이유만으로 저평가 차익이라 단정할 수 없음.

**현재 판단:** 가격 확인·언덕과 교통 감점 재검토. 단지 최종 서열 미확정.

출처: [조회자료 1](https://www.jipgam.kr/seoul/apt/11290-53.html), [조회자료 2](https://m.richgo.ai/realty/danji/a6ImAcS?priceType=meme&pyeongType=46)

### 28위 동양엔파트

**외부 대조:** 2026-10-27 전용84.88㎡ 15층 9억원 거래 확인; 모델 9.238억원. 2003년 준공 448세대이며 2026-09-09 8.9억원 14층 '직거래' 신고가 별도로 있어 비교 시 거래유형 구분.

**현재 판단:** 가격 확인·직거래 제외 후 중위가격 검증. 단지 최종 서열 미확정.

출처: [조회자료 1](https://ajumuny.com/realestate/complex?name=%EB%8F%99%EC%96%91%EC%97%94%ED%8C%8C%ED%8A%B8&region=11350), [조회자료 2](https://home.hanbogi.com/apt/11350-214/)

### 40위 강동리엔파크14단지 (기존 1위)

**외부 대조:** 2026-10-03 전용49.69㎡ 4층 8.85억원, 2026-09-23 동급 8층 9.6억원. 모델 20평 시세 9.108억원은 크게 벗어나지 않지만 신축상품성 100·교통 8.8이라는 상충가치와 경사·주차를 동시에 비교해야 함.

**현재 판단:** 기존 1위 정당성 부족 의견은 유지하되 새 40위 수치도 미확정. 단지 최종 서열 미확정.

출처: [조회자료 1](https://aptchu.com/apt/11740-4802), [조회자료 2](https://chungyakalji.com/complex/A10024412)

### 70위 하안주공10단지 (기존 3위)

**외부 대조:** 광명시 고시 제2025-329호 2025-12-10 하안주공10·11단지 정비구역·사업시행자 지정. 자동모형 정비단계 부가점수 1.45점은 사업진척의 의미를 충분히 평가한 근거가 아니며 예상 분담금/기존 용적률/대지지분이 필요.

**현재 판단:** 기존3→새70위의 확정 판정 취소·재건축 사업성 정밀 검증 필요. 단지 최종 서열 미확정.

출처: [조회자료 1](https://www.gm.go.kr/pt/user/nftcBbs/BD_selectNftcBbsDetail.do?q_nftcBbsCode=1001&q_nftcBbsMgtno=64249), [조회자료 2](https://www.gg.go.kr/onnuri/mbiz/home/GHMT_0000000000181/main.do)

### 101위 e편한세상염창 (기존 6위)

**외부 대조:** 22평급 전용55㎡ 2026-04-08 4층 9억원, 2026-03-10 9.1억원. 동일 단지 전용74㎡ 2026-05-04 16억원은 주택형이 다르므로 가격역전이나 확정 저평가 근거가 아님. 22평급 거래가 오래되어 2026-11 현재 대표시세의 유효성 별도 검증 필요.

**현재 판단:** 표시가격 허위라고 단정 금지, 동일면적 최신가격 부족으로 기존6·새101위 모두 보류. 단지 최종 서열 미확정.

출처: [조회자료 1](https://cy-on.kr/trades/4638/), [조회자료 2](https://howmuchapt.com/c/11500-7907)

### 282위 평촌어바인퍼스트 (기존 36위)

**외부 대조:** 공급 18평 안팎(전용46.94㎡) 2026-11 기준 8.65억원 거래가 있어 기존 모델 8.56억원과 비슷함. 한편 전용59.87㎡ 2026-11-12 10.5억원은 공급 약25평의 다른 주택형으로 혼합해서는 안 됨. 이 주택형의 실거래 신뢰도는 실질적으로 양호함.

**현재 판단:** 18평급의 가격근거는 검증; 기존36→새282위는 광역 비교모형 가중치 영향으로 정확한 수치 미확정. 단지 최종 서열 미확정.

출처: [조회자료 1](https://land.openblog.com/apt/41173-2100), [조회자료 2](https://todayhouseprice.kr/apart.php?all_area=N&apart_name=%ED%8F%89%EC%B4%8C%EC%96%B4%EB%B0%94%EC%9D%B8%ED%8D%BC%EC%8A%A4%ED%8A%B8&area_main_name=%EA%B2%BD%EA%B8%B0%EB%8F%84&dong=%ED%98%B8%EA%B3%84%EB%8F%99&size=60)


## 후속 검증 우선순위 및 남은 제약

1. **가격대 소속 위험:** 거여4단지 같은 최근 동일 전용면적 거래가 10억원을 상회하는 단지를 추출, 최근 유효 일반매매의 기간별 중앙값·직거래 여부·취소·등록시차 확인.
2. **법정 인허가·분담금:** 하안주공10·11, 초원부영, 남성 및 사업진척도 반영이 다른 주변 1기 신도시 재건축 단지. 공식 고시와 사업계획·대지지분·예상 분담금·비례율을 검토.
3. **상품성 보정:** 상위 100위의 세대당 주차, 경사, 단지관리, 소형주택/주상복합 여부, 전용률을 개별 KB·K-apt/건축물대장 원천 대조 후 재점수 산출.
4. **실거래 공시의 시간 일치:** 2026-11-20 순위의 각 평형과 2026-11-23 조회거래를 혼동하지 않으며, 그 이전 신고·해제 여부를 추적.
5. **전체 1,650위의 실제 상대가치 설명:** 새로운 개별 근거를 확보한 단지부터 기존 위치의 위·아래 단지와 같은 공급면적, 지역, 사업리스크를 비교하고 순위를 다시 정해야 함. 현 단계의 숫자를 확정 순위로 선포해서는 안 됨.

## 관련 데이터

- [새 순위 1~100위 외부검증 진행표](https://github.com/shinstory1234-hub/-honbab-map/blob/analysis/20261123-cap10-relative-value-1650/analysis/2026-11-23/cap10_external_evidence_batch01_top100_status.csv)
- [개별 검증 29개 CSV](https://github.com/shinstory1234-hub/-honbab-map/blob/analysis/20261123-cap10-relative-value-1650/analysis/2026-11-23/cap10_external_evidence_batch01_cases.csv)
- [독립 자동평가 원 보고서](https://github.com/shinstory1234-hub/-honbab-map/blob/analysis/20261123-cap10-relative-value-1650/analysis/2026-11-23/cap10_full_relative_value_report_20261123.md)
- [기존 순위 1~500위별 근거](https://github.com/shinstory1234-hub/-honbab-map/blob/analysis/20261123-cap10-relative-value-1650/analysis/2026-11-23/cap10_original_rank_0001_0500.csv)
