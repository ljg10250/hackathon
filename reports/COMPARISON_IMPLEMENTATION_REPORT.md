# 서울–전국 비교·분석 연결 보완 검증 보고서

검증: 2026-10-31, Asia/Seoul. 작성시각 2026-10-30T20:15:10.416403+00:00.
판정: **고용률 원 표 대조 → 비교 구현 → 직종별 공고 탐색 연결 → 실제 공개 배포·검증 통과**.

공개 URL: https://seoul-youth-job-compass.ljg10250000.workers.dev
Worker version: `ccb77f68-4d75-4c4b-8bfa-9bd164755100`.
이 보고서는 같은 날짜의 STAGE1~6 및 이전 후보본 이후의 후속 결과다. 과거 검사 기록은 삭제하지 않았다. 공식 최종 제출·사용자 효과 검증·가산점 판정은 완료한 것으로 표현하지 않는다.

## 실행 계획과 완료 범위

1. 원본·실제 앱·기존 DB 상태 확인: 기존7개 테이블·행수·RLS 확인, 새 프로젝트·초기화·재적재 없음. 실제 앱 변경 전 파일 해시 확인과 작업 폴더의 백업으로 사용자 변경을 보존했다.
2. 고용률 검증: 원 CSV17지역×23분기의 수치375개가 KOSIS와 일치. 결측16개는 원 토큰과 ‘공식 응답 관측치 없음’을 구분해 보존. 공개46행의 값·기간·연령 일치.
3. 비교 구현: 서울·전국 같은15~29세/분기/정의/%의23개 분기, 격차%p, 전년 같은 분기 변화, 비교분기·시작연도 선택, 수치표·산식·출처·한계 안내. 메타데이터·검증 플래그·검증값이 달라지면 비교를 차단한다.
4. 분석 연결: 공식PDF 중분류35개 코드/명칭을 시장통계 이름과 공백 정규화만으로 대조. 기존323쌍의 검증된 hierarchy만 검색 필터에 사용. 공개7,893행의 범위이며 미검증235쌍 제외. 중분류·원본직종·지역·경력·제목의 교집합, 페이지/상세 복귀 조건 유지.
5. 문제·AI 활용 기록: 관측과 사용자 가설·목표/미검증 효과를 구분해 사이트와 문서에 반영. 실제 지역명 오류·검사 누락·대비/초점·이번 빈 폼 값 오류의 수정·재검증을 기록.
6. 실제 배포: 기존 Worker와 DB를 재사용했다. 유료 전환·새 유료 자원·사용자 추적·회원가입·검색기록 저장을 추가하지 않았다. 실제 공개 URL 검증 통과.

## 원 표와 해석

KOSIS org101, table INH_1DA7015S, item T90, age75(15~29세), frequencyQ, unit%. 출처는 경제활동인구조사다. ITM의 시도별00=계/Total과11=서울특별시/Seoul 및 EXPL의 조사범위전국·전국 표본가구 내 상주가구원이라는 근거를 함께 사용해 계→전국 및 거주지 기준을 확인했다. 지역 평균으로 전국이나 서울 값을 만들지 않았다.

2026-Q3: 서울47.1%, 전국44.1%, 서울−전국+3.0%p. 2025-Q3:49.8%,45.3%이므로 전년 동기 변화는 −2.7%p,−1.2%p다. 전국은 서울을 포함한다. 고용률은 개인 취업확률이 아니며 비취업 비율을 실업률로 해석하지 않는다. 원인·표본오차·통계적 유의성은 분석하지 않았다.

최초 CSV 다운로드 URL/추출시각을 복구했다고 주장하지 않는다. 전체 내용이 원 표와 일치함을 확인한 것이며 최초 수집시각은 null 유지, 공식 응답 조회와 검증시각은 별도 기록이다.

근거: `data/metadata/kosis_employment_20261031.json`, `reports/kosis_employment_verification_20261031.json`, `reports/occupation_groups_validation_20261031.json`, `data/metadata/occupation_groups_2025.json`.

## DB 변경 범위

단일 트랜잭션의 `supabase/metadata_updates/verify_employment_20261031.sql`로 출처1행·고용률46행 검증 플래그만 갱신했다. 예상46행 수치/지역/기간/연령/지표와 이전 상태·갱신행수 가드가 실패하면 롤백한다. 관측값·기존92개 통계행·7테이블 행수·RLS/권한을 유지했다. 최초 INSERT 파일은 재사용하지 않았다.

실업률46행 pending_age·비공개, 관련 직종 관계0개, 공개공고10,743행은 유지된다. 7개 테이블 RLS 활성화, anon/authenticated 공개 쓰기 권한0개. 근거 `reports/comparison_database_20261031.json`, `reports/resume_rls_2026-10-30T20-02-50-721Z.json`.

## 현재 실행한 검증

