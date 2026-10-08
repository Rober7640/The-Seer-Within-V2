# DEV HANDOFF — Evelyn V2 daily emails 01–07 + 09

**For: the developer.** The operator has approved the copy for all 7 emails (2026-10-08: "All good"). The remaining technical steps are **yours** — the operator won't do them. Branch: `daily-evelyn-7oct`. Folder: `docs/aweber/evelyn-storytelling/`. Read `README.md` (workflow) first.

⚠ **Email 05 is time-sensitive: it must be SENT by Sunday 18 Oct 2026** (it's based on a news story).

## Status per email

| # | Email | Reading brief in prod DB | Short link | Image on S3 | Send files built |
|---|---|---|---|---|---|
| 01 | `01-grandma-moses` | ✅ | `/e/9q_mA2w` ✅ in file | ✅ `evelyn/story/01-grandma-moses.jpg` | ✅ |
| 02 | `02-apple-peel` | ✅ | `/e/5aDhlv8` ✅ in file | ✅ `evelyn/story/02-apple-peel.jpg` | ✅ |
| 03 | `03-five-frogs` | ✅ | `/e/BwaUehg` ✅ in file | ✅ `evelyn/story/03-five-frogs.jpg` | ✅ |
| 04 | `04-book-of-fate` | ✅ (minted 2026-10-08) | `/e/AVOUYBs` — **not yet in the file** | ❌ | ❌ |
| 05 | `05-tuesday-rose` | ✅ (minted 2026-10-08) | `/e/g4UKAUY` — **not yet in the file** | ❌ | ❌ |
| 06 | `06-north-wind-sun` | ✅ (minted 2026-10-08) | `/e/K4T6TCI` — **not yet in the file** | ❌ | ❌ |
| 07 | `07-burning-ears` | ✅ (minted 2026-10-08) | `/e/e0LSkBI` — **not yet in the file** | ❌ | ❌ |
| 09 | `09-fifty-words` (🔒 locked 2026-10-08) | ❌ **not minted** — brief text operator-approved in the file | — (you mint it) | ❌ | ❌ |

All 7 reading briefs are rows in **production** `email_link_codes` (persona `evelyn-cross`, campaigns `story-0N-<slug>`). The "reading brief" is what lets Evelyn's chat continue the email instead of greeting the reader cold — see README "Reading brief + short link". It only reaches the chat if the reader arrived within 24 h and only for the first 4 messages (`server/lib/arrivalReading.ts`).

## Your to-do (04–07; 01–03 just need steps 4–6)

1. **Verify the short links** redirect with the right campaign:
   `curl -sI "https://www.theseerwithin.com/e/AVOUYBs?email=test%40example.com" | grep -i location` (repeat for g4UKAUY, K4T6TCI, e0LSkBI) → expect `/evelyn?campaign=story-0N-…&bucket=love&src=aweber…`.
2. **Add the short link to each email file's header**, above `**Big Idea:**`:
   `**Short Link:** \`https://www.theseerwithin.com/e/<code>?email={!email}\``
   (`build-email.py` then uses it for every link and warns if it's missing.)
   If you edit any reading-brief text (Big Idea / Reading Recap / Open Loop / Continue Seed), re-run `scripts/mint-short-links.mts` on that file — it's idempotent per campaign (keeps the code, updates the row). It writes to whatever `DATABASE_URL` points at, and prints the target DB first.
3. **Upload the pictures to S3** (bucket `luna-assets-tsw`, prefix `evelyn/story/`). ⛔ Never write under `evelyn/tarot/` (serves live broadcasts). ⛔ Never overwrite an existing key (sent mail points at it).
   Use the repo's uploader: `node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file <path> <key>` (reads `.env`; refuses `evelyn/tarot/`).
   | Email | Local file | S3 key |
   |---|---|---|
   | 04 | `assets/book-of-fate.jpg` | `evelyn/story/04-book-of-fate.jpg` |
   | 05 | `assets/tuesday-rose-couple.jpg` | `evelyn/story/05-tuesday-rose.jpg` |
   | 06 | `assets/north-wind-sun-sketch.jpg` | `evelyn/story/06-north-wind-sun.jpg` |
   | 07 | `assets/burning-ears-sketch.jpg` | `evelyn/story/07-burning-ears.jpg` |
4. **Build the send files** for each:
   `cd scripts && python3 -I build-email.py ../emails/0N-<slug>.md --send --image-url https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/story/0N-<slug>.jpg`
   → `0N-<slug>.send.html` + `.send.txt`. Check: every link is `/e/<code>`, no grey preview strip, image loads.
5. **Chat test** (owed for every email, most important for 02 apple peel, 03 riddle, 07 signs): click the short link, type 2–3 likely first messages (e.g. 03: "five!", "I've been deciding about him for a year"; 07: "my ears were burning yesterday"), confirm Evelyn continues the email's topic, makes no promises, and doesn't deny sending it. Note: a reader typing "broke" trips the chat's price-objection rule — the emails avoid that word.
6. **Schedule in AWeber only after the operator's explicit "go"** — subject = `**Subject:**` in each file; the challenger for an optional 50/50 subject split is in each file's `_Subject history_` line. Body = `.send.html` + `.send.txt`. Log the AWeber broadcast ids in the README sends log.

## Email 09 (added 2026-10-08) — one extra step: mint its reading brief
09 (the Dr. Seuss "50 words" dare) is locked and its reading brief is operator-approved, but **not yet saved**. Before steps 1–6 above:
- From the repo root: `npx tsx --env-file=<.env> docs/aweber/evelyn-storytelling/scripts/mint-short-links.mts docs/aweber/evelyn-storytelling/emails/09-fifty-words.md` → it prints the target DB first, then the `/e/<code>` link. Paste it as `**Short Link:**` (step 2).
- Picture: `assets/fifty-words-sketch.jpg` → `evelyn/story/09-fifty-words.jpg`.
- Chat test messages: "Here's my question in under 50 words: does he still think about me?" and "I can't get it under 50".
- Its pitch is a **Columbo close** — most of the pitch is in a long P.S.; `build-email.py` now renders every P.S. paragraph (fixed 2026-10-08), so check the whole P.S. appears in the send HTML.

Emails 08 and 10 are drafts still awaiting the operator's read — not yet part of this handoff.

## Already done — don't redo
- Copy, subjects, preheaders: operator-approved. Don't change copy without the operator.
- Reading briefs for all 7: minted (see table).
- 01–03: send files built, images on S3.
