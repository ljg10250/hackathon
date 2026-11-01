# 운영 Worker 전환 — 2026-11-01

- 현재 Worker: kongju-hackathon-jabjapda
- 사이트: https://kongju-hackathon-jabjapda.ljg10250000.workers.dev
- API: https://kongju-hackathon-jabjapda.ljg10250000.workers.dev/api/indicators?metric=employment_rate
- 배포버전:170663b5-a33d-4a65-a73b-403fe4159daa
- 기존 seoul-youth-job-compass Worker는 새 주소 검증 후 사용자 요청으로 삭제했다. CLI삭제 성공 및 기존 /api/health HTTP404, 새 /api/health HTTP200·DB연결·공개공고10,743행을 확인했다.

wrangler.jsonc의 기본 배포 이름과 현재 사이트/API 안내, 시연 스크립트 기본 URL을 새 주소로 변경했다. 기존 새 Worker에 최신 코드(발표 기능 삭제·한 줄 해석 포함)를 배포했으며 DB·원본·추천 규칙은 변경하지 않았다. 과거 JSON 검증 로그의 이전 URL은 당시 증거로 보존한다.

## 현재 검증

- npm run check·38개 테스트·빌드·wrangler types --check 통과.
- [공개HTTP17](resume_http_2026-11-01T07-53-35-691Z.json).
- [추천27](domain_switch_recommendations_20261101.json): 독립 계산·대안·미확인 처리, 공개공고10,743행.
- [시각화12](domain_switch_visualizations_20261101.json): 수도권92개·자치구275개 값과 검증/출처.
- [PC/모바일10화면](domain_switch_browser_20261101/public-qa.json): 메뉴5개·발표 링크/화면 제거·그래프 해석·필터·가로 넘침 없음·런타임 오류 없음.

이후 npm run deploy는 새 Worker를 대상으로 한다. 실제 배포 후 공개 URL 재검사를 유지한다.
