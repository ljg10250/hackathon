
export default function JobModeSwitch({mode,search}:{mode:'search'|'recommend';search:string}){
 const params=new URLSearchParams(search),general=new URLSearchParams(),recommend=new URLSearchParams({mode:'recommend'});
 for(const field of ['district','occupation'])if(params.get(field)){general.set(field,params.get(field)!);recommend.set(field,params.get(field)!);}
 const searchHref=mode==='search'?'/jobs'+search:'/jobs'+(general.size?'?'+general:'');
 const recommendHref=mode==='recommend'?'/jobs'+search:'/jobs?'+recommend;
 return <nav className="mode-links" aria-label="일자리 탐색 방식">
  <a className="mode-option" href={searchHref} aria-current={mode==='search'?'page':undefined}>
   <span><span className="mode-title">일반 검색</span><span className="mode-description">지역·직종으로 공고 찾기</span></span>
   {mode==='search'?<span className="mode-state"><span aria-hidden="true">✓ </span>선택됨</span>:<span className="mode-arrow" aria-hidden="true">→</span>}
  </a>
  <a className="mode-option" href={recommendHref} aria-current={mode==='recommend'?'page':undefined}>
   <span><span className="mode-title">조건 추천·대안</span><span className="mode-description">필수조건과 선호에 맞춰 비교</span></span>
   {mode==='recommend'?<span className="mode-state"><span aria-hidden="true">✓ </span>선택됨</span>:<span className="mode-arrow" aria-hidden="true">→</span>}
  </a>
 </nav>;
}
