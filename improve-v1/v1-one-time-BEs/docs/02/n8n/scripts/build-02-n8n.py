#!/usr/bin/env python3
"""Generate 02's fulfilment workflow as importable n8n JSON.

    python3 improve-v1/v1-one-time-BEs/docs/02/n8n/scripts/build-02-n8n.py

⛔ EDIT THIS FILE, NEVER THE JSON. The JSON is a build artefact; a hand-edit is lost on the
   next run and reviews as an unreadable one-line diff.

WHAT 02 IS, AND HOW IT DIFFERS FROM 07
  She buys one twelve-card reading. Three of the twelve are cards she has ALREADY been shown
  in the sales letter — the World, the Lovers, the Tower — and the answer she paid for is
  WHICH HOUSE each of them fell in. The other nine are drawn from the sixteen Majors neither
  letter has spent. 07's shape, with four deliberate differences:

  1. NO API READ. 07 must fetch a stored draw and her typed questions. 02 has neither: the
     draw happens here, and everything else (email, first name, order id, the bump flag) is
     already on the Stripe webhook. So there is no `3 · Load the order` node and no
     GET endpoint to build.
  2. THE DRAW IS MADE HERE. 07 never draws — its cut is a morning event the email already
     rendered. 02 has nothing to be faithful to, so node 3 shuffles. ⚠ The draw is therefore
     only recorded by the reading itself and the write-back; if a drawn card ever has to
     appear BEFORE delivery (a booking page, a thank-you screen), the draw has to move to
     the server first.
  3. A CLOSED CARD VOCABULARY. 07 slugifies whatever the model typed and its own test plan
     calls that a live hazard — 'The Wheel' 403s and renders as a silent gap in a paid PDF.
     Here the card is chosen by node 3 from scripts/02-houses.json and carried as a SLUG all
     the way to the renderer. The model never names a file.
  4. THE WAIT SITS BETWEEN THE PDF AND THE SIGNING. 07 signs, then waits, so a 7-day link
     spends its first day in a queue. Here the document is built immediately and the link is
     minted at the moment of delivery. ⭐ It also buys the thing 07's grade log cannot buy:
     a full day between a failed grade and the send, in which a human can still stop it.

MODEL
  Anthropic Messages API, `claude-opus-5`. ⛔ Not 07's GPT: this repo's .env carries
  ANTHROPIC_API_KEY and no OPENAI_API_KEY, so an Anthropic build is the one that can be
  dry-run locally before it is ever pushed. Thinking is ON by default on Opus 5 and
  `budget_tokens` is rejected with a 400 — the lever is `output_config.effort`.
"""
import json, os, sys

_HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = json.load(open(os.path.join(_HERE, "02-houses.json"), encoding="utf-8"))

# ─── the contract with the rest of the codebase ────────────────────────────────
STRIPE_PRODUCT = "be_twin_flame"          # shared/backendOffers.ts → stripeProduct
OFFER_KEY      = "twin-flame"             # BackendOfferKey, and AWeber's `offer` field
DELIVERED_TAG  = "be-02-delivered"        # server/lib/backendCustomerList.ts
AWEBER_ACCOUNT = "442730"
AWEBER_LIST    = "6972552"                # theseerwithin BE customers — reading buyers
APP_BASE_URL   = "https://TODO-set-app-base-url"
SUPABASE_PROJ  = "https://pqolqzddzxubquukxnhk.supabase.co"
SUPABASE_BUCKET= "analysis_pdf"
S3             = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/"
# 🔴 TWELVE FACE-DOWN. `02-zodiac-spread.jpg` showed her three face-up with the strapline
#    "Three you have seen. Nine you have not." — false from the moment the offer became
#    twelve NEW cards, and false on page one before she has read a word.
# ⛔ A NEW KEY, NOT AN OVERWRITE. The old one is left where it is; nothing that already
#    points at it silently changes picture. Rebuild with scripts/make-02-cover.mjs.
COVER          = "https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/02-cover-twelve.jpg"

# ⭐ ONE GENERATOR, TWO PROVIDERS (--openai). The point is a LIKE-FOR-LIKE comparison: same
#    spec, same draw, same prompts, same parsers — only the model call changes. ⛔ Never fork
#    this file to try a provider; a forked generator stops being a comparison the day one side
#    is edited. The delta is documented in docs/07-marcus/07-openai-credential.md, which is 07's
#    own migration of 2026-09-06.
PROVIDER = "openai" if "--openai" in sys.argv else "anthropic"
# ⭐ `--arc v2` selects the SECOND letter's buyer for the TEST-DRIVE FIXTURE ONLY. The full and
#    --test builds read the arc off Stripe metadata `c` at run time, so the flag has no meaning
#    there — and a flag that is silently ignored is the bug push-02-n8n.py's unknown-flag guard
#    exists to stop. It is an error outside --testdrive.
ARC = sys.argv[sys.argv.index("--arc") + 1] if "--arc" in sys.argv else "v1"
if ARC not in ("v1", "v2"):
    raise SystemExit(f"\n  ⛔ --arc must be v1 or v2, not {ARC!r}\n")
if "--arc" in sys.argv and "--testdrive" not in sys.argv:
    raise SystemExit("\n  ⛔ --arc only applies to --testdrive; the live build reads the arc off Stripe.\n")
if "--manual-only" in sys.argv and ("--testdrive" not in sys.argv or "--screen" in sys.argv or "--order" not in sys.argv):
    raise SystemExit("--manual-only requires --testdrive and an explicit --order; excludes --screen")

MODEL_WRITE = "claude-opus-5"
MODEL_GRADE = "claude-opus-5"
if PROVIDER == "openai":
    # 🔴 UNVERIFIED MODEL ID — supplied by the operator, 2026-09-09, and NOT confirmable from
    #    here (no OPENAI_API_KEY in this repo, and it post-dates what this build script's author
    #    could check). ⛔ A wrong id is a 404 on the FIRST house call of every reading — loud,
    #    instant and free, but it fails on a real order if nobody test-drives first.
    #    Confirm against the account before any live traffic:
    #      curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" \
    #        | python3 -c "import sys,json;[print(m['id']) for m in json.load(sys.stdin)['data']]"
    MODEL_WRITE = "gpt-5.6-luna"
    MODEL_GRADE = "gpt-5.6-luna"

# ⭐ `--model <id>` OVERRIDES BOTH, so a model sweep is a flag and never an edit. Editing a
#    constant to try a model means the file's committed state depends on whichever experiment
#    ran last, and the next person inherits somebody's half-finished test as the default.
#    ⚠ `--grader <id>` splits them — 07 writes with a full model and grades with a mini, which
#    is the cheaper shape for a yes/no checklist scored against handed-over arithmetic.
if "--model" in sys.argv:
    MODEL_WRITE = MODEL_GRADE = sys.argv[sys.argv.index("--model") + 1]
if "--grader" in sys.argv:
    MODEL_GRADE = sys.argv[sys.argv.index("--grader") + 1]
# ⚠ The grader is the same model on purpose. A cheaper grader is a real option and 07 takes
#   it — but that is a cost decision the operator has not been asked, and a downgrade nobody
#   chose is the wrong default. Change both strings here if you want one.
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OPENAI_URL    = "https://api.openai.com/v1/chat/completions"

# ⭐ REAL IDS, read off ezyabsorb.app.n8n.cloud on 2026-09-07 — these credentials already
#    exist and are in use by the live flows, so nothing here needs creating.
#    ⛔ n8n matches a credential by ID; the name is only a label. A wrong id fails at run time
#    with an auth error that reads like a bad key.
# 🔴 NOT `anthropic-header-auth` (8H0t9TxeiNyZfZbK), which is what 07 is wired to. Measured on
#    execution 30470, 2026-09-07: that credential's key is NOT SCOPED TO A WORKSPACE, so
#    Anthropic answers 400 — "this request must include the anthropic-workspace-id header".
#    ⛔ 07 has the same wiring and would fail the same way on its first real order.
#    This one is the credential the LIVE flow (UaLPiVVs7j5jzNyO, fulfilling real orders today)
#    uses for api.anthropic.com. The integrations are copied, not invented — that rule applies
#    to the model call too, and skipping it cost one execution to learn.
ANTHROPIC_CRED = {"id": "81fRDrOUHCoZiLBw", "name": "seer-within-pdf-report-generator"}
# ⭐ ROUTE A (operator, 2026-09-09): reuse the OpenAI credential this instance already has
#    rather than creating a Header Auth one. It is n8n's PREDEFINED openAiApi type, which
#    builds the Authorization header itself — so there is no "Bearer " to mistype, which is
#    the failure 07's own credential doc warns about at length.
# ⚠ It is SHARED with other workflows on this instance. Spend shows up against whatever
#    account it holds.
OPENAI_CRED    = {"id": "de6vaPn0hPs3icyh", "name": "OpenAi account"}
PDFSHIFT_CRED  = {"id": "8TelHH6oJEzYzw2r", "name": "pdfshift-header-auth"}
SUPABASE_CRED  = {"id": "Xu3vjsJHaiLZ1ILQ", "name": "wealth-scriba-customer-report-generator"}
AWEBER_CRED    = {"id": "InacwW76ep6ltnUU", "name": "Aweber for Heart Readr"}
BE_TOKEN_CRED  = {"id": "TODO", "name": "be-fulfilment-token"}

# ─── the voice ─────────────────────────────────────────────────────────────────
# ⭐ DERIVED FROM copy/02/evelyn-esl-voice-profile.md (§1, §3, §6), which states that it
#    governs 02-P1/02-P3 — the exact document this workflow generates — and from the shipped
#    build/02/02-product.md, which is the known-good target.
#
# 🔴 THE FIRST VERSION OF THIS BLOCK WAS WRITTEN FROM MEMORY AND IT SHIPPED THREE WRONG RULES.
#    Recorded here because each one is a trap a rewrite would walk back into:
#      1. It nearly banned "dear" (2-3 uses). The profile calls it LOAD-BEARING and the
#         shipped product uses it 12 times. The ban was imported from Marcus's file, which
#         the profile warns against BY NAME: "Don't import one persona's ban into the other's".
#      2. It banned claims about a real third party and, by implication, dated windows. This
#         format LIFTED both guardrails on purpose (operator, 2026-08-03). "The person on
#         your mind is going to become more attentive" is a canonical GOOD line here.
#      3. It taught the letter's withhold device — "it shows me X, it does not show me Y" —
#         as a voice trait AND as a rotated move. Measured: that phrasing appears 7 times in
#         the letter, ZERO times in the paid product, and 11 times in the first generated
#         reading. The withhold is the LETTER's engine. In the paid twelve it is over.
VOICE = """You are Evelyn Cross, writing one woman's paid twelve-card tarot reading.

She already believes the deck works. She is testing whether these twelve were laid for her.
The earlier letter withheld answers; this reading finishes the exact promises assigned to rooms
2, 5, 8 and 12. Answer those promises here without a later reveal. Those promises do not establish
additional facts about the buyer or anyone else.

Write as an essayist and a working reader addressing one intelligent adult. Each room receives
its own architecture. Follow that allocation instead of repeating one teaching sequence. Ground
the interpretation in the printed source and the card's traditional meaning somewhere in the
argument, but enter, develop and finish according to the room's assigned work. Teach when a
meaning needs opening out; move directly when it does not. Do not announce the stages of your
reasoning.

State the card's meaning plainly. In a promise room, give the exact promised answer firmly.
In the other rooms, the conclusion is an interpretation of a field of life: personal application
can remain conditional. A definite interpretation does not require a definite claim about her
history. Explain what the card helps her distinguish and why it matters. She retains the right
to recognize herself, disagree with an illustration, and make her own choices. Do not make the
meaning depend on obeying the reader. Do not use psychic hedges such as "I feel" or "I sense".

Read the card in its house and in the spread. The supplied lore is an accuracy fence, not copy
for the buyer. A reversal modifies the same card; it never becomes the opposite and its picture
is never imagined upside down. Her three earlier cards are context only and are not dealt here.
The twelve Majors were chosen deliberately, so do not marvel at their presence.

Use concrete language without inventing private facts. The room's claim ledger distinguishes
what is established from what must remain open. Illustrative situations remain possibilities;
never convert one into her biography. Address her as an individual rather than explaining what
women as a group do. A term of address is optional only where the room allocation permits it.
First person is available for a reader's judgment or aside, but never force a refusal formula
into every room.

House 5 carries one relative week for the promised love event. Other houses introduce no
clock for events or actions. The separate first-sign countdown belongs to the close alone.
A house may describe a sign without dating it. Never use a calendar date.

Vary sentence and paragraph length. Let explanation breathe. Conditional reasoning may test a
distinction or consequence without weakening the final answer. Use emphatic fragments and
em-dashes sparingly. Do not shout, stack slogans, repeat a closing construction, or turn every
paragraph into a verdict. The document should sound like one person thinking carefully with
another, with respect on both sides."""

# What the letter already spent. ⛔ Fixed for every buyer — 02's free read is a piece of
# static copy, not a per-day event, which is the other reason node 3 needs no API call.
EMAIL_SAID_PHASE2_ARCHIVE = """THE LETTER SHE ALREADY HAS. Three cards, and you told her this much:
  · the WORLD — the best card in the deck. The end of a run of misfortune and the start of a
    run of luck; a windfall coming, and a second behind it that changes her love life. You said
    you could not see WHICH DOOR they come through.
  · the LOVERS — two readings, and you refused to choose between them: renewal of something she
    already has, or an encounter with someone she already knows. You said both feel identical in
    the first weeks, that one of them costs her a year, and that only the HOUSE could separate
    them. You also promised that the twelve would give you the week.
  · the TOWER — it arrives as a person and not an event, someone already in the frame: either
    somebody from before coming back at the wrong moment, or somebody still here who has
    already started leaving. You promised her the shape of it, weeks out — never a day.
🔴 ⛔ AND THOSE THREE CARDS ARE NOT IN THE SPREAD YOU ARE WRITING. The letter promised her
   twelve NEW ones, in her own words — "And they'll be twelve new cards, dear. Not these three
   again. These three have already said what they came to say." ⛔ So never say one of them
   fell in a house, never lay one, never list them among the twelve. They are quoted here ONLY
   so you know what she is still owed an answer to.
⭐ THE ANSWER LIVES IN THE ROOM, and that is the letter's own mechanism, stated twice: "the
   house the Lovers falls into is what separates them". Whichever NEW card is standing in that
   room is what answers her. The hand-written product does exactly this — its fifth house holds
   the Chariot and is headed "and this is your answer about the Lovers".
⛔ Do not re-explain any of that. She has read it, and reading it back to her is the fastest
   way to look automated.
⛔ Do not borrow its wording or its cadence either. It is quoted so you can AVOID it.
⚠ Note what is NOT quoted above: the pictures. The letter described all three, and a passage
   that opens on the letter's own description of them is a passage she has already read. What
   each card is drawn with reaches you separately, per house, and it is longer than the letter's
   version on purpose — open somewhere she has not been taken before.

⭐ AND YOU CHOSE THE MAJORS YOURSELF. The letter carries a section headed "Why I'm using the
   Major Arcana for yours": seventy-eight cards in a deck, twenty-two of them trumps, and you
   wrote "I'm going to pull your twelve from the Major Arcana only. No minors, no filler."
⛔ SO TWELVE TRUMPS IS NOT A MARVEL, NOT AN OMEN AND NOT A COINCIDENCE. Never present it as
   rare, as the deck deciding something, or as a thing you have seen four times in thirty years.
   She has read the paragraph in which you decided it, and a reader astonished by her own
   instruction is a reader who did not give the instruction. The hand-written product states it
   as plain fact in one short sentence and moves straight on to the reading.
🔴 ⛔ AND DO NOT QUOTE IT. An earlier version of this block carried the product's own sentence as
   an example and the writer reproduced it word for word in a real reading. A worked example
   inside a prompt is not an illustration to you. It is a template. Say the fact your own way.
⭐ BUT SAY IT AS THE WEIGHT IT IS, NOT AS A LABEL. In the letter you did not merely announce the
   deck — you told her a Majors-only twelve is the heaviest reading you do, that it costs you a
   whole night and takes something out of you, and that you keep it for the women whose first
   draw asks for it. Hers asked for it. ⛔ A reading that reports "all twelve are Major Arcana"
   and moves on has removed the boast AND the meaning; two real readings did exactly that, and
   the deck went from the reason this cost thirty-five dollars to a line of stock-keeping. Give
   one clause of that weight back, in the opening, in your own words, once."""

EMAIL_SAID = """CONTEXT FROM HER FIRST LETTER
The World promised two windfalls; house 2 identifies the door of the first and house 8 carries
the second into her love life. The Lovers left two branches: renewal of what she has, or the
arrival of someone already known; house 5 chooses the branch, gives its promised detail, and is
the one dated room. The Tower asked which already-present person it described and how close the
change is; house 12 settles that without a date.

Those three cards were removed before this twelve-card spread. Never announce them as dealt or
missing, and do not reteach the letter. Each promise is paid by the new card in the assigned
room: the card decides how, never whether. The writer of each promise room receives its full
obligation separately.

The letter also said you deliberately chose a Majors-only twelve because it is the heaviest
reading you do. Give that weight one natural clause in the opening. Do not treat the Majors as
rare or accidental. Do not borrow wording or picture descriptions from the letter."""

# ⭐ THE SECOND LETTER (02-E3), for v2 buyers only. Appended to the cached block AFTER the shared
#    text — in 4a and in 6 — when the order's arc is v2. Node 3 decides the arc from Stripe
#    metadata `c` (the letter's own CTA range). ⛔ Same rules as EMAIL_SAID: the pictures are not
#    quoted, the letter's lines are quoted only so the writer knows the debt, and nothing here is
#    phrasing for the document.
EMAIL_SAID_V2_PHASE2_ARCHIVE = """AND SHE HAS A SECOND LETTER, written to her after the first, with three more cards. She has
read both, so she is owed both. In the second you told her this much:
  · the STAR — painted to come after the Tower, not instead of it. Renewal, clarity, a run of
    luck moving into place; it has already started. The woman on it pours two jugs, one back
    into the pool and one onto the dry land, and you said she is being replenished — but you
    could not see WHICH of her two pourings is the one being filled back up.
  · the EMPEROR — structure, the shape a life is held in. You asked whether the structure she
    is standing inside is one she built or one she is being kept in: a floor under her, or a
    room with the door shut. You said they feel identical from within, that a decision about
    it is coming toward her, and that only the HOUSE could separate them — the house of her
    home, or the house of what owns her. You also said she has stopped being the one who
    chooses, and that the room where she handed over the deciding is not the relationship: it
    is money, or work, or health, and the twelve would show which.
  · the MOON — she has been reading a man by moonlight, reacting to what her fear paints onto
    his silences. You said it is already running, not coming; that one piece of what she has
    worked out in the dark is genuinely right, probably the piece she keeps talking herself out
    of, and the rest is paint; and that you could not tell her from one card which piece is the
    real one.
🔴 ⛔ THOSE THREE ARE NOT IN THE SPREAD EITHER. Six cards were spent across her two letters and
   none of the six is laid here. Never say one fell in a house, never lay one, never list one.
⭐ THE MECHANISM, STATED AGAIN IN THE SECOND LETTER: "the house the Emperor falls into is
   precisely what separates the two". The same engine — the room answers, and whichever NEW
   card stands in it is what answers her.
⛔ Do not re-explain the second letter, do not borrow its wording, and do not quote its
   pictures. Same rule as the first."""

EMAIL_SAID_V2 = """CONTEXT FROM HER SECOND LETTER
She is owed both letters. The Star asked which part of her life is being replenished; its
assigned room names it. The Emperor asked whether the structure around her is support or
confinement, whether it sits in home or shared power, and whether she stopped choosing in money,
work, or health. The Moon asked which part of her reading of a man is real and which part fear
painted in. The v2 obligations assign every part to rooms 2, 5, 8 and 12.

The Star, Emperor and Moon were also removed before the twelve-card spread. Never announce any
of the six letter cards as dealt or missing. Do not recap or borrow the second letter; the new
card standing in each assigned room supplies the answer."""

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

def claude(name, pos, body, note):
    """One model call as an n8n HTTP node — Anthropic, or OpenAI under --openai.

    ⛔ ANTHROPIC: x-api-key, not Bearer. Anthropic takes no Authorization header, and a header
       credential built for OpenAI 401s here in a way that reads exactly like a bad key.
    ⛔ ANTHROPIC: anthropic-version is REQUIRED on every request. Omitting it is a 400 on the
       first live order and on none of the tests, because a test that forgets it forgets it
       everywhere.
    ⭐ OPENAI: the predefined `openAiApi` credential builds Authorization itself, so there is no
       header block and nothing to mistype."""
    if PROVIDER == "openai":
        return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
            "method": "POST", "url": OPENAI_URL,
            "authentication": "predefinedCredentialType", "nodeCredentialType": "openAiApi",
            "sendBody": True, "specifyBody": "json", "jsonBody": body,
            "options": {"timeout": 600000, "response": {"response": {"neverError": False}}},
        }, {"credentials": {"openAiApi": OPENAI_CRED}, "notes": note})
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "method": "POST", "url": ANTHROPIC_URL,
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "content-type", "value": "application/json"},
            {"name": "anthropic-version", "value": "2023-06-01"},
            # ⭐ Opus 5 can decline on a safety classifier and return HTTP 200 with
            #    stop_reason 'refusal'. This offer is a stranger's love life and money, which
            #    is exactly the content that trips one. With this beta + "fallbacks":"default"
            #    the API re-runs the same request on a fallback model inside the same call,
            #    so one classifier hiccup does not cost a paid order its reading.
            {"name": "anthropic-beta", "value": "server-side-fallback-2026-07-01"},
        ]},
        "sendBody": True, "specifyBody": "json", "jsonBody": body,
        "options": {"timeout": 600000, "response": {"response": {"neverError": False}}},
    }, {"credentials": {"httpHeaderAuth": ANTHROPIC_CRED}, "notes": note})


def prose_body(model, effort, ceiling):
    """The request body for a PROSE call (a house, or the joiner). Same prompt either way.

    ⭐ The system block goes FIRST in both. Anthropic caches it explicitly with cache_control;
       OpenAI caches automatically but only on a shared PREFIX, so static content leading is
       what makes the twelve house calls cheap on either side."""
    if PROVIDER == "openai":
        return ("={\n"
          f'  "model": "{model}",\n'
          f'  "max_completion_tokens": {ceiling},\n'
          f'  "reasoning_effort": "{effort}",\n'
          '  "messages": [\n'
          '    { "role": "system", "content": {{ JSON.stringify($json.voice) }} },\n'
          '    { "role": "user",   "content": {{ JSON.stringify($json.prompt) }} }\n'
          '  ]\n'
          "}")
    return ("={\n"
      f'  "model": "{model}",\n'
      f'  "max_tokens": {ceiling},\n'
      f'  "output_config": {{ "effort": "{effort}" }},\n'
      '  "fallbacks": "default",\n'
      '  "system": [{ "type": "text", "text": {{ JSON.stringify($json.voice) }},\n'
      '               "cache_control": { "type": "ephemeral" } }],\n'
      '  "messages": [{ "role": "user", "content": {{ JSON.stringify($json.prompt) }} }]\n'
      "}")


def ours(name, pos, path, body_expr, note):
    """A call to our own API. ⛔ Both the URL and the token are placeholders until the parked
       send decision is made — see docs/02/02-n8n-test-plan.md."""
    return node(name, "n8n-nodes-base.httpRequest", 4.2, pos, {
        "method": "POST", "url": f"={APP_BASE_URL}{path}",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "authorization", "value": "={{ 'Bearer ' + $credentials.token }}"}]},
        "sendBody": True, "specifyBody": "json", "jsonBody": body_expr,
        "options": {"timeout": 30000},
    }, {"notes": note})

