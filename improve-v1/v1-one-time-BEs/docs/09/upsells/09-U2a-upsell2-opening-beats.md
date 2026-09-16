# 09-U2a — U2 opening beats *(PATH_A and PATH_B → the Manifestation Bracelet)*

| | |
|---|---|
| **Engine** | the shared `useUpsell2Chat.ts` + the same copy file as 09-U1a (proposed `client/src/lib/upsellCopy/heartCleanser.ts`) |
| **Rewritten here** | the same exports `pixiu.ts` rewrites for U2: `PATH_A_OPEN` · `PATH_B_OPEN` · `GAP` · `AFTER_Q1` · `INTRODUCE` · `STONES` · `AFTER_Q2` · `WHAT_RECEIVE` · `chain` · `placeholderNames`. **Plus** `URGENCY` · `DOWNSELL` · `SUCCESS` · `SUCCESS_HAS_SHIPPING` · `SUCCESS_NEEDS_SHIPPING` · `SHIPPING_CONFIRMED` · `SOFT_DECLINE` · `downsellDeclineLabel`, which pixiu leaves on V1 (see the audit) |
| **The hinge** | the charm is the LEFT wrist: it receives, and it keeps her written wish tucked away where only she can read it. The Manifestation Bracelet is the RIGHT wrist: V1's own "broadcasting side". It reaches out. Two different jobs, two different wrists — the bracelet is never sold as a second place to keep a wish |
| **Product sold** | V1's Manifestation Bracelet, unchanged ($47 / $30 downsell live in V1's `PRICE` / `DOWNSELL`, referenced, never retyped) |
| **Personal details** | none beyond `{firstName}` |

**Path A** follows a U1 purchase: acknowledge the charm and the stone in one line each, then find the
one thing neither does. **Path B** follows a U1 decline: don't re-argue the stone; finish a part of
the ritual the letters never covered — her other wrist.

---

## How pixiu.ts routes around the AI reveal — and 09 does the same

`MANIFEST_REVEAL` and `MANIFEST_PERSONALIZE` fire a live Claude call when `REVEAL` / `PERSONALIZE`
are null (inherited from V1). Page-only offers POST `bucket: null` → `/api/upsell2/reading` rejects
it → generic fallback for every buyer. pixiu.ts (and judgement.ts, identically) never enter those
stages:

| Edge | V1_CHAIN_2 | pixiu / judgement / **09** |
|---|---|---|
| `PATH_A_OPEN` → | `MANIFEST_REVEAL` | `GAP` |
| `PATH_B_OPEN` → | `MANIFEST_REVEAL` | `GAP` |
| `AFTER_Q2` → | `MANIFEST_PERSONALIZE` | `RITUAL_INSTRUCTION` |

Nothing then points at either stage. `REVEAL` / `PERSONALIZE` stay inherited (null) only to satisfy
the type. The Q2 quick reply is kept — it captures nothing.

⚠ **One consequence pixiu missed:** V1's `AFTER_Q2` lines promise the personalised stone read that
the skipped stage used to deliver ("Let me tell you specifically what it means for YOUR situation…",
"Let me show you which one speaks loudest…"). With the edge re-pointed, that promise is followed by
the right-wrist instruction instead. 09's `AFTER_Q2` hands off to the wrist, so no promise is left
hanging.

---

## The copy, TS-ready

