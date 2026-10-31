import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{integer} from '../worker/index.ts';
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-test-key',ASSETS:{fetch:async()=>new Response('asset')}};
test('pagination rejects invalid values',()=>{assert.equal(integer(null,20,1,50),20);for(const value of ['0','-1','NaN','51','1.5'])assert.throws(()=>integer(value,20,1,50));});
test('API validation, private rows and database failure',async(t)=>{
 const old=globalThis.fetch; let calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push(String(url));assert.equal(opts.headers.apikey,'public-test-key');return Response.json(String(url).includes('data_sources')?[{id:'jobs'}]:[],{headers:{'Content-Range':'0-0/0'}});};
 t.after(()=>{globalThis.fetch=old});
 for(const path of ['/api/jobs?page=0','/api/jobs?page_size=100','/api/jobs?district=부산','/api/jobs?x=1','/api/jobs?page=1&page=2','/api/jobs?occupation=123','/api/jobs?q=%25','/api/occupations?classification=bogus','/api/districts?period=2026-1']){
  const r=await worker.fetch(new Request('https://test'+path),env);assert.equal(r.status,400,path);
 }
 assert.equal((await worker.fetch(new Request('https://test/api/unknown'),env)).status,404);
 assert.equal((await worker.fetch(new Request('https://test/api/jobs',{method:'POST'}),env)).status,405);
 calls=[];
 const held=await (await worker.fetch(new Request('https://test/api/indicators?metric=unemployment_rate'),env)).json();
 assert.equal(held.status,'pending_age');assert.deepEqual(held.data,[]);assert.equal(calls.length,1);
 const result=await(await worker.fetch(new Request('https://test/api/jobs?district=강남구'),env)).json();
 assert.equal(result.score,null);assert.equal(result.total,0);assert.equal(calls.some(u=>u.includes('district=eq.')),true);
 globalThis.fetch=async(url)=>{
  const u=new URL(url);
  if(u.pathname.includes('data_sources'))return Response.json([]);
  if(Number(u.searchParams.get('offset'))>0)return Response.json({code:'PGRST103'},{status:416});
  return Response.json([{id:'one'}],{headers:{'Content-Range':'0-0/1'}});
 };
 const beyond=await worker.fetch(new Request('https://test/api/jobs?page=9999'),env);assert.equal(beyond.status,200);const emptyPage=await beyond.json();assert.equal(emptyPage.total,1);assert.deepEqual(emptyPage.data,[]);
 globalThis.fetch=async(url)=>Response.json(String(url).includes('occupation_market_stats')?[{seeking:0,openings:2}]:[]);
 const zero=await(await worker.fetch(new Request('https://test/api/occupations'),env)).json();assert.equal(zero.data[0].ratio,null);assert.equal(zero.data[0].ratio_missing_reason,'zero_denominator');
 globalThis.fetch=async()=>new Response('private upstream error',{status:500});
 const failed=await worker.fetch(new Request('https://test/api/jobs'),env);assert.equal(failed.status,503);assert.equal((await failed.text()).includes('private upstream'),false);
});
test('assets route stays separate from API',async()=>{assert.equal(await(await worker.fetch(new Request('https://test/jobs'),env)).text(),'asset')});
