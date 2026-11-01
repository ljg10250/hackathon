# 시각화 검증

검증일:2026-10-31. 현재 재검증과 구분되는 후속 구현 기록입니다.

- 수도권4지역×23분기92개를 별도버전으로 추가하고 기존 서울/전국46행의 source필터를 유지했다.
- 자치구275개는 원CSV·INH_1ES3A03_A01S·기초표DT_1ES3A03_A01S의 연령010·항목T12와 일치했다. 공통 UNIT_NM천명과 고용률%의 충돌은 항목 정의·산식으로 구분하고 원 응답을 보존했다.
- SGIS2025년2분기 서울25구의 코드/명칭과 SHP/DBF/SHX/PRJ/CPG5개 완전 추출·CRC/SHA를 확인했다. 전체ZIP 무결성 확인은 아니며 지도는 북쪽 위·동일축척·40m 단순화다.
- 구 내부로 라벨을 옮겨 이름 중앙 클릭이 인접 구를 선택하던 문제를 수정했다. 지도·변화표·선택 구·기간·설명·공고 링크를 연동했다.
- 당시 테스트23그룹, 공개HTTP17·새데이터/렌더링12검사(367개 값)·브라우저69·마우스/터치50회·RLS7이 통과했다. 초기 실패기록과 최종 통과를 구분한다.
- 신규버전 추가로 DB 출처7개, 지도응답은 경계 출처를 더해8개다. 출처 수6개 고정 검사 대신 필수 출처·고유성·메타데이터를 확인했다.

근거: [수치대조](visualization_data_verification_20261031.json), [경계대조](visualization_boundary_verification_20261031.json), [출처·파일해시](../data/metadata/seoul_boundary_provenance.json), [공개데이터](visualization_public_data_20261031.json), [공개브라우저](browser_visualization_public_20261031/results.json), [지도50회](map_targets_public_20261031/results.json), [RLS](visualization_rls_20261031.json), [API시연](visualization_api_demo_20261031.json).

현재 상태는 [데이터 감사](../DATA_AUDIT.md)와 [VALIDATION.md](VALIDATION.md)를 따른다.
