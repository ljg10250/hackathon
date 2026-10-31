// Independent snapshot -> actual HTTP checks for comparison and hierarchy browsing.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.argv[2]??'http://127.0.0.1:8787',out=process.argv[3]??`reports/comparison_${Date.now()}.json`,checks=[];
const read=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
async function get(path,status=200){const r=await fetch(base+path,{signal:AbortSignal.timeout(20000)});const b=await r.json();assert.equal(r.status,status,path);checks.push({path,status:r.status,passed:true});return b;}
const payload=await get('/api/indicators'),source=payload.sources.find(s=>s.id==='employment');
assert.equal(payload.comparison_enabled,true);assert.equal(source.table_id,'INH_1DA7015S');assert.equal(source.verification_status,'verified_metadata');assert.equal(source.retrieved_at,null);assert.equal(payload.data.length,46);assert.equal(payload.comparison.length,23);
const official=await read('data/metadata/kosis_employment_20261031.json');
const value=(code,period)=>{const r=official.observations.find(o=>o.C1===code&&o.PRD_DE===period.replace('-Q','0'));return r?Number(r.DT):null;};
const diff=(a,b)=>a===null||b===null?null:Number((a-b).toFixed(1));
for(const r of payload.comparison){const prev=(Number(r.period.slice(0,4))-1)+r.period.slice(4),s=value('11',r.period),n=value('00',r.period);assert.deepEqual(r,{period:r.period,seoul:s,national:n,gap_pp:diff(s,n),seoul_yoy_pp:diff(s,value('11',prev)),national_yoy_pp:diff(n,value('00',prev)),missing_reason:null});}
assert.deepEqual(payload.comparison.at(-1),{period:'2026-Q3',seoul:47.1,national:44.1,gap_pp:3,seoul_yoy_pp:-2.7,national_yoy_pp:-1.2,missing_reason:null});
checks.push({name:'23 paired quarters / independent official values and formulas',passed:true});
const held=await get('/api/indicators?metric=unemployment_rate');assert.equal(held.status,'pending_age');assert.deepEqual(held.data,[]);
const jobs=(await read('data/processed/jobs.json')).filter(j=>j.quality_status!=='quarantined'),mappings=await read('data/processed/occupation_mappings.json'),groups=(await read('data/metadata/occupation_groups_2025.json')).groups;
const market=await get('/api/occupations');assert.equal(market.data.length,35);
for(const r of market.data)assert.equal(r.occupation_group,groups.find(g=>g.name===r.occupation_name).code);
const totals=[];
// At most two concurrent requests; every group, including genuinely empty groups.
for(let i=0;i<groups.length;i+=2)await Promise.all(groups.slice(i,i+2).map(async g=>{
 const codes=new Set(mappings.filter(m=>m.target_code===g.code&&m.relation==='hierarchy').map(m=>m.source_code));
 const expected=jobs.filter(j=>codes.has(j.occupation_code));
 const b=await get('/api/jobs?'+new URLSearchParams({occupation_group:g.code,page_size:'1'}));
 assert.equal(b.total,expected.length,g.name);assert.equal(b.occupation_group.recommendation_relation,false);assert.equal(b.score,null);assert.ok(b.data.every(j=>codes.has(j.occupation_code)));totals.push({code:g.code,name:g.name,total:b.total});
}));
assert.equal(totals.reduce((n,r)=>n+r.total,0),jobs.filter(j=>mappings.some(m=>m.source_code===j.occupation_code)).length);
const chosen=await get('/api/jobs?occupation_group=02&page_size=10&page=2');assert.ok(chosen.data.length>0);
const code=chosen.data[0].occupation_code;
const intersect=await get('/api/jobs?'+new URLSearchParams({occupation_group:'02',occupation:code,district:chosen.data[0].district,page_size:'50'}));
assert.ok(intersect.data.length>0);assert.ok(intersect.data.every(j=>j.occupation_code===code&&j.district===chosen.data[0].district));
const outside=jobs.find(j=>!mappings.some(m=>m.target_code==='02'&&m.source_code===j.occupation_code)).occupation_code;
assert.equal((await get('/api/jobs?occupation_group=02&occupation='+outside)).total,0);
for(const query of ['occupation_group=99','occupation_group=02&occupation_group=03'])await get('/api/jobs?'+query,400);
await writeFile(out,JSON.stringify({base,verified_at:new Date().toISOString(),checks,group_totals:totals.sort((a,b)=>a.code.localeCompare(b.code)),latest:payload.comparison.at(-1),passed:checks.length},null,2),{flag:'wx'});
console.log(JSON.stringify({out,passed:checks.length,groups:totals.length,verified_group_job_rows:totals.reduce((n,r)=>n+r.total,0)}));
