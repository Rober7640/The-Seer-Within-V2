# Lane 4 · Astrology: review gate (test run, written from scratch)

Stopped at the review gate. Nothing is published, wired, committed or live. The copy is in `4-astrology.json`. The doc (`4-astrology.md`), review page (`lane-astrology.html`) and counts (`lane-astrology-counts.json`) are rendered from it. The mockup isn't rendered; the main session does that from the JSON.

I didn't read the hand-written astrology lane or anything in `review-pages/`. One thing to know for the comparison: `02-chat-openers.md` already has a lane 4 column in its opener table. I read it, because the method doc was fair game, but I wrote a different opener (below).

## The page at a glance

- **Belief:** Astrology is right about how she was born to love. A lesson somebody taught her later, about how long to wait, sits on top of her sign and answers first. That's why a man she's so compatible with keeps her close and never chooses her all the way.
- **Card (today's /fb style):**
  - Headline: *Something Is Blocking What Astrology Says Should Work — I Can See It*
  - Sub-line: *Evelyn has sensed an old block in the way you love. It's why your signs match, and he still holds back. She can see where it started, from your first name.*
  - Button: *Yes Evelyn, Show Me Where It Started*
  - Under it: *It's free to message Evelyn. She's online now.*
  - Alternates: *Something Under Your Sign Is Blocking Love — I Can See It* / *Something Is Blocking Love Your Signs Say Should Work — I Can See It*
- **Below the card (485 words), in order:**
  1. "When astrology says you match and he still won't commit". Her friends know his sign and hers. One of them says "You two are so compatible. What's he waiting for?"
  2. "What you've already asked the stars": his horoscope, a zodiac compatibility test, both birth charts, his moon sign and rising, a text held back until Mercury retrograde was over, the videos about his sign. It closes on "None of it was wrong. It's just all been about him."
  3. The turn: her sign is how she was born to love, and "Astrology gets that part right." Somebody later taught her how much to ask for and how long to wait. That lesson answers first. "Evelyn finds where it started, from your first name."
  4. "Is Evelyn an astrologer?" No. She's a seer in the west of Ireland, she doesn't ask for birth times, and she'll never say astrology is wrong. "She looks at what you learned, not when you were born."
  5. Free chat, and the honest line about the letter.
  6. The FAQ, then the ask again.
- **Evelyn's first messages:**
  1. *You know his sign by heart, don't you.*
  2. *What's your first name, dear?*
  3. *{Name}... you've checked how your signs fit. More than once.*
  4. *And still, he holds something back from you.*
  5. *Your sign is how you love. Somebody else taught you to wait.*
  6. *Tell me his sign, dear... and the one thing he still won't say to you.*

## What the buyer data said

Source: the live DB, read only. Love and someone chats from the past year: 90,520 chats, 6,653 paid. Our traffic is the astrology audience, so these chats are the right source for this lane.

- **She names signs, and rarely says "astrology".** 365 chats name one of ten signs (45 paid). Cancer and Leo were left out because they also match illness and men's names. "Astrology" appears in only 26 chats, horoscope 17, zodiac 15, "his / my sign" 15. Scorpio is named most (73), then Taurus, Aries and Gemini. So "astrology" is the main keyword for Meta, and "sign" and "compatible" are her words on the page.
- **She uses his sign to explain him.** Typical lines: "He's Virgo. They do that." "Hot & cold… because he's a Gemini." Astrology chats that also mention distance or coldness: 46 chats, 21.7% bought, the strongest pairing in the pull. That's the page's split: astrology explains him, and Evelyn looks at her.
- **A quarter of her astrology chats are about commitment.** 107 of the 414 astrology-word chats also say commit, marry or marriage (16.8% bought). Across all love chats, "choose me" shows up in 384 and "won't / never marry" in 27 (22% bought). Hence "won't commit" and "never chooses you all the way", which fit both stories.
- **"Compatible" is her concept word:** 155 chats. "Perfect / good match": 41 chats, 24% bought. "The stars": 29 chats, 27.6% bought ("I really don't think it's in the stars").
- **The jargon barely shows up.** Birth chart 4 chats, Saturn 2, retrograde 2, synastry 2. Each jargon term goes in once, in the list.
- **What the bans cost.** "Soulmate" is in about 1 in 5 of the chats that use an astrology word (104 of ~470).
- **Not pulled in this run:** Instagram and TikTok (Virlo), the Meta Ad Library and Reddit. No paid calls were allowed. The community terms come from the buyer chats and plain astrology vocabulary.

## Does the headline fit every ad?

| Ad | Fits? | Why |
|---|---|---|
| This Is My Friend (Jules: "He introduced me as his friend.") | ✓ | It should work, and he keeps her as a friend. He holds back and won't commit |
| He Still Doesn't Know (Laurel: "I heard why he won't marry me." Six years) | ✓ | Six years should work. "Won't commit" covers "won't marry" |
| An astrology woman, no cut yet, who believes their signs match | ✓ | It's her own belief, stated back to her |
| An astrology woman whose charts say they clash | ✗ | The headline assumes they match. The first alternate fits her |

Neither story's own picture is on the page: the introduction, the overheard reason and the six years all stay in the ads.

## Rule check

- **Voice rules:** 0 fails over 56 copy strings plus the directive (`render_lanes.py` exit 0). Nothing uses karmic, soulmate, twin flame, reading, prediction words or money words.
- **Keyword counts:** all 11 in range.
  - Astrology 7 (target 6–8).
  - Compatible 4 (3–4).
  - Sign 4 (3–5).
  - Commit 2 (2–3).
  - The stars 2 (1–2).
  - Birth chart 2 (1–2).
  - Horoscope, zodiac, moon sign, rising and Mercury retrograde once each.
- **Sentence length:** 91% of sentences are 10 words or fewer. The only one over 12 is the photo description (13 words), which is one descriptive sentence by design.
- **Bent:**
  - **Contractions:** 38% against the house ~40%. The list items are fragments and can't take them.
  - **"Sign":** capped at 4 on purpose. It's her word, but at 5 or more it starts repeating inside a section.

## Calls I made without asking

1. **"Astrology" is the main keyword, not "sign".** Meta targets the astrology interest, and the lane id says astrology. She says "sign" and "compatible", so those carry her side of the page.
2. **The block sits on top of her sign, not in it.** Born vs learned: astrology is how she loves, and Evelyn looks at what she was taught after. So no line says astrology is wrong or can't see something. The nearest is the FAQ answer "It can tell you a lot about him. Why you stay is a different question."
3. **I cut "Where else would you look?"** It could read as a jab at astrology. It became "It's where you've always found answers."
4. **Evelyn asks for his sign in her first question,** but never interprets it. The directive says to take it as how she sees him, and never to say what a sign means he'll do next.
5. **Karmic, twin flame and soulmate stay off the page.** Soul is banned, and the other two are their own lanes later.
6. **The friend's line is a composite:** "You two are so compatible. What's he waiting for?" It isn't a buyer quote. No buyer words are on the page.
7. **Evelyn's bio** (seer in the west of Ireland, her teacher's teacher, night and candlelight) is the brand's, so it matches lane 1.

