// Display labels only. API filters and original period keys remain unchanged.
export function periodLabel(value:unknown):string{
 if(value===null||value===undefined||value==='')return '미확인';
 return String(value).replace(/(\d{4})-Q([1-4])(?!\d)/g,'$1년 $2분기').replace(/(\d{4})-H([12])(?!\d)/g,(_,year,half)=>`${year}년 ${half==='1'?'상반기':'하반기'}`);
}
export function frequencyLabel(value:unknown):string{
 const labels:Record<string,string>={quarterly:'분기',halfyear:'반기',monthly:'월별',snapshot:'공고 수집본',classification_version:'직업분류 개정 기준',boundary_snapshot:'경계 자료 기준 시점'};
 return labels[String(value)]??'주기 미확인';
}
export function verificationLabel(value:unknown):string{
 const labels:Record<string,string>={
  verified_metadata:'원 통계표의 항목·기준·공개 수치 대조',
  verified_boundary_25:'서울 25개 구의 경계 코드·명칭 대조',
  verified_hierarchy_partial:'공식 코드·명칭을 대조한 일부 직종분류 연결',
  local_verified:'자료 파일의 구조와 내부 집계 확인',
  partial:'공고의 기재 정보 기준 · 현재 모집 여부는 별도 확인',
  pending_age:'연령 기준 확인 중 · 공개 수치에서 제외',
  pending_metadata:'원 통계표의 기준 확인 중'
 };
 return labels[String(value)]??'확인 상태 미확인';
}