```ts
// Offer 09 — the Heart Cleanser Love Charm: U2 (the Manifestation Bracelet).
// Spec: improve-v1/v1-one-time-BEs/docs/09/09-U2a-upsell2-opening-beats.md

import type { Upsell2Chain, Upsell2Copy } from "./types";
import { V1_UPSELL2, V1_CHAIN_2 } from "./v1";
import {
  UPSELL2_GAP,
  UPSELL2_AFTER_Q1,
  UPSELL2_INTRODUCE,
  UPSELL2_STONES,
  UPSELL2_AFTER_Q2,
  UPSELL2_WHAT_RECEIVE,
  UPSELL2_DOWNSELL,
  UPSELL2_SUCCESS,
  UPSELL2_SUCCESS_HAS_SHIPPING,
  UPSELL2_SUCCESS_NEEDS_SHIPPING,
  UPSELL2_SHIPPING_CONFIRMED,
  UPSELL2_SOFT_DECLINE,
} from "@/lib/upsell2Messages";

// ── Opening beats ───────────────────────────────────────────────────────────

const HC_PATH_A_OPEN = [
  "{firstName}... both are confirmed now. Your charm, and your protection stone to go with it.",
  "Your lava stone goes on your left wrist too, beside your charm. Your charm holds your wish, and the stone keeps watch over who gets close.",
  "But there's one thing I want to ask you before your charm arrives...",
  "Your wish will be tucked away inside a capsule, {firstName}, where only you can read it.",
  "Your charm keeps it close. The stone guards the wrist it's on. Both of them look after what comes IN to you.",
  "So what's reaching OUT? What lets the love you're ready for know where to find you, {firstName}?",
];

const HC_PATH_B_OPEN = [
  "{firstName}... I respect your decision about the stone. Your charm doesn't need it, and it'll reach you just the same.",
  "But I left one part of the ritual out of my letters, and you should have it before your charm arrives.",
  "Your capsule and your pink quartz are already on their way to you.",
  "What I left out is your other wrist.",
  "Your left wrist is the receiving side. Your charm goes there, with your wish tucked away where nobody else can read it.",
  "Your right wrist is the side that reaches out, {firstName}, and right now there's nothing on it. So what tells the love you're ready for where to find you?",
];

// Routes AROUND both Claude stages — identical to PX_CHAIN_2 / JD_CHAIN_2.
const HC_CHAIN_2: Upsell2Chain = {
  ...V1_CHAIN_2,
  PATH_A_OPEN: "GAP",
  PATH_B_OPEN: "GAP",
  AFTER_Q2: "RITUAL_INSTRUCTION",
};

// ── Downstream line fixes (same set pixiu.ts overrides) ─────────────────────

// Index 0–2 rewritten; index 3 ("You're just standing in an empty room…") is V1's, kept.
const HC_U2_GAP = [
  "Your charm will keep your wish close, on your receiving side. That part is settled.",
  "But keeping a wish close to you isn't the same as reaching out for it, {firstName}.",
  "Think about it... your wish can be written, tucked away and worn every day. You can say the seven words every morning. But if nothing about you is reaching out...",
  UPSELL2_GAP[3],
];

const HC_U2_AFTER_Q1: Record<string, string[]> = {
  yes: [
    UPSELL2_AFTER_Q1.yes[0],
    "Your charm keeps the wish close. Something else has to reach outward, into the rooms you walk into.",
  ],
  maybe: [
    "It's subtle. You'll feel it clearly once your charm is on your wrist.",
    "There'll be a quiet morning after you've said the seven words... and a small voice asking, \"Now what?\" That's the moment this is for.",
  ],
  what: [
    "Think of it this way. Your left hand is held open, ready to take what's offered. Your right hand is the one that waves someone over.",
    "Waving someone over — reaching out for what you want — that's a different kind of work entirely.",
  ],
  default: UPSELL2_AFTER_Q1.default,
};

// Index 1 and 4 rewritten. "Not for holding a wish" is the line that keeps the two products apart.
const HC_INTRODUCE = [
  UPSELL2_INTRODUCE[0],
  "Not for holding a wish. Not for protection. For attraction.",
  UPSELL2_INTRODUCE[2],
  UPSELL2_INTRODUCE[3],
  "Yours is, {firstName}. I felt it the moment you chose your charm.",
];

// Index 3 and 6 rewritten. Index 3 must not credit the CHARM with making signs appear.
const HC_STONES = [
  UPSELL2_STONES[0],
  UPSELL2_STONES[1],
  UPSELL2_STONES[2],
  "Amethyst — your intuition amplifier. Signs and synchronicities are easy to miss on an ordinary day. This stone helps you SEE them. The universe is always speaking, {firstName}. Amethyst helps you listen.",
  UPSELL2_STONES[4],
  UPSELL2_STONES[5],
  "Eight stones. Eight signals. All tuned to your frequency before your bracelet ships.",
];

// Each branch hands off to RITUAL_INSTRUCTION (the right wrist) — the chain skips the
// personalised stone read, so nothing here may promise one.
const HC_U2_AFTER_Q2: Record<string, string[]> = {
  yes: [
    UPSELL2_AFTER_Q2.yes[0],
    "Keep that one in mind. Now let me tell you which wrist the bracelet goes on, because it matters.",
  ],
  all: [
    UPSELL2_AFTER_Q2.all[0],
    "Now let me tell you which wrist it goes on, because that matters as much as the stones.",
  ],
  more: [
    "Of course. Every one of them points outward, toward the love you're ready to receive.",
    "And the wrist you wear it on matters just as much.",
  ],
  default: [
    UPSELL2_AFTER_Q2.default[0],
    "Let me tell you which wrist it goes on.",
  ],
};

// Index 0 rewritten; 1–2 are V1's.
const HC_WHAT_RECEIVE = [
  "I'll attune each stone to the love you're ready to receive before your bracelet ships. By the time it reaches you, it will already carry that frequency.",
  UPSELL2_WHAT_RECEIVE[1],
  UPSELL2_WHAT_RECEIVE[2],
];

// ── Beyond pixiu's set ──────────────────────────────────────────────────────
// pixiu.ts and judgement.ts both inherit every block below from V1 unchanged. Each one names
// a product 09's buyer never bought, or promises a reading "within 24 hours". See the audit.

const HC_URGENCY = [
  "The easiest time to add the bracelet is now, {firstName}, while your charm order is still open.",
  "Your charm will reach you either way. I promise you that.",
  "But if you want your right wrist reaching out while your left wrist receives... this is the moment.",
];

// Index 2 only. Index 4 is V1's price line — kept by reference, never retyped.
const HC_DOWNSELL = [
  UPSELL2_DOWNSELL[0],
  UPSELL2_DOWNSELL[1],
  "I have a bracelet that's already been cleansed and prepared — it just hasn't been attuned to anyone yet. It won't carry the full personal charge a fresh one would...",
  UPSELL2_DOWNSELL[3],
  UPSELL2_DOWNSELL[4],
  UPSELL2_DOWNSELL[5],
];

const HC_ATTUNED = "Your Manifestation Bracelet will be attuned before it ships.";

const HC_U2_SUCCESS = [
  UPSELL2_SUCCESS[0],
  HC_ATTUNED,
  UPSELL2_SUCCESS[2],
  UPSELL2_SUCCESS[3],
];

const HC_U2_SUCCESS_HAS_SHIPPING = [
  UPSELL2_SUCCESS_HAS_SHIPPING[0],
  HC_ATTUNED,
  UPSELL2_SUCCESS_HAS_SHIPPING[2],
  UPSELL2_SUCCESS_HAS_SHIPPING[3],
];

const HC_U2_SUCCESS_NEEDS_SHIPPING = [
  UPSELL2_SUCCESS_NEEDS_SHIPPING[0],
  HC_ATTUNED,
  UPSELL2_SUCCESS_NEEDS_SHIPPING[2],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[3],
  UPSELL2_SUCCESS_NEEDS_SHIPPING[4],
];

// Index 3 only.
const HC_U2_SHIPPING_CONFIRMED = [
  UPSELL2_SHIPPING_CONFIRMED[0],
  UPSELL2_SHIPPING_CONFIRMED[1],
  UPSELL2_SHIPPING_CONFIRMED[2],
  "Watch your inbox for your charm's tracking link, too.",
  UPSELL2_SHIPPING_CONFIRMED[4],
  UPSELL2_SHIPPING_CONFIRMED[5],
];

// Index 0, 2 and 3.
const HC_U2_SOFT_DECLINE = [
  "I understand, {firstName}. Your charm is a lovely thing to have on its own.",
  UPSELL2_SOFT_DECLINE[1],
  "Watch your inbox. Your charm's tracking link comes when it ships.",
  "Take care, dear.",
];

export const HEART_CLEANSER_UPSELL2: Upsell2Copy = {
  ...V1_UPSELL2,
  PATH_A_OPEN: HC_PATH_A_OPEN,
  PATH_B_OPEN: HC_PATH_B_OPEN,
  GAP: HC_U2_GAP,
  AFTER_Q1: HC_U2_AFTER_Q1,
  INTRODUCE: HC_INTRODUCE,
  STONES: HC_STONES,
  AFTER_Q2: HC_U2_AFTER_Q2,
  WHAT_RECEIVE: HC_WHAT_RECEIVE,
  URGENCY: HC_URGENCY,
  DOWNSELL: HC_DOWNSELL,
  SUCCESS: HC_U2_SUCCESS,
  SUCCESS_HAS_SHIPPING: HC_U2_SUCCESS_HAS_SHIPPING,
  SUCCESS_NEEDS_SHIPPING: HC_U2_SUCCESS_NEEDS_SHIPPING,
  SHIPPING_CONFIRMED: HC_U2_SHIPPING_CONFIRMED,
  SOFT_DECLINE: HC_U2_SOFT_DECLINE,
  // REVEAL/PERSONALIZE stay inherited (null) but are UNREACHABLE — see HC_CHAIN_2.
  chain: HC_CHAIN_2,
  downsellDeclineLabel: "No thanks, just my charm",
  placeholderNames: ["Friend"],
};
```

