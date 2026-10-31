> 후속 검증 안내: 이 문서는 해당 단계 당시의 결과입니다. 이후 사용자가 허용한 분리된 Playwright 브라우저에서 실제 PC/모바일 검증을 마쳤으며, 최신 결과는 [5단계 보고서](STAGE5_TEST_REPORT.md)를 따릅니다. 아래 과거 기록은 보존합니다.

# 4단계 페이지·차트·탐색 구현 및 검증

검증일: **2026-10-31, Asia/Seoul**.

**판정: 네 주 페이지·공고 상세의 기능 개선 구현, 실DB/API·React 렌더링 검증 및 공개 배포 통과.**
실제 브라우저 클릭·초점 이동·모바일 레이아웃 검증은 도구 차단으로 미확인이다.
따라서 4단계 전체 UI 검증 완료·5단계 디자인/반응형 완료·6단계 최종 제출 완료로 판정하지 않는다.
이전 1~3단계 보고서와 검사 파일은 보존했으며 아래는 이번 실행 결과다.

## 실제 변경

- 고용 현황: 서울15~29세 분기 선그래프, 시작 연도 선택, 데이터표. 원본 ‘계’는 전국 해석 보류를 표시하고 별도 참고 그래프로 분리. 실업률 공개·확정 격차 계산은 보류 유지.
- 자치구: 25개 구 막대그래프·반기 선택·표시 순서·구별11개 반기 추이·원본표·선택 구 근무지 공고 탐색 링크. 구 평균으로 서울 수치를 만들지 않음.
- 직종: KECO2025 35개 중분류의 구인인원(명)·구직건수(건) 그래프. 각 단위별 독립 가로축을 명시. 직종명 찾기·표시 개수·정렬·직종별 산식·원본값 표 제공. 전체 연령·등록 관서 기준 유지.
- 공고: 원본 직종명 찾기·선택, 필터 초기화, 페이지당10/20/50건과 올바른 다음 페이지 링크, 검색 조건을 넘기는 추천 링크. 상세의 기재조건·날짜·마감 조건·직종명/코드·공식포털 검색 방법과 전체 검색/추천 URL 복귀 제공.
- 추천: 기존 가중치·필수/선호·미확인·점수범위·대안 규칙을 유지하고 직종명 선택기를 연결. 필수 체크의 접근성 이름·출처 컴포넌트 보강.
- 공통: 컴포넌트 분리, 그래프 텍스트 설명·데이터표·표 caption/헤더 범위, 본문 건너뛰기, 초점 표시, 최소 터치 높이, 반응형 CSS와 안전영역 메뉴 보강. 실제 접근성·기기 인증으로 해석하지 않음.
- 원본5파일·DB 스키마·기존 데이터·RLS·추천산식·공식 매핑 상태는 변경하지 않음. 로그인·개인정보·검색 기록 영속 저장·방문자 추적·유료 서비스 추가 없음.

## API와 생성 자료

`GET /api/districts?district=강남구`는 원문 region=`서울 강남구`의11개 반기를 반환한다.
district와 period를 함께 주면 교집합, 구가 없으면 기존2026-H1 기본값을 유지한다.
검증된 서울25구만 허용하며 최대50행이다. 실제 첫 검사에서 원문 지역명의 서울 접두어를 확인했고,
필터를 정확하게 연결하도록 수정했다. 원본 region값은 변경하지 않았다.

`GET /api/job-occupations?q=사무&limit=50`은 고정된 공개 공고 스냅샷의 원본코드·명칭 선택 목록이다.
입력 최대80자·limit1~50·허용 파라미터·중복을 검사하고 빈 검색은 빈 결과로 반환한다.
공개공고10,743행→고유558쌍·코드별 명칭1개·손상문자 부재·입력SHA256을 검증했다.
`data/metadata/job_occupation_options.json`, `worker/jobOccupationOptions.ts`, `scripts/build_job_options.py`에 출처·생성 규칙을 남겼다.
목록은 **실시간 DB 직종 집계·공식 매핑 완료·관련직종 관계가 아니다**. 323개 공식 계층 연결과 관련직종0개 보류는 그대로다.

## 공개 배포

- URL: https://seoul-youth-job-compass.ljg10250000.workers.dev
- 추천: https://seoul-youth-job-compass.ljg10250000.workers.dev/jobs?mode=recommend
- Worker version: `b24bb341-2ab3-46fb-b590-c521833126c5`.
- 같은 Worker·Supabase 프로젝트를 사용했다. 유료 전환·리소스 추가·DB 초기화/재적재는 하지 않았다.
- Worker72.18KiB (gzip15.66KiB), 배포 출력의 startup2ms. 이는 부하/운영 성능 벤치마크가 아니다.

## 이번 검증

