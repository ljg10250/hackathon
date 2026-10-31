-- Stage 2 baseline: seven tables, append-only imports, explicit public read surface.
begin;
create table public.data_sources (
 id text primary key, source text not null, title text not null, source_url text,
 table_id text, frequency text not null, age_scope text, unit text not null,
 geography_basis text not null, period text not null,
 retrieved_at timestamptz, verified_at timestamptz,
 verification_status text not null, notes text not null
);
create table public.data_imports (
 id text primary key, source_id text not null references public.data_sources(id),
 file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
 row_count integer not null check (row_count >= 0), quarantined_count integer not null default 0,
 status text not null check (status in ('validated_partial','published','failed')),
 validation_notes text not null, imported_at timestamptz not null default now(),
 unique(source_id,file_sha256)
);
create table public.jobs (
 id text primary key, source_id text not null references public.data_sources(id),
 source_row integer not null, company text not null, title text not null,
 district text not null, occupation_code text not null check (occupation_code ~ '^[0-9]{6}$'),
 occupation_name text not null, experience text not null,
 employment_type text, employment_type_code text,
 workdays smallint check (workdays between 1 and 7), wage_type text not null,
 wage_min bigint check (wage_min > 0), wage_max bigint,
 wage_text text not null, posted_at date not null, deadline_date date, deadline_kind text,
 quality_status text not null check (quality_status in ('partial','verified','quarantined')),
 conversion_verified boolean not null default false,
 original_url text, unique(source_id,source_row), check(wage_max is null or wage_max >= wage_min)
);
create table public.youth_employment_stats (
 source_id text not null references public.data_sources(id), region text not null,
 period text not null check(period ~ '^[0-9]{4}-Q[1-4]$'), metric text not null,
 value numeric(4,1) check(value between 0 and 100), age_scope text,
 verification_status text not null, primary key(source_id,region,period,metric)
);
create table public.district_youth_stats (
 source_id text not null references public.data_sources(id), region text not null,
 period text not null check(period ~ '^[0-9]{4}-H[12]$'), metric text not null,
 value numeric(4,1) check(value between 0 and 100), age_scope text,
 verification_status text not null, primary key(source_id,region,period,metric)
);
create table public.occupation_market_stats (
 source_id text not null references public.data_sources(id), classification text not null,
 occupation_name text not null, period text not null check(period ~ '^[0-9]{4}-[0-9]{2}$'),
 openings integer not null check(openings >= 0), seeking integer not null check(seeking >= 0),
 geography_basis text not null, age_scope text not null,
 primary key(source_id,classification,occupation_name,period)
);
create table public.occupation_mappings (
 source_code text not null, source_system text not null, source_version text not null,
 target_code text not null, target_system text not null, target_version text not null,
 relation text not null check (relation in ('hierarchy','related')),
 evidence_url text not null, verified_at timestamptz not null,
 source_id text references public.data_sources(id),
 primary key(source_code,source_system,source_version,target_code,target_system,target_version,relation)
);
create index jobs_district_posted_idx on public.jobs(district,posted_at desc,id);
create index jobs_occupation_idx on public.jobs(occupation_code,posted_at desc,id);
create index jobs_public_posted_idx on public.jobs(posted_at desc,id) where quality_status <> 'quarantined';
create index imports_source_idx on public.data_imports(source_id);
create index mappings_source_idx on public.occupation_mappings(source_id);
create index youth_source_idx on public.youth_employment_stats(source_id);
create index district_source_idx on public.district_youth_stats(source_id);
create index market_source_idx on public.occupation_market_stats(source_id);
alter table public.data_sources enable row level security;
alter table public.data_imports enable row level security;
alter table public.jobs enable row level security;
alter table public.youth_employment_stats enable row level security;
alter table public.district_youth_stats enable row level security;
alter table public.occupation_market_stats enable row level security;
alter table public.occupation_mappings enable row level security;
revoke all on public.data_sources,public.data_imports,public.jobs,public.youth_employment_stats,public.district_youth_stats,public.occupation_market_stats,public.occupation_mappings from anon,authenticated;
grant select on public.data_sources,public.jobs,public.youth_employment_stats,public.district_youth_stats,public.occupation_market_stats,public.occupation_mappings to anon,authenticated;
create policy source_read on public.data_sources for select to anon,authenticated using(true);
create policy jobs_read on public.jobs for select to anon,authenticated using(quality_status <> 'quarantined');
-- Unemployment age selection remains unverified: store for review, deny public reads.
create policy youth_read on public.youth_employment_stats for select to anon,authenticated using(verification_status <> 'pending_age');
create policy district_read on public.district_youth_stats for select to anon,authenticated using(true);
create policy market_read on public.occupation_market_stats for select to anon,authenticated using(true);
create policy mapping_read on public.occupation_mappings for select to anon,authenticated using(true);
commit;
