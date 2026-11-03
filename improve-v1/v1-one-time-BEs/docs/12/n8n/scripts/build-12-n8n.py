#!/usr/bin/env python3
"""Generate 12's fulfilment workflow (Lucky Numbers) as importable n8n JSON.

    python3 scripts/build-12-n8n.py                                   # live build (delivery half has TODOs)
    python3 scripts/build-12-n8n.py --testdrive                       # no path to a buyer · Testina fixture
    python3 scripts/build-12-n8n.py --testdrive --fixture faketta     # the Faketta fixture
    python3 scripts/build-12-n8n.py --testdrive --manual-only         # manual trigger only, no clock

    flags: --openai (accepted, it's the only provider) · --model <id> · --grader <id>
           --effort <low|medium|high|xhigh|max> · --order <id> · --manual-only · --storage
    python3 scripts/build-12-n8n.py --all     # every variant in one go (what the checks expect)

⛔ EDIT THIS FILE AND 12-acts.json, NEVER THE JSON. build/*.n8n.json are build artefacts.
⛔ lucky-12.js is pasted into node 3 as it is. Edit the engine there, then rebuild.

Forked from docs/11/n8n/scripts/build-11-n8n.py (11 stays untouched). Kept from 11, because each
one cost a real execution to learn on 02: the node helpers, one parser per model reply, refusal
and truncation guards, the grader that fails open loudly with measured contract overrides,
regenerate-once with the same numbers, the loop reset, the bounded format retry, "each act sees
what came before", PDFShift at Letter, the test-drive trigger pair, and "never activates".

WHAT 12 DOES DIFFERENTLY FROM 11
  1. THE ENGINE DECIDES EVERY NUMBER AND DATE. Node 3 is lucky-12.js plus a few lines that read
     the order. Its output is the only source of her numbers. The writer is handed them per
     section with a list of the numerals it may write there, and node 6 fails any numeral, date
     or weekday that isn't on that list. The model never adds, reduces or picks a number.
  2. NO STORY PLAN. 12 is a reference she keeps, not a night at a table. Four act calls, each
     handed everything already written, then one grade.
  3. ACTS RETURN json_schema, one field per section, so a missing section is a FORMAT error and
     never a silent gap. The schema rides on the item, because it differs per act.
  4. THE PICTURES ARE CODE. The cover calendar (D12), every number panel, the six balls, the PIN
     tiles, the stop number, the date badges, the uses' fill-in lines and the bump's Full Year
     pages are drawn in node 10 from the engine's output. The model writes prose only.
  5. TWO ARMS. Stripe metadata `c` (1-5 = A, 11-15 = B) picks what the letter promised: A names
     a small miracle per number (L10); B never says miracle and repeats "no win promised".
  6. NO QUOTED EXAMPLES in a prompt (memory: they come back verbatim). The twelve months rotate
     opener, ending, action and length off the order id, so no two read alike.

MODEL
  Writer gpt-6.1-terra ($1/$5 per million, operator's switch 2026-11-03: built for natural writing),
  grader gpt-6.1-sol ($2/$10, kept so grades compare with runs 51552–51680). Sol proved on our
  account in those runs; Terra's first call proves it takes `max_completion_tokens` + strict
  `json_schema` exactly as sent here.
  Effort must be low/medium/high/xhigh/max. Never send temperature, top_p, logprobs, top_logprobs.
"""
import json, os, sys, subprocess

_HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = json.load(open(os.path.join(_HERE, "12-acts.json"), encoding="utf-8"))
ENGINE = open(os.path.join(_HERE, "lucky-12.js"), encoding="utf-8").read()
OUT_DIR = os.path.join(_HERE, "../build")

# ─── flags ─────────────────────────────────────────────────────────────────────
def flag(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

KNOWN = {"--openai", "--testdrive", "--fixture", "--model", "--grader", "--effort",
         "--order", "--manual-only", "--storage", "--all"}
_unknown = [a for a in sys.argv[1:] if a.startswith("--") and a not in KNOWN]
if _unknown:
    raise SystemExit(f"\n  ⛔ unknown flag(s): {' '.join(_unknown)}\n")
FIXTURE = flag("--fixture", "testina")
if FIXTURE not in ("testina", "faketta"):
    raise SystemExit(f"\n  ⛔ --fixture must be testina or faketta, not {FIXTURE!r}\n")
if "--fixture" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("\n  ⛔ --fixture only applies to --testdrive.\n")
if "--manual-only" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("\n  ⛔ --manual-only requires --testdrive.\n")

EFFORTS = ("low", "medium", "high", "xhigh", "max")
MODEL_WRITE = flag("--model", "gpt-6.1-terra")  # operator 2026-11-03: Terra is built for natural writing, half the price
MODEL_GRADE = flag("--grader", "gpt-6.1-sol")   # grader stays on Sol so grades compare across runs
EFFORT_WRITE = flag("--effort", "high")
EFFORT_GRADE = "low"     # 02: a yes/no checklist at high effort spends its budget and returns blank
if EFFORT_WRITE not in EFFORTS:
    raise SystemExit(f"\n  ⛔ --effort must be one of {', '.join(EFFORTS)}\n")
CEILING_WRITE = 24000    # reasoning comes out of this too
CEILING_GRADE = 16000

# ─── the contract with the rest of the codebase ────────────────────────────────
STRIPE_PRODUCT = SPEC["offer"]["stripe_product"]    # shared/backendOffers.ts
BUMP_PRODUCT   = SPEC["offer"]["bump_product"]      # LUCKY_NUMBERS_BUMP_PRODUCT_KEY
OFFER_KEY      = SPEC["offer"]["key"]
DELIVERED_TAG  = SPEC["offer"]["delivered_tag"]     # server/lib/backendCustomerList.ts
AWEBER_ACCOUNT = "442730"
AWEBER_LIST    = "6972552"                          # backendCustomerList.ts: 12 reuses 02's initial list
APP_BASE_URL   = "https://TODO-set-app-base-url"    # ⚠ TODO live build
SUPABASE_PROJ  = "https://pqolqzddzxubquukxnhk.supabase.co"
SUPABASE_BUCKET= "analysis_pdf"
OPENAI_URL     = "https://api.openai.com/v1/chat/completions"

# Credentials by ID. ⛔ n8n matches on the id; the name is a label. No key is ever in this file.
OPENAI_CRED    = {"id": "de6vaPn0hPs3icyh", "name": "OpenAi account"}
PDFSHIFT_CRED  = {"id": "8TelHH6oJEzYzw2r", "name": "pdfshift-header-auth"}
SUPABASE_CRED  = {"id": "Xu3vjsJHaiLZ1ILQ", "name": "wealth-scriba-customer-report-generator"}
AWEBER_CRED    = {"id": "InacwW76ep6ltnUU", "name": "Aweber for Heart Readr"}

# ─── the voice: ONLY rules that hold for every section ─────────────────────────
VOICE = """You are Evelyn Cross, writing one woman's paid reading, Lucky Numbers. You read numbers as well as cards, and this reading is numbers only: no tarot card appears in it. She read your letter and worked out her first number herself from her birth date. Everything else in here she's paying you to work out, and it's been worked out.

HOW TO USE THESE RULES
Everything in this block holds for the whole reading. A rule that belongs to one section is in that section's brief and goes nowhere else. If a brief gives a count, that count is for that section only.

THE NUMBERS
Every number, date and hour in this reading was worked out before you started, and you're handed them. Write them exactly as given. Never add, reduce, work out, round or change a number. Never invent a date, a weekday or an hour. Each section's brief lists the numerals you may write there: write no other numeral. Write her numbers, her dates and her hours as numerals. Write ordinary counts (three numbers, six to play, four digits, twelve days) as words. Never write one of her numbers as a word.

YOUR VOICE
Plain, direct and warm, a bit blunt. You're British. Say the thing flat: the numbers are the most exact thing you do, so you don't hedge them. The words perhaps, may, might, tends to, energy, journey, vibration and the universe are not in your vocabulary. Neither are I feel, I sense or it seems.
You talk. Use contractions about as often as a woman talking at her kitchen table. Use short, common words. Use sentences of different lengths and paragraphs of different lengths. Don't balance clauses against each other. Don't write sayings or neat turns. Don't hang a tail of extra description on the end of a sentence. Don't start a paragraph on a bare It, That or This when nothing has been named yet. Name things she could point at (a form, the bank, a phone call, a raffle book, her front door), never idea-words. Never make her stop and work out what your own wording means.

HER LIFE
You know nothing about her life except the facts you're handed. What you say about her life stays at things a hundred women could each point at and all be right. If only a woman with one exact job, family, town, amount of money or past could say yes, you've guessed, so cut it.

LUCK AND MONEY
No win is promised, anywhere. Never the words jackpot, guaranteed or winning numbers. No sums of money. Never tell her to buy more tickets, spend more, or play where she wouldn't have played anyway. She promised you she won't chase it, and you hold her to it.

WHAT NEVER APPEARS
Past clients, other women's stories, testimonials, or anyone invented. How long the work took. Tarot cards. The trade's jargon: life path, expression number, soul urge, karmic, master number. Headings, titles, bullet lists, bold or any markdown: the page prints its own headings, number panels, dates and lists, and your words go under them."""

# ─── node helpers ──────────────────────────────────────────────────────────────
NODES, LINKS = [], {}

def node(name, ntype, tv, pos, params, extra=None):
    n = {"parameters": params, "id": name.split(" ")[0], "name": name,
         "type": ntype, "typeVersion": tv, "position": pos}
    if extra: n.update(extra)
    NODES.append(n); return name

def link(src, dst, out=0):
    LINKS.setdefault(src, {"main": []})
    while len(LINKS[src]["main"]) <= out: LINKS[src]["main"].append([])
    LINKS[src]["main"][out].append({"node": dst, "type": "main", "index": 0})

def code(name, pos, js, note):
    return node(name, "n8n-nodes-base.code", 2, pos, {"jsCode": js}, {"notes": note})

def model_call(name, pos, body, note):
    """One model call. The predefined openAiApi credential builds Authorization itself, so
    there is no header to mistype and no key anywhere in the workflow."""
    for banned in ("temperature", "top_p", "logprobs", "top_logprobs"):
        if f'"{banned}"' in body:
            raise SystemExit(f"\n  ⛔ {name}: `{banned}` must not be sent to this model.\n")
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "method": "POST", "url": OPENAI_URL,
        "authentication": "predefinedCredentialType", "nodeCredentialType": "openAiApi",
        "sendBody": True, "specifyBody": "json", "jsonBody": body,
        "options": {"timeout": 600000, "response": {"response": {"neverError": False}}},
    }, {"credentials": {"openAiApi": OPENAI_CRED}, "notes": note,
        "retryOnFail": True, "maxTries": 2, "waitBetweenTries": 5000})

def act_body(model, effort, ceiling):
    # The schema differs per act, so it rides on the item. The system block goes first and is
    # byte-identical on every act call for one buyer, so OpenAI can cache the shared prefix.
    return ("={\n"
      f'  "model": "{model}",\n'
      f'  "max_completion_tokens": {ceiling},\n'
      f'  "reasoning_effort": "{effort}",\n'
      '  "response_format": {{ JSON.stringify($json.response_format) }},\n'
      '  "messages": [\n'
      '    { "role": "system", "content": {{ JSON.stringify($json.voice) }} },\n'
      '    { "role": "user",   "content": {{ JSON.stringify($json.prompt) }} }\n'
      '  ]\n'
      "}")

def ours(name, pos, path, body_expr, note):
    """⛔ LIVE BUILD ONLY. URL and token are placeholders until the app base URL and the
    be-fulfilment token are set. Never reachable from the test drive."""
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "method": "POST", "url": f"={APP_BASE_URL}{path}",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "authorization", "value": "TODO-be-fulfilment-token"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": body_expr,
        "options": {"timeout": 30000},
    }, {"notes": note})

# ─── the spec handed to the JS nodes ───────────────────────────────────────────
ORDER = [k for s in SPEC["segments"] for k in s["sections"]]
_WANT = (["opening", "n1", "n2", "n3", "six", "pin", "stop", "days_intro"]
         + [f"day{i:02d}" for i in range(1, 13)]
         + ["hours", "use_lottery", "use_pin", "use_days", "use_home", "use_phone", "use_wedding",
            "use_interview", "use_business", "use_travel", "close"])
if ORDER != _WANT:
    raise SystemExit("\n  ⛔ `segments` must cover the sections in reading order. See _WANT.\n")
for _k in ORDER:
    _base = "day" if _k.startswith("day") and _k != "days_intro" else _k
    if _base not in SPEC["sections"]:
        raise SystemExit(f"\n  ⛔ no section spec for {_k}\n")
for _k in [k for k in ORDER if k.startswith("use_")]:
    if _k not in SPEC["uses_jobs"]:
        raise SystemExit(f"\n  ⛔ no uses_jobs entry for {_k}\n")
for _t in ("n1", "n2", "n3"):
    for _d in range(1, 10):
        if not SPEC[_t]["brings"].get(str(_d)):
            raise SystemExit(f"\n  ⛔ {_t}.brings has no row {_d}\n")

_RUNTIME = {k: SPEC[k] for k in ("offer", "segments", "sections", "uses_jobs", "arms", "email_said",
                                 "n1", "n2", "n3", "day_number", "devices", "banned",
                                 "floor_words", "target_words", "ceiling_words")}
_RUNTIME["order"] = ORDER
# The Code nodes never need the delivery tag; only node 14a does. Keeping it out of the runtime spec
# means a test drive carries no trace of the send (check-12-testdrive looks for it).
_RUNTIME["offer"] = {k: v for k, v in SPEC["offer"].items() if k != "delivered_tag"}
SPEC_JSON = json.dumps(_RUNTIME, ensure_ascii=False)

# ─── reply parser, shared by every model node ──────────────────────────────────
REPLY_JS = r"""
// One parser for an OpenAI reply. 'length' and 'content_filter' are both HTTP 200, which is why
// they need catching here.
const _r = $input.first().json;
const _c = (_r.choices && _r.choices[0]) || {};
const say = String((_c.message && _c.message.content) || '');
const stop = ({ length: 'max_tokens', content_filter: 'refusal' }[_c.finish_reason] || _c.finish_reason);
const refused = stop === 'refusal' || !!(_c.message && _c.message.refusal);
"""

