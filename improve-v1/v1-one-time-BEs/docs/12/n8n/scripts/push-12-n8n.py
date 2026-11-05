"""Push a 12 workflow to n8n over the public REST API. Never activates.

    python3 scripts/push-12-n8n.py [--fixture faketta] [--dry-run] [--update <id>]   # MANUAL test drive (default)
    python3 scripts/push-12-n8n.py --timed [--fixture faketta] ...                     # TESTDRIVE (ticks; run via testdrive-12-n8n.py)
    python3 scripts/push-12-n8n.py --live ...                                          # the live build (refused while it has TODOs)

⛔ DEFAULT IS --manual-only: a MANUAL build has no schedule trigger, so pushing it can never start a
   run or bill a model call by itself. Someone has to press Execute in n8n.
⛔ The API is fussier than the UI importer: it takes only name / nodes / connections / settings.
⛔ The live build is refused while it still carries TODO placeholders.
⛔ Not run as part of building 12 (no .env, no push). Dry run: --dry-run.
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

# ⛔ AN UNKNOWN FLAG IS AN ERROR (02 once pushed the full build because a flag fell through).
KNOWN = {"--timed", "--live", "--fixture", "--dry-run", "--update", "--manual-only"}
unknown = [a for a in sys.argv[1:] if a.startswith("--") and a not in KNOWN]
if unknown:
    raise SystemExit(f"unknown flag(s): {' '.join(unknown)}")
if "--timed" in sys.argv and "--live" in sys.argv:
    raise SystemExit("--timed and --live don't go together")
fixture = sys.argv[sys.argv.index("--fixture") + 1] if "--fixture" in sys.argv else "testina"
if fixture not in ("testina", "faketta"):
    raise SystemExit(f"--fixture must be testina or faketta, not {fixture!r}")
if "--fixture" in sys.argv and "--live" in sys.argv:
    raise SystemExit("--fixture only applies to a test drive")
testdrive = "--live" not in sys.argv
suffix = "" if not testdrive else ("-TESTDRIVE" if "--timed" in sys.argv else "-MANUAL") + "-" + fixture.upper()
src = os.path.join(HERE, "../build/12-fulfilment%s.n8n.json" % suffix)
wf = json.load(open(src, encoding="utf-8"))
if wf.get("active") is not False:
    raise SystemExit("REFUSING: the build says active")
body = {k: wf[k] for k in ("name", "nodes", "connections", "settings")}
text = json.dumps(body, ensure_ascii=False)
if testdrive:
    live_only = ("1 ·", "2a ·", "8b ·", "9 ·", "13 ·", "14 ·", "14a ·", "15 ·")
    left = [n["name"] for n in body["nodes"] if n["name"].startswith(live_only)]
    if left:
        raise SystemExit(f"REFUSING: delivery nodes in a test drive: {left}")
elif "TODO" in text:
    raise SystemExit("REFUSING: the live build still has TODO placeholders. Only a test drive can go up.")

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
