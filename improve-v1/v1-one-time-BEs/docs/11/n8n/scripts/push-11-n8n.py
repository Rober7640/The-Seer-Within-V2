#!/usr/bin/env python3
"""Push an 11 workflow to n8n over the public REST API. Never activates.

    python3 scripts/push-11-n8n.py --live [--dry-run] [--update <id>]   # the live no-model flow (build-11-assemble.py --live)
    python3 scripts/push-11-n8n.py --testdrive [--fixture giving] [--manual-only] [--openai] [--dry-run] [--update <id>]

⛔ --live pushes build/11-fulfilment-ASSEMBLY.n8n.json, the no-model delivery flow. The old AI-writing flow
   (11-fulfilment.n8n.json) is never pushed live any more: it shares nothing with the live path.
⛔ Never activates. Turn it on in the n8n UI (an API activation doesn't register the webhook).

⛔ The API is fussier than the UI importer: it takes only name / nodes / connections / settings.
⛔ The live build is refused while it still carries TODO placeholders.
"""
import json, os, sys, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../../../.."))

def env(k):
    v = os.environ.get(k)
    if v: return v.strip()
    path = os.path.join(ROOT, ".env")
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            if line.strip().startswith(k + "="):
                return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit(f"no {k} in the environment or {path}")

# ⛔ EXPLICIT SUFFIXES, AND AN UNKNOWN FLAG IS AN ERROR. An earlier 02 version knew only --test, so
#    `--testdrive` fell through and it pushed the FULL build, delivery nodes and all, over the test
#    drive. A flag this script doesn't understand must stop it, never be ignored.
KNOWN = {"--live", "--testdrive", "--fixture", "--dry-run", "--update", "--openai", "--manual-only"}
unknown = [a for a in sys.argv[1:] if a.startswith("--") and a not in KNOWN]
if unknown:
    raise SystemExit(f"unknown flag(s): {' '.join(unknown)}")
if ("--live" in sys.argv) == ("--testdrive" in sys.argv):
    raise SystemExit("say which: --live (the no-model delivery flow) or --testdrive")
if "--manual-only" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("--manual-only requires --testdrive")
fixture = sys.argv[sys.argv.index("--fixture") + 1] if "--fixture" in sys.argv else "getback"
if fixture not in ("getback", "giving"):
    raise SystemExit(f"--fixture must be getback or giving, not {fixture!r}")
if "--fixture" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("--fixture only applies to --testdrive")
suffix = ""
if "--testdrive" in sys.argv:
    suffix = ("-MANUAL" if "--manual-only" in sys.argv else "-TESTDRIVE") + ("-GIVING" if fixture == "giving" else "-GETBACK")
src = (os.path.join(HERE, "../build/11-fulfilment-ASSEMBLY.n8n.json") if "--live" in sys.argv
       else os.path.join(HERE, "../build/11-fulfilment%s.n8n.json" % suffix))
wf = json.load(open(src, encoding="utf-8"))
if wf.get("active") is not False:
    raise SystemExit("REFUSING: the build says active")
body = {k: wf[k] for k in ("name", "nodes", "connections", "settings")}
text = json.dumps(body, ensure_ascii=False)
if "--testdrive" in sys.argv:
    live_only = ("1 ·", "2a ·", "8b ·", "9 ·", "13 ·", "14 ·", "14a ·", "15 ·")
    left = [n["name"] for n in body["nodes"] if n["name"].startswith(live_only)]
    if left:
        raise SystemExit(f"REFUSING: delivery nodes in a test drive: {left}")
elif "TODO" in text:
    raise SystemExit("REFUSING: the live build still has TODO placeholders. Only --testdrive can go up.")
elif not body["settings"].get("errorWorkflow"):
    raise SystemExit("REFUSING: the live build has no errorWorkflow, so a failed order would email nobody.")

print(f"  {body['name']}")
print(f"    {len(body['nodes'])} nodes, {sum(len(b) for o in body['connections'].values() for b in o['main'])} edges")
if "--dry-run" in sys.argv:
    print("    dry run — nothing sent"); raise SystemExit

KEY, BASE = env("N8N_API_KEY"), env("N8N_BASE_URL").rstrip("/")
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
