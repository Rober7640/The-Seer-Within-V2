# /fb-read — developer handover

**1 September 2026.** The third quiz-bridge ad funnel, alongside `/fb-palm` and
`/fb-tarot`. She clicks a Facebook ad, lands on a photograph of a tea cup, names
what she sees in the leaves, gets a reading, and is handed into the existing V1
chat and the $35 close.

> 🔴 **NOT SHIPPED.** Every file is uncommitted on branch `soulmate-landers`.

---

## 1. What it is

Palm quizzes a mark on her hand, tarot quizzes a card she pulls, **read quizzes an
instrument** — a tea cup, a dream, a candle flame. Five steps:

1. The ad asks a question — *"Will I love again?"*
2. She lands on `/fb-read/c` and sees one photograph of a cup, three regions ringed.
3. She taps what she sees: **Bird**, **Tree** or **Anchor**.
4. Evelyn confirms it, places it in the cup, and reads it.
5. She is handed into the normal V1 chat, which runs to the $35 close unchanged.

**A "lander" is a registry entry, not a page.** There is one React component for the
whole funnel. Adding a lander is a config entry plus artwork — never a new route,
file, or page deploy. Same convention as `/fb-tarot` and `/fb-palm`.

Symbols are assigned by **position in the cup**, not by shape. The photograph is
deliberately ambiguous — real tea leaves do not look like anything in particular.
The ring says *where*, the copy says *what*. Ring coordinates belong to that exact
photograph and are recorded in `improve-v1/fb-read/images/armb/SOURCE.md`. Never
regenerate the cup without redrawing the rings.

---

## 2. The one rule that matters

Palm and tarot each keep their roster hand-copied into three or four places: the
client registry, a server vocab map, one or two route validators. Both funnels' docs
name the resulting drift as their number one bug — the lander renders perfectly while
the chat handoff 400s, because somebody updated one list and not the others.

Today, in the tarot branch of `server/routes.ts`:

```js
const validHooks = ["cards-honest", "cards-return", "cards-feels",
  /* …150 more hand-typed strings… */ ];
```

fb-read has no such list anywhere. The server imports the same registry the lander
renders from:

```ts
if (!isReadDevice(readDevice) || !isReadHook(readHook) || !isReadOption(readCard)) {
  return res.status(400).json({ error: "Invalid read params" });
}
if (!isReadWritten(readDevice, readHook, readCard)) {
  return res.status(400).json({ error: "Reading not published" });
}
```

🔴 **Do not "optimise" this by inlining a list of valid ids.** The route validator
*is* the roster and the model's vocabulary *is* the lander's copy, so the two cannot
disagree. That single property is why this funnel exists in the shape it does. If you
need a roster, derive it — `DEVICE_IDS` and `READ_HOOKS` are exported for that.

`isReadWritten` is the second gate. A device can be in the registry with its art
shipped while its readings are still in review; this stops a URL handed to a media
buyer early from serving placeholder copy. A reading is servable only when it is
exactly seven bubbles and none is the `__UNWRITTEN__` sentinel.

---

## 3. Link slugs

Three lander routes. The **version is the route**; everything else is a query param.

| Route | Version | What she gets after the tap |
|---|---|---|
| `/fb-read` | A | The reveal renders on the page, then a short greeting in chat |
| `/fb-read/b` | B | No page reveal; the whole written read plays as chat bubbles |
| `/fb-read/c` | C | Opening bubble + one open question, then the model reads her typed answer |

### Query parameters

| Param | Valid values | Default | Notes |
|---|---|---|---|
| `hook` | `love-again` · `still-think` · `hiding-something` | `love-again` | The question the ad asked |
| `device` | `tea` · `dream` | `tea` | Which instrument. `candle` is drawn but not registered |
| `utm_content` | any string | — | Ad id. Analytics only, never affects copy |

**Bad values fall back, they do not 404.** `?device=banana` silently serves `tea`.
Deliberate — a typo in an ad URL costs a mismatched picture, not a dead landing page
and a wasted click. It also means a typo will not announce itself: check the URL
before the spend, not after.

### A live URL

```
https://www.theseerwithin.com/fb-read/c?hook=love-again&device=tea&utm_content=cup_v1_1080
```

### The rest of the funnel

She stays under the `/fb-read` prefix for the whole journey, which is what keeps her
attribution and pricing intact:

```
/fb-read/chat?hook=love-again&card=a&device=tea&v=c
/fb-read/welcome1     upsell 1 — Protection Ritual, $47
/fb-read/welcome2     upsell 2 — Manifestation Bracelet
/fb-read/success      confirmation
```

`card` is the panel she tapped (`a` | `b` | `c`). `v` carries the version — **Version
A omits it entirely** rather than sending `v=a`.

---

## 4. The three versions

Not three ads. The feed sees an identical creative — the version only changes what
happens after the click, so it can never fix creative fatigue. It changes what share
of clickers convert.

