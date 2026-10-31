import test from 'node:test';
import assert from 'node:assert/strict';
import {compareEmployment,employmentAnalysis} from '../worker/employment.ts';
import {employmentEvidence} from '../worker/employmentEvidence.ts';
import worker from '../worker/index.ts';
const row=(region,period,value)=>({region,period,value,source_id:'employment',metric:'employment_rate',age_scope:'15-29',verification_status:'verified_metadata'});
test('same-quarter comparison, same-quarter YoY, no rate ratio and original precision',()=>{
 const r=compareEmployment([row('전국','2026-Q3',44.1),row('서울특별시','2025-Q3',49.8),row('전국','2025-Q3',45.3),row('서울특별시','2026-Q3',47.1)]);
 assert.deepEqual(r.map(x=>[x.period,x.gap_pp,x.seoul_yoy_pp,x.national_yoy_pp]),[['2025-Q3',4.5,null,null],['2026-Q3',3,-2.7,-1.2]]);
});
test('zero, missing counterpart and missing prior-year quarter remain distinct',()=>{
 const r=compareEmployment([row('서울특별시','2025-Q2',0),row('전국','2025-Q2',0),row('서울특별시','2026-Q1',30),row('전국','2026-Q1',null)]);
 assert.equal(r[0].gap_pp,0);assert.equal(r[0].seoul_yoy_pp,null);assert.equal(r[1].gap_pp,null);assert.equal(r[1].national,null);assert.equal(r[1].missing_reason,'unpaired_or_missing_observation');
 assert.throws(()=>compareEmployment([row('전국','2026-H1',30)]));
 assert.throws(()=>compareEmployment([row('전국','2026-Q1',30),row('전국','2026-Q1',30)]));
});
test('public comparison fails closed on metadata, age, value drift or duplicate rows',()=>{
 const rows=employmentEvidence.observations.map(r=>row(r.region,r.period,r.value));
 const source={table_id:'INH_1DA7015S',verification_status:'verified_metadata',frequency:'quarterly',unit:'%',age_scope:'15~29세',period:'2021-Q1~2026-Q3'};
 assert.equal(employmentAnalysis(rows,source).comparison_enabled,true);
 for(const bad of [{...source,table_id:null},{...source,verification_status:'pending_metadata'},{...source,frequency:'halfyear'},{...source,unit:'명'},{...source,age_scope:'19~34세'},{...source,period:'2025-Q1~2026-Q3'}])assert.equal(employmentAnalysis(rows,bad).comparison_enabled,false);
 for(const field of ['age_scope','value','period','verification_status']){const copy=structuredClone(rows);copy[0][field]=field==='value'?1:'changed';assert.deepEqual(employmentAnalysis(copy,source).comparison,[]);}
 assert.equal(employmentAnalysis([...rows,rows[0]],source).comparison_enabled,false);
});
test('occupation group API uses verified hierarchy only, exact filter intersection and bounded pages',async(t)=>{
 const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});const calls=[];
 globalThis.fetch=async(url)=>{const u=new URL(url);calls.push(u);return Response.json(u.pathname.endsWith('/occupation_mappings')?[{source_code:'026103'},{source_code:'026104'}]:[],{headers:{'Content-Range':'0-0/0'}});};
 const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public',ASSETS:{fetch:async()=>new Response('asset')}};
 const result=await(await worker.fetch(new Request('https://test/api/jobs?occupation_group=02&occupation=026103&page=2&page_size=10'),env)).json();
 assert.equal(result.occupation_group.relation,'hierarchy');assert.equal(result.occupation_group.recommendation_relation,false);assert.equal(result.occupation_group.verified_leaf_codes,2);
 const mapping=calls.find(u=>u.pathname.endsWith('/occupation_mappings')).searchParams;
 for(const [k,v] of Object.entries({relation:'eq.hierarchy',target_version:'eq.2025',target_system:'eq.KECO',target_code:'eq.02',source_system:'eq.placement_csv',verified_at:'not.is.null'}))assert.equal(mapping.get(k),v);
 const jobs=calls.find(u=>u.pathname.endsWith('/jobs')).searchParams;assert.deepEqual(jobs.getAll('occupation_code'),['in.(026103,026104)','eq.026103']);assert.equal(jobs.get('limit'),'10');assert.equal(jobs.get('offset'),'10');
 globalThis.fetch=async(url)=>{calls.push(new URL(url));return Response.json([],{headers:{'Content-Range':'*/0'}});};
 const empty=await(await worker.fetch(new Request('https://test/api/jobs?occupation_group=25'),env)).json();assert.equal(empty.total,0);assert.equal(calls.at(-1).searchParams.get('id'),'eq.no-verified-hierarchy');
 assert.equal((await worker.fetch(new Request('https://test/api/jobs?occupation_group='),env)).status,200);
 for(const v of ['99','2','02,03','02&occupation_group=03'])assert.equal((await worker.fetch(new Request('https://test/api/jobs?occupation_group='+v),env)).status,400);
});
