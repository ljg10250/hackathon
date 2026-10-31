-- Additive migration. No existing table/data/RLS changes. New weights confirmed 2026-10-31 KST.
create function public.compass_validate_conditions(c jsonb, preferred boolean default false)
returns void language plpgsql immutable security invoker set search_path = '' as $$
declare k text; v jsonb; x jsonb;
begin
  if c is null or jsonb_typeof(c)<>'object' or octet_length(c::text)>4096 then raise exception 'Invalid conditions' using errcode='22023'; end if;
  for k,v in select * from jsonb_each(c) loop
    if k not in ('occupation','district','wage','workdays','employment_type','experience') or (preferred and k='experience') then raise exception 'Invalid condition field' using errcode='22023'; end if;
    if k='wage' then
      if jsonb_typeof(v)<>'object' then raise exception 'Invalid wage' using errcode='22023'; end if;
      if (select array_agg(key order by key) from jsonb_object_keys(v) as key) is distinct from array['minimum','type'] or jsonb_typeof(v->'type')<>'string' or v->>'type' not in ('시급','일급','월급','연봉') or jsonb_typeof(v->'minimum')<>'number' or (v->>'minimum')::numeric<>trunc((v->>'minimum')::numeric) or (v->>'minimum')::numeric not between 1 and 10000000000 then raise exception 'Invalid wage' using errcode='22023'; end if;
    else
      if jsonb_typeof(v)<>'array' then raise exception 'Invalid list' using errcode='22023'; end if;
      if jsonb_array_length(v) not between 1 and 25 or (select count(distinct value) from jsonb_array_elements(v))<>jsonb_array_length(v) then raise exception 'Invalid list length' using errcode='22023'; end if;
      for x in select * from jsonb_array_elements(v) loop
        if k='workdays' then
          if jsonb_typeof(x)<>'number' or (x#>>'{}')::numeric not between 1 and 7 or (x#>>'{}')::numeric<>trunc((x#>>'{}')::numeric) then raise exception 'Invalid workdays' using errcode='22023'; end if;
        else
          if jsonb_typeof(x)<>'string' then raise exception 'Invalid string list' using errcode='22023'; end if;
          if (k='occupation' and (x#>>'{}') !~ '^[0-9]{6}$') or (k='employment_type' and (x#>>'{}') not in ('10','11','20','21')) or (k='experience' and (x#>>'{}') not in ('신입','경력','관계없음')) or (k='district' and (x#>>'{}') not in ('강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구')) then raise exception 'Invalid condition value' using errcode='22023'; end if;
        end if;
      end loop;
    end if;
  end loop;
end $$;

create function public.compass_condition(j jsonb, field text, wanted jsonb, related_codes text[] default '{}', allow_related boolean default false)
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare actual jsonb; state text; reason text; factor numeric;
begin
  if field='wage' then
    if j->>'wage_type' is distinct from wanted->>'type' then state:='unknown';reason:='wage_unit_not_comparable';
    elsif j->>'wage_min' is null then state:='unknown';reason:='missing_value';
    elsif (j->>'wage_min')::numeric >= (wanted->>'minimum')::numeric then state:='match';reason:='minimum_satisfied';factor:=1;
    elsif j->>'wage_max' is not null and (j->>'wage_max')::numeric < (wanted->>'minimum')::numeric then state:='mismatch';reason:='maximum_below_minimum';factor:=0;
    else state:='unknown';reason:='wage_range_crosses_minimum'; end if;
  else
    actual:=j->(case field when 'occupation' then 'occupation_code' when 'employment_type' then 'employment_type_code' else field end);
    if actual is null or actual='null'::jsonb or actual='""'::jsonb then state:='unknown';reason:='missing_value';
    elsif wanted @> jsonb_build_array(actual) then state:='match';reason:='exact_match';factor:=1;
    elsif field='occupation' and allow_related and j->>'occupation_code'=any(related_codes) then state:='related';reason:='verified_related_occupation';factor:=0.5;
    else state:='mismatch';reason:='different_value';factor:=0; end if;
  end if;
  return jsonb_build_object('field',field,'state',state,'reason',reason,'factor',factor);
end $$;

create function public.compass_evaluate_job(j jsonb, required jsonb, preferred jsonb, related_codes text[] default '{}')
returns jsonb language plpgsql immutable security invoker set search_path = '' as $$
declare k text; v jsonb; d jsonb; rd jsonb:='[]'; pd jsonb:='[]'; eligibility text:='eligible';
  weights constant jsonb:='{"occupation":35,"district":25,"wage":20,"workdays":10,"employment_type":10}';
  denominator numeric:=0; earned numeric:=0; possible numeric:=0; unknowns integer:=0; weight numeric;
begin
  for k,v in select * from jsonb_each(required) loop
    d:=public.compass_condition(j,k,v); rd:=rd||jsonb_build_array(d);
    if d->>'state'='mismatch' then eligibility:='excluded';
    elsif d->>'state'='unknown' and eligibility<>'excluded' then eligibility:='needs_review'; end if;
  end loop;
  if eligibility<>'excluded' then
    for k,v in select * from jsonb_each(preferred) loop
      d:=public.compass_condition(j,k,v,related_codes,true); weight:=(weights->>k)::numeric;
      pd:=pd||jsonb_build_array(d||jsonb_build_object('weight',weight));denominator:=denominator+weight;
      earned:=earned+coalesce((d->>'factor')::numeric,0)*weight;
      if d->>'state'='unknown' then possible:=possible+weight;unknowns:=unknowns+1; end if;
    end loop;
  end if;
  return jsonb_build_object('eligibility',eligibility,'required_details',rd,'preference_details',pd,
    'confirmed_score',case when denominator>0 then 100*earned/denominator end,
    'possible_score',case when denominator>0 then 100*(earned+possible)/denominator end,
    'unknown_preferences',unknowns,'selected_weight',denominator,
    'score_label',case when denominator>0 then round(100*earned/denominator,1)::text||' ~ '||round(100*(earned+possible)/denominator,1)::text end);
end $$;

create function public.compass_recommend_jobs(required jsonb default '{}', preferred jsonb default '{}', view_name text default 'all', result_group text default 'eligible', page_number integer default 1, page_size integer default 20)
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
    order by score desc nulls last,unknowns asc,posted desc,id collate "C" asc
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

revoke all on function public.compass_validate_conditions(jsonb,boolean), public.compass_condition(jsonb,text,jsonb,text[],boolean), public.compass_evaluate_job(jsonb,jsonb,jsonb,text[]), public.compass_recommend_jobs(jsonb,jsonb,text,text,integer,integer) from public;
grant execute on function public.compass_validate_conditions(jsonb,boolean), public.compass_condition(jsonb,text,jsonb,text[],boolean), public.compass_evaluate_job(jsonb,jsonb,jsonb,text[]), public.compass_recommend_jobs(jsonb,jsonb,text,text,integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
