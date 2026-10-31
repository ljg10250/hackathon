# 잡을 잡다

**자체 API 배포 주소 · 인증 없이 GET 호출 · JSON 응답**

https://seoul-youth-job-compass.ljg10250000.workers.dev/api/indicators?metric=employment_rate

[API 주소 파일](API_URL.txt) · [API 서버와 호출 안내](API_SERVER.md) · [자체 API 소스 코드](worker/index.ts)

React + Cloudflare Workers Static Assets / 자체 API + Supabase PostgreSQL.
2026-10-31 기준 **공개 배포 · 추천 API · 실제 Chromium PC/모바일 검증을 통과한 제출 후보본**입니다. 공식 제출 형식 대조·팀 정보·최종 제출은 남아 있습니다.

공개 주소: https://seoul-youth-job-compass.ljg10250000.workers.dev
조건 추천: https://seoul-youth-job-compass.ljg10250000.workers.dev/jobs?mode=recommend
한눈에 보기: https://seoul-youth-job-compass.ljg10250000.workers.dev/visualizations

- [1단계 후속 검증](reports/STAGE1_TEST_REPORT.md)
- [2단계 테스트·배포 상태](reports/STAGE2_TEST_REPORT.md)
- [3단계 추천 검증](reports/STAGE3_TEST_REPORT.md)
- [4단계 화면·API 검증](reports/STAGE4_TEST_REPORT.md)
- [5단계 실제 브라우저·접근성 검증](reports/STAGE5_TEST_REPORT.md)
- [6단계 제출 준비 상태](reports/STAGE6_PREPARATION_REPORT.md)
- [시연 안내](docs/DEMO_GUIDE.md)
- [확정 명세와 6단계 진행 상태](docs/PROJECT_SPEC.md)
- [DB와 API 설계](docs/ARCHITECTURE.md)
- [출처 등록부](data/metadata/sources.json)

## 자체 API 배포 서버 및 호출 방법

- **배포 서버 주소:** https://seoul-youth-job-compass.ljg10250000.workers.dev
- **API 기본 주소:** https://seoul-youth-job-compass.ljg10250000.workers.dev/api
- **서버 코드:** [worker/index.ts](worker/index.ts)
- Cloudflare Workers에서 웹사이트와 자체 REST API를 함께 제공하며, 공개 조회 API는 별도의 인증키 없이 GET 요청으로 호출합니다. 응답 형식은 JSON입니다. `/api`는 경로 접두어이므로 아래의 실제 엔드포인트로 호출하세요.

