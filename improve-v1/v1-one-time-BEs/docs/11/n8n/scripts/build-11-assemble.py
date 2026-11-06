#!/usr/bin/env python3
"""Generate 11's ASSEMBLY test flow: no model at order time. Picks the fixed report by Soul Urge,
fills her name, date and lines, builds the PDF. Never delivers.

    python3 scripts/build-11-assemble.py          # → build/11-assemble-TEST.n8n.json (test buyers, never delivers)
    python3 scripts/build-11-assemble.py --live   # → build/11-fulfilment-ASSEMBLY.n8n.json (the live flow, inactive)
    python3 scripts/build-11-assemble.py --live --testdrive  # → …-ASSEMBLY-TESTDRIVE: the live chain, run on n8n by hand
    python3 scripts/build-11-assemble.py --testdrive  # → build/11-assemble-TESTDRIVE-MANUAL.n8n.json (2 buyers; import by hand)
    python3 scripts/build-11-assemble.py --testdrive --pick carol,peggy  # → …-MANUAL-PICK (any of the 25 test buyers)

The live test drive (2026-11-06) runs every path of the LIVE chain on n8n: T2 calls this same workflow once
per invented order, through the real nodes. Only the calls that would touch the app, Supabase or AWeber are
swapped for stand-ins that print what they would have sent, built from the SAME expressions as the live
nodes. PDFShift is real (1 credit per PDF). ⛔ No clock trigger anywhere: the old --testdrive tick
(a schedule firing every minute) is gone.

⛔ EDIT THIS FILE, THE REPORTS (product/11-P3-su<N>-report.md) AND 11-swapins.json, NEVER THE JSON.

The report format and the fill rules live in lib11_assemble.py (read its docstring). At build time
every written report is parsed into parts (prose + version choices); at order time FILL_JS picks
her versions and fills her shared lines. A missing report or line HOLDs the order with the reason.
check-11-assemble.py proves FILL_JS and lib11_assemble.fill give the same text for every buyer.

The test flow runs three invented buyers at once (T1 emits three items) and makes three PDFs:
Testina (SU 9, get you back), Faketta (SU 9, giving it back), Gloria (SU 9, master numbers 11/11).

Kept from build-11-n8n.py: the number sums (proven by check-11-numbers.mjs), the HTML page and
PDFShift settings. Live-only nodes (webhook, intake, upload, AWeber) are left out on purpose.
"""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "../build")

ARGS = sys.argv[1:]
PICK = None   # --pick carol,peggy: the manual test drive runs these test buyers (from the 25) instead of Cheryl + Norma
if "--pick" in ARGS:
    _i = ARGS.index("--pick")
    PICK = [p.strip().lower() for p in (ARGS[_i + 1] if _i + 1 < len(ARGS) else "").split(",") if p.strip()]
    ARGS = ARGS[:_i] + ARGS[_i + 2:]
ORDERS = None   # --orders normal,held-report: the live test drive runs only these invented orders (saves PDF credits)
if "--orders" in ARGS:
    _i = ARGS.index("--orders")
    ORDERS = [p.strip() for p in (ARGS[_i + 1] if _i + 1 < len(ARGS) else "").split(",") if p.strip()]
    ARGS = ARGS[:_i] + ARGS[_i + 2:]
ARGS = [a for a in ARGS if a != "--manual-only"]   # every test drive is manual now; the flag is kept so old commands work
LIVE = ARGS in (["--live"], ["--live", "--testdrive"], ["--testdrive", "--live"])
LIVE_DRIVE = LIVE and "--testdrive" in ARGS
DRIVE = ARGS == ["--testdrive"]
MANUAL = DRIVE
if (ARGS and not (LIVE or DRIVE)) or (PICK is not None and not (DRIVE and PICK)) or (ORDERS is not None and not (LIVE_DRIVE and ORDERS)):
    raise SystemExit(f"unknown flag(s): {' '.join(sys.argv[1:])} "
                     "(flags: --live [--testdrive [--orders a,b]], --testdrive [--pick a,b])")
sys.path.insert(0, HERE)
import lib11_assemble as L

# Invented buyers. Numbers are checked against lib11_assemble.numbers() at build time.
BUYERS = [
    {"order": "cs_test_11_assemble_testina", "name": "Testina Rose Testerly", "first": "Testina",
     "dob": "1962-11-05", "expect": {"su": 9, "ex": 8, "lp": 7, "FORK": "get_back"}},
    {"order": "cs_test_11_assemble_faketta", "name": "Faketta Ann Testerly", "first": "Faketta",
     "dob": "1962-11-05", "expect": {"su": 9, "ex": 1, "lp": 7, "FORK": "giving"}},
    {"order": "cs_test_11_assemble_gloria", "name": "Gloria Fay Testerly", "first": "Gloria",
     "dob": "1958-03-03", "expect": {"su": 9, "ex": 11, "lp": 11, "FORK": "giving"}},
]

# One test buyer per written Soul Urge and path (invented names; numbers worked out, not typed).
# A Soul Urge whose report isn't written (or is parked) is left out, so the run never HOLDs on purpose.
MORE = [("Rhonda Rose Testerly", "1961-04-12"), ("Judith Mae Testerly", "1961-04-12"),
        ("Gail Lynn Testerly", "1961-04-12"), ("Marsha Sue Testerly", "1961-04-12"),
        ("Linda Ann Testerly", "1961-04-12"), ("Patty Ann Testerly", "1963-02-17"),
        ("Wanda Ann Testerly", "1961-04-12"), ("Sandra Ann Testerly", "1963-02-17"),
        ("Carol Mae Testerly", "1961-04-12"), ("Donna Mae Testerly", "1963-02-17"),
        ("Cheryl Lynn Testerly", "1962-09-14"), ("Sherry Lynn Testerly", "1961-04-12"),
        ("Peggy Ann Testerly", "1961-04-12"), ("Norma Sue Testerly", "1961-04-12"),
        ("Sharon Lynn Testerly", "1961-04-12"), ("Brenda Ann Testerly", "1963-02-17"),
        ("Joyce Sue Testerly", "1961-04-12"), ("Bonnie Sue Testerly", "1959-08-23"),
        ("Karen Mae Testerly", "1961-04-12"), ("Debra Mae Testerly", "1961-04-12"),
        ("Diane Sue Testerly", "1961-04-12"), ("Vicki Beth Testerly", "1961-04-12")]
_written = L.written_reports()
for _n, _d in MORE:
    _su, _ex, _lp, _ = L.numbers(_n, _d)
    if str(_su) not in _written: continue
    _f = _n.split()[0]
    BUYERS.append({"order": f"cs_test_11_assemble_{_f.lower()}", "name": _n, "first": _f, "dob": _d,
                   "expect": {"su": _su, "ex": _ex, "lp": _lp, "FORK": L.keys_for(_su, _ex, _lp)["FORK"]}})

# Reuse the proven pieces of the writing flow without running its flag parser.
_argv, sys.argv = sys.argv, [sys.argv[0]]
_spec = importlib.util.spec_from_file_location("b11", os.path.join(HERE, "build-11-n8n.py"))
B = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B)
sys.argv = _argv
SPEC = B.SPEC