**Version C is the priority.** It is the only one whose words are not written in
advance, so it is the only part that cannot be reviewed by reading a file. Its
fallback is the rest of the written read, so the copy must exist in full regardless.

Version C has one fix the other two bridges do not. Its prompt builder passes the
model both lines she has already read — the opening bubble and the open question —
under an `## ALREADY SAID` heading, first rule *do not describe the picture again*.
`buildPalmReflectPrompt` and `buildTarotReflectPrompt` pass neither, so those models
are told to connect her answer to a picture they cannot see and re-describe what she
just read. Both were deliberately left alone (operator call).

Those two lines are derived server-side from validated enums, never sent up by the
client — her typed answer is already untrusted text entering a prompt, and a second
client-supplied field would add an injection surface for nothing.

---

## 5. What it can produce today

| Thing | Count | How it multiplies |
|---|---:|---|
| Landers | **18** | 2 devices × 3 hooks × 3 panels — all written and servable |
| Servable URLs | **54** | 18 landers × 3 version routes |
| Written bubbles | **126** | 7 per lander, reviewed as JSON before compiling |
| Ad images | **6** | 3 hooks × 1:1 and 4:5, from one photograph |

9:16 was built and dropped — it clipped the cup. Meta feed here is 1:1 and 4:5 only.

The ad headline is **imported** from `HEADLINES`, never typed into the ad script. The
lander's second beat echoes the ad question back to her; if the two drift she is
answered for a question she was never asked. Ad text is set in code over a fixed
photograph, so wording can change a hundred times and the measured cup never moves.

---

## 6. Where things live

### Shipping code

| Path | What it is |
|---|---|
| `shared/readDevices.ts` | **The registry.** Devices, hooks, headlines, questions, frames, guards, marks. Imported by client *and* server |
| `shared/readCopy.ts` | The compiled readings. **Generated** — never hand-edit |
| `shared/readGuards.ts` | Harm checks, imported by both runtime and eval |
| `client/src/pages/ReadBridge.tsx` | The single lander component, every device and version |
| `client/src/content/readReads.ts` | Client half — query parsing, folding bubbles per version |
| `client/public/read/` | The artwork actually served |
| `server/routes.ts` | The `readReflect` action (Version C) |
| `shared/funnelConfig.ts` | Registers the `v1-read` funnel and its `/fb-read` prefix |

### Workspace — not shipped

| Path | What it is |
|---|---|
| `fb-read/docs/` | Generated registry doc + readings as reviewable JSON drafts |
| `improve-v1/fb-read/` | Build workspace — image prompts, candidates, evals, findings |
| `audit-runs/` | Walk output. **Gitignored** |

**Readings are written as JSON, then compiled.** Drafted and reviewed in
`fb-read/docs/drafts/`, compiled by `build-read-copy.mjs` into `shared/readCopy.ts`.
Copy changes without anyone editing code, and review has one artifact to sign off.
The build **refuses** anything over 25 words, over 2 sentences, carrying an
exclamation mark, or still holding the unwritten sentinel — a failure, not a warning.

---

## 7. Adding a hook or a device

### A new hook — a new ad question on existing artwork

1. Add the id to `ReadHook` and `READ_HOOKS`.
2. Add its entry to `HEADLINES`, `READ_QUESTION`, `READ_HOOK_CONTEXT`,
   `READ_HOOK_TENDENCY`, `ALREADY_TOLD_HER` and `READ_FRAME`.
3. Write the readings as JSON drafts, one per device, and compile.
4. Regenerate the registry doc and run the eval.

🔴 **Every hook needs its OWN guard. Do not reuse one because the shape matches.**
`still-think` and `hiding-something` are both decode-him questions and their guards
share almost nothing — one is about what he thinks, the other about what sits behind
a gap, and the sentences that would harm her differ completely. The cheapest safe
source is the live tarot hook of the same question, whose guard has already been
through review on a funnel where that question runs.

### A new device — new artwork

One `DeviceConfig` entry plus a strip image in `client/public/read/`. Nothing to sync
— no route, no server list, no validator. `candle` is drawn and one entry from live.

⚠ **Fix candle's copy before wiring it.** The flame leans *right* while the draft says
"pulls left"; the smoke is pale grey while the draft says "dark smoke". The picture
should win — change the copy. The eval's art-coherence check requires the opening
bubble to carry the mark's content words, so a mismatch fails the build rather than
reaching a lander.

---

## 8. Commands

All from the repo root.

```bash
# compile approved drafts → shared/readCopy.ts (also refreshes the registry doc)
node scripts/build-read-copy.mjs

# regenerate the lander registry; --check fails if the file on disk is stale
npx tsx scripts/read-registry.mjs
npx tsx scripts/read-registry.mjs --check

# build the Facebook ad images from the cup photograph
npx tsx scripts/build-read-ad.mjs love-again

# copy quality — --dry makes no model calls, so it is free
npx tsx improve-v1/fb-read/evals/run-eval.mjs --dry
npx tsx improve-v1/fb-read/evals/run-eval.mjs --selftest
npx tsx improve-v1/fb-read/evals/run-eval.mjs

# walk all 7 personas end to end, then read them as one page
node scripts/walk-read-all.mjs
open audit-runs/fb-read-walk/index.html
```

