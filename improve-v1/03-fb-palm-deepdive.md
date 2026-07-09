# FB-Palm Funnel — Code-vs-Docs Deep Dive

**Audited:** 2026-07-05 · **Scope:** the `/fb-palm` "palm-reading quiz bridge" that
continues a Facebook palm-quiz ad into the shared V1 psychic-reading chat.

**What it is (one line):** a param-driven quiz lander (`PalmBridge`) that replays the
ad's "According to your {sign}" quiz, delivers a 4-beat palm "read," and hands off to the
existing V1 Evelyn chat (`/fb-palm/chat`) pre-seeded to the `love` topic.

**Primary code:**
- `client/src/pages/PalmBridge.tsx` — the lander (3-phase UI).
- `client/src/content/palmReads.ts` — single source of truth (signs, hooks, reads, composed copy).
- `client/src/hooks/useConversation.ts` — the chat handoff (greeting + Version-C reflect).
- `server/lib/prompts.ts` (L725–913) — server palm vocab + LLM prompts.
- `server/routes.ts` (L451–476) — `palmOpener` / `palmReflect` API actions.
- `server/lib/claude.ts` (L153–162) — `generatePalmOpener` / `generatePalmReflect`.
- `shared/funnelConfig.ts` (L38) — `v1-palm` funnel attribution.

**Primary docs:** `fb-palm/docs/PRD-quiz-bridge.md`, `fb-palm/docs/hook-pipeline.md`,
`fb-palm/docs/headline-roadmap.md`, `fb-palm/docs/decode-him-card-funnel.md`,
`fb-palm/ledger/hook-ledger.json`, `.claude/skills/fb-palm-hooks/SKILL.md`.

---

## 1. The quiz / bridge flow

### 1.1 Routes (`client/src/App.tsx` L177–183)
| Route | Renders | Version |
|---|---|---|
| `/fb-palm` | `PalmBridge` | **A** (default, no suffix) |
| `/fb-palm/b` | `PalmBridge` | **B** |
| `/fb-palm/c` | `PalmBridge` | **C** |
| `/fb-palm/chat` | `ChatPage` (shared V1) | handoff target |
| `/fb-palm/welcome1`, `/welcome2`, `/success` | shared V1 upsell/success | reused unchanged |

Version is derived from the path suffix, **not** a query param
(`PalmBridge.tsx` L41–42). Hook + sign are query params.

### 1.2 The lander — 3 phases (`PalmBridge.tsx` L33, L69, L129–197)
`type Phase = 'pick' | 'reading' | 'result'`

1. **`pick` (Screen 1)** — eyebrow (`cfg.eyebrow`, e.g. "According to Your Thumb"),
   headline = `HEADLINES[hook]` (the verbatim ad question), instruction, and a
   2- or 3-up tappable art grid cropped from one strip PNG via `background-position`
   (L57–67, L144–156). Trust line: "100% Private · 2,400+ readings" (L161).
2. **`reading` (Screen 2)** — 1.5s beat: Evelyn avatar + "Evelyn is reading your
   {beatNoun}… / Hold still, dear." (L98–106, L166–177). Nothing is fetched; the read is
   already local.
3. **`result` (Screen 3 — Version A only)** — the tapped option's card image +
   `cardRead(sign, hook, thumb)` (the 4 sentences joined) + CTA button `cfg.continueCta`
   (L179–197). **Versions B and C skip this screen** and auto-navigate straight to chat
   after the reading beat (L98–103).

**Beat count:** A = 3 lander screens → chat; B/C = 2 lander screens → chat.

