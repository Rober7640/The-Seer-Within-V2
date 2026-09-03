// The /fb-read quiz-bridge registry — the SINGLE source of truth for both sides.
//
// 🔴 WHY THIS LIVES IN shared/ AND NOT IN client/src/content/
//
// /fb-palm and /fb-tarot each keep their device roster hand-copied into three or
// four places: the client registry, a server vocab map, and one or two route
// validators. Both funnels' docs name the resulting drift as their number one
// failure — the lander renders perfectly from the client registry while the chat
// handoff 400s, or the opener injects a blank mark, because somebody updated one
// list and not the others ("the v1-palm 400 bug").
//
// This funnel has no such lists. The server imports THIS module, so:
//   • the route validator IS the roster (no hand-typed array of ids)
//   • the LLM's vocab IS the client's `mark` / `reading` (they cannot disagree)
//   • the reflect prompt reads the opening bubble itself, so the client never
//     has to send prompt text back to the server (see buildReadReflectPrompt)
//
// Adding a device = one entry in DEVICES + its strip art. Nothing to sync.
//
// Two axes, both from the URL:
//   device  — ?device=  which instrument the ad quizzed (dream | tea | coffee)
//   hook    — ?hook=    the question the ad asked (love-again)
// Plus the VERSION, which comes from the route suffix, not a param:
//   /fb-read → A · /fb-read/b → B · /fb-read/c → C

import { READS } from "./readCopy";

export type ReadDevice = "dream" | "tea" | "coffee";
export type ReadHook = "love-again" | "still-think" | "hiding-something";
export type ReadOption = "a" | "b" | "c";
export type ReadVersion = "a" | "b" | "c";

export const DEFAULT_DEVICE: ReadDevice = "tea";
export const DEFAULT_HOOK: ReadHook = "love-again";

export const READ_HOOKS: readonly ReadHook[] = ["love-again", "still-think", "hiding-something"];

// The ad question, rendered verbatim on the lander. HOOK-level, never
// device-level: all devices in a test carry the SAME headline, which is what
// makes a winner readable — swap the device and the headline must not move.
export const HEADLINES: Record<ReadHook, string> = {
  "love-again": "Will I love again?",
  "still-think": "Does he still think about me?",
  "hiding-something": "Is he hiding something from me?",
};

// Version C's open question, asked straight after the opening bubble. Hers is
// the next message, so this is the last thing written before the model takes
// over — and her reply is the metric.
export const READ_QUESTION: Record<ReadHook, string> = {
  "love-again":
    "Before I look closer, tell me… what's been weighing on your heart since it happened?",
  "still-think":
    "Before I look closer, tell me… what brings him to mind, when it happens?",
  "hiding-something":
    "Before I look closer, tell me… what was it that first made you wonder?",
};

// What she is actually asking, in her own terms. Injected into the reflect
// prompt so the model shapes its reply to the wound and not to the headline.
export const READ_HOOK_CONTEXT: Record<ReadHook, string> = {
  "love-again":
    "She is asking, after heartbreak, whether she will ever love again — worn down, but the hope is still there.",
  // Inherited verbatim from the live tarot hook of the same question
  // (TAROT_HOOK_CONTEXT['cards-still-think']) rather than rewritten. That
  // wording has been through review on a funnel where this question already runs.
  "still-think":
    "She is asking only whether she occasionally crosses a man's mind — not for his return, not for his love. That she has scaled her asking down to the smallest thing a person can request says a great deal about what she has been going without.",
  // Inherited from TAROT_HOOK_CONTEXT['cards-hiding-something'].
  "hiding-something":
    "She keeps meeting a gap in what a man tells her — not a lie she has caught him in, but a place the picture stops — and is asking whether there is really something behind it. She has no proof and is uneasy about needing any.",
};

