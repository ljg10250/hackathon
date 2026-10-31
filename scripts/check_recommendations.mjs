import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {evaluateJob,inAlternative,WEIGHTS} from '../worker/recommendation.ts';
const base=process.argv[2]??'http://127.0.0.1:8787';
const report=process.argv[3]??`reports/recommendations_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
const jobs=JSON.parse(await readFile('data/processed/jobs.json','utf8')).filter(j=>j.quality_status!=='quarantined');
const ref=jobs.find(j=>j.workdays===5&&j.wage_type==='월급');
const other=ref.district==='중구'?'강남구':'중구';
const checks=[];
const cases=[
 {name:'no preferences'},
 {name:'occupation only',preferred:{occupation:[ref.occupation_code]}},
 {name:'all five weights',preferred:{occupation:[ref.occupation_code],district:[ref.district],wage:{type:'월급',minimum:3000000},workdays:[5],employment_type:['10']}},
 {name:'missing workdays eligible',required:{workdays:[5]},preferred:{occupation:[ref.occupation_code],workdays:[5]}},
 {name:'missing workdays separate',required:{workdays:[5]},preferred:{occupation:[ref.occupation_code],workdays:[5]},group:'needs_review'},
 {name:'wage range required',required:{wage:{type:'월급',minimum:3000000}},preferred:{district:[ref.district]}},
 {name:'wage unit/range unknown separate',required:{wage:{type:'월급',minimum:3000000}},preferred:{district:[ref.district]},group:'needs_review'},
 {name:'combined required filters',required:{district:[ref.district],occupation:[ref.occupation_code],employment_type:['10'],experience:['신입','관계없음']},preferred:{wage:{type:'월급',minimum:3000000},workdays:[5]}},
 {name:'region alternative exact occupation',preferred:{district:[other],occupation:[ref.occupation_code]},view:'region'},
 {name:'region cannot relax required district',required:{district:[other]},preferred:{district:[other],occupation:[ref.occupation_code]},view:'region'},
 {name:'region cannot relax required occupation',required:{occupation:['000000']},preferred:{district:[other],occupation:[ref.occupation_code]},view:'region'},
 {name:'related zero remains empty',preferred:{district:[ref.district],occupation:[ref.occupation_code]},view:'occupation'},
 {name:'alternative missing preference remains empty',preferred:{district:[ref.district]},view:'region'},
 {name:'second page after global sorting',preferred:{occupation:[ref.occupation_code],workdays:[5]},page:2},
 {name:'beyond last page keeps total',page:9999},
];
function compare(a,b){return (b.evaluation.confirmed_score??-1)-(a.evaluation.confirmed_score??-1)||a.evaluation.unknown_preferences-b.evaluation.unknown_preferences||(a.job.posted_at===b.job.posted_at?0:a.job.posted_at>b.job.posted_at?-1:1)||(a.job.id===b.job.id?0:a.job.id<b.job.id?-1:1);}
for(const c of cases){
 const required=c.required??{},preferred=c.preferred??{},view=c.view??'all',group=c.group??'eligible',page=c.page??1,size=20;
 const rows=jobs.filter(j=>inAlternative(j,preferred,view,new Set())).map(job=>({job,evaluation:evaluateJob(job,required,preferred)}));
 const counts={eligible:rows.filter(r=>r.evaluation.eligibility==='eligible').length,needs_review:rows.filter(r=>r.evaluation.eligibility==='needs_review').length};
 const sorted=rows.filter(r=>r.evaluation.eligibility===group).sort(compare);
 const expected=sorted.slice((page-1)*size,page*size);
 const p=new URLSearchParams({required:JSON.stringify(required),preferred:JSON.stringify(preferred),view,group,page:String(page),page_size:String(size)});
 const start=performance.now();const r=await fetch(base+'/api/recommendations?'+p,{signal:AbortSignal.timeout(20000)});const payload=await r.json();
 assert.equal(r.status,200,c.name+': '+JSON.stringify(payload));assert.equal(payload.total,sorted.length,c.name);assert.deepEqual(payload.counts,counts,c.name);
 assert.deepEqual(payload.weights,WEIGHTS);assert.deepEqual(payload.data.map(j=>j.id),expected.map(r=>r.job.id),c.name);
 assert.equal(new Set(payload.data.map(j=>j.id)).size,payload.data.length);assert.equal(payload.related_relation_count,0);
 for(let i=0;i<expected.length;i++){
  const got=payload.data[i].recommendation,want=expected[i].evaluation;
  assert.equal(got.eligibility,want.eligibility);assert.equal(got.unknown_preferences,want.unknown_preferences);
  for(const k of ['confirmed_score','possible_score'])want[k]===null?assert.equal(got[k],null):assert.ok(Math.abs(got[k]-want[k])<1e-10,c.name+': '+k);
  for(const k of ['required_details','preference_details'])assert.deepEqual([...got[k]].map(({weight,...d})=>d).sort((a,b)=>a.field.localeCompare(b.field)),[...want[k]].sort((a,b)=>a.field.localeCompare(b.field)));
  assert.notEqual(payload.data[i].quality_status,'quarantined');
 }
 assert.ok(Array.isArray(payload.sources));
 const sourceIds=new Set(payload.sources.map(s=>s.id));assert.equal(sourceIds.size,payload.sources.length);
 for(const id of ['jobs','employment','unemployment','districts','market','mapping'])assert.ok(sourceIds.has(id),'Required source '+id);
 for(const source of payload.sources)for(const k of ['source','source_url','table_id','period','frequency','age_scope','unit','geography_basis','retrieved_at','verification_status'])assert.ok(k in source,k);
 if(c.name==='related zero remains empty')assert.equal(payload.alternative_status,'no_verified_related_occupations');
 checks.push({name:c.name,total:payload.total,counts,rows:payload.data.length,elapsed_ms:Math.round(performance.now()-start)});
}
const config=JSON.parse(await readFile('wrangler.jsonc','utf8')).vars;
async function rpc(name,body,status=200){const r=await fetch(config.SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:config.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});assert.equal(r.status,status,await r.clone().text());return r.json();}
const fixtures=[
 {name:'exact occupation',j:ref,required:{},preferred:{occupation:[ref.occupation_code]}},
 {name:'synthetic verified related calculation',j:{...ref,occupation_code:'123456'},required:{},preferred:{occupation:['654321']},related_codes:['123456']},
 {name:'related never bypasses required',j:{...ref,occupation_code:'123456'},required:{occupation:['654321']},preferred:{occupation:['654321']},related_codes:['123456']},
 {name:'unknown upper cap',j:{...ref,wage_min:2500000,wage_max:null},required:{},preferred:{wage:{type:'월급',minimum:3000000}}},
 {name:'zero is not missing',j:{...ref,workdays:0},required:{},preferred:{workdays:[5]}},
 {name:'unrounded score retained',j:ref,required:{},preferred:{occupation:[ref.occupation_code],district:[other]}}
];
for(const c of fixtures){const {name,...body}=c;body.related_codes??=[];const got=await rpc('compass_evaluate_job',body),expected=evaluateJob(body.j,body.required,body.preferred,new Set(body.related_codes));for(const k of ['eligibility','unknown_preferences'])assert.equal(got[k],expected[k]);for(const k of ['confirmed_score','possible_score'])expected[k]===null?assert.equal(got[k],null):assert.ok(Math.abs(got[k]-expected[k])<1e-10);checks.push({name:'DB fixture: '+name});}
for(const body of [{page_size:51},{required:null},{preferred:{workdays:[0]}},{preferred:{experience:['신입']}},{required:{district:['부산']}},{preferred:{occupation:['123456','123456']}}]){await rpc('compass_recommend_jobs',body,400);checks.push({name:'direct RPC validation',body});}
await writeFile(report,JSON.stringify({base,verified_at:new Date().toISOString(),weights:WEIGHTS,checks,passed:checks.length},null,2));
console.log(JSON.stringify({report,passed:checks.length,public_jobs:jobs.length}));
