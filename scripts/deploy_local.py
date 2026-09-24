"""Deploy only to the named disposable kind cluster, never ambient kubectl context."""
import argparse,json,re,secrets,subprocess
from pathlib import Path
def main():
    p=argparse.ArgumentParser();p.add_argument('--kubeconfig',required=True);p.add_argument('--image',required=True);a=p.parse_args()
    if not re.fullmatch(r'testing-bank:[a-f0-9]{12}',a.image):raise ValueError('Local image must use a commit-derived tag')
    base=['kubectl','--kubeconfig',a.kubeconfig,'--context','kind-testing-bank']
    def apply(text):subprocess.run(base+['apply','-f','-'],input=text,text=True,check=True)
    manifest=Path('deploy/kubernetes.yaml').read_text().replace('APPROVED_IMAGE_REQUIRED',a.image)
    apply(manifest.split('---')[0])
    # Existing secrets are retained across deployments; never rotate encryption keys implicitly.
    check=subprocess.run(base+['get','secret','bank-app-config','-n','bank-poc'],capture_output=True)
    if check.returncode:
        password=secrets.token_hex(24)
        for name,data in [('bank-db-config',{'POSTGRES_USER':'banklab','POSTGRES_DB':'banklab','POSTGRES_PASSWORD':password}),('bank-app-config',{'DATABASE_URL':f'postgresql://banklab:{password}@bank-db:5432/banklab','PII_KEY_HEX':secrets.token_hex(32),'LOOKUP_KEY_HEX':secrets.token_hex(32),'APP_ORIGIN':'http://localhost:5800','SECURE_COOKIE':'false'})]:
            apply(json.dumps({'apiVersion':'v1','kind':'Secret','metadata':{'name':name,'namespace':'bank-poc'},'type':'Opaque','stringData':data}))
    apply(Path('deploy/local-db.yaml').read_text())
    subprocess.run(base+['rollout','status','deployment/bank-db','-n','bank-poc','--timeout=180s'],check=True)
    apply(manifest)
    subprocess.run(base+['rollout','status','deployment/bank-app','-n','bank-poc','--timeout=180s'],check=True)
    result=json.loads(subprocess.check_output(base+['get','pods','-n','bank-poc','-o','json'],text=True))
    safe=[{'name':p['metadata']['name'],'phase':p['status']['phase'],'containers':[{'name':c['name'],'ready':c['ready'],'image':c['image'],'imageID':c['imageID']} for c in p['status'].get('containerStatuses',[])]} for p in result['items']]
    Path('reports/kubernetes.json').write_text(json.dumps({'environment':'local kind, not client internal cluster','context':'kind-testing-bank','pods':safe,'network_policy':'manifest applied; default kind CNI does not enforce NetworkPolicy'},indent=2))
if __name__=='__main__':main()
