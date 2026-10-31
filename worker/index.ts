import {jobOccupationOptions} from './jobOccupationOptions.ts';
import {employmentAnalysis} from './employment.ts';
import {occupationGroups} from './occupationGroups.ts';
import {CAPITAL_SOURCE,verifiedVisualRows,verifiedDistrictSubset} from './visualization.ts';
import {boundaryMetadata} from './boundaryMetadata.ts';
import {parseConditions, RecommendationInputError} from './recommendation.ts';
type Row = Record<string, string | number | boolean | null>;
type RuntimeEnv = Env;
const districts = ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'];
class InputError extends Error {}
export function json(value: unknown, status=200) {
  return Response.json(value, {status, headers: {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
export function integer(value: string | null, fallback: number, min: number, max: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value) || Number(value)<min || Number(value)>max) throw new InputError('페이지 범위를 확인해 주세요.');
  return Number(value);
}
async function db(env: RuntimeEnv, table: string, params: URLSearchParams, count=false):Promise<{rows:Row[];total:number}> {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error('database_unconfigured');
  const response=await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {apikey:env.SUPABASE_PUBLISHABLE_KEY, ...(count?{Prefer:'count=exact'}:{})},
    signal:AbortSignal.timeout(8000)
  });
  // PostgREST uses 416 for an offset beyond the final row. The public API
  // treats this as an empty page and still returns the filtered total.
  if(response.status===416 && count && Number(params.get('offset'))>0) {
    await response.body?.cancel();
    const first=new URLSearchParams(params);first.set('offset','0');first.set('limit','1');
    return {rows:[],total:(await db(env,table,first,true)).total};
  }
  if (!response.ok) { await response.body?.cancel(); throw new Error('database_unavailable'); }
  const rows=await response.json<Row[]>();
  return {rows,total:count?Number(response.headers.get('Content-Range')?.split('/')[1]??rows.length):rows.length};
}
const select=(fields: string,extra:Record<string,string>={})=>new URLSearchParams({select:fields,...extra});
const jobFields='id,source_id,source_row,company,title,district,occupation_code,occupation_name,experience,employment_type,employment_type_code,workdays,wage_type,wage_min,wage_max,wage_text,posted_at,deadline_date,deadline_kind,quality_status,conversion_verified,original_url';
async function api(request:Request,env:RuntimeEnv) {
  const url=new URL(request.url), p=url.searchParams, path=url.pathname;
  if(request.method!=='GET') return json({error:'읽기 전용 API입니다.'},405);
  const allowed: Record<string,string[]>={
    '/api/recommendations':['required','preferred','view','group','page','page_size'],
    '/api/job-occupations':['q','limit'],
    '/api/visualizations':['area'],
    '/api/health':[], '/api/sources':[], '/api/indicators':['metric'],
    '/api/districts':['period','district'], '/api/occupations':['period','classification'],
    '/api/jobs':['page','page_size','district','q','occupation','occupation_group','experience']
  };
  const keys=allowed[path]??(path.startsWith('/api/jobs/')?[]:null);
  if(!keys) return json({error:'존재하지 않는 API입니다.'},404);
  for(const [key] of p) if(!keys.includes(key)||p.getAll(key).length!==1) throw new InputError('지원하지 않거나 중복된 검색 조건입니다.');
  const sources=(await db(env,'data_sources',select('*',{order:'id.asc',limit:'20'}))).rows;
  const payload=(data:unknown,extra:Record<string,unknown>={})=>json({data,sources,...extra});
  if(path==='/api/health') {
    const check=await db(env,'jobs',select('id',{limit:'1'}),true);
    return payload({status:'ok',database:'connected',public_job_rows:check.total,stage:5,ui_verification_status:'chromium_viewports_verified',recommendation_status:'implemented_v1',unemployment_status:'pending_age'});
  }
  if(path==='/api/sources') return payload(sources);
  if(path==='/api/visualizations'){
    const area=p.get('area')??'capital';if(!['capital','districts'].includes(area))throw new InputError('시각화 범위를 확인해 주세요.');
    const kind=area as 'capital'|'districts',sourceId=kind==='capital'?CAPITAL_SOURCE:'districts';
    const rows=(await db(env,kind==='capital'?'youth_employment_stats':'district_youth_stats',select('*',{source_id:`eq.${sourceId}`,metric:'eq.employment_rate',order:'period.asc,region.asc',limit:kind==='capital'?'100':'300'}))).rows;
    const verified=verifiedVisualRows(kind,rows,sources.find(s=>s.id===sourceId));
    return json({data:verified?rows:[],sources:kind==='districts'?[...sources,boundaryMetadata]:sources,status:verified?'verified_metadata':'pending_revalidation',visualization_enabled:verified,area:kind,version:kind==='capital'?CAPITAL_SOURCE:'districts-verified-20261031',frequency:kind==='capital'?'quarterly':'halfyear',age_scope:'15~29세',unit:'%',message:verified?'실제 공공데이터 · 값과 출처 대조 통과':'자료 재검증 전 시각화를 보류합니다.'});
  }
  if(path==='/api/job-occupations') {
    const q=p.get('q')??'',limit=integer(p.get('limit'),50,1,50);
    if(q.length>80||/[\u0000-\u001f]/.test(q))throw new InputError('직종 검색어는 80자 이내로 입력해 주세요.');
    const matches=jobOccupationOptions.data.filter(o=>o.name.includes(q)||o.code.includes(q));
    const {data:_,...snapshot}=jobOccupationOptions;
    return payload(matches.slice(0,limit),{total:matches.length,limit,has_more:matches.length>limit,snapshot});
  }


  if(path==='/api/recommendations') {
    const required=parseConditions(p.get('required')),preferred=parseConditions(p.get('preferred'),true);
    const view=p.get('view')??'all',group=p.get('group')??'eligible';
    if(!['all','region','occupation'].includes(view)||!['eligible','needs_review'].includes(group)) throw new InputError('추천 결과 유형을 확인해 주세요.');
    const page=integer(p.get('page'),1,1,10000),size=integer(p.get('page_size'),20,1,50);
    const response=await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/compass_recommend_jobs`,{
      method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({required,preferred,view_name:view,result_group:group,page_number:page,page_size:size}),
      signal:AbortSignal.timeout(8000)
    });
    if(!response.ok){await response.body?.cancel();throw new Error('recommendation_unavailable');}
    const result=await response.json<Record<string,unknown>>();
    return json({...result,sources,recruitment_status:'스냅샷 · 실제 모집상태 미확인'});
  }

  if(path==='/api/indicators') {
    const metric=p.get('metric')??'employment_rate';
    if(!['employment_rate','unemployment_rate'].includes(metric)) throw new InputError('지원하지 않는 지표입니다.');
    if(metric==='unemployment_rate') return payload([],{status:'pending_age',message:'실업률 CSV의 원 표·연령 선택을 확인 중입니다.'});
    const rows=(await db(env,'youth_employment_stats',select('*',{source_id:'eq.employment',metric:`eq.${metric}`,order:'period.desc,region.asc',limit:'200'}))).rows;
    return payload(rows,employmentAnalysis(rows,sources.find(s=>s.id==='employment')));
  }
  if(path==='/api/districts') {
    const district=p.get('district'),period=p.get('period')??(district?null:'2026-H1');
    if(district!==null&&!districts.includes(district))throw new InputError('서울 자치구를 선택해 주세요.');
    if(period!==null&&!/^20\d{2}-H[12]$/.test(period))throw new InputError('반기 형식을 확인해 주세요.');
    const params=select('*',{source_id:'eq.districts',metric:'eq.employment_rate',order:district?'period.asc':'value.desc,region.asc',limit:'50'});
    if(period!==null)params.set('period',`eq.${period}`);
    if(district!==null)params.set('region',`eq.서울 ${district}`);
    const rows=(await db(env,'district_youth_stats',params)).rows;
    return payload(rows,{status:verifiedDistrictSubset(rows,sources.find(s=>s.id==='districts'))?'verified_metadata':'pending_metadata'});
  }
  if(path==='/api/occupations') {
    const period=p.get('period')??'2026-09', classification=p.get('classification')??'KECO2025';
    if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(period)||!['KECO2025','KSCO8'].includes(classification)) throw new InputError('기간 또는 직종 분류를 확인해 주세요.');
    const rows=(await db(env,'occupation_market_stats',select('*',{period:`eq.${period}`,classification:`eq.${classification}`,order:'occupation_name.asc',limit:'100'}))).rows;
    return payload(rows.map(r=>({...r,occupation_group:classification==='KECO2025'?occupationGroups.find(g=>g.name===r.occupation_name)?.code??null:null,ratio:Number(r.seeking)>0?Number(r.openings)/Number(r.seeking):null,ratio_missing_reason:Number(r.seeking)===0?'zero_denominator':null})),{unit:'신규구인인원(명) / 신규구직건수(건)',age_scope:'전체 연령',geography_basis:'등록 지방노동관서'});
  }
  if(path.startsWith('/api/jobs/')) {
    const id=decodeURIComponent(path.slice('/api/jobs/'.length));
    if(!/^job-[0-9a-f]{12}-\d+$/.test(id)) throw new InputError('공고 식별자를 확인해 주세요.');
    const rows=(await db(env,'jobs',select(jobFields,{id:`eq.${id}`,limit:'1'}))).rows;
    return rows.length?payload(rows[0],{recruitment_status:'미확인',direct_application_url_available:false}):json({error:'공고를 찾을 수 없습니다.'},404);
  }
  const page=integer(p.get('page'),1,1,10000),size=integer(p.get('page_size'),20,1,50);
  const params=select(jobFields,{order:'posted_at.desc,id.asc',limit:String(size),offset:String((page-1)*size)});
  const groupCode=p.get('occupation_group');let groupInfo:Record<string,unknown>|null=null;
  if(groupCode){
    const group=occupationGroups.find(g=>g.code===groupCode);if(!group)throw new InputError('검증된 직종 중분류를 선택해 주세요.');
    const mappings=(await db(env,'occupation_mappings',select('source_code',{source_id:'eq.jobs',source_system:'eq.placement_csv',source_version:'eq.not_recorded;exact_2025_pair_match',target_system:'eq.KECO',target_version:'eq.2025',target_code:`eq.${group.code}`,relation:'eq.hierarchy',verified_at:'not.is.null',evidence_url:'eq.https://statistics.keis.or.kr/keis/ko/proj/114/pblc/detail.do?categoryIdx=125&pubIdx=11319',limit:'500'}))).rows;
    const codes=[...new Set(mappings.map(r=>String(r.source_code)).filter(c=>/^\d{6}$/.test(c)))];
    if(codes.length)params.set('occupation_code',`in.(${codes.join(',')})`);else params.set('id','eq.no-verified-hierarchy');
    groupInfo={code:group.code,name:group.name,relation:'hierarchy',verified_leaf_codes:codes.length,coverage:'공식 코드·명칭이 검증된 일부 공고만 포함. 미검증 235쌍 제외.',recommendation_relation:false};
  }
  const district=p.get('district'); if(district) {if(!districts.includes(district))throw new InputError('서울 자치구를 선택해 주세요.');params.set('district',`eq.${district}`);}
  const occupation=p.get('occupation');if(occupation){if(!/^\d{6}$/.test(occupation))throw new InputError('6자리 원본 직종코드를 입력해 주세요.');if(params.has('occupation_code'))params.append('occupation_code',`eq.${occupation}`);else params.set('occupation_code',`eq.${occupation}`);}
  const experience=p.get('experience');if(experience){if(!['신입','경력','관계없음'].includes(experience))throw new InputError('경력 조건을 확인해 주세요.');params.set('experience',`eq.${experience}`);}
  const q=p.get('q');if(q){if(q.length>80||!/^[\p{L}\p{N}\s-]+$/u.test(q))throw new InputError('검색어는 문자·숫자·공백·하이픈으로 입력해 주세요.');params.set('title',`ilike.*${q}*`);}
  const result=await db(env,'jobs',params,true);
  return payload(result.rows,{total:result.total,page,page_size:size,score:null,occupation_group:groupInfo,message:'일반 검색입니다. 추천 점수·대안은 /api/recommendations에서 별도 조회합니다.',recruitment_status:'스냅샷 · 실제 모집상태 미확인'});
}
export default {
  async fetch(request:Request,env:RuntimeEnv):Promise<Response> {
    if(!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {return await api(request,env);} catch(e) {
      return e instanceof InputError||e instanceof RecommendationInputError?json({error:e.message},400):json({error:'데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);
    }
  }
} satisfies ExportedHandler<RuntimeEnv>;
