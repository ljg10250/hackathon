# 한눈에 보기·해석문 구현 검증 보고서

검증 기준: 2026-10-31, Asia/Seoul. 작성 시각: 2026-10-30T21:17:33.006425+00:00.
판정: **실제 자료 검증 → 구현 → 로컬 확인 → 공개 배포 → 공개 검증 통과**.

- 새 화면: https://seoul-youth-job-compass.ljg10250000.workers.dev/visualizations
- 서울 지도: https://seoul-youth-job-compass.ljg10250000.workers.dev/visualizations?area=districts
- Worker 버전: `7c901221-eb95-464d-a811-dcce5b7dfb56`.
- 기존 무료 Worker·Supabase 프로젝트를 재사용했다. 새 프로젝트·유료 전환·DB 초기화·기존 관측값 재적재·로그인·추적 기능을 추가하지 않았다.

## 실제 구현한 내용

1. 기존 화면의 해석문: 서울–전국의 수준 차이와 전년 동기 흐름, 자치구 주민 고용률의 의미, 직종의 명/건 비율을 선택한 실제 값으로 설명한다. 원인·개인 취업 가능성·추천 효과를 추정하지 않는다.
2. 다섯 번째 메뉴 ‘한눈에 보기’: 서울·경기·인천·전국의 동일 분기 고용률 비교와 추이, 관심 시도·분기 선택, 수치표, 짧은 해석을 제공한다.
3. 서울 25구 지도: 공식 폴리곤을 고용률에 따른 다섯 색 구간으로 표시한다. 구 클릭·키보드·선택상자·모바일 터치·지도 확대를 지원한다. 선택 구의 값·전년 같은 반기 변화·해석·추이·근무지 공고 탐색을 연결했다.
4. 자치구×반기 변화표: 25구×11반기의 275개 값을 같은 색 범례로 표시한다. 구 이름·반기 제목 선택이 지도와 상세 설명에 반영된다. 표는 가로·세로 스크롤과 키보드 접근을 지원한다.
5. 선택 상태를 URL과 연결하고 새로고침 후 유지한다. 알려지지 않은 기간·구는 유효한 기본 선택으로 정규화한다. 서버의 미검증·불일치 자료는 빈 목록과 보류 안내로 처리한다.

고용률은 %, 차이는 %p다. 취업자 수·취업률·실업률은 이번 화면의 지표가 아니다. 수도권 분기 자료와 자치구 반기 자료를 같은 시계열로 합치지 않았다. 전국은 서울을 포함한다.

## 데이터 검증과 DB 반영

수도권 4지역×23분기92개 값은 KOSIS `101/INH_1DA7015S`, 항목T90, 연령75(15~29세)의 기존 검증 응답과 원 CSV에 일치한다. 새 source_id=`capital-employment-20261031-v1`로 별도 버전에 격리했다. 기존 employment46행과 `/api/indicators`의 source 필터를 유지하므로 기존 비교에 신규92행이 섞이지 않는다.

자치구 25구×11반기275개 값은 원 CSV, `INH_1ES3A03_A01S` 및 기초표 `DT_1ES3A03_A01S`의 선택 연령010·항목T12와 모두 일치한다. 조사 대상은 표본가구의 상주 가구원이며 반기 대표 조사기간은4·10월15일을 포함한 일주간이다. 구 평균을 서울 고용률로 계산하지 않았다.

단위 주의: API 공통 `UNIT_NM`은 ‘천명’이지만 선택 항목T12는 ‘고용률(%)’, T00은 ‘취업자(천명)’이다. 항목명·공식 정의·산식(해당 연령 취업자/해당 연령 인구×100) 및 기초표 대조로 항목별 단위를 구분했다. 원 응답의 이 불일치는 그대로 보존했다. 최초 CSV 추출시각은 미기록/null이며 공식 응답 조회시각으로 대체하지 않았다.

