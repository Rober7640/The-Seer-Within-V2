// Belief lanes — versions of /fb for every ad that speaks one belief (manifestation,
// astrology, …), served at /fb?lane=<id>. The registry is the ONE copy source on both
// sides: the lander card, the below-card sections, the server HTML Meta reads, the chat
// opener and the directive the later chat steps receive all come from this file.
//
// 🔴 HOW AN ENTRY IS MADE. Each entry is copied field for field from the APPROVED lane
// JSON (improve-v1/belief-lanes/lanes/<n>-<name>.json, the fb-belief-lanes skill):
//   card     ← card.v2 (h, s, b, sc). `alts`, `why` and `parked` are never copied.
//   meta     ← meta (title, desc, alt)
//   body     ← body (h | p | list | faq | ask). `ask` carries no text: it repeats card.b
//              and card.sc.
//   chat     ← chat (six beats; who = e | me | q). `{Name}` is her first name.
//   directive← directive
// Never write copy here first. A lane goes in only after the operator approves its JSON.
//
// 🔴 /fb WITH NO LANE STAYS BYTE-IDENTICAL. Every consumer goes through getLane(), which
// returns undefined for an absent, unknown or junk id — so an unknown ?lane= is plain
// /fb, on the page, in the server HTML, in the chat and in every tracking call.
//
// Lanes live inside funnel `v1-fb` only (README decision D4). The Stripe `product` stays
// `energy_clearing_ritual`; the lane is an additive key everywhere it is recorded.

import type { Bucket } from './types'

export interface LaneCard {
  /** Headline. */
  h: string
  /** Sub-line under the headline. */
  s: string
  /** Button label. */
  b: string
  /** The line under the button. */
  sc: string
}

export interface LaneMeta {
  /** <title>, og:title */
  title: string
  /** meta description, og:description */
  desc: string
  /** Photo description on Evelyn's picture (server HTML + og:image:alt). */
  alt: string
  /** The lane's keywords, for <meta name="keywords"> and the WebPage JSON-LD.
      Her own words and the ad's, so Meta reads the page as one more keyword signal. */
  keywords: readonly string[]
}

export type LaneBlock =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; lead: string; items: readonly string[]; closer?: string }
  | { t: 'faq'; items: readonly { q: string; a: string }[] }
  | { t: 'ask' }

/** e = Evelyn, me = her reply (never sent by us), q = Evelyn's first question. */
export interface LaneBeat {
  who: 'e' | 'me' | 'q'
  text: string
}

export interface BeliefLane {
  /** The ?lane= value. Never renamed once live. */
  id: string
  /** The README lanes table number. */
  num: number
  name: string
  /** The topic the lane already answered, so the chat skips the topic buttons. */
  bucket: Bucket
  card: LaneCard
  meta: LaneMeta
  body: readonly LaneBlock[]
  chat: readonly LaneBeat[]
  /** What every later chat step is told, so the lane does not vanish after the opener. */
  directive: string
}

