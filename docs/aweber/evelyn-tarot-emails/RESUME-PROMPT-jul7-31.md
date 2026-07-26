# RESUME RUNBOOK — Evelyn tarot daily emails, Jul 7–31 2026

**Mission:** Write + schedule 25 Evelyn Cross tarot daily emails (Jul 7–31, 2026), end to end — long-form reading → canonical AWeber HTML → hosted S3 card hero → **create + schedule an AWeber broadcast** — at the proven bar of the first batch. Invoke the **`/evelyn-tarot`** skill first; it carries the full recipe. This runbook adds the exact lineup, dates, and pipeline so nothing needs re-deciding.

Work dir = repo root. All paths below are repo-relative.

---

## Already done — DO NOT resend or duplicate
- **List:** `theseerwithin_free` = AWeber list **`6936953`** (= `AWEBER_LIST_ID`). Daily send slot: **6:30pm SGT = 10:30 UTC**.
- **Sent:** Jun 30 — `01-ace-of-cups`.
- **Scheduled Jul 1–6** (leave alone): `02-two-of-cups` (Jul 1), `03-death` (Jul 2), `04-temperance` (Jul 3), `05-the-star` (Jul 4), `06-the-lovers` (Jul 5), `07-knight-of-cups` (Jul 6).
- Knight of Cups' tomorrow-hook promised **Three of Cups**, so this batch opens there on **Jul 7**.
- Send files are named `NN-slug.html` (NN = send order). This batch continues **NN = 08 … 32**.

## First, sanity-check the pipeline
Run `node docs/aweber/aweber-broadcast.cjs probe` → expect `GET broadcasts -> 200`. If 401/scope error, the broadcast token needs re-minting via `docs/aweber/aweber-oauth.cjs` (see Tooling). Then `node docs/aweber/aweber-broadcast.cjs list` to confirm Jul 1–6 are scheduled and Jul 7+ are empty.

---

## The lineup (write in this order — each email's tomorrow-hook names the NEXT card)
| NN | Date (send `…T10:30:00Z`) | Card (slug) | State | Angle | tomorrow-hook → |
|----|------|------|-------|-------|-----|
| 08 | Jul 7  | `three-of-cups`   | valve | joy & sisterhood beyond romance; the women who hold you | Five of Cups |
| 09 | Jul 8  | `five-of-cups`     | C | grief: the two cups still standing behind the spilled three | Knight of Wands |
| 10 | Jul 9  | `knight-of-wands`  | B | the fiery pursuer vs the steady one; passion that lasts vs flares | Seven of Cups |
| 11 | Jul 10 | `seven-of-cups`    | A | fantasy vs real — choosing one true cup over seven shiny ones | the Empress |
| 12 | Jul 11 | `the-empress`      | valve | self-worth, receiving, becoming fertile ground | Eight of Cups |
| 13 | Jul 12 | `eight-of-cups`    | C | the courage to walk from the half-full thing | Page of Cups |
| 14 | Jul 13 | `page-of-cups`     | B | the small sign; staying open to the unlikely | the Moon |
| 15 | Jul 14 | `the-moon`         | A | projection & illusion — reading him in the dark | Ten of Cups |
| 16 | Jul 15 | `ten-of-cups`      | B | the vision of lasting love; aim past the fling | the Hermit |
| 17 | Jul 16 | `the-hermit`       | valve | solitude as preparation; the inner lamp | Three of Swords |
| 18 | Jul 17 | `three-of-swords`  | C | heartbreak — the necessary rain | Queen of Cups |
| 19 | Jul 18 | `queen-of-cups`    | A | loving deeply without drowning | the Sun |
| 20 | Jul 19 | `the-sun`          | C | joy & clarity return; nothing left hidden | Four of Cups |
| 21 | Jul 20 | `four-of-cups`     | A | the discontent that blinds you to the offered cup | the Hierophant |
| 22 | Jul 21 | `the-hierophant`   | B | commitment & "official" — your vow vs the script | Six of Cups |
| 23 | Jul 22 | `six-of-cups`      | C | an old love resurfacing; nostalgia's gift & trap | Strength |
| 24 | Jul 23 | `strength`         | valve | gentleness as power; taming fear, not forcing love | King of Cups |
| 25 | Jul 24 | `king-of-cups`     | A | the emotionally steady man; what maturity looks like | Nine of Cups |
| 26 | Jul 25 | `nine-of-cups`     | valve | the wish card — naming what you actually want | Wheel of Fortune |
| 27 | Jul 26 | `wheel-of-fortune` | B | timing & cycles; the turn, his return, the season | the Hanged Man |
| 28 | Jul 27 | `the-hanged-man`   | A | the pause; seeing it upside down | Ten of Swords |
| 29 | Jul 28 | `ten-of-swords`    | C | rock bottom is the turn; the worst already behind | the World |
| 30 | Jul 29 | `the-world`        | valve | wholeness, completion, the dance | Ace of Wands |
| 31 | Jul 30 | `ace-of-wands`     | B | a new spark; the beginning of desire again | Judgement |
| 32 | Jul 31 | `judgement`        | C | rebirth — the second chance, rising when called | the Fool (next batch) |

