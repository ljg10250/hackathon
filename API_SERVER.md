# 자체 API 배포 서버

배포 서버: https://seoul-youth-job-compass.ljg10250000.workers.dev

실제 API 호출 주소: https://seoul-youth-job-compass.ljg10250000.workers.dev/api/indicators?metric=employment_rate

- 방식: GET
- 인증: 공개 조회에 별도 인증키 불필요
- 응답: JSON
- 입력: `metric=employment_rate` (고용률)
- 반환: 서울·전국 청년 고용률, 같은 분기 격차(%p), 전년 동기 변화, 출처와 비교 기준
- 서버 구현: [worker/index.ts](worker/index.ts), 비교 계산: [worker/employment.ts](worker/employment.ts)
- 상태 확인: https://seoul-youth-job-compass.ljg10250000.workers.dev/api/health

```sh
curl "https://seoul-youth-job-compass.ljg10250000.workers.dev/api/indicators?metric=employment_rate"
```

Cloudflare Workers에 배포한 자체 REST API이며, 웹사이트가 이 API를 실제로 호출합니다. 검증 후 Supabase에 저장한 공공데이터를 조회·가공합니다. `/api`만 호출하는 대신 위 엔드포인트 전체 주소를 사용하세요.
