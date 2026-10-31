import csv, pathlib, json
from datetime import datetime, timezone
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=pathlib.Path(__import__('sys').argv[1])
checks={}
for name in ['youth_employment_quarterly.csv','youth_unemployment_quarterly.csv','district_youth_employment_halfyear.csv']:
    rows=list(csv.DictReader((ROOT/'data/stage1'/name).open(encoding='utf-8-sig',newline='')))
    raw=list(csv.DictReader((RAW/rows[0]['source_file']).open(encoding='utf-8-sig',newline='')))
    region_col=next(iter(raw[0]))
    by_region={r[region_col]:r for r in raw}
    for r in rows:
        key='계' if r['region']=='전국' and name=='youth_employment_quarterly.csv' else r['region']
        assert float(by_region[key][r['period']])==float(r['value_percent'])
    checks[name]={'matched_cells':len(rows),'source_file':rows[0]['source_file']}
jobs=list(csv.DictReader((ROOT/'data/stage1/seoul_jobs_stage1.csv').open(encoding='utf-8-sig',newline='')))
with (RAW/'서울시 일자리포털 채용정보.csv').open(encoding='cp949',errors='replace',newline='') as f: raw=list(csv.DictReader(f))
fields={'company_name':'기업명','job_title':'채용제목','occupation_code_raw':'직종코드','occupation_label_raw':'모집직종','employment_type_raw':'고용형태','employment_type_code':'고용형태코드','experience_raw':'경력','wage_text_raw':'임금조건','work_schedule_raw':'근무시간/형태'}
for r in jobs:
    original=raw[int(r['source_row'])-2]
    for outfield,infield in fields.items():assert r[outfield]==original[infield],(r['source_row'],outfield)
checks['jobs']={'matched_rows':len(jobs),'matched_fields_per_row':len(fields)}
(ROOT/'reports/stage1_lineage_checks.json').write_text(json.dumps({'checked_at':datetime.now(timezone.utc).isoformat(),'checks':checks},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False))
