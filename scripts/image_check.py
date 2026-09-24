import json,os,subprocess,time,urllib.request
from pathlib import Path
def main():
    sha=os.environ.get('GITHUB_SHA') or subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    image='testing-bank:'+sha[:12]
    subprocess.run(['docker','build','-t',image,'.'],check=True)
    info=json.loads(subprocess.check_output(['docker','image','inspect',image],text=True))[0]
    if info['Config']['User']!='node':raise ValueError('Runtime must be non-root')
    stage=Path('runtime/image-scan');stage.mkdir(parents=True,exist_ok=True)
    cache=Path('runtime/trivy-cache');cache.mkdir(parents=True,exist_ok=True)
    subprocess.run(['docker','save','--output',str(stage/'app.tar'),image],check=True)
    scanner=['docker','run','--rm','-v',str(stage.resolve())+':/scan:ro','-v',str(Path('reports').resolve())+':/reports','-v',str(cache.resolve())+':/root/.cache/trivy','aquasec/trivy@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969']
    subprocess.run(scanner+['image','--input','/scan/app.tar','--scanners','vuln','--severity','HIGH,CRITICAL','--exit-code','1','--format','json','--output','/reports/image-vulnerabilities.json'],check=True)
    subprocess.run(scanner+['image','--input','/scan/app.tar','--format','cyclonedx','--output','/reports/image-sbom.json'],check=True)
    # Both Linux hosted CI and Docker Desktop reach the explicit synthetic test database.
    database=os.environ['DATABASE_URL'].replace('127.0.0.1','host.docker.internal').replace('localhost','host.docker.internal')
    env={**os.environ,'DATABASE_URL':database}
    name='testing-bank-image-smoke'
    subprocess.run(['docker','run','-d','--name',name,'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--tmpfs','/tmp','--add-host','host.docker.internal:host-gateway','-p','127.0.0.1:4101:4100','-e','DATABASE_URL','-e','PII_KEY_HEX','-e','LOOKUP_KEY_HEX','-e','DEMO_MODE=true','-e','APP_ORIGIN=http://localhost:4101',image],env=env,check=True)
    try:
        for _ in range(30):
            try:
                with urllib.request.urlopen('http://127.0.0.1:4101/api/health',timeout=2) as r:
                    if json.load(r)['status']=='ok':break
            except Exception:time.sleep(1)
        else:raise RuntimeError('Container failed readiness')
        Path('reports/image.json').write_text(json.dumps({'sha':sha,'image':image,'image_id':info['Id'],'user':'node','read_only':True,'health':'passed','vulnerability_gate':'No HIGH or CRITICAL findings in this scan; includes unfixed findings','scanner':'Trivy 0.74.0'},indent=2))
    finally:subprocess.run(['docker','rm','-f',name],check=True)
if __name__=='__main__':main()
