import type {ComparisonRow} from '../worker/employment';
type Datum={region:string;period:string;value:number|null};
export const difference=(a:number|null|undefined,b:number|null|undefined)=>typeof a==='number'&&typeof b==='number'?Number((a-b).toFixed(1)):null;
const direction=(n:number)=>n>0?'상승':n<0?'하락':'변화 없음';
export function changeSentence(name:string,value:number|null){return value===null?`${name}은 전년 같은 시점의 값이 없어 변화량을 계산하지 않습니다.`:value===0?`${name}은 전년 같은 시점과 같습니다.`:`${name}은 전년 같은 시점보다 ${Math.abs(value).toFixed(1)}%p ${direction(value)}했습니다.`;}
export function employmentInsight(row:ComparisonRow|undefined){
 if(!row||row.gap_pp===null)return '같은 분기의 두 값이 확인되어야 지역 차이를 설명할 수 있습니다.';
 const gap=row.gap_pp,level=gap===0?'서울과 전국의 청년 고용률은 같습니다.':`서울의 청년 고용률은 전국보다 ${Math.abs(gap).toFixed(1)}%p ${gap>0?'높습니다':'낮습니다'}.`;
 const a=row.seoul_yoy_pp,b=row.national_yoy_pp;
 const trend=a!==null&&b!==null&&a<0&&b<0?(a<b?' 두 지역 모두 전년 동기보다 하락했고, 서울의 하락 폭이 더 컸습니다.':a>b?' 두 지역 모두 전년 동기보다 하락했고, 전국의 하락 폭이 더 컸습니다.':' 두 지역의 전년 동기 하락 폭이 같습니다.'):a!==null&&b!==null&&a>0&&b>0?' 두 지역 모두 전년 동기보다 상승했습니다.':'';
 return level+trend+' 현재 수준과 최근 변화는 구분해 살펴보세요.';
}
export function districtInsight(region:string,period:string,rows:Datum[]){
 const value=rows.find(r=>r.region===region&&r.period===period)?.value;
 if(typeof value!=='number')return `${region}의 해당 반기 값은 미확인입니다.`;
 const previous=String(Number(period.slice(0,4))-1)+period.slice(4),delta=difference(value,rows.find(r=>r.region===region&&r.period===previous)?.value);
 const group=rows.filter(r=>r.period===period&&typeof r.value==='number').map(r=>r.value!);
 const min=Math.min(...group),max=Math.max(...group);
 return `이 구의 15~29세 주민 중 취업자의 비율은 ${value.toFixed(1)}%입니다. ${changeSentence(region.replace(/^서울 /,''),delta)} 같은 반기 25개 구의 값은 ${min.toFixed(1)}~${max.toFixed(1)}% 범위입니다. 이 차이가 근무지 일자리 수나 개인의 취업 가능성 차이를 뜻하지는 않습니다.`;
}
export function occupationInsight(openings:number,seeking:number){
 if(seeking===0)return `신규구직건수가 0건이므로 명/건 비율은 계산하지 않습니다. 구인인원 ${openings.toLocaleString('ko-KR')}명과 구직건수는 다른 단위입니다.`;
 return `등록된 신규구직 1건에 대응하는 신규구인인원은 ${(openings/seeking).toFixed(3)}명입니다. 등록 규모를 비교하는 값이며 구직건수와 구인인원은 서로 다른 단위여서 개인 경쟁률·취업확률로 해석할 수 없습니다.`;
}
