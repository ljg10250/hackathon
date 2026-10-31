// Actual API data -> React markup QA. No browser interaction/layout claim.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const base=process.argv[2]??'http://127.0.0.1:8787';
const report=process.argv[3]??`reports/pages_${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
const checks=[];
async function get(path,status=200){const start=performance.now(),r=await fetch(base+path,{signal:AbortSignal.timeout(15000)}),body=await r.json();assert.equal(r.status,status,JSON.stringify(body));if(status===200&&body.sources)for(const source of body.sources)for(const key of ['source','source_url','table_id','period','frequency','age_scope','unit','geography_basis','retrieved_at','verification_status'])assert.ok(key in source,key);checks.push({name:'HTTP '+path,status:r.status,elapsed_ms:Math.round(performance.now()-start)});return body;}
const indicators=await get('/api/indicators');assert.equal(indicators.data.length,46);assert.equal(indicators.comparison_enabled,true);assert.equal(indicators.comparison.length,23);assert.equal(indicators.comparison.at(-1).gap_pp,3);
const held=await get('/api/indicators?metric=unemployment_rate');assert.equal(held.status,'pending_age');assert.deepEqual(held.data,[]);
const district=await get('/api/districts?period=2026-H1');assert.equal(district.data.length,25);
const history=await get('/api/districts?district='+encodeURIComponent('강남구'));assert.equal(history.data.length,11);assert.ok(history.data.every(r=>r.region==='서울 강남구'));assert.deepEqual(history.data.map(r=>r.period),[...history.data.map(r=>r.period)].sort());
const expected=JSON.parse(await readFile('data/processed/district_youth_stats.json','utf8')).filter(r=>r.region==='서울 강남구').sort((a,b)=>a.period.localeCompare(b.period));assert.deepEqual(history.data,expected);
const intersection=await get('/api/districts?'+new URLSearchParams({district:'강남구',period:'2021-H1'}));assert.equal(intersection.data.length,1);assert.equal(intersection.data[0].value,expected[0].value);
assert.deepEqual((await get('/api/districts?district='+encodeURIComponent('강남구')+'&period=2020-H1')).data,[]);
await get('/api/districts?district='+encodeURIComponent('부산'),400);
const market=await get('/api/occupations');assert.equal(market.data.length,35);assert.equal(market.data.reduce((s,r)=>s+r.openings,0),18299);assert.equal(market.data.reduce((s,r)=>s+r.seeking,0),59668);
const search='?district='+encodeURIComponent('강남구')+'&page=2&page_size=10';const jobs=await get('/api/jobs'+search);assert.equal(jobs.page_size,10);assert.equal(jobs.data.length,10);
const detail=await get('/api/jobs/'+jobs.data[0].id);assert.equal(detail.data.original_url,null);
const choices=await get('/api/job-occupations');assert.equal(choices.total,558);assert.equal(choices.data.length,50);assert.equal(choices.snapshot.snapshot_public_job_rows,10743);
const choice=await get('/api/job-occupations?q='+jobs.data[0].occupation_code);assert.equal(choice.data.length,1);assert.equal(choice.data[0].name,jobs.data[0].occupation_name);
await get('/api/job-occupations?limit=100',400);const empty=await get('/api/job-occupations?q=없는직종검사문구');assert.deepEqual(empty.data,[]);
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const pages=await server.ssrLoadModule('/web/pages.tsx'),charts=await server.ssrLoadModule('/web/charts.tsx'),shared=await server.ssrLoadModule('/web/shared.tsx');
 globalThis.location={pathname:'/jobs',search};
 function render(name,Component,props,verify){const html=renderToStaticMarkup(createElement(Component,props));verify(html);assert.doesNotMatch(html,/NaN|undefined|\[object Object\]/);checks.push({name:'React '+name,passed:true});return html;}
 render('verified same-quarter employment comparison',pages.HomeView,{payload:indicators},html=>{assert.match(html,/서울·전국 청년 고용률 · 분기 비교/);assert.match(html,/\+3\.0/);assert.match(html,/-2\.7%p/);assert.match(html,/-1\.2%p/);assert.match(html,/전국은 서울을 포함/);assert.match(html,/사용자 조사로 검증하지 않았습니다/);const figure=html.match(/<figure class="line-chart">[\s\S]*?<\/figure>/)[0];assert.equal((figure.match(/<circle/g)||[]).length,23);assert.equal((figure.match(/<rect/g)||[]).length,23);assert.match(figure,/서울: 2021년 1분기/);assert.match(figure,/전국: 2021년 1분기/);assert.match(figure,/2026년 3분기: 47\.1%/);});
 render('unverified metadata never enables comparison',pages.HomeView,{payload:{...indicators,comparison_enabled:false,comparison:[]}},html=>{assert.match(html,/확정 격차 계산 보류/);assert.doesNotMatch(html,/서울 − 전국 고용률 격차/);});
 render('district 25 bars and half-year history',pages.DistrictView,{payload:district,history,period:'2026-H1',district:'강남구'},html=>{assert.match(html,/district-trend/);assert.match(html,/2021년 상반기/);assert.match(html,/2026년 상반기/);assert.match(html,/거주자 기준/);assert.match(html,/근무지 기준/);for(const r of district.data)assert.ok(html.includes(r.region));});
 render('occupation separate units and 35-row table',pages.OccupationView,{payload:market},html=>{assert.match(html,/신규구인인원 · 명/);assert.match(html,/신규구직건수 · 건/);assert.match(html,/독립적인 가로축/);assert.match(html,/18,299/);assert.match(html,/59,668/);assert.match(html,/전체 연령/);});
 const jobHtml=render('search filters and page-size-aware next link',pages.JobsView,{payload:jobs,search},html=>{assert.match(html,/직종 찾기/);assert.match(html,/page=3/);assert.match(html,/page_size=10/);assert.match(html,/return=/);});
 const back='/jobs?mode=recommend&district='+encodeURIComponent('강남구')+'&occupation='+jobs.data[0].occupation_code+'&page=2&view=region&group=needs_review';
 render('detail preserves recommendation view, group and page',pages.DetailView,{payload:detail,search:'?return='+encodeURIComponent(back)},html=>{assert.ok(html.includes(back.replaceAll('&','&amp;')));assert.match(html,/지원 전 모집 여부를 확인해 주세요/);assert.match(html,/기재 마감일/);assert.match(html,/기재 고용형태/);assert.match(html,/공식 포털/);});
 render('detail rejects an external return URL',pages.DetailView,{payload:detail,search:'?return='+encodeURIComponent('https://untrusted.example/')},html=>{assert.match(html,/href="\/jobs"/);assert.doesNotMatch(html,/untrusted\.example/);});
 render('empty jobs and null field remain explicit',pages.JobsView,{payload:{...jobs,data:[],total:0},search:'?q=검사'},html=>assert.match(html,/조회 결과가 없습니다/));
 render('zero/null table formatting',shared.Table,{rows:[{name:'실제 0',value:0},{name:'결측',value:null}],columns:[['name','구분'],['value','값']],caption:'검증 fixture'},html=>{assert.match(html,/>0\.0<\/td>/);assert.match(html,/>미확인<\/td>/);});
 render('missing observations break chart lines',charts.LineChart,{points:[{period:'2021-Q1',value:0},{period:'2021-Q2',value:null},{period:'2021-Q3',value:50}],title:'결측 검사 fixture',frequency:'분기'},html=>{assert.equal((html.match(/<polyline/g)||[]).length,2);assert.match(html,/2021년 2분기: 미확인/);});
 const {default:App}=await server.ssrLoadModule('/web/App.tsx');
 for(const path of ['/','/districts','/occupations','/jobs','/jobs/'+detail.data.id]){globalThis.location={pathname:path,search:''};render('route shell '+path,App,{},html=>{assert.match(html,/본문으로 건너뛰기/);assert.match(html,/class="primary-nav"/);assert.match(html,/id="main-content"/);});}
 const {default:Recommendations}=await server.ssrLoadModule('/web/Recommendations.tsx');globalThis.location={pathname:'/jobs',search:'?mode=recommend&district='+encodeURIComponent('강남구')+'&required_district=on'};render('recommendation picker and mandatory label',Recommendations,{},html=>{assert.match(html,/선호 직종 · 35점 찾기/);assert.match(html,/aria-label="지역 필수로도 적용"/);assert.match(html,/조건 확인 필요/);});
}finally{delete globalThis.location;await server.close();}
await writeFile(report,JSON.stringify({base,verified_at:new Date().toISOString(),checks,passed:checks.length,limitation:'Actual API and React SSR. Browser input, layout, mobile and focus behavior are not verified.'},null,2));console.log(JSON.stringify({report,passed:checks.length}));
