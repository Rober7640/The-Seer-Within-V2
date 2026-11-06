#!/usr/bin/env python3
"""Check the LIVE 11 delivery flow (build-11-assemble.py --live) before it goes near n8n. Free.

    python3 docs/11/n8n/scripts/check-11-live.py

check-11-assemble.py proves the TEST flows; this one proves the live build carries the 2026-11-06 fixes:
1. Wiring: inactive, no TODO, errorWorkflow set (a failed order emails the team), successful runs keep no data,
   its own webhook path, every outside call retries, every app call uses the n8n login (never a token in the file).
2. Her details: email, bump and paid time come from the app's order, not the unsigned webhook body.
3. Guards: refunded/delivered checked before the work AND after the wait; AWeber not-found/unsubscribed HOLD;
   the send writes only 11's own AWeber field; the wait runs from the app's paid time.
4. The fill: the live node 4 against lib11_assemble.fill for every Expression × Life Path × path of every
   report that passes check-report. Reports that don't pass must HOLD, never guess.
5. The live test drive build makes no outside call but PDFShift and the one login probe, and has no errorWorkflow.
Exit 1 on any failure.
"""
import importlib.util, json, os, re, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib11_assemble as L

_argv, sys.argv = sys.argv, [sys.argv[0]]
spec = importlib.util.spec_from_file_location("asm", os.path.join(HERE, "build-11-assemble.py"))
A = importlib.util.module_from_spec(spec); spec.loader.exec_module(A)
sys.argv = _argv
wf = A.build_live()
held = set(A.build_live.held)
drive = A.build_live_drive(wf)
by = {n["name"]: n for n in wf["nodes"]}
txt = json.dumps(wf, ensure_ascii=False)
fails = []
def need(ok, what):
    print(f"  {'ok  ' if ok else 'FAIL'} {what}")
    if not ok: fails.append(what)

print("1. wiring")
need(wf["active"] is False, "inactive")
need("TODO" not in txt, "no TODO placeholders")
need(wf["settings"].get("errorWorkflow") == A.ERROR_FLOW, "errorWorkflow = the team's error-email flow")
need(wf["settings"].get("saveDataSuccessExecution") == "none", "successful runs keep no buyer data")
need(by["1 · Stripe webhook"]["parameters"]["path"] == A.WEBHOOK_PATH != "unsent-letter-fulfilment",
     f"own webhook path ({A.WEBHOOK_PATH}), not the old AI flow's")
http = [n for n in wf["nodes"] if n["type"] == "n8n-nodes-base.httpRequest"]
need(all(n.get("retryOnFail") and n.get("maxTries", 1) > 1 for n in http), f"all {len(http)} outside calls retry")
app = [n for n in http if A.APP_BASE_URL in n["parameters"].get("url", "")]
need(len(app) == 3 and all(n.get("credentials", {}).get("httpHeaderAuth") == A.FULFIL_CRED for n in app),
     "the 3 app calls use the n8n login (BE Fulfilment)")
need(not re.search(r'"name": "authorization"', txt, re.I) and "Bearer" not in txt, "no token or auth header typed into the flow")

print("2. her details come from the app")
num = by["3 · Her numbers"]["parameters"]["jsCode"]
need("order.email" in num and "customer_details" not in num, "email from the app's order")
need("order.bumpPurchased" in num and "metadata" not in num, "bump from the app's order")
need("order.paidAt" in num and "s.created" not in num, "paid time from the app's order")

print("3. guards")
links = wf["connections"]
for ask, check in (("2a · Load the order", "2b · Check the order"), ("8a · Re-check the order", "8b · Still owed?")):
    outs = links[ask]["main"]
    need(by[ask].get("onError") == "continueErrorOutput" and len(outs) == 2 and all(o[0]["node"] == check for o in outs),
         f"{ask}: the order and its refusal both reach {check}")
need(by["8 · Hold to the 24h mark"]["parameters"]["dateTime"] == A.EXPR("wait_until") and "paid_at" in A.X["wait_until"],
     f"wait = the app's paid time + {A.WAIT_MINUTES} min")
