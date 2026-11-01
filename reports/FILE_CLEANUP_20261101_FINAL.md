# 추가 파일 정리 — 2026-11-01

- 최상위 중복CSV6개와 stage1_data_summary.json은 실제 앱 data/stage1/ 사본과 SHA-256 동일 확인 후 삭제했다. 원본 CSV4개·XLSX1개는 보존했다.
- 서비스 코드가 중복된 Git 작업 사본을 제거했다. .git 이력·origin·추적파일 내용을 확인하고 실제 서비스 폴더로 이관했다. API_URL.txt/API_SERVER.md와 README 안내도 통합했다. GitHub 저장소와 배포주소는 유지한다.
- 구형 코드 백업, 임시 직종분류 텍스트·이미지, 사용하지 않는 지도 웹페이지 진단 다운로드, 중복 메타데이터/검증스크립트, 완료된 일회성 정리 스크립트를 제거했다.
- 현재 통계/채용 CSV 입력, 정규화 결과, 공식 직종분류PDF, 지도 원본 경계, 출처 메타데이터, 감사·테스트 보고서, kosis-main/은 유지한다. 시점별 검증 증거는 내용이 같아도 무작정 삭제하지 않았다.
- 삭제 목록은 원본 작업 폴더 reports/deep_cleanup_manifest_20261101.json에 기록했다. 대상 33개 경로의 총 68.85MiB 중 Git 메타데이터 20.00MiB는 실제 서비스 폴더에 보존했다.

## 검증

원본·전처리 입력·현재 서비스 코드 등87개 파일의 SHA-256 불변. 원본 재검사 reports/data_audit_20261101_after_cleanup.json에서 sources unchanged=True. 감사 기준일2026-10-30 유지. 실제 서비스 폴더에서 npm run check, npm test38개, npm run build 통과. 런타임 코드와 DB·공개 배포본은 변경하지 않았다.

실제 서비스 및 Git 폴더: C:/Users/ljg10/OneDrive/문서/ChatGPT/2026 일자리 공공데이터 분석 해커톤

GitHub: https://github.com/ljg10250/hackathon
