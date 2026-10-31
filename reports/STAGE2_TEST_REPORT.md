# 2단계 재검증·공개 배포 완료 · 2026-10-31

이번 재개 세션에서 Wrangler OAuth 만료를 재확인한 뒤 사용자가 `wrangler login`을 완료했다.
Workers 쓰기 권한 확인 → 타입/기존 API 테스트/빌드 → deploy dry-run → 실제 배포 → 공개 HTTP 검사를 수행했다.

- 공개 URL: https://seoul-youth-job-compass.ljg10250000.workers.dev
- 초기 실제 배포 버전: `4fc9ce9b-8ff4-4ca1-93e1-fd8df20f351a`.
- 공개 URL에서 DB 연결·공개공고 10,743행·검색/상세/통계/HTML 경로 **17항목 통과**.
- 공개 키 RLS 재검사 **6항목 통과**. 기존 Supabase 7테이블 행수 일치, 전부 RLS 활성화·공개 쓰기 GRANT 0개.
- 근거: `stage2_public_20261031.json`, `resume_rls_20261031.json`.
- 기존 Supabase 프로젝트를 재사용했으며 초기화·재적재·추가 프로젝트 생성·유료 전환은 하지 않았다.

판정: **2단계 완료**. 아래는 같은 날짜의 이전 세션에서 남긴 과거 검사·인증 차단 기록이며,
이번 재검증 결과와 구분해 보존한다. 후속 추천 버전은 `STAGE3_TEST_REPORT.md`를 따른다.

---

# 2단계 구축·적재·초기 배포 테스트 보고서

검증일: **2026-10-31, Asia/Seoul**.

**판정: 프로젝트·DB·실데이터·로컬 Workers 연결 검증 통과. 공개 배포는 인증 차단으로 미완료.**
확정된 2단계 완료 기준인 ‘공개 주소에서 실제 DB 조회’를 아직 충족하지 못했다.
3~6단계 또는 추천 완성형 MVP가 완료됐다고 표시하지 않는다.

## 실제 구축

- React 19.3.1 / Vite 8.3.5 / TypeScript 7.0.2 / Wrangler 4.156.0. 정확한 버전과 lockfile 보존.
- 사용자가 승인한 `LeeJeongGi` 조직에 전용 Supabase 프로젝트 `seoul-youth-job-compass` 생성.
- project ref `jlnebtxrncfqzyjgasuw`, 서울 `ap-northeast-2`. 생성 전 견적 **$0/month** 확인. 기존 다른 프로젝트는 변경하지 않음.
- PostgreSQL 기본 7테이블, PK·FK·범위 제약·필터 인덱스·RLS 구성. `supabase/schema.sql` 및 원격 migration `stage2_baseline`.
- Cloudflare Workers Static Assets와 자체 API를 단일 프로젝트로 준비. `/api/*` Worker 우선, SPA 깊은 경로 새로고침 지원.
- Supabase REST를 읽기 전용 publishable key로 조회. 관리자/서비스 키는 프런트엔드·코드·환경설정에 사용하지 않음.
- 네 메뉴와 상세페이지의 초기 화면을 실제 API에 연결. 일반 검색만 제공하고 추천 점수는 null.

## 실제 DB 적재 결과

| 테이블 | 저장 행수 | 공개 범위 |
|---|---:|---|
| jobs | 10,748 | 문자 오류 5건 제외한 10,743건 |
| youth_employment_stats | 92 | 고용률 46건 참고값, 실업률 46건 비공개 |
| district_youth_stats | 275 | 25개 구 × 11개 반기, 원 표 대조 전 참고값 |
| occupation_market_stats | 92 | KECO2025 35개 + KSCO8 57개, 별도 분류 |
| occupation_mappings | 323 | 공식 코드·명칭 일치의 KECO 계층 연결만 |
| data_sources | 6 | 채용·고용률·실업률·자치구·직종통계·공식분류 출처 |
| data_imports | 6 | 운영자 전용, 공개 권한 없음 |

전수 확인: 서울 25개 구, 인코딩 격리 5행, 근무일수 미확인 631행, 임금 환산 적용 0행,
관련 직종 추천 관계 0개. KECO·KSCO 각각 합계 구인 18,299명 / 구직 59,668건 재현.
근거: `stage2_database_verification.json`.

기존 데이터가 있는 프로젝트를 덮어쓰지 않고 새 프로젝트에 최초 적재했다.
이번 SQL은 원본 필드 수정·누락값 임의 보완·유사 공고 자동 병합을 수행하지 않는다.
일반 갱신 도구·활성 버전 전환은 아직 구현하지 않았으며 새 파일을 재적재하기 전에 추가 설계가 필요하다.

## 자동·연결 테스트

