import test from 'node:test';
import assert from 'node:assert/strict';
import {employmentAxis} from '../web/chartAxis.ts';

test('employment lines default to25–75 with readable ticks, including absent data',()=>{
 for(const values of [[],[null,null],[29.5,47.1,60.2]]){
  const axis=employmentAxis(values);
  assert.equal(axis.min,25);assert.equal(axis.max,75);
  assert.deepEqual(axis.ticks,[25,35,45,55,65,75]);
 }
});
test('real zero and values outside the preferred range remain inside the shared scale',()=>{
 const values=[null,0,24.9,75.1,100],before=[...values];
 const axis=employmentAxis(values);
 assert.equal(axis.min,0);assert.equal(axis.max,100);
 for(const value of values)if(value!==null)assert.ok(value>=axis.min&&value<=axis.max);
 assert.deepEqual(values,before);
 assert.deepEqual(employmentAxis([24.9,75.1]),{min:20,max:80,ticks:[20,35,50,65,80]});
});
test('nonfinite missing observations cannot change the percentage range',()=>{
 assert.deepEqual(employmentAxis([NaN,Infinity,-Infinity,null,47.1]),employmentAxis([47.1]));
});
test('rate boundary pairs always have ordered endpoints and no crowded last tick',()=>{
 for(const low of [0,0.1,20,24.9,25,45.3])for(const high of [47.1,75,75.1,80,99.9,100]){
  const a=employmentAxis([low,high]);
  assert.ok(a.min<=low&&a.max>=high);
  assert.equal(a.ticks[0],a.min);assert.equal(a.ticks.at(-1),a.max);
  assert.ok(a.ticks.length>=2&&a.ticks.length<=7);
  assert.ok(a.ticks.every((v,i)=>i===0||v>a.ticks[i-1]));
 }
});