# ─── 3 · the engine ────────────────────────────────────────────────────────────
ENGINE_JS = ENGINE.rstrip() + "\n" + r"""
// ═══ 12 · node 3. Everything above this line is lucky-12.js, pasted as it is. ═══
// Below: read the order, call the engine once, and keep its output whole. Nothing after this
// node computes a number.
const inp = $input.first().json;
const s = (inp.body && inp.body.data && inp.body.data.object) || {};
const md = s.metadata || {};
const intake = inp.intake || {};
// ⛔ Field names only in errors, never her details.
const birthName = String(intake.fullBirthName || '').replace(/\s+/g, ' ').trim();
const dob = String(intake.dateOfBirth || '').slice(0, 10);
if (!birthName) throw new Error('HOLD: no full_birth_name on the intake');
if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) throw new Error('HOLD: no valid date_of_birth on the intake');
const email = (s.customer_details && s.customer_details.email) || s.customer_email || md.email || null;
if (!email) throw new Error('HOLD: no email on the session');
if (!s.created) throw new Error('HOLD: no created time on the session');
// The day she paid, in UTC. A late-evening US order lands on the next day, which only ever moves
// her first open day later, never earlier.
const paidAt = new Date(s.created * 1000).toISOString();
const orderDate = paidAt.slice(0, 10);
let lucky;
try { lucky = luckyNumbers12({ birthName, birthDate: dob, orderDate }); }
catch (e) { throw new Error('HOLD: ' + e.message); }   // LUCKY12 messages name a field, never her data
// 12-C1: with no ?fn= she is "dear" everywhere. Never the name on the certificate.
const firstName = (intake.firstName || '').trim() || null;
const c = String(md.c || '');
// Unknown or missing letter code → arm B, the arm that promises least.
const arm = __ARM_A__.includes(c) ? 'A' : 'B';
const bump = md.bump === '1' || md.bumpProduct === '__BUMP__';
return [{ json: { order_id: s.id, email, first_name: firstName, birth_name: birthName, dob_iso: dob,
  paid_at: paidAt, order_date: orderDate, c: c || null, arm, bump, lucky } }];
""".replace("__ARM_A__", json.dumps(SPEC["offer"]["arm_a_codes"])).replace("__BUMP__", BUMP_PRODUCT)

# ─── shared helpers: words for dates, labels for her numbers, allowed numerals ─
HELPERS_JS = r"""
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const dateWords = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${MONTHS[m - 1]} ${d}, ${y}`; };
const ordinal = (n) => { const t = n % 100; if (t >= 11 && t <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); };
const WHICH = { n1: 'first', n2: 'second', n3: 'third' };
const whichOf = (L, v) => ['n1', 'n2', 'n3'].filter((k) => L.numbers[k].value === v).map((k) => WHICH[k]);
const listWords = (xs) => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
const orWords = (xs) => xs.length <= 1 ? String(xs[0] || '') : xs.slice(0, -1).join(', ') + ' or ' + xs[xs.length - 1];
const aN = (n) => (/^8/.test(String(n)) || n === 11 || n === 18 ? 'an ' : 'a ') + n;
const AN = (n) => aN(n).replace(/^a/, 'A');
const nums = (s) => (String(s).match(/\d+/g) || []).map(Number);
const reduceDigits = (n) => { while (n > 9) n = String(n).split('').reduce((a, d) => a + Number(d), 0); return n; };
const DAY_KEYS = Array.from({ length: 12 }, (_, i) => 'day' + String(i + 1).padStart(2, '0'));
const SOURCE_WORDS = (L, t) => t.source === 'lucky' ? `adds down to ${t.root}, your ${listWords(t.of.map((k) => WHICH[k]))} number`
  : t.source === 'birthday' ? `adds down to ${t.root}, your birthday's number (the ${ordinal(L.numbers.birthdayRoot.raw)})`
  : t.source === 'sum' ? `adds down to ${t.root}, your three numbers added together`
  : `adds down to ${t.root}, a plain fill: your own families ran out inside ${L.tickets.game.min} to ${L.tickets.game.max}`;
const PIN_FROM = (L, d) => ({ n1: 'your first number', n2: 'your second number', n3: 'your third number',
  birthday: `your birthday's number, from the ${ordinal(L.numbers.birthdayRoot.raw)}`,
  ticket: 'from your six to play', filler: 'a plain digit' })[d.from] || d.from;
const STOP_HOW = (L) => { const s = L.stopNumber, v = s.value;
  if (s.rule === 'karmic-lesson') return `No letter of your birth name carries ${aN(v)}, and ${v} isn't one of your three.`;
  if (s.rule === 'first-challenge') { const [, m, d] = L.input.birthDate.split('-').map(Number);
    return `Your name carries every digit, so it comes from your birth date: your month comes to ${reduceDigits(m)}, your day to ${reduceDigits(d)}, and the gap between them is ${v}.`; }
  return `Neither your name nor your birth date gives one, so it's the smallest number that isn't one of your three or your birthday's.`; };
const businessSlots = (L) => { const b = L.luckyHours.slots.filter((x) => x.time >= '09:00' && x.time <= '17:00');
  return b.length ? b : L.luckyHours.slots.slice(0, 1); };
// For an interview or an offer: offices shut at weekends. Each month's open day if it's a weekday,
// otherwise the nearest weekday in that month whose day AND date both carry her numbers. Engine dates only.
const weekdayDays = (L) => L.openDays.map((o, i) => {
  if (!['Saturday', 'Sunday'].includes(o.weekday)) return { date: o.date, weekday: o.weekday, open: true };
  const t = Date.parse(o.date);
  const c = L.fullYear.months[i].days.filter((x) => x.match && !['Saturday', 'Sunday'].includes(x.weekday))
    .sort((a, b) => Math.abs(Date.parse(a.date) - t) - Math.abs(Date.parse(b.date) - t) || a.date.localeCompare(b.date))[0];
  return c ? { date: c.date, weekday: c.weekday, open: false } : null; }).filter(Boolean);
// Since 2026-11-02 the engine prefers weekdays, so a weekend open day is rare (about 1 in 1,000).
// Only those months get a stand-in printed; a page with none says nothing about weekends.
const standIns = (L) => weekdayDays(L).filter((x) => !x.open);
const pdLine = (L, o) => { const w = whichOf(L, o.pd);
  if (w.length) return `The day carries ${aN(o.pd)}, your ${listWords(w)} number.`;
  const u = whichOf(L, o.ud);
  return `The day carries ${aN(o.pd)}, and the date itself adds to ${o.ud}, your ${listWords(u)} number.`; };
const her = (t) => String(t).replace(/\byour\b/g, 'her').replace(/\bYour\b/g, 'Her');

// Numerals the writer may use in each section. Node 3a prints them in the brief; node 6 checks
// against the same lists. Everything here comes from the engine output.
const allowFor = (j, key) => {
  const L = j.lucky, N = L.numbers, out = new Set(N.three);
  const add = (...xs) => xs.flat(3).forEach((x) => { const n = Number(x); if (Number.isFinite(n)) out.add(n); });
  const years = Object.keys(L.calendar.personalYears).map(Number);
  const [by, bm, bd] = L.input.birthDate.split('-').map(Number);
  const pinD = L.pin.digits.map((d) => d.d);
  const slotH = L.luckyHours.slots.map((x) => nums(x.label)[0]);
  const openD = L.openDays.map((o) => o.day);
  const fam = (v) => L.tickets.families[v] || [];
  if (key === 'opening') add(years, by, bd);
  else if (key === 'n1') add(nums(N.n1.working), by, bm, bd, fam(N.n1.value));
  else if (key === 'n2') add(nums(N.n2.working), L.name.words.map((w) => w.all), fam(N.n2.value));
  else if (key === 'n3') add(nums(N.n3.working), L.name.words.map((w) => w.vowels), fam(N.n3.value));
  else if (key === 'six') add(L.tickets.list, L.tickets.numbers.map((t) => t.root), L.tickets.game.min, L.tickets.game.max,
    N.birthdayRoot.value, N.birthdayRoot.raw, N.sumRoot, Object.values(L.tickets.families));
  else if (key === 'pin') add(Number(L.pin.value), pinD, N.birthdayRoot.value, N.birthdayRoot.raw, L.stopNumber.value, by, bm, bd);
  else if (key === 'stop') add(L.stopNumber.value, L.stopNumber.missingDigits, Number(L.pin.value), pinD,
    L.stopNumber.rule === 'first-challenge' ? [reduceDigits(bm), reduceDigits(bd)] : []);
  else if (key === 'days_intro') add(years, Object.values(L.calendar.personalYears));
  else if (DAY_KEYS.includes(key)) { const o = L.openDays[DAY_KEYS.indexOf(key)];
    add(o.day, Number(o.date.slice(0, 4)), o.pd, o.ud, slotH, L.stopNumber.value, L.tickets.list); }
  else if (key === 'hours') add(slotH, L.luckyHours.hours.map((h) => [h.hour, h.root]), 10, 11, 12, 1, 2, 3, openD, years);
  else if (key === 'use_lottery') add(L.tickets.list, openD, years);
  else if (key === 'use_pin') add(Number(L.pin.value), pinD);
  else if (key === 'use_days') add(openD, years);
  else if (key === 'use_home') add(L.uses.house.examples.map((x) => x.n), L.stopNumber.value, openD, years);
  else if (key === 'use_phone') add(L.uses.phone.aimFor, L.uses.phone.alsoGood, L.uses.phone.avoid);
  else if (key === 'use_wedding' || key === 'use_business' || key === 'use_travel') add(openD, years);
  else if (key === 'use_interview') add(openD, years, businessSlots(L).map((x) => nums(x.label)[0]));
  else if (key === 'close') add(years, L.tickets.list, L.stopNumber.value);
  return [...out].filter((n) => Number.isInteger(n) && n >= 0).sort((a, b) => a - b);
};
"""

# ─── 3a · rotations, allow-lists and the voice ─────────────────────────────────
ROT_JS = HELPERS_JS + r"""
const j = { ...$input.first().json };
const S = __SPEC__;
const L = j.lucky, D = S.devices;
const seedOf = (str) => { let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h; };
const shuffleWith = (values, seed) => { const out = values.slice(); let st = seed;
  const rnd = () => { st = (Math.imul(st, 1103515245) + 12345) >>> 0; return (st >>> 8) / 16777216; };
  for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1));
    [out[i], out[k]] = [out[k], out[i]]; }
  return out; };
// ⛔ Rotations come off the order id, so two buyers with the same numbers still read differently.
const oid = String(j.order_id || 'no-order');
const dev = (values, tag) => shuffleWith(values, seedOf(oid + '|12|' + tag));

// ── the three numbers: a different order of beats each ───────────────────────
const orders = dev(D.number_orders.map((o) => o.join('>')), 'orders').slice(0, 3).map((o) => o.split('>'));
// ── the twelve months ────────────────────────────────────────────────────────
const openerKeys = Object.keys(D.day_openers), endKeys = Object.keys(D.day_ends);
const capOf = (n, k) => Math.ceil(n / k) + 1;
// `hard` caps a few keys lower than the even share (12-acts.json devices.day_*_caps): "the day
// before" four times, or four "leave X alone" openings, read as a pattern. A hard cap is never broken.
const pickRun = (keys, tag, cap, hard = {}) => { const out = [], used = {};
  const room = (x) => (used[x] || 0) < (typeof hard[x] === 'number' ? hard[x] : cap);
  const underHard = (x) => typeof hard[x] !== 'number' || (used[x] || 0) < hard[x];
  for (let i = 0; i < 12; i++) {
    const order = dev(keys, tag + i);
    const k = order.find((x) => x !== out[i - 1] && room(x))
      || order.find((x) => x !== out[i - 1] && underHard(x))
      || order.find((x) => underHard(x));
    out.push(k); used[k] = (used[k] || 0) + 1; }
  return out; };
const openers = pickRun(openerKeys, 'open', capOf(12, openerKeys.length), D.day_opener_caps || {});
const endings = pickRun(endKeys, 'end', capOf(12, endKeys.length), D.day_end_caps || {});
// No action twice in one reading while the list lasts; never the same one in two months running.
const usedActions = [];
const actions = L.openDays.map((o, i) => { const list = dev(S.day_number[String(o.pd)].actions, 'act' + i);
  const a = list.find((x) => !usedActions.includes(x)) || list.find((x) => !usedActions.slice(-3).includes(x)) || list[0];
  usedActions.push(a); return a; });
const ticketMonths = dev(DAY_KEYS, 'ticket').slice(0, D.ticket_months).sort();
const slots = L.luckyHours.slots;
// The months that end on an hour take her hours in turn, so the same hour doesn't come round each time.
const hourCycle = dev(slots.map((x) => x.label), 'hours');
let hc = 0;
const hourFor = Object.fromEntries(DAY_KEYS.map((k, i) => [k, endings[i] === 'hour' && hourCycle.length ? hourCycle[hc++ % hourCycle.length] : null]));
// Balanced jitter, re-rolled until no three neighbouring months land within 15 words.
let jit = [];
for (let t = 0; t < 40; t++) {
  const offs = dev(D.day_jitter, 'jitter' + t);
  const w = offs.map((o) => D.day_words_base + o);
  const flat3 = w.some((_, i) => i > 1 && Math.max(w[i], w[i - 1], w[i - 2]) - Math.min(w[i], w[i - 1], w[i - 2]) <= 15);
  jit = offs; if (!flat3) break;
}
const words = {};
for (const k of S.order) words[k] = DAY_KEYS.includes(k) ? D.day_words_base + jit[DAY_KEYS.indexOf(k)] : S.sections[k].words;
// ── her name and "dear" ──────────────────────────────────────────────────────
const nameMonths = dev(DAY_KEYS, 'names').slice(0, D.name_months);
const fixedNames = ['opening', 'close', ...nameMonths];
const nameMore = dev(['n1', 'n2', 'n3', 'six', 'pin', 'stop', 'hours'], 'name+').slice(0, Math.max(0, D.name_uses_total - fixedNames.length));
const names = [...fixedNames, ...nameMore];
const dearAt = dev(S.order.filter((k) => !names.includes(k) && !k.startsWith('use_')), 'dear').slice(0, D.dear_uses - 1);

const allow = Object.fromEntries(S.order.map((k) => [k, allowFor(j, k)]));
const voice = [__VOICE__, '', S.email_said.common, S.email_said[j.arm]].join('\n');
return [{ json: { ...j, voice, allow, attempt: 1,
  devices: { orders: { n1: orders[0], n2: orders[1], n3: orders[2] }, openers, endings, actions,
    ticket_months: ticketMonths, hour_for: hourFor, words, names, dear_at: dearAt } } }];
""".replace("__SPEC__", SPEC_JSON).replace("__VOICE__", json.dumps(VOICE, ensure_ascii=False))

