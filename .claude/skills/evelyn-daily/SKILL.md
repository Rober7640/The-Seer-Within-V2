---
name: evelyn-daily
description: "Write the next batch of Evelyn Cross daily emails end to end, at the quality bar proven by the first 14 (curiosity subject → attention hook → real substance). Use when the user says: write the next N Evelyn emails, generate Evelyn's next batch, scale the Evelyn daily emails to 50/60, continue Evelyn's email program. This RUNS the proven Evelyn recipe (rotation + rhythm + the 3 copy rules + sketch pipeline) and outputs send-ready HTML + sketches. To plan from scratch or onboard a different persona, use persona-email-kit; to read the original strategy, see docs/aweber/evelyn-daily-email-handover.md."
---

# Evelyn Daily — write the next batch

The operator front-door for scaling Evelyn's daily-email program **after the first 14 are proven**. The "engine" is this recipe plus three repo assets: the proven copy (`docs/aweber/evelyn-cross-emails/14-day-emails-v3.md`), the send template (any `evelyn-dayNN-original-design.html`), and the sketch generator (`docs/aweber/evelyn-cross-emails/scripts/gen-evelyn-sketches.cjs`). Do not reinvent any of them — clone and continue.

This skill **generates → QAs → reports**. It is the batch generator, not the strategy doc (that's `evelyn-daily-email-handover.md`) and not the new-persona onboarder (that's `persona-email-kit`).

