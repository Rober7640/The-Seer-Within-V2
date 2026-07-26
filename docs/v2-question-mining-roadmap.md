# V2 (Evelyn Cross) Question Mining — Planning / Brainstorm

**Status: discovery stage, not a finished test plan.** This is the V2 analog to
`docs/fb-ad-question-testing-roadmap.md` (V1), for a different eventual purpose: seeding
future FB ad angles for V2 personas, which don't have their own acquisition funnels yet
(V2 currently only receives account-based traffic via `/login`, not cold ads). Capturing
findings as they're mined rather than waiting for a complete pass.

## Why V2 needed a different approach than V1

V1's `bucket`/`sub_bucket`/`concern` fields on `conversations` directly classify *what
the person is asking about*. V2's analogous-looking fields don't work the same way:
`chat_sessions.last_bucket` / `conversation_states.current_bucket` classify *conversation
phase* (opening → exploration → reading → interpretation → guidance → closing), not
topic. `conversation_states.detected_intents` is keyword-pattern-matched with low
confidence, mostly `"unknown"` — not a reliable theme signal.

**The actual usable signal:** `user_memory` where `memory_type='long_term_context'`,
categorized `love`/`money`/`purpose`/`someone` (matching V1's top-level bucket names,
coincidentally or not). For "initial reading" memories specifically, the summary follows
a parseable structured format: `"From initial reading: Area of focus: <category>. Main
concern: <text>. Location: <city>"` — the `Main concern:` field is essentially V1's
`concern` field reappearing in V2's own onboarding flow. This is what's being mined.

**Success metric adaptation:** V1 has a clean `purchased` boolean per conversation. V2
monetization is ongoing (credit purchases), not a single terminal event. Proxy used
here: whether the memory's `user_id` appears in `credit_purchases` with
`status='completed'` (a "has ever paid" flag, coarser than V1's per-concern signal, but
the closest available analog). All samples below are pre-filtered to paying users only.

**Scoping:** only Evelyn Cross has enough volume to mine reliably. Marcus Stone, Nova
Sharma, Aiden Powers, Maren Soleil, and Luna Voss combined have far too few sessions
(57-549 each vs. Evelyn's 16,730) for this to work yet. Revisit per-persona mining once
the other personas accumulate more volume.

## Category status

| Category | Total (Evelyn) | Paying-user rows | Status |
|---|---|---|---|
| Love | 45,197 | 476 | Confirmed — same 6-sub-group taxonomy as V1 transfers directly |
| Someone | 4,714 | 140 (all read) | Romantic slice → same 6 sub-groups. Non-romantic slice → new sub-groups below, done |
| Money | 11,194 | 125 (all read) | New taxonomy, 5 sub-groups, done |
| Purpose | 7,670 | 99 | **Not started** |

---

## Love

Confirmed via a 100-quote read (paying Evelyn users) that the same 6 sub-groups from the
V1 skill (Trust/Honesty, Feelings/Commitment, Reunion/Return, Healing/Moving-on,
Soulmate/Destiny, Loneliness/Timing) show up verbatim in V2's love-category concerns —
same phrasing, same themes ("is my man true to me," "does my husband plan on getting
back with me," "was he my soulmate," "want to meet a new boyfriend"). No new headline
development done yet for V2 specifically — the V1 headline sets are a reasonable
starting point given the taxonomy match, but haven't been re-derived from V2's own VOC.

**Bereavement recurs here too** (V1's cross-cutting finding, independently confirmed a
4th time): "My husband passed away 2 1/2 years ago," "Im a widow," "My partner died
suddenly and violently in 2020" — present throughout the paying-user love sample.

## Someone — non-romantic slice (new territory, not in V1 at all)

V2's "someone" category is broader than V1's — it's "concern about any important
person," not just a romantic partner. Read all 140 paying-user rows (full population,
not a sample, since the pool is small). Romantic-partner content within it maps to the
same 6 sub-groups as Love. The non-romantic content clusters into:

**Family estrangement/conflict** (~8 instances: adult-child coldness, sibling conflict,
parental-alienation grief, abusive-parent backstory)
- "Why has my daughter grown cold toward me?" — *direct*
- "Will my child and I ever be close again?" — *hope-framed*
- "Why do I feel shut out by my own family?" — *broader tension variant*

**Concern about a loved one's wellbeing** (~6 instances: worry over depression,
addiction, health issues, a child's exam results, someone's legal/custody trouble)
- "Is he going to be okay?" — *direct*
- "What's really going on with someone I love?" — *intensified*
- "Why can't I stop worrying about him?" — *self-frame tension variant*

**Explicitly NOT turned into headlines, with reasons:**
- Grief for a deceased child or parent (~3 instances) — too acute and too small a
  sample to responsibly build ad copy from; more severe than the spousal-bereavement
  flag already carried over from V1.
- Stalking/harassment (1 explicit case) — targeting someone in an active safety crisis
  with acquisition ads isn't appropriate regardless of conversion potential.

## Money (entirely new domain, no V1 precedent)

Read all 125 paying-user rows (full population). Five clusters, matching the scale of
the largest V1 sub-groups:

**Financial struggle (general)**
- "Why does money keep slipping through my fingers?" — *near-verbatim VOC match*
- "Why do I work so hard and still have nothing to show for it?"
- "Is my financial struggle ever going to end?"

**Career/job change**
- "Will I ever find the right job?" — *near-verbatim ("the one good job I am deserving of")*
- "Am I on the wrong career path?"
- "Should I stay in this job, or is something better coming?"

**Windfall/abundance seeking** (heavily spiritually-framed — very on-brand for a
psychic-reading product; people are literally asking a psychic when money is coming)
- "When is money finally going to come to me?"
- "Is real financial abundance actually coming for me?"
- "Is a windfall coming, or am I just hoping?"

**Blocked abundance** (a self-sabotage/pattern theme, distinct from generic struggle)
- "What's blocking my financial abundance?" — *near-verbatim*
- "Why do I keep sabotaging my own success?" — *matches "work hard, make money, then bust, lose it all"*
- "Is something invisible holding my money back?" — *matches recurring "karmic debt"/"shadow entity" language*

**Debt relief**
- "Will I ever get out of debt?"
- "Is this debt ever going to stop weighing on me?"
- "Will I find a way out of this debt, or is it hopeless?"

15 headlines.

**⚠ Compliance flag — more serious than anything in the V1 build.** Meta's ad policy
(fetched directly, not assumed) explicitly lists **financial status** as a protected
personal attribute, alongside race, health, and religion — not inferred, literally
enumerated. Every headline above implies something about the viewer's financial
situation. Self-frame "I" phrasing (already used throughout) helps the same way it did
for V1's trust/honesty "cheating" concern, but this category needs real policy review
before any testing — categorically higher risk than the wording-level fix that worked
for V1.

## Purpose — not started

7,670 total / 99 paying-user rows available. Next up when resumed.

## Open items

- Purpose category: not yet mined.
- Love/Someone-romantic: taxonomy confirmed but headlines not yet re-derived from V2's
  own VOC (currently just inheriting V1's headline set on the assumption it transfers —
  untested assumption).
- No mechanism/delivery decision made — V2 personas have no ad funnel to route into yet;
  this is pre-work for a channel that doesn't exist.
- Other 5 personas (Marcus, Nova, Aiden, Maren, Luna) revisit once volume grows.