### 1.3 Transition to chat (`PalmBridge.tsx` L75–80)
`goToChat(option)` fires PostHog `palm_read_continue`, then navigates to
`funnelPath('/chat')` (= `/fb-palm/chat`) with query `?hook={hook}&thumb={option}`,
appending `&sign=` only when non-default and `&v=` only for B/C. Original thumb links
stay byte-identical (invariant #1 in every doc). On mount the lander also clears
`localStorage['seer_conversation']` (L87–89) so a stale session can't suppress the
version's opener.

---

## 2. Sign / Hook matrix — built vs documented

### 2.1 SIGNS (the physical "tell" axis) — `palmReads.ts` L29–39, L760–771

| # | `sign` id | Opts | Archetypes (A · B · C) | Strip (w×h) | In code | In ledger | In PRD §6b |
|---|---|---|---|---|:--:|:--:|:--:|
| 1 | `thumb` (default) | a/b/c | gathering · reaching · inward | thumbs-strip 972×460 | ✅ | ✅ live | ✅ |
| 2 | `finger-lock` | a/b/c | leading · mirrored · guarded | 1041×587 | ✅ | ✅ live | ✅ |
| 3 | `finger-shape` | a/b/c | steady · dreaming · discerning | 959×725 | ✅ | ✅ live | ✅ |
| 4 | `palms` | a/b/c | even · giving · deep | 1080×551 | ✅ | ✅ live | ✅ |
| 5 | `palm-signs` | a/b | joined · rising | 800×493 | ✅ | ✅ live | ✅ |
| 6 | `thumb-curve` | a/b | constant · open | 946×580 | ✅ | ✅ live | ✅ |
| 7 | `thumb-curve-alt` | a/b | *(inherits #6)* | 1080×519 | ✅ | ✅ live | ✅ |
| 8 | `hand-size` | a/b | sheltering · daring | 2160×406 | ✅ | ✅ live | ✅ |
| 9 | `finger-length` | a/b/c | magnetic · harmonious · certain | 919×474 | ✅ | ✅ live | ✅ |
| 10 | `finger-length-alt` | a/b/c | *(inherits #9)* | 969×653 | ✅ | ✅ live | ✅ |
| 11 | `cards` | a/b/c | **Sun · Moon · Tower (reads HIM)** | *(none)* | ❌ | ⚠️ `to-build` | ❌ |

**Signs: 10 in code, all live, art present** (`client/public/palm/*.png` — all 10 strips
exist). The 2 `-alt` signs share their sibling's reads via a spread
(`palmReads.ts` L584–588, L754–758) and their vocab via alias (`prompts.ts` L836–837).
**`cards` is spec'd in depth** (`decode-him-card-funnel.md`) and seeded in the ledger with
`status:"to-build"`, `w:null,h:null` (no art) — **but it exists in zero code**
(`palmReads.ts` `PalmSign` union L29–39 omits it; `prompts.ts` `PALM_SIGN_VOCAB` omits it;
`routes.ts` `validSigns` L454/L467 omits it).

### 2.2 HOOKS (the love-question axis) — `palmReads.ts` L25, L41, L49–53

| `hook` id | Headline | In code | Ledger status | Frame |
|---|---|:--:|---|---|
| `soulmate-timing` (default) | "When is my soulmate coming?" | ✅ | live | self |
| `already-met` | "Have you already met your soulmate?" | ✅ | live | self |
| `love-again` | "Will I love again?" | ✅ | live | self |
| `why-him` | "Why can't you let him go?" | ❌ | draft / reads `todo` | self-bridged |
| `done-alone` | "Are you done being alone?" | ❌ | draft / reads `todo` | self |
| `heart-safe` | "Is he ever going to commit?" | ❌ | draft / reads `todo` | self-bridged |
| `tired-waiting` | "Tired of waiting for love?" | ❌ | draft / reads `todo` | self |
| `is-he-true` | "Am I being lied to?" | ❌ | **review** / reads `review` (thumb drafted) | self-bridged-I |
| `sense-lying` | "Why do I feel like he's lying to me?" | ❌ | **review** / reads `review` (thumb drafted) | self-bridged-I |
| `door-open` | "Is it really over?" | ❌ | draft / reads `todo` | self-bridged |
| `right-one` | "Is he really the one — or are you settling?" | ❌ | draft / reads `todo` | self-bridged |
| `cards-honest` | "Is he being honest with you?" | ❌ | draft / reads `todo` | decode-him-card |
| `cards-return` | "Will he come back?" | ❌ | draft / reads `todo` | decode-him-card |
| `cards-feels` | "How does he really feel about you?" | ❌ | draft / reads `todo` | decode-him-card |
| `cards-cheating` | "Is he cheating on you?" | ❌ | draft / reads `todo` | decode-him-card |

**Hooks: 3 built in code, 15 in the ledger** (`hook-ledger.json` L31–48). All 12 new hooks
are absent from `HEADLINES`/`PALM_HOOKS`/`PALM_QUESTION` (client) and
`PALM_HOOK_PAIN`/`validHooks` (server, `routes.ts` L455/L468). This is **consistent with
their ledger `reads_status` (todo/review) and the pipeline's "no code before the review
gate" invariant** (`hook-pipeline.md` L29, L82) — i.e. planned backlog, not silent drift.
Only `is-he-true` / `sense-lying` have any drafted copy, and only for the `thumb` sign
(`drafted_signs:["thumb"]`), living in `fb-palm/ledger/drafts/*.draft.md`, never wired.

### 2.3 Built read matrix
Every one of the **10 signs × 3 hooks** cells is fully populated with a 4-sentence build
(`palmReads.ts` `reads` blocks). 2-option signs correctly leave option `c` empty
(`''`/`[]`, e.g. L455–475). So the live addressable space is **10 signs × 3 hooks × 3
versions = 90 lander variants** (the ledger/PRD "full matrix" ambition is far larger once
the 12 hooks + `cards` sign land).

---

## 3. Handoff to chat — does the chat USE the palm context?

**Mechanism: URL query params, NOT `quizMemory`.** The bridge encodes `hook / thumb / sign /
v` on the `/fb-palm/chat` URL; `useConversation` reads them via
`parsePalmParams(window.location.search)` (`palmReads.ts` L798–814, `useConversation.ts`
L299, L364, L426). **`server/lib/quizMemory.ts` is unrelated** — it is the *V2 multi-persona*
numerology pre-session intake (topic/feeling/outcome, imported by `chatEngine.ts` L16); it
plays no part in the V1 fb-palm handoff.

### 3.1 Greeting divergence (`useConversation.ts` L294–324)
`startGreeting` branches on `parsePalmParams`:
- **Version A** → one static line `greetingA(sign, thumb)` (`palmReads.ts` L825–828):
  "Mmm… {reading label}. I felt it {chooseMoment}…" then asks her name. The **actual
  4-beat read was already shown on the lander card** (S3), not re-delivered in chat.
- **Version B** → `openerB(sign, hook, thumb)` (L832–837): the 4 sentences as message
  bubbles + name ask. **Fully static, client-side — no server call.**
- **Version C** → `openerCStart` (L841–843): mark line + one open question
  (`PALM_QUESTION[hook]`), enters state `PALM_REFLECT`, input enabled.

### 3.2 Version C reflect — the only live LLM moment (`useConversation.ts` L425–459)
`handlePalmReflect` stores her answer as `userData.concern` (L427), POSTs
`{action:'palmReflect', palmSign, palmHook, palmThumb, input, userData}` to `/api/chat`
(L433–444). Server validates enums → `generatePalmReflect` → `buildPalmReflectPrompt`
(`prompts.ts` L883–913) injects `hook_pain` + sign-specific `mark`/`reading` + her answer,
Claude returns `{messages:[…]}`. **On any failure it falls back to
`palmReflectFallback`** (static sentences 2–4, L456) so the funnel never stalls. Then name
capture → love deepening.

### 3.3 After name capture — palm context is FRONT-LOADED, then dropped
`handleNameCapture` (palm branch, L364–405) sets `bucket = hookToBucket(hook)` which
**always returns `'love'`** (`palmReads.ts` L778–780), skips the bucket picker, and joins
the **standard** V1 love deepening (`DEEPENING_1` → `reading1`/`reading2` → crisis → pitch).
From that point on **the sign archetype and hook are never re-injected** — later reading
steps read only `userData.bucket`/`userData.concern`. So:
- The rich palm read is used **only at the opener/reflect beats.**
- Carryover into the monetization conversation = `bucket:'love'` (all versions) +
  `userData.concern` (**Version C only** = her typed answer).
- Version A's read never even enters the chat transcript (it lives on the lander card).

This matches the PRD's stated design ("everything after name capture is the same existing
deepening", PRD §4 L55) — but it is a **persuasion-continuity gap**: the "gathering heart"
identity the visitor just bonded with evaporates the moment the standard script resumes.

---

## 4. Tracking / attribution

**Funnel identity** (`shared/funnelConfig.ts` L38): `param:"v1-palm"`, `prefix:"/fb-palm"`,
Stripe **`productSuffix:" - PALM"`**, AWeber **`aweberSuffix:"-palm"`**, PostHog
**`posthog:"palm"`**. `price_variant` tokens like `35_palm` / `35_palm_u47` map back via
`funnelParamFromPriceVariant` (L61–76).

**PostHog events** (carry `sign` + `hook` + `thumb` + `version`):
- `palm_bridge_view` (`PalmBridge.tsx` L93 — also `seg`, `utm_content`)
- `palm_thumb_select` (L110)
- `palm_read_continue` (L76)
- downstream `lead_captured` / checkout events attach `sign` (`useConversation.ts`
  L564–572, L1389–1397).

**Email/CRM segmentation:** AWeber tags suffixed `-palm` + `AWEBER_LIST_ID_PALM`
(`routes.ts` L231, L246); Kit tag `palm` (`server/lib/kit.ts` L16); Resend segment
`RESEND_SEGMENT_ID_FB_PALM` (`server/lib/resendAudience.ts` L27, L37).

**Facebook Pixel — note:** `/fb-palm` **intentionally has NO dedicated pixel entry**
(`shared/fbPixelConfig.ts` L41–44); it falls through to the `default` pixel by design, so
palm FB conversions are not pixel-segregated the way `/fb` and `/fb2` are.

---

## 5. Drift findings

### DRIFT-1 — `palmOpener` LLM path is dead code (code-level)
The server fully wires an LLM opener: `routes.ts` L451–462 (`case "palmOpener"`),
`claude.ts` L153–157 (`generatePalmOpener`), `prompts.ts` L844–879
(`buildPalmOpenerPrompt`). **The client never calls it** — `grep 'palmOpener' client/`
returns nothing. Versions A and B use *static* client reads (`greetingA` / `openerB`); only
Version C hits the server (`palmReflect`). No doc marks the opener as static-only, and the
prompt is elaborate but unreachable. **Recommendation:** either delete the `palmOpener`
action + `buildPalmOpenerPrompt` + `generatePalmOpener`, or wire a version behind it — right
now it is maintenance surface (kept in sync with the sign registry) that runs never.

### DRIFT-2 — docs describe a matrix ~5× larger than shipped (docs ahead of code)
`hook-pipeline.md` L3 and `SKILL.md` L18 frame the sign axis as "complete" and the pipeline
as scaling hooks across "all 8 unique-read signs"; `decode-him-card-funnel.md` +
`headline-roadmap.md` describe a whole decode-him `cards` device and 4 card hooks. **Reality:
3 of 15 ledger hooks and 10 of 11 ledger signs are in code; the `cards` sign, all 4 card
hooks, and 8 self-frame hooks are unbuilt.** This is *tracked* (ledger statuses todo/review/
to-build) so it is honest backlog, not silent rot — but any reader of the skill/PRD alone
would overestimate what is live. The `is-he-true`/`sense-lying` drafts sit at the review gate
with **only the `thumb` sign drafted** (1 of 8), so even those are far from "wired".

### DRIFT-3 — doc-internal count inconsistencies (docs vs docs)
- `hook-pipeline.md` L3 says **"9 signs built"**; code has **10** SignConfigs (8 unique +
  2 alt). Stale count.
- `PRD-quiz-bridge.md` L194 says addressable space = **"11 signs"**, but its own §6b
  "shipped" catalog (L158–170) lists **10**, and code has **10**. The "11" silently counts
  the unbuilt `cards` sign. PRD L10 TL;DR meanwhile says "the 10 in the Signs catalog".
- **Dual source-of-truth for sign build-status:** PRD §6b L156 still points to
  `fb-palm/docs/new-ads/STATUS.md` as the build-status doc, and that file **still exists**,
  while `hook-ledger.json` meta (L3) declares it *absorbs/supersedes* STATUS.md. Two
  competing status docs remain in the tree.

### DRIFT-4 — palm context not threaded past the opener (code vs intent)
Per §3.3, the sign/hook archetype is used only at the opener/reflect; the rest of the
conversation is generic love deepening with no sign re-injection. Only Version C's typed
answer survives (as `userData.concern`); Version A's actual read never enters chat at all.
Not a doc contradiction (PRD §4 L55 says post-name-capture is the shared deepening), but a
notable **conversion-design gap** vs the amount of persona-bonding the read sets up.

### DRIFT-5 — "quiz memory" naming collision (clarification, not a bug)
The task brief's hint to check `quizMemory` is a red herring for this funnel:
`server/lib/quizMemory.ts` serves the **V2** numerology chat intake, not fb-palm. The V1
palm handoff carries state purely through **URL query params** (`parsePalmParams`), plus a
one-line `localStorage['seer_conversation']` *clear* on lander mount
(`PalmBridge.tsx` L88). No palm data is persisted server-side pre-purchase.

---

## 6. Invariant check (all HOLD in code)
1. **Absent `sign` → `thumb`** — `DEFAULT_SIGN` fallback in `PalmBridge` L48 and
   `parsePalmParams` L807; original links byte-identical. ✅
2. **Client `SIGNS` ↔ server vocab in sync** — the 10 signs match across `palmReads.ts`
   `SIGNS`, `prompts.ts` `PALM_SIGN_VOCAB` (+ alt aliases), and `routes.ts` `validSigns`.
   ✅ (both sides equally *omit* `cards`, so still consistent).
3. **Chat only diverges when BOTH valid `hook` and valid tapped option arrive** —
   `parsePalmParams` returns `null` otherwise (L804, L809), so every non-palm funnel is
   provably unaffected. ✅