// Where the reading must LAND. Injected into the reflect prompt.
export const READ_HOOK_TENDENCY: Record<ReadHook, string> = {
  "love-again":
    "that love is finding its way back to her — affirm HER heart and her capacity to love again; never tie it to one specific person and never a date",
  "still-think":
    "that a thought is not a deed and cannot be reported by anyone — but that she has scaled her asking down to merely being remembered, and that is information about what she has been going without rather than about her worth",
  "hiding-something":
    "that the edge she keeps meeting is real, without ruling on what sits behind it",
};

// What she has almost certainly ALREADY been told, by him, by friends, or by the
// last reader she paid. Cut 3 of the written copy exists to contradict it — and
// without this the generated reply does not know it is contradicting anything, so
// it sometimes repeats the very line she came here to get away from.
export const ALREADY_TOLD_HER: Record<ReadHook, string> = {
  "love-again":
    "that it will happen when she stops looking, and that she should be over it by now",
  "still-think":
    "that she should have moved on, and that wondering at all is a bit pathetic",
  "hiding-something":
    "that she is imagining it, that she is making something out of nothing, and that she is the anxious one",
};

// The FRAME and its GUARD, per hook.
//
// 🔴 A LOOKUP, NOT A TERNARY CHAIN. buildTarotReflectPrompt resolves its eight
// frames through a nested ternary and carries a note admitting the better
// structure is exactly this table — deliberately not refactored there, because it
// touches the live prompt path for every angle at once. This funnel is new, so it
// starts with the shape that one wants.
//
// The guard is the half that matters. A frame says whose future is being read; the
// guard says which sentences would harm her, and they differ per hook far more
// than the frame does.
export const READ_FRAME: Record<ReadHook, { line: string; guard: string }> = {
  // 🔴 THIS GUARD WAS ONE SENTENCE AND THE MODEL WALKED THROUGH IT TWICE.
  // Both breaches were caught by the eval on live runs, on this hook, and neither
  // was covered by the old wording:
  //   · she wrote "ive been on my own six years now" — no man anywhere in it — and
  //     the reply came back "…to what you were before him"
  //   · "and it's closer than you think", which is a timing promise in a soft coat
  // The tendency line below already said "never tie it to one specific person and
  // never a date"; the guard is what the prompt renders as a rule, and it said
  // neither. Both are now named in the words the model actually reached for.
  "love-again": {
    line: "This reading is about HER own future",
    guard:
      "Affirm the hopeful yes with warmth and certainty; withhold ONLY the specifics — never a name, exactly \"who\", or WHERE. 🔴 NEVER IMPLY A MAN SHE DID NOT NAME. If she has not mentioned anyone there is no \"him\" in this reading: not \"before him\", not \"the one who left\", not \"when he walked away\", not \"his\" anything. Her future is hers, and a man she did not put there turns it into a story about someone else. If she DID name someone, you may reflect him back in her own terms — that is required, not forbidden. 🔴 NEVER TIME IT, IN ANY FORM. Not a date, not a season, not weeks or months, and not the softened versions either: never \"soon\", \"close\", \"closer than you think\", \"sooner than you know\", \"before long\", \"any day now\", \"nearly here\". A gentle timing promise is the same promise, and it is the one thing in the reading she can later check and find false.",
  },
  // Inherited from TAROT_HOOK_TENDENCY['cards-still-think']. The resolution this
  // guard reaches is the whole reason the question is answerable at all: what
  // happened is not stored in his memory alone, so she can be answered fully
  // without anyone speaking for him.
  // Inherited from TAROT_HOOK_TENDENCY['cards-hiding-something']. A DIFFERENT
  // guard from still-think's, which is the whole reason this is a lookup: both
  // hooks are decode-him in shape, and the sentences that would harm her differ
  // completely. Here the harm is naming what is behind the gap — supplying "another
  // woman" manufactures a crisis inside a relationship that is still running.
  "hiding-something": {
    line:
      "This reading is about the GAP she keeps meeting, and never a ruling on the man behind it",
    guard:
      "NEVER state that he IS hiding something and NEVER state that he is not — both are verdicts on a real man drawn from a picture, and the second also tells her that what she noticed was not there. 🔴 NEVER NAME OR GUESS THE CONTENTS: not another woman, not money, not a secret past, not a feeling he will not admit — supplying any of it is invention, and inventing it manufactures a crisis inside a relationship that is still running. 🔴 NEVER HAND HER A TACTIC: no checking his phone, messages, socials or whereabouts, no testing him, no trap, no catching him out, and equally no ultimatum and no stepping back to provoke a reaction. NEVER pathologise her watchfulness — no paranoid, insecure, anxious, obsessive, overthinking or reading too much into it. NEVER diagnose him as secretive, avoidant or dishonest as a character. Read what she chose as the SHAPE of the gap and what the not-knowing has cost her, and affirm that meeting an edge is not the same as imagining one.",
  },
  "still-think": {
    line:
      "This reading is about what SHE is carrying, and never about what he is doing or feeling",
    guard:
      "🔴 NEVER STATE THAT HE THINKS OF HER AND NEVER STATE THAT HE DOES NOT, and never in softened form: not \"he thinks of you more than you know\", not \"you cross his mind more often than he lets on\", not \"part of him still\". NEVER invent a scene of him remembering her. NEVER pathologise her for asking — no obsessed, stuck, fixated, needy, or \"you should be asking for more\". NEVER instruct her to let go or move on, NEVER give a timeframe, and NEVER hand her a tactic or a test to run on him. Affirm that what happened is not stored in his memory alone and does not shrink if he has put it down.",
  },
};

