---
name: luna-daily
description: "Run the Luna Voss daily-email batch end to end — generate N days of send-ready emails (each with a per-day sky map), fact-check every one through the persona-email-qa gate, triage blockers, and report which are send-ready. Use when the user says: run the daily Luna emails, generate this week's Luna batch, build + QA the Luna daily sends, make the next N Luna emails. This RUNS the already-built Luna pipeline — to onboard a NEW persona's whole program instead, use persona-email-kit."
---

# Luna Daily — run the batch

The operator front-door for the daily-email pipeline. The actual engine is plain TypeScript (`server/lib/*` + `scripts/*`); this skill just orchestrates the human-in-the-loop run — **generate → QA → triage → report** — calling the existing software + the QA agent. It does not reimplement anything. Full code map: `docs/kit/luna-voss-daily-emails-engineering.md`.

## Inputs
- **start date** (YYYY-MM-DD, US Eastern) and **day count** (default 14). Ask if not provided.

## Steps
1. **Generate.** Run `npm run luna:batch -- <start> <days>` (equivalently `npx tsx scripts/build-luna-batch.ts <start> <days>`). Writes `docs/kit/luna-voss-emails/outbox/<date>.html`, `outbox/img/<date>.png`, and `outbox/INDEX.md`. Needs `.env` (`ANTHROPIC_API_KEY`) + chromium (installed). Report any generation failures verbatim.
2. **QA each day.** Run the **`persona-email-qa`** agent on each `outbox/<date>.html` (parallelize across days). Pass it the file path, the send date, and persona `luna-voss`. It returns a claims table + `VERDICT: PASS|FAIL`.
3. **Triage verdicts.**
   - **BLOCKER** (invented date/duration, personal-placement claim, broken/missing CTA link, wrong fact) → apply the QA agent's suggested fix to that email, or regenerate just that day, then re-QA it.
   - **WARNING** that is expected and tracked elsewhere — placeholder CAN-SPAM address (task #7), subject-not-in-HTML (subjects live in INDEX, set in Kit) → note it, do **not** block on it.
4. **Record.** Update the QA column in `outbox/INDEX.md` with each verdict.
5. **Report.** A table: date → PASS/FAIL → blurb → subject; which are send-ready; and the outstanding non-blocking items before a real send (real address #7, host the per-day wheel PNGs, audience/Kit list #6, deliverability #9).

## Rules
- **Never mark an email send-ready with an unresolved BLOCKER.**
- Subjects are set in Kit (from the INDEX table), not embedded in the HTML — confirm they follow `{firstName}, [hook] ([detail])` and reference the day's real aspect.
- Each email's wheel image must be **hosted** at `theseerwithin.com/assets/luna/daily/<date>.png` (or uploaded with the Kit broadcast) to render.
- Sender is **hi@theseerwithin.com**.
- Delivery is **manual Kit paste** today (Kit MCP is gated / API not wired) — paste `<date>.html` as the broadcast body, set the Subject from INDEX, upload `img/<date>.png`.
- This is the **run** skill. To stand up another persona's whole email program, use **persona-email-kit**.
