# 6억~10억 리치고 공개페이지 크롤링 후속조사

- 원본 1,822개 단지, 기존 조사 기록 714개, 신규 크롤링 대상 1,108개
- 지역별 크롤링 6개 조각 전부 확인. 상세 결과와 각 단지 URL은 JSON 원문 및 CSV에 보관
- 자동 수정은 리치고 동일 단지 ID 중복이 없고 입주연도 2년 이내, 세대수 정확 일치, 용적률 60~1500%인 검증 단지에만 적용
- 기존 6억 이하 및 다른 금액대 입력값을 건드리지 않음

## 조사 상태
- crawler_verified: 784개
- crawler_review_needed: 167개
- crawler_unmatched: 96개
- crawler_shared_scope_review: 38개
- crawler_units_mismatch_review: 16개
- crawler_far_blank: 7개

- 추가 자동 보정: 784개
- 2차 재검증에서 추가 복원된 단지: 94개
- 3차 법정동 공개목록에서 추가 복원된 단지: 89개
- 최종 보정 파일 항목: 1340개
- 용적률 수치 존재: 1638개
- 단지 매칭 불명확한 항목은 임의 수치를 넣지 않고 별도 검증 대상으로 유지

## 지역 작업별 원자료
- 작업 0: 185개, HTTP 성공 285회
- 작업 1: 185개, HTTP 성공 285회
- 작업 2: 185개, HTTP 성공 295회
- 작업 3: 185개, HTTP 성공 295회
- 작업 4: 184개, HTTP 성공 257회
- 작업 5: 184개, HTTP 성공 280회

상세: docs/richgo-6to10-remaining1108-20261118.csv 와 docs/richgo-6to10-remaining-parts/part00.json~part05.json
