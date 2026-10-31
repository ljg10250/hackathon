import {employmentEvidence} from './employmentEvidence.ts';

type Row=Record<string,string|number|boolean|null>;
export type ComparisonRow={period:string;seoul:number|null;national:number|null;gap_pp:number|null;seoul_yoy_pp:number|null;national_yoy_pp:number|null;missing_reason:string|null};
const difference=(a:number|null,b:number|null)=>a===null||b===null?null:Math.round((a*10-b*10))/10;
const numeric=(r:Row|undefined)=>typeof r?.value==='number'&&Number.isFinite(r.value)&&r.value>=0&&r.value<=100?r.value:null;

// Pair only the same quarter; no fill, resampling, averaging or annualisation.
export function compareEmployment(rows:Row[]):ComparisonRow[]{
 const keys=new Set<string>();
 for(const r of rows){
  if(!/^\d{4}-Q[1-4]$/.test(String(r.period))||!['서울특별시','전국'].includes(String(r.region)))throw new Error('invalid_series');
  const key=r.period+'|'+r.region;if(keys.has(key))throw new Error('duplicate_observation');keys.add(key);
 }
 const find=(period:string,region:string)=>numeric(rows.find(r=>r.period===period&&r.region===region));
 return [...new Set(rows.map(r=>String(r.period)))].sort().map(period=>{
  const previous=String(Number(period.slice(0,4))-1)+period.slice(4),seoul=find(period,'서울특별시'),national=find(period,'전국');
  return {period,seoul,national,gap_pp:difference(seoul,national),seoul_yoy_pp:difference(seoul,find(previous,'서울특별시')),national_yoy_pp:difference(national,find(previous,'전국')),missing_reason:seoul===null||national===null?'unpaired_or_missing_observation':null};
 });
}

export function employmentAnalysis(rows:Row[],source:Row|undefined){
 const verified=source?.table_id===employmentEvidence.table_id&&source.verification_status==='verified_metadata'
  &&source.frequency==='quarterly'&&source.unit==='%'&&source.age_scope==='15~29세'&&source.period==='2021-Q1~2026-Q3'&&rows.length===employmentEvidence.observations.length
  &&employmentEvidence.observations.every(e=>rows.filter(r=>r.region===e.region&&r.period===e.period&&r.source_id==='employment'&&r.metric==='employment_rate'&&r.age_scope==='15-29'&&r.verification_status==='verified_metadata'&&r.value===e.value).length===1);
 return {comparison_enabled:verified,status:verified?'verified_metadata':'pending_revalidation',comparison:verified?compareEmployment(rows):[],
  comparison_basis:{table_id:employmentEvidence.table_id,age_scope:'15~29세',frequency:'quarterly',unit:'%',geography_basis:'거주지 기준(전국 표본가구 내 상주 가구원 조사)',national_includes_seoul:true,evidence_id:employmentEvidence.id},
  formulas:{gap_pp:'서울 고용률 - 전국 고용률',seoul_yoy_pp:'서울 해당 분기 - 서울 전년 같은 분기',national_yoy_pp:'전국 해당 분기 - 전국 전년 같은 분기'},
  limitations:['전국은 서울을 포함합니다.','전년 동기 변화는 전년 같은 분기가 있을 때만 계산합니다.','고용률은 개인 취업확률·구직 난이도·지역의 인과효과가 아닙니다.','표본오차와 통계적 유의성은 계산하지 않았습니다.','실업률과 자치구 통계의 별도 보류는 유지됩니다.']};
}
