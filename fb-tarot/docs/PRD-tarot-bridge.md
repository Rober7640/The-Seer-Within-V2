# /fb-tarot "decode-him card" quiz-bridge — design doc

A SEPARATE route/funnel from `/fb-palm` (its own `v1-tarot` funnel, `TarotBridge` lander, and Stripe
"- TAROT" suffix), but it **reuses the shared chat → Stripe → upsell engine unchanged** — only the lander
and the opening reading are tarot-specific. Built alongside the `fb-tarot-add-card` skill, which reads a
supplied card image and scaffolds a lander from it.

## Why a card device (vs a palm sign)
Palm signs read HER hand (the self-frame rule). Decode-him headlines — *is he honest / will he come back /
how does he really feel / is he cheating* — are irreducibly about HIM, which the self-palmistry signs
can't carry coherently. A card pull is the designated **"reads-him" exception**: a drawn/chosen card
legitimately reads another person, so it unlocks the highest-ROAS decode-him angles.

## The skill's ordered logic (Boss's requirement — strict order)
The skill works through the image in this exact order — do not reorder:
1. **FIRST identify the ORIENTATION** — face-down vs face-up (see the two patterns below).
2. **THEN determine which cards to draw from** — always the **Major Arcana**, constrained to a **fixed,
   small starting pool** ("five or six combinations" at launch):
   > **MAJOR ARCANA DRAW POOL (fixed, ~5–6):** The Magician · The Fool · The Hangman · The Emperor · The
   > Empress. *(The seeded `decode-him` Sun / Moon / Tower are also Major Arcana and stay valid; new decks
   > draw from this pool unless the operator explicitly names another Major Arcana card.)*
   Three cards per deck (A/B/C) is fine — the reveal draws/assigns 3 from the pool.
3. **THEN populate** each card's name + energy + archetype label, and draft the reads.

## The two card patterns (the skill detects which from the image)

- **FACE-DOWN** (`facing: 'down'`) — identical card **backs**. She picks by intuition; the 3 cards (A/B/C)
  are *drawn* on reveal, **assigned from the fixed Major Arcana pool above**. Reveal verb: "you turned the
  …". The seeded `decode-him` deck is face-down: **A — The Sun** (what's in the light) · **B — The Moon**
  (what's veiled) · **C — The Tower** (what's shifting).
- **FACE-UP** (`facing: 'up'`) — distinct, visible card **faces** she can see and *chooses*. The skill
  reads each visible card (one of the pool — **Magician / Fool / Hangman / Emperor / Empress**) and
  populates its details. Start scope: ~5–6 combinations. Reveal verb: "you chose the …".

## Content model (deck × hook × card → reads)
Everything is registry-driven, not UI. The registry is `DECKS` in `client/src/content/tarotReads.ts`:
- **deck** — one card concept: strip art, `facing`, 3 card archetypes (`mark` + `reading`), and the reads.
- **hook** — the decode-him question: `cards-honest` / `cards-return` / `cards-feels` / `cards-cheating`.
  Sets the headline + the wound a read mirrors.
- **card** — the tapped option `a`/`b`/`c` (drawn for face-down, chosen for face-up).
- `reads[hook][card]` — a `string[]` of the 4-beat reveal.

## The 4-beat decode-him reveal (reads HIM as a TENDENCY)
1. **Name the card she drew/chose** + its energy.
2. **Affirm the pull** — her intuition chose it; she sees him.
3. **The read — TENDENCY, never verdict** — apply the card's energy as a leaning that affirms HER
   intuition, never a flat accusation of him.
4. **Open loop → chat** ("let me look closer…").

## Guardrails (tighter than palm — reading a real person)
- **Tendency, never verdict.** Never state he is lying / cheating / faithful / returning as fact.
- **Affirm HER, not an accusation of him.** The win is "your intuition is real."
- No date/name/guaranteed outcome; no exclamation marks, emoji, price/offer/urgency. "For Entertainment
  Purposes Only" carries extra weight.

## The A/B/C version split (mirrors /fb-palm)
Route `/fb-tarot` → Version A (static reveal card + Continue), `/fb-tarot/b` → B (reveal delivered as chat
messages), `/fb-tarot/c` → C (interactive — the card line + one open question, the LLM reads her answer via
`POST /api/chat action=tarotReflect`, falling back to the static reveal). All three share the S1 card quiz
+ S2 reading beat and everything after name capture.

## Wiring / where things live
- Client lander: `client/src/pages/TarotBridge.tsx`; content: `client/src/content/tarotReads.ts`.
- Routes + funnel: `client/src/App.tsx` (`/fb-tarot*`), `shared/funnelConfig.ts` (`v1-tarot`).
- Chat handoff: the tarot branches in `client/src/hooks/useConversation.ts` (gated on `parseTarotParams`).
- Server Version-C reflect: `server/routes.ts` (`tarotReflect` case) → `generateTarotReflect`
  (`server/lib/claude.ts`) → `buildTarotReflectPrompt` + `TAROT_CARD_VOCAB` (`server/lib/prompts.ts`).
- Pricing: `FIXED_FUNNEL_PRICES['v1-tarot']` = flat $35/$25 (no split test at launch).

## Adding a card concept
Use the **`fb-tarot-add-card`** skill (`.claude/skills/fb-tarot-add-card/SKILL.md`) — it reads the supplied
image, drafts the reads for sign-off, and applies the edit points, keeping the two un-synced rosters
(client `DECKS` + server `TAROT_CARD_VOCAB`, plus `validDecks` in `routes.ts`) in sync.
