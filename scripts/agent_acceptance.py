"""An independent verdict, never inferred from a model's final response.

Run against the candidate before reviewer edits. The application/database must be
running at BASE_URL. This runner is a quality gate, not an OS sandbox.
"""
import argparse,hashlib,json,os,subprocess,time
from pathlib import Path

def fingerprints(folder):
    return {p.as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in Path(folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts}

def main():
    p=argparse.ArgumentParser();p.add_argument('--origin',choices=['local-model','reviewer-assisted'],required=True);p.add_argument('--label',required=True);a=p.parse_args()
    started=time.time();before=fingerprints('tests');checks={};out=Path('reports/agent-acceptance');out.mkdir(parents=True,exist_ok=True)
    npm='npm.cmd' if os.name=='nt' else 'npm'
    for gate,command in [('syntax',[npm,'run','check']),('build',[npm,'run','build']),('browser',[npm,'run','test:e2e'])]:
        with (out/(gate+'.log')).open('w') as f:r=subprocess.run(command,stdout=f,stderr=subprocess.STDOUT)
        checks[gate]='passed' if r.returncode==0 else 'failed'
        if r.returncode:break
    untouched=before==fingerprints('tests')
    passed=untouched and len(checks)==3 and all(x=='passed' for x in checks.values())
    report={'label':a.label,'origin':a.origin,'verdict':'passed' if passed else 'failed','checks':checks,'tests_unchanged':untouched,'source_hashes':fingerprints('src'),'test_hashes':before,'elapsed_seconds':round(time.time()-started,2),'limitation':'Acceptance for this workload only. No autonomous capability or Copilot parity claim.'}
    (out/'verdict.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:report[k] for k in ['label','origin','verdict','checks']}));raise SystemExit(0 if passed else 1)
if __name__=='__main__':main()
