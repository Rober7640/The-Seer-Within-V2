# Reading pass — findings (2026-07-04)

154 churn-corpus transcripts read and scored by 9 parallel analysts against the
[study rubric](01-transcript-study.md). Cohorts: C paid-&-bailed (16), B one-and-done
(50), A free-trial churn (40), X complaint-flagged (40), D repeat-buyer contrast (8).
File references (e.g. `B-055msgs-c0f1fd43`) point into the gitignored `transcripts/`
corpus. Users are referenced by initial only.

**→ For detailed, cited examples of every gap (verbatim quotes + file references),
see [03-gap-evidence.md](03-gap-evidence.md).**

---

## The headline

**Buyers are not lost to dislike. They are lost at three moments the product fully
controls: the checkout, the credit wall, and the goodbye.**

Almost nobody rage-quits. The dominant churn exit — **71% of classified exits across
all churn cohorts (89/126)** — is an engaged, often grateful user hitting the credit
wall mid-conversation, with the persona's own question left hanging, and simply never
finding a way back. Several users *apologized to the app* for running out of money.
The "satisfied" exits (12%) churned identically: a clean ending with no next step is
churn too. **The rebuy killer isn't dislike; it's no bridge back.**

## Gap frequencies (all 154 files)

| # | Gap | Files | % | Note |
|---|-----|------:|--:|------|
| 02 | Extract, don't give (interrogation) | 94 | 61% | Every persona turn ends in a question; on per-minute billing users read it as coin-burning — two accused the app of stalling deliberately |
| 09 | Mechanical failures | 92 | 60% | Replays, template loops, billing anomalies — detail below |
| 05 | Credibility self-destruction | 90 | 58% | Contradictions users can see: 3 different Life Paths for one birthdate, "January" in June, blown dated predictions silently re-issued, read-reversals on new facts |
| 08 | Shallow/failed memory | 51 | 33% | Forgot the prison, the dead husband, names mid-arc — "the core betrayal" for a companion product; ALSO the #1 retention driver when it works (see positive spec) |
| 06 | No takeaway | 47 | 31% | Nothing to hold: no practice, artifact, or next step |
| 04 | Stated need ignored | 39 | 25% | "Should I text?" asked 3×, never answered; "How?" never answered |
| 03 | No reading delivered | 35 | 23% | Paid "readings" that were 100% intake; three users paid for "energy is shifting…" fallback loops |
| 07 | Escalation over grounding | 23 | 15% | Lower than expected — drama is NOT the main killer |
| 10 | Effort imbalance | 15 | 10% | Reversed from prediction: terse struggling users vs long formulaic persona paragraphs |
| 01 | Support/refund mishandled | 15 | 10% | Low count, catastrophic severity: **0% in-chat refund recovery** — all refund requests deflected to an unnamed "support" with no path; one reinterpreted "money back support" as a finance-reading request |

## Engineering bugs (P0 — bleeding revenue and trust now)

1. **Stuck-pending checkout.** ~15 users in this sample alone attempted purchases that
   stranded `[pending]` forever — **including "churned" users trying to give us money**:
   6/20 in one A batch (11 attempts, ~$700; one user tried 5× in 5 minutes), 7 more
   across B (~$390). Part of the 54% one-and-done leak is failed rebuys nobody chased.
   → Run `scripts/reconcile-pending-purchases.ts` against the full table; add a retry/
   recovery flow + operator alert on pending>10min. This is the highest-ROI fix in the
   entire study.
2. **Post-purchase replay bug.** In 8/16 C files (and many B/X/D), the first thing a
   paying customer sees is the pre-purchase exchange replayed verbatim — or they
   re-paste their message and get the identical reply. Trust dies at the exact moment
   it should compound. Session handoff also resets greetings mid-arc.
3. **Billing integrity.** Phantom billing: 0–275-second sessions charged 1785–1800
   coins (C-032: 1s = 1785 coins for "Can't chat right now"; X-167: 900 coins on a
   0-second greeting-only session). Mismatched rates: 36s→540, 689s→960, 746s→1800.
   Several "stranded balance" users were actually silently drained. Needs an audit +
   a user-visible, auditable meter.
