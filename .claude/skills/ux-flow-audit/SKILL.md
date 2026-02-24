# Skill: UX Flow Experience Audit — Chat Service

## Purpose

Conduct a deep user experience audit of the multi-persona chat service by reading the actual route and component code. Produces a full brief: step-by-step journey maps, emotional arc analysis, friction point inventory with severity ratings, prioritised fix list, and auto-generated Playwright test cases for every friction point found.

Run this skill whenever the onboarding or chat service flow changes, or when conversion/retention metrics need investigation.

---

## Trigger Phrases

- "run ux audit"
- "audit the user flow"
- "onboarding audit"
- "flow experience audit"
- "check the chat service flow"
- "ux flow audit"
- "audit personas flow"

---

## Fixed Parameters

| Parameter | Value |
|---|---|
| `flow_target` | `chat_service` — `/personas` is the default landing page |
| `audit_depth` | `deep` — full step-by-step + emotional arc + micro-interactions + copy |
| `persona_lens` | `new_visitor` first, then `returning_user` |
| `output_format` | `full_brief` — journey map + friction report + prioritised fixes |
| `focus_areas` | `onboarding` — registration gate, free trial discovery, first chat |
| `code_source` | Live — reads actual route/component files; never infers from memory |
| `output_file` | `docs/ux-flow-audit-[YYYY-MM-DD].md` |
| `playwright_tests` | Auto-generated for every friction point found |

---

## Execution Steps

### Step 0 — Read All Relevant Source Files

Read the following files **in full** before writing any findings. Do not infer behaviour from memory — only report what the code actually does.

**Frontend — Pages**
- `client/src/pages/PersonasDirectory.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/pages/ChatServicePage.tsx`
- `client/src/pages/CreditsPage.tsx`
- `client/src/pages/Dashboard.tsx`

**Frontend — Components**
- `client/src/components/ChatServiceLayout.tsx`
- `client/src/components/ChatServiceNav.tsx`
- `client/src/components/BuyCreditsModal.tsx`
- `client/src/components/OutOfCreditsModal.tsx`

**Backend — Routes**
- `server/routes/auth.ts`
- `server/routes/chatService.ts`
- `server/routes/personas.ts`

**Routing**
- `client/src/App.tsx` (route definitions only)

After reading all files, proceed to Step 1. Do not skip files — friction points are often hidden in branching logic that is only visible in the source.

---

### Step 1 — Map the New Visitor Journey

Trace every step a brand-new user takes from first landing to first completed chat, in strict order. For each step record:

- **Step number and name**
- **Route / URL**
- **Component(s) involved** (with file and line reference)
- **What the user sees** (exact copy if visible in JSX; summarise if dynamic)
- **What the user must do** (action required)
- **What the system does** (API call, state change, redirect, etc.)
- **Gate / blocker** — is anything preventing forward progress?
- **Emotional state** — label from: [Curious → Interested → Engaged → Trusting → Committed → Satisfied → Delighted]
- **Micro-interactions** — loading states, typing animations, modals, toasts
- **Copy quality** — is the language clear, compelling, and trust-building? Note exact strings.

Expected steps to map (verify against code; add or remove as needed):

1. Land on `/personas` (first visit, unauthenticated)
2. See persona cards — discover the offer
3. Click "Start Chat" on a persona
4. Auth modal appears — registration prompt
5. Fill in registration form (name, email, password)
6. Submit registration
7. Email verification screen (production path)
8. Email verification link clicked → `/api/auth/verify-email/:token`
9. Redirect to `/login?verified=success`
10. Sign in with credentials
11. Redirect to `/reading?persona=<slug>` (or `/personas`)
12. Pre-reading welcome screen
13. Fetch greeting — free preview, no credits charged
14. User reads greeting, sees suggested questions
15. User sends first message → session created, credits start
16. Active reading session — user chats
17. Credits run low — refill banner appears
18. Out of credits — OutOfCreditsModal
19. User purchases credits → Stripe → returns
20. Session ends (user-initiated or idle timeout)
21. Post-session: history visible, feedback modal (if ≥5 min)

---

### Step 2 — Map the Returning User Journey

Trace the same flow for a user who already has an account and has previously chatted. Use the same format as Step 1.

Key differences to verify in code:
- `isReturningUser = (user?.totalCoinsUsed ?? 0) > 0` — does UI change?
- `chattedGuideIds` in localStorage — does teaser/badge logic change?
- Auth modal skipped — does "Start Chat" navigate directly?
- Teaser suppressed — does greeting load without teaser overlay?
- Promo banner hidden — confirm `!isReturningUser` guard

