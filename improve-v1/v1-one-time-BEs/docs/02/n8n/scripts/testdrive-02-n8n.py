#!/usr/bin/env python3
"""Drive ONE execution of the 02 TEST-DRIVE workflow on the real n8n, then stand it down.

    python3 scripts/testdrive-02-n8n.py <workflowId> [--openai] [--arc v2]

🔴 TWO THINGS THIS SCRIPT EXISTS TO GET RIGHT, both learned the expensive way on 2026-09-07:

 1. THE EXECUTIONS LIST LAGS. /api/v1/executions does not show a run until it is nearly
    finished — a 3-minute execution first appeared at 2m30s. So "deactivate once you see it
    start" leaves the workflow armed for minutes, and a 1-minute schedule ticks again, and
    again. That is how four extra full runs (48 model calls) got billed. ⛔ Never gate the
    deactivate on a sighting: arm a clock-aligned tick and disarm three seconds after its boundary.

 2. n8n SERVES THE VERSION IT HAD AT ACTIVATION. A tick that fires seconds after a PUT can
    still run the previous code — one execution reported a fix as absent that was verifiably
    deployed. So: update, pause, THEN activate.
"""
import json, os, sys, time, datetime, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../../../../.."))
def env(k):
    v = os.environ.get(k)
    if v: return v.strip()
    for l in open(os.path.join(ROOT, ".env"), encoding="utf-8"):
        if l.strip().startswith(k + "="): return l.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit(f"no {k}")
KEY, BASE = env("N8N_API_KEY"), env("N8N_BASE_URL").rstrip("/")
WF = sys.argv[1]   # ⛔ positional, so --openai must come AFTER the workflow id

