# The /fb-read device scout — design

**Date:** 2026-09-02 · **Status:** designed, not built · **Branch:** `coffee-cup`

How we find device #5. Devices 1–4 (dream, tea, coffee, egg) were each found by hand,
and coffee cost most of a week because the question *"is this field even readable?"*
got asked after the art brief instead of before it. This is the method that asks it first.

---

## The chain

1. **Wikipedia enumerates the whole universe once** — 430+ named divination methods,
   of which ~20 are the residue family where a hidden field can exist at all.
2. **One hard gate: hidden field.** Everything else is a checklist applied to finalists.
3. **YouTube supplies the proof** — existence, view counts, field behaviour, register
   and often the mark taxonomy, all off one search grid.
4. **Sorted by views, never by date.** Age is a bonus, not a penalty.

Two lanes. Wikipedia for the idea, video for the proof.

---

## 🔴 The toolchain was TESTED, not assumed

Run 2026-09-02. This section exists because the obvious design — "drive TikTok in
Chrome" — does not work, and would have been written into a skill unverified.

| Tool | Result |
|---|---|
| Web search scoped to `tiktok.com` | ✅ **Works.** Existence, mark vocabulary, register hashtags, and the tutorial-body gate |
| TikTok **search results** in Chrome, logged in | ❌ **"Something went wrong."** Three attempts, via deep link AND the in-page search box |
| TikTok **video page** in Chrome, logged in | ❌ **Bot-check interstitial**, unresolved. Not bypassed and must not be |
| TikTok **typeahead** in Chrome | ✅ **Works** — TikTok's own search-suggestion data |
| `WebFetch` on a TikTok video or `/discover/` page | ❌ Returns empty. Bot-walled |
| `WebFetch` on a YouTube video page | ❌ Returns empty. JS-rendered |
| **YouTube search in Chrome** | ✅✅ **View counts in the grid, a Shorts type filter, and a sort-by-views control** |

**The observation that rescues the design: TikTok content appears to be mirrored onto
YouTube Shorts, watermark intact.** A TikTok-watermarked Short showed up in the very
first YouTube result grid — so being blocked from TikTok may cost far less than it
appears, the same clips being reachable with public counts on a site that does not
fight automation.

🔴 **This is one thumbnail, not a finding.** Same standing as coffee's saucer
hypothesis in `REFERENCES.md` — n=1, stated so nobody builds on it as fact. How much
TikTok material actually reaches YouTube Shorts needs its own check on the first full
run: count watermarked results per query and record the rate.

**YouTube is the metric lane. TikTok is a supporting lane, via web search + typeahead.**

---

## The stages

### Stage 0 · Enumerate — Wikipedia, once, never re-run

`https://en.wikipedia.org/wiki/Methods_of_divination` → filter to the **residue family**:
something is poured, dropped, floated, burned or scattered into a vessel or onto a
surface, and the pattern *it makes on its own* is read.

~20 rows. This is the closed candidate universe.

### Stage 1 · The gate — hidden field, and nothing else

**Test:** does the practice's own community publish *"how to read X"* instruction?
Nobody writes a tutorial on reading something obvious.

Answered free inside Stage 2 — it is the shape of the result titles and of TikTok's
own typeahead.

⚠ **The signal only works in conjunction with the Stage 0 filter.** On its own it would
pass tarot, which has endless tutorials and is not a hidden field. The field must be made
by physics, not dealt from a deck. Both, or neither.

Rejects, for the record: candle (she already saw the flame lean), dream (she recognises
her own), palm (the sign is on her hand). See memory `fb-read-device-classes`.

### Stage 2 · Scan — all ~20 rows

**Two searches per candidate.**

**A · YouTube, in Chrome** — the metric:

```
https://www.youtube.com/results?search_query=<practice>+reading&sp=CAM%3D
```

`sp=CAM%3D` is **sort by view count**. It lives in the `PRIORITIZE` column of the
filters panel, which is a *different column* from `UPLOAD DATE` — so "sort by views,
never date" is not a discipline to remember, it is two clicks with the date column
left alone. **Never add an upload-date filter.** Add the `Shorts` type filter to
isolate the vertical format.

Read straight off the grid, without opening a video: title, view count, age, channel.
Open a video only for its **chapter markers**, which are often the mark taxonomy.

**B · Web search scoped to `tiktok.com`** — the texture:

```
WebSearch: "<practice> reading"  allowed_domains: ["tiktok.com"]
```

Returns captions and hashtags: what the marks are called, and what the practice is
natively *for*.

**Per-row output:**

| Column | Source | Notes |
|---|---|---|
| Hidden field? | title shapes + typeahead | **The only hard gate.** Fails → row dies |
| Top view count | YouTube, sorted | Highest ever seen, any year |
| Age of the top result | YouTube | **Old + high = bonus** |
| Depth | YouTube | How many results clear **~50K**. One hit is luck; five is a practice. ⚠ That threshold is a starting guess set off the egg's five Shorts at 38K–143K — calibrate it after the first full run, do not treat it as a law |
| Marks | TikTok captions + YT chapters | Raw `mark` / `reading` material |
| Register | TikTok hashtags | What is it natively FOR |
| Field note | thumbnails + captions | What the substance actually does |

### Stage 3 · Verify — top 2–3 only

Watch the footage. The coffee-killer questions:

