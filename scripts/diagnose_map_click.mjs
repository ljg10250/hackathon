import {createRequire} from 'node:module';
const require=createRequire(new URL('../.tools/browserqa/package.json',import.meta.url));const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});
try{
 await page.goto('http://127.0.0.1:8787/visualizations?area=districts');const g=page.getByRole('button',{name:/종로구 · 고용률/});await g.waitFor();await g.scrollIntoViewIfNeeded();
 const info=await g.evaluate(g=>{const r=g.getBoundingClientRect(),t=g.querySelector('text'),tr=t.getBoundingClientRect(),p=new DOMPoint(Number(t.getAttribute('x')),Number(t.getAttribute('y'))).matrixTransform(g.getScreenCTM());const hit=(x,y)=>{const e=document.elementFromPoint(x,y);return {tag:e?.tagName,area:e?.closest('g[role=button]')?.getAttribute('aria-label')};};return {group:{x:r.x,y:r.y,width:r.width,height:r.height},text:{x:tr.x,y:tr.y,width:tr.width,height:tr.height},point:{x:p.x,y:p.y},nativeHit:hit(p.x,p.y),textHit:hit(tr.x+tr.width/2,tr.y+tr.height/2)};});
 console.log(JSON.stringify(info));await g.click({position:{x:info.text.x+info.text.width/2-info.group.x,y:info.text.y+info.text.height/2-info.group.y}});console.log('Relative selected '+await page.getByRole('combobox',{name:'지도 자치구 선택'}).inputValue());await page.mouse.click(info.point.x,info.point.y);console.log('Absolute selected '+await page.getByRole('combobox',{name:'지도 자치구 선택'}).inputValue());
}finally{await browser.close();}
