import {visualizationEvidence} from './visualizationEvidence.ts';
type Row=Record<string,string|number|boolean|null>;
export const CAPITAL_SOURCE=visualizationEvidence.version;
export function verifiedVisualRows(kind:'capital'|'districts',rows:Row[],source:Row|undefined){
 const expected=visualizationEvidence[kind],sourceId=kind==='capital'?CAPITAL_SOURCE:'districts';
 const index=new Map(rows.map(r=>[String(r.region)+'|'+String(r.period),r]));
 return source?.verification_status==='verified_metadata'&&source.unit==='%'&&source.age_scope==='15~29세'
  &&source.frequency===(kind==='capital'?'quarterly':'halfyear')
  &&source.table_id===(kind==='capital'?'INH_1DA7015S':'INH_1ES3A03_A01S')
  &&source.period===(kind==='capital'?'2021-Q1~2026-Q3':'2021-H1~2026-H1')
  &&rows.length===expected.length&&index.size===expected.length&&expected.every(e=>{const r=index.get(e.region+'|'+e.period);return r?.source_id===sourceId&&r.metric==='employment_rate'&&r.age_scope==='15-29'&&r.verification_status==='verified_metadata'&&r.value===e.value;});
}
export function verifiedDistrictSubset(rows:Row[],source:Row|undefined){
 return source?.verification_status==='verified_metadata'&&source.table_id==='INH_1ES3A03_A01S'&&rows.every(r=>r.source_id==='districts'&&r.verification_status==='verified_metadata'&&r.age_scope==='15-29'&&r.metric==='employment_rate'&&visualizationEvidence.districts.some(e=>e.region===r.region&&e.period===r.period&&e.value===r.value));
}
