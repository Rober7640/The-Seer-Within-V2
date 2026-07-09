# improve-v2 Playwright suite

Deterministic end-to-end regression for the **V2 chat engine** (the improve-v2
prompt work + the refund deflection). All output stays in this folder
(`results/`, `report/`).

## What's covered here vs. in the eval harness

| Concern | Where |
|---|---|
| **Refund/billing deflection** (fixed template, no LLM) | **Playwright** — `refund-deflection.spec.ts` (exact-match assertions) |
| **Chat round-trip** (auth → greeting → message → in-character reply, no markdown) | **Playwright** — `v2-reading-smoke.spec.ts` |
| **Safety interception** (crisis → blocked + 988 disclaimer) | **Playwright** — `v2-reading-smoke.spec.ts` |
| **LLM behavioural quality** — give-then-ask, no hard dates/checkable claims, no verbatim loops, memory recall, duty-of-care | **Eval harness** — `../eval` (`scripts/eval-chat.ts`), scored in `../eval/reports/` |

Why the split: model text is non-deterministic, so asserting exact reading content
in Playwright would be flaky. Playwright here asserts only **universal invariants**
(a fixed template matches exactly; a reply is substantive and in-character; a crisis
is intercepted). The *quality* of the reading is judged by the eval harness, which
scores full transcripts against the gap rubric.

## Run it

```bash
# from repo root — boots `npm run dev` on :5000 automatically (variant B forced)
npx playwright test -c improve-v2/playwright/playwright.config.ts

# single spec
npx playwright test -c improve-v2/playwright/playwright.config.ts refund-deflection

# open the HTML report afterwards
npx playwright show-report improve-v2/playwright/report
```

Requirements: local `.env` with `DATABASE_URL` (a reachable Postgres with the
personas seeded) and `ANTHROPIC_API_KEY`. The reading/smoke tests make real model
calls; the refund tests do not (they short-circuit before the LLM).

The webServer boots with `EXPERIMENT_FORCE_RUNNING=persona_prompt_evelyn_2026` so
users who bucket onto arm B exercise the improve-v2 prompt. All assertions are
arm-agnostic and pass on A or B.