export interface DeviceConfig {
  id: ReadDevice;
  // ── UI copy ───────────────────────────────────────────────────────────────
  eyebrow: string; // S1 eyebrow, above the headline
  instruction: string; // S1 tap instruction, below the strip
  beatNoun: string; // S2 — "Evelyn is reading your {beatNoun}…"
  continueCta: string; // S3 (Version A only) CTA, sans the ▸
  chooseMoment: string; // greetingA — "I felt it {chooseMoment}"
  // ── Art ───────────────────────────────────────────────────────────────────
  // A horizontal strip of exactly options.length EQUAL panels. The bridge crops
  // it by background-position, so unequal panels silently misalign every tap
  // target — the panel she sees is not the read she gets.
  strip: { url: string; width: number; height: number };
  // The lander image's aria-label. DEVICE-LEVEL, and it lives here rather than in
  // the bridge because it is a fact about the instrument.
  //
  // 🔴 IT WAS HARDCODED IN ReadBridge AS "The inside of a teacup, tea leaves settled
  // in it". Only the 'symbol' branch renders it, so tea was the one device it was
  // ever true for — and coffee is the second symbol device, which is where it would
  // have started lying. Exactly the drift this registry exists to prevent, one level
  // down and visible only to the people using a screen reader.
  //
  // Panel devices carry one too. Their buttons are labelled per option today, so it
  // is unrendered — but a device's own description of itself is not the bridge's to
  // invent later, and the test asserts every device has one.
  cupAlt: string;
  // OPTIONAL second strip, shown in the CHAT instead of the lander's.
  //
  // 🔴 WHY tea HAS ONE AND THE OTHERS DO NOT. Tea-leaf reading is explicitly a
  // Rorschach: the shapes are ambiguous, and "one person may see an egg where
  // another sees a beetle". So the cup carries nothing nameable — she taps a
  // symbol NAME, not a picture — and this strip is the same cup with the region
  // RINGED, so she is looking at the proof while the opening bubble describes it.
  //
  // On a 'symbol' device the three panels of this strip are three ZOOMS into one
  // photograph, one per option, in options order. The lander crops it by
  // background-position exactly as it crops a panel strip, so nothing downstream
  // needed changing.
  //
  // The other devices deliberately have no reveal: she RECOGNISES her own
  // recurring dream, and a leaning flame is a visible sign. Only tasseography
  // claims to find what a layperson cannot, so only tea has something to reveal.
  // See improve-v1/fb-read/tea-leaf-reading-findings.md.
  revealStrip?: { url: string; width: number; height: number };
  // How this instrument is READ — the meaning of position, not of any one symbol.
  //
  // 🔴 WITHOUT THIS THE GENERATED HALF IS BLIND TO THE DEVICE. The Version-C prompt
  // used to receive `mark` as a bare string — "a bird near the rim, on the far side
  // from the handle" — with nothing to say what near-the-rim MEANS. The model then
  // invented meanings: one live reply explained a low heart as "trust doesn't live
  // in your head", when the real reading is that the bottom of the cup is the ground
  // she was built on. The written copy uses the true grammar; the generated copy
  // could not, because nobody had told it.
  grammar?: string;
  // ── How she CHOOSES ───────────────────────────────────────────────────────
  //
  // 'panel'  — the strip is sliced into options.length panels and she taps a
  //            PICTURE. Arm A: three cups, three different photographs.
  // 'symbol' — ONE photograph, and she taps a NAME. Arm B: one cup, and "what do
  //            you see in it?"
  //
  // 🔴 THESE ARE NOT INTERCHANGEABLE COSMETICS. On 'panel' the picture she taps
  // IS the reading she gets, so the panels must visibly differ. On 'symbol' every
  // option shows the SAME photograph, so the photograph must contain nothing
  // nameable — otherwise she picks the symbol she can already see, the choice
  // stops being hers, and the three readings never get a fair comparison. That is
  // the whole reason the arm-B cup was generated with every recognisable shape
  // banned in the prompt.
  pick?: "panel" | "symbol";
  // 'symbol' only — the single photograph, shown whole and uncropped.
  cupImage?: { url: string; width: number; height: number };
  // 'symbol' only — the SYMBOL NAME alone, with no letter and no article. This is
  // the only place the symbols are ever named to her before the reading.
  //
  // 🔴 BARE NOUNS, DELIBERATELY. The A / B / C prefix is derived at render time in
  // both the lander and the ad generator, from the option key, so the letters
  // cannot disagree between the picture she saw in the feed and the buttons she
  // taps a second later. Writing the letters in here would put the same fact in
  // two places, which is the drift this whole registry exists to prevent. It also
  // removes an easy mistake: written by hand as articles, the first two options
  // came out "A bird" and "A tree" — two options both labelled A.
  optionLabel?: Record<ReadOption, string>;
  options: readonly ReadOption[];
  // ── Vocab ─────────────────────────────────────────────────────────────────
  // mark    = the concrete thing named in the opening bubble
  // reading = the archetype label
  // Both are injected into the Version-C prompt AND rendered in the Version-A
  // greeting. Because the server imports them from here, they cannot drift.
  mark: Record<ReadOption, string>;
  reading: Record<ReadOption, string>;
}

