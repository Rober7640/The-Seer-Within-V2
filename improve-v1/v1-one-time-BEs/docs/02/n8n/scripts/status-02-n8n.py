#!/usr/bin/env python3
"""Read 02 workflow state and execution history; never mutate n8n."""
import json, pathlib, sys, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[6]
e = {}
for line in (ROOT / '.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        e[k.strip()] = v.strip().strip('\"\'')
def get(path):
    r = urllib.request.Request(e['N8N_BASE_URL'].rstrip('/') + '/api/v1' + path,
                              headers={'X-N8N-API-KEY': e['N8N_API_KEY']})
    return json.load(urllib.request.urlopen(r, timeout=45))
if len(sys.argv) == 3 and sys.argv[1] == '--workflow':
    wid = sys.argv[2]
    if not wid.isalnum(): raise SystemExit('Invalid workflow ID')
    w = get('/workflows/' + wid)
    pathlib.Path('/tmp/02-workflow-' + wid + '.json').write_text(json.dumps(w))
    print(json.dumps({k: w.get(k) for k in ['id','name','active','updatedAt']}))
    print(json.dumps({'triggers': [n['type'] for n in w['nodes'] if 'trigger' in n['type'].lower()],
                      'nodes': len(w['nodes']), 'disabled': [n['name'] for n in w['nodes'] if n.get('disabled')]}))
    rows = get('/executions?workflowId=' + wid + '&limit=5').get('data', [])
    print(json.dumps([{k:r.get(k) for k in ['id','status','startedAt','stoppedAt']} for r in rows]))
elif len(sys.argv) == 3 and sys.argv[1] == '--execution':
    j = get('/executions/' + sys.argv[2] + '?includeData=true')
    pathlib.Path('/tmp/02-execution-' + sys.argv[2] + '.json').write_text(json.dumps(j))
    print(json.dumps({k: j.get(k) for k in ['id','status','retryOf','startedAt','stoppedAt','workflowId']}))
    r = j.get('data', {}).get('resultData', {})
    print('lastNode', r.get('lastNodeExecuted'), 'error', r.get('error', {}).get('message'))
else:
    for wid in ['5QkhGbpsusvIfh6j', 'sKwnqW5zGAxt8ghY']:
        w = get('/workflows/' + wid)
        print(json.dumps({k: w.get(k) for k in ['id','name','active','updatedAt']}))
    rows = get('/executions?workflowId=sKwnqW5zGAxt8ghY&limit=20').get('data', [])
    print(json.dumps([{k: r.get(k) for k in ['id','status','retryOf','startedAt','stoppedAt']} for r in rows], indent=2))
