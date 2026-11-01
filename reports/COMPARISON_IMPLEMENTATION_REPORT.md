# 서울·전국 비교 검증

검증일:2026-10-31. 현재 재검증과 구분되는 후속 구현 기록입니다.

- KOSIS101/INH_1DA7015S/T90·연령75의375개 수치·결측16개와 공개46행을 대조했다. 계/Total과 전국 조사 범위로 전국 해석을 확인했으며 전국에는 서울이 포함된다.
- 동일 분기 격차와 전년 같은 분기 변화를%p로 계산하고 출처·산식·한계를 제공했다. 직종 통계→검증된 계층분류 공고 탐색을 연결했다.
- 고용률46행의 값은 바꾸지 않고 출처/검증 상태만 단일 트랜잭션으로 갱신했다. 실업률·관련직종·임금 환산 등의 보류는 해제하지 않았다.
- 당시 테스트19그룹, 공개HTTP17·데이터/필터44·API→React30·브라우저53이 통과했다. 빈 occupation_group 선택을400으로 처리하던 오류를 수정하고 로컬18흐름·공개전체를 재검사했다.

근거: [KOSIS대조](kosis_employment_verification_20261031.json), [공개데이터](comparison_public_data_20261031.json), [공개페이지](comparison_public_pages_20261031.json), [공개브라우저](browser_comparison_public_20261031/results.json), [초기실패](browser_comparison_local_20261031/results.json), [로컬수정](browser_comparison_local_fixed_20261031/results.json), [API시연](api_demo_comparison_20261031.json).

현재 데이터 상태는 [데이터 감사](../DATA_AUDIT.md), 검사 범위는 [VALIDATION.md](VALIDATION.md)를 따른다.
