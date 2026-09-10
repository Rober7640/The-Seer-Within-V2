#!/usr/bin/env python3
"""Read the LAST execution of '07 · PHASE 1 TEST (inactive)' out of n8n and answer
the one question phase 1 exists to answer.

⭐ THE QUESTION: does `$('5c · Keep the prose').all(0, r)` inside `5a · Compose the
   position prompt` really reach the PREVIOUS runs of a splitInBatches loop? If it
   silently returns nothing, every position is written blind to the others and the
   reading can still grade PASS. The local dry-run harness FAKED that call, so only
   a real n8n execution settles it.

HOW IT ANSWERS: n8n keeps every run of every node in the execution record. Run r of
5a should carry the block "WHAT THE EARLIER PAID POSITIONS HAVE ALREADY SAID" listing
r prior positions. Run 0 must not have it; runs 1..5 must, and the count must climb.

USE
  python3 scripts/read-07-phase1-run.py            # last execution
  python3 scripts/read-07-phase1-run.py <execId>
"""
import json, os, re, sys, urllib.request, urllib.error

WF = "iupU9kyAt7WmfSxR"
ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env")


def secret(name):
    if os.environ.get(name):
        return os.environ[name]
    for line in open(ENV, encoding="utf-8"):
        m = re.match(rf"\s*{re.escape(name)}\s*=\s*(.*)", line)
        if m:
            return m.group(1).strip().strip("'\"")
    return ""


def get(path):
    req = urllib.request.Request(secret("N8N_BASE_URL").rstrip("/") + path,
                                 headers={"X-N8N-API-KEY": secret("N8N_API_KEY")})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        sys.exit(f"{e.code} {e.read().decode()[:300]}")


eid = sys.argv[1] if len(sys.argv) > 1 else None
if not eid:
    rows = get(f"/api/v1/executions?workflowId={WF}&limit=5&includeData=false")["data"]
    if not rows:
        sys.exit("no executions yet — open the workflow in n8n and press ‘Test workflow’")
    for r in rows:
        print(f"  execution {r['id']}  {r['status']}  {r.get('startedAt')}")
    eid = rows[0]["id"]

ex = get(f"/api/v1/executions/{eid}?includeData=true")
run = ex["data"]["resultData"].get("runData", {})
print(f"\nexecution {eid}: status={ex['status']} finished={ex.get('finished')}")
err = ex["data"]["resultData"].get("error")
if err:
    print("ERROR:", json.dumps(err)[:600])
print("nodes that ran:", {k: len(v) for k, v in run.items()})

MARK = "WHAT THE EARLIER PAID POSITIONS HAVE ALREADY SAID"
print("\n⭐ loop visibility — one line per run of 5a")
for i, r in enumerate(run.get("5a · Compose the position prompt", [])):
    try:
        p = r["data"]["main"][0][0]["json"]["prompt"]
    except Exception:
        print(f"  run {i}: no output ({r.get('executionStatus')})"); continue
    seen = re.findall(r"^\[(\d+) · ", p.split(MARK)[1], flags=re.M) if MARK in p else []
    print(f"  run {i}: earlier-block={'YES' if MARK in p else 'no ':<3} "
          f"prior positions visible={len(seen)} {seen} promptchars={len(p)}")
print("  EXPECT 0,1,2,3,4,5 — a flat 0 means .all(0, r) returned nothing and every "
      "position was written blind.")

for node, field in (("P1 · RESULT (test only)", None),):
    if node in run:
        j = run[node][0]["data"]["main"][0][0]["json"]
        print(f"\nverdict: {json.dumps(j.get('verdict'))}")
        print(f"words:   {j.get('words')}")
        print("\n----- the reading n8n produced -----\n")
        print(j.get("reading") or "(none)")
