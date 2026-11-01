import type {Row} from './shared';
import {periodLabel,frequencyLabel,verificationLabel} from './format';

export default function DataSources({sources,ids}:{sources:Row[];ids:string[]}){
 return <aside className="sources" aria-label="데이터 출처와 기준"><h2>데이터 출처와 기준</h2>
  {sources.filter(s=>ids.includes(String(s.id))).map(s=><article className="source-item" key={String(s.id)}>
   <h3>{s.source} · {s.title}</h3>
   <p>기간 {periodLabel(s.period)} · 주기 {frequencyLabel(s.frequency)} · 연령 {s.age_scope??'미확인'} · 단위 {s.unit??'미확인'}</p>
   <p>지역 기준: {s.geography_basis??'미확인'}</p>
   {typeof s.source_url==='string'&&s.source_url.startsWith('https://')?<a href={s.source_url} target="_blank" rel="noreferrer">공식 출처 확인 ↗</a>:<p>공식 출처 링크 확인 중</p>}
   <details className="source-details"><summary>자료 범위와 확인 내용</summary>
    <p>확인한 범위: {verificationLabel(s.verification_status)}</p>
    <p>원 표·자료 ID: {s.table_id??'미확인'} · 원본 수집 시각: {s.retrieved_at??'미기록'}</p>
    <p className="source-technical-note">{s.notes?periodLabel(s.notes):'추가 안내 없음'}</p>
   </details>
  </article>)}
 </aside>;
}
