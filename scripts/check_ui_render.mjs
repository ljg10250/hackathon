// React server render check only. This does not replace browser interaction/layout QA.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
const checks=[];
try {
 const {default:Component}=await server.ssrLoadModule('/web/Recommendations.tsx');
 for(const search of ['?mode=recommend','?mode=recommend&district=%EA%B0%95%EB%82%A8%EA%B5%AC&required_district=on&workdays=5&wage_min=3000000','?mode=recommend&view=occupation']){
  globalThis.location={search,pathname:'/jobs'};
  const html=renderToString(createElement(Component));
  assert.match(html,/recommend-form/);assert.match(html,/result-tabs/);assert.match(html,/name="required_district"/);
  if(search.includes('required_district=on'))assert.match(html,/name="required_district"[^>]*checked=""/);
  checks.push({search,passed:true});
 }
 const result={verified_at:new Date().toISOString(),checks,limitation:'React SSR only; effects, browser interaction and responsive layout are not verified.'};
 await writeFile(process.argv[2]??'reports/stage3_ui_render_20261031.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({ssr_profiles:checks.length,passed:true}));
} finally {delete globalThis.location;await server.close();}
