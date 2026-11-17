#!/usr/bin/env python3
import csv,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
third=json.load(open(root/'docs/richgo-under6-thirdpass-20261118.json'))
applied=list(csv.DictReader(open(root/'docs/richgo-under6-applied-far-20261118.csv')))
previous=list(csv.DictReader(open(root/'docs/richgo-under6-full-still-unresolved-20261118.csv')))
bykey={r['key']:r for r in third['rows']}
resolved={r['key'] for r in third['rows'] if r['selected']}
final_path=root/'docs/richgo-under6-full-final-2755-20261118.csv'
final_rows=list(csv.DictReader(open(final_path)))
for r in final_rows:
 t=bykey.get(r['name']+'|'+r['area'])
 if not t or not t['selected']:continue
 f=t['selected']['richgo']
 r.update({'status':'verified_third_pass','stage':'thirdpass','richgo_far':f['far'] if f['far'] is not None else '', 'richgo_units':f['units'],'richgo_year':int(f['year']),'distance_m':t['selected']['distance_m'] if t['selected']['distance_m'] is not None else '', 'quality_issue':'','richgo_url':f['url']})
with open(final_path,'w') as f:
 w=csv.DictWriter(f,fieldnames=list(final_rows[0]),lineterminator="\n");w.writeheader();w.writerows(final_rows)
pending=[]
for r in previous:
 key=r['name']+'|'+r['area']
 if key in resolved:continue
 t=bykey[key]
 r.update({'latest_attempt':'thirdpass_index' if third['meta'].get('indexSearch') else 'thirdpass','candidate_count':len(t['candidates']),'remaining_reason':'공개 목록과 검색에서 후보 미확보' if not t['candidates'] else '단지명·좌표·세대수·연도 식별 검증 불충족'})
 pending.append(r)
with open(root/'docs/richgo-under6-pending-latest-20261118.csv','w') as f:
 w=csv.DictWriter(f,fieldnames=list(pending[0]),lineterminator="\n");w.writeheader();w.writerows(pending)
changed=sum(not r['old_far'] or float(r['old_far'])!=float(r['new_far']) for r in applied)
report=f'''# 6억 이하 리치고 용적률 반영 및 추가 조사 — 2026-11-18

## 최종 범위

- 전체 고유 단지: 2,755개.
- 기존 1·2차 확인: 2,167개. 이번 추가 확인: {len(resolved)}개. 총 단지 식별 확인: {2167+len(resolved)}개.
- 용적률 숫자 확인 및 반영: {len(applied)}개. 기존 감사 기준과 다른 값은 {changed}개이며, 이 중 280개는 기존 300개 작업에서 이미 반영돼 있었다.
- 아직 단지 식별을 확정하지 못한 단지: {len(pending)}개. 전체 검증이 끝났다고 표시하지 않는다.

## 이번 변경

- 리치고 확인값을 6억 이하 원자료의 FARD에 반영했다. 가격·세대수·입주연도는 이번 작업에서 변경하지 않았다.
- 기존 1,858개 용적률 변경 후보를 모두 처리하고, 추가 조사에서 확보한 용적률도 반영했다.
- 일부 통합 단지가 공유하는 용적률은 기존 감사의 shared scope 표시를 CSV에 유지했다. 세대수는 공유 상세페이지 값을 무조건 덮어쓰지 않았다.
- 상세페이지의 실제 단지명으로 검증했다. 검색 대상 이름을 출처 이름으로 간주하지 않았다. 숫자 충돌, 좌표·연도·세대수 불일치는 보류했다.
- 공개 지역 목록 260개와 후보 상세페이지를 추가로 조회했다. 공개 검색 색인 조회 여부와 차단 응답 건수는 thirdpass JSON의 meta에 기록했다.

## 검증

- `node scripts/test-richgo-under6-full.cjs`: 모든 반영 용적률의 출처 일치, 전체 PICK 항목·가격·좌표·학교 데이터 보존, 6억 초과 탭 불변을 검증한다.
- `node scripts/test-richgo-under6-verified300.cjs`: 기존 300개 교정 결과 회귀검사.
- `node scripts/build-apt-assets.mjs`: 전송량·요청 수 상한을 유지한다. 좌표는 정수 차분으로 저장하고 동일한 좌표로 복원하며 전체 좌표 동일성 검사로 확인했다.
- 변경 전 6억 이하 gzip: 1,189,157B, 요청 8개. 변경 후 측정값은 최종 빌드 로그와 perf-budget.json에 기록한다.

## 원자료와 재현

- `docs/richgo-under6-applied-far-20261118.csv`: 단지별 기존값·리치고값·URL·검증 단계.
- `docs/richgo-under6-thirdpass-20261118.json`: 이번 588개 추가 조사 결과 및 후보 사실.
- `docs/richgo-under6-pending-latest-20261118.csv`: 남은 {len(pending)}개와 보류 이유.
- `scripts/apply-richgo-under6-full.py`: 감사 기준 커밋 154824bb220c448a6456436e8a3184e41750c7ba에서 재현하며 이전 결과와 추가 결과를 함께 적용한다.
- 작업 브랜치: audit/richgo-under6-full-20261118. 이 보고서는 기존 full-final-report의 후속 결과다.
'''
(root/'docs/richgo-under6-applied-report-20261118.md').write_text(report)
old_report=root/'docs/richgo-under6-full-final-report-20261118.md'
old=old_report.read_text()
notice='> 후속 조사 및 용적률 반영 결과는 [최신 반영 보고서](richgo-under6-applied-report-20261118.md)를 참조한다. 아래는 1·2차 당시의 기록이다.\n\n'
if not old.startswith(notice):old_report.write_text(notice+old)
print(json.dumps({'verified':2167+len(resolved),'far':len(applied),'changedFromOriginalAudit':changed,'pending':len(pending)},ensure_ascii=False))
