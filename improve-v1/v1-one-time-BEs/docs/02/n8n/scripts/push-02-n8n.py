#!/usr/bin/env python3
"""Push an 02 workflow to n8n over the public REST API. Never activates.

    python3 scripts/push-02-n8n.py [--test | --testdrive [--arc v2]] [--openai] [--dry-run] [--update <id>]

⛔ The API is fussier than the UI importer: it takes only name / nodes / connections /
   settings and rejects active, tags, pinData, id with "request.body should NOT have
   additional properties". The .n8n.json keeps those because Import-from-File wants them.
"""
import json, os, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../../../.."))

def env(k):
    v = os.environ.get(k)
    if v: return v.strip()
    for line in open(os.path.join(ROOT, ".env"), encoding="utf-8"):
        if line.strip().startswith(k + "="):
            return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit(f"no {k} in the environment or the repo .env")

KEY, BASE = env("N8N_API_KEY"), env("N8N_BASE_URL").rstrip("/")
# ⛔ EXPLICIT SUFFIXES, AND AN UNKNOWN FLAG IS AN ERROR. An earlier version knew only --test,
#    so `--testdrive` fell through and it pushed the FULL build — delivery nodes and all — over
#    the test-drive workflow, whose entire reason for existing is that a smoke run cannot reach
#    a buyer. A flag it does not understand must stop it, never be ignored.
KNOWN = {"--test", "--testdrive", "--dry-run", "--update", "--openai", "--arc", "--screen", "--manual-only"}
unknown = [a for a in sys.argv[1:] if a.startswith("--") and a not in KNOWN]
if unknown:
    raise SystemExit(f"unknown flag(s): {' '.join(unknown)}")
if "--manual-only" in sys.argv and ("--testdrive" not in sys.argv or "--screen" in sys.argv):
    raise SystemExit("--manual-only requires --testdrive and excludes --screen")
suffix = ("-SCREEN" if "--screen" in sys.argv else "-MANUAL" if "--manual-only" in sys.argv else "-TESTDRIVE" if "--testdrive" in sys.argv else "-TEST" if "--test" in sys.argv else "")
# ⭐ --arc v2 is the second letter's test drive — its own file, its own workflow, its own seed.
_arc = sys.argv[sys.argv.index("--arc") + 1] if "--arc" in sys.argv else "v1"
if _arc not in ("v1", "v2"): raise SystemExit(f"--arc must be v1 or v2, not {_arc!r}")
if "--arc" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("--arc only applies to --testdrive; the live build reads the arc off Stripe")
suffix += "-V2" if (_arc == "v2" and "--testdrive" in sys.argv) else ""
# ⛔ --openai selects a DIFFERENT SOURCE FILE. Without this the flag would be accepted and
#    silently ignored, pushing the Anthropic build over an OpenAI workflow — which is exactly
#    the class of bug the unknown-flag guard above was added to stop.
suffix += "-OPENAI" if "--openai" in sys.argv else ""
src = os.path.join(HERE, "../docs/02/02-fulfilment%s.n8n.json" % suffix)
wf = json.load(open(src, encoding="utf-8"))
body = {k: wf[k] for k in ("name", "nodes", "connections", "settings")}

print(f"  {body['name']}")
print(f"    {len(body['nodes'])} nodes, {sum(len(b) for o in body['connections'].values() for b in o['main'])} edges")
if "--dry-run" in sys.argv:
    print("    dry run — nothing sent"); raise SystemExit

upd = sys.argv[sys.argv.index("--update") + 1] if "--update" in sys.argv else None
url = f"{BASE}/api/v1/workflows/{upd}" if upd else f"{BASE}/api/v1/workflows"
req = urllib.request.Request(url, data=json.dumps(body).encode(),
    headers={"X-N8N-API-KEY": KEY, "content-type": "application/json"},
    method="PUT" if upd else "POST")
try:
    got = json.load(urllib.request.urlopen(req))
except urllib.error.HTTPError as e:
    raise SystemExit(f"    HTTP {e.code}: {e.read().decode()[:400]}")
print(f"    {'updated' if upd else 'created'} id={got['id']}  active={got.get('active')}")
print(f"    {BASE}/workflow/{got['id']}")
