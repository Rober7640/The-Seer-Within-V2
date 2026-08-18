# The Reframe Deck — Playbook

*The shared standard every reframe-deck email inherits. Read this once. Each spec in `formats/` builds on it and only adds — or deliberately **tightens** — what's format-specific. A format asking for fewer "dear"s, a specific preheader, or a particular hook is **tailoring within these rules, and it stands.** "**This file wins**" is the tie-break only for a genuine clash of principle (a guardrail, the spine, the voice) — not for a format narrowing a range this file leaves open.*

---

## What this program is

Evelyn Cross's daily email to the `theseerwithin_free` AWeber list (~47k). One send a day, rotating through **7 formats** (see `formats/`). The job of every email:

1. **Earn the open** — a subject that teases a genuine turn.
2. **Deliver one real insight** — the reframe (below). Useful even if they never click.
3. **A couple of times a week, invite them in** — bring their own situation to Evelyn in a live chat at `/evelyn`.

Success = opens and click-to-open that **hold up over months**, not a spike that decays. Our audit ([[evelyn-email-audit]]) showed the old approach — a fresh curiosity-gap + emoji every day — lifted opens for a few weeks and then slid (38% → 19%) even with the "winning" subject format restored. Insight doesn't fatigue the way tricks do. That's the whole bet.

---

## The spine — the reframe

Every email, whatever its format, performs **one move**: it takes the surface (a question, a story, a card, a recurring sign) and turns it to show what's really underneath.

> The shape is always: **you think it's X. It's actually Y.**

That turn is the reason to open. Not a manufactured gap — a real *reframe*: the reader finishes the email seeing their own situation differently. It's literally what a seer does.

**Rules of the reframe:**
- **Exactly one per email.** One clean turn. Everything before it sets it up; everything after pays it off. Two reframes cancel out; zero reframes is a dull send.
- **It must be true and non-obvious.** If the "reveal" is something they already believed, it's not a reframe. If it's clever but false, it's a trick. The turn has to be *earned* by the setup and *hold up* on reflection.
- **State it once, plainly, in a pull-quote.** Don't repeat it three ways. Say the true thing once and let it land (see Formatting).
- **The reframe is the destination; the hook is the door.** They're different jobs — see `hooks.md`.

Litmus test: after drafting, write the reframe as a single "you think X → it's actually Y" sentence. If you can't, the email doesn't have one yet.

---

## Audience

One reader, carrying a love question, in one of three states — plus a fourth "valve" that serves the whole person, not the love wound.

| State | Where they are | What they secretly need |
|---|---|---|
| **A — uncertain** | In something, unsure it's real / unsure they're wanted | Permission to stop auditioning it |
| **B — waiting** | Alone, sure love is coming, tired of not knowing when | Permission to live now, not on hold |
| **C — bereft** | Loved and lost — an ending, a death, a slow drift | Permission to want again without betrayal |
| **valve — the whole person** | Any of the above, but the email steps back from "them" | Their worth/agency isn't contingent on a relationship |

**Gender-neutral — this is a hard rule, and it's the key delta from the old program.** The old handover assumed *"a woman waiting for a man."* We don't. The reframes are universal; only the surface was ever gendered, so fix only the surface:

- **The reader** is never assumed to be a woman, or to be pining for a man. Use `you`, `them`, `the person`, `the one you're waiting for`, `whoever you're bracing against`. Never "girl," "sister," "as a woman."
- **The cast varies.** The people in the stories/letters are specific and vivid (that's what makes them land) but their genders rotate across the deck. **At least one send in every rotation is an explicit male POV** (e.g. Format 01's gold example is a man's letter). A man reading the deck must see himself; someone loving a woman must too.
- **"dear" stays** — it's Evelyn's endearment, grandmotherly and gender-neutral, not a female address. (Flagged as swappable if ever needed; default keep.)

Why it's safe: neutralizing the *reader* is asymmetric upside — a woman still sees herself in "you," and now a man does too. You lose nothing with the majority and gain the people the old copy shut out.

---

## Voice — lock this

Evelyn is a warm, unhurried woman at a kitchen table who has read for people for fourteen years. She is kind but not soft; she tells the truth because she respects you.

- **Second person, present tense.** She's talking *to* you, now.
- **"dear" ~2–3× per email** — the intimacy marker. A few, warmly placed (near the open, a mid-turn, the close). More than ~4 and it cloys; zero and it goes cold. *(The gold sends all run 2–3.)*
- **Short sentences carry the weight.** *"He isn't." "They have it backwards." "It's the same door."* Land the turns on a short line.
- **Vary paragraph length.** A one-line paragraph, then a longer one that breathes, then short again. Never a wall.
- **Concrete over abstract.** "checks her profile every day," "waters a dead plant," "11:11 on the clock" — never "struggles with attachment."
- **Honest, never hype.** She refuses to promise. "I won't hand you a name or a date. Anyone who does is selling you something."

**AI tells to kill** (from [[copy-hook-and-substance]]):
- **Em-dashes:** max ~1–2 in the body (the "— Evelyn" sign-off doesn't count). Use periods and commas. (This is the single most common tell in Evelyn drafts.)
- No "leverage / delve / navigate / unlock / journey (as verb) / it's important to note."
- No same-length paragraphs, no bold on every key term.
- Read it aloud. If you stumble, the reader will.

---

## The substance rule

A reframe without substance is just a nice feeling restated. Every email carries a **real mechanism** underneath the turn:

1. **The mechanism** — the non-obvious *why* behind the feeling (e.g. "the checking is what keeps both doors shut").
2. **Why the obvious advice fails** — name the standard advice and show why it misses ("*just put yourself out there* aims at your behaviour when the wall is in your body"). Some formats carry this beat as **the hidden cost** the kind surface exacts (Format 05's "the cost" step) rather than a head-on refutation — either satisfies the bar, as long as the reader learns *why the easy read is wrong.*
3. **A practice with teeth** — one small, do-today thing, and the reason it works ("name the sentence you say twice — seeing it is the first thing that loosens it").

**The strip-the-CTA test:** remove the closing invitation. Is what's left still a complete, usable thing the reader is glad they read? If not, it's an ad, not an email. Every send must pass this — even the conversion beats.

---

## Subject line + preheader

The subject's job is to tease **the reframe**, so it's interesting because the *thought* is interesting — not because an emoji shouted.

**Formula:** `<emoji, sometimes> {{ subscriber.first_name | capitalize }}, <a beat that promises the turn>`

- **First name FIRST**, capitalized via `{{ subscriber.first_name | capitalize }}`.
- **Tease, don't tell.** Promise the turn; never state the lesson. ✅ `he asked if she'd come back. That's not what he needed to know.` ❌ `Why checking his profile keeps you stuck.`
- **Emoji: earned, not reflexive.** ⚠️ 😱 🚩 ‼️ suit warnings/tells; card-cue emoji (🌙 ☀️) suit card days; the quieter formats (parable, myth) can go emoji-free. Don't slap one on out of habit.
- **Preheader** = the second line of the promise, in Evelyn's warm register. It's the whisper after the subject's tap — usually a plain, quiet line (*"It was never about the plant."*), only occasionally ending "…, dear." Each format's spec gives the canonical preheader; the gold sends mostly use the plain line.

Data note: blunt/curiosity + urgency out-opens gentle/literary on this list; the best clickers ever were personal-news ("Something shifted around you," 23% CTOR) and deadline ("The door is open. Just for today.," 22%). See [[evelyn-email-audit]]. Each format's spec has a subject bank.

---

## Formatting

Formatting exists to make the read easier **and** to spotlight the deck's logic. Two box styles, tied to content — not decoration:

- **Quote box** (`.q`): reserved for an **incoming letter set apart** (Format 01) or a single spoken line worth isolating. Soft plum, left rule, italic. **Most formats don't use one** — they carry the reframed/quoted words in **inline italics** (see the gold sends 02–07). Don't add a box just to have one.
- **Reframe pull-quote** (`.rf`): the reframe itself — the one turn. Plum left rule, faint wash, slightly larger. This is the visual centerpiece; a scanner's eye should land on it. In the source it's tagged `> **↳ THE REFRAME.** …` so the tooling and the pre-send check can find it — but that tag is an **authoring marker only. The renderer strips it, so subscribers see just the turn**, set apart by the box (no literal "THE REFRAME" label in the sent email).
- **Bold**: the CTA button is always bold (structural). Beyond that, bold **one** pivot beat (*"He isn't."*), occasionally a second. Nowhere else — never on ordinary key terms. (The `↳ THE REFRAME.` source tag is stripped at render, so it isn't a visible bold element in the send.)
- **Italics**: the phrase being turned, quoted words, gentle emphasis.
- **No underline in the body.** In email it reads as a broken link. Carry emphasis with the above.
- **Length:** ~300–380 words **of body** (hook line through the sign-off; subject and preheader aren't counted). The gold sends run ~290–360 — tight is the point. Long enough to earn the turn, short enough to read on a phone before the bus comes.

(The rendered look is the canonical AWeber design — see Canonical assets. The scratchpad `build-deck.mjs` renders the deck to an HTML mockup.)

---

## The ask (CTA) + link scheme

**Every email has one destination: the `/evelyn` chat lander.** Every format, every day — the CTA drives the reader into the chat. There is no literal email-reply ask and no other landing place. What changes between formats is only the *wording* of the invitation, never where it goes.

- **One strong CTA** for most formats — a single plum button, benefit-worded, mirroring what they'd get ("*Ask me your real question*", "*Show me what I'm really doing*"). Not "Click here."
- **Conversion beats (~2×/week)** are the formats where the reframe *is* the pitch (01, 05) — the CTA is the natural next step of the insight, never a bolted-on sell.
- **Interactive formats (04, 07)** close with "tell me yours" — but the CTA still **drives to the chat lander** (`/evelyn`), same as every other format. "Reply-style" is the *tone* (name your line/sign and Evelyn answers you there), not a literal email reply. The interactive framing just makes the click feel like a conversation instead of a pitch.
- **Every link is tagged.** Two forms, both assembled by `scripts/render-aweber.mjs` — never hand-write one:
  - **Short link** (drafts with a `**Continue Seed:**` in frontmatter):
    `https://www.theseerwithin.com/e/<code>?email={!email}`
    `<code>` is minted at render time and stands for the send's campaign *plus* the authored continuation content, so `/evelyn` can pick that exact reading back up. The campaign travels as a **path** segment because query params get stripped by link-privacy proxies and mangled by ESP click wrappers.
  - **Legacy link** (drafts without one):
    `https://www.theseerwithin.com/evelyn?email={!email}&bucket=love&src=aweber&campaign=<slug>&utm_source=aweber&utm_medium=email&utm_campaign=<slug>`
    `<slug>` = the send's short id (e.g. `reframe-02-parable`).

  `{!email}` is AWeber's personalization tag (leave literal) in both forms — it warms the landing by recognizing the subscriber. The short link looks like it drops `bucket` / `src` / `utm_*`, but it doesn't: those are stored on the minted row and rebuilt server-side by `/e/:code`, so the lander receives the same query string either way. `bucket` matters beyond reporting — it selects Drip 1's bucket-specific phrase — which is why it rides on the row rather than being left to a query param a privacy proxy can strip.

---

## Guardrails — never

- **Tendencies, never a named person or a date.** Evelyn reads patterns and openings. She never says "he'll call Tuesday" or names a specific man/woman. "*I don't deal in names or dates. That isn't what I do, and it isn't what you need.*"
- **Christianity-free** (and free of any specific named faith). Folk/mythic texture is fine; doctrine is not.
- **No manufactured fear or fake scarcity.** No countdown lies, no invented deadlines. Urgency is only ever a *real* window (e.g. a genuine weekly one).
- **Every claim true in the data.** The reading resumes, the thread is saved, idle time is free — only say what the product actually does.
- **Respect, not flattery.** She never fawns or panders. Kindness with a spine.

---

## Rotation & cadence

- **A different format every ~2 days**, cycling the 7 so nothing repeats within ~2 weeks. Variety fights the daily-cadence fatigue we can't solve by sending less (cadence stays daily per operator).
- **~2 conversion beats per week** (formats 01 & 05). Don't stack them back-to-back.
- **Balance the states** (A/B/C/valve) across a rotation so no state is starved; **balance the cast's gender** so it doesn't drift back to all-female.
- Track every send in `STATE.md` (format, reframe, hook, cast, status) so the next writer sees what's been used.

---

## The quality bar — pre-send checklist

An email ships only if **every** box is true:

- [ ] **One reframe**, writable as a clean "you think X → it's actually Y" sentence, true and non-obvious.
- [ ] **A hook** that opens with a concrete image / withheld payoff / implied story — not a warm-up line (see `hooks.md`).
- [ ] **Substance**: a real mechanism + why the obvious advice fails (or the hidden cost it exacts) + one do-today practice. Passes the strip-the-CTA test.
- [ ] **Voice**: "dear" ~2–3× (never more than ~4 — it cloys), ≤2 body em-dashes (the "— Evelyn" sign-off doesn't count), no AI tells, reads well aloud.
- [ ] **Gender-neutral reader**; cast varied (and the rotation includes a male POV).
- [ ] **Formatting**: reframe in a pull-quote (the `↳ THE REFRAME.` source tag is stripped from the send); quoted/reframed words in **inline italics** (a quote box only where the format uses one — e.g. 01's letter); bold limited to the CTA and ~1 pivot; no body underline; ~300–380 words of body.
- [ ] **Subject** teases the turn (name-first), preheader in Evelyn's voice.
- [ ] **One tagged CTA**, benefit-worded; guardrails intact (no names/dates, no fake scarcity, claims true).
- [ ] **At scheduling time** (a process step, not a property of the draft): rotation honored — format not repeated within ~2 weeks, conversion beats not stacked, state + cast-gender balance kept (incl. a male POV in the rotation) — and the send **logged in `STATE.md`**.

Optional gate: run the draft through the **`persona-email-qa`** agent for a fact/brand/compliance pass before scheduling.

---

## Canonical assets

- **Email HTML design** (clone, don't reinvent): white bg · Helvetica 16px `#333` · "Seer Within" header/letterhead · blue `#0000ff` underlined *links* (links only) · gray `#DEE0E8` `<hr>` rules · 140 Broadway address + Unsubscribe footer. The reference template `evelyn-day13-original-design.html` is recoverable from git stash `4a58f19` (`git cat-file -p 4a58f19:docs/aweber/evelyn-cross-emails/evelyn-day13-original-design.html`). **Not** the dark/gold `templates/email-template.html`.
- **Letterhead / core image:** Evelyn's face, small, as a sender-signature at the top (never a big in-body hero). Treatment (A small photo / B duotone stamp / C signature-only / illustrated) is **still parked** — pending decision; default to A. Asset: `uploads/avatars/evelyn-cross.png`.
- **Link scheme:** see The ask, above.
- **Hosting:** optimize images to JPEG <200KB (`sips`) and host on S3 (bucket `luna-assets-tsw`, path `evelyn/…`), same pattern as the tarot cards.
