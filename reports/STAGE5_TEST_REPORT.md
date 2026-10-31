# 5단계 실제 브라우저·반응형·접근성 검사

> 최신 시각화 후속 결과는 [VISUALIZATION_IMPLEMENTATION_REPORT.md](VISUALIZATION_IMPLEMENTATION_REPORT.md)를 따릅니다. 아래는 이전 버전의 보존 기록입니다.

> 후속 현재 결과: 고용률 원 표·서울–전국 비교·분류 공고 탐색을 보완해 새 버전을 배포했다. 최신 검증/버전은 [COMPARISON_IMPLEMENTATION_REPORT.md](COMPARISON_IMPLEMENTATION_REPORT.md)를 따른다. 아래는 보완 이전 단계의 보존 기록이다. 사용자 제공 심사 기준은 ../docs/JUDGING_CRITERIA.md에 반영했다.

검증일: **2026-10-31, Asia/Seoul**.

판정: **4단계의 실제 Chromium 탐색 검증과5단계 반응형/선별 접근성 검증을 완료했다.**
범위는 아래 Chrome 버전·5개 화면 크기와 테스트 흐름이다. 물리 iOS/Android·Safari/Firefox·스크린리더 전체 조합이나 WCAG 인증으로 확대하지 않는다.

## 이전 차단의 해소와 발견한 오류

기존 cua브라우저 연결이 불가해 사용자에게 도구 지침의 제한을 설명했고, 사용자가 Playwright 테스트 브라우저 사용을 명시적으로 허용했다.
개인 Chrome에 연결하거나 사용자 데이터/보안 설정을 바꾸지 않고 분리된 headless Chrome 임시 컨텍스트를 사용했다.

- 실제 브라우저 화면에서 서울 카드가 미확인이고 서울 그래프가 비는 것을 발견했다. 원인은 DB `서울특별시`와 UI의 `서울` 비교 불일치다.
- 원본·DB 변경 없이 정확한 region선택으로 수정해23분기와 최신47.1% 참고값을 확인했다.
- 이전 서버렌더링 검사는 원본 ‘계’의SVG만 있어도 통과할 수 있었다. 서울 전용 그래프의 점23개와 실제 API의 최신값을 직접 검사하도록 보강했다.
- 수정 전30페이지에서 색 대비 위반이 검출됐고 모바일2페이지의 차트 스크롤영역이 키보드 초점을 받지 못했다.
- 짙은 글자/버튼·명시적 스크롤영역 초점·날짜축 최대6눈금·좁은화면 가로스크롤 안내로 수정했다. 데이터의 서울블루/청록과16px본문은 유지했다.
- 실제 선택검사의 첫 실패8건은 검사기가 label내 option텍스트까지 정확 비교한 문제였다. 접근성트리를 읽어 combobox이름은 정상임을 확인하고 role/name으로 고쳤다. 화면에 불필요한 aria-label을 덧씌우지 않았다.

## 공개 배포 및 실제 결과

- URL: https://seoul-youth-job-compass.ljg10250000.workers.dev
- Worker version: `3ba6ee49-75df-4025-9716-b5956d5fd2ca`.
- Playwright 1.64.1, axe adapter 4.14.0, Chrome 156.0.8078.74.
- 공개 브라우저51검사 통과,30화면 axe 검출0, 문서 가로 넘침0,앱 JavaScript오류0,앱 동일출처 요청실패0.
- 화면 크기:1280×900 /768×1024 /390×844 /320×740 /844×390. 모바일 크기에서 하단 메뉴,큰 화면에서 상단 메뉴와 본문16px를 확인했다.
- 서울23점/최신값,분기·반기·월 구분과 보류안내·출처,실제폰트 로딩,빈검색/초기화,지역·직종 선택/페이지10건/2페이지/상세복귀,
  구/반기 선택과 공고탐색,직종별 그래프/산식,점수범위/계산근거,지역/직종대안,필수 미확인목록/복귀,필수지역유지,
  연도선택 후7점과 별도‘계’그래프,키보드 건너뛰기/초점,합성503후 실제API 재시도를 검사했다.
- 합성503은 브라우저 요청을 테스트 컨텍스트에서만 대체한 오류처리 시험이며 실제 운영장애나 DB수정이 아니다.

| 추가 검사 | 실제 결과 |
|---|---|
| 타입/단위 | npm run check·npm test15개 그룹 통과 |
| 빌드/타입/배포 | build·wrangler types --check·deploy --dry-run 통과 |
| 실제 공개HTTP |17항목, stage5_public_http_20261031.json |
| 실제 API+React |29항목, stage5_public_pages_20261031.json |
| 추천 실제DB 회귀 |27항목, stage5_public_recommendations_20261031.json |
| RLS 공개 키 |6항목, stage5_rls_20261031.json |
| React 추천 초기상태 |3상태, stage5_recommendation_render_20261031.json |
| 원본보존 |5파일 SHA256, stage5_original_hashes.json |

실제 브라우저 상세·버전·axe결과·스크린샷은 `stage5_public_browser/results.json`과 같은 폴더 PNG다.
`stage5_baseline`은 수정 전 위반 기록,`stage5_local_browser`는 검사기라벨 실패를 포함한 로컬 이력,
`stage5_local_flows`는 수정한 검사기로12흐름을 모두 통과한 로컬 결과다. 실패 이력을 최종 통과처럼 덮어쓰지 않았다.
최종 공개51검사는 수정된 검사기와 최종 배포본을 대상으로 전부 통과했다.
전체 페이지 스크린샷은 화면을 길게 캡처하므로 고정 하단메뉴가 최초viewport위치에 나타날 수 있다. 실제 메뉴좌표는 각화면metrics로도 검증했다.

## 유지한 보류와 남은 범위

원본·DB·RLS·추천 가중치·직종 계층323개/관련0개는 바꾸지 않았다.
인코딩5행·코드235쌍·실업률 원연령·고용률 원표/‘계’해석·임금환산·근무일수631행·현재모집상태 보류를 유지한다.
유료 전환/리소스 추가나 방문자 추적은 하지 않았다. 결과는 특정 브라우저 범위의 검사이며 모든 접근성 기준·전체기기·운영부하 검증이 아니다.
공식 제출형식·팀정보와 최종 외부제출 상태는 `STAGE6_PREPARATION_REPORT.md`를 따른다.

근거 문서: [Playwright 접근성 검사](https://playwright.dev/docs/accessibility-testing), [뷰포트 에뮬레이션](https://playwright.dev/docs/emulation),
[W3C 색대비](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
