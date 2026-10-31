# 2단계 구조

브라우저 React → 같은 출처 `/api/*` → Cloudflare Worker → Supabase REST(Data API) → PostgreSQL.
HTML/CSS/JS는 Workers Static Assets, `/api/*`는 `run_worker_first`로 처리한다.
SPA 직접 URL 새로고침을 지원한다. DB 호출은 공개 읽기 키를 사용하며 관리자 키는 존재하지 않는다.
RLS와 GRANT가 실제 데이터 공개 범위를 제한한다. 사용자 요청·프로필·행동은 저장하지 않는다.

## 7개 테이블

| 테이블 | 키·역할 | 공개 읽기 |
|---|---|---|
| jobs | 파일해시+행번호 ID, 원본 직종·임금·날짜, 미확인 필드 | 격리 5건 제외 |
| youth_employment_stats | 출처/지역/분기/지표 복합키, 고용률·실업률 별도 | 연령 미확인 실업률 제외 |
| district_youth_stats | 출처/구/반기/지표 복합키 | 원 표 미확인 참고값 |
| occupation_market_stats | 출처/분류버전/직종/월 복합키 | 전체 연령·등록관서 기준 |
| occupation_mappings | 원/대상 코드체계·버전/관계 복합키, 공식 근거 URL | 검증된 계층 관계만 |
| data_sources | 출처·표ID·대상·주기·단위·검증 상태 | 읽기만 |
| data_imports | 파일SHA256/행수/격리수/검증 이력 | 운영자 전용, 공개 권한 없음 |

모든 테이블 RLS 활성화. anon/authenticated에 쓰기 권한·쓰기 정책 없음.
공고 기본 응답에서 원본 전화번호·채용부서·직무설명·상세주소를 제외한다.
근무일수는 명확한 주 N일 문구만 추출, 교대/격일/협의는 null. 임금 최소/최대는 원화 그대로.
임금 환산 플래그는 전부 false. 공식 매핑은 code+label 일치만 허용하고 원본 버전 미기록을 명시한다.

## 초기 API

| GET | 응답 |
|---|---|
| /api/health | 실제 DB 연결 확인, 공개 공고 수, 단계·보류상태 |
| /api/sources | 전체 출처 등록부 |
| /api/indicators?metric=employment_rate | 고용률46행 + 동일분기 비교23행·%p 격차·전년 동기 변화·산식·비교 가능 상태 |
| /api/indicators?metric=unemployment_rate | 빈 목록 + pending_age |
| /api/districts?period=2026-H1 | 해당 반기의 구별 고용률 |
| /api/occupations?classification=KECO2025&period=2026-09 | 직종 통계와 구인명/구직건 파생비율 |
| /api/jobs?district=강남구&experience=신입&page=1&page_size=20 | 일반 검색, score null |
| /api/jobs/:id | 상세 조건·기재날짜·모집상태 미확인 |

`q`는 제목, `occupation`은 원본 6자리 코드를 정확 비교한다. 직종 분석에서 `occupation_group`(검증된2자리 중분류)으로 연결한다. 원본6자리코드의 공식 계층 관계를 조회해 검색 범위를 제한한다.
페이지 크기 1~50, 페이지 1~10000, 허용 파라미터/중복/형식을 검사한다.
빈 결과는 200+빈목록, 유효하지 않은 입력 400, 없는 경로/공고 404, 비GET 405, DB 장애 503.
DB 내부 오류·키·SQL은 응답에 노출하지 않는다. Cache-Control no-store; 요청 로깅·관측 로그는 꺼뒀다.
Free Workers에 맞춰 요청당 제한된 행만 DB에서 가져오며 전체 공고를 브라우저에 내려받지 않는다.

## 최초 적재와 갱신

