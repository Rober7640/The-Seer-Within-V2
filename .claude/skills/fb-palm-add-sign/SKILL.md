---
name: fb-palm-add-sign
description: "Use when adding a new fb-palm lander / palm 'sign' / ad concept to the /fb-palm quiz-bridge funnel — a new physical 'tell' (thumb crease, finger lock, hand size, etc.) that a Facebook ad quizzes. A 'lander' in fb-palm = one registry entry, NOT a new page/route/component. Starts by asking which sign to build (offers the next pending concept from STATUS.md), gathers the spec, then applies all edit points in order and keeps the three un-synced server rosters (validSigns ×2, PALM_SIGN_VOCAB, the pricing-safety OTHER_SIGNS) in sync so the chat handoff doesn't 400 and the never-overcharged guarantee stays tested. Use when asked to: add an fb-palm lander/sign, build the next palm ad concept, wire up a new palm quiz, ship a pending new-ads concept."
---

# fb-palm-add-sign — wire a new palm "sign" into the /fb-palm funnel

## What a "sign" is (and what it is NOT)

The `/fb-palm` "quiz bridge" is fully **registry-driven**. A **sign** is one physical "tell" a Facebook ad quizzes (thumb crease, how you lock your fingers, hand size…). Adding a sign is **NOT** a new page, route, component, or folder — `PalmBridge.tsx` and the chat handoff render *everything* from a single config object read by URL param (`?sign=<id>`). You add **one `SignConfig` entry + strip art + two server mirrors**, deploy, and it's live.

Two independent axes: **sign** (the physical tell) × **hook** (the love question: `soulmate-timing` / `already-met` / `love-again` / the thumb-only test hooks). A sign supplies `reads[hook][option]`; unsupplied hooks fall back to `DEFAULT_HOOK`.

Canonical status board + per-concept notes: `fb-palm/docs/new-ads/STATUS.md`. Raw ad art per concept: `fb-palm/docs/new-ads/<concept>/`.

## Step 1 — Ask which sign to build (REQUIRED — do this first)

1. Read `fb-palm/docs/new-ads/STATUS.md` — the Concepts table lists every concept with its `Sign id`, option count, and status (✅ built · ⬜ pending · ⛔ parked).
2. **Ask the operator which sign to build**, offering the pending/parked concepts by name (use AskUserQuestion). If they name a brand-new tell not in the table, take it.
3. Collect the full spec before editing anything:
   - **`id`** (kebab-case, e.g. `finger-gap`) and whether it's a **`-alt`** art-only variant of an existing sign (if so, it *reuses the twin's reads + vocab* — see the -alt shortcut below).
   - **Options**: 2 (`a`,`b`) or 3 (`a`,`b`,`c`).
   - Per option: the **`mark`** (the concrete tell named in sentence 1) and the **`reading`** archetype label (e.g. "the guarded heart").
   - **UI copy**: `eyebrow`, `instruction`, `beatNoun`, `continueCta`, `chooseMoment`.
   - **Strip art**: an equal-panel horizontal PNG (one panel per option) + its pixel `width`/`height`.
   - **Which hooks** get reads (default: the 3 love hooks × options = 9 reads for 3-option, 6 for 2-option), each a **4-beat build** in Evelyn's voice (see the beat spec in the `palmReads.ts` header comment / PRD Appendix B).

Do not invent the `reads` copy silently — it's the creative core. Unless the operator supplies final copy, **invoke `/direct-response-copy` to generate 2–3 alternatives** for the `mark`/`reading` beat-1 lines and the `reads`, present them for the operator to choose/edit, and only wire in the signed-off version. The `mark` (beat 1) repeats as the opening sentence of every read for that option, so clarity there is worth an extra pass — run any phrasing the operator flags as awkward back through `/direct-response-copy` for cleaner, parallel alternatives.

## Step 2 — The six edit points (apply in this order)

