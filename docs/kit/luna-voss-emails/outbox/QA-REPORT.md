# Luna daily — QA report (2026-06-20 → 09-17, 90 emails)

All 90 generated (mix C:53 · B:23 · A:14) and drafted on Kit (ids in `kit-drafts.json`).
**Not send-ready** — see blockers below + standing send-gates.

## Sample QA gate (persona-email-qa agent, 8 emails)

| Date | Tpl | Verdict | Note |
|---|---|---|---|
| 2026-06-20 | C | PASS | Mercury sextile Mars verified (minor tone nit: "teeth" vs an easy sextile) |
| 2026-06-29 | B | PASS | Full Moon + Mercury station both verified for the 29th |
| 2026-07-04 | A | PASS | Moon square Mars verified |
| 2026-07-06 | C | **FAIL** | "Neptune stations retrograde today" — real station is **Jul 7** (engine flips ~19h early) |
| 2026-07-13 | B | **FAIL** | "New Moon today" — exact New Moon is **Jul 14**; on the 13th the Moon is ~1% waning crescent |
| 2026-07-29 | B | PASS | Full Moon (Sun opp Moon, 0.6° orb) verified |
| 2026-08-12 | B | PASS | New Moon verified (advisory: it's a total solar eclipse, unmentioned) |
| 2026-09-15 | C | PASS | Moon square Jupiter verified |

## Root cause (systemic)

The engine labels a major moon phase / retrograde station with a ~1-day-wide tolerance, so
AI copy that says "**[Phase] today**" or "**stations retrograde today**" can land on the
calendar day *before/after* the exact astronomical event. Caught by `_audit-batch-events.ts`.

## Affected days — phase claimed on a non-exact day (10)

Each phase spans two B-days; the email on the **exact** day is correct, the adjacent one is off:

| Email date | Claims | Exact event | Off by |
|---|---|---|---|
| 2026-06-22 | First Quarter | 2026-06-21 | +1 (late) |
| 2026-06-30 | Full Moon | 2026-06-29 | +1 (late, ~100% illum — soft) |
| 2026-07-08 | Last Quarter | 2026-07-07 | +1 (late) |
| 2026-07-13 | New Moon | 2026-07-14 | −1 (early — **hard**, 1% illum) |
| 2026-07-20 | First Quarter | 2026-07-21 | −1 (early) |
| 2026-07-28 | Full Moon | 2026-07-29 | −1 (early, ~99% illum — soft) |
| 2026-08-06 | Last Quarter | 2026-08-05 | +1 (late) |
| 2026-08-20 | First Quarter | 2026-08-19 | +1 (late) |
| 2026-08-27 | Full Moon | 2026-08-28 | −1 (early, ~100% illum — soft/borderline) |
| 2026-09-03 | Last Quarter | 2026-09-04 | −1 (early) |

(2026-09-11 is labeled New Moon by the engine but its copy leads with Moon–Mercury, so no
false phase claim.)

## Retrograde stations in window — verify "stations today" copy (5)

| Date | Station (engine flip) | Status |
|---|---|---|
| 2026-06-29 | Mercury retrograde | VERIFIED correct (agent) |
| 2026-07-06 | Neptune retrograde | **WRONG — real station Jul 7** |
| 2026-07-23 | Mercury direct | unverified (±1 day) |
| 2026-07-26 | Saturn retrograde | unverified (±1 day) |
| 2026-09-11 | Uranus retrograde | unverified (±1 day) |

## Standing send-gates (independent of QA, block ANY real send)

- Real CAN-SPAM physical address (templates still say "123 Placeholder St…").
- Luna-branded verified sender (only `contact@cosmonumerology.com` has DMARC; footer says
  `hi@theseerwithin.com`).
- Audience targeting (drafts currently default to ALL subscribers — use a test tag/segment).

## Recommended fix

Root-cause: feed the generator/assembler an `isExactPhaseDay` / exact station-date signal so
"today" claims only fire on the exact day (adjacent days say "yesterday's Full Moon still
lighting the sky" etc.), then regenerate the ~12 affected days and update their Kit drafts.

## Resolution (applied 2026-06-20)

**Root-cause fix shipped** in `dailySkyEditor.ts` + `lunaContentGenerator.ts`:
- `planDay` now computes `phaseExact` (is today the local-minimum / exact phase day) and
  rewrites `timingNote` to say "EXACT today" vs "building — exact tomorrow" / "was exact
  yesterday"; station notes now say "around now (±1 day)", never a hard "today".
- The generator prompt got a **TIMING ACCURACY** hard rule + an accurate Moon line, so the
  AI only claims a phase/station "today" when it truly is exact.

**14 affected days regenerated and their Kit drafts updated in place** (no new drafts) via
`scripts/regen-days.ts`: 06-22, 06-30, 07-06, 07-08, 07-13, 07-20, 07-23, 07-26, 07-28,
08-06, 08-20, 08-27, 09-03, 09-11. A deterministic re-scan found **zero** remaining
"[Phase]/station today" claims.

**Re-QA (persona-email-qa) of the two hard failures → both now PASS:**
- 2026-07-06 — copy now reads "Neptune stations retrograde this week" + the verified same-day
  Moon–Neptune conjunction.
- 2026-07-13 — leads on the verified Sun–Mercury conjunction; New Moon framed as "peaks
  tomorrow" in the P.S.

**Still NOT send-ready** — the standing send-gates (real CAN-SPAM address, Luna-branded DMARC
sender, audience targeting) remain open, and a full per-email QA sweep of the other ~76 days
was not run (the deterministic audit + 8-email sample covered them).
