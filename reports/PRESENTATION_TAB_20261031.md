# 발표 탭 공개 검증 — 2026-10-31

- 원본: `output/잡을_잡다_5분_발표_대화추가.pptx`, 현재 저장된 7장. 원본 수정 없이 복사본을 PowerPoint로 PNG1920×1080 변환.
- SHA-256: `6b452201891b04e1713227166d8b64c4c1ac23a8020c43e73bd79e9cd6e5e9e2`.
- 마지막 메뉴에 ‘발표’ 추가, 설명·캡션 없이 이미지 세로 배치. 모바일 메뉴6열. 이미지 순서·비율 유지, 첫 장 이후 지연 로딩.
- 공개: https://seoul-youth-job-compass.ljg10250000.workers.dev/presentation
- 배포 버전: `33f80940-96a2-49fd-ab41-f2ac34c9d0cc`.
- 현재 재검증: `npm run check`, `npm test`31개, `npm run build` 통과. 로컬/공개 `scripts/smoke.mjs` 각각17항목 통과, 실제DB 연결 및 공개공고10,743행 확인.
- 분리된 Chrome 테스트 브라우저에서 로컬/공개 각각320/390/1280px: 마지막 메뉴 클릭, 활성 상태, 이미지7장 로딩·순서·PNG 응답·가로 넘침 없음·캡션 없음 확인.
- 검증 파일: `implementation/presentation_export/{local,public}-qa.json`, 뷰포트별PNG, manifest.json. 앱 외부 경로에 위치한 이 폴더는 원본 프로젝트 작업 폴더 기준이다.
- DB·추천 규칙·통계값은 변경하지 않았다. PPT의 이후 수정은 자동 반영되지 않으며 다시 이미지화·배포해야 한다.
