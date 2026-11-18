# Handoff: belief lanes on /fb (2026-11-18)

## Goal
One `/fb` variant per belief (`/fb?lane=<id>`) so every story ad lands on a page in its own words, and Meta reads who the page is for. Lane 1 (manifest) is built; lanes 2 (pattern), 3 (family) and 4 (astrology) are drafted and waiting on the operator.

## Read first (in this order, only as the step needs it)
1. This file.
2. `.claude/skills/fb-belief-lanes/SKILL.md`: stages 4–8 and Invariants. The skill is how lanes are made; follow it.
3. `.claude/skills/fb-belief-lanes/references/wiring.md`: "Adding a lane" (4 steps) once a draft is approved.
4. `drafts/<n>-<name>-review-notes.md`: only for the lane being decided.
5. `README.md`: the open decisions D1–D4 (before any deploy).

## State
- **Branch** `origin/belief-lanes` (off Production e13e7b7a). Code is in the clone `~/tsw-lanes`; never work in the OneDrive checkout, which has wiped files before.
- **Done:**
  - The one-time build: registry `shared/beliefLanes.ts`, page variant, server HTML for Meta, opener, `laneDirective` in later prompts, tracking. Lane 1 is wired with headline "Something Is Blocking What You Manifest — I Can See It".
  - Tests: `npm run test:lanes` 76/76, Playwright `tests/belief-lanes.spec.ts` 8/8, derail replay PASS (`improve-v1/evidence/belief-lane-derail-replay-2026-11-18.txt`).
- **Drafted, not approved** (`drafts/`): `4-astrology.json`, `2-pattern.json`, `3-family.json`. Each has three headlines, `h` plus 2 `alts`.
  - Mockups with the headline picker: astrology https://claude.ai/artifact/2Xb9z5WgSPsoSRLoaZJUTe, pattern + family https://claude.ai/artifact/4kazWSwApFiZ3T1NATQGdB.
  - Manifest mockup: https://claude.ai/artifact/THm521KHWfRW7K6ye4USML.
- **Not done:**
  - Stage 7 proofs that need a public URL or real checkout: Meta Sharing Debugger, the funnel walk to checkout, the AWeber tag, the DB write, and PostHog end to end.
  - Nothing deployed.
- **NEXT ACTION:** get the operator's verdict on the manifest walk-through. Start it with `cd ~/tsw-lanes && PORT=5055 npm run dev`, then send them http://localhost:5055/fb/chat?lane=manifest&noemail=1 (the page is `/fb?lane=manifest`). Fix what they flag. Then do astrology (they asked for it after manifest).

## Locked decisions (don't relitigate)
- **Card** is today's `/fb` style only ("Something Is … — I Can See It", "Yes Evelyn, …"). Version 1 (her words) is parked in each JSON's `parked` field.
- **One link per lane.** The `?ad=` key and per-ad story lines were dropped: "meaningless". Wording that fits only one ad stays in the ad.
- **Headlines:** always three, and the operator picks. Mark the pick with `card.v2.chosen`. A headline names a problem: "blocking", not "shaping" ("shaping is vague").
- **Astrology:** the operator chose headline 1, "Something Is Blocking What Astrology Says Should Work — I Can See It".
- **Evelyn is never set apart from the belief.** No "isn't an astrologer", no "isn't a manifesting coach". "In the world of spirituality, they are the same."
- **Manifest:** no community word pull ("the words suggested are great"). No testimonials, no quote marks, no real buyer words on the page.

## Open threads
- **Astrology:** take the fresh draft's whole page (`drafts/4-astrology.json`), or headline 1 on the hand-written `lanes/4-astrology.json`? Plus its `open` list.
- **Pattern and family:** which headline (1, 2 or 3), plus each lane's `open` list.
- **Family ad cuts (not the page):** on the Jules cut, the "friend of the family" grandmother is Callum's (Odette). "Two years" is Jules's number; Laurel's is six.
- **Before deploy:** D1–D4 in the README. The starry background covers only the first screen. The primary Anthropic key in `.env` is out of credit; the app fails over to backup_1, so check the live key.

## Guardrails
- **`~/tsw-lanes/.env` points at the LIVE database.** Stripe, AWeber, FB CAPI, PostHog, Resend and Kit are blanked there, and `RUN_BACKGROUND_JOBS=false`. Never give an email in a local chat: at DEEPENING_2 the funnel migration creates a live `users` row and a pending drip email. One test account was created and then deleted, with the operator's yes.
- **Deploy order:**
  1. Apply `improve-v1/add-conversations-lane-column-2026-11-18.sql` to each database (dev and prod are separate). Never use `db:push`.
  2. Then deploy. Without the column, every conversations read and write fails.
  3. Release local → dev → Production, each only on the operator's explicit go.
- **Promoting a draft:**
  1. Move it to `lanes/` and set `chosen`.
  2. Run `.claude/skills/fb-belief-lanes/scripts/render_lanes.py`; it must show 0 fails.
  3. Add the registry entry. The registry must equal the JSON.
  4. Run `npm run test:lanes`.
- **Voice rules** are in SKILL.md. Never: psychic, tarot, reading, fortune, spell, magic, AI, chatbot, price, $, nothing religious, no "!". The chat is free; the letter is not.
- `/fb` with no lane must stay byte-identical. Don't commit or open a PR unless asked. Port 5000 is held by macOS AirPlay, so use 5055.