const LANES = {
  manifest: {
    id: "manifest",
    num: 1,
    name: "Manifestation",
    bucket: 'love',
    card: {
      h: "Something Is Blocking What You Manifest — I Can See It",
      s: "Evelyn has sensed an old block beneath your manifesting. It's why the law of attraction keeps bringing the wrong man, or none at all. She can see where it started, from your first name.",
      b: "Yes Evelyn, Show Me Where It Started",
      sc: "It's free to message Evelyn. She's online now.",
    },
    meta: {
      title: "Manifesting Love and Still Attracting the Wrong Man · Evelyn Cross",
      desc: "Vision boards, scripting, the law of attraction. If love still comes back wrong, something older is answering first. It's free to message Evelyn.",
      alt: "Evelyn Cross, who helps women see why manifesting love keeps bringing the wrong man.",
      keywords: ["manifest", "manifesting", "law of attraction", "attract", "vision board", "scripting", "369 method", "affirmations", "acting as if", "specific person"],
    },
    body: [
      { t: 'h', text: "Why the law of attraction keeps bringing the wrong man" },
      { t: 'p', text: "Maybe a friend's said it already. \"You always attract the same kind of man.\"" },
      { t: 'p', text: "Different face. Same ending. He's warm, then he goes quiet. Or he stays close, and never all the way." },
      { t: 'p', text: "Or nobody comes at all. And everything else you asked for shows up." },
      { t: 'p', text: "It isn't for lack of trying. You've done what the law of attraction asks. More than most women ever will." },
      { t: 'h', text: "What you've already tried" },
      {
        t: 'list',
        lead: "You've done the work.",
        items: [
          "A vision board by the bed.",
          "Scripting him in a journal, every night.",
          "The 369 method.",
          "Affirmations on the mirror.",
          "Acting as if he's already here.",
          "Trying to manifest one specific person.",
        ],
        closer: "None of it was wrong. It was answering something older.",
      },
      { t: 'h', text: "What answers before your vision board does" },
      { t: 'p', text: "Here's what nobody in manifesting tells you. You don't only manifest from the list. You manifest from what's sitting under it." },
      { t: 'p', text: "Long ago, somebody taught you how little to expect from love. Want nothing. Be no trouble. Don't ask him to stay." },
      { t: 'p', text: "That lesson answers first, every time. So you keep attracting the man it's taught you to expect." },
      { t: 'p', text: "A better list can't reach it. You can raise your vibration for years. It won't reach a room you don't know you're standing outside of." },
      { t: 'p', text: "Evelyn finds where it started, from your first name." },
      { t: 'h', text: "Who Evelyn is" },
      { t: 'p', text: "Evelyn Cross is a seer in the west of Ireland. Her teacher could do this. So could her teacher's teacher." },
      { t: 'p', text: "She works at night, by candlelight. One first name at a time. She doesn't need your birthday, a photo, or his name." },
      { t: 'p', text: "She doesn't look at the man. She looks at where it started." },
      { t: 'p', text: "She won't tell you to stop manifesting. She'll show you what you've been manifesting from." },
      { t: 'h', text: "When you send your first name" },
      { t: 'p', text: "You send your first name. That's all." },
      { t: 'p', text: "Evelyn writes back. Her first message is short. Then she'll ask you one question." },
      { t: 'p', text: "Messaging Evelyn is free." },
      { t: 'p', text: "If she sees where it started, she'll offer to write it down. A letter, written at night, by candlelight. That part isn't free. She'll tell you so plainly before anything happens." },
      { t: 'p', text: "It starts the same way for every woman. One first name." },
      { t: 'h', text: "Questions women ask" },
      {
        t: 'faq',
        items: [
          { q: "Does the law of attraction work for love?", a: "It answers. It's just not always what you wrote down. It answers what you believe underneath." },
          { q: "Why do I keep attracting the wrong man?", a: "The face changes. The ending doesn't. That points back to one old lesson about love." },
          { q: "Can I manifest a specific person?", a: "Many women try. Evelyn doesn't pull anyone toward you. She looks at why the same kind of man keeps arriving." },
          { q: "Is it free to message Evelyn?", a: "Yes. The chat is free." },
        ],
      },
      { t: 'ask' },
    ],
    chat: [
      { who: 'e', text: "You've been asking for a long time, haven't you." },
      { who: 'e', text: "What's your first name, dear?" },
      { who: 'me', text: "{her first name}" },
      { who: 'e', text: "{Name}... you've done the lists. The boards. All of it." },
      { who: 'e', text: "And something has been answering. Just not what you meant." },
      { who: 'e', text: "So let's look at who was holding the pen." },
      { who: 'q', text: "Tell me what you asked for, dear... and what you never let yourself ask." },
    ],
    directive: "She came from a page about manifesting love: the law of attraction, vision boards, scripting. Love still comes back wrong, or not at all. Reuse her words: what she asked for, her list, and 'attract', the word women like her use most. Hold the lane's belief: manifesting answers what sits under the list, and an old lesson about what to expect from love answers first. Never tell her manifesting doesn't work, and never promise she will manifest him.",
  },
  astrology: {
    id: "astrology",
    num: 4,
    name: "Astrology",
    bucket: 'love',
    card: {
      h: "Something Is Blocking What Astrology Says Should Work — I Can See It",
      s: "Evelyn has sensed an old block in the way you love. It's why your signs match, and he still holds back. She can see where it started, from your first name.",
      b: "Yes Evelyn, Show Me Where It Started",
      sc: "It's free to message Evelyn. She's online now.",
    },
    meta: {
      title: "When Astrology Says You Match and He Still Won't Commit · Evelyn Cross",
      desc: "You know his sign. You've checked every compatibility chart. If he still won't choose you, an old lesson is answering first. It's free to message Evelyn.",
      alt: "Evelyn Cross, who helps women who follow astrology see why he won't commit.",
      keywords: ["astrology", "compatible", "sign", "the stars", "birth chart", "commit", "horoscope", "zodiac", "moon sign", "rising", "Mercury retrograde"],
    },
    body: [
      { t: 'h', text: "When astrology says you match and he still won't commit" },
      { t: 'p', text: "Your friends know his sign by now. They know yours too." },
      { t: 'p', text: "One of them's said it out loud. \"You two are so compatible. What's he waiting for?\"" },
      { t: 'p', text: "He keeps you close. He's kind, mostly. He just never chooses you all the way." },
      { t: 'p', text: "So you've looked for the reason in astrology. It's where you've always found answers. You've done more homework on him than he's ever done on you." },
      { t: 'h', text: "What you've already asked the stars" },
      {
        t: 'list',
        lead: "You've done the looking.",
        items: [
          "His horoscope, before your own.",
          "Every zodiac compatibility test you could find.",
          "Your birth chart and his, side by side.",
          "His moon sign and his rising, learned by heart.",
          "A text you held back until Mercury retrograde was over.",
          "Every video about his sign that sounded just like him.",
        ],
        closer: "None of it was wrong. It's just all been about him.",
      },
      { t: 'h', text: "Why he still won't choose you when you're compatible" },
      { t: 'p', text: "Your sign is how you were born to love. Astrology gets that part right." },
      { t: 'p', text: "But somebody taught you something later. Long before you met him." },
      { t: 'p', text: "How much to ask for. How long to wait. How to be easy to keep around." },
      { t: 'p', text: "That lesson sits on top of how you love. It answers first." },
      { t: 'p', text: "So a man can match you on paper. He can match you in the stars. And you'll still be the one who waits." },
      { t: 'p', text: "Evelyn finds where it started, from your first name." },
      { t: 'h', text: "Who Evelyn is" },
      { t: 'p', text: "Evelyn Cross is a seer in the west of Ireland. Her teacher could do this. So could her teacher's teacher." },
      { t: 'p', text: "She works at night, by candlelight, one first name at a time." },
      { t: 'p', text: "She'll never tell you astrology is wrong. Your sign is how you were born to love. She looks for what you learned after." },
      { t: 'h', text: "When you send your first name" },
      { t: 'p', text: "You send your first name. That's all." },
      { t: 'p', text: "Evelyn writes back. Her first message is short. Then she'll ask you one question." },
      { t: 'p', text: "Messaging Evelyn is free." },
      { t: 'p', text: "If she sees where it started, she'll offer to write it down. A letter, written at night, by candlelight. That part isn't free. She'll tell you so plainly before anything happens." },
      { t: 'p', text: "It starts the same way for every woman. One first name." },
      { t: 'h', text: "Astrology and love: questions women ask" },
      {
        t: 'faq',
        items: [
          { q: "Why won't he commit if our signs are compatible?", a: "Your charts show how you two fit. An old lesson decides how long you'll wait. That's the part Evelyn looks at." },
          { q: "Can astrology explain why he won't choose me?", a: "It can tell you a lot about him. Why you stay is a different question. The answer goes back long before him." },
          { q: "Do I need my birth chart, or his?", a: "No. Evelyn only needs your first name." },
          { q: "Is it free to message Evelyn?", a: "Yes. The chat is free." },
        ],
      },
      { t: 'ask' },
    ],
    chat: [
      { who: 'e', text: "You know his sign by heart, don't you." },
      { who: 'e', text: "What's your first name, dear?" },
      { who: 'me', text: "{her first name}" },
      { who: 'e', text: "{Name}... you've checked how your signs fit. More than once." },
      { who: 'e', text: "And still, he holds something back from you." },
      { who: 'e', text: "Your sign is how you love. Somebody else taught you to wait." },
      { who: 'q', text: "Tell me his sign, dear... and the one thing he still won't say to you." },
    ],
    directive: "She came from a page about astrology and love: his sign, her sign, how compatible they are, and a man who keeps her close but never chooses her all the way. Reuse her words: the signs she names, 'compatible', and the thing he still won't say. Hold the lane's belief: her sign is how she was born to love, and a lesson somebody taught her later, about how long to wait, answers first. Take the signs she gives as how she sees him and herself, then turn to where the waiting started. Talk about signs as someone at home with them. Never tell her astrology is wrong, and never say what a sign means he'll do next.",
  },
  pattern: {
    "id": "pattern",
    "num": 2,
    "name": "Pattern",
    "bucket": "love",
    "card": {
      "h": "Your Pattern Started Long Before Him, and It's Still Blocking Love — I Can See It",
      "s": "Evelyn has sensed an old lesson from your childhood. It's why the same kind of man never quite chooses you. She can see where it started, from your first name.",
      "b": "Yes Evelyn, Show Me Where It Started",
      "sc": "It's free to message Evelyn. She's online now."
    },
    "meta": {
      "title": "Why the Same Pattern Keeps Repeating With Men · Evelyn Cross",
      "desc": "Your inner child learned what to expect from love. If the same kind of man still finds you, your pattern started there. It's free to message Evelyn.",
      "alt": "Evelyn Cross, who helps women find where their pattern with men started, back in childhood.",
      "keywords": [
        "pattern",
        "the same pattern",
        "same kind of man",
        "childhood",
        "inner child",
        "the little girl",
        "started",
        "red flags",
        "your type",
        "boundaries",
        "self-love",
        "a break from dating"
      ]
    },
    "body": [
      {
        "t": "h",
        "text": "Why the same pattern keeps repeating with men"
      },
      {
        "t": "p",
        "text": "Your friends saw it before you did."
      },
      {
        "t": "p",
        "text": "One says, \"He's just like the last one.\""
      },
      {
        "t": "p",
        "text": "Another asks, \"Why do you go so quiet when you like someone?\""
      },
      {
        "t": "p",
        "text": "Different face. Same ending. He's warm, and he keeps you close. He just won't choose you all the way."
      },
      {
        "t": "p",
        "text": "So you go quiet. You make yourself easy to be with. Then it happens again, with him or the next one."
      },
      {
        "t": "p",
        "text": "It isn't bad luck. It's a pattern, and yours started long before him."
      },
      {
        "t": "h",
        "text": "What you've tried to break the pattern"
      },
      {
        "t": "list",
        "lead": "You've worked hard at this.",
        "items": [
          "Learning every red flag, so you'd spot him sooner.",
          "Swearing off your type, then meeting him again.",
          "A long break from dating, to reset.",
          "Setting boundaries early this time.",
          "Self-love first, before anyone else.",
          "Asking a friend to look him over first."
        ],
        "closer": "None of it was wrong. It just didn't look that far back."
      },
      {
        "t": "h",
        "text": "Where your pattern started"
      },
      {
        "t": "p",
        "text": "Long ago, somebody taught you how to be loved. Keep quiet. Want nothing. Make it easy to stay."
      },
      {
        "t": "p",
        "text": "You were small. You'd learned it so well, you stopped seeing it."
      },
      {
        "t": "p",
        "text": "Some call that little girl your inner child. She learned to be no trouble."
      },
      {
        "t": "p",
        "text": "She still answers first, before you've thought a thing. And a man who's never all the way there feels like home."
      },
      {
        "t": "p",
        "text": "That's why it's the same man in a different face. One old lesson keeps picking him."
      },
      {
        "t": "p",
        "text": "There's a start date, somewhere back in your childhood."
      },
      {
        "t": "p",
        "text": "Evelyn finds where it started, from your first name."
      },
      {
        "t": "h",
        "text": "Who Evelyn is"
      },
      {
        "t": "p",
        "text": "Evelyn Cross is a seer in the west of Ireland. Her teacher could do this. So could her teacher's teacher."
      },
      {
        "t": "p",
        "text": "She works at night, by candlelight. One first name at a time. She doesn't need your birthday, a photo, or his name."
      },
      {
        "t": "p",
        "text": "She knows the inner child the way you do. She doesn't look at the man. She looks for the little girl who learned it."
      },
      {
        "t": "h",
        "text": "When you send your first name"
      },
      {
        "t": "p",
        "text": "You send your first name. That's all."
      },
      {
        "t": "p",
        "text": "Evelyn writes back. Her first message is short. Then she'll ask you one question."
      },
      {
        "t": "p",
        "text": "Messaging Evelyn is free."
      },
      {
        "t": "p",
        "text": "If she sees where it started, she'll offer to write it down. A letter, written at night, by candlelight. That part isn't free. She'll tell you so plainly before anything happens."
      },
      {
        "t": "p",
        "text": "It starts the same way for every woman. One first name."
      },
      {
        "t": "h",
        "text": "Questions women ask about patterns in love"
      },
      {
        "t": "faq",
        "items": [
          {
            "q": "Why do I keep falling for the wrong men?",
            "a": "It isn't bad luck. A pattern from childhood answers first. It picks the man it's used to."
          },
          {
            "q": "What does my inner child have to do with love?",
            "a": "More than you'd think. She learned what love looks like. She's still the one picking."
          },
          {
            "q": "Why do I go quiet with men I like?",
            "a": "Somebody taught you, long ago, that it kept people close. It worked then, so you're still doing it."
          },
          {
            "q": "Is it free to message Evelyn?",
            "a": "Yes. The chat is free."
          }
        ]
      },
      {
        "t": "ask"
      }
    ],
    "chat": [
      {
        "who": "e",
        "text": "You've seen this pattern before, haven't you."
      },
      {
        "who": "e",
        "text": "What's your first name, dear?"
      },
      {
        "who": "me",
        "text": "{her first name}"
      },
      {
        "who": "e",
        "text": "{Name}... you've learned every red flag. You've sworn off your type."
      },
      {
        "who": "e",
        "text": "And still, you end up in the same place. Kept close, and never chosen."
      },
      {
        "who": "e",
        "text": "That started long before him, dear. I can see the edge of it already."
      },
      {
        "who": "q",
        "text": "Tell me how it usually goes with men, dear... and how far back you can remember it."
      }
    ],
    "directive": "She came from a page about her pattern with men: the same kind of man in a different face, kept close and never chosen, going quiet so he'll stay. Reuse her own words for it, especially 'the same' and 'always', and the page's words: pattern, childhood, inner child, the little girl. Hold the lane's belief: it isn't bad luck and it isn't her fault, because a lesson she learned as a little girl answers first and picks the same man. Use plain words for her pattern, never a clinical label, and never say what's coming. If she mentions anyone who has helped her with this, speak of that help with respect."
  },
  family: {
    "id": "family",
    "num": 3,
    "name": "Family",
    "bucket": "love",
    "card": {
      "h": "Something Handed Down Through Your Family Is Blocking Your Love Life — I Can See It",
      "s": "Evelyn has sensed an old block, older than you are. It's why love keeps stopping short, for you and the women before you. It's nobody's fault. She can see where it started, from your first name.",
      "b": "Yes Evelyn, Show Me Where It Started",
      "sc": "It's free to message Evelyn. She's online now."
    },
    "meta": {
      "title": "When Love Repeats Through the Women in Your Family · Evelyn Cross",
      "desc": "Your mother, your grandmother, now you. A generational pattern in love isn't chosen. It's handed down, and nobody's to blame. It's free to message Evelyn.",
      "alt": "Evelyn Cross, who helps women see why love keeps going the same way in their family.",
      "keywords": [
        "family",
        "the women in my family",
        "generational",
        "generations",
        "mother",
        "grandmother",
        "break the cycle",
        "handed down",
        "family tree",
        "generational patterns",
        "cycle breaker"
      ]
    },
    "body": [
      {
        "t": "h",
        "text": "Why love keeps stopping short for the women in your family"
      },
      {
        "t": "p",
        "text": "Maybe your grandmother said it once, over the dishes. \"The women in this family always end up waiting.\""
      },
      {
        "t": "p",
        "text": "She laughed a little when she said it. You didn't ask what she meant."
      },
      {
        "t": "p",
        "text": "Look at the women before you. Your mother. Her mother. Maybe one waited years for a man to say the word. Maybe one was kept close, and never quite chosen."
      },
      {
        "t": "p",
        "text": "Now look at your own life. A different man, a different decade. The same ending. Or nobody's come close enough to start."
      },
      {
        "t": "p",
        "text": "It isn't bad luck. It isn't your fault, or hers. It's come down to you."
      },
      {
        "t": "h",
        "text": "What you've done to break the cycle"
      },
      {
        "t": "list",
        "lead": "You've worked hard not to repeat it.",
        "items": [
          "Swore, as a girl, that your story would go differently.",
          "Picked men nothing like the ones you grew up around.",
          "Asked your grandmother what really happened. She told you half.",
          "Drew the family tree, looking for where it started.",
          "Saved every post about generational patterns.",
          "Called yourself the cycle breaker, and meant it."
        ],
        "closer": "None of it was wrong. It just couldn't reach where this started."
      },
      {
        "t": "h",
        "text": "What gets handed down in a family"
      },
      {
        "t": "p",
        "text": "Nobody teaches a daughter this out loud. She watches. She learns how much love is allowed to ask for."
      },
      {
        "t": "p",
        "text": "Wait. Be easy to keep. Don't ask him for the word."
      },
      {
        "t": "p",
        "text": "Your grandmother learned it from somebody. She never knew she'd passed it on. Your mother didn't either."
      },
      {
        "t": "p",
        "text": "Generations of women, and not one of them chose it. So when you chose him, the choosing had already started."
      },
      {
        "t": "p",
        "text": "They carried it as far as they could. You're the one who gets to put it down."
      },
      {
        "t": "p",
        "text": "Evelyn finds where it started, from your first name."
      },
      {
        "t": "h",
        "text": "Who Evelyn is"
      },
      {
        "t": "p",
        "text": "Evelyn Cross is a seer in the west of Ireland. Her teacher could do this. So could her teacher's teacher."
      },
      {
        "t": "p",
        "text": "She works at night, by candlelight. One first name at a time. She doesn't need your birthday, a photo, or his name."
      },
      {
        "t": "p",
        "text": "She doesn't stop at you. She looks at what came down to you, and finds where it started."
      },
      {
        "t": "p",
        "text": "She won't blame your mother, or hers. She'll show you what they were carrying."
      },
      {
        "t": "h",
        "text": "When you send your first name"
      },
      {
        "t": "p",
        "text": "You send your first name. That's all."
      },
      {
        "t": "p",
        "text": "Evelyn writes back. Her first message is short. Then she'll ask you one question."
      },
      {
        "t": "p",
        "text": "Messaging Evelyn is free."
      },
      {
        "t": "p",
        "text": "If she sees where it started, she'll offer to write it down. A letter, written at night, by candlelight. That part isn't free. She'll tell you so plainly before anything happens."
      },
      {
        "t": "p",
        "text": "It starts the same way for every woman. One first name."
      },
      {
        "t": "h",
        "text": "Questions women ask"
      },
      {
        "t": "faq",
        "items": [
          {
            "q": "Are relationship patterns generational?",
            "a": "Many women find they are. A family passes it on without a word."
          },
          {
            "q": "How do I break the cycle in my family?",
            "a": "Promising to be different is a start. But a promise can't reach where it began. That's where Evelyn looks."
          },
          {
            "q": "Why does my love life look like my mother's?",
            "a": "Not because you're like her. You watched her, and learned what love could ask for. She learned it the same way."
          },
          {
            "q": "Is it free to message Evelyn?",
            "a": "Yes. The chat is free."
          }
        ]
      },
      {
        "t": "ask"
      }
    ],
    "chat": [
      {
        "who": "e",
        "text": "This started long before you, didn't it."
      },
      {
        "who": "e",
        "text": "What's your first name, dear?"
      },
      {
        "who": "me",
        "text": "{her first name}"
      },
      {
        "who": "e",
        "text": "{Name}... you've watched the women before you. You promised yours would go differently."
      },
      {
        "who": "e",
        "text": "And it found you anyway."
      },
      {
        "who": "e",
        "text": "Nobody chose it, dear. Not you, and not them."
      },
      {
        "who": "q",
        "text": "Tell me how love went for the women before you... and how it's going for you now."
      }
    ],
    "directive": "She came from a page about love going the same way for the women in her family: her mother, her grandmother, men who never quite chose them. Reuse the words she uses for those women, and if she says their love went well, believe her and stay with her own story. Hold the lane's belief: a lesson about how much love can ask for came down to her, nobody chose it, and she gets to put it down. She has already told you about the women before her, so build on that instead of asking about her family as if for the first time. Never blame her mother, her grandmother or any woman before her, never speak for a woman who has passed, and never say what's coming."
  },
} as const satisfies Record<string, BeliefLane>