로컬 전수검사 → 정제JSON/SQL → 새 전용 프로젝트 테이블 → SQL 150행 단위 INSERT → DB 행수/합계/RLS 검사.
운영용 대량 갱신 엔드포인트는 만들지 않았다. 최초 적재 SQL은 기존 값 UPDATE/DELETE를 포함하지 않는다.
향후 새 스냅샷에는 검증과 별도 버전 준비, 단일 트랜잭션 활성 전환, 실패 롤백을 먼저 구현해야 한다.
동일 출처/행번호 유일키 때문에 새 파일을 기존 DB에 무작정 재적재해서는 안 된다.

## 배포 설정

Supabase project ref: `jlnebtxrncfqzyjgasuw`, 서울 `ap-northeast-2`, 생성 시 확인 비용 $0/month.
Cloudflare Worker 이름: `seoul-youth-job-compass`. 공개 URL: https://seoul-youth-job-compass.ljg10250000.workers.dev (실제 HTTP 검사 통과).
compatibility_date는 설치된 workerd가 지원하는 최신일 `2026-10-30`. 한국 검증일 10월31일을 적용하면
UTC 기준 런타임에서 미래 날짜로 거부되어 하루 전의 지원 날짜로 고정했다.
설정의 publishable key는 공개 읽기 전용 키이며 브라우저 번들에는 포함하지 않는다.

## 3단계 추천

Worker는 입력 JSON·허용값·중복·페이지 크기를 검사하고 publishable key로
`POST /rest/v1/rpc/compass_recommend_jobs`를 호출한다. DB가 전체 후보를 평가·정렬한 뒤
최대 50개 결과만 반환한다. 브라우저나 Worker로 전체 공고를 가져와 점수순 페이지를 만드는 방식이 아니다.
7개 테이블·기존 행수·RLS 정책·쓰기 권한은 유지하며 4개 읽기 전용 함수를 추가했다.
`SECURITY INVOKER`, 빈 search_path, 명시적 함수 권한, 원격 RPC 입력 재검증을 적용했다.

예시 요청 (쿼리 값은 URL 인코딩):

```json
{
  "required": {"workdays":[5]},
  "preferred": {"occupation":["029506"],"district":["강남구"],"wage":{"type":"월급","minimum":3000000}},
  "view":"all", "group":"eligible", "page":1, "page_size":20
}
```

직종 6자리 코드는 설명용 형식 예시다. 실제 자료 존재 여부는 API의 결과로 확인한다.
조건 키: district(서울25구 문자열목록), occupation(6자리코드목록), workdays(1~7 숫자목록),
employment_type(원본코드 10/11/20/21 목록), wage(type/양의 minimum), experience(필수 전용).
배열 내 OR·항목 간 AND, 빈 배열·중복·알 수 없는 항목·단위·지역·잘못된 금액은 400이다.
선호 외 가산점이나 연봉·월급 환산은 없다.

응답 `data`의 각 공고에 `recommendation`을 추가한다. required_details/preference_details에는
항목·match/related/mismatch/unknown·reason·factor와 선택 가중치 근거가 있다.
confirmed_score/possible_score는 반올림 전 점수, score_label은 소수 첫째 자리 표시다.
각 응답에는 기존 `sources` 6건의 출처 메타데이터, 필수 충족·미확인 counts,
필터별 total·page·page_size, weights, score_semantics, alternative_status를 반환한다.

전체 추천은 모든 필수 충족 공고이며 선호 불일치는 점수가 낮은 결과로 남는다.
필수 미확인은 `group=needs_review`에서 조회한다. 명백 불일치는 어느 그룹에도 포함하지 않는다.
지역 대안은 희망 직종 정확 일치를 유지하고 선호 지역 밖 서울 구로 한정한다.
직종 대안은 희망 지역을 유지하고 검증된 관련 직종만 조회한다. 필수 조건을 먼저 검사하므로 대안에서도 완화되지 않는다.
관련 관계는 `placement_csv → KECO 2025`의 6자리 코드·evidence_url·verified_at·relation=related로 제한한다.
현재 323개 hierarchy 링크는 모두 배제되어 관련 직종은 0개다.

`scripts/check_recommendations.mjs`는 원격 결과와 TypeScript 기준 평가기를 대조한다.
SQL 함수 내부 계산용 synthetic fixture는 실제 관련 관계를 만들거나 DB에 데이터를 저장하지 않는다.
신규 데이터·RLS 권한 변경·전체 페이지 완성은 별도 검증이 필요하다.

