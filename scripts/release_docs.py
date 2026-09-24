"""Create commit-bound Markdown/PDF only when all CI gates actually passed."""
import hashlib,json,os,re,subprocess
from pathlib import Path
from xml.sax.saxutils import escape

REQUIRED={'check','unit_integration','browser','build','dependency_audit','sonar','image','tooling'}
def validate(evidence,sonar):
    sha=evidence.get('sha','')
    if not re.fullmatch('[0-9a-f]{40}',sha):raise ValueError('Full SHA required')
    if evidence.get('repository')!='bayuzen19/testing-bank' or not str(evidence.get('run_id','')).isdigit():raise ValueError('GitHub provenance missing')
    if set(evidence.get('checks',{}))!=REQUIRED or any(x!='passed' for x in evidence['checks'].values()):raise ValueError('Every gate must pass; skipped is not passed')
    if sonar.get('sha')!=sha or sonar.get('status')!='OK' or not sonar.get('analysis_id'):raise ValueError('Current commit Sonar gate required')

def pdf(markdown,target):
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer
    styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='Bank',fontName='Helvetica',fontSize=9.5,leading=14,spaceAfter=6,wordWrap='CJK'))
    for key in ['Title','Heading1','Heading2']:styles[key].textColor=colors.HexColor('#351A3C')
    blocks=[]
    for line in markdown.splitlines():
        if not line:blocks.append(Spacer(1,5));continue
        style=styles['Title'] if line.startswith('# ') else styles['Heading1'] if line.startswith('## ') else styles['Heading2'] if line.startswith('### ') else styles['Bank']
        blocks.append(Paragraph(escape(line.lstrip('# ').replace('**','')),style))
    def footer(canvas,doc):
        canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#666666'));canvas.drawString(42,25,'HERMES / SYNTHETIC BANKING PoC');canvas.drawRightString(A4[0]-42,25,str(doc.page))
    SimpleDocTemplate(str(target),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=42,title='Hermes Bank PoC Release Evidence',author='Bayuzen Ahmad').build(blocks,onFirstPage=footer,onLaterPages=footer)

def main():
    e=json.loads(Path('reports/evidence.json').read_text());s=json.loads(Path('reports/sonar.json').read_text());validate(e,s)
    m=json.loads(Path('docs/application.json').read_text());out=Path('reports/release');out.mkdir(parents=True,exist_ok=True)
    lines=['# '+m['name'],'','Status: CI quality gates passed. Production approval is separate.','Author: '+m['author'],'Owner: '+m['owner'],'Classification: '+m['classification'],'Commit: '+e['sha'],'GitHub run: https://github.com/'+e['repository']+'/actions/runs/'+str(e['run_id']),'','## Purpose',m['purpose'],'','## Architecture','Browser -> React UI / Express API -> PostgreSQL. Hermes -> local Ollama only. GitHub Actions runs synthetic CI; no hosted model inference. Internal Kubernetes is the deployment target; local cluster proof does not represent a client installation.','','## Features']
    for f in m['features']:lines+=['','### '+f['name'],f['description'],'Source: '+', '.join(f['sources']),'Acceptance evidence: '+', '.join(f['tests'])]
    lines+=['','## Executed gates']+[k+': '+v for k,v in sorted(e['checks'].items())]
    lines+=['Sonar analysis: '+s['analysis_id'],'Sonar overall-code gate: bugs=0, vulnerabilities=0, backend coverage>=80%, duplication<=5%. Frontend browser acceptance is measured separately. Human hotspot review and production security approval remain separate.','','## API inventory']
    for method,path in re.findall(r'''app\.(get|post|patch)\(\s*["']([^"']+)["']''',Path('server/app.mjs').read_text()):lines.append(method.upper()+' '+path)
    lines+=['','## Data model','Users: encrypted name/email, keyed lookup, password hash and preference. Accounts: synthetic balance and owner. Transfers: amount, recipient, owner and idempotency hash. Sessions: hashed token, expiry and CSRF. Audit events: pseudonymous actor reference; still personal data. Privacy requests: type, received status and timestamp.','','## Important limitations','PoC only: no real KYC, core-banking integration, funds, AML checks or production release. Profile export is limited to own profile; full access, correction, retention and erasure need operational fulfillment. Keys in environment are a demo mechanism; production needs bank-managed key custody and rotation. No claim of PDP/OJK certification or Copilot parity. Hermes generated selected modules with reviewer feedback; orchestration, backend integration, tests and DevOps were prepared by the evaluator. See docs/COMPLIANCE.md, docs/ARCHITECTURE.md and docs/COSTS.md.','','## Source fingerprints']
    paths={p for f in m['features'] for p in f['sources']+f['tests']}
    for p in sorted(paths):lines.append(p+': '+hashlib.sha256(Path(p).read_bytes()).hexdigest())
    markdown='\n'.join(lines)+'\n';(out/'application.md').write_text(markdown,encoding='utf8');pdf(markdown,out/'application.pdf')
    print('Commit-bound Markdown and PDF created after validated gates.')
if __name__=='__main__':main()