export type LaneId = keyof typeof LANES

export const LANE_IDS = Object.keys(LANES) as LaneId[]

/** The only path that serves lanes. /fb2, /gdn and / never do. */
export const LANE_LANDER_PATH = '/fb'

/**
 * The lane for an untrusted id (URL param, request body, stored value), or undefined.
 * Own-property check, so '__proto__', 'toString' and friends can never resolve.
 */
export function getLane(id: unknown): BeliefLane | undefined {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(LANES, id)) return undefined
  return LANES[id as LaneId]
}

export function isLaneId(id: unknown): id is LaneId {
  return getLane(id) !== undefined
}

/** Where the card's button goes: the chat, carrying the lane. */
export function laneChatPath(id: string): string {
  return `${LANE_LANDER_PATH}/chat?lane=${encodeURIComponent(id)}`
}

/** The additive AWeber tag for a lane lead (and its paid write). */
export function laneAweberTag(id: string): string {
  return `lane-${id}`
}

function withName(text: string, name: string): string {
  return text.split('{Name}').join(name)
}

/**
 * The opener up to her name: beat 1, then "What's your first name, dear?" (beat 2).
 * Replaces today's greeting only when a lane is set.
 */
export function laneOpenerBeforeName(lane: BeliefLane): string[] {
  const me = lane.chat.findIndex((b) => b.who === 'me')
  return lane.chat.slice(0, me < 0 ? lane.chat.length : me).filter((b) => b.who === 'e').map((b) => b.text)
}