## 4단계 페이지와 API 확장

- `GET /api/districts?district=강남구`: 원문 region=`서울 강남구`의11개 반기. `period`도 주면 교집합이며 미지정은 선택 구 전체 기간이다. 구 미선택 시 기존 기본 반기2026-H1의25행 동작을 유지한다. 입력을 서울25구로 검증하고 최대50행을 반환한다.
- `GET /api/job-occupations?q=사무&limit=50`: 고정된 공개 공고 스냅샷의 원본코드·명칭 선택 목록. q최대80자·limit1~50·허용 파라미터·중복을 검사한다. 전체558쌍 중 매칭 total과 한정된 data를 반환한다. source_id·입력SHA256·공개행수·검증상태는 snapshot에 포함하며 기존 sources 출처 등록부도 제공한다.
- 목록의 원천은 `data/processed/jobs.json` 중 비격리10,743행이다. `data/metadata/job_occupation_options.json`과 `worker/jobOccupationOptions.ts`는 생성 결과다. 코드1개당 명칭1개·총558개·공개행수·손상문자 부재·입력해시를 검증했다. 기존 DB의 실시간 통계라는 주장은 하지 않는다.
- 프런트엔드의 원본 직종명 찾기 입력은 선택 목록을 필터링한다. 실제 검색/추천 요청에는 선택된6자리 코드만 사용한다. 공식 계층매핑·관련 직종으로 자동 확장하지 않는다.
- `pages.tsx`의 순수 View 컴포넌트에 실제 API 데이터를 주입해 렌더링을 검증하며 실서버 요청은 useData 훅으로 분리한다. sources·null/실제0·결측구간을 보존한다.
- 검색의 page_size10/20/50을 URL·페이지 링크에 반영한다. 상세에서 공고의 기재조건·날짜·임시ID·공식포털 검색 방법을 제공하고 전체 검색/추천 쿼리로 복귀한다. 외부 return URL은 거부한다.
- DB 스키마·RLS·행수·추천 가중치·점수산식은 바꾸지 않았다.

## 5단계 검증·제출 재현

`scripts/check_browser.mjs`는 별도 .tools/browserqa에 고정 설치한 Playwright/axe와 설치된 Chrome을 이용한다.
개인 프로필에 attach하지 않고 임시 컨텍스트를 생성한다. 실제 공개/로컬 API에 연결해51검사를 수행하고
5개 크기×6경로의30개 화면을 axe·가로 넘침·폰트·상하 메뉴로 점검한다. 실제 선택·제출·페이지·상세복귀·대안·미확인·연도필터·키보드와
별도 합성503복구도 검사한다. 데이터 원본·DB·추천 함수는 수정하지 않는다.

서울 region은 원문 `서울특별시`로 정확히 선택한다. 변경 전 `서울` 비교는 실제 서울 행을 놓쳐 null처럼 보이게 했고,
이전 일반 SVG 검사로는 놓칠 수 있었다. 실제 API 데이터와 서울 전용23점 그래프·47.1%를 연결해 회귀를 강화했다.
비교 보완 이전에는 원본 ‘계’의 별도 보류 그래프를 유지했다. 색 대비용 작은 글자/버튼은 짙은 청록·파랑을 사용하고 데이터 표시는 기존 색을 유지한다.
스크롤 그래프에 role/이름/tabIndex를 주고 날짜 축 눈금을 최대6개로 배치해 마지막 날짜 겹침을 줄였다.

`capture_api_demo.mjs`는 키 없이 자체 공개API를 호출해6개 요청/응답·시각·상태·두 산식의 독립 계산 대조를 남긴다.
`package_candidate.py`는 원본·자격정보·의존성·운영로그를 제외한 새 ZIP과 파일별SHA256 매니페스트를 만든다.
후보 생성은 외부 서비스 전송이나 최종 제출이 아니다.

## 고용률 비교와 직종 탐색 보완

