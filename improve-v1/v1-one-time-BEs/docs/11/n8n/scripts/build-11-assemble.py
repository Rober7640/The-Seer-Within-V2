#!/usr/bin/env python3
"""Generate 11's ASSEMBLY test flow: no model at order time. Picks the fixed report by Soul Urge,
fills her name, date and swap-in lines, builds the PDF. Never delivers.

    python3 scripts/build-11-assemble.py              # → build/11-assemble-SU9-TEST.n8n.json
    python3 scripts/build-11-assemble.py --fixture giving   # Faketta: must HOLD (giving lines not written)

⛔ EDIT THIS FILE, THE REPORTS (product/11-P3-su<N>-report.md) AND 11-swapins.json, NEVER THE JSON.

How the report becomes a template (at build time, here, not in n8n):
- Sections split on [OPENING] [CARD n] [LETTER] [CLOSE]. The cards come from header line 3.
- Every [[TAG]]…[[/TAG]] span becomes a slot ⟦TAG:i⟧ (i = its place among that tag's spans, in
  reading order). The words in the report are the swap-in for the test buyer's numbers, so they
  are written into the bank under her keys (EX 8, LP 7, EXCUSE 2, REASON 1, FORK get_back).
- Her full birth name, her date and her first name become ⟦BIRTH_NAME⟧ ⟦DOB⟧ ⟦FIRST⟧.

At order time n8n fills the slots from the bank by HER numbers. A number with no lines written
yet HOLDs the order with the reason. Nothing is ever guessed or left blank.

Kept from build-11-n8n.py: the number sums (proven by check-11-numbers.mjs), the flat-answer keys,
the HTML page and PDFShift settings. Live-only nodes (webhook, intake, upload, AWeber) are left
out of this test flow on purpose.
"""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PRODUCT = os.path.join(HERE, "../../product")
OUT_DIR = os.path.join(HERE, "../build")
BANK_PATH = os.path.join(HERE, "11-swapins.json")

KNOWN = {"--fixture"}
unknown = [a for a in sys.argv[1:] if a.startswith("--") and a not in KNOWN]
if unknown:
    raise SystemExit(f"unknown flag(s): {' '.join(unknown)}")
FIXTURE = sys.argv[sys.argv.index("--fixture") + 1] if "--fixture" in sys.argv else "getback"

# Reuse the proven pieces of the writing flow without running its flag parser.
_argv, sys.argv = sys.argv, [sys.argv[0]]
_spec = importlib.util.spec_from_file_location("b11", os.path.join(HERE, "build-11-n8n.py"))
B = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(B)
sys.argv = _argv
SPEC = B.SPEC

# ─── the reports: one per Soul Urge. Only SU 9 exists so far. ──────────────────
# Who the report was written for. Their numbers are the bank keys its own words fill.
REPORTS = {
    "9": {"file": "11-P3-su9-report.md", "first": "Testina", "birth_name": "Testina Rose Testerly",
          "dob_text": "November 5, 1962", "keys": {"EX": "8", "LP": "7", "EXCUSE": "2",
                                                   "REASON": "1", "FORK": "get_back"}},
}
TAGS = ("EX", "LP", "EXCUSE", "REASON", "FORK")
CARD_KEY = {v["name"].lower().replace("the ", ""): k for k, v in SPEC["cards"].items()}

