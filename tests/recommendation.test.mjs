import test from 'node:test';
import assert from 'node:assert/strict';
import {WEIGHTS,validateConditions,parseConditions,condition,evaluateJob,inAlternative} from '../worker/recommendation.ts';
import worker from '../worker/index.ts';
const job={id:'job-test',district:'강남구',occupation_code:'123456',employment_type_code:'10',experience:'신입',workdays:5,wage_type:'월급',wage_min:2500000,wage_max:3500000,posted_at:'2026-10-01'};
test('newly confirmed weights sum to 100',()=>{assert.deepEqual(WEIGHTS,{occupation:35,district:25,wage:20,workdays:10,employment_type:10});assert.equal(Object.values(WEIGHTS).reduce((a,b)=>a+b),100);});
test('criteria reject unknown fields, unsupported values, duplicates and malformed JSON',()=>{
 for(const c of [null,[],{district:[]},{district:['부산']},{district:['강남구','강남구']},{occupation:['12']},{workdays:[0]},{workdays:['5']},{employment_type:['정규직']},{wage:{type:'월급',minimum:0}},{wage:{type:'월급',minimum:3,extra:1}},{experience:['미상']},{score:100}])assert.throws(()=>validateConditions(c));
 assert.throws(()=>validateConditions({experience:['신입']},true));assert.throws(()=>parseConditions('{'));assert.deepEqual(parseConditions(null),{});
 assert.deepEqual(validateConditions({district:['강남구'],wage:{type:'연봉',minimum:30000000},workdays:[4,5],employment_type:['10']}),{district:['강남구'],wage:{type:'연봉',minimum:30000000},workdays:[4,5],employment_type:['10']});
});
test('required mismatch excludes before preferences; unknown required is isolated',()=>{
 const excluded=evaluateJob(job,{district:['중구']},{occupation:['123456']});assert.equal(excluded.eligibility,'excluded');assert.equal(excluded.confirmed_score,null);assert.deepEqual(excluded.preference_details,[]);
 assert.equal(evaluateJob({...job,workdays:null},{workdays:[5]},{}).eligibility,'needs_review');
 assert.equal(evaluateJob(job,{district:['강남구'],workdays:[5]},{}).eligibility,'eligible');
});
test('wages preserve units, boundaries, unknown caps, zero and range uncertainty',()=>{
 const w={type:'월급',minimum:3000000};
 assert.equal(condition(job,'wage',w).state,'unknown');
 assert.equal(condition({...job,wage_min:3000000},'wage',w).state,'match');
 assert.equal(condition({...job,wage_max:2999999},'wage',w).state,'mismatch');
 assert.equal(condition({...job,wage_max:3000000},'wage',w).state,'unknown');
 assert.equal(condition({...job,wage_min:3000000,wage_max:null},'wage',w).state,'match');
 assert.equal(condition({...job,wage_max:null},'wage',w).state,'unknown');
 assert.equal(condition({...job,wage_min:null},'wage',w).state,'unknown');
 assert.equal(condition({...job,wage_type:'연봉',wage_min:60000000,conversion_verified:true},'wage',w).reason,'wage_unit_not_comparable');
 assert.equal(condition({...job,workdays:0},'workdays',[5]).state,'mismatch');
});
test('unselected preferences are removed; no preference creates no score',()=>{
 assert.equal(evaluateJob(job,{},{}).confirmed_score,null);
 assert.equal(evaluateJob(job,{},{occupation:['123456']}).confirmed_score,100);
 assert.equal(evaluateJob(job,{},{occupation:['654321']}).confirmed_score,0);
 const r=evaluateJob(job,{},{occupation:['123456'],district:['중구']});assert.equal(r.confirmed_score,100*35/60);assert.equal(r.possible_score,r.confirmed_score);
});
test('unknown contributes only to possible maximum; exact known mismatch does not',()=>{
 const r=evaluateJob({...job,workdays:null},{},{occupation:['123456'],workdays:[5],district:['중구']});
 assert.equal(r.confirmed_score,50);assert.equal(r.possible_score,100*45/70);assert.equal(r.unknown_preferences,1);
 const all=evaluateJob({...job,workdays:null,employment_type_code:null},{},{workdays:[5],employment_type:['10']});assert.equal(all.confirmed_score,0);assert.equal(all.possible_score,100);
});
test('only supplied verified related codes receive half occupation points; required stays exact',()=>{
 const preferred={occupation:['654321']};assert.equal(evaluateJob(job,{},preferred).confirmed_score,0);
 assert.equal(evaluateJob(job,{},preferred,new Set(['123456'])).confirmed_score,50);
 assert.equal(evaluateJob(job,{occupation:['654321']},preferred,new Set(['123456'])).eligibility,'excluded');
});
test('alternative predicates retain desired occupation/district and require explicit preferences',()=>{
 const p={district:['중구'],occupation:['123456']};assert.equal(inAlternative(job,p,'region',new Set()),true);assert.equal(inAlternative(job,p,'occupation',new Set()),false);
 assert.equal(inAlternative({...job,district:'중구',occupation_code:'654321'},p,'occupation',new Set(['654321'])),true);
 assert.equal(inAlternative(job,{},'region',new Set()),false);
 // Required constraints are evaluated independently and cannot be relaxed by the alternative predicate.
 assert.equal(evaluateJob(job,{district:['중구']},p).eligibility,'excluded');
});
test('recommendation API validates input, sends bounded RPC and hides database failures',async(t)=>{
 const previous=globalThis.fetch; t.after(()=>{globalThis.fetch=previous;});
 const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test',ASSETS:{fetch:()=>new Response('asset')}};
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return Response.json(String(url).includes('data_sources')?[]:{data:[],total:0});};
 for(const query of ['preferred=bad','required=%5B%5D','group=excluded','view=unknown','page_size=51','preferred='+encodeURIComponent(JSON.stringify({wage:{type:'月給',minimum:1}}))])assert.equal((await worker.fetch(new Request('https://test/api/recommendations?'+query),env)).status,400,query);
 const r=await worker.fetch(new Request('https://test/api/recommendations?preferred='+encodeURIComponent(JSON.stringify({occupation:['123456']}))+'&page_size=3'),env);assert.equal(r.status,200);
 const rpc=calls.find(c=>c.url.includes('/rpc/'));assert.equal(rpc.options.method,'POST');assert.equal(JSON.parse(rpc.options.body).page_size,3);
 globalThis.fetch=async(url)=>String(url).includes('data_sources')?Response.json([]):new Response('secret db failure',{status:500});
 const failed=await worker.fetch(new Request('https://test/api/recommendations'),env);assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/secret db/);
});
