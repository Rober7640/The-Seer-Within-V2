#!/usr/bin/env python3
"""Generate 11's fulfilment workflow (The Unsent Letter) as importable n8n JSON.

    python3 scripts/build-11-n8n.py                          # live build (delivery half is a stub)
    python3 scripts/build-11-n8n.py --testdrive              # no path to a buyer · get-you-back fixture
    python3 scripts/build-11-n8n.py --testdrive --fixture giving   # the giving-it-back fixture

    flags: --openai (accepted, it's the only provider) · --model <id> · --grader <id>
           --effort <low|medium|high|xhigh|max> · --order <id> · --manual-only · --storage

⛔ EDIT THIS FILE AND 11-acts.json, NEVER THE JSON. build/*.n8n.json are build artefacts.

Forked from docs/02/n8n/scripts/build-02-n8n.py on origin/02-fulfillment (02 stays untouched).
What is kept from 02, because each one cost a real execution to learn: the node helpers, the
one-parser model reply, refusal and truncation guards, the grader that fails open loudly with
measured contract overrides, regenerate-once with the same cards, the loop reset, the bounded
format retry, PDFShift at Letter, the testdrive trigger pair, and "never activates".

WHAT 11 DOES DIFFERENTLY FROM 02
  1. NUMBERS FROM THE ORDER. Birth name + date come off be_order_intake (never Stripe). Node 3
     runs the same sums as server/lib/numerologyEngine.ts. check-11-numbers.mjs proves it.
  2. NO JOINER. A short story plan comes first, then the reading is written IN ORDER, one call
     per act, each call handed everything already written. 02 wrote twelve blind notes and then
     joined them, which is what gave it its formula. 11-P1-plan §10 bans twelve calls; five
     calls (acts) is the decision. Change `segments` in 11-acts.json to change the grain.
  3. THE NUMBER DECIDES THE ANSWER. Fork, excuse, reason and every row come from code. The
     model writes them, it never picks them. The grader is handed them to check.
  4. RULES ARE SCOPED. OpenAI models apply a rule to EVERY section (02's long-brief result), so
     VOICE holds only what is true everywhere, and each per-section rule sits in that section's
     brief. Rotations are seeded off the order id so no two buyers get the same shape.
  5. NO QUOTED EXAMPLES in a prompt: measured on 02, they come back verbatim.

MODEL
  gpt-6.1-sol, writer and grader. ID confirmed from OpenAI's docs. Still unproven: that our
  account can use it (first call proves it), and that this model accepts `max_completion_tokens`
  and the `json_schema` response_format exactly as 02 sends them. The docs don't fully confirm
  either. Effort must be one of low/medium/high/xhigh/max. Never send temperature, top_p,
  logprobs or top_logprobs.
"""
import json, os, sys

_HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = json.load(open(os.path.join(_HERE, "11-acts.json"), encoding="utf-8"))
OUT_DIR = os.path.join(_HERE, "../build")

