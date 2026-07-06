# A/B-splitting the Clearing Rewrite — design (fits the existing framework)

**Date:** 2026-07-05 · Design only — no code changed.
**Goal:** ship the clearing-theme rewrite (`08`) as a measured A/B, not a hard replace. Control = current
flow; Treatment = "clearing woven through." Let conversion decide.

## It fits the existing framework cleanly

This is the **same shape as the live V1 price split** (`resolveV1Price` / `V1_MAIN_EXPERIMENT_KEY`,
`experiments.ts:699`): a sticky per-subject assignment, funnel-scoped, that **when OFF (draft) returns
`applied:false` → falls back to current behaviour byte-identically** (`experiments.ts:256-301`). The only
difference: the price test's payload carries `mainCents`; here the arm **key** (`control` | `woven`) selects
which prompt/copy the code emits — the "structural test" flavor (`docs/ab-structural-test-pattern.md`), because
the variant is *prompt text*, which lives in code, not a dashboard value.

## The experiment

| Field | Value |
|---|---|
| **key** | `v1_clearing_theme_2026` |
| **arms** | `control` (variants[0] — today's flow) · `woven` (the 5 clearing changes from `08` **+ the redundant-loop removal** from `05`) |
| **subject** | 🔒 the `ab_vid` visitor cookie — minted at first page load, works **pre-email and for `?noemail=1`**. One subject basis for client + server. |
| **scope** | 🔒 `{ funnel: 'v1-palm' }` — **fb-palm only**. Cleaner read on the funnel flagged as derailing; smaller traffic slice (slower). |
| **payloads** | `{}` — the *key* drives the branch; the arm's text is in code. |
| **primary metric** | 🔒 `purchase_completed` (the $35 sale) — attributed **client-side at `/success`, same session** (see note). |
| **secondary (guardrail)** | `initiate_checkout` — logged too, for an earlier directional read while purchases accrue. |
| **status** | seeded **draft** ⇒ OFF ⇒ byte-identical until you **Start** in `/admin/experiments`. |

### 🔒 Locked decisions (2026-07-05) + ⚠️ power/attribution note

The chosen combination — **fb-palm scope × purchase_completed primary × ab_vid subject** — is the *cleanest to
interpret* but the *slowest and most attribution-sensitive*. Be aware:

- **Power:** fb-palm is a small traffic slice, and `purchase_completed` is a rarer event than a CTA click.
  Small slice × rare event ⇒ this needs **meaningful traffic/time** to reach significance. Set the split once
  and let it run; don't expect a fast read.
- **Attribution:** the framework's known gap is *server-side* visitor→purchase stitching (the Stripe webhook
  carries email, not `ab_vid`). **Mitigation:** attribute the purchase **client-side** — fire
  `trackABConversion('v1_pitch')` on the `/success` page, which still carries the first-party `ab_vid` cookie
  in the same browser session (V1 buys immediately after the pitch, so this is reliable). We do **not** rely on
  the webhook for the arm attribution. `initiate_checkout` is logged as a same-session guardrail so you're not
  blind while purchases accumulate.
- **If it's too slow:** widen `scope` to all V1 (`funnel:null`) or switch the primary to `initiate_checkout`
  later — both are config changes in `/admin/experiments`, no re-deploy.

## One arm assignment → both sides

The pitch spans server (LLM beats) + client (static pitch), so both must read the **same** arm. Resolve it
**once on the server** and hand it to the client — exactly how `priceDollars` already flows from `/api/lead`
into `userData` and then into the pitch.

```
ab_vid (cookie)
   │
   ├─(server) resolveClearingVariant(ab_vid, funnel)  ── mirrors resolveV1Price
   │        → userData.clearingVariant = 'control' | 'woven'
   │        → buildShadowSummaryPrompt / buildValueExplainPrompt branch on it   [changes 2,3,4,5]
   │        → logExposure when enrolled (the denominator)
   │
   └─(client) receives clearingVariant on the /api/lead (or /api/chat) response
            → handlePermission pitch copy branches on it                        [changes 1,5]
            → trackABConversion('v1_pitch') at the purchase CTA (BOTH arms)
```