All 25 card PNGs exist in `docs/aweber/tarot-images/<slug>.png`. Balance: A×6, B×6, C×7, valve×6.

---

## Per-email pipeline (repeat for each row)
1. **Write the long-form copy** (~900–1,200 words) in Evelyn's voice. Structure (locked): slow ekphrasis of the card image → name the card + its essence → turn to the reader → symbol/number substance → **MID CTA** (before the segments, themed to the card, link tagged `&cta=mid`) → **"for the one who…" segments** speaking to all three states (A "is it him", B "when's he coming", C "will I love again") → one **do-today practice** → **tomorrow-hook** naming the next card in the table → `<hr>` → **END CTA** (open-field invite) → `— Evelyn`.
2. **Host the hero:** `node docs/aweber/evelyn-tarot-emails/host-card.cjs <slug>` (optimizes PNG→<200KB JPEG, uploads to S3 `evelyn/tarot/<slug>.jpg`, verifies GET 200).
3. **Render the send file** `docs/aweber/evelyn-tarot-emails/NN-<slug>.html` — **clone an existing send file exactly** (e.g. `05-the-star.html`): white bg · Helvetica 16px #333 · Seer Within banner (keep the exact `hostedimages-cdn.aweber-static.com/...` URL) · blue `#0000ff` underlined links · gray `#DEE0E8` `<hr>` · hidden preheader div + zwnj spacer · pre-frame line · linked hero `width:240` at `https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot/<slug>.jpg` · body · footer (140 Broadway / Unsubscribe). **Top HTML comment** carries Subject + Preheader + link.
4. **Create the broadcast:** `node docs/aweber/aweber-broadcast.cjs create docs/aweber/evelyn-tarot-emails/NN-<slug>.html --subject "<curiosity subject>, {{ subscriber.first_name | capitalize }}"` → note the printed `broadcastId`.
5. **Schedule it:** `node docs/aweber/aweber-broadcast.cjs schedule <broadcastId> --at <YYYY-MM-DD>T10:30:00Z`.
6. **Update** `docs/aweber/evelyn-tarot-emails/STATE.md` (card, state served, tomorrow-hook, bcast id, scheduled date).

## Conventions
- **Subject** = curiosity (tease the turn, don't state the lesson) + first-name personalization: end with `{{ subscriber.first_name | capitalize }}` in place of "dear". **Body keeps "dear"** (~6–8× per email, not more). This mirrors the live sends.
- **Link scheme:** `https://www.theseerwithin.com/evelyn/?utm_source=aweber&utm_medium=seerwithin_free&utm_campaign=<slug>&bucket=love` (add `&cta=mid` on the mid-CTA link only). `/evelyn` is an open "what's on your mind" field → CTAs invite *typing* ("tell me what's on your mind, and we'll take it from there"), not "come".
- **Mechanism, not sentiment:** every email must teach a real reframe + a do-today practice and stand on its own even if never clicked. No bare reassurance.
- **Guardrails:** tarot/fate/intuition only — **Christianity-free** (no God/saints/scripture). Tendencies, **never a named man or a date**. Audience skews women 35–75, often lonely/grieving — comfort is real, never manufacture fear.

## Gold-standard clones (voice + HTML)
`docs/aweber/evelyn-tarot-emails/{01-ace-of-cups,02-two-of-cups,03-death,04-temperance,05-the-star,06-the-lovers,07-knight-of-cups}.html`. Read 2–3 before writing.

## Tooling & gotchas
- Broadcast API token lives in `.env` as `AWEBER_BROADCAST_ACCESS_TOKEN` / `AWEBER_BROADCAST_REFRESH_TOKEN` (has `email.write`). `aweber-broadcast.cjs` auto-refreshes on 401 and **persists rotated tokens back to `.env`** (AWeber refresh tokens are single-use).
- AWeber **writes require form-urlencoded** (the script handles this; raw JSON → 415).
- `scheduled_for` is **UTC** (`…Z`). 6:30pm SGT = **10:30 UTC**. `create` makes an unscheduled draft; `schedule` is a separate, explicit call — nothing sends immediately.
- Re-mint token if needed: `node docs/aweber/aweber-oauth.cjs url` → approve in browser (redirect `https://localhost`, existing app client_id) → `node docs/aweber/aweber-oauth.cjs exchange "<redirected-url>"`.

## Verify (per email, and at the end)
After creating each: GET the broadcast and confirm body length ~10–11k, hero URL present, `dear` count 6–14, both `cta=mid` and "take it from there" present. At the end: `node docs/aweber/aweber-broadcast.cjs list` (or GET `?status=scheduled`) → confirm 25 new broadcasts, one per date Jul 7–31 at `10:30:00Z`, subjects first-name-personalized.

## Definition of done
25 send files `08-…` through `32-judgement.html`; 25 heroes on S3 (GET 200); 25 broadcasts scheduled Jul 7–31 @ 10:30 UTC on list 6936953; STATE.md updated; unbroken hook chain (Jul 31 Judgement teases the Fool for the next batch). Report a table of date · card · bcast id · scheduled_for.

*(Optional: if you want this drafted in parallel by a multi-agent workflow, include the keyword "ultracode" in your kickoff so the session can fan out ~25 drafting agents against the per-row briefs above, then batch the host/create/schedule steps.)*
