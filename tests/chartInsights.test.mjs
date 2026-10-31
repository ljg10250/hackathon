import test from 'node:test';
import assert from 'node:assert/strict';
import {lineInsight,multiLineInsight,barInsight,heatmapInsight} from '../web/chartInsights.ts';

test('line commentary pairs the same quarter for national gap and year-on-year change',()=>{
 const points=[{period:'2025-Q3',value:49.8},{period:'2026-Q3',value:47.1}];
 const national=[{period:'2026-Q2',value:99},{period:'2026-Q3',value:44.1}];
 const result=lineInsight(points,'분기',national);
 assert.match(result,/2026년 3분기 서울 고용률은 47.1%/);
 assert.match(result,/전국보다 3.0%p 높/);
 assert.match(result,/전년 같은 분기 대비 2.7%p 하락/);
 assert.ok(!result.includes('54.9'));
});

test('latest missing observations are not replaced by an older value; real zero remains valid',()=>{
 assert.match(lineInsight([{period:'2025-H1',value:50},{period:'2026-H1',value:null}],'반기'),/미확인/);
 assert.match(lineInsight([{period:'2025-H1',value:1},{period:'2026-H1',value:0}],'반기'),/0.0%.*1.0%p 하락/);
 assert.match(lineInsight([{period:'2025-Q3',value:0},{period:'2026-Q3',value:0}],'분기'),/변화가 없습니다/);
});

test('a missing previous year uses explicitly named displayed endpoints, not a false year-on-year claim',()=>{
 const text=lineInsight([{period:'2021-H1',value:30},{period:'2026-H1',value:40}],'반기');
 assert.match(text,/2021년 상반기 대비 10.0%p 상승/);
 assert.ok(!text.includes('전년'));
 assert.match(lineInsight([],'분기'),/자료가 없어/);
});

test('multi-line commentary follows the selected region',()=>{
 const series=[{label:'서울',points:[{period:'2026-Q3',value:47.1}]},{label:'경기',points:[{period:'2026-Q3',value:45.2}]}];
 assert.match(multiLineInsight(series,'분기','경기'),/경기 고용률은 45.2%/);
});

test('rate bars use percentage points, preserve ties and do not convert missing values into zero',()=>{
 const rows=[{label:'가구',value:40},{label:'나구',value:50},{label:'다구',value:50},{label:'라구',value:null}];
 const text=barInsight(rows,'%');
 assert.match(text,/확인된 3개 지역/);
 assert.match(text,/나구 외 1곳/);
 assert.match(text,/10.0%p/);
 assert.ok(!text.includes('라구'));
 assert.match(barInsight([{label:'가구',value:0},{label:'나구',value:0}],'%'),/모두 0.0%/);
});

test('occupation bars explicitly restrict the share to the displayed subset and retain the source unit',()=>{
 const text=barInsight([{label:'직종A',value:30},{label:'직종B',value:10}], '건');
 assert.match(text,/표시된 2개 직종/);
 assert.match(text,/30건/);
 assert.match(text,/표시된 합계의 75.0%/);
 assert.match(barInsight([{label:'직종A',value:0}], '명'),/0명/);
 assert.match(barInsight([{label:'직종A',value:null}], '명'),/확인되지 않아/);
});

test('heatmap comparison counts only paired first/last observations without averaging districts',()=>{
 const rows=[
 {region:'가',period:'2021-H1',value:30},{region:'가',period:'2026-H1',value:40},
 {region:'나',period:'2021-H1',value:50},{region:'나',period:'2026-H1',value:40},
 {region:'다',period:'2021-H1',value:0},{region:'다',period:'2026-H1',value:0},
 {region:'라',period:'2021-H1',value:null},{region:'라',period:'2026-H1',value:99},
 ];
 const text=heatmapInsight(rows);
 assert.match(text,/2021년 상반기 대비 2026년 상반기/);
 assert.match(text,/비교 가능한 3개 구 중 1개 구.*상승.*1개 구.*하락.*1개 구.*같았습니다/);
 assert.match(heatmapInsight([]),/서로 다른 반기/);
 assert.match(heatmapInsight([{region:'가',period:'2021-H1',value:null},{region:'가',period:'2026-H1',value:3}]),/함께 확인된 자치구가 없어/);
});
