> 후속 검증 안내: 이 문서는 해당 단계 당시의 결과입니다. 이후 사용자가 허용한 분리된 Playwright 브라우저에서 실제 PC/모바일 검증을 마쳤으며, 최신 결과는 [5단계 보고서](STAGE5_TEST_REPORT.md)를 따릅니다. 아래 과거 기록은 보존합니다.

# 3단계 자체 API·추천 검증 보고서

검증일: **2026-10-31, Asia/Seoul**. 과거 검사 기록과 이번 실행 결과를 구분한다.

**판정: 2단계 공개 배포 완료, 3단계 자체 API·추천 알고리즘 구현 및 실제 DB·공개 URL 검증 통과.**
추천 화면은 초기 연결본이다. 신규 화면의 실제 브라우저 클릭·모바일 시각 검사는 이번 세션에서 통과하지 못했으며,
4~5단계 전체 페이지·차트·반응형·접근성 완료로 표시하지 않는다. 6단계 최종 제출 검증도 미완료다.

## 이번 확정과 구현

원 확정 가중치 표는 프로젝트·원본·이전 검증 패키지에서 찾지 못했다.
사용자가 이번 세션에서 **새로 확정**: 직종35·지역25·임금20·근무일수10·고용형태10 = 100점.
검증된 관련 직종은 직종 가중치의 절반인 17.5점을 유지하되 실제 관계0개이므로 부여하지 않는다.

- `GET /api/recommendations`: 필수 사전검사, 충족/확인필요 분리, 명백 불일치 제외.
- 선호 미선택 제외 후 비례 환산, 선호0개 점수null, 미확인은 가능한 최대에만 반영.
- 확인 점수~가능 최대 표시, 반올림 전 확인점수 → 선호 미확인수 → 등록일 → 안정 ID 순.
- 전체 추천, 지역 대안(직종 유지), 직종 대안(지역 유지), 필수 지역·직종 유지.
- 직종 대안은 검증 관계0개로 빈 목록+명시적 사유. 계층323개를 관련성으로 사용하지 않는다.
- SQL의 4개 SECURITY INVOKER 함수에서 전체 후보 평가·정렬 후 최대50개 반환. Worker 전체 공고 스캔 없음.
- 기존 일반 검색·필터·상세 복귀는 유지. `/jobs?mode=recommend`에 조건·필수 체크·대안·확인필요·계산근거 연결.
- 기존7테이블·기존 데이터·RLS·공개 쓰기 차단 유지. 관리자 키·회원가입·검색이력 저장·방문자 추적 추가 없음.

## 현재 공개 배포

- https://seoul-youth-job-compass.ljg10250000.workers.dev
- 추천: https://seoul-youth-job-compass.ljg10250000.workers.dev/jobs?mode=recommend
- 최종 Worker version: `ffe1eb4a-5374-4593-8d25-b9d883f58ea6`.
- 초기 2단계 배포 version: `4fc9ce9b-8ff4-4ca1-93e1-fd8df20f351a`.
- Wrangler OAuth 로그인 및 Workers 쓰기 권한 확인 후 같은 계정·Worker로 배포했다.
- 유료 요금제 전환·추가 유료 제품/스토리지 생성·Supabase 프로젝트 생성·초기화·재적재는 수행하지 않았다.

## 이번 검증 결과

| 검사 | 결과·근거 |
|---|---|
| `npm run check` | 통과 |
| `npm test` | 12개 그룹 통과: 기존 API와 조건/임금 경계/필수/미확인/비례환산/관련성/대안/RPC 검증 |
| `npm run build` | 통과, Vite 변환17모듈 |
| `wrangler types --check` | 실제 바인딩 기반 생성 타입 일치 |
| `wrangler deploy --dry-run` | Worker13.55KiB + Static Assets, 통과 |
| 로컬 `node scripts/smoke.mjs` | 17항목, `stage3_local_http_20261031.json` |
| `node scripts/check_rls.mjs` | 6항목, `stage3_rls_20261031.json` |
| 로컬 추천 실DB 검사 | 27항목, `stage3_local_20261031.json` |
| 공개 `node scripts/smoke.mjs <URL>` | 17항목, `stage3_public_http_20261031.json` |
| 공개 추천 실DB 검사 | 27항목, `stage3_public_20261031.json` |
| 원격 DB 재점검 | 행수/RLS/쓰기 GRANT/함수 invoker, `stage3_database_verification.json` |
| 원본5파일 SHA256 | 최초 verified 보고서와 전부 일치, `resume_original_hashes.json` |
| 브라우저 번들 검사 | DB URL·publishable key·service_role·sb_secret·Cloudflare 토큰 식별자 없음 |
| `node scripts/check_ui_render.mjs` | React 서버 렌더링3상태 통과, `stage3_ui_render_20261031.json` |

