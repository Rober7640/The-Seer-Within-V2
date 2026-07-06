# Demand study — what users actually ask (2026-07-04)

Basis for the [prompt framework](06-prompt-framework.md). Method: regex mining over all
71,571 user messages / 15,527 substantive session openers (Phase A), then agent
classification of 400 stratified openers — 200 first-session, 200 returning (Phase B).
Raw samples in `transcripts/demand-*.txt` (gitignored). Quotes lightly anonymized.

## Phase A — corpus-level signals

| Signal | Number | Implication |
|---|---|---|
| Money/career mentions | 11.1% of openers — biggest keyword bucket | needs a real playbook, but converts at only **14%** |
| Relationship-status buckets (feelings/reunion/cheating/grief) | **28–40% buyer concentration** (vs ~15% baseline) | love-status demand is what people PAY for |
| Suggested-question button clicks | **26.5% of first sessions, 15.7% of returning** | the 30 canned buttons are a demand-shaping surface equal to the prompt |
| Question-shaped openers | 43.9% first vs **33.2% returning** | returning sessions are episodic updates, not Q&A |
| Aiden self-knowledge openers | 264 vs Evelyn 147 | "tell me about me" demand routes to structured systems (deliverable-shaped) |

## Phase B — first-session taxonomy (n=200)

Top classes: **suggested-click 24.5%** (five verbatim templates: meant-to-last 12,
love-slipping 7+, abundance-block 8, purpose, stuck) · **life-update 11.5%** ·
**intake-fragment 9.5%** (bare name/DOB, waiting to be read) · **status-of-other
7.5%** · **emotional-disclosure 7.0%** · will-i-ever 4% · relationship-diagnosis 4% ·
meta-product 4% · money-survival 3.5% · **duty-of-care cluster ~10%** (crisis 2.5%,
health-fear 2.5%, scam-victim-validation 2%, grief 2%) · email-callback 2.5%.

What the classifier found that changes design:

1. **"First" sessions aren't first.** Email-callback + reading-feedback + life-updates
   arrive expecting the persona to honor claims the *emails* made ("I got an email
   saying you had something to tell me!"). The chat must be fed campaign canon or it
   opens with amnesia.
2. **Duty-of-care is a layer, not a persona skill (~10%):** "Need. Help. Stuck. No.
   Way. Out" · awaiting cancer results · "$17,000 FedEx-fee check — will this actually
   happen for me?" · fresh grief. Hard rules above the persona.
3. **The third-party read needs doctrine.** Users ask for checkable facts ("Is her
   name Sara?" "Where does she live?"). The move: concrete-*feeling*, unfalsifiable,
   agency handed back. Never verifiable specifics.
4. **Intake-fragments must be USED instantly** — a name/DOB answered with another form
   question is the #1 way to waste the trial.
5. **Audience reality:** older, low-income, ESL, typo-heavy. Plain language, turn-1
   value, ethical floor on monetization (no windfall language to people who "don't
   have money for the basics").

## Phase B — returning-session taxonomy (n=200)

Top classes: **thread-resume-answer 13%** (largest freeform class — they answer the
persona's LAST question as if no gap: "No. I havent." / "Creative endeavours") ·
**saga-update 12.5%** · suggested-clicks 27% total (love-verdict 9.5, love-pattern
5.5, numerology 5, money 3, card-draw 2, purpose 2) · **emotional-disclosure 8%** ·
prediction-timing 5.5% · growth-report 4% · status-of-other 3.5% · reading-followup
3.5% (quotes the persona's prior words back, demanding expansion) ·
relationship-verdict 3% · gratitude/report-back 1.5% (the flywheel: "You were right
again — he actually offered…").

What it means:

1. **Re-entry is mid-thread resume, not a greeting.** ~26% continue the previous
   session's sentence. Inject last session's final question + open loops verbatim;
   "welcome back, what brings you here?" actively breaks 1 in 4 sessions.
2. **Memory is audited — build a prophecy ledger.** Users hold the persona
   accountable to its own predictions, assigned rituals, and marketing emails ("you
   said Woodbridge — when?" / "You said you noticed a pattern about the 7-eleven
   lady"). Predictions-with-windows, rituals assigned, and named people must be
   structured, citable data. A continuity contradiction is a churn event.
3. **The retention flywheel, visible in raw data:** prediction with window → user
   returns to report/audit → win banked → next prediction planted. Session close
   should always set the next opening (watch-for, window, practice). The credit wall
   currently severs this loop at its most valuable moment.
4. **Two response modes; misfiring is costly.** WITNESS (disclosure/growth/grief —
   wants recognition, not a reading, never a pitch: "Val died suddenly 2 weeks ago")
   vs ORACLE (verdict/status/timing — wants a position; hedging "reads as betrayal").
   Route the mode before any reading machinery fires.
5. **The button rail is new-user-shaped.** Returning users deserve saga-aware
   suggestions: "Any news from [name]?" · "Pull my daily card" · "Check my
   prediction." Canned clicks from returning users must be bound to their stored saga
   ("for you and [name], this question means…"), never answered generically.

## The one-line synthesis

**First sessions are an audition ("read me, prove it, honor what the email promised");
returning sessions are a serialized story the user expects the persona to co-hold
("here's what happened — what does it mean, and what do I watch for next?").**
The current prompt stack (see [04-prompt-baseline.md](04-prompt-baseline.md))
is built for neither: it interrogates the audition and forgets the serial.