FAN_JS = r"""
// One item per act. Node 8c sends a regeneration back through here, past the engine, so the
// retry writes the SAME numbers and dates.
const j = $input.first().json;
const SEGMENTS = __SEGMENTS__;
const { reading, sections, metrics, grade_user, verdict, ...rest } = j;
return SEGMENTS.map((segment, i) => ({ json: { ...rest, segment, index: i + 1, total: SEGMENTS.length } }));
""".replace("__SEGMENTS__", json.dumps(SPEC["segments"], ensure_ascii=False))

# ─── shared fact block for every act ───────────────────────────────────────────
FACTS_JS = r"""
const factsOf = (j) => {
  const L = j.lucky, N = L.numbers, S0 = __SPEC__;
  const rep = N.repeats.length
    ? N.repeats.map((r) => `Her ${r.number} comes ${r.count === 2 ? 'twice' : 'three times'}: it's her ${listWords(r.which.map((k) => WHICH[k]))} number. Say so plainly where it comes up a second time.`).join(' ')
    : 'None of her three numbers repeats.';
  const tix = L.tickets.numbers.map((t) => `  ${t.n}: ${her(SOURCE_WORDS(L, t))}`).join('\n');
  const short = L.tickets.shortfall
    ? `Only ${L.tickets.luckyCount} of the six add down to one of her three numbers. The rest are topped up, and each one's source is listed. Never say every one of her six is one of her three.`
    : `All six add down to one of her three numbers.`;
  const pin = L.pin.digits.map((d) => `${d.d} (${her(PIN_FROM(L, d))})`).join(', ');
  const pinWhy = L.pin.stage === 'in-order' ? '' : ` The plain order was refused, for a bank's reasons: ${L.pin.why}`;
  const py = Object.entries(L.calendar.personalYears).map(([y, v]) => `${y} is ${aN(v)} year for her (a year for ${S0.day_number[String(v)].for})`).join('; ');
  const days = L.openDays.map((o, i) => `  ${MONTHS[Number(o.date.slice(5, 7)) - 1]}: ${o.weekday}, ${dateWords(o.date)}. ${her(pdLine(L, o))} ${AN(o.pd)} day is for ${S0.day_number[String(o.pd)].for}.`).join('\n');
  return [
    `WHO THIS IS FOR`,
    j.first_name ? `Her first name: ${j.first_name}.` : `You don't have her first name. Call her dear, and ignore any rule below that says to use her name.`,
    `Her full birth name: ${j.birth_name}. Her date of birth: ${dateWords(L.input.birthDate)}.`,
    `Her reading covers ${L.windowLabel}: twelve months, ${dateWords(L.calendar.window.start)} to ${dateWords(L.calendar.window.end)}.`,
    ``,
    `HER NUMBERS. All worked out already. You write them, you don't work them out.`,
    `First number: ${N.n1.value}, from her birth date (${N.n1.working}).`,
    `Second number: ${N.n2.value}, from every letter of her full birth name (${N.n2.working}).`,
    `Third number: ${N.n3.value}, from the vowels of her full birth name (${N.n3.working}).`,
    rep,
    `Her birthday's number: ${N.birthdayRoot.value} (the ${ordinal(N.birthdayRoot.raw)}).`,
    `Her six to play, smallest first:`, tix, short,
    `How the six were chosen: spread across the whole ticket, one from each part of ${L.tickets.game.min} to ${L.tickets.game.max}, with her numbers taking turns, so they don't bunch at the low end. They are NOT the smallest or first numbers of each family, so never say they are.`,
    `They fit any game whose numbers run from ${L.tickets.game.min} up to ${Math.max(...L.tickets.list)} or higher.`,
    `Her PIN: ${L.pin.value}. Its digits: ${pin}.${pinWhy}`,
    `The number to stop using: ${L.stopNumber.value}. How it was found: ${her(STOP_HOW(L))}`,
    `Her lucky hours: ${L.luckyHours.slots.map((x) => x.label).join(', ')}. The clock hours that carry her numbers: ${L.luckyHours.hours.map((h) => `${h.hour} o'clock (${h.hour > 9 ? `${h.hour} counts as ${h.root}` : h.root})`).join(', ')}.`,
    `Her personal year: ${py}.`,
    ``,
    `HER TWELVE OPEN DAYS, one in each month`,
    days,
  ].join('\n');
};
""".replace("__SPEC__", SPEC_JSON)

# ─── 4a · the act prompt ───────────────────────────────────────────────────────
ACT_JS = HELPERS_JS + FACTS_JS + r"""
const j = $input.first().json;
const S = __SPEC__;
const L = j.lucky, N = L.numbers, dev = j.devices, arm = S.arms[j.arm];

// ── everything already written, this attempt only ────────────────────────────
// ⛔ A regeneration must not show the writer the failed draft, so runs are filtered by attempt.
// Node 4z is the one node both the normal and the retry path pass through, so its run index is
// the count of finished acts. A gap here would silently break "sees what came before".
const earlier = [];
for (let r = 0; r < $runIndex; r++) {
  try { for (const it of $('4z · Rejoin').all(0, r)) if (it.json.attempt === j.attempt) earlier.push(it.json); }
  catch (e) { /* run r not reached */ }
}
earlier.sort((x, y) => x.index - y.index);
if (earlier.length !== j.index - 1) {
  throw new Error(`act ${j.segment.id}: expected ${j.index - 1} earlier acts, found ${earlier.length}`);
}
const TITLE = { opening: 'THE OPENING', n1: 'YOUR FIRST NUMBER', n2: 'YOUR SECOND NUMBER', n3: 'YOUR THIRD NUMBER',
  six: 'YOUR SIX TO PLAY', pin: 'YOUR PIN', stop: 'THE NUMBER TO STOP USING', days_intro: 'YOUR TWELVE OPEN DAYS',
  hours: 'YOUR LUCKY HOURS', close: 'THE CLOSE' };
const titleOf = (k) => TITLE[k] || (DAY_KEYS.includes(k) ? `OPEN DAY: ${dateWords(L.openDays[DAY_KEYS.indexOf(k)].date).toUpperCase()}`
  : `USE: ${S.sections[k].label.toUpperCase()}`);
const soFar = earlier.flatMap((e) => e.parts).map((p) => `${titleOf(p.key)}\n${p.text}`).join('\n\n');

const nameLine = (k) => !j.first_name ? `Her name: you don't have it.`
  : dev.names.includes(k) ? (k === 'opening' ? `Her name: on its own line at the very start.` : `Her name: once in this section, inside a sentence, never as the first word.`)
  : `Her name: not in this section.`;
const dearLine = (k) => (!j.first_name || dev.dear_at.includes(k)) ? `The word dear: once at most in this section.` : `The word dear: not in this section.`;
const allowLine = (k) => `Numerals you may write in this section, and no others: ${j.allow[k].join(', ')}.`;
const BEAT = { looks: 'what her luck looks like when it comes', when: 'when it comes (a moment, never a date)', brings: arm.what_it_brings };

const brief = (k) => {
  const lines = [`[${k}]  ${titleOf(k)}`];
  lines.push(`Target: about ${dev.words[k]} words.`);
  if (['n1', 'n2', 'n3'].includes(k)) {
    const v = N[k].value, d = String(v), T = S[k];
    lines.push(`Job: ${S.sections[k].job}`);
    lines.push(`This number: ${v}. It's ${T.role}.`);
    if (k === 'n1') lines.push(`Your letter's line for ${aN(v)}, which she has read and which this must agree with (don't quote it whole; you go further): "${T.letter_line[d]}"`,
      `Callback: you may remind her once that she worked this one out herself.`);
    else lines.push(`What ${aN(v)} looks like here: ${T.looks_like[d]}.`, `When: ${T.when[d]}.`, ...(T.wants ? [`What she wants underneath: ${T.wants[d]}.`] : []));
    lines.push(`What it brings: ${T.brings[d]}.`, arm.brings_rule);
    const r = N.repeats.find((x) => x.which.includes(k) && x.which[0] !== k);
    if (r) lines.push(`This ${v} is the same digit as her ${WHICH[r.which[0]]} number. Say early on that her ${v} comes ${r.count === 2 ? 'twice' : 'three times'}, and that here it means something different, because it comes from a different place.`);
    lines.push(`Order of the beats in this section: ${dev.orders[k].map((b) => BEAT[b]).join(', then ')}.`);
    lines.push(`The page prints the number, how it was worked out and its family above your words, so don't walk through the sum.`);
  } else if (DAY_KEYS.includes(k)) {
    const i = DAY_KEYS.indexOf(k), o = L.openDays[i], meaning = S.day_number[String(o.pd)];
    lines.push(`Job: ${S.sections.day.job}`);
    lines.push(`This day: ${o.weekday}, ${dateWords(o.date)}. ${her(pdLine(L, o))} ${AN(o.pd)} day is for ${meaning.for}.`);
    lines.push(`What she does on it: ${dev.actions[i]}. Make it fit the time of year where it can.`);
    lines.push(dev.ticket_months.includes(k) ? `Tickets: in this month only, tell her it's the day to buy her ticket too. ${dev.ticket_months.length} months say this (${dev.ticket_months.join(', ')}); word it differently in each, never the same sentence twice.` : `Tickets: don't mention them in this month.`);
    lines.push(`How it opens: ${S.devices.day_openers[dev.openers[i]]}.`);
    lines.push(`How it ends: ${S.devices.day_ends[dev.endings[i]]}${dev.endings[i] === 'hour' && dev.hour_for[k] ? ` (use ${dev.hour_for[k]})` : ''}.`);
    lines.push(`That line is a fact, not wording: other months carry the same number, so say what it's for in fresh words here, never the words another month used.`);
    lines.push(`Name no other weekday and no other date in this section.`);
  } else if (k.startsWith('use_')) {
    lines.push(`Job: ${S.uses_jobs[k]}`);
    if (k === 'use_lottery') lines.push(arm.lottery_line);
    if (k === 'use_interview') lines.push(`The hour to ask for: ${businessSlots(L).map((x) => x.label).join(' or ')}.`,
      standIns(L).length ? `${standIns(L).length === 1 ? 'One of her open days falls' : 'A few of her open days fall'} at a weekend, when offices are shut. The page prints a weekday that carries her numbers for that month, for an interview or an offer. Say so in a sentence; don't name the dates.` : '');
    if (k === 'use_home') lines.push(`House numbers that add down to hers, already worked out: ${L.uses.house.examples.map((x) => `${x.n} (adds to ${x.root})`).join(', ')}. One that adds to ${L.stopNumber.value} is the one to steer clear of.`);
    if (k === 'use_phone') lines.push(`Aim for a number that adds down to ${L.uses.phone.aimFor}. Also good: ${orWords(L.uses.phone.alsoGood)}. Keep it off ${L.uses.phone.avoid}.`);
    lines.push(`The page prints her numbers and dates for this use in a line above your words, so name no date. One short paragraph.`);
  } else {
    lines.push(`Job: ${S.sections[k].job}`);
    if (k === 'close') lines.push(arm.close_rule);
    if (k === 'six') lines.push(L.tickets.shortfall ? `Some of her six are topped up (see her facts). Say where each of those comes from. Never say all six are hers.` : `All six are hers: you may say every one of them adds down to one of her three.`);
    if (k === 'pin' && L.pin.stage !== 'in-order') lines.push(`The digits aren't in the plain order. Say in one line that the plain order is one a bank would turn down.`);
    if (k === 'stop') lines.push(`If she finds it in her PIN: she changes her PIN to ${L.pin.value}.`);
  }
  lines.push(nameLine(k), dearLine(k), allowLine(k));
  return lines.filter(Boolean).join('\n');
};

const secs = j.segment.sections;
const total = secs.reduce((n, k) => n + j.devices.words[k], 0);
const response_format = { type: 'json_schema', json_schema: { name: 'act_' + j.segment.id.toLowerCase(), strict: true,
  schema: { type: 'object', additionalProperties: false,
    properties: Object.fromEntries(secs.map((k) => [k, { type: 'string' }])), required: secs } } };
const prompt = [
  factsOf(j),
  ``,
  soFar ? `WHAT YOU'VE ALREADY WRITTEN TO HER. She's read all of this. Carry straight on. Don't repeat what it says, and don't reuse how its sections open or end.\n\n${soFar}` : `Nothing is written yet. This is the start of the reading.`,
  ``,
  `NOW WRITE ${j.segment.label.toUpperCase()}. About ${total} words in all. Stay within ten percent: she's paying for the length and each section needs its room.`,
  ``,
  secs.map(brief).join('\n\n'),
  ``,
  `FORMAT`,
  `Return JSON with exactly these fields: ${secs.join(', ')}. Each field holds that section's text: plain paragraphs with a blank line between them. No headings, no lists, no bold, no markdown. The page prints the headings, the panels and the dates.`,
].join('\n');
return [{ json: { ...j, response_format, prompt } }];
""".replace("__SPEC__", SPEC_JSON)