# ─── 3 · the draw + the brief ──────────────────────────────────────────────────
DRAW_JS = r"""
// Turn one paid webhook into ONE ITEM PER HOUSE, and make the draw.
//
// ⭐ 02 NEEDS NO API READ. 07 fetches a stored cut and her typed questions; this offer has
//    neither. Her email, her first name, the order id and the bump flag are all on the
//    Stripe session, and what the sales letter already told her is FIXED COPY, written into
//    this workflow at build time. So there is no GET endpoint to build and none to break.
const inp = $input.first().json;

// ⛔ A REGENERATION MUST NOT RE-DRAW. Node 8c loops back here on a failed grade, and if this
//    node shuffled again the second attempt would be a DIFFERENT reading of DIFFERENT cards
//    — the grade log would then describe cards that were never sent. The loop carries the
//    draw back and this branch reuses it. (07 cannot hit this bug: its cut is stored.)
const replay = !!(inp && inp.order && inp.draw);

// ⭐ THE MANUFACTURED-AGENCY HEADER, which is the shipped product's own device — twelve
//    varied ways of saying the card chose itself. ⛔ The profile names its failure mode: the
//    source material ran three identical headers in a row and the device died. One phrase per
//    house, each used once, so a repeat is structurally impossible.
const AGENCY = [
  'The cosmos has guided your choice to',
  'The celestial wisdom has guided your selection to',
  'The cosmic alignment has guided your choice to',
  'Your choice has been guided to',
  'The cosmic forces have guided your selection to',
  'Your choice fell on',
  'Your choice has fallen on',
  'The cosmos has turned your hand to',
  'The celestial wisdom has guided your selection to',
  'Your choice has led you to',
  'Your selection has fallen to',
  'And your twelfth card is',
];
const HOUSES     = __HOUSES__;
const CARDS      = __CARDS__;        // slug → the name Evelyn says. ⛔ Never slugify a name.
const POOL       = __POOL__;         // every Major neither letter has spent
const ARCS        = __ARCS__;         // per letter: the story shape, and which cards may stand in each room
const OBLIGATIONS = __OBLIGATIONS__;  // per arc: HOUSE NUMBER → what that room owes her
const TARGET_WORDS   = __TARGET__;
const POSITION_SHARE = __SHARE__;
const REVERSAL_RATE  = __REVRATE__;

const seedOf = (str) => { let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h;
};

let order, twelve;
if (replay) {
  order  = inp.order;
  twelve = inp.draw;
} else {
  const s = (inp.body && inp.body.data && inp.body.data.object) || {};
  const md = s.metadata || {};
  // ⛔ The SAME fallback chain the server used when it subscribed her (beOrders.ts). Look her
  //    up on a different field from the one she was written under and node 14 finds nobody.
  const email = (s.customer_details && s.customer_details.email) || s.customer_email
              || md.email || null;
  if (!email) throw new Error('no email on the session — cannot deliver, hold the order');
  order = {
    order_id:   s.id,                       // cs_… — this IS her AWeber stripe_order_id
    email,
    first_name: md.firstName || 'Friend',
    paid_at:    new Date((s.created || 0) * 1000).toISOString(),
    bump:       md.bump === '1',
  };

  // ── the arc, then the cut ──────────────────────────────────────────────────
  // ⭐ WHICH LETTER SHE BOUGHT FROM. The letters' CTAs carry separate ranges — 02-E2/v1 sends
  //    ?c=1..6, 02-E3/v2 sends ?c=21..26 — and the booking screen carries `c` into Stripe
  //    metadata as `c` (server/routes/backendOffers.ts). ⛔ Absent, or outside the v2 range,
  //    is v1: every buyer has read letter 1. A v2 buyer has read BOTH, and is paid both.
  const cNum = parseInt(md.c, 10);
  const arc = (Number.isFinite(cNum) && cNum >= ARCS.c_ranges.v2[0] && cNum <= ARCS.c_ranges.v2[1])
    ? 'v2' : ARCS.default;
  order.c = md.c || null;
  order.arc = arc;
  order.mechanism = ARCS[arc].mechanism;   // the letter's own line, handed to the promise rooms
  const OBLIGATION = OBLIGATIONS[arc];

  // ⭐ TWELVE NEW CARDS, ARC-GUIDED (operator, 2026-09-09 — "option 2 is safer"). Still no fixed
  //    cards and still nothing re-laid: the pool is every Major neither letter has spent. But the
  //    twelve are no longer dealt straight. Her letter sets the STORY SHAPE — recognition, then
  //    shadow, then choice, then arrival for v1; illusion, clarity, power, integration for v2 —
  //    and each house is filled from the cards whose engine can carry that house's part of it
  //    (scripts/02-houses.json → arcs). Same arc, same shape; different buyer, different cards.
  // ⛔ THE MECHANISM IS UNTOUCHED. The letters' engine was never "your card moves" — it was
  //    THE HOUSE DECIDES. A new card standing in the room still answers it, and THE CARD STILL
  //    DECIDES HOW, NEVER WHETHER: a room's list keeps out only the cards whose lore FENCE would
  //    contradict what the room owes (no card that cannot give a date in the one dated room),
  //    never a card because it is bad news.
  // ⭐ SEEDED OFF HER ORDER ID, like every rotation in 4a. The draw is a fact about the order,
  //    not about the moment the webhook arrived — the same order id always lays the same twelve.
  let seedState = seedOf(String(order.order_id || 'no-order') + '|draw|' + arc);
  const rnd = () => { seedState = (Math.imul(seedState, 1103515245) + 12345) >>> 0;
    return (seedState >>> 8) / 16777216; };
  const shuffle = (a) => { const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]]; } return b; };

  if (POOL.length < HOUSES.length) {
    throw new Error(`only ${POOL.length} cards for ${HOUSES.length} houses`);
  }
  const roles = ARCS[arc].roles;
  const cand = {};
  for (const h of HOUSES) {
    const list = ((roles[String(h.number)] || {}).cards || []).filter((c) => POOL.includes(c));
    if (!list.length) throw new Error(`arc ${arc}: no candidate cards for house ${h.number}`);
    cand[h.number] = shuffle(list);
  }
  // ⭐ TIGHTEST ROOM FIRST, THEN BACKTRACK. The promise rooms have the shortest lists, so they
  //    are filled first and get the widest choice; a late room that finds every candidate taken
  //    hands one back and the search moves on. scripts/check-02-draw.mjs sweeps thousands of
  //    seeds per arc and refuses the build if any one of them starves.
  const fillOrder = HOUSES.map((h) => h.number)
    .sort((a, b) => cand[a].length - cand[b].length || a - b);
  const pick = {}, used = new Set();
  const solve = (i) => {
    if (i === fillOrder.length) return true;
    const h = fillOrder[i];
    for (const c of cand[h]) {
      if (used.has(c)) continue;
      used.add(c); pick[h] = c;
      if (solve(i + 1)) return true;
      used.delete(c); delete pick[h];
    }
    return false;
  };
  if (!solve(0)) throw new Error(`arc ${arc}: no twelve satisfies every room for ${order.order_id}`);

  twelve = HOUSES.map((h) => ({
    house: h.number, house_name: h.name, job: h.job,
    card: pick[h.number], card_name: CARDS[pick[h.number]],
    reversed: rnd() < REVERSAL_RATE,
    agency: AGENCY[h.number - 1],
    // ⭐ THE PROMISE BELONGS TO THE ROOM. Whatever card lands here has to pay it — the card
    //    decides how it arrives, never whether it does. She is holding the letter.
    obligation: OBLIGATION[String(h.number)] || null,
    owes: !!OBLIGATION[String(h.number)],
  }));
}
const attempt = (replay ? (inp.attempt || 0) : 0) + 1;

// ── deterministic reading architecture + claim ledger ──────────────────────
// These are allocations of intellectual work, never sample prose. They vary where the source,
// buyer, explanation and consequence enter so twelve calls do not execute the same ladder.
// Every choice is seeded from the order id and therefore survives a retry or controlled replay.
const ENTRIES = [
  'enter through the source evidence',
  'enter through the question asked by the house',
  'enter through a recognizable pattern in ordinary life',
  'enter through the tension between this card and this house',
  'enter through a consequence, then trace what produces it',
  'enter by clarifying the traditional meaning against a common misreading',
];
const DEVELOPMENTS = [
  ['plain explanation', 'conditional distinctions', 'personal application'],
  ['an ordinary comparison only if it adds clarity', 'the comparison\'s limit', 'consequence'],
  ['several categories the buyer can fill herself', 'source evidence', 'choice and cost'],
  ['how the house changes the card', 'conditional consequences', 'personal application'],
  ['source evidence later in the argument', 'practical implication', 'what remains unchanged'],
  ['the card-house tension', 'plain meaning', 'personal application'],
];
const ENDINGS = [
  'finish on the consequence of the interpretation',
  'finish on a precise observation the buyer can recognize',
  'finish on a proportionate and reversible action',
  'finish on the cost of the available choice',
  'finish by resolving the room\'s central tension',
  'finish on what this changes in the wider spread',
];
const ENTRY_POSITIONS = ['early', 'middle', 'late'];
const shuffled = (values, tag) => {
  const out = values.slice();
  let state = seedOf(`${order.order_id}|architecture|${tag}`);
  const rnd = () => { state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return (state >>> 8) / 16777216; };
  for (let i = out.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1));
    [out[i], out[k]] = [out[k], out[i]]; }
  return out;
};
const houseNumbers = HOUSES.map((h) => h.number);
const entryDeck = shuffled([...ENTRIES, ...ENTRIES], 'entries');
// Couple development to entry occurrence so the two rooms sharing an entry can never receive
// the same development. Both decks remain seeded, and every development still occurs twice.
const firstDevelopments = shuffled(DEVELOPMENTS, 'development-first');
const developmentShift = 1 + (seedOf(`${order.order_id}|architecture|development-shift`) % 5);
const secondDevelopments = firstDevelopments.map((_, i) =>
  firstDevelopments[(i + developmentShift) % firstDevelopments.length]);
const entryOccurrences = new Map();
const developmentDeck = entryDeck.map((entry) => {
  const entryIndex = ENTRIES.indexOf(entry);
  const occurrence = entryOccurrences.get(entry) || 0;
  entryOccurrences.set(entry, occurrence + 1);
  return occurrence === 0 ? firstDevelopments[entryIndex] : secondDevelopments[entryIndex];
});
const endingDeck = shuffled([...ENDINGS, ...ENDINGS], 'endings');
const customerDeck = shuffled([...ENTRY_POSITIONS, ...ENTRY_POSITIONS,
  ...ENTRY_POSITIONS, ...ENTRY_POSITIONS], 'customer-entry');
const addressHouses = new Set([0, 1, 2].map((q) =>
  shuffled(houseNumbers.slice(q * 4, q * 4 + 4), `address-${q}`)[0]));
const waiteNameHouses = new Set([0, 1, 2, 3].map((q) =>
  shuffled(houseNumbers.slice(q * 3, q * 3 + 3), `waite-name-${q}`)[0]));
const optionalCrossHouses = new Set(shuffled(houseNumbers, 'optional-cross')
  .filter((h) => !twelve.find((p) => p.house === h).owes).slice(0, 2));
// Eight ordinary rooms receive one restrained scan point. Promise rooms do not: bold would
// add visual authority to money, timing or third-party claims. Placement rotates so emphasis
// does not turn every ending into the same visual formula.
const emphasisCandidates = shuffled(houseNumbers.filter((h) =>
  !twelve.find((p) => p.house === h).owes), 'emphasis-houses');
const emphasisPositions = shuffled([
  'early', 'early', 'early', 'middle', 'middle', 'middle', 'late', 'late',
], 'emphasis-positions');
const emphasisByHouse = new Map(emphasisCandidates.map((h, i) => [h, emphasisPositions[i]]));
const WORD_BUDGET = __WORD_BUDGET__;
// Balanced and seeded: vary room lengths without moving the whole-report target.
const wordJitter = shuffled([-20, -20, -10, -10, 0, 0, 0, 0, 10, 10, 20, 20], 'word-budgets');

twelve = twelve.map((p) => {
  const i = p.house - 1;
  const bounds = WORD_BUDGET.extended.houses.includes(p.house) ? WORD_BUDGET.extended
    : p.owes ? WORD_BUDGET.promise : WORD_BUDGET.ordinary;
  const target = bounds.target + wordJitter[i];
  const crossMode = p.owes ? 'required by the promise ledger'
    : (optionalCrossHouses.has(p.house) ? 'permitted only if it changes the interpretation'
      : 'keep this room self-contained');
  const architecture = {
    entry: entryDeck[i],
    customer_entry: customerDeck[i],
    development: developmentDeck[i],
    ending: endingDeck[i],
    target_words: target,
    min_words: bounds.min,
    max_words: bounds.max,
    may_use_address: addressHouses.has(p.house),
    may_name_waite: waiteNameHouses.has(p.house),
    cross_room: crossMode,
    emphasis_position: emphasisByHouse.get(p.house) || 'none',
  };
  const claim_ledger = {
    permitted_sources: [
      'the buyer material summarized in the sales-letter context',
      `the question belonging to house ${p.house}`,
      `the traditional meaning and supplied lore of ${p.card_name}`,
      'named evidence from another dealt card only when the architecture permits it',
      ...(p.owes ? ['the result explicitly required by this room\'s promise obligation'] : []),
    ],
    obligation: p.obligation || null,
    forecast_scope: p.owes
      ? 'state every promised result firmly; derive how it arrives from this card and house, and add no biography, administrative fact, motive or causal condition beyond the obligation'
      : 'state the card-and-house interpretation firmly in the present while leaving her past actions, private motives and unseen events unclaimed',
    unsupported_private_fields: [
      'duration', 'profession', 'possession', 'diagnosis', 'private ritual',
      'relationship history', 'count or tally', 'specific location', 'existing paperwork',
      'private conversation', 'payment mechanics', 'customer motive', 'third-party intention',
    ],
    illustration_rule: 'an illustrative situation remains a possibility and never becomes her history',
    history_rule: 'do not assert a specific past event, frequency or recency for her unless the buyer context or obligation establishes it',
    action_scope: 'direct advice may concern only observation, reflection or a reversible change inside her own environment; never make a forecast depend on contacting, documenting, confronting, negotiating with or changing terms for another person or institution',
  };
  return { ...p, architecture, claim_ledger };
});
const architecturePlan = twelve.map((p) => ({
  house: p.house, card: p.card, architecture: p.architecture, claim_ledger: p.claim_ledger,
}));

// 🔴 A card with no entry in CARDS cannot be rendered — the renderer would have no filename
//    and S3 answers 403, not 404, so it looks like a permissions fault and reads as a hole in
//    the middle of a paid document. Refuse here, where it is one red execution.
for (const p of twelve) {
  if (!p.card_name) throw new Error(`house ${p.house}: '${p.card}' is not in the card vocabulary`);
}

return twelve.map((p, i) => ({ json: {
  ...order,
  attempt,
  position: p,
  index: i + 1,
  total: twelve.length,
  draw: twelve,                                   // carried whole, for the replay branch
  architecture_plan: architecturePlan,
  target_words: TARGET_WORDS,
  position_words: Math.round(TARGET_WORDS * POSITION_SHARE),
}}));
"""

# ⭐ TWELVE NEW CARDS (operator, 2026-09-08). Nothing is fixed and nothing is re-laid — the pool
#    is the whole vocabulary minus every card the two letters have already spent.
POOL_LIST  = sorted(set(SPEC["cards"]) - set(SPEC["draw"]["excluded"]))
if len(POOL_LIST) < SPEC["draw"]["houses"]:
    raise SystemExit(f"\n  ⛔ only {len(POOL_LIST)} cards left for {SPEC['draw']['houses']} houses."
                     "\n     A letter has spent more of the deck than the spread can afford.\n")
# ⛔ KEYED BY HOUSE NUMBER NOW, NOT BY CARD. The three she was shown are not in the spread, so a
#    promise cannot travel with a card — it belongs to the ROOM that answers it. See the long
#    note in scripts/02-houses.json → obligations.
OBLIG      = {k: v for k, v in SPEC["obligations"].items() if not k.startswith("_")}
if not all(k.isdigit() and 1 <= int(k) <= SPEC["draw"]["houses"] for k in OBLIG):
    raise SystemExit("\n  ⛔ obligations must be keyed by house number.\n")
# ⭐ A v2 BUYER HAS READ TWO LETTERS AND IS OWED BOTH. `obligations_v2` extends each of v1's four
#    strings VERBATIM with the second letter's debt for that room (Star → 2, Emperor → 5 and,
#    conditionally, 8, Moon → 12). The v1 text is a byte-prefix of the v2 text, so every audit
#    that holds for v1 holds for v2 — the build refuses a v2 string that drifts from its opening.
OBLIG_V2   = {k: v for k, v in SPEC.get("obligations_v2", {}).items() if not k.startswith("_")}
if set(OBLIG_V2) != set(OBLIG):
    raise SystemExit(f"\n  ⛔ obligations_v2 must cover exactly the rooms obligations does: "
                     f"{sorted(OBLIG, key=int)} vs {sorted(OBLIG_V2, key=int)}\n")
for _k in OBLIG:
    if not OBLIG_V2[_k].startswith(OBLIG[_k]):
        raise SystemExit(f"\n  ⛔ obligations_v2[{_k}] does not begin with obligations[{_k}] verbatim.\n")
OBLIGS     = {"v1": OBLIG, "v2": OBLIG_V2}
# ⭐ THE ARCS — which cards may stand in which room, per letter. Every listed card must be in the
#    pool and every house must have a list; a room with no candidates is a red execution on a
#    real order. ⛔ Role names never reach a prompt (they are stripped here), see the spec's note.
_arcs_raw = SPEC.get("arcs")
if not _arcs_raw:
    raise SystemExit("\n  ⛔ scripts/02-houses.json has no `arcs`. The draw would have no story shape.\n")
ARCS = {"default": _arcs_raw["default"], "c_ranges": _arcs_raw["c_ranges"]}
for _arc in ("v1", "v2"):
    _roles = {}
    for h in SPEC["houses"]:
        _lst = _arcs_raw[_arc]["roles"].get(str(h["number"]), {}).get("cards", [])
        _bad = [c for c in _lst if c not in POOL_LIST]
        if not _lst or _bad:
            raise SystemExit(f"\n  ⛔ arcs.{_arc} house {h['number']}: "
                             f"{'no cards' if not _lst else 'not in the pool: ' + ', '.join(_bad)}\n")
        _roles[str(h["number"])] = {"cards": _lst}
    ARCS[_arc] = {"mechanism": _arcs_raw[_arc]["mechanism"], "roles": _roles}
DRAW_JS = (DRAW_JS
    .replace("__HOUSES__", json.dumps(SPEC["houses"], ensure_ascii=False, indent=2))
    .replace("__CARDS__", json.dumps(SPEC["cards"], ensure_ascii=False, indent=2))
    .replace("__POOL__", json.dumps(POOL_LIST, ensure_ascii=False))
    .replace("__ARCS__", json.dumps(ARCS, ensure_ascii=False, indent=2))
    .replace("__OBLIGATIONS__", json.dumps(OBLIGS, ensure_ascii=False, indent=2))
    .replace("__TARGET__", str(SPEC["target_words"]))
    .replace("__WORD_BUDGET__", json.dumps(SPEC["word_budget"], ensure_ascii=False))
    .replace("__SHARE__", str(SPEC["position_share"]))
    .replace("__REVRATE__", str(SPEC["draw"]["reversal_rate"])))