Because a single server-resolved arm is echoed to the client, they can never desync (no independent
client bucketing).

## Where each of the 5 changes forks (control vs woven)

| # | Change (from `08`) | Side | control arm | woven arm |
|---|---|---|---|---|
| 1 | Name the ritual | client `useConversation.ts:1334` | current Step 3 | + "…an Energy Clearing Ritual" naming line |
| 2 | `shadowSummary` foreshadows clearable | server `prompts.ts:714` | "…just the diagnosis" | end line signals the block *can be cleared* |
| 3 | `valueExplain` echoes clearing | server `prompts.ts:949` | vision only | ties vision to "once this is cleared" |
| 4 | Un-orphan canonical copy | server `prompts.ts:325` | dead / unused | injected into the woven pitch |
| 5 | Canonical "clear" vocabulary | both | mixed verbs | standardized to CLEAR |
| 6 | **Remove redundant `DEEPENING_1` re-ask** (from `05`) | client `useConversation.ts` (`runReading1` + `handleEmailCapture`) | asks the concern **twice** (PALM_REFLECT + DEEPENING_1) | asks **once**, then reads immediately |

All six are bundled into the **single** `woven` arm (recommended — a psychic funnel won't have traffic to
power simultaneous micro-tests; test the *concept* first, decompose later if it wins).

**Change 6 scope:** applied to the **email path** (`handleEmailCapture`, the common case). The no-optin
(`?noemail=1`) branch resolves through `handleNameCapture`, which deliberately avoids stale state and can't
cleanly read the freshly-captured concern — so it keeps the normal flow (a follow-up if no-optin + palm C
turns out to matter). `runReading1` was extracted so the control/standard `DEEPENING_1` path stays
byte-identical.

## Implementation checklist (the framework's "five pieces")

1. **Variant text in code** — add the `woven` branches to `buildShadowSummaryPrompt`, `buildValueExplainPrompt`
   (server) and the `handlePermission` pitch block (client), each `if (clearingVariant === 'woven')`. Control
   path stays the exact current code.
2. **Resolver** — `resolveClearingVariant(abVid, funnel)` in `experiments.ts`, copy of `resolveV1Price` shape
   (returns `{variant, applied, enrolled}`; `applied:false` ⇒ 'control').
3. **Wire server** — in `/api/chat` (`routes.ts:394`) set `userData.clearingVariant` from the resolver;
   `logExposure` when `enrolled`. Echo the arm on the `/api/lead` response for the client.
4. **Wire client** — read `clearingVariant` into `userData`; branch the pitch; `trackABConversion('v1_pitch')`
   at the CTA (both arms, so control is counted).
5. **Register** — seed one **draft** in `server/scripts/migrateExperiments.ts`: `subjectType:'visitor'`,
   `scope:{funnel:null}`, `variants:[{key:'control'},{key:'woven'}]`, `conversion:{type:'event',
   name:'initiate_checkout'}`. Measurement is reused (`tallyEvent` → `/admin/experiments`).

## Safety & preview

- **OFF ⇒ byte-identical.** Draft ⇒ `applied:false` ⇒ `clearingVariant:'control'` ⇒ current flow verbatim
  (same guarantee the price split relies on).
- **Preview each arm without enrolling:** honor a dev-only `?clearing=woven` override on `/chat` so you can
  self-audit the treatment before Start (matches the `?mechanic=quiz` pattern).
- **Ramp rule:** set the split once and only ramp `woven` *up* (control listed first → "once woven, always
  woven"), per `experiments.ts:246-254`.

## The same mechanism generalizes

`userData.<x>Variant` + builder branch is reusable: the vague-questions rewrite (`06`/`07`) can run as its own
draft experiment (`v1_questions_2026`) on the identical plumbing — so you can test clearing and question-quality
independently (or sequentially) without new infrastructure.

## Decisions that change the wiring
1. **Scope** — all V1, or isolate to one funnel (e.g. fb-palm)?
2. **Subject** — `ab_vid` (universal, recommended) vs email (co-analyzes with the price split, but drops
   no-optin).
3. **Primary metric** — `initiate_checkout` (recommended, reliable) vs `purchase_completed`.