| # | File | What to add |
|---|------|-------------|
| 1 | `client/public/palm/<id>-strip.png` | The equal-panel strip art (static asset, served by Vite). |
| 2a | `client/src/content/palmReads.ts` — `PalmSign` union (~line 37) | Add `\| '<id>'`. |
| 2b | `client/src/content/palmReads.ts` — new `const` | Define `const NEW_SIGN: SignConfig = { id, eyebrow, instruction, beatNoun, continueCta, chooseMoment, strip:{url:'/palm/<id>-strip.png',width,height}, options, mark, reading, reads }`. Copy the nearest-shape existing sign (`THUMB` for 3-option, `PALM_SIGNS` for 2-option) and rewrite. Set `columns: 1` only if the panel art is landscape (see the `HAND_SIZE` note). **2-option signs:** the client keeps a `c: ''` placeholder in `mark`/`reading`. |
| 2c | `client/src/content/palmReads.ts` — `SIGNS` record (~line 877) | Add `'<id>': NEW_SIGN,`. |
| 3 | `server/lib/prompts.ts` — `PALM_SIGN_VOCAB` (~line 782) | Add `'<id>': { mark:{…}, reading:{…} }`. The `a`/`b`(`/c`) **string values** must match 2b exactly. For a 2-option sign, **omit the `c` key** here (do NOT copy the client's `c: ''` placeholder — existing 2-option entries have only `a`/`b`). |
| 4 | `server/routes.ts` — `validSigns` (**TWO** places: ~line 468 `palmOpener` **and** ~line 481 `palmReflect`) | Append `"<id>"` to **both** arrays. Leave `validThumbs` (`["a","b","c"]`) untouched — a 2-option sign's `c` is filtered client-side by `parsePalmParams`. |
| 5 | `server/lib/priceVariantPool.test.ts` — `OTHER_SIGNS` array (~line 47) | Append `'<id>',` (unless the sign IS `thumb`). This roster asserts every non-thumb sign NEVER gets the $55/$35 sliding close — a **money-safety** guarantee. The sign functions without this edit (the sliding arm is thumb-scoped, so a new sign already falls through to the $35/$25 control), but omitting it ships the sign with that never-overcharged guarantee **untested**. |

## ⚠️ The un-synced rosters — the #1 way this breaks (the "v1-palm 400 bug")

The bridge UI is registry-driven, so the lander will **render perfectly even if you forget the server side**. There are THREE hand-maintained sign lists that are NOT imported from the registry — miss one and it fails silently:

- **`validSigns` in `server/routes.ts` appears TWICE** (both the `palmOpener` and `palmReflect` cases). Update **both** or the chat handoff 400s. Updating one is the classic silent half-fix — Version C (`palmReflect`) breaks while A/B look fine, or vice-versa.
- **`PALM_SIGN_VOCAB` in `server/lib/prompts.ts`** must mirror the client `mark`/`reading` string values (see Point 3 for the 2-option `c`-key caveat). Drift → the opener injects a blank/mismatched mark.
- **`OTHER_SIGNS` in `server/lib/priceVariantPool.test.ts`** — the money-safety roster (Point 5). Doesn't break rendering; leaves the "never overcharged" guarantee untested.

After editing, grep to prove the rosters match:

```bash
grep -n '"<id>"' server/routes.ts               # expect TWO hits
grep -n "'<id>'" server/lib/prompts.ts          # expect ONE (or the -alt alias line)
grep -n "'<id>'" server/lib/priceVariantPool.test.ts   # expect ONE (skip if <id> is thumb)
```

## The `-alt` shortcut (art-only variant of an existing sign)

If the new sign is just alternate art for an existing concept (realistic-vs-abstract A/B of the *visual*, same copy), it **reuses the twin's reads and vocab**:
- In `palmReads.ts`, its `SignConfig` points `reads` at the twin's reads (or duplicate them) — no new copy.
- In `prompts.ts`, alias it after the map: `PALM_SIGN_VOCAB['<id>'] = PALM_SIGN_VOCAB['<twin>']` (see the `thumb-curve-alt` / `finger-length-alt` lines ~876-877).
- Still add to the `PalmSign` union, `SIGNS`, and **both** `validSigns` arrays.

## Step 3 — Verify before calling it done

- [ ] `npx tsc --noEmit` (or the project typecheck) passes — catches a missing union member / malformed `SignConfig`.
- [ ] All three grep checks above return the expected hit counts.
- [ ] `node --test server/lib/priceVariantPool.test.ts` passes — confirm the generated `sign="<id>" NEVER sees the sliding close` case exists and is green (proves Point 5 landed).
- [ ] Smoke it like the existing fb-palm specs (`tests/fb-palm-handsize-smoke.spec.ts`, `tests/v1-landers-smoke.spec.ts`, configs `playwright.fb-palm-*.config.ts`) — walk `?sign=<id>` through **A card · B chat · C reflect-fallback** at mobile width; the chat handoff must NOT 400.
- [ ] Update `fb-palm/docs/new-ads/STATUS.md`: if the sign is a brand-new tell (no row yet), **add** a Concepts-table row for it first; then tick its per-sign checklist and set status ✅ **BUILT** with strip dims + archetype notes.

## Going live

No route change. Once the five edits ship in a normal deploy, the sign is live via the param. Hand the media buyer the links (replace `<hook>`/`<id>`):

```
A: https://www.theseerwithin.com/fb-palm?hook=<hook>&sign=<id>&seg=<seg>&utm_content=<ad>
B: https://www.theseerwithin.com/fb-palm/b?hook=<hook>&sign=<id>&...
C: https://www.theseerwithin.com/fb-palm/c?hook=<hook>&sign=<id>&...
```

## Common mistakes

| Mistake | Consequence |
|---------|-------------|
| Updated only ONE `validSigns` array | One version (A/B vs C) 400s; the other works — looks "mostly fine". |
| `PALM_SIGN_VOCAB` drifts from client `mark`/`reading` | Opener injects a mismatched/blank mark; read reads wrong. |
| Added a route / component | Unnecessary — the bridge is sign-agnostic. Don't. |
| Codegen'd the `reads` copy | The 4-beat reads are the creative core; draft + get sign-off, don't autogenerate. |
| Strip panels unequal width | Tap targets misalign; crop to equal panels (one per option). |