CARD_KEY = {v["name"].lower().replace("the ", ""): k for k, v in SPEC["cards"].items()}

def templates():
    out = {}
    for su, path in L.written_reports().items():
        tpl = L.parse_report(path, CARD_KEY)
        if tpl["gaps"]: raise SystemExit(f"SU {su}: {tpl['gaps']} gap(s) still marked ⟪WRITE⟫; it can't go in a flow")
        out[su] = {"cards": tpl["cards"], "sections": tpl["sections"]}
    return out

NUMBERS_JS = r"""
// Same sums as server/lib/numerologyEngine.ts and build-11-n8n.py node 3 (check-11-numbers.mjs).
// Her details come from the APP's order (GET /api/be/unsent-letter/fulfilment), never from the webhook body:
// that body isn't signature-checked, so it only routes the run. ⛔ Field names only in errors, never her details.
const inp = $input.first().json;
const s = (inp.body && inp.body.data && inp.body.data.object) || {};
const order = inp.order || {};
const orderId = order.stripeSessionId || s.id;
if (!inp.intake) throw new Error(`HOLD ${orderId} — no intake row. Her birth name and date never saved at checkout, so there is nothing to read from.`);
const intake = inp.intake;
const birthName = String(intake.fullBirthName || '').replace(/\s+/g, ' ').trim();
const dob = String(intake.dateOfBirth || '').slice(0, 10);
if (!birthName) throw new Error(`HOLD ${orderId} — no full_birth_name on the intake`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error(`HOLD ${orderId} — no valid date_of_birth on the intake`);
// Her first name: the intake's (?fn= from the email link), then the order's, then the first word of her birth name.
// The booking page has no name box, so a buyer who arrives without ?fn= still gets her name, not a HOLD.
const tidy = (w) => (w === w.toUpperCase() || w === w.toLowerCase())
  ? w.split('-').map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()).join('-') : w;
const given = [intake.firstName, order.displayFirstName, order.firstName].map((x) => String(x || '').trim()).find(Boolean);
const fromBirth = birthName.split(' ').find((w) => /^[A-Za-z][A-Za-z'’-]+$/.test(w)) || '';
const firstName = tidy(given || fromBirth);
const first_name_from = given ? 'intake or order' : 'birth name';
if (!firstName) throw new Error(`HOLD ${orderId} — no first name anywhere and none in her birth name`);
const email = order.email || intake.email || null;
if (!email) throw new Error(`HOLD ${orderId} — the app's order has no email`);
const seedOf = (str) => { let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return h; };
const LV = { a:1,j:1,s:1, b:2,k:2,t:2, c:3,l:3,u:3, d:4,m:4,v:4, e:5,n:5,w:5, f:6,o:6,x:6,
             g:7,p:7,y:7, h:8,q:8,z:8, i:9,r:9 };
const VOWELS = new Set(['a','e','i','o','u']);
const sumDigits = (n) => String(Math.abs(n)).split('').reduce((a, d) => a + parseInt(d, 10), 0);
const reduce = (n) => { while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = sumDigits(n); return n; };
const letters = birthName.toLowerCase().replace(/[^a-z]/g, '').split('');
const vowelSum = letters.reduce((a, l) => a + (VOWELS.has(l) ? (LV[l] || 0) : 0), 0);
const allSum = letters.reduce((a, l) => a + (LV[l] || 0), 0);
const [yy, mm, dd] = dob.split('-').map(Number);
const lp = reduce(reduce(mm) + reduce(dd) + reduce(sumDigits(yy)));
let su = reduce(vowelSum), ex = reduce(allSum), number_fallback = false;
if (!su) { su = reduce(letters.reduce((a, l) => a + (l === 'y' ? LV.y : 0), 0)); number_fallback = true; }
if (!su) su = 1 + (seedOf(birthName + '|su') % 9);
if (!ex) { ex = 1 + (seedOf(birthName + '|ex') % 9); number_fallback = true; }
const one = (n) => ({ 11: 2, 22: 4, 33: 6 }[n] || n);
const fork = (one(su) + one(ex) + one(lp)) % 3 === 0 ? 'get_back' : 'giving';
const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// Her year ahead (lib11_assemble.year_ahead): it starts on her next birthday; number = month + day + that year, to one digit.
const now = new Date(); const tm = now.getMonth() + 1, td = now.getDate();
const bd = (mm === 2 && dd === 29) ? 28 : dd;
const start = (mm > tm || (mm === tm && bd >= td)) ? now.getFullYear() : now.getFullYear() + 1;
let py = reduce(mm) + reduce(bd) + reduce(sumDigits(start)); while (py > 9) py = sumDigits(py);
return [{ json: {
  order_id: orderId, email, first_name: firstName, first_name_from, birth_name: birthName, dob_iso: dob,
  dob_text: `${M[mm - 1]} ${dd}, ${yy}`,
  // When she paid, by the app (its row is written by the paid webhook). The 24h clock runs from here.
  paid_at: order.paidAt || new Date().toISOString(),
  bump: order.bumpPurchased === true,
  numbers: { su, ex, lp, number_fallback },
  // The shared-list keys. EX/LP keep 11/22 as their own rows, 33 uses 6; the reason uses the one-digit sum.
  keys: { EX: String(ex === 33 ? 6 : ex), LP: String(lp === 33 ? 6 : lp),
          REASON: String(one(lp) % 3), FORK: fork, PY: String(py), NEXT_BDAY: `${M[mm - 1]} ${bd}` },
} }];
"""

FILL_JS = r"""
// Pick the report by Soul Urge, pick her versions, fill her lines. HOLD, never guess.
// Mirrors lib11_assemble.fill (check-11-assemble.py proves they match for every buyer).
const j = $input.first().json;
const T = __TEMPLATES__;
const BANK = __BANK__;
const NAMES = __CARD_NAMES__;
const su = String(j.numbers.su);
const t = T[su];
if (!t) throw new Error(`HOLD — no fixed report for Soul Urge ${su} yet (cleared so far ${Object.keys(T).join(', ')})`);
const missing = new Set();
const sections = {};
for (const [k, parts] of Object.entries(t.sections)) {
  let s = parts.map((p) => (typeof p === 'string' ? p : p.opts[j.keys[p.tag]])).join('');
  s = s.replace(/\{\{(EX|LP|REASON|PY)\.(\w+)\}\}/g, (_, tag, field) => {
    const got = ((BANK[tag] || {})[j.keys[tag]] || {})[field];
    if (!got) { missing.add(`${tag} ${j.keys[tag]} ${field}`); return ''; }
    return got;
  });
  s = s.split('{{FIRST}}').join(j.first_name).split('{{BIRTH_NAME}}').join(j.birth_name).split('{{DOB}}').join(j.dob_text);
  s = s.split('{{NEXT_BDAY}}').join(j.keys.NEXT_BDAY || '{{NEXT_BDAY}}');
  sections[k] = s.replace(/\n{3,}/g, '\n\n').trim();
}
if (missing.size) throw new Error(`HOLD — no shared line yet for ${[...missing].sort().join(' · ')}`);
// Last guards: nothing unfilled, the sentence the product turns on is in both places.
const all = Object.values(sections).join('\n');
const left = all.match(/\{\{[^}]*\}\}|\[\[|\]\]|⟪/g);
if (left) throw new Error(`HOLD — unfilled spot(s) left in the reading ${[...new Set(left)].sort().join(' ')}`);
const unsaid = (sections['11'].match(/"([^"]+)"/) || [])[1];
if (!unsaid || !sections.letter.includes(unsaid)) throw new Error('HOLD — the unsaid sentence is not in both card 11 and the letter');
const deal = t.cards.map((card, i) => ({ house: i + 1, card, card_name: NAMES[card] }));
return [{ json: { ...j, report: `SU ${su}`, sections, deal,
  words: all.split(/\s+/).filter(Boolean).length } }];
"""