| 검사 | 현재 결과 | 근거 |
|---|---|---|
| npm run check | 통과 | TypeScript noEmit |
| npm test | 19그룹 통과 | 고용률 같은분기/전년동기·0/결측·중복·검증 차단·직종 필터 교집합 포함 |
| npm run build | 통과 | Vite production build |
| Wrangler 타입·배포 파일 | types --check, dry-run 통과 | .tmp/comparison-final, 실제 배포 완료 |
| 로컬 HTTP | 17통과 | comparison_local_http_20261031.json |
| 로컬 계산·35분류 필터 | 44통과 | comparison_local_data_20261031.json |
| 로컬 API→React | 30통과 | comparison_local_pages_20261031.json |
| 기존 추천 회귀 | 27통과 | comparison_local_recommendations_20261031.json |
| RLS 공개 읽기/차단 | 6통과 | resume_rls_2026-10-30T20-02-50-721Z.json |
| 공개 HTTP | 17통과 | comparison_public_http_20261031.json |
| 공개 계산·35분류 필터 | 44통과 | comparison_public_data_20261031.json |
| 공개 API→React | 30통과 | comparison_public_pages_20261031.json |
| 공개 실제 브라우저 | 53통과·실패0 | browser_comparison_public_20261031/results.json |
| 원본5개 SHA256 | 최초 기준과 일치 | raw_integrity_comparison_20261031.json |
| 자체 API 시연 근거 | 실제6요청·계산2건 대조 | api_demo_comparison_20261031.json |

PowerShell의 npm.ps1 실행정책 차단은 npm.cmd로 실행해 해결했다. 보안정책을 변경하지 않았다.

브라우저는 사용자 허용에 따라 개인 프로필과 분리된 임시 Chrome 컨텍스트를 사용했다. 1280×900,768×1024,390×844,320×740,844×390의30개 화면에서 axe검출0·가로넘침0·앱JS오류0·실패요청0, PC/모바일 검색·비교분기/연도·분류연결·페이지·복귀·추천·오류복구 흐름과 키보드를 확인했다. 물리기기·Safari/Firefox·전체 WCAG 인증은 아니다.

최초 로컬 브라우저 검사에서는 새 중분류 폼의 빈 값을 API가400으로 처리해 검색3검사가 실패했다. 기록은 `browser_comparison_local_20261031`에 보존했다. 빈 선택을 ‘제한 없음’으로 수정하고 로컬 이용흐름18개를 새 기록 `browser_comparison_local_fixed_20261031`에서 통과했다. 공개 전체53검사도 통과해 현재 실패를 해소했다.

## 실행과 재현

```text
npm.cmd run check
npm.cmd test
npm.cmd run build
npx.cmd wrangler types --check
npx.cmd wrangler deploy --dry-run --outdir .tmp/NEW
node scripts/smoke.mjs <URL> reports/NEW_http.json
node scripts/check_comparison.mjs <URL> reports/NEW_comparison.json
node scripts/check_pages.mjs <URL> reports/NEW_pages.json
node scripts/check_rls.mjs
node scripts/check_browser.mjs <URL> reports/NEW_browser
python scripts/verify_kosis_employment.py --app . --raw-dir <원본폴더> --output reports/NEW_kosis.json
python scripts/verify_occupation_groups.py --output reports/NEW_groups.json
```

CSV/공식응답/PDF는 읽기 전용이다. 보고서 경로는 과거 기록을 덮어쓰지 않는 새 이름을 준다. PDF검사는 검증된 공식 PDF와 Poppler가 필요하다. 초기 prepare_data.py는 갱신 도구가 아니며 검증 후 별도 반영 절차가 필요하다.

## 남은 보류와 해제 조건

- 사용자 효과: 실제 참가자의 과제 수행·소요시간·이해도 확인이 필요하다. 자동화검사로 탐색 부담 감소·취업효과를 입증하지 않았다.
- 실업률: 해당 CSV의 원 표·선택 연령 증거가 필요하다. 자치구: 별도 원 표·조사 설명 대조가 필요하다.
- 인코딩5행: 동일 원문 근거 확보 전 격리 유지. 직종235쌍: 공식 코드+명칭 근거 확보 후 검증. 관련 직종0개: 명시적인 관련성 근거 확보 전 추천 점수/대안 생성 없음.
- 임금 환산: 지급 구성 동등성 검증 필요. 근무일수631행: 원문 근거 전 임의 보완 없음.
- 원공고ID·직접URL·실시간 모집: 공식 식별자·동일 스냅샷/갱신 연결 검증 필요. 통근시간은 좌표·교통자료가 필요하다.
- 새 데이터 갱신: 별도 버전 준비·검증·원자적 전환 구조가 필요하다. 이번은 기존 수치의 검증 상태 보완이다.
- 제출: 사용자 제공 필수5개/선택4개·배점은 docs/JUDGING_CRITERIA.md에 정리했다. 실제 이름·이메일·공식 포털/마감/파일규격·발표시간 확인과 최종 제출은 남았다. 약3분 시연은 자체 초안이며 공식 제한시간이 아니다.

## 후보 패키지

이전 후보본은 보존한다. 후속 후보는 `seoul_job_compass_comparison_20261031.zip`, 별도 파일별 SHA256·압축 무결성 기록은 `reports/candidate_manifest_comparison_20261031.json`을 따른다. 후보 생성은 외부 제출이 아니다.