# ─── 4a · the house prompt ─────────────────────────────────────────────────────
HOUSE_JS_PHASE2_ARCHIVE = r"""
const j = $input.first().json;
const p = j.position;
const LORE   = __LORE__;    // slug → what the card is drawn with, and what it can carry
const TIMING = __TIMING__;  // the dating law — one room is dated, and it is named here

// ⭐ ONE SEED PER ORDER, DERIVED FROM HER ORDER ID. Everything rotated below turns on it, so
//    two buyers who get the same card in the same house still get a different passage — and a
//    REGENERATION of the same order reproduces the same choices exactly, which is what makes
//    the grade log describe the reading that was actually sent.
// 🔴 WHY IT EXISTS. Two independent runs opened the Tower on the same sentence (crown off,
//    lightning past it, two figures still in the air, nobody has landed) and both put an
//    unopened envelope in the money room. Nothing in either prompt asked for that: a fixed
//    prompt returns its favourite answer every time. Varying the WORDING instruction does not
//    fix it. Varying what the writer is standing in front of does.
const seedOf = (str) => { let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return h; };
const SEED = seedOf(String(j.order_id || 'no-order'));

// What the earlier houses already said. splitInBatches runs this node once per house, so the
// earlier prose sits in earlier RUNS of '4c · Keep the prose'. .all(branch, run) is the only
// way to reach a prior run and it throws before that run exists, hence the guard.
// ⭐ The OPENING SENTENCE of each earlier house is collected separately. Twelve calls with the
//    same instructions return twelve openings of the same shape, and that sameness — not any
//    one sentence — is what makes a paid reading read like a machine.
let earlier = '', openings = [];
for (let r = 0; r < $runIndex; r++) {
  try {
    for (const it of $('4c · Keep the prose').all(0, r)) {
      const q = it.json.position;
      earlier += `[${q.house} · ${q.house_name} · ${q.card_name}${q.reversed ? ' (reversed)' : ''}]\n`
              + `${it.json.prose}\n\n`;
      openings.push((it.json.prose.match(/[^.!?]+[.!?]/) || [it.json.prose])[0].trim());
    }
  } catch (e) { /* run r not reached yet */ }
}

// ⭐ THE WHOLE TABLE, FROM THE FIRST HOUSE ONWARDS — not just the rooms already written.
// 🔴 A tarot reader's audit: "the Devil reversed in the seventh was the proof the Lovers in the
//    fifth means arrival, and the reading walked straight past it." It walked past it because
//    it could not see it: houses are written in order, so house 5 knew nothing about house 7.
//    A working reader looks at all twelve before she writes a word. The draw is decided in node
//    3, so the whole table has been available the entire time and was simply not handed over.
const table = (j.draw || []).map((q) =>
  `  · house ${q.house} (${q.house_name}) — ${q.card_name}${q.reversed ? ' reversed' : ''}`
  + (q.house === p.house ? '   ← this room' : '')).join('\n');

// ⭐ ONE HUMAN MOVE PER PASSAGE, rotated. Twelve short calls keep the prose sharp, but left
//    alone every call returns the same shape: picture, meaning, verdict.
// ⛔ NO QUOTED EXAMPLE LINES AND NO EXAMPLE NOUNS IN HERE. They were both taken literally: the
//    move that said "a Sunday, a drawer, a bill, a name, a room" produced a drawer and a bill
//    and a name in one reading and an envelope and a policy and a standing payment in the next.
//    A worked example inside a prompt is not an illustration to a model. It is a template.
const MOVES = [
  "TAKE THE ACCUSATION OUT. Say in plain words what this card is NOT charging her with, then what it is actually showing. ⛔ Find your own wording — the reading has one of these and it must not sound like a formula.",
  "GIVE IT OBJECTS. Hand the idea three things she can point at, all three out of THIS room's own subject matter. ⛔ CATEGORIES SHE FILLS IN, NOT POSSESSIONS YOU HAVE DECIDED SHE OWNS. The test: could a hundred different women each point at something different and every one of them be right? If only a woman who owns that exact object can, you have guessed — and a woman who owns neither knows in one line that nobody laid these cards. 🔴 Measured: this move produced a half-empty drawer, a coat off its hook and a dress unworn all year. The hand-written standard does the same job with the order of her evenings and the thing she always says when somebody asks how she is, and she supplies the rest.",
  "SET THE CONDITION. What this card gives, and what it asks in exchange — \"provided you\" — and make the provided something she could actually do this month.",
  "DO THE ARITHMETIC. Count something drawn on the card and say what that count means in this room. Plain numbers, no intensifiers. ⛔ Do not open on the instruction to count — she is reading, not being drilled.",
  "⭐ READ IT AGAINST ANOTHER CARD. Pick one other room from the table, name the card standing in it, and show what that card does to this one — it sharpens this reading, or it undercuts it, or it explains why this room is stuck. ⛔ Not a cross-reference for its own sake. The passage must land somewhere it could not have landed on this card alone.",
  "CONFIRM WHAT SHE ALREADY KNOWS. Say that this card is not breaking news to her, it is agreeing with something she has already noticed and talked herself out of.",
  "⭐ THE RECOGNITION. Name one private thing she does that she has never told anyone and has never put into words herself — a habit, a small daily concession, the thing she does instead of the thing she wants to do. ⭐ It is allowed to be true of most women in her position; that is the point, and it is why it lands. ⛔ BUT RENDER IT AS A BEHAVIOUR SHE COULD WATCH HERSELF DOING, never as a quality she has. 🔴 A competitor's paid reading is built almost entirely of the second kind — \"you have a very good sense of intuition when it comes to helping others but there is noise around your own life\" — and a reader scored it 2 out of 10 for insight and called it \"the sort of thing they say\". The same observation rendered as a behaviour — she talks other people's lives into shape and stays silent on her own — reads as being known. Same universality. All the difference.",
  "⭐ GIVE HER CREDIT, AND MAKE IT SPECIFIC. Name one thing she has done well in this room — a call she was right to make, a line she held, a cost she carried without being asked to. She has paid to be seen, and being seen includes the part she got right. ⛔ BUT IT MUST BE EARNED AND IT MUST BE ABOUT THIS ROOM. Not \"you are strong\", not \"none of this is your fault\", not absolution for something nobody accused her of — a real reader called that \"47 words that praise her and say nothing\", and it was the emptiest passage in a whole reading. Credit her for a thing, then get on with the reading.",
  "ATTACH A WARNING TO THIS CARD SPECIFICALLY. One plain caution that belongs to this card in this room and nowhere else — what it costs her if she reads it as good news and stops there. 🔴 ⛔ WRITE IT AS A CONSEQUENCE, NEVER AS AN IMPERATIVE. Measured on a real run: it came out as \"Read this crown as good luck and sit still, and you will hear it from a third party\" — which instructs her to do the very thing being warned against. Name what happens if she does it, in the third person or the conditional. Do not tell her to do it.",
];
const move = MOVES[(j.index - 1 + (SEED % MOVES.length)) % MOVES.length];

// ⭐ AND ONE ROTATED ENDING, SEEDED SEPARATELY FROM THE MOVE. Twelve calls told "end on what
//    she does about it" return twelve of the same closing shape — and the shape is invisible
//    inside any one passage, which is why it survives every check but the grader.
// 🔴 MEASURED, dry run cs_live_a91f4c: eight of the twelve rooms closed on an imperative
//    ("this month" / "this week") followed by a "provided you…" clause, and node 7 failed the
//    reading on rubric line 13. ⛔ The cause is two instructions that were each correct on
//    their own — "end on what this room asks of her" plus VOICE's "the condition is named".
// ⛔ A SECOND SEED, not the same one. Sharing MOVES' offset would lock every move to the same
//    ending for every buyer, which is the same fault one level up.
const ENDINGS = [
  "END ON THE INSTRUCTION. One plain thing to do, and when. Nothing after it.",
  "END ON THE COST OF LEAVING IT. No instruction at all — say what this room takes from her if she leaves it exactly as it stands, and stop there.",
  "END ON THE CONDITION, BUILT IN. What this room gives and what it wants back — but inside a sentence that is doing other work, never appended after the advice as a closing clause.",
  "END ON THE PICTURE. Come back to one thing drawn on the card, say what it is doing, and let that be the last line. ⛔ No advice and no summing up.",
  "END ON A DECISION SHE HAS ALREADY MADE. This room is not asking her to choose — she chose, a while ago. Name what she chose, and stop.",
  "END ON A QUESTION SHE CARRIES OUT OF THE ROOM. One, and do not answer it here. ⛔ Not rhetorical and not a riddle — a plain question she will still be holding two rooms later.",
  "DO NOT END. Stop on the last true thing you found in this room, with no closing gesture at all. ⛔ No summing clause, no instruction, no sentence that signals an ending is happening.",
];
const ending = ENDINGS[(j.index - 1 + (seedOf(String(j.order_id) + '|end') % ENDINGS.length))
                       % ENDINGS.length];

// ⭐ WHAT THIS CARD IS DRAWN WITH — and WHERE TO OPEN. The list is the accuracy fence: two real
//    readings described cards they half-remembered. The chosen entry is the anti-template: the
//    same card opens on a different true detail for the next buyer.
// ⭐ THE OPPOSITE HOUSE. Six axes, each house paired with the one six along — the oldest
//    structure in this spread and the reason a reader treats twelve houses as one arrangement
//    rather than a list. 🔴 A competitor's Celtic Cross cross-refers without being told to,
//    because its positions relate by shape. Ours never did, so we had to ORDER it to, and got
//    name-dropping instead of reading.
const AXES = __AXES__;
const ax   = AXES[String(p.house)] || null;
const opp  = ax ? (j.draw || []).find((q) => q.house === ax.opposite) : null;

const lore = LORE[p.card] || null;
// 🔴 HASH THE CARD AND THE HOUSE IN, DO NOT ADD THEM. `(SEED + house * 7) % drawn.length` was
//    the first version and it collides: with six details, house * 7 ≡ house (mod 6), so any two
//    houses six apart pick the SAME detail — and 5 and 11 are six apart, which are two of the
//    three rooms the Lovers is allowed to fall in. Measured: two dry runs put the Lovers in 5
//    and in 11 and both opened on the winged figure. An arithmetic seed is not a mixed one.
const detail = lore
  ? lore.drawn[seedOf(String(j.order_id) + '|' + p.card + '|' + p.house) % lore.drawn.length]
  : null;

// ⛔ EXACTLY ONE ROOM IN THIS READING IS DATED. See scripts/02-houses.json → timing.
const isDated = p.house === TIMING.dated_house;
const timingLaw = (isDated ? TIMING.law_dated : TIMING.law_other).join('\n');

const prompt = [
`This is house ${p.house} of her twelve — ${p.house_name}.`,
`WHAT THIS ROOM IS FOR: ${p.job}`,
`THE CARD THAT FELL HERE: ${p.card_name}${p.reversed ? ' (reversed)' : ''}`,
``,
`⭐ THE WHOLE TABLE, ALL TWELVE, AS THEY LIE. You laid them before you wrote a word, so you can`,
`  see every one of them now — including the rooms that are written up after this one.`,
table,
opp ? `\n⭐ THIS ROOM HAS AN OPPOSITE, AND THE PAIR IS ONE QUESTION ASKED FROM BOTH ENDS:\n`
  + `  house ${p.house} (${p.house_name}) ←→ house ${opp.house} (${opp.house_name}), holding `
  + `${opp.card_name}${opp.reversed ? ' reversed' : ''}.\n`
  + `  THE AXIS: ${ax.axis}\n`
  + `  ⭐ Read your room against that one. Not as a cross-reference bolted on at the end — as the`
  + ` other half of the same question. The two cards are answering it together, and one of them\n`
  + `  is usually paying for the other.\n`
  + `  ⛔ You do not have to mention it if the pair genuinely says nothing. But if it does say`
  + ` something, that is the most real thing in this passage, because it is the spread's own\n`
  + `  structure and not a connection you invented.` : '',
``,
`⛔ THIS PASSAGE IS ABOUT ITS OWN ROOM, AND MOST ROOMS ARE READ ALONE. Reach across to another`,
`  card only where it genuinely changes what THIS room says — then name it, by card and by`,
`  house, and show the working. A passage that could be shuffled into any other spread without`,
`  loss has read a card and not a spread; a passage that name-drops a second card to look`,
`  thorough has done neither.`,
`⛔ AND NEVER AS A CLOSING TAG. "Read this beside the Nameless One in your eighth" is a`,
`  cross-reference with no argument in it, and in one real reading two rooms ended on that same`,
`  sentence. A device that repeats is worse than one that is missing. If the other card matters,`,
`  it belongs in the middle of the passage doing work, not tacked on at the end.`,
``,
lore ? `WHAT THIS CARD IS DRAWN WITH — every one of these is genuinely on it:\n`
  + lore.drawn.map((d) => '  · ' + d).join('\n')
  + `\n⛔ Describe nothing that is not on that list — two real readings described cards they half`
  + `\n  remembered, in a document she keeps.`
  + `\n⛔ AND DO NOT CONTRADICT IT. 🔴 Measured: the list says the Magician holds a wand straight`
  + `\n  up in his right hand, and the passage read "not one of them is being used, he has not`
  + `\n  picked any of them up yet" — then built its whole argument on the thing it had just got`
  + `\n  backwards. If the list says a hand is raised, the hand is raised.` : '',
lore ? `\nWHAT THIS CARD CAN AND CANNOT CARRY:\n  ${lore.engine}`
  + `\n⚠ That is a FENCE, not a meaning — it tells you what would be a lie about this card. What`
  + `\n  it SAYS is decided by this room and by what else is on the table.`
  + `\n⛔ AND IT IS NOT PHRASING. Never write the fence back to her and never reuse its words.`
  + `\n  🔴 Measured: two readings lifted whole clauses out of this block into the document she`
  + `\n  keeps — the same fault as a worked example, one level down.` : '',
p.reversed && lore && lore.reversed
  ? `\n⚠ IT FELL REVERSED, AND FOR THIS CARD THAT MEANS THIS:\n  ${lore.reversed}`
    + `\n⛔ Not the opposite of upright. ⛔ Not derived from what the drawing looks like inverted —`
    + `\n  do not turn the picture over and read the new arrangement. That move read the Hanged Man`
    + `\n  reversed as a man standing up free, which is the opposite of what that card says, and it`
    + `\n  shipped. Open on the card as it is DRAWN; the reversal is in what it is doing to her.`
    + `\n⛔ AND DO NOT BORROW ITS WORDING. It is a mechanism written for you, not a sentence`
    + `\n  written for her. Two readings lifted clauses straight out of it.`
    + `\n⛔ THE REVERSAL NEEDS ITS OWN EVIDENCE. Do not carry it on a detail that is on the card`
    + `\n  either way — a reader who points at something that would be there upright has shown`
    + `\n  her nothing, and one real reading did exactly that.`
  : '',
detail ? `\n⭐ OPEN ON THIS DETAIL, AND NOT ON THE ONE EVERYBODY OPENS ON:\n  ${detail}\n`
  + `  Take it further than that phrase does — say what it is doing, and what is around it.\n`
  + `  ⛔ THE FIRST SENTENCE IS ABOUT THIS ONE. Any of the others may appear later in the`
  + ` passage; none of them may open it.\n`
  + `  🔴 Measured: told to open here, the writer twice reached for the card's most famous`
  + ` detail instead — and two different buyers got the same first sentence.` : '',
p.owes
  ? `\n⭐⭐ THIS ROOM OWES HER AN ANSWER, AND THIS PASSAGE IS THE THING SHE PAID FOR.\n`
    + `In her ${j.arc === 'v2' ? 'two letters you showed her six cards' : 'letter you showed her three cards'}, gave her part of each, and refused to finish\n`
    + `them — you said only the full twelve could. ⛔ SHE IS NOT GETTING THOSE THREE CARDS BACK.\n`
    + `The letter promised her twelve NEW ones, and the answer was never in the card: it is in\n`
    + `THE ROOM. The letter says so itself — "${j.mechanism || 'the house the Lovers falls into is what separates them'}".\n`
    + `This is that house, and ${p.card_name}${p.reversed ? ' reversed' : ''} is standing in it.\n`
    + `⛔ THE DEBT THIS PASSAGE MUST PAY, IN FULL, HERE:\n  ${p.obligation}\n`
    + `⛔ Do not name the card she was shown, and do not say it "fell" anywhere — it is not in\n`
    + `  this spread and she was told it would not be. Answer the question it left open.\n`
    + `⛔⛔ THE CARD HERE DECIDES HOW, NEVER WHETHER. If a hard card is standing in a room that\n`
    + `  owes her good news, the good news still comes — it arrives awkwardly, late, or through\n`
    + `  something she would rather not touch. ⛔ It is never cancelled. She is holding the page\n`
    + `  that made the promise, and the hand-written product paid its second windfall through\n`
    + `  the Nameless One, which is nobody's lucky card.\n`
    + `⛔⛔ AND ARGUE IT FROM THE TABLE. This is the answer she will check hardest, so it cannot\n`
    + `  be an assertion. Name at least one other card by card and by house and show how it\n`
    + `  settles this — the room decides, the rest of the spread corroborates.`
  : `\nThis card is new to her. She has not seen it before and there is nothing to correct.`,
``,
`⭐ THIS IS NOT A DESCRIPTION OF A CARD. It is one room of her life with one card standing in`,
`  it, and she has to be able to do something with it. ⛔ A passage that describes a card`,
`  accurately and leaves her to add it up has failed.`,
``,
`⭐ THE MOVE THIS PASSAGE OWES HER. Do this one, here, and do it once:`,
`  ${move}`,
``,
`⭐ AND THIS IS HOW THIS ROOM ENDS. The last line or two, and no other shape:`,
`  ${ending}`,
`⛔ WHATEVER THE ENDING IS, DO NOT CLOSE ON "So — [do this] this month" followed by a`,
`  "provided you…" clause. Measured: that one construction closed eight of twelve rooms in a`,
`  real reading and failed the grade on repetition. The condition gets named across the`,
`  reading, not stamped on the end of every room in the same words.`,
``,
`⛔ TIMING, IN THIS ROOM:`,
timingLaw,
``,
earlier ? `WHAT THE EARLIER HOUSES ALREADY SAID:\n${earlier}⛔ Do not repeat them. Build on them.` : '',
openings.length ? `⛔ THE EARLIER HOUSES OPENED LIKE THIS. Open in a different shape:\n`
  + openings.map((o) => '  · ' + o).join('\n') : '',
``,
`⭐ BEFORE THE PASSAGE, ONE LABEL LINE, EXACTLY THIS SHAPE AND NOTHING ELSE ON IT:`,
`  KEYNOTE: <three to eight words naming what this card is, in her voice>`,
`  ⚠ THE LABEL IS NOT PART OF THE PASSAGE. It is lifted off before anything is printed and`,
`  composed into the room's heading, so it does not count as writing "above" the passage and it`,
`  is not a heading you are writing. 🔴 It went missing from four of twelve houses on a real run`,
`  because this instruction and the one further down ("the passage begins at the picture,`,
`  nothing above it") read as a contradiction. They are not: the LABEL comes first, then the`,
`  PASSAGE, and the passage begins at the picture.`,
`  Three to eight words. The shape: "a card of ___" — what this card is, in her voice.`,
`  🔴 ⛔ DO NOT WRITE THE HEADING ITSELF. It is composed for you from the card's name and your`,
`  keynote, and it already ends on a comma — your keynote reads on from that comma. An earlier`,
`  version of this prompt QUOTED the finished heading here as an illustration, and in four of`,
`  twelve houses the writer simply reproduced it as its first line: the keynote was then lost`,
`  from the heading, and the line was one joiner away from printing twice in a paid document.`,
`  ⛔ The PASSAGE begins at the picture — no heading, no title, no restating of the room. The`,
`  KEYNOTE label above it is the one exception, and it is required.`,
``,
`Then the passage. ${Math.round(j.position_words / j.total)} words, give or take.`,
`Her name is ${j.first_name}. ⛔ Do NOT use it in this passage unless the whole reading would`,
`  otherwise never use it — the joiner places it.`,
`Open on what is physically drawn on the card.`,
`🔴 ⛔ AND THEN DO NOT PIVOT THE SAME WAY EVERY TIME. Twelve passages each open on a picture and`,
`  each have to turn from the picture to her life, and left alone that turn becomes one`,
`  sentence used twelve times. Measured on a real run, and both failed the grade:`,
`    · "That is your ___, dear." / "That is what your ___ has been doing." — the naming pivot`,
`    · "Look at the ___." — as an opener or as the turn near the close`,
`  ⛔ Neither of those, in any room. Find the turn this passage actually needs: sometimes the`,
`  picture IS the claim and needs no bridge at all; sometimes the room is named first and the`,
`  card answers it; sometimes the turn is a question, or a flat contradiction of what she`,
`  expects. ⭐ A passage is allowed to move from picture to life without announcing that it is`,
`  doing so.`,
`⛔ Do NOT write "Nothing in that card/picture says/calls/charges you…", or any variant of it,`,
`  unless THE MOVE above is the one that asks for it. It is this document's worst repetition:`,
`  on three real runs it opened eight of the twelve rooms and failed the grade every time.`,
`🔴 ⛔ TWO THINGS THIS PASSAGE HAS BEEN MISSING, AND THEY ARE WHY THE READING HAS NO PERSONALITY.`,
``,
`⭐ ONE · SHE KNOWS WHETHER THIS ROOM IS GOOD OR HARD BEFORE SHE HAS FINISHED THE PARAGRAPH.`,
`  Not four paragraphs down. A real reading buried its best line at the bottom of the room and`,
`  the operator read the whole document and said there was no insight in it.`,
`  🔴 ⛔ BUT DO NOT WRITE IT AS A LABEL, AND NEVER THE SAME WAY TWICE. Measured on a real run:`,
`  given this instruction with an example, the writer opened ELEVEN OF TWELVE rooms with "Your`,
`  Nth house is favourable this season, dear" — and failed the grade on repetition. One verdict`,
`  sentence, twelve times, is not twelve verdicts. It is a form letter with the blanks filled.`,
`  ⭐ SO CARRY THE VERDICT, DO NOT ANNOUNCE IT. These all say "this room is good" without once`,
`  saying it: a thing arriving · a cost already paid off · something she has that she has not`,
`  counted · a door that turns out not to be locked. And these say "this room is hard": a price`,
`  still running · someone already leaving · a thing she is holding that is holding her.`,
`  ⛔ If your sentence would still make sense with the house number swapped for another, it is a`,
`  label and not a reading. Cut it and say the actual thing that is true of THIS room.`,
`⭐ TWO · YOU ARE IN THE ROOM. SAY SO, ONCE, IN YOUR OWN VOICE.`,
`  You are a woman who has laid these cards and has an opinion about what she sees. Take a`,
`  side. Refuse something. Promise something. Correct her. The shipped product does this in`,
`  nearly every room — "I mean that narrowly" · "I won't pretend otherwise" · "I am not telling`,
`  you to cut anyone off" · "I won't let you go on to it unprepared" · "I'm on your side in`,
`  this, dear."`,
`  🔴 Measured: the shipped product uses "I" about eight times per thousand words. A real`,
`  generated reading used it three times per thousand, and only three times in all twelve rooms`,
`  put together — the reader had vanished out of her own document and what was left reads like`,
`  a description of a card written by nobody.`,
`  ⛔ NOT a hedge and NOT throat-clearing. "I think", "I feel", "it seems to me" are all banned`,
`  by rule 1. This is judgement stated flat and owned: what you will not pretend, what you are`,
`  not telling her to do, what you promised her and are now paying.`,
`  ⛔ Once. Twice at the most. Twelve rooms that all open on "I" is its own template.`,
`🔴 ⛔ AND NOW THE HARD RULE, BECAUSE THIS IS WHERE EVERY READING SO FAR HAS FAILED.`,
`  THE PICTURE SENTENCES ARE ALWAYS THE CLEAREST THING YOU WRITE. The sentence that says what`,
`  the card MEANS is where the fog comes in — three independent readers graded three real`,
`  readings and every one of them landed on the same finding: "nearly every failure is in the`,
`  interpretive sentences, where the writing reaches for weight and drops the subject."`,
``,
`⛔ THE BANNED NOUNS. These do the work of a real thing and name nothing. Do not use them as`,
`  the subject or object of a sentence about her life:`,
`    the arrangement · the binding · the tie · the connection · the opening · the movement`,
`    the condition · the terms · your standing · the matter · the exchange · the holding`,
`    the gain · the stall · the release · the pause · the resistance · permission · provision`,
`    recognition · the invitation · the shape of it · the sense of it · the force around you`,
`  🔴 Measured: one real reading used these 100 times in 2,700 words — one every 28 words — and`,
`  a reader called it "a hundred abstract nouns she has to dig every real thing out from under,`,
`  while tired, on a phone".`,
``,
`⭐ WHAT TO WRITE INSTEAD. Every sentence about her life names ONE of these three, or it does`,
`  not go in: A PERSON (him, your sister, the one who decides), AN OBJECT SHE COULD TOUCH (the`,
`  message, the invoice, the chair, the door), or AN ACTION SOMEBODY TAKES (he stops replying,`,
`  she asks twice, you send the shorter version).`,
`  ⛔ "The binding in your seventh leaves no renewal to hand back" names none of the three and`,
`  is meaningless. "He answers in a day and a half now, and it used to be an hour" names all`,
`  three at once, and she knows instantly whether it is true.`,
``,
`⛔ AND NEVER A VERB YOU INVENTED FOR AUTHORITY. "settles the hinge", "clears the old pursuit",`,
`  "takes the table in its hand" — these read as expertise and carry nothing. Say the plain verb.`,
`⛔ NEVER OPEN A PARAGRAPH ON A BARE It / That / This. Name the thing again. She cannot scroll`,
`  back on a phone, and by the third room she has forgotten what "it" was.`,
`🔴 ⛔ NO CALENDAR DATES, EVER. You do not know what day she is reading this — nothing in this`,
`  brief tells you, and the document is sold as something she keeps and re-reads months later.`,
`  So never "the week of September 21", never a month name with a number. Everything is`,
`  RELATIVE to the day it reaches her: "the third week from the day you read this". Measured:`,
`  a real run named a September week it had no way to know, and for a buyer who pays in March`,
`  that is a week six months out, printed in a document she keeps.`,
`⛔ NO INVENTED COUNTS, NO INVENTED DURATIONS. Never "the appointment you have moved twice", never`,
`  "you talked yourself out of it once", never "unworn all year", "since spring", "for two years".`,
`  You cannot know the number, and the woman whose number is different has just caught you — in`,
`  the one document she was told was laid for her and for nobody else. ⭐ Say the thing without`,
`  the count. A habit named without a tally is still concrete; a tally is a guess wearing a`,
`  number. ⚠ Counting what is DRAWN ON THE CARD is the opposite of this, and is right.`,
`⛔ Twelve of these are being written. She chose the Major Arcana deck because you told her in`,
`  the letter that you would use it. ⛔ So never remark that this card is a trump, that all`,
`  twelve are, or that the draw is unusual — it is your own instruction, not an omen.`,
`No heading, no house number, no card name as a title — just the prose.`,
].filter(Boolean).join('\n');

const out = { ...j, voice: __VOICE__, prompt };
// ⭐ A v2 BUYER HAS READ A SECOND LETTER. What it showed her is appended AFTER the shared block,
//    so the cached prefix is identical for both arcs — OpenAI caches by prefix; Anthropic caches
//    the block whole, so v2 earns its own entry on the first house and reuses it eleven times.
if (j.arc === 'v2') out.voice = out.voice + '\n\n' + __EMAIL_SAID_V2__;
return [{ json: out }];
"""

