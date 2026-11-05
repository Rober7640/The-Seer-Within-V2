# /fb-tarot handover — four new Version C landers (2026-11-05)

Branch `fb-tarot-4-hooks`, cut from `origin/development`. For a developer picking this up cold.
Background on the funnel: `fb-tarot/docs/HANDOVER-2026-08-26.md` and `PRD-tarot-bridge.md`.

## 1. What this adds

Four new question hooks on the existing `return-mhf` deck (face-down Magician / Hanged Man / Fool).
There are no new pages, routes or art. All four run on **Version C** (the LLM route): she taps a card, sees the
card line plus an opener question, types an answer, and `buildTarotReflectPrompt` writes 2–3 short replies.

| Hook | Ad headline | Frame (server Set) |
|---|---|---|
| `cards-end-same-way` | Why do my relationships always end the same way? | `LONELINESS_TAROT_HOOKS` |
| `cards-give-more` | Why do I give more than I get in love? | `SOULMATE_KEYWORD_TAROT_HOOKS` |
| `cards-marry-more-than-once` | Will I marry more than once? | `SOULMATE_AGEBAND_TAROT_HOOKS` |
| `cards-more-affection` | Why do I need more affection than my partner does? | **`PARTNERED_TAROT_HOOKS` (new)** |

Ad URLs **must** use `/fb-tarot/c?hook=<hook>`. All four are in `TAROT_C_EXEMPT_HOOKS`, so `/c` serves C
instead of 302'ing to `/b`.

### The new partnered frame

`cards-more-affection` is asked by a woman with a real, current partner, but the question is about her.
Without its own frame it would fall through to decode-him ("This reading is about HIM") and the model
would speak for the partner. The frame is tested **right after money, ahead of every other branch**, in
both the `frameLine` and `guardLine` ternaries (`server/lib/prompts.ts`).

🔴 **Why the guard is strict:** two buyers in the VOC pull were being worked by a romance scammer who had
stepped into a marriage that had gone without affection. The guard never points her outside the
relationship, never repeats "someone online" back to her, never speaks for the partner's health or
desire, and never rules on staying or leaving. Details: `fb-tarot/docs/drafts/rewrites/_voc-4hooks-2026-11-05.md`.

### Version C openers (`TAROT_QUESTION`)

The operator decided (2026-11-05) that **each opener restates her question first.** Version C skips
cut 2 ("You asked why…") and the headline only appears on `TarotBridge`, so without the restatement
she has nothing tying the chat back to the ad.

- **end-same-way:** You asked why your relationships always end the same way. Before I look closer, tell me… how did the last one end, and what about it felt all too familiar?
- **give-more:** You asked why you give more than you get in love. Before I look closer, tell me… what's something you always give that never seems to come back?
- **marry-more-than-once:** You asked if you'll marry more than once. Before I look closer, tell me… what would you want a marriage to feel like now?
- **more-affection:** You asked why you need more affection than your partner does. Before I look closer, tell me… what kind of affection do you wish you had more of?

⛔ **Do not apply this restatement to the ~49 older Version C landers.** The operator said "not yet".

Known side effect: if the LLM call fails, the client serves the written read (`tarotReflectFallback` =
`reads[card].slice(1)`), which starts at cut 2, so she sees her question restated twice in a row. This was accepted.

## 2. Files changed

| File | Change |
|---|---|
| `client/src/content/tarotReads.ts` | `TarotHook` union, `TAROT_HOOKS`, `HEADLINES`, `TAROT_QUESTION`, tap line, `return-mhf` reads (7 cuts folded to 4 beats), angle arrays: new `SOULMATE_ENERGY_ADJACENT_HOOKS`, `SOULMATE_AGEBAND_ADJACENT_HOOKS`, `PARTNERED_HOOKS` (~line 1585), new `partnered` `TarotAngle`, `angleForHook` |
| `server/lib/prompts.ts` | `TAROT_HOOK_CONTEXT` + `TAROT_HOOK_TENDENCY` entries; Set memberships; new `PARTNERED_TAROT_HOOKS`; `partnered` branch in both ternaries |
| `server/routes.ts` | `tarotReflect` `validHooks` (~line 750) |
| `server/lib/tarotRedirect.ts` | `TAROT_C_EXEMPT_HOOKS` +4 (49 → 53) |
| `server/lib/tarotRedirect.test.ts` | count 53, plus a URL-level test for the four |
| `scripts/lander-registry.mts` | `partnered` added to `FRAMES` |
| `fb-tarot/docs/lander-registry.md` | **generated** (`npx tsx scripts/lander-registry.mts`). It also picked up 6 older commit-vocab hooks that had never been regenerated in. Never hand-edit it. |
| `fb-tarot/docs/drafts/rewrites/*.json` | source copy for the four hooks plus the C-side package (`_c-side-4hooks-2026-11-05.json`) |
| `fb-tarot/docs/drafts/rewrites/_voc-4hooks-2026-11-05.md` | the VOC findings (trimmed quotes, no names, no PII) |

