# /fb-tarot — decode-him card landers · results report

**What this is:** a new **`/fb-tarot`** "tarot card" quiz-bridge funnel + a single image-driven skill
(**`fb-tarot-add-card`**). A media buyer drops a card-strip image in, and the skill reads it (face-up vs
face-down, which cards), then builds a working lander from it — reusing the existing chat → Stripe → upsell
engine unchanged. Every lander below was generated this way from Rio's card art.

> Take a pull of this branch and open the screenshots below to see each lander's full flow.

## How it works (same model as `/fb-palm`)
- Each **deck** = one card set (3 cards A/B/C). Each **hook** = the question in the headline.
- **The same deck answers many questions by changing one URL parameter** (`?hook=`). Copy + headline swap;
  the cards stay the same.
- Two kinds of hooks:
  - **decode-him** (`cards-honest` / `cards-return` / `cards-feels` / `cards-cheating`) — reads *him* as a
    **tendency, never a verdict**; affirms her intuition.
  - **self-frame** (`cards-love-again`) — reads *her* future and affirms the hopeful yes.
- Pricing: flat **$35 / $25** at launch (no split test), like the thumb-angle palm lander.

## Verification (every deck)
`tsc` clean (no new errors) · client builds · roster-sync checked · a Playwright flow test
(`tests/fb-tarot-flow.spec.ts`) walks the whole conversation and asserts: lander renders, card reveal shows,
the chat hand-off does **not** 400, no empty bubbles, no client errors, and the Meta pixel is blocked.

---

## Deck 1 — `arcana-mfh` · The Magician · The Fool · The Hanged Man
Built from `ZN_Tarot_Rio 6.png`. The ad ran the self-frame hook **"Will I love again?"**. Carries all 5 hooks.

**Try it:**
- `/fb-tarot?hook=cards-love-again&deck=arcana-mfh` — "Will I love again?"
- `/fb-tarot?hook=cards-honest&deck=arcana-mfh` — "Is he being honest with you?" *(same cards, decode-him)*

**Full flow:**

| 1. Lander | 2. Card reveal |
|---|---|
| ![lander](screenshots/arcana-mfh/01-lander.png) | ![reveal](screenshots/arcana-mfh/02-reveal.png) |

| 3. Chat hand-off | 4. After name | 5. Deepening reading |
|---|---|---|
| ![greeting](screenshots/arcana-mfh/03-chat-greeting.png) | ![name](screenshots/arcana-mfh/04-after-name.png) | ![reading](screenshots/arcana-mfh/05-reading.png) |

---

## Deck 2 — `arcana-eef` · The Emperor · The Empress · The Fool
Built from `ZN_Tarot_Rio 7.png`. The ad ran the decode-him hook **"Is he being honest with you?"**. Carries all 5 hooks.

**Try it:**
- `/fb-tarot?hook=cards-honest&deck=arcana-eef` — "Is he being honest with you?"
- `/fb-tarot?hook=cards-love-again&deck=arcana-eef` — "Will I love again?" *(same cards, self-frame)*

**Full flow:**

| 1. Lander | 2. Card reveal |
|---|---|
| ![lander](screenshots/arcana-eef/01-lander.png) | ![reveal](screenshots/arcana-eef/02-reveal.png) |

| 3. Chat hand-off | 4. After name | 5. Deepening reading |
|---|---|---|
| ![greeting](screenshots/arcana-eef/03-chat-greeting.png) | ![name](screenshots/arcana-eef/04-after-name.png) | ![reading](screenshots/arcana-eef/05-reading.png) |

---

## Deck 3 — `return-mhf` · The Magician · The Hanged Man · The Fool  *(face-down)*
Built from `ZN_Tarot_Rio 1.png`. The ad ran the decode-him hook **"Will he come back?"** (`cards-return`).
This is the first **face-down** deck built from real card-back art — she pulls by intuition and the card is
*drawn* on reveal ("you **turned** the …"). Because the backs are identical, the 3 cards were **drawn** from
the Major Arcana pool (Magician · Hanged Man · Fool). Carries all 4 decode-him hooks.

