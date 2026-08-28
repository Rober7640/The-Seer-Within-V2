# 00f — PRODUCT DESIGN

Output of a 10-lens brainstorm (2026-08-03) on the framework's two open questions: what a
delivered hex actually is, and what 04's paid reading adds. Lenses: 03 product · 05 product ·
04 product · refunds · repeat-purchase · competitor benchmark · proof-of-work · intake
personalisation · format/medium · compliance.

Companions: [00e-FRAMEWORK](./00e-FRAMEWORK-BEs.md) · [00c-ASSETS](./00c-ASSETS-BEs.md) ·
[00b-BUILD](./00b-BUILD-BEs.md)

---

## 1. The finding that challenges a locked decision

**Four independent lenses converged on the same thing: a product containing zero facts about
the buyer is the documented failure mode of this category.**

The competitor benchmark found the bar we'd be shipping under:

- **AstroChartus sells an 8,000-word AI-written PDF for $37, delivered in ~3 minutes**, openly
  labelled AI ([verified](https://www.astrochartus.com/reports)). Length is not differentiation.
- Buyer complaints, verbatim, from three separate review corpora: *"generic and not detailed. I
  felt that it **could have applied to anyone**"* · *"**written in the kind of tone ChatGPT might
  use**… not tailored to my request"* · *"filled with **fluffy, generic wording and long poetic
  metaphors that sounded nice but meant absolutely nothing**"*.
- Praise is always about unknowable specifics: *"She picks up on things that there was no way she
  could have ever known."*
- **Speed does not rescue a generic reading** — the top complaint quote opens *"Her turnaround
  time was quick, but…"*

The refund lens reached the same place from law rather than reviews: mass-produced letters that
repeatedly address the recipient by first name while claiming a personal vision is the exact
construction prosecuted in the **Maria Duval** case — letters *"purporting to be individualized,
personal communications"*, $175M, 1.3M victims, **10 years' prison**
([DOJ](https://www.justice.gov/opa/pr/canadian-man-sentenced-operating-175m-psychic-mass-mailing-fraud-scheme)).
02's product is `%FIRSTNAME%` ×24 and zero buyer facts.

### What this does and doesn't change

**It does not overturn "static for MVP."** The 3,900-word body stays static and written once.

**It does change the definition of static.** The minimum viable product is:

```
  STATIC BODY  +  3 ECHO SLOTS  +  1 SELECTED VARIANT PARAGRAPH
```

Three lenses independently landed on the same ceiling — **three echo points, exactly one of them
verbatim.** One quote + one paraphrase + the name reads as memory. Two verbatim quotes reads as
a form letter with slots.

**This is not the n8n generator.** It's a SQL lookup against data we already hold plus a template
merge. The generator (`S25`) remains Phase 2. What moves into Phase 1 is the *slots*.

**Our actual moat**, per the benchmark: we hold the buyer's own words from the V1 funnel —
`concern`, `personName`, `bucket`, `deeperResponse`, `emotionalResponse`. **No $35 competitor
has this.** Quoting one specific thing they told Evelyn manufactures the "no way she could have
known" reaction that every positive review is made of.

---

## 2. Convergent rules — adopt for all four products

Where three or more lenses agreed independently. Highest confidence in the whole exercise.

| Rule | Why | Lenses |
|---|---|---|
| **≥3 buyer-specific callbacks, max 1 verbatim** | The difference between a reading and a mailing list | refunds · intake · competitor · 05 |
| **No calendar deadlines. Behaviour triggers only** | A date converts an unfalsifiable service into a falsifiable claim with a refund date attached | refunds · proof-of-work · 04 |
| **No outcome claims about a third party** | The single most exposed sentence class in the deck | compliance · 05 · refunds |
| **A dated work record** — what was done, when, what was observed | Proof of labour; also the dispute exhibit processors ask for | proof-of-work · refunds · competitor |
| **Report a difficulty that was overcome** | Clean successes read as script. Free, and does four jobs at once | proof-of-work · 05 · 03 |
| **Restraint as authority** — refuse the biggest version of the promise | "I asked for no harm to her body" is what makes the rest credible | 03 · 05 · compliance |
| **Give them something to do** — a dated practice, weeks long | Value felt before results; a buyer performing a nightly rite doesn't refund | 03 · 04 · 05 · repeat |
| **Every product names its own limit** | A stated boundary out-sells a pitch, and it's the bridge to the next offer | repeat · 04 |
| **Never let the SLA pass silently** | "Product not received" is the one dispute code you reliably lose | refunds · proof-of-work |

---

## 3. Per-offer product briefs

### 02 Twin Flame Tarot — the 12-card Zodiac Spread

Transcribe and recast, **with three corrections**:

1. **The free horoscope must be rewritten, not transcribed.** Its gambling instructions
   (*"play two familiar games and two new ones"*, *"to win the two mentioned sums"*) were
   independently flagged by two lenses as the prosecuted core of the Duval pattern and unusable
   on our list. Replace with a **28-day attention ledger**: weeks 1–2 note who reappears, week 3
   rest, week 4 note who went quiet. Same retention function, and it manufactures 03's wrongdoer.
2. **Fix the decay in move (d).** Correction to `00e`: the third-party warning is in *six of
   twelve* cards, and is **absent from the final three** (Judgment, High Priestess, Death) — the
   pre-sell dies exactly where recall is strongest. Rebuild the last three to *narrow*: from
   plural strangers to one person, so 03's "someone has wronged you" is a callback, not a claim.
3. **Add the echo slots** — one verbatim quote from their V1 `concern`, one paraphrase using
   `emotionalResponse`, one name-only reference late.

**Assets that got cheaper:** all 12 card images already exist in `docs/aweber/tarot-images/`,
and **7 are already live on S3**. The missing 5 (`the-magician`, `the-high-priestess`,
`the-chariot`, `justice`, `the-devil`) are one command each:
`node docs/aweber/evelyn-tarot-emails/host-card.cjs <slug>`. **`02-P2` is ~10 minutes, not a project.**

### 03 Judgement Day — "The Record of Judgement"

**Reframed: from justice-on-them to closure-for-you.** The ledger is closed; the debt moves off
the buyer. Same payoff, no claim about a real person.

The ritual-report hypothesis was **half right**. A pure record of past work is *falsifiable* —
three days later they hold a receipt and no result, and day four is a refund. So: report **plus**
a forward-looking conditional ledger.

```
  1  It is done.                     first sentence answers the only question they have
  2  The Petition                    their intake read back — highest satisfaction beat, near-free
  3  The Working                     three nights, dated, altar contents, concrete nouns only
  4  Inoculation #1                  the spirits do not answer as you expect
  5  Three Verdicts                  Legba opens · Kalfu turns · Baron Samedi seals
                                     (three spirits = the count has a reason, per 00e §6b)
  6  The Ledger of Signs             days 1-9 private · 10-30 visible · by the third moon
  7  Your part — the Sealing         three duties, chief among them silence
  8  The Returning Current           struck energy returns; temporary seal → pre-sells U1
  9  Free gift: Nine Nights of Water dated nine-night practice
 10  Inoculations #2 and #3
 11  Sign-off + "do not write to ask if it worked; the ledger will tell you"
```

**Testimonials must be replaced, not gender-swapped.** *"Her deceitful ways were EXPOSED… she was
exiled in shame"* promises reputational harm to a real person and hits Stripe's UDAAP entry for
deceptive testimonials. Rewrite as *buyer-change* precedents: what shifted for Marta, never what
happened to her rival.

### 04 Tea Reading — "The Turn"

**The paid product adds POSITION, not symbols.** Tasseography is read by zones: the handle is
the querent, near the handle means soon, opposite means a stranger, rim is days, base is what's
buried. **Position is timing.**

The free letter read what the leaves *were*. Evelyn *"had not yet turned the cup."* Turning it
converts the **same seven symbols** into a dated 21-day sequence, where each leaf's physical
shape dictates the *form* of what she says that day. Every tactic is derived from a leaf
property — never prescribed as advice. That resolves the mystical-vs-dating-coach tension.

Key devices:
- **Self-diagnosis replaces personalisation.** Three named cup patterns — *The Turned Handle*
  (replies, but flat) · *The Divided Rim* (hot and cold) · *The Sunken Leaf* (silence). She
  picks. 04 receives no reply, so this buys precision with zero data.
- **Relative days, never calendar dates** — "the first evening after you read this."
- **Banned vocabulary:** the free letter's own closing advice (*"foster open communication, seek
  guidance, embrace growth"*). Restating it is the fastest refund in the deck.
- 3 patterns × 3 script variants = 9 visible paths, so buyers comparing screenshots don't match.

### 05 — rename required

**"Hex Her" as a product name is indefensible on its face**, and its current core promise —
*"Her feelings towards the man you choose will change. And she will NOT pursue him anymore"* —
is the one sentence in the deck flagged as unshippable: a stated outcome about a named,
non-consenting, identifiable person.

**The fix preserves the offer, and two lenses reached it independently: the object is the
cord, not the woman.** Cut at the buyer's end. Sold on what it frees in *her*. The rival appears
only as an unnamed third presence. Working titles: *Cut the Cord* · *Sever*.

The governing test for every line: **write it as if she will read it** — because buyers forward
things.

```
  1  Personal top-block            the only bespoke part; from their reply
  2  The hour it began             receipt of intake; work started, not scheduled
  3  What I did not do             ethical frame delivered as craft superiority, early
  4  The naming and the release    the name anchored the thread, then was released
  5  The Four Watches              Dusk · Midnight · Third Watch · Dawn — the proof-of-work
  6  What was severed              where it attached (his attention, not his heart)
  7  What returns to you           affirmative payoff
  8  The Nine Nights               dated sealing practice
  9  What to expect + inoculations
 10  The residual                  one thing the sever couldn't reach → next offer
```

**The single best refund-prevention line in either hex product** — the flare inoculation:

> In the first two or three days you may see her push harder, not softer. Do not read it as
> failure. A thread that has been cut still swings once before it falls.

---

## 4. The deck as a chain

Each product must close on **a named limit of its own mechanic** — that limit is the next offer.

- **02→03** — the final three card entries narrow from plural strangers to one person.
- **03→04** — the hex report states its blind spot: *"Baron Samedi settles debts. He does not
  mend hearts. When the interference falls away he will come back confused — and in those first
  days the wrong word from you undoes what I have done."*
- **04→05** — the tea reading moves the rival from possibility to proximity, then names its
  limit: *"The leaf sits at the rim, and the rim means near. I can tell you her shape and what
  to say. What I cannot do with leaves is make her stop."*

**The hardest transition is hex→tea** (03→04), because she's just spent on the enemy and he still
isn't calling. The lever is a register shift: *"the altar work is out of your hands now; what you
say to him is not."* Altar → kitchen proves the persona isn't only a hex vendor. Also: after a
PWYW donation, 04 restarts at $35 — **never two rising asks in a row.**

**Loop, don't repeat.** Cap the aggression at 05. A retention offer (*The Sealing* — keeping her
gone) is the only naturally recurring frame in the material, and the brand is literally a *Watch*.
Never re-cast after a failed hex; failure-billing is the documented scam pattern. Every "reply and
tell me" should terminate in the v2 live chat — that's the unbounded backend.

---

## 5. Fulfilment: the MVP path

**Five fields, ~3 minutes per order, no generator.** A queue joining `be_replies` to `be_orders`,
pre-filled from Supabase so the operator edits rather than types:

| Field | Source |
|---|---|
| Target's first name | reply |
| Relationship type (6-option dropdown) | operator classifies in 2s — selects a whole pre-written paragraph |
| The offence, ≤12 words verbatim | reply |
| One emotion word (fixed picker of 8) | reply or `emotionalResponse` |
| Status flag: OK / EMPTY / UNUSABLE / **ALARM** | operator |

> "Do not buy an LLM to run a switch statement."

**Acknowledgement fires on intake-save, not on the inbound webhook** — bounces and OOO hit that
address. Hold to +2h; instant reads as a robot.

**No reply ever received → ship the no-name variant anyway.** A paid product must never fail to arrive.

### Alarming intake — decide before launch, all three block the send

| Tier | Action |
|---|---|
| **Buyer self-harm** | Halt. Plain human message with crisis resources. Proactive refund. Suppress from the entire deck. Never deliver a hex to someone in crisis |
| **Request for physical harm / death** | Refuse, refund, permanent 03/05 suppression. Escalate to owner only when specific and credible |
| **A minor as target or buyer** | Refuse, refund, suppress, purge body after logging |
| *(quieter fourth)* **Offence describes ongoing abuse of the buyer** | Protective variant. Drop all "exposed/shamed" language. No U1/U2 upsell |

Mechanism: cheap keyword pre-screen that only **marks** the row — never auto-acts — into a
separate queue; operator flag blocks the send.

---

## 6. Format

**One self-contained HTML email, with a hosted mirror at a tokenised URL as backup, never a gate.**

The persuasion architecture is sequential, so any vehicle inserting a click before beat 1 loses
exactly the readers who most needed the inoculations. The size math clears: measured against this
repo's own AWeber templates (2.03× markup ratio), ~3,900 words renders to **55–70 KB** against
Gmail's ~102 KB clip. Budget ≤85 KB.

- **Never attach a PDF.** A 1.5 MB attachment on the domain that also sends Stripe receipts and
  password resets raises spam weight for all of it.
- **Images are off by default.** Every card's name must be HTML text above its image, never baked
  into artwork. With images off the product must still read complete.
- **Don't invent a token scheme** — `soulmateLanderSessions.intakeToken` (`shared/schema.ts:1315-1318`)
  is the proven shape.
- **Audio: not at MVP.** A static recording is a liability text isn't — identical audio is
  screen-recordable and comparable timestamp-for-timestamp. Only after generation is per-buyer.

Upgrade order: mirror page → name-rendered certificate header (`sharp` is already a dep) →
hosted PDF (Playwright, ~20 lines) → personalised audio.

---

## 7. Compliance — the 03/05 blocker, answered

**Recommendation: GO on 03 reframed. GO on 05 only after rename + rewrite. Ship 03 first** — it
has no named romantic rival in the intake and is materially easier to defend.

- **Stripe does not blanket-ban this.** Psychic services are prohibited only in **Japan, Mexico
  and Thailand** ([Stripe](https://stripe.com/legal/restricted-businesses)). The real exposure is
  the **UDAAP** clause — *outrageous claims, deceptive testimonials, high-pressure upselling* —
  and 03's testimonial block plus "only a few spots" hits all three. The risk is specific
  sentences, not the category.
- **MCC 7299.** Statement descriptor must read as a reading/consultation, never a hex. Keep
  disputes under 0.65%. PWYW is fine as a variable-price *service* — never routed through
  anything donation- or charity-labelled.
- **Never paid-advertise either offer.** Email-only to prior buyers. Meta's personal-attributes
  rule makes hex creative a fast route to a disabled ad account, which can cascade to the account
  running the front end.
- **Disclaimer placement:** footer, terms, and one line in the *confirmation* email — after the
  money, before the product. Never in the ESL or booking page.
- **Third-party data:** separate table, hard **30-day TTL with a cron that actually deletes**.
  Never written to `chat_messages`, never sent to Anthropic/AWeber/Kit, never in an admin list
  view or analytics export. **Strip attachments on receipt** — do not retain photos of a
  non-consenting person. Trim the intake ask from "as many details as possible" to first name +
  how he knows her + what you've noticed.

---

## 8. Unresolved conflicts — flagged, not smoothed over

1. **Name the hour, or not?** Intake proposed *"the night of Tuesday 5 August, between 2 and
   4am"*; proof-of-work says never a clock time — it's checkable against the buyer's timezone and
   against anyone who was awake and felt nothing. **My read: name the date, not the hour.**
2. **The wait.** The benchmark says the market prices *same-hour* delivery at a premium and warns
   against our 24h–3day SLA. Proof-of-work says the wait is the product's only physical evidence.
   **My read: keep the wait — our buyer isn't comparing listings, they arrived from an email and
   already paid — but note that the top complaint quote begins "her turnaround was quick, but…",
   which means speed never rescued genericness. The wait isn't the risk; the sameness is.**
3. **Poetic register.** The benchmark names *"long poetic metaphors that sounded nice but meant
   absolutely nothing"* as the most-quoted complaint — and that is currently the house style.
   Unresolved, and worth a deliberate call: specificity over lyricism, everywhere.

## 9. Evidence quality

The competitor lens **self-corrected**, withdrawing citations it had not actually fetched
(a Walrus article, a USPIS text file, a Keen help page) — the withdrawn claims are not used
above. Etsy, Reddit and Trustpilot hard-block automated fetching, so marketplace claims there are
indirect via secondary sources and should be treated as directional. The DOJ, Stripe, Etsy policy,
FTC and AstroChartus citations were fetched directly.
