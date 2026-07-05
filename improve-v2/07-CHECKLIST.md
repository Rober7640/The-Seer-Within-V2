# improve-v2 — master checklist

> **How to use this with [08-PLAN.md](08-PLAN.md):** 07 (this file) is the *what* — the
> reference manual of all 28 fixes with evidence + verify steps. 08 is the *when/how* —
> the sprint order, status ticks, and tests. Drive from **08**; open **07** for the
> detail on each `#item`. Tick an item in BOTH when it's done AND verified.

The working to-do list, ordered by leverage. Sources:
[02-reading-pass-findings.md](02-reading-pass-findings.md) ·
[03-gap-evidence.md](03-gap-evidence.md) ·
[04-prompt-baseline.md](04-prompt-baseline.md).
Convention: check items off here; add Playwright test ideas to `docs/test-ideas.md`
as each ships (repo convention).

**Baseline numbers to beat** (2026-07-04): 54% of buyers never rebuy · 71% of churn
exits = credit wall mid-question · 0% in-chat refund recovery · ~15 users with stuck
pending payments in a 154-user sample · gap rates: extract 61% / mechanical 60% /
credibility 58%.

---

## Wave 0 — Freeze the before-evidence (must precede everything)

- [ ] **0. Capture the eval baseline** — 17 frozen test cases built from the studies
      ([eval/EVAL.md](eval/EVAL.md), `eval/cases.json`) run against the CURRENT system
      via `npx tsx scripts/eval-chat.ts --label baseline-preflight`. Transcripts
      committed to `eval/runs/baseline-preflight/`. After every subsequent change,
      re-run the SAME cases with a new label and compare by rubric — before/after
      evaluation is immediate, not dependent on A/B accumulation.
      *Verify:* all 17 transcripts saved without runner errors; smoke case already
      caught 2 failures (refund deflection + fabricated support email).
- [ ] **0b. Capture the real-conversation replay baseline** — replay ACTUAL customer
      sessions (founding case + longest per churn cohort) through the current engine
      via `npx tsx scripts/eval-replay.ts --label replay-baseline`. Each turn is
      documented as USER (real question) → THEN (historical reply) → NOW (replay
      reply). Outputs are gitignored (real customer content). Re-run with a new
      label after every change for before/after on real questions.
      *Verify:* replay summaries saved to `transcripts/replays/replay-baseline/`.
      Durable committed record (raw files are gitignored PII): metrics + redacted
      excerpts + fixed comparison session-IDs in `eval/BEFORE-replay-baseline.md`.

