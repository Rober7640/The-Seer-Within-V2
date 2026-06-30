# Luna Daily Emails — Engineering / Handover

**Companion to:** `docs/kit/luna-voss-daily-emails-prd.md` (the product spec). This doc is the **code map** — what was built, where it lives, how to run it, and the gotchas. Read the PRD for *why*; read this for *how*.

**Status:** the generation pipeline (data → copy → blurb → HTML → batch) is **built and working end-to-end**. Go-live items (real address, Kit list, deliverability) are open — see PRD §9 and the task list.

---

## 1. The pipeline (one glance)

```
[1] getDailySky(date)            server/lib/astrologyEngine.ts        the real sky for a date (ET)
        ↓
[2] buildCalendar / planDay      server/lib/dailySkyEditor.ts         pick headline aspect + pillar
        ↓
[3] generateLunaDailyEmail       server/lib/lunaContentGenerator.ts   Haiku → Luna-voiced copy
        ↓
[4] pickBlurb                    server/lib/lunaBlurbs.ts             rotating CTA + /luna UTM link
        ↓
[5] buildSkyMapSvg + rasterize   server/lib/lunaSkyMap.ts + Playwright per-day sky-map PNG
        ↓
[6] assembleEmail (template C)   server/lib/lunaEmailAssembler.ts     fill template A or C → send-ready HTML
        ↓
[7] build-luna-batch.ts          scripts/                            writes outbox/<date>.html + img/<date>.png + INDEX
        ↓
[8] persona-email-qa agent       .claude/agents/                     fact-check vs engine + web before send
```

Everything is plain TypeScript run via `tsx` (already a dev dep). Sky maps rasterize via Playwright/chromium (already installed for tests) — **no new runtime deps.** `npm run check` (tsc) passes.

---

## 2. Quick start (commands)

```bash
# the real sky for a date (JSON) — noon ET, DST-aware
npx tsx scripts/daily-sky.ts 2026-06-18

# the editor's pick per day for N days (headline aspect + pillar + talking points)
npx tsx scripts/transit-calendar.ts 2026-06-18 14

# generate N send-ready emails into docs/kit/luna-voss-emails/outbox/ (live Haiku; needs ANTHROPIC_API_KEY in .env)
npx tsx scripts/build-luna-batch.ts 2026-06-18 14

# regression harnesses (no API except the content one)
npx tsx scripts/_test-daily-sky.ts          # ephemeris regression (7 checks)
npx tsx scripts/_test-assembler.ts          # template fill checks (fallback copy)
npx tsx scripts/_test-luna-content.ts 2026-06-18   # fallback + live Haiku sample
```

**QA a draft** (the gate): ask Claude Code to run the **`persona-email-qa`** agent on a file, e.g. *"use the persona-email-qa agent on docs/kit/luna-voss-emails/outbox/2026-06-18.html for send date 2026-06-18"*. It is a registered subagent type.

---

## 3. Module reference (`server/lib/`)

### `astrologyEngine.ts` — pre-existing engine, **one addition**
The natal-chart engine that already powers the in-chat wheel. We added (purely additive — natal/transit code untouched):
- `getDailySky(date: string, hourET = 12): DailySky` — the collective sky for a date, computed at **noon US Eastern** (DST-aware via `easternUtcOffset`). Reuses the same position/`findAspects`/moon helpers as `calculateNatalChart`.
- Types: `DailySky { date, zone('EDT'|'EST'), hourET, hourUTC, placements[], aspects[], retrogrades[], moonPhase{name,elongation,illumination} }`, `DailySkyPlacement`, `DailySkyAspect`, `DailySkyMoonPhase`.
- Accuracy: Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn ~0.1°; Uranus/Neptune/Pluto ~0.5–0.9° (immaterial for prose); retrogrades correct. Validated 2026-06-18 vs published ephemeris (see PRD §11).