- Are there **three separated marks**, or one mass? (coffee coats; tea scatters by grade)
- Do they differ in **kind**, not merely position? (egg's spikes / web / yolk)
- What makes them **contrast**? (egg needed a dark card behind the glass)
- Is there a **position grammar** — an axis that means something? (tea's handle-side,
  coffee's depth, egg's vertical column)
- Is it **shootable in a kitchen in ten minutes**?
- Is the **register steerable** to the three love hooks, or welded to grief and harm?

### Stage 4 · Deep read — the winner only

Public-domain manuals on archive.org for the position grammar, where YouTube chapters
did not already supply it. Then a shoot brief in the shape of `egg-shoot-brief.md`.

---

## Proof: the method was run against the known case

The egg was researched by hand this session, so it is a regression test with a known
answer. Searching `egg cleanse reading water`, sorted by views:

| | Views | Age |
|---|---|---|
| HOW TO DO THE POWERFUL SPIRITUAL EGG CLEANSE YOURSELF! | **1.3M** | 5 years |
| How to Interpret an Egg Cleanse | **605K** | 7 years |
| Egg Cleansing \| Yeyeo Botanica | **185K** | 6 years |
| Five Shorts, same query | 38K–143K | mixed |

Four things this establishes:

1. **The hand-found number was low.** We had 237K from one TikTok. The ceiling is **1.3M**.
2. **The recency rule is load-bearing, not a nicety.** The top three are 5, 6 and 7 years
   old. A date filter hides all of them and the practice scores zero.
3. **Depth separates a practice from a fluke.** Five Shorts at 38K–143K *plus* three
   long videos over 185K is a practice, not one lucky clip.
4. **The taxonomy comes free.** The 605K video's chapter list reads
   `Intro | Bubbles | Glass | Cloudiness` — the marks, named by the practitioner, in
   structured data. Stage 4 may often be unnecessary.

---

## Candidate universe (Stage 0 output)

ceromancy (wax dripped into water) · molybdomancy (molten metal poured into water) ·
plumbomancy (molten lead) · lecanomancy (basin of water) · hydromancy (water) ·
aleuromancy (flour) · alphitomancy (barley) · crithomancy (barley cakes) ·
spodomancy (soot) · libanomancy (incense ash) · carromancy (melting wax) ·
capnomancy (smoke) · botanomancy (burning plants) · anthracomancy (burning coals) ·
daphnomancy (burning laurel) · empyromancy · pyromancy · causimancy ·
**oomancy (egg — researched)** · **tasseomancy (tea, coffee — shipped)**

**Starting shortlist, on face:**

- **ceromancy** — wax into water. The egg's exact mechanic, different substance, Slavic
  and Romani lineage. Shot side-on through glass, so the egg's vertical grammar ports.
- **molybdomancy** — molten metal into water. A mass New Year custom in Finland, Germany,
  Austria and Turkey, so heavily documented; and the shape is read as a **shadow cast on
  a wall**, which is hidden-field twice over.
- **lecanomancy** — oil or ink on water in a basin. Overhead, so tea's grammar ports.
- **spodomancy / libanomancy** — soot and incense ash. Scatters rather than coats, which
  is exactly what coffee failed to do.

---

## Rules the method encodes

- **Hidden field is the only hard gate.** The Stage 3 checklist applies to finalists, not
  to rows. Fewer gates up front, judgement at the end
- **Sort by views, never by date.** No recency window ever
- **Age is a bonus.** Old + high views + nobody advertising it = an open lane
- Others' content is **study only**, filed with a licence column, **captions never
  stripped**. We shoot our own — an egg and a glass costs ten minutes
- **Reuse the three existing hooks** ⇒ no new guards. That economy is what made coffee cheap
- For a video device, **the final frame is the lander still**, so one shoot serves the ad
  and the lander and the gold-ring reveal survives
- **Never attempt to defeat a bot check.** TikTok's wall is a constraint to design
  around, which is what YouTube is for

---

## Deliberately excluded

| Cut | Why |
|---|---|
| **Meta Ad Library as a discovery lane** | Everybody runs the same stuff, so it finds no new signal (operator, 2026-09-02). It has one narrow non-discovery use — checking whether a finalist is already saturated — and that is a single query, not a lane |
| **X, Instagram, Pinterest, Reddit** | Login-walled and/or redundant. YouTube + TikTok web search answer their questions inside one search |
| **Wikimedia Commons, Pexels, Pixabay** | They only mattered while we thought we might ship borrowed footage. We shoot our own, so licence-clean sources stop being a requirement |
| **A 7-criterion intake rubric** | It was gating rows before anything was known about them. Moved to Stage 3, applied to 2–3 finalists |
| **Driving TikTok in Chrome** | Tested and blocked. See the toolchain table |

---

## Known limits

1. **View counts come from YouTube, not TikTok.** The mirroring makes this a good proxy,
   but it is a proxy. A practice that is huge on TikTok and absent from YouTube would
   score low. Mitigation: TikTok typeahead depth is a cross-check
2. **Web search is US-scoped.** Native-language names — *kahve falı*, *uudenvuodentina*,
   *limpia* — may under-return. Search both the English and the native name
3. **The tutorial-body gate can false-positive** on practices with a fixed symbol
   dictionary rather than an ambiguous field. Only Stage 3's human look catches that
4. **The output is a ranked shortlist, not a decision.** Nothing here picks the device

---

## Deliverable

One findings section appended to `improve-v1/fb-read/images/reference/REFERENCES.md`,
in the shape of its existing COFFEE and EGG sections: a licence table, a 🔴 finding, a
register warning, and an "if it gets built" note. Plus the ranked candidate table above,
filled in.

**Packaging:** run by hand once. Package as a skill **only if** the ranking earns it —
the way `fb-ad-question-mining` was packaged after its method had proven itself, not before.
