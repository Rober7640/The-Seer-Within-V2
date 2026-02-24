# Remaining To-Dos

Work that is not yet complete. Grouped by priority.

---

## CRITICAL — Fix before going live (bugs that break the product)

---

### BUG-1: "Start Chat" crashes in Love & Recommended sections
**Source:** UX audit FRICTION-2
**File:** `client/src/pages/PersonasDirectory.tsx` lines 834–843 and 869–878

When a user clicks "Start Chat" on any guide card in the "Best In Love Readings" section or "Recommended For You" section, the page throws a JavaScript error and nothing happens.

**Why:** The `onStartChat` prop is missing from PersonaCard in those two sections. The other sections pass it correctly.

**Fix:** Add `onStartChat={() => handleStartChat(p.slug, p.displayName, p.avatarUrl ?? null)}` to every PersonaCard rendered in those two sections.

**Effort:** Under 1 hour.

---

### BUG-2: Password minimum length mismatch
**Source:** UX audit FRICTION-1
**Files:**
- `client/src/pages/PersonasDirectory.tsx` line 1101 (auth modal)
- `client/src/pages/LoginPage.tsx` line 222

The registration form shows "Min 6 characters" but the server requires 8. Users who follow the on-screen hint get a confusing error.

**Fix:** Change `minLength={6}` to `minLength={8}` and update placeholder text to "Min 8 characters" in both files.

**Effort:** Under 30 minutes.

---

### BUG-3: Login redirect loses the guide you selected
**Source:** UX audit FRICTION-5
**Files:**
- `client/src/components/ChatServiceLayout.tsx` line 31
- `client/src/pages/ChatServicePage.tsx` line 211 (approximately)

If a user visits `/reading?persona=marcus-stone` without being logged in, they get redirected to `/login` with no indication of where to send them after login. They end up on the default guide instead of Marcus Stone.

**Fix:** Change `navigate('/login')` to `navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))` in both places.

**Effort:** Under 1 hour.

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

### TODO-2: Auth modal inputs missing `name` attributes
**Source:** UX audit FRICTION-4
**File:** `client/src/pages/PersonasDirectory.tsx` lines 1071, 1084, 1095

The registration modal doesn't have `name` attributes on inputs, so password managers and browser autofill don't work. Also breaks Playwright tests.

**Fix:** Add `name="firstName"`, `name="email"`, `name="password"` to the three inputs.

**Effort:** Under 15 minutes.

---

### TODO-3: After login, redirect to last consulted guide
**Source:** manual-testing-bugs item 5

When a returning user logs in, they should be sent to the last guide they chatted with (stored in their account as `defaultPersonaId`), not always to the generic `/reading` page.

**Fix:** After successful login in `LoginPage.tsx`, check if user has `defaultPersonaId` and redirect to `/chat/:slug` for that persona.

**Effort:** Under 2 hours.

---

### TODO-4: Remove fake strikethrough price in out-of-credits modal
**Source:** UX audit FRICTION-8
**File:** `client/src/components/OutOfCreditsModal.tsx` line 160

The modal shows a fake "original price" (2× the real price) crossed out. This is a dark pattern that can erode user trust and may cause legal issues.

**Fix:** Remove line `const originalPrice = formatPrice(featuredTier.priceUsd * 2)` and remove the strikethrough display. Replace with value framing ("3 minutes for $9.99") or just show the real price.

**Effort:** Under 1 hour.

---

### TODO-5: Wrong banner copy for paid users with low coins
**Source:** UX audit FRICTION-7
**File:** `client/src/pages/ChatServicePage.tsx` line 317

The "low credits" banner says "Your free trial is ending soon!" even when shown to users who have already paid. Incorrect copy for paying customers.

**Fix:** Check if the user has made any purchases. If yes, show "You're running low on credits" instead of the free trial copy.

**Effort:** Under 1 hour.

---

### TODO-6: Auth modal closes on outside click during verification
**Source:** UX audit FRICTION-9
**File:** `client/src/pages/PersonasDirectory.tsx` around line 998

While a user is waiting to verify their email, if they accidentally click outside the modal it closes. Re-opening it starts the registration form over from scratch.

**Fix:** When `authVerificationSent` is true, prevent the Dialog from closing on outside click. With Radix UI: add `onInteractOutside={(e) => { if (authVerificationSent) e.preventDefault(); }}` to DialogContent.

**Effort:** Under 1 hour.

---

### TODO-7: Coin pricing opaque on persona cards
**Source:** UX audit FRICTION-10
**File:** `client/src/pages/PersonasDirectory.tsx` (PersonaCard component)

Cards show "60 coins / min" but new visitors don't know what a coin costs in dollars. They can't evaluate affordability until after they register.

**Fix:** Add the dollar equivalent below the coin rate, e.g. "60 coins / min (~$0.33/min)". Calculate from the best-value credit package price.

**Effort:** 1-4 hours.

---

### TODO-8: "Coming Soon" PromoCTA clutters the personas page
**Source:** UX audit FRICTION-13
**File:** `client/src/pages/PersonasDirectory.tsx` line 533

A large faded "Coming Soon" section appears mid-page. It looks broken and breaks the user's scroll momentum.

**Fix:** Remove it entirely until the feature is ready.

**Effort:** Under 15 minutes.

---

### TODO-9: "View All" buttons do nothing
**Source:** UX audit FRICTION-16
**File:** `client/src/pages/PersonasDirectory.tsx` line 387

Section headers have "View All" buttons with hover styles but no click handler. Clicking does nothing.

**Fix:** Either remove the button until the feature exists, or wire it to filter/scroll.

**Effort:** Under 30 minutes.

---

### TODO-10: Pre-session timing note is too small
**Source:** UX audit FRICTION-14
**File:** `client/src/pages/ChatServicePage.tsx` line 1664

The note "Timer starts when you send your first message" is tiny amber text below the input. Many users miss it and are surprised when billing starts.

**Fix:** Make it more prominent — a pill or callout instead of 10px text.

**Effort:** Under 1 hour.

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