Expected steps to map:
1. Land on `/personas` (authenticated, returning)
2. See persona cards — no promo banner
3. Click "Start Chat" → direct navigate to `/reading?persona=<slug>`
4. Pre-reading welcome screen
5. Fetch greeting (no teaser, no badge)
6. User chats (session and credits as normal)
7. Switch to a different guide mid-session
8. Old session silently ended — toast notification
9. New guide greeting loads
10. Persistent chat history visible across sessions

---

### Step 3 — Emotional Arc Analysis

For each persona lens, draw a simple emotional arc chart using ASCII. Score the user's emotional state at each step from 1 (frustrated/confused) to 10 (delighted/confident):

```
Step:     1    2    3    4    5    6    7    8    9    10   11   12 ...
Score:    6    7    8    4    5    3    4    2    5    7    8    9  ...
          ↑                   ↑         ↑              ↑
       Arrival          Auth gate    Email wait      First chat
```

Annotate:
- Every **drop of 2 or more points** = friction point (mark with `⚠`)
- Every **peak** = delight moment (mark with `★`)
- The **trust threshold** — the step where the user decides whether to continue

---

### Step 4 — Friction Point Inventory

For every friction point identified in Steps 1–3, create an entry using this exact template:

```
---
FRICTION-[N]: [Short name]
Severity:     [ CRITICAL | HIGH | MEDIUM | LOW ]
Affects:      [ new_visitor | returning_user | both ]
Step:         [Step number from journey map]
Location:     [file:line-number]

What happens:
  [Exact description of the friction — what does the user experience?]

Root cause:
  [What in the code causes this? Quote the specific logic or copy.]

User impact:
  [How does this hurt conversion, trust, or retention?]

Fix recommendation:
  [Specific, actionable recommendation. Reference the exact component/line.]

Playwright test:
  [See Step 5 — test ID will be FRICTION-[N]-TEST]
---
```

**Severity Definitions:**

| Severity | Meaning |
|---|---|
| **CRITICAL** | Blocks forward progress entirely for a measurable segment of users |
| **HIGH** | Causes significant drop-off or trust damage; affects core conversion |
| **MEDIUM** | Noticeably degrades experience; likely causes hesitation or confusion |
| **LOW** | Minor polish issue; unlikely to cause drop-off but worth fixing |

**Onboarding-specific friction areas to investigate:**

- Is the "3 free minutes" value proposition visible **before** the registration gate?
- Does the auth modal appear with enough context (persona name/avatar) to motivate completion?
- Is the email verification step clearly explained? Is the friction justified?
- Is there a path to get into a reading without email verification (e.g. test mode, magic link)?
- Does the user know what they're getting before they hand over their email?
- Is the registration form accessible (labels, tab order, error states)?
- Is there a guest/preview mode that lets users sample a reading before committing?
- What happens if the user closes the auth modal by accident?
- What happens after email verification — is the redirect clear?
- Is the pre-reading welcome screen useful or does it delay the "aha moment"?
- Are suggested questions helpful or generic?
- Is the credit model explained clearly before the first message is sent?
- Is the "session started / credits running" moment communicated clearly?
- What does the out-of-credits state look like? Is it abrupt?
- Is the credit purchase flow smooth (pricing, trust signals, return redirect)?

---

### Step 5 — Auto-Generate Playwright Tests

For **every friction point** in Step 4, generate a complete Playwright test. Also generate baseline happy-path tests for both persona lenses.

**File to write:** `tests/ux-flow-audit.spec.ts`

**Required test structure:**

```typescript
import { test, expect } from '@playwright/test';

// ============================================================
// UX FLOW AUDIT — Generated by ux-flow-audit skill
// Run: npx playwright test tests/ux-flow-audit.spec.ts
// ============================================================

test.describe('New Visitor Journey', () => {
  // Happy path
  test('NV-01: can discover personas on /personas without auth', async ({ page }) => { ... });
  test('NV-02: sees "3 free minutes" promo banner when not logged in', async ({ page }) => { ... });
  test('NV-03: clicking Start Chat opens auth modal with persona context', async ({ page }) => { ... });
  test('NV-04: auth modal shows persona avatar and name', async ({ page }) => { ... });
  test('NV-05: registration form submits and shows email verification screen', async ({ page }) => { ... });
  test('NV-06: verified user is redirected to /reading with correct persona', async ({ page }) => { ... });
  test('NV-07: greeting loads without credits being charged', async ({ page }) => { ... });
  test('NV-08: first message creates session and starts credit timer', async ({ page }) => { ... });

  // Friction point tests (one per FRICTION-N entry)
  test('FRICTION-1-TEST: [friction name]', async ({ page }) => { ... });
  // ... etc
});

test.describe('Returning User Journey', () => {
  // Baseline tests
  test('RU-01: authenticated user sees no promo banner on /personas', async ({ page }) => { ... });
  test('RU-02: Start Chat navigates directly to /reading without auth modal', async ({ page }) => { ... });
  test('RU-03: returning user to same guide sees no teaser', async ({ page }) => { ... });
  test('RU-04: switching guides silently ends old session with toast', async ({ page }) => { ... });
  test('RU-05: chat history persists after ending a session', async ({ page }) => { ... });

  // Friction point tests
  test('FRICTION-[N]-TEST: [friction name]', async ({ page }) => { ... });
});

test.describe('Credit & Onboarding Edge Cases', () => {
  test('EC-01: credit balance visible in nav before starting session', async ({ page }) => { ... });
  test('EC-02: refill banner appears before credits hit zero', async ({ page }) => { ... });
  test('EC-03: out-of-credits modal blocks sending but shows purchase option', async ({ page }) => { ... });
  test('EC-04: idle warning appears after 2 minutes of inactivity', async ({ page }) => { ... });
  test('EC-05: idle timeout ends session after countdown', async ({ page }) => { ... });
});
```

