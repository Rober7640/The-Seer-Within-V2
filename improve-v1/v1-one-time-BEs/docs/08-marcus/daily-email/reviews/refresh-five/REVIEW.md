# Five rewrites — review and Claude handoff

Recommendation: launch with all twelve topics once human review and production routing are complete. Five new versions replace the old five in the selected launch set; the seven new mixed-topic emails remain selected. This is launch inventory, not a send schedule.

[Open the current twelve-email gallery](../launch-twelve/html/index.html)

## Replacement editions

| Edition | Free / buyer drawn | Source / review |
| --- | --- | --- |
| `healing-v2` | 2 / 4 | [Copy](../../letters-02/what-part-of-me-needs-healing-v2.md) · [Preview](../launch-twelve/html/what-part-of-me-needs-healing-v2.html) |
| `commitment-v2` | 2 / 4 | [Copy](../../letters-02/why-wont-he-commit-v2.md) · [Preview](../launch-twelve/html/why-wont-he-commit-v2.html) |
| `higher-calling-v3` | 2 / 4 | [Copy](../../letters-02/what-is-my-higher-calling-v3.md) · [Preview](../launch-twelve/html/what-is-my-higher-calling-v3.html) |
| `quiet-v2` | 2 / 4 | [Copy](../../letters-02/why-they-go-quiet-v2.md) · [Preview](../launch-twelve/html/why-they-go-quiet-v2.html) |
| `blind-spots-v2` | 3 / 7 | [Copy](../../letters-02/what-are-my-blind-spots-v2.md) · [Preview](../launch-twelve/html/what-are-my-blind-spots-v2.html) |

The calling rewrite is v3 because higher-calling-v2 already exists as a separate draft. Original Markdown, HTML and old edition identities are preserved. Silence changes from three free / three paid to two free / four paid; blind spots retains three free / seven paid in the ten-card Tree of Life.

Each rewrite received its own writer, a root voice edit, and independent sentence-by-sentence cold reads. [Editorial rationale](editorial-notes.md) and the reader tables in this folder preserve the review trail. All final copy is clear in the scoped cold-read checks listed below. The final reader text was checked against each source. This proves comprehension, not conversion performance.

## What Claude should work from

- Selected launch inventory: [launch-selection-2026-09-14.json](../../edition-configs/launch-selection-2026-09-14.json). Use this explicit selection, not every record with local `published` status.
- Five rewrite configs: [refresh-five-2026-09-14.json](../../edition-configs/refresh-five-2026-09-14.json). Copy, two/three fixed card identities, paid labels and booking copy must stay aligned.
- Seven existing new-topic configs: [mixed-batch-2026-09-14.json](../../edition-configs/mixed-batch-2026-09-14.json).
- Local page/API architecture: [local README](../../../../../local/08-marcus/README.md). All editions use shared booking/checkout/bridge/upsell/receipt pages; no need for twelve duplicated route files.
- General production work: [Marcus overview](../../../README.md). The old five-copy rewrite task in the earlier handoff is replaced by this packet; production payment, fulfillment and routing limits still apply.

The local registry now contains eighteen records: twelve selected launch candidates plus five historical v1 editions and the separate higher-calling-v2 draft. Old records are preserved for continuity. Local `published` means routable in the simulator, not reviewed or published in production.

## Rebuild

From the repository root:

```sh
python3 improve-v1/v1-one-time-BEs/scripts/export-08-editions.py
python3 improve-v1/v1-one-time-BEs/scripts/build-08-launch-review.py --booking-origin http://127.0.0.1:5088
./node_modules/.bin/tsx improve-v1/v1-one-time-BEs/local/08-marcus/server.ts
```

In a second terminal, serve the repo with `python3 -m http.server 5092 --bind 127.0.0.1`. Open `/improve-v1/v1-one-time-BEs/docs/08-marcus/daily-email/reviews/launch-twelve/html/index.html` on that server. Restart the local app after exporting; it loads fixtures at startup.

Edit Markdown/config first. The launch builder regenerates only the selected twelve HTML files and review copies; it does not overwrite the old five HTML files. `build-08-review-packet.py` still builds the historical mixed-batch packet and is not the launch selector.

