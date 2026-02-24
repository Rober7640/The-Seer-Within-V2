# Remaining To-Dos

Work that is not yet complete. Grouped by priority.

---

## HIGH PRIORITY — Fix soon after launch

---

### TODO-1: Persona context lost after email verification
**Source:** UX audit FRICTION-3
**Files:** `server/routes/auth.ts` line 182, `client/src/pages/LoginPage.tsx`

After a user registers while looking at a specific guide (e.g. Marcus Stone), the verification email sends them to `/login` with no memory of which guide they wanted. They end up with the default guide.

**Fix:** Store the intended persona slug in browser localStorage during registration. Read it after login and redirect to the correct guide.

**Effort:** 1-4 hours.

---

## MEDIUM PRIORITY — Important for user experience

---

### TODO-11: Intent configs are empty for Evelyn Cross
**Source:** manual-testing-bugs item 4

The intent detection system (which guides how the AI steers conversations) has no config for Evelyn Cross. This means she doesn't have the same conversation direction as the System 1 version.

**Fix:** Study the intent and conversation flow in System 1 (`server/lib/chatEngine.ts`) and import/translate the relevant intent configs for Evelyn Cross in the admin panel under Intent Configs.

**Effort:** 4-8 hours.

---

### TODO-12: Safety guardrails are empty for System 2
**Source:** manual-testing-bugs item 3

The content safety rules for System 2 guides are not populated with the same guardrails as System 1.

**Fix:** Review `server/lib/universalSafety.ts` and the System 1 prompt safety rules. Ensure they are applied consistently across all System 2 guides via the safety config.

**Effort:** 4-8 hours.

---

### TODO-13: Resend DNS — required before any emails go out
**Source:** manual-testing-bugs Follow-ups section

The re-engagement email system is built and ready, but emails cannot be delivered until the domain `theseerwithin.com` is verified in the Resend dashboard. This is a one-time setup step.

**Fix:**
1. Go to resend.com → Domains → Add Domain → `theseerwithin.com`
2. Add the 3 DNS records Resend gives you (in Cloudflare, GoDaddy, etc.)
3. Wait for verification (5-30 minutes)

**Effort:** Under 30 minutes (plus DNS propagation wait time).

---

### TODO-14: PayPal — test end-to-end in sandbox before going live
**Source:** PayPal integration is complete but untested

The PayPal integration is coded and wired up. Before switching to live mode, test the full flow:
1. Set `PAYPAL_MODE=sandbox` in `.env`
2. Use PayPal sandbox test accounts (create at developer.paypal.com)
3. Purchase credits using the sandbox buyer account
4. Verify coins are added to user balance
5. Check `credit_purchases` table for the record

**Effort:** 2-4 hours.

---

### TODO-15: "Browse Personas" → "Browse Guides"
**Source:** manual-testing-bugs item 38

Update the label wherever "Personas" appears in the UI to use "Guides" for consistency.

**Effort:** Under 1 hour.

---

## LOWER PRIORITY — Nice to have before launch

---

### TODO-16: BuyCreditsModal default selection is wrong
**Source:** UX audit FRICTION-11
**File:** `client/src/components/BuyCreditsModal.tsx` line 33

The modal pre-selects "popular" package but the "MOST POPULAR" badge appears on a different package. Confusing.

**Fix:** Default to whichever package has the badge: `useState(() => tiers.find(t => t.badge)?.packageType ?? "popular")`

**Effort:** Under 30 minutes.

---

### TODO-17: Auth loading race in handleStartChat
**Source:** UX audit FRICTION-12
**File:** `client/src/pages/PersonasDirectory.tsx` line 654

On slow connections, clicking "Start Chat" before auth state resolves can navigate the user to the wrong place.

**Fix:** Add `if (authLoading) return;` at the start of `handleStartChat`.

**Effort:** Under 30 minutes.

---

### TODO-18: Credit depletion check every 60 seconds
**Source:** UX audit FRICTION-6
**File:** `client/src/pages/ChatServicePage.tsx` line 326

The out-of-credits check only fires at 60-second intervals. A user can be billed up to 59 coins extra.

**Fix:** Check credit depletion on every tick, not just every 60 ticks.

**Effort:** Under 1 hour.

---

## Infrastructure tasks (one-time setup)

| Task | Priority | Notes |
|------|----------|-------|
| Verify Resend domain DNS | Critical | Must be done before emails work |
| Set Stripe live keys + webhooks | Critical | Must be done before go-live |
| Set PayPal to live mode | Critical | Change `PAYPAL_MODE=live` |
| Change admin password | Critical | Default is `ChangeMe123!` |
| Update `BASE_URL` to production domain | Critical | Used in email links |
| Test PayPal sandbox end-to-end | High | Do this before switching to live |
| Visual QA of email templates | High | Send test emails, check rendering |
| Add per-persona Stripe price IDs to .env.example | Low | Documentation improvement |
| Add `LOG_LEVEL` to .env.example | Low | Documentation improvement |

---

## Features scoped but not built

These were discussed but not implemented. Not required for launch.

| Feature | Source |
|---------|--------|
| Guide availability scheduling (online/busy times per guide) | Item 40 |
| Multi-language safety patterns | Item 44 |
| Real-time analytics dashboard (live session counts) | Item 45 |
| Next guide avatar — love-focused | Item 20 |
| Pre-reading session page redesign (from attached3.png) | Item 6 |
| Personas marketplace page redesign (from attached5.png) | Item 9 |
| Delete user function in admin panel | Item 14 |