**Try it:**
- `/fb-tarot?hook=cards-return&deck=return-mhf` — "Will he come back?"
- `/fb-tarot?hook=cards-feels&deck=return-mhf` — "How does he really feel about you?" *(same cards)*

**Full flow:**

| 1. Lander | 2. Card reveal |
|---|---|
| ![lander](screenshots/return-mhf/01-lander.png) | ![reveal](screenshots/return-mhf/02-reveal.png) |

| 3. Chat hand-off | 4. After name | 5. Deepening reading |
|---|---|---|
| ![greeting](screenshots/return-mhf/03-chat-greeting.png) | ![name](screenshots/return-mhf/04-after-name.png) | ![reading](screenshots/return-mhf/05-reading.png) |

*Plain-text transcript: `screenshots/return-mhf/transcript.txt`.*

---

## FACE-UP on the three signed-off headlines — `arcana-mfh` (2026-07-30)

**Full report: [`arcana-mfh-faceup-report.html`](arcana-mfh-faceup-report.html)** (+ `.pdf`).

The face-up deck answering the same three questions the signed-off face-down deck answers.
**Nothing was built for this** — the deck already existed and was live. The headline is keyed by
`hook`, not by deck (`TAROT_HEADLINES`, `client/src/content/tarotReads.ts`), so a face-up lander on
`?hook=cards-honest` renders the *identical* headline string the face-down deck did. This run proves
that, and it surfaced two copy lines that needed fixing.

**Try it** — same three cards, one URL parameter apart:
- `/fb-tarot/c?hook=cards-honest&deck=arcana-mfh` — "Is he being honest with you?"
- `/fb-tarot/c?hook=cards-return&deck=arcana-mfh` — "Will he come back?"
- `/fb-tarot/c?hook=cards-feels&deck=arcana-mfh` — "How does he really feel about you?"

> 🔴 `&deck=` is **load-bearing**. Strip it from a face-up ad URL and the visitor lands on the
> face-**down** deck's card backs.

| Hook | Panel tapped → card | Screenshots |
|---|---|---|
| `cards-honest` | a → the Magician | [`screenshots/arcana-mfh-cards-honest/`](screenshots/arcana-mfh-cards-honest/) |
| `cards-return` | b → the Fool | [`screenshots/arcana-mfh-cards-return/`](screenshots/arcana-mfh-cards-return/) |
| `cards-feels` | c → the Hanged Man | [`screenshots/arcana-mfh-cards-feels/`](screenshots/arcana-mfh-cards-feels/) |

A different panel per hook, so the three runs cover all three cards as well as all three headlines.
Face-up is deterministic (the shuffle is gated on `facing`), so each asserts its exact card.

**Copy parity vs the signed-off face-down deck** — compared per *card*, not per panel (the decks
order their panels differently), normalising only the intended "you chose" / "you turned" difference:
**6 of 9 verbatim identical, 3 cosmetic, 0 compliance gaps.**

**Two copy fixes this run found** (both now pinned by tests in `tests/fb-tarot-card-draw.spec.ts`):

1. **A line that predicted a return** — `arcana-mfh` / `cards-return` / the Fool. The 7/28 sign-off
   rewrote this beat to be conditional; the face-down deck got the new wording and the face-up deck
   never did. Was *"what comes back often comes back as a new beginning"* → now the signed-off
   *"if something does come of this, it begins fresh…"*.
2. **A rejected accusation still live** — `arcana-eef` / `cards-honest` / the Fool. Was
   *"someone careless with the truth more than cruel with it"* → now the approved
   *"what's unsaid here may be unexamined rather than hidden"*.

---

## Trust hooks on BOTH facings + the `angle` grouping (2026-07-30)

Three trust/authenticity headlines, running on the face-down **and** face-up decks:

| Headline | Hook | Face-down URL | Face-up URL |
|---|---|---|---|
| Is he really who he says he is? | `cards-who-he-is` | `?hook=cards-who-he-is` | `?hook=cards-who-he-is&deck=arcana-mfh` |
| Is he the real person, or just a picture? | `cards-real-person` | `?hook=cards-real-person` | `?hook=cards-real-person&deck=arcana-mfh` |
| Am I being misled? | `cards-misled` | `?hook=cards-misled` | `?hook=cards-misled&deck=arcana-mfh` |

> 🔴 The face-down links need **no** `&deck=` (`return-mhf` is `DEFAULT_DECK`). The face-up links
> **must** carry it — strip it and a face-up ad lands on face-DOWN backs.

Face-down reads are bespoke; face-up reads are **ported card-for-card** (same three cards, so the
same question on the same card gives the same read — only `You turned` → `You chose` and the panel
letters differ). Remapped by CARD not panel, verified 9/9 identical.

Screenshots: `screenshots/return-mhf-cards-{who-he-is,real-person,misled}/` (face-down) and
`screenshots/arcana-mfh-cards-{who-he-is,real-person,misled}/` (face-up).
Full sign-off report: [`trust-hooks-report.html`](trust-hooks-report.html) (face-down section).

**The `angle` property** rolls hooks up into families so they can be compared as groups —
`decode-him` · `trust` · `self-frame` — on every tarot PostHog event, plus a `tarot_angle` person
property for the server-side `purchase_completed`. In PostHog that is one `angle = trust` filter
instead of listing three hook values. ⚠️ The angle follows the **effective** hook: a hook with no
reads on the resolved deck falls back to `DEFAULT_HOOK`, so `?hook=cards-love-again` on a clean URL
correctly reports `decode-him` (`return-mhf` has no self-frame reads).

---

## Landers built so far

| Deck | Cards | Facing | Ad hook | All hooks? | Status |
|---|---|---|---|---|---|
| `arcana-mfh` | Magician · Fool · Hanged Man | face-up | `cards-love-again` | ✅ 5/5 | ✅ built |
| `arcana-eef` | Emperor · Empress · Fool | face-up | `cards-honest` | ✅ 5/5 | ✅ built |
| `return-mhf` | Magician · Hanged Man · Fool | face-down | `cards-return` | 4/4 decode-him | ✅ built |
| `decode-him` (seed) | Sun · Moon · Tower | face-down | `cards-honest` | ✅ 5/5 | ✅ built (placeholder art) |

*Reads are drafts pending sign-off. Card readings live in `client/src/content/tarotReads.ts`; the skill is
`.claude/skills/fb-tarot-add-card/`; design doc `fb-tarot/docs/PRD-tarot-bridge.md`.*

## Regenerate these screenshots
```bash
# 1 — isolated sandbox: local Postgres on :5433, every outbound credential emptied
node scripts/make-sandbox-env.mjs
DOTENV_CONFIG_PATH=.env.sandbox npx tsx server/index.ts

# 2a — the FACE-UP 3-headline report (arcana-mfh × honest/return/feels)
npx playwright test --config=playwright.fb-tarot-faceup.config.ts

# 2b — every deck in the spec (also re-runs the sections above)
npx playwright test tests/fb-tarot-flow.spec.ts

# 3 — the fast no-LLM guards: shuffle, reveal integrity, hand-off, signed-off copy
npx playwright test --config=playwright.fb-tarot-draw.config.ts
```

⚠ Do **not** run these via the default `playwright.config.ts` — its `webServer` block starts
`npm run dev`, which loads the real `.env` (**live** Stripe key + the **shared production**
database). The configs above deliberately have no `webServer`, so you start the sandbox yourself.

> A deck that appears more than once in `fb-tarot-flow.spec.ts` (same cards, different `?hook=`)
> must set `slug` on its entry, or each run overwrites the previous one's screenshots and this
> README renders the wrong hook's shots.