**The generated files close their own loops.** `build-read-copy.mjs` calls the
registry generator, and the test run calls `read-registry.mjs --check`, so editing a
device, hook or guard without regenerating fails the tests rather than quietly
drifting. The walk page rebuilds the same way, at the end of every walk. A generator
nobody runs is a stale file with extra steps.

---

## 9. Guards

Every hook bans: inventing a man she did not name, promising his return, speaking for
him, any timeframe, a place, exclamation marks, emoji, offers, urgency, and asking her
name. Each hook adds its own — `love-again` bans softened timing ("closer than you
think"), `hiding-something` bans naming what is behind the gap or handing her a tactic.

`shared/readGuards.ts` is imported by **both** the runtime and the eval, so a guard
tightened for the test tightens production in the same commit. Before this existed,
the eval knew a line was a breach and production returned it unread.

At runtime: **check → retry once naming the breach → fall back to the written read.**
The fallback is not new machinery; it is what Version C already serves when a model
call fails. She gets a real reading, no dead air, nothing on screen saying anything
went wrong.

🔴 **Runtime carries harms only, deliberately.** The eval's quality checks (restating
the opening, word counts, bare pronouns) are *not* in the runtime filter. Those are
worth failing a build over and not worth failing a live reading over. Keep the split.

**The eval has been loosened three times, always the same way** — each time it flagged
something the approved copy does deliberately, like reflecting back a man *she* named.
The fix each time was the same principle: **check the assertion, not the vocabulary.**
A claim only counts when it is not behind a negation or a question. Pin any guard
change with `--selftest` before trusting it.

---

## 10. Pricing

| Field | Value |
|---|---|
| Variant id | `35_read` |
| Main offer | $35 |
| Downsell | $25 |
| Upsell 1 | $47 |
| Funnel param | `v1-read` |
| Product suffix | ` - READ` |
| AWeber tag suffix | `-read` |

Pricing is funnel-level, so every device is priced correctly with no per-device safety
roster to sync — a real class of bug on the palm funnel, where a missing entry can
under- or overcharge.

---

## 11. The sandbox rule

🔴 **Dev and production share a database.** Running the persona walks against the
ordinary dev server writes real conversation rows to production and fires real events
at the live Meta pixel.

```bash
PORT=5056 DOTENV_CONFIG_PATH=.env.sandbox NODE_ENV=development npx tsx server/index.ts
LOCAL_BASE_URL=http://localhost:5056 node scripts/walk-read-all.mjs
```

Three layers, because one was not enough. On top of `.env.sandbox` the browser aborts
every request to Meta and mocks `/api/lead` and `/api/fb-event`. A "sandboxed" run in
July 2026 fired **309 real Lead events** at the live pixel when dotenv quietly
repopulated blanked variables from `.env`. The walker also refuses any non-localhost
base URL. The walk stops at the checkout button and never clicks it.

---

## 12. Before it ships

| Item | Status | Detail |
|---|---|---|
| Nothing committed | 🔴 blocker | All of it sits uncommitted on `soulmate-landers` |
| No vitest guard file | 🔴 gap | Every other funnel family has `tests/<family>-copy.test.ts` with tripwire rows. fb-read has the eval and its self-test, but nothing in the normal test run bites on this copy |
| Bereavement routing | 🔴 open | ~1 in 10 of the real `love-again` corpus mentions a husband who died. The frame says bereavement must never be served here, and nothing routes her away. The output is kind; the routing is wrong |
| Scam disclosure | 🔴 open | ~1% of answers show money sent to a man never met. Agreed in principle — a separate non-Evelyn notice, never Evelyn accusing a man — not built |
| Name capture | polish | `useConversation.ts` takes the first word with no validation, so "my name is Margaret" is greeted as "It's lovely to meet you, My." Measured on 90,018 production conversations: costs nothing (7.30% vs 6.44% conversion). ~5 lines. Predates this funnel — do not let it hold up launch |
| Copy, art, eval, walks | ✅ done | 18 landers written · 18/18 eval clean · 29/29 self-test · 7/7 walks reach the close · 0 TypeScript errors |

**The live eval is not deterministic.** Clean runs have scored both 18/18 and 16/18.
Never quote a single number as stable — re-run before drawing a conclusion.

---

## Read next

- `improve-v1/fb-read/README.md` — the build story, the failure modes, every decision
  with its reason.
- `fb-read/docs/lander-registry.md` — generated from the code, so it cannot claim a
  lander the code denies. Every hook and device, guard in full, live URLs.