## What to decide

1. **The headline assumes her signs match.** Keep it, or take the alternate *Something Under Your Sign Is Blocking Love*? The alternate fits more women but drops "astrology" from the card.
2. **"Is Evelyn an astrologer? No."** OK as its own heading, said this plainly?
3. **His sign in Evelyn's first question:** keep it, or ask only for "the one thing he still won't say"?
4. **An exception for "soulmate"?** About 1 in 5 astrology chats use it.
5. **Karmic:** keep it off the page, or use it once in the FAQ? It's tiny in astrology chats (13 chats, 4 paid).
6. **Mercury retrograde, moon sign and rising,** once each: keep them, or swap them for plainer lines? Buyers rarely type them.

The funnel-wide decisions D1–D4 are still open in the README and aren't repeated here.

## Before this can go live

`/fb` can't serve lanes yet. `shared/beliefLanes.ts` isn't on Production: I checked the local `origin/Production` and the remote branch head through the GitHub API, read only. So stage 6 starts with the one-time build in `references/wiring.md`, and this lane alone doesn't make it "done".

## Claimed vs verified

| Claim | Status |
|---|---|
| 0 voice-rule fails, every count in range | Verified (script output, exit 0) |
| Buyer word counts | Verified: 5 read-only runs of `lane_words.mjs` with `LIVE_AUDIT_CONFIRM=1` |
| Instagram, TikTok, Ad Library, Reddit | **Not pulled.** No paid calls in this run |
| Headline fits both ads | My reading against the two story lines given. There are no astrology cuts to check against yet |
| Nothing written outside `outputs/` by this run, no git changes | Verified: every render pointed at `outputs/`, and the tracked tree and HEAD (d5c0b4a) are unchanged. ⚠ `improve-v1/belief-lanes/README.md`, `lanes/1-manifestation.json` and `lanes/1-manifestation.md` changed at 09:01:30 during this run. That wasn't this run; it's probably the main session or OneDrive. Worth a look |
| Mockup, artifacts | Not rendered or published (left to the main session) |
