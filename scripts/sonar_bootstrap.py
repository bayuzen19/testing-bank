"""Provision an ephemeral PoC Sonar instance; keep secrets out of logs."""
import base64,json,os,secrets,time,urllib.request,urllib.parse
from pathlib import Path

BASE=os.getenv('SONAR_HOST_URL','http://127.0.0.1:9002').rstrip('/')
def api(path,params=None,auth=None):
    headers={}
    if auth: headers['Authorization']='Basic '+base64.b64encode(auth.encode()).decode()
    data=None if params is None else urllib.parse.urlencode(params).encode()
    with urllib.request.urlopen(urllib.request.Request(BASE+path,data=data,headers=headers),timeout=20) as r:
        b=r.read();return json.loads(b) if b else {}
def main():
    if BASE not in {'http://127.0.0.1:9002','http://localhost:9002'}:raise ValueError('Bootstrap is restricted to the ephemeral loopback PoC')
    for _ in range(100):
        try:
            if api('/api/system/status').get('status')=='UP':break
        except Exception:pass
        time.sleep(3)
    else:raise RuntimeError('Sonar did not become ready')
    state=Path('runtime/sonar-admin.txt');state.parent.mkdir(exist_ok=True)
    if state.exists():password=state.read_text()
    else:
        password=secrets.token_urlsafe(32)
        api('/api/users/change_password',{'login':'admin','previousPassword':'admin','password':password},'admin:admin');state.write_text(password)
    auth='admin:'+password
    projects=api('/api/projects/search?projects=testing-bank',auth=auth)
    if not projects['components']:api('/api/projects/create',{'project':'testing-bank','name':'Hermes Bank PoC','visibility':'private'},auth)
    name='PoC overall-code gate'
    gates=api('/api/qualitygates/list',auth=auth)['qualitygates']
    gate=next((g for g in gates if g['name']==name),None)
    if gate is None:
        api('/api/qualitygates/create',{'name':name},auth)
        # All-source security/reliability; coverage is backend only, clearly documented.
        for metric,op,threshold in [('bugs','GT','0'),('vulnerabilities','GT','0'),('coverage','LT','80'),('duplicated_lines_density','GT','5')]:
            api('/api/qualitygates/create_condition',{'gateName':name,'metric':metric,'op':op,'error':threshold},auth)
    api('/api/qualitygates/select',{'projectKey':'testing-bank','gateName':name},auth)
    token=api('/api/user_tokens/generate',{'name':'scan-'+secrets.token_hex(8),'type':'PROJECT_ANALYSIS_TOKEN','projectKey':'testing-bank'},auth)['token']
    # The admin credential is required only by the subsequent read/report call, never model inference.
    Path('runtime/sonar-token.txt').write_text(token)
    print('Ephemeral Sonar project and explicit overall-code gate ready; credentials stored in ignored runtime directory.')
if __name__=='__main__':main()