**Test ideas** (mirror `pixiu.test.ts`): `PATH_A_OPEN[0]` contains "both are confirmed";
`PATH_B_OPEN.length === 6` and joins to contain "other wrist"; `chain.PATH_A_OPEN`,
`chain.PATH_B_OPEN` are not `MANIFEST_REVEAL`; `chain.AFTER_Q2` is not `MANIFEST_PERSONALIZE`;
`PRICE` is inherited; no string reachable from `HEART_CLEANSER_UPSELL2` (including
`downsellDeclineLabel`) matches `/clearing|energy field|our conversation/i`.

---

## Audit record — V1 lines 09 would otherwise reuse

Every line in V1's U2 copy that contains **"clearing"**, **"energy field"** or **"our
conversation"**. ✅ = overridden, ❌ = inherited from V1 and still shown to that offer's buyer.

| V1 export · index | V1 line (`client/src/lib/upsell2Messages.ts`) | pixiu.ts (06) | judgement.ts (03) | 09 |
|---|---|---|---|---|
| `PATH_A_OPEN[0]` · l.52 | "…both rituals are confirmed. Clearing and protection…" | ✅ | ✅ | ✅ |
| `PATH_A_OPEN[1]` · l.53 | "…while your energy field heals…" | ✅ | ✅ | ✅ |
| `PATH_A_OPEN[4]` · l.56 | "The clearing removes what's been holding you back…" | ✅ | ✅ | ✅ |
| `PATH_A_OPEN[5]` · l.57 | "Clearing is about the past…" | ✅ | ✅ | ✅ |
| `PATH_B_OPEN[0]` · l.65 | "…Your clearing will still be powerful on its own." | ✅ | ✅ | ✅ |
| `PATH_B_OPEN[2]` · l.67 | "…The clearing handles that." | ✅ | ✅ | ✅ |
| `GAP[0]` · l.78 | "The clearing will remove what's been standing in the way…" | ✅ `PX_U2_GAP` | ❌ inherited | ✅ `HC_U2_GAP` |
| `AFTER_Q1.yes[1]` · l.99 | "The clearing opens the space…" | ✅ `PX_U2_AFTER_Q1` | ❌ inherited | ✅ |
| `AFTER_Q1.maybe[0]` · l.102 | "…once the clearing is done." | ✅ | ❌ inherited | ✅ |
| `AFTER_Q1.what[0]` · l.106 | "…clearing a block is like pulling weeds from a garden…" | ✅ | ❌ inherited | ✅ |
| `INTRODUCE[1]` · l.121 | "Not for protection. Not for clearing. For attraction." | ✅ `PX_INTRODUCE` | ❌ inherited | ✅ `HC_INTRODUCE` |
| `STONES[6]` · l.138 | "…All tuned to your frequency during tonight's clearing." | ✅ `PX_STONES` | ❌ inherited | ✅ `HC_STONES` |
| `WHAT_RECEIVE[0]` · l.194 | "…during tonight's clearing…" | ✅ `PX_WHAT_RECEIVE` | ❌ inherited | ✅ `HC_WHAT_RECEIVE` |
| `URGENCY[0]` · l.253 | "…while I'm inside your energy field tonight… Once the clearing is complete…" | ❌ inherited | ❌ inherited | ✅ `HC_URGENCY` |
| `URGENCY[1]` · l.254 | "Your clearing will be powerful either way…" | ❌ inherited | ❌ inherited | ✅ |
| `URGENCY[2]` · l.255 | "…go beyond clearing and start calling in what's yours…" | ❌ inherited | ❌ inherited | ✅ |
| `DOWNSELL[2]` · l.265 | "…the full personalized charge of tonight's clearing…" | ❌ inherited | ❌ inherited | ✅ `HC_DOWNSELL` |
| `SUCCESS[1]` · l.277 | "…attuned during tonight's clearing." | ❌ inherited | ❌ inherited | ✅ |
| `SUCCESS_HAS_SHIPPING[1]` · l.288 | "…attuned during tonight's clearing." | ❌ inherited | ❌ inherited | ✅ |
| `SUCCESS_NEEDS_SHIPPING[1]` · l.299 | "…attuned during tonight's clearing." | ❌ inherited | ❌ inherited | ✅ |
| `SHIPPING_CONFIRMED[3]` · l.313 | "Watch your inbox — your clearing reading arrives within 24 hours." | ❌ inherited | ❌ inherited | ✅ |
| `SOFT_DECLINE[0]` · l.323 | "…The clearing alone will be powerful work." | ❌ inherited | ❌ inherited | ✅ |
| `V1_UPSELL2.downsellDeclineLabel` · v1.ts l.129 | "No thanks, just the clearing" | ❌ inherited | ❌ inherited | ✅ "No thanks, just my charm" |

