# 검증 기준과 마지막 결과

현재 안내 기준일:2026-11-01. 아래는 문서 정리 직전 실행한 검사 기록이며, 문서 정리 자체는 링크·근거파일·스크립트 필수문서·원본/코드 해시를 별도로 검사합니다.

| 검사 | 마지막 확인 결과 | 근거 |
| --- | --- | --- |
| npm run check/test/build | 미사용 코드 검사·38개 테스트·빌드 통과 | 2026-11-01 파일정리 후 실행 |
| 실제API→React | 30항목 | [페이지검사](cleanup_pages_20261101.json) |
| 공개HTTP | 17항목·DB연결·공개공고10,743행 | [HTTP검사](resume_http_2026-11-01T06-39-06-725Z.json) |
| RLS | 7항목 | [RLS검사](resume_rls_2026-11-01T06-37-24-884Z.json) |
| PC/모바일 차트·메뉴·필터 | 로컬/공개 각각390·1280px×5화면 | [로컬](cleanup_local_20261101/local-qa.json), [공개](cleanup_public_20261101/public-qa.json) |

현재 운영 Worker는kongju-hackathon-jabjapda이며 마지막 공개 배포는170663b5-a33d-4a65-a73b-403fe4159daa입니다. 주소 전환 후 HTTP17·추천27·시각화12검사(367개 값)·PC/모바일10화면을 재검증했습니다. [전환 기록](DOMAIN_SWITCH_20261101.md)을 따르며 아래 정리 직전 기록과 구분합니다. 물리 기기·Safari/Firefox·전체WCAG 인증·사용자 취업 효과 검증은 포함하지 않습니다.

## 재현

로컬 서버는 npm run build 후 npm run dev로 실행합니다. 실제 API 검사는 새 보고서 경로를 사용합니다.

```sh
npm run check
npm test
npm run build
node scripts/smoke.mjs http://localhost:8787
node scripts/check_pages.mjs http://localhost:8787 reports/NEW_pages.json
node scripts/check_recommendations.mjs http://localhost:8787 reports/NEW_recommendations.json
node scripts/check_rls.mjs reports/NEW_rls.json
node scripts/check_chart_insights.mjs http://localhost:8787 reports/NEW_charts
```

브라우저 검사는 별도 .tools/browserqa의 Playwright/axe와 설치된Chrome을 사용하며 개인 프로필에 연결하지 않습니다. 고정 버전 설치 예시는 다음과 같습니다.

```sh
npm install --prefix .tools/browserqa --save-exact --no-audit --no-fund playwright@1.64.1 @axe-core/playwright@4.14.0
node scripts/check_browser.mjs http://localhost:8787 reports/NEW_browser
node scripts/check_visualizations.mjs http://localhost:8787 reports/NEW_visualizations.json
node scripts/check_map_targets.mjs http://localhost:8787 reports/NEW_map_targets
```

공개 배포 후 같은 스크립트의 URL을 공개주소로 바꿔 재검사합니다. React 서버렌더링·HTTP·실제 브라우저 검사는 서로 대체하지 않습니다. 과거 단계별 수치는 STAGE1~6 보고서, 원 표/지도 검증은 COMPARISON_IMPLEMENTATION_REPORT.md와 VISUALIZATION_IMPLEMENTATION_REPORT.md를 따릅니다. 기존 JSON·실패 이력·스크린샷은 유지합니다.
