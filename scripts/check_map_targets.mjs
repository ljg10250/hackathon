import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {seoulMapData} from '../web/seoulMapData.ts';
const require=createRequire(new URL('../.tools/browserqa/package.json',import.meta.url)),{chromium,expect}=require('playwright/test');
const base=process.argv[2]??'http://127.0.0.1:8787',out=resolve(process.argv[3]??`reports/map_targets_${Date.now()}`);await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),checks=[];
try{
 for(const profile of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.name==='mobile',hasTouch:profile.name==='mobile'}),page=await context.newPage();
  await page.goto(base+'/visualizations?area=districts');await expect(page.locator('.map-detail')).toBeVisible({timeout:20000});await page.evaluate(()=>document.fonts.ready);
  for(const feature of seoulMapData){
   const target=page.getByRole('button',{name:new RegExp('^'+feature.name+' · 고용률')});await target.evaluate(g=>g.scrollIntoView({block:'center',inline:'center'}));
   const point=await target.evaluate(g=>{const r=g.querySelector('text').getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,hit:document.elementFromPoint(x,y)?.closest('g[role=button]')?.getAttribute('aria-label')};});
   assert.ok(point.hit?.startsWith(feature.name+' ·'),profile.name+' label hit '+feature.name+': '+point.hit);
   if(profile.name==='mobile')await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
   await expect(page.getByRole('combobox',{name:'지도 자치구 선택',exact:true})).toHaveValue(feature.name);checks.push({profile:profile.name,district:feature.name,hit:point.hit,passed:true});
  }
  await page.locator('.district-map').screenshot({path:resolve(out,profile.name+'-map.png')});await page.getByRole('button',{name:'지도 확대',exact:true}).click();await page.locator('.map-canvas').evaluate(e=>{e.scrollLeft=(e.scrollWidth-e.clientWidth)/2;e.scrollTop=50;});await page.locator('.map-canvas').screenshot({path:resolve(out,profile.name+'-zoom.png')});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await context.close();
 }
}finally{await browser.close();}
await writeFile(resolve(out,'results.json'),JSON.stringify({base,verified_at:new Date().toISOString(),checks,passed:checks.length,scope:'25 label hit targets in desktop mouse and mobile touch contexts; map zoom screenshots'},null,2),{flag:'wx'});console.log(JSON.stringify({out,passed:checks.length}));
