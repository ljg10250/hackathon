import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(new URL('../.tools/browserqa/package.json',import.meta.url));
const {chromium,expect}=require('playwright/test');
const base=process.argv[2]||'http://127.0.0.1:8787';
const phase=base.includes('127.0.0.1')?'local':'public';
const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[];
const out=resolve(process.argv[3]??`reports/chart_insights_${phase}_${Date.now()}`);
await mkdir(out,{recursive:true});
const paths=['/','/districts','/occupations','/visualizations?area=capital','/visualizations?area=districts'];
const errors=[];
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  for(const path of paths){
   await page.goto(base+path);
   await expect(page.locator('.primary-nav a')).toHaveCount(5);
   await expect(page.locator('.primary-nav a[href="/presentation"]')).toHaveCount(0);
   const figures=page.locator('figure.line-chart,figure.bar-chart,figure.district-map');
   await expect(figures.first()).toBeVisible();
   if(path==='/districts')await expect(figures).toHaveCount(2);
   for(const figure of await figures.all()){
    await expect(figure.locator(':scope > .chart-insight')).toHaveCount(1);
    const text=await figure.locator(':scope > .chart-insight').innerText();
    if(!text.trim()||/NaN|Infinity|undefined|null/.test(text))throw Error('Invalid insight: '+text);
   }
   if(path==='/'){
    const text=await page.locator('figure .chart-insight').innerText();
    if(!text.includes('3.0%p')||!text.includes('2.7%p'))throw Error('Actual comparison mismatch');
    await page.getByLabel('표시 시작 연도').selectOption('2026');
    await expect(page.locator('figure .chart-insight')).toContainText('2026년 1분기 대비');
   }
   if(path.includes('area=capital')){
    await page.getByLabel('관심 시도').selectOption('경기도');
    await expect(page.locator('figure.line-chart .chart-insight')).toContainText('경기 고용률');
    await page.getByLabel('기준 분기').selectOption('2021-Q1');
    const data=await fetch(base+'/api/visualizations?area=capital').then(r=>r.json());
    const values=data.data.filter(r=>r.period==='2021-Q1').map(r=>r.value);
    const gap=(Math.max(...values)-Math.min(...values)).toFixed(1);
    await expect(page.locator('figure.bar-chart .chart-insight')).toContainText(gap+'%p');
   }
   if(path==='/occupations'){
    await page.getByLabel('직종명 찾기').fill('없는직종검사문구');
    await expect(page.locator('figure .chart-insight').first()).toContainText('확인되지 않아');
    await page.getByLabel('직종명 찾기').fill('');
    await page.getByLabel('차트 표시 개수').selectOption('35');
    for(const insight of await page.locator('figure .chart-insight').all())await expect(insight).toContainText('35개 직종');
   }
   if(path.includes('area=districts')){
    await page.getByLabel('기준 반기').selectOption('2025-H1');
    await expect(page.locator('figure.district-map .chart-insight')).toContainText('2025년 상반기');
    await expect(page.locator('#district-heatmap > .chart-insight')).toContainText('비교 가능한 25개 구');
    await page.getByLabel('지도 자치구 선택').selectOption('종로구');
    await expect(page.locator('figure.line-chart')).toContainText('종로구 청년 고용률');
   }
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow '+path+' '+width);
   await page.locator('figure .chart-insight').first().scrollIntoViewIfNeeded();
   await page.screenshot({path:resolve(out,`${phase}-${width}-${paths.indexOf(path)}.png`)});
   checks.push({width,path,figures:await figures.count(),insights:await page.locator('.chart-insight').allTextContents()});
  }
  await page.goto(base+'/presentation');
  await expect(page.locator('main h1')).toHaveText('페이지를 찾을 수 없습니다.');
  await expect(page.locator('main img')).toHaveCount(0);
  await page.close();
 }
 if(errors.length)throw Error(errors.join('\n'));
 await writeFile(resolve(out,`${phase}-qa.json`),JSON.stringify({base,passed:true,checks},null,2));
 console.log(JSON.stringify({base,viewports:2,pageChecks:checks.length,passed:true}));
}finally{await browser.close()}