const DREAM: DeviceConfig = {
  id: "dream",
  eyebrow: "One of These Dreams Is Yours",
  instruction: "Choose the one that keeps coming back to you.",
  beatNoun: "dream",
  continueCta: "There's more the dream is showing me — begin your free reading",
  chooseMoment: "the moment you knew which one was yours",
  strip: { url: "/read/dream-strip.jpg", width: 1080, height: 360 },
  cupAlt: "Three dreams, side by side",
  options: ["a", "b", "c"],
  // The three most-reported recurring dreams among women (54.2% / 53.5% /
  // 31.9%). Chosen from survey data rather than invented — see the design doc.
  mark: {
    a: "the one where you're running and never turn round",
    b: "the one where you're falling with nothing underneath",
    c: "the one where your teeth come loose into your palm",
  },
  reading: {
    a: "the running heart",
    b: "the falling heart",
    c: "the unmade heart",
  },
};

const TEA: DeviceConfig = {
  id: "tea",
  // Benefit first, then the device named honestly. See the note on COFFEE.eyebrow —
  // the SHAPE is held constant across devices on purpose.
  eyebrow: "Your Free Tea Leaf Reading",
  instruction: "Look into the cup. Which of these do you see?",
  beatNoun: "cup",
  continueCta: "There's more the cup is showing me — begin your free reading",
  chooseMoment: "the moment you named it",
  // ── ARM B ─────────────────────────────────────────────────────────────────
  // One photograph, three names. She is not picking a picture, she is picking
  // what she sees IN the picture — which is what tasseography actually is.
  //
  // 🔴 THIS REPLACED ARM A, AND THE OLD READINGS ARE ARCHIVED, NOT DELETED.
  // `tea` used to be three cups on road / bird / heart. Those nine readings were
  // written, reviewed and passing when they were replaced, and they live in
  // improve-v1/fb-read/drafts/_archive-arm-a/ with instructions for restoring
  // them. Every one of them describes a formation this cup does not contain.
  pick: "symbol",
  cupImage: { url: "/read/armb-cup.jpg", width: 1254, height: 1254 },
  optionLabel: { a: "Bird", b: "Tree", c: "Anchor" },
  // Unused while pick is 'symbol' — the lander reads cupImage. Kept pointing at
  // the same file so a missing cupImage degrades to the right picture rather
  // than to arm A's three-cup strip.
  strip: { url: "/read/armb-cup.jpg", width: 1254, height: 1254 },
  revealStrip: { url: "/read/armb-reveal-strip.jpg", width: 1260, height: 420 },
  cupAlt: "The inside of a teacup, tea leaves settled in it",
  grammar:
    "The cup is read from directly above, and WHERE a thing sits is half its meaning. The RIM is the weeks just ahead. The MIDDLE is the bottom of the cup — far off, or the ground she was built on. The HANDLE SIDE is HER. The side OPPOSITE the handle is other people and things outside her. Use this; it is what makes a reading feel earned rather than guessed. Never explain the system to her — she should feel the position mean something, never be taught it.",
  options: ["a", "b", "c"],
  // The three marks, and their positions are measured from the photograph rather
  // than invented — see improve-v1/fb-read/images/armb/SOURCE.md, which carries
  // the ring coordinates. All three sit halfway up the wall, so on this cup the
  // meaning is carried by WHICH SIDE, not by depth:
  //   bird   3.4 o'clock — the handle side, so HERS
  //   tree   7.4 o'clock — the flank, with its roots running inward and down
  //   anchor 10.4 o'clock — opposite the handle, so from outside her
  mark: {
    a: "a bird halfway up the cup, over on the handle side",
    b: "a tree halfway up the cup, its roots running toward the middle",
    c: "an anchor halfway up the cup, on the far side from the handle",
  },
  reading: {
    a: "the answered heart",
    b: "the rooted heart",
    c: "the steadied heart",
  },
};

