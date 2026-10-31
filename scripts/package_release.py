"""Build a local handoff ZIP without dependencies, credentials, logs or raw files."""
from pathlib import Path
import hashlib,json,zipfile
ROOT=Path(__file__).resolve().parents[1]
target=ROOT/'seoul_job_compass_stage2_bundle.zip'
root_files=['README.md','AGENTS.md','DATA_AUDIT.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','wrangler.jsonc','worker-configuration.d.ts','index.html','.gitignore','.env.example']
files=[ROOT/f for f in root_files]
for directory in ['web','worker','scripts','tests','supabase','docs','reports','dist','data/processed','data/metadata']:
    for p in (ROOT/directory).rglob('*'):
        if not p.is_file() or '__pycache__' in p.parts:continue
        if p.name=='release_manifest.json':continue
        if p.suffix not in ['.md','.json','.sql','.py','.mjs','.ts','.tsx','.css','.js','.html','.png']:continue
        files.append(p)
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(set(files)):z.write(p,p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert not any(any(s in n for s in ['node_modules/','.dev.vars','.tools/','.tmp/','data/stage1/']) for n in z.namelist())
    for required in ['README.md','worker/index.ts','reports/STAGE1_TEST_REPORT.md','reports/STAGE2_TEST_REPORT.md','data/processed/jobs.json','supabase/schema.sql']:
        assert required in z.namelist(),required
result={'archive':target.name,'files':len(set(files)),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'excluded':['node_modules','credentials','local logs','original/stage1 input files','official PDF']}
(ROOT/'reports/release_manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
