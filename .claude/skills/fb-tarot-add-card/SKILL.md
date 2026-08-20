---
name: fb-tarot-add-card
description: "Use when adding a new tarot 'decode-him card' lander to the /fb-tarot quiz-bridge funnel — the media buyer drops a card-strip image into fb-tarot/ and this builds the lander from it. The skill READS the supplied image: it detects whether the cards are FACE-DOWN (backs, drawn on reveal) or FACE-UP (visible cards, chosen), identifies the card(s), and populates that card's details + the reveal, written to the Natural Tarot-Cut (seven cuts folded into four registry beats; the read ANSWERS). A 'lander' in fb-tarot = one deck registry entry on the EXISTING /fb-tarot funnel, NOT a new page/route/component. It then applies all edit points in order and keeps the two un-synced tarot rosters (client DECKS + server TAROT_CARD_VOCAB, plus the routes.ts validDecks) in sync so the chat handoff doesn't 400. Use when asked to: add a tarot/decode-him card lander, build a tarot card concept from an image, wire up a new /fb-tarot quiz, populate a drawn tarot card's reading. For new QUESTIONS on decks that already exist (no new art), use fb-tarot-hooks instead."
---

# fb-tarot-add-card — build a tarot "decode-him card" lander from a supplied image

## What this is (and what it is NOT)

The `/fb-tarot` "decode-him card" funnel is a SEPARATE route/funnel from `/fb-palm`, but it is
**registry-driven** exactly the same way: a **deck** is one card concept (a strip of A/B/C cards + their
reveals), read from a single config object by URL param (`?deck=<id>`). Adding a deck is **NOT** a new
page, route, component, or funnel — the `/fb-tarot` funnel foundation already exists (`TarotBridge.tsx`,
the routes in `App.tsx`, the server reflect path, the fixed price). You add **one `CardSetConfig` entry +
strip art + one server vocab mirror + one validator entry**, deploy, and it's live.

- The tarot funnel is the **"reads-HIM" exception**: a palm sign reads HER hand; a tarot pull legitimately
  reads another person (is he honest / coming back / how he feels / cheating). 🔄 **The guardrail changed
  on 2026-08-19 (the Natural Tarot-Cut).** It is no longer a global "tendency, never verdict" — the reads
  now ANSWER, and the bans are **DIRECTIONAL**: the half she came for is allowed, the half with a victim is
  not ("he loves you" yes, "he does not love you" no). Which door is shut is a **per-family** call, and the
  table that decides it is in `fb-tarot/docs/natural-tarot-cut.md` § "What may now be said, and what may
  not". `honesty` / `cheating` / `real-person` / `misled` keep BOTH doors shut — convicting a real man and
  vouching for one who may be defrauding her are both harms, and neither is the hopeful direction.
- Two axes: **deck** (which card set) × **hook** (the decode-him question: `cards-honest` / `cards-return`
  / `cards-feels` / `cards-cheating`). A deck supplies `reads[hook][card]`; unsupplied hooks fall back to
  `DEFAULT_HOOK`.
- The seeded deck is **`decode-him`** (face-down Sun / Moon / Tower). Use it as the shape template.

Design doc + card patterns: `fb-tarot/docs/PRD-tarot-bridge.md`. Concept board: `fb-tarot/docs/STATUS.md`.
Raw card art per concept: `fb-tarot/docs/decks/<deck>/`.

## Step 1 — READ the supplied card image (REQUIRED — this is the point of the skill)

The media buyer drops a card-strip image into `fb-tarot/docs/decks/<deck>/` (or hands you a path). Open it
with your vision and work through these determinations **strictly in this order** (this order is Boss's
requirement — do not collapse or reorder it):

### 1. FIRST — identify the card ORIENTATION (face-down vs face-up)
Before anything else, decide which of the two landers to build:
- **FACE-DOWN** (`facing: 'down'`) = the panels show identical card **backs**. She picks by intuition; the
  card is *drawn* on reveal (reveal verb: "you turned the …").
- **FACE-UP** (`facing: 'up'`) = the panels show distinct, visible card **faces**. She *chooses* a card she
  can see (reveal verb: "you chose the …").

This single decision changes the whole framing, so get it right first.

### 2. THEN — determine which cards to draw from: the fixed MAJOR ARCANA pool
The cards ALWAYS come from the **Major Arcana**, constrained to a **fixed, small starting pool** (Boss's
call — "five or six combinations" at the start). Do **NOT** invent cards outside this pool:

> **MAJOR ARCANA DRAW POOL (fixed, ~5–6 at launch):**
> **The Magician · The Fool · The Hangman (Hanged Man) · The Emperor · The Empress**
> *(The seeded `decode-him` deck's **Sun / Moon / Tower** are also Major Arcana and remain valid — but for
> NEW decks draw from the pool above unless the operator explicitly names another Major Arcana card.)*

- **FACE-DOWN:** you *assign* the deck's 3 cards (panels A/B/C) by drawing 3 from the pool. Three cards is
  fine (Boss: "if you only have three cards you can draw from, that's fine"). Pick 3 whose energies give
  three distinct, satisfying reads on the hook.
- **FACE-UP:** *identify* the visible card in each panel — it will be one of the pool cards. Match the art
  to the card; if a panel shows a Major Arcana card not in the pool, confirm it with the operator before
  adding it (this is how the pool grows past 6).

### 3. Populate each card's details
For every panel A/B/C, from tarot knowledge fill: the **card name**, its **upright energy** (one line), and
a one-line **archetype label** (`reading`). These become the `mark`/`reading` in the config.

### 4. Panel geometry
Confirm the strip is equal panels (one per option) and record its pixel **W×H** (so `optionStyle` crops each
card undistorted). If the panels are unequal, ask the buyer to re-crop to equal panels before wiring.

**Confirm your read back to the operator BEFORE writing any copy** — state, in order: (1) the **facing**,
(2) the **3 cards drawn from the pool**, (3) which is panel A/B/C. A misread orientation or card poisons
every read.

## Step 2 — Draft the reads (the creative core — draft + sign-off, never silent autogen)