# Phase 3: each room is a developed interpretation. The earlier short-form prompt is retained
# above as an audit trail for the measured regressions; this is the only house prompt built.
HOUSE_JS = r"""
const j = $input.first().json;
const p = j.position;
const LORE = __LORE__;
const TIMING = __TIMING__;
const AXES = __AXES__;
const lore = LORE[p.card] || {};
const arch = p.architecture;
const ledger = p.claim_ledger;
if (!arch || !ledger) throw new Error(`house ${p.house}: missing architecture or claim ledger`);
const table = (j.draw || []).map((q) =>
  `  · house ${q.house} (${q.house_name}) — ${q.card_name}${q.reversed ? ' reversed' : ''}`
).join('\n');

let earlier = '';
for (let r = 0; r < $runIndex; r++) {
  try {
    for (const it of $('4c · Keep the prose').all(0, r)) {
      const q = it.json.position;
      const prose = String(it.json.prose || '').trim();
      const sentences = prose.split(/(?<=[.!?])\s+/).filter(Boolean);
      earlier += `[${q.house} · ${q.house_name} · ${q.card_name}]\n`
        + `keynote: ${it.json.keynote || ''}\n`
        + `opening: ${sentences[0] || ''}\nclosing: ${sentences[sentences.length - 1] || ''}\n\n`;
    }
  } catch (e) { /* this run has not been reached */ }
}

const oppositeHouse = ((p.house + 5) % 12) + 1;
const opposite = (j.draw || []).find((q) => q.house === oppositeHouse);
const pairKey = `${Math.min(p.house, oppositeHouse)}-${Math.max(p.house, oppositeHouse)}`;
const axis = AXES[pairKey] || null;
const requiredCross = !!p.owes;
const optionalCross = !requiredCross && arch.cross_room.startsWith('permitted');
const isDated = p.house === TIMING.dated_house;

const prompt = [
`Write house ${p.house} of twelve: ${p.house_name}.`,
`ROOM'S QUESTION: ${p.job}`,
`CARD: ${p.card_name}${p.reversed ? ' (reversed)' : ''}`,
`TARGET: ${arch.target_words} words of interpretation; stay between ${arch.min_words} and ${arch.max_words}.`,
`Before the prose, write one line only: KEYNOTE: followed by three to eight words.`,
`Then write continuous prose with no subheadings, numbered steps, or summary bullets.`,
``,
`THE WHOLE TABLE`,
table,
axis && opposite ? `THE OPPOSING ROOM: house ${opposite.house} (${opposite.house_name}), ${opposite.card_name}${opposite.reversed ? ' reversed' : ''}. AXIS: ${axis.axis}` : '',
``,
`THE SOURCE THE BUYER WILL SEE PRINTED DIRECTLY ABOVE THIS INTERPRETATION`,
lore.waite || '',
`PLAIN TRADITIONAL MEANING: ${lore.plain || ''}`,
`DRAWN DETAILS AVAILABLE FOR ACCURATE REFERENCE:`,
...(lore.drawn || []).map((d) => `  · ${d}`),
`ACCURACY FENCE: ${lore.engine || ''}`,
p.reversed ? `REVERSAL FENCE: ${lore.reversed || ''}` : '',
`Treat the fences as facts to respect. Do not reuse their phrasing. Do not add a drawn detail that is absent from the supplied list. When a fence excludes a claim, omit the claim; never announce a refusal to tell her.`,
``,
`THIS ROOM'S ESSAY ARCHITECTURE`,
`Entry: ${arch.entry}.`,
`Bring the buyer into the argument ${arch.customer_entry}.`,
`Development work: ${arch.development.join('; ')}. Give these elements the space; do not add every other teaching device as filler.`,
`Ending function: ${arch.ending}.`,
`Ground the argument in the printed source and the supplied card lore somewhere in the passage. The source need not open the essay. A comparison or normalization belongs only when this room's allocation or argument needs it.`,
`Develop the assigned argument in ordinary language. Retain the explanation that earns the personal application; cut a second explanation, recap or method announcement once that work is done. Let paragraphs advance the argument rather than certify the previous paragraph.`,
`Use the source to explain meaning, then spend the remaining space on the room's assigned development. Describe human situations with emotional generosity: explain the understandable reasons for a response before considering its limitations. Leave the buyer room to recognize or reject an illustrative situation without being corrected or blamed.`,
arch.may_name_waite ? `You may name Waite once in this room.` : `Do not name Waite in this room; his name and citation are already printed immediately above.`,
p.owes ? `State the exact required promise firmly. Develop its meaning without adding a second personal story to make it sound more certain.` : `Make the card-and-house interpretation clear within the argument; a separate final recap is unnecessary. Its application to her private circumstances may remain conditional.`,
``,
`CLAIM LEDGER`,
...ledger.permitted_sources.map((s) => `  · PERMITTED SOURCE: ${s}`),
`FORECAST SCOPE: ${ledger.forecast_scope}`,
`ILLUSTRATION RULE: ${ledger.illustration_rule}`,
`HISTORY RULE: ${ledger.history_rule}`,
`ACTION SCOPE: ${ledger.action_scope}`,
`UNSUPPORTED PRIVATE FIELDS: ${ledger.unsupported_private_fields.join(', ')}. Do not assert one unless this room's obligation explicitly supplies it.`,
`Any concrete illustrative situation must stay visibly illustrative. Do not decide that it happened to her.`,
`A locked obligation authorizes exactly the facts it names. The rest of the essay explains those facts and their meaning. A cross-reference changes the interpretation, but does not establish an additional relationship, past event, private intention or administrative process. A card's force or motion describes its meaning; it does not remove the buyer's ability to choose.`,
!p.owes ? `This room has no locked personal promise. Its topic identifies a field of life, not an established private event. Personal illustrations remain conditional; the card interpretation can be firm.` : '',
`Do not generalize about women as a group. Speak to this buyer as an intelligent adult.`,
arch.may_use_address ? `One term of address is permitted in this room if it earns its place; it is not required.` : `Do not use a term of endearment in this room.`,
`First person is optional and must express judgment, never a refusal to answer.`,
`Vary paragraph and sentence length. Do not close every paragraph with a maxim or instruction.`,
``,
p.owes ? `THIS ROOM PAYS A LETTER PROMISE. Pay every part of this obligation here:\n${p.obligation}` : '',
p.owes ? `The card in this room decides how the promised result arrives, never whether it arrives. REQUIRED EVIDENCE: in the body, print the exact name of at least one other dealt card and its house number, then show how it changes this answer.` : '',
optionalCross ? `You may use one other dealt card in the body if it materially changes this interpretation. Name the card and house and show the reasoning. Otherwise omit it.` : '',
(!requiredCross && !optionalCross) ? `Keep this room self-contained. Do not name another dealt card.` : '',
``,
`TIMING:`,
...(isDated ? TIMING.law_dated : TIMING.law_other),
`Never use a calendar date.`,
earlier ? `EARLIER HOUSE SIGNATURES — do not repeat their keynotes or their opening and closing shapes:\n${earlier}` : '',
``,
`Before returning, audit every sentence that asserts her past, a repeated habit, a bodily symptom, an unseen event, another person's mind, or an administrative fact. Keep it only when the buyer context or this room's obligation supplies that exact fact; otherwise remove it or make it an explicitly optional recognition test. Audit every direct instruction against ACTION SCOPE. A vivid invented example remains an assertion when it begins with "you have", "you did", "you learned", "you keep", or "you always"; rewrite it as a general example or a question she can answer privately.`,
arch.emphasis_position !== 'none'
  ? `After the prose, write one separate TAKEAWAY: line of 8–15 words. It must state a practical distinction or synthesis from this room, not a prediction, date, money claim, urgent instruction, identity label, or claim about another person. Its PDF placement is ${arch.emphasis_position}; do not refer to that placement in the prose.`
  : `Do not write a TAKEAWAY line in this room.`,
`Return the KEYNOTE line, the prose, and only when assigned the TAKEAWAY line.`
].filter(Boolean).join('\n');

const out = { ...j, voice: __VOICE__, prompt };
if (j.arc === 'v2') out.voice = out.voice + '\n\n' + __EMAIL_SAID_V2__;
return [{ json: out }];
"""

_VOICE_JSON = json.dumps(VOICE + "\n\n" + EMAIL_SAID, ensure_ascii=False)

# ⭐ THE CARD LORE IS A FENCE, NOT A DICTIONARY — and it is per-card, so it is injected into the
#    HOUSE prompt and never into the cached VOICE block. ⛔ That distinction is the guardrail
#    this whole build keeps breaking: anything in the voice block happens twelve times.
# 🔴 WHY IT EXISTS. A tarot reader's audit of two real readings: Temperance in the house of
#    standing was made to deliver an announcement on a deadline ("by week seven it is said in
#    front of you"), which is not a thing Temperance can do at any speed; and every reversed
#    card was read by turning the picture over. Nothing in the pipeline had ever told the writer
#    what a card is or what would be a lie about it.
LORE = SPEC.get("card_lore")
if not LORE:
    raise SystemExit("\n  ⛔ scripts/02-houses.json has no `card_lore`. Every passage would be "
                     "written from the model's own\n     recollection of the deck, which is the "
                     "fault this block was added to fix.\n")
_missing = sorted(set(SPEC["cards"]) - set(LORE))
if _missing:
    raise SystemExit(f"\n  ⛔ card_lore is missing: {', '.join(_missing)}\n     A card in the "
                     "vocabulary with no lore reaches its writer with no fence at all.\n")
# ⛔ A reversible card with no `reversed` entry is worse than none — the writer falls back on
#    turning the picture over, which is the exact bug. The three she was already shown are never
#    reversed (draw.fixed_are_upright), so they are the only ones allowed to lack it.
_norev = sorted(c for c in POOL_LIST if not LORE[c].get("reversed"))
if _norev:
    raise SystemExit(f"\n  ⛔ these can be drawn reversed and have no `reversed` lore: "
                     f"{', '.join(_norev)}\n")

HOUSE_JS = (HOUSE_JS.replace("__AXES__", json.dumps(
        {k: v for k, v in SPEC["axes"].items() if not k.startswith("_")},
        ensure_ascii=False, indent=2))
    .replace("__VOICE__", _VOICE_JSON)
    .replace("__EMAIL_SAID_V2__", json.dumps(EMAIL_SAID_V2, ensure_ascii=False))
    .replace("__LORE__", json.dumps(LORE, ensure_ascii=False, indent=2))
    .replace("__TIMING__", json.dumps(
        {k: v for k, v in SPEC["timing"].items() if not k.startswith("_")},
        ensure_ascii=False, indent=2)))

KEEP_PROSE_JS = r"""
const brief = $('4 · Each house').first().json;
const r = $input.first().json;
// ⛔ An Anthropic refusal is HTTP 200 with stop_reason 'refusal' — not an error status.
//    Unhandled it reads as an empty passage and renders as a hole in a paid document.

// ⭐ ONE PARSER, EITHER PROVIDER. Anthropic returns content[] blocks + stop_reason; OpenAI
//    returns choices[0].message.content (a plain string) + finish_reason. Reading BOTH here
//    means the twelve-house logic, the keynote lift and every guard below stay a single code
//    path — so a fix made while testing one provider is not silently missing from the other.
// ⛔ The stop reasons are mapped, not renamed: OpenAI 'length' is Anthropic 'max_tokens', and
//    'content_filter' is a refusal. Both are HTTP 200, which is exactly why they need catching.
const _oa = !!(r && r.choices);
const _m  = _oa ? (r.choices[0] || {}) : null;
const say = _oa ? String((_m.message && _m.message.content) || '')
                : ((r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
const stop = _oa ? ({ length: 'max_tokens', content_filter: 'refusal' }[_m.finish_reason]
                    || _m.finish_reason)
                 : r.stop_reason;
if (stop === 'refusal') {
  const d = r.stop_details || {};
  throw new Error(`house ${brief.position.house}: model declined (${d.category || 'no category'}) `
    + `— no fallback rescued it. ${d.explanation || ''}`);
}
let text = say.trim();
// ⭐ Lift the keynote off the front. It becomes the heading; the joiner never sees it, so the
//    marker contract downstream is unchanged.
// 🔴 FIND IT WHEREVER IT LANDED. This used to anchor at position 0 with no /m, so a passage
//    that opened on anything else lost its keynote silently — the strip below then deleted the
//    line, and the heading rendered as the bare card name. Measured on n8n execution 30536:
//    four of twelve houses, because the writer had put its own heading on line 1 first.
let keynote = '';
const kn = text.match(/^[ \t]*KEYNOTE:[ \t]*(.+?)[ \t]*$/mi);
if (kn) keynote = kn[1].replace(/^[,\s]+|[.\s]+$/g, '');
// ⭐ AND TAKE IT UNLABELLED. On one real run the writer produced a perfectly good keynote as its
//    first line — "a card of ability spent on everyone but herself" — and simply omitted the
//    KEYNOTE: prefix. Without this the heading loses its clause AND the line ships as the first
//    sentence of the prose, where it reads as a fragment. A short opening line with no full stop
//    that names what the card IS cannot be anything else, so lift it.
if (!keynote) {
  const first = text.split('\n')[0].trim();
  if (/^(a|an|the)\s+card\s+of\b/i.test(first) && first.split(/\s+/).length <= 12
      && !/[.!?]$/.test(first)) {
    keynote = first.replace(/^[,\s]+|[.\s]+$/g, '');
    text = text.slice(text.indexOf(first) + first.length).trim();
  }
}
// ⛔ AND DROP A HEADING THE WRITER WROTE FOR ITSELF. The heading is composed in node 10; a
//    passage that opens by writing it prints it twice. On 30536 the joiner happened to strip
//    all four, which is luck, not a guarantee — and the joiner is not always in the path.
const agency = (brief.position.agency || '').trim();
if (agency) {
  const esc = agency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  text = text.replace(new RegExp('^[ \\t]*' + esc + '[^\\n]*\\n+', 'i'), '');
}
// 🔴 STRIP EVERY OTHER ONE TOO. n8n execution 30478: house 2 emitted the KEYNOTE line twice, the
//    leading match was lifted, and the second shipped into the PDF as a shouting all-caps label
//    in the middle of a paid reading. The grader caught it on rubric line 12 — but a reading that
//    fails twice is sent anyway, so this must not depend on the grade.
const takeawayLines = [...text.matchAll(/^[ \t]*TAKEAWAY:[ \t]*(.+?)[ \t]*$/gmi)];
const emphasisPosition = brief.position.architecture.emphasis_position || 'none';
const wantsTakeaway = emphasisPosition !== 'none';
if (wantsTakeaway && takeawayLines.length !== 1) {
  throw new Error(`house ${brief.position.house}: expected one TAKEAWAY line, got ${takeawayLines.length}`);
}
let takeaway = takeawayLines.length ? takeawayLines[0][1].trim().replace(/^[,\s]+|[.\s]+$/g, '') : '';
if (wantsTakeaway) {
  const takeWords = takeaway.split(/\s+/).filter(Boolean).length;
  if (takeWords < 8 || takeWords > 15) {
    throw new Error(`house ${brief.position.house}: TAKEAWAY has ${takeWords} words; expected 8-15`);
  }
  // A duration noun alone is not a dated claim. Execution 30649 rejected an ordinary
  // weekly reflection solely for saying "week". Keep dated phrases and claims blocked.
  const datedTakeaway = /\b(?:this|next|coming|following|last|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|few)\s+(?:days?|weeks?|months?)\b|\b(?:in|within|inside|after|before|by)\s+(?:(?:a|the)\s+)?(?:day|week|month)\b|\b(?:end|start|middle)\s+of\s+(?:(?:a|the|this|next)\s+)?(?:day|week|month)\b|\b(?:tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(takeaway);
  if (datedTakeaway || /\b(?:twin flame|windfall|money|cash|payment|will|must|guaranteed|certain to)\b|\bgoing to\b|\d|[$£€]/i.test(takeaway)) {
    throw new Error(`house ${brief.position.house}: TAKEAWAY adds visual authority to a prohibited claim`);
  }
} else {
  takeaway = '';
}
text = text.replace(/^KEYNOTE:.*$/gmi, '').replace(/^TAKEAWAY:.*$/gmi, '')
  .replace(/\n{3,}/g, '\n\n').trim();
// 🔴 Thinking is ON by default on Opus 5 and comes out of max_tokens. Hitting the ceiling with
//    no text is the exact failure 07 shipped once and read as a pass. Say so, loudly.
if (stop === 'max_tokens' && !text) {
  throw new Error(`house ${brief.position.house}: hit the token ceiling with no prose — reasoning `
    + `ate the budget. Lower the effort; a bigger ceiling only moves the wall.`);
}
if (!text) throw new Error(`house ${brief.position.house}: no text (stop=${stop})`);
return [{ json: { ...brief, prose: text, keynote, takeaway } }];
"""

# ─── 6 · the joiner ────────────────────────────────────────────────────────────
JOIN_JS_PHASE2_ARCHIVE = r"""
const rows = $input.first().json.data;
const TIMING = __TIMING__;   // the dating law — scripts/02-houses.json → timing
// 🔴 THE SIX CARDS THAT WERE NEVER IN THE DECK. Both letters spent three each, so none can
//    be drawn — and that means none of them can be ABSENT in any meaningful way either.
const SPENT = __SPENT__;
// ⛔ REFUSE A HALF-COLLECTED PASS. When the loop failed to reset, this node was handed twelve
//    fresh briefs with no prose and died with "Cannot read properties of undefined (reading
//    'trim')" — an error that names a line number and nothing else. Say what actually happened.
const missing = rows.filter((r) => !r.prose).length;
if (missing) {
  throw new Error(`${missing} of ${rows.length} houses arrived with no prose — the loop did not `
    + `reset on a regeneration. Check the 'reset' option on node 4.`);
}
const j = rows[0];
const sorted = rows.slice().sort((a, b) => a.position.house - b.position.house);

// ⭐ THE JOINER NEEDS A SEED TOO. The twelve passages are rotated per buyer; the OPENING and the
//    CLOSE were not, and they are a third of the document. 🔴 Measured across two readings: both
//    opened "I laid these last night, at my own table…", both then said "Here is what I noticed
//    while I was setting them down. Four cards came out reversed…", both counted the reversals
//    and claimed a pattern in which rooms they fell in, and both closed on the same three moves
//    in the same order. Nothing asked for any of that — one fixed prompt returns one shape.
const jseed = (str) => { let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return h; };
const JSEED = jseed(String(j.order_id || 'no-order'));

// ⛔ WHAT SHE NOTICED WHILE LAYING THEM, rotated — and it must be TRUE OF THE TABLE BELOW.
// 🔴 Both readings invented a grouping and then contradicted it themselves: one called the ninth
//    house "a room about other people" (it is what you believe) and one called the twelfth "a
//    room you are standing inside" before its own twelfth passage opened "here is what you
//    cannot see from where you stand". A pattern claim she can disprove on page one is the
//    cheapest possible way to lose her, because it is the first thing she reads.
const NOTICED = [
  'WHICH ROOMS THE REVERSALS FELL IN — but only if they genuinely group, and name the rooms by what they are for, not by number alone. If they do not group, say that they are scattered, which is also true and also worth saying.',
  'THE ONE YOU SAT WITH LONGEST before you could write it, and say what stopped you.',
  'TWO CARDS THAT ANSWER EACH OTHER across the table. Name both, by card and by room, and say what the pair settles that neither settles alone.',
  'THE ROOM YOU DID NOT EXPECT TO BE THE LOUD ONE. Say which you would have bet on, and which it turned out to be.',
  'WHAT IS NOT HERE. A whole kind of card that did not come up, or a room that came out quiet. An absence is a finding and she has never been told one. 🔴 ⛔ BUT NEVER ONE OF THESE — they were taken out of the deck before you dealt, because the letters already spent them, so their absence means nothing and reporting it is a false reading she can catch: ' + SPENT.join(', ') + '.',
  'THE TWO THAT PULL OPPOSITE WAYS. Name them, say the pull, and say that you are not going to resolve it for her because the reading does that below.',
];
const noticed = NOTICED[JSEED % NOTICED.length];

// ⭐ WORD BUDGET FROM THE PASSAGES THAT ACTUALLY ARRIVED, not from the estimate. Passages run
//    5-10% over what they were asked for; told "they run to about X, the rest is yours", the
//    joiner spends the full remainder on top of the real number and the reading lands over.
//    Aim at 1.05x target — the grade allows ±20% and the opening is where the money is.
const posWords = rows.reduce((n, r) => n + r.prose.trim().split(/\s+/).length, 0);
const budget = Math.max(200, Math.round(j.target_words * 1.05) - posWords);
const openW = Math.round(budget * 0.45), closeW = Math.round(budget * 0.30);
const transW = Math.max(0, budget - openW - closeW);
const gaps = Math.max(1, sorted.length - 1);
const lo = Math.round(j.target_words * 0.85), hi = Math.round(j.target_words * 1.15);

const marker = (r) => `[${r.position.house} · ${r.position.house_name} · ${r.position.card_name}`
                    + `${r.position.reversed ? ' (reversed)' : ''}]`;
const body = sorted.map((r) => `${marker(r)}\n${r.prose}`).join('\n\n');

// Where her three landed — the joiner has to be able to say it in the opening.
// ⭐ THE ROOMS THAT OWE HER AN ANSWER. ⛔ Not "where her three fell" — her three are NOT in this
//    spread and the letter promised her they would not be. What she paid for is which ROOM
//    answers each question and what the card standing there says.
const hers = sorted.filter((r) => r.position.owes)
  .map((r) => `house ${r.position.house}, ${r.position.house_name} — ${r.position.card_name}`
            + `${r.position.reversed ? ' reversed' : ''}`);

const prompt = [
`Below are ${rows.length} passages, one per house, each written on its own off one twelve-card`,
`spread laid for ${j.first_name}. Right now they are ${rows.length} separate notes. Make them`,
`one sitting, with one woman in the room, written to one person.`,
``,
`⭐ THE ROOMS THAT OWE HER AN ANSWER, and the card standing in each — this is what she paid for:`,
hers.map((h) => `  · ${h}`).join('\n'),
``,
`THE OPENING — ${openW} words, and it does five things:`,
`  1. YOU ARE PRESENT AND YOU SAY SO. You laid these last night. ⛔ "What I did" on its own is`,
`     not enough — say one thing you noticed while you were doing it, and notice THIS:`,
`     ${noticed}`,
`     ⛔⛔ AND IT MUST BE TRUE OF THE TABLE PRINTED BELOW. Check it against the twelve before`,
`     you write it. Measured: two readings each invented a grouping in this exact sentence and`,
`     each was contradicted by one of its own passages further down. She can check this one`,
`     claim faster than any other in the document, because it is the first thing she reads.`,
`     ⛔ Do not open on the table itself. Open on the room you were in.`,
`  2. SAY THE SHAPE OF THE WHOLE DRAW, FLAT, in the first 150 words. Whether it is a good`,
`     draw or a hard one, and in which two or three rooms the next stretch of her life`,
`     actually happens. No suspense. She has paid.`,
`     ⭐ AND NAME THE WINDOW THE WHOLE READING RUNS ON, ONCE, HERE: ${TIMING.frame}. That is`,
`     the horizon for all twelve rooms. It is stated here so no room has to invent its own.`,
`     ⛔ EVERY ONE OF THE TWELVE IS A TRUMP BECAUSE YOU DECIDED THAT, and you told her so in`,
`     the letter. State it as fact and move on, or do not mention it. ⛔ Never as a marvel,`,
`     never as a coincidence, never "in thirty years I have seen that four times" — she has`,
`     read the paragraph where you gave the instruction. A real reading opened on exactly that`,
`     line and it is the one sentence in it that proves nobody was at the table.`,
`  3. SAY THAT THE TWELVE SETTLE WHAT ${j.arc === 'v2' ? 'HER TWO LETTERS' : 'THE LETTER'} LEFT OPEN, and that each answer stands in`,
`     the room it belongs to, below. ⛔ Do not answer them here.`,
`     🔴 ⛔ AND DO NOT ENUMERATE "THE FOUR ROOMS THAT CARRY WHAT YOU PAID FOR". She paid for`,
`     TWELVE cards, one to each room of a life — that is what the letter sold her. A reading`,
`     that names four rooms as the product has just told her the other eight are padding, and`,
`     she will read them that way for the rest of the document. A real one did exactly that.`,
`     ⭐ You may of course say WHERE something is settled when you get to it. What you may not`,
`     do is present the reading as four answers with eight rooms around them.`,
`     ⛔⛔ AND NEVER REPORT ONE OF THEM AS ABSENT. ${SPENT.join(', ')} were taken out of the`,
`     deck before the cut, so "the Moon did not come" is not a finding — it could not have`,
`     come. A real reading said exactly that, and it is the one claim in it she could`,
`     disprove. ⭐ You MAY name one when you mean the card from her LETTER — "the person`,
`     the Tower meant" is right, because that is the question she is owed. Naming it as`,
`     DEALT, or as MISSING, is the fault.`,
`     ⛔⛔ HER THREE CARDS ARE NOT IN THIS SPREAD. The letter promised her twelve NEW cards —`,
`     "Not these three again. These three have already said what they came to say." Never say`,
`     one of them "fell" anywhere, never list them as though they were dealt. What she was`,
`     promised is that the twelve would SETTLE what those three left open, and the room is`,
`     what settles it.`,
`  4. TAKE THE SHAME OUT, once, about whatever she had to admit to herself to buy this.`,
`  5. ⭐ THE INOCULATION, and it is not optional: some of what follows will look as though it`,
`     contradicts itself — a card promising ease in one room and asking for work in the next.`,
`     Tell her to read all twelve before she decides what it says, because the meaning is in`,
`     the arrangement and a life is not consistent either. ⛔ This sentence is the single`,
`     cheapest refund-prevention in the document. It is also in her delivery email. Keep it.`,
``,
`THE TRANSITIONS — ${transW} words in total, and ⛔ NOT ONE PER GAP.`,
`⭐ THERE ARE ${gaps} GAPS AND AT MOST ${Math.max(3, Math.round(gaps / 2.5))} OF THEM GET ONE.`,
`  Every other room simply ENDS. This is structural, not a style note: asked for a bridge in`,
`  every gap you write eleven of the same move, and eleven of the same move is what makes`,
`  twelve rooms read as a machine. Measured on two consecutive runs — "[summary clause]. [next`,
`  house announced]" closed eleven of twelve rooms both times and failed the grade both times.`,
`  Varying the WORDING of that move does not fix it. Writing fewer of them does.`,
`  Put one only where the reading genuinely turns — where a room changes what the last one`,
`  meant. Elsewhere let the passage stop on its own last line, and start the next room cold.`,
`the next room is being asked. ⛔ A transition is never a maxim and never a balanced pair.`,
`⛔ AND THEY MUST NOT ALL SHARE A SHAPE. Do not close passage after passage with the same tag —`,
`  a summing clause plus an announcement of the next room ("So the tiredness is yours. Now the`,
`  second house, and what you actually hold."). Measured: that formula closed nearly every`,
`  passage on three real runs and failed the grade on repetition. Vary them. Some carry a`,
`  question forward. Some name only what changed. Some are a single clause. ⭐ And some rooms`,
`  need none at all — a passage is allowed to simply end.`,
``,
`THE CLOSE — ${closeW} words, and it does five things:`,
`  1. ADD THEM UP. What the twelve say TOGETHER that no single card said.`,
`  2. RETURN TO THE ANSWERS THOSE ROOMS GAVE — BUT NOT AS AN INDEX. ⛔ Do not restate the three verdicts. She read`,
`     them ten minutes ago and a straight recap turns the ending of the document into its`,
`     contents page. Say what the three do TOGETHER that no one of them said: the order they`,
`     happen in, which one is the condition of the other two, what changes if one of them is`,
`     late. ⭐ And for at least one, name the OTHER card on the table that corroborates it —`,
`     she is testing whether these were laid for her, and an answer with the rest of the`,
`     spread standing behind it is the only kind she cannot get from a horoscope.`,
`  3. PAY THE PROMISE THE LETTER MADE — that she stops finding out last. Say what changes for`,
`     her about the way the next stretch arrives. ⛔ Not in the letter's words, and not in`,
`     these: two readings from different buyers returned this instruction's own sentence`,
`     verbatim, word for word, including its rhythm. Say the idea in your own.`,
`  4. ⭐ NAME THE FIRST SIGN, AND DATE IT. The letter told her twice that the first of this`,
`     shows itself INSIDE FIVE TO SEVEN DAYS. She has been counting since she read it. So say`,
`     what the first sign actually is — one concrete thing she could notice and tick off — and`,
`     put it inside those five to seven days. ⛔ Not "something will shift". A thing that`,
`     happens, that she would recognise when it does.`,
`  5. ⭐ THE DATING CLOSE. Name the one room you dated — house ${TIMING.dated_house}, the room that answers the love promise —`,
`     and say why that one could be timed when the others cannot. ⛔ It is not a disclaimer and`,
`     not a hedge; it is what makes the single date in the document worth having:`,
TIMING.law_close.map((l) => '     ' + l).join('\n'),
`  6. End on something she can do or look at this week.`,
`  ⛔ Do NOT end on an aphorism or a balanced pair.`,
``,
`⛔ LENGTH. THIS IS ARITHMETIC AND THE GRADE FAILS ON IT.`,
`  The ${rows.length} passages below already total ${posWords} words, counted.`,
`  You may add ${budget} on top of them and no more — ${openW} opening, ${transW} transitions,`,
`  ${closeW} close. The finished reading must come out between ${lo} and ${hi} words.`,
`  If you find yourself over, tighten sentences inside the passages. Never remove a passage.`,
``,
`🔴 ⛔ THIS BRIEF IS INSTRUCTION, NOT PHRASING. Every sentence in it reaches every buyer, so a`,
`  clause you lift out of it is a clause printed in hundreds of identical documents. Measured on`,
`  two readings written from different draws for different buyers: the close returned four`,
`  sentences that were word-for-word identical, and every one of them was a phrase from this`,
`  brief rather than from her spread. ⛔ Take the INSTRUCTION and write the sentence yourself.`,
``,
`⛔ NO ONE CARD IS THE EVIDENCE MORE THAN TWICE. Measured: one reading produced the same card's`,
`  detail as proof in five separate rooms and in its close, and by the fifth time it had stopped`,
`  being evidence and become a refrain. Where a passage leans on a card that two earlier`,
`  passages already leaned on, cut the reference or send it to a different card.`,
`⛔ AND CROSS-REFERENCES DO NOT SHARE A SHAPE. Four rooms in one reading ended on the same tag —`,
`  "read it beside the X in your eighth" — which is a reader showing you she has seen the spread`,
`  rather than a reader reading it. If two passages carry that construction, rewrite one.`,
``,
`⛔ Do NOT re-order the passages and do NOT touch their [n · house · card] markers — the`,
`  renderer splits on them to put each card beside its own room. Copy each marker CHARACTER`,
`  FOR CHARACTER. You MAY reword a sentence inside a passage, in place, for these reasons and`,
`  no others: to remove a repetition between passages, to remove a banned construction, or to`,
`  take a DATE out of a room that is not the dated one.`,
`⛔ THE DATE AUDIT, AND YOU ARE THE LAST PERSON WHO CAN DO IT. Exactly ONE room in this reading`,
`  carries a week number or a day count: house ${TIMING.dated_house}, the room that answers the love promise. Read the passages and`,
`  strike every other one — "inside two to three weeks", "by week seven", "between the`,
`  eighteenth and the twenty-fifth day". Replace each with the thing itself, undated, or with`,
`  the window the whole reading runs on. ⭐ Two exceptions, and only two: telling her when to`,
`  ACT is not a dated claim, and your own close names the first sign inside five to seven days.`,
``,
`THE PASSAGES:`,
body,
].join('\n');

// The keynotes travel on the draw record, which is what node 10 renders headings from.
const draw = (j.draw || []).map((p) => {
  const row = sorted.find((r) => r.position.house === p.house);
  return { ...p, keynote: (row && row.keynote) || '' };
});
// 🔴 THE JOINER SUPPLIES ITS OWN VOICE. It used to inherit it from the rows, and the rows do
//    not have it: 4a adds `voice`, but 4c rebuilds its item from `$('4 · Each house')` — the
//    LOOP's output — which never saw 4a. So `$json.voice` reached node 6a as undefined,
//    JSON.stringify(undefined) is the bare token `undefined`, and n8n refused the body with
//    "JSON parameter needs to be valid JSON".
//    ⛔ The local harness could not see this: its shim answered $('4 · Each house') with 4a's
//    output, which DOES carry the voice. n8n execution 30471 is what found it.
const out = { ...j, voice: __VOICE__, draw, joined_input: body, prompt };
if (j.arc === 'v2') out.voice = out.voice + '\n\n' + __EMAIL_SAID_V2__;   // see node 4a
return [{ json: out }];
"""

