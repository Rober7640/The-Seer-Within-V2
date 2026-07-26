---
name: evelyn-tarot
description: "Write the next Evelyn Cross TAROT daily email(s) end to end — long-form reading → canonical AWeber HTML → hosted card hero → soft sell to /evelyn — at the quality bar of the proven first batch. Use when the user says: write the next tarot email, draft N tarot emails, make the [card] email, continue the Evelyn tarot emails, convert a tarot draft to HTML. Audience = the warm AWeber list (~59k), ~95% love. This is the TAROT program (NOT the notebook-sketch one — that's evelyn-daily). Gold standard: docs/aweber/evelyn-tarot-emails/{ace-of-cups,death,two-of-cups}.html. Strategy: memory evelyn-tarot-pivot."
---

# /evelyn-tarot — write the next tarot AWeber email

The operator front-door for the Evelyn **tarot** daily-email program: warm AWeber list `theseerwithin_free` (~59k) → genuinely-worth-opening long-form reading → **soft sell to the `/evelyn` open chat field**. This is what the 59k effectively opted into (a reading), and the `day*` tarot sends converted 1.5–9%. Do not reinvent — clone the proven batch. Engine = this recipe + five repo assets:

- **Gold-standard send files:** `docs/aweber/evelyn-tarot-emails/{ace-of-cups,death,two-of-cups}.html` (+ the markdown drafts `docs/aweber/evelyn-tarot-emails-batch1.md`). Clone their voice, depth, structure, HTML.
- **Canonical HTML design:** `docs/aweber/evelyn-cross-emails/evelyn-day13-original-design.html` — **white · Helvetica 16px #333 · "Seer Within" banner · blue `#0000ff` underlined links · gray `#DEE0E8` <hr>**. NOT `templates/email-template.html` (dark/gold; unused exploration).
- **Deck art:** `docs/aweber/tarot-images/<slug>.png` (full 78-card deck + `index.json`).
- **Asset tool:** `node docs/aweber/evelyn-tarot-emails/host-card.cjs <slug>` — optimizes the card PNG → <200KB JPEG, uploads to S3 `evelyn/tarot/<slug>.jpg`, verifies GET 200.
- **State:** `docs/aweber/evelyn-tarot-emails/STATE.md` — cards used, the state each served, the tomorrow-hook chain, no-repeat.

## Operating mode (locked)
Write long-form copy → render into the canonical HTML → host the card → **human review gate before any AWeber send**. One send file per email at `docs/aweber/evelyn-tarot-emails/<slug>.html`. No auto-send.

## Audience (load first)
One woman, **~95% love**, in three states — A *"is it him?"* (uncertain) · B *"when's he coming?"* (waiting) · C *"will I love again?"* (bereft). Pick the card to serve a state; the **"for the one who…" segments** speak to all three in one email. Widen ~1 email in 4 to the *whole woman* (worth, solitude, courage) so the love thread never flattens.

## The locked structure (per email, ~900–1,200 words)
ekphrasis (slow card-image description) → **name the card + its essence** → turn to the reader → symbol/number substance → **"for the one who…" segments** (the three states) → one **do-today practice** → CTAs → tomorrow-hook → "— Evelyn".

## Copy rules / voice / guardrails
- **Curiosity subject** — tease the turn, don't state the lesson.
- **Mechanism, not sentiment** (the heart): every email teaches a real reframe + a practice. Never bare reassurance ("your love is coming, dear").
- **Voice:** Evelyn — warm, kitchen-table, "dear" ~6–8×, ellipses.
- **Fate guardrail:** tendencies, never a named man or a date. **Christianity-free** (no saints/scripture/God; tarot/fate/intuition only).

## The 2-CTA open-field pattern (soft sell → /evelyn)
`/evelyn` is an **open "what's on your mind" field** — so CTAs invite *typing*, not "come."
- **MID CTA** — before the "for the one who…" segments, **themed to the card**, tagged `&cta=mid` (e.g. *"…tell me what ended, in whatever words come"*).
- **END CTA** — after the `<hr>`, the open-field invite: *"…tell me what's on your mind, and we'll take it from there."*
- Both are **inline blue-bold links** (no buttons), soft + low-friction. For max message-match, **mirror the field's real placeholder text** (check the lander if unsure). More callouts in `evelyn-tarot-emails-batch1.md` review history.

## HTML render (clone the batch-1 files exactly)
white bg · Helvetica 16px #333 · Seer Within banner · blue underlined links · gray `<hr>` · hidden preheader → **pre-frame line → linked card hero (`width:240`, `evelyn/tarot/<slug>.jpg`) → body → mid CTA → segments → practice → `<hr>` → end CTA → "— Evelyn" → 140 Broadway / Unsubscribe footer**. **Top HTML comment carries Subject + Preheader + CTA link** for the AWeber paste.

## Link scheme
`https://www.theseerwithin.com/evelyn/?utm_source=aweber&utm_medium=seerwithin_free&utm_campaign=<slug>&bucket=love` (+ `&cta=mid` on the mid CTA).

## Run (per email)
1. Pick the card from STATE (next under-served state; the deck reads as a journey — each email's tomorrow-hook names the next). Ask if unclear.
2. Write the long-form copy (structure + rules above).
3. `node docs/aweber/evelyn-tarot-emails/host-card.cjs <slug>` → hosts the hero.
4. Render the send file → `docs/aweber/evelyn-tarot-emails/<slug>.html` (clone batch-1).
5. Update `STATE.md` (card, state served, tomorrow-hook).
6. **Present for review; AWeber paste/schedule only after approval.**

## Inputs
- **card(s)** / **count.** If unspecified, pick the next card serving an under-served state. Batch 1 (done): `ace-of-cups` (waiting), `death` (bereft), `two-of-cups` (uncertain).