def template(su, r):
    raw = open(os.path.join(PRODUCT, r["file"]), encoding="utf-8").read()
    head, body = raw.split("\n", 3)[:3], raw.split("\n", 4)[4]
    names = [re.sub(r"^\d+\s+", "", c.strip()) for c in head[2].split(":", 1)[1].strip(" .").split("·")]
    cards = [CARD_KEY[n.lower().replace("the ", "")] for n in names]
    assert len(cards) == 12, f"SU {su}: header line 3 must list 12 cards"
    words, count = {t: [] for t in TAGS}, {t: 0 for t in TAGS}
    # Her name and date become slots everywhere, swap-in lines included (card 9's bold line
    # carries her first name inside a [[FORK]] span).
    unname = lambda s: (s.replace(r["birth_name"], "⟦BIRTH_NAME⟧").replace(r["dob_text"], "⟦DOB⟧")
                         .replace(r["first"], "⟦FIRST⟧"))
    def slot(m):
        t = m.group(1); i = count[t]; count[t] += 1
        words[t].append(unname(m.group(2))); return f"⟦{t}:{i}⟧"
    body = re.sub(r"\[\[([A-Z]+)\]\](.*?)\[\[/\1\]\]", slot, body, flags=re.S)
    assert "[[" not in body, f"SU {su}: an unclosed or nested swap-in tag"
    body = unname(body)
    parts = re.split(r"^\[(OPENING|CARD \d+|LETTER|CLOSE)\]\s*$", body, flags=re.M)
    sec = {parts[i].replace("CARD ", "").lower(): parts[i + 1].strip() for i in range(1, len(parts), 2)}
    want = ["opening", *map(str, range(1, 13)), "letter", "close"]
    assert sorted(sec) == sorted(want), f"SU {su}: sections {sorted(sec)}"
    return {"cards": cards, "sections": sec, "slots": count}, words

def build_bank():
    """The bank on disk is the source for every line NOT taken from a report. The report's own
    words are re-taken every build, so editing the report updates its buyer's lines."""
    bank = json.load(open(BANK_PATH, encoding="utf-8")) if os.path.exists(BANK_PATH) else {}
    templates = {}
    for su, r in REPORTS.items():
        templates[su], words = template(su, r)
        for t in TAGS:
            bank.setdefault(su, {}).setdefault(t, {})[r["keys"][t]] = words[t]
    with open(BANK_PATH, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, indent=2)
    return templates, bank

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
return [{ json: {
  order_id: s.id, email, first_name: firstName, birth_name: birthName, dob_iso: dob,
  dob_text: `${M[mm - 1]} ${dd}, ${yy}`, paid_at: new Date((s.created || 0) * 1000).toISOString(),
  bump: (s.metadata || {}).bump === '1',
  numbers: { su, ex, lp, number_fallback },
  // The bank keys. EX/LP keep 11/22/33 as their own rows; excuse and reason use the one-digit sums.
  keys: { EX: String(ex), LP: String(lp), EXCUSE: String(one(ex) % 3), REASON: String(one(lp) % 3), FORK: fork },
} }];
"""

FILL_JS = r"""
// Pick the report by Soul Urge and fill every slot. HOLD, never guess.
const j = $input.first().json;
const T = __TEMPLATES__;
const BANK = __BANK__;
const NAMES = __CARD_NAMES__;
const su = String(j.numbers.su);
const t = T[su];
if (!t) throw new Error(`HOLD: no fixed report for Soul Urge ${su} yet (written: ${Object.keys(T).join(', ')})`);
const missing = [];
const lines = {};
for (const [tag, n] of Object.entries(t.slots)) {
  const got = ((BANK[su] || {})[tag] || {})[j.keys[tag]];
  if (!got || got.length !== n) missing.push(`${tag} ${j.keys[tag]}${got ? ` (${got.length} of ${n} lines)` : ''}`);
  else lines[tag] = got;
}
if (missing.length) throw new Error(`HOLD: Soul Urge ${su} has no swap-in lines yet for: ${missing.join(' · ')}`);
const fill = (txt) => txt
  .replace(/⟦(EX|LP|EXCUSE|REASON|FORK):(\d+)⟧/g, (_, tag, i) => lines[tag][Number(i)])
  .replace(/⟦BIRTH_NAME⟧/g, j.birth_name).replace(/⟦DOB⟧/g, j.dob_text).replace(/⟦FIRST⟧/g, j.first_name);
