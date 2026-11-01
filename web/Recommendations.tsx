import OccupationPicker from './OccupationPicker';
import JobModeSwitch from './JobModeSwitch';
import {Sources} from './shared';
import {useEffect,useState} from 'react';
import {DISTRICTS,type Conditions} from '../worker/recommendation';
type Source=Record<string,string|number|boolean|null>;
type Detail={field:string;state:string;reason:string;weight?:number;factor:number|null};
type Job=Record<string,unknown>&{id:string;district:string;company:string;title:string;wage_text:string;posted_at:string;occupation_code:string;recommendation:{eligibility:string;confirmed_score:number|null;possible_score:number|null;score_label:string|null;unknown_preferences:number;selected_weight:number;required_details:Detail[];preference_details:Detail[]}};
type Result={data:Job[];total:number;counts:{eligible:number;needs_review:number};sources:Source[];alternative_status:string;error?:string};
const names:Record<string,string>={occupation:'직종',district:'지역',wage:'임금',workdays:'근무일수',employment_type:'고용형태',experience:'경력'};
const states:Record<string,string>={match:'충족',related:'검증된 관련 직종',mismatch:'불일치',unknown:'미확인'};
const reasons:Record<string,string>={wage_unit_not_comparable:'임금 단위가 달라 같은 기준으로 비교할 수 없음',missing_value:'자료에 값 없음',minimum_satisfied:'기재 최소 금액이 기준 이상',maximum_below_minimum:'기재 최대 금액이 기준 미만',wage_range_crosses_minimum:'기재 임금 범위에서 기준 충족 여부 미확인',exact_match:'선택한 값과 일치',different_value:'선택한 값과 다름',verified_related_occupation:'공식 근거가 검증된 관계'};
const types=[['10','기간 정함 없음'],['11','기간 정함 없음 · 시간제'],['20','기간 정함 있음'],['21','기간 정함 있음 · 시간제']];
export default function Recommendations(){
 const params=new URLSearchParams(location.search),view=params.get('view')??'all',group=params.get('group')??'eligible',page=Number(params.get('page')??1);
 const preferred:Conditions={},required:Conditions={};
 for(const field of ['district','occupation','workdays','employment_type'] as const){const value=params.get(field);if(value){if(field==='workdays')preferred.workdays=[Number(value)];else preferred[field]=[value];}}
 if(params.get('wage_min'))preferred.wage={type:params.get('wage_type')??'월급',minimum:Number(params.get('wage_min'))};
 for(const field of Object.keys(preferred) as (keyof Conditions)[])if(params.get('required_'+field)==='on')Object.assign(required,{[field]:preferred[field]});
 if(params.get('experience'))required.experience=[params.get('experience')!];
 const api='/api/recommendations?'+new URLSearchParams({required:JSON.stringify(required),preferred:JSON.stringify(preferred),view,group,page:String(page)});
 const [data,setData]=useState<Result|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();setData(null);setError('');fetch(api,{signal:c.signal}).then(async r=>{const body=await r.json() as Result;if(!r.ok)throw new Error(body.error??'조회 실패');setData(body);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();},[api]);
 function link(updates:Record<string,string>){const p=new URLSearchParams(params);p.set('page','1');for(const [k,v] of Object.entries(updates))p.set(k,v);return '/jobs?'+p;}
 const must=(field:string)=><label className="check"><input type="checkbox" name={'required_'+field} aria-label={names[field]+' 필수로도 적용'} defaultChecked={params.get('required_'+field)==='on'}/>필수로도 적용</label>;
 return <><div className="eyebrow">PREFERENCE MATCH</div><h1>조건을 살펴보고, 선택을 넓히세요.</h1><p className="intro">필수조건 충족 여부와 선호 일치 이유를 확인하며 공고를 비교해 보세요.</p>
 <div className="notice">점수는 합격·취업 확률이 아닙니다. 필수 불일치는 제외하고 필수 미확인은 ‘조건 확인 필요’에서 분리합니다. 임금은 같은 단위끼리만 비교하며, 실제 모집 상태는 공식 포털에서 확인하세요.</div>
 <JobModeSwitch mode="recommend" search={location.search}/>
 <form action="/jobs" className="recommend-form"><input type="hidden" name="mode" value="recommend"/><fieldset><legend>선호 조건 · 선택한 항목만 점수에 반영</legend><p>‘필수로도 적용’을 선택하면 같은 조건을 충족한 공고만 전체 추천에 포함합니다. 미선택 항목에는 점수가 없습니다.</p><div className="recommend-fields">
 <div><label>지역 · 25점<select name="district" defaultValue={params.get('district')??''}><option value="">선호 없음</option>{DISTRICTS.map(d=><option key={d}>{d}</option>)}</select></label>{must('district')}</div>
 <div><OccupationPicker label="선호 직종 · 35점" defaultValue={params.get('occupation')??''}/>{must('occupation')}</div>
 <div><label>주 근무일수 · 10점<select name="workdays" defaultValue={params.get('workdays')??''}><option value="">선호 없음</option>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>주 {n}일</option>)}</select></label>{must('workdays')}</div>
 <div><label>고용형태 · 10점<select name="employment_type" defaultValue={params.get('employment_type')??''}><option value="">선호 없음</option>{types.map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>{must('employment_type')}</div>
 <div><label>임금 단위 · 20점<select name="wage_type" defaultValue={params.get('wage_type')??'월급'}>{['시급','일급','월급','연봉'].map(v=><option key={v}>{v}</option>)}</select></label><label>희망 최소 금액 (원)<input name="wage_min" type="number" min="1" max="10000000000" step="1" defaultValue={params.get('wage_min')??''} placeholder="미입력 시 선호 없음"/></label>{must('wage')}</div>
 <div><label>필수 공고 경력 표기<select name="experience" defaultValue={params.get('experience')??''}><option value="">제한 없음</option>{['신입','관계없음','경력'].map(v=><option key={v}>{v}</option>)}</select></label><small>공고의 표기값과 정확히 비교합니다.</small></div>
 </div><button className="button">조건 적용 →</button></fieldset></form>
 <nav className="result-tabs" aria-label="추천 결과 유형">{[['all','전체 추천'],['region','지역 대안'],['occupation','직종 대안']].map(([v,label])=><a key={v} href={link({view:v,group:'eligible'})} aria-current={view===v?'page':undefined}>{label}</a>)}</nav>
 <div className="group-tabs"><a href={link({group:'eligible'})} aria-current={group==='eligible'?'page':undefined}>필수 충족 {data?.counts.eligible.toLocaleString('ko-KR')??''}</a><a href={link({group:'needs_review'})} aria-current={group==='needs_review'?'page':undefined}>조건 확인 필요 {data?.counts.needs_review.toLocaleString('ko-KR')??''}</a></div>
 {view==='region'&&<p>희망 직종을 유지하면서 선호 지역 외 서울 자치구를 살펴봅니다. 필수 지역·직종은 유지됩니다.</p>}{view==='occupation'&&<p>직종 대안은 현재 제공하지 않습니다. 전체 추천이나 지역 대안에서 공고를 살펴보세요.</p>}
 {error?<p role="alert" className="notice">{error}</p>:!data?<p role="status">추천 조건을 확인하고 있습니다…</p>:<><div className="result-head"><h2>{data.total.toLocaleString('ko-KR')}건</h2><span>확인 점수순 · 미확인 항목 적은 순 · 등록일 최신순</span></div>
 {view==='region'&&data.alternative_status==='requires_preferred_district_and_occupation'&&<p className="notice">지역·직종 대안을 조회하려면 선호 지역과 직종을 모두 선택해 주세요.</p>}{data.alternative_status==='no_verified_related_occupations'&&<details className="data-disclosure"><summary>직종 대안 제공 범위</summary><p>관련 직종의 관계를 확인한 뒤 제공할 수 있습니다. 같은 분류에 속한다는 이유만으로 관련 직종을 연결하지 않습니다.</p></details>}
 <div className="job-list">{data.data.map(j=><article className="job recommendation-job" key={j.id}><a href={`/jobs/${j.id}?return=${encodeURIComponent(location.pathname+location.search)}`}><span className="tag">{j.district}</span><p>{j.company}</p><h3>{j.title}</h3><p>{j.wage_text} · 등록 {j.posted_at}</p><span className="muted">상세 조건·공식 포털 안내 →</span></a><div><strong>{j.recommendation.score_label===null?'선호 조건 미선택 · 점수 없음':j.recommendation.score_label+'점'}</strong><p>확인 점수 ~ 가능한 최대 점수</p><details><summary>조건과 계산 근거</summary>{j.recommendation.required_details.map(d=><p key={'r'+d.field}>필수 {names[d.field]}: {states[d.state]} · {reasons[d.reason]}</p>)}{j.recommendation.preference_details.map(d=><p key={'p'+d.field}>선호 {names[d.field]}: {states[d.state]} · {reasons[d.reason]}<br/>기준 {d.weight}점 × {d.factor??'미확인(확인점수 0)'} ÷ 선택 가중치 {j.recommendation.selected_weight} × 100</p>)}</details></div></article>)}</div>
 {!data.data.length&&view!=='occupation'&&<p>이 조건에 해당하는 공고가 없습니다.</p>}<div className="pagination">{page>1&&<a href={link({page:String(page-1)})}>← 이전</a>}<span>{page} 페이지</span>{page*20<data.total&&<a href={link({page:String(page+1)})}>다음 →</a>}</div>
 <Sources sources={data.sources} ids={['jobs','mapping']}/></>}
 </>;
}