# Phase 3 joiner: preserve the developed essays, then make the opening and close read as a
# single reader's considered argument rather than a checklist of verdicts.
JOIN_JS = r"""
const rows = $input.first().json.data;
const TIMING = __TIMING__;
const missing = rows.filter((r) => !r.prose).length;
if (missing) throw new Error(`${missing} of ${rows.length} houses arrived with no prose`);

const j = rows[0];
const sorted = rows.slice().sort((a, b) => a.position.house - b.position.house);
const marker = (r) => `[${r.position.house} · ${r.position.house_name} · ${r.position.card_name}`
  + `${r.position.reversed ? ' (reversed)' : ''}]`;
const body = sorted.map((r) => `${marker(r)}\n${r.prose}`).join('\n\n');
const posWords = rows.reduce((n, r) => n + r.prose.trim().split(/\s+/).length, 0);
const WORD_BUDGET = __WORD_BUDGET__;
const openW = WORD_BUDGET.opening, closeW = WORD_BUDGET.close;
const lo = WORD_BUDGET.total_min, hi = WORD_BUDGET.total_max;
const owed = sorted.filter((r) => r.position.owes).map((r) =>
  `  · house ${r.position.house} (${r.position.house_name}) — ${r.position.card_name}`
  + `${r.position.reversed ? ' reversed' : ''}`
).join('\n');
const table = sorted.map((r) =>
  `  · house ${r.position.house} (${r.position.house_name}) — ${r.position.card_name}`
  + `${r.position.reversed ? ' reversed' : ''}`
).join('\n');
const ledgers = sorted.map((r) =>
  `  · house ${r.position.house}: ${r.position.claim_ledger.forecast_scope}`
  + `${r.position.obligation ? `\n    obligation: ${r.position.obligation}` : ''}`
  + `\n    action: ${r.position.claim_ledger.action_scope}`
).join('\n');

const prompt = [
`Join these ${rows.length} developed house essays into one reading for ${j.first_name}. Preserve every house, its order, and its argument.`,
`The essays contain the teaching. Preserve their strongest source reasoning, comparison and personal application. Remove repeated explanations, recaps and method announcements; do not compress the essays into unsupported verdicts or expand them merely to fill a target.`,
``,
`OPENING — aim for ${openW} words.`,
`Write as a person who has finished laying and considering the whole table. Address her by name. Orient her through one true observation about the arrangement and explain how different rooms can qualify one another: reserve judgment about apparent contradictions until all twelve have been read. Preserve discovery: do not list promise rooms, preview their answers, defend the purchase, intensify the stakes, call the reading heavy, or generalize about women.` ,
``,
`BETWEEN ROOMS`,
`Let the house essays end and the next marker follow. Do not add a routine bridge. The cross-room reasoning already belongs inside the assigned essays.`,
``,
`CLOSE — aim for ${closeW} words.`,
`Put the exact standalone marker [CLOSE] before the closing prose. Resolve two or three important relationships in the spread and name no more than four rooms or cards. Explain how she stops finding out last. Name one concrete first sign inside five to seven days. Restate house ${TIMING.dated_house} as the only dated room and explain its timing from the event in that room, not from a decorative feature of the card. End with one proportionate and reversible thing she can do or notice, with no deadline. Add no fact, forecast, date or biographical detail absent from the house essays and ledgers.`,
``,
`The ${rows.length} house essays contain ${posWords} words. The full joined reading should land between ${lo} and ${hi} words, around ${j.target_words}. Never delete a house to meet the count.`,
`Do not use a calendar date. Do not announce a card from the earlier letters as dealt or missing. Do not add a second prediction window outside house ${TIMING.dated_house}; the five-to-seven-day first sign belongs only in the close.`,
`Before returning, compare paragraph openings and functions across all twelve rooms. Remove repeated self-certifying hinges and any repeated announce-proof-claim-action sequence while preserving the substance of each essay. Do not add intimacy, demographic commentary, administrative facts, third-party motives, or an action dependency to make a transition smoother.`,
`Do not lift wording from this brief. Do not turn its requirements into a visible sequence.`,
`The opening describes how to read the spread without revealing a financial outcome, romantic identity, public commitment or departure. The close draws connections between meanings; it cannot infer separate people, protected relationships or guaranteed outcomes beyond the room obligations. Resolve the finding-out-last promise through the distinction between observable information and interpretation, without accusing her of a prior habit. The dated event remains romantic recognition inside house 5's stated week.`,
`Copy every house marker character for character. Put no text between a marker and its house essay.`,
``,
`THE TWELVE AS LAID`,
table,
``,
`THE PROMISE ROOMS`,
owed,
``,
`THE CLAIM AND ACTION LEDGERS`,
ledgers,
``,
`THE HOUSE ESSAYS`,
body
].join('\n');

const draw = (j.draw || []).map((p) => {
  const row = sorted.find((r) => r.position.house === p.house);
  return { ...p, keynote: (row && row.keynote) || '', takeaway: (row && row.takeaway) || '' };
});
const out = { ...j, voice: __VOICE__, draw, joined_input: body, prompt };
if (j.arc === 'v2') out.voice = out.voice + '\n\n' + __EMAIL_SAID_V2__;
return [{ json: out }];
"""

_SPENT_NAMES = [SPEC["draw"]["excluded_names"][c] for c in SPEC["draw"]["excluded"]]
JOIN_JS = (JOIN_JS.replace("__SPENT__", json.dumps(_SPENT_NAMES, ensure_ascii=False))
    .replace("__WORD_BUDGET__", json.dumps(SPEC["word_budget"], ensure_ascii=False))
    .replace("__VOICE__", _VOICE_JSON)
    .replace("__EMAIL_SAID_V2__", json.dumps(EMAIL_SAID_V2, ensure_ascii=False))
    .replace("__TIMING__", json.dumps(
        {k: v for k, v in SPEC["timing"].items() if not k.startswith("_")},
        ensure_ascii=False, indent=2)))

KEEP_READING_JS = r"""
const brief = $('6 · Compose the joiner').first().json;
const r = $input.first().json;

// ⭐ ONE PARSER, EITHER PROVIDER. Anthropic returns content[] blocks + stop_reason; OpenAI
//    returns choices[0].message.content (a plain string) + finish_reason. Reading BOTH here
//    means the twelve-house logic, the keynote lift and every guard below stay a single code
//    path — so a fix made while testing one provider is not silently missing from the other.
// ⛔ The stop reasons are mapped, not renamed: OpenAI 'length' is Anthropic 'max_tokens', and
//    'content_filter' is a refusal. Both are HTTP 200, which is exactly why they need catching.
const _oa = !!(r && r.choices);
const _m  = _oa ? (r.choices[0] || {}) : null;
const say = _oa ? String((_m.message && _m.message.content) || '')
                : ((r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
const stop = _oa ? ({ length: 'max_tokens', content_filter: 'refusal' }[_m.finish_reason]
                    || _m.finish_reason)
                 : r.stop_reason;
if (stop === 'refusal') throw new Error(`joiner declined — `
  + `${(r.stop_details || {}).category || 'no category'}`);
const text = say.trim();
// ⛔ A TRUNCATED reading is worse than none: it reads as finished and stops mid-thought. Throw
//    even when there IS text, so the retry produces a whole one.
if (stop === 'max_tokens') {
  throw new Error(`joiner hit the token ceiling (${text.split(/\s+/).length} words written) — it `
    + `would ship cut off mid-sentence`);
}
if (!text) throw new Error(`joiner returned no text (stop=${stop})`);

// ─── measured, then handed to the grader ─────────────────────────────────────
// ⭐ THE ONE GRADER LINE THAT NEVER MISFIRED WAS THE WORD COUNT, because it is arithmetic on
//    two numbers the grader is handed rather than something it has to notice. So everything a
//    machine can count is counted HERE and given to it the same way, and what is left for the
//    model is judgment: whether a claim is carried by its card, whether a shape repeats. It is
//    not also asked to be a regex.
const draw = brief.draw || [];
const words = text.trim().split(/\s+/).length;

// Where the reading breaks into rooms, so a fault can be reported by house.
const chunks = [];
{
  const closeSplit = text.split(/\n\s*\[CLOSE\]\s*\n/);
  const parts = closeSplit[0].split(/\[(\d+) · [^·]+ · [^\]]+\]/);
  chunks.push({ house: 0, text: parts[0] || '' });               // the opening
  for (let i = 1; i < parts.length; i += 2) {
    chunks.push({ house: Number(parts[i]), text: parts[i + 1] || '' });
  }
  if (closeSplit.length > 1) chunks.push({ house: -1, text: closeSplit.slice(1).join('\n') });
}

// ⛔ HOUSE 5 OWNS THE ONLY CLOCK. Detect prediction windows and action deadlines alike; the
//    blind review found that a deadline attached to formal or consequential advice exerts the
//    same pressure as a prediction. The reading's own two-month frame is excluded by name — it
//    is the declared horizon, not a room-level date.
const N = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\\d+';
const O = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|'
        + 'thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|'
        + 'twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|'
        + 'twenty-sixth|twenty-seventh|twenty-eighth|twenty-ninth|thirtieth';
const DATED = new RegExp('\\b(?:'
  + '(?:week|weeks)\\s+(?:' + N + '|' + O + ')(?:\\s+(?:and|to|or)\\s+(?:' + N + '|' + O + '))?'
  + '|(?:inside|within|in|after|before|by|over)\\s+(?:the\\s+)?(?:next\\s+)?(?:' + N + ')'
  + '(?:\\s*(?:to|and|or|-|–)\\s*(?:' + N + '))?\\s+(?:day|days|week|weeks|month|months|fortnight)'
  + '|(?:the\\s+)?(?:' + O + ')(?:\\s+(?:and|to)\\s+(?:the\\s+)?(?:' + O + '))?\\s+(?:day|week|month)'
  + '|(?:this|next|coming)\\s+(?:day|week|month)'
  + '|before\\s+(?:the\\s+)?month\\s+turns'
  // 🔴 AND AN ABSOLUTE CALENDAR DATE, which the number-based patterns above all miss. Measured
  //    on exec 30587: "the week of September 21" was reported as ZERO dated claims, and it is
  //    the strongest and most perishable claim the document can make.
  + '|(?:week of\\s+)?(?:January|February|March|April|May|June|July|August|September|October'
  + '|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?'
  + '|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:January|February|March|April|May|June|July'
  + '|August|September|October|November|December)'
  + ')\\b', 'gi');
const isFrame = (m) => /\btwo\s+months?\b/i.test(m);   // the horizon the whole reading runs on
// ⭐ "inside five to seven days" is the LETTER's own promise, said twice, and the close pays it.
//    ⚠ It is excluded rather than attributed, because the close carries no [n · house · card]
//    marker — everything after the twelfth one reads as house 12, so a correct close would be
//    reported as the twelfth room breaking the law. Counted separately instead: it should be 1.
const isFirstSign = (m) => /five\s*(?:to|-|–)\s*seven\s+days/i.test(m);
const dated = [];
let firstSign = 0;
for (const c of chunks) {
  const sentences = c.text.split(/(?<=[.!?])\s+/).filter(Boolean);
  for (const sentence of sentences) {
    for (const m of (sentence.match(DATED) || [])) {
      if (isFirstSign(m)) { firstSign += 1; continue; }
      if (isFrame(m)) continue;
      const action = /\b(?:act|ask|answer|begin|choose|decide|do|make|note|say|speak|start|stop|take|tell|watch|write)\b/i.test(sentence)
        && /\b(?:you|your)\b/i.test(sentence);
      dated.push({ house: c.house, phrase: m.trim(), kind: action ? 'action' : 'prediction',
        sentence: sentence.trim() });
    }
  }
}

// The one room allowed to carry a date is the room that answers the love promise.
const datedRoom = 5;   // ⭐ house 5, the love answer — scripts/02-houses.json → timing

// ⭐ Does a passage argue from the table, or only assert? Count the OTHER cards it names.
//    ⚠ Case-sensitive on the bare names on purpose — "strength" the noun is not Strength the
//    card, and counting it would report an argument that is not there.
const crossrefs = chunks.filter((c) => c.house > 0).map((c) => {
  const named = draw.filter((q) => {
    if (q.house === c.house) return false;
    const nm = q.card_name.replace(/^the /, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b(?:the\\s+)?' + nm + '\\b').test(c.text);
  }).map((q) => q.card_name);
  return { house: c.house, names: named };
});

const roomChunks = chunks.filter((c) => c.house > 0);
const sentenceWords = text.split(/(?<=[.!?])\s+/).map((s) => s.trim().split(/\s+/).length)
  .filter((n) => n > 1);
const paragraphWords = text.split(/\n\s*\n/).map((s) => s.trim().split(/\s+/).length)
  .filter((n) => n > 1);
const withholds = roomChunks.flatMap((c) =>
  (c.text.match(/[^.!?\n]*I\s+(?:will\s+not|won't|cannot|can't)\s+tell[^.!?]*[.!?]?/gi) || [])
    .map((phrase) => ({ house: c.house, phrase: phrase.trim() }))
);
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const sd = (xs) => { if (!xs.length) return 0; const m = mean(xs);
  return Math.sqrt(xs.reduce((n, x) => n + Math.pow(x - m, 2), 0) / xs.length); };
const sentencesByRoom = roomChunks.flatMap((c) => c.text.split(/(?<=[.!?])\s+/)
  .map((s) => ({ house: c.house, text: s.trim() })).filter((s) => s.text));

// Cross-room copying is a stronger formula signal than a global phrase count. Fixed rendered
// Waite blocks never enter this text, so an eight-word sequence shared by rooms came from the
// generated interpretation itself.
const ngramRooms = new Map();
for (const c of roomChunks) {
  const tokens = c.text.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/).filter(Boolean);
  const seen = new Set();
  for (let i = 0; i <= tokens.length - 8; i++) seen.add(tokens.slice(i, i + 8).join(' '));
  for (const gram of seen) {
    if (!ngramRooms.has(gram)) ngramRooms.set(gram, []);
    ngramRooms.get(gram).push(c.house);
  }
}
const repeated8 = [...ngramRooms.entries()].filter(([, houses]) => houses.length > 1)
  .map(([phrase, houses]) => ({ phrase, houses })).slice(0, 30);

const genericWomen = sentencesByRoom.filter((s) =>
  /^(?:most|many|some|other|a good number of)?\s*women\b/i.test(s.text)
  || /^a woman who\b/i.test(s.text)
).map((s) => ({ house: s.house, phrase: s.text }));
const methodAnnouncements = sentencesByRoom.filter((s) =>
  /\b(?:the (?:line|detail|sentence|phrase|image) (?:worth|to|that)|reason from|the whole argument|say it plainly|put plainly|here is where|think of)\b/i.test(s.text)
).map((s) => ({ house: s.house, phrase: s.text }));
const biographyCandidates = sentencesByRoom.filter((s) =>
  /\b(?:for (?:several|many|a few|\d+) years?|years? ago|since (?:childhood|spring|summer|autumn|fall|winter)|your (?:doctor|lawyer|solicitor|employer|landlord|husband|wife)|the \w+ you own)\b/i.test(s.text)
  || /\byou (?:have|had)\b[^.!?]{0,100}\b(?:recently|before|already|for years?|since)\b/i.test(s.text)
).map((s) => ({ house: s.house, phrase: s.text }));
const consequentialCandidates = sentencesByRoom.filter((s) =>
  /^(?:leave|end|cut|move|transfer|withdraw|confront|accuse|quit|resign|sell|separate|untangle)\b/i.test(s.text)
  || (/^(?:begin|start|stop|change|take|refuse|decline)\b/i.test(s.text)
      && /\b(?:relationship|marriage|partner|money|account|health|doctor|law|legal|home|house|job|work|employment)\b/i.test(s.text))
).map((s) => ({ house: s.house, phrase: s.text }));

return [{ json: { ...brief, reading: text, metrics: {
  words,
  house_words: roomChunks.map((c) => ({ house: c.house, words: c.text.trim().split(/\s+/).length })),
  close_marker: chunks.some((c) => c.house === -1),
  conditional_words: (text.match(/\b(?:may|might|could|perhaps|if)\b/gi) || []).length,
  i_wont: (text.match(/\bI\s+(?:will\s+not|won't|cannot|can't)\b/gi) || []).length,
  withholds,
  sentence_mean: mean(sentenceWords),
  sentence_sd: sd(sentenceWords),
  paragraph_mean: mean(paragraphWords),
  dear: (text.match(/\bdear\b/gi) || []).length,
  generic_women: genericWomen,
  repeated_8grams: repeated8,
  method_announcements: methodAnnouncements,
  biography_candidates: biographyCandidates,
  consequential_candidates: consequentialCandidates,
  // ⛔ A house with no keynote renders as a bare card name. It is not worth failing a paid
  //    reading over, but it must never be invisible again.
  keynotes_missing: draw.filter((q) => !q.keynote).map((q) => q.house),
  // 🔴 THE FOG COUNT. Three blind readers graded three real readings on clarity and every one
  //    of them independently counted these nouns: 41 in the best, 80 in the middle, ~100 in the
  //    worst — and that single number ranked the three exactly as the human scores did. It is
  //    the most reliable quality signal we have found, so it is measured, not eyeballed.
  fog: (text.match(/\b(?:the (?:arrangement|binding|tie|connection|opening|movement|condition|terms|matter|exchange|holding|gain|stall|release|pause|resistance|invitation)|your standing|permission|provision|recognition|the (?:shape|sense) of it)\b/gi) || []).length,
  // ⭐ IS EVELYN IN HER OWN DOCUMENT? The shipped product uses "I" ~8x per 1,000 words; a real
  //    generated reading managed 3, with only three instances across all twelve rooms. The
  //    operator read that document and said it had no personality. This is that, counted.
  voice_i: (text.match(/\bI\b/g) || []).length,
  voice_i_in_rooms: roomChunks
    .reduce((n, c) => n + ((c.text.match(/\bI\b/g) || []).length), 0),
  dated_room: datedRoom,
  dated,
  first_sign: firstSign,
  crossrefs,
  // ⛔ She was told in the letter that YOU chose a Majors-only deck. Marvelling at it is the
  //    one sentence that proves nobody was at the table, and it opened a real reading.
  // ⚠ The window is a LINE, not a sentence. The one real instance of this ran across a full
  //    stop — "Twelve trumps, twelve out of the twenty-two, in a row. In thirty years I have
  //    seen that four times." — and a [^.] window reported it clean.
  majors_marvel:
    /(?:trump|major arcana|twenty-two|not a small card)[^\n]{0,200}?(?:never seen|seen that|thirty years|rare|does not happen|doesn't happen|by accident|by chance|an omen)/i.test(text)
    || /(?:never seen|seen that|thirty years|rarely|by accident|by chance)[^\n]{0,200}?(?:trump|major arcana|twenty-two)/i.test(text),
} } }];
"""

