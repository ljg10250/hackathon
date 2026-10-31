// Authorized isolated Playwright browser. Never attaches to an existing personal profile.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const require=createRequire(new URL('../.tools/browserqa/package.json',import.meta.url));
const {chromium,expect}=require('playwright/test');
const axeModule=require('@axe-core/playwright'),AxeBuilder=axeModule.default??axeModule;
const versions=JSON.parse(await readFile(new URL('../.tools/browserqa/package.json',import.meta.url),'utf8')).dependencies;
const base=process.argv[2]??'http://127.0.0.1:8787';
const out=resolve(process.argv[3]??`reports/browser_${new Date().toISOString().replace(/[:.]/g,'-')}`);
const auditOnly=process.argv.includes('--audit-only'),flowsOnly=process.argv.includes('--flows-only');
await mkdir(out,{recursive:true});
const checks=[],audits=[],errors=[],requests=[];
let browser,browserVersion;
async function check(name,fn){try{await fn();checks.push({name,passed:true});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:e.message.slice(0,1800)});console.log('FAIL '+name+': '+e.message.slice(0,200));}}
async function ready(page){await expect(page.locator('main .sources')).toBeVisible({timeout:20000});await page.evaluate(()=>document.fonts.ready);}
async function go(page,path){await page.goto(base+path,{waitUntil:'domcontentloaded'});await ready(page);}
async function json(context,path){const r=await context.request.get(base+path);assert.equal(r.status(),200);return r.json();}
try{
 browser=await chromium.launch({channel:'chrome',headless:true});browserVersion=browser.version();
 const profiles=[{name:'desktop',width:1280,height:900},{name:'tablet',width:768,height:1024},{name:'mobile',width:390,height:844,touch:true},{name:'narrow',width:320,height:740,touch:true},{name:'landscape',width:844,height:390,touch:true}];
 if(!flowsOnly)for(const profile of profiles){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},hasTouch:profile.touch??false,isMobile:profile.touch??false,deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push({profile:profile.name,message:e.message}));
  page.on('requestfailed',r=>{if(r.url().startsWith(base)&&r.failure()?.errorText!=='net::ERR_ABORTED')requests.push({profile:profile.name,path:new URL(r.url()).pathname,error:r.failure()?.errorText});});
  const sample=await json(context,'/api/jobs?district='+encodeURIComponent('강남구')+'&page_size=1');
  const routes=[['home','/'],['visual-capital','/visualizations?area=capital'],['visual-map','/visualizations'],['districts','/districts'],['occupations','/occupations'],['jobs','/jobs'],['recommendations','/jobs?mode=recommend'],['detail','/jobs/'+sample.data[0].id]];
  for(const [name,path] of routes){
   await check(profile.name+' '+name+' loaded and contained',async()=>{
    await go(page,path);
    const metrics=await page.evaluate(()=>{const nav=document.querySelector('.primary-nav'),r=nav.getBoundingClientRect();return {viewport:innerWidth,document:document.documentElement.scrollWidth,bodyFont:getComputedStyle(document.body).fontSize,navPosition:getComputedStyle(nav).position,navTop:Math.round(r.top),navBottom:Math.round(r.bottom),fontLoaded:document.fonts.check('16px Pretendard'),storageKeys:[...Object.keys(localStorage),...Object.keys(sessionStorage)]};});
    const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    const violations=result.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,240)}))}));
    const incomplete=result.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}));
    audits.push({profile:profile.name,route:name,path,metrics,violations,incomplete});
    if(['desktop','mobile'].includes(profile.name))await page.screenshot({path:resolve(out,profile.name+'-'+name+'.png'),fullPage:true});
    if(name==='home'){
     const payload=await json(context,'/api/indicators'),seoul=payload.data.filter(r=>r.region==='서울특별시');
     const latest=[...seoul].sort((a,b)=>b.period.localeCompare(a.period))[0];
     await expect(page.locator('.metric').first()).toContainText(Number(latest.value).toFixed(1));
     const graph=page.getByRole('img',{name:'서울·전국 청년 고용률 · 분기 비교'});await expect(graph).toBeVisible();await expect(graph.locator('circle')).toHaveCount(seoul.length);
    }
    assert.ok(metrics.document<=metrics.viewport+1,`Document overflow ${metrics.document} > ${metrics.viewport}`);
    assert.equal(metrics.bodyFont,'16px');assert.deepEqual(metrics.storageKeys,[]);
    assert.equal(metrics.navPosition,profile.width<=600?'fixed':'static');
    if(profile.width<=600)assert.ok(Math.abs(metrics.navBottom-profile.height)<=2,'Mobile nav must be at the viewport bottom');
   });
  }
  await check(profile.name+' skip link and keyboard focus',async()=>{
   await go(page,'/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'본문으로 건너뛰기'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#main-content')).toBeFocused();
   await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement.tagName,outline:getComputedStyle(document.activeElement).outlineStyle}));assert.notEqual(focus.tag,'BODY');assert.notEqual(focus.outline,'none');
  });
  await context.close();
 }
 if(!auditOnly){
  for(const profile of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.name==='mobile',hasTouch:profile.name==='mobile',locale:'ko-KR',reducedMotion:'reduce'});
   const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push({profile:profile.name,message:e.message}));
   const first=await json(context,'/api/jobs?district='+encodeURIComponent('강남구')+'&page_size=50');
   const frequencies=new Map();for(const j of first.data)frequencies.set(j.occupation_code,(frequencies.get(j.occupation_code)??0)+1);
   const code=[...frequencies].sort((a,b)=>b[1]-a[1])[0][0];
   await check(profile.name+' actual search selection, pagination, detail and return',async()=>{
    await go(page,'/jobs');await page.getByRole('combobox',{name:'근무 자치구',exact:true}).selectOption('강남구');await page.getByLabel('직종 찾기',{exact:true}).fill(code);
    await expect(page.getByRole('combobox',{name:'직종 선택',exact:true}).locator('option[value="'+code+'"]')).toHaveCount(1);
    await page.getByRole('combobox',{name:'직종 선택',exact:true}).selectOption(code);await page.getByRole('combobox',{name:'페이지당 공고 수',exact:true}).selectOption('10');
    await page.getByRole('button',{name:'일자리 조회 →'}).click();await ready(page);await expect(page.locator('.job')).toHaveCount(10);
    assert.equal(new URL(page.url()).searchParams.get('occupation'),code);assert.equal(new URL(page.url()).searchParams.get('page_size'),'10');
    await page.locator('.pagination').getByRole('link',{name:'다음 →'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('page'),'2');
    const back=page.url();await page.locator('.job').first().click();await ready(page);await expect(page.getByText('지원 전 모집 여부를 확인해 주세요',{exact:true})).toBeVisible();await page.getByRole('link',{name:'← 검색 결과로 돌아가기'}).click();await ready(page);assert.equal(page.url(),back);await expect(page.getByRole('combobox',{name:'직종 선택',exact:true})).toHaveValue(code);await expect(page.getByRole('combobox',{name:'페이지당 공고 수',exact:true})).toHaveValue('10');
   });
   await check(profile.name+' home quarter selection and same-basis comparison',async()=>{
    await go(page,'/');const seoul=page.getByRole('img',{name:'서울·전국 청년 고용률 · 분기 비교'});await expect(seoul.locator('circle')).toHaveCount(23);
    await page.getByRole('combobox',{name:'표시 시작 연도',exact:true}).selectOption('2025');await expect(seoul.locator('circle')).toHaveCount(7);
    await expect(seoul.locator('[data-series=\"national\"] rect')).toHaveCount(7);await expect(page.locator('.metric').nth(2)).toContainText('+3.0');await page.getByRole('combobox',{name:'비교 기준 분기',exact:true}).selectOption('2025-Q3');await expect(page.locator('.metric').first()).toContainText('49.8');await expect(page.locator('.metric').nth(2)).toContainText('+4.5');await page.getByRole('combobox',{name:'비교 기준 분기',exact:true}).selectOption('2026-Q3');
    await expect(page.locator('.metric').first()).toContainText('47.1');
   });
   await check(profile.name+' recover from a synthetic API failure without sample data',async()=>{
    await page.route('**/api/jobs?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'검증용 임시 오류 (테스트 응답)'})}));
    await page.goto(base+'/jobs?district='+encodeURIComponent('강남구'));await expect(page.getByRole('alert')).toContainText('검증용 임시 오류');await expect(page.locator('.job')).toHaveCount(0);
    await page.unroute('**/api/jobs?*');await page.getByRole('button',{name:'다시 시도',exact:true}).click();await ready(page);await expect(page.locator('.job')).toHaveCount(20);
   });
   await check(profile.name+' empty search and reset',async()=>{
    await go(page,'/jobs');await page.getByLabel('공고 제목',{exact:true}).fill('존재하지않는공고검증문구');await page.getByRole('button',{name:'일자리 조회 →'}).click();await ready(page);await expect(page.getByRole('heading',{name:'조회 결과가 없습니다'})).toBeVisible();await expect(page.locator('.job')).toHaveCount(0);await page.getByRole('link',{name:'조건 초기화',exact:true}).click();await ready(page);await expect(page.locator('.job')).toHaveCount(20);
   });
   await check(profile.name+' district controls, history and job exploration',async()=>{
    await go(page,'/districts');await page.getByRole('combobox',{name:'기준 반기',exact:true}).selectOption('2021-H1');await page.getByRole('combobox',{name:'관심 자치구',exact:true}).selectOption('중구');await page.getByRole('button',{name:'자치구 확인 →'}).click();await ready(page);await expect(page.locator('#district-trend')).toContainText('중구');await expect(page.locator('#district-trend svg')).toBeVisible();await expect(page.locator('.bar-chart .bar-row')).toHaveCount(25);await page.getByRole('link',{name:'이 구의 근무지 공고 탐색 →'}).click();await ready(page);await expect(page.getByRole('combobox',{name:'근무 자치구',exact:true})).toHaveValue('중구');
   });
   await check(profile.name+' occupation chart controls and raw calculation',async()=>{
    await go(page,'/occupations');await page.getByLabel('직종명 찾기',{exact:true}).fill('경영');assert.ok(await page.locator('.bar-row').count()>0);await page.getByRole('combobox',{name:'표시 순서',exact:true}).selectOption('seeking');await page.getByRole('combobox',{name:'차트 표시 개수',exact:true}).selectOption('35');const select=page.getByRole('combobox',{name:'직종 중분류',exact:true});const value=await select.locator('option').nth(1).getAttribute('value')??await select.locator('option').nth(1).textContent();await select.selectOption(value);await expect(page.locator('.calculation')).toContainText('산식:');
   });
   await check(profile.name+' occupation analysis to verified-group jobs and preserved return',async()=>{
    await go(page,'/occupations');await page.getByRole('combobox',{name:'직종 중분류',exact:true}).selectOption('경영·행정·사무직');await page.getByRole('link',{name:'이 직종 분류의 공고 탐색 →'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('occupation_group'),'02');await expect(page.getByRole('combobox',{name:'직종 중분류',exact:true})).toHaveValue('02');await expect(page.locator('.job')).toHaveCount(20);
    await page.getByRole('combobox',{name:'페이지당 공고 수',exact:true}).selectOption('10');await page.getByRole('button',{name:'일자리 조회 →'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('occupation_group'),'02');await page.locator('.pagination').getByRole('link',{name:'다음 →'}).click();await ready(page);const back=page.url();await page.locator('.job').first().click();await ready(page);await page.getByRole('link',{name:'← 검색 결과로 돌아가기'}).click();await ready(page);assert.equal(page.url(),back);await expect(page.getByRole('combobox',{name:'직종 중분류',exact:true})).toHaveValue('02');
   });
   await check(profile.name+' capital visualization controls and URL persistence',async()=>{
    await go(page,'/visualizations?area=capital');await expect(page.getByRole('link',{name:'한눈에 보기',exact:true})).toBeVisible();await expect(page.getByRole('img',{name:'수도권·전국 청년 고용률 추이',exact:true}).locator('circle')).toHaveCount(92);await page.getByRole('combobox',{name:'기준 분기',exact:true}).selectOption('2025-Q3');await page.getByRole('combobox',{name:'관심 시도',exact:true}).selectOption('인천광역시');await expect(page.locator('.insight').first()).toContainText('인천');await page.reload();await ready(page);await expect(page.getByRole('combobox',{name:'관심 시도',exact:true})).toHaveValue('인천광역시');await expect(page.getByRole('combobox',{name:'기준 분기',exact:true})).toHaveValue('2025-Q3');
   });
   await check(profile.name+' official map25areas, keyboard, heatmap275cells and period switch',async()=>{
    await go(page,'/visualizations?area=districts');const map=page.getByRole('group',{name:'서울 자치구 청년 고용률 지도',exact:true});await expect(map.getByRole('button')).toHaveCount(25);await page.getByRole('button',{name:'지도 확대',exact:true}).click();assert.ok(await map.evaluate(g=>g.getBoundingClientRect().width)>=720);await page.getByRole('button',{name:'전체 지도',exact:true}).click();const jongno=map.getByRole('button',{name:/종로구 · 고용률/});const point=await jongno.evaluate(g=>{const r=g.getBoundingClientRect(),t=g.querySelector('text').getBoundingClientRect();return {x:t.left+t.width/2-r.left,y:t.top+t.height/2-r.top};});await jongno.click({position:point});await expect(page.locator('.map-detail')).toContainText('29.5%');await expect(page.getByRole('combobox',{name:'지도 자치구 선택',exact:true})).toHaveValue('종로구');const jung=map.getByRole('button',{name:/^중구 · 고용률/});await jung.focus();await page.keyboard.press('Enter');await expect(jung).toHaveAttribute('aria-pressed','true');await expect(page.locator('.map-detail')).toContainText('38.1%');await expect(page.locator('.heatmap tbody td')).toHaveCount(275);await page.getByRole('combobox',{name:'기준 반기',exact:true}).selectOption('2021-H1');await expect(page.locator('.map-detail')).toContainText('41.6%');await page.locator('.heatmap tbody').getByRole('button',{name:'종로구',exact:true}).click();await expect(page.locator('.map-detail')).toContainText('36.2%');await page.getByRole('button',{name:'2026년 상반기 지도에 표시',exact:true}).click();await expect(page.locator('.map-detail')).toContainText('29.5%');
   });
   await check(profile.name+' map to same-district jobs',async()=>{
    await go(page,'/visualizations?area=districts&district='+encodeURIComponent('중구'));await page.locator('.map-detail').getByRole('link',{name:'이 구의 근무지 공고 탐색 →'}).click();await ready(page);await expect(page.getByRole('combobox',{name:'근무 자치구',exact:true})).toHaveValue('중구');
   });
   await check(profile.name+' recommendation score, alternatives, unknown group and return',async()=>{
    await go(page,'/jobs?mode=recommend');await page.getByRole('combobox',{name:'지역 · 25점',exact:true}).selectOption('강남구');await page.getByLabel('선호 직종 · 35점 찾기',{exact:true}).fill(code);await expect(page.getByRole('combobox',{name:'선호 직종 · 35점 선택',exact:true}).locator('option[value="'+code+'"]')).toHaveCount(1);await page.getByRole('combobox',{name:'선호 직종 · 35점 선택',exact:true}).selectOption(code);
    await page.getByRole('combobox',{name:'주 근무일수 · 10점',exact:true}).selectOption('5');await page.getByRole('combobox',{name:'고용형태 · 10점',exact:true}).selectOption('10');await page.getByLabel('희망 최소 금액 (원)',{exact:true}).fill('3000000');await page.getByRole('checkbox',{name:'근무일수 필수로도 적용',exact:true}).check();await page.getByRole('button',{name:'조건 적용 →'}).click();await ready(page);await expect(page.locator('.recommendation-job').first()).toContainText(/\d+\.\d+ ~ \d+\.\d+점/);
    await page.locator('.recommendation-job').first().getByText('조건과 계산 근거',{exact:true}).click();await expect(page.locator('.recommendation-job').first()).toContainText('선택 가중치 100');
    await page.getByRole('link',{name:'지역 대안',exact:true}).click();await ready(page);assert.ok(await page.locator('.recommendation-job').count()>0);assert.ok((await page.locator('.recommendation-job .tag').allTextContents()).every(t=>t!=='강남구'));
    await page.getByRole('link',{name:'직종 대안',exact:true}).click();await ready(page);await expect(page.getByText('관련 직종 관계의 공식 근거가 아직 검증되지 않았습니다.',{exact:false})).toBeVisible();await expect(page.locator('.recommendation-job')).toHaveCount(0);
    await page.getByRole('link',{name:'전체 추천',exact:true}).click();await ready(page);await page.locator('.group-tabs').getByRole('link',{name:/조건 확인 필요/}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('group'),'needs_review');await page.locator('.recommendation-job').first().getByText('조건과 계산 근거',{exact:true}).click();await expect(page.locator('.recommendation-job').first()).toContainText('필수 근무일수: 미확인');
    const back=page.url();await page.locator('.recommendation-job > a').first().click();await ready(page);await page.getByRole('link',{name:'← 검색 결과로 돌아가기'}).click();await ready(page);assert.equal(page.url(),back);await expect(page.getByRole('checkbox',{name:'근무일수 필수로도 적용'})).toBeChecked();
   });
   await check(profile.name+' required district is not relaxed in region alternative',async()=>{
    await go(page,'/jobs?mode=recommend&district='+encodeURIComponent('강남구')+'&occupation='+code+'&required_district=on');await page.getByRole('link',{name:'지역 대안',exact:true}).click();await ready(page);await expect(page.locator('.recommendation-job')).toHaveCount(0);await expect(page.getByText('이 조건에 해당하는 공고가 없습니다.',{exact:true})).toBeVisible();
   });
   await context.close();
  }
 }
}catch(e){checks.push({name:'browser execution',passed:false,error:e.message});}finally{if(browser)await browser.close();}
const violationCount=audits.length?audits.reduce((s,a)=>s+a.violations.length,0):null;
const report={base,verified_at:new Date().toISOString(),versions,browserVersion,mode:flowsOnly?'flows_only':auditOnly?'audit_only':'all',browser:'Installed Chrome; isolated ephemeral contexts; headless',checks,audits,errors,requests,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,axe_violations:violationCount,limitations:'Chromium viewport/touch emulation only. Does not certify all WCAG criteria or physical iOS/Android devices.'};
await writeFile(resolve(out,'results.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({out,passed:report.passed,failed:report.failed,axe_violations:violationCount,page_errors:errors.length,failed_requests:requests.length}));
if(report.failed||violationCount||errors.length||requests.length)process.exitCode=1;