# ─── flags ─────────────────────────────────────────────────────────────────────
def flag(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

KNOWN = {"--openai", "--testdrive", "--fixture", "--model", "--grader", "--effort",
         "--order", "--manual-only", "--storage"}
_unknown = [a for a in sys.argv[1:] if a.startswith("--") and a not in KNOWN]
if _unknown:
    raise SystemExit(f"\n  ⛔ unknown flag(s): {' '.join(_unknown)}\n")
FIXTURE = flag("--fixture", "getback")
if FIXTURE not in ("getback", "giving"):
    raise SystemExit(f"\n  ⛔ --fixture must be getback or giving, not {FIXTURE!r}\n")
if "--fixture" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("\n  ⛔ --fixture only applies to --testdrive.\n")
if "--manual-only" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("\n  ⛔ --manual-only requires --testdrive.\n")

EFFORTS = ("low", "medium", "high", "xhigh", "max")
MODEL_WRITE = flag("--model", "gpt-6.1-sol")
MODEL_GRADE = flag("--grader", MODEL_WRITE)
EFFORT_WRITE = flag("--effort", "high")
EFFORT_GRADE = "low"     # 02: a yes/no checklist at high effort spends its budget and returns blank
if EFFORT_WRITE not in EFFORTS:
    raise SystemExit(f"\n  ⛔ --effort must be one of {', '.join(EFFORTS)}\n")
CEILING_WRITE = 32000    # reasoning comes out of this too. A bigger ceiling only moves the wall.
CEILING_PLAN  = 16000
CEILING_GRADE = 16000

# ─── the contract with the rest of the codebase ────────────────────────────────
STRIPE_PRODUCT = SPEC["offer"]["stripe_product"]    # shared/backendOffers.ts
OFFER_KEY      = SPEC["offer"]["key"]
DELIVERED_TAG  = SPEC["offer"]["delivered_tag"]     # server/lib/backendCustomerList.ts
AWEBER_ACCOUNT = "442730"
AWEBER_LIST    = "6972552"                          # backendCustomerList.ts initialListId: every 11 buyer is on it
APP_BASE_URL   = "https://TODO-set-app-base-url"    # ⚠ TODO live build
SUPABASE_PROJ  = "https://pqolqzddzxubquukxnhk.supabase.co"
SUPABASE_BUCKET= "analysis_pdf"
S3             = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/"
OPENAI_URL     = "https://api.openai.com/v1/chat/completions"

# Credentials by ID. ⛔ n8n matches on the id; the name is a label. No key is ever in this file.
OPENAI_CRED    = {"id": "de6vaPn0hPs3icyh", "name": "OpenAi account"}
PDFSHIFT_CRED  = {"id": "8TelHH6oJEzYzw2r", "name": "pdfshift-header-auth"}
SUPABASE_CRED  = {"id": "Xu3vjsJHaiLZ1ILQ", "name": "wealth-scriba-customer-report-generator"}
AWEBER_CRED    = {"id": "InacwW76ep6ltnUU", "name": "Aweber for Heart Readr"}

# ─── the voice: ONLY rules that hold for every section ─────────────────────────
VOICE = """You are Evelyn Cross, a working tarot reader, writing one woman's paid reading, The Unsent Letter. It is one long letter from you to her. She sat with you for a reading once. She read your first letter, so she already believes the deck works. What she's testing now is whether these twelve cards were laid for her.

HOW TO USE THESE RULES
Everything in this block holds for the whole reading. A rule that belongs to one card is in that card's brief and goes nowhere else. If a brief gives a count, that count is for the reading or the section it names, so don't spread it further.

YOUR VOICE
Tough love, from someone on her side. The hard thing comes first, then why. You're never vague and you never hedge. Each answer is one flat answer. The words perhaps, may, energy, journey and the universe are not in your vocabulary. Neither are I feel, I sense, it seems, or the cards suggest.
You hit what she does, never who she is. You never blame her for what was done to her. What they did is on them, every bit of it. What she's done since is hers, and that's the part you press on.
You talk. Use contractions about as often as a woman talking at her kitchen table. Use short, common words. Use sentences of different lengths and paragraphs of different lengths. Don't balance clauses against each other. Don't write sayings or neat turns. Don't hang a tail of extra description on the end of a sentence. Don't start a paragraph on a bare It, That or This when nothing has been named yet. Use things she could point at, not idea-words. Never make her stop and work out what your own wording means.
Your own night can sound like you. Anything that's put in her mouth or her daily life uses plain American words, dollars, and American dates.

HER LIFE
You know nothing about her life except the facts you're handed. What you say about her life stays at the level of common behaviors, stated flat. The test: could a hundred women each point at something different and all be right? If only a woman with one exact object, job, place, family or event can say yes, you've guessed, so cut it. Never say how long it's been since it ended. Say a long time.

THE PERSON
Use they, them and their for this person, always. Never give them a gender, a job, a look or a place. No word for what they were to her: no ex, husband, boyfriend, partner, friend, or lover.
They are alive. They never turn up in this reading, on any path. She's never told to expect them.
You never tell her to contact them, answer them, look them up, wait for them or forgive them.

THE CARDS
Each card opens up as a picture before it's a meaning: say plainly what she can see, then what it means. Describe only what's on the list you're given for that card. If it isn't listed, it isn't on the card. Each card's meaning comes from what the section needs, and you don't explain tarot.
The twelve are new. The Hermit, Judgement and the Devil are on your windowsill, so they never fall in this spread. Don't marvel at the cards or call anything rare.

WHAT NEVER APPEARS
How you got what you know about her. You were given it from her birth name and date, and that's all she ever hears. No word about numbers, letters of her name, vowels, or sums.
Past clients. No other woman's story, by name or without one.
How long the writing took, in hours or nights.
Headings, titles, lists with bullets, or the word house.
"""

EMAIL_SAID = """WHAT YOUR FIRST LETTER TOLD HER (facts for you, so you can pay them off. Don't retell them.)
Someone from her past came to you uninvited, with no face and no voice, and her name came with them. It was heavy, all regret and things unsaid. They've been at this for months, and they don't know they're doing it, the way people talk in their sleep. They left with something of hers, and it wasn't an object. She had it before them and hasn't had it since. She'd have a guess and most women guess wrong. They've still got it: they didn't lose it or throw it away.
The Hermit's lantern was what they took. Judgement was the call, and you left a fork open: they're giving it back, or they're using it to get her back. The Devil was the pull, its chains are loose, it's strongest when the message gets close, and within five to seven days it shows. That window is about her, never about them.
You told her she doesn't really miss them, she misses what they left with, that it comes back through the message and not through contact or time, and that it comes back when she reads it. You said twelve new cards carry twelve parts of the message in four rows of three, and it only comes back whole. You said you write it out yourself. You said the one thing to stop and the one thing to do are in the last of her twelve. You promised the rereading stops, and that the next time someone reaches for her, there's someone there.
Short phrases from that letter can come back as callbacks where a brief says so. Don't repeat its sentences or its pictures."""

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

def prose_body(model, effort, ceiling):
    # The system block goes first and is byte-identical on every call: OpenAI caches a shared prefix.
    return ("={\n"
      f'  "model": "{model}",\n'
      f'  "max_completion_tokens": {ceiling},\n'
      f'  "reasoning_effort": "{effort}",\n'
      '  "messages": [\n'
      '    { "role": "system", "content": {{ JSON.stringify($json.voice) }} },\n'
      '    { "role": "user",   "content": {{ JSON.stringify($json.prompt) }} }\n'
      '  ]\n'
      "}")

def schema_body(model, effort, ceiling, schema_name, schema):
    return ("={\n"
      f'  "model": "{model}",\n'
      f'  "max_completion_tokens": {ceiling},\n'
      f'  "reasoning_effort": "{effort}",\n'
      '  "response_format": { "type": "json_schema", "json_schema": {\n'
      f'      "name": "{schema_name}", "strict": true,\n'
      f'      "schema": {json.dumps(schema, ensure_ascii=False)} }} }},\n'
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

# ─── 3 · numbers, flat answers, the deal, the rotations ────────────────────────
_POOL = sorted(set(SPEC["cards"]) - set(SPEC["excluded"]))
if len(_POOL) != 19:
    raise SystemExit(f"\n  ⛔ the pool must be 19 cards, got {len(_POOL)}.\n")
for _act, _cards in SPEC["pools"].items():
    _bad = [c for c in _cards if c not in _POOL]
    if _bad: raise SystemExit(f"\n  ⛔ pool {_act} holds cards outside the 19: {_bad}\n")
_SECTION_ORDER = [x for s in SPEC["segments"] for x in s["sections"]]
if [str(x) for x in _SECTION_ORDER] != ["opening"] + [str(i) for i in range(1, 13)] + ["letter", "close"]:
    raise SystemExit("\n  ⛔ `segments` must cover opening, 1-12, letter, close, in that order.\n")
if not set(str(x) for x in _SECTION_ORDER) == set(SPEC["sections"]):
    raise SystemExit("\n  ⛔ `sections` and `segments` disagree.\n")

_CARDS_FOR_RUN = {k: {"name": v["name"], "plain": v["plain"],
                      "drawn": (v.get("drawn") or
                                (v["drawn_cropped"] if SPEC["death_crop"] else v["drawn_full"]))}
                  for k, v in SPEC["cards"].items()}
_RUNTIME = {k: SPEC[k] for k in ("pools", "deal_rules", "acts", "segments", "sections", "soul_urge",
                                 "expression", "life_path", "flat", "devices", "art_links",
                                 "target_words", "floor_words", "ceiling_words", "letter_words",
                                 "death_crop")}
_RUNTIME["cards"] = _CARDS_FOR_RUN
SPEC_JSON = json.dumps(_RUNTIME, ensure_ascii=False)

DRAW_JS = r"""
// Everything that is decided here is decided by code: same buyer, same numbers, same answers,
// same cards. The model never picks any of this. It only writes it.
const inp = $input.first().json;
const S = __SPEC__;

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
// 11-C1: with no ?fn= she is "dear" everywhere. Never the name on the card.
const firstName = (intake.firstName || '').trim() || null;
const order = {
  order_id: s.id, email, first_name: firstName, birth_name: birthName,
  paid_at: new Date((s.created || 0) * 1000).toISOString(),
  bump: md.bump === '1' || !!md.bumpProduct, c: md.c || null,
};

const seedOf = (str) => { let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h; };
const shuffleWith = (values, seed) => { const out = values.slice(); let st = seed;
  const rnd = () => { st = (Math.imul(st, 1103515245) + 12345) >>> 0; return (st >>> 8) / 16777216; };
  for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1));
    [out[i], out[k]] = [out[k], out[i]]; }
  return out; };

// ── the numbers: same sums as server/lib/numerologyEngine.ts ─────────────────
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
// The engine gives 0 for a name with no a/e/i/o/u, or written in another alphabet. A buyer must
// still get a reading. Y counts as the vowel if there is one; otherwise a stable pick off her name.
if (!su) { su = reduce(letters.reduce((a, l) => a + (l === 'y' ? LV.y : 0), 0)); number_fallback = true; }
if (!su) su = 1 + (seedOf(birthName + '|su') % 9);
if (!ex) { ex = 1 + (seedOf(birthName + '|ex') % 9); number_fallback = true; }
const one = (n) => ({ 11: 2, 22: 4, 33: 6 }[n] || n);    // §5: brought to one digit for the sums only
const row = S.soul_urge[String(su)];
const fork = (one(su) + one(ex) + one(lp)) % 3 === 0 ? 'get_back' : 'giving';
const answers = {
  took: row.took, took_word: row.word, cover: row.cover, regret: row.regret, unsaid: row.unsaid,
  do: row.do, safety: row.safety || null,
  saw: S.expression[String(ex === 33 ? 6 : ex)],
  pattern: S.life_path[String(lp === 33 ? 6 : lp)],
  fork, excuse: S.flat.excuse[String(one(ex) % 3)], reason: S.flat.reason[String(one(lp) % 3)],
};

// ── the deal: shuffled inside each act, seeded by her name and date ──────────
const clean = birthName.toLowerCase().replace(/[^a-z]+/g, ' ').trim() + '|' + dob;
const dealSeed = (tag) => seedOf(clean + '|deal|' + tag);
const used = new Set(), laid = {};
const take = (house, cards) => { const c = cards.find((x) => !used.has(x));
  if (!c) throw new Error(`deal starved at house ${house}`);
  used.add(c); laid[house] = c; };
const R = S.deal_rules, DEATH = 'death';
const allowed = (c, h) => c !== DEATH || R.death_only_at.includes(h);
for (const key of R.order) {
  const act = S.acts.find((a) => a.key === key);
  const pool = shuffleWith(S.pools[key], dealSeed(key));
  // Tight rooms first, so a must-have card is never spent on a free room in the same act.
  const houses = act.houses.slice().sort((a, b) => (R.must[b] ? 1 : 0) - (R.must[a] ? 1 : 0) || a - b);
  for (const h of houses) {
    const list = R.must[h] ? pool.filter((c) => R.must[h].includes(c)) : pool;
    take(h, list.filter((c) => allowed(c, h)));
  }
}
const deal = Object.keys(laid).map(Number).sort((a, b) => a - b).map((h) => ({
  house: h, card: laid[h], card_name: S.cards[laid[h]].name, house_name: S.sections[String(h)].name,
  act: S.acts.find((a) => a.houses.includes(h)).key,
}));
const down = new Set(deal.map((d) => d.card));
const links = S.art_links.filter((l) => down.has(l.a) && (!l.b || down.has(l.b))).slice(0, 4);

// ── the rotations: off the order id, so two buyers never share a shape ───────
const oid = String(order.order_id || 'no-order');
const devShuffle = (values, tag) => shuffleWith(values, seedOf(oid + '|device|' + tag));
const D = S.devices;
const houses = Array.from({ length: 12 }, (_, i) => i + 1);
// §8 says no two opening styles alike in a row. §3 makes 1, 9 and 10 flat answers, so 9 → 10 is
// the one allowed repeat.
const FORCED_FLAT = houses.filter((h) => S.sections[String(h)].bold && h !== 12);
const opening = {};
for (const h of houses) {
  if (FORCED_FLAT.includes(h)) { opening[h] = 'flat'; continue; }
  opening[h] = devShuffle(Object.keys(D.openings), 'open' + h).find((o) =>
    o !== opening[h - 1] && !(FORCED_FLAT.includes(h + 1) && o === 'flat'));
}
const noneAt = devShuffle(D.none_eligible, 'none').slice(0, D.none_min);
const FIXED_MOMENT = { 3: 'end', 12: 'end' };
const moment = {};
for (const h of houses) {
  if (noneAt.includes(h)) { moment[h] = 'none'; continue; }
  moment[h] = FIXED_MOMENT[h] || devShuffle(['before', 'after', 'end'], 'moment' + h)
    .find((m) => m !== moment[h - 1] && m !== FIXED_MOMENT[h + 1]);
}
const FIXED_END = { 7: 'paper', 8: 'paper', 12: 'hand-over' };
const ending = {};
let stops = 0;
for (const h of houses) {
  if (FIXED_END[h]) { ending[h] = FIXED_END[h]; continue; }
  const e = devShuffle(['stop', 'do', 'phrase', 'catch'], 'end' + h)
    .find((x) => x !== ending[h - 1] && (x !== 'stop' || stops < D.stop_cap));
  ending[h] = e; if (e === 'stop') stops += 1;
}
const listHouse = devShuffle(D.list_houses, 'list')[0];
const dearHouses = S.acts.slice(0, 3).map((a, i) => devShuffle(a.houses, 'dear' + i)[0]);
const nameKeys = ['opening', ...houses.map(String), 'letter', 'close'];
const names = Object.fromEntries(nameKeys.map((k) => [k, 1]));
devShuffle(houses.map(String), 'names').slice(0, D.name_uses_total - nameKeys.length)
  .forEach((k) => { names[k] += 1; });
// Balanced jitter, re-rolled until no three neighbours land within 20 words (§8).
const BASE = houses.map((h) => S.sections[String(h)].words);
let jit = [];
for (let t = 0; t < 40; t++) {
  const offs = devShuffle([-30, -20, -20, -10, -10, 0, 0, 10, 10, 20, 20, 30], 'jitter' + t);
  const w = BASE.map((b, i) => b + offs[i]);
  const flat3 = w.some((_, i) => i > 1 &&
    Math.max(w[i], w[i - 1], w[i - 2]) - Math.min(w[i], w[i - 1], w[i - 2]) <= 20);
  jit = offs; if (!flat3) break;
}
const words = { opening: S.sections.opening.words, letter: S.sections.letter.words,
  close: S.sections.close.words };
houses.forEach((h, i) => { words[h] = BASE[i] + jit[i]; });
const devices = {
  opening, moment, ending, words, names, list_house: listHouse, dear_houses: dearHouses,
  callback_houses: D.callback_houses, card8_place: devShuffle(D.card8_place, 'place')[0],
  drink: devShuffle(D.drink, 'drink')[0], swears_at: devShuffle(D.swears_at, 'swear')[0],
  prop: devShuffle(D.prop, 'prop')[0],
};

return [{ json: { ...order, numbers: { su, ex, lp, number_fallback }, answers, deal, links, devices,
  dob_iso: dob, attempt: 1, target_words: S.target_words } }];
""".replace("__SPEC__", SPEC_JSON)

# ─── shared fact block for the plan and the writer ─────────────────────────────
FACTS_JS = r"""
const factsOf = (j) => {
  const a = j.answers;
  const forkLine = a.fork === 'get_back' ? 'They are trying to get her back.' : 'They are giving it back.';
  return [
    `WHO THIS IS FOR`,
    j.first_name ? `Her first name: ${j.first_name}.` : `You don't have her first name. Call her dear, and ignore any rule below that says to use her name.`,
    `Her full birth name: ${j.birth_name}. Her date of birth, for the sheet on your table: ${j.dob_words}.`,
    ``,
    `WHAT THE CARDS GAVE YOU. These are settled. You write them, you don't choose them.`,
    `What they took: ${a.took}.`,
    `Her cover word, what she calls the gap now: "${a.cover}".`,
    `What they saw in her: ${a.saw}.`,
    `Her pattern when she's hurt: she ${a.pattern}.`,
    `What they regret: ${a.regret}.`,
    `The sentence left unsaid: "${a.unsaid}"`,
    `The excuse that let them off: "${a.excuse}"`,
    `The fork: ${forkLine}`,
    `Will they act: no, because of ${a.reason}.`,
    `Should she answer: no. She doesn't need to. It's already back.`,
    `Her seven-day practice: ${a.do}`,
    ``,
    `THE CARDS, IN THE ORDER YOU TURN THEM`,
    ...j.deal.map((d) => `${d.house}. ${d.card_name}`),
    ``,
    `YOUR NIGHT: ${j.devices.drink} in the pot; ${j.devices.prop} in the room; at card 8 you go to ${j.devices.card8_place}; at card 9 you swear at ${j.devices.swears_at}. Use each of these once. Time only moves forward: evening, midnight, three in the morning, grey window, full light.`,
  ].join('\n');
};
const dobWords = (iso) => { const [y, m, d] = iso.split('-').map(Number);
  const M = ['January','February','March','April','May','June','July','August','September',
             'October','November','December'];
  return `${M[m - 1]} ${d}, ${y}`; };
"""

PLAN_JS = FACTS_JS + r"""
const j = { ...$input.first().json };
const S = __SPEC__;
j.dob_words = j.dob_words || dobWords(j.dob_iso);
const sectionNotes = ['opening', ...Array.from({ length: 12 }, (_, i) => String(i + 1)), 'letter'].map((k) => {
  const sec = S.sections[k];
  const night = sec['night_' + j.answers.fork] || sec.night || '';
  const d = j.deal.find((x) => String(x.house) === k);
  return `${k}${d ? ` (${d.card_name})` : ''}: ${sec.name}. ${night}`;
}).join('\n');
const cards = j.deal.map((d) => `${d.house}. ${d.card_name}: ${S.cards[d.card].drawn.join('; ')}`).join('\n');
const links = j.links.length
  ? j.links.map((l) => '  · ' + l.note).join('\n')
  : '  · none on this deal';
const prompt = [
  factsOf(j),
  ``,
  `WHAT'S ON EACH CARD`,
  cards,
  ``,
  `THE NIGHT, WHICH IS FIXED AND HAPPENS IN THIS ORDER`,
  sectionNotes,
  ``,
  `LINKS BETWEEN CARDS THAT ARE BOTH DOWN (the only ones that exist on this deal)`,
  links,
  ``,
  `YOUR JOB NOW`,
  `Before you write a word to her, plan this one reading as a single story told in the order it happened. Each section has to lean on the one before it, so that no two could swap places.`,
  `Return notes for yourself, never sentences for the page. Keep each field under 25 words.`,
  `through_line: the one movement of this reading from first card to last, for this buyer.`,
  `For each section: picture_detail is the thing on that card that carries the section (from its list; for opening and letter, write none). what_happens is how that picture delivers this section's job for this buyer. leans_on is what it takes from the section before. hands_on is what it leaves for the next one.`,
  `art_links: which of the listed links you'll use and where. Use three or four if that many exist. Use none that isn't listed.`,
].join('\n');
return [{ json: { ...j, voice: __VOICE__, prompt } }];
""".replace("__SPEC__", SPEC_JSON).replace("__VOICE__", json.dumps(VOICE + "\n" + EMAIL_SAID, ensure_ascii=False))

PLAN_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "through_line": {"type": "string"},
        "sections": {"type": "array", "items": {
            "type": "object", "additionalProperties": False,
            "properties": {"section": {"type": "string"}, "picture_detail": {"type": "string"},
                           "what_happens": {"type": "string"}, "leans_on": {"type": "string"},
                           "hands_on": {"type": "string"}},
            "required": ["section", "picture_detail", "what_happens", "leans_on", "hands_on"]}},
        "art_links": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["through_line", "sections", "art_links"],
}

KEEP_PLAN_JS = REPLY_JS + r"""
const j = $('3a · Compose the story plan').first().json;
const SEGMENTS = __SEGMENTS__;
if (refused) throw new Error(`story plan: model declined (${_c.message && _c.message.refusal || 'no reason'})`);
if (stop === 'max_tokens') throw new Error('story plan: hit the token ceiling. Lower the effort.');
let plan;
try { plan = JSON.parse(say); } catch (e) { throw new Error('story plan: reply was not JSON'); }
const want = ['opening', ...Array.from({ length: 12 }, (_, i) => String(i + 1)), 'letter'];
const have = new Set((plan.sections || []).map((x) => String(x.section).toLowerCase()));
const missing = want.filter((k) => !have.has(k));
if (missing.length) throw new Error(`story plan: missing sections ${missing.join(', ')}`);
const { voice, prompt, ...rest } = j;
return SEGMENTS.map((segment, i) => ({ json: { ...rest, story_plan: plan, segment,
  index: i + 1, total: SEGMENTS.length } }));
""".replace("__SEGMENTS__", json.dumps(SPEC["segments"], ensure_ascii=False))

# ─── 4a · the act prompt ───────────────────────────────────────────────────────
ACT_JS = FACTS_JS + r"""
const j = $input.first().json;
const S = __SPEC__;
const a = j.answers, dev = j.devices, fork = j.answers.fork;
const ORD = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];

// ── everything already written, this attempt only ────────────────────────────
// ⛔ A regeneration must not show the writer the failed draft, so runs are filtered by attempt.
// Node 4z is the one node both the normal and the retry path pass through, so its run index is
// the count of finished segments. A gap here would silently break "sees what came before", so
// it throws instead.
const earlier = [];
for (let r = 0; r < $runIndex; r++) {
  try {
    for (const it of $('4z · Rejoin').all(0, r)) {
      if (it.json.attempt === j.attempt) earlier.push(it.json);
    }
  } catch (e) { /* run r not reached */ }
}
earlier.sort((x, y) => x.index - y.index);
if (earlier.length !== j.index - 1) {
  throw new Error(`act ${j.segment.id}: expected ${j.index - 1} earlier segments, found ${earlier.length}`);
}
const sectionTitle = (k) => { if (k === 'opening') return 'THE OPENING'; if (k === 'letter') return 'THE LETTER';
  if (k === 'close') return 'THE CLOSE'; const d = j.deal.find((x) => x.house === k);
  return `THE ${ORD[k - 1].toUpperCase()} CARD, ${d.card_name}`; };
const soFar = earlier.flatMap((e) => e.parts).map((p) => `${sectionTitle(p.key)}\n${p.text}`).join('\n\n');

const fill = (t) => String(t || '').replace('{took}', a.took).replace('{excuse}', a.excuse)
  .replace('{regret}', a.regret).replace('{unsaid}', a.unsaid);
const planOf = (k) => j.story_plan.sections.find((x) => String(x.section).toLowerCase() === String(k)) || {};
const nameLine = (k) => j.first_name
  ? (k === 'opening' || k === 'letter'
      ? `Her name: on its own line at the very start${dev.names[k] > 1 ? ', and once more inside a sentence' : ''}.`
      : `Her name: ${dev.names[k]} time${dev.names[k] > 1 ? 's' : ''} in this section, inside a sentence, never as the first word.`)
  : `Her name: you don't have it. Say dear.`;
const dearLine = (h) => dev.dear_houses.includes(h)
  ? `The word dear: once in this section.` : `The word dear: not in this section.`;

const brief = (k) => {
  const sec = S.sections[String(k)];
  const lines = [`[${k === 'opening' ? 'OPENING' : k === 'letter' ? 'LETTER' : k === 'close' ? 'CLOSE' : 'CARD ' + k}]  ${sectionTitle(k)}`];
  lines.push(`Target: about ${dev.words[k]} words${k === 'letter' ? `, and it must stay between ${S.letter_words.min} and ${S.letter_words.max}` : ''}.`);
  lines.push(`Job: ${sec.job}`);
  if (sec['job_' + fork]) lines.push(`On this buyer's path: ${sec['job_' + fork]}`);
  const answer = fork === 'get_back' ? (sec.answer_get_back || sec.answer) : (sec.answer_giving || sec.answer);
  if (answer) lines.push(`The answer that goes in the first lines: ${fill(answer)}`);
  if (sec.voice) lines.push(`Their voice: ${sec.voice}`);
  if (typeof k === 'number') {
    const d = j.deal.find((x) => x.house === k);
    const card = S.cards[d.card];
    lines.push(`On the card, and only this: ${card.drawn.join('; ')}.`);
    lines.push(`What the card means, for you and not for quoting: ${card.plain}.`);
    if (d.card === 'death') lines.push(`This is Death. The first thing you say, before the picture, is that nobody's died, and that this is someone living, as you said at the start.`);
    if (sec.stop) lines.push(sec.stop, sec.do, sec.warnings, sec.cover_retired, sec.promise);
    if (k === 12 && a.safety) lines.push(a.safety);
    if (sec.paper) lines.push(`Pen and paper: ${sec.paper}`);
    if (k === dev.list_house) lines.push(`Layout: in this section only, give the behaviors one to a line, five or six short lines, each its own paragraph.`);
    const night = sec['night_' + fork] || sec.night;
    if (dev.moment[k] !== 'none') {
      lines.push(`At the table: ${night}`);
      lines.push(S.devices.moments[dev.moment[k]]);
    } else lines.push(S.devices.moments.none);
    if (sec.answer || sec.answer_giving) lines.push(`How to say the answer: ${S.devices.openings[dev.opening[k]]}. The answer stays in the first sentence or two either way.`);
    else if (k !== 12) lines.push(`How the hard line opens: ${S.devices.openings[dev.opening[k]]}.`);
    if (k !== 12) lines.push(S.devices.ends[dev.ending[k]]);
    lines.push(sec.bold
      ? `Bold: ${k === 12 ? 'only the two labels' : 'only the answer sentence'}, in **double asterisks**.`
      : `Bold: none in this section.`);
    lines.push(dev.callback_houses.includes(k)
      ? `Callback: you may remind her once that you told her something in your first letter (${sec.closes}).`
      : `Callback: don't say "I told you" in this section.`);
    lines.push(dearLine(k));
  } else if (sec.night) {
    lines.push(`At the table: ${sec.night}`);
  }
  if (k === 'opening') lines.push(`You must use this sentence word for word: ${sec.exact[0]}.`, `The phrase this is someone living must appear, and so must the words you owe them no reply, or close to them.`, sec.applies);
  if (k !== 'close') lines.push(nameLine(k));
  if (k === 'close') lines.push(`Her name: once, in the first line.`);
  const p = planOf(k);
  if (p.what_happens) lines.push(`Your plan notes: ${p.what_happens} Leans on: ${p.leans_on} Leaves: ${p.hands_on}`);
  return lines.filter(Boolean).join('\n');
};

const secs = j.segment.sections;
const total = secs.reduce((n, k) => n + dev.words[k], 0);
const planHead = [
  `YOUR STORY PLAN. Notes to yourself. None of these words go on the page.`,
  `Through line: ${j.story_plan.through_line}`,
  j.story_plan.art_links.length ? `Links you planned: ${j.story_plan.art_links.join(' · ')}` : '',
  j.links.length ? `Links that exist on this deal, so use no other: ${j.links.map((l) => l.note).join(' ')}` : `No card links exist on this deal, so don't draw any.`,
].filter(Boolean).join('\n');

const prompt = [
  factsOf(j),
  ``,
  planHead,
  ``,
  soFar ? `WHAT YOU'VE ALREADY WRITTEN TO HER. She's read all of this. Carry straight on from it. Don't repeat what it says, and don't reuse how its sections open or end.\n\n${soFar}` : `Nothing is written yet. This is the start of the reading.`,
  ``,
  `NOW WRITE ${j.segment.label.toUpperCase()}. About ${total} words in all. Stay within ten percent: she's paying for the length and each section needs its room.`,
  secs.every((k) => typeof k === 'number')
    ? `This part of the story: ${S.acts.find((x) => x.houses.includes(secs[0])).name}. ${S.acts.find((x) => x.houses.includes(secs[0])).truth}` : '',
  ``,
  secs.map(brief).join('\n\n'),
  ``,
  `FORMAT`,
  `Put each section's marker on its own line, exactly as shown in square brackets, and the section straight under it: ${secs.map((k) => k === 'opening' ? '[OPENING]' : k === 'letter' ? '[LETTER]' : k === 'close' ? '[CLOSE]' : `[CARD ${k}]`).join(' ')}.`,
  `The page prints each card's title, so write no title or heading of your own. Plain paragraphs, with a blank line between them. Nothing before the first marker and nothing after the last section.`,
].filter((x) => x !== '').join('\n');

return [{ json: { ...j, voice: __VOICE__, prompt } }];
""".replace("__SPEC__", SPEC_JSON).replace("__VOICE__", json.dumps(VOICE + "\n" + EMAIL_SAID, ensure_ascii=False))

KEEP_PROSE_JS = REPLY_JS + r"""
const brief = $('4 · Each act').first().json;
const seg = brief.segment;
// A FORMAT error is the only kind node 4r retries, once, with the same prompt.
if (refused) throw new Error(`act ${seg.id}: model declined (${_c.message && _c.message.refusal || 'no reason'})`);
const text = say.trim();
if (stop === 'max_tokens') throw new Error(`FORMAT act ${seg.id}: hit the token ceiling after ${text.split(/\s+/).filter(Boolean).length} words`);
if (!text) throw new Error(`FORMAT act ${seg.id}: no text (stop=${stop})`);
const keyOf = (m) => { const t = m.toUpperCase().replace(/\s+/g, ' ');
  if (t === 'OPENING') return 'opening'; if (t === 'LETTER') return 'letter'; if (t === 'CLOSE') return 'close';
  return Number(t.replace('CARD ', '')); };
const parts = [], pieces = text.split(/^[ \t]*\[(OPENING|LETTER|CLOSE|CARD\s+\d+)\][ \t]*$/gmi);
if (pieces[0].trim()) throw new Error(`FORMAT act ${seg.id}: text before the first marker`);
for (let i = 1; i < pieces.length; i += 2) {
  const body = pieces[i + 1].split('\n').filter((l) => !/^\s*(#{1,6}\s|---+\s*$|\*\*\*+\s*$)/.test(l))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
  parts.push({ key: keyOf(pieces[i]), text: body });
}
const got = parts.map((p) => String(p.key)).join(','), want = seg.sections.map(String).join(',');
if (got !== want) throw new Error(`FORMAT act ${seg.id}: sections ${got || 'none'}, expected ${want}`);
const empty = parts.filter((p) => !p.text).map((p) => p.key);
if (empty.length) throw new Error(`FORMAT act ${seg.id}: empty section(s) ${empty.join(', ')}`);
return [{ json: { ...brief, parts, prose: true } }];
"""

RETRY_JS = r"""
const error = $input.first().json.error;
const message = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
if (!/FORMAT/.test(message || '')) throw new Error(message || 'Act validation failed');
return [{ json: { ...$('4a · Compose the act prompt').first().json } }];
"""

# ─── 6 · assemble + measure. There is no joiner. ───────────────────────────────
ASSEMBLE_JS = r"""
const rows = $input.first().json.data;
const S = __SPEC__;
const attempt = Math.max(...rows.map((r) => r.attempt));
const j = rows.find((r) => r.attempt === attempt);
const parts = rows.filter((r) => r.attempt === attempt).sort((a, b) => a.index - b.index)
  .flatMap((r) => r.parts);
const ORDER = ['opening', ...Array.from({ length: 12 }, (_, i) => i + 1), 'letter', 'close'];
const got = parts.map((p) => String(p.key)).join(',');
if (got !== ORDER.join(',')) throw new Error(`assembly: sections ${got}`);
const marker = (k) => k === 'opening' ? '[OPENING]' : k === 'letter' ? '[LETTER]' : k === 'close' ? '[CLOSE]' : `[CARD ${k}]`;
const reading = parts.map((p) => `${marker(p.key)}\n${p.text}`).join('\n\n');

// ─── measured here, handed to the grader. It judges meaning; code does the arithmetic. ───
const a = j.answers, fork = a.fork, first = j.first_name;
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const plain = (t) => t.replace(/\*+/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
const sentencesOf = (t) => plain(t).split(/(?<=[.!?])["']?\s+/).map((s) => s.trim()).filter(Boolean);
const by = Object.fromEntries(parts.map((p) => [String(p.key), p.text]));
const P = Object.fromEntries(parts.map((p) => [String(p.key), plain(p.text)]));
const all = parts.map((p) => ({ key: p.key, text: plain(p.text) }));
const cards = all.filter((p) => typeof p.key === 'number');
const hits = (re, pool = all) => pool.flatMap((p) => sentencesOf(p.text).filter((s) => re.test(s))
  .map((s) => ({ section: p.key, sentence: s.slice(0, 200) })));
const count = (re, t) => (t.match(re) || []).length;
const firstWords = (t, n) => plain(t).split(/\s+/).slice(0, n).join(' ').toLowerCase();
const has = (t, needle) => plain(t).toLowerCase().includes(needle.toLowerCase());

const section_words = Object.fromEntries(parts.map((p) => [String(p.key), wc(p.text)]));
const words = parts.reduce((n, p) => n + wc(p.text), 0);
const cw = cards.map((p) => section_words[String(p.key)]);
const flat_triples = cw.flatMap((w, i) => i > 1 && Math.max(w, cw[i-1], cw[i-2]) - Math.min(w, cw[i-1], cw[i-2]) <= 20
  ? [`${i - 1}-${i + 1}`] : []);

const banned = hits(/\b(?:perhaps|may|energy|energies|journey|the universe|i feel|i sense|the cards suggest)\b/i);
const numerology = hits(/\b(?:numerolog\w*|soul urge|life path|expression number|destiny number|master number|vibration|vowels?|digits?|your number)\b/i);
const person_words = hits(/\b(?:your (?:ex|ex-\w+|husband|boyfriend|girlfriend|wife|fianc[eé]e?|partner|lover)|the man who|the woman who)\b/i);
const letter_gender = hits(/\b(?:he|him|his)\b/i, all.filter((p) => p.key === 'letter'));
const years = hits(/\byears?\b/i, all.filter((p) => p.key !== 8)).filter((h) => !/\bbest years\b/i.test(h.sentence));
const writing_time = hits(/\b(?:24 hours|twenty-four hours|a day and a night|a night and (?:a|the next) day)\b/i);
const clients = hits(/\b(?:marian|clients?|a woman (?:i|who came|came)|women (?:who come|i've read))\b/i);
const contact = hits(/\b(?:call|text|message|write to|email|reach out to|contact|look up|answer|forgive|wait for)\s+(?:them|their)\b/i)
  .filter((h) => !/\b(?:don't|do not|never|no|not|won't|nobody|nothing|without|stop|needn't)\b/i.test(h.sentence));
const turn_up = hits(/\b(?:they(?:'ll| will)|expect them|when they)\s+(?:come back|turn up|show up|call|reach out|write)\b/i)
  .filter((h) => !/\b(?:don't|do not|never|no|not|won't)\b/i.test(h.sentence));
const therapy = hits(/\b(?:closure|boundar(?:y|ies)|healing|trauma|toxic|narcissis\w*|attachment|self-care|self-love|self-worth)\b/i);
const british = hits(/\b(?:ring (?:me|you|them|her)|washing[- ]up|whilst|mum|fortnight|queue|lorry|flat(?:mate)?s?)\b/i)
  .filter((h) => !/\bflat\b/i.test(h.sentence) || /\bflatmate/i.test(h.sentence));
// Evelyn's own callbacks only. The letter is the other person talking, so it doesn't count.
const i_told_you = cards.reduce((n, p) => n + count(/\bI (?:told|said|showed) you\b/g, p.text), 0);
const name_uses = first ? count(new RegExp('\\b' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), plain(reading)) : 0;
const dear = count(/\bdear\b/gi, plain(reading));
const name_starts = first ? cards.filter((p) => new RegExp('^' + first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(p.text)).map((p) => p.key) : [];
const bold = parts.flatMap((p) => (p.text.match(/\*\*[^*]+\*\*/g) || []).map((b) => ({ section: p.key, text: b.replace(/\*/g, '') })));
const stop_ends = cards.filter((p) => { const ss = sentencesOf(p.text); return ss.length && /\bstop\b/i.test(ss[ss.length - 1]); }).length;

// Eight-word runs shared by two sections. The letter repeats the answers on purpose, and the
// no-reply line is required twice, so neither counts.
const seen = new Map();
for (const p of cards) {
  const toks = sentencesOf(p.text).filter((s) => !/owe them no reply|owe no reply/i.test(s)).join(' ')
    .toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const mine = new Set();
  for (let i = 0; i <= toks.length - 8; i++) mine.add(toks.slice(i, i + 8).join(' '));
  for (const g of mine) { if (!seen.has(g)) seen.set(g, []); seen.get(g).push(p.key); }
}
const repeated_8grams = [...seen.entries()].filter(([, v]) => v.length > 1)
  .map(([phrase, sections]) => ({ phrase, sections })).slice(0, 20);

const STOP = new Set(['you','were','and','the','was','i','to','it','a','that','your','of','in','me','my','made','never','what']);
const content = (s) => plain(s).toLowerCase().replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
const unsaidWords = content(a.unsaid);
const overlap = (t) => { const set = new Set(content(t)); return unsaidWords.length
  ? unsaidWords.filter((w) => set.has(w)).length / unsaidWords.length : 1; };

const deathAt = (j.deal.find((d) => d.card === 'death') || {}).house || null;
const contractions = count(/\b\w+'(?:s|t|re|ve|ll|d|m)\b/gi, plain(reading));
const expandable = count(/\b(?:i am|you are|they are|we are|it is|that is|do not|does not|did not|cannot|will not|would not|could not|have not|has not|had not|is not|are not|was not|were not|i have|you have|they have|i will|you will|they will|i would|you would|they would)\b/gi, plain(reading));
const syll = (w) => { const m = w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); };
const allWords = plain(reading).replace(/\[[^\]]+\]/g, '').match(/[A-Za-z']+/g) || [];
const allSentences = sentencesOf(parts.map((p) => p.text).join('\n\n'));
const reading_grade = Number((0.39 * (allWords.length / allSentences.length)
  + 11.8 * (allWords.reduce((n, w) => n + syll(w), 0) / allWords.length) - 15.59).toFixed(1));

const metrics = {
  words, section_words, letter_words: section_words.letter, flat_triples,
  banned, numerology, person_words, letter_gender, years, writing_time, clients, contact, turn_up,
  therapy, british, i_told_you, name_uses, name_starts, dear, bold, stop_ends, repeated_8grams,
  contraction_share: Number((contractions / Math.max(1, contractions + expandable)).toFixed(2)),
  reading_grade,
  exact: {
    birth_line: has(P.opening, 'Your birth name and date set how I lay your twelve cards'),
    someone_living: has(P.opening, 'someone living'),
    no_reply_opening: /owe (?:them )?no reply/i.test(P.opening),
    no_reply_11: /owe (?:them )?no reply/i.test(P['11']),
    last_line: /It's back\. What you do with it is on you\.\s*$/.test(P.close),
    window_12: /(?:five to seven days|5[–-]7 days)/i.test(P['12']),
    window_elsewhere: cards.filter((p) => p.key !== 12 && /(?:five to seven days|5[–-]7 days)/i.test(p.text)).map((p) => p.key),
    took_first: has(firstWords(P['1'], 25), a.took_word),
    cover_2: has(P['2'], a.cover), cover_8: has(P['8'], a.cover), cover_12: has(P['12'], a.cover),
    fork_first: fork === 'get_back' ? /get you back/i.test(firstWords(P['9'], 30))
      : /giving it back/i.test(firstWords(P['9'], 30)),
    act_first: /\b(?:no|won't|will not|never)\b/i.test(firstWords(P['10'], 30)),
    unsaid_11: Number(overlap(firstWords(P['11'], 70)).toFixed(2)),
    unsaid_letter: Number(overlap(P.letter).toFixed(2)),
    took_letter: has(P.letter, a.took_word),
    stop_label: /\*\*Stop going back\.?\*\*/i.test(by['12']), do_label: /\*\*The one thing to do\.?\*\*/i.test(by['12']),
    death_house: deathAt,
    death_safe: deathAt ? /nobody'?s died|no one'?s died/i.test(firstWords(P[String(deathAt)], 40)) && has(P[String(deathAt)], 'someone living') : true,
    safety_row4: a.safety ? /\bsafe\b/i.test(P['12']) && /\b(?:tell|someone who can help)\b/i.test(P['12']) : true,
    ask_at_end: fork === 'get_back' ? has(P.close, 'ask') : true,
  },
};

const expected = [
  `What they took: ${a.took}. Card 1, first sentence.`,
  `Her cover word: "${a.cover}". Named in 2, attacked in 8, retired in 12.`,
  `What they saw: ${a.saw}. Card 3, and back in the letter.`,
  `Why they kept it: giving it back means saying what they did. Card 4, first sentence.`,
  `Why so long: the excuse "${a.excuse}". Card 5, first sentence, then knocked down, and back in the letter.`,
  `What they regret: ${a.regret}. Card 6, first sentence, and said again in the letter.`,
  `Her pattern: she ${a.pattern}. Card 7.`,
  `The fork: ${fork === 'get_back' ? 'trying to get her back' : 'giving it back'}. Card 9, first sentence, in bold.`,
  `Will they act: no, because of ${a.reason}. Card 10, first sentence, in bold.`,
  `Left unsaid: "${a.unsaid}" Card 11, first sentence, and said again in the letter.`,
  `Should she answer: no, she doesn't need to, it's already back. Card 11.`,
  `Seven-day practice: ${a.do} Card 12.`,
].join('\n');
const pathNote = fork === 'get_back'
  ? `This is the TRYING TO GET YOU BACK path. Five places change: card 6 says they regret losing what they had from her, not that they have no regret. Card 9: the presence comes right up to the table and stays, and the low point is that part of her is glad to read this. Card 10: still no, they hold it out and want her to come to them, and Evelyn stops answering that pull. Card 12 warns her the letter ends with an ask, and says to do nothing with it. The letter hands the thing back in full first, then asks, and the close says Evelyn left the ask in so she'd see it.`
  : `This is the GIVING IT BACK path. Card 9: they aren't trying to get her back and aren't coming back, and the presence leaves. The letter asks for nothing.`;
const list = (name, xs) => `  ${name}: ${xs.length}${xs.length ? '\n' + xs.map((x) => `    · section ${x.section ?? (x.sections || []).join(', ')} — ${x.sentence || x.phrase || x.text}`).join('\n') : ''}`;
const grade_user = [
  `MEASURED FOR YOU. Don't recount any of this. Candidate lists are where to look, and you judge each one.`,
  `  total words: ${words} (allowed ${S.floor_words}-${S.ceiling_words})`,
  `  words by section: ${Object.entries(section_words).map(([k, v]) => `${k}=${v}`).join(', ')}`,
  `  letter words: ${section_words.letter} (allowed ${S.letter_words.min}-${S.letter_words.max})`,
  `  three neighbouring cards within 20 words, for information only: ${flat_triples.join(', ') || 'none'}`,
  `  her name used: ${name_uses} (about ${S.devices.name_uses_total}) · sections starting on her name: ${name_starts.length}`,
  `  the word dear: ${dear} (at most ${S.devices.dear_uses})`,
  `  "I told you" lines: ${i_told_you} (about 6 callbacks; a problem only above 8)`,
  `  sections whose last sentence is about stopping: ${stop_ends} (at most ${S.devices.stop_cap})`,
  `  contraction share: ${metrics.contraction_share} · reading grade: ${reading_grade}`,
  list('bold passages (at most 5: cards 1, 9, 10, and the two labels in 12)', bold),
  list('banned words', banned), list('how-she-knows words', numerology),
  list('words for what the person was to her', person_words), list('he/him/his inside the letter', letter_gender),
  list('the word years outside card 8', years), list('how long the writing took', writing_time),
  list('past clients', clients), list('contact or wait instructions', contact),
  list('they will turn up', turn_up), list('therapy words', therapy), list('British words in her life', british),
  list('eight-word runs shared by two cards', repeated_8grams),
  `  exact lines present: ${JSON.stringify(metrics.exact)}`,
  ``, `THE ANSWERS THIS BUYER WAS GIVEN. Check the reading against these.`, expected,
  ``, pathNote,
  ``, `THE TWELVE AS LAID, AND WHAT IS ON EACH CARD`,
  ...j.deal.map((d) => `  ${d.house}. ${d.card_name}: ${S.cards[d.card].drawn.join('; ')}`),
  ``, `LINKS THAT EXIST ON THIS DEAL: ${j.links.map((l) => l.note).join(' ') || 'none'}`,
  ``, `THE READING`, reading,
].join('\n');
const { parts: _p, prose: _x, prompt: _q, voice: _v, segment: _s, index: _i, total: _t, ...keep } = j;
return [{ json: { ...keep, attempt, sections: Object.fromEntries(parts.map((p) => [String(p.key), p.text])),
  reading, metrics, grade_user } }];
""".replace("__SPEC__", SPEC_JSON)

# ─── 7 · the grader ────────────────────────────────────────────────────────────
RUBRIC = """You are grading a twelve-card tarot reading, The Unsent Letter, before it goes to the woman who paid for it. Each line below is yes or no. Any single NO fails the reading. Grade only on these lines, and don't bring rules from anywhere else. Definite predictions about this person are correct here: the flat answers are the product.

THE ANSWERS
1. All twelve cards are present in order, with the opening, the letter and the close.
2. Each flat answer in the list you're given is stated, correctly, in the first lines of its section. Half an answer is a fail.
3. The path is right: the changes listed for this buyer's path are all made.
4. Card 12 gives the one thing to stop and the one thing to do, each with its reason in plain words. It says the pull is about her and not about them turning up. It carries both warnings: it won't feel like much at first, and how soon is down to what she does.
5. The letter is in the other person's voice, says what they did using only the facts given, names the thing and hands it back. It invents no event, place, date, gift or name. Giving path: it asks for nothing. Get-you-back path: it hands the thing back in full first, then asks.
6. The close's last line is exact, and every buyer gets "It's back".

THE STORY
7. It's one story told in the order it happened at Evelyn's table. The night moves forward and never back.
8. No two sections could swap places unnoticed. Each leans on the one before it. Card 9 is the low point and card 10 is the turn.
9. The running threads hold: what's on the sheet (blank until card 10, stated at 1, 6, 9 and 10), where they are in the room (moves at 1, 4, 9, 10 and the close), the paper she keeps (starts at 7, added to at 8), the cover word.

THE CARDS
10. Each card's picture comes before its meaning, in plain things she can see, and matches what's listed for that card. Nothing is described that isn't on the list.
11. No section says the Hermit, Judgement or the Devil fell in this spread. Links between cards use only those listed for this deal.

THE VOICE
12. The hard thing comes first. Answers are flat, with no hedge and no refusal to answer.
13. It hits what she does, never who she is, and never blames her for what was done to her.
14. What it says about her life is common behaviors, stated flat, that a hundred different women could each recognize. No invented biography, people or scenes in her life.
15. No shape repeats section after section: not the same opening, ending, turn or reassurance. Fail if the next section's shape is predictable from the last few.
16. It sounds spoken: plain short words, contractions, no sayings or neat balanced lines, no idea-words she has to work out. Her daily life is in American words.

THE LIMITS
17. It never tells her to contact, answer, look up, wait for or forgive this person. It never suggests they'll turn up. "If this person hurt you, you owe them no reply" is said in the opening and at card 11. "This is someone living" is in the opening.
18. They/them throughout for this person, with no word for what they were to her.
19. Nothing names or hints at numerology, past clients or testimonials, how long the writing took, or how long ago it ended ("years" only at card 8).
20. The counts handed to you are inside their limits.

Return the verdict and the scores. `failed` lists the line numbers that failed. `why` is one short sentence naming the worst fault in plain words. Score each 0 to 10 on its own: continuation (would she keep reading), trust (does it feel laid for her), variation (no formula), story (one night, low point, turn), relevance (could only she be reading this), tarot (pictures true, cards earn their place). `recommend` is 0 to 10: would she tell a friend."""

GRADE_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "properties": {
        "pass": {"type": "boolean"},
        "failed": {"type": "array", "items": {"type": "integer"}},
        "why": {"type": "string"},
        "recommend": {"type": "integer"},
        "scores": {"type": "object", "additionalProperties": False,
                   "properties": {k: {"type": "integer"} for k in
                                  ("continuation", "trust", "variation", "story", "relevance", "tarot")},
                   "required": ["continuation", "trust", "variation", "story", "relevance", "tarot"]},
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
// costs a paying customer her reading. It must never fail open SILENTLY, so the reason goes in
// `why`, which the audit reads.
let v;
if (refused) v = { pass: true, failed: [], why: 'UNGRADED — grader declined' };
else if (stop === 'max_tokens' && !say.trim()) v = { pass: true, failed: [], why: 'UNGRADED — grader hit the ceiling with no verdict. Lower the effort on node 7.' };
else { try { v = JSON.parse(say); } catch (e) { v = { pass: true, failed: [], why: 'UNGRADED — grader output unparseable' }; } }

// Countable contract failures override the model. Rubric line in brackets.
const m = brief.metrics, e = m.exact, hard = [], detail = [];
const fail = (line, ok, msg) => { if (!ok) { hard.push(line); detail.push(msg); } };
fail(20, m.words >= S.floor_words && m.words <= S.ceiling_words, `total ${m.words} words`);
fail(20, m.letter_words >= S.letter_words.min && m.letter_words <= S.letter_words.max, `letter ${m.letter_words} words`);
fail(20, m.dear <= S.devices.dear_uses || !brief.first_name, `dear ${m.dear}`);
fail(20, m.bold.length <= 5, `bold ${m.bold.length}`);
// Plan cap is 6, and the rule stays 6 in the briefs. The regex also counts plain "I told you"
// that isn't a callback: the hand reading scores 8 here, so a regenerate starts above that.
fail(20, m.i_told_you <= 8, `callbacks ${m.i_told_you}`);
fail(20, m.stop_ends <= S.devices.stop_cap, `sections ending on stop ${m.stop_ends}`);
fail(20, !m.name_starts.length, `sections starting on her name: ${m.name_starts.join(', ')}`);
fail(15, !m.repeated_8grams.length, `repeated eight-word runs ${m.repeated_8grams.length}`);
fail(12, !m.banned.length, `banned words ${m.banned.length}`);
fail(19, !m.numerology.length, `how-she-knows words ${m.numerology.length}`);
fail(19, !m.years.length, `"years" outside card 8: ${m.years.length}`);
fail(19, !m.writing_time.length, `writing time ${m.writing_time.length}`);
fail(19, !m.clients.length, `past clients ${m.clients.length}`);
fail(18, !m.person_words.length && !m.letter_gender.length, `gendered words ${m.person_words.length + m.letter_gender.length}`);
fail(17, !m.contact.length && !m.turn_up.length, `contact or turn-up lines ${m.contact.length + m.turn_up.length}`);
fail(17, e.someone_living && e.no_reply_opening && e.no_reply_11 && e.death_safe && e.safety_row4, 'a required safety line is missing');
fail(17, e.birth_line, 'the birth-name sentence is missing');
fail(6, e.last_line, 'the last line is not exact');
fail(2, e.took_first && e.fork_first && e.act_first && e.unsaid_11 >= 0.6, 'a flat answer is not in the first lines');
fail(5, e.took_letter && e.unsaid_letter >= 0.6, 'the letter does not hand back the thing or say the unsaid sentence');
fail(4, e.window_12 && !e.window_elsewhere.length && e.stop_label && e.do_label, 'card 12 is missing its labels or window');
fail(9, e.cover_2 && e.cover_8 && e.cover_12, 'the cover word thread is broken');
fail(3, e.ask_at_end, 'the close does not explain the ask');
if (hard.length) {
  v.pass = false;
  v.failed = [...new Set([...(v.failed || []), ...hard])].sort((a, b) => a - b);
  v.why = `${v.why || 'Model grade overridden by the measured contract.'} Measured: ${detail.join('; ')}.`;
}
const s = v.scores || {};
const KEYS = ['continuation', 'trust', 'variation', 'story', 'relevance', 'tarot'];
const badScores = KEYS.filter((k) => !Number.isInteger(s[k]) || s[k] < 0 || s[k] > 10);
const recOk = Number.isInteger(v.recommend) && v.recommend >= 0 && v.recommend <= 10;
if (badScores.length || !recOk) {
  v.score_error = `invalid scores: ${badScores.join(', ')}${recOk ? '' : ' recommend'}`;
  v.why = `${v.why || ''} Automated score ignored.`;
}
v.recommend = recOk ? v.recommend : null;
v.weighted_score = badScores.length ? null : Number((s.continuation * 0.25 + s.trust * 0.2 + s.variation * 0.2
  + s.story * 0.15 + s.relevance * 0.1 + s.tarot * 0.1).toFixed(2));
return [{ json: { ...brief, verdict: v } }];
""".replace("__SPEC__", SPEC_JSON)

ROUND_AGAIN_JS = r"""
// ⛔ Same numbers, same answers, same cards. Only the writing is done again. This goes back to
// the story plan, past node 3, so nothing can re-deal.
// Read off 7a by name: on the live build node 8b sits just before this and its output is our
// API's reply, not the order.
const { reading, sections, metrics, grade_user, verdict, ...j } = $('7a · Read the verdict').first().json;
return [{ json: { ...j, attempt: j.attempt + 1, first_failure: { failed: verdict.failed, why: verdict.why } } }];
"""

# ─── 10 · the PDF's HTML ───────────────────────────────────────────────────────
# ⛔ 11-C4 (Closing the Door) IS NOT WRITTEN. When it is, set this to its HTML. Until then a bump
#    buyer's order stops at node 10 with a red execution, which is the visible hold. Nothing with
#    a placeholder page can reach her. No backticks: this lands in a JS template literal.
CLOSING_THE_DOOR_HTML = None

HTML_JS = r"""
// PDFShift takes one HTML string. The card art is looked up from the deal, never from model text.
const j = $('7a · Read the verdict').first().json;
const S3 = '__S3__';
const CROP_DEATH = __CROP__;
const CLOSING_THE_DOOR = __C4__;
const ACTS = __ACTS__;
if (j.bump && !CLOSING_THE_DOOR) {
  throw new Error('HOLD: this buyer took the bump and 11-C4 Closing the Door is not written. Do not send this reading without its last page.');
}
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// The writer may bold and italicise. A stray asterisk never reaches the page.
const inline = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\*/g, '');
const paras = (t) => String(t || '').trim().split(/\n\s*\n/).filter(Boolean)
  .map((p) => `<p>${inline(p.trim().replace(/\n/g, ' '))}</p>`).join('');
const ORD = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'];
const sec = j.sections;
const missing = ['opening', ...Array.from({ length: 12 }, (_, i) => String(i + 1)), 'letter', 'close'].filter((k) => !String(sec[k] || '').trim());
if (missing.length) throw new Error(`the reading has no text for: ${missing.join(', ')}`);
const byHouse = Object.fromEntries(j.deal.map((d) => [d.house, d]));
const cardBlock = (h) => { const d = byHouse[h];
  const crop = CROP_DEATH && d.card === 'death';
  return `<section class="card"><h3>The ${ORD[h - 1]} card: ${esc(d.card_name.replace(/^The /, 'the '))}</h3>
    <figure${crop ? ' class="crop"' : ''}><img src="${S3}${d.card}.jpg" alt=""></figure>
    <div class="prose">${paras(sec[String(h)])}</div></section>`; };
const acts = ACTS.map((a) => `<div class="act"><h2>${esc(a.name)}</h2>${a.houses.map(cardBlock).join('')}</div>`).join('');
const DATE = (iso) => { const d = new Date(iso);
  const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${M[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const coverRow = (label) => `<div class="row"><span class="lab">${esc(label)}</span><i></i><i></i><i></i></div>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  /* ⛔ NO BACKTICKS IN THIS BLOCK. One ends the template literal and the node stops parsing. */
  @page { size: Letter; margin: .6in 0 .6in; @bottom-center { content: "The Unsent Letter · " counter(page); font-family: Georgia, serif; font-size: 9pt; color: #62594C; } }
  @page :first { margin: 0; }
  @page cover { margin: 0; @bottom-center { content: none; } }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2A2622; margin: 0; font-size: 11.5pt; line-height: 1.62; }
  .cover { page: cover; position: relative; width: 8.5in; height: 11in; overflow: hidden; page-break-after: always; background: #1F1B2A; color: #EFE6D2; text-align: center; padding-top: .8in; }
  .cover h1 { font-size: 34pt; font-weight: normal; letter-spacing: .02em; margin: 0 0 6pt; color: #EFE6D2; }
  .cover .laid { font-size: 12.5pt; color: #BFB39A; margin: 0 0 .42in; }
  .grid { width: 4.9in; margin: 0 auto; }
  .row { display: flex; align-items: center; justify-content: center; gap: .16in; margin-bottom: .14in; position: relative; }
  .row .lab { position: absolute; left: -1.5in; width: 1.4in; text-align: right; font-size: 8.5pt; color: #BFB39A; font-style: italic; }
  .row i { display: block; width: .86in; height: 1.3in; border-radius: 5pt; border: 1.5pt solid #C9A95C; background: repeating-linear-gradient(45deg, #2C2740 0 6pt, #352F4D 6pt 12pt); box-shadow: inset 0 0 0 3pt #1F1B2A, inset 0 0 0 4pt #8A7440; }
  .envelope { position: relative; width: 2.5in; height: 1.44in; margin: .18in auto 0; background: #E6DBC2; border-radius: 3pt; overflow: hidden; }
  .envelope:before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 0; border-left: 1.25in solid transparent; border-right: 1.25in solid transparent; border-top: .8in solid #D5C8AA; }
  .envelope:after { content: ''; position: absolute; left: 50%; top: .62in; width: .34in; height: .34in; margin-left: -.17in; border-radius: 50%; background: #7A1F24; box-shadow: inset 0 0 0 2pt #5E161A; }
  .inner { padding: .30in .95in .35in; }
  .title h1 { font-size: 24pt; font-weight: normal; margin: 0 0 2pt; }
  .title p { font-style: italic; color: #6E6459; margin: 0 0 22pt; }
  .opening { margin-bottom: 18pt; }
  .opening p:first-child { font-weight: bold; }
  .act h2 { font-size: 17pt; font-weight: bold; margin: 26pt 0 4pt; padding-top: 16pt; border-top: 1pt solid #DED4BE; page-break-after: avoid; break-after: avoid; }
  section.card { margin-top: 16pt; }
  section.card h3 { font-size: 12.5pt; color: #5C5348; margin: 0 0 10pt; page-break-after: avoid; break-after: avoid; }
  section.card figure { float: left; width: 1.9in; margin: 2pt 20pt 10pt 0; page-break-inside: avoid; break-inside: avoid; }
  section.card figure img { width: 100%; display: block; border: 1pt solid #DDD6C6; }
  section.card figure.crop { height: 2.47in; overflow: hidden; border-bottom: 1pt solid #DDD6C6; }
  section.card:after { content: ''; display: block; clear: both; }
  p { margin: 0 0 9pt; orphans: 3; widows: 3; }
  .letter { page-break-before: always; break-before: page; background: #FBF6E9; border: 1pt solid #E2D7BC; padding: 26pt 30pt 22pt; }
  .letter h2 { font-size: 17pt; font-weight: normal; font-style: italic; text-align: center; margin: 0 0 16pt; }
  .letter p { font-size: 12pt; line-height: 1.7; }
  .close { margin-top: 20pt; }
  .close p:last-of-type { font-size: 13pt; }
  .signoff { margin-top: 16pt; }
  .signoff p { margin: 0 0 3pt; }
  .bump { page-break-before: always; break-before: page; }
  .colophon { margin-top: 26pt; border-top: 1pt solid #DED4BE; padding-top: 10pt; }
  .colophon p { font-size: 9pt; line-height: 1.5; color: #7C776D; margin: 0; }
</style></head><body>
  <div class="cover">
    <h1>The Unsent Letter</h1>
    <p class="laid">Written out for ${esc(j.birth_name)} &nbsp;&middot;&nbsp; ${DATE(j.paid_at)}</p>
    <div class="grid">${ACTS.map((a) => coverRow(a.name)).join('')}</div>
    <div class="envelope"></div>
  </div>
  <div class="inner">
    <div class="title"><h1>The Unsent Letter</h1><p>Written out for ${esc(j.birth_name)}</p></div>
    <div class="opening">${paras(sec.opening)}</div>
    ${acts}
    <div class="letter"><h2>The letter they never sent</h2>${paras(sec.letter)}</div>
    <div class="close">${paras(sec.close)}
      <div class="signoff"><p>Your friend, even when you'd rather I wasn't,</p><p>&mdash; Evelyn</p></div>
    </div>
    <div class="colophon"><p>About this reading: your twelve cards were set by your birth name and date. The words are written with machine help in Evelyn's voice.</p></div>
    ${j.bump && CLOSING_THE_DOOR ? `<div class="bump">${CLOSING_THE_DOOR}</div>` : ''}
  </div>
</body></html>`;
return [{ json: { ...j, html, pdfFileName: `${j.order_id}.pdf` } }];
"""

# ─── assembly ──────────────────────────────────────────────────────────────────
def wf_name(base):
    return f"{base} [OPENAI · {MODEL_WRITE}]"

def build():
    html_js = (HTML_JS.replace("__S3__", S3)
               .replace("__CROP__", "true" if SPEC["death_crop"] else "false")
               .replace("__C4__", json.dumps(CLOSING_THE_DOOR_HTML))
               .replace("__ACTS__", json.dumps(SPEC["acts"], ensure_ascii=False)))

    n1 = node("1 · Stripe webhook", "n8n-nodes-base.webhook", 2, [-620, 300],
              {"httpMethod": "POST", "path": "unsent-letter-fulfilment",
               "responseMode": "onReceived", "options": {}})
    n2 = node("2 · Is this a paid 11 order?", "n8n-nodes-base.if", 2.2, [-420, 300], {
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
    nX = node("Not 11 — ignore", "n8n-nodes-base.noOp", 1, [-240, 460], {})
    # ⚠ TODO LIVE: birth name and date live on be_order_intake, never Stripe. GET
    # /api/be/unsent-letter/fulfilment/:sessionId already returns intake + order, but it needs
    # 11's "refuse if missing" guard (08 has one) and the BE_FULFILMENT_TOKEN credential.
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

    n3  = code("3 · Numbers, answers, the deal", [60, 200], DRAW_JS,
               "Everything decided by code: her three numbers, the flat answers, the twelve cards, the rotations.")
    n3a = code("3a · Compose the story plan", [240, 200], PLAN_JS, "Facts + cards + the fixed night.")
    n3b = model_call("3b · Write the story plan", [420, 200],
        schema_body(MODEL_WRITE, EFFORT_WRITE, CEILING_PLAN, "story_plan", PLAN_SCHEMA),
        "Notes, not prose. The plan stops twelve separate verdicts (11-P1-plan §7).")
    n3c = code("3c · Keep the plan, fan out the acts", [600, 200], KEEP_PLAN_JS, "One item per act.")
    n4  = node("4 · Each act", "n8n-nodes-base.splitInBatches", 3, [780, 200],
               {"batchSize": 1, "options": {
                   # 🔴 From 02 execution 30476: without this the regenerate path is broken. A
                   #    fresh item has no `prose`; one looping back always does.
                   "reset": "={{ $json.prose === undefined }}"}},
               {"notes": "⭐ Resets on a regeneration. Learned on 02."})
    n4a = code("4a · Compose the act prompt", [960, 320], ACT_JS,
               "The facts, the plan, everything written so far this attempt, then this act's briefs.")
    n4b = model_call("4b · Write the act", [1140, 320],
        prose_body(MODEL_WRITE, EFFORT_WRITE, CEILING_WRITE),
        "System block first and byte-identical, so OpenAI can cache the shared prefix.")
    n4c = code("4c · Keep the prose", [1320, 320], KEEP_PROSE_JS,
               "Turns a refusal, truncation or missing marker into a loud failure.")
    next(n for n in NODES if n["name"] == n4c)["onError"] = "continueErrorOutput"
    n4r = code("4r · Retry a format failure once", [1320, 540], RETRY_JS,
               "FORMAT failures only. No prompt change, no refusal retries.")
    n4s = model_call("4s · Retry the act once", [1500, 540],
        prose_body(MODEL_WRITE, EFFORT_WRITE, CEILING_WRITE), "One bounded retry, same prompt.")
    n4t = code("4t · Validate the retried act", [1680, 540], KEEP_PROSE_JS,
               "Same parser as 4c. A second failure stops the workflow.")
    n4z = code("4z · Rejoin", [1500, 320], "return $input.all();\n",
               "⛔ Both paths pass through here, so 4a can find everything already written.")
    n5  = node("5 · Collect the acts", "n8n-nodes-base.aggregate", 1, [960, 100],
               {"aggregate": "aggregateAllItemData", "options": {}})
    n6  = code("6 · Assemble and measure", [1140, 100], ASSEMBLE_JS,
               "No joiner. Everything countable is counted here and handed to the grader.")
    n7  = model_call("7 · Grade it", [1320, 100], grade_body(),
                     "7a fails open and records why, so a declined grade costs a log line, never her reading.")
    n7a = code("7a · Read the verdict", [1500, 100], VERDICT_JS, "Measured contract overrides the model.")
    n8  = node("8 · Passed?", "n8n-nodes-base.if", 2.2, [1680, 100], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "loose", "version": 2},
        "conditions": [{"id": "p", "leftValue": "={{ $json.verdict.pass }}", "rightValue": "",
                        "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
        "combinator": "and"}, "options": {}})
    n8a = node("8a · First failure?", "n8n-nodes-base.if", 2.2, [1680, 300], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "loose", "version": 2},
        "conditions": [{"id": "r", "leftValue": "={{ $json.attempt }}", "rightValue": 2,
                        "operator": {"type": "number", "operation": "lt"}}],
        "combinator": "and"}, "options": {}})
    log_body = ("={{ JSON.stringify({ sessionId: $json.order_id, attempt: $json.attempt, "
                "pass: $json.verdict.pass, failed: $json.verdict.failed, why: $json.verdict.why, "
                "draw: $json.deal__EXTRA__ }) }}")
    n8b = ours("8b · Log the first failure", [1680, 460], f"/api/be/{OFFER_KEY}/grade-log",
               log_body.replace("__EXTRA__", ", regenerated: true"), "⚠ TODO live: base URL + token.")
    n8c = code("8c · Go round again", [1860, 460], ROUND_AGAIN_JS,
               "⛔ Back to the story plan, past the deal, so the retry writes the SAME cards.")
    n9  = ours("9 · Log the verdict", [1860, 100], f"/api/be/{OFFER_KEY}/grade-log",
               log_body.replace("__EXTRA__", ""), "⚠ TODO live: base URL + token.")
    n10 = code("10 · Build the HTML", [2040, 100], html_js,
               "Card art by deal record, never by model text. Bump buyers hold here until 11-C4 exists.")
    n11 = node("11 · PDFShift → PDF", "n8n-nodes-base.httpRequest", 4.2, [2220, 100], {
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
        "notes": "⚠ PDFShift fetches the card images itself. A slow or 403 fetch renders gaps with no error."})
    n12 = node("12 · Upload to Supabase Storage", "n8n-nodes-base.httpRequest", 4.2, [2400, 100], {
        "method": "POST",
        "url": ("=" + SUPABASE_PROJ + "/storage/v1/object/" + SUPABASE_BUCKET +
                "/11/{{ $('10 · Build the HTML').first().json.order_id }}/"
                "{{ $('10 · Build the HTML').first().json.pdfFileName }}"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "Content-Type", "value": "application/pdf"}, {"name": "x-upsert", "value": "true"}]},
        "sendBody": True, "contentType": "binaryData", "inputDataFieldName": "data",
        "options": {"timeout": 60000},
    }, {"credentials": {"httpHeaderAuth": SUPABASE_CRED},
        "notes": "⚠ TODO live: 02's handover says this bucket and project are unresolved."})
    n13 = node("13 · Hold to the 24h mark", "n8n-nodes-base.wait", 1.1, [2580, 100], {
        "resume": "specificTime",
        "dateTime": ("={{ DateTime.fromISO($('10 · Build the HTML').first().json.paid_at)"
                     ".plus({ hours: 24 }).toISO() }}")},
        {"notes": "11-DELIVERABLES: as close to 24 hours as we can land it, never early by hours."})
    n13a = node("13a · Get signed URL", "n8n-nodes-base.httpRequest", 4.2, [2760, 100], {
        "method": "POST",
        "url": ("=" + SUPABASE_PROJ + "/storage/v1/object/sign/" + SUPABASE_BUCKET +
                "/11/{{ $('10 · Build the HTML').first().json.order_id }}/"
                "{{ $('10 · Build the HTML').first().json.pdfFileName }}"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True,
        "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": '{ "expiresIn": 31536000 }',
        "options": {"timeout": 30000},
    }, {"credentials": {"httpHeaderAuth": SUPABASE_CRED}})
    n14 = node("14 · Find her on AWeber", "n8n-nodes-base.httpRequest", 4.2, [2940, 100], {
        "url": (f"=https://api.aweber.com/1.0/accounts/{AWEBER_ACCOUNT}/lists/{AWEBER_LIST}"
                "/subscribers?ws.op=find&email="
                "{{ encodeURIComponent($('10 · Build the HTML').first().json.email) }}"),
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": AWEBER_CRED}, "notes": "⛔ FIND, NEVER CREATE. ⚠ TODO live: list id."})
    n14a = node("14a · Tag + reading_url (the send)", "n8n-nodes-base.httpRequest", 4.2, [3120, 100], {
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
    n15 = ours("15 · Mark delivered", [3300, 100], f"/api/be/{OFFER_KEY}/delivered",
        ("={{ JSON.stringify({ sessionId: $('10 · Build the HTML').first().json.order_id, "
         "readingUrl: '" + SUPABASE_PROJ + "/storage/v1' + "
         "$('13a · Get signed URL').first().json.signedURL }) }}"),
        "⚠ TODO live: base URL + token.")

    for a, b in [(n1, n2), (n2a, n2b), (n2b, n3), (n3, n3a), (n3a, n3b), (n3b, n3c), (n3c, n4),
                 (n4a, n4b), (n4b, n4c), (n4c, n4z), (n4z, n4), (n5, n6), (n6, n7), (n7, n7a),
                 (n7a, n8), (n8b, n8c), (n8c, n3a), (n9, n10), (n10, n11), (n11, n12), (n12, n13),
                 (n13, n13a), (n13a, n14), (n14, n14a), (n14a, n15)]:
        link(a, b)
    link(n2, n2a); link(n2, nX, 1)
    link(n4, n5); link(n4, n4a, 1)          # 0 = done, 1 = loop
    link(n4c, n4r, 1); link(n4r, n4s); link(n4s, n4t); link(n4t, n4z)
    link(n8, n9); link(n8, n8a, 1)
    link(n8a, n8b); link(n8a, n9, 1)        # second failure logs and ships anyway (02's rule)

    return {"name": wf_name("11 · The Unsent Letter — fulfilment"),
            "nodes": NODES, "connections": LINKS, "active": False,
            "settings": {"executionOrder": "v1", "saveManualExecutions": True,
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
            "pinData": {}, "tags": []}

# ─── the test drive: no path to a buyer ────────────────────────────────────────
# Both fixtures are invented, and bump is off because 11-C4 isn't written. check-11-architecture
# proves each one lands on the path it says it does.
FIXTURES = {
    "getback": {"order": "cs_test_n8n_testdrive_11_getback", "name": "Testina Rose Testerly",
                "first": "Testina", "dob": "1962-11-05"},
    "giving":  {"order": "cs_test_n8n_testdrive_11_giving", "name": "Faketta Ann Testerly",
                "first": "Faketta", "dob": "1962-11-05"},
}

def fixture_item():
    f = FIXTURES[FIXTURE]
    return {"body": {"type": "checkout.session.completed", "data": {"object": {
                "id": flag("--order", f["order"]), "payment_status": "paid", "created": 1793620800,
                "customer_details": {"email": f"dryrun-11-{FIXTURE}@example.com"},
                "metadata": {"app": "the-seer-within", "product": STRIPE_PRODUCT, "offer": OFFER_KEY,
                             "treatment": "page", "readingCents": "3500", "bump": "0", "c": "1"}}}},
            "intake": {"fullBirthName": f["name"], "dateOfBirth": f["dob"], "firstName": f["first"]}}

def make_testdrive(wf):
    drop = {"1 · Stripe webhook", "Not 11 — ignore", "2a · Load the intake", "2b · Join session + intake",
            "8b · Log the first failure", "9 · Log the verdict", "13 · Hold to the 24h mark",
            "14 · Find her on AWeber", "14a · Tag + reading_url (the send)", "15 · Mark delivered"}
    wf["name"] = wf_name(f"11 · Unsent Letter — TEST DRIVE ({FIXTURE} fixture, never delivers)")
    wf["nodes"] = [n for n in wf["nodes"] if n["name"] not in drop]
    wf["connections"] = {s: o for s, o in wf["connections"].items() if s not in drop}
    for outs in wf["connections"].values():
        for br in outs["main"]:
            br[:] = [c for c in br if c["node"] not in drop]
    to = lambda name: {"node": name, "type": "main", "index": 0}
    # Rewire around what was removed, so nothing that could touch our API or a buyer remains.
    wf["connections"]["2 · Is this a paid 11 order?"]["main"][0] = [to("3 · Numbers, answers, the deal")]
    wf["connections"]["2 · Is this a paid 11 order?"]["main"] = wf["connections"]["2 · Is this a paid 11 order?"]["main"][:1]
    wf["connections"]["8 · Passed?"]["main"][0] = [to("10 · Build the HTML")]
    wf["connections"]["8a · First failure?"]["main"] = [[to("8c · Go round again")], [to("10 · Build the HTML")]]
    # 12 then 13a sign what was uploaded. Both disabled unless --storage.
    wf["connections"]["12 · Upload to Supabase Storage"] = {"main": [[to("13a · Get signed URL")]]}
    if "--storage" not in sys.argv:
        for n in wf["nodes"]:
            if n["name"].startswith(("12 ·", "13a ·")):
                n["disabled"] = True
    fixture = json.dumps(fixture_item(), ensure_ascii=False, indent=2)
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
         "notes": "Invented buyer. Edit name, date or order id here for another test. Same name + date = same cards."},
    ]
    wf["connections"]["T0 · press Execute (manual test)"] = {"main": [[to("T1 · the fixture session")]]}
    wf["connections"]["T0 · tick (test drive only)"] = {"main": [[to("T1 · the fixture session")]]}
    wf["connections"]["T1 · the fixture session"] = {"main": [[to("2 · Is this a paid 11 order?")]]}
    if "--manual-only" in sys.argv:
        wf["nodes"] = [n for n in wf["nodes"] if n["name"] != "T0 · tick (test drive only)"]
        wf["connections"].pop("T0 · tick (test drive only)", None)
    return wf

if __name__ == "__main__":
    wf = build()
    if "--testdrive" in sys.argv:
        wf = make_testdrive(wf)
    os.makedirs(OUT_DIR, exist_ok=True)
    suffix = ""
    if "--testdrive" in sys.argv:
        suffix = "-MANUAL" if "--manual-only" in sys.argv else "-TESTDRIVE"
        suffix += "-GIVING" if FIXTURE == "giving" else "-GETBACK"
    out = os.path.join(OUT_DIR, f"11-fulfilment{suffix}.n8n.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"\n  11 · The Unsent Letter — fulfilment")
    print(f"    {len(wf['nodes'])} nodes → build/{os.path.basename(out)}")
    print(f"    {MODEL_WRITE} writes (effort {EFFORT_WRITE}), {MODEL_GRADE} grades (effort {EFFORT_GRADE})")
    print(f"    {len(SPEC['segments'])} writing calls · bump page: "
          f"{'present' if CLOSING_THE_DOOR_HTML else 'HOLD, 11-C4 not written'}")