## Inputs
- **count** — how many new emails to write (e.g. 20, 50, 60). Ask if not given.
- **start index** — the next day number. **Read it from `docs/aweber/evelyn-cross-emails/STATE.md`** (don't guess); the first 14 are days 1–14, so a fresh batch starts at day 15.

## The three locked copy rules (non-negotiable — see memory `copy-hook-and-substance`)
Every email must pass all three or it gets rewritten:
1. **Curiosity-based subject.** Opens an information gap and *withholds the payoff* — the reader must open to resolve it. Never state the lesson in the subject. Tease, don't tell, but stay specific. (Bad: "They praised you for never bending. That was the trap." Good: "The compliment that's quietly breaking you.")
2. **Opening line earns attention.** A real hook in the first sentence — a small reversal, a curiosity gap, or a sharp specific claim. (Exemplar: *"Most mornings I write the letter first, dear. Today I drew first. I couldn't find the sentence until I'd drawn the thing."*)
3. **Substance, not sentiment.** This is the heart. Every email carries the **substance spine**:
   - **Mechanism** — the non-obvious *why* behind the feeling (e.g. "guilt at rest isn't laziness, it's *unsafety* — a guard posted to keep you useful").
   - **Why the obvious advice fails** — name it ("you can't argue a guard down; it only believes evidence").
   - **Practice with teeth + the reason it works** — a specific thing to do today, and why it lands ("name what you're *not* doing → gather evidence the sky stays up").
   - **Rule 1 check:** strip the CTA — is it still a complete, usable thing? If not, it's an ad. Rewrite.

Read 3–5 of the v3 emails before drafting a batch — they are the calibration target for voice + depth.

## Voice + guardrails (from the handover §3 — enforce on every draft)
- Warm, maternal, kitchen-table wise-woman. Short, sometimes-halting sentences. `dear` used **2–4×, never more**.
- **Rotate the intuitive tell** ("I notice…", "there's something here…", "your heart already knows…") — never the same one two days running.
- **No cosmic jargon** ("spirit plane", "the cosmos"). **No orphaned objects** — there is no candle in the notebook world; use notebook/morning beats.
- **Christianity-free.** In-bounds: Aesop / Zen / Taoist / secular-Sufi / folk / nature. Out: saints, scripture, angels, prayer, naming God.
- **Vulnerability guardrail.** Audience = women 35–75, often lonely/grieving/stressed. No manufactured fear, no promised outcomes about a named person, no over-reliance. The door is an honest "more," never a trap.
- **AI tells to avoid:** em-dash overload (a few are fine in Evelyn's voice, but don't lean on them), same-length paragraphs, "leverage/delve/utilize." Read it aloud; if it sounds like copy, rewrite.

## Variety system (LOCKED — track in STATE so it actually rotates)
A daily list dies of sameness in *any* one dimension. Vary all of these deliberately, never by accident:
- **Length — three registers.** **breather** 80–160w (single-word / omen / some observations; ~1/wk) · **standard** 280–420w (the workhorse; ~4–5/wk) · **long-form "sit-down"** 650–950w (an occasional letter/fable/confession; **~1 per 7–10 days**). Never the same register two days running; force a long-form ~weekly and a breather ~every 5–6 days. **Long-form must *earn* it** — segmentation ("for the woman who's newly alone… for the one in a long marriage gone quiet…"), a second mechanism/practice, optional serialization — never a padded standard. Worked exemplar: `email-d15-money-longform.md`.
- **Opening device — rotate it, don't just change the hook.** Pool: story/scene-open · blunt question · confession · contrarian claim · a line of overheard dialogue · timestamp/number. **Don't let "I drew/saw X this morning, dear" become the frame** (it was creeping across the first 14). Track the last few devices in STATE.
- **Open loops through the body.** Keep small forward-pull seeds running ("here's the part that took me years to see…", "and there's a crueller turn still") so every paragraph pulls into the next — not just the first line.
- **The ask — beyond soft vs door.** Add a **reply-bait** variant (no chat link; ends with a genuine one-line question + "hit reply and tell me — I read every one"; replies lift deliverability *and* feed `situation-library.md` with real reader language) and the occasional **pure-gift stretch** (a few days, no ask at all) to rebuild goodwill after door days. Mention the free offer ~1 in 3 sends, not every day.
- **Emotional temperature.** Not every email the same gentle-warm. Mix in a **bracing/honest** day and a **light/whimsical** day.
- **Tease tomorrow** (sparingly). Occasionally end on a loop the next day closes, to lift next-day opens. Never every day.
- **Sketch composition** — see pipeline step 5.

## Send window & timing (LOCKED)
This is a **credit-chat** funnel, not a one-tap purchase — a reading is a *sit-down* that needs time + emotional readiness, and for this audience (women 35–75, loneliest at night) both peak in the evening.
- **Every email sends in the evening (~8:30–9:30pm) — NEVER a morning send.** Mornings are rushed + inbox-flooded; the small hours hurt deliverability + get buried by morning. (Reality check: a one-off **broadcast = one single send time** for the whole list — per-subscriber-timezone is Campaigns-only — so pick one evening time in the list's dominant timezone.)
- **Door days especially go out in the evening** — the chat CTA needs her to have time + readiness to act *now*. Reply-bait / pure-content days are far less timing-sensitive.
- **Evening-letter device:** some emails are written *as* evening letters that meet her in the wind-down — **the day's done, the house settling, before bed** — NOT "late night" (she's on the sofa at ~9pm, not awake at 3am, so never claim small-hours/insomnia as the *current* moment). Door variants can hand a tool *for the night ahead* and offer to "set it down before bed." Times perfectly to the ~9pm send. Worked exemplars: **day 16 (door)** & **day 17 (soft breather)** in `emails-d16-d17-eveningletters.md`. Use sparingly — one device in the rotation, not every evening.
- **Judge timing by the funnel, not opens.** A/B morning vs ~9pm and measure **session-starts + purchases** (via `evelyn_lander_sessions` + PostHog UTM), not open rate. Night timing *amplifies* whatever the lander converts — it doesn't fix lander friction.

## Per-email pipeline (run for each day in the batch)
1. **Page type** — pick from the 9 (handover §1), honoring rotation:
   `overheard letter · fable · observation · single-word morning · the question · confession/memory · omen/folk-sign · pressed fragment · overheard exchange`
   **Rules:** no repeat of a page type within 3 days; per 7 days ~2× letter, ~2× fable, the rest sprinkled, breathers (single-word / pressed / confession) ~1 per 1–2 weeks. Weight it; don't go random.
2. **Day-type** — soft vs door, from the rhythm: **per any 7 days, 4 no-door + 3 door** (never more than 3; drop to 2 if engagement softens). **Rotate the door mechanic:** (a) *the page that turns* on the reader's specifics; (b) *the teaching with a personal layer*; (c) *the recurring pull* (a symbol carried across days). Spread door days out; don't cluster.
3. **Situation/theme** — pull from `docs/aweber/evelyn-cross-emails/situation-library.md`, honoring **~30-day no-repeat** (check STATE). **Balance the threads** across the batch — over-giver/strong-one, love (distance/recognizing/decision), grief-of-the-living, **money-block/inherited-scarcity**, late-life reinvention, forgiveness, invisibility. Don't let one thread cluster (the first 14 over-indexed over-giver in days 1–5 and had zero money — fix that at scale). When the library runs low, invent fresh situations from the core threads and append them to the library.
4. **Draft** the email to the three rules above + the substance spine + voice/guardrails. Structure on the page: **curiosity subject + preheader (extends the loop) → hook line → set up the sketch → [SKETCH] → body (mechanism → why-advice-fails → practice) → signoff → close.** Vary the **close every day** (no repeated soft-sell or CTA label — the first 14 were rejected for that). **Anchor / CTA text must sync with the `/evelyn` lander:** the click lands on Evelyn's live chat, so the words must signal *a reading / conversation with Evelyn* — "come and talk it through with me", "come and tell me", "let me read it with you", "let's look at it together" — **never a purely metaphorical phrase a clicker can't decode** ("bring it to my table", "pull up the second cup" are too vague about where they're going). Vary the wording; keep the *action* obvious. **A soft sell should still be direct** — "soft" = gentle, inline, warm *form*, NOT coy about the ask. Name it plainly (talk it through / a reading with Evelyn) and you can state the wedge (first few minutes free, nothing to set up). Don't bury or soften the invitation into vagueness. Soft days = one inline `#0000ff` underlined **bold** link (`font-weight:bold`) woven into a closing sentence; door days = a centered bold CTA + a *distinct* friction line. **All content hyperlinks are bold** (`color:#0000ff;text-decoration:underline;font-weight:bold`); footer/unsubscribe links stay normal weight. **Highlight exactly ONE key phrase per email in `<strong>` bold** — the mechanism/turn a skimmer must catch. Bold only, **never a highlighter background** (reads markety + breaks dark mode); never more than one emphasis or it stops standing out. Keep soft emphasis (single words) as `<em>` italic.
5. **Sketch subject + composition** — derive from the body's central image. **Vary the composition** (the first 14 were all one spare floating object — too samey): rotate between a single spare object (good for breathers), a **richer little scene** with several elements + context (letters/long-form — e.g. the day-15 table still-life: envelope, notes, coins, hands, a margin sum), a close detail, and an occasional **notebook page** with a pencilled margin note or two elements interacting. Keep the locked amateur-pencil hand; only complexity + composition change. Richer scenes pair naturally with longer emails.
6. **Generate the sketch** — add a row `[stem, subject, keepHands, isText]` to the `DAYS` array in `scripts/gen-evelyn-sketches.cjs` (stem = `day-NN-<slug>`; `keepHands:true` only if the subject *is* a hand; `isText:true` for word/date exceptions), then run:
   `NODE_PATH="$(pwd)/node_modules" node docs/aweber/evelyn-cross-emails/scripts/gen-evelyn-sketches.cjs day-NN-<slug> …`
   It generates (Day-1 hands = locked style reference), optimizes <200 KB, uploads to S3, verifies GET 200. **Read each generated image and QA it** (correct subject, consistent amateur-pencil hand, no stray hands); regenerate with a sharper subject string if it drifts.
7. **Assemble the send file** — clone a `evelyn-dayNN-original-design.html`, swap: top comment (subject/preheader/link), preheader divs, pre-frame line, sketch URL + alt, body, close. **Keep** the head/banner/footer/CSS byte-identical. **Links:** every link (hero + close) =
   `https://www.theseerwithin.com/evelyn/?utm_source=aweber&utm_medium=seerwithin_free&utm_campaign=<id>&bucket=<love|money|purpose>&opener=<opener>` (HTML-escape `&` as `&amp;`). Campaign id = `day<NN>-<slug>` (door days may use a memorable id like `behind-d6`). `bucket` is read by the lander; door-day `opener` needs the lander `&opener=` change (handover review item) — until shipped, door days work bucket-only.
8. **QA** — run the **`persona-email-qa`** agent on the draft (path + persona `evelyn-cross`). It enforces brand/compliance (tendencies-not-promises, no personal-placement claim to the list, one CTA → `/evelyn`, footer `hi@theseerwithin.com`). **Also self-check the 3 copy rules + Rule 1.** Hold any draft with a BLOCKER.
9. **Record state** — append to STATE: day number, page type, day-type, door mechanic (if any), situation id, sketch subject, subject line, campaign id.

## Batch execution
- **Pipeline the batch.** Drafting is the slow step; fan out across days (parallel subagents or a workflow), each agent given: the 3 rules, the substance spine, voice/guardrails, the assigned page-type + day-type + situation, and 2–3 v3 exemplars. Then QA each as its draft lands. Keep sketch generation batched (the generator already runs ~4 concurrent).
- **Human-approval gate** before any send (handover §9): write drafts + images to the output folder for review; do not schedule sends from here.
- **Coverage report** at the end (see below). Note anything skipped or any thread that got under-represented.

## Output
- Copy → append to a batch doc `docs/aweber/evelyn-cross-emails/emails-d<START>-<END>.md` (same shape as `14-day-emails-v3.md`).
- Send files → `docs/aweber/evelyn-cross-emails/evelyn-dayNN-original-design.html`.
- Sketches → `assets/sketches/day-NN-<slug>.jpg` (local) + S3 `evelyn/sketches/…`.
- State → update `STATE.md`.

## Report (end of run)
A table: day → subject → page type → soft/door → thread/bucket → sketch (GET 200?) → QA verdict. Then: which are send-ready, the thread-balance tally (flag any over-cluster or missing thread), and outstanding non-blocking items (lander `opener=` for door days; any sketch to re-roll).

## Never
- Never ship a draft that fails any of the 3 copy rules or Rule 1, or that repeats a recent close/CTA/situation.
- Never state the lesson in the subject line.
- Never promise an outcome about a named person, or claim a personal fact about the reader.
- Never mark send-ready with an open QA BLOCKER.
