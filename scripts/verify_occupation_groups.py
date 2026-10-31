"""Read-only explicit official headings / market category audit. Needs Poppler."""
import argparse,hashlib,json,pathlib,re,subprocess
from datetime import datetime,timezone
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--pdf',type=pathlib.Path,default=root/'data/metadata/placement_2025.pdf');p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
pdf_sha=hashlib.sha256(a.pdf.read_bytes()).hexdigest()
assert pdf_sha=='af094c3674901879dd1571c75ef5b0b2d1972e12ee54fdc0cb213c34fcfb7a22'
text=subprocess.run(['pdftotext','-f','26','-l','73','-layout',str(a.pdf),'-'],capture_output=True,check=True,encoding='utf-8').stdout
groups={};pages={}
for page_number,page in enumerate(text.split('\f'),26):
 for line in page.splitlines():
  m=re.match(r'^\s*(\d{2})\s+([가-힣].*?)(?:\s+[A-Za-z]|$)',line)
  if m:code,name=m.groups();groups[code]=name.strip();pages[code]=page_number
assert len(groups)==35
normalize=lambda s:re.sub(r'\s+','',s)
market=[r for r in json.loads((root/'data/processed/occupation_market_stats.json').read_text(encoding='utf-8')) if r['classification']=='KECO2025']
artifact=json.loads((root/'data/metadata/occupation_groups_2025.json').read_text(encoding='utf-8'))
assert {normalize(n) for n in groups.values()}=={normalize(r['occupation_name']) for r in market}
assert {g['code']:g['official_name'] for g in artifact['groups']}==groups
report={'verified_at':datetime.now(timezone.utc).isoformat(),'pdf_sha256':pdf_sha,'groups':35,'matched_market_names':35,'evidence_pdf_pages':pages,'rule':'Explicit two-digit headings; whitespace-only name normalization. No new leaf/related relations.','passed':True}
a.output.parent.mkdir(parents=True,exist_ok=True)
with a.output.open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
print(json.dumps({'groups':35,'matched_market_names':35,'passed':True}))