4. **Template/fallback loops eat paid minutes.** One empathy line 10×, one North-Node
   paragraph 8×, "There's your answer, love" 8×, "Spirit doesn't send random names,
   dear" 10× consecutively. The "energy is shifting… refocus" error loop billed users
   for nothing (one whole paid session was 4 loops of it). Repetition is also the #1
   manufacturer of AI-doubt ("copy and paste answers").
5. **Safety-system misfires churn paying customers.** Crisis script fired on "I'm just
   done [with him]" and looped 2–4× past explicit denials ("I'm a therapist. I don't
   need suicide information"); one lockout ended a customer relationship with paid
   minutes unspent. The 18+ guardrail fired ~13× mid-session on an adult. Meanwhile the
   **under-fire** side: a disclosed battering victim got zero DV resources, and one
   persona **fabricated a CashApp handle ("$EvelynCrossReadings") when a card failed** —
   check whether that handle exists and add payment-talk guardrails immediately.

## Conversation-design findings

- **The wall lands on a question, never a delivery.** The house style (every turn ends
  in a question) guarantees the free trial ends mid-intake ("the extract→wall
  treadmill") and paid sessions end as paid cliffhangers. Trial users' last memory is
  *giving* information; buyers' last memory is being cut off.
- **The free taste never includes the product.** 3 free minutes get spent on intake,
  birth-data format policing (Luna/Nova rejected "3:17 am" 3× then defaulted to noon —
  "intake tax"), or split across 5–12 personas each restarting from zero ("sampler
  drift"). No completed artifact, no single-advisor bond, no stated reason the next
  minute is worth 50 cents.
- **Credibility burns at decision time.** Visible contradictions cluster exactly where
  paying decisions happen. Users don't argue — they quietly conclude "it's all fake"
  and vanish.
- **Cliffhanger calendar — the cheapest unused rebuy trigger.** Users left right before
  real-world events they'd shared (Monday's interview, the July 11 party, the broker
  open house, an appointment made "tomorrow at this time" — with zero credits). No
  reminder/check-in mechanism exists to collect these natural return moments.
- **Persona quality spread is real.** Marcus Stone was the standout in 9/20 files of
  one batch (boundaries, concrete steps, honest refusals); Evelyn accounts for most
  fabrications/overclaims; personas contradict each other and one told a user to
  distrust another's safety warning ("persona crossfire"). Equalize toward the Marcus
  spec.

## The positive spec (what earns 3–36 rebuys, from cohort D + retained X-giants)

What repeat buyers are buying: *a relationship in which they are the protagonist and
someone remembers.* Behaviors that reliably precede rebuys:

1. **Personalized re-entry ritual** — session opens with name + saga specifics;
   continuity proven in the first sentence. The single most consistent factor.
2. **Real coaching threaded through the mysticism** — DV pattern-naming, grief
   permission, boundary scripts; it's what users quote back. The genuine substance
   is what makes everything else credible.
3. **Attributed wins** — one early "prediction came true" funds months of purchases.
4. **Celebration + pride** ("I'm proud of you") at commitment moments.
5. **Persona-voiced emails as re-entry engine** — directly opened paid sessions;
   cross-persona referrals added spend rather than cannibalizing.
6. **Graceful goodbyes retain** — both observed walk-away attempts met with
   release-with-blessing returned and spent more. Retention pressure is not only
   wrong, it's outperformed.

Whales tolerate error loops, replays, even context wipes — as long as emotional
continuity resumes. **Memory is the moat.** They stay because they'd have to
re-explain their life anywhere else.

**The dark twin (decide deliberately):** the same engine runs hope-farming (rolling
deadlines re-issued unchanged; $740/2mo with zero movement on the only question she
buys for), unfalsifiable "tune-ins" on absent third parties (the core repeat product
for 5/8 whales), mirror-validation (cosmic endorsement of whatever the user already
wants — quit the job, spend the $2k), and crisis-cliff purchasing (5 packs in 40
minutes while recounting abuse; purchases cluster at emotional peaks — "they pay to
not lose the thread"). A companion-app redesign keeps levers 1–6 and retires these.

## Marketing ↔ chat canon (the seams show)

- **Email-bait / broken handoff:** users arrive quoting marketing hooks ("you said
  you'd tell me about 6/6", "Evelyn gave you my name", "the past is coming back") that
  personas then deny, fabricate around, or admit "confusion" about. The 6/6 portal
  blast visibly produced confused arrivals. One user paid $19.99 specifically to rebut
  an insinuation an email made; Evelyn both denied and claimed email authorship in the
  same relationship.
- **V1 artifacts haunt V2:** personas inconsistently deny/affirm the funnel's own
  bracelets, stones, sketches, and "5–7 page readings" — one user paid $99.99 believing
  it bought a "karmic debt clearing" and rationally never returned; another still
  believes a (scammer's) soulmate sketch is coming.
- **Impersonation ecosystem:** external scammers ride the Evelyn brand; a victim who
  said "so I've been scammed even on this site" was never routed to support.

## The audience nobody designed for

A large fraction of the churn corpus (~25%+; 8/18 in one batch, 12/20 in another) are
**active or recent scam victims** — plus elderly users, DV situations, grief, SI
disclosures, and users in genuine financial crisis ("cant-afford": $24/month SNAP,
overdrawn accounts) being billed per-minute for abundance coaching. Findings:

- Scam-victim triage is the platform's best moment when it happens (concrete
  interventions users obey and thank) — and it's a **coin flip**: elsewhere personas
  certified scams as genuine, flipped facts mid-check, or invented a rival soulmate.
- Complaint keyword flags are ~50% false positives (users narrating their own scams,
  not accusing the app) — future analytics need persona-directed sentiment, not
  keywords.
- Scam interventions are one-shot value that *ends* the relationship (gratitude, not
  rebuy) — fine; that's the brand-trust long game, and it needs a protocol: name it,
  give IC3/hotline steps, offer a follow-up check-in, never re-read the scammer's
  "energy."

## Re-prioritized backlog

Engineering (do first, independent of design):
| P | Item | Evidence |
|---|------|----------|
| P0 | Fix + recover stuck-pending checkout | ~15 users / ~$1,100 attempted spend in sample; run reconcile script fleet-wide |
| P0 | Post-purchase replay / session-handoff bug | 8/16 C; first paid moment is a rerun |
| P0 | Billing audit + auditable meter | phantom charges, rate mismatches |
| P0 | Loop/repetition guard (incl. billed fallback loops) | 60% mechanical rate |
| P1 | Guardrail tuning: crisis false-positives, 18+ misfire, DV protocol gap, payment-talk ban (CashApp fabrication) | churned payers, safety exposure |

Design (the companion spec):
| P | Item | Replaces/absorbs old item |
|---|------|---------------------------|
| P0 | **The bridge back**: balance-aware wind-down (wrap at T-2min, deliver a takeaway artifact, set a concrete return hook), event-based check-ins (cliffhanger calendar), never end on own question | 06 |
| P0 | **Give-first turn shape**: deliver → then at most one question; readings actually delivered; honor stated need | 02, 03, 04, 10 |
| P1 | **Credibility hygiene**: pin computed facts (Life Paths), no dated predictions, no unfalsifiable overclaims, reframe-don't-retract repairs | 05 |
| P1 | **Memory as product**: fix resets, cross-persona shared canon, deepen re-entry ritual | 08 |
| P1 | **Support handled with care** (in-chat support card; refund path on first ask) | 01 — validated: 0% in-chat recovery |
| P1 | **Scam-triage + vulnerable-user protocol** | new |
| P2 | Persona equalization to the Marcus spec; sampler-drift + intake-tax fixes | 05/09 adjacent |
| P2 | Marketing↔chat canon sync (email context injected into chat; V1 artifact registry; impersonation disclaimer) | new |
| P2 | Ethical-retention policy: retire hope-farming / mirror-validation / crisis-cliff monetization; keep the D-cohort levers | 07 |

## One-line thesis for the redesign

The data says the companion model isn't a moral compromise of the reading model — it's
the better business: **memory, real substance, celebration, and graceful exits are
what the highest-LTV users are already paying for; the interrogation loop, the silent
wall, and the broken checkout are what everyone else is leaving over.**