def per_item(js):
    """Test flow only: run a single-item code body once per test buyer."""
    return ("const __out = [];\n"
            "for (const [__i, __it] of $input.all().entries()) {\n"
            "  try { __out.push(...(($input) => {\n" + js + "\n  })({ first: () => __it, all: () => [__it] })); }\n"
            "  catch (e) { throw new Error(`[test buyer ${__i + 1}] ${e.message}`); }\n"
            "}\nreturn __out;")


# Test drive on the real n8n (2026-11-05): two buyers on the bar-shape reports, and a clock-aligned
# tick so testdrive-11-n8n.py's arm-one-tick method can run it. Still no delivery nodes at all.
DRIVE_BUYERS = [("cs_test_11_drive_cheryl", "Cheryl Lynn Testerly", "Cheryl", "1962-09-14"),
                ("cs_test_11_drive_norma", "Norma Sue Testerly", "Norma", "1961-04-12")]
if DRIVE and PICK:
    _by_first = {b["first"].lower(): b for b in BUYERS}
    _missing = [p for p in PICK if p not in _by_first]
    if _missing: raise SystemExit(f"--pick: no test buyer {', '.join(_missing)} (choose from {', '.join(_by_first)})")
    BUYERS = [_by_first[p] for p in PICK]
elif DRIVE:
    BUYERS = []
    for order, name, first, dob in DRIVE_BUYERS:
        su, ex, lp, _ = L.numbers(name, dob)
        BUYERS.append({"order": order, "name": name, "first": first, "dob": dob,
                       "expect": {"su": su, "ex": ex, "lp": lp, "FORK": L.keys_for(su, ex, lp)["FORK"]}})

