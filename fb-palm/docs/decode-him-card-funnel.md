# Decode-him Card Funnel — build-ready spec

A new **sign** (`cards`) on the existing `/fb-palm` funnel that reads **him** (a divination pick), unlocking the fully-raw *about-him* decode-him headlines the self-palmistry signs can't carry coherently ("Is he cheating on you?", "Is he lying to you?", "Will he come back?"). Backed by the data: the decode-him buckets are the **highest-ROAS** (`someone/*` $10–12/visit) and **rising** (BETRAYAL ▲▲, TRUST_TRUTH ▲) — see `headline-roadmap.md`.

## Why this is low-lift (fits the existing architecture)
The bridge UI, chat handoff, and A/B/C version split are **sign-agnostic** — they render strip + options + reads from the registry (PRD §6b). So the card device is **just a new `SignConfig`**: card art + him-reading reads + a "think of him" instruction. No new UI, no new routes; it reuses the entire bridge → chat → Stripe → upsell engine.

- The **self-frame rule** ("the hand reads *her*") is a **palm-sign** constraint. The `cards` sign is the **designated reads-him exception** — a card reading legitimately reads another person/situation.
- **The matrix is block-diagonal, not dense:** self-frame hooks × palm signs · decode-him hooks × the `cards` sign. The ledger's `target_signs` field already supports this (a list, not "all").

## The mechanic
- **Instruction:** *"Think of the man on your mind. Pull the card that calls you."*
- 3 face-down cards (A / B / C) on the ad + lander → tap → the reveal "turns over" the chosen card → reads him → opens into chat.
- Identical to the palm quiz's A/B/C tap-to-reveal; only the *subject of the pick* changes (a card, not her thumb).

## Art brief (manual — designer; per the "manual images" decision)
- `client/public/palm/card-strip.png` — **3 equal horizontal panels**, 3 ornate **face-down tarot cards** labeled A · B · C, on the cosmic/mystical brand palette. Same crop convention as palm strips (`background-position` thirds). Record pixel **W×H** for undistorted panels.
- Style: tarot-authentic, a little worn, mystical — consistent with the brand. **Identical backs** (she picks by pure intuition; the archetype is assigned in the reveal).
- FB ad creative = this strip + the headline baked on top (same as palm ads).

## The 3 card archetypes (sign-level, fixed across all hooks)
Like the palm archetypes (gathering/reaching/inward), the 3 cards carry fixed energies, re-applied to each question:
- **A — The Sun · what's in the light** (present, genuine, brighter than feared)
- **B — The Moon · what's veiled** (hidden, unsaid, uncertain — *not necessarily a lie*)
- **C — The Tower · what's shifting** (a crack, a change, something moving beneath)

Light / veil / crack gives a distinct, satisfying read on **any** decode-him question, while all three ultimately point to *"the truth is reachable — let me look closer with you."*

## Reveal structure (4-beat, adapted to read HIM)
1. **Name the card she drew** + its energy. ("You turned the Moon, dear — the card of what's kept in the half-light.")
2. **Affirm the pull** — her intuition chose it; she sees him. ("That's not random; your hand reached for the card that matches what you already sense.")
3. **The read — TENDENCY, never verdict.** Apply the card's energy as a *tendency*, affirming **her intuition**, never a flat accusation. ("The Moon doesn't mean he's lying — it means something's unsaid, and that feeling of 'there's more here' is accurate, not paranoia.")
4. **Open loop → chat.** ("Let me look closer at what he's keeping in the dark — and whether it's a threat, or just a wall.")

### Guardrail (tighter than palm — you're reading a real person)
- **Tendency, never verdict.** Never "yes, he's cheating." Read energy; withhold the answer into the chat.
- **Affirm HER, not an accusation of him.** The win is "your intuition is real," not "he's guilty."
- "Entertainment Purposes Only" carries more weight here. No claims about a named person's private acts. Same Appendix-B constraints (no date/name/guarantee, no exclamation/emoji/price).

## Batch 1 — the 4 hooks (one per decode-him bucket)
| Hook id | Headline (raw, about-him) | Bucket | EV/visit | conv% | Role |
|---|---|---|---:|---:|---|
| `cards-honest` | Is he being honest with you? | TRUST_TRUTH | $12.45 | 26.6% | best ROAS — lead-weight |
| `cards-return` | Will he come back? | REUNION | $11.46 | 24.2% | classic card pull |
| `cards-feels` | How does he really feel about you? | THEIR_FEELINGS | $10.70 | 22.8% | safest, card-native |
| `cards-cheating` | Is he cheating on you? | BETRAYAL | $7.80 | 17.3% | visceral / momentum wildcard |

Each needs `reads[hook][a|b|c]` (3 cards × 4-beat) — generate via the skill (`/fb-palm-hooks draft cards-honest`), reviewed at the gate. `someone/*` EV is cross-bucket-confounded → test, don't bank.

## Worked example — `cards-honest` ("Is he being honest with you?")
**A — The Sun**
1. "You turned the Sun, dear — the card of what stands in the light."
2. "Your hand didn't reach for it by accident; some part of you was hoping, and the Sun met the hope."
3. "The Sun doesn't promise he's flawless — it says what's between you is more in the open than your fear has let you believe; the warmth you feel from him is real, not performed."
4. "Let me look closer at the one shadow even the Sun doesn't reach — there's a single thing still unsaid…"

**B — The Moon**
1. "You turned the Moon, dear — the card of what's kept in the half-light."
2. "That's not random; your hand reached for the card that matches what you already sense."
3. "The Moon doesn't mean he's lying — it means something's unsaid between you, and that feeling of 'there's more here' is accurate, not paranoia."
4. "Let me look closer at what he's keeping in the dark — and whether it's a threat, or just a wall he hasn't learned to lower…"

**C — The Tower**
1. "You turned the Tower, dear — the card of what's already moving beneath the surface."
2. "Your hand chose the honest card, even though it's the hard one — that takes a kind of courage."
3. "The Tower doesn't mean ruin, dear — it means something between you is changing shape, and the unsettled feeling you've carried is you sensing the ground shift before it shows."
4. "Let me look closer at what's cracking — and what it's quietly clearing the way for…"

## Wiring (new sign, per PRD Appendix C)
1. **Art** → `client/public/palm/card-strip.png` (3 equal panels).
2. **Client** `SignConfig` for `cards` in `palmReads.ts`: instruction "Think of the man on your mind. Pull the card that calls you.", `beatNoun: "cards"`, strip dims, `options: [a,b,c]`, per-option `mark`/`reading` = the 3 cards (Sun/Moon/Tower), `reads[hook][option]`. Add `cards` to the `PalmSign` union.
3. **Server** `PALM_SIGN_VOCAB['cards']` (the 3 card marks/readings) + `validSigns += 'cards'`.
4. **Ledger** `target_signs` per hook: card hooks → `["cards"]` only; palm/self hooks → palm signs only (block-diagonal).
5. **Verify** `npx tsc --noEmit` + `npx vite build`; open `/fb-palm?hook=cards-honest&sign=cards` (A/B/C). Reuses bridge/chat/versions/monetization unchanged.

## Sequencing
Batch 1 = these 4 angles (find the *territory*) → scale the winner → Batch 2 = intent-layer A/B + sub-angles within it (open *"Is he cheating on you?"* vs presupposed *"Why do I feel like he's cheating?"*; *"Does he still love you?"* vs *"How does he really feel?"*).