KEEP_ACT_JS = REPLY_JS + r"""
const brief = $('4 · Each act').first().json;
const seg = brief.segment;
// A FORMAT error is the only kind node 4r retries, once, with the same prompt.
if (refused) throw new Error(`act ${seg.id}: model declined (${_c.message && _c.message.refusal || 'no reason'})`);
if (stop === 'max_tokens') throw new Error(`FORMAT act ${seg.id}: hit the token ceiling`);
if (!say.trim()) throw new Error(`FORMAT act ${seg.id}: no text (stop=${stop})`);
let out;
try { out = JSON.parse(say); } catch (e) { throw new Error(`FORMAT act ${seg.id}: reply was not JSON`); }
const missing = seg.sections.filter((k) => typeof out[k] !== 'string' || !out[k].trim());
if (missing.length) throw new Error(`FORMAT act ${seg.id}: empty or missing ${missing.join(', ')}`);
// Headings, bullets and rules never reach the page; the page prints its own.
const clean = (t) => t.split('\n').filter((l) => !/^\s*(#{1,6}\s|---+\s*$|\*\*\*+\s*$)/.test(l))
  .map((l) => l.replace(/^\s*[-•]\s+/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const parts = seg.sections.map((k) => ({ key: k, text: clean(out[k]) }));
return [{ json: { ...brief, parts, prose: true } }];
"""

RETRY_JS = r"""
const error = $input.first().json.error;
const message = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
if (!/FORMAT/.test(message || '')) throw new Error(message || 'Act validation failed');
return [{ json: { ...$('4a · Compose the act prompt').first().json } }];
"""

# ─── 6 · assemble + measure ────────────────────────────────────────────────────
# FACTS_JS too: the grader gets the writer's own fact block, so it can't fail a fact the writer was
# handed (run 51552+1 failed "a birthday number and a personal year that weren't handed over").
ASSEMBLE_JS = HELPERS_JS + FACTS_JS + r"""
const rows = $input.first().json.data;
const S = __SPEC__;
const attempt = Math.max(...rows.map((r) => r.attempt));
const j = rows.find((r) => r.attempt === attempt);
const L = j.lucky, N = L.numbers;
const parts = rows.filter((r) => r.attempt === attempt).sort((a, b) => a.index - b.index).flatMap((r) => r.parts);
const got = parts.map((p) => p.key).join(',');
if (got !== S.order.join(',')) throw new Error(`assembly: sections ${got}`);
const reading = parts.map((p) => `[${p.key}]\n${p.text}`).join('\n\n');

// ─── measured here, handed to the grader. It judges meaning; code does the arithmetic. ───
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const plain = (t) => t.replace(/\*+/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
const sentencesOf = (t) => plain(t).split(/(?<=[.!?])["']?\s+/).map((s) => s.trim()).filter(Boolean);
const P = Object.fromEntries(parts.map((p) => [p.key, plain(p.text)]));
const all = parts.map((p) => ({ key: p.key, text: plain(p.text) }));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hits = (re, pool = all) => pool.flatMap((p) => sentencesOf(p.text).filter((s) => re.test(s)).map((s) => ({ section: p.key, sentence: s.slice(0, 200) })));
const count = (re, t) => (t.match(re) || []).length;
const wordRe = (list) => new RegExp('\\b(?:' + list.map(esc).join('|') + ')\\b', 'i');
const firstWords = (t, n) => plain(t).split(/\s+/).slice(0, n).join(' ').toLowerCase();

const section_words = Object.fromEntries(parts.map((p) => [p.key, wc(p.text)]));
const words = parts.reduce((n, p) => n + wc(p.text), 0);
const days = all.filter((p) => DAY_KEYS.includes(p.key));
const dw = days.map((p) => section_words[p.key]);
const flat_triples = dw.flatMap((w, i) => i > 1 && Math.max(w, dw[i-1], dw[i-2]) - Math.min(w, dw[i-1], dw[i-2]) <= 15 ? [`${i - 1}-${i + 1}`] : []);

// ⛔ THE NUMBERS. Every numeral must be on that section's list; every date must be one of hers;
//    a month names no weekday but its own. This is the check that keeps a wrong number out.
const numerals = all.flatMap((p) => { const ok = new Set(j.allow[p.key]);
  return (p.text.match(/\d[\d,]*/g) || []).map((x) => Number(x.replace(/,/g, '')))
    .filter((n) => !ok.has(n)).map((n) => ({ section: p.key, sentence: `numeral ${n} is not on this section's list` })); });
const MRE = new RegExp('\\b(' + MONTHS.join('|') + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b', 'g');
const openSet = new Set(L.openDays.map((o) => `${MONTHS[Number(o.date.slice(5, 7)) - 1]} ${o.day}`));
// Her birth date may be written where it's allowed (the opening's check, the PIN warning). It is never a day to use.
const bd = L.input.birthDate, birthDay = `${MONTHS[Number(bd.slice(5, 7)) - 1]} ${Number(bd.slice(8, 10))}`;
const BIRTH_OK = new Set(['opening', 'pin']);
const dates = all.flatMap((p) => [...p.text.matchAll(MRE)].map((m) => `${m[1]} ${Number(m[2])}`)
  .filter((d) => !openSet.has(d) && !(d === birthDay && BIRTH_OK.has(p.key))).map((d) => ({ section: p.key, sentence: `${d} is not one of her open days` })));
const weekdays = days.flatMap((p) => { const o = L.openDays[DAY_KEYS.indexOf(p.key)];
  return (p.text.match(new RegExp('\\b(' + WEEKDAYS.join('|') + ')s?\\b', 'g')) || [])
    .filter((w) => w.replace(/s$/, '') !== o.weekday).map((w) => ({ section: p.key, sentence: `${w} named on a ${o.weekday}` })); });
const dayDates = days.flatMap((p) => { const o = L.openDays[DAY_KEYS.indexOf(p.key)];
  return [...p.text.matchAll(MRE)].map((m) => `${m[1]} ${Number(m[2])}`)
    .filter((d) => d !== `${MONTHS[Number(o.date.slice(5, 7)) - 1]} ${o.day}`).map((d) => ({ section: p.key, sentence: `${d} named in another month's section` })); });
const BIG = ['thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred'];
// Only HER numbers (and the stop number) written as words: "your three" or "your six" are counts.
const WORD = ['zero','one','two','three','four','five','six','seven','eight','nine'];
const herWords = [...new Set([N.n1.value, N.n2.value, N.n3.value, L.stopNumber.value].filter((n) => n <= 9).map((n) => WORD[n]))];
const NOT_AFTER = "(?!\\s+(?:of|lucky|numbers?|days?|digits?|months?|things?|times?|ways?|hours?|tickets?|famil\\w+|more|open|page|places?|years?|weeks?|letters?|words?|minutes?|to|for|in|on|and|you|she|that|is|are|o'clock))";
const number_words = [...hits(wordRe(BIG)),
  ...hits(new RegExp('\\b(?:your|number|a|an)\\s+(?:' + herWords.join('|') + ')\\b' + NOT_AFTER, 'i'))];

// "may" is a hedge, May is a month: only the lowercase word counts.
const banned = [...hits(wordRe(S.banned.hedges.filter((w) => w !== 'may'))), ...hits(/\bmay\b/)];
const jargon = hits(wordRe(S.banned.jargon));
const win = hits(wordRe(S.banned.win));
// A conditional ("if it's in your PIN, change it") is where-to-look, not a claim to have found it.
const found = hits(wordRe(S.banned.found)).filter((h) => wordRe(S.banned.found).test(h.sentence.replace(/\b(?:if|whether|when)\s+it'?s in your\b/gi, '')));
const miracle = hits(/\bmiracles?\b/i);
// Not bare "spread": "spread across the table" is ordinary English (run 51552 failed on it).
const tarot = hits(/\b(?:tarot|the cards? (?:show|say|told)|(?:card|tarot|three-card|celtic cross) spread|deck of cards|the deck)\b/i);
const clients = hits(/\b(?:clients?|a woman (?:i|who came|came)|women (?:who come|i've read)|one lady|a lady I)\b/i);
const writing_time = hits(/\b(?:hours? (?:it|this) took|took me (?:all|the whole)|all night|till dawn)\b/i);
const more_tickets = hits(/\b(?:buy|get|play)\s+(?:more|extra|ten|several|lots of|a few more)\s+tickets?\b/i)
  .filter((h) => !/\b(?:don't|do not|never|no|not|won't|where you'd have)\b/i.test(h.sentence));
const letter_callbacks = hits(/\b(?:my letter|in my letter|I told you|I said|as I wrote)\b/i);
const first = j.first_name;
const name_uses = first ? count(new RegExp('\\b' + esc(first) + '\\b', 'g'), plain(reading)) : 0;
const name_starts = first ? all.filter((p) => p.key !== 'opening' && new RegExp('^' + esc(first) + '\\b').test(p.text)).map((p) => p.key) : [];
const dear = count(/\bdear\b/gi, plain(reading));
const markdown = all.filter((p) => /^\s*(?:#|[-*•]\s)/m.test(p.text) || /\*\*/.test(p.text)).map((p) => ({ section: p.key, sentence: 'markdown or a list' }));

// Eight-word runs shared by two months, and months that open the same way.
const seen = new Map();
for (const p of days) {
  const toks = p.text.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).filter(Boolean), mine = new Set();
  for (let i = 0; i <= toks.length - 8; i++) mine.add(toks.slice(i, i + 8).join(' '));
  for (const g of mine) { if (!seen.has(g)) seen.set(g, []); seen.get(g).push(p.key); }
}
const repeated_8grams = [...seen.entries()].filter(([, v]) => v.length > 1).map(([phrase, sections]) => ({ phrase, sections })).slice(0, 20);
const opens = days.map((p) => firstWords(p.text, 3));
const same_openings = opens.filter((o, i) => opens.indexOf(o) !== i);

const contractions = count(/\b\w+'(?:s|t|re|ve|ll|d|m)\b/gi, plain(reading));
const expandable = count(/\b(?:i am|you are|they are|we are|it is|that is|do not|does not|did not|cannot|will not|would not|could not|have not|has not|had not|is not|are not|was not|were not|i have|you have|i will|you will|i would|you would)\b/gi, plain(reading));
const syll = (w) => { const m = w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); };
const allWords = plain(reading).replace(/\[[^\]]+\]/g, '').match(/[A-Za-z']+/g) || [];
const allSentences = sentencesOf(parts.map((p) => p.text).join('\n\n'));
const reading_grade = Number((0.39 * (allWords.length / allSentences.length) + 11.8 * (allWords.reduce((n, w) => n + syll(w), 0) / allWords.length) - 15.59).toFixed(1));

const repeatNeeded = N.repeats.length > 0;
const exact = {
  read_it_all: /\bread (?:it all|all of it|every page|the whole (?:thing|reading)|it through|right through|to the end)\b/i.test(P.opening) && /\b(?:before|first)\b/i.test(P.opening),
  name_check: /\b(?:name|date)\b/i.test(P.opening) && /\b(?:wrong|right|check)\b/i.test(P.opening),
  n1_value: new RegExp('\\b' + N.n1.value + '\\b').test(P.n1),
  n2_name: /\bname\b/i.test(P.n2), n3_vowels: /\bvowels?\b/i.test(P.n3) || /\bname\b/i.test(P.n3),
  repeat_said: !repeatNeeded || /\b(?:twice|three times|again)\b/i.test(P.n1 + ' ' + P.n2 + ' ' + P.n3),
  miracle_each: j.arm !== 'A' || ['n1', 'n2', 'n3'].every((k) => /\bsmall miracles?\b/i.test(P[k])),
  no_miracle_b: j.arm !== 'B' || !miracle.length,
  promise_six: /\bpromise/i.test(P.six) && /\b(?:money you need|chase|ten)\b/i.test(P.six),
  honest_topups: !L.tickets.shortfall || !/\b(?:all six|every one of (?:them|these|your six))\b/i.test(P.six),
  pin_value: P.pin.includes(L.pin.value),
  pin_birthdate: /\b(?:birth ?date|birthday|date of birth)\b/i.test(P.pin) && /\bnever\b/i.test(P.pin),
  stop_value: new RegExp('\\b' + L.stopNumber.value + '\\b').test(firstWords(P.stop, 40)),
  stop_where: /\bhouse\b/i.test(P.stop) && /\bphone\b/i.test(P.stop) && /\bPIN\b/.test(P.stop),
  hours_rule: /\b(?:ten|10)\b/i.test(P.hours) && /\b(?:counts?|carr(?:y|ies)|adds?)\b/i.test(P.hours),
  lottery_line: j.arm === 'B' ? /\b(?:not promising|no win|nobody honest|can't promise)\b/i.test(P.use_lottery) : /\bsmall\b/i.test(P.use_lottery),
  interview_offer: /\boffer\b/i.test(P.use_interview),
  ticket_months: j.devices.ticket_months.every((k) => /\btickets?\b/i.test(P[k])),
};
const metrics = { words, section_words, flat_triples, numerals, dates, weekdays, day_dates: dayDates, number_words,
  banned, jargon, win, found, miracle, tarot, clients, writing_time, more_tickets, letter_callbacks, name_uses, name_starts, dear,
  markdown, repeated_8grams, same_openings, contraction_share: Number((contractions / Math.max(1, contractions + expandable)).toFixed(2)),
  reading_grade, exact };

const facts = [
  `First number ${N.n1.value} · second ${N.n2.value} · third ${N.n3.value} · repeats: ${N.repeats.map((r) => `${r.number}×${r.count}`).join(', ') || 'none'}`,
  `Six: ${L.tickets.list.join(', ')} (${L.tickets.note})`,
  `PIN ${L.pin.value} · stop number ${L.stopNumber.value} (${STOP_HOW(L)})`,
  `Open days: ${L.openDays.map((o) => `${o.weekday} ${dateWords(o.date)} [day number ${o.pd}]`).join('; ')}`,
  `Hours: ${L.luckyHours.slots.map((x) => x.label).join(', ')}`,
  `Arm ${j.arm}: ${S.arms[j.arm].name}. ${S.arms[j.arm].brings_rule}`,
  `Her first number's line in the letter: "${S.n1.letter_line[String(N.n1.value)]}"`,
  ``, `EVERYTHING THE WRITER WAS HANDED (word for word). Any number, date or sum in here is allowed in the prose.`,
  factsOf(j),
].join('\n');
// What node 10 prints around the prose. The grader only sees the prose, so without this it fails a
// month for "leaving out her date" (the date is in the box above it) and a use for "numbers she wasn't
// handed" (they're in the fill-in line above it). Same engine fields node 10 reads.
const shortD = (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)} ${Number(iso.slice(8, 10))}`;
const printed = [
  `Above each of her three numbers: the number, the sum that gives it, and its family on a ticket (${N.distinct.map((v) => `${v}: ${(L.tickets.families[v] || []).join(' ')}`).join(' · ')}).`,
  `Above each month's words, a box with the month, date, weekday and year, and the line "This day carries…" naming the number the day carries. So the prose doesn't need to repeat the date: ${L.openDays.map((o) => `${o.date.slice(5)} ${o.weekday}`).join(', ')}.`,
  `The hours box: ${L.luckyHours.slots.map((x) => x.label).join(', ')}, with "Ten o'clock counts as 1, eleven as 2, twelve as 3."`,
  `The stop-number checks: house or flat number, phone number, PIN, each with how to check it.`,
  `Above the uses: lottery ${L.tickets.list.join(' ')} on any open day · PIN ${L.pin.value} · home: numbers adding to ${orWords(N.distinct)}, like ${orWords(L.uses.house.examples.map((x) => x.n))}, steer clear of ${L.stopNumber.value} · phone: best ${L.uses.phone.aimFor}, also ${orWords(L.uses.phone.alsoGood) || 'none'}, avoid ${L.uses.phone.avoid} · interview at ${businessSlots(L).map((x) => x.label).join(' or ')}${standIns(L).length ? `, and for an open day that falls at a weekend this weekday carries her numbers instead: ${standIns(L).map((x) => `${x.weekday.slice(0, 3)} ${shortD(x.date)}`).join(', ')}` : ''}.`,
].join('\n');
const list = (name, xs) => `  ${name}: ${xs.length}${xs.length ? '\n' + xs.slice(0, 12).map((x) => `    · ${x.section ?? (x.sections || []).join(', ')} — ${x.sentence || x.phrase || x.text}`).join('\n') : ''}`;
const grade_user = [
  `MEASURED FOR YOU. Don't recount any of this. Candidate lists are where to look, and you judge each one.`,
  `  total words: ${words} (allowed ${S.floor_words}-${S.ceiling_words})`,
  `  words by section: ${Object.entries(section_words).map(([k, v]) => `${k}=${v}`).join(', ')}`,
  `  her name used: ${name_uses} (about ${S.devices.name_uses_total}) · the word dear: ${dear} (at most ${S.devices.dear_uses})`,
  `  "my letter" callbacks: ${letter_callbacks.length} (at most ${S.devices.letter_callbacks_max})`,
  `  contraction share: ${metrics.contraction_share} · reading grade: ${reading_grade}`,
  list('numerals not on the section list', numerals), list('dates that are not hers', dates),
  list('wrong weekdays in a month', weekdays), list('another month\'s date in a month', dayDates),
  list('her numbers written as words', number_words),
  list('hedge words', banned), list('jargon', jargon), list('win words', win), list('claims to have found the stop number', found),
  list('tarot', tarot), list('past clients', clients), list('buy more tickets', more_tickets), list('"my letter" lines', letter_callbacks),
  list('eight-word runs shared by two months', repeated_8grams), `  months opening on the same three words: ${same_openings.join(' | ') || 'none'}`,
  `  required lines present: ${JSON.stringify(exact)}`,
  ``, `THE FACTS THIS BUYER WAS GIVEN. Check the reading against these.`, facts,
  ``, `PRINTED ON THE PAGE AROUND THE WORDS. She sees all of this. The prose may point to it and use these numbers and dates.`, printed,
  ``, `THE READING (each section's key in square brackets)`, reading,
].join('\n');
const { parts: _p, prose: _x, prompt: _q, response_format: _rf, segment: _s, index: _i, total: _t, ...keep } = j;
return [{ json: { ...keep, attempt, sections: Object.fromEntries(parts.map((p) => [p.key, p.text])), reading, metrics, grade_user } }];
""".replace("__SPEC__", SPEC_JSON)