// A SECOND device on the same three hooks, so the picture is the variable and no new
// guard is needed. Same pick mechanic as tea, deliberately: change the picture AND how
// she chooses and neither can be read as the cause.
//
// ⚠ Coffee uses coffee-native symbol names rather than reusing bird/tree/anchor
// (operator call, 2026-09-01), so the option labels changed too. A coffee-vs-tea
// result is therefore NOT cleanly attributable to the photograph alone. Recorded in
// docs/superpowers/specs/2026-09-01-fb-read-coffee-device-design.md rather than left
// for someone to rediscover from the numbers.
//
// 🔴 THE PHOTOGRAPH IS REAL, AND CC0. Not generated. Reference work found that a heavy
// draw coats the cup in one unreadable mass and only a LIGHT draw leaves isolated marks
// on near-bare porcelain; this is a light draw. Generating a cup with three separated
// marks would have meant inventing a behaviour no real cup showed — the "logo with
// coffee in it" failure the whole device exists to avoid. See
// improve-v1/fb-read/images/coffee/SOURCE.md.
const COFFEE: DeviceConfig = {
  id: "coffee",
  // 🔴 THE OLD EYEBROW NAMED NOTHING. "The Cup Has Been Turned" is atmosphere, and it
  // could just as easily have been tea — the device's own announcement did not announce
  // the device. It was also the only line above the fold doing no work for her.
  //
  // "Turkish coffee reading" is the standard ENGLISH name for the practice (kahve falı
  // in Turkish, tasseography as the umbrella term that covers tea and coffee alike), so
  // it is both authentic and readable to a US/UK audience. `kahve falı` itself is a
  // comprehension wall at the first line and is deliberately not used.
  //
  // 🔴 THE SHAPE IS HELD CONSTANT ACROSS DEVICES — tea is "Your Free Tea Leaf Reading".
  // Only the device noun changes. Give coffee a benefit line while tea keeps atmosphere
  // and the eyebrow becomes a FOURTH difference in a test meant to isolate the picture,
  // on top of the photograph, the symbol names and the visual style.
  //
  // `dream` is frozen and deliberately left on its old eyebrow; nothing is built on it.
  eyebrow: "Your Free Turkish Coffee Reading",
  instruction: "Look into the cup. Which of these do you see?",
  beatNoun: "cup",
  continueCta: "There's more the cup is showing me — begin your free reading",
  chooseMoment: "the moment you named it",
  pick: "symbol",
  cupImage: { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  cupAlt: "The inside of a coffee cup, the grounds drained down its pale wall",
  // 🔴 A IS THE TREE, B IS THE ROAD — AND THAT ORDER IS LOAD-BEARING, NOT COSMETIC.
  // The letters are DERIVED from these keys (ReadBridge's OPTION_LABEL, and LETTER in
  // build-read-ad.mjs), so the key IS the letter she sees in the ad and on the button.
  // Swapped on 2026-09-03 to match the coffee ad creatives, which went out with A and
  // B the other way round. Everything per-option moved together — this table, `mark`,
  // `reading`, the 21 bubbles in the drafts, AND the two reveal-strip panels — because
  // the strip is cropped by options.indexOf(). Change one of them alone and she taps
  // "A. Tree" and is shown a ringed road while Evelyn describes a tree.
  // Pinned by tests/fb-read-coffee-options.test.ts.
  optionLabel: { a: "Tree", b: "Road", c: "Lake" },
  // Unused while pick is 'symbol' — the lander reads cupImage. Kept pointing at the
  // same file so a missing cupImage degrades to the right picture.
  strip: { url: "/read/coffee-cup.jpg", width: 1254, height: 1254 },
  // 1560×520, not tea's 1260×420. The road is a LONG mark — that is what makes it a
  // road — and no useful length of it fits a 420 ring, so ring-read-cup.mjs refused
  // the crop rather than cutting the ring in half. 520 still shows 41% of the cup.
  revealStrip: { url: "/read/coffee-reveal-strip.jpg", width: 1560, height: 520 },
  // Tea's grammar is SETTLING and leans on handle-side. Coffee's is the DRAIN, and
  // DEPTH carries the meaning — which is why this cup needs no visible handle, and
  // why its three marks say something tea's three (all mid-wall) cannot.
  grammar:
    "The cup was drunk down, turned upside down onto the saucer and left to drain, so the grounds ran DOWN the wall and settled as they went. Depth is the whole reading here. A mark high on the wall, just under the RIM, came to rest last and belongs to the weeks just ahead. A mark HALFWAY UP the wall is what is standing in her life now. A mark on the FLOOR of the cup settled first and belongs to what she was built on — the oldest thing, the ground under everything else. Grounds that run in a LINE are movement; grounds gathered in ONE PLACE are something settled and already hers. Use this; it is what makes a reading feel earned rather than guessed. Never explain the system to her — she should feel the position mean something, never be taught it.",
  options: ["a", "b", "c"],
  // Read OFF the photograph, not chosen in advance — see SOURCE.md for the geometry.
  // 🔴 Depth here is OBSERVED, not computed: the cup is tilted, so its floor sits low
  // in the frame rather than at the image centre. Re-derive these as
  // distance-from-centre and the lake comes back as "near the rim", inverting the read.
  //
  // 🔴 These must carry the same content words as cut 1 of each reading, or the
  // eval's art-coherence check fails the build.
  mark: {
    a: "a tree halfway up the wall of the cup",
    b: "a road running under the rim of the cup",
    c: "a lake in the bottom of the cup, where the grounds settled first",
  },
  reading: {
    a: "the standing heart",
    b: "the moving heart",
    c: "the deep heart",
  },
};

export const DEVICES: Record<ReadDevice, DeviceConfig> = {
  dream: DREAM,
  tea: TEA,
  coffee: COFFEE,
};

// The roster, derived. Route validators and tests read THIS — never a literal
// array — so a new device cannot be live on the lander and rejected by the API.
export const DEVICE_IDS = Object.keys(DEVICES) as ReadDevice[];

// Customer-facing Stripe product-name suffix for a /fb-read order, e.g. " - TEA",
// " - COFFEE". DERIVED FROM THE DEVICE ID, so a fourth device needs no edit here and
// cannot silently inherit another instrument's label.
//
// 🔴 WHY THIS EXISTS AT ALL. Every other funnel's suffix is per-FUNNEL and lives in
// shared/funnelConfig.ts. /fb-read is the one funnel that serves several instruments
// from a single param, so a per-funnel suffix cannot tell a coffee order from a tea
// one. Joel asked for exactly that separation on the 2026-09-02 call: "Let's not
// reuse. Read is too big. If it's tea, let's call it tea" — and, read back to him,
// "for coffee it should be coffee".
//
// The CALLER decides when to use this: routes.ts falls back to the funnel's own
// productSuffix (" - TEA") whenever the device is absent or unrecognized, so a lost
// device degrades to today's behaviour rather than to a blank or a wrong label.
export function deviceProductSuffix(device: ReadDevice): string {
  return ` - ${device.toUpperCase()}`;
}

export function isReadDevice(v: unknown): v is ReadDevice {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(DEVICES, v);
}

export function isReadHook(v: unknown): v is ReadHook {
  return typeof v === "string" && (READ_HOOKS as readonly string[]).includes(v);
}

export function isReadOption(v: unknown): v is ReadOption {
  return v === "a" || v === "b" || v === "c";
}

export function getDevice(device: ReadDevice): DeviceConfig {
  return DEVICES[device];
}

// The seven-bubble read for a device × hook × option.
//
// Callers run behind parseReadParams, which rejects any combo without reads, so
// the fallback never fires in practice — it exists to keep the lookup total for
// TypeScript rather than to paper over a missing lander.
export function readsFor(device: ReadDevice, hook: ReadHook, option: ReadOption): string[] {
  const bubbles = READS[device]?.[hook]?.[option];
  if (!bubbles) throw new Error(`no reading for ${device}/${hook}/${option}`);
  return bubbles;
}

// The bubble she has ALREADY been shown before she types. Version C opens on
// this and nothing else, so it is her entire first impression of the reading.
export function openingBubble(device: ReadDevice, hook: ReadHook, option: ReadOption): string {
  return readsFor(device, hook, option)[0];
}

// Everything after the opening bubble. Version B plays the lot; Version C uses
// it only when the model call fails.
export function remainingBubbles(
  device: ReadDevice,
  hook: ReadHook,
  option: ReadOption,
): string[] {
  return readsFor(device, hook, option).slice(1);
}
