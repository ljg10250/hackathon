import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.argv[2]??'http://127.0.0.1:8787';
const reportPath=process.argv[3]??`reports/resume_http_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
const checks=[];
async function get(path,status=200){const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});assert.equal(r.status,status,path);const body=await r.json();checks.push({path,status:r.status,rows:Array.isArray(body.data)?body.data.length:undefined,total:body.total});return body;}
const health=await get('/api/health');assert.equal(health.data.database,'connected');
assert.equal(health.data.public_job_rows,10743);
const jobs=await get('/api/jobs?district=강남구&page_size=3');assert.equal(jobs.data.length,3);assert.ok(jobs.data.every(j=>j.district==='강남구'&&j.quality_status!=='quarantined'));assert.equal(jobs.score,null);
const detail=await get('/api/jobs/'+jobs.data[0].id);assert.equal(detail.data.id,jobs.data[0].id);assert.equal(detail.data.original_url,null);
assert.equal((await get('/api/indicators')).data.length,46);
assert.equal((await get('/api/indicators?metric=unemployment_rate')).data.length,0);
assert.equal((await get('/api/districts')).data.length,25);
const market=await get('/api/occupations');assert.equal(market.data.length,35);assert.equal(market.data.reduce((s,r)=>s+r.openings,0),18299);assert.equal(market.data.reduce((s,r)=>s+r.seeking,0),59668);
await get('/api/jobs?page_size=999',400);await get('/api/jobs?district=부산',400);await get('/api/unknown',404);
const empty=await get('/api/jobs?q=존재하지않는공고검증문구');assert.equal(empty.total,0);
await get('/api/jobs?page=9999');
for(const path of ['/','/districts','/occupations','/jobs','/jobs/'+jobs.data[0].id]){const r=await fetch(base+path,{headers:{'Sec-Fetch-Mode':'navigate'}});assert.equal(r.status,200);assert.match(await r.text(),/<div id="root">/);checks.push({path,status:r.status});}
await writeFile(reportPath,JSON.stringify({base,verified_at:new Date().toISOString(),checks},null,2));console.log(JSON.stringify({report:reportPath,passed:checks.length,health:health.data}));
