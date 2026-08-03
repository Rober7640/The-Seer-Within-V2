# Evelyn Tarot — EXPERIMENT LEDGER

Tracks the two live experiments on the daily tarot sends (list `theseerwithin_free`, ~48k active). Companion to `STATE.md` (which tracks card rotation/state). Update the results columns after each send matures (~48h). Numbers can be refreshed from the API — see **Refresh** below.

## What we're testing
- **Q1 · Subject line.** Does *emoji + {first}-FIRST + a strong lever/genre* beat the quiet, literary, name-at-END style? Baseline (the quiet sends, Jun 30–Jul 2) ran **~26% open / ~1.2% CTR**. Proven emoji+name-first winners on this list hit **~33% / ~2.5%**.
- **Q2 · End-CTA.** Does a prominent, open-loop end-CTA beat the old buried inline link? Baseline **click-to-open ~5%**; the earlier emoji+name-first era ran **CTO ~8%**.

## Legend
- **Subj lever/genre:** quiet · validation · direct-Q · contrarian · curiosity · prophecy · whisper · story · numbered · minimalist · texting · tabloid · horoscope · fortune-cookie · recipe · trailer · notification("(1) msg")
- **End-CTA:** `old-inline` (buried soft link, pre-experiment) · `N1` (native, framed by gray rules, large bold blue link) · `N2` (native + gold sparkle + blue outline button) · `PS` (conversational postscript) · other TBD
- **Open%** = unique_opens / emailed. **CTR%** = unique_clicks / delivered. **CTO%** = unique_clicks / unique_opens (maturation-independent — the cleanest CTA read).

## Sends
| Date | Card | Subject | Subj lever | End-CTA | Emailed | Open% | CTR% | CTO% | Status |
|---|---|---|---|---|---|---|---|---|---|
| Jun 30 | ace-of-cups | The cup was always meant to overflow, {first} | quiet | old-inline | 49,180 | 26.0 | 1.38 | 5.3 | matured (baseline) |
| Jul 1 | two-of-cups | How to tell the real thing from the wish, {first} | quiet | old-inline | 48,858 | 25.8 | 1.26 | 4.9 | matured (baseline) |
| Jul 2 | death | The card everyone dreads means the opposite, {first} | quiet | old-inline | 48,684 | 18.7 | 0.88 | 4.7 | was maturing at pull (baseline) |
| Jul 3 | temperance | 🤍 {first}, you don't have to be "over it" first | validation | **N1** | — | — | — | — | scheduled 10:30 UTC |
| Jul 4 | **quiz-inbox test** | 💫 {first}, what's pulling at you most right now? | interactive | 4 tappable buckets → /evelyn | — | — | — | — | **SCHEDULED 10:30 UTC** — replaced the-star (bcast 61146962) |
| — | the-star *(bumped)* | ⭐ {first}, when did you stop expecting good news? | direct-Q | N1 | — | — | — | — | unscheduled DRAFT — held for a future batch (bcast 61135571) |
| Jul 5 | the-lovers | 💞 {first}, do you become more yourself with him? | direct-Q | old-inline | — | — | — | — | subject live; CTA variant TBD (N2 proposed) |
| Jul 6 | knight-of-cups | 🛑 {first}, stop trusting his beautiful words | contrarian | old-inline | — | — | — | — | subject live; CTA variant TBD (PS proposed) |

## Read notes
- Jul 3–6 are the first **combined** test: new subject format **and** a redesigned end-CTA. To keep the CTA read clean, CTO% is the metric to watch (open-independent). Jul 3/4 both use N1, so Jul 5 (N2) and Jul 6 (PS) are the CTA-variant probes against them.
- Subjects: Jul 3–6 span four levers (validation / direct-Q / direct-Q / contrarian) — compare their Open% to the ~26% quiet baseline to confirm the format lift.

## Big-swing pilots (queued — previews approved before wiring)
Beyond the subject/CTA tuning, two structural bets are in flight. Pilot on Jul 7+ so the Jul 3–6 baseline stays clean.
- **Teaser format** ("the email is the trailer"). ~60-word card-of-the-day → the reading happens in chat; withholds the personal part as the click; a "tomorrow" line trains the habit. Zero new infra (reuses hosted card art + /evelyn). Teaser subjects lean horoscope/notification genres. Metric: **CTO** vs long-form days. Proposed pilot: Jul 7 (three-of-cups), then Jul 9/11. Preview: `scratchpad/teaser-preview.html`.
- **Luna sky-box** (cross-persona plug). Light-tinted box mid-reading; Evelyn hands off to Luna with the day's **real** sky proclamation (engine: `scripts/transit-calendar.ts` / `daily-sky.ts`) → soft link to `/luna`. The per-reader "where it lands in your chart" is the click. Metric: Luna-link CTR + Luna signups. **Every send QA'd via `persona-email-qa` before send.** Proposed pilot: a long-form day with a strong sky↔card match (e.g. Jul 8 five-of-cups w/ Moon trine Venus, or Jul 10). Preview: `scratchpad/luna-plug-preview.html`.

## Refresh (pull live numbers)
Read-only stats puller (reuses AWeber tokens): `scratchpad/aweber-stats.cjs` — prints emailed / unique_opens / unique_clicks / open% / CTR% / CTO% for recent sends. Paste the matured rows back into the table above. (Tooling for re-subjecting a scheduled broadcast: `scratchpad/resubject.cjs`; cancel→PUT→reschedule.)
