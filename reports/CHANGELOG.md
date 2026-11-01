# 화면 개선 이력

2026-10-31에 반영한 개선의 요약입니다. 현재 규칙은 [명세](../docs/PROJECT_SPEC.md), 마지막 검사는 [VALIDATION.md](VALIDATION.md)를 따릅니다.

| 개선 | 확인한 내용·근거 |
| --- | --- |
| 잡을 잡다로 이름 변경 | [공개검사](brand_public_20261031.json) |
| 한눈에 보기 기본을 서울 지도·변화표로 변경 | [선택/기본화면 검사](map_default_public_20261031.json) |
| 일반 검색/조건 추천을 명확한 버튼으로 표시 | [전환·조건유지 검사](job_mode_public_final_20261031.json) |
| 내부진단 문구 정리·분기/반기 한글 표기·출처 상세 접기 | [문구/기간 검사](readable_ui_public_20261031.json) |
| 선그래프 기본25~75% 및 실제값 포함 확장 | [축/수치 검사](line_axis_public_20261031.json). 막대·지도 범례는 유지 |
| 페이지별 활용 목적 안내 | [공개검사](page_help_public_20261031.json) |
| 모든 차트·지도·변화표의 동적 한 줄 해석 | tests/chartInsights.test.mjs 및 [공개브라우저](cleanup_public_20261101/public-qa.json) |

2026-11-01 발표 기능 제거와 파일/문서 정리는 [유지보수 기록](MAINTENANCE.md)에 통합했습니다. 위 JSON은 당시 결과이며 검증 효과·현재 외부제출 완료를 의미하지 않습니다.