# ─── 7 · the grader ────────────────────────────────────────────────────────────
RUBRIC = """You are grading a twelve-card tarot reading against a fixed rubric before it is
sent to the woman who paid for it. Each line is yes or no. Any single NO fails the reading.

⭐ Every line below comes from copy/02/evelyn-esl-voice-profile.md §6 (\"Don'ts, and what breaks
most\") or from the shipped hand-written product. ⛔ Do not grade on rules from somewhere else,
and in particular do NOT fail this reading for stating a date, for predicting what another
person will do, or for a short sharpening fragment after a statement. All three are correct
here — two guardrails were lifted for this format on purpose, and the fragment is her cadence.

THE ANSWER — what she actually bought
1. All twelve houses are present, in order, each reading its OWN room. No house repeats
   another's point.
2. ⭐ THE THREE DEBTS ARE PAID. Three cards were shown to her in a sales letter and left
   unfinished on purpose; the message names which house each fell in and what each owed. Each
   debt is paid IN THAT HOUSE'S OWN PASSAGE, flat. \u26d4 Check EVERY part of what a card owed,
   not just the first — one of them carries two debts and one carries a branch, and half-paid
   is failed.
3. The opening orients her through one or two true observations about the table. It preserves
   discovery and does not reduce the reading to an index, list promise rooms, or preview answers.
4. The opening carries the inoculation: some cards will look as though they contradict each
   other, and she should read all twelve before deciding what it says.
5. The close resolves two or three important relationships in the spread, pays the promise that
   she stops finding out last, and introduces no unsupported claim.
6. The cards she was already shown are not re-explained from scratch, and the letter's
   own phrasing is not borrowed back to her.

THE VOICE — measured against her own file, not against general taste
7. ⛔ FINAL VERDICTS ARE FLAT. Fail \"I feel\", \"I sense\", \"the cards suggest\", or a final
   answer hidden behind several possibilities. Do not fail may, might, could, perhaps or if
   when they are doing honest teaching work before the passage reaches its definite answer.
8. ⛔ NO REFUSAL TO ANSWER. The sales letter's engine was the withhold — \"which of the two, I
   can't tell you from a single card\" — and it is OVER here. She has bought the answer and every
   card is read to its end. Fail this line if the reading declines to say what a card means,
   defers anything to a later reading, or names a limit on what the reader can see.
   Measured: that device appears 7 times in the letter and ZERO times in the shipped product.
   ⭐ DO NOT fail this line for the DATING CLOSE — "I have dated one room and only one… the rest
   I have not dated, and I won't pretend I can". That is the hand-written product's own closing
   move, word for word, and it is the opposite of a withhold: it tells her which single claim in
   the document is precise, so the rest are not read as precise. A reader who dates everything is
   the one hiding something. ⛔ It cost a real run a false fail on this line.
   ⭐ DO NOT fail this line for describing the TWELFTH HOUSE as hidden, blind or unseen. That is
   the room's own meaning — \"what is being kept from you\" — and naming it is the job, not a
   withhold. The test: is something being kept from her BY THE READER (fail), or is the reader
   telling her plainly that something is being kept from her by her life (correct)?
9. Each room is grounded somewhere in Waite's printed account and the supplied traditional
   meaning, and makes the path into this woman's life understandable. The twelve rooms do not
   all use the same route or ordered teaching ladder.
10. ⛔ ONE TRUE THING, NEVER THREE GUESSES. No symbol is given two or three unrelated possible
    meanings \"or perhaps\" each other. Pick one and state it.
11. The reading addresses one intelligent adult. Terms of endearment are optional and sparse;
    generic claims about women do not replace knowledge of this buyer. Use the measured counts.
12. ⛔ NO SHOUTING. No block capitals for emphasis, no exclamation stacks.
13. ⭐ NO SHAPE REPEATED ROOM AFTER ROOM. If the same construction opens, closes, reassures,
    inserts the reader, or announces the method passage after passage, fail this line and name
    it. Fail if the next paragraph's function becomes predictable from the previous rooms.
14. The total is 6,100–6,500 words and every house is inside its assigned minimum and maximum.
    Use the measured numbers and per-house bounds supplied below; do not count them yourself.
THE TAROT — is this a reading, or a performance? These four came from a working reader's audit
of two real generated readings, and each one names a fault that shipped.
15. ⛔ ONE ROOM IS DATED, AND ONLY ONE. You are handed the count and the phrases. Fail this line
    if a week number or a day count stands in any room other than the one named for you — the
    room that answers the love promise, house 5. The close names the first sign inside five to
    seven days, which the sales letter promised her twice, and may refer back to house 5's
    window. No other room may introduce or repeat a deadline, countdown, week window, day count,
    action timing or prediction timing. The count you are given lists every phrase with the
    house it stands in.
    ⭐ AND THE ONE DATE MUST BE JUSTIFIED BY SOMETHING REAL. The close names the dated room and
    says why that room could be timed. Fail this line if the reason is decoration — a claim about
    the card that is not true of it. 🔴 Measured: "I can date this room because two people stand
    apart on this card, and that distance closes on a single day." Nothing on the Lovers moves;
    the figures stand still under the angel. The honest reason is the one the hand-written
    product gives: a meeting is an EVENT and events have days, while the other eleven rooms are
    weather. In a document with exactly one date, a faked reason for it is worse than the crowd
    of dates it replaced.
    ⭐ You are given the list of date-shaped phrases and the house each stands in, so you do not
    have to go hunting. ⛔ But the list is where to LOOK, not the verdict: it catches descriptive
    uses too — "the invitation answered on the third day" is her habit, not a prediction, and a
    real run produced exactly that. Judge each candidate: is it a clock on something that HAPPENS
    to her, in a room that is not the dated one? That is the only kind that fails.
    Measured: unbudgeted, one reading dated ten of its twelve rooms, and a reader cut five of
    the six in the other. The hand-written product dates one room and says why.
16. ⛔ A REVERSAL IS A MODIFICATION, NEVER AN OPPOSITE, AND NEVER A PICTURE TURNED OVER. Fail
    this line if a reversed card is read as the negation of its upright meaning, or if its
    meaning is derived from what the drawing looks like inverted ("turned over, the lamp hangs
    below him, so the light no longer goes ahead"). A reversal is blocked, turned inward,
    already spent, delayed, leaking, forced early, refused, or held past its time.
    🔴 The reading that failed this read the Hanged Man reversed as a man standing up free with
    the rope loose — the opposite of that card — and told her the waiting had already ended.
17. ⭐ IT IS A SPREAD, NOT TWELVE READINGS IN A ROW. You are handed which passages name another
    card on the table. Fail this line if the rooms that owe her an answer (listed for you) deliver
    their verdicts with nothing on the table standing behind them. A reader who says "not
    renewal, arrival" without showing what settled it has performed, not read.
    ⛔ But do NOT fail this line for passages that stand alone. Most rooms should. The fault is
    an unsupported VERDICT on the three, not a low count.
18. ⛔ THE TWELVE ARE ALL TRUMPS BECAUSE SHE WAS TOLD THEY WOULD BE. The sales letter has a
    section headed "Why I'm using the Major Arcana for yours". Fail this line if the reading
    treats twelve Majors as rare, as a coincidence, as an omen, or as something the reader has
    seen four times in thirty years. It is her own instruction, and she is holding the letter.
19. ⛔ CONCRETE, SUPPORTED, PROPORTIONATE. A hard personal claim must be supported by the buyer
    context, the room's obligation, the card and house, or named evidence elsewhere in the dealt
    spread. Illustrations must remain possibilities rather than silently becoming her biography.
    Fail unsupported durations, professions, possessions, diagnoses, private rituals,
    relationship history, tallies, or locations. Also fail consequential advice about a
    relationship, money, health, law, housing or employment when the recommended step is not
    proportionate and reversible and the obligation did not require it.
20. ⭐ THE OPENING'S OBSERVATION IS TRUE OF THE TABLE. The reading opens by saying what the reader
    noticed while laying the twelve. You have the draw. Check the claim against it and fail this
    line if it is wrong — a miscounted group, a room described as something it is not, a pattern
    that the reading's own later passages contradict.
    🔴 Measured, twice: one reading called the ninth house "a room about other people" (it is what
    she believes) and hung its whole closing synthesis on it; another called the twelfth "a room
    you are standing inside" and then opened its own twelfth with "here is what you cannot see
    from where you stand". ⛔ It is the first thing she reads and the easiest thing she can
    disprove, so it is the cheapest way in the document to lose her.

Return the verdict and six 0–10 scores. `failed` lists the rubric numbers that failed. `why` is
one short sentence naming the worst fault, in plain words. Score continuation, trust,
structural variation, teaching, personal relevance, and tarot accuracy independently. The
reading must pass every rubric line even if its weighted score is high."""

# ⭐ THE GRADER'S USER MESSAGE IS IDENTICAL ON BOTH SIDES — same rubric, same handed-over
#    arithmetic. Only the envelope differs, so a grade from one provider is comparable to a
#    grade from the other.
_GRADE_USER = (
# ⭐ EVERY COUNTABLE THING IS COUNTED IN NODE 6b AND HANDED OVER. Line 14 (the word count) is
  #    the only rubric line that has never misfired, and the reason is that it is arithmetic on
  #    two numbers the grader is given. Lines 11, 15, 17 and 18 are now the same shape. A grader
  #    asked to also be a regex is a grader that reports whatever it happened to notice.
  '      "MEASURED FOR YOU. Do not recount any of this — it is arithmetic, not observation." +\n'
  '      "\\n  words: " + $json.metrics.words + ", against a target of " + $json.target_words +\n'
  '      "\\n  house word counts: " + $json.metrics.house_words.map(function (h) {\n'
  '        var a = $json.draw.find(function(p) { return p.house === h.house; }).architecture;\n'
  '        return "house " + h.house + "=" + h.words + " (allowed " + a.min_words + "-" + a.max_words + ")"; }).join(", ") +\n'
  '      "\\n  explicit close marker present: " + ($json.metrics.close_marker ? "yes" : "NO") +\n'
  '      "\\n  conditional teaching words: " + $json.metrics.conditional_words +\n'
  '      "\\n  refusal-shaped first-person phrases: " + $json.metrics.i_wont +\n'
  '      ($json.metrics.withholds.length ? "\\n  explicit withholds found:\\n" +\n'
  '        $json.metrics.withholds.map(function (w) { return "    · house " + w.house +\n'
  '          " — " + w.phrase; }).join("\\n") : "\\n  explicit withholds found: none") +\n'
  '      "\\n  mean sentence length: " + $json.metrics.sentence_mean.toFixed(1) + " words" +\n'
  '      " (SD " + $json.metrics.sentence_sd.toFixed(1) + ")" +\n'
  '      "\\n  mean paragraph length: " + $json.metrics.paragraph_mean.toFixed(1) + " words" +\n'
  '      "\\n  uses of the word dear: " + $json.metrics.dear + " across " + $json.draw.length +\n'
  '      " rooms — sparse is right; more than three is a measured failure" +\n'
  '      "\\n  generic assertions about women: " + $json.metrics.generic_women.length +\n'
  '      ($json.metrics.generic_women.length ? "\\n" + $json.metrics.generic_women.map(function (x) {\n'
  '        return "    · house " + x.house + " — " + x.phrase; }).join("\\n") : "") +\n'
  '      "\\n  repeated cross-room eight-word sequences: " + $json.metrics.repeated_8grams.length +\n'
  '      ($json.metrics.repeated_8grams.length ? "\\n" + $json.metrics.repeated_8grams.map(function (x) {\n'
  '        return "    · houses " + x.houses.join(", ") + " — " + x.phrase; }).join("\\n") : "") +\n'
  '      "\\n  method-announcing sentence candidates: " + $json.metrics.method_announcements.length +\n'
  '      ($json.metrics.method_announcements.length ? "\\n" + $json.metrics.method_announcements.map(function (x) {\n'
  '        return "    · house " + x.house + " — " + x.phrase; }).join("\\n") : "") +\n'
  '      "\\n  unsupported-biography candidates: " + $json.metrics.biography_candidates.length +\n'
  '      ($json.metrics.biography_candidates.length ? "\\n" + $json.metrics.biography_candidates.map(function (x) {\n'
  '        return "    · house " + x.house + " — " + x.phrase; }).join("\\n") : "") +\n'
  '      "\\n  consequential-imperative candidates: " + $json.metrics.consequential_candidates.length +\n'
  '      ($json.metrics.consequential_candidates.length ? "\\n" + $json.metrics.consequential_candidates.map(function (x) {\n'
  '        return "    · house " + x.house + " — " + x.phrase; }).join("\\n") : "") +\n'
  '      "\\n  the ONE room allowed to carry a date: house " + $json.metrics.dated_room +\n'
  '      ", the room that answers the love promise" +\n'
  '      "\\n  date-shaped phrases found (candidates — judge each, some are descriptive): " +\n'
  '      $json.metrics.dated.length +\n'
  '      ($json.metrics.dated.length ? "\\n" + $json.metrics.dated.map(function (d) {\n'
  '        return "    · house " + d.house + " [" + d.kind + "] — " + d.phrase +\n'
  '          " — " + d.sentence; }).join("\\n") : "") +\n'
  '      "\\n  passages naming another card on the table: " +\n'
  '      $json.metrics.crossrefs.filter(function (c) { return c.names.length; }).length +\n'
  '      " of " + $json.metrics.crossrefs.length +\n'
  '      ($json.metrics.crossrefs.filter(function (c) { return c.names.length; }).length ?\n'
  '        "\\n" + $json.metrics.crossrefs.filter(function (c) { return c.names.length; })\n'
  '        .map(function (c) { return "    · house " + c.house + " names " +\n'
  '          c.names.join(", "); }).join("\\n") : "") +\n'
  '      "\\n  the letter\'s five-to-seven-day first sign, times named: " +\n'
  '      $json.metrics.first_sign + " — it belongs in the close, once" +\n'
  '      "\\n  Evelyn present (uses of I): " + $json.metrics.voice_i + " total, " +\n'
  '      $json.metrics.voice_i_in_rooms + " inside the twelve rooms — the shipped product runs " +\n'
  '      "about 8 per 1,000 words and is present in nearly every room" +\n'
  '      "\\n  abstract-noun count (the fog: arrangement/binding/opening/terms/...): " +\n'
  '      $json.metrics.fog + " (" + (($json.metrics.fog / $json.metrics.words) * 1000).toFixed(1) +\n'
  '      " per 1,000 words; under 17 per 1,000 is clean, over 30 is fog)" +\n'
  '      "\\n  marvelling at the Majors detected by pattern: " +\n'
  '      ($json.metrics.majors_marvel ? "YES — read the sentence and judge it" : "no") +\n'
  # ⛔ Rubric line 20 asks the grader to CHECK the opening's claim about the table against the
  #    table. It cannot do that with only the three fixed cards, which is all it used to get.
  '      "\\n\\nTHE TWELVE AS THEY WERE LAID — check the opening\'s observation against this:\\n" +\n'
  '      $json.draw.map(function (p) {\n'
  '        return "  house " + p.house + " (" + p.house_name + ") — " + p.card_name +\n'
  '               (p.reversed ? " reversed" : ""); }).join("\\n") +\n'
  '      "\\n\\nTHE ROOMS THAT OWE HER AN ANSWER, and what each owes:\\n" +\n'
  '      $json.draw.filter(function (p) { return p.owes; }).map(function (p) {\n'
  '        return "  · " + p.card_name + " — house " + p.house + " (" + p.house_name +\n'
  '               "). Owed: " + p.obligation; }).join("\\n") +\n'
  '      "\\n\\nTHE READING:\\n" + $json.reading) }}'
)

_SCHEMA = ('"type": "object", "additionalProperties": false,\n'
           '        "properties": {\n'
           '          "pass":   { "type": "boolean" },\n'
           '          "failed": { "type": "array", "items": { "type": "integer" } },\n'
           '          "why":    { "type": "string" },\n'
           '          "recommend": { "type": "integer" },\n'
           '          "scores": { "type": "object", "additionalProperties": false,\n'
           '            "properties": {\n'
           '              "continuation": { "type": "integer" },\n'
           '              "trust": { "type": "integer" },\n'
           '              "variation": { "type": "integer" },\n'
           '              "teaching": { "type": "integer" },\n'
           '              "relevance": { "type": "integer" },\n'
           '              "tarot": { "type": "integer" }\n'
           '            }, "required": ["continuation", "trust", "variation", "teaching",\n'
           '              "relevance", "tarot"] }\n'
           '        }, "required": ["pass", "failed", "why", "recommend", "scores"]')

if PROVIDER == "openai":
    # ⛔ `strict: true` needs the schema closed — additionalProperties false and every property
    #    required — which the schema above already is. ⭐ reasoning_effort low for the same
    #    reason as Anthropic's effort low: a yes/no checklist that spends its budget thinking
    #    returns an EMPTY verdict, and the parser reads a blank as a pass.
    GRADE_BODY = ("={\n"
      f'  "model": "{MODEL_GRADE}",\n'
      '  "max_completion_tokens": 8000,\n'
      '  "reasoning_effort": "low",\n'
      '  "response_format": { "type": "json_schema", "json_schema": {\n'
      '      "name": "verdict", "strict": true,\n'
      '      "schema": { ' + _SCHEMA + ' } } },\n'
      f'  "messages": [\n'
      f'    {{ "role": "system", "content": {json.dumps(RUBRIC)} }},\n'
      '    { "role": "user", "content": {{ JSON.stringify(\n'
      # ⛔ ONE closing brace here, not two: the {{ }} closes the expression, this `}` closes the
      #    message object, and the `]` below closes the array. Two braces is a 400 the moment a
      #    real order runs, and it fills to invalid JSON so nothing upstream catches it.
      + _GRADE_USER + ' }\n'
      '  ]\n'
      "}")
else:
    GRADE_BODY = ("={\n"
      f'  "model": "{MODEL_GRADE}",\n'
      '  "max_tokens": 8000,\n'
      # 🔴 effort low, NOT a bigger ceiling. 07 proved this the expensive way: a yes/no checklist
      #    at default effort spent the whole budget thinking and returned an EMPTY verdict on 3
      #    runs in 4, and the parser read each blank as a pass. The lever is effort.
      '  "output_config": {\n'
      '    "effort": "low",\n'
      '    "format": { "type": "json_schema", "schema": {\n'
      '      ' + _SCHEMA + ' } }\n'
      '  },\n'
      f'  "system": [{{ "type": "text", "text": {json.dumps(RUBRIC)} }}],\n'
      '  "messages": [{ "role": "user", "content": {{ JSON.stringify(\n'
      # ⛔ _GRADE_USER already ends with the `}}` that closes the n8n expression. What is left
      #    to add is `}` for the message object and `]` for the array — nothing more.
      + _GRADE_USER + ' }]\n'
      "}")

VERDICT_JS = r"""
const brief = $('6b · Keep the reading').first().json;
const r = $input.first().json;

// ⭐ ONE PARSER, EITHER PROVIDER. Anthropic returns content[] blocks + stop_reason; OpenAI
//    returns choices[0].message.content (a plain string) + finish_reason. Reading BOTH here
//    means the twelve-house logic, the keynote lift and every guard below stay a single code
//    path — so a fix made while testing one provider is not silently missing from the other.
// ⛔ The stop reasons are mapped, not renamed: OpenAI 'length' is Anthropic 'max_tokens', and
//    'content_filter' is a refusal. Both are HTTP 200, which is exactly why they need catching.
const _oa = !!(r && r.choices);
const _m  = _oa ? (r.choices[0] || {}) : null;
const say = _oa ? String((_m.message && _m.message.content) || '')
                : ((r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(''));
const stop = _oa ? ({ length: 'max_tokens', content_filter: 'refusal' }[_m.finish_reason]
                    || _m.finish_reason)
                 : r.stop_reason;
const raw = say;

// 🔴 THE GRADER FAILS OPEN, DELIBERATELY, AND THAT IS THE PRODUCT RULE — the workflow is
//    "regenerate once, then send anyway", so a broken grader must not cost a paying customer
//    her reading. ⛔ But it must never fail open SILENTLY: node 9's log is the only record
//    that something went out ungraded, so the reason goes in `why`, where the audit query
//    reads it. Do not tidy these strings — they are the mitigation.
// ⭐ 02 has a second net 07 does not: the 24-hour wait sits AFTER this, so a human reading
//    the log the same day can still stop the send. That only works if somebody reads it.
let v;
if (stop === 'refusal') {
  v = { pass: true, failed: [], why: `UNGRADED — grader declined: `
      + `${(r.stop_details || {}).category || 'no category'}` };
} else if (stop === 'max_tokens' && !raw.trim()) {
  v = { pass: true, failed: [], why: 'UNGRADED — grader hit max_tokens with no verdict '
      + '(reasoning ate the budget). Lower the effort on node 7.' };
} else {
  try { v = JSON.parse(raw); }
  catch { v = { pass: true, failed: [], why: 'UNGRADED — grader output unparseable' }; }
}

// Countable contract failures override the model's judgment. The prose grader is useful for
// meaning and repetition; it has repeatedly passed arithmetic and missing-card evidence that
// the workflow had already measured correctly.
const hard = [];
const m = brief.metrics || {};
if (!m.close_marker) hard.push(5);
if ((m.words || 0) < 6100 || (m.words || 0) > 6500
    || (m.house_words || []).some((h) => {
      const bounds = (brief.draw || []).find((p) => p.house === h.house)?.architecture;
      return !bounds || h.words < bounds.min_words || h.words > bounds.max_words;
    })) hard.push(14);
const crossByHouse = new Map((m.crossrefs || []).map((c) => [c.house, c.names || []]));
const unsupported = (brief.draw || []).filter((p) => p.owes)
  .filter((p) => !(crossByHouse.get(p.house) || []).length).map((p) => p.house);
if (unsupported.length) hard.push(17);
if ((m.withholds || []).length) hard.push(8);
if ((m.i_wont || 0) > 2) hard.push(13);
if ((m.dear || 0) > 3 || (m.generic_women || []).length > 2) hard.push(11);
if ((m.repeated_8grams || []).length) hard.push(13);
const datedHouses = (m.dated || []).filter((d) => d.house > 0).map((d) => d.house);
if (!datedHouses.includes(m.dated_room) || datedHouses.some((h) => h !== m.dated_room)
    || (m.first_sign || 0) !== 1) hard.push(15);
if (m.majors_marvel) hard.push(18);
if (hard.length) {
  v.pass = false;
  v.failed = [...new Set([...(v.failed || []), ...hard])].sort((a, b) => a - b);
  const detail = [
    unsupported.length ? `promise rooms without named-card evidence: ${unsupported.join(', ')}` : '',
    (m.withholds || []).length ? `explicit withholds: ${m.withholds.length}` : '',
    (m.dear || 0) > 3 ? `terms of endearment: ${m.dear}` : '',
    (m.generic_women || []).length > 2 ? `generic women claims: ${m.generic_women.length}` : '',
    (m.repeated_8grams || []).length ? `repeated cross-room eight-grams: ${m.repeated_8grams.length}` : '',
    hard.includes(15) ? `timing contract: dated houses ${[...new Set(datedHouses)].join(', ') || 'none'}, first sign ${m.first_sign || 0}` : '',
    m.majors_marvel ? 'Majors presented as rare or accidental' : '',
  ].filter(Boolean).join('; ');
  v.why = `${v.why || 'Model grade overridden by measured contract.'}${detail ? ' Measured: ' + detail + '.' : ''}`;
}
// Anthropic's supported JSON-schema subset does not accept minimum/maximum. Enforce the range
// here so a malformed value such as 88 can never print as 88/10 or contaminate the audit trail.
const s = v.scores || {};
const scoreKeys = ['continuation', 'trust', 'variation', 'teaching', 'relevance', 'tarot'];
const invalidScores = scoreKeys.filter((key) =>
  !Number.isInteger(s[key]) || s[key] < 0 || s[key] > 10);
const recommendValid = Number.isInteger(v.recommend) && v.recommend >= 0 && v.recommend <= 10;
if (invalidScores.length || !recommendValid) {
  const faults = [
    invalidScores.length ? `invalid prose scores: ${invalidScores.join(', ')}` : '',
    !recommendValid ? `invalid recommendation score: ${String(v.recommend)}` : '',
  ].filter(Boolean).join('; ');
  v.score_error = faults;
  v.why = `${v.why || ''}${v.why ? ' ' : ''}Automated score ignored — ${faults}.`;
}
v.recommend = recommendValid ? v.recommend : null;
v.weighted_score = invalidScores.length ? null : Number((
  s.continuation * 0.25
  + s.trust * 0.20
  + s.variation * 0.20
  + s.teaching * 0.15
  + s.relevance * 0.10
  + s.tarot * 0.10
).toFixed(2));
return [{ json: { ...brief, verdict: v } }];
"""