cf = by["9b · Tag + 11 reading link (the send)"]["parameters"]["bodyParameters"]["parameters"][0]["value"]
need(A.AWEBER_FIELD in cf and "...($json.custom_fields" in cf and not re.search(r"[{,]\s*reading_url\s*:", cf),
     f"the send writes only {A.AWEBER_FIELD} (other fields written back as found)")
need(links["9 · Find her on AWeber"]["main"][0][0]["node"] == "9a · Can we email her?", "AWeber find is checked before the send")
need(links["10a · Closing the Door owed?"]["main"][0][0]["node"].startswith("10b"), "a bump buyer's run tells the team after delivery")

# n8n's Code node keeps only the text after the LAST colon of a thrown message (run 52542 emailed the team
# "5, 6, 7, 8, 9, 11, 22, 33) [line 10]"). Strip ${...} and check the literal text of every throw.
colon = []
for n in wf["nodes"]:
    for m in re.finditer(r"throw new Error\((`[^`]*`|'[^']*')\)", n["parameters"].get("jsCode", "")):
        lit = re.sub(r"\$\{[^}]*\}", "", m.group(1))
        if ":" in lit: colon.append(f"{n['name']}: {m.group(1)[:60]}")
need(not colon, "no colon in any thrown message (the team's email would show only the tail)" + (f" {colon}" if colon else ""))
stop = by["10b · Tell the team: Closing the Door owed"]["parameters"]["errorMessage"]
need(":" not in re.sub(r"\{\{.*?\}\}", "", stop[1:]), "the Closing the Door alert has no colon either")

print("4. the live fill against Python")
tmp = tempfile.mkdtemp()
fill = json.loads(json.dumps(by["4 · Pick the report + fill it"])); fill["name"] = "2 · live fill"
flow = os.path.join(tmp, "flow.json"); json.dump({"nodes": [fill]}, open(flow, "w"), ensure_ascii=False)
bank, cases, want = L.load_bank(), [], []
for su, path in L.written_reports().items():
    tpl = L.parse_report(path)
    for ex in L.NUMBER_KEYS:
        for lp in L.NUMBER_KEYS:
            for fork in ("get_back", "giving"):
                keys = L.keys_for(int(su), int(ex), int(lp)); keys["FORK"] = fork
                keys.update({"PY": str((int(ex) + int(lp)) % 9 + 1), "NEXT_BDAY": "March 14"})
                cases.append({"numbers": {"su": int(su)}, "keys": keys, "first_name": "Testina",
                              "birth_name": "Testina Rose Testerly", "dob_text": "November 5, 1962"})
                if su in held: want.append(None); continue
                try: want.append(L.fill(tpl, bank, keys, "Testina", "Testina Rose Testerly", "November 5, 1962"))
                except L.Hold: want.append(None)
json.dump(cases, open(os.path.join(tmp, "cases.json"), "w"), ensure_ascii=False)
subprocess.run(["node", os.path.join(HERE, "run-11-assemble.cjs"), flow, "--fill", os.path.join(tmp, "cases.json"),
                "--out", os.path.join(tmp, "got.json")], check=True)
got = json.load(open(os.path.join(tmp, "got.json")))
diff = sum(not ((w is None and "hold" in g) or (w is not None and g.get("sections") == w)) for w, g in zip(want, got))
held_ok = all("hold" in g for c, g in zip(cases, got) if str(c["numbers"]["su"]) in held)
need(diff == 0, f"{len(cases)} buyers: live node 4 = Python on every one")
need(held_ok, f"SU {', '.join(sorted(held, key=int)) or 'none'} (not cleared by check-report) HOLD, never guess")

print("5. the live test drive")
dtxt = json.dumps(drive, ensure_ascii=False)
real = [n["name"] for n in drive["nodes"] if n["type"] == "n8n-nodes-base.httpRequest"]
need(sorted(real) == sorted(["6 · PDFShift → PDF", next(n for n in real if n.startswith("T9"))]),
     "only PDFShift and the login probe call out")
need("errorWorkflow" not in dtxt and "oAuth2Api" not in dtxt, "no error email, no AWeber login")

print("\nALL PASS\n" if not fails else f"\nFAILED {len(fails)}\n")
sys.exit(1 if fails else 0)
