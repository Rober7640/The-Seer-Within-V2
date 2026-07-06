# fb-palm Derailment — PROVEN Live (root cause + fix)

**Date:** 2026-07-05 · **Status:** confirmed by live `/api/chat` replay (not just static read)
**Symptom (operator, manual):** the fb-palm funnel "derails / becomes watered-down / vague."
**Evidence:** [`evidence/fb-palm-derail-transcript.txt`](./evidence/fb-palm-derail-transcript.txt) · reproduce with [`evidence/fb-palm-derail-replay.mjs`](./evidence/fb-palm-derail-replay.mjs) (`node …replay.mjs`, dev server on :5000).

---

## 1. What we proved

The funnel spends **3 beats** (ad → lander card → chat opener) building a vivid, specific palm identity —
*"your thumb is a trident, three lines rising to one — **the gathering heart**."* Then, the moment the
standard V1 deepening resumes, that identity **vanishes** and Evelyn delivers a generic love reading
that is **word-for-word interchangeable with a visitor who never touched the palm funnel at all.**

Replay scenario: Version C, `sign=thumb`, option `a` (trident → "the gathering heart"), `hook=soulmate-timing`.

| Beat | Palm params passed? | Palm-signal tokens in output | Character of the reading |
|---|:--:|---|---|
| **palmReflect** | ✅ yes | `gathering, mark, three lines, converging` | **Specific** — "your mark — three lines rising to one point. The gathering heart. Paths converging." |
| **reading1** | ❌ no | `mark` *(only as "it left marks" — coincidence)* | Generic love — walls, "loved too deeply", blocked path |
| **reading2** | ❌ no | **— none —** | Generic — repeating pattern, "give too much then it fades" |
| **crisisReveal** | ❌ no | **— none —** | Generic — inherited shadow, "did your mother/grandmother carry this fear?" |

**The control clincher:** a plain `/`-love visitor with the *identical* concern and **no palm involvement**
gets a `reading1` that is nearly verbatim the palm `reading1`:

```
PALM reading1 : "your heart has walls built for protection, not isolation.
                 You've loved deeply before, perhaps too deeply."
CONTROL       : "your heart has walls built for protection, not isolation.
                 You've loved deeply before, perhaps too deeply."
```

If the palm read added any lasting personalization, these would differ. They don't. **That equivalence *is*
the "watered-down" feeling** — the visitor was promised a reading of *their thumb* and, ~2 messages in, is
getting the house generic-love script.

---

## 2. Root cause (code)

The palm identity has **no channel** into the deepening. Three facts combine:

1. **`hookToBucket()` flattens every palm hook to `'love'`** — `client/src/content/palmReads.ts:778-780`.
   All hook/sign specificity is discarded into a single bucket label.

2. **The palm name-capture branch persists only `bucket`** — `client/src/hooks/useConversation.ts:366-367`
   (`updateUserData({ bucket })`). `palmSign / palmHook / palmThumb` and the resolved
   archetype (`mark`, `reading`) are **never written to `userData`**. Worse, the branch's own deepening
   intro at **L374-376** is already generic ("I can feel warmth radiating from your heart") — the drop
   starts one beat *before* `reading1`.

3. **The reading/crisis generators are palm-blind by signature** — `server/routes.ts:430-449`
   (`reading1/2`, `futureValidation`, `crisisReveal/Cost`, `shadowSummary`) are all called as
   `generateX(userData, input)`. Only `palmOpener`/`palmReflect` (`routes.ts:451-476`) ever receive
   `palmSign/palmHook/palmThumb`. The prompt builders (`buildReading1Prompt` … `prompts.ts:374+`) compose
   from `userData.bucket` + `userData.concern` + `subBucket` — so even if the params existed they'd be
   ignored.

Net: palm context lives only inside the `palmReflect` call and dies there. Everything downstream sees
`bucket:'love'` + (Version C only) `userData.concern`. Versions A and B carry **nothing** — A's read never
even enters the chat transcript. This is the `03-fb-palm-deepdive.md` **DRIFT-4** finding, now proven live.

> This is not a doc contradiction — `PRD-quiz-bridge.md §4` explicitly says "everything after name capture
> is the shared deepening." The design *intended* the drop. But it's a **persuasion-continuity gap**: the
> funnel front-loads a strong, specific bond and then abandons it exactly when the pitch is being built.

---

## 3. The fix (small surface, high leverage)

Give the palm identity a channel into `userData`, then have the existing prompt builders honor it. **No
`/api/chat` contract change** — the builders already receive `userData`.

**(a) Persist palm identity at name-capture** — `useConversation.ts:366-367`, extend the payload:
```ts
const bucket = hookToBucket(palm.hook)
const cfg = SIGNS[palm.sign]                       // already imported for openers
updateUserData({
  bucket,
  palmSign:    palm.sign,
  palmHook:    palm.hook,
  palmThumb:   palm.thumb,
  palmReading: cfg.reading[palm.thumb],            // e.g. "the gathering heart"
  palmMark:    cfg.mark[palm.thumb],               // e.g. "a trident, three lines rising to one"
  subBucket:   hookToSubBucket(palm.hook),         // seed from hook, don't leave it to luck
})
```
And make the L374-376 intro reference the mark instead of the generic "warmth" line.

**(b) Honor it in the prompt builders** — `prompts.ts` `buildReading1Prompt` / `buildReading2Prompt` /
`buildFutureValidationPrompt` / `buildCrisisRevealPrompt` / `buildCrisisCostPrompt`: when
`userData.palmReading` is set, prepend a small directive, e.g.
```
This soul came to you through a palm reading. Their mark: {palmMark} — {palmReading}.
Weave this identity naturally through your reads; call back to "{palmReading}" at least
once per phase so the thread from the palm reading never breaks.
```
Because every generator already takes `userData`, this is additive and touches no signatures.

**(c) (optional) Retire the dead `palmOpener` path** (`routes.ts:451`, `prompts.ts:844-879`,
`claude.ts:153`) — it's elaborate, kept in sync with the sign registry, and never called (DRIFT-1).

**Effort:** ~1 client edit + 5 small prompt-builder edits + a `hookToSubBucket` map. Re-run
`evidence/fb-palm-derail-replay.mjs` to confirm palm-signal tokens now persist through reading2/crisis and
that the palm transcript **diverges** from the control.

---

## 4. Scope note — which funnels this affects

Only **fb-palm**. root / fb / fb2 / gdn never carry palm params (`parsePalmParams` returns `null`), so they
are provably unaffected — they were *designed* to run the generic bucket flow and don't derail from it.
fb-palm is the only funnel that sets up a specific identity it then fails to honor. The fix is contained to
the palm branch + a `userData.palm*`-guarded block in the shared builders, so it cannot regress the others.
