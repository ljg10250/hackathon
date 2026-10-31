import React,{useEffect,useState} from 'react';
export type Row=Record<string,string|number|boolean|null>;
export type Payload={data:Row[]|Row;sources:Row[];total?:number;page?:number;page_size?:number;error?:string;status?:string;comparison_enabled?:boolean;comparison?:import('../worker/employment').ComparisonRow[];visualization_enabled?:boolean};
export const fmt=(n:unknown)=>typeof n==='number'?n.toLocaleString('ko-KR'):String(n??'미확인');
import {periodLabel} from './format';
export {periodLabel} from './format';
export function useData(url:string){
 const [result,setResult]=useState<{url:string;data:Payload|null;error:string}>({url,data:null,error:''});
 useEffect(()=>{const c=new AbortController();setResult({url,data:null,error:''});fetch(url,{signal:c.signal}).then(async r=>{const d=await r.json() as Payload;if(!r.ok)throw new Error(d.error??'조회 실패');setResult({url,data:d,error:''});}).catch(e=>{if(e.name!=='AbortError')setResult({url,data:null,error:e.message});});return()=>c.abort();},[url]);
 return result.url===url?result:{url,data:null,error:''};
}
export {default as Sources} from './DataSources';
export function Loading({error}:{error:string}){return error?<div className="notice" role="alert">{error} <button onClick={()=>location.reload()}>다시 시도</button></div>:<div className="loading-state" role="status"><span aria-hidden="true">◌</span> 공공데이터를 불러오는 중입니다…</div>}
export function Table({rows,columns,caption}:{rows:Row[];columns:[string,string][];caption:string}){return <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}><table><caption>{caption}</caption><thead><tr>{columns.map(([k,v])=><th scope="col" key={k}>{v}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={String(r.id??r.period??r.region??i)+'-'+i}>{columns.map(([k],column)=><React.Fragment key={k}>{column===0?<th scope="row">{k==='period'?periodLabel(r[k]):fmt(r[k])}</th>:<td>{k==='period'?periodLabel(r[k]):k==='value'&&typeof r[k]==='number'?Number(r[k]).toFixed(1):fmt(r[k])}</td>}</React.Fragment>)}</tr>)}</tbody></table>{!rows.length&&<p className="empty-state">이 조건에 해당하는 데이터가 없습니다.</p>}</div>}
export function Empty({children}:{children:React.ReactNode}){return <div className="empty-state"><h3>조회 결과가 없습니다</h3><p>{children}</p></div>}