`worker/employment.ts`는 표ID·검증 상태·주기·단위와 검증된46개 값/연령/지역/기간의 일치를 확인한 뒤 `comparison_enabled`를 결정한다. 미일치 시 비교 배열은 빈 값이고 상태는 pending_revalidation이다. 같은 분기를 짝지으며 차이는 공개된 소수 첫째 자리 값으로 계산해 %p로 반환한다. 전년 같은 분기가 없으면 null, 누락 대응값은 null·사유를 반환하고 보간하지 않는다.

원격 DB 변경은 `supabase/metadata_updates/verify_employment_20261031.sql`의 단일 트랜잭션으로 출처1행·고용률46행 검증 플래그만 갱신했다. 입력46행 내용·이전 상태·갱신행수 가드가 있어 수치나 버전이 달라지면 롤백한다. 최초 INSERT SQL 재사용·재적재·스키마/RLS/권한 변경이 아니다. 최초 수집시각은 null을 유지하고 공식 응답 조회·검증 시각을 별도로 기록했다.

`GET /api/jobs?occupation_group=02`는 공식2025 PDF의35개 코드·명칭 목록에서 입력을 검증한다. DB mappings에서 jobs/placement_csv/미기록원버전의검증쌍/KECO2025/hierarchy/공식근거URL/검증시각 조건을 모두 적용한다. 검증된 하위코드가 없으면 빈 결과로 제한하며 전체 공고로 돌아가지 않는다. 원본 occupation·district·experience·q는 교집합이다. 최대50행과 안정정렬·총건수·페이지/복귀 조건을 유지한다.

API의 occupation_group 메타데이터는 관계가 hierarchy이고 추천 관련성은 false임을 명시한다. 통계는 등록관서·전체연령·9월자료, 공고는 근무지·별도시점 스냅샷임을 화면에서 구분한다. 검증코드323쌍·공개공고7,893행 범위만 연결한다. 새 데이터의 원자적 갱신 구조는 여전히 후속 범위이며 기존 prepare_data.py 재실행은 초기 산출물 재생성이다.

## 시각화 버전·경계·해석 구조

`GET /api/visualizations?area=capital|districts`는검증된수도권92행또는자치구275행을Supabase에서제한조회한다. worker/visualizationEvidence.ts와출처·연령·주기·항목단위·버전·전체키·값을선형대조하고누락/중복/변경이면시각화비활성+빈목록을반환한다. 임의예시값으로전환하지않는다.

수도권버전source_id=`capital-employment-20261031-v1`. 전용SQL의단일트랜잭션으로새source/import와92행을적재하고Worker의고정버전배포로활성전환했다. 버전중복은오류이며기존관측값을덮어쓰지않는다. 기존employment46행과API의source필터를유지해기존홈비교가138행을섞지않는다. 이는검증된통계스냅샷의최소버전전환이며범용갱신·자동수집·공고갱신도구완료가아니다.

자치구는동일275행의메타데이터보완이다. 예상키/값/연령/기간·이전상태·갱신행수275가드와단일트랜잭션을적용했다. 현재7테이블구조·RLS/GRANT는동일하며 youth184, sources7, imports7이다. legacy data/processed/data_imports.json은초기6개적재기록으로보존,추가버전기록은capital_employment_20261031_v1_import.json과전용SQL을따른다.

경계는정적공개자산이다. web/seoulMapData.ts는공식2025-Q2시군구SHP에서검증된서울25구를추출해원투영좌표계의동일축척·북쪽위로SVG배치했다. 최대40m단순화는화면표현용이며법적경계/통근거리/면적계산용이아니다. worker/boundaryMetadata.ts는이자료의별도출처이고districts시각화응답에추가한다. DB data_sources7개와지도응답의8개출처를구분한다.

web/insights.ts는실제선택값으로수준차이·동기변화·명/건의뜻을짧게설명한다. 생성형AI호출이나원인추정은없다. 지도/표색범례는전시점동일,반기선택/구선택/추이/설명/공고링크를연동하며이름터치와키보드를검사한다.
