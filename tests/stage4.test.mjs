import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import worker from '../worker/index.ts';
import {jobOccupationOptions} from '../worker/jobOccupationOptions.ts';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-test-key',ASSETS:{fetch:async()=>new Response('asset')}};
test('district history is bounded and preserves half-year/region filters',async(t)=>{
 const old=globalThis.fetch,calls=[];t.after(()=>{globalThis.fetch=old;});
 globalThis.fetch=async(url)=>{calls.push(new URL(url));return Response.json([]);};
 assert.equal((await worker.fetch(new Request('https://test/api/districts?district='+encodeURIComponent('강남구')),env)).status,200);
 const query=calls.at(-1).searchParams;assert.equal(query.get('region'),'eq.서울 강남구');assert.equal(query.has('period'),false);assert.equal(query.get('limit'),'50');assert.equal(query.get('order'),'period.asc');
 await worker.fetch(new Request('https://test/api/districts?district='+encodeURIComponent('중구')+'&period=2021-H1'),env);assert.equal(calls.at(-1).searchParams.get('period'),'eq.2021-H1');
 for(const path of ['/api/districts?district=','/api/districts?district=부산','/api/districts?period=2021-Q1','/api/districts?district=강남구&district=중구'])assert.equal((await worker.fetch(new Request('https://test'+path),env)).status,400,path);
});
test('occupation choices expose raw snapshot labels, bounded search, no related links',async(t)=>{
 const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});globalThis.fetch=async()=>Response.json([]);
 const all=await(await worker.fetch(new Request('https://test/api/job-occupations'),env)).json();assert.equal(all.total,558);assert.equal(all.data.length,50);assert.equal(all.has_more,true);assert.equal(all.snapshot.snapshot_public_job_rows,10743);assert.match(all.snapshot.verification_status,/official_mapping_partial/);
 const selected=jobOccupationOptions.data[200];
 const exact=await(await worker.fetch(new Request('https://test/api/job-occupations?q='+selected.code),env)).json();assert.deepEqual(exact.data,[selected]);
 const missing=await(await worker.fetch(new Request('https://test/api/job-occupations?q=없는직종검사문구'),env)).json();assert.deepEqual(missing.data,[]);assert.equal(missing.total,0);
 for(const q of ['limit=51','limit=0','q='+encodeURIComponent('x'.repeat(81)),'q=%00','q=a&q=b'])assert.equal((await worker.fetch(new Request('https://test/api/job-occupations?'+q),env)).status,400,q);
 assert.ok(all.data.every(o=>Object.keys(o).sort().join(',')==='code,name'));
});
test('choice artifact exactly matches public snapshot and records input hash',async()=>{
 const bytes=await readFile(new URL('../data/processed/jobs.json',import.meta.url));const rows=JSON.parse(bytes).filter(j=>j.quality_status!=='quarantined');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),jobOccupationOptions.input_sha256);
 assert.equal(rows.length,jobOccupationOptions.snapshot_public_job_rows);
 const pairs=[...new Map(rows.map(j=>[j.occupation_code+'|'+j.occupation_name,{code:j.occupation_code,name:j.occupation_name}])).values()].sort((a,b)=>a.code.localeCompare(b.code));
 assert.deepEqual(jobOccupationOptions.data,pairs);assert.equal(new Set(pairs.map(o=>o.code)).size,pairs.length);
});