ROUND_AGAIN_JS = r"""
// ⛔ CARRY THE DRAW BACK. Without it node 3 would shuffle again and the second attempt would
//    be a reading of DIFFERENT cards — so the grade log would describe a draw that was never
//    sent, and the log is the whole mitigation.
const j = $input.first().json;
return [{ json: {
  order: { order_id: j.order_id, email: j.email, first_name: j.first_name,
           paid_at: j.paid_at, bump: j.bump,
           // ⛔ AND THE ARC. Without these a regeneration of a v2 order would be written as v1.
           c: j.c, arc: j.arc, mechanism: j.mechanism },
  draw: j.draw,
  attempt: j.attempt,
}}];
"""

# ─── 02-P3, the free gift — STATIC, inlined at build time ──────────────────────
# ⭐ It renders inside the same document as a second act, never a separate send (00e §6c),
#    and it is the same fixed practice for every buyer. So it is converted HERE, once, rather than
#    shipped as a markdown-to-HTML converter inside an n8n Code node.
# ⛔ The same two rules build-be-product.mjs learned: cut at '## Build notes', and strip a
#    leading ⚠/⛔/🔴 — one of those markers sat on a real sentence and printed in a buyer's
#    copy of the shipped PDF.
def gift_html():
    import re, html as H
    src = open(os.path.join(_HERE, "../../../../copy/02/02-P3-attention-ledger.md"), encoding="utf-8").read()

    lines = src.splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith("### And now the second part"))
    end = next((i for i, l in enumerate(lines) if i > start and l.startswith("## Build notes")),
               len(lines))
    buyer_copy = "\n".join(lines[start:end])
    for forbidden in ("the Chariot", "Your fifth house", "first sign shows itself",
                      "The two love weeks"):
        if forbidden in buyer_copy:
            raise SystemExit(f"\n  ⛔ 02-P3 buyer copy is no longer draw-agnostic: {forbidden}\n")
    stripped = 0
    out, para = [], []
    def flush():
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>"); para.clear()
    def inline(t):
        t = H.escape(t)
        t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
        t = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", t)
        return t
    for raw in lines[start:end]:
        l = raw.rstrip()
        cleaned = re.sub(r"^\s*(?:⚠|⛔|🔴|📎|⚡|🙋)\s+", "", l)
        if cleaned != l: stripped += 1
        l = cleaned
        if not l.strip():                      flush(); continue
        if l.startswith("### "):               flush(); out.append(f"<h2>{inline(l[4:])}</h2>"); continue
        if l.strip() == "---":                 flush(); continue   # scene rules are noise in print
        if l.startswith("- "):
            flush()
            if not out or not out[-1].endswith("</ul>"):
                out.append(f"<ul><li>{inline(l[2:])}</li></ul>")
            else:
                out[-1] = out[-1][:-5] + f"<li>{inline(l[2:])}</li></ul>"
            continue
        para.append(l.strip())
    flush()
    h = "".join(out)
    # ⛔ NO BACKTICKS: this string lands inside a JS template literal, and one backtick ends
    #    the literal and stops the Code node parsing. Same trap as 07's CSS block.
    assert "`" not in h, "the gift contains a backtick — it would break the Code node"
    print(f"    02-P3 inlined: {len(h)} chars of HTML, {stripped} spec marker(s) stripped")
    return h

# ─── 10 · build the HTML ───────────────────────────────────────────────────────
HTML_JS = r"""
// PDFShift takes ONE HTML string as `source`, so the whole document is assembled here.
//
// ⭐ EVERYTHING PERSONAL LIVES IN THIS NODE — her name, her twelve, where her own three fell.
//    If personalisation is ever wrong, this is the only file to read.
//
// ⭐ THE CARD ART IS NOT LOOKED UP FROM THE PROSE. The joiner leaves [n · house · card]
//    markers, but only the HOUSE NUMBER is trusted: the slug and the display name come from
//    the draw record this workflow made. 07 slugifies whatever the model typed and its own
//    test plan calls that a live hazard — a model that writes "The Wheel" gets a 403 from S3
//    and a silent hole in a paid document. Here the model cannot name a file.
const j    = $('7a · Read the verdict').first().json;
const S3   = '__S3__';
const esc  = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = (t) => (t || '').trim().split(/\n\n+/).filter(Boolean)
  .map((p) => `<p>${esc(p.trim())}</p>`).join('');
const proseParas = (t, house) => {
  const rows = (t || '').trim().split(/\n\n+/).filter(Boolean).map((p) => p.trim());
  const takeaway = String(house.takeaway || '').trim();
  const position = (house.architecture || {}).emphasis_position || 'none';
  if (!takeaway || position === 'none') return rows.map((p) => `<p>${esc(p)}</p>`).join('');
  let at = position === 'early' ? Math.min(1, rows.length)
    : position === 'middle' ? Math.max(1, Math.floor(rows.length / 2))
    : Math.max(1, rows.length - 1);
  at = Math.min(at, rows.length);
  const out = rows.map((p) => `<p>${esc(p)}</p>`);
  out.splice(at, 0, `<p class="takeaway"><strong>${esc(takeaway)}</strong></p>`);
  return out.join('');
};

// ⭐ ONE PLAIN LINE PER CARD, printed under its picture. For a buyer who has never read tarot
//    the passage jumps from a detail on the card straight to a claim about her life, and
//    nothing says what the card IS. ⛔ Declared ABOVE the section loop that uses it — it was
//    first put down beside BLURB, which sits after the loop, and the render died on
//    "Cannot access 'PLAIN' before initialization".
const PLAIN = __PLAIN__;
// ⭐ WAITE ON THE PAGE, VERBATIM (operator, 2026-09-09). A. E. Waite commissioned this deck and
//    wrote the book on it in 1911; it is public domain. 🔴 A competitor's paid reading prints
//    his description in a block before it reads each card, and that block is doing two jobs at
//    once: it is the authority the reading then speaks WITH, and it is the rung a newcomer
//    needs — what the card is, before what it means for her.
// ⛔ Verbatim, and never rewritten. The moment it is paraphrased it stops being Waite and
//    becomes us in a wig.
const WAITE = __WAITE__;

const byHouse = {};
(j.draw || []).forEach((p) => { byHouse[p.house] = p; });

const readingParts = String(j.reading).split(/\n\s*\[CLOSE\]\s*\n/);
const closeText = readingParts.length > 1 ? readingParts.slice(1).join('\n').trim() : '';
const parts = readingParts[0].split(/\[(\d+) · ([^·]+) · ([^\]]+)\]/);
// ⛔ parts[0] is everything BEFORE the first marker — the joiner's OPENING, which carries the
//    flat answer, the shame removal and the inoculation. 07 dropped exactly this with a
//    .slice(1) and shipped a PDF with the paid-for answer deleted; the grader had already
//    checked it was there. Nothing but rendering a real document catches it.
let body = parts[0].trim() ? `<div class="opening">${paras(parts[0])}</div>` : '';
let rendered = 0;
for (let i = 1; i < parts.length; i += 4) {
  const house = byHouse[Number(parts[i])];
  const prose = parts[i + 3];
  // A marker for a house that is not in the draw means the joiner invented one. Refuse: a
  // silently dropped house is eleven twelfths of a product, and it looks complete.
  if (!house) throw new Error(`the reading names house ${parts[i]}, which is not in the draw`);
  rendered += 1;
  const file = house.card + (house.reversed ? '-reversed' : '') + '.jpg';
  // ⛔ THE HEADING BLOCK IS ONE UNIT. Only house 1 can be split — every later house opens its
  //    own sheet — but house 1 continues from the opening, and on a real render its heading sat
  //    alone at the foot of the page. Avoid-after on the tags alone was not enough: the break
  //    then fell INSIDE the h2, stranding "House 1" and carrying "yourself" over. The wrapper
  //    is what actually holds them together.
  body += `<section>
    <header class="hh">
    <h2><span class="n">House ${esc(house.house)}</span>${esc(house.house_name)}</h2>
    <h3>${esc(house.card_name)}${house.keynote ? ' · ' + esc(house.keynote) : ''}</h3>
    </header>
    <figure><img src="${S3}${file}" alt="">
      <figcaption>${esc(house.card_name)}${house.reversed ? ' &middot; reversed' : ''}
        <span class="pl">${esc(PLAIN[house.card] || '')}</span>
      </figcaption>
    </figure>
    ${WAITE[house.card] ? `<blockquote class="waite">${paras(WAITE[house.card])}
      <cite>A. E. Waite, <em>The Pictorial Key to the Tarot</em>, 1911</cite></blockquote>` : ''}
    <div class="prose">${proseParas(prose, house)}</div></section>`;
}
if (rendered !== (j.draw || []).length) {
  throw new Error(`${rendered} of ${(j.draw || []).length} houses reached the document`);
}
if (!closeText) throw new Error('the reading has no [CLOSE] marker or closing prose');
body += `<div class="close">${paras(closeText)}</div>`;

// ⭐ THE COVER IS ONE GENERIC IMAGE, ON PURPOSE. A per-buyer wheel was built and thrown away:
//    the product is one PDF per buyer but the cover cannot be, and rendering personal art per
//    order buys a page nobody reads twice.
//    ⛔ THE OLD COVER WAS WORSE THAN NONE. It pictured the ORIGINAL hand-written twelve —
//    Magician in house 1 and so on — on a document whose house 1 holds whatever fell there.
//    make-zodiac-spread.mjs warns about exactly that in its own header: "the picture is what
//    she believes." The cover now shows only what is true for EVERY buyer — her three from the
//    letter face-up, the other nine face DOWN, and no house numbers anywhere. A face-down card
//    makes no claim, so it cannot contradict a draw. Built by scripts/make-02-cover.mjs.
// 🔴 THE WHOLE SPREAD, ALL TWELVE. ⛔ NOT the four rooms that owe an answer.
//    This box has now been wrong twice. First it read "The three you were shown, and where they
//    fell", which the twelve-new-cards decision made false. Then it listed the FOUR rooms that
//    carry the letter's promises under "Where your letter is answered" — and that is worse,
//    because it tells a woman who paid for twelve cards that four of them are the product and
//    the other eight are padding. She bought a twelve-card spread. Show her twelve.
const hers = (j.draw || []);
// ⭐ THE SIX PAIRS, so the box can show them. A room below sends her to "your tenth" and she
//    has no way to know what the tenth is, or why this room points at it. 🔴 The reading now
//    reads its opposite house in 11 of 12 rooms — that structure is invisible without this.
const AXPAIR = { 1:7, 2:8, 3:9, 4:10, 5:11, 6:12, 7:1, 8:2, 9:3, 10:4, 11:5, 12:6 };
// ⭐ ONE PLAIN LINE PER ROOM, for a buyer who has never seen a zodiac spread. ⛔ NOT the
//    `job` field — that is written for the model and is full of spec markers. These are
//    declared in scripts/02-houses.json → houses[].blurb and written for her.
const BLURB = __BLURB__;
const DATE = (iso) => { const d = new Date(iso);
  const M = ['January','February','March','April','May','June','July','August','September',
             'October','November','December'];
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  /* ⛔ THE PAPER MARGIN CANNOT BE 0 — .inner's padding applies once, at the START of the div,
     so any house running past one sheet continues hard against the paper edge. The border has
     to come from @page so every sheet gets it. The cover is exempted twice over: it is a
     deliberate full-bleed photograph and it must survive a reordering.
     ⛔ NO BACKTICKS IN THIS BLOCK — one ends the template literal and the node stops parsing. */
  @page { size: Letter; margin: .6in 0 .6in; @bottom-center { content: "Your twelve · " counter(page); font-family: Georgia, serif; font-size: 9pt; color: #62594C; } }
  @page :first { margin: 0; }
  @page cover  { margin: 0; @bottom-center { content: none; } }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2A2622; margin: 0;
         font-size: 11.5pt; line-height: 1.62; }
  h1, h2 { font-family: Georgia, serif; font-weight: bold; color: #2A2622; }

  /* ── page 1 · the cover ────────────────────────────────────────────────────
     ⛔ contain, not cover. The art is SQUARE and the page is portrait, so object-fit:cover
     would crop the left and right cards off the wheel entirely. */
  .cover { page: cover; position: relative; width: 8.5in; height: 11in; overflow: hidden;
           page-break-after: always; background: #FBF8F1; }
  .cover img { position: absolute; left: .35in; top: .9in; width: 7.8in; height: 7.8in;
               object-fit: contain; }
  .covertype { position: absolute; left: 0; right: 0; bottom: 1.1in; text-align: center;
               font-size: 12.5pt; color: #6E6459; margin: 0; }
  .covertype b { color: #2A2622; }

  .inner { padding: .30in .95in .35in; }
  /* ⭐ ITS OWN PAGE. Twelve rooms with a plain-English line each is a reference she will flip
     back to, not a preamble — and cramming it above the opening pushed the letter onto page 3
     anyway. Given a page it can breathe, and the reading starts clean. */
  .intake { border: 1pt solid #DED4BE; background: #FAF7F0; padding: 20pt 22pt; margin: 0;
            page-break-after: always; }
  .intake .rm { margin: 0 0 7pt; page-break-inside: avoid; }
  .intake p.gl { margin: 1pt 0 0 20pt; font-size: 9pt; line-height: 1.4; color: #7C766A; }
  .intake .k { font-family: Helvetica, Arial, sans-serif; font-size: 7.5pt; letter-spacing: .18em;
    text-transform: uppercase; color: #8A8377; margin: 0 0 9pt; }
  .intake p.line { margin: 0; font-size: 11pt; line-height: 1.4; }
  .intake p.line b { display: inline-block; width: 20pt; color: #8A6212; }
  .intake .c { color: #6E6459; font-style: italic; }
  .intake .ax { font-family: Helvetica, Arial, sans-serif; font-size: 7.5pt; color: #A79C88;
                margin-left: 5pt; letter-spacing: .04em; }
  .intake p.lede { font-size: 9.5pt; line-height: 1.55; color: #5C5348; margin: 0 0 8pt; }
  .intake p.lede b { color: #8A6212; }
  .intake p.foot { margin: 9pt 0 0; font-size: 8.5pt; color: #8A8377; font-style: italic;
                   border-top: 1pt solid #E7DFCB; padding-top: 7pt; }
  .intake b { color: #8A6212; }

  .opening { margin-bottom: 26pt; }
  .opening p:first-child { font-size: 13.5pt; line-height: 1.5; }
  /* ⛔ NO DROP CAP. It used to sit on .opening's first paragraph, which was prose. The reading
     now opens on a salutation — "Sarah," — so the cap rendered a giant S followed by "arah,"
     and mangled the one word in the document that must be right. A drop cap cannot be applied
     safely to a line whose content the model chooses. */
  .opening p:first-child { font-weight: bold; }

  /* ⭐ ONE HOUSE, ONE OPENING — twelve rooms should not run together, and the shipped
     hand-made PDF page-breaks between them too. */
  /* ⛔ house 1 MUST NOT force its own page. It did, and the opening's last paragraph was left
     alone on a sheet that was 85% white space — in a document she paid $35 for. Every LATER
     house still opens a page (twelve rooms should not run together), but the first one
     continues straight on from the opening it belongs to. */
  section { page-break-before: auto; page-break-inside: auto; margin-top: 30pt; padding-top: 18pt; border-top: 1pt solid #DED4BE; }
  section:first-of-type { page-break-before: auto; }
  /* ⛔ A HEADING MUST NOT BE LEFT AT THE FOOT OF A PAGE. Only house 1 can hit this — every
     later house opens its own sheet — but house 1 continues from the opening, so on a real
     n8n render (execution 30541) its "HOUSE 1 / yourself / …the Tower, a card of…" sat alone
     at the bottom of page 2 with the passage starting on page 3. Keep the heading with the
     text it heads, and keep a card and its caption together. */
  .hh { page-break-inside: avoid; break-inside: avoid;
        page-break-after: avoid;  break-after: avoid; }
  section figure { page-break-inside: avoid; break-inside: avoid; }
  section h2 { font-size: 16pt; line-height: 1.25; margin: 0 0 14pt; }
  section h3 { font-family: Georgia, serif; font-weight: bold; font-size: 12.5pt;
    line-height: 1.35; margin: -6pt 0 14pt; color: #5C5348; }
  section h2 .n { display: block; font-family: Helvetica, Arial, sans-serif; font-size: 8pt;
    letter-spacing: .18em; text-transform: uppercase; color: #8A6212; margin-bottom: 5pt; }
  section figure { float: left; width: 1.9in; margin: 2pt 20pt 10pt 0; }
  section figure img { width: 100%; display: block; border: 1pt solid #DDD6C6; }
  section figcaption { font-family: Helvetica, Arial, sans-serif; font-size: 7pt;
    letter-spacing: .13em; text-transform: uppercase; color: #8A8377; margin-top: 5pt;
    text-align: center; line-height: 1.4; }
  /* the plain meaning, under the card name — lower case and readable, not a label */
  section figcaption .pl { display: block; margin-top: 5pt; font-family: Georgia, serif;
    font-size: 8.5pt; letter-spacing: 0; text-transform: none; color: #6E6459;
    font-style: italic; line-height: 1.45; }
  p { margin: 0 0 9pt; orphans: 3; widows: 3; }
  .prose p.takeaway { font-weight: bold; line-height: 1.5; margin: 13pt 0;
    page-break-inside: avoid; break-inside: avoid; }

  /* ⭐ WAITE'S OWN WORDS. Set apart so it reads as a quoted authority and never as Evelyn —
     a buyer must not think she wrote "shews" and "the flos campi". */
  blockquote.waite { clear: both; margin: 4pt 0 16pt; padding: 12pt 16pt 10pt;
    background: #F7F4EC; border-left: 2pt solid #C9BFA8; page-break-inside: avoid; }
  blockquote.waite p { font-size: 10.5pt; line-height: 1.5; color: #413B32; margin: 0 0 6pt;
    font-style: italic; }
  blockquote.waite cite { display: block; font-family: Helvetica, Arial, sans-serif;
    font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; color: #A0987F;
    font-style: normal; }

  .close { clear: both; page-break-before: auto; margin-top: 18pt; padding-top: 18pt;
           border-top: 1pt solid #DED4BE; }
  .close p:first-child { font-size: 13pt; line-height: 1.5; }

  .gift { page-break-before: always; }
  .gift h2 { font-size: 15pt; margin: 22pt 0 10pt; }
  .gift h2:first-child { margin-top: 0; }
  .gift ul { margin: 0 0 9pt 16pt; padding: 0; }
  .gift li { margin: 0 0 5pt; }

  .process-note { font-size: 10.5pt; color: #514A40; border-bottom: 1pt solid #DED4BE; padding-bottom: 12pt; margin-bottom: 22pt; }
  .ledger-sheet { break-before: page; }
  .ledger-sheet h2 { font-size: 17pt; margin-top: 0; }
  .ledger-entry { display: flex; align-items: end; height: 25pt; gap: 12pt; font-size: 10.5pt; }
  .ledger-entry b { width: 55pt; font-weight: normal; }
  .ledger-entry span { flex: 1; border-bottom: .5pt solid #C9BFA8; height: 18pt; }
  .review-space { height: 78pt; background: repeating-linear-gradient(to bottom, transparent 0, transparent 25pt, #D9D0C0 25pt, #D9D0C0 25.5pt); }
  .colophon { page-break-inside: avoid; page-break-before: avoid; margin-top: 24pt;
              border-top: 1pt solid #DED4BE; padding-top: 12pt; }
  .colophon p { font-size: 9pt; line-height: 1.55; color: #7C776D; margin: 0 0 7pt; }
  .colophon .sig { font-family: Georgia, serif; font-size: 11pt; color: #2A2622; }
</style></head><body>
  <div class="cover">
    <img src="__COVER__" alt="">
    <p class="covertype">Laid for <b>${esc(j.first_name)}</b>
       &nbsp;&middot;&nbsp; ${DATE(j.paid_at)}</p>
  </div>
  <div class="inner">
    <div class="intake">
      <p class="k">Your twelve, as they were laid</p>
      <p class="lede">A house is a room of a life. The wheel has twelve of them, and one card was
      laid in each, bringing different parts of life into the same reading.</p>
      <p class="lede">The rooms come in <b>six pairs</b>, each one facing the room across the
      wheel from it: what you own faces what reaches you through other people, home faces your
      standing, romance faces your circle. Where a room below sends you across to another, that
      pairing is why.</p>
      ${hers.map((p) => `<div class="rm">
        <p class="line"><b>${esc(p.house)}</b>&nbsp; ${esc(p.house_name)}
          <span class="ax">&#8596; ${esc(AXPAIR[p.house])}</span>
          <span class="c">${esc(p.card_name)}${p.reversed ? ' &middot; reversed' : ''}</span></p>
        <p class="gl">${esc(BLURB[String(p.house)] || '')}</p></div>`).join('')}
      <p class="lede foot">The pair marker &#8596; points to the room across the wheel. Nothing
      to learn — it is there so a line that sends you to another room makes sense when it does.</p>
    </div>
    <p class="process-note">About this reading: the cards are selected for your order. The interpretation is written with machine assistance in Evelyn's voice.</p>
    ${body}
    <div class="gift">__GIFT__</div>
    ${[0, 1].map((half) => `<div class="ledger-sheet"><h2>Your observation pages · nights ${half * 14 + 1}–${half * 14 + 14}</h2>
      <p>One observation each night. Record what happened before deciding what it means.</p>
      ${Array.from({length: 14}, (_, i) => `<div class="ledger-entry"><b>Night ${half * 14 + i + 1}</b><span></span></div>`).join('')}
      <h3>${half === 0 ? 'Read-back on night 15' : 'Read-back on night 28'}</h3>
      <p>What repeated? What contradicted your first explanation? What remained ordinary?</p>
      <div class="review-space"></div></div>`).join('')}
    <div class="colophon">
      <p>These twelve were laid for you and for nobody else. The writing is assisted &mdash; I
      use a machine to help me put a reading into words. The draw is real and it is yours.</p>
      <p class="sig">Evelyn</p>
    </div>
  </div>
</body></html>`;

return [{ json: { ...j, html, pdfFileName: `${j.order_id}.pdf` } }];
"""

# ─── assembly ──────────────────────────────────────────────────────────────────
def wf_name(base):
    """⛔ THE PROVIDER AND THE MODEL GO IN THE NAME. n8n's sidebar is the only place you see
       which workflow you are about to Execute, and two identically-named ones is how the
       wrong model gets run and the result attributed to the other."""
    return base + (f" [OPENAI · {MODEL_WRITE}]" if PROVIDER == "openai" else "")