> During Sprints 1–4, re-run the two scripts directly after each change
> (`eval-chat.ts` / `eval-replay.ts`). The polished one-command audit skill is a
> Sprint-5 convenience (item #29) — already built but parked until there are shipped
> changes worth auditing.

## Wave 1 — Stop the bleeding (engineering; no design decisions required)

- [x] **1. Fix the context window** — `chatEngine.ts:511` sends the FIRST 20 session
      messages instead of the most recent. Change to last-N (desc + reverse), size N by
      token budget. Highest-leverage single change: partially repairs gaps 02/05/08/09
      and makes existing guardrails followable.
      *Verify:* long-session test (40+ msgs) — model references recent turns; no
      verbatim loop within a session.
      ✅ 2026-07-04 — shipped as HEAD(10)+TAIL(30) window + omission note (plain
      last-N made the model deny early facts: see `runs/after-window-fix/`).
      Verified by `server/lib/chatEngine.contextWindow.test.ts` (failing-then-green,
      60-msg session) + eval `runs/after-window-fix-2/long-session-memory.md`
      (sister probe recalled, no loops, references its own recent suggestions).
      AMENDED 2026-07-04 (rung-2 catch): the tail query re-read the just-saved
      current user message, which the engine then appended again — the model saw
      every user message TWICE (personas said "you said it twice", worst on replay
      a8a79977). Fixed with `excludeMessageId` filtering head/tail/count; second
      failing-then-green test in the same file; post-fix replay
      `evelyn-v2-rung2-postdupfix` clean. See `eval/reports/evelyn-v2-rung2.md`.
      ⚠ Code on `development` working tree — deploy is the operator's gate.
- [ ] **2. Recover stuck-pending purchases** — run
      `scripts/reconcile-pending-purchases.ts` dry-run → `--apply` fleet-wide; credit
      users; send persona-voiced "your minutes are here + bonus" win-back email.
      *Verify:* $ recovered; reactivation rate of credited users.
- [ ] **3. Fix pending-checkout root cause** — webhook reliability/retry, client retry
      UX, operator alert on `pending > 10 min`. (~15 users / ~$1,100 attempted spend
      visible in sample; one user tried 5× in 5 minutes.)
      *Verify:* pending-completion rate; zero stranded rows > 24h.
- [ ] **4. Billing integrity audit** — SQL pass on `coins_charged` vs
      `duration_seconds` (known cases: 1s = 1785 coins; 0s = 900; 36s = 540).
      Root-cause (heartbeat/cleanup billing), fix, proactively credit affected users.
      *Verify:* zero mismatches on new sessions; credits issued log.
- [ ] **5. Fix post-purchase replay / session-handoff bug** — buying mid-conversation
      must resume the thread, not replay the last exchanges or reset the greeting
      (hit 8/16 of paid-and-bailed cohort).
      *Verify:* e2e test — purchase mid-session → next message continues context, no
      duplicate content.
- [ ] **6. Never bill fallback/error turns** — the "energy is shifting… refocus" loop
      billed real money (one user paid for 4 consecutive fallbacks).
      *Verify:* fallback turns are coin-free in ledger.
- [ ] **7. De-loop the crisis script** — fire once per session, respect explicit denial
      ("I'm not suicidal"), never repeat identical 988 block; fix grief false-positives
      ("Is he ok now that he has passed" → hotline aimed at the griever).
      *Verify:* replay the 3 false-positive transcripts through the classifier.
- [ ] **8. Fix 18+ guardrail misfire** — fired ~13× mid-session on adults ("friends
      since middle school" trigger).
      *Verify:* regression set from X-5388 + A-051 cases.
- [ ] **9. Payment-talk guardrail** — persona must never name payment channels
      (fabricated "$EvelynCrossReadings" CashApp observed); check whether that handle
      exists in the wild.
      *Verify:* red-team prompts about failed cards → persona routes to real checkout/
      support only.
- [ ] **10. Add DV protocol to the safety layer** — suicide protocol exists; battering
      disclosure got nothing (D-cohort case: "he bat me very badly...yet I went back").
      *Verify:* DV disclosure test set → hotline + safety-planning response, no
      re-reading the abuser's "energy."

## Wave 2 — The bridge back (kills the 71% wall exit)

- [ ] **11. Inject current date + coin balance into the system prompt** — no layer has
      either today (→ "January" in June; no wind-down possible).
- [ ] **12. Balance-aware wind-down** — at T-2min: persona wraps, delivers a takeaway,
      sets a concrete return hook. Hard rule: **never end a session on the persona's
      own question.**
      *Verify:* % of sessions ending on persona question → ~0 (from ~71% of churn
      exits).
- [ ] **13. Post-wall experience** — replace silent cutoff with a free session-summary
      card ("what we found · where we pick up") + clean resume-after-purchase.
- [ ] **14. Cliffhanger calendar** — capture user-mentioned upcoming events (interview,
      party, court date) into memory; day-after persona-voiced check-in email with
      magic link. Reuses existing `followUpEmails`/`magicLinkTokens` infra.
      *Verify:* return-within-7d after wall; email→session conversion.
- [ ] **15. Server-side loop guard** — similarity check vs recent assistant turns →
      regenerate once with anti-repeat instruction (backstop even after #1).

## Wave 3 — Conversation engine (prompt work, shipped as A/B variant B)

> The full design for this wave now lives in **[06-prompt-framework.md](06-prompt-framework.md)**
> (5-layer architecture derived from the demand study + baseline + reading pass).
> New plumbing it requires beyond the items below: **prophecy ledger** (predictions/
> windows/practices as structured data), **last-session-tail injection** (final
> question + open loops verbatim), **email-canon injection**, and **returning-user
> suggested-question rails**.
>
> **Test the core cheaply FIRST.** The framework's behavioral core is just prompt text
> — validate it as a prompt-only "Evelyn v2 spike" (08-PLAN Sprint 0.5) on 5 cases
> before building any of the plumbing above. Build only the pieces the spike proves
> move the needle. Don't assume the framework works; earn each expensive part.

- [ ] **16. Delivery-first turn shape** — replace the "28 words max / say ONE thing /
      stop and wait" blocks (4 of 6 personas) with Marcus's generalized beat:
      **deliver → then at most one question**. Intake capped; a real reading payload
      is REQUIRED when the intent flow reaches its `reading` stage.
- [ ] **17. Refund/support intent + support card** — per
      [specs/refund-and-support-handling.md](specs/refund-and-support-handling.md): first-ask
      path to support@cosmonumerology.com + /refund, one no-pressure repair offer max,
      never reframe the request. Add UI support card on intent trigger.
      *Verify:* replay founding transcript → path surfaced on first ask.
- [ ] **18. "Deliver now" intent** — "stop asking questions / just tell me / I need the
      reading" → immediate synthesis mode. (Currently missing from every persona's
      intent config.)
- [ ] **19. Ground greetings in verified memory only** — the greeting path currently
      manufactures fabricated continuity ("love in Paris"); if memory is thin, open
      warm-neutral instead.
- [ ] **20. Pin computed facts** — Life Path / chart / profile numbers calculated in
      code once, stored, injected; the model never re-derives them (kills the
      three-Life-Paths class of blowups).
- [ ] **21. Broaden the prediction sanitizer + make validation corrective** — regex set
      misses confident third-party predictions ("You will marry him"); character-rule
      validator currently logs violations and delivers anyway → retry once with
      stricter instruction.
- [ ] **22. Generalize the takeaway rule** — every session produces one artifact
      (practice / insight / next step), Nova's one-remedy mechanic as the template.
- [ ] **23. Ship 16–22 as variant B** via the idle experiments framework (all personas
      currently "A" @ 100%); primary metric: rebuy rate; guard metric: session length.

## Wave 4 — Decisions & strategy (operator calls; prep docs, then implement)

- [ ] **24. Scam-triage protocol** — systematize the good interventions (name it, IC3/
      hotline steps, no "energy reads" on the scammer, follow-up check-in). ~25% of the
      churn corpus are scam victims; current quality is a coin flip.
- [ ] **25. Ethical-retention policy** — decide: expired predictions can't be silently
      re-issued; hope-farming limits (progressive redirect to agency); purchase-prompt
      behavior during crisis disclosures; cant-afford handling. Evidence says graceful
      exits *outperform* retention pressure (both D-cohort walk-aways returned and
      spent more).
- [ ] **26. Cross-persona canon decision** — memory sharing is disabled by design;
      reading pass says that design causes sampler-drift churn and six-personas-
      same-story fatigue. Decide: shared user facts (names, events, birth data) with
      per-persona voice, or keep isolation.
- [ ] **27. Marketing ↔ chat canon sync** — inject email campaign context into chat
      sessions (users arrive quoting hooks personas can't honor); V1 artifact registry
      (bracelets/readings users own) into memory; impersonation-scam disclaimer page.
- [ ] **28. Metrics dashboard** — wire the KPIs so every wave is measurable: rebuy
      rate, wall-exit-on-question rate, pending-completion rate, refund-path success,
      disputes/mo, return-after-wall rate.

## Wave 5 — Operator tooling (after fixes land)

- [~] **29. `/persona-audit` skill** — one-command operator audit: runs both eval
      tracks (frozen `cases.json` + fresh DB sessions via `eval-replay --pick`), scores
      against the rubric, writes a before/after report to `eval/reports/<label>.md`.
      *Status: BUILT AHEAD (`.claude/skills/persona-audit/`, inert until triggered);
      adopted as the standard post-change ritual in Sprint 5.* Until then, run the two
      scripts directly.

---

**Suggested execution order:** 1 → 2+3 (parallel) → 4+5 → 6–10 → Wave 2 → Wave 3 →
Wave 4 decisions can start anytime (they're documents + choices, not code) →
Wave 5 tooling last.
