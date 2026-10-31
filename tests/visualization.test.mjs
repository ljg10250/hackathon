import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedVisualRows,CAPITAL_SOURCE} from '../worker/visualization.ts';
import {visualizationEvidence} from '../worker/visualizationEvidence.ts';
import {employmentInsight,districtInsight,occupationInsight,changeSentence} from '../web/insights.ts';
import {seoulMapData} from '../web/seoulMapData.ts';
import worker from '../worker/index.ts';

const source=kind=>({id:kind==='capital'?CAPITAL_SOURCE:'districts',table_id:kind==='capital'?'INH_1DA7015S':'INH_1ES3A03_A01S',unit:'%',age_scope:'15~29세',frequency:kind==='capital'?'quarterly':'halfyear',period:kind==='capital'?'2021-Q1~2026-Q3':'2021-H1~2026-H1',verification_status:'verified_metadata'});
const rows=kind=>visualizationEvidence[kind].map(r=>({...r,source_id:kind==='capital'?CAPITAL_SOURCE:'districts',metric:'employment_rate',age_scope:'15-29',verification_status:'verified_metadata'}));
test('visual data gate checks version, age, period, unit, duplicates and exact complete observations',()=>{
 for(const kind of ['capital','districts']){
  const r=rows(kind),s=source(kind);assert.equal(verifiedVisualRows(kind,r,s),true);
  for(const [field,value] of [['unit','천명'],['age_scope','19~34세'],['table_id','wrong'],['frequency','monthly'],['period','2026'],['verification_status','pending_metadata']])assert.equal(verifiedVisualRows(kind,r,{...s,[field]:value}),false);
  assert.equal(verifiedVisualRows(kind,r.slice(1),s),false);assert.equal(verifiedVisualRows(kind,[r[0],...r.slice(0,-1)],s),false);
  const changed=structuredClone(r);changed[0].value+=0.1;assert.equal(verifiedVisualRows(kind,changed,s),false);
 }
});
test('short insights describe level and change without fabricating missing data or causality',()=>{
 const base={period:'2026-Q3',seoul:47.1,national:44.1,gap_pp:3,seoul_yoy_pp:-2.7,national_yoy_pp:-1.2,missing_reason:null};
 assert.match(employmentInsight(base),/전국보다 3\.0%p 높습니다/);assert.match(employmentInsight(base),/서울의 하락 폭이 더/);
 assert.match(employmentInsight({...base,gap_pp:-2,seoul_yoy_pp:1,national_yoy_pp:2}),/2\.0%p 낮습니다/);
 assert.match(employmentInsight({...base,gap_pp:0}),/같습니다/);assert.match(employmentInsight({...base,gap_pp:null}),/확인되어야/);
 assert.match(changeSentence('서울',0),/같습니다/);assert.match(changeSentence('서울',null),/계산하지 않습니다/);
 assert.match(occupationInsight(10,0),/0건이므로/);assert.match(occupationInsight(1,2),/0\.500명/);
 const data=[{region:'서울 중구',period:'2025-H1',value:0},{region:'서울 중구',period:'2026-H1',value:0}];
 assert.match(districtInsight('서울 중구','2026-H1',data),/0\.0%/);assert.match(districtInsight('서울 없는구','2026-H1',data),/미확인/);
});
test('official map has exactly25 unique valid code/name/polygon paths, not circles or synthetic positions',()=>{
 assert.equal(seoulMapData.length,25);assert.equal(new Set(seoulMapData.map(g=>g.code)).size,25);
 const names=new Set(visualizationEvidence.districts.map(r=>r.region.replace('서울 ','')));assert.deepEqual(new Set(seoulMapData.map(g=>g.name)),names);
 for(const g of seoulMapData){assert.equal(g.code,g.stat_code+'0');assert.match(g.path,/^M[\d.,L Z]+Z$/);assert.ok(g.x>=0&&g.x<=860&&g.y>=0&&g.y<=720);}
});
test('new API isolates snapshots, rejects invalid scope and hides unverified data',async(t)=>{
 const old=globalThis.fetch;t.after(()=>{globalThis.fetch=old;});let kind='capital',corrupt=false;const calls=[];
 globalThis.fetch=async(url)=>{calls.push(new URL(url));const u=new URL(url);return Response.json(u.pathname.endsWith('data_sources')?[source(kind)]:corrupt?[]:rows(kind));};
 const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public',ASSETS:{fetch:async()=>new Response('asset')}};
 for(kind of ['capital','districts']){
  const r=await(await worker.fetch(new Request('https://test/api/visualizations?area='+kind),env)).json();assert.equal(r.visualization_enabled,true);assert.equal(r.data.length,kind==='capital'?92:275);assert.equal(calls.at(-1).searchParams.get('limit'),kind==='capital'?'100':'300');
 }
 corrupt=true;const held=await(await worker.fetch(new Request('https://test/api/visualizations?area=districts'),env)).json();assert.equal(held.visualization_enabled,false);assert.deepEqual(held.data,[]);
 for(const query of ['area=unknown','area=capital&area=districts','period=2026-Q3'])assert.equal((await worker.fetch(new Request('https://test/api/visualizations?'+query),env)).status,400);
});