| 검사 | 결과·파일 |
|---|---|
| `npm run check` | 통과 |
| `npm test` | 15개 그룹 통과: 기존12개 + 이력필터·직종목록 제한·생성자료 전수검증3개 |
| `npm run build` | 통과, Vite22모듈 |
| `wrangler types --check` | 생성 타입 일치 |
| Workers `deploy --dry-run` | 통과 |
| 로컬 HTTP | 17항목, `stage4_local_http_20261031.json` |
| 공개 HTTP | 17항목, `stage4_public_http_20261031.json` |
| 로컬 실제 API + React 렌더링 | 29항목, `stage4_local_pages_20261031.json` |
| 공개 실제 API + React 렌더링 | 29항목, `stage4_public_pages_20261031.json` |
| 로컬/공개 추천 회귀 | 각각27항목, `stage4_local_recommendations_20261031.json`, `stage4_public_recommendations_20261031.json` |
| 공개 키 RLS | 6항목, `stage4_rls_20261031.json` |
| 기존 추천 React 렌더링 | 3상태, `stage4_recommendation_render_20261031.json` |
| 원본5파일 SHA256 | 최초 verified 보고서와 일치, `stage4_original_hashes.json` |
| 브라우저 JS/CSS 번들 | DB URL·publishable key·service_role·sb_secret·Cloudflare 토큰 식별자 없음 |

29항목 검사는 실제 API 고용률46건·실업률 보류·25구·강남구11반기(로컬 원본 파생값과 전부 동일)·교집합·빈 결과·잘못된 입력,
직종35개와18,299명/59,668건 합계, 10건2페이지와상세, 원본직종558쌍과선택코드 실제공고명을 대조했다.
그 응답을 React의 View 컴포넌트에 넣어 그래프 주기·단위·출처, 차트와표, 다음페이지/상세복귀링크, 외부return거부,
결측으로 인한선분분리·실제0 보존,5경로의 메뉴·본문,추천 직종선택·필수체크 이름을 확인했다.
추가 라이브러리 설치 없이 기존 Vite·React 서버 렌더링을 사용했다.

27항목 추천 검사는 공개공고10,743행의 독립 기준 계산과 실제DB 결과를 대조한 회귀 검사다.
관련직종 synthetic 계산 fixture는 운영DB에 관계나공고를 추가하지 않는다.
RLS 검사에서 격리공고·실업률·내부import 숨김과 공개쓰기거부가 유지됐다.

## 검증 한계·데이터 보류

컴퓨터 사용 도구가 Windows의 현재 브라우저URL을 충분히 확인하지 못해 UI제어를 중단했다.
중단 후 이 턴에서 다른 UI제어 방법으로 우회하거나 재시도하지 않았다.
**React 서버 렌더링은 실제 브라우저 입력·선택·클릭·초점 이동·화면 크기별 렌더링 검사를 대체하지 않는다.**
따라서 PC/모바일 스크린샷·키보드 전체흐름·폼 실제선택·그래프 스크롤·상세복귀 클릭은 미확인이다.

인코딩5행, 공식직종235쌍, 관련직종0개, 실업률원표·연령선택, 고용률 ‘계’범위/메타데이터,
임금지급구성·환산, 근무일수631행, 공식공고ID·직접URL·실시간모집상태의 보류를 유지한다.
해제에는 오류 없는 원문·공식 분류/관련성 증거·통계표 선택코드·지급구성·검증된 신규 스냅샷이 필요하다.

## 재현·다음 작업

```text
npm run check
npm test
npm run build
node node_modules/wrangler/bin/wrangler.js types --check
node node_modules/wrangler/bin/wrangler.js deploy --dry-run
npm run dev
node scripts/check_pages.mjs http://127.0.0.1:8787 <새 보고서>
node scripts/smoke.mjs http://127.0.0.1:8787 <새 보고서>
node scripts/check_rls.mjs <새 보고서>
node scripts/check_ui_render.mjs <새 보고서>
node scripts/check_recommendations.mjs http://127.0.0.1:8787 <새 보고서>
node scripts/check_pages.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev <새 보고서>
node scripts/smoke.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev <새 보고서>
node scripts/check_recommendations.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev <새 보고서>
```

기존 변경 전 파일은 `.tmp/stage4-backups/`에 보존했다. 과거 보고서·원본·최초 적재SQL은 덮어쓰거나 재실행하지 않았다.
다음은 도구가 지원되는 브라우저 환경에서4단계 실제탐색 검증을 마치고5단계 반응형/접근성 개선을 검증하는 것이다.
그 후6단계 최종 API시연·제출자료·배포검증을 진행한다.

설계 확인 근거: [W3C 그래프 설명·데이터 대안](https://www.w3.org/WAI/tutorials/images/complex/),
[React useId](https://react.dev/reference/react/useId),
[Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
