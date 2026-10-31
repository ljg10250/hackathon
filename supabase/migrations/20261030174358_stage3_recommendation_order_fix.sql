create or replace function public.compass_recommend_jobs(required jsonb default '{}', preferred jsonb default '{}', view_name text default 'all', result_group text default 'eligible', page_number integer default 1, page_size integer default 20)
returns jsonb language plpgsql stable security invoker set search_path = '' set statement_timeout = '6s' as $$
declare result jsonb; related_codes text[];
begin
  perform public.compass_validate_conditions(required,false);
  perform public.compass_validate_conditions(preferred,true);
  if view_name is null or view_name not in ('all','region','occupation') or result_group is null or result_group not in ('eligible','needs_review') or page_number is null or page_number not between 1 and 10000 or page_size is null or page_size not between 1 and 50 then raise exception 'Invalid recommendation parameters' using errcode='22023'; end if;
  -- Directed, evidence-backed 6-digit related links only. Hierarchy links can never qualify.
  select coalesce(array_agg(distinct m.target_code),'{}') into related_codes from public.occupation_mappings m
  where m.relation='related' and m.source_system='placement_csv' and m.target_system='KECO' and m.target_version='2025'
    and m.source_code ~ '^[0-9]{6}$' and m.target_code ~ '^[0-9]{6}$'
    and m.evidence_url ~ '^https://' and m.verified_at<=now() and preferred->'occupation' @> jsonb_build_array(m.source_code);
  with candidates as materialized (
    select j.* from public.jobs j
    where j.quality_status<>'quarantined' and j.district in ('강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구')
    and (view_name='all' or (preferred ? 'district' and preferred ? 'occupation' and (
      (view_name='region' and preferred->'occupation' @> jsonb_build_array(j.occupation_code) and not preferred->'district' @> jsonb_build_array(j.district)) or
      (view_name='occupation' and preferred->'district' @> jsonb_build_array(j.district) and not preferred->'occupation' @> jsonb_build_array(j.occupation_code) and j.occupation_code=any(related_codes)))))
  ), evaluated as materialized (
    select to_jsonb(j) as job,public.compass_evaluate_job(to_jsonb(j),required,preferred,related_codes) as evaluation from candidates j
  ), selected as (
    select job||jsonb_build_object('recommendation',evaluation) as item, (evaluation->>'confirmed_score')::numeric as score,
      (evaluation->>'unknown_preferences')::integer as unknowns,job->>'posted_at' as posted,job->>'id' as id
    from evaluated where evaluation->>'eligibility'=result_group
    order by score desc nulls last,unknowns asc,posted desc,(job->>'id') collate "C" asc
    limit page_size offset (page_number-1)*page_size
  )
  select jsonb_build_object('data',coalesce((select jsonb_agg(item order by score desc nulls last,unknowns asc,posted desc,id collate "C" asc) from selected),'[]'),
    'total',(select count(*) from evaluated where evaluation->>'eligibility'=result_group),
    'counts',jsonb_build_object('eligible',(select count(*) from evaluated where evaluation->>'eligibility'='eligible'),'needs_review',(select count(*) from evaluated where evaluation->>'eligibility'='needs_review')),
    'page',page_number,'page_size',page_size,'view',view_name,'group',result_group,'related_relation_count',cardinality(related_codes),
    'weights','{"occupation":35,"district":25,"wage":20,"workdays":10,"employment_type":10}'::jsonb,
    'score_semantics','선호 조건 일치도이며 합격·취업 확률이 아닙니다.',
    'alternative_status',case when view_name<>'all' and not (preferred ? 'district' and preferred ? 'occupation') then 'requires_preferred_district_and_occupation' when view_name='occupation' and cardinality(related_codes)=0 then 'no_verified_related_occupations' else 'available' end)
  into result;
  return result;
end $$;