| 검사 | 결과 |
|---|---|
| TypeScript 타입 검사 `npm run check` | 통과 |
| API 테스트 `npm test` | 3개 그룹 통과: 페이지/입력/오류/보류/빈 결과/정적 자산 |
| React 프로덕션 빌드 | 통과 |
| Wrangler types 생성 | 통과, 실제 바인딩 기반 타입 생성 |
| Workers 배포 파일 검사 `deploy --dry-run` | 통과: Worker + Static Assets + DB 환경설정 |
| 원격 DB 행수·범위·집계·RLS 7테이블 검사 | 통과 |
| 로컬 Workers → 실제 Supabase HTTP 검사 | 17항목 통과 |
| 실제 publishable key로 RLS 검사 | 6항목 통과 |
| 원본 파일 SHA256 실행 전후 대조 | 5개 동일 |

HTTP 17항목에는 실제 DB health(공개공고 10,743행), 자치구 검색, 상세,
고용률 46행, 실업률 보류, 최신 자치구 25행, KECO35개·총계,
잘못된 입력 400, 없는 API404, 빈 검색, 마지막 페이지 초과, 5개 HTML 경로 직접접속이 포함된다.

실제 연결 검사에서 마지막 행을 넘는 offset이 PostgREST416으로 반환되는 것을 발견했다.
자체 API는 총 건수를 유지한 200+빈목록으로 정규화하도록 수정했고, 회귀 사례와 실제 HTTP 재검사를 통과했다.
DB 오류가 발생하면 예시 수치로 바꾸지 않고 503을 반환한다.

RLS 6항목: 원본행596 숨김, 모든 quarantined 숨김, 실업률 숨김, 고용률46행 읽기,
내부 import 이력 읽기 거부, 공개 키 INSERT 거부. 모두 실제 원격 DB에서 확인.
근거: `stage2_http_checks.json`, `stage2_rls_checks.json`.

Supabase Security Advisor: ERROR/WARN 없음. INFO 1개는 비공개 `data_imports`에 RLS 정책이 없는 상태다.
GRANT도 주지 않아 의도된 기본 거부이며 실제 읽기·쓰기 차단을 검사했다.
[관련 공식 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
Performance Advisor의 초기 미사용 인덱스 INFO는 신규 프로젝트의 관측 결과로 기록한다.
이를 성능 벤치마크 통과로 해석하지 않는다.

## 브라우저 검증 범위

인앱 브라우저에서 실제 API 결과·출처·보류 안내와 메뉴를 확인했다.
1280×900 PC / 390×844 모바일 홈 레이아웃 캡처를 보존했다.
PC 상단 메뉴와 모바일 하단 고정 메뉴, 카드 줄바꿈을 확인했다.
강남구 선택 → 860건 결과 → 실제 공고 상세 → ‘검색 결과로 돌아가기’의 URL·강남구 선택값 유지도 확인했다.
브라우저 테마가 적용된 이미지다. 현재 초기 UI 검사이며 4~5단계 전체 접근성·차트·기기별 완성 검증은 남아 있다.
`preview-desktop.png`, `preview-mobile.png` 참조.

## 공개 배포 차단 사항

1. Cloudflare 계정 식별과 계정 목록은 조회됐다.
2. Workers 목록/하위도메인 조회는 연결 도구에서 ‘인증 요청 수락, 재시도’ 응답이 반복되어 완료되지 않았다.
3. 로컬 Wrangler `whoami`는 **토큰 만료 및 갱신 실패**를 보고했다.
4. 실제 `wrangler deploy --keep-vars` 시도는 **비대화 환경의 CLOUDFLARE_API_TOKEN 필요** 오류로 실패했다.
5. 따라서 Worker의 생성·공개 주소·외부 접근 테스트는 미확인이다. 임시 계정이나 다른 호스팅으로 임의 전환하지 않았다.

해제 조건: 연결된 Cloudflare 앱의 Workers 읽기/쓰기 인증을 복구하거나,
사용자가 로컬에서 `wrangler login`을 완료한 뒤 동일 계정 배포를 다시 실행한다.
토큰을 채팅에 붙여 넣을 필요는 없다. 실제 URL이 나온 후 `node scripts/smoke.mjs <URL>`을 통과해야 2단계를 완료로 판정한다.

임시 로컬 검증 서버는 작업 종료 시 종료한다. 다시 보려면 README의 실행 절차를 따른다.

KOSIS_API_KEY 부재는 별도 데이터 검증 차단이다. Workers 인증을 복구해도 실업률 연령 검증이 저절로 완료되지는 않는다.

## 남은 작업

- 1단계 보류 자료 확보: 인코딩5행 원문, 공식 매핑235쌍, 원 통계표/연령, 임금 지급 기준.
- 2단계: Cloudflare 인증 복구 → 실제 배포 → 공개 URL에서 HTTP 검사.
- 3단계: 추천 가중치 원 결정표 복구 및 전체 추천/대안/확인필요·점수범위·정렬 구현과 검증.
- 4~6단계: 페이지·차트 완성, 반응형/접근성 검증, 최종 시연·제출.
