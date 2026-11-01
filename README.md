# 잡을 잡다

서울 청년 구직자를 위한 공공데이터 기반 고용 현황 비교·채용공고 탐색 서비스입니다.

- 사이트: https://seoul-youth-job-compass.ljg10250000.workers.dev
- **자체 API 호출 주소:** https://seoul-youth-job-compass.ljg10250000.workers.dev/api/indicators?metric=employment_rate
- [API 서버·호출 방법](API_SERVER.md) · [주소만 복사](API_URL.txt) · [서버 코드](worker/index.ts)

## 제공 기능

고용 현황, 한눈에 보기(서울 지도·변화표/수도권 비교), 자치구 분석, 직종 분석, 일자리 찾기와 조건 추천을 제공합니다. 모든 그래프는 실제 표시 수치에 맞춰 한 줄 해석을 갱신합니다. 추천 점수는 선호 일치도이며 취업확률이 아닙니다.

React + Cloudflare Workers Static Assets/자체 REST API + Supabase PostgreSQL을 사용합니다. 실제 서비스 폴더가 Git 작업 폴더이며, 데이터는 검증 후 저장한 스냅샷입니다.

## 실행

기존 검증 환경은 Node.js24·Python3.14입니다. 설치 후 `.env.example`을 참고해 로컬 `.dev.vars`를 구성합니다. 관리자 키를 사용하지 않으며 인증값은 커밋하지 않습니다.

```sh
npm ci
npm run build
npm run dev
```

기본 로컬 주소는 http://localhost:8787 입니다. 기존 DB를 초기화하거나 최초 적재 SQL을 다시 실행하지 마세요.

## 확인·배포

```sh
npm run check
npm test
npm run build
node scripts/smoke.mjs http://localhost:8787
npm run deploy
node scripts/smoke.mjs https://seoul-youth-job-compass.ljg10250000.workers.dev
```

실제 API·페이지·RLS·브라우저 검증 방법과 마지막 결과는 [검증 기준](reports/VALIDATION.md)을 따릅니다. 검사 결과는 새 경로에 기록합니다.

## 문서

- [현재 명세·추천 규칙](docs/PROJECT_SPEC.md)
- [데이터 출처·검증 상태·보류 해제 조건](DATA_AUDIT.md)
- [구조·API·DB 변경 원칙](docs/ARCHITECTURE.md)
- [사이트·자체 API 시연](docs/DEMO_GUIDE.md)
- [문제와 데이터 근거](docs/PROBLEM_AND_EVIDENCE.md) · [AI 검증 사례](docs/AI_USAGE_REVIEW.md)
- [사용자 제공 심사 기준](docs/JUDGING_CRITERIA.md)
- [화면 개선 이력](reports/CHANGELOG.md) · [파일·문서 정리](reports/MAINTENANCE.md)

실업률 연령·일부 직종 매핑·임금 환산·실시간 모집 여부는 보류 상태입니다. 회원가입·개인정보 입력·검색 기록 저장·방문자 추적은 없습니다. 실제 제출 여부와 최종 가산점 판정은 확인하지 않았습니다.