### `dailySkyEditor.ts` — the "editor" (day-picker)
- `buildCalendar(startDate, days): DayPlan[]` — main entry; iterates dates, passes prior day for station detection.
- `planDay(date, prev?): DayPlan` — one day.
- `pickHeadline(sky)` / `scoreAspect(aspect)` — ranking (favours personal planets, tight + stable orb; penalises near-edge aspects so the headline doesn't flip with time of day; drops outer-outer/generational aspects).
- `DayPlan { date, zone, pillar("Today's Sky"|"Your Timing Window"), headline, headlineAspect, talkingPoints[], moonPhase, retrogrades[], stations[], timingNote }`.
- Timing days (major moon phase / retrograde station) → pillar "Your Timing Window".

### `lunaContentGenerator.ts` — the "writer"
- `generateLunaDailyEmail(plan): Promise<LunaEmailCopy>` — Haiku via the project's `anthropicFailover` client + `getModelForOperation('greeting')`, wrapped in `anthropicBreaker` (same pattern as `personaVerifiedDripGenerator.ts`). Falls back to `buildFallbackCopy` on any failure.
- `buildFallbackCopy(plan): LunaEmailCopy` — pure, deterministic, exported for testing.
- `LunaEmailCopy { subject, h1, preheader, bodyHtml, bodyText, ps, source('haiku'|'fallback') }`.
- The prompt enforces the accuracy rules (collective sky only, no personal house, tendencies-not-promises, **no invented dates/durations**, `{firstName}` token). These are belt; the QA gate is suspenders.

### `lunaBlurbs.ts` — the "salesperson"
- `BLURBS` (the 18 conversion blurbs, PRD §5), `FRICTION_LINES` (4).
- `pickBlurb(pillar, index, lastId?): PickedBlurb` — pillar-matched, rotating, no consecutive repeat, free-minutes leaning ~1-in-3. Returns `{ id, text, ctaLabel(no arrow), friction }`.
- `buildCtaHref(id, base?)` — `/luna` cold lander + `utm_source=kit&utm_medium=email&utm_campaign=luna-daily&utm_content=<id>`.

### `lunaSkyMap.ts` — the per-day "sky map"
- `buildSkyMapSvg(sky: DailySky, opts?): string` — emits an on-brand COLLECTIVE sky-wheel SVG: 12 zodiac signs + planets at their real degrees + the day's aspect lines (headline aspect emphasised). **No house cusps** (houses are per-person → would break the broadcast compliance rule). Geometry mirrors `client/src/components/NatalChartWheel.tsx`, re-themed brass-on-paper. Astro glyphs carry the U+FE0E text-presentation selector so Chromium renders them as line-glyphs, not emoji.
- Rasterised to PNG by the batch runner via Playwright/chromium (2× `deviceScaleFactor`) → `outbox/img/<date>.png`.

### `lunaEmailAssembler.ts` — the "typesetter"
- `assembleEmail(copy, blurb, plan, opts?): AssembledEmail` — fills **template A** (text-light) or **template C** (chart-wheel) via `opts.template`. For C, pass `opts.wheel = {src, alt, caption}` (the per-day wheel).
- **How it fills:** replaces content regions in the committed template using **stable ASCII anchors** (style fragments, `<!-- BODY-START/END -->`, `utm_content=LV-XX`, `READ MY CHART LIVE`) — robust to curly quotes/em-dashes in the copy. **Every replacement asserts it matched; a missing anchor throws** (won't ship a half-filled email).
- Sets the correct ET weekday in the kicker, picks `TODAY'S SKY` vs `YOUR TIMING WINDOW`, injects the chat blurb + CTA label + UTM id + friction line + P.S., keeps the masthead avatar.
- `opts.address` swaps the placeholder CAN-SPAM address (left as placeholder until task #7).
- Subject is **not** embedded (it's set in Kit) — returned in `AssembledEmail.subject` and written to the outbox INDEX.
- Templates **A and C are wired** (C adds the wheel `<img>` src/alt + caption and drops the now-stale hardcoded 3-col strip; every other region shares anchors with A). Template **B (visual hero GIF) is not wired** — it would need its own anchor set.

---

## 4. Script reference (`scripts/`)

| Script | Purpose |
|---|---|
| `daily-sky.ts <date> [hourET]` | Print `getDailySky` as JSON. Source-of-truth CLI for the QA agent + debugging. |
| `transit-calendar.ts <start> [days]` | Print the day-picker's plan per day. |
| `build-luna-batch.ts <start> [days]` | The batch runner — full pipeline incl. per-day sky maps (template C). Writes `outbox/<date>.html`, `outbox/img/<date>.png`, `outbox/INDEX.md`. Needs `.env` + chromium. |
| `_test-daily-sky.ts` | Ephemeris regression (7 asserts, incl. the validated 2026-06-18 sky). |
| `_test-sky-map.ts <date>` | Render one sky map → `_sky-map-sample.png` to eyeball the wheel. |
| `_test-assembler.ts` | Template-fill checks using fallback copy (no API). Writes `_assembler-sample.html`. |
| `_test-luna-content.ts <date>` | Prints fallback + live Haiku copy for a date. |
| `_preview-email.ts <date>` | Render a finished outbox email → `_email-preview-<date>.png` (local image srcs) to eyeball the full layout. |

`_`-prefixed scripts and the `_*.png` / `_*.html` samples are dev harnesses, safe to delete.

---

## 5. The QA gate (`.claude/agents/persona-email-qa.md`)
A registered Claude Code subagent. Per draft it: (Tier 1) runs `scripts/daily-sky.ts <date>` and checks every astrology claim against the engine; (Tier 2) cross-checks headline facts (moon phase/date, retrogrades, signs) against web ephemerides, accounting for the noon-ET vs 00:00-UT offset; then runs brand/compliance checks (no personal placement to the list, tendencies-not-promises, one CTA→/luna+UTM, sender `hi@theseerwithin.com`, CAN-SPAM, plausible durations). Returns a claims table + severity-ranked fixes + a final `VERDICT: PASS|FAIL`. **Never approves an unresolved BLOCKER.**

**It has already caught real issues** on first-pass drafts (a hallucinated Mercury-retrograde end date; a placement drift) — see `outbox/INDEX.md` QA log. **Treat the QA pass as mandatory before any send.**

---

## 6. Reuse for other personas
`.claude/skills/persona-email-kit/` is the skill to onboard Marcus/Nova/Maren/etc. — it clones + re-skins the Luna package (palette, voice, motifs) and reuses this same pipeline + QA gate. Per-domain accuracy guardrails (tarot, Vedic, love-empath) are in the skill.

---

## 7. Gotchas / conventions
- **Sender is `hi@theseerwithin.com`** (brand inbox) for Kit broadcasts — NOT the per-persona `fromEmail` in `seed.ts` (that drives the app's own drip, a separate channel).
- **Timezone:** noon ET, DST-aware. Use "Eastern Time" in Kit, never literal "EST". A near-orb Moon aspect can differ by time of day — the day-picker avoids borderline picks.
- **Haiku drifts occasionally** (invented dates, near-personal claims). The prompt guards against it; the QA gate is the real backstop. Always QA.
- **Templates fill by anchor string-replace** — if you edit template A's structure, keep the anchors (`<!-- BODY-START/END -->`, the friction span style, `READ MY CHART LIVE`, `utm_content=LV-XX`, `P.S.` strong) or the assembler will throw.
- **Kit MCP is gated** behind a paid plan — delivery is manual paste for now (paste `outbox/<date>.html` as the broadcast body, set Subject from INDEX). API auto-scheduling is task #10.
- **The 14 outbox emails are a first pass** — regenerate after the prompt tightening, then QA each to PASS, and set the real address (#7) before sending.

---

## 8. What's not done
See PRD §9 (risks/decisions) and the session task list: real CAN-SPAM address (#7), audience/Kit list (#6), drip-overlap suppression (#8), deliverability SPF/DKIM/DMARC (#9), Kit delivery path (#10), animated GIFs (#11), analytics (#12), tests (#13). Template B/C assembler wiring is also pending (only A is wired).