추천27항목은 실제 공개 공고10,743행을 독립 TypeScript 평가기로 계산해 전체 총건수·충족/미확인수와
요청한 페이지의 ID·원점수·최대점수·이유·정렬을 DB 결과와 대조했다. 모든 공고를 HTTP로 내려받는 검사가 아니다.
조건 없는 경우·5선호·필수 조합·임금 범위·다른 단위·근무일수 미확인·지역 대안·필수 유지·관련0개·선호 누락·
2페이지·마지막 초과를 검사했다. 별도6개 synthetic 계산 fixture와6개 직접 RPC 입력거부도 포함한다.
fixture는 DB행을 만들거나 관련 직종 관계를 등록하지 않는다.

실DB 첫 실행에서 정렬 별칭에 COLLATE를 적용한 PostgreSQL 오류를 발견해 추가 마이그레이션으로 수정했고,
수정 후 로컬·공개 전체 검사를 통과했다. 예외 시 내부 DB 오류는 API에서503으로 숨긴다.
추천 응답의 출처6건에서 source/source_url/table_id/period/frequency/age_scope/unit/geography_basis/retrieved_at/verification_status의 존재를 검증했다.

Security Advisor: ERROR/WARN0. INFO1은 읽기 권한이 없는 data_imports의 RLS정책 부재로 기존 의도된 기본거부 상태다.
이 INFO는 새 오류로 숨기거나 권한을 확대해 해소하지 않았다. 실제 공개 읽기·쓰기 거부도 재검사했다.

## 검증 한계와 보류

- 브라우저 자동화 host unavailable. native Chrome도 minimized 상태로 캡처 실패, 앱 실행으로 복원을 시도했으나 같은 오류다.
  따라서 이번 새 추천 UI의 클릭·상세복귀·모바일 화면 검증은 **미확인**. HTTP HTML 셸·React빌드·서버 렌더링3상태는 통과했다.
- API 결과 정확성 검사이며 동시부하·전체 기기·접근성 인증이나 운영 성능 벤치마크는 아니다.
- 인코딩5행 원문, 직종235쌍 공식대응, 관련직종 근거, 실업률 원표·연령선택, 고용률 전국해석·메타데이터,
  연봉/월급 지급구성, 근무일수631행, 공식 공고ID/직접URL/실시간모집상태 보류를 유지한다.
- 보류 해제는 오류 없는 원문·공식 코드/관련성 증거·원표 선택코드·지급구성·검증된 신규 스냅샷 확보 후 별도 검증·반영이 필요하다.

## 재현과 다음 단계

```text
npm run check
npm test
npm run build
node node_modules/wrangler/bin/wrangler.js types --check
node node_modules/wrangler/bin/wrangler.js deploy --dry-run
npm run dev
node scripts/smoke.mjs http://127.0.0.1:8787 <새파일>
node scripts/check_rls.mjs <새파일>
node scripts/check_ui_render.mjs <새파일>
node scripts/check_recommendations.mjs http://127.0.0.1:8787 <새파일>
node scripts/smoke.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev <새파일>
node scripts/check_recommendations.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev <새파일>
```

원격 마이그레이션 버전을 조회해 로컬 파일명과 맞췄다. stage2 baseline도 기존 schema.sql과 SQL 내용 일치를 확인해 이력 파일로 보존했다.
원본 schema.sql과 초기 적재 SQL은 운영 DB에 재실행하지 않았다.
기존 파일 수정 전 내용을 `.tmp/resume-backups/`에 보존했다. 데이터 준비 스크립트는 실행하지 않았다.
다음은4단계 네 페이지의 차트·탐색 흐름 완성과 실제 브라우저 검사, 이후5단계 반응형·접근성 검증,
6단계 자체API 시연 요청/응답·계산근거·실행로그와 제출자료를 완성한다. 미확인 원자료는 계속 분리한다.

현재 공식 문서 확인: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/),
[Supabase Data API 권한과 RLS](https://supabase.com/docs/guides/api/securing-your-api),
[Database functions](https://supabase.com/docs/guides/database/functions).
