---
name: fb-belief-lanes
description: "Make a new belief-lane lander on /fb (served at /fb?lane=<id>): one page plus Evelyn's first chat messages for every FB ad that speaks one belief — manifestation, astrology, inner-child pattern, generational family, twin flame, karmic and so on. Runs: words from buyer chats and the belief's own community → copy as one lane JSON (the /fb card in today's style, keyword-led copy below the card so Meta reads who it's for, FAQ, six-beat chat opener, a directive that keeps the lane alive in later chat) → rule check + keyword counts → phone mockup + review page → operator approval → wiring and proof. Use it whenever the user says new lane, next lane, belief lander, lane page, write the pattern / family / twin flame / karmic lane, a lander for these manifestation or astrology ads, make the lander match these ads, /fb?lane=, or wants landers grouped by belief instead of by one ad — even if they never say 'lane'. Not for /fb-tarot question-hooks (fb-tarot-hooks), /fb-palm signs or hooks (fb-palm-add-sign, fb-palm-hooks), writing FB ad headlines (fb-ad-question-mining), or backend offers (be-offer-launch)."
---

# /fb belief lanes

A **lane** is a version of `/fb` for every ad that speaks one belief. The visitor sees the same
`/fb` card and flow. Only four text spots change: headline, sub-line, button, and the line under
the button. Below the card goes keyword-led copy, so Meta can read which women the ad is for.
Evelyn's first chat messages pick up where the page left off. Lanes live at
`/fb?lane=<id>`, one link for every ad in the lane, and `/fb` with no lane stays exactly as it is.

The structure is modeled on `fb-tarot-hooks` (stages, a hard review gate, measuring by revenue
per 1,000). None of its code applies here: decks, frames and cuts are not lanes. `/fb` is the
base.

| What | Where |
|---|---|
| Lane copy, the only source | `improve-v1/belief-lanes/lanes/<n>-<name>.json` ([fields](references/lane-json.md)) |
| Lane doc and review page | Rendered from the JSON by `scripts/render_lanes.py`. Never hand-edit them |
| Method: where keywords go | `improve-v1/belief-lanes/01-keyword-placement.md` (read before drafting) |
| Method: Evelyn's first messages | `improve-v1/belief-lanes/02-chat-openers.md` (read before drafting) |
| Lanes table, open decisions | `improve-v1/belief-lanes/README.md` |
| Making `/fb` serve lanes | [references/wiring.md](references/wiring.md) |

**Operating mode:** copy is data (JSON) until the operator approves it. No code is written and
nothing is wired before the review gate. Nothing goes live without an explicit go.

## The stages

`0 scope → 1 words → 2 draft → 3 gate → 4 REVIEW GATE → 5 record → 6 wire → 7 prove → 8 release + measure`

### 0 · Scope

- **Which belief, and which ads go to it.** Get the on-screen text of every ad cut aimed at the
  lane, or the ones planned. The page has to fit every one of them (stage 2). If no ad exists
  yet, check against the planned hooks and say so on the review page.
- **Id and number.** Use a short lowercase id (`manifest`, `astrology`, `pattern`, `family`) and
  the next free number in the README lanes table. Check the table first. Lanes 2 and 3 have first
  drafts in `review-pages/all-lanes-v2-draft.html`, written before the keyword and every-ad rules.
  Reuse what still fits, but don't trust their headlines.
- **Is `/fb` able to serve lanes yet?** Run `git show "origin/Production:shared/beliefLanes.ts"`.
  If it's missing, stage 6 starts with the one-time build in `references/wiring.md`. Tell the
  operator at scope time, because it changes what "done" means.
- Read the two method docs and the README's open decisions before drafting.

### 1 · Words

Meta matches the page's words to the ad's words. But buyers describe their own lives in
different words from the ads. Astrology buyers name **signs** and say **"compatible"**, and
almost never "birth chart" or "Saturn return". The page needs the ad's words for Meta and her
words for her.

