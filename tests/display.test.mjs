import test from 'node:test';
import assert from 'node:assert/strict';
import {periodLabel,frequencyLabel,verificationLabel} from '../web/format.ts';

test('quarter and half-year display labels cover every period without changing input keys',()=>{
 const keys=['2026-Q1','2026-Q2','2026-Q3','2026-Q4','2026-H1','2026-H2'];
 assert.deepEqual(keys.map(periodLabel),['2026년 1분기','2026년 2분기','2026년 3분기','2026년 4분기','2026년 상반기','2026년 하반기']);
 assert.deepEqual(keys,['2026-Q1','2026-Q2','2026-Q3','2026-Q4','2026-H1','2026-H2']);
});
test('both ends of source ranges and embedded period labels are readable',()=>{
 assert.equal(periodLabel('2021-Q1~2026-Q3'),'2021년 1분기~2026년 3분기');
 assert.equal(periodLabel('2021-H1~2026-H1'),'2021년 상반기~2026년 상반기');
 assert.equal(periodLabel('자료 2025-H2 / 2026-Q4'),'자료 2025년 하반기 / 2026년 4분기');
});
test('missing values, actual zero and unsupported period tokens stay distinct',()=>{
 assert.equal(periodLabel(null),'미확인');assert.equal(periodLabel(undefined),'미확인');assert.equal(periodLabel(''),'미확인');
 assert.equal(periodLabel(0),'0');assert.equal(periodLabel('2026-09'),'2026-09');assert.equal(periodLabel('2026-Q5'),'2026-Q5');assert.equal(periodLabel('2026-Q12'),'2026-Q12');assert.equal(periodLabel('2026-H12'),'2026-H12');
});
test('source labels distinguish fully matched observations, limited checks and withheld ages',()=>{
 assert.equal(frequencyLabel('quarterly'),'분기');assert.equal(frequencyLabel('halfyear'),'반기');
 assert.match(verificationLabel('verified_metadata'),/공개 수치 대조/);
 assert.match(verificationLabel('partial'),/현재 모집 여부는 별도 확인/);
 assert.match(verificationLabel('verified_hierarchy_partial'),/일부/);
 assert.match(verificationLabel('pending_age'),/공개 수치에서 제외/);
 assert.equal(verificationLabel('unknown_status'),'확인 상태 미확인');
});
