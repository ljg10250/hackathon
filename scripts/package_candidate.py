"""Create a NEW submission candidate archive; no publishing, credentials, raw originals or overwrites."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,re,zipfile
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',default='seoul_job_compass_candidate_20261031.zip')
parser.add_argument('--manifest',default='candidate_manifest_20261031.json')
args=parser.parse_args()
assert Path(args.output).name==args.output and args.output.endswith('.zip')
assert Path(args.manifest).name==args.manifest and args.manifest.endswith('.json')
target=ROOT/args.output;manifest_path=ROOT/'reports'/args.manifest
assert not target.exists() and not manifest_path.exists(),'Choose new filenames; existing artifacts are preserved.'
files=[ROOT/n for n in ['README.md','AGENTS.md','DATA_AUDIT.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','wrangler.jsonc','worker-configuration.d.ts','index.html','.gitignore','.env.example']]
for directory in ['web','worker','scripts','tests','supabase','docs','reports','dist','data/processed','data/metadata']:
    for p in (ROOT/directory).rglob('*'):
        if not p.is_file() or '__pycache__' in p.parts:continue
        if p.name.startswith('candidate_manifest') or p.suffix not in ['.md','.json','.sql','.py','.mjs','.ts','.tsx','.css','.js','.html','.png']:continue
        files.append(p)
records=[]
secret=re.compile(rb'(?:sb_secret_[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)')
for p in sorted(set(files)):
    name=p.relative_to(ROOT).as_posix();content=p.read_bytes()
    assert not secret.search(content),'Potential secret in '+name
    records.append({'path':name,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
with zipfile.ZipFile(target,'x',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for r in records:z.write(ROOT/r['path'],r['path'])
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert not any(any(part in n for part in ['node_modules/','.dev.vars','.tools/','.tmp/','data/stage1/','data/raw/','.log']) for n in z.namelist())
    for r in records:assert hashlib.sha256(z.read(r['path'])).hexdigest()==r['sha256']
    for required in ['reports/STAGE5_TEST_REPORT.md','reports/STAGE6_PREPARATION_REPORT.md','docs/DEMO_GUIDE.md','scripts/check_browser.mjs','scripts/capture_api_demo.mjs','web/App.tsx','dist/index.html']:assert required in z.namelist(),required
result={'archive':target.name,'verified_at':datetime.now(timezone.utc).isoformat(),'files':len(records),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'archive_integrity':'all entries and SHA256 verified','credential_scan':'recognized secret-key/private-key formats absent; excluded local credential files','excluded':['node_modules','local credentials','.tools','.tmp','local logs','original raw/stage1 data','official PDF/text extraction'],'submission_status':'local candidate; actual submission and official-format compliance not confirmed','entries':records}
manifest_path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='entries'},ensure_ascii=False))