def build():
    tpls, html_js, fill_js = html_and_fill()
    items = []
    for f in BUYERS:
        su, ex, lp, _ = L.numbers(f["name"], f["dob"])
        got = {"su": su, "ex": ex, "lp": lp, "FORK": L.keys_for(su, ex, lp)["FORK"]}
        assert got == f["expect"], f"{f['first']}: numbers {got}, expected {f['expect']}"
        items.append({"json": {"body": {"type": "checkout.session.completed", "data": {"object": {
                         "id": f["order"], "payment_status": "paid", "created": 1793620800,
                         "customer_details": {"email": f"dryrun-11-{f['first'].lower()}@example.com"},
                         "metadata": {"app": "the-seer-within", "product": B.STRIPE_PRODUCT,
                                      "offer": B.OFFER_KEY, "bump": "0"}}}},
                     # What the app's GET /fulfilment returns (the live flow reads her details from here).
                     "order": {"stripeSessionId": f["order"], "email": f"dryrun-11-{f['first'].lower()}@example.com",
                               "firstName": f["first"], "paidAt": "2026-11-02T12:00:00.000Z", "bumpPurchased": False},
                     "intake": {"fullBirthName": f["name"], "dateOfBirth": f["dob"], "firstName": f["first"]}}})
    B.NODES.clear()   # the helpers append to the writing flow's list and return the name
    trigger = [
        {"parameters": {}, "id": "T0", "name": "T0 · press Execute (manual test)",
         "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [-620, 300]}]
    who = " · ".join(f"{f['first']} ({f['expect']['FORK']})" for f in BUYERS)
    for _ in [
        B.code(f"T1 · {len(BUYERS)} test orders", [-420, 300],
               "// ⛔ TEST ONLY. Invented buyers: what the Stripe webhook + intake would carry.\n"
               "return " + json.dumps(items, ensure_ascii=False, indent=2) + ";",
               f"Invented buyers: {who}. Each makes its own PDF."),
        B.code("1 · Her numbers", [-220, 300], per_item(NUMBERS_JS),
               "Soul Urge picks the report. Expression, Life Path and the path pick the versions and lines."),
        B.code("2 · Pick the report + fill it", [-20, 300], per_item(fill_js),
               "No model. The finished report for her Soul Urge, with her name, date and lines. HOLDs if anything isn't written."),
        B.code("3 · Build the HTML", [180, 300], per_item(html_js), "Same page as the writing flow."),
        B.node("4 · PDFShift → PDF", "n8n-nodes-base.httpRequest", 4.2, [380, 300], {
            "method": "POST", "url": "https://api.pdfshift.io/v3/convert/pdf",
            "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
            "sendHeaders": True,
            "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
            "sendBody": True, "specifyBody": "json",
            "jsonBody": ("={\n  \"source\": {{ JSON.stringify($json.html) }},\n"
                         "  \"format\": \"Letter\",\n  \"margin\": \"0\",\n"
                         "  \"use_print\": true,\n  \"sandbox\": false\n}"),
            "options": {"response": {"response": {"responseFormat": "file"}}, "timeout": 120000},
        }, {"credentials": {"httpHeaderAuth": B.PDFSHIFT_CRED},
            "notes": "One PDF per test buyer: open each item and download. Nothing is uploaded or sent."}),
    ]: pass
    nodes = trigger + list(B.NODES)
    to = lambda n: {"main": [[{"node": n, "type": "main", "index": 0}]]}
    order = [n["name"] for n in nodes]
    links = {a: to(b) for a, b in zip(order, order[1:])}
    sus = ", ".join(tpls)
    return {"name": f"11 · Unsent Letter — ASSEMBLY TEST (SU {sus}; no model; never delivers; {len(BUYERS)} buyers)",
            "nodes": nodes, "connections": links, "active": False,
            "settings": {"executionOrder": "v1", "saveManualExecutions": True,
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
            "pinData": {}, "tags": []}

def html_and_fill():
    tpls, bank = templates(), L.load_bank()
    html_js = (B.HTML_JS.replace("$('7a · Read the verdict').first().json", "$input.first().json")
               .replace("__S3__", B.S3).replace("__CROP__", "true" if SPEC["death_crop"] else "false")
               .replace("__C4__", json.dumps(B.CLOSING_THE_DOOR_HTML))
               .replace("__ACTS__", json.dumps(SPEC["acts"], ensure_ascii=False))
               .replace("written with machine help in Evelyn's voice", "written in Evelyn's voice"))
    assert "$input.first().json" in html_js
    # A bump buyer gets her main reading on time; the flow then tells the team Closing the Door is owed
    # (live node 10b), instead of holding the whole reading until 11-C4 is written (2026-11-06).
    hold = ("if (j.bump && !CLOSING_THE_DOOR) {\n"
            "  throw new Error('HOLD: this buyer took the bump and 11-C4 Closing the Door is not written. "
            "Do not send this reading without its last page.');\n}\n")
    assert html_js.count(hold) == 1
    html_js = html_js.replace(hold, "// Bump without 11-C4 written: she still gets this reading; bump_owed tells node 10a to alert the team.\n")
    ret = "return [{ json: { ...j, html, pdfFileName: `${j.order_id}.pdf` } }];"
    assert html_js.count(ret) == 1
    html_js = html_js.replace(ret, "return [{ json: { ...j, html, pdfFileName: `${j.order_id}.pdf`, bump_owed: !!(j.bump && !CLOSING_THE_DOOR) } }];")
    fill_js = (FILL_JS.replace("__TEMPLATES__", json.dumps(tpls, ensure_ascii=False))
               .replace("__BANK__", json.dumps(bank, ensure_ascii=False))
               .replace("__CARD_NAMES__", json.dumps({k: v["name"] for k, v in SPEC["cards"].items()})))
    return tpls, html_js, fill_js

HTML_NODE = "5 · Build the HTML"

def passing_reports():
    """Live build: only reports that pass check-report.py go in. A buyer whose report is left out HOLDs at node 4."""
    import subprocess
    chk = os.path.join(HERE, "../../product/scripts/check-report.py")
    ok, held = {}, []
    for su, path in L.written_reports().items():
        r = subprocess.run([sys.executable, chk, path], capture_output=True, text=True)
        (ok.__setitem__(su, path) if "ALL PASS" in r.stdout else held.append(su))
    return ok, held

# ─── the live flow (rebuilt 2026-11-06 after the prod-readiness audit) ──────────────────────────
# Stripe → is it 11 → the app's order (refunded / delivered stop here) → numbers → fill → HTML → PDF
# → Supabase → wait to paid + 23h30m → ask the app again (refunded during the wait stops here)
# → signed URL → find her on AWeber (not on the list / unsubscribed HOLD) → tag + her 11 link = the send
# → mark delivered. A bump buyer's PDF ends with Closing the Door (11-C4, written 2026-11-06), so nothing
# else is owed; only if 11-C4's file goes missing does the flow fall back to telling the team it's owed.
# Every failure fails the run, and the run's errorWorkflow emails the team. Nothing fails silently.

# The host and login the LIVE 08 flows already use for the same app endpoints (08 PDF flow
# MctR7dHIVo8wTpOS, read 2026-11-06). The credential sends "Authorization: Bearer <BE_FULFILMENT_TOKEN>",
# the form server/routes/beFulfilment.ts requires. ⛔ The token lives in n8n, never in this repo.
APP_BASE_URL = "https://theseerwithin.com"
FULFIL_CRED  = {"id": "47WIHYBv4f0n4w8C", "name": "BE Fulfilment (dev)"}
# "The seer within Error Flow - To send email if there is any error": Error Trigger → Gmail to the team.
# 08's live flows use it. A failed run of this flow (any HOLD included) emails the team.
ERROR_FLOW   = "c8hLW9ACJi5f9g0r"
# Its own path. The old AI flow (build-11-n8n.py) still says unsent-letter-fulfilment; two flows on one
# path means only one gets the order.
WEBHOOK_PATH = "unsent-letter-delivery"
# 11's OWN AWeber field (be-offer-launch: never the shared reading_url, multi-offer buyers overwrite it).
# ⚠ It has to exist on list 6972552 before go-live (made by hand in AWeber), and the T4 delivery email merges it.
AWEBER_FIELD = "11_unsent_letter_reading_url"
WAIT_MINUTES = 23 * 60 + 30     # paid + 23h30m, so the email lands inside "within 24 hours" with room for AWeber
SIGN_SECONDS = 10 * 365 * 24 * 3600   # her link works for 10 years; nothing re-signs it later
RETRY        = {"retryOnFail": True, "maxTries": 4, "waitBetweenTries": 5000}   # n8n caps the wait at 5s
OFFER        = B.OFFER_KEY
TEST_WF_ID   = "yJOu9VK7SG0aFzyW"   # the inactive test workflow on n8n the live test drive is pasted into

# Expressions shared by the live HTTP nodes and the test drive's stand-ins, so the test proves the
# exact strings the live nodes will send. Plain JS: a live node wraps them in {{ }}, a stand-in runs them.
H = "$('5 · Build the HTML').first().json"
SESSION = "$('1 · Stripe webhook').first().json.body.data.object.id"
X = {
    "order_url":   f"'{APP_BASE_URL}/api/be/{OFFER}/fulfilment/' + {SESSION}",
    "pdf_path":    f"'{B.SUPABASE_BUCKET}/11/' + {H}.order_id + '/' + {H}.pdfFileName",
}
X.update({
    "upload_url":  f"'{B.SUPABASE_PROJ}/storage/v1/object/' + {X['pdf_path']}",
    "sign_url":    f"'{B.SUPABASE_PROJ}/storage/v1/object/sign/' + {X['pdf_path']}",
    "wait_until":  f"DateTime.fromISO({H}.paid_at).plus({{ minutes: {WAIT_MINUTES} }}).toISO()",
    "find_url":    (f"'https://api.aweber.com/1.0/accounts/{B.AWEBER_ACCOUNT}/lists/{B.AWEBER_LIST}"
                    f"/subscribers?ws.op=find&email=' + encodeURIComponent({H}.email)"),
    "reading_url": f"'{B.SUPABASE_PROJ}/storage/v1' + $('8d · Get signed URL').first().json.signedURL",
})
X.update({
    # 🔴 custom_fields is a WHOLE-STATE write: spread what the find returned, change only 11's own field.
    "custom_fields":  f"{{ ...($json.custom_fields || {{}}), '{AWEBER_FIELD}': {X['reading_url']} }}",
    "tags":           f"{{ add: ['{B.DELIVERED_TAG}'] }}",
    "delivered_url":  f"'{APP_BASE_URL}/api/be/{OFFER}/delivered'",
    "delivered_body": f"{{ sessionId: {H}.order_id, readingUrl: {X['reading_url']} }}",
})
EXPR = lambda k: "={{ " + X[k] + " }}"

CHECK_JS = r"""
// The app's answer about this order. Both outputs of __ASK__ land here: the order (200), or the refusal
// left after the retries. Not paid any more (409: refunded or cancelled) and already delivered stop
// quietly; anything else is a fault and fails the run, which emails the team.
// ⛔ Only the message and the status code are read from an error: the whole object can carry the request.
// ⛔ No colon in a thrown message: n8n keeps only the text after the last colon, and that is what the team's email shows.
const WHEN = '__WHEN__';
const r = $input.first().json;
const hook = $('1 · Stripe webhook').first().json;
const sessionId = hook.body.data.object.id;
if (r.error !== undefined) {
  const e = r.error;
  const msg = String(typeof e === 'string' ? e : [e && e.message, e && e.description].filter(Boolean).join(' · ')).slice(0, 240);
  const code = String((e && typeof e === 'object' && (e.httpCode || e.status || e.statusCode)) || (msg.match(/\b([2-5]\d\d)\b/) || [])[1] || '');
  if (code === '409' || /not paid/i.test(msg))
    return [{ json: { go: false, order_id: sessionId, why: `${WHEN} — the app says this order isn't paid any more (refunded or cancelled). Nothing sent.` } }];
  // What the app said, e.g. 500 - "{\"error\":\"Internal Server Error\"}" → Internal Server Error. No colons (see below).
  const said = ((msg.match(/error\\*"\s*:\s*\\*"([^"\\]+)/) || [])[1] || msg).replace(/:/g, ' ').trim();
  throw new Error(`${WHEN} — the app wouldn't give order ${sessionId} (HTTP ${code || '?'}, it said ${said})`);
}
if (!r.order) throw new Error(`${WHEN} — the app answered without an order for ${sessionId}`);
if (r.order.deliveredAt)
  return [{ json: { go: false, order_id: sessionId, why: `${WHEN} — already delivered at ${r.order.deliveredAt}. Not sent again.` } }];
return [{ json: { go: true, body: hook.body, order: r.order, intake: r.intake || null } }];
"""

CAN_EMAIL_JS = r"""
// AWeber's find, checked before the send. ⛔ Never create her here: every buyer is put on the customer list
// at checkout, so not finding her is a fault. Either HOLD leaves her reading uploaded and unsent.
const f = $input.first().json;
const order = $('5 · Build the HTML').first().json.order_id;
const entries = Array.isArray(f.entries) ? f.entries : [];
if (!entries.length)
  throw new Error(`HOLD ${order} — she isn't on the customer list (AWeber __LIST__). Her reading is uploaded but NOT sent. Add her, then start her order again from the beginning (Retry reuses the old lookup and fails again), or email her the link by hand.`);
const sub = entries[0];
if (sub.status !== 'subscribed')
  throw new Error(`HOLD ${order} — her AWeber status is "${sub.status}", so the delivery email can't reach her. Her reading is uploaded but NOT sent. Email her the link by hand.`);
return [{ json: { self_link: sub.self_link, custom_fields: sub.custom_fields || {} } }];
"""

def ask_app(name, pos):
    """GET the order from the app. Retries a blip; a refusal goes out of the error output to the check."""
    return B.node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "url": EXPR("order_url"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "options": {"timeout": 30000},
    }, {"credentials": {"httpHeaderAuth": FULFIL_CRED}, **RETRY, "onError": "continueErrorOutput",
        "notes": "The app's order: email, bump, paid time, delivered, refunded. Retries 4×; a refusal goes to the check."})

def if_true(name, pos, expr):
    return B.node(name, "n8n-nodes-base.if", 2.2, pos, {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
                       "conditions": [{"id": "t", "leftValue": "={{ " + expr + " }}", "rightValue": "",
                                       "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
                       "combinator": "and"}, "options": {}})

def build_live():
    ok, held = passing_reports()
    _wr = L.written_reports
    L.written_reports = lambda: ok
    try: tpls, html_js, fill_js = html_and_fill()
    finally: L.written_reports = _wr
    build_live.held = held
    B.NODES.clear(); B.LINKS.clear()
    old = {n["name"]: n for n in B.build()["nodes"]}   # reuse the proven IF and PDFShift nodes as they are
    B.NODES.clear(); B.LINKS.clear()
    def reuse(old_name, name, pos, extra=None):
        n = json.loads(json.dumps(old[old_name], ensure_ascii=False))
        n.update({"name": name, "id": name.split(" ")[0], "position": pos, **(extra or {})})
        B.NODES.append(n); return name
    y, dy = 300, 200
    B.node("1 · Stripe webhook", "n8n-nodes-base.webhook", 2, [-1000, y],
           {"httpMethod": "POST", "path": WEBHOOK_PATH, "responseMode": "onReceived", "options": {}},
           {"notes": "Stripe checkout.session.completed. ⛔ Not signature-checked, so it only routes: her details come from the app (2a)."})
    reuse("2 · Is this a paid 11 order?", "2 · Is this a paid 11 order?", [-800, y])
    reuse("Not 11 — ignore", "Not 11 — ignore", [-600, y + dy])
    ask_app("2a · Load the order", [-600, y])
    B.code("2b · Check the order", [-400, y], CHECK_JS.replace("__WHEN__", "Before starting").replace("__ASK__", "2a"),
           "Already delivered, or refunded before we started: stop quietly. Any other refusal fails the run (the team is emailed).")
    if_true("2c · Anything to do?", [-200, y], "$json.go")
    B.node("Stop — already delivered or not paid", "n8n-nodes-base.noOp", 1, [0, y + dy], {})
    B.code("3 · Her numbers", [0, y], NUMBERS_JS,
           "Soul Urge picks the report. Her email, bump, paid time and name come from the app's order.")
    B.code("4 · Pick the report + fill it", [200, y], fill_js,
           "No model. The finished report for her Soul Urge. HOLDs (the team is emailed) if her report isn't cleared yet: "
           + (f"SU {', '.join(held)} at this build." if held else "none at this build."))
    B.code(HTML_NODE, [400, y], html_js, ("Card art by deal record. A bump buyer's PDF ends with Closing the Door (11-C4)." if B.CLOSING_THE_DOOR_HTML else
              "Card art by deal record. A bump buyer still gets this reading; 10a tells the team Closing the Door is owed."))
    reuse("11 · PDFShift → PDF", "6 · PDFShift → PDF", [600, y], RETRY)
    B.node("7 · Upload to Supabase Storage", "n8n-nodes-base.httpRequest", 4.2, [800, y], {
        "method": "POST", "url": EXPR("upload_url"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "Content-Type", "value": "application/pdf"}, {"name": "x-upsert", "value": "true"}]},
        "sendBody": True, "contentType": "binaryData", "inputDataFieldName": "data",
        "options": {"timeout": 60000},
    }, {"credentials": {"httpHeaderAuth": B.SUPABASE_CRED}, **RETRY,
        "notes": "Private bucket analysis_pdf/11/<session>/. ⚠ First real write is the Stripe test-mode order."})
    B.node("8 · Hold to the 24h mark", "n8n-nodes-base.wait", 1.1, [1000, y],
           {"resume": "specificTime", "dateTime": EXPR("wait_until")},
           {"notes": f"Paid (the app's paidAt) + {WAIT_MINUTES // 60}h{WAIT_MINUTES % 60:02d}m: inside 24 hours, never early by hours. "
                     "⛔ A waiting run keeps the version it started on; a fix only reaches new orders."})
    ask_app("8a · Re-check the order", [1200, y])
    B.code("8b · Still owed?", [1400, y], CHECK_JS.replace("__WHEN__", "After the wait").replace("__ASK__", "8a"),
           "Refunded or delivered during the wait: stop, nothing sent.")
    if_true("8c · Still to deliver?", [1600, y], "$json.go")
    B.node("Stop — refunded or delivered during the wait", "n8n-nodes-base.noOp", 1, [1800, y + dy], {})
    B.node("8d · Get signed URL", "n8n-nodes-base.httpRequest", 4.2, [1800, y], {
        "method": "POST", "url": EXPR("sign_url"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True,
        "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": '{ "expiresIn": %d }' % SIGN_SECONDS,
        "options": {"timeout": 30000},
    }, {"credentials": {"httpHeaderAuth": B.SUPABASE_CRED}, **RETRY, "notes": "Her link works for 10 years."})
    B.node("9 · Find her on AWeber", "n8n-nodes-base.httpRequest", 4.2, [2000, y], {
        "url": EXPR("find_url"),
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": B.AWEBER_CRED}, **RETRY,
        "notes": f"Customer list {B.AWEBER_LIST} (backendCustomerList.ts: every 11 buyer is put on it at checkout). ⛔ FIND, NEVER CREATE."})
    B.code("9a · Can we email her?", [2200, y], CAN_EMAIL_JS.replace("__LIST__", B.AWEBER_LIST),
           "Not on the list, or unsubscribed: HOLD (the team is emailed), reading uploaded but not sent.")
    B.node("9b · Tag + 11 reading link (the send)", "n8n-nodes-base.httpRequest", 4.2, [2400, y], {
        "method": "PATCH", "url": "={{ $json.self_link }}",
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "sendBody": True, "specifyBody": "keypair", "contentType": "json",
        "bodyParameters": {"parameters": [
            {"name": "custom_fields", "value": EXPR("custom_fields")},
            {"name": "tags", "value": EXPR("tags")},
        ]}, "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": B.AWEBER_CRED}, **RETRY,
        "notes": f"⭐ THE PATCH IS THE SEND: tag {B.DELIVERED_TAG} fires the T4 email, which merges {AWEBER_FIELD}. "
                 "Only 11's own field changes; every other field is written back as found."})
    B.node("10 · Mark delivered", "n8n-nodes-base.httpRequest", 4.2, [2600, y], {
        "method": "POST", "url": EXPR("delivered_url"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendBody": True, "specifyBody": "json", "jsonBody": "={{ JSON.stringify(" + X["delivered_body"] + ") }}",
        "options": {"timeout": 30000},
    }, {"credentials": {"httpHeaderAuth": FULFIL_CRED}, **RETRY,
        "notes": "delivered_at is COALESCEd by the app, so a retry never moves it."})
    C4 = bool(B.CLOSING_THE_DOOR_HTML)   # written: the bump is the PDF's last page, nothing to alert
    if not C4:
        if_true("10a · Closing the Door owed?", [2800, y], H + ".bump_owed")
        B.node("10b · Tell the team: Closing the Door owed", "n8n-nodes-base.stopAndError", 1, [3000, y - dy], {
            "errorMessage": ("=Delivered the main reading for {{ " + H + ".order_id }}. She also paid for Closing the Door "
                             "(11-C4), which isn't written — send it by hand or refund the bump."),
        }, {"notes": "Fails the run on purpose, AFTER delivery, so the error flow emails the team."})
    B.node("Done — delivered", "n8n-nodes-base.noOp", 1, [3000, y], {})

    nodes = list(B.NODES)
    names = [n["name"] for n in nodes]
    LINKS = {}
    def link(a, b, out=0):
        LINKS.setdefault(a, {"main": []})
        while len(LINKS[a]["main"]) <= out: LINKS[a]["main"].append([])
        LINKS[a]["main"][out].append({"node": b, "type": "main", "index": 0})
    chain = ["1 · Stripe webhook", "2 · Is this a paid 11 order?"]
    link(*chain)
    link("2 · Is this a paid 11 order?", "2a · Load the order"); link("2 · Is this a paid 11 order?", "Not 11 — ignore", 1)
    link("2a · Load the order", "2b · Check the order"); link("2a · Load the order", "2b · Check the order", 1)
    link("2b · Check the order", "2c · Anything to do?")
    link("2c · Anything to do?", "3 · Her numbers"); link("2c · Anything to do?", "Stop — already delivered or not paid", 1)
    for a, b in zip(["3 · Her numbers", "4 · Pick the report + fill it", HTML_NODE, "6 · PDFShift → PDF",
                     "7 · Upload to Supabase Storage", "8 · Hold to the 24h mark"],
                    ["4 · Pick the report + fill it", HTML_NODE, "6 · PDFShift → PDF", "7 · Upload to Supabase Storage",
                     "8 · Hold to the 24h mark", "8a · Re-check the order"]):
        link(a, b)
    link("8a · Re-check the order", "8b · Still owed?"); link("8a · Re-check the order", "8b · Still owed?", 1)
    link("8b · Still owed?", "8c · Still to deliver?")
    link("8c · Still to deliver?", "8d · Get signed URL"); link("8c · Still to deliver?", "Stop — refunded or delivered during the wait", 1)
    after_delivered = "Done — delivered" if C4 else "10a · Closing the Door owed?"
    for a, b in zip(["8d · Get signed URL", "9 · Find her on AWeber", "9a · Can we email her?",
                     "9b · Tag + 11 reading link (the send)", "10 · Mark delivered"],
                    ["9 · Find her on AWeber", "9a · Can we email her?", "9b · Tag + 11 reading link (the send)",
                     "10 · Mark delivered", after_delivered]):
        link(a, b)
    if not C4:
        link("10a · Closing the Door owed?", "10b · Tell the team: Closing the Door owed")
        link("10a · Closing the Door owed?", "Done — delivered", 1)
    # Every node referenced by name must exist, and every link must land on a node.
    refs = set(re.findall(r"\$\('([^']+)'\)", json.dumps(nodes, ensure_ascii=False)))
    bad = sorted((refs | {d["node"] for v in LINKS.values() for o in v["main"] for d in o}) - set(names))
    if bad: raise SystemExit(f"live build: references to missing nodes: {bad}")
    if len(set(names)) != len(names): raise SystemExit("live build: two nodes share a name")
    sus = ", ".join(tpls)
    return {"name": f"11 · The Unsent Letter — delivery (fixed reports SU {sus}; no model) [LIVE BUILD]",
            "nodes": nodes, "connections": LINKS, "active": False,
            # Runs that end well keep no data (her birth name, date and PDF would sit in n8n for nothing);
            # failed runs keep everything, so a HOLD can be fixed and retried.
            "settings": {"executionOrder": "v1", "saveManualExecutions": True, "callerPolicy": "workflowsFromSameOwner",
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "none",
                         "errorWorkflow": ERROR_FLOW},
            "pinData": {}, "tags": []}

# ─── the live test drive: the LIVE chain on n8n, by hand ───────────────────────────────────────
# T0 → T1 (invented orders, one per path) → T2 runs THIS workflow once per order, starting at the
# sub-workflow trigger named "1 · Stripe webhook", so every live node runs on one order exactly as it
# would live. Stand-ins replace only the calls to the app, Supabase and AWeber: each builds its URL and
# body from the same X expressions as the live node and returns it, plus the answer the order's
# script says the service gives. T9 is the one real outside call: the app's order lookup with the live
# login, for a made-up session (expect 404 "Unknown offer" until 11 is on Production; 401 = bad token).
STAND_IN = {   # live node → (what the stand-in returns)
    "2a · Load the order":     "({ ...$('1 · Stripe webhook').first().json._script.app_start, _would_get: " + X["order_url"] + " })",
    "8a · Re-check the order": "({ ...$('1 · Stripe webhook').first().json._script.app_recheck, _would_get: " + X["order_url"] + " })",
    "7 · Upload to Supabase Storage": "({ Key: " + X["pdf_path"] + ", _would_post_pdf_to: " + X["upload_url"] + ", _pdf_bytes: (($input.item.binary || {}).data || {}).fileSize || null })",
    "8d · Get signed URL": "({ signedURL: '/object/sign/' + " + X["pdf_path"] + " + '?token=TEST-DRIVE', _would_sign: " + X["sign_url"] + ", _expires_in: " + str(SIGN_SECONDS) + " })",
    "9 · Find her on AWeber": "({ ...$('1 · Stripe webhook').first().json._script.aweber, _would_get: " + X["find_url"] + " })",
    "9b · Tag + 11 reading link (the send)": "({ _would_patch: $json.self_link, custom_fields: " + X["custom_fields"] + ", tags: " + X["tags"] + " })",
    "10 · Mark delivered": ("({ ok: true, _would_post_to: " + X["delivered_url"] + ", _body: " + X["delivered_body"]
                            + ", _aweber_patch: $('9b · Tag + 11 reading link (the send)').first().json })"),
}

def drive_scenarios():
    """One invented order per path. ⛔ Invented names, example.com emails, cs_test_ ids."""
    by = {b[0].split()[0].lower(): b for b in MORE + [("Testina Rose Testerly", "1962-11-05")]}
    def order(first, *, label, expect, product=None, bump=False, name_in_intake=True, name_in_order=True,
              intake=True, delivered=False, due="past", app_start=None, app_recheck=None, aweber="subscribed"):
        name, dob = by[first]
        f = name.split()[0]
        sid = f"cs_test_11_drive_{label}"
        email = f"dryrun-11-{label}@example.com"
        o = {"id": 0, "stripeSessionId": sid, "email": email,
             "firstName": f if name_in_order else None, "displayFirstName": f if name_in_order else None,
             "amountCents": 0, "bumpPurchased": bump, "paidAt": "__DUE_SOON__" if due == "soon" else "__DUE_NOW__",
             "deliveredAt": "2026-11-05T09:00:00.000Z" if delivered else None, "readingUrl": None}
        itk = ({"fullBirthName": name, "dateOfBirth": dob, "firstName": f if name_in_intake else None,
                "email": email, "speedBump": None, "stone": None} if intake else None)
        ok = {"offer": OFFER, "offerNumber": "11", "order": o, "intake": itk, "draw": None, "edition": None}
        # The shape n8n really hands the error output (seen on the T9 probe, run 52533): an AxiosError with
        # status, and the body JSON-quoted in the message.
        refused = lambda code, body: {"error": {"message": f"{code} - " + json.dumps(json.dumps(body, separators=(",", ":"))),
                                                "name": "AxiosError", "code": "ERR_BAD_REQUEST" if code < 500 else "ERR_BAD_RESPONSE",
                                                "status": code}}
        sub = {"self_link": f"https://api.aweber.com/1.0/accounts/{B.AWEBER_ACCOUNT}/lists/{B.AWEBER_LIST}/subscribers/9{len(label):08d}",
               "status": aweber, "custom_fields": {"reading_url": "another offer's link: must come back untouched",
                                                   "m8_reading_url": "", AWEBER_FIELD: ""}}
        return {"body": {"type": "checkout.session.completed", "data": {"object": {
                    "id": sid, "payment_status": "paid", "created": 1793620800,
                    "customer_details": {"email": email},
                    "metadata": {"app": "the-seer-within", "product": product or B.STRIPE_PRODUCT,
                                 "offer": OFFER, "bump": "1" if bump else "0"}}}},
                "_script": {"label": label, "expect": expect,
                            "app_start": app_start or ok, "app_recheck": app_recheck or ok,
                            "aweber": {"entries": [sub] if aweber else [], "total_size": 1 if aweber else 0}},
                "_refused": refused}
    S = [
        order("carol", label="normal", expect="^delivered", due="soon"),
        order("sherry", label="no-first-name", expect="^delivered", name_in_intake=False, name_in_order=False),
        order("peggy", label="bump", expect="^delivered" if B.CLOSING_THE_DOOR_HTML else "Closing the Door", bump=True),
        order("testina", label="refunded-in-wait", expect="After the wait — .*isn't paid", app_recheck="409"),
        order("sharon", label="not-on-aweber", expect="isn't on the customer list", aweber=None),
        order("joyce", label="unsubscribed", expect='status is "unsubscribed"', aweber="unsubscribed"),
        order("debra", label="already-delivered", expect="already delivered", delivered=True),
        order("vicki", label="refunded-before", expect="Before starting — .*isn't paid", app_start="409"),
        order("karen", label="no-intake", expect="no intake row", intake=False),
        order("diane", label="not-11", expect="^ignored", product="be_some_other_offer"),
        order("judith", label="app-down", expect="Before starting — the app wouldn't give .*HTTP 500, it said Internal Server Error", app_start="500"),
        # SU 1-4, rewritten to the bar 2026-11-06: one buyer each, both paths covered
        order("rhonda", label="su1-giving", expect="^delivered"),
        order("marsha", label="su2-get-back", expect="^delivered"),
        order("linda", label="su3-giving", expect="^delivered"),
        order("sandra", label="su4-get-back", expect="^delivered"),
    ]
    # A report that fails check-report is left out of the build, so its buyers HOLD. Test that path only
    # while some report is held (all 12 passing leaves nothing to hold).
    held = [b for b in MORE if str(L.numbers(*b)[0]) in set(getattr(build_live, "held", []))]
    if held:
        f = held[0][0].split()[0].lower()
        S = [s for s in S if s["_script"]["label"] not in ("su1-giving", "su2-get-back", "su3-giving", "su4-get-back")
             or s["_script"]["label"].split("-")[0][2:] not in {str(L.numbers(*b)[0]) for b in held}]
        S.append(order(f, label="held-report", expect=f"no fixed report for Soul Urge {L.numbers(*held[0])[0]}"))
    for s in S:   # turn the "409"/"500" shorthands into the error item n8n hands the error output
        r = s.pop("_refused")
        for k in ("app_start", "app_recheck"):
            if s["_script"][k] == "409": s["_script"][k] = r(409, {"error": "Order is not paid", "status": "refunded"})
            if s["_script"][k] == "500": s["_script"][k] = r(500, {"error": "Internal Server Error"})
    return S

def build_live_drive(live):
    wf = json.loads(json.dumps(live, ensure_ascii=False))
    by = {n["name"]: n for n in wf["nodes"]}
    # The sub-workflow trigger takes the webhook's name, so every $('1 · Stripe webhook') reads the invented order.
    hook = by["1 · Stripe webhook"]
    hook.update({"type": "n8n-nodes-base.executeWorkflowTrigger", "typeVersion": 1, "parameters": {},
                 "notes": "TEST DRIVE: T2 starts each invented order here."})
    for name, ret in STAND_IN.items():
        n = by[name]
        for k in ("credentials", "retryOnFail", "maxTries", "waitBetweenTries", "onError"): n.pop(k, None)
        n.update({"type": "n8n-nodes-base.code", "typeVersion": 2,
                  "parameters": {"mode": "runOnceForEachItem",
                                 "jsCode": "// ⛔ TEST DRIVE STAND-IN for the live node of this name. Nothing leaves n8n.\n"
                                           "// It returns what the live node WOULD send, built from the same expressions.\n"
                                           "return { json: " + ret + " };"},
                  "notes": "TEST DRIVE stand-in: prints what the live node would send."})
        n["name"] = name
        if name in wf["connections"]:   # a code node has one output: fold the error output into it
            wf["connections"][name]["main"] = wf["connections"][name]["main"][:1]
    S = drive_scenarios()
    if ORDERS:
        known = [s["_script"]["label"] for s in S]
        if set(ORDERS) - set(known): raise SystemExit(f"--orders: no order {sorted(set(ORDERS) - set(known))} (choose from {', '.join(known)})")
        S = [s for s in S if s["_script"]["label"] in ORDERS]
    t1_js = ("// ⛔ TEST ONLY. Invented orders, one per path through the live chain.\n"
             f"const due = (sec) => new Date(Date.now() - ({WAIT_MINUTES} * 60 - sec) * 1000).toISOString();\n"
             "const S = " + json.dumps(S, ensure_ascii=False, indent=1) + ";\n"
             "// The first order's wait ends 25s from now (the Wait node visibly holds); the rest are already due.\n"
             "return S.map((s) => ({ json: JSON.parse(JSON.stringify(s).split('__DUE_SOON__').join(due(25)).split('__DUE_NOW__').join(due(-60))) }));")
    T = [
        {"parameters": {}, "id": "T0", "name": "T0 · press Execute (manual test)",
         "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [-1000, -300]},
        {"parameters": {"jsCode": t1_js}, "id": "T1", "name": f"T1 · {len(S)} invented orders",
         "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [-800, -300],
         "notes": "One per path: " + " · ".join(s["_script"]["label"] for s in S)},
        {"parameters": {"source": "database", "workflowId": {"__rl": True, "value": TEST_WF_ID, "mode": "id"},
                        "mode": "each", "options": {"waitForSubWorkflow": False}},
         "id": "T2", "name": "T2 · Run each through the live chain", "type": "n8n-nodes-base.executeWorkflow",
         "typeVersion": 1.1, "position": [-600, -300], "onError": "continueRegularOutput",
         "notes": f"Starts this workflow ({TEST_WF_ID}) once per order and doesn't wait. ⚠ Save first: it runs the SAVED version. "
                  "Read each order's own run in Executions. (Waiting made this node fail after the last order, "
                  "run 52546: n8n 1.1 reads a result that a held or stopped order never returns.)"},
        {"parameters": {"url": APP_BASE_URL + f"/api/be/{OFFER}/fulfilment/cs_test_11_drive_login_probe",
                        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
                        "options": {"timeout": 30000}},
         "id": "T9", "name": "T9 · Prove the app login (expect 404 until 11 is on Production)",
         "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [-800, -500],
         "credentials": {"httpHeaderAuth": FULFIL_CRED}, "onError": "continueErrorOutput",
         "notes": "The one real outside call: a read, made-up session. 401 = the login is wrong; 404 Unknown offer = login fine, 11 not deployed."},
        {"parameters": {"jsCode": "const j = $input.first().json;\nconst e = j.error;\n"
                                  "return [{ json: { reached_app: true, ok: e === undefined, "
                                  "status: e === undefined ? 200 : (e.httpCode || null), "
                                  "message: e === undefined ? 'order returned' : String(e.message || e).slice(0, 200), "
                                  "error_keys: e && typeof e === 'object' ? Object.keys(e) : null } }];"},
         "id": "T9a", "name": "T9a · Read the probe", "type": "n8n-nodes-base.code", "typeVersion": 2,
         "position": [-600, -500]},
    ]
    wf["nodes"] = T + wf["nodes"]
    c = wf["connections"]
    c["T0 · press Execute (manual test)"] = {"main": [[{"node": f"T1 · {len(S)} invented orders", "type": "main", "index": 0},
                                                      {"node": T[3]["name"], "type": "main", "index": 0}]]}
    c[f"T1 · {len(S)} invented orders"] = {"main": [[{"node": "T2 · Run each through the live chain", "type": "main", "index": 0}]]}
    c[T[3]["name"]] = {"main": [[{"node": "T9a · Read the probe", "type": "main", "index": 0}],
                                [{"node": "T9a · Read the probe", "type": "main", "index": 0}]]}
    wf["name"] = f"11 · Unsent Letter — LIVE CHAIN TEST DRIVE ({len(S)} orders; never delivers)"
    # ⛔ NO errorWorkflow: T2's sub-runs aren't "manual", so a failing test order would email the team.
    # Successful sub-runs keep their data here, so each path can be read in the execution list.
    wf["settings"] = {"executionOrder": "v1", "saveManualExecutions": True, "callerPolicy": "workflowsFromSameOwner",
                      "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"}
    # ⛔ Nothing in the test drive may reach AWeber, Supabase or the app's write endpoint.
    txt = json.dumps(wf, ensure_ascii=False)
    for n in wf["nodes"]:
        if n["type"] == "n8n-nodes-base.httpRequest" and n["name"] not in ("6 · PDFShift → PDF", T[3]["name"]):
            raise SystemExit(f"test drive: {n['name']} would make a real call")
        if n["type"] == "n8n-nodes-base.webhook": raise SystemExit("test drive: has a webhook")
    assert "oAuth2Api" not in txt and B.SUPABASE_CRED["id"] not in txt
    assert ERROR_FLOW not in txt and "errorWorkflow" not in txt, "test drive must never email the team"
    return wf

def write(wf, fname):
    if len(wf["name"]) > 128: raise SystemExit(f"name is {len(wf['name'])} chars; n8n refuses to save over 128")
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, fname)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"  {len(wf['nodes'])} nodes → build/{fname}")

if __name__ == "__main__" and LIVE:
    wf = build_live()
    write(wf, "11-fulfilment-ASSEMBLY.n8n.json")
    print("  ⚠ HELD (fail check-report, so these buyers HOLD at node 4 and the team is emailed): SU "
          + (", ".join(str(s) for s in build_live.held) or "none"))
    left = sorted(set(re.findall(r"TODO[-\w]*", json.dumps(wf))))
    print("  ⛔ inactive; TODOs left: " + (", ".join(left) or "none"))
    if LIVE_DRIVE:
        write(build_live_drive(wf), "11-fulfilment-ASSEMBLY-TESTDRIVE.n8n.json")
elif __name__ == "__main__":
    wf = build()
    if DRIVE: wf["name"] = wf["name"].replace("ASSEMBLY TEST", "ASSEMBLY TEST DRIVE")
    write(wf, ("11-assemble-TESTDRIVE-MANUAL-PICK.n8n.json" if PICK else "11-assemble-TESTDRIVE-MANUAL.n8n.json")
              if DRIVE else "11-assemble-TEST.n8n.json")