**Test writing rules:**
- Use `page.goto()` with `baseURL` from `playwright.config.ts`
- Use `test.use({ storageState: 'tests/.auth/user.json' })` for authenticated tests
- For registration tests, generate unique emails: `test-${Date.now()}@example.com`
- Assert visible text with `toContainText` — not implementation details
- Assert navigation with `toHaveURL`
- Assert modals with `toBeVisible` on the modal container
- For credit timer tests, use `page.waitForTimeout` sparingly — prefer observable UI changes
- Add `test.slow()` to any test that involves real AI responses
- Include a `test.beforeEach` that clears localStorage for new visitor tests

---

### Step 6 — Prioritised Fix List

Produce a ranked fix list. Sort by: `(Severity × User Impact) / Implementation Effort`.

Score each:
- **Severity:** CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
- **User Impact:** How many users are affected × how early in the funnel (1–5)
- **Implementation Effort:** 1=quick (< 1hr), 2=moderate (1–4hr), 3=large (>4hr)

Output format:
```
Priority | FRICTION-N | Fix Summary                              | Score | Effort
---------|------------|------------------------------------------|-------|-------
1        | FRICTION-2 | Show value prop before auth gate         | 12.0  | Low
2        | FRICTION-5 | Add magic link / skip email verify       | 9.0   | Medium
...
```

---

### Step 7 — Write the Output File

Write everything to `docs/ux-flow-audit-[YYYY-MM-DD].md` using the structure below. Replace `[YYYY-MM-DD]` with today's date.

```markdown
# UX Flow Experience Audit — Chat Service
**Date:** [YYYY-MM-DD]
**Audit depth:** Deep
**Focus:** Onboarding
**Generated by:** ux-flow-audit skill

---

## Executive Summary

- Total friction points found: N
  - CRITICAL: N
  - HIGH: N
  - MEDIUM: N
  - LOW: N
- Top drop-off risk: [Step N — description]
- Trust threshold step: [Step N — description]
- Highest-priority fix: [FRICTION-N — one-line summary]
- Playwright tests generated: N (written to `tests/ux-flow-audit.spec.ts`)

---

## Part 1: New Visitor Journey Map

[Full step-by-step table from Step 1]

---

## Part 2: Returning User Journey Map

[Full step-by-step table from Step 2]

---

## Part 3: Emotional Arc Analysis

[ASCII arc chart + annotations for both persona lenses]

---

## Part 4: Friction Point Inventory

[All FRICTION-N entries from Step 4]

---

## Part 5: Playwright Tests

[Reference to generated file + list of test IDs and what each covers]

---

## Part 6: Prioritised Fix List

[Ranked table from Step 6]

---

## Appendix: Source Files Audited

[List every file read in Step 0 with the last-modified date if available]
```

After writing the file, output a short summary to the user:
- How many friction points were found at each severity
- The top 3 highest-priority fixes
- The path to the output file
- How to run the generated Playwright tests

---

## Notes for the Agent

1. **Always read the files first.** Never rely on memory of the codebase. Code changes constantly.
2. **Quote the code.** Every friction finding must cite the specific file and line number where the friction originates.
3. **Be specific about copy.** If an onboarding screen has weak copy, quote the exact string from the JSX and suggest the improved version.
4. **Emotion first, code second.** The audit must describe the user's felt experience, not just technical implementation. Both matter.
5. **Playwright tests must be runnable.** Write real, executable test code — not pseudocode or comments-only stubs. Use the actual selectors visible in the components.
6. **Do not fix anything during the audit.** This skill is read-only. After delivering the report, ask: "Would you like me to implement any of these fixes?"
7. **Re-check your journey maps against the code.** After tracing each step, verify the transition logic is correct — especially auth guards in `ChatServiceLayout.tsx` and redirect logic in `auth.ts`.
8. **Flag test environment differences.** The auth flow behaves differently in test vs production (auto-verify vs email send). Document this clearly in the journey map.
