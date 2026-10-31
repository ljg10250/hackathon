import {periodLabel} from './format.ts';

type Point={period:string;value:number|null};
type Bar={label:string;value:number|null};
type Series={label:string;points:Point[]};
const valid=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const delta=(a:number,b:number)=>Number((a-b).toFixed(1));
const change=(value:number)=>value===0?'변화가 없습니다':`${Math.abs(value).toFixed(1)}%p ${value>0?'상승했습니다':'하락했습니다'}`;

export function lineInsight(points:Point[],frequency:'분기'|'반기',comparison?:Point[],label='고용률'){
 const ordered=[...points].sort((a,b)=>a.period.localeCompare(b.period)),last=ordered.at(-1);
 if(!last)return '표시할 자료가 없어 고용률의 변화를 비교할 수 없습니다.';
 if(!valid(last.value))return `${periodLabel(last.period)} 값이 미확인이므로 최근 변화를 판단할 수 없습니다.`;
 const beforeYear=String(Number(last.period.slice(0,4))-1)+last.period.slice(4);
 const yearValue=ordered.find(p=>p.period===beforeYear)?.value;
 const first=ordered[0];
 const trend=valid(yearValue)?`전년 같은 ${frequency} 대비 ${change(delta(last.value,yearValue))}`:
  first.period!==last.period&&valid(first.value)?`${periodLabel(first.period)} 대비 ${change(delta(last.value,first.value))}`:null;
 const national=comparison?.find(p=>p.period===last.period)?.value;
 let level=`${periodLabel(last.period)} ${comparison?'서울 고용률':label}은 ${last.value.toFixed(1)}%`;
 if(comparison){
  const gap=valid(national)?delta(last.value,national):null;
  level+=gap===null?'이며 같은 분기 전국 값은 미확인입니다':gap===0?'로 전국과 같습니다':`로 전국보다 ${Math.abs(gap).toFixed(1)}%p ${gap>0?'높습니다':'낮습니다'}`;
 }else level+='입니다';
 return trend?`${level.replace(/습니다$|입니다$/, '')}${level.endsWith('입니다')?'이며':'으며'}, ${trend}.`:`${level}.`;
}

export function multiLineInsight(series:Series[],frequency:'분기'|'반기',focus?:string){
 const selected=series.find(s=>s.label===focus)??series[0];
 if(!selected)return '표시할 지역 자료가 없어 고용률의 변화를 비교할 수 없습니다.';
 // The series label identifies the focus; no national comparison is inferred.
 return lineInsight(selected.points,frequency,undefined,selected.label+' 고용률');
}

export function barInsight(rows:Bar[],unit:string){
 const known=rows.filter((r):r is Bar&{value:number}=>valid(r.value));
 if(!known.length)return '표시된 항목의 값이 확인되지 않아 규모나 차이를 비교할 수 없습니다.';
 const max=Math.max(...known.map(r=>r.value)),min=Math.min(...known.map(r=>r.value));
 const highest=known.filter(r=>r.value===max),lowest=known.filter(r=>r.value===min);
 const name=(items:Bar[])=>items[0].label+(items.length>1?` 외 ${items.length-1}곳`:'');
 const scope=unit==='%'?'지역':'직종';
 const prefix=known.length===rows.length?`표시된 ${known.length}개 ${scope}`:`값이 확인된 ${known.length}개 ${scope}`;
 if(max===min)return `${prefix}의 ${unit==='%'?'고용률':'등록 규모'}은 모두 ${unit==='%'?max.toFixed(1):max.toLocaleString('ko-KR')}${unit}로 같습니다.`;
 if(unit==='%')return `${prefix} 중 ${name(highest)}(${max.toFixed(1)}%)와 ${name(lowest)}(${min.toFixed(1)}%)의 고용률 차이는 ${delta(max,min).toFixed(1)}%p입니다.`;
 const total=known.reduce((sum,r)=>sum+r.value,0);
 const tied=highest.length>1?` 외 ${highest.length-1}개 직종`:'';
 return `${prefix} 중 ${highest[0].label}${tied}의 등록 규모가 ${max.toLocaleString('ko-KR')}${unit}로 가장 많고, ${highest.length>1?'이 중 한 직종은':'이 직종은'} 표시된 합계의 ${(max/total*100).toFixed(1)}%를 차지합니다.`;
}

export function heatmapInsight(rows:{region:string;period:string;value:number|null}[]){
 const periods=[...new Set(rows.map(r=>r.period))].sort(),start=periods[0],end=periods.at(-1);
 if(!start||!end||start===end)return '서로 다른 반기 자료가 있어야 자치구별 변화를 비교할 수 있습니다.';
 const regions=[...new Set(rows.map(r=>r.region))];
 let up=0,down=0,same=0;
 for(const region of regions){
  const a=rows.find(r=>r.region===region&&r.period===start)?.value,b=rows.find(r=>r.region===region&&r.period===end)?.value;
  if(!valid(a)||!valid(b))continue;
  const d=delta(b,a);if(d>0)up++;else if(d<0)down++;else same++;
 }
 if(!up&&!down&&!same)return '처음과 마지막 반기의 값이 함께 확인된 자치구가 없어 변화를 비교할 수 없습니다.';
 return `${periodLabel(start)} 대비 ${periodLabel(end)}에는 비교 가능한 ${up+down+same}개 구 중 ${up}개 구의 고용률이 상승하고 ${down}개 구는 하락했으며, ${same}개 구는 같았습니다.`;
}
