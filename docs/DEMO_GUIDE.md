# 사이트·자체 API 시연

사이트: https://kongju-hackathon-jabjapda.ljg10250000.workers.dev

사용자가 알려준 전체 발표시간5분 중 사이트 시연을 약90초로 잡은 예시입니다.

1. 고용 현황:2026년3분기 서울47.1%·전국44.1%·격차3.0%p와 전년 동기 변화−2.7/−1.2%p를 보여줍니다. 같은15~29세·분기이고 전국에 서울이 포함됨을 설명합니다.
2. 한눈에 보기: 구와 반기를 바꿔 지도·변화표·한 줄 해석이 함께 바뀌는 것을 보여주고 선택 구의 공고로 이동합니다. 거주자 고용률과 근무지 공고를 구분합니다.
3. 일자리 찾기: 조건 검색→상세→복귀로 조건/페이지 유지를 보여줍니다. 조건 추천의 확인 점수~가능 최대는 선호 일치도이며 취업확률이 아님을 설명합니다.
4. 자체 API: F12→Network→Fetch/XHR→새로고침→/api/indicators→Response를 열어 화면과 같은 JSON을 보여줍니다. 공개 사이트에 접속하는 다른 PC에서도 가능합니다.

직접 호출 주소와 인증 없는 GET 예시는 [API 서버 안내](../API_SERVER.md)에 있습니다. 가산점 설명은 “검증 후 저장한 공공데이터를 자체 API로 조회·가공하며 사이트가 실제로 호출한다”로 합니다. 외부 KOSIS MCP를 직접 만든 것으로 설명하지 않습니다.

실행 로그를 새로 남기려면 다음 명령을 사용합니다.

```sh
node scripts/capture_api_demo.mjs https://kongju-hackathon-jabjapda.ljg10250000.workers.dev reports/api_demo_NEW.json
```

과거 실제 호출·계산 근거는 [기본 시연](../reports/api_demo_20261031.json), [비교 보완](../reports/api_demo_comparison_20261031.json), [시각화](../reports/visualization_api_demo_20261031.json)에 있습니다. 모집상태·실업률 연령·관련직종·통근시간·사용자 효과의 미확인을 밝힙니다. 제출 항목은 [사용자 제공 기준](JUDGING_CRITERIA.md)을 확인하며 실제 제출·최종 가산점은 이 프로젝트의 검사만으로 확정하지 않습니다.
