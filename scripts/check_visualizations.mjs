import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const base=process.argv[2]??'http://127.0.0.1:8787',out=process.argv[3]??`reports/visualization_http_${Date.now()}.json`,checks=[];
async function get(path,status=200){const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)}),b=await r.json();assert.equal(r.status,status,path);checks.push({path,status:r.status,passed:true});return b;}
const capital=await get('/api/visualizations?area=capital'),districts=await get('/api/visualizations?area=districts');
assert.equal(capital.visualization_enabled,true);assert.equal(capital.data.length,92);assert.equal(districts.visualization_enabled,true);assert.equal(districts.data.length,275);
const raw=JSON.parse(await readFile('data/metadata/kosis_employment_20261031.json','utf8')),districtRaw=JSON.parse(await readFile('data/metadata/kosis_districts_20261031.json','utf8'));
const codes={'전국':'00','서울특별시':'11','경기도':'31','인천광역시':'23'};
for(const row of capital.data){const official=raw.observations.find(r=>r.C1===codes[row.region]&&r.PRD_DE===row.period.replace('-Q','0'));assert.ok(official);assert.equal(row.value,Number(official.DT));assert.equal(row.age_scope,'15-29');}
for(const row of districts.data){const official=districtRaw.observations.find(r=>r.C1_NM===row.region&&r.PRD_DE===row.period.replace('-H','0'));assert.ok(official);assert.equal(row.value,Number(official.DT));assert.equal(row.verification_status,'verified_metadata');}
checks.push({name:'all92 capital and275 district observations vs independent official responses',passed:true});
for(const payload of [capital,districts])for(const s of payload.sources)for(const key of ['source','source_url','table_id','period','frequency','age_scope','unit','geography_basis','retrieved_at','verification_status'])assert.ok(key in s,key);
const indicators=await get('/api/indicators');assert.equal(indicators.data.length,46);assert.equal(indicators.comparison_enabled,true);assert.equal(indicators.comparison.at(-1).gap_pp,3);
const oldDistrict=await get('/api/districts');assert.equal(oldDistrict.data.length,25);assert.equal(oldDistrict.status,'verified_metadata');
const hidden=await get('/api/indicators?metric=unemployment_rate');assert.deepEqual(hidden.data,[]);
for(const q of ['area=unknown','area=capital&area=districts','period=2026-Q3'])await get('/api/visualizations?'+q,400);
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const visual=await server.ssrLoadModule('/web/Visualizations.tsx'),pages=await server.ssrLoadModule('/web/pages.tsx');
 const render=(name,c,p,verify)=>{const html=renderToStaticMarkup(createElement(c,p));assert.doesNotMatch(html,/NaN|undefined|\[object Object\]/);verify(html);checks.push({name,passed:true});};
 const noop=()=>{};
 render('capital4region chart,92points and context',visual.CapitalVisual,{payload:capital,quarter:'2026-Q3',region:'서울특별시',onQuarter:noop,onRegion:noop},h=>{assert.match(h,/전국보다 3\.0%p 높습니다/);assert.match(h,/서울은 전년 같은 시점보다 2\.7%p 하락/);assert.equal((h.match(/<circle/g)||[]).length,92);assert.match(h,/전국은 서울 포함/);});
 render('25official polygons,275heatmap values, selected history and job link',visual.DistrictVisual,{payload:districts,half:'2026-H1',district:'종로구',onHalf:noop,onDistrict:noop},h=>{assert.equal((h.match(/class="map-area/g)||[]).length,25);assert.match(h,/29\.5%/);assert.match(h,/-0\.2%p/);assert.match(h,/2025년 2분기/);assert.match(h,/이용허락범위 제한 없음/);assert.match(h,/district=/);assert.match(h,/반기/);assert.ok(h.includes('25개 구'));});
 render('new home explanation',pages.HomeView,{payload:indicators},h=>{assert.match(h,/서울의 하락 폭이 더 컸습니다/);});
}finally{await server.close();}
await writeFile(out,JSON.stringify({base,verified_at:new Date().toISOString(),checks,passed:checks.length,capital_rows:92,district_rows:275,map_districts:25},null,2),{flag:'wx'});console.log(JSON.stringify({out,passed:checks.length}));