**First, pick the source by who our chats came from.** Almost all our chats come from the
astrology audience, the only one we've run at scale. So the chats tell you how *those* women
talk, which is right for some lanes and wrong for others:
- **A belief our current traffic already holds** (astrology): the chats are the best source.
- **A belief we've never run traffic for** (manifestation, twin flame, karmic): the chats show
  how astrology-audience women talk about it, not how this audience does. Lead with the
  community's own words (steps 3 and 4), and use the chats only to check the plain-language
  bridge words. Example: lane 1 took "attract" as her word from 70 buyer lines. Those were
  astrology-audience women, so for manifestation traffic it's a guess, not a finding.
- **Words our own chat asks for** (pattern: "where did this start"; family: "has anyone in your
  family"): count her first message only, before Evelyn asks anything. Otherwise the count
  measures our question, not her.

Say in the `words` field which source each finding came from.

1. **Candidate terms:** from the ad text, the belief's vocabulary, and steps 3–4.
2. **Buyer chats (read only):**
   `LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-belief-lanes/scripts/lane_words.mjs --term "label=regex" …`
   This counts conversations and buyers per term, then prints quotes. Compare terms with each
   other, never with the overall buy rate: a chat that typed a word had already got further. For
   more quotes on one theme, use
   `.claude/skills/v1-funnel-live-audit/scripts/voc-by-theme.mjs --live --label X --pattern "<regex>"`.
3. **Instagram and TikTok:** Virlo `find_videos` (Instagram, `en`, `for_writing: true`). One
   page costs $0.05. Note what the community calls the thing and the most-commented hooks.
   Then read the **comments** on the top posts about love (Virlo `raw_comments`): captions are
   the creator's words, comments are the audience's. Virlo isn't connected inside subagents.
   If the call fails, use the last saved pull (the lane's stub doc or its earlier review page),
   and say in the review notes that Instagram wasn't refreshed.
4. **For a belief we've never run: the Meta Ad Library and Reddit.**
   - Find ads for this belief that have run for months (Virlo `raw_ad_search`), since a
     long-running ad is likely a profitable one. Note their words and where they send people.
     Their landing pages are what Meta already matches to this audience.
   - Reddit (for manifestation, r/lawofattraction and r/NevilleGoddard): long posts about love in
     the community's own words.
   - Watch the age skew. Our ads run to 35–65+. Newer jargon ("SP", "law of assumption", "3D",
     "self-concept") may belong to younger women than ours, so weigh it against the plainer
     terms.
5. **Write the result into the JSON:** `words` (findings, with numbers), `keywords` (the role
   table: Main, Second, Buyer's own word, Supporting, Once each, Keep out), and `kw` (counting
   regexes and target ranges, per the budgets in `01-keyword-placement.md`).

**Keep out:**
- Health-claim words: trauma, heal, "generational trauma".
- Words near the excluded trauma-bonding territory, such as "attachment style".
- Money, abundance and career words. They pull in a different audience, and money is a Meta flag
  area for us.
- Prediction words.
- The banned list. "Soul" is banned, so "soulmate" is out unless the operator grants an
  exception. When the word is big in the data, say what the ban costs.

**Never put a real buyer's words on the page.** The chat promises her "Everything we discuss
stays between us". Her words choose the vocabulary; the copy uses composite lines.

### 2 · Draft the lane JSON

The fields are explained in `references/lane-json.md`. What matters most:

- **Every-ad fit.** The headline and the below-card copy must hold for every ad in the lane. The
  first manifestation draft ("You manifested him. That part worked.") only fit the ad where she
  got him, and the operator caught it. Make a small table of each ad, or each kind of ad, against
  the picked headline, marked ✓ or ✗. There are no per-ad lines on the page: the operator
  dropped the `?ad=` key on 2026-11-18, so every ad links to the same page. Wording that
  belongs to one ad stays in that ad.
- **The card: four spots, in today's `/fb` voice** (what used to be called version 2).
  - Headline in the "Something Is … — I Can See It" shape, a sub-line like "Evelyn has
    sensed…", and a "Yes Evelyn, …" button.
  - **Write three headlines. The operator chooses** (2026-11-18). Each one fits every ad,
    names a problem and has the main keyword near the front, and all three work with the same
    sub-line and button. Make them three different angles, not three wordings of one idea. Put
    your recommendation in `h` and the other two in `alts`. In `why`, say in a line or two what
    each angle bets on. The checker fails a lane without exactly three.
  - The lane's main keyword goes near the front of the headline.
  - The headline names a problem. The operator picked "Something Is Blocking What You Manifest"
    over "Something Is Shaping What You Manifest" (2026-11-18): "blocking suggests a problem,
    shaping is vague." Naming a block doesn't knock her belief: the block sits under her
    practice, not in it. Skip soft verbs like shaping, guiding or behind.
  - The line under the button starts "It's free to message Evelyn."
  - Version 1 (her words, first person) is parked: the operator chose the `/fb` voice only on
    2026-11-18. Don't draft it unless asked. If it comes back: no quote marks, no name, photo,
    age, city, stars or "verified" (they turn it into a testimonial, and a made-up testimonial
    breaks the US FTC's 2024 rule). The operator also tried and rejected quote marks with a bold
    "Ever said this to a friend?" opener.
- **Below the card, in this order:**
  1. The belief section, under a keyword heading. Show her life from outside (what friends said)
     and use the buyer's own word.
  2. The "what you've tried" list: community terms, each once, each something she actually did.
  3. The turn: the lane's belief, ending "Evelyn finds where it started, from your first name."
  4. Who Evelyn is, in the ads' terms. Never set her apart from the lane's belief: no "Evelyn
     isn't an astrologer", "isn't a manifesting coach" or "she won't ask for your birth time".
     The operator (2026-11-18): "in the world of spirituality, they are the same." She speaks
     the lane's language as her own, and the first name is simply how she starts.
  5. When you send your first name: the chat is free, plus the honest line that the letter isn't.
  6. An FAQ of 3–4 questions worded like searches, plus "Is it free to message Evelyn?".
  7. The ask again.
- **Meta box:** title, description and photo description, per `01-keyword-placement.md`.
- **Opener:** the six beats in `02-chat-openers.md`. Her name is asked second. The beat-6
  question gets her answering in her own words.
- **Directive:** 3–5 plain sentences the later chat steps receive:
  - which page she came from;
  - her words to reuse;
  - the lane's belief;
  - what Evelyn never does in this lane, e.g. never says manifesting doesn't work, never predicts
    from signs.

  This is what stops the lane vanishing after the opener. Never name a banned or keep-out word
  in it, not even as "never say trauma". The chat model echoes what it's given, and the checker
  fails it. Say what to do instead ("keep to the page's words: pattern, childhood").
- **Open:** every decision that belongs to the operator.

House copy rules on top of the voice rules below:
- Show it from outside, not "you've felt it".
- Picture before meaning.
- Conversational, around 40% contractions, no aphorisms.
- She is the subject.
- A long, specific line built from buyer words beats a short vague fragment.
- No testimonials, and don't ask the operator about them.

### 3 · Gate

```
python3 .claude/skills/fb-belief-lanes/scripts/render_lanes.py improve-v1/belief-lanes/lanes/<n>-<name>.json \
  --html <scratchpad>/lane-<id>.html --md-dir improve-v1/belief-lanes/lanes --counts <scratchpad>/lane-<id>-counts.json
```

It renders the review page and the lane doc, counts keywords against their targets, and checks
every copy string against the voice rules. It exits 1 on any rule fail. Fix every fail.

Keyword counts should land in range. If one doesn't, keep it only with a reason you'd say out
loud. Report each rule you bent and why, e.g. "the ad's own closing line, kept word for word, runs
12 words".

Then read the page as she would. Every paragraph has to earn its place for her, not only for Meta.

### 4 · Review gate: hard stop

Publish two artifacts:
1. **The mockup:** the page as she'll see it on a phone (the card, the copy below it) and
   Evelyn's first messages. This is what the operator looks at.
   `python3 .claude/skills/fb-belief-lanes/scripts/render_mockup.py <lane>.json --out <scratchpad>/lane-<id>-mockup.html`
2. **The review page:** from stage 3, with keyword highlights, counts and notes. This is what
   the operator checks.

A new lane gets new artifacts; edits republish the same files, so the links stay the same. Tell
the operator exactly what to decide: first the headline (the mockup lists all three and swaps
them on the card), then the lane's `open` list. When they pick, put the chosen one in `h`, keep
the other two in `alts`, and set `"chosen": "<date>"` on `card.v2`.

**Nothing moves past this point until the operator says go.** Changes go into the JSON, then
re-render and republish.

### 5 · Record

- The JSON and the rendered doc go in `improve-v1/belief-lanes/lanes/`. Update the README lanes
  table and add the artifact link. Update the `belief-lane-landers` memory.
- The folder is untracked, and it sits inside OneDrive, which has wiped untracked files here
  before. Back it up with
  `rsync -a --delete improve-v1/belief-lanes/ ~/tsw-preview/improve-v1/belief-lanes/`.
- Don't commit unless asked.

### 6 · Wire (after go)

Follow `references/wiring.md`. If `/fb` can't serve lanes yet, the one-time build comes first.
After that, adding a lane is one registry entry made from the approved JSON. Code work happens in
a clone outside OneDrive.

### 7 · Prove

1. `/fb` with no lane, and with an unknown lane, is byte-identical to today, shown by a test.
2. **What Meta reads.** With JavaScript off, the server HTML for `/fb?lane=<id>` shows the lane
   title, the headline, a section heading and "free to message". Check a preview link in Meta's
   Sharing Debugger.
3. **A walk through the funnel** to checkout, `v1-funnel-audit` style.
4. **Derail replay.** The same answers through the chat with and without the lane. The lane's
   words must still appear in the first and second message steps after the opener (`reading1`,
   `reading2`). `improve-v1/04-fb-palm-derail-PROVEN.md` is the failure this guards against.
5. The `posthog-track-funnel` skill, for the `lane` property.

### 8 · Release and measure

- Local, then dev, then Production, each step only with the operator's explicit go (the
  `be-offer-launch` squashed cherry-pick pattern).
- Every ad in the lane links to `/fb?lane=<id>`. UTMs unchanged.
- Measure the lane against `/fb` by **revenue per 1,000 chats** (front end + bump + upsells),
  plus the name rate and chat-start rate. Change one thing at a time per lane.

## Invariants

1. `/fb` with no lane, or with an unknown one, is byte-identical to today. A lane never changes
   the card's layout, avatar, status, 3-second button delay, trust row or footer. The first name
   is asked in the chat, never in a field on the page.
2. Nothing on the page fits only one ad. One-ad wording stays in the ad.
3. The lane JSON is the only copy source. Docs and review pages are rendered from it.
4. Copy comes before code. Nothing is wired before go, and nothing goes live without an explicit
   go.
5. Stripe `product` stays `energy_clearing_ritual`. The lane is an additive key.
6. The lane reaches every chat step, not only the opener.
7. No real buyer's words on the page, and no invented named customers.
8. The voice rules below hold for every string, including the chat and the Meta box.

## Voice rules (verbatim from the operator's brief)

- Never use: psychic, tarot, reading, fortune, spell, magic, AI, chatbot, price, $.
- Nothing religious: no God, church, soul, bless, prayer, holiday.
- No health, income or guarantee claims.
- No exclamation marks. Short sentences, most under ~10 words. Calm, never hype.
- The chat is free. Never say or imply the letter is free.
- Leave /fb exactly as it is.
- No production deploy or live-route change without explicit operator approval.