`supabase/metadata_updates/visualization_snapshot_20261031.sql`의 단일 트랜잭션으로 새 출처/import/92행을 적재하고 기존 자치구275행의 검증 플래그와 출처만 보완했다. 버전 중복, 예상 기존 키/값/연령/기간, 이전 상태, 갱신275행·삽입92행 가드를 적용했다. 초기 INSERT SQL을 범용 갱신 도구로 재사용하지 않았다. 데이터 준비 후 Worker 버전 배포로 시각화 API를 활성화했다.

| 테이블 | 현재 행수 | 비고 |
|---|---:|---|
| jobs | 10,748 | 공개10,743·격리5 유지 |
| youth_employment_stats | 184 | 기존고용46 + 비공개실업46 + 수도권92 |
| district_youth_stats | 275 | 관측값 동일·검증 상태 보완 |
| occupation_market_stats | 92 | KECO/KSCO 구분 유지 |
| occupation_mappings | 323 | hierarchy만, 관련 관계0 |
| data_sources / data_imports | 각7 | 신규 통계 버전1개 추가 |

7개 테이블의 RLS와 공개 쓰기 차단은 유지했다. 경계 출처는 정적 자산의 별도 메타데이터이며 지도 API 응답에 추가한다. 따라서 DB 출처7개와 지도 응답 출처8개를 구분한다.

## 공식 지도 경계와 처리 한계

출처는 공공데이터포털15129688, ‘국가데이터처_SGIS 행정구역 통계 및 경계’의 **2025년2분기 시군구 경계**다. 공식 카탈로그의 이용허락범위는 제한 없음이다.

전체 ZIP은269,032,521바이트이며 전송 시간 초과로 일부만 수신됐다. 그러나 필요한 시군구 SHP/DBF/SHX/PRJ/CPG 다섯 파일은 모두 완전히 수신되어 끝까지 압축 해독하고 각 CRC32·파일 길이·SHA256을 확인했다. 불완전한 지오메트리는 사용하지 않았다. 전체 ZIP 무결성 검증 완료로 표현하지 않는다.

전국252개 경계 중 서울25개의 공식 코드·명칭을 KOSIS의25개와 대조했다. 원 투영좌표계(Korea2000 통합좌표계, 미터)에서 북쪽 위·동일 축척으로 SVG 배치했다. 51,748개 점을40m 기준으로1,894개에 단순화한 화면 표현이며 법적 경계 확인·통근거리·면적 계산용이 아니다. 경계 기준2025-Q2와 통계 기준2021-H1~2026-H1을 구분한다.

색 구간은30%미만,30~40%미만,40~50%미만,50~60%미만,60%이상이며 모든 반기에 고정한다. 미확인은 회색이다. 진한 색은 높은 관측값을 뜻하며 좋은 일자리·개인 취업 가능성·지역의 우열을 뜻하지 않는다.

## 현재 검증 결과

| 검사 | 결과 | 근거 |
|---|---|---|
| 타입 검사 | npm run check 통과 | tsc noEmit |
| 테스트 | 23그룹 통과 | 새 검증 게이트·해석·지도와 기존 추천 포함 |
| 빌드·Worker | build, types --check, dry-run 통과 | .tmp/visualization-final·실제 배포 |
| 로컬 기존 HTTP | 17통과 | visualization_local_http_20261031.json |
| 로컬 API→기존 React | 30통과 | visualization_local_pages_20261031.json |
| 로컬 새 데이터/렌더링 | 12검사·367개 값 대조 | visualization_local_data_20261031.json |
| 기존 추천 | 27통과 | visualization_local_recommendations_20261031.json |
| RLS | 7통과 | visualization_rls_20261031.json |
| 공개 기존 HTTP | 17통과 | visualization_public_http_20261031.json |
| 공개 새 데이터/렌더링 | 12검사·367개 값 대조 | visualization_public_data_20261031.json |
| 공개 전체 브라우저 | 69통과·실패0 | browser_visualization_public_20261031/results.json |
| 공개 지도 마우스/터치 | 25구×2환경=50회 통과 | map_targets_public_20261031/results.json |
| 원본5개 SHA256 | 최초 기준과 일치 | visualization_raw_integrity_20261031.json |
| 자체 API 증거 | 실제3요청·2개 산식 대조 | visualization_api_demo_20261031.json |

