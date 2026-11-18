# belief-lanes — `/fb` lander lanes, one per belief

> **Status (2026-11-17): copy proposal. Nothing built, nothing live.** No build, deploy or live-route change without explicit operator approval. `/fb` itself stays exactly as it is.

## What this is

The FB story ads ("This Is My Friend", "He Still Doesn't Know") are cut by belief: manifestation, pattern, family, astrology. Each belief lane gets two things:

1. **Its own page:** the live `/fb` card with four text spots changed (headline, sub-line, button, the line under it). Below the card goes keyword-led copy, so Meta reads which women the ad is for.
2. **Its own first chat messages:** Evelyn picks up where the page left off and asks her first name second, not sixth.

Each headline has to fit **every** ad in its lane, not one cut. Every ad in a lane links to the same `/fb?lane=<id>`, so an ad's own words stay in the ad (the `?ad=` key was dropped on 2026-11-18).

## Lanes

| # | Lane | Link | Status | Copy source |
|---|---|---|---|---|
| 1 | Manifestation | `/fb?lane=manifest` | **Approved 2026-11-18.** Wiring in progress, not live | [`lanes/1-manifestation.json`](./lanes/1-manifestation.json) (doc: [`.md`](./lanes/1-manifestation.md)) |
| 2 | Pattern (inner child) | `/fb?lane=pattern` | First draft, needs keyword pass | [`lanes/2-pattern.md`](./lanes/2-pattern.md) (hand-written stub, no JSON yet) |
| 3 | Family (generational) | `/fb?lane=family` | First draft, needs keyword pass | [`lanes/3-family.md`](./lanes/3-family.md) (hand-written stub, no JSON yet) |
| 4 | Astrology | `/fb?lane=astrology` | Complete copy, awaiting approval | [`lanes/4-astrology.json`](./lanes/4-astrology.json) (doc: [`.md`](./lanes/4-astrology.md)) |

**Next:** lanes 2 and 3. Both are in the original brief, their ad cuts exist, and they hold the most buyers. Love chats in the past year that used each lane's words: pattern 3,107 (455 bought), family 811 (118), astrology 625 (75), manifestation 234 (31). Each lane was counted with its own word list, so read these as sizes, not a ranking. After those: twin flame (528 chats, 11% bought) and karmic (167 chats, 20% bought, the highest rate seen; ties to offer 11). A soulmate lane would be the biggest (5,014 chats) but is blocked by the ban on "soul".

## Files

| File | What it is |
|---|---|
| [`01-keyword-placement.md`](./01-keyword-placement.md) | The method: why keywords matter, the seven spots, how much is enough, signs of spam, voice rules, how to find a lane's words |
| [`02-chat-openers.md`](./02-chat-openers.md) | The six-beat shape of Evelyn's first messages, what it replaces, and the derail risk to build for |
| [`lanes/`](./lanes/) | Per lane: `<n>-<name>.json` is the **only copy source**, and `<n>-<name>.md` is rendered from it (don't hand-edit). Lanes 2 and 3 are still hand-written stubs |
| [`HANDOFF.md`](./HANDOFF.md) | Where the work stands, the next action, locked decisions and guardrails (2026-11-18) |
| [`drafts/`](./drafts/) | Lane JSONs written by the skill and waiting on the operator (astrology, pattern, family), each with its review notes. Approved ones move to `lanes/` |
| [`review-pages/`](./review-pages/) | HTML sources of the review pages (links below) |
| [`evidence/`](./evidence/) | One-off word-count scripts from the first two lanes, and the hand-written lane docs from before the JSON switch |

**How to make a lane:** the `fb-belief-lanes` skill (`.claude/skills/fb-belief-lanes/`). It runs words → lane JSON → check → review page → operator go → wiring. Its `scripts/` hold `lane_words.mjs` (word counts from the live DB, read only) and `render_lanes.py` (renders the doc and review page, counts keywords, checks the voice rules).

## Review pages (private claude.ai artifacts)

- Lanes 1 + 4, review page: source `review-pages/lanes-1-and-4-complete.html` (its artifact was deleted 2026-11-18)
- Phone mockups with the three-headline picker: manifest https://claude.ai/artifact/THm521KHWfRW7K6ye4USML · astrology https://claude.ai/artifact/2Xb9z5WgSPsoSRLoaZJUTe · pattern + family https://claude.ai/artifact/4kazWSwApFiZ3T1NATQGdB
- All lanes, first draft, before the keyword rule: https://claude.ai/artifact/LEb2VHMZw3PtaUhEPzpCQd (source `review-pages/all-lanes-v2-draft.html`)

## Scripts

The working scripts live in the skill: `.claude/skills/fb-belief-lanes/scripts/`.

- `LIVE_AUDIT_CONFIRM=1 node .claude/skills/fb-belief-lanes/scripts/lane_words.mjs --term "label=regex" …`: counts conversations and buyers per word in love and someone chats, then prints quotes. Read only. Queries the short answer columns only, because a regex over `messages` times out.
- `python3 .claude/skills/fb-belief-lanes/scripts/render_lanes.py lanes/<n>-<name>.json … --html <out> --md-dir lanes --counts <out.json>`: renders the review page and the lane doc, counts keywords, and checks the voice rules. Exits 1 on any fail.

## Open decisions

**Funnel-wide (D1–D4):**
- **D1:** "by morning" vs the chat's "within 24 hours, a 5–7 page reading". Ask Mike for the real time from purchase to email. Until then, no delivery-time promise on the pages.
- **D2:** the honest line separating the free chat from the paid letter. Recommended keep; it's in the copy now.
- **D3:** a conditional email ask.
- **D4:** keep the lanes inside funnel `v1-fb`, with an additive `lane` key on Stripe charges. `product` must stay `energy_clearing_ritual`.

**Lane copy:**
- ~~Card version 1 or 2~~ Decided 2026-11-18: version 2 (today's `/fb` style) only. Version 1 is parked in each JSON's `parked` field.
- An exception for "soulmate".
- "Karmic" once, in the astrology FAQ.
- Asking her sign as its own chat step.
- ~~The "Evelyn isn't an astrologer" line.~~ Dropped 2026-11-18: a lane never sets Evelyn apart from its belief.

**Chat:** keep the "our secret" line, and skip the topic buttons (`02-chat-openers.md`).

## Build notes (only after approval)

- Each lane's title, description and below-card text must be in the HTML the server sends. Today `server/static.ts` sends one `index.html` ("The Seer Within - Psychic Chat") for every route.
- Put the lane tag on the Stripe charge (additive key), the lead and the email tag. Keep the same pixel and UTMs. `/fb` stays untouched.
- Pass the lane to every chat message step, not only the opener (`02-chat-openers.md`). Prove it with the fb-palm replay method.
