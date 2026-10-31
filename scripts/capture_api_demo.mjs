// Real calls to this project's own processed-data API. No credentials needed or stored.
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {evaluateJob} from '../worker/recommendation.ts';
const base=process.argv[2]??'https://seoul-youth-job-compass.ljg10250000.workers.dev';
const output=process.argv[3]??`reports/api_demo_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
const calls=[];
async function get(name,path){const at=new Date().toISOString(),start=performance.now(),response=await fetch(base+path,{signal:AbortSignal.timeout(15000)}),body=await response.json();assert.equal(response.status,200,name);calls.push({name,requested_at:at,method:'GET',url:base+path,status:response.status,elapsed_ms:Math.round(performance.now()-start),response_headers:{'content-type':response.headers.get('content-type'),'cache-control':response.headers.get('cache-control')},response:body});return body;}
const health=await get('실제 DB 연결과 공개 공고 수','/api/health');assert.equal(health.data.database,'connected');assert.equal(health.data.public_job_rows,10743);
const market=await get('KECO2025 등록 관서별 직종 수급 가공','/api/occupations');const row=market.data[0];const ratio=row.seeking===0?null:row.openings/row.seeking;assert.equal(row.ratio,ratio);
const jobs=await get('실제 서울 공고의 원본 직종 선택','/api/jobs?'+new URLSearchParams({district:'강남구',page_size:'1'}));const job=jobs.data[0];assert.ok(job.id);
const required={workdays:[5]},preferred={occupation:[job.occupation_code],district:['강남구'],wage:{type:'월급',minimum:3000000},workdays:[5],employment_type:['10']};
const query=new URLSearchParams({required:JSON.stringify(required),preferred:JSON.stringify(preferred),page_size:'3'});
const recommended=await get('필수 조건·선호 비례 환산·점수 범위','/api/recommendations?'+query);assert.ok(recommended.data.length);
const expected=evaluateJob(recommended.data[0],required,preferred),actual=recommended.data[0].recommendation;
assert.equal(expected.eligibility,'eligible');for(const k of ['confirmed_score','possible_score'])assert.ok(Math.abs(expected[k]-actual[k])<1e-10,k);
query.set('group','needs_review');const unknown=await get('필수 미확인 분리','/api/recommendations?'+query);assert.ok(unknown.data.length);assert.ok(unknown.data.every(r=>r.recommendation.eligibility==='needs_review'));
const alternatives=await get('검증된 관련 직종0개 보류','/api/recommendations?'+new URLSearchParams({preferred:JSON.stringify(preferred),view:'occupation',page_size:'3'}));assert.deepEqual(alternatives.data,[]);assert.equal(alternatives.alternative_status,'no_verified_related_occupations');
const result={verified_at:new Date().toISOString(),timezone:'Asia/Seoul',base,calls,
 calculations:{occupation_ratio:{source_id:row.source_id,period:row.period,classification:row.classification,occupation_name:row.occupation_name,openings_persons:row.openings,seeking_cases:row.seeking,formula:'구인인원(명) / 구직건수(건)',expected:ratio,actual:row.ratio,unit:'명/건',age_scope:market.age_scope,geography_basis:market.geography_basis},recommendation:{request:{required,preferred},job_id:recommended.data[0].id,source_id:recommended.data[0].source_id,source_row:recommended.data[0].source_row,formula:'100 × 확인된 선호 가중치 / 선택한 선호 가중치; 미확인은 가능한 최대에만 더함',independent_calculation:expected,database_calculation:actual}},
 scope:'Real public snapshots and own API calls. No employment probability, fabricated related links, or competition bonus award claim.'};
await writeFile(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,calls:calls.length,calculations_verified:2}));