const sections = Object.fromEntries(Object.entries(t.sections).map(([k, v]) => [k, fill(v)]));
// Last guards: nothing unfilled, the sentence the product turns on is in both places.
const all = Object.values(sections).join('\n');
const left = all.match(/⟦[^⟧]*⟧|\[\[|\]\]/g);
if (left) throw new Error(`HOLD: unfilled slot(s) left in the reading: ${[...new Set(left)].join(' ')}`);
const unsaid = (sections['11'].match(/"([^"]+)"/) || [])[1];
if (!unsaid || !sections.letter.includes(unsaid)) throw new Error('HOLD: the unsaid sentence is not in both card 11 and the letter');
const deal = t.cards.map((card, i) => ({ house: i + 1, card, card_name: NAMES[card] }));
return [{ json: { ...j, report: `SU ${su}`, sections, deal,
  words: all.split(/\s+/).filter(Boolean).length } }];
"""

def build():
    templates, bank = build_bank()
    html_js = (B.HTML_JS.replace("$('7a · Read the verdict').first().json", "$input.first().json")
               .replace("__S3__", B.S3).replace("__CROP__", "true" if SPEC["death_crop"] else "false")
               .replace("__C4__", json.dumps(B.CLOSING_THE_DOOR_HTML))
               .replace("__ACTS__", json.dumps(SPEC["acts"], ensure_ascii=False))
               .replace("written with machine help in Evelyn's voice", "written in Evelyn's voice"))
    assert "$input.first().json" in html_js
    fill_js = (FILL_JS.replace("__TEMPLATES__", json.dumps(templates, ensure_ascii=False))
               .replace("__BANK__", json.dumps(bank, ensure_ascii=False))
               .replace("__CARD_NAMES__", json.dumps({k: v["name"] for k, v in SPEC["cards"].items()})))
    f = B.FIXTURES[FIXTURE]
    fixture = {"body": {"type": "checkout.session.completed", "data": {"object": {
                   "id": f["order"], "payment_status": "paid", "created": 1793620800,
                   "customer_details": {"email": f"dryrun-11-{FIXTURE}@example.com"},
                   "metadata": {"app": "the-seer-within", "product": B.STRIPE_PRODUCT,
                                "offer": B.OFFER_KEY, "bump": "0"}}}},
               "intake": {"fullBirthName": f["name"], "dateOfBirth": f["dob"], "firstName": f["first"]}}
    B.NODES.clear()   # the helpers append to the writing flow's list and return the name
    trigger = [
        {"parameters": {}, "id": "T0", "name": "T0 · press Execute (manual test)",
         "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [-620, 300]}]
    for _ in [
        B.code("T1 · the fixture order", [-420, 300],
               "// ⛔ TEST ONLY. An invented buyer: what the Stripe webhook + intake would carry.\n"
               "return [{ json: " + json.dumps(fixture, ensure_ascii=False, indent=2) + " }];",
               "Invented buyer. Change name or date here to try another. A number with no lines written HOLDs."),
        B.code("1 · Her numbers", [-220, 300], NUMBERS_JS,
               "Soul Urge picks the report. Expression, Life Path and the fork pick the swap-in lines."),
        B.code("2 · Pick the report + fill it", [-20, 300], fill_js,
               "No model. The finished report for her Soul Urge, with her name, date and lines. HOLDs if any line isn't written."),
        B.code("3 · Build the HTML", [180, 300], html_js, "Same page as the writing flow."),
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
            "notes": "The PDF is the output of this node: open it and download. Nothing is uploaded or sent."}),
    ]: pass
    nodes = trigger + list(B.NODES)
    to = lambda n: {"main": [[{"node": n, "type": "main", "index": 0}]]}
    order = [n["name"] for n in nodes]
    links = {a: to(b) for a, b in zip(order, order[1:])}
    return {"name": f"11 · Unsent Letter — ASSEMBLY TEST (fixed SU 9 report, no model, never delivers, {FIXTURE} fixture)",
            "nodes": nodes, "connections": links, "active": False,
            "settings": {"executionOrder": "v1", "saveManualExecutions": True,
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
            "pinData": {}, "tags": []}

if __name__ == "__main__":
    wf = build()
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"11-assemble-SU9-TEST{'-GIVING' if FIXTURE == 'giving' else ''}.n8n.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"  {len(wf['nodes'])} nodes → build/{os.path.basename(out)}  ·  bank → scripts/11-swapins.json")
