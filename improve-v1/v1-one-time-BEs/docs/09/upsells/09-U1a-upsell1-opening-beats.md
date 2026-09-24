# 09-U1a — U1 opening beats *(the Heart Cleanser Love Charm → Protection Ritual)*

| | |
|---|---|
| **Engine** | the shared `useUpsellChat.ts` + a copy object in `client/src/lib/upsellCopy/` (proposed `heartCleanser.ts`), exactly like `pixiu.ts` |
| **Rewritten here** | the same exports `pixiu.ts` rewrites for U1: `CONFIRMATION` · `GAP` · `RISK` · `QUESTION_1` + `QUESTION_1_REPLIES` · `AFTER_Q1` · `RITUAL` · `OFFER` · `SUCCESS` · `SHIPPING_CONFIRMED` · `SOFT_DECLINE` · `bucketMessages` · `chain` · `acceptLabel` · `placeholderNames`. **Plus `DELIVERY`**, which pixiu leaves on V1 (see the audit) |
| **Bridge** | the real wait while the charm travels: ships within 2 business days, then 7–14 days (US) or 2–4 weeks (elsewhere). She has just decided she's ready to receive love, and the charm is still in a box |
| **Mechanism** | deciding to receive opens her up to everyone at once, including the people who took from her before. The charm holds her wish; it was never meant to decide who gets close. The stone guards that |
| **Product sold** | V1's Protection Ritual + charged lava stone, unchanged |
| **Personal details** | none beyond `{firstName}`. Page-only 09 collects no bucket, concern or person |

⚠ **Beat structure is V1's and is not changed:** confirmation → gap → risk → a question that makes
the risk hers → solution. Verbatim V1 lines are referenced by index (`UPSELL_RITUAL[0]`), never
retyped, so V1 stays the single source of those words.

---

## How pixiu.ts handles the two page-only problems — and what 09 does