공개 브라우저는5개 크기(1280×900,768×1024,390×844,320×740,844×390)의40개 화면을 검사했다. 자동 접근성 검출0·문서 가로 넘침0·앱 오류0·실패 요청0이다. PC/모바일의 기간·지역·URL 유지·지도·확대·키보드·변화표·공고 이동과 기존 검색/추천을 검사했다. 개인 Chrome 프로필에 연결하지 않는 사용자 허용 임시 컨텍스트를 사용했다. 물리 기기·전체 WCAG·Safari/Firefox 인증은 아니다.

초기 지도 검사에서 일부 이름의 글자 중앙이 인접 구의 경계 위에 있어 클릭 대상과 맞지 않는 문제를 발견했다. 구 내부의 여유 공간으로 라벨을 옮기고 중앙 정렬·라벨 클릭·확대를 보완했다. 초기/중간 실패 기록은 보존했고 최종 로컬 이용흐름24개, 공개 전체69개와25구 마우스/터치50회가 통과했다. 추천 검사의 ‘출처6개’ 고정 가정도 필수 출처 보존·중복 없음·메타데이터 검사로 보완해 새 검증 출처 추가를 허용했다.

## 재현과 산출물

```text
npm.cmd run check
npm.cmd test
npm.cmd run build
npx.cmd wrangler types --check
npx.cmd wrangler deploy --dry-run --outdir .tmp/NEW
node scripts/smoke.mjs <URL> reports/NEW_http.json
node scripts/check_visualizations.mjs <URL> reports/NEW_visualizations.json
node scripts/check_pages.mjs <URL> reports/NEW_pages.json
node scripts/check_recommendations.mjs <URL> reports/NEW_recommendations.json
node scripts/check_rls.mjs reports/NEW_rls.json
node scripts/check_browser.mjs <URL> reports/NEW_browser
node scripts/check_map_targets.mjs <URL> reports/NEW_map_targets
node scripts/capture_visualization_demo.mjs <URL> reports/NEW_demo.json
```

공식 응답·선택 항목·원본 해시·경계 파일별 CRC/SHA·변환 근거는 `data/metadata/kosis_districts_20261031.json`, `kosis_districts_underlying_20261031.json`, `seoul_boundary_provenance.json`과 검증 보고서에 있다. 작업 폴더의 scripts/prepare_visual_data.py·extract_official_boundary.py·build_seoul_map.py는 준비·변환 과정을 기록한다. 기존 보고서를 덮어쓰지 않는 새 이름을 사용한다.

현재 코드·검증·시연 증거의 로컬 후보는 `seoul_job_compass_visualization_20261031.zip`, 별도 압축/파일별 무결성 기록은 `reports/candidate_manifest_visualization_20261031.json`을 따른다. 이전 후보본은 보존하며 외부 제출 완료를 뜻하지 않는다.

## 보류·다음 작업

- 실업률은 해당 원 파일의 선택 연령 증거 전 비공개다. 자치구의 고용률 원 표 보류만 이번 근거 범위에서 해제했다.
- 인코딩5행·미검증직종235쌍·관련직종0개·임금 지급 구성/환산·근무일수631행·원 공고 ID/직접URL/실시간 모집 상태의 기존 보류는 유지한다.
- 취업자 수·취업률은 정의·분모·연령·단위가 확인된 별도 자료로 검증한 뒤 추가한다. 수준/변화 산점도와 공고 조건 확인 비율은 후속 선택 기능이다.
- 탐색시간·이해도·취업 성과 효과는 실제 이용자 조사로 검증하지 않았다. 자동화 검사 결과를 사용자 효과로 확대하지 않는다.
- 실제 참가자 정보·공식 제출 포털/마감/규격·발표시간 확인, 발표 자료와 최종 제출은 남아 있다. 가산점은 심사자가 판정한다.
