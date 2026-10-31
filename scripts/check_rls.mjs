import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const env=JSON.parse(await readFile('wrangler.jsonc','utf8')).vars;
try { Object.assign(env,Object.fromEntries((await readFile('.dev.vars','utf8')).trim().split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}))); } catch(e) { if(e.code!=='ENOENT')throw e; }
const base=env.SUPABASE_URL+'/rest/v1/',headers={apikey:env.SUPABASE_PUBLISHABLE_KEY};
const reportPath=process.argv[2]??`reports/resume_rls_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
const checks=[];
async function get(path){const r=await fetch(base+path,{headers});const data=await r.json();assert.equal(r.status,200,path);checks.push({path,status:r.status,rows:data.length});return data;}
assert.equal((await get('jobs?select=id&source_row=eq.596')).length,0);
assert.equal((await get('jobs?select=id&quality_status=eq.quarantined')).length,0);
assert.equal((await get('youth_employment_stats?select=value&metric=eq.unemployment_rate')).length,0);
assert.equal((await get('youth_employment_stats?select=value&metric=eq.employment_rate&source_id=eq.employment')).length,46);
assert.equal((await get('youth_employment_stats?select=value&metric=eq.employment_rate&source_id=eq.capital-employment-20261031-v1')).length,92);
const privateRead=await fetch(base+'data_imports?select=*',{headers});assert.ok([401,403].includes(privateRead.status));checks.push({path:'data_imports',status:privateRead.status});
const write=await fetch(base+'data_sources',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:'__forbidden_write_probe__'})});assert.ok([401,403].includes(write.status));checks.push({path:'data_sources POST',status:write.status});
await writeFile(reportPath,JSON.stringify({verified_at:new Date().toISOString(),checks},null,2));console.log(JSON.stringify({report:reportPath,passed:checks.length}));
