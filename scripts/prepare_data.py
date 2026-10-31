"""Read-only source audit, conservative normalization and reproducible SQL batches."""
import argparse, csv, hashlib, io, json, pathlib, re, collections, zipfile
from datetime import date

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'processed'
OUT.mkdir(parents=True, exist_ok=True)

def read(name):
    return list(csv.DictReader((ROOT / 'data/stage1' / name).open(encoding='utf-8-sig', newline='')))

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def text_or_none(v):
    return v or None

def literal(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def insert(table, rows):
    if not rows: return ''
    cols = list(rows[0])
    return 'insert into public.' + table + '(' + ','.join(cols) + ') values\n' + ',\n'.join('(' + ','.join(literal(r[k]) for k in cols) + ')' for r in rows) + ' on conflict do nothing;\n'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw-dir', type=pathlib.Path, required=True)
    args = ap.parse_args()
    raw = args.raw_dir / '서울시 일자리포털 채용정보.csv'
    b = raw.read_bytes()
    original = list(csv.DictReader(io.StringIO(b.decode('cp949', errors='replace'))))
    jobs = read('seoul_jobs_stage1.csv')
    assert len(original) == 42663 and len(jobs) == 10748
    encoding = []
    for r in jobs:
        src = original[int(r['source_row']) - 2]
        assert src['채용제목'] == r['job_title']
        bad = [k for k, v in src.items() if '\ufffd' in v]
        if bad: encoding.append({'source_row': int(r['source_row']), 'affected_fields': bad})
    assert len(encoding) == 5
    (OUT/'encoding_quarantine.json').write_text(json.dumps(encoding,ensure_ascii=False,indent=2),encoding='utf-8')
    epoch = digest(ROOT/'data/stage1/seoul_jobs_stage1.csv')[:12]
    sources = [
      dict(id='jobs', source='서울특별시', title='서울시 일자리포털 채용정보',source_url='https://data.seoul.go.kr/dataList/OA-23047/S/1/datasetView.do',table_id='OA-23047',frequency='snapshot',age_scope='전체 연령·청년 전용 아님',unit='공고 행',geography_basis='근무지 서울',period='2026-08-31~2026-10-29 등록',verification_status='partial',notes='원본 추출시각·현재 모집상태·직종분류 버전 미확인. 공식 카탈로그 스키마와 대조. 원 공고 ID/URL 없음.'),
      dict(id='employment',source='KOSIS · 원 표 연결 미확인',title='청년고용률(시도)',source_url='https://kosis.kr/visual/eRegionIndex/eRegionTheme.do',table_id=None,frequency='quarterly',age_scope='15~29세 (CSV 명시)',unit='%',geography_basis='거주지 기준 추정·원 표 설명 대조 보류',period='2021-Q1~2026-Q3',verification_status='pending_metadata',notes='CSV 계→전국은 기존 파생 파일의 해석. 원 표 대조 전 확정 비교/격차 비활성.'),
      dict(id='unemployment',source='KOSIS · 원 표 연결 미확인',title='청년실업률(시도)',source_url='https://kosis.kr/visual/eRegionIndex/eRegionTheme.do',table_id=None,frequency='quarterly',age_scope='미확인',unit='%',geography_basis='시도 (원 표 확인 필요)',period='2021-Q1~2026-Q3',verification_status='pending_age',notes='일반 청년실업률 정의는 15~29세이나 해당 CSV 원 표·연령 선택은 미확인. 공개 수치 제외.'),
      dict(id='districts',source='KOSIS · 원 표 연결 미확인',title='청년고용률(시군구)',source_url='https://kosis.kr/visual/eRegionIndex/eRegionTheme.do',table_id=None,frequency='halfyear',age_scope='15~29세 (CSV 명시)',unit='%',geography_basis='서울 자치구·거주지 기준 추정',period='2021-H1~2026-H1',verification_status='pending_metadata',notes='원 표 ID·지역별고용조사 반기 대표 시점·주석 대조 필요. 서울 평균 재계산 금지.'),
      dict(id='market',source='한국고용정보원 · 고용24',title='2026년 9월 구인구직통계',source_url='https://www.keis.or.kr/keis/ko/bbs/123/detail.do?pstSn=64778',table_id=None,frequency='monthly',age_scope='전체 연령',unit='신규구인인원 명 / 신규구직건수 건',geography_basis='구인·구직 등록 지방노동관서 기준',period='2026-09',verification_status='local_verified',notes='KECO2025 35개, KSCO8 57개 별도 분류. 원본 XLSX SHA256 보존. 공식 첨부와 바이트 일치 미검증.'),
    ]
    tables={'data_sources':sources,'jobs':[],'youth_employment_stats':[],'district_youth_stats':[],'occupation_market_stats':[],'occupation_mappings':[],'data_imports':[]}
    counts=collections.Counter()
    for r in jobs:
        days=re.search(r'주\s*([1-7])\s*일\s*근무',r['work_schedule_raw'])
        # Shift/rotation descriptions are not sufficiently reliable for a fixed-day filter.
        ambiguous=bool(re.search(r'교대|격일|탄력|협의|주\s*\d\s*[~∼-]\s*\d\s*일',r['work_schedule_raw']))
        isbad=r['needs_text_decode_review']=='True'
        lo=int(r['wage_min_krw_raw_unit']) if r['wage_min_krw_raw_unit'] else None
        hi=int(r['wage_max_krw_raw_unit']) if r['wage_max_krw_raw_unit'] else None
        wage=re.fullmatch(r'(시급|일급|월급|연봉)\s*([\d,]+)원\s*이상(?:\s*~\s*([\d,]+)원\s*이하)?\s*,.*',r['wage_text_raw'])
        assert wage and int(wage[2].replace(',',''))==lo
        assert (int(wage[3].replace(',','')) if wage[3] else None)==hi
        assert hi is None or hi>=lo>0
        record=dict(id=f'job-{epoch}-{r["source_row"]}',source_id='jobs',source_row=int(r['source_row']),company=r['company_name'],title=r['job_title'],district=r['district'],occupation_code=r['occupation_code_raw'],occupation_name=r['occupation_label_raw'],experience=r['experience_raw'],employment_type=r['employment_type_raw'],employment_type_code=r['employment_type_code'],workdays=int(days[1]) if days and not ambiguous and not isbad else None,wage_type=r['wage_type'],wage_min=lo,wage_max=hi,wage_text=r['wage_text_raw'],posted_at=r['posted_at'],deadline_date=r['deadline_at'] or None,deadline_kind=r['deadline_kind'],quality_status='quarantined' if isbad else 'partial',conversion_verified=False,original_url=None)
        tables['jobs'].append(record)
        counts['workdays_unknown']+=record['workdays'] is None
    assert len({r['id'] for r in tables['jobs']})==len(jobs)
    assert len({r['district'] for r in tables['jobs']})==25
    for fname,source,table,metric in [('youth_employment_quarterly.csv','employment','youth_employment_stats','employment_rate'),('youth_unemployment_quarterly.csv','unemployment','youth_employment_stats','unemployment_rate'),('district_youth_employment_halfyear.csv','districts','district_youth_stats','employment_rate')]:
        for r in read(fname):
            y,n=map(int,re.match(r'(\d{4})\.(\d)/',r['period']).groups())
            period=f'{y}-'+('H' if source=='districts' else 'Q')+str(n)
            value=float(r['value_percent']); assert 0<=value<=100
            row=dict(source_id=source,region=r['region'],period=period,metric=metric,value=value,age_scope=None if source=='unemployment' else '15-29',verification_status='pending_age' if source=='unemployment' else 'pending_metadata')
            tables[table].append(row)
    market=read('occupation_market_seoul_202609.csv')
    for r in market:
        tables['occupation_market_stats'].append(dict(source_id='market',classification=r['classification'],occupation_name=r['occupation_middle_category_name'],period='2026-09',openings=int(r['new_openings_people']),seeking=int(r['new_seeking_cases']),geography_basis='registration_office',age_scope='all'))
    for cls,num in [('KECO2025',35),('KSCO8',57)]:
        a=[r for r in tables['occupation_market_stats'] if r['classification']==cls]
        assert len(a)==num and sum(r['openings'] for r in a)==18299 and sum(r['seeking'] for r in a)==59668
    hashes={str(f.name):digest(f) for f in args.raw_dir.iterdir() if f.suffix in ['.csv','.xlsx']}
    manifests={}
    for sid in ['jobs','employment','unemployment','districts','market']:
        fname={'jobs':'seoul_jobs_stage1.csv','employment':'youth_employment_quarterly.csv','unemployment':'youth_unemployment_quarterly.csv','districts':'district_youth_employment_halfyear.csv','market':'occupation_market_seoul_202609.csv'}[sid]
        source_rows=[r for table in ['jobs','youth_employment_stats','district_youth_stats','occupation_market_stats'] for r in tables[table] if r['source_id']==sid]
        tables['data_imports'].append(dict(id='import-'+sid+'-'+digest(ROOT/'data/stage1'/fname)[:12],source_id=sid,file_sha256=digest(ROOT/'data/stage1'/fname),row_count=len(source_rows),quarantined_count=5 if sid=='jobs' else 46 if sid=='unemployment' else 0,status='validated_partial',validation_notes='原본 불변·행수·범위·집계 검사 통과. 미확인 메타데이터/필드는 그대로 보류.'))
    batches=[]
    for table,rs in tables.items():
        for start in range(0,len(rs),150):
            fn=f'{len(batches):03}-{table}.sql'
            (OUT/fn).write_text(insert(table,rs[start:start+150]),encoding='utf-8')
            batches.append(fn)
        (OUT/(table+'.json')).write_text(json.dumps(rs,ensure_ascii=False),encoding='utf-8')
    audit={'as_of':'2026-10-31','raw_hashes':hashes,'stage1_hashes':{f.name:digest(f) for f in (ROOT/'data/stage1').glob('*')},'raw_rows':len(original),'seoul_rows':len(jobs),'encoding_quarantine':encoding,'encoding_replacement_count':6,'national_decode_error_count':b.decode('cp949',errors='replace').count('\ufffd'),'encoding_alternatives':{e:b.decode(e,errors='replace').count('\ufffd') for e in ['cp949','euc_kr','utf-8']},'table_counts':{t:len(r) for t,r in tables.items()},'workdays_unknown':counts['workdays_unknown'],'wage_parsed':len(jobs),'wage_conversion_verified':0,'mapping_verified':0,'batches':batches}
    (ROOT/'reports/stage1_followup_results.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'data/metadata/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in audit.items() if k not in ['batches','raw_hashes','stage1_hashes']},ensure_ascii=False))

if __name__=='__main__': main()
