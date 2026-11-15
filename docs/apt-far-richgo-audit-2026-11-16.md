# 6억 초과 아파트맵: 리치고 단지정보 용적률 대조 (2026-11-16)

## 작업 범위

- 2차 잔여 303개 레코드 가운데 KB부동산으로 먼저 확인한 51개를 제외한 252개를 리치고 공개 단지정보와 대조했다.
- 리치고 법정동별 공개 단지 목록에서 후보를 찾고, 단지별 공개 상세페이지를 조회했다.
- 주소의 행정동, 준공연도, 전체 세대수, 단지명 일치 여부를 검사했다.
- 실제 조회 443회; 252개 중 252개 조사 완료. 미확인이라고 해서 리치고에 단지가 없다는 뜻은 아니다.

## 결과

| 검증 결과 | 단지 항목 수 |
|---|---:|
| 동·세대수·준공연도·단지명 일치 | 120 |
| 세대수 또는 단지명 불일치 | 75 |
| 동별 목록에서 일치 후보 없음 | 28 |
| 일치 여부 불확실 | 21 |
| 동일 단지, 리치고 용적률 공란 | 8 |

- 출처를 확인한 값은 아파트맵의 국토교통부 공식원본 검증값과 구분하여 관리한다.
- 용적률이 화면에 표시된다고 하더라도 세대수가 다르면 해당 수치를 확정값으로 자동 이식하지 않는다.
- 리치고에 용적률이 0 또는 공란인 단지도 존재한다.
- 운영 사이트 수치와 순위는 변경하지 않았다. 자료를 다른 서비스에 반영하기 전 데이터 이용조건 확인이 필요하다.

## 전수 조사 결과 파일

- [252개 검증 결과 간결 CSV](apt-far-richgo-252-compact-2026-11-16.csv)
- [252개 세부 수치·출처 전체 CSV 압축본](apt-far-richgo-252-audit-2026-11-16.csv.gz)
- [252개별 확인한 후보와 판정 근거 JSON 압축본](apt-far-richgo-252-audit-2026-11-16.json.gz)
- [기존 KB 대조 51개 CSV](apt-far-kb-crosscheck-51-2026-11-16.csv)

## 명확히 확인된 대표 단지

- 우성 (서울 서초구 양재동): 리치고 198%, 794세대. https://m.richgo.ai/realty/danji/a0Ofrim
- 문정가락현대1차 (서울 송파구 문정동): 리치고 179%, 514세대. https://m.richgo.ai/realty/danji/a6oOVEU
- 삼환 (서울 송파구 가락동): 리치고 178%, 648세대. https://m.richgo.ai/realty/danji/a6kgvOO
- 가락미륭아파트 (서울 송파구 가락동): 리치고 180%, 435세대. https://m.richgo.ai/realty/danji/a7legPu
- 한양아파트 (서울 송파구 송파동): 리치고 157%, 576세대. https://m.richgo.ai/realty/danji/a1CXalG
- 미성맨션 (서울 송파구 송파동): 리치고 178%, 378세대. https://m.richgo.ai/realty/danji/a7wdLde
- 한신잠실코아 (서울 송파구 신천동): 리치고 390%, 493세대. https://m.richgo.ai/realty/danji/a2ukBOE
- 상아2차아파트 (서울 송파구 오금동): 리치고 249%, 750세대. https://m.richgo.ai/realty/danji/a4Aymdu
- 쌍용 (서울 송파구 풍납동): 리치고 321%, 417세대. https://m.richgo.ai/realty/danji/a4UTJqu
- 동아한가람1 (서울 송파구 풍납동): 리치고 342%, 782세대. https://m.richgo.ai/realty/danji/a0XhTCb
- 현대1차 (서울 송파구 거여동): 리치고 238%, 497세대. https://m.richgo.ai/realty/danji/a1IFHkZ
- 당산한양 (서울 영등포구 당산동3가): 리치고 178%, 338세대. https://m.richgo.ai/realty/danji/a5FHHeJ
- 우성2 (서울 영등포구 신길동): 리치고 180%, 725세대. https://m.richgo.ai/realty/danji/a9PqKNK
- 우성4 (서울 영등포구 신길동): 리치고 213%, 476세대. https://m.richgo.ai/realty/danji/a7TuJlN
- 건영 (서울 영등포구 신길동): 리치고 181%, 386세대. https://m.richgo.ai/realty/danji/a0hExvF
- 우성1 (서울 영등포구 신길동): 리치고 176%, 688세대. https://m.richgo.ai/realty/danji/a2HWxlg
- 삼성 (서울 영등포구 신길동): 리치고 169%, 384세대. https://m.richgo.ai/realty/danji/a5yohBR
- 우성3 (서울 영등포구 신길동): 리치고 176%, 477세대. https://m.richgo.ai/realty/danji/a5qFMWo
- 문래공원한신 (서울 영등포구 문래동3가): 리치고 234%, 367세대. https://m.richgo.ai/realty/danji/a7FyicR
- 문래두산위브 (서울 영등포구 문래동5가): 리치고 232%, 383세대. https://m.richgo.ai/realty/danji/a2JIEJZ

## 값이 있으나 적용을 보류한 이유

- 현대아파트 (서울 서초구 서초동): 아파트맵 412세대, 검색된 리치고 413세대; 리치고 용적률 196%; https://m.richgo.ai/realty/danji/a2jsERN
- 우성아파트 (서울 송파구 잠실동): 아파트맵 1512세대, 검색된 리치고 1842세대; 리치고 용적률 None%; https://m.richgo.ai/realty/danji/a0VGlLf
- 현대 (서울 송파구 잠실동): 아파트맵 338세대, 검색된 리치고 336세대; 리치고 용적률 257%; https://m.richgo.ai/realty/danji/a8aLdUG
- 올림픽훼밀리타운 (서울 송파구 문정동): 아파트맵 4524세대, 검색된 리치고 4494세대; 리치고 용적률 194%; https://m.richgo.ai/realty/danji/a6CtOFg
- 대림 (서울 송파구 방이동): 아파트맵 497세대, 검색된 리치고 480세대; 리치고 용적률 176%; https://m.richgo.ai/realty/danji/a3XaqcU
- 우성 (서울 송파구 가락동): 아파트맵 935세대, 검색된 리치고 838세대; 리치고 용적률 210%; https://m.richgo.ai/realty/danji/a1qAnuP
- 2차한양아파트 (서울 송파구 송파동): 아파트맵 744세대, 검색된 리치고 744세대; 리치고 용적률 165%; https://m.richgo.ai/realty/danji/a0HyWdm
- 극동 (서울 송파구 풍납동): 아파트맵 307세대, 검색된 리치고 415세대; 리치고 용적률 248%; https://m.richgo.ai/realty/danji/a9hxWCo
- 시범 (서울 영등포구 여의도동): 아파트맵 1812세대, 검색된 리치고 1584세대; 리치고 용적률 None%; https://m.richgo.ai/realty/danji/a8VJYNm
- 당산현대3차 (서울 영등포구 당산동4가): 아파트맵 510세대, 검색된 리치고 509세대; 리치고 용적률 248%; https://m.richgo.ai/realty/danji/a8VzAkq

간결 CSV의 리치고 단지 ID는 https://m.richgo.ai/realty/danji/ 뒤에 붙이면 원문을 확인할 수 있다.
