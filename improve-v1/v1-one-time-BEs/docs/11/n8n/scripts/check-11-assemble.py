#!/usr/bin/env python3
"""Prove the n8n fill code and lib11_assemble.fill give the same reading, for every buyer. Free.

    python3 docs/11/n8n/scripts/check-11-assemble.py

1. Builds the test flow in memory (build-11-assemble.py).
2. Every written report × every Expression × every Life Path × both paths (242 per report):
   node 2 of the flow (JS, run locally) and lib11_assemble.fill (Python) must give identical
   sections, or both HOLD.
3. The flow's three test buyers end to end (T1 → numbers → fill → HTML): their numbers and
   readings must equal lib11_assemble.reading_for() for the same name and date.
Exit 1 on any difference. Run it after every change to a report, the shared list or the builder.
"""
import importlib.util, json, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib11_assemble as L

_argv, sys.argv = sys.argv, [sys.argv[0]]
spec = importlib.util.spec_from_file_location("asm", os.path.join(HERE, "build-11-assemble.py"))
A = importlib.util.module_from_spec(spec); spec.loader.exec_module(A)
sys.argv = _argv
wf = A.build()
tmp = tempfile.mkdtemp()
flow = os.path.join(tmp, "flow.json"); json.dump(wf, open(flow, "w"), ensure_ascii=False)
node = lambda *a: subprocess.run(["node", os.path.join(HERE, "run-11-assemble.cjs"), flow, *a]).returncode == 0

bank, bad, cases, want = L.load_bank(), 0, [], []
for su, path in L.written_reports().items():
    tpl = L.parse_report(path)
    for ex in L.NUMBER_KEYS:
        for lp in L.NUMBER_KEYS:
            for fork in ("get_back", "giving"):
                keys = L.keys_for(int(su), int(ex), int(lp)); keys["FORK"] = fork
                cases.append({"numbers": {"su": int(su)}, "keys": keys, "first_name": "Testina",
                              "birth_name": "Testina Rose Testerly", "dob_text": "November 5, 1962"})
                try: want.append(L.fill(tpl, bank, keys, "Testina", "Testina Rose Testerly", "November 5, 1962"))
                except L.Hold as e: want.append(None)
json.dump(cases, open(os.path.join(tmp, "cases.json"), "w"), ensure_ascii=False)
node("--fill", os.path.join(tmp, "cases.json"), "--out", os.path.join(tmp, "got.json"))
got = json.load(open(os.path.join(tmp, "got.json")))
for c, w, g in zip(cases, want, got):
    same = (w is None and "hold" in g) or (w is not None and g.get("sections") == w)
    if not same:
        bad += 1
        if bad <= 3: print(f"  DIFF SU {c['numbers']['su']} {c['keys']}: python {'HOLD' if w is None else 'ok'}, js {g.get('hold', 'ok')}")
print(f"  {len(cases)} buyers: JS and Python {'agree on every one' if not bad else f'differ on {bad}'}"
      f" ({sum(w is None for w in want)} held)")

if not node("--out", os.path.join(tmp, "e2e.json")):
    print("\nFAILED: a test buyer held in the flow (reason above)\n"); sys.exit(1)
for r in json.load(open(os.path.join(tmp, "e2e.json"))):
    b = next(b for b in A.BUYERS if b["first"] == r["first"])
    py = L.reading_for(b["name"], b["dob"], b["first"])
    ok = (r["numbers"]["su"], r["numbers"]["ex"], r["numbers"]["lp"]) == (py["su"], py["ex"], py["lp"]) \
         and r["keys"] == py["keys"] and r["sections"] == py["sections"]
    bad += not ok
    print(f"  {'ok  ' if ok else 'DIFF'} {b['first']}: SU {py['su']} · EX {py['ex']} · LP {py['lp']} · {py['keys']['FORK']}")
print("\nALL MATCH\n" if not bad else f"\nFAILED {bad}\n")
sys.exit(1 if bad else 0)