## Remaining release work

1. Human review of the rewritten copy and the twelve-topic mix.
2. Complete and test the actual production funnel, including saved order/draw continuity, full-birth-name/DOB intake, fulfillment and delivery. Operator rule (2026-09-14, re-confirmed 2026-09-15): birth name and date of birth are collected **on the booking page only, never on Stripe** — Stripe's hosted Checkout takes email, card and name on card. The letter does not prescribe a form location. *(Updated 2026-09-15; the earlier text here said the hosted checkout collected the personal fields — the superseded 2026-09-13 ruling.)*
3. Publish immutable production editions and replace each AWeber `{{BOOKING_URL}}` with the exact edition/version URL. Confirm every link before any send.
4. Check the actual email in target inbox clients. Browser rendering alone does not prove Gmail/Outlook/Apple Mail rendering.
5. Track sent/delivered, clicks, completed reading orders and revenue by edition. No conversion evidence has been collected for these drafts.

Nothing has been scheduled or sent. No production editions, STATE entries or commits were created. This packet follows `.claude/skills/marcus-daily/SKILL.md` step 7, “present and STOP.” See [the slate and proposed STATE rows](slate-and-proposed-state.md). The rows are proposals only.


## Final cold-read evidence

| Edition | Audit scope and final evidence |
| --- | --- |
| healing-v2 | Whole-letter trios: `cold-healing-a/b/c.md`; then a fresh trio checked the revised subject/opening/first-card section: `cold-healing-opening-a/b/c.md`. The unchanged remainder retains the whole-letter reads. |
| commitment-v2 | Three whole-letter audits: `cold-commitment-a/b/c.md`, all 53 units clear. |
| higher-calling-v3 | Whole-letter trio: `cold-calling-a/b/c.md`; revised gold-coin description checked by `cold-calling-context-a/b/c.md` with the full letter supplied for context. Earlier isolated excerpt checks lacked that context and are preserved as such. |
| quiet-v2 | Fresh whole-letter trio: `cold-quiet-final-a/b/c.md`; one last closing-sentence change checked by fresh readers in `cold-quiet-close-a/b/c.md`, using the full letter for context. |
| blind-spots-v2 | Fresh final whole-letter trio: `cold-blindspots-final-a/b/c.md`, all 61 units clear. Paid labels were made concrete and updated in booking metadata too. |

The `a/b/c` notation names three separate Markdown files in this folder. It does not mean one combined reader. Author/editor and readers were separate. No reader was given a brief, sibling email or expected interpretation.

## Validation

- Eighteen existing exporter/draw/server tests passed. Export validation checks the new IDs, versions, full source text, card identities and paid labels.
- All ten baseline original Markdown/HTML hashes still match. [Source validation](source-validation.json) also confirms that final copy matches its frozen reader text, includes birth name/DOB, and ends the body on one CTA.
- Four existing heroes were visually inspected and their JPEG URLs returned HTTP 200. The new silence hero has exactly six cards, Four of Cups and Eight of Swords face up, four rose-and-trellis backs. It was generated, inspected, copied into project assets, converted and uploaded with GET 200.
- Chromium/Playwright checked the twelve selected edition IDs/versions, ten desktop/mobile renders of the five rewritten emails, and five real local CTA → booking → simulated checkout → bridge journeys. The saved edition/version and draw survived replay. No page errors, missing email images or horizontal email overflow were found.
- All five booking pages were also checked at an actual 390 px viewport: no overflow or missing images. Representative mobile booking and desktop/mobile email screenshots were visually inspected.
- The browser test is a local simulation using made-up details, not a real payment or delivery. Remaining downstream production and inbox checks are still listed above.
- Browser plugin was not available, so the frontend-testing-debugging fallback used installed Playwright. Temporary QA scripts, raw results and screenshots are under `/tmp/marcus-launch-review` (scripts: `/tmp/marcus-launch-qa.cjs` and `/tmp/marcus-booking-mobile-qa.cjs`).
- This review session serves booking on `http://127.0.0.1:5093` and the gallery on port 5092. The rebuild commands above intentionally use the standard launcher’s port 5088. Rebuild previews to match the local server you start; do not rely on old sessions staying alive.