/** Beats 3–5: sent straight after she gives her name. `{Name}` is filled in. */
export function laneOpenerAfterName(lane: BeliefLane, name: string): string[] {
  const me = lane.chat.findIndex((b) => b.who === 'me')
  if (me < 0) return []
  return lane.chat.slice(me + 1).filter((b) => b.who === 'e').map((b) => withName(b.text, name))
}

/** Beat 6, the first question. Asked as the first deepening input (DEEPENING_1). */
export function laneQuestion(lane: BeliefLane, name: string): string {
  const q = lane.chat.find((b) => b.who === 'q')
  return q ? withName(q.text, name) : ''
}

/** Every string a visitor (or Meta, or the chat model) can see, in page order. */
export function laneCopyStrings(lane: BeliefLane): string[] {
  const out: string[] = [lane.name, lane.card.h, lane.card.s, lane.card.b, lane.card.sc, lane.meta.title, lane.meta.desc, lane.meta.alt]
  for (const b of lane.body) {
    if (b.t === 'h' || b.t === 'p') out.push(b.text)
    else if (b.t === 'list') out.push(b.lead, ...b.items, ...(b.closer ? [b.closer] : []))
    else if (b.t === 'faq') for (const it of b.items) out.push(it.q, it.a)
    else if (b.t === 'ask') out.push(lane.card.b, lane.card.sc)
  }
  for (const c of lane.chat) if (c.who !== 'me') out.push(c.text)
  out.push(lane.directive)
  return out
}