**How they avoid them.** Both files spread `V1_UPSELL2` and replace whole exports. judgement.ts
replaces only the two path openers and the chain, so 17 of the 23 lines above still reach a 03
buyer — even though `types.ts` says 03 overrides `AFTER_Q*` (it doesn't). pixiu.ts overrides the
opening-to-`WHAT_RECEIVE` stretch but inherits everything from `URGENCY` onward, so a 06 buyer who
reaches the price still reads "tonight's clearing", "your clearing reading arrives within 24 hours"
and a decline button saying "just the clearing". 09 overrides all of them.

**Near-misses reused unchanged by 09** (no banned term): `QUESTION_1` l.88 "…the difference between
removing something and calling something in?" — ⚠ it's shared text the type does not let an offer
override, and "removing something" leans on V1's premise; changing it needs an engine change.
`PATH_B_OPEN[1]` l.66 "…during our reading" (overridden anyway). `INTRODUCE[4]` l.124 "…the moment
we began talking" (overridden). `STONES[3]` l.135 "Once the block is cleared" (overridden).
`AFTER_Q2.more[0]` l.163 "…what you told me earlier" (overridden). `PRICE[1]` l.243 "Same 30-day
guarantee" — "same" points back at a guarantee U1 never states; V1's, left alone.

## Build notes

- **The distinct job, stated once.** Charm: left wrist, receiving, her private written wish. Bracelet:
  right wrist, reaching out. V1's own `RITUAL_INSTRUCTION` ("right wrist… your broadcasting side")
  and `RITUAL_PATH_A_EXTRA` ("lava stone on your left, filtering what comes IN… bracelet on your
  right, amplifying what goes OUT") already say this, so the openers set up what V1 pays off. The
  bracelet is never offered as somewhere to keep a wish.
- **Path A** acknowledges both purchases in one line and doesn't re-describe either.
- **Path B** doesn't re-argue the stone. The new information is real: the letters never mention the
  right wrist.
- **`HC_STONES[3]` changed for a claim reason.** V1/pixiu tie "signs and synchronicities will start
  appearing" to a prior product. Pointed at the charm, that would be an efficacy claim for the
  charm, which the letters never make. The amethyst claim now stands on the bracelet alone.
- **Urgency is honest.** No "tonight only" window. It says now is the easiest time to add the
  bracelet, which is true.
- **"Your charm will reach you either way"** is the only promise about the charm, and it's a
  delivery fact.
- **Physical question:** Path A puts the lava stone "beside your charm" on the left wrist, because
  V1's bucket block tells her to wear the stone there. Confirm that's how the stone is worn.
- **No prices typed.** $47 / $30 stay inside V1's `PRICE` and `DOWNSELL[4]`, referenced.
- **`{firstName}` × 3 in A, × 2 in B**, matching 06-U2a.
