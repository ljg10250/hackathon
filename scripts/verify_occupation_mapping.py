"""Match actual code+label pairs against the official 2025 placement codebook.

Only exact pairs after Unicode/whitespace normalization are accepted. A hierarchy
mapping does not establish a 'related occupation' recommendation relationship.
"""
import csv, json, pathlib, re, sys, unicodedata, hashlib
from datetime import datetime, timezone
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'.tools'))
from pypdf import PdfReader
from prepare_data import insert
ROOT=pathlib.Path(__file__).resolve().parents[1]
pdf=ROOT/'data/metadata/placement_2025.pdf'
reader=PdfReader(pdf)
def normalize(s):
    return re.sub(r'\s+','',unicodedata.normalize('NFKC',s)).replace('ㆍ','·')
official={}
pages={}
# The contents table lists the 6-digit code and uncorrupted Korean label.
for page_num,page in enumerate(reader.pages[:72],1):
    for line in page.extract_text().splitlines():
        m=re.match(r'^\s*([0-9]{6})\s+(.+?)\s+[\x00-\x1f]+\s*$',line)
        if m:
            code,label=m.groups()
            official.setdefault(code,set()).add(normalize(label))
            pages.setdefault(code,[]).append(page_num)
jobs=list(csv.DictReader((ROOT/'data/stage1/seoul_jobs_stage1.csv').open(encoding='utf-8-sig')))
pairs={(r['occupation_code_raw'],r['occupation_label_raw']) for r in jobs}
verified=[];pending=[]
for code,label in sorted(pairs):
    name=re.sub(r'\('+code+r'\)$','',label)
    if normalize(name) in official.get(code,set()):
        verified.append(dict(source_code=code,source_system='placement_csv',source_version='not_recorded;exact_2025_pair_match',target_code=code[:2],target_system='KECO',target_version='2025',relation='hierarchy',evidence_url='https://statistics.keis.or.kr/keis/ko/proj/114/pblc/detail.do?categoryIdx=125&pubIdx=11319',verified_at=datetime.now(timezone.utc).isoformat(),source_id='jobs'))
    else: pending.append({'code':code,'label':label})
accepted={r['source_code'] for r in verified}
report={'official_pdf_sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'official_codes_extracted':len(official),'input_code_label_pairs':len(pairs),'verified_pairs':len(verified),'verified_job_rows':sum(r['occupation_code_raw'] in accepted for r in jobs),'pending_pairs':pending,'evidence_pdf_pages':pages,'related_occupation_edges':0,'rule':'Exact official code AND Korean label; NFKC, whitespace and middle-dot normalization only. Prefix used only after official pair membership verification. Source version not declared; exact pair conformity only.'}
(ROOT/'reports/occupation_mapping_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'data/processed/occupation_mappings.json').write_text(json.dumps(verified,ensure_ascii=False),encoding='utf-8')
for start in range(0,len(verified),150):
    (ROOT/f'data/processed/{100+start//150}-occupation_mappings.sql').write_text(insert('occupation_mappings',verified[start:start+150]),encoding='utf-8')
source=dict(id='mapping',source='한국고용정보원',title='취업알선직업분류 2025 해설서',source_url='https://statistics.keis.or.kr/keis/ko/proj/114/pblc/detail.do?categoryIdx=125&pubIdx=11319',table_id=None,frequency='classification_version',age_scope='해당 없음',unit='직종 코드',geography_basis='전국 직업분류',period='2025 분류 · 2026-06-30 게시',verification_status='verified_hierarchy_partial',notes='공식 PDF 963코드 추출. 공고 코드+명칭 323쌍 일치. 원본 서비스 버전 미기록. 계층 연결만 검증; 관련 직종 추천 관계 없음.')
sources=json.loads((ROOT/'data/metadata/sources.json').read_text(encoding='utf-8'))
sources=[s for s in sources if s['id']!='mapping']+[source]
(ROOT/'data/metadata/sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'data/processed/data_sources.json').write_text(json.dumps(sources,ensure_ascii=False),encoding='utf-8')
imp=dict(id='import-mapping-'+report['official_pdf_sha256'][:12],source_id='mapping',file_sha256=report['official_pdf_sha256'],row_count=len(verified),quarantined_count=len(pending),status='validated_partial',validation_notes='공식 코드+명칭 일치 쌍만 계층 연결. 235쌍 보류. 관련 직종 관계 0개. 근거 PDF 페이지는 occupation_mapping_validation.json 참조.')
imports=json.loads((ROOT/'data/processed/data_imports.json').read_text(encoding='utf-8'))
imports=[r for r in imports if r['source_id']!='mapping']+[imp]
(ROOT/'data/processed/data_imports.json').write_text(json.dumps(imports,ensure_ascii=False),encoding='utf-8')
(ROOT/'data/processed/103-mapping_provenance.sql').write_text(insert('data_sources',[source])+insert('data_imports',[imp]),encoding='utf-8')
audit_path=ROOT/'reports/stage1_followup_results.json'
audit=json.loads(audit_path.read_text(encoding='utf-8'))
audit['mapping_verified']=len(verified)
audit['mapping_verified_job_rows']=report['verified_job_rows']
audit['table_counts'].update(occupation_mappings=len(verified),data_sources=len(sources),data_imports=len(imports))
audit['mapping_report']='occupation_mapping_validation.json'
audit_path.write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['pending_pairs','evidence_pdf_pages']},ensure_ascii=False))
