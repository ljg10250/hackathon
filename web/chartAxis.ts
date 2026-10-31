// A shared percentage scale for every displayed series. Missing data never sets a bound.
export function employmentAxis(values:readonly (number|null)[]){
 let min=25,max=75;
 for(const value of values){
  if(typeof value!=='number'||!Number.isFinite(value))continue;
  min=Math.min(min,Math.floor(value/5)*5);
  max=Math.max(max,Math.ceil(value/5)*5);
 }
 const step=Math.max(10,Math.ceil((max-min)/25)*5),ticks:number[]=[];
 for(let value=min;value<=max;value+=step)ticks.push(value);
 if(ticks.at(-1)!==max){
  if(max-ticks[ticks.length-1]<step/2)ticks.pop();
  ticks.push(max);
 }
 return {min,max,ticks};
}
