import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {seoulMapData} from '../web/seoulMapData.ts';
const base=process.argv[2]??'https://seoul-youth-job-compass.ljg10250000.workers.dev',out=process.argv[3]??`reports/visualization_demo_${Date.now()}.json`,calls=[];
async function get(path){const at=new Date().toISOString(),r=await fetch(base+path,{signal:AbortSignal.timeout(20000)}),body=await r.json();assert.equal(r.status,200);calls.push({url:base+path,requested_at:at,status:r.status,response:body});return body;}
const old=await get('/api/indicators'),capital=await get('/api/visualizations?area=capital'),districts=await get('/api/visualizations?area=districts');
assert.equal(old.data.length,46);assert.equal(old.comparison_enabled,true);assert.equal(capital.data.length,92);assert.equal(districts.data.length,275);assert.equal(seoulMapData.length,25);
const value=(p,r,t)=>p.data.find(x=>x.region===r&&x.period===t).value,diff=(a,b)=>Number((a-b).toFixed(1));
const calculations={seoul_national_gap:{period:'2026-Q3',seoul:value(capital,'서울특별시','2026-Q3'),national:value(capital,'전국','2026-Q3'),unit:'%p',formula:'서울 − 전국'},gangnam_yoy:{period:'2026-H1',current:value(districts,'서울 강남구','2026-H1'),previous:value(districts,'서울 강남구','2025-H1'),unit:'%p',formula:'해당 반기 − 전년 같은 반기'}};
calculations.seoul_national_gap.result=diff(calculations.seoul_national_gap.seoul,calculations.seoul_national_gap.national);calculations.gangnam_yoy.result=diff(calculations.gangnam_yoy.current,calculations.gangnam_yoy.previous);
assert.equal(calculations.seoul_national_gap.result,3);assert.equal(calculations.gangnam_yoy.result,-3.8);
await writeFile(out,JSON.stringify({verified_at:new Date().toISOString(),base,calls,calculations,map_features:25,note:'Real own API calls; original46 preserved; quarters and half-years kept separate. SVG uses verified official boundary; no employment probability.'},null,2),{flag:'wx'});console.log(JSON.stringify({out,calls:3,calculations_verified:2}));
