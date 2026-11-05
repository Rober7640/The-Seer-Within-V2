#!/usr/bin/env python3
"""Generate 11's ASSEMBLY test flow: no model at order time. Picks the fixed report by Soul Urge,
fills her name, date and lines, builds the PDF. Never delivers.

    python3 scripts/build-11-assemble.py          # → build/11-assemble-TEST.n8n.json (test buyers, never delivers)
    python3 scripts/build-11-assemble.py --live   # → build/11-fulfilment-ASSEMBLY.n8n.json (the live flow, inactive)

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

LIVE = sys.argv[1:] == ["--live"]
if sys.argv[1:] and not LIVE:
    raise SystemExit(f"unknown flag(s): {' '.join(sys.argv[1:])} (the only flag is --live)")
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
const inp = $input.first().json;
const s = (inp.body && inp.body.data && inp.body.data.object) || {};
const intake = inp.intake || {};
// ⛔ Field names only in errors, never her details.
const birthName = String(intake.fullBirthName || '').replace(/\s+/g, ' ').trim();
const dob = String(intake.dateOfBirth || '').slice(0, 10);
if (!birthName) throw new Error('HOLD: no full_birth_name on the intake');
if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error('HOLD: no valid date_of_birth on the intake');
const firstName = (intake.firstName || '').trim();
if (!firstName) throw new Error('HOLD: no first name. The fixed reports open on her first name; the no-name version is not written.');
const email = (s.customer_details && s.customer_details.email) || s.customer_email || null;
if (!email) throw new Error('HOLD: no email on the session');
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
  order_id: s.id, email, first_name: firstName, birth_name: birthName, dob_iso: dob,
  dob_text: `${M[mm - 1]} ${dd}, ${yy}`, paid_at: new Date((s.created || 0) * 1000).toISOString(),
  bump: (s.metadata || {}).bump === '1',
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
if (!t) throw new Error(`HOLD: no fixed report for Soul Urge ${su} yet (written: ${Object.keys(T).join(', ')})`);
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
if (missing.size) throw new Error(`HOLD: no shared line yet for: ${[...missing].sort().join(' · ')}`);
// Last guards: nothing unfilled, the sentence the product turns on is in both places.
const all = Object.values(sections).join('\n');
const left = all.match(/\{\{[^}]*\}\}|\[\[|\]\]|⟪/g);
if (left) throw new Error(`HOLD: unfilled spot(s) left in the reading: ${[...new Set(left)].sort().join(' ')}`);
const unsaid = (sections['11'].match(/"([^"]+)"/) || [])[1];
if (!unsaid || !sections.letter.includes(unsaid)) throw new Error('HOLD: the unsaid sentence is not in both card 11 and the letter');
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


def build():
    tpls, bank = templates(), L.load_bank()
    html_js = (B.HTML_JS.replace("$('7a · Read the verdict').first().json", "$input.first().json")
               .replace("__S3__", B.S3).replace("__CROP__", "true" if SPEC["death_crop"] else "false")
               .replace("__C4__", json.dumps(B.CLOSING_THE_DOOR_HTML))
               .replace("__ACTS__", json.dumps(SPEC["acts"], ensure_ascii=False))
               .replace("written with machine help in Evelyn's voice", "written in Evelyn's voice"))
    assert "$input.first().json" in html_js
    fill_js = (FILL_JS.replace("__TEMPLATES__", json.dumps(tpls, ensure_ascii=False))
               .replace("__BANK__", json.dumps(bank, ensure_ascii=False))
               .replace("__CARD_NAMES__", json.dumps({k: v["name"] for k, v in SPEC["cards"].items()})))
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
    return {"name": f"11 · Unsent Letter — ASSEMBLY TEST (fixed reports: SU {sus}; no model; never delivers; {len(BUYERS)} test buyers)",
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
    fill_js = (FILL_JS.replace("__TEMPLATES__", json.dumps(tpls, ensure_ascii=False))
               .replace("__BANK__", json.dumps(bank, ensure_ascii=False))
               .replace("__CARD_NAMES__", json.dumps({k: v["name"] for k, v in SPEC["cards"].items()})))
    return tpls, html_js, fill_js

# The live flow (2026-11-05): the writing flow's front (Stripe → is it 11 → intake) and back
# (PDF → Supabase → 24h → signed URL → AWeber tag = the send → mark delivered), with the five model
# calls and the grader replaced by the no-model middle. Taken from build-11-n8n.build() so the
# proven nodes are reused as they are, never hand-copied. Still carries build-11-n8n's TODOs
# (app base URL, be-fulfilment token), so push-11-n8n.py refuses it until those are set.
FRONT = ["1 · Stripe webhook", "2 · Is this a paid 11 order?", "Not 11 — ignore",
         "2a · Load the intake", "2b · Join session + intake"]
BACK = {"11 · PDFShift → PDF": "6 · PDFShift → PDF",
        "12 · Upload to Supabase Storage": "7 · Upload to Supabase Storage",
        "13 · Hold to the 24h mark": "8 · Hold to the 24h mark",
        "13a · Get signed URL": "8a · Get signed URL",
        "14 · Find her on AWeber": "9 · Find her on AWeber",
        "14a · Tag + reading_url (the send)": "9a · Tag + reading_url (the send)",
        "15 · Mark delivered": "10 · Mark delivered"}
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

def build_live():
    ok, held = passing_reports()
    _wr = L.written_reports
    L.written_reports = lambda: ok
    try: tpls, html_js, fill_js = html_and_fill()
    finally: L.written_reports = _wr
    build_live.held = held
    B.NODES.clear(); B.LINKS.clear()
    old = {n["name"]: n for n in B.build()["nodes"]}
    rename = {"10 · Build the HTML": HTML_NODE, **BACK}
    def moved(n, dx):
        s = json.dumps(n, ensure_ascii=False)
        for a, b in rename.items(): s = s.replace(a, b)
        m = json.loads(s); m["id"] = m["name"].split(" ")[0]
        m["position"] = [m["position"][0] + dx, 300 if m["name"] != "Not 11 — ignore" else 460]
        return m
    front = [moved(old[n], 0) for n in FRONT]
    back = [moved(old[n], -1460) for n in BACK]
    B.NODES.clear(); B.LINKS.clear()
    B.code("3 · Her numbers", [60, 300], NUMBERS_JS,
           "Soul Urge picks the report. Expression, Life Path and the path pick the versions and lines.")
    B.code("4 · Pick the report + fill it", [260, 300], fill_js,
           "No model. The finished report for her Soul Urge, with her name, date and lines. HOLDs if anything isn't written.")
    B.code(HTML_NODE, [460, 300], html_js,
           "Card art by deal record. Bump buyers HOLD here until 11-C4 Closing the Door is written.")
    nodes = front + list(B.NODES) + back
    names = [n["name"] for n in nodes]
    LINKS = {}
    def link(a, b, out=0):
        LINKS.setdefault(a, {"main": []})
        while len(LINKS[a]["main"]) <= out: LINKS[a]["main"].append([])
        LINKS[a]["main"][out].append({"node": b, "type": "main", "index": 0})
    link(FRONT[1], FRONT[3]); link(FRONT[1], FRONT[2], 1)
    chain = [FRONT[0], FRONT[1]]
    for a, b in [(FRONT[0], FRONT[1])] + list(zip(
            [FRONT[3], FRONT[4], "3 · Her numbers", "4 · Pick the report + fill it", HTML_NODE] + list(BACK.values())[:-1],
            [FRONT[4], "3 · Her numbers", "4 · Pick the report + fill it", HTML_NODE] + list(BACK.values()))):
        link(a, b)
    # Every node referenced by name must exist, and every link must land on a node.
    refs = set(re.findall(r"\$\('([^']+)'\)", json.dumps(nodes, ensure_ascii=False)))
    bad = sorted((refs | {d["node"] for v in LINKS.values() for o in v["main"] for d in o}) - set(names))
    if bad: raise SystemExit(f"live build: references to missing nodes: {bad}")
    sus = ", ".join(tpls)
    return {"name": f"11 · The Unsent Letter — fulfilment (fixed reports SU {sus}; no model) [LIVE BUILD · inactive]",
            "nodes": nodes, "connections": LINKS, "active": False,
            "settings": {"executionOrder": "v1", "saveManualExecutions": True,
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
            "pinData": {}, "tags": []}

if __name__ == "__main__" and LIVE:
    wf = build_live()
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "11-fulfilment-ASSEMBLY.n8n.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"  {len(wf['nodes'])} nodes → build/{os.path.basename(out)}")
    print("  ⚠ HELD (fail check-report, so these buyers HOLD at node 4): SU " + (", ".join(str(s) for s in build_live.held) or "none"))
    print("  ⛔ inactive; TODOs left: " + ", ".join(sorted(set(re.findall(r"TODO[-\w]*", json.dumps(wf))))))
elif __name__ == "__main__":
    wf = build()
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "11-assemble-TEST.n8n.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"  {len(wf['nodes'])} nodes → build/{os.path.basename(out)}")