| API | 실제 호출 주소 | 반환 내용 |
| --- | --- | --- |
| 서버·DB 연결 상태 | [GET /api/health](https://seoul-youth-job-compass.ljg10250000.workers.dev/api/health) | 서버 상태와 DB 연결 상태 |
| 서울·전국 고용률 비교 | [GET /api/indicators?metric=employment_rate](https://seoul-youth-job-compass.ljg10250000.workers.dev/api/indicators?metric=employment_rate) | 고용률, 서울−전국 격차(%p), 전년 동기 변화와 출처 |
| 직종별 구인·구직 비교 | [GET /api/occupations?period=2026-09&classification=KECO2025](https://seoul-youth-job-compass.ljg10250000.workers.dev/api/occupations?period=2026-09&classification=KECO2025) | 신규구인인원(명), 신규구직건수(건), 비율 |
| 공고 검색·페이지 처리 | [GET /api/jobs?page=1&page_size=5](https://seoul-youth-job-compass.ljg10250000.workers.dev/api/jobs?page=1&page_size=5) | 공고5건, 전체 검색 건수와 페이지 정보 |

```sh
curl "https://seoul-youth-job-compass.ljg10250000.workers.dev/api/indicators?metric=employment_rate"
```

시연: ‘고용 현황’에서 개발자 도구의 Network → Fetch/XHR를 선택하고 새로고침한 뒤, `/api/indicators`의 Response를 보여줍니다. 화면의 그래프와 같은 API 응답임을 확인할 수 있습니다.

자체 API는 검증 후 Supabase에 저장한 공공데이터를 조회·가공합니다. KOSIS를 실시간 호출하는 MCP 서버가 아닙니다. 위4개 호출 주소는 2026-10-31 공개 서버에서 HTTP200 응답을 확인했습니다.

## 실행

Node.js 24 LTS, Python 3.14로 확인했습니다. `npm ci` 후 `npm run build`,
`npm run dev`를 실행합니다. 기본 주소는 http://localhost:8787 입니다.
실제 데이터는 Supabase의 전용 프로젝트에서 조회합니다.
`.dev.vars`는 `.env.example`의 항목을 사용하며 관리자 키를 넣지 않습니다.
이번 작업 폴더에는 공개 읽기용 설정이 준비되어 있습니다.

`npm run check`, `npm test`, `node scripts/smoke.mjs`, `node scripts/check_rls.mjs`로 검증합니다.
데이터 준비는 `python scripts/prepare_data.py --raw-dir <원본폴더>`입니다.
직종 매핑 검사는 공식 PDF와 pypdf가 있는 경우 `python scripts/verify_occupation_mapping.py`입니다.
준비 스크립트는 로컬 산출물만 생성하며 원격 DB를 자동 변경하지 않습니다.
매핑 검사는 `prepare_data.py` 다음에 실행합니다.

## 배포

Wrangler OAuth 인증을 복구해 기존 계정·프로젝트로 공개 배포했습니다. 후속 변경은
`npm run deploy`를 실행하고 출력된 **실제 URL**을 `node scripts/smoke.mjs <URL>`로 검사합니다.
기본 배포 설정은 자체 계정 Cloudflare Workers이며 Sites 호스팅으로 대체하지 않았습니다.
Supabase는 사용자 승인 조직의 서울 리전 무료 프로젝트입니다.
수집·추천 기록을 저장하는 테이블, 로그인, 분석 쿠키, 방문자 추적 코드는 없습니다.

## 갱신 제한

현재 데이터는 단일 수동 스냅샷입니다. 검증 실패 시 DB 적재를 실행하지 않습니다.
최초 적재 SQL은 INSERT와 충돌 건너뛰기만 사용하여 기존 값을 덮어쓰지 않습니다.
이는 범용 갱신 도구가 아닙니다. 새 스냅샷의 버전별 격리·검증 후 원자적 전환은 후속 구현이 필요합니다.
후보 중복 공고를 자동 병합하지 않았습니다. ID는 공식 공고 ID가 아닌 파일 해시+원본 행번호입니다.

원본의 연락처·지원자 정보·직무설명 내 연락처는 DB/API로 복사하지 않았습니다.
원본 및 기존 검증 패키지는 변경하지 않았으며 해시를 보고서에 보존했습니다.

## 추천 API

`GET /api/recommendations`에 `required`, `preferred` JSON 조건과 `view=all|region|occupation`,
`group=eligible|needs_review`, `page`, `page_size`(1~50)를 전달한다. 입력·응답 예시는 [설계](docs/ARCHITECTURE.md).
조건 미선택 시 점수 없음. 확인 점수~가능 최대는 선호 일치도이며 취업 확률이 아니다.
직종 대안은 검증된 관련 직종이 없으므로 빈 결과와 이유를 표시한다.

`node scripts/check_recommendations.mjs <URL> <새 보고서 경로>`로 실제 DB 결과와
로컬 공개 공고 10,743행의 독립 계산을 대조한다. HTTP·RLS 스크립트도 기본적으로
시간이 붙은 새 보고서에 기록하며, 기존 보고서 경로를 명시하면 해당 파일을 갱신한다.

원격 DB의 기존 데이터는 초기화·재적재하지 않았다. 추가 읽기 전용 함수는
`supabase/migrations/*stage3*.sql`에 있다. 모두 SECURITY INVOKER이며 기존 RLS를 따른다.
기존 `supabase/schema.sql`은 2단계 최초 기준으로 보존한다. 현재 복제에는 추가 마이그레이션도 적용해야 한다.

## 화면·데이터 연결 검사

`node scripts/check_pages.mjs <URL> <새 보고서>`는 실제 API 응답을 React에 넣어
차트 수치·원 주기·단위·출처·결측·페이지 링크·상세 복귀 링크를 검사한다.
이 검사는 브라우저에서 입력·클릭·초점 이동하거나 모바일 레이아웃을 확인한 결과가 아니다.

직종 선택 목록은 `python scripts/build_job_options.py`로 기존 공개 공고 스냅샷에서 생성한다.
입력 행수·고유 코드/명칭 쌍·해시를 검사하며 DB를 변경하지 않는다. 새 스냅샷의 보편적 갱신 도구가 아니다.
원본 명칭·코드의 부분 공식 검증과 관련성0개 보류는 계속 유지한다.
기존 `seoul_job_compass_stage2_bundle.zip`과 그 release_manifest는 과거 산출물이며 현재 코드는 작업 폴더의 소스를 기준으로 한다.

## 실제 브라우저 검사와 제출 후보

사용자가 허용한 별도 임시 Chrome 컨텍스트로 검사한다. 앱 운영 의존성·개인 Chrome 프로필에는 연결하지 않는다.

```text
npm install --prefix .tools/browserqa --save-exact --no-audit --no-fund playwright@1.64.1 @axe-core/playwright@4.14.0
node scripts/check_browser.mjs http://127.0.0.1:8787 reports/browser_NEW
node scripts/check_browser.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev reports/browser_PUBLIC_NEW
```

설치된 Chrome을 headless로 사용한다. 브라우저가 없는 환경은 설치/실행 조건을 별도로 확인해야 한다.
`--audit-only`는 크기·접근성·키보드, `--flows-only`는 실제 탐색 흐름만 실행한다. 전체 검사는 두 플래그 없이 실행한다.
스크린샷·도구 버전·실패/검출 상세는 지정 폴더에 남긴다. 고용률은 원 표·전국범위 대조를 통과했다. 실업률·자치구 원 표·관련직종 등의 별도 보류는 유지된다.

`node scripts/capture_api_demo.mjs <URL> <새 JSON>`은 실제 자체API 요청·응답·계산근거6건을 기록한다.
`python scripts/package_candidate.py --output <새이름.zip> --manifest <새이름.json>`은 기존 파일을 덮어쓰지 않는 로컬 후보를 만든다.
현재 후보: `seoul_job_compass_candidate_20261031.zip`, 무결성 기록: `reports/candidate_manifest_20261031.json`.
공식 제출 양식 대조와 실제 외부 제출 완료본으로 표시하지 않는다.

## 심사 기준 보완

고용률의 동일 기준 서울–전국 비교·%p 격차·전년 동기 변화와 직종분석→검증된분류 공고탐색을 추가했다. 최신 검증·배포 결과는 [후속 보고서](reports/COMPARISON_IMPLEMENTATION_REPORT.md), [문제 근거](docs/PROBLEM_AND_EVIDENCE.md), [AI 검증 사례](docs/AI_USAGE_REVIEW.md)를 참고한다. 이전 후보 ZIP과 보고서는 보완 이전 버전으로 보존한다.

후속 후보: `seoul_job_compass_comparison_20261031.zip` / `reports/candidate_manifest_comparison_20261031.json`. 기존 후보는 과거 보완 이전 버전으로 보존한다.

## 한눈에 보기 · 수치 해석 보완

서울·경기·인천·전국 분기 비교와 서울25구 지도/반기 변화표를 추가했다. 지표를 선택하면 수치에 근거한 짧은 설명이 바뀐다. 지도는 공식2025년2분기 경계의 검증된25구를40m 단순화한 것으로 키보드·선택상자·확대·터치를 지원한다. 색 범례는 모든 반기에 동일하며 원인·개인 취업확률을 표시하지 않는다.

최신 판정: [시각화 검증 보고서](reports/VISUALIZATION_IMPLEMENTATION_REPORT.md). 기존 comparison 후보와 보고서는 이전 버전이다. 현재 후보는 `seoul_job_compass_visualization_20261031.zip`, 무결성 기록은 `reports/candidate_manifest_visualization_20261031.json`을 따른다.

한눈에 보기의 기본 화면은 서울 지도·변화표다. 기본 표시 변경 후속 기록은 [MAP_DEFAULT_CHANGE_20261031.md](reports/MAP_DEFAULT_CHANGE_20261031.md)를 따른다. 이전 후보 ZIP은 기본 표시 변경 전 버전으로 보존했다.
