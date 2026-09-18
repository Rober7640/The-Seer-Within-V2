#!/usr/bin/env python3
"""Update only the dedicated inactive Marcus fulfillment draft."""
from pathlib import Path
import json, os, re, sys, urllib.error, urllib.request

HERE=Path(__file__).resolve().parent
REPO=next(p for p in HERE.parents if (p/'package.json').exists())
WORKFLOW_ID='UJamB32MGlNKdoEW'
SOURCE=HERE/'08-marcus-fulfillment.n8n.json'
RECEIPT=HERE/'created-fulfillment-workflow.json'
EXPECTED_CURRENT_NAMES={
 '08 Marcus — Written + Audio Fulfillment — 47-NODE INACTIVE DRAFT',
 '08 Marcus — Numerology-Anchored Written + Audio — 48-NODE INACTIVE DRAFT',
}

def value(key):
 if os.environ.get(key):return os.environ[key]
 match=re.search(r'^\s*'+re.escape(key)+r'\s*=\s*(.*)$',(REPO/'.env').read_text(),re.M)
 return match.group(1).strip().strip('"\'') if match else ''

def request(method,path,body=None):
 base=value('N8N_BASE_URL').rstrip('/');key=value('N8N_API_KEY')
 req=urllib.request.Request(base+'/api/v1'+path,method=method,data=json.dumps(body).encode() if body else None,
  headers={'X-N8N-API-KEY':key,'Accept':'application/json','Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=60) as response:return json.load(response)
 except urllib.error.HTTPError as error:
  raise SystemExit(f'n8n HTTP {error.code}: '+error.read().decode(errors='replace')[:600])

source=json.loads(SOURCE.read_text())
guard=next(node for node in source['nodes'] if node['name']=='Configuration and guard')['parameters']['jsCode']
assert source.get('active') is False and 'enabled: false' in guard
assert len(source['nodes'])==48 and any(node['name']=='Require numerology anchors' for node in source['nodes'])
current=request('GET','/workflows/'+WORKFLOW_ID)
if current.get('active'):raise SystemExit('Refusing to update an active fulfillment workflow.')
if current.get('name') not in EXPECTED_CURRENT_NAMES:raise SystemExit('Unexpected current fulfillment workflow identity; no update made.')
summary={'id':WORKFLOW_ID,'currentName':current['name'],'newName':source['name'],'currentNodes':len(current['nodes']),'newNodes':len(source['nodes']),'active':False,'guardEnabled':False,'numerologyGate':True}
if sys.argv[1:]!=['--update']:
 print(json.dumps({'mode':'dry-run',**summary}));raise SystemExit(0)
body={key:source[key] for key in ('name','nodes','connections','settings')}
updated=request('PUT','/workflows/'+WORKFLOW_ID,body)
record={'id':updated['id'],'name':updated['name'],'active':updated.get('active'),'url':value('N8N_BASE_URL').rstrip('/')+'/workflow/'+WORKFLOW_ID,'operation':'updated-dedicated-fulfillment-only','guardEnabled':False,'nodes':len(updated['nodes']),'numerologyGate':True}
RECEIPT.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))
