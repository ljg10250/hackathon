"""Read-only original CSV / official KOSIS snapshot / processed values comparison."""
import argparse, csv, hashlib, json, pathlib, re
from decimal import Decimal
from datetime import datetime, timezone

p=argparse.ArgumentParser()
p.add_argument('--app',type=pathlib.Path,required=True)
p.add_argument('--output',type=pathlib.Path,required=True)
p.add_argument('--raw-dir',type=pathlib.Path)
a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
raw=(a.raw_dir or root)/'청년고용률_시도__20261030165319.csv'
before=hashlib.sha256(raw.read_bytes()).hexdigest()
snap=json.loads((root/'data/metadata/kosis_employment_20261031.json').read_text(encoding='utf-8'))
obs=snap['observations']
actual={(r['C1_NM'],r['PRD_DE']):r for r in obs}
assert len(actual)==len(obs)==375
with raw.open(encoding='utf-8-sig',newline='') as f:
    reader=csv.DictReader(f); rows=list(reader); headers=reader.fieldnames[2:]
assert len(rows)==17 and len(headers)==23
count=0; missing=[]; covered=set()
for row in rows:
    assert row['연령계층별']=='15 - 29세'
    for h in headers:
        year,q=re.fullmatch(r'(\d{4})\.([1-4])/4',h).groups()
        key=(row['시도별'],year+'0'+q); value=row[h]; r=actual.get(key)
        if value=='-':
            assert r is None or r['DT'] in ('-',''),key
            missing.append({'region':key[0],'period':year+'-Q'+q,'raw_token':value,'official_response':'observation_absent' if r is None else r['DT']})
        else:
            assert r is not None,key
            assert r['C2']=='75' and r['C2_NM']=='15 - 29세' and r['UNIT_NM']=='%' and r['ITM_ID']=='T90' and r['PRD_SE']=='Q'
            assert Decimal(value)==Decimal(r['DT']),(key,value,r['DT'])
            count+=1; covered.add(key)
assert len(missing)==16 and covered==set(actual)
items=snap['items']
assert any(r.get('OBJ_ID')=='A' and r['ITM_ID']=='00' and r['ITM_NM']=='계' and r['ITM_NM_ENG']=='Total' for r in items)
assert any(r.get('OBJ_ID')=='A' and r['ITM_ID']=='11' and r['ITM_NM']=='서울특별시' for r in items)
survey={k:v for row in snap['survey_explanation'] for k,v in row.items()}
assert survey['examinObjArea']=='전국'
assert '상주' in survey['examinObjrange']
processed=json.loads((a.app/'data/processed/youth_employment_stats.json').read_text(encoding='utf-8'))
public=[r for r in processed if r['source_id']=='employment']
assert len(public)==46 and len(processed)==92
for r in public:
    region='계' if r['region']=='전국' else r['region']
    period=r['period'].replace('-Q','0')
    assert Decimal(str(r['value']))==Decimal(actual[(region,period)]['DT'])
    assert r['age_scope']=='15-29' and r['metric']=='employment_rate'
assert hashlib.sha256(raw.read_bytes()).hexdigest()==before
report={
 'verified_at':datetime.now(timezone.utc).isoformat(),'raw_sha256':before,
 'official_snapshot_sha256':hashlib.sha256((root/'data/metadata/kosis_employment_20261031.json').read_bytes()).hexdigest(),
 'table_id':'INH_1DA7015S','org_id':'101','item_id':'T90','age_code':'75','age_scope':'15~29세','unit':'%','frequency':'quarterly',
 'raw_regions':17,'raw_periods':23,'matched_numeric_cells':count,'missing_cells_preserved':missing,'processed_rows_matched':46,
 'region_normalization':{'00':'계 → 전국','11':'서울특별시'},
 'normalization_evidence':['ITM: 시도별(A)의 00=계/Total, 11=서울특별시/Seoul','SOURCE: 경제활동인구조사','EXPL examinObjArea=전국, examinObjrange=전국 표본가구 내 상주하는 만 15세 이상 가구원','동일 표의 연령 75=15~29세, 항목 T90=고용률(%), Q=분기'],
 'geography_basis':'거주지 기준(전국 표본가구 내 상주 가구원 조사)',
 'limitations':['375개 수치와 16개 결측을 대조한 CSV-표 내용 매칭이며 과거 다운로드 URL·추출시각 복구가 아님','전국은 서울을 포함함. 고용률은 개인 취업확률이나 지역 인과효과가 아님','표본오차·유의성은 계산하지 않음','실업률·자치구 원 표 검증을 대신하지 않음'],
 'passed':True
}
a.output.parent.mkdir(parents=True,exist_ok=True)
with a.output.open('x',encoding='utf-8') as f: json.dump(report,f,ensure_ascii=False,indent=2)
print(json.dumps({k:v for k,v in report.items() if k in ['passed','matched_numeric_cells','processed_rows_matched','raw_sha256']},ensure_ascii=False))