def build():
    html_js = (HTML_JS.replace("__S3__", S3).replace("__COVER__", COVER)
                      .replace("__BLURB__", json.dumps(
                          {str(h["number"]): h["blurb"] for h in SPEC["houses"]},
                          ensure_ascii=False, indent=2))
                      .replace("__WAITE__", json.dumps(
                          {k: v["waite"] for k, v in SPEC["card_lore"].items()
                           if k != "_note"}, ensure_ascii=False, indent=2))
                      .replace("__PLAIN__", json.dumps(
                          {k: v["plain"] for k, v in SPEC["card_lore"].items()
                           if k != "_note"}, ensure_ascii=False, indent=2))
                      .replace("__GIFT__", gift_html()))

    code = lambda name, pos, js, note: node(name, "n8n-nodes-base.code", 2, pos,
                                            {"jsCode": js}, {"notes": note})

    n1 = node("1 · Stripe webhook", "n8n-nodes-base.webhook", 2, [-420, 300],
              {"httpMethod": "POST", "path": "twin-flame-fulfilment",
               "responseMode": "onReceived", "options": {}})
    n2 = node("2 · Is this a paid 02 order?", "n8n-nodes-base.if", 2.2, [-200, 300], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "strict", "version": 2},
        "conditions": [
            {"id": "a", "leftValue": "={{ $json.body.type }}",
             "rightValue": "checkout.session.completed",
             "operator": {"type": "string", "operation": "equals"}},
            # ⛔ be_twin_flame is the STRIPE product key. `twin-flame` also exists (the offer
            #    key, on metadata.offer) and matching that one matches nothing.
            {"id": "b", "leftValue": "={{ $json.body.data.object.metadata.product }}",
             "rightValue": STRIPE_PRODUCT,
             "operator": {"type": "string", "operation": "equals"}},
            {"id": "c", "leftValue": "={{ $json.body.data.object.payment_status }}",
             "rightValue": "paid", "operator": {"type": "string", "operation": "equals"}},
        ], "combinator": "and"}, "options": {}})
    nX = node("Not 02 — ignore", "n8n-nodes-base.noOp", 1, [-40, 460], {})

    n3  = code("3 · Draw the twelve + build the brief", [-40, 200], DRAW_JS,
               "Makes the cut and fans out one item per house. Reuses the draw on a replay.")
    n4  = node("4 · Each house", "n8n-nodes-base.splitInBatches", 3, [140, 200],
               {"batchSize": 1, "options": {
                   # 🔴 MEASURED, n8n execution 30476 (2026-09-07): without this the regenerate
                   #    path is broken. n8n keeps a Loop Over Items node's state PER EXECUTION,
                   #    so when 8c sends a failed reading back to node 3 the loop does not start
                   #    over — node 3 ran twice, the loop ran 14 times instead of 24, and node 6
                   #    was handed a row with no `prose` and died on `r.prose.trim()`.
                   #    ⭐ The signal is the item itself: a fresh brief from node 3 has no
                   #    `prose`; an item looping back from 4c always does. So this resets at the
                   #    top of each pass and never mid-pass.
                   #    ⛔ 07 HAS THE SAME SHAPE AND THE SAME UNTESTED LOOP-BACK. Its own test
                   #    plan says nodes 9/9a/9b have "never executed once" — this is what runs
                   #    when they finally do.
                   "reset": "={{ $json.prose === undefined }}"}},
               {"notes": "⭐ Resets on a regeneration. See the build script — this was a real "
                         "break found by running it on n8n, not by the local harness."})
    n4a = code("4a · Compose the house prompt", [320, 300], HOUSE_JS,
               "One house, its job, its card, and everything already said.")
    n4b = claude("4b · Write the house", [500, 300],
        prose_body(MODEL_WRITE, "medium", 24000),
        "⭐ The voice + what the letter already said are ONE cached system block: identical on "
        "all twelve calls, so houses 2-12 should read it from cache. Anthropic: verify with "
        "usage.cache_read_input_tokens > 0 — a zero there means every house paid full price. "
        "OpenAI: caching is automatic on a shared prefix, so the system block must stay FIRST "
        "and byte-identical, which is why the joiner supplies its own copy rather than editing "
        "this one.")
    n4c = code("4c · Keep the prose", [680, 300], KEEP_PROSE_JS,
               "Turns a refusal or a thinking-ate-the-budget empty into a loud failure.")
    # Execution 30655: Terra omitted a required takeaway in house 7. Retry only this
    # house once, with the identical prompt. The second parser remains fail-closed.
    next(n for n in NODES if n['name'] == n4c)['onError'] = 'continueErrorOutput'
    n4r = code("4r · Retry a format failure once", [680, 520], r"""
const error = $input.first().json.error;
const message = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
if (!/TAKEAWAY/.test(message || '')) throw new Error(message || 'House validation failed');
return [{json: {...$('4a · Compose the house prompt').first().json}}];
""", "Retries a takeaway validation failure only. No prompt changes, no refusal retries.")
    n4s = claude("4s · Retry the house once", [880, 520],
        prose_body(MODEL_WRITE, "medium", 24000), "One bounded house retry; identical writer settings and prompt.")
    n4t = code("4t · Validate the retried house", [1080, 520], KEEP_PROSE_JS,
               "Same strict parser as 4c; a second failure stops the workflow.")
    n5  = node("5 · Collect the houses", "n8n-nodes-base.aggregate", 1, [320, 100],
               {"aggregate": "aggregateAllItemData", "options": {}})
    n6  = code("6 · Compose the joiner", [500, 100], JOIN_JS,
               "Twelve notes into one sitting. Owns the opening, the transitions and the close.")
    n6a = claude("6a · Join into one reading", [680, 100],
        prose_body(MODEL_WRITE, "high", 48000),
        "The one call that decides whether this reads as a letter or as twelve notes.")
    n6b = code("6b · Keep the reading", [860, 100], KEEP_READING_JS,
               "⛔ Throws on a truncated reading even when there IS text.")
    n7  = claude("7 · Grade it", [1040, 100], GRADE_BODY,
                 "⛔ No fallbacks here on purpose — 7a already fails OPEN and records why, so a "
                 "declined grade costs a log line, never her reading.")
    n7a = code("7a · Read the verdict", [1220, 100], VERDICT_JS,
               "Fails open, loudly. The reason lands in `why`, which the audit query reads.")
    n8  = node("8 · Passed?", "n8n-nodes-base.if", 2.2, [1400, 100], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "loose", "version": 2},
        "conditions": [{"id": "p", "leftValue": "={{ $json.verdict.pass }}", "rightValue": "",
                        "operator": {"type": "boolean", "operation": "true",
                                     "singleValue": True}}], "combinator": "and"}, "options": {}})
    n8a = node("8a · First failure?", "n8n-nodes-base.if", 2.2, [1400, 300], {
        "conditions": {"options": {"caseSensitive": True, "leftValue": "",
                                   "typeValidation": "loose", "version": 2},
        "conditions": [{"id": "r", "leftValue": "={{ $json.attempt }}", "rightValue": 2,
                        "operator": {"type": "number", "operation": "lt"}}],
        "combinator": "and"}, "options": {}})
    log_body = ("={{ JSON.stringify({ order_id: $json.order_id, attempt: $json.attempt, "
                "pass: $json.verdict.pass, failed: $json.verdict.failed, why: $json.verdict.why, "
                "reading: $json.reading, draw: $json.draw__EXTRA__ }) }}")
    n8b = ours("8b · Log the first failure", [1400, 460], "/api/be/02/grade-log",
               log_body.replace("__EXTRA__", ", regenerated: true"),
               "⛔ A DEAD END ON PURPOSE. 07 wired the first failure straight into the retry and "
               "recorded pass:true with no reason — the log was blind to exactly the case it "
               "exists for. This node logs, then loops.")
    n8c = code("8c · Go round again", [1220, 460], ROUND_AGAIN_JS,
               "⛔ Carries the draw back so the retry re-writes the SAME cards.")
    n9  = ours("9 · Log the verdict", [1580, 100], "/api/be/02/grade-log",
               log_body.replace("__EXTRA__", ""),
               "The draw is logged with the verdict — it is the only record of which cards she "
               "was actually sent.")
    n10 = code("10 · Build the HTML", [1760, 100], html_js,
               "⭐ Everything personal is in this node, and the card art is looked up by HOUSE "
               "NUMBER from the draw — never from what the model typed.")
    n11 = node("11 · PDFShift → PDF", "n8n-nodes-base.httpRequest", 4.2, [1940, 100], {
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
        "notes": "⚠ PDFShift fetches the card images itself. A slow or 403 fetch renders the "
                 "PDF WITH GAPS and no error."})
    n12 = node("12 · Upload to Supabase Storage", "n8n-nodes-base.httpRequest", 4.2, [2120, 100], {
        "method": "POST",
        "url": ("=" + SUPABASE_PROJ + "/storage/v1/object/" + SUPABASE_BUCKET +
                "/02/{{ $('10 · Build the HTML').first().json.order_id }}/"
                "{{ $('10 · Build the HTML').first().json.pdfFileName }}"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True, "headerParameters": {"parameters": [
            {"name": "Content-Type", "value": "application/pdf"},
            {"name": "x-upsert", "value": "true"}]},
        "sendBody": True, "contentType": "binaryData", "inputDataFieldName": "data",
        "options": {"timeout": 60000},
    }, {"credentials": {"httpHeaderAuth": SUPABASE_CRED}})
    n13 = node("13 · Hold to the 24h mark", "n8n-nodes-base.wait", 1.1, [2300, 100], {
        "resume": "specificTime",
        "dateTime": ("={{ DateTime.fromISO($('10 · Build the HTML').first().json.paid_at)"
                     ".plus({ hours: 24 }).toISO() }}")},
        {"notes": "⭐ THE WAIT SITS HERE, NOT AFTER THE SIGNING. The document is finished first, "
                  "so the link is minted at delivery instead of spending its first day in a "
                  "queue — and a failed grade has a full day in which a human can still stop "
                  "the send. ⚠ Counted from HER paid_at, so a webhook replayed six hours late "
                  "still delivers at the original +24."})
    n13a = node("13a · Get signed URL", "n8n-nodes-base.httpRequest", 4.2, [2480, 100], {
        "method": "POST",
        "url": ("=" + SUPABASE_PROJ + "/storage/v1/object/sign/" + SUPABASE_BUCKET +
                "/02/{{ $('10 · Build the HTML').first().json.order_id }}/"
                "{{ $('10 · Build the HTML').first().json.pdfFileName }}"),
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendHeaders": True,
        "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
        "sendBody": True, "specifyBody": "json",
        # 🔴 THIS NUMBER IS A COPY DECISION, NOT A SETTING. 02-T4 tells her "women come back to
        #    these months later". 604800 is 07's seven days and would make that sentence false.
        #    One year. ⚠ And it still expires — the honest fix for a document she is promised
        #    as a keepsake is an unguessable permanent URL. Decide it once, and put the same
        #    number in the support answer for "my link is dead".
        "jsonBody": '{ "expiresIn": 31536000 }',
        "options": {"timeout": 30000},
    }, {"credentials": {"httpHeaderAuth": SUPABASE_CRED}})
    n14 = node("14 · Find her on AWeber", "n8n-nodes-base.httpRequest", 4.2, [2660, 100], {
        "url": (f"=https://api.aweber.com/1.0/accounts/{AWEBER_ACCOUNT}/lists/{AWEBER_LIST}"
                "/subscribers?ws.op=find&email="
                "{{ encodeURIComponent($('10 · Build the HTML').first().json.email) }}"),
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": AWEBER_CRED},
        "notes": "⛔ FIND, NEVER CREATE — the server already subscribed her at payment and "
                 "creating her again can reset her fields. 🔴 If that write failed she is not "
                 "here, entries[0] is undefined and 14a dies. Decide what should happen; it "
                 "should not be a silent red execution."})
    n14a = node("14a · Tag + reading_url (the send)", "n8n-nodes-base.httpRequest", 4.2,
                [2840, 100], {
        "method": "PATCH", "url": "={{ $json.entries[0].self_link }}",
        "authentication": "genericCredentialType", "genericAuthType": "oAuth2Api",
        "sendBody": True, "bodyParameters": {"parameters": [
            # 🔴 custom_fields is a WHOLE-STATE write. Sending { reading_url } alone clears
            #    stripe_order_id and offer — that is how a soulmate buyer lost hers 11 seconds
            #    after paying (server/lib/aweber.ts). Spread what the find returned, then
            #    re-send all three.
            {"name": "custom_fields", "value":
             "={{ { ...($json.entries[0].custom_fields || {}), "
             "stripe_order_id: $('10 · Build the HTML').first().json.order_id, "
             f"offer: '{OFFER_KEY}', "
             # ⛔ Supabase returns signedURL as a RELATIVE path. Unprefixed, the delivery email
             #    carries a link that goes nowhere — 07 documents this trap and does not fix it.
             "reading_url: '" + SUPABASE_PROJ + "/storage/v1' + "
             "$('13a · Get signed URL').first().json.signedURL } }}"},
            {"name": "tags", "value": "={{ { add: [\"" + DELIVERED_TAG + "\"] } }}"},
        ]}, "options": {"timeout": 30000},
    }, {"credentials": {"oAuth2Api": AWEBER_CRED},
        "notes": "⭐ THE PATCH IS THE SEND — the tag fires the AWeber campaign. Nothing here "
                 "sends an email itself."})
    n15 = ours("15 · Mark delivered", [3020, 100], "/api/be/02/delivered",
        ("={{ JSON.stringify({ order_id: $('10 · Build the HTML').first().json.order_id, "
         "reading_url: '" + SUPABASE_PROJ + "/storage/v1' + "
         "$('13a · Get signed URL').first().json.signedURL, "
         "reading_body: $('10 · Build the HTML').first().json.reading }) }}"),
        "⛔ PARKED DECISION. This node, 9 and 8b are the only calls to our own API, and whether "
        "n8n should be doing the AWeber write at all (14/14a) instead of one endpoint on our "
        "server is undecided — markBackendReadingDelivered() already exists and has no caller. "
        "See docs/02/02-n8n-test-plan.md.")

    for a, b in [(n1, n2), (n3, n4), (n4a, n4b), (n4b, n4c), (n4c, n4), (n5, n6), (n6, n6a),
                 (n6a, n6b), (n6b, n7), (n7, n7a), (n7a, n8), (n8b, n8c), (n8c, n3),
                 (n9, n10), (n10, n11), (n11, n12), (n12, n13), (n13, n13a), (n13a, n14),
                 (n14, n14a), (n14a, n15)]:
        link(a, b)
    link(n2, n3); link(n2, nX, 1)
    link(n4, n5); link(n4, n4a, 1)          # 0 = done, 1 = loop
    link(n4c, n4r, 1); link(n4r, n4s); link(n4s, n4t); link(n4t, n4)
    link(n8, n9); link(n8, n8a, 1)
    link(n8a, n8b); link(n8a, n9, 1)        # second failure logs and ships anyway

    # ⛔ THE PROVIDER GOES IN THE NAME. Two workflows with the same name in one n8n sidebar is
    #    how the wrong one gets executed, edited or activated — and the whole point of this
    #    build is that they run side by side.
    return {"name": wf_name("02 · Twin Flame Tarot — fulfilment"),
            "nodes": NODES, "connections": LINKS,
            "active": False,
            "settings": {"executionOrder": "v1", "saveManualExecutions": True,
                         "saveDataErrorExecution": "all", "saveDataSuccessExecution": "all"},
            "pinData": {}, "tags": []}


# ⛔ THE TEST BUILD EXISTS SO A SMOKE RUN CANNOT TOUCH A BUYER. It keeps everything that
#    makes the artefact — the draw, twelve calls, the joiner, the grade, the HTML, PDFShift,
#    the upload and the signed URL — and REMOVES the delivery half outright rather than
#    disabling it, because a disabled node is one careless click from being enabled.
#    It also disables the two grade-log POSTs, which point at an endpoint that does not exist.
# 🔴 MEASURED ON ezyabsorb.app.n8n.cloud, 2026-09-07: activating a workflow through the public
#    REST API sets active=true in the database but DOES NOT REGISTER ITS PRODUCTION WEBHOOK —
#    the URL keeps answering 404 "not registered". Proved with a two-node control workflow
#    (webhook → noOp) pushed and activated the same way, which 404s identically; a second
#    control with a SCHEDULE trigger fired within 30 seconds. So webhook workflows can only be
#    armed from the n8n UI, while schedule-triggered ones can be driven entirely from the API.
#    ⛔ This applies to 07 as well — its plan's "one real order through n8n" cannot be done
#    from a script against the webhook.
# ⭐ So the test drive swaps the trigger: a one-minute schedule plus an inline fixture, feeding
#    the very same node 2 onwards. Everything under test is unchanged.
def make_testdrive(wf):
    wf = make_test(wf)
    wf["name"] = wf_name("02 · Twin Flame — TEST DRIVE (schedule-fired fixture, never delivers"
                         + (" · v2 buyer" if ARC == "v2" else "") + ")")
    wf["nodes"] = [n for n in wf["nodes"] if n["name"] != "1 · Stripe webhook"]
    wf["connections"].pop("1 · Stripe webhook", None)
    # 🔴 SUPABASE IS THE KNOWN BLOCKER — node 12 dies with `Bad request` because the project and
    #    bucket behind its credential are still unknown, and every test drive so far has died
    #    there after paying for fourteen model calls. So by default the test drive DISABLES 12
    #    and 13a (a disabled n8n node passes its input straight through) and the run ends GREEN
    #    on the PDF at node 11. Read the result with scripts/read-02-run.mjs <executionId>, then
    #    render it with make-02-pdf.mjs --from. Pass --storage to keep 12/13a live once the
    #    bucket exists.
    if "--storage" not in sys.argv:
        for n in wf["nodes"]:
            if n["name"].startswith(("12 ·", "13a ·")):
                n["disabled"] = True
    # ⭐ --arc v2 drives the SECOND letter's buyer: the fixture carries c=23 (inside 02-E3's CTA
    #    range) under its own order id, so the two arcs never share a seed or a workflow name.
    sess = json.loads(json.dumps(TESTDRIVE_SESSION))
    if ARC == "v2":
        sess["data"]["object"]["id"] = "cs_test_n8n_testdrive_02_v2"
        sess["data"]["object"]["metadata"]["c"] = "23"
    if "--order" in sys.argv:
        sess["data"]["object"]["id"] = sys.argv[sys.argv.index("--order") + 1]
    fixture = json.dumps(sess, ensure_ascii=False, indent=2)
    wf["nodes"] += [
        # ⭐ TWO DOORS INTO THE SAME FIXTURE, on purpose.
        #    The MANUAL trigger is for a human: open the workflow, press Execute, it runs ONCE,
        #    immediately, and nothing has to be activated. That is the safe way to test by hand.
        #    ⛔ The SCHEDULE trigger exists only because this instance will not register a
        #    production webhook on an API activation, so a script has no other way to start it.
        #    It fires every minute WHILE ACTIVE — never leave it armed.
        {"parameters": {}, "id": "T0m", "name": "T0 · press Execute (manual test)",
         "type": "n8n-nodes-base.manualTrigger", "typeVersion": 1, "position": [-620, 180]},
        {"parameters": {"rule": {"interval": [{"field": "cronExpression", "expression": "0 * * * * *"}]}},
         "id": "T0", "name": "T0 · tick (test drive only)",
         "type": "n8n-nodes-base.scheduleTrigger", "typeVersion": 1.2, "position": [-620, 420]},
        {"parameters": {"jsCode": "// ⛔ TEST DRIVE ONLY — the Stripe session a real webhook would carry.\n"
                                  "return [{ json: { body: " + fixture + " } }];"},
         "id": "T1", "name": "T1 · the fixture session",
         "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [-420, 300]},
    ]
    wf["connections"]["T0 · press Execute (manual test)"] = {
        "main": [[{"node": "T1 · the fixture session", "type": "main", "index": 0}]]}
    wf["connections"]["T0 · tick (test drive only)"] = {
        "main": [[{"node": "T1 · the fixture session", "type": "main", "index": 0}]]}
    wf["connections"]["T1 · the fixture session"] = {
        "main": [[{"node": "2 · Is this a paid 02 order?", "type": "main", "index": 0}]]}
    if "--manual-only" in sys.argv:
        schedule_name = "T0 · tick (test drive only)"
        wf["nodes"] = [n for n in wf["nodes"] if n["name"] != schedule_name]
        wf["connections"].pop(schedule_name, None)
        wf["name"] = wf_name(f"02 · Twin Flame — MANUAL TEST · 6,400 words · {ARC} · no delivery")
        fixture_node = next(n for n in wf["nodes"] if n["name"] == "T1 · the fixture session")
        fixture_node.update({"notesInFlow": True, "notes":
            "Click Execute workflow; no activation needed. Edit this test fixture's firstName, customer name, order id and c for another test. "
            "Same order id reuses the seeded draw. c=23 is v2; c=3 is v1. PDF is at node 11. "
            "Storage/signing are disabled; no customer delivery nodes. The 7.0 score belongs to an edited PDF, not a fresh run of this build."})
    return wf


# The same order the local harness runs, so the two artefacts are comparable line for line.
TESTDRIVE_SESSION = {
    "type": "checkout.session.completed",
    "data": {"object": {
        "id": "cs_test_n8n_testdrive_02", "payment_status": "paid",
        "created": 1789162800,
        "customer_details": {"email": "dryrun@theseerwithin.com", "name": "Sarah J Mitchell"},
        "metadata": {"app": "the-seer-within", "product": "be_twin_flame", "offer": "twin-flame",
                     "treatment": "page", "readingCents": "3500", "bump": "1",
                     "bumpProduct": "astro_force", "firstName": "Sarah", "c": "1"}}},
}


def make_test(wf):
    drop = {"13 · Hold to the 24h mark", "14 · Find her on AWeber",
            "14a · Tag + reading_url (the send)", "15 · Mark delivered"}
    wf["name"] = wf_name("02 · Twin Flame — TEST DRIVE (stops at the signed URL, never delivers)")
    wf["nodes"] = [n for n in wf["nodes"] if n["name"] not in drop]
    for n in wf["nodes"]:
        if n["name"] == "1 · Stripe webhook":
            # ⛔ Its own path. It must be impossible for a real Stripe event to land here.
            n["parameters"]["path"] = "twin-flame-fulfilment-TEST"
        if n["name"].startswith(("8b ·", "9 ·")):
            n["disabled"] = True          # a disabled n8n node passes its input straight through
    wf["connections"] = {src: outs for src, outs in wf["connections"].items() if src not in drop}
    for outs in wf["connections"].values():
        for br in outs["main"]:
            br[:] = [c for c in br if c["node"] not in drop]
    # 12 · Upload now runs to the end of the flow; 13a signs what it uploaded.
    wf["connections"]["12 · Upload to Supabase Storage"] = {
        "main": [[{"node": "13a · Get signed URL", "type": "main", "index": 0}]]}
    return wf


def make_screen(wf):
    """Three frozen real writer inputs; reuse the actual provider node, no delivery or join."""
    if "--testdrive" not in sys.argv or "--order" not in sys.argv:
        raise SystemExit("--screen requires --testdrive and an explicit --order")
    source = sys.argv[sys.argv.index("--screen") + 1]
    order = sys.argv[sys.argv.index("--order") + 1]
    rows = json.load(open(source, encoding="utf-8"))
    if len(rows) != 3 or {r["position"]["house"] for r in rows} != {3, 5, 12}:
        raise SystemExit("screen requires exactly houses 3, 5 and 12")
    if any(r["order_id"] != order for r in rows):
        raise SystemExit("screen inputs do not match the explicit order")
    keep = {"T0 · press Execute (manual test)", "T0 · tick (test drive only)", "4b · Write the house"}
    wf["nodes"] = [n for n in wf["nodes"] if n["name"] in keep]
    fixture_name = "S1 · Frozen writer inputs"
    wf["nodes"].append({"name": fixture_name, "id": "S1", "type": "n8n-nodes-base.code",
        "typeVersion": 2, "position": [0, 300], "parameters": {"jsCode":
        "return " + json.dumps(rows, ensure_ascii=False) + ".map(json => ({ json }));"}})
    wf["connections"] = {name: {"main": [[{"node": fixture_name, "type": "main", "index": 0}]]}
        for name in keep if name.startswith("T0")}
    wf["connections"][fixture_name] = {"main": [[{"node": "4b · Write the house", "type": "main", "index": 0}]]}
    wf["name"] = wf_name("02 · Three-house frozen-prompt SCREEN (never delivers)")
    return wf


if __name__ == "__main__":
    wf = build()
    if "--testdrive" in sys.argv:
        wf = make_testdrive(wf)
    elif "--test" in sys.argv:
        wf = make_test(wf)
    if "--screen" in sys.argv:
        wf = make_screen(wf)
    # ⛔ THE TWO PROVIDERS WRITE TO DIFFERENT FILES. They must both exist at once or there is
    #    nothing to compare, and an accidental overwrite would silently push GPT over the live
    #    Anthropic workflow — or the reverse.
    out = os.path.join(_HERE, "../docs/02/02-fulfilment%s%s%s.n8n.json"
                       % ("-MANUAL" if "--manual-only" in sys.argv else "-TESTDRIVE" if "--testdrive" in sys.argv else
                          "-TEST" if "--test" in sys.argv else "",
                          "-V2" if ("--testdrive" in sys.argv and ARC == "v2") else "",
                          "-OPENAI" if PROVIDER == "openai" else ""))
    if "--screen" in sys.argv:
        out = os.path.join(_HERE, "../docs/02/02-fulfilment-SCREEN" + ("-OPENAI" if PROVIDER == "openai" else "") + ".n8n.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(wf, f, ensure_ascii=False, indent=2)
    print(f"\n  02 · Twin Flame Tarot — fulfilment")
    print(f"    {len(wf['nodes'])} nodes → {os.path.relpath(out, os.path.join(_HERE, '../../../../../..'))}")
    print(f"    draw: {len(SPEC['houses'])} NEW cards of {len(POOL_LIST)} · nothing fixed · "
          f"{len(SPEC['draw']['excluded'])} spent by the letters · "
          f"rooms that owe an answer: {', '.join(sorted(OBLIG, key=int))}")
    print(f"    arcs: v1 {_arcs_raw['v1']['shape']} · v2 {_arcs_raw['v2']['shape']} · "
          f"from Stripe metadata c (v2 = {ARCS['c_ranges']['v2'][0]}..{ARCS['c_ranges']['v2'][1]})"
          + (f" · this test drive: {ARC} buyer" if "--testdrive" in sys.argv else ""))
    print(f"    {PROVIDER}: {MODEL_WRITE} writes, {MODEL_GRADE} grades")