Not changed on purpose: `shared/soulmateLanderHooks.ts`. That list drives the AWeber list and the Stripe bump,
and adding `cards-give-more` / `cards-marry-more-than-once` to it is an **operator decision** that is still open.

## 3. Verification done

- `npx vitest run server/lib/tarotRedirect.test.ts`: 31/31 pass.
- `npx vitest run tests/tarot- --testTimeout=300000 --maxWorkers=2`: **21 failed / 634 passed.** The same 21
  fail on `origin/development` (commitment, money-block, soulmate-after-loss/ageband/keyword/where). This branch adds no new failures.
- `tsc`: 46 errors before and after. No new ones.
- Copy gates: `node scripts/check-draft.mjs` reported no problems, and `npx tsx scripts/check-collisions.mts` came back clear.
- Live local smoke on `claude-sonnet-5-5` (prod's `default_conversation_model`): six VOC-shaped answers per hook,
  POST `/api/chat {action:"tarotReflect"}`. All four frames hold. On `claude-sonnet-4-5` the model still repeats some of her
  labels back to her, so these landers depend on prod staying on 5.5.
- `GET /fb-tarot/c?hook=<each>` → 200. An older non-exempt hook still 302s to `/b`.

## 4. Still owed before this goes live

1. **Guard file**: `tests/tarot-<family>-copy.test.ts` with `@roster` markers for the four hooks, plus
   tripwire rows in `scripts/guard-tripwire.mjs`, then `node scripts/guard-tripwire.mjs <family>` to prove the guard bites.
2. `npx tsx scripts/skill-smoke.mts --family <name> --all-in-guard`. Note that `scripts/skill-smoke.mts` was
   recovered locally and is not in git (see §6).
3. Operator decision: whether to add Q2/Q3 to `shared/soulmateLanderHooks.ts`.
4. Merge path: `fb-tarot-4-hooks` → `development` → `Production`. Ads go on `/c` URLs only after Production is deployed.

## 5. 🔴 Live bug found along the way (not fixed here; needs its own branch)

`callClaude` (`server/lib/claude.ts:56`) disables thinking only when `model === 'claude-sonnet-5'`. Prod runs
`claude-sonnet-5-5`, so adaptive thinking spends most of the `max_tokens: 1000` budget. The reply comes back
truncated or empty, the parse fails, and the server returns the generic `getFallbackMessages()` (claude.ts:93:
"I sense something shifting in your energy…"). The client (`client/src/hooks/useConversation.ts`
`handleTarotReflect`, ~975–1006) treats any non-empty array as a real reply, so she gets filler instead of
the written read. About 7 of 38 replies in local tests. This affects **every live Version C lander**, not just these four,
and probably palm/read too.

Suggested fix, pending operator go:
- (a) disable thinking for the whole `claude-sonnet-5*` family, or raise `max_tokens`;
- (b) on the client, treat the generic fallback as a failure so `tarotReflectFallback` serves the written read.

To size it on prod, grep Railway logs for `Failed to parse Claude response`. Prod `conversations` doesn't store bot messages, so the DB can't show it.

## 6. Local setup notes

- Worktree: `~/tsw-hooks4`. ⛔ Don't work in the OneDrive repo folder (it has uncommitted work on another branch, and OneDrive has wiped files there before).
- `.env` (gitignored): local Postgres `seer_local`, `PORT=5077`, `V1_CONVERSATION_MODEL=claude-sonnet-5-5`.
- **Not committed:** the VOC tooling (`.claude/skills/v1-funnel-live-audit/scripts/{voc-by-theme,voc-by-hook,diagnose-live,plan-live}.mjs`,
  `lib/live-db.mjs`), `scripts/skill-smoke.mts`, and a local change to `audit-live.mjs`. These were recovered from
  `~/Documents/onedrive-rescue` because they are in no clone or git history. Committing them properly is a separate decision.
  `scripts/wire-4hooks-2026-11.mjs` was a one-off that applied the wiring; the diff is the record.