def api(path, method="GET", body=None):
    req = urllib.request.Request(f"{BASE}/api/v1{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"X-N8N-API-KEY": KEY, "content-type": "application/json"}, method=method)
    try: return json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e: return {"_err": e.code, "_body": e.read().decode()[:300]}

# ⭐ `--openai` drives the GPT build instead. Same fixture, same twelve prompts.
_arc = sys.argv[sys.argv.index("--arc") + 1] if "--arc" in sys.argv else "v1"
src = os.path.join(HERE, "../docs/02/02-fulfilment-TESTDRIVE%s%s.n8n.json"
                   % ("-V2" if _arc == "v2" else "", "-OPENAI" if "--openai" in sys.argv else ""))
if "--screen" in sys.argv:
    src = os.path.join(HERE, "../docs/02/02-fulfilment-SCREEN" + ("-OPENAI" if "--openai" in sys.argv else "") + ".n8n.json")
wf = json.load(open(src, encoding="utf-8"))
body = {k: wf[k] for k in ("name", "nodes", "connections", "settings")}
assert not any(n["name"].startswith(("13 ·", "14", "15 ")) for n in body["nodes"]), \
    "REFUSING: the delivery half is still in this workflow"

api(f"/workflows/{WF}/deactivate", "POST")
print("  disarmed before update", flush=True)
print("  updated :", api(f"/workflows/{WF}", "PUT", body).get("id"), flush=True)
prev = api(f"/executions?workflowId={WF}&limit=1").get("data", [])
base_id = prev[0]["id"] if prev else None
print("  baseline:", base_id, flush=True)

# 🔴 REFUSE TO FIRE ON STALE CODE. n8n served the PREVIOUS version of this workflow to a tick
#    that fired after a successful PUT — execution 30477 reported a fix as absent that a GET
#    showed as deployed, and a minimal probe proved the fix itself was correct. So verify what
#    the instance will actually run before arming it, rather than assuming the PUT took.
want = {n["name"]: json.dumps(n["parameters"], sort_keys=True) for n in body["nodes"]}
for attempt in range(12):
    time.sleep(5)
    live = api(f"/workflows/{WF}")
    got = {n["name"]: json.dumps(n["parameters"], sort_keys=True) for n in live.get("nodes", [])}
    drift = [k for k in want if want[k] != got.get(k)]
    if not drift:
        print(f"  verified: the instance is serving this exact build ({len(want)} nodes)", flush=True)
        break
    print(f"    [{(attempt+1)*5:3}s] not settled yet — {len(drift)} node(s) differ: {drift[:3]}", flush=True)
else:
    raise SystemExit("  🔴 the instance never converged on the pushed build — refusing to run")

# The generator uses a clock-aligned tick. Never use the old phase-offset minute rule:
# keeping that armed for 70 seconds produced two runs (30649 and 30650).
schedule = next(n for n in body["nodes"] if n["type"] == "n8n-nodes-base.scheduleTrigger")
assert schedule["parameters"]["rule"]["interval"] == [{"field": "cronExpression", "expression": "0 * * * * *"}], "Rebuild the test drive: a clock-aligned trigger is required"
# Leave time for the activation request before the next tick. Disarm relative to the
# precomputed tick, never relative to the activation response or an execution-list sighting.
phase = time.time() % 60
if phase > 25:
    time.sleep(61 - phase)
t0 = time.time()
next_tick = (int(t0) // 60 + 1) * 60
try:
    print("  armed   :", api(f"/workflows/{WF}/activate", "POST").get("active"), flush=True)
    time.sleep(max(0, next_tick + 3 - time.time()))
finally:
    api(f"/workflows/{WF}/deactivate", "POST")
    print(f"  disarmed after {int(time.time()-t0)}s · active =",
          api(f"/workflows/{WF}").get("active"), flush=True)

# A late execution from an earlier activation can have an ID newer than baseline.
# Execution 30650 exposed this: it started before this activation but appeared afterwards.
# Time and execution build are both required; an ID change alone is not evidence.
def has_authored(wanted, actual):
    if isinstance(wanted, dict):
        return isinstance(actual, dict) and all(k in actual and has_authored(v, actual[k]) for k, v in wanted.items())
    if isinstance(wanted, list):
        return isinstance(actual, list) and len(wanted) == len(actual) and all(has_authored(a,b) for a,b in zip(wanted,actual))
    return wanted == actual

def started_in_this_activation(row):
    stamp = row.get("startedAt")
    if not stamp:
        return False
    started = datetime.datetime.fromisoformat(stamp.replace("Z", "+00:00")).timestamp()
    # Queue delay can put startedAt after the schedule was disarmed (30652).
    # The lower bound excludes delayed listings of older runs; build identity is
    # checked separately before success. Do not impose an unproven queue-time cap.
    return started >= t0

ex = None
for i in range(180):
    got = api(f"/executions?workflowId={WF}&limit=20").get("data", [])
    candidates = [row for row in got if started_in_this_activation(row)]
    if candidates:
        ex = candidates[0]
        if ex["status"] not in ("running", "new", "waiting"):
            detail = api(f"/executions/{ex['id']}?includeData=true")
            recorded = detail.get("workflowData", detail.get("data", {}).get("workflowData", {}))
            by_name = {n["name"]: n for n in recorded.get("nodes", [])}
            drift = [n["name"] for n in body["nodes"] if not has_authored(n["parameters"], by_name.get(n["name"], {}).get("parameters"))]
            if drift:
                raise SystemExit(f"  REFUSING to certify execution {ex['id']}: build differs in {drift}")
            print("  verified execution timestamp and authored parameters", flush=True)
            break
    if i % 6 == 0: print(f"    [{int(time.time()-t0):4}s] {ex['status'] if ex else 'not listed yet'}", flush=True)
    time.sleep(10)
print(f"\n  RESULT {ex['id'] if ex else '?'}: {ex['status'] if ex else 'never appeared'} "
      f"after {int(time.time()-t0)}s", flush=True)

if ex is None or ex["status"] in ("running", "new", "waiting"):
    raise SystemExit("No completed execution from this activation was verified; do not call this a pass.")
if ex["status"] != "success":
    raise SystemExit(1)