# ─── 7 · the grader ────────────────────────────────────────────────────────────
RUBRIC = """You are grading a lucky-numbers reading, Lucky Numbers, before it goes to the woman who paid for it. Each line below is yes or no. Any single NO fails the reading. Grade only on these lines, and don't bring rules from anywhere else. Flat statements about her luck are correct here: the reading is meant to sound sure of itself. Numbers are read openly in this product.

THE CONTENTS
1. Every section is present in order: the opening, three numbers, six to play, the PIN, the number to stop using, the open days introduced and all twelve months, the hours, nine uses and the close.
2. Each of her three numbers says what her luck looks like, when it comes (a moment, never a date) and what it brings. Her first number agrees with the letter line handed to you. The second and third say they come from her full birth name.
3. If a number repeats, the reading says so plainly where it repeats.
4. The six to play: says how to play them, repeats her promise not to chase it, and never claims a topped-up number is one of her three.
5. The PIN: says where its digits come from, says never to use her birth date, and doesn't tell her to keep it written with her card.
6. The number to stop using: named flat, the reason given in plain words, and where to look (house, phone, PIN). It never claims to have found it in any of them.
7. The twelve months: each says what that day is for and what she does on it, keyed to the number it carries. No two months read alike: not the same opening, ending, action or turn of phrase. Fail if the next month's shape is predictable from the last few.
8. The hours: the hours are explained, with the rule for turning numbers into clock times.
9. All nine uses are filled in with her own numbers or days, and the interview use covers saying yes to an offer.

THE PROMISES
10. No win is promised anywhere. Arm A names the kind of small miracle each number brings, small ones only. Arm B never uses the word miracle and says plainly no win is promised.
11. Every number, date, weekday and hour in the prose is one she was handed or one printed on the page around the words. Nothing is worked out in the prose that wasn't handed over. Use the measured lists. The page prints each month's date in a box above that month's words, so a month that doesn't repeat its date is not a fault.

THE VOICE
12. It sounds spoken: plain short words, contractions, flat statements, no hedges, no sayings or balanced lines, no idea-words she has to work out.
13. What it says about her life is common things a hundred different women could each recognise. No invented biography, people or scenes.
14. Nothing names past clients, testimonials, tarot, or how long the work took.
15. The counts handed to you are inside their limits.

Return the verdict and the scores. `failed` lists the line numbers that failed. `why` is one short sentence naming the worst fault in plain words. Score each 0 to 10 on its own: continuation (would she keep reading), trust (does it feel worked out for her), variation (no formula), usefulness (could she act on it this week), relevance (could only she be reading this), clarity (plain and easy). `recommend` is 0 to 10: would she tell a friend."""

SCORE_KEYS = ("continuation", "trust", "variation", "usefulness", "relevance", "clarity")
GRADE_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "pass": {"type": "boolean"},
        "failed": {"type": "array", "items": {"type": "integer"}},
        "why": {"type": "string"},
        "recommend": {"type": "integer"},
        "scores": {"type": "object", "additionalProperties": False,
                   "properties": {k: {"type": "integer"} for k in SCORE_KEYS},
                   "required": list(SCORE_KEYS)},
    },
    "required": ["pass", "failed", "why", "recommend", "scores"],
}

def grade_body():
    return ("={\n"
      f'  "model": "{MODEL_GRADE}",\n'
      f'  "max_completion_tokens": {CEILING_GRADE},\n'
      f'  "reasoning_effort": "{EFFORT_GRADE}",\n'
      '  "response_format": { "type": "json_schema", "json_schema": {\n'
      '      "name": "verdict", "strict": true,\n'
      f'      "schema": {json.dumps(GRADE_SCHEMA)} }} }},\n'
      '  "messages": [\n'
      f'    {{ "role": "system", "content": {json.dumps(RUBRIC, ensure_ascii=False)} }},\n'
      '    { "role": "user", "content": {{ JSON.stringify($json.grade_user) }} }\n'
      '  ]\n'
      "}")

VERDICT_JS = REPLY_JS + r"""
const brief = $('6 · Assemble and measure').first().json;
const S = __SPEC__;
// 🔴 THE GRADER FAILS OPEN, DELIBERATELY: regenerate once, then send, so a broken grader never
// costs a paying customer her reading. It must never fail open SILENTLY: the reason goes in `why`.
// ⛔ The NUMBER checks below are not the grader's: they override it, both attempts.
let v;
if (refused) v = { pass: true, failed: [], why: 'UNGRADED — grader declined' };
else if (stop === 'max_tokens' && !say.trim()) v = { pass: true, failed: [], why: 'UNGRADED — grader hit the ceiling with no verdict. Lower the effort on node 7.' };
else { try { v = JSON.parse(say); } catch (e) { v = { pass: true, failed: [], why: 'UNGRADED — grader output unparseable' }; } }

const m = brief.metrics, e = m.exact, hard = [], detail = [];
const fail = (line, ok, msg) => { if (!ok) { hard.push(line); detail.push(msg); } };
fail(15, m.words >= S.floor_words && m.words <= S.ceiling_words, `total ${m.words} words`);
fail(15, m.dear <= S.devices.dear_uses || !brief.first_name, `dear ${m.dear}`);
fail(15, m.letter_callbacks.length <= S.devices.letter_callbacks_max, `"my letter" lines ${m.letter_callbacks.length}`);
fail(15, !m.name_starts.length, `sections starting on her name: ${m.name_starts.join(', ')}`);
fail(15, !m.markdown.length, `markdown in ${m.markdown.map((x) => x.section).join(', ')}`);
fail(11, !m.numerals.length, `numerals not handed over: ${m.numerals.map((x) => x.sentence).join('; ')}`);
fail(11, !m.dates.length && !m.day_dates.length, `dates: ${[...m.dates, ...m.day_dates].map((x) => x.sentence).join('; ')}`);
fail(11, !m.weekdays.length, `weekdays: ${m.weekdays.map((x) => x.sentence).join('; ')}`);
fail(10, !m.win.length && !m.more_tickets.length, `win or buy-more lines ${m.win.length + m.more_tickets.length}`);
fail(10, e.miracle_each && e.no_miracle_b && e.lottery_line, 'the arm\'s promise is wrong (small miracle per number on A, none on B, the lottery line)');
fail(7, !m.repeated_8grams.length && !m.same_openings.length, `months repeat: ${m.repeated_8grams.length} shared runs, ${m.same_openings.length} same openings`);
fail(12, !m.banned.length && !m.jargon.length, `hedges or jargon ${m.banned.length + m.jargon.length}`);
fail(14, !m.tarot.length && !m.clients.length && !m.writing_time.length, 'tarot, clients or writing time named');
fail(6, !m.found.length && e.stop_value && e.stop_where, 'the stop number is not named first, not looked for in house/phone/PIN, or claimed as found');
fail(5, e.pin_value && e.pin_birthdate, 'the PIN section misses its digits or the birth-date warning');
fail(4, e.promise_six && e.honest_topups, 'the six miss her promise or overclaim the topped-up numbers');
fail(3, e.repeat_said, 'a repeated number is not said');
fail(2, e.n1_value && e.n2_name && e.n3_vowels, 'a number section misses its number or where it comes from');
fail(8, e.hours_rule, 'the hours rule is missing');
fail(9, e.interview_offer && e.ticket_months, 'a use is missing (offer, or a ticket month without a ticket)');
fail(1, e.read_it_all && e.name_check, 'the opening misses "read it all first" or the name and date check');
if (hard.length) {
  v.pass = false;
  v.failed = [...new Set([...(v.failed || []), ...hard])].sort((a, b) => a - b);
  v.why = `${v.why || 'Model grade overridden by the measured contract.'} Measured: ${detail.join('; ')}.`;
}
const s = v.scores || {};
const KEYS = __KEYS__;
const badScores = KEYS.filter((k) => !Number.isInteger(s[k]) || s[k] < 0 || s[k] > 10);
const recOk = Number.isInteger(v.recommend) && v.recommend >= 0 && v.recommend <= 10;
if (badScores.length || !recOk) { v.score_error = `invalid scores: ${badScores.join(', ')}${recOk ? '' : ' recommend'}`; v.why = `${v.why || ''} Automated score ignored.`; }
v.recommend = recOk ? v.recommend : null;
v.weighted_score = badScores.length ? null : Number((s.continuation * 0.2 + s.trust * 0.2 + s.variation * 0.2
  + s.usefulness * 0.2 + s.relevance * 0.1 + s.clarity * 0.1).toFixed(2));
// A wrong number must never ship, even on the second attempt (02's "ship anyway" stops here).
v.numbers_ok = !m.numerals.length && !m.dates.length && !m.day_dates.length && !m.weekdays.length;
return [{ json: { ...brief, verdict: v } }];
""".replace("__SPEC__", SPEC_JSON).replace("__KEYS__", json.dumps(list(SCORE_KEYS)))

ROUND_AGAIN_JS = r"""
// ⛔ Same numbers, same dates, same rotations. Only the writing is done again: this goes back to
// the fan-out, past node 3, so nothing can be recomputed.
// Read off 7a by name: on the live build node 8b sits just before this and returns our API's reply.
const { reading, sections, metrics, grade_user, verdict, ...j } = $('7a · Read the verdict').first().json;
return [{ json: { ...j, attempt: j.attempt + 1, first_failure: { failed: verdict.failed, why: verdict.why } } }];
"""