🔄 Each read is **seven cuts folded into four registry beats** — beat 3 carries cuts 3-6 as one causal
chain (so / and / but / that's why). The full table, the four rules, and a worked example are in
**`fb-tarot/docs/natural-tarot-cut.md`**; read it before writing. In outline:

| Beat | Cuts | Job |
|---|---|---|
| 1 | 1 · the picture | one or two details **literally on the art file** — she is looking at the card |
| 2 | 2 · the bridge | her question back, plus the card in plain English |
| 3 | 3 the answer · 4 the hidden layer · 5 the contradiction · 6 the recognition | cut 3 ANSWERS her deepest fear flat, and the CARD is the warrant |
| 4 | 7 · the next mystery | narrow, and an **obstruction** — this is where the clearing ritual gets seeded |

🔴 The old shape refused to answer and certified her instead ("you were right about him"). That is what
changed: cut 3 answers, and cut 6 DESCRIBES what she has lived rather than ruling on her.

Draft `reads[hook][a|b|c]` for each hook the ad will run (default: all 4 = 12 reads for a 3-card deck).
Do NOT invent the copy silently — **invoke `/direct-response-copy`** to generate 2–3 alternatives per read,
present them for the operator to choose/edit, and only wire the signed-off version. Reuse the seeded
`decode-him` `cards-honest` copy in `tarotReads.ts` as the gold-standard example.

Hard guardrails (tighter than palm — you are reading a real person):
- **Check the family's row in the directional ban table first** — it decides which door is open. For
  `honesty` / `cheating` / `real-person` / `misled` both stay shut: never "yes, he's cheating" and never
  "he's telling you the truth" as fact.
- **Cut 6 describes, it does not announce.** "You were right about him" is the psychic ruling on her;
  "that's why he can feel close one moment and guarded the next" is her own week handed back.
- No specific date/name/guaranteed outcome; no exclamation marks, emoji, price/offer/urgency.
- 🔴 **Pick the prompt FRAME before drafting.** A hook in no frame set inherits decode-him, which tells the
  model "this reading is about HIM" — and it will invent a man who does not exist. See the method doc.
- "For Entertainment Purposes Only" carries extra weight here.

## Step 3 — The edit points (apply in this order)

| # | File | What to add |
|---|------|-------------|
| 1 | `client/public/tarot/<deck>-strip.png` | The equal-panel strip art (copy/convert the supplied image; served by Vite). |
| 2a | `client/src/content/tarotReads.ts` — `TarotDeck` union (~line 33) | Add `\| '<deck>'`. |
| 2b | `client/src/content/tarotReads.ts` — new `const` | Define `const NEW_DECK: CardSetConfig = { id, facing, eyebrow, instruction, beatNoun, continueCta, chooseMoment, strip:{url:'/tarot/<deck>-strip.png',width,height}, options, mark, reading, reads }`. Copy `DECODE_HIM` and rewrite. |
| 2c | `client/src/content/tarotReads.ts` — `DECKS` record | Add `'<deck>': NEW_DECK,`. |
| 3 | `server/lib/prompts.ts` — `TAROT_CARD_VOCAB` | Add `'<deck>': { mark:{…}, reading:{…} }`. The `a`/`b`/`c` **string values must match 2b exactly** (this is the roster the chat opener injects). |
| 4 | `server/routes.ts` — `validDecks` in the `tarotReflect` case | Append `"<deck>"`. If you introduced a NEW hook (beyond the 4), also add it to `validHooks` there AND to `HEADLINES` + `TAROT_QUESTION` (client) + `TAROT_HOOK_CONTEXT` + `TAROT_HOOK_TENDENCY` (server). |

**No pricing edit.** `/fb-tarot` is a single fixed price (`FIXED_FUNNEL_PRICES['v1-tarot']` = $35/$25) at the
FUNNEL level, so every deck is priced correctly automatically — there is no per-deck money-safety roster to
sync (unlike palm's `OTHER_SIGNS`).

## ⚠️ The un-synced rosters — the tarot version of the "v1-palm 400 bug"

The bridge renders from the client registry, so the lander will **look perfect even if you forget the
server side.** Two hand-maintained rosters are NOT imported from the registry — miss one and it fails:

- **`TAROT_CARD_VOCAB` in `server/lib/prompts.ts`** must mirror the client `mark`/`reading` string values.
  Drift → the Version-C opener injects a blank/mismatched card. (A missing deck falls back to `decode-him`
  vocab — no 400, but the wrong card.)
- **`validDecks` in `server/routes.ts`** (the `tarotReflect` case) must include the new deck — else Version
  C's chat handoff 400s `{error:"Invalid tarot params"}`. (Note: tarot has only ONE such list, vs palm's
  TWO — the tarot opener for Versions A/B is client-side, so only the interactive Version C hits the server.)

After editing, grep to prove the rosters match:

```bash
grep -n "'<deck>'" client/src/content/tarotReads.ts   # expect >=2 (union + DECKS)
grep -n "'<deck>'" server/lib/prompts.ts              # expect 1 (TAROT_CARD_VOCAB)
grep -n '"<deck>"' server/routes.ts                   # expect 1 (validDecks)
```

## Step 4 — Verify before calling it done

- [ ] `npx tsc --noEmit` passes (baseline error count unchanged) — catches a missing union member / malformed `CardSetConfig`.
- [ ] All three grep checks above return the expected hit counts.
- [ ] Smoke the lander like the seeded deck: with the app on localhost, open
      `/fb-tarot?hook=cards-honest&deck=<deck>` (Version A), `/fb-tarot/b?...` (B), `/fb-tarot/c?...` (C) at
      mobile width — the card strip renders, tapping a card reveals the read, and Version C's chat handoff
      must NOT 400 (`POST /api/chat action=tarotReflect`).
- [ ] Confirm pricing: a `POST /api/lead` with `funnel=v1-tarot` assigns `35_tarot` ($35/$25).
- [ ] Update `fb-tarot/docs/STATUS.md`: set the deck's status to ✅ BUILT with strip dims + the 3 cards.

## Going live

No route change. Once the edits ship in a normal deploy, the deck is live via the param. Hand the media
buyer the links (replace `<hook>`/`<deck>`):

```
A: https://www.theseerwithin.com/fb-tarot?hook=<hook>&deck=<deck>&seg=<seg>&utm_content=<ad>
B: https://www.theseerwithin.com/fb-tarot/b?hook=<hook>&deck=<deck>&...
C: https://www.theseerwithin.com/fb-tarot/c?hook=<hook>&deck=<deck>&...
```

The rest of the funnel (the ritual/energy product, upsell 1, upsell 2, checkout, Stripe) is the shared V1
engine and is **not** touched by this skill — only the lander + the opening reading are tarot-specific.

## Common mistakes

| Mistake | Consequence |
|---------|-------------|
| Misread the card facing (down vs up) | The reveal verb + whole framing is wrong ("you turned" vs "you chose"). Confirm facing FIRST. |
| `TAROT_CARD_VOCAB` drifts from the client `mark`/`reading` | Version C opener injects a mismatched/blank card. |
| Forgot the deck in `validDecks` | Version C chat handoff 400s; Versions A/B still look fine — the classic silent half-fix. |
| Added a route / component | Unnecessary — the `/fb-tarot` bridge is deck-agnostic. Don't. |
| Wrote a verdict the family's row bans ("yes he's cheating") | Compliance + brand failure. Check the directional ban table — which door is open is per-family. |
| Wrote a read that CERTIFIES her instead of answering ("you were right all along") | The pre-2026-08-19 failure. Cut 3 answers; cut 6 describes her week. |
| Codegen'd the reads with no sign-off | The seven cuts are the creative core; draft + get sign-off. |