| Problem | pixiu.ts (06) | 09 |
|---|---|---|
| `bucketMessages` — a null bucket returns `[]`, so no bucket messages send and `DELIVERY` loses the left-wrist line it depends on | universal: `() => V1_UPSELL1.bucketMessages("money", null)` — V1's MONEY block verbatim, because Pixiu is a wealth guardian | universal: `() => V1_UPSELL1.bucketMessages("love", null)` — V1's **LOVE** block verbatim. No `{personName}`, carries the left-wrist line, and its theme (guard your heart, the left side receives, the wrong ones don't get through) is this offer's own |
| `chain` | `V1_CHAIN_1` unmodified — keeps `QUESTION_1` | `V1_CHAIN_1` unmodified — keeps `QUESTION_1` |
| U2's Claude reveal stages | routed around in U2 (see 09-U2a) | same |

---

## The copy, TS-ready

```ts
// Offer 09 — the Heart Cleanser Love Charm: U1 (the Protection Ritual).
// Spec: improve-v1/v1-one-time-BEs/docs/09/09-U1a-upsell1-opening-beats.md

import type { Upsell1Copy } from "./types";
import { V1_UPSELL1, V1_CHAIN_1 } from "./v1";
import {
  UPSELL_RITUAL,
  UPSELL_OFFER,
  UPSELL_SUCCESS,
  UPSELL_SHIPPING_CONFIRMED,
  UPSELL_SOFT_DECLINE,
  UPSELL_DELIVERY,
} from "@/lib/upsellMessages";

// ── Opening beats ───────────────────────────────────────────────────────────

const HC_CONFIRMATION = [
  "It's done, {firstName}. Your Heart Cleanser Love Charm is ordered, and it ships within 2 business days.",
  "Then it has real distance to cover. 7–14 days if you're in the US, 2–4 weeks if you're anywhere else.",
  "Before I let you go, dear, there's something about that wait I want you to hear.",
];

const HC_GAP = [
  "Once it's on your left wrist with your wish inside, your charm gives that wish a place on your receiving side, close enough to touch every morning.",
  "But here's what nobody mentions about ordering something you have to wait for, {firstName}...",
  "You've already decided you're ready to receive love, too. You decided it today, when you ordered.",
  "Your charm is still in a box, a long way from your wrist.",
];

const HC_RISK = [
  "And those days in between are the ones I'd ask you to be careful with.",
  "Deciding you're ready to receive love opens you up. You want that. But you open up to everyone at once, including the people who took from you before.",
  "The conversation you promised yourself you'd stop reopening. The one who only calls when he's lonely. The voice telling you you're asking for too much.",
  "I've watched it happen more times than I'd like, {firstName}. Someone finally makes room for love, and the first thing through the door is the very thing they made room to get away from.",
  "Your charm holds your wish. Standing guard over who gets close was never what it's for.",
];

const HC_QUESTION_1 =
  "Tell me honestly, {firstName}. The last time you felt ready to try again, did someone from before turn up at almost exactly that moment?";

const HC_QUESTION_1_REPLIES = [
  { text: "Yes — that's happened to me", value: "yes" },
  { text: "I think so, yes", value: "maybe" },
  { text: "I'm not sure", value: "unsure" },
];

const HC_AFTER_Q1: Record<string, string[]> = {
  yes: [
    "I thought you might say that. You're far from the only one.",
    "Nobody has to send them, {firstName}. They turn up because a door has opened, and they already know the way in.",
    "I don't want these weeks to go that way for you.",
  ],
  maybe: [
    "Most people only see it looking back.",
    "A message in the same week you'd finally stopped checking. An old flame at the party you nearly didn't go to.",
    "I'd like those weeks covered before your charm reaches you.",
  ],
  unsure: [
    "Then let's not wait to find out.",
    "For the next few weeks you'll be more open than you've been in a long while.",
    "I'd rather someone was keeping watch while that's true.",
  ],
  default: [
    "I can tell you know what I mean.",
    "Your charm is for your wish. Who gets close to you while it travels is a separate matter.",
    "Let me look after that part.",
  ],
};

// ── Downstream line fixes (same set pixiu.ts overrides) ─────────────────────

// Index 3 only. V1's line names a chat 09's buyer never had.
const HC_RITUAL = [
  UPSELL_RITUAL[0],
  UPSELL_RITUAL[1],
  UPSELL_RITUAL[2],
  "I'll call your spirit forward, by the same wish that drew you to your charm.",
  UPSELL_RITUAL[4],
  UPSELL_RITUAL[5],
  UPSELL_RITUAL[6],
  UPSELL_RITUAL[7],
];

// Index 2 only. V1's line pairs the stone with a product she didn't buy.
// Index 0 carries {upsellPrice} — keep it by reference, never a typed price.
const HC_OFFER = [
  UPSELL_OFFER[0],
  UPSELL_OFFER[1],
  "If you were sitting with me, I'd tell you to have both. Your charm for your wish, and the stone for the weeks it's travelling.",
  UPSELL_OFFER[3],
];

// Index 1 and 2. Index 4 stays: the engine opens the shipping form straight after SUCCESS.
const HC_U1_SUCCESS = [
  UPSELL_SUCCESS[0],
  "Your protection is set. The ritual, and the charged stone that holds it.",
  "I'll do the work tonight.",
  UPSELL_SUCCESS[3],
  UPSELL_SUCCESS[4],
];

// Index 4 only. V1's line promises a reading by email; 09's buyer has a charm on the way.
const HC_U1_SHIPPING_CONFIRMED = [
  UPSELL_SHIPPING_CONFIRMED[0],
  UPSELL_SHIPPING_CONFIRMED[1],
  UPSELL_SHIPPING_CONFIRMED[2],
  UPSELL_SHIPPING_CONFIRMED[3],
  "Watch for your stone at your door, and for your charm's tracking email in your inbox.",
  UPSELL_SHIPPING_CONFIRMED[5],
  UPSELL_SHIPPING_CONFIRMED[6],
];

// Index 1, 4 and 5. Index 4 of V1 promises a reading; index 5 mentions tonight's work on a decline.
const HC_U1_SOFT_DECLINE = [
  UPSELL_SOFT_DECLINE[0],
  "Just... be careful who you let close while your charm is on its way.",
  UPSELL_SOFT_DECLINE[2],
  UPSELL_SOFT_DECLINE[3],
  "For now, watch your inbox. Your charm ships within 2 business days, and I'll send you the tracking link.",
  "Take care of yourself, dear.",
];

// ── Beyond pixiu's set ──────────────────────────────────────────────────────
// Index 4 only. pixiu.ts and judgement.ts both inherit V1's line here, which ties the
// stone to a premise 09 never sold. See the audit record.
const HC_DELIVERY = [
  UPSELL_DELIVERY[0],
  UPSELL_DELIVERY[1],
  UPSELL_DELIVERY[2],
  UPSELL_DELIVERY[3],
  "The protection holds strong for at least 30 days, longer for most people. Long enough to see you through the weeks your charm is travelling.",
];

export const HEART_CLEANSER_UPSELL1: Upsell1Copy = {
  ...V1_UPSELL1,
  CONFIRMATION: HC_CONFIRMATION,
  GAP: HC_GAP,
  RISK: HC_RISK,
  QUESTION_1: HC_QUESTION_1,
  QUESTION_1_REPLIES: HC_QUESTION_1_REPLIES,
  AFTER_Q1: HC_AFTER_Q1,
  RITUAL: HC_RITUAL,
  OFFER: HC_OFFER,
  SUCCESS: HC_U1_SUCCESS,
  SHIPPING_CONFIRMED: HC_U1_SHIPPING_CONFIRMED,
  SOFT_DECLINE: HC_U1_SOFT_DECLINE,
  DELIVERY: HC_DELIVERY,
  // Universal — page-only 09 has no bucket. V1's LOVE block verbatim: no {personName},
  // carries the LEFT-WRIST line DELIVERY depends on. Ignores both args.
  bucketMessages: () => V1_UPSELL1.bucketMessages("love", null),
  // Keeps the question — RISK routes to QUESTION_1, same as V1, 03 and 06.
  chain: V1_CHAIN_1,
  acceptLabel: "Yes, guard who gets close",
  placeholderNames: ["Friend"],
};
```

**Test ideas** (mirror `pixiu.test.ts`): `CONFIRMATION.length === 3` and `[0]` contains "Heart
Cleanser Love Charm"; question replies are `yes/maybe/unsure`; `bucketMessages(undefined, null)`
equals `UPSELL_BUCKET_MESSAGES.love`, contains "LEFT wrist", no `{personName}`; no string reachable
from `HEART_CLEANSER_UPSELL1` matches `/clearing|energy field|our conversation/i`.

---

## Audit record — V1 lines 09 would otherwise reuse

Every line in V1's U1 copy that contains **"clearing"**, **"energy field"** or **"our
conversation"**, and what each offer file does with it. ✅ = overridden, ❌ = inherited from V1 and
still shown to that offer's buyer.

| V1 export · index | V1 line (`client/src/lib/upsellMessages.ts`) | pixiu.ts (06) | judgement.ts (03) | 09 |
|---|---|---|---|---|
| `UPSELL_CONFIRMATION[0]` · l.44 | "Your Energy Clearing Ritual has been scheduled." | ✅ opening beats | ✅ opening beats | ✅ `HC_CONFIRMATION` |
| `UPSELL_GAP[0]` · l.54 | "The clearing I'm about to perform will remove the block from your energy field." | ✅ | ✅ | ✅ `HC_GAP` |
| `UPSELL_GAP[3]` · l.57 | "For the next 30 days, your energy field will be rebuilding…" | ✅ | ✅ | ✅ `HC_GAP` |
| `UPSELL_AFTER_Q1.unsure[2]` · l.99 | "What we're clearing is too important to risk." | ✅ | ✅ | ✅ `HC_AFTER_Q1` |
| `UPSELL_AFTER_Q1.default[1]` · l.103 | "That cycle of clearing and returning — it ends now." | ✅ | ✅ | ✅ `HC_AFTER_Q1` |
| `UPSELL_RITUAL[3]` · l.170 | "Using the energy signature from our conversation, I'll call your spirit forward." | ✅ `PX_RITUAL` | ❌ inherited | ✅ `HC_RITUAL` |
| `UPSELL_DELIVERY[4]` · l.258 | "…Long enough for your energy field to fully heal." | ❌ inherited | ❌ inherited | ✅ `HC_DELIVERY` (beyond pixiu's set) |
| `UPSELL_OFFER[2]` · l.268 | "Most of my serious clients do both rituals together — clearing AND protection." | ✅ `PX_OFFER` | ❌ inherited | ✅ `HC_OFFER` |
| `UPSELL_SOFT_DECLINE[4]` · l.281 | "For now, watch your inbox. Your clearing reading will arrive within 24 hours." | ✅ `PX_U1_SOFT_DECLINE` | ❌ inherited | ✅ `HC_U1_SOFT_DECLINE` |
| `UPSELL_SUCCESS[1]` · l.291 | "Both rituals are now confirmed — clearing AND protection." | ✅ `PX_U1_SUCCESS` | ❌ inherited | ✅ `HC_U1_SUCCESS` |
| `UPSELL_SHIPPING_CONFIRMED[4]` · l.306 | "Watch your inbox — your clearing reading arrives within 24 hours." | ✅ `PX_U1_SHIPPING_CONFIRMED` | ❌ inherited | ✅ `HC_U1_SHIPPING_CONFIRMED` |
| `V1_UPSELL1.acceptLabel` · v1.ts l.103 | "Yes, protect what we clear" *(near-miss: "clear")* | ✅ "Yes, cover the wait" | ✅ "Yes, guard what's opening" | ✅ "Yes, guard who gets close" |

**How they avoid them.** Both files spread `V1_UPSELL1` and replace whole exports. judgement.ts
replaces only the opening beats, the bucket block and the accept label, so every downstream
"clearing" line in the table still reaches a 03 buyer. pixiu.ts goes further and overrides
`RITUAL`, `OFFER`, `SUCCESS`, `SHIPPING_CONFIRMED` and `SOFT_DECLINE` line by line, but misses
`DELIVERY[4]`. 09 takes pixiu's set and adds `DELIVERY`.

**Near-misses reused unchanged by 09** (no banned term, but they lean on V1's premise — leave as
they are unless the operator wants a fuller pass): `UPSELL_SOLUTION[1]` l.114 "…while your field
rebuilds"; `UPSELL_LAVA_INTRO[3]` l.126 "…That's exactly what's happening in your energy right now";
`UPSELL_FEEL[3]` l.185 "…working on your energy from a distance"; `UPSELL_BUCKET_MESSAGES.love[2]`
"In energy work, the left side receives…".

## Build notes

- **Why the love block and not a new one.** 03 wrote a new universal block because its theme wasn't
  any V1 bucket; 06 reused MONEY because Pixiu is about money. 09 is a love charm, so V1's LOVE block
  fits word for word, and reusing it means zero new claims about the stone.
- **Two things on the left wrist.** V1's bucket block tells her to wear the stone on her LEFT wrist,
  and 09's whole ritual puts the charm there too. The copy leans into it (both on the receiving side;
  the charm holds the wish, the stone watches who gets close), but whether the stone is worn as a
  bracelet next to the charm is a product question for the operator.
- **Shipping times in chat.** `HC_CONFIRMATION[1]` and `HC_U1_SOFT_DECLINE[4]` state 09's settled
  times word for word. The stone's own "48 hours" (`UPSELL_SUCCESS[3]`) is V1's line, left alone.
  Nothing here says the stone and the charm ship together — that isn't settled for 09.
- **The address is asked twice** for a U1 buyer (see 09-C1 build notes). `UPSELL_SUCCESS[4]` "I just
  need to know where to send it." is kept because the engine really does open the form next. If
  engineering prefills or skips the form, change that line with it.
- **No invented customer facts.** V1's "Most of my serious clients do both" is replaced with Evelyn's
  own advice, because 09 has no clients yet to be "most of".
- **No outcome promised about anyone.** "The one who only calls when he's lonely" names a type, not
  a person, and predicts nothing about him.
- **`{firstName}` × 6** across the opening beats, in line with 06-U1a.
- **copy-check** reads this file as offer 09 (docs/09). Verbatim V1 lines are referenced by index,
  so the corpus device-variance pass never sees them retyped here.