# ─── 10 · the PDF's HTML. Every number on the page is drawn from the engine. ───
HTML_JS = HELPERS_JS + r"""
const j = $('7a · Read the verdict').first().json;
const S = __SPEC__;
const L = j.lucky, N = L.numbers;
// ⛔ The second attempt ships even if the grader fails it (02's rule), but never with a number,
//    date or weekday that isn't hers. That holds here for a human to look at.
if (!j.verdict.numbers_ok) throw new Error('HOLD: the prose has a number, date or weekday that is not hers, on the final attempt. A person must look before this goes.');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (t) => esc(t).replace(/\*+/g, '');
const paras = (t) => String(t || '').trim().split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${inline(p.trim().replace(/\n/g, ' '))}</p>`).join('');
const sec = j.sections;
const missing = S.order.filter((k) => !String(sec[k] || '').trim());
if (missing.length) throw new Error(`the reading has no text for: ${missing.join(', ')}`);
const prose = (k) => `<div class="prose" data-section="${k}">${paras(sec[k])}</div>`;
const mon = (iso) => MONTHS[Number(iso.slice(5, 7)) - 1];
const shortDate = (iso) => `${mon(iso).slice(0, 3)} ${Number(iso.slice(8, 10))}`;

// ── the calendar (D12): her window's twelve months, her days circled. Code only. ──
const calendarSvg = (opts) => {
  const { cols, cw, marks, dark } = opts;
  // A month can run to six weeks (a 31-day month starting on a Friday or Saturday), so each block
  // is tall enough for six rows whatever height was asked for. Otherwise the 31st sits on the next title.
  const rowH = Math.max(opts.ch, 34 + ((cw - 16) / 7) * 5.75);
  const rows = Math.ceil(12 / cols), W = cols * cw, H = rows * rowH;
  const ink = dark ? '#EFE6D2' : '#2A2622', soft = dark ? '#9C93A8' : '#9A9083', gold = dark ? '#D9B45E' : '#A8842C';
  const fillOpen = dark ? '#D9B45E' : '#A8842C', fillTxt = dark ? '#1C2238' : '#FFFFFF';
  const spanYears = new Set(L.calendar.window ? [L.calendar.window.start.slice(0, 4), L.calendar.window.end.slice(0, 4)] : []).size > 1;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}pt" height="${H}pt" class="cal" font-family="Georgia, serif">`;
  const months = L.fullYear.months;
  months.forEach((mo, i) => {
    const [y, m] = mo.month.split('-').map(Number);
    const x0 = (i % cols) * cw, y0 = Math.floor(i / cols) * rowH;
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cell = (cw - 16) / 7, top = y0 + 30;
    out += `<text x="${x0 + cw / 2}" y="${y0 + 14}" text-anchor="middle" font-size="${cell * 0.62}" fill="${gold}" letter-spacing="1">${MONTHS[m - 1].toUpperCase()}${spanYears || i === 0 ? ' ' + y : ''}</text>`;
    'SMTWTFS'.split('').forEach((d, k) => { out += `<text x="${x0 + 8 + cell * k + cell / 2}" y="${top - 4}" text-anchor="middle" font-size="${cell * 0.42}" fill="${soft}">${d}</text>`; });
    const mk = Object.fromEntries((marks[mo.month] || []).map((x) => [x.d, x.kind]));
    for (let d = 1; d <= dim; d++) {
      const pos = first + d - 1, cx = x0 + 8 + cell * (pos % 7) + cell / 2, cy = top + cell * 0.7 + Math.floor(pos / 7) * cell * 0.92;
      const iso = `${mo.month}-${String(d).padStart(2, '0')}`;
      if (mk[d] === 'open') out += `<circle class="open" data-date="${iso}" cx="${cx}" cy="${cy - cell * 0.17}" r="${cell * 0.47}" fill="${fillOpen}"/>`;
      if (mk[d] === 'more') out += `<circle class="more" data-date="${iso}" cx="${cx}" cy="${cy - cell * 0.17}" r="${cell * 0.42}" fill="none" stroke="${gold}" stroke-width="1"/>`;
      out += `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="${cell * 0.45}" fill="${mk[d] === 'open' ? fillTxt : ink}"${mk[d] === 'open' ? ' font-weight="bold"' : ''}>${d}</text>`;
    }
  });
  return out + '</svg>';
};
const openMarks = {};
for (const o of L.openDays) (openMarks[o.date.slice(0, 7)] = openMarks[o.date.slice(0, 7)] || []).push({ d: o.day, kind: 'open' });
const fullMarks = {};
for (const mo of L.fullYear.months) fullMarks[mo.month] = mo.days.map((x) => ({ d: Number(x.date.slice(8, 10)), kind: x.open ? 'open' : 'more' }));

// ── number panels ──
const famChips = (v) => `<p class="fam">Its family on a ticket: ${(L.tickets.families[v] || []).map((n) => `<span data-family="${v}">${n}</span>`).join(' · ')}</p>`;
const ring = (v, cls = '') => `<div class="ring ${cls}"><span>${v}</span></div>`;
const wordsRow = (field) => L.name.words.map((w) => `<span class="w"><b>${esc(w.word.toUpperCase())}</b><i data-sum="${w[field]}">${w[field]}</i></span>`).join('<span class="plus">+</span>');
const vowelsOf = (w) => w.split('').filter((c) => 'aeiou'.includes(c) || (L.name.yCountedAsVowel && c === 'y')).join(' ').toUpperCase();
const numPanel = (k) => {
  const n = N[k], which = { n1: 'Your first number', n2: 'Your second number', n3: 'Your third number' }[k];
  let how;
  if (k === 'n1') how = `<p class="how">From your birth date, ${esc(dateWords(L.input.birthDate))}:</p><p class="sum" data-working="n1">${esc(n.working).replace(', then', ' &rarr; then')}</p>`;
  else if (k === 'n2') how = `<p class="how">From every letter of your birth name:</p><p class="words">${wordsRow('all')}</p><p class="sum" data-working="n2">${n.raw}${n.raw > 9 ? ' &rarr; ' + esc(n.working.split(', then ')[1] || '') : ''}</p>`;
  else how = `<p class="how">From the vowels of your birth name (${L.name.words.map((w) => esc(vowelsOf(w.word))).join(' &middot; ')}):</p><p class="words">${wordsRow('vowels')}</p><p class="sum" data-working="n3">${n.raw}${n.raw > 9 ? ' &rarr; ' + esc(n.working.split(', then ')[1] || '') : ''}</p>`;
  return `<div class="panel" data-number="${k}" data-value="${n.value}">${ring(n.value)}<div class="ptext"><p class="lab">${which}</p>${how}${famChips(n.value)}</div></div>`;
};
const numSection = (k) => `<section class="num" id="${k}">${numPanel(k)}${prose(k)}</section>`;

// ── six balls, PIN tiles, stop number ──
const balls = L.tickets.numbers.map((t) => `<div class="ball"><span class="b" data-ticket="${t.n}">${t.n}</span><small>${esc(SOURCE_WORDS(L, t).replace(/^adds down to (\d+), /, 'adds to $1 · '))}</small></div>`).join('');
const maxT = Math.max(...L.tickets.list);
const tiles = L.pin.digits.map((d) => `<div class="tile"><span class="t" data-pin-digit="${d.d}">${d.d}</span><small>${esc(PIN_FROM(L, d))}</small></div>`).join('');
const pinNote = L.pin.stage === 'in-order' ? '' : `<p class="note">Not in the plain order: the plain order is one a bank would turn down.</p>`;
const stopV = L.stopNumber.value;
const lookRows = [
  ['Your house or flat number', `Add its digits until one is left. If it comes to ${stopV}, that's it.`],
  ['Your phone number', `Add every digit until one is left. If it comes to ${stopV}, that's it.`],
  ['Your PIN', `Look for ${aN(stopV)} anywhere in it. If there's one, change the PIN to ${L.pin.value}.`],
].map(([a, b]) => `<tr><td class="box"></td><td><b>${a}</b><br>${b}</td></tr>`).join('');

// ── the twelve months ──
const dayBlock = (k, i) => {
  const o = L.openDays[i];
  return `<section class="day" data-open-date="${o.date}"><div class="badge"><span class="m">${esc(mon(o.date))}</span><span class="d">${o.day}</span><span class="wd">${esc(o.weekday)}</span><span class="y">${o.date.slice(0, 4)}</span></div>
    <div class="dtext"><p class="chip" data-pd="${o.pd}">${esc(pdLine(L, o).replace(/^The day/, 'This day'))}</p>${prose(k)}</div></section>`; };

// ── uses, each with a fill-in line drawn from the engine ──
const satOpen = L.openDays.filter((o) => o.weekday === 'Saturday');
const fill = {
  use_lottery: `Play: <b>${L.tickets.list.join(' &middot; ')}</b>. Buy on: any of your twelve open days.`,
  use_pin: `Change it to: <b>${L.pin.value}</b>.`,
  use_days: L.openDays.map((o) => esc(shortDate(o.date))).join(' &middot; '),
  use_home: `Look for a number that adds down to ${orWords(N.distinct)}, like ${orWords(L.uses.house.examples.map((x) => x.n))}. Steer clear of one that adds to ${stopV}.`,
  use_phone: `Best: adds down to <b>${L.uses.phone.aimFor}</b>. Also good: ${orWords(L.uses.phone.alsoGood) || 'none'}. Avoid: ${L.uses.phone.avoid}. Add every digit until one is left.`,
  use_wedding: satOpen.length ? `Your open days on a Saturday: ${satOpen.map((o) => esc(shortDate(o.date))).join(' &middot; ')}.` : `Any of your twelve open days.`,
  use_interview: `Ask for: an open day, at ${businessSlots(L).map((x) => x.label).join(' or ')}. Say yes to an offer on an open day too.${standIns(L).length ? ` When an open day falls at a weekend and the office is shut, this weekday carries your numbers instead: ${standIns(L).map((x) => `<span data-weekday-date="${x.date}">${esc(x.weekday.slice(0, 3))} ${esc(shortDate(x.date))}</span>`).join(' &middot; ')}.` : ''}`,
  use_business: `Open, sign or launch on: any open day. Your first is ${esc(L.openDays[0].weekday)}, ${esc(dateWords(L.openDays[0].date))}.`,
  use_travel: `Travel on your open days. Seats, rooms and flight numbers: ones that add down to ${orWords(N.distinct)}.`,
};
const useKeys = S.order.filter((k) => k.startsWith('use_'));
const uses = useKeys.map((k) => `<section class="use"><h3>${esc(S.sections[k].label)}</h3><p class="fill">${fill[k]}</p>${prose(k)}</section>`).join('');

// ── the keep page: everything but the PIN ──
const keep = `<div class="keep"><h2>Your numbers on one page</h2><p class="kintro">Cut this out and keep it in your purse.</p>
  <table><tr><th>Your three numbers</th><td>${N.three.join(' &middot; ')}</td></tr>
  <tr><th>Your six to play</th><td>${L.tickets.list.join(' &middot; ')}</td></tr>
  <tr><th>Your open days, ${esc(L.windowLabel)}</th><td>${L.openDays.map((o) => esc(shortDate(o.date))).join(' &middot; ')}</td></tr>
  <tr><th>Your lucky hours</th><td>${L.luckyHours.slots.map((x) => x.label).join(' &middot; ')}</td></tr>
  <tr><th>Stop using</th><td>${stopV}</td></tr></table>
  <p class="kintro">Your PIN isn't on this page. Keep it in your head, not your purse.</p></div>`;

// ── the bump: The Full Year, only when bought. Code draws all of it. ──
const FY = L.fullYear;
const bump = !j.bump ? '' : `<div class="bump"><h2>The Full Year</h2>
  <p class="bintro">Your twelve open days are the best of each month. These are the rest: every day in ${esc(L.windowLabel)} when both the day and the date carry one of your numbers. Use them for the smaller things, like a ticket, a call or a form. Keep the big asks for your open days.</p>
  <div class="calwrap light">${calendarSvg({ cols: 3, cw: 150, ch: 132, marks: fullMarks, dark: false })}</div>
  <p class="key"><span class="k1"></span> an open day &nbsp; <span class="k2"></span> another lucky day</p></div>
  <div class="bump list"><h2>The Full Year, month by month</h2>${FY.months.map((mo) => `<div class="fym"><h4>${esc(mo.label)}</h4><p>${mo.days.map((x) => `<span data-full-date="${x.date}"${x.open ? ' class="o"' : ''}>${esc(x.weekday.slice(0, 3))} ${Number(x.date.slice(8, 10))}${x.open ? ' (open day)' : ''}</span>`).join(', ')}</p></div>`).join('')}</div>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  /* ⛔ NO BACKTICKS IN THIS BLOCK. One ends the template literal and the node stops parsing. */
  @page { size: Letter; margin: .6in 0 .6in; @bottom-center { content: "Lucky Numbers · " counter(page); font-family: Georgia, serif; font-size: 9pt; color: #6E6459; } }
  @page cover { margin: 0; @bottom-center { content: none; } }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2A2622; margin: 0; font-size: 11.5pt; line-height: 1.6; }
  .cover { page: cover; width: 8.5in; height: 11in; overflow: hidden; page-break-after: always; background: #1C2238; color: #EFE6D2; text-align: center; padding-top: .55in; }
  .cover .eyebrow { font-size: 9pt; letter-spacing: .3em; color: #D9B45E; margin: 0 0 8pt; }
  .cover h1 { font-size: 40pt; font-weight: normal; margin: 0 0 6pt; color: #EFE6D2; }
  .cover .for { font-size: 13pt; margin: 0; color: #EFE6D2; }
  .cover .born { font-size: 11pt; color: #B9AFC4; margin: 2pt 0 .22in; font-style: italic; }
  .cover .three { display: flex; justify-content: center; gap: .3in; margin-bottom: .2in; }
  .cover .three div { text-align: center; }
  .cover .three .ring { margin: 0 auto 4pt; }
  .cover .three small { font-size: 8.5pt; color: #B9AFC4; letter-spacing: .08em; }
  .ring { width: .78in; height: .78in; border-radius: 50%; border: 2pt solid #D9B45E; display: flex; align-items: center; justify-content: center; }
  .ring span { font-size: 30pt; color: #D9B45E; line-height: 1; }
  .calwrap { margin: 0 auto; text-align: center; }
  .calwrap svg { display: block; margin: 0 auto; }
  .cover .cap { font-size: 10.5pt; color: #D9B45E; margin-top: .14in; letter-spacing: .06em; }
  .inner { padding: .2in .9in .3in; }
  .title h1 { font-size: 24pt; font-weight: normal; margin: 0 0 2pt; }
  .title p { font-style: italic; color: #6E6459; margin: 0 0 18pt; }
  h2 { font-size: 17pt; font-weight: bold; margin: 24pt 0 10pt; padding-top: 12pt; border-top: 1pt solid #DED4BE; page-break-after: avoid; break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 14pt 0 4pt; color: #5C5348; page-break-after: avoid; break-after: avoid; }
  p { margin: 0 0 9pt; orphans: 3; widows: 3; }
  .opening p:first-child { font-weight: bold; }
  .panel { display: flex; gap: 16pt; align-items: flex-start; background: #FBF6E9; border: 1pt solid #E2D7BC; padding: 12pt 14pt; margin: 6pt 0 12pt; page-break-inside: avoid; break-inside: avoid; }
  .panel .ring { border-color: #A8842C; flex: none; }
  .panel .ring span { color: #A8842C; }
  .ptext p { margin: 0 0 4pt; font-size: 10.5pt; }
  .ptext .lab { font-size: 9pt; letter-spacing: .14em; text-transform: uppercase; color: #A8842C; }
  .ptext .sum { font-size: 12pt; }
  .ptext .words { font-size: 10pt; }
  .w { display: inline-block; text-align: center; margin: 0 2pt; }
  .w b { display: block; font-weight: normal; letter-spacing: .08em; }
  .w i { display: block; font-style: normal; color: #A8842C; }
  .plus { color: #9A9083; }
  .fam { color: #6E6459; }
  section.num { margin-bottom: 8pt; }
  .balls, .tiles { display: flex; flex-wrap: wrap; gap: 10pt; margin: 6pt 0 12pt; page-break-inside: avoid; break-inside: avoid; }
  .ball { width: 1.55in; text-align: center; }
  .ball .b { display: inline-flex; width: .62in; height: .62in; border-radius: 50%; background: #A8842C; color: #fff; font-size: 19pt; align-items: center; justify-content: center; }
  .ball small, .tile small { display: block; font-size: 8pt; line-height: 1.3; color: #6E6459; margin-top: 3pt; }
  .fits { font-size: 10pt; color: #6E6459; }
  .tile { width: 1.3in; text-align: center; }
  .tile .t { display: inline-flex; width: .6in; height: .75in; border: 1.5pt solid #2A2622; border-radius: 4pt; font-size: 26pt; align-items: center; justify-content: center; }
  .note { font-size: 10pt; color: #6E6459; font-style: italic; }
  .stopbox { display: flex; gap: 16pt; align-items: center; background: #FBF6E9; border: 1pt solid #E2D7BC; padding: 12pt 14pt; margin: 6pt 0 10pt; page-break-inside: avoid; break-inside: avoid; }
  .stopnum { position: relative; width: .8in; height: .8in; border-radius: 50%; border: 2pt solid #8C2B2B; display: flex; align-items: center; justify-content: center; flex: none; }
  .stopnum span { font-size: 30pt; color: #8C2B2B; }
  .stopnum:after { content: ''; position: absolute; left: 6pt; right: 6pt; top: 50%; border-top: 2pt solid #8C2B2B; transform: rotate(-35deg); }
  table.look { width: 100%; border-collapse: collapse; margin: 4pt 0 12pt; font-size: 10.5pt; page-break-inside: avoid; break-inside: avoid; }
  table.look td { padding: 5pt 6pt; vertical-align: top; border-bottom: 1pt solid #EAE2CF; }
  table.look td.box { width: 16pt; } table.look td.box:before { content: ''; display: inline-block; width: 10pt; height: 10pt; border: 1pt solid #2A2622; margin-top: 3pt; }
  .days { page-break-before: always; break-before: page; }
  section.day { display: flex; gap: 14pt; margin: 0 0 12pt; padding-bottom: 8pt; border-bottom: 1pt solid #EFE8D6; page-break-inside: avoid; break-inside: avoid; }
  .badge { flex: none; width: .95in; text-align: center; background: #1C2238; color: #EFE6D2; border-radius: 4pt; padding: 6pt 0 7pt; height: fit-content; }
  .badge span { display: block; line-height: 1.15; }
  .badge .m { font-size: 8.5pt; letter-spacing: .16em; text-transform: uppercase; color: #D9B45E; }
  .badge .d { font-size: 26pt; }
  .badge .wd { font-size: 8.5pt; }
  .badge .y { font-size: 7.5pt; color: #B9AFC4; }
  .dtext { flex: 1; }
  .chip { font-size: 9.5pt; color: #A8842C; letter-spacing: .02em; margin-bottom: 4pt; font-style: italic; }
  .hours { display: flex; gap: 10pt; flex-wrap: wrap; margin: 4pt 0 6pt; }
  .hours span { border: 1pt solid #A8842C; color: #A8842C; border-radius: 12pt; padding: 2pt 10pt; font-size: 11pt; }
  .rule { font-size: 10pt; color: #6E6459; }
  section.use { page-break-inside: avoid; break-inside: avoid; }
  .fill { font-size: 10.5pt; background: #FBF6E9; border-left: 3pt solid #A8842C; padding: 5pt 9pt; margin: 0 0 6pt; }
  .close { margin-top: 18pt; }
  .signoff { margin-top: 14pt; } .signoff p { margin: 0 0 3pt; }
  .keep { page-break-before: always; break-before: page; border: 1.5pt dashed #A8842C; padding: 16pt 20pt; margin-top: 10pt; }
  .keep h2 { border: 0; padding-top: 0; margin-top: 0; }
  .keep table { width: 100%; border-collapse: collapse; font-size: 12pt; }
  .keep th { text-align: left; font-weight: normal; color: #6E6459; padding: 6pt 10pt 6pt 0; width: 2.2in; vertical-align: top; }
  .keep td { padding: 6pt 0; border-bottom: 1pt solid #EFE8D6; }
  .kintro { font-size: 10pt; color: #6E6459; font-style: italic; }
  .colophon { margin-top: 22pt; border-top: 1pt solid #DED4BE; padding-top: 10pt; }
  .colophon p { font-size: 9pt; line-height: 1.5; color: #7C776D; margin: 0 0 4pt; }
  .bump { page-break-before: always; break-before: page; }
  .bump h2 { border: 0; padding-top: 0; margin-top: 0; }
  .bintro { font-size: 11pt; }
  .key { font-size: 9.5pt; color: #6E6459; text-align: center; }
  .key span { display: inline-block; width: 10pt; height: 10pt; border-radius: 50%; vertical-align: middle; }
  .key .k1 { background: #A8842C; } .key .k2 { border: 1pt solid #A8842C; }
  .fym { page-break-inside: avoid; break-inside: avoid; margin-bottom: 6pt; }
  .fym h4 { margin: 0 0 1pt; font-size: 11pt; color: #A8842C; }
  .fym p { font-size: 10pt; margin: 0; }
  .fym .o { font-weight: bold; }
</style></head><body>
  <div class="cover">
    <p class="eyebrow">EVELYN CROSS</p>
    <h1>Lucky Numbers</h1>
    <p class="for">Worked out for ${esc(j.birth_name)}</p>
    <p class="born">born ${esc(dateWords(L.input.birthDate))}</p>
    <div class="three">${['n1', 'n2', 'n3'].map((k, i) => `<div>${ring(N[k].value)}<small>${['FIRST', 'SECOND', 'THIRD'][i]}</small></div>`).join('')}</div>
    <div class="calwrap">${calendarSvg({ cols: 4, cw: 132, ch: 118, marks: openMarks, dark: true })}</div>
    <p class="cap">Your twelve open days &middot; ${esc(L.windowLabel)}</p>
  </div>
  <div class="inner">
    <div class="title"><h1>Lucky Numbers</h1><p>Worked out for ${esc(j.birth_name)}, born ${esc(dateWords(L.input.birthDate))}</p></div>
    <div class="opening">${prose('opening')}</div>
    <h2>Your three numbers</h2>
    ${['n1', 'n2', 'n3'].map(numSection).join('')}
    <h2>Your six numbers to play</h2>
    <div class="balls">${balls}</div>
    <p class="fits">These six fit any game whose numbers run from ${L.tickets.game.min} up to ${maxT} or higher.</p>
    ${prose('six')}
    <h2>Your PIN</h2>
    <div class="tiles">${tiles}</div>${pinNote}
    ${prose('pin')}
    <h2>The number to stop using</h2>
    <div class="stopbox"><div class="stopnum" data-stop="${stopV}"><span>${stopV}</span></div><div class="ptext"><p class="lab">How it was found</p><p>${esc(STOP_HOW(L))}</p></div></div>
    <p class="how"><b>Where to look.</b> Tick each one off when you've checked it.</p>
    <table class="look">${lookRows}</table>
    ${prose('stop')}
    <div class="days"><h2>Your twelve open days</h2>${prose('days_intro')}
    ${DAY_KEYS.map(dayBlock).join('')}</div>
    <h2>Your lucky hours</h2>
    <div class="hours">${L.luckyHours.slots.map((x) => `<span data-hour="${x.time}">${x.label}</span>`).join('')}</div>
    <p class="rule">Ten o'clock counts as 1, eleven as 2, twelve as 3.</p>
    ${prose('hours')}
    <h2>What your numbers are for</h2>
    ${uses}
    <div class="close">${prose('close')}
      <div class="signoff"><p>Your friend, with a pen ready for your calendar,</p><p>&mdash; Evelyn</p></div>
    </div>
    ${keep}
    <div class="colophon"><p>About this reading: every number and date in it was worked out by fixed rules from your birth name and date. The words are written with machine help in Evelyn's voice.</p>
      <p>Nothing here promises a win. Play for fun, and only with money you'd spend anyway.</p></div>
    ${bump}
  </div>
</body></html>`;
return [{ json: { ...j, html, pdfFileName: `${j.order_id}.pdf` } }];
""".replace("__SPEC__", SPEC_JSON)

