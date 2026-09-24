"""Sequential evidence-producing CI. A failed command never becomes a passed gate."""
import json,os,secrets,subprocess,sys,time,urllib.request
from pathlib import Path

def main():
    Path('reports').mkdir(exist_ok=True)
    sha=os.environ['GITHUB_SHA'];run_id=os.environ['GITHUB_RUN_ID']
    evidence={'sha':sha,'repository':os.environ['GITHUB_REPOSITORY'],'run_id':run_id,'checks':{}}
    env={**os.environ,'DEMO_MODE':'true','APP_ORIGIN':'http://localhost:4100','BASE_URL':'http://localhost:4100','PORT':'4100','PII_KEY_HEX':secrets.token_hex(32),'LOOKUP_KEY_HEX':secrets.token_hex(32)}
    def run(key,cmd):
        print('GATE '+key,flush=True)
        with open('reports/'+key+'.log','w') as f:r=subprocess.run(cmd,env=env,stdout=f,stderr=subprocess.STDOUT)
        evidence['checks'][key]='passed' if r.returncode==0 else 'failed'
        Path('reports/evidence.json').write_text(json.dumps(evidence,indent=2))
        if r.returncode:print(Path('reports/'+key+'.log').read_text()[-16000:]);raise SystemExit('Gate failed: '+key)
    run('check',['npm','run','check'])
    run('unit_integration',['npm','run','test:coverage'])
    run('build',['npm','run','build'])
    with open('reports/server.log','w') as log:
        server=subprocess.Popen(['node','server/index.mjs'],env=env,stdout=log,stderr=subprocess.STDOUT)
        try:
            for _ in range(40):
                try:
                    with urllib.request.urlopen('http://localhost:4100/api/health',timeout=2) as r:
                        if r.status==200:break
                except Exception:time.sleep(.5)
            else:raise RuntimeError('Application failed readiness')
            run('browser',['npm','run','test:e2e'])
        finally:server.terminate();server.wait(timeout=15)
    run('dependency_audit',['npm','audit','--audit-level=high'])
    run('tooling',[sys.executable,'-m','unittest','discover','-s','tests','-p','*_test.py'])
    subprocess.run([sys.executable,'scripts/sonar_bootstrap.py'],check=True,env=env)
    run('sonar',[sys.executable,'scripts/run_sonar.py'])
    run('image',[sys.executable,'scripts/image_check.py'])
    subprocess.run([sys.executable,'scripts/release_docs.py'],check=True,env=env)
if __name__=='__main__':main()
