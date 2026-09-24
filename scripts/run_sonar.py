"""Scan using pinned container; retrieve gate for this exact analysis."""
import json,os,subprocess,sys,shutil
from pathlib import Path
import sonar_bootstrap as sq
from sonar_gate import main as gate_main
def main():
    sha=os.getenv('GITHUB_SHA') or subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    token=Path('runtime/sonar-token.txt').read_text().strip()
    env={**os.environ,'SONAR_TOKEN':token}
    # Explicit allowlist: the scanner never receives .env, agent history or admin credentials.
    stage=Path('runtime/scan-'+sha[:12]);stage.mkdir(parents=True,exist_ok=True)
    for folder in ['server','src','tests','coverage']:shutil.copytree(folder,stage/folder,dirs_exist_ok=True)
    shutil.copyfile('sonar-project.properties',stage/'sonar-project.properties')
    lcov=stage/'coverage/lcov.info';lcov.write_text(lcov.read_text().replace('\\','/'))
    cmd=['docker','run','--rm','--add-host','host.docker.internal:host-gateway','-e','SONAR_TOKEN','-v',str(stage.resolve())+':/usr/src','sonarsource/sonar-scanner-cli@sha256:a3f4215076706c95a17a68c19322ee916e40a3acd081a8c1a1e839e0194afa57','-Dsonar.host.url=http://host.docker.internal:9002','-Dsonar.scm.disabled=true','-Dsonar.scm.revision='+sha]
    if hasattr(os,'getuid'):cmd[3:3]=['--user',str(os.getuid())+':'+str(os.getgid())]
    cmd[3:3]=['-e','SONAR_USER_HOME=/usr/src/.sonar']
    cmd+=['-Dsonar.working.directory=/usr/src/.scannerwork']
    result=subprocess.run(cmd,env=env,capture_output=True,text=True)
    print(result.stdout)
    if result.returncode:
        print(result.stderr)
        raise RuntimeError('Sonar scanner exited with code '+str(result.returncode))
    if 'Failed to parse file' in result.stdout:raise ValueError('Scanner did not parse every source file')
    # Queries use local admin; scanner has only analysis token. Never print either.
    os.environ['SONAR_TOKEN']=sq.api('/api/user_tokens/generate',{'name':'read-'+__import__('secrets').token_hex(8)},'admin:'+Path('runtime/sonar-admin.txt').read_text())['token']
    os.environ['SONAR_HOST_URL']='http://127.0.0.1:9002';os.environ['SONAR_SCANNER_URL']='http://host.docker.internal:9002'
    auth='admin:'+Path('runtime/sonar-admin.txt').read_text()
    sys.argv=['sonar_gate.py','--sha',sha,'--task',str(stage/'.scannerwork/report-task.txt')]
    try:gate_main()
    finally:
        issues=sq.api('/api/issues/search?componentKeys=testing-bank&ps=100&resolved=false',auth=auth)
        Path('reports').mkdir(exist_ok=True);Path('reports/sonar-issues.json').write_text(json.dumps(issues,indent=2))
if __name__=='__main__':main()
