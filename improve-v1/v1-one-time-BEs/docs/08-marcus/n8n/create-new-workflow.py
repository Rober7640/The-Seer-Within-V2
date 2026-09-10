"""Create this NEW inactive 08 workflow only. No update, delete, activate or execute operation."""
from pathlib import Path
import os,re,json,urllib.request,urllib.error,urllib.parse,sys
HERE=Path(__file__).resolve().parent
REPO=next(p for p in HERE.parents if (p/'package.json').exists())
def value(key):
 if os.environ.get(key):return os.environ[key]
 p=REPO/'.env'
 if p.exists():
  m=re.search(r'^\s*'+re.escape(key)+r'\s*=\s*(.*)$',p.read_text(),re.M)
  if m:return m.group(1).strip().strip('\"\'')
 return ''
w=json.loads((HERE/'08-marcus-fulfillment.n8n.json').read_text())
assert w['active'] is False
assert 'enabled: false' in next(n for n in w['nodes'] if n['name']=='Configuration and guard')['parameters']['jsCode']
body={k:w[k] for k in ['name','nodes','connections','settings']}
if sys.argv[1:]!=['--create']:
 print(json.dumps({'mode':'dry-run','name':w['name'],'nodes':len(w['nodes']),'active':False,'guardEnabled':False,'operation':'POST new workflow only'}));raise SystemExit(0)
receipt=HERE/'created-workflow.json'
if receipt.exists():raise SystemExit('Creation receipt already exists. Refusing to create a duplicate or modify that workflow.')
base=value('N8N_BASE_URL').rstrip('/');key=value('N8N_API_KEY')
if not key or not base:raise SystemExit('Missing N8N_BASE_URL or N8N_API_KEY; no request made.')
u=urllib.parse.urlparse(base)
if u.scheme!='https' or u.username or u.password:raise SystemExit('Expected HTTPS n8n base URL without embedded credentials.')
req=urllib.request.Request(base+'/api/v1/workflows',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','X-N8N-API-KEY':key},method='POST')
try:
 with urllib.request.urlopen(req,timeout=45) as response:created=json.load(response)
except urllib.error.HTTPError as e:
 print('n8n refused create request, HTTP',e.code);raise SystemExit(1)
except urllib.error.URLError:
 print('n8n request did not return a confirmed result. Check the instance before retrying; no automatic retry was made.');raise SystemExit(2)
id=str(created['id']);record={'id':id,'name':created['name'],'active':created.get('active'),'url':base+'/workflow/'+id,'operation':'created-new-only','guardEnabled':False}
receipt.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))
if created.get('active') is not False:raise SystemExit('Unexpected active state. No execution requested; inspect newly created workflow.')