# ─── assembly ──────────────────────────────────────────────────────────────────
def wf_name(base):
    return f"{base} [OPENAI · {MODEL_WRITE}]"

def build():
    NODES.clear(); LINKS.clear()
    n1 = node("1 · Stripe webhook", "n8n-nodes-base.webhook", 2, [-620, 300],
              {"httpMethod": "POST", "path": "lucky-numbers-fulfilment",
               "responseMode": "onReceived", "options": {}})
    n2 = node("2 · Is this a paid 12 order?", "n8n-nodes-base.if", 2.2, [-420, 300], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "strict", "version": 2},
        "conditions": [
            {"id": "a", "leftValue": "={{ $json.body.type }}",
             "rightValue": "checkout.session.completed",
             "operator": {"type": "string", "operation": "equals"}},
            {"id": "b", "leftValue": "={{ $json.body.data.object.metadata.product }}",
             "rightValue": STRIPE_PRODUCT,
             "operator": {"type": "string", "operation": "equals"}},
            {"id": "c", "leftValue": "={{ $json.body.data.object.payment_status }}",
             "rightValue": "paid", "operator": {"type": "string", "operation": "equals"}},
        ], "combinator": "and"}, "options": {}})
    nX = node("Not 12 — ignore", "n8n-nodes-base.noOp", 1, [-240, 460], {})
    # ⚠ TODO LIVE: birth name and date live on be_order_intake, never Stripe (as on 11).
    n2a = node("2a · Load the intake", "n8n-nodes-base.httpRequest", 4.2, [-240, 300], {
        "url": f"={APP_BASE_URL}/api/be/{OFFER_KEY}/fulfilment/" + "{{ $json.body.data.object.id }}",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "authorization", "value": "TODO-be-fulfilment-token"}]},
        "options": {"timeout": 30000},
    }, {"notes": "⚠ TODO live: real base URL + token. The test drive carries the intake on its fixture."})
    n2b = code("2b · Join session + intake", [-100, 300], r"""
const session = $('1 · Stripe webhook').first().json;
const r = $input.first().json;
return [{ json: { body: session.body, intake: { ...(r.intake || {}), firstName: (r.intake && r.intake.firstName) || (r.order && r.order.firstName) || null } } }];
""", "Live only.")

    n3  = code("3 · The engine (lucky-12.js)", [60, 200], ENGINE_JS,
               "lucky-12.js pasted as it is, then the order read and the engine called once. Every number and date comes from here.")
    n3a = code("3a · Rotations, allow-lists, voice", [240, 200], ROT_JS,
               "Seeded off the order id. Per-section numeral lists for the writer and for node 6.")
    n3c = code("3c · Fan out the acts", [420, 200], FAN_JS, "One item per act. A regeneration comes back in here.")
    n4  = node("4 · Each act", "n8n-nodes-base.splitInBatches", 3, [600, 200],
               {"batchSize": 1, "options": {
                   # 🔴 From 02 execution 30476: without this the regenerate path is broken. A
                   #    fresh item has no `prose`; one looping back always does.
                   "reset": "={{ $json.prose === undefined }}"}},
               {"notes": "⭐ Resets on a regeneration. Learned on 02."})
    n4a = code("4a · Compose the act prompt", [780, 320], ACT_JS,
               "The facts, everything written so far this attempt, then this act's briefs and its JSON schema.")
    n4b = model_call("4b · Write the act", [960, 320], act_body(MODEL_WRITE, EFFORT_WRITE, CEILING_WRITE),
                     "Strict json_schema, one field per section. System block first and byte-identical.")
    n4c = code("4c · Keep the act", [1140, 320], KEEP_ACT_JS,
               "Turns a refusal, truncation or missing section into a loud failure.")
    next(n for n in NODES if n["name"] == n4c)["onError"] = "continueErrorOutput"
    n4r = code("4r · Retry a format failure once", [1140, 540], RETRY_JS, "FORMAT failures only. No prompt change.")
    n4s = model_call("4s · Retry the act once", [1320, 540], act_body(MODEL_WRITE, EFFORT_WRITE, CEILING_WRITE),
                     "One bounded retry, same prompt.")
    n4t = code("4t · Validate the retried act", [1500, 540], KEEP_ACT_JS.replace("$('4 · Each act')", "$('4 · Each act')"),
               "Same parser as 4c. A second failure stops the workflow.")
    n4z = code("4z · Rejoin", [1320, 320], "return $input.all();\n",
               "⛔ Both paths pass through here, so 4a can find everything already written.")
    n5  = node("5 · Collect the acts", "n8n-nodes-base.aggregate", 1, [780, 100],
               {"aggregate": "aggregateAllItemData", "options": {}})
    n6  = code("6 · Assemble and measure", [960, 100], ASSEMBLE_JS,
               "Every numeral, date and weekday checked against the engine. Everything countable counted here.")
    n7  = model_call("7 · Grade it", [1140, 100], grade_body(),
                     "7a fails open and records why. The number checks override it.")
    n7a = code("7a · Read the verdict", [1320, 100], VERDICT_JS, "Measured contract overrides the model.")
    n8  = node("8 · Passed?", "n8n-nodes-base.if", 2.2, [1500, 100], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "loose", "version": 2},
        "conditions": [{"id": "p", "leftValue": "={{ $json.verdict.pass }}", "rightValue": "",
                        "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
        "combinator": "and"}, "options": {}})
    n8a = node("8a · First failure?", "n8n-nodes-base.if", 2.2, [1500, 300], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "loose", "version": 2},
        "conditions": [{"id": "r", "leftValue": "={{ $json.attempt }}", "rightValue": 2,
                        "operator": {"type": "number", "operation": "lt"}}],
        "combinator": "and"}, "options": {}})
    log_body = ("={{ JSON.stringify({ sessionId: $json.order_id, attempt: $json.attempt, "
                "pass: $json.verdict.pass, failed: $json.verdict.failed, why: $json.verdict.why, "
                "arm: $json.arm__EXTRA__ }) }}")
    n8b = ours("8b · Log the first failure", [1500, 460], f"/api/be/{OFFER_KEY}/grade-log",
               log_body.replace("__EXTRA__", ", regenerated: true"), "⚠ TODO live: base URL + token.")
    n8c = code("8c · Go round again", [1680, 460], ROUND_AGAIN_JS,
               "⛔ Back to the fan-out, past the engine, so the retry writes the SAME numbers.")
    n9  = ours("9 · Log the verdict", [1680, 100], f"/api/be/{OFFER_KEY}/grade-log",
               log_body.replace("__EXTRA__", ""), "⚠ TODO live: base URL + token.")
    n10 = code("10 · Build the HTML", [1860, 100], HTML_JS,
               "Cover calendar, number panels, balls, tiles, date badges, uses and the Full Year: all code. Holds if a number is wrong.")
    n11 = node("11 · PDFShift → PDF", "n8n-nodes-base.httpRequest", 4.2, [2040, 100], {
        "method": "POST", "url": "https://api.pdfshift.io/v3/convert/pdf",
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True,
        "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json",
        "jsonBody": ("={\n  \"source\": {{ JSON.stringify($json.html) }},\n"
                     "  \"format\": \"Letter\",\n  \"margin\": \"0\",\n"
                     "  \"use_print\": true,\n  \"sandbox\": false\n}"),
        "options": {"response": {"response": {"responseFormat": "file"}}, "timeout": 120000},
    }, {"credentials": {"httpHeaderAuth": PDFSHIFT_CRED},
        "notes": "No images to fetch: the calendar and every panel are inline SVG and HTML."})
    n12 = node("12 · Upload to Supabase Storage", "n8n-nodes-base.httpRequest", 4.2, [2220, 100], {
        "method": "POST",
        "url": ("=" + SUPABASE_PROJ + "/storage/v1/object/" + SUPABASE_BUCKET +
                "/12/{{ $('10 · Build the HTML').first().json.order_id }}/"
                "{{ $('10 · Build the HTML').first().json.pdfFileName }}"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "Content-Type", "value": "application/pdf"}, {"name": "x-upsert", "value": "true"}]},
        "sendBody": True, "contentType": "binaryData", "inputDataFieldName": "data",
        "options": {"timeout": 60000},
    }, {"credentials": {"httpHeaderAuth": SUPABASE_CRED},
        "notes": "⚠ TODO live: 02's handover says this bucket and project are unresolved."})
    n13 = node("13 · Hold to the 24h mark", "n8n-nodes-base.wait", 1.1, [2400, 100], {
        "resume": "specificTime",
        "dateTime": ("={{ DateTime.fromISO($('10 · Build the HTML').first().json.paid_at)"
                     ".plus({ hours: 24 }).toISO() }}")},
        {"notes": "Both letters: within 24 hours. Never early by hours."})
    n13a = node("13a · Get signed URL", "n8n-nodes-base.httpRequest", 4.2, [2580, 100], {
        "method": "POST",
        "url": ("=" + SUPABASE_PROJ + "/storage/v1/object/sign/" + SUPABASE_BUCKET +
                "/12/{{ $('10 · Build the HTML').first().json.order_id }}/"
                "{{ $('10 · Build the HTML').first().json.pdfFileName }}"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True,
        "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": '{ "expiresIn": 31536000 }',
        "options": {"timeout": 30000},
    }, {"credentials": {"httpHeaderAuth": SUPABASE_CRED}})
    n14 = node("14 · Find her on AWeber", "n8n-nodes-base.httpRequest", 4.2, [2760, 100], {
        "url": (f"=https://api.aweber.com/1.0/accounts/{AWEBER_ACCOUNT}/lists/{AWEBER_LIST}"
                "/subscribers?ws.op=find&email="
                "{{ encodeURIComponent($('10 · Build the HTML').first().json.email) }}"),
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": AWEBER_CRED}, "notes": "⛔ FIND, NEVER CREATE. ⚠ TODO live: list id."})
    n14a = node("14a · Tag + reading_url (the send)", "n8n-nodes-base.httpRequest", 4.2, [2940, 100], {
        "method": "PATCH", "url": "={{ $json.entries[0].self_link }}",
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "sendBody": True, "bodyParameters": {"parameters": [
            # 🔴 custom_fields is a WHOLE-STATE write. Spread what the find returned.
            {"name": "custom_fields", "value":
             "={{ { ...($json.entries[0].custom_fields || {}), "
             "stripe_order_id: $('10 · Build the HTML').first().json.order_id, "
             f"offer: '{OFFER_KEY}', "
             "reading_url: '" + SUPABASE_PROJ + "/storage/v1' + "
             "$('13a · Get signed URL').first().json.signedURL } }}"},
            {"name": "tags", "value": "={{ { add: [\"" + DELIVERED_TAG + "\"] } }}"},
        ]}, "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": AWEBER_CRED}, "notes": "⭐ THE PATCH IS THE SEND: the tag fires T4."})
    n15 = ours("15 · Mark delivered", [3120, 100], f"/api/be/{OFFER_KEY}/delivered",
        ("={{ JSON.stringify({ sessionId: $('10 · Build the HTML').first().json.order_id, "
         "readingUrl: '" + SUPABASE_PROJ + "/storage/v1' + "
         "$('13a · Get signed URL').first().json.signedURL }) }}"),
        "⚠ TODO live: base URL + token.")

    for a, b in [(n1, n2), (n2a, n2b), (n2b, n3), (n3, n3a), (n3a, n3c), (n3c, n4),
                 (n4a, n4b), (n4b, n4c), (n4c, n4z), (n4z, n4), (n5, n6), (n6, n7), (n7, n7a),
                 (n7a, n8), (n8b, n8c), (n8c, n3c), (n9, n10), (n10, n11), (n11, n12), (n12, n13),
                 (n13, n13a), (n13a, n14), (n14, n14a), (n14a, n15)]:
        link(a, b)
    link(n2, n2a); link(n2, nX, 1)
    link(n4, n5); link(n4, n4a, 1)          # 0 = done, 1 = loop
    link(n4c, n4r, 1); link(n4r, n4s); link(n4s, n4t); link(n4t, n4z)
    link(n8, n9); link(n8, n8a, 1)
    link(n8a, n8b); link(n8a, n9, 1)        # second failure logs and ships, unless node 10 holds it on a number

    return {"name": wf_name("12 · Lucky Numbers — fulfilment"),
            "nodes": json.loads(json.dumps(NODES)), "connections": json.loads(json.dumps(LINKS)), "active": False,
            "settings": {"executionOrder": "v1", "saveManualExecutions": True,
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
            "pinData": {}, "tags": []}

# ─── the test drive: no path to a buyer ────────────────────────────────────────
# Both buyers are invented, and match fixtures/*.json (check-12-numbers keeps those honest).
# Testina: bump bought, arm B (c=11). Faketta: no bump, arm A (c=1), a rolled window.
FIXTURES = {
    "testina": {"order": "cs_test_n8n_testdrive_12_testina", "name": "Testina Rose Testerly",
                "first": "Testina", "dob": "1968-07-21", "created": 1794322800, "bump": "1", "c": "11"},
    "faketta": {"order": "cs_test_n8n_testdrive_12_faketta", "name": "Faketta Ann Testerly",
                "first": "Faketta", "dob": "1975-03-09", "created": 1805122800, "bump": "0", "c": "1"},
}

def fixture_item(which):
    f = FIXTURES[which]
    md = {"app": "the-seer-within", "product": STRIPE_PRODUCT, "offer": OFFER_KEY,
          "treatment": "page", "readingCents": "3500", "bump": f["bump"], "c": f["c"]}
    if f["bump"] == "1":
        md["bumpProduct"] = BUMP_PRODUCT
    return {"body": {"type": "checkout.session.completed", "data": {"object": {
                "id": flag("--order", f["order"]), "payment_status": "paid", "created": f["created"],
                "customer_details": {"email": f"dryrun-12-{which}@example.com"}, "metadata": md}}},
            "intake": {"fullBirthName": f["name"], "dateOfBirth": f["dob"], "firstName": f["first"]}}

def make_testdrive(wf, which, manual_only, storage):
    drop = {"1 · Stripe webhook", "Not 12 — ignore", "2a · Load the intake", "2b · Join session + intake",
            "8b · Log the first failure", "9 · Log the verdict", "13 · Hold to the 24h mark",
            "14 · Find her on AWeber", "14a · Tag + reading_url (the send)", "15 · Mark delivered"}
    wf["name"] = wf_name(f"12 · Lucky Numbers — {'MANUAL ' if manual_only else ''}TEST DRIVE ({which} fixture, never delivers)")
    wf["nodes"] = [n for n in wf["nodes"] if n["name"] not in drop]
    wf["connections"] = {s: o for s, o in wf["connections"].items() if s not in drop}
    for outs in wf["connections"].values():
        for br in outs["main"]:
            br[:] = [c for c in br if c["node"] not in drop]
    to = lambda name: {"node": name, "type": "main", "index": 0}
    # Rewire around what was removed, so nothing that could touch our API or a buyer remains.
    wf["connections"]["2 · Is this a paid 12 order?"]["main"] = [[to("3 · The engine (lucky-12.js)")]]
    wf["connections"]["8 · Passed?"]["main"][0] = [to("10 · Build the HTML")]
    wf["connections"]["8a · First failure?"]["main"] = [[to("8c · Go round again")], [to("10 · Build the HTML")]]
    wf["connections"]["12 · Upload to Supabase Storage"] = {"main": [[to("13a · Get signed URL")]]}
    if not storage:
        for n in wf["nodes"]:
            if n["name"].startswith(("12 ·", "13a ·")):
                n["disabled"] = True
    fixture = json.dumps(fixture_item(which), ensure_ascii=False, indent=2)
    wf["nodes"] += [
        # Two doors into the same fixture. MANUAL is for a human. SCHEDULE exists because this
        # instance won't register a webhook on an API activation, so a script has no other way
        # to start a run (02, 2026-09-07). ⛔ It fires every minute while active: never leave it armed.
        {"parameters": {}, "id": "T0m", "name": "T0 · press Execute (manual test)",
         "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [-840, 180]},
        {"parameters": {"rule": {"interval": [{"field": "cronExpression", "expression": "0 * * * * *"}]}},
         "id": "T0", "name": "T0 · tick (test drive only)",
         "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2, "position": [-840, 420]},
        {"parameters": {"jsCode": "// ⛔ TEST DRIVE ONLY. An invented buyer, what the webhook + intake would carry.\n"
                                  "return [{ json: " + fixture + " }];"},
         "id": "T1", "name": "T1 · the fixture session", "type": "n8n-nodes-base.code",
         "typeVersion": 2, "position": [-620, 300], "notesInFlow": True,
         "notes": "Invented buyer. Edit name, date, created or c here for another test. Same name + date + order day = same numbers."},
    ]
    wf["connections"]["T0 · press Execute (manual test)"] = {"main": [[to("T1 · the fixture session")]]}
    wf["connections"]["T0 · tick (test drive only)"] = {"main": [[to("T1 · the fixture session")]]}
    wf["connections"]["T1 · the fixture session"] = {"main": [[to("2 · Is this a paid 12 order?")]]}
    if manual_only:
        wf["nodes"] = [n for n in wf["nodes"] if n["name"] != "T0 · tick (test drive only)"]
        wf["connections"].pop("T0 · tick (test drive only)", None)
    return wf

def out_name(testdrive, which, manual_only):
    if not testdrive: return "12-fulfilment.n8n.json"
    return f"12-fulfilment-{'MANUAL' if manual_only else 'TESTDRIVE'}-{which.upper()}.n8n.json"

def write(testdrive, which, manual_only, storage):
    wf = build()
    if testdrive: wf = make_testdrive(wf, which, manual_only, storage)
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, out_name(testdrive, which, manual_only))
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"    {len(wf['nodes']):2d} nodes → build/{os.path.basename(out)}")

if __name__ == "__main__":
    print(f"\n  12 · Lucky Numbers — fulfilment")
    if "--all" in sys.argv:
        write(False, None, False, False)
        for w in ("testina", "faketta"):
            write(True, w, False, False)
            write(True, w, True, False)
    else:
        write("--testdrive" in sys.argv, FIXTURE, "--manual-only" in sys.argv, "--storage" in sys.argv)
    print(f"    {MODEL_WRITE} writes (effort {EFFORT_WRITE}), {MODEL_GRADE} grades (effort {EFFORT_GRADE})")
    print(f"    {len(SPEC['segments'])} act calls + 1 grade · bump page drawn by code when bought\n")
