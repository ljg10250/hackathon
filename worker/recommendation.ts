// Weights newly confirmed by the user on 2026-10-31 (Asia/Seoul).
export const WEIGHTS = Object.freeze({occupation:35,district:25,wage:20,workdays:10,employment_type:10});
export const DISTRICTS = ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'];
export type Conditions = {district?:string[];occupation?:string[];wage?:{type:string;minimum:number};workdays?:number[];employment_type?:string[];experience?:string[]};
export type Job = Record<string,string|number|boolean|null>;
export type Detail = {field:string;state:'match'|'related'|'mismatch'|'unknown';reason:string;factor:number|null};
export class RecommendationInputError extends Error {}
export function validateConditions(value:unknown,preferred=false):Conditions {
  if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>2048) throw new RecommendationInputError('조건 객체의 형식·길이를 확인해 주세요.');
  for(const [key,v] of Object.entries(value)) {
    if(!['district','occupation','wage','workdays','employment_type',...(preferred?[]:['experience'])].includes(key)) throw new RecommendationInputError('지원하지 않는 조건입니다.');
    if(key==='wage') {
      if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='minimum,type'||!['시급','일급','월급','연봉'].includes(v.type)||!Number.isSafeInteger(v.minimum)||v.minimum<=0||v.minimum>10000000000) throw new RecommendationInputError('임금은 원 단위 유형과 양의 최소 금액을 입력해 주세요.');
    } else {
      if(!Array.isArray(v)||!v.length||v.length>25||new Set(v).size!==v.length) throw new RecommendationInputError('조건은 중복 없는 1~25개 목록이어야 합니다.');
      const valid=v.every(x=>key==='district'?typeof x==='string'&&DISTRICTS.includes(x):key==='occupation'?typeof x==='string'&&/^\d{6}$/.test(x):key==='workdays'?Number.isInteger(x)&&x>=1&&x<=7:key==='employment_type'?typeof x==='string'&&['10','11','20','21'].includes(x):typeof x==='string'&&['신입','경력','관계없음'].includes(x));
      if(!valid)throw new RecommendationInputError('지역·직종·근무일수·고용형태·경력 조건을 확인해 주세요.');
    }
  }
  return value as Conditions;
}
export function parseConditions(raw:string|null,preferred=false) {
  if(raw===null)return {};
  try {return validateConditions(JSON.parse(raw),preferred);}catch(e){if(e instanceof RecommendationInputError)throw e;throw new RecommendationInputError('검색 조건 JSON 형식을 확인해 주세요.');}
}
export function condition(job:Job,field:string,wanted:unknown,relatedCodes:ReadonlySet<string>=new Set(),allowRelated=false):Detail {
  const result=(state:Detail['state'],reason:string,factor:number|null):Detail=>({field,state,reason,factor});
  if(field==='wage') {
    const w=wanted as {type:string;minimum:number};
    if(job.wage_type!==w.type)return result('unknown','wage_unit_not_comparable',null);
    if(job.wage_min===null||job.wage_min===undefined)return result('unknown','missing_value',null);
    if(Number(job.wage_min)>=w.minimum)return result('match','minimum_satisfied',1);
    if(job.wage_max!==null&&job.wage_max!==undefined&&Number(job.wage_max)<w.minimum)return result('mismatch','maximum_below_minimum',0);
    return result('unknown','wage_range_crosses_minimum',null);
  }
  const column=field==='occupation'?'occupation_code':field==='employment_type'?'employment_type_code':field;
  const actual=job[column];
  if(actual===null||actual===undefined||actual==='')return result('unknown','missing_value',null);
  if((wanted as unknown[]).includes(actual))return result('match','exact_match',1);
  if(field==='occupation'&&allowRelated&&relatedCodes.has(String(actual)))return result('related','verified_related_occupation',0.5);
  return result('mismatch','different_value',0);
}
// Reference evaluator used to verify the database implementation against all local rows.
export function evaluateJob(job:Job,required:Conditions,preferred:Conditions,relatedCodes:ReadonlySet<string>=new Set()) {
  const required_details=Object.entries(required).map(([k,v])=>condition(job,k,v));
  const eligibility=required_details.some(d=>d.state==='mismatch')?'excluded':required_details.some(d=>d.state==='unknown')?'needs_review':'eligible';
  if(eligibility==='excluded')return {eligibility,required_details,preference_details:[],confirmed_score:null,possible_score:null,unknown_preferences:0};
  const preference_details=Object.entries(preferred).map(([k,v])=>condition(job,k,v,relatedCodes,true));
  const denominator=preference_details.reduce((s,d)=>s+WEIGHTS[d.field as keyof typeof WEIGHTS],0);
  const earned=preference_details.reduce((s,d)=>s+(d.factor??0)*WEIGHTS[d.field as keyof typeof WEIGHTS],0);
  const unknown=preference_details.filter(d=>d.state==='unknown');
  const possible=earned+unknown.reduce((s,d)=>s+WEIGHTS[d.field as keyof typeof WEIGHTS],0);
  return {eligibility,required_details,preference_details,confirmed_score:denominator?100*earned/denominator:null,possible_score:denominator?100*possible/denominator:null,unknown_preferences:unknown.length};
}
export function inAlternative(job:Job,preferred:Conditions,view:string,relatedCodes:ReadonlySet<string>) {
  if(view==='all')return true;
  if(!preferred.district?.length||!preferred.occupation?.length)return false;
  return view==='region'?preferred.occupation.includes(String(job.occupation_code))&&!preferred.district.includes(String(job.district))&&DISTRICTS.includes(String(job.district)):view==='occupation'?preferred.district.includes(String(job.district))&&!preferred.occupation.includes(String(job.occupation_code))&&relatedCodes.has(String(job.occupation_code)):false;
}
