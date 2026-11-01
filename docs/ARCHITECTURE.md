# 구조와 API

React 브라우저 → 같은 출처의 Cloudflare Worker /api/* → Supabase REST/RPC → PostgreSQL 구조입니다. HTML/CSS/JS는 Workers Static Assets로 제공합니다. 브라우저에 DB 키를 넣지 않고 Worker가 공개 읽기 키를 사용합니다. API는 저장된 공공데이터 스냅샷을 조회·가공하며 KOSIS를 실시간 호출하지 않습니다.

## DB와 권한

기존 프로젝트 jlnebtxrncfqzyjgasuw, 서울 ap-northeast-2를 사용합니다.

| 테이블 | 용도·공개 범위 |
| --- | --- |
| jobs | 임시ID=파일해시+원본행번호, 문자 오류5행 제외 공개 |
| youth_employment_stats | 서울/전국46행과 수도권92행 source 분리, 실업률46행 비공개 |
| district_youth_stats | 서울25구×11반기 고용률 |
| occupation_market_stats | KECO2025/KSCO8 별도 직종 통계 |
| occupation_mappings | 근거와 검증시각이 있는 관계, hierarchy와 related 구분 |
| data_sources | 출처 메타데이터 읽기 |
| data_imports | 운영자 전용 적재 기록, 공개 권한 없음 |

모든 테이블에 RLS를 적용하고 공개 쓰기를 차단합니다. 추천 RPC는 SECURITY INVOKER와 명시적 권한·빈 search_path를 사용합니다. 공고 API는 전화번호·채용부서·직무설명·상세주소 등 불필요한 원본 필드를 제외합니다.

## 읽기 전용 GET API

| 경로·입력 | 반환 |
| --- | --- |
| /api/health | DB 연결·공개 공고 수·상태 |
| /api/sources | 출처 등록부 |
| /api/indicators?metric=employment_rate | 고용률46행·동일분기 비교23행·격차·전년 동기 변화·산식 |
| /api/indicators?metric=unemployment_rate | 빈 결과와 pending_age |
| /api/visualizations?area=capital 또는 districts | 검증된 수도권92개 또는 자치구275개 값, 출처·활성 상태 |
| /api/districts?district=강남구&period=2026-H1 | 선택 구/반기 교집합, 구만 지정하면 전체 이력 |
| /api/occupations?period=2026-09&classification=KECO2025 | 직종별 구인 명·구직 건·비율,0분모 사유 |
| /api/job-occupations?q=사무&limit=50 | 고정 공개공고 스냅샷의 원본 코드/명칭 선택 목록 |
| /api/jobs | district,q,occupation,occupation_group,experience,page,page_size로 검색 |
| /api/jobs/:id | 공고 상세·현재 모집 미확인·직접 지원URL 없음 |
| /api/recommendations | required/preferred JSON,view,group,page,page_size로 추천 |

공통 페이지 크기1~50·페이지1~10000, 직종 목록limit1~50, 검색어 최대80자를 검사합니다. 빈 결과200, 잘못된 입력400, 없는 API/공고404, 비GET405, DB 장애503입니다. 정적 SPA의 미등록 화면은 안내HTML로 처리합니다. 내부 오류·키·SQL은 반환하지 않으며 API는 Cache-Control:no-store입니다.

## 추천 입력과 응답

required/preferred는 URL 인코딩한 JSON 객체입니다. 배열 내 OR·항목 간 AND이며 빈 배열·중복·알 수 없는 키는 거부합니다.

| 키 | 허용 형식 |
| --- | --- |
| district | 서울25구 문자열 배열 |
| occupation | 원본6자리 코드 문자열 배열 |
| workdays | 1~7 숫자 배열 |
| employment_type | 원본코드10/11/20/21 문자열 배열 |
| wage | type=시급/일급/월급/연봉, 양의 정수 minimum(원) |
| experience | 신입/경력/관계없음 배열, required 전용 |

view=all/region/occupation, group=eligible/needs_review를 사용합니다. Worker가 입력을 검증한 뒤 compass_recommend_jobs RPC를 호출하고 DB가 전체 후보 평가·정렬·페이지 처리를 수행합니다. 공고별 recommendation은 조건 상태/이유·confirmed_score·possible_score·score_label을 포함하며 응답에 counts·total·weights·출처·대안 상태를 제공합니다. 상세 규칙은 [명세](PROJECT_SPEC.md)에 있습니다.

## 데이터 검증과 갱신

worker/employment.ts는 표ID·기간·연령·단위·상태와 검증된46행의 값이 일치할 때만 비교를 활성화합니다. worker/visualization.ts는 수도권92행과 자치구275행을 별도 검증합니다. 기존 source 필터를 제거해 합산하지 않습니다.

새 데이터는 원본 보존→전수검사→별도 버전 준비→단일 트랜잭션 전환→Worker 배포→공개 검사를 거칩니다. 초기 INSERT SQL은 재적재/갱신 도구가 아닙니다. 기존 시각화 전용 SQL의 상태·행수 가드는 해당 스냅샷에만 유효합니다. 일반 갱신 자동화는 구현하지 않았습니다.

web/seoulMapData.ts는 공식 투영좌표의 북쪽 위·동일축척·40m 단순화 결과입니다. boundaryMetadata는 DB 출처와 구분된 정적 경계 출처입니다. worker/jobOccupationOptions.ts는 공개공고에서 만든558쌍 목록이며 공식 매핑 완료를 뜻하지 않습니다.
