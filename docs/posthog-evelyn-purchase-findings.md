# PostHog Findings — Evelyn Funnel, Purchase Attribution & Instrumentation Gaps

**Date pulled:** 2026-06-26 (PDT), trailing 7 days
**PostHog project:** "Default project" (id `426879`), org **SeerWithin**, host `us.posthog.com`, tz America/Los_Angeles
**Status:** Findings only. **No code changes have been made.** A proposed `identify()` fix was drafted and then reverted at the team's request — see [Recommendations](#recommendations-not-implemented).

---

## TL;DR

1. **Purchases are healthy overall, just not via `/evelyn`.** Last 7 days: **125 purchases** total — **23 Stripe card** + **102 PayPal**. PayPal is ~82% of volume and the primary money rail.
2. **The Evelyn *persona* is the engine, not the `/evelyn` *lander*.** Of 102 PayPal sales, **90 (~$2,589)** were credits bought to chat with the **Evelyn Cross persona** — but these buyers did **not** come through the new `/evelyn` lander.
3. **The `/evelyn` lander converts almost nobody: 3 buyers in 7 days** (all PayPal, 0 card). This is the one part of the funnel that *is* well-instrumented, and it's tiny.
4. **~88% of revenue has no acquisition tracking.** PostHog has **zero** page/URL data for the Evelyn-persona buyers (0 of 65 had any client pageview/lander event; `$pageview` isn't even in the project taxonomy). We can't currently see which ads/emails drive the real money.
5. **Resend is a contributor, not the engine — and its drip tracking is broken.** An app-DB join shows **up to ~26% of Evelyn purchases (30d)** were preceded by a Resend "sales" email (tight causal proxy: **~8%** clicked within 72h). Most of that pull is **top-up reorder** emails, not new acquisition. Worse, the Evelyn nurture drip's open/click tracking is **silently broken** (the Resend webhook never updates `evelyn_followup_emails`), so its true contribution is undercounted. See [§3.6](#36-resend-email-contribution-to-evelyn-sales-app-db-join).
6. **The lander *mechanic* — and the email feeding it — are the biggest levers.** Evelyn's **open chat box** engages only **17.5%** of sessions vs Aiden's **tap quiz** at **84.6%** (4.8×), and converts **~33× worse** to purchase per session (§3.8). Crucially, `/evelyn`'s traffic is **warm AWeber email** — yet it engages at *less than half* of Luna's warm-email open-box lander (40.5%), so the **AWeber email itself is a prime suspect** (§3.9). Porting Aiden's quiz **and** fixing the email are the top levers. Separately, even Aiden monetizes only **~2% of signups** — the **free→paid step is the next problem** (problem #4).
7. **Monetization's weak link is the *offer*, not the plumbing (🚩 dev flag).** At the buy moment the app sells an abstract currency — a multi-package "coins" grid ("Buy Coins") — instead of the outcome the user wants (continuing the reading) (§3.11). *On top of that*, checkout loses ~60% of those who do start (PayPal completes just **45%**; no Apple/Google Pay; approved-but-interrupted PayPal payments can be stuck `pending`/uncredited — §3.10).

---

## Master checklist — the problems to solve

Canonical task tracker; detail in the linked sections. None of these are done yet.

**Problem 1 — `/evelyn` lander conversion** (§3.7, §3.8)
- [ ] Port the Aiden **tap-quiz** mechanic onto `/evelyn` (engagement 17.5% → target; Aiden 84.6%)
- [ ] Fix the **registration cliff** (CTA→register 9.9%): inline capture in Evelyn's card / slim the signup form
- [ ] Grant **free minutes at registration**, verify async (removes the 41% verification wall)
- [ ] Templatize the winning mechanic to the persona landers when traffic warrants

**Problem 2 — Acquisition instrumentation** (§1, Recs 1–3)
- [ ] `identify(user.id)` on auth (identity stitching) so funnels connect
- [ ] Enable pageview + UTM capture (~88% of revenue unattributed)
- [ ] Fix the purchase funnel step (combined card+PayPal action; never `purchase_completed` for V2)

**Problem 3 — Resend drip tracking** (§3.6, Rec 6)
- [ ] Add `evelynFollowupEmails` to the Resend webhook (open/click currently dead)

**Problem 4 — Free→paid: weak offer (weakest link) + leaky checkout** (§3.11–3.15, §3.10) — 🚩 dev/product

*Offer redesign — the weakest link (§3.12, §3.15):*
- [x] Paywall **redesign + copy rewrite** built — de-feared header, refund-contradiction fix, minutes-led tiles, mid-tier default; coins kept. Demoable at **`/paywall-preview`** (§3.15)
- [x] **Integrated** into the live `BuyCreditsModal` / `CreditsPage` / `PaymentModal` / `ChatServicePage` banner behind the variant gate; `applyBVariantBadges` runs server-side in `/api/credits/pricing`; `paywall_views` table + disabled `system_config` flag created; tested (spec + E2E). **Shipped OFF — live unchanged** (§3.15)
- [ ] **Phase 1 — A/B on Evelyn Cross ONLY:** flip the `paywall_copy_experiment` flag to `enabled:true, percentB:50` to start. Sticky per-`user.id`, measured from the DB; all other personas stay on A (§3.13–3.15)
- [ ] **Phase 2 — roll the winner out to the other 5 personas** — no new design work; widen/clear `personaId` in the flag (§3.15)
- [ ] **(needs sign-off)** Global ~90s low-balance banner timing (§3.14.A) — held back to keep live byte-identical; one-line change (§3.15)

*Checkout leaks (§3.10):*
- [ ] Add Apple Pay / Google Pay express buttons; re-test the PayPal default (45% vs 55%)
- [ ] Make PayPal capture robust (webhook backstop) + audit for paid-but-stuck `pending` orders
- [ ] Fix purchase-event firing so the checkout funnel is measurable (feeds problem 2)

*Measurement (§3.13):*
- [ ] Pull the in-product free→paid funnel: signup → started chat → minutes exhausted → paywall shown → purchased

---

## 1. State of PostHog instrumentation

| Area | Tracked? | Notes |
|------|----------|-------|
| New V2 landers (`/evelyn`, `/marcus`, `/luna`, `/nova`, `/maren`, `/aiden`) | ✅ Partial | Client fires custom `lander_view` / `lander_cta_clicked` (with `funnel` + `step` props). |
| Server-side lifecycle (registration, login, chat, purchases) | ✅ Yes | `posthog-node`, keyed to `distinctId = user.id`. |
| Site-wide pageviews / general URLs | ❌ No | `posthog-js` runs with `capture_pageview: false` and `autocapture: false`. **`$pageview` does not exist in the project.** |
| Original funnel (`/` → `/chat` → Stripe) | ❌ No client tracking | Only server purchase events exist for these users. |
| Acquisition (referrer / UTM / landing URL) for non-lander users | ❌ No | No client events → person profiles have null `$initial_*`. |

### Two identity spaces (important)

- **Client/anonymous:** `lander_view`, `lander_cta_clicked` are captured **anonymously** (no `identify()` on the lander). The Evelyn lander never calls `identify()`.
- **Server/`user.id`:** every post-login event (`user_registered`, `chat_session_started`, `chat_message_sent`, purchases) is keyed to `user.id`.

Because the lander never calls `identify(user.id)`, **a funnel that spans `lander_view → … → purchase` collapses to ~0** — PostHog treats the pre-login visitor and the logged-in user as two different people. This is why the cross-boundary funnel showed 0 conversions. (Funnels that stay inside one identity space — lander-only, or server-only — work fine.)

---

## 2. Purchase events reference

| Event | Meaning | Identity | Fires? |
|-------|---------|----------|--------|
| `credit_purchase_completed` | Stripe **card** credit purchase (V2 chat service) | `user.id` | ✅ |
| `paypal_purchase_completed` | **PayPal** credit purchase (V2 chat service) | `user.id` | ✅ |
| `purchase_completed` | **Soulmate / V1** funnel (one-time Stripe), **email-keyed** | email | ✅ (different funnel) |
| `confirm_checkout_completed` | Stripe hosted-checkout return | `user.id` | ❌ never fired (not in taxonomy) |
| `stripe_webhook_purchase_completed` | Stripe webhook backstop | `user.id` | ❌ never fired |
| `paypal_webhook_purchase_completed` | PayPal webhook backstop | `user.id` | ❌ never fired |

**Implications**
- The original PostHog funnel used `purchase_completed` as its purchase step — **wrong event** for the V2 chat service (it's the soulmate/V1 email-keyed funnel), which is why it read 0.
- Only the two client-confirm events actually fire. The **webhook backstops never fire** — so any purchase where the buyer closes the tab before the confirm call may go untracked (minor under-count risk).
- A given purchase is either card *or* PayPal (no overlap), so combining the two events does not double-count buyers in a funnel.

---

## 3. Findings (last 7 days)

### 3.1 Total purchases by method

| Event | Purchases | Buyers | Evelyn-lander-attributed (`signup_funnel = evelyn`) |
|-------|-----------|--------|------|
| `credit_purchase_completed` (Stripe card) | 23 | 13 | **0** |
| `paypal_purchase_completed` (PayPal) | 102 | 75 | **3** |
| **Total** | **125** | ~88 | **3** |

- Stripe card is **not broken** — 23 sales globally. PayPal simply dominates (~82%).

### 3.2 PayPal sales by **persona** (`persona_id` on the purchase = which persona's credits)

Persona names mapped from `chat_session_started` (which carries both `persona_id` and `persona_name`), since the local `.env` has no `DATABASE_URL`.

| Persona | Purchases | Buyers | Revenue (USD) |
|---------|-----------|--------|---------------|
| **Evelyn Cross** | **90** | 65 | **$2,589.10** |
| Aiden Powers | 4 | 4 | $79.96 |
| Marcus Stone | 1 | 1 | $99.99 |
| Maren Soleil | 1 | 1 | $99.99 |
| Luna Voss | 1 | 1 | $2.99 |
| (no persona tagged) | 5 | 5 | $119.95 |
| **Total** | **102** | | **~$2,992** |

- **Evelyn Cross ≈ 88% of PayPal sales and ~$2,589 of ~$2,992 PayPal revenue.**
- **Luna Voss drove a single $2.99 sale** in the window, despite the daily-email program.

### 3.3 PayPal sales by **`signup_funnel`** (which lander the buyer *registered* through)

`signup_funnel` only takes three values: **`standard`, `evelyn`, `aiden`** (Luna/Marcus/Nova/Maren landers register as `standard`).

| signup_funnel | Purchases | Buyers | Revenue (USD) |
|---------------|-----------|--------|---------------|
| `None` (untracked / pre-dating the field) | 93 | 66 | $2,739.07 |
| `evelyn` | 3 | 3 | $42.97 |
| `standard` | 3 | 3 | $69.97 |
| `aiden` | 3 | 3 | $139.97 |

- The vast majority (`None`) are users who registered before `signup_funnel` existed or through paths that don't set it.

### 3.4 The persona-vs-lander distinction (key insight)

There are **two different "Evelyn" numbers** that are easy to conflate:

| "Evelyn" | Definition | PayPal sales (7d) |
|----------|------------|-------------------|
| Evelyn **persona** | `persona_id` = bought credits to chat with Evelyn | **90** |
| Evelyn **V2 lander** | `signup_funnel = 'evelyn'` = registered via `/evelyn` | **3** |

So the **persona** carries the business; the **new lander** is a tiny acquisition channel. The ~87 extra Evelyn-persona buyers came through other paths (original funnel, direct, returning, email) — **not** `/evelyn`.

### 3.5 Acquisition blind spot (the "what URL" question)

- For the 65 Evelyn-persona PayPal buyers, `person.$initial_pathname` is **null for all of them**.
- **0 of 65** ever fired a `$pageview` / `lander_view` / `lander_cta_clicked` event.
- These persons exist in PostHog **only** via server-side events. PostHog never saw them on a page — no entry URL, referrer, or UTM.
- App URLs in the flow (from code, since PostHog can't show them): chat at `/reading?persona=evelyn-cross`, credits purchase at `/credits`, entry via `/login` or `/personas`.

### 3.6 Resend email contribution to Evelyn sales (app-DB join)

> **Source note:** this subsection is **not** from PostHog — PostHog never sees Resend opens/clicks (the webhook doesn't fire PostHog on email engagement). These numbers come from a join in the **app Postgres DB** between `credit_purchases` and the Resend email tables, all keyed to `user_id`.

**Question:** of Evelyn-persona credit purchases, how many were preceded by a Resend "sales" email — the `evelyn_followup_emails` free→paid nurture, or a `topup_emails` reorder nudge?

| Window | Evelyn purchases (completed) | Buyers | Received a Resend sales email before | Clicked one before | Clicked within 72h before |
|--------|------------------------------|--------|--------------------------------------|--------------------|---------------------------|
| 7 days | 110 | 74 | 10.0% | 10.0% | 4.5% |
| 30 days | 434 | 223 | **25.8%** | 15.2% | **8.1%** |

> Reconciles with §3.1/§3.2: 110 completed Evelyn purchases (7d) ≈ the 90 PayPal Evelyn sales + Evelyn Stripe-card sales (card-by-persona wasn't split in §3.2).

**Read:**
- **Resend is a contributor, not the engine.** At most **~26%** of Evelyn purchases (30d) had *any* Resend sales email beforehand → **~74% of Evelyn buyers were never touched by a Resend sales email before buying.** Their acquisition happens elsewhere (still the §3.5 blind spot — AWeber legacy Evelyn drip, ads, direct, returning users, original funnel).
- **Tight causal proxy ≈ 8%** (clicked within 72h before buying), and that slice is almost entirely **top-up reorders** — existing customers replenishing, *not* new acquisition.
- **True contribution sits in a range: ~15% (tracked clicks) to ~26% (received-before).** The gap is the broken drip tracking below.

**Where Resend genuinely sells — top-up reorder emails (CTA → `/credits`):**

| Top-up segment | Sent (30d) | Opened | Clicked |
|----------------|-----------:|-------:|--------:|
| `dormant_low_balance` | 9,099 | 3,268 (~36%) | 1,038 (~11%) |
| `free_tier_dropoff` | 622 | 348 | 152 |
| `empty_tank` | 87 | 61 | 24 |

**🐞 Tracking bug — Evelyn's nurture-drip engagement is silently dead.** The flagship free→paid sequence records **0 opens / 0 clicks on 1,690+ sends** — impossible for real email:

| Resend email type | Sent (30d) | Opened | Clicked |
|-------------------|-----------:|-------:|--------:|
| `evelyn_drip:verified_nopurchase` | 1,690 | **0** | **0** |
| `evelyn_drip:unverified` | 237 | **0** | **0** |
| `evelyn_drip:post_purchase` | 1,530 | **0** | **0** |

**Cause:** the Resend webhook (`server/routes/webhooks.ts`) matches open/click/bounce events by `resendEmailId` against `followUpEmails`, `migrationDripEmails`, `topupEmails`, `aidenFollowupEmails`, and `personaFollowupEmails` — but **never `evelynFollowupEmails`**. Every engagement event on Evelyn's own drips is dropped. (Ironically the tiny Aiden persona *is* tracked; the #1 revenue persona is not.) This is why the drip can't be credited above, and why ~26% is an **upper bound**, not the full picture — the drip's real pull is invisible until this is fixed.

**Method (app-DB SQL, reproducible):**
```sql
WITH evelyn_purchases AS (
  SELECT id, user_id, created_at
    FROM credit_purchases
   WHERE persona_id = '7f03b55e-9a35-4bb7-ac80-a5dff7228910'  -- Evelyn Cross
     AND status = 'completed'
     AND created_at >= now() - interval '30 days'),
sales_emails AS (
  SELECT user_id, sent_at, opened_at, clicked_at FROM evelyn_followup_emails
   WHERE status='sent' AND sequence_type IN ('unverified','verified_nopurchase')
  UNION ALL
  SELECT user_id, sent_at, opened_at, clicked_at FROM topup_emails WHERE status='sent')
SELECT count(*) AS purchases,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM sales_emails e
         WHERE e.user_id=p.user_id AND e.sent_at    < p.created_at)) AS recd_before,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM sales_emails e
         WHERE e.user_id=p.user_id AND e.clicked_at < p.created_at)) AS clicked_before
  FROM evelyn_purchases p;
```

**Caveats:** correlation, not proven causation (top-up is self-selecting — only sent to prior buyers running low); counted at the purchase level (a repeat buyer counts multiple times); `clicked_before` is effectively **top-up-only** until the drip-tracking bug is fixed.

### 3.7 The `/evelyn` lander funnel — where the ~800 clicks/day die (app-DB)

> **Source:** app Postgres, **not** PostHog. `evelyn_lander_sessions` logs every lander step (`turn_count`, `cta_clicked`, `cta_action`, `resolved_segment`) and is stamped with `resolved_user_id` at registration — so the **entire** funnel is measurable in-DB, *bypassing the §1 identity gap*. The registration count was cross-checked against `users.signup_funnel='evelyn'` (209 vs 209, 100% linkage), so these steps are exact, not estimated.

~20,480 sessions / 30d (~680/day). **85% resolve to `brand_new`**, 15% to returning `v2_password`, ~0 magic-link/token. Important: these are `brand_new` by *segment*, **not cold by *traffic***. The traffic is actually **warm AWeber email** (Evelyn's legacy drip) — but the email links to a bare `/evelyn` with no `email`/`token`, so the lander can't recognize subscribers and treats them as first-time strangers (see §3.9).

| Step (`brand_new`) | Count (30d) | % of sessions | step→step |
|--------------------|------------:|--------------:|----------:|
| Sessions | 17,336 | 100% | — |
| Sent ≥1 message | 3,020 | 17.4% | 17.4% |
| Hit 2-msg cap (CTA shown) | 2,740 | 15.8% | 90.7% |
| Clicked CTA "Continue your reading" | 2,102 | 12.1% | 76.7% |
| **Registered (account created)** | 209 | 1.2% | **9.9%** |
| Verified email (free minutes granted) | 123 | 0.7% | 58.9% |
| Purchased Evelyn credits | 3 | 0.017% | 2.4% |

**Three leaks, ranked by leverage:**

1. **🔴 Registration cliff — CTA→register = 9.9% (≈1,893 of the hottest leads lost / 30d).** The highest-intent group in the whole funnel (chatted, hit the cap, clicked "Continue your reading") is dumped from a warm chat onto a `/login?mode=signup` form (email + password + name). The CTA promises *"continue the reading"* and delivers a *signup wall* — expectation violation + form friction. **Biggest fixable win:** 10% → 30% ≈ **3× registrations and 3× downstream buyers** at no extra ad spend.
2. **🔴 Top-of-funnel bounce — session→first message = 17.4% (≈14,316 lost / 30d).** 5 of 6 visitors never type — and remember these are *warm* AWeber subscribers (§3.9), which makes it worse. Bare centered chat card, no value prop / social proof / ratings / pricing. Biggest *absolute* leak.
3. **🟠 Verification gate — register→verify = 59% (≈86 lost / 30d).** Free minutes are granted only at `/verify-email` (`getFreeCoinsForPersona`; `email_verified` starts `false` in prod), so 41% of people who *created an account* get **zero** minutes and never reach the product. Fix: grant free minutes at **registration**, verify async (the unverified drip already chases verification).

*(verified→purchased = 2.4% is the free→paid monetization step — a product/pricing problem, not a lander one.)*

**Method:** `evelyn_lander_sessions` joined to `users` (`email_verified`) and `credit_purchases` (persona = Evelyn, status = completed); registration cross-checked via `users.signup_funnel='evelyn'`. Scripts in the session scratchpad.

### 3.8 The engagement fix — open chat box vs. tap quiz (Aiden head-to-head, 90d)

> Same advertiser, same "spiritual reading" vertical, two lander mechanics. `/evelyn` opens with a **free-text chat box**; `/aiden` (`AidenQuizPage`) opens with a **tap-based quiz** (q1 topic → q2 feeling → q3 outcome). 90d ≈ all-time for both, so samples are full and the rates are stable (they barely moved 30d → 90d).

| Stage (per session, 90d) | Evelyn — open chat box | Aiden — tap quiz | Aiden × |
|--------------------------|-----------------------:|-----------------:|--------:|
| Engaged (first interaction) | 17.5% | **84.6%** | **4.8×** |
| Signed up | 1.25% | **27.52%** | **22.1×** |
| Purchased | 0.017% | **0.564%** | **33.6×** |

Counts: Aiden 4,785 sessions → 1,317 signups → 27 buyers; Evelyn 17,883 → 223 → 3. The engaged & signup gaps rest on thousands/hundreds of events (firm); purchase (27 vs 3) is directionally strong but small-N.

**Traffic source matters — and it makes Evelyn look *worse*, not better.** `/evelyn`'s traffic is **warm AWeber email** (not cold ads, as first assumed). Engagement by mechanic + source:
- warm AWeber email + open box (**Evelyn**) → **17.5%**
- warm Kit email + open box (**Luna**) → **40.5%**
- tap quiz (**Aiden**, source unconfirmed) → **84.6%**

Two open-box landers on *warm email* differ **2.3×** (Evelyn 17.5% vs Luna 40.5%) — so Evelyn's **AWeber email is itself a suspect** (§3.9), independent of the mechanic. And Aiden's tap quiz beats *both* open-box landers (2× even Luna's warm rate), so the quiz is the leading mechanic fix — though Aiden's traffic source isn't confirmed, so treat the quiz lift as strongly suggestive rather than perfectly isolated.

**Cross-lander reality.** Of the four generalized persona landers, only **Luna has traffic** (513 sessions/90d); **Marcus (2), Nova (0), Maren (0)** are effectively dormant. So the open-box problem — and the prize — is **overwhelmingly Evelyn's**. (Luna: 40.5% engaged, 1.75% signup, 0 buyers — warm traffic engages but the open-box→registration cliff still throttles signup.)

**The prize (all open-box landers combined, 90d):**

| Scenario | Open-box sessions | Buyers / 90d |
|----------|------------------:|-------------:|
| Today (actual) | 18,398 | 3 |
| At **half** Aiden's purchase rate | 18,398 | ~52 |
| At Aiden's purchase rate | 18,398 | ~104 |

Even at half Aiden's rate, the *same spend* yields **~50 buyers/90d vs 3** (~16×). **Caveat:** re-rating assumes Evelyn's traffic would behave like Aiden's under a quiz — an extrapolation, hence the conservative half-rate row.

**Action:** port the `AidenQuizPage` tap-quiz mechanic onto `/evelyn` (4× the traffic), then templatize to the persona landers. Highest-leverage item for problem #1.

### 3.9 The AWeber email feeding `/evelyn` is a suspect — and it's untracked

> `/evelyn` traffic is **warm AWeber email** (Evelyn's legacy psychic-reading drip), not cold ads. That makes the **17.5%** engagement *alarming*: warm subscribers engage **less than half** as often as Luna's warm Kit traffic on the identical lander (40.5%, §3.8). The email itself — content, targeting, expectation-setting — is a prime suspect.

Worse, the email link is a **bare `/evelyn`** with no params. From `evelyn_lander_sessions` (90d, brand_new):

| What the email passes | Coverage | Consequence |
|------------------------|----------|-------------|
| `src` / `campaign` / UTM | **2.4%** tagged (17,458 of 17,883 null) | Can't attribute, segment, or A/B emails — another acquisition blind spot (problem #2) |
| `bucket` (love/money/purpose) | **~0%** | Evelyn's opener is never personalized; everyone gets the generic line |
| `email` / magic `token` | **0%** | Warm subscribers resolve to **anonymous `brand_new`** and see the cold "I'm Evelyn…" opener instead of being greeted as returning |

Directional signal that tagging/targeting helps: the few tagged campaigns out-convert the untagged bulk — `seerwithinfree` **3.3%** signup and several `day*` tarot campaigns **1.5–9%**, vs **1.2%** untagged (small N).

**Fixes (the email's job, distinct from the lander's):**
1. **Audit the email** — does the subject/creative/segment match what the lander actually delivers (an open chat box)? A gap between "your reading is ready" and "type something to a stranger" would explain the 17.5%.
2. **Tag every link** — `?src=aweber&campaign=<email-id>&utm_*` so emails can be attributed and A/B'd.
3. **Pass `bucket`** — so Evelyn opens on the reader's topic (the backend already supports `bucket`).
4. **Pass `email` or a magic `token`** — so warm subscribers are recognized (greeted by name / as returning), not treated as cold strangers. The lander's `v2_password` / `token_magic` segments already exist for exactly this.

### 3.10 The payment / checkout step — where would-be buyers are lost (app-DB)

> 🚩 **Flagged for the dev team** (action box at the end of this section). This is *downstream* of the lander (problem #1) and compounds with it: even when a user decides to buy, checkout loses most of them.

Problem #4 isn't only "do free users try to buy" — **they do** (1,782 users started a checkout in 90d), but most fail at payment. A `pending` `credit_purchases` row is created at checkout start and flipped to `completed` on success, so a stale `pending` row = an abandoned checkout.

**Checkout completion by rail (90d):**

| Rail | Completed | Abandoned (stale pending) | Completion |
|------|----------:|--------------------------:|-----------:|
| **PayPal** (default + ~82% of volume) | 1,376 | 1,665 | **45.2%** |
| Stripe card | 308 | 252 | 55.0% |

- **User-level: 1,782 users started a checkout, only 713 completed one → ~60% never complete a purchase.** All-time: 3,876 attempts, 1,713 completed (44%). Pending rows are cleaned up on some failure paths, so true abandonment is *at least* this bad.
- **PayPal is the default, the dominant rail, *and* the leakiest.** Closing the PayPal→card completion gap alone ≈ **+300 completed purchases/90d** (~20% more buyers from the same traffic).

**Likely causes (from `PaymentModal.tsx`):**
- Defaults to **PayPal** (`:26`) — the highest-friction rail (login/popup), worst for mobile impulse buys.
- **No Apple Pay / Google Pay** express wallets — only PayPal + manual card entry.
- PayPal capture depends entirely on the client `onApprove → /capture-order` call (`:135`); per §2 the **PayPal webhook backstop never fires**, so an approved-but-interrupted payment can be stuck `pending` — possibly **paid but not credited**.

**Instrumentation gap (ties to problem #2):** PostHog logs only **569 of 1,684** real completions (~34%), and its modal-open / initiate counts don't reconcile with the DB — so the **modal-open → click-pay → complete funnel is not measurable** until purchase-event firing is fixed. Only order→complete is measurable, from the DB.

> 🚩 **For the dev team to look at:**
> 1. **Add Apple Pay / Google Pay** express buttons to the payment modal (biggest mobile lever).
> 2. **Re-test the PayPal default** — it's the leakiest rail (45% vs card 55%) yet the default.
> 3. **Make PayPal capture robust** — get the webhook backstop actually firing so approved-but-interrupted payments still complete; **audit for paid-but-stuck `pending` orders** (users who paid but weren't credited).
> 4. **Fix purchase-event firing** so the checkout funnel becomes measurable (feeds problem #2).

**Method:** `credit_purchases` status × rail + user-level completion (90d); PostHog `checkout_view_logged` / `checkout_initiated` / completion events for the reconciliation check. Scripts in the session scratchpad.

### 3.11 The real weak link: the offer is a coin store, not an outcome (conversion, not mechanics)

> 🚩 **For the dev / product team.** The checkout *mechanics* (§3.10) lose buyers, but the bigger lever is *upstream*: **how the offer is framed.** At the moment of decision the app sells an **abstract currency — "coins" — via a multi-package price grid**, not the outcome the user actually wants.

What the user sees at the buy moment (`CreditsPage.tsx` and the in-chat `BuyCreditsModal`):
- Balance and offer denominated in **coins** ("X coins", "60 coins = 1 minute", "+Y extra coins", "~N min") — a currency they must *learn and convert* before they can value it.
- A **multi-tier package grid** (starter / popular / best-value / premium) → a comparison/optimization decision ("which package? how many minutes do I need?") exactly when they should be saying yes.
- A **"Buy Coins"** CTA / "Get More Coins" link — selling the currency, not the reading.
- Generic promo ("Get bonus coins on every package"), not tied to what they were just exploring with the persona.

**Why this is the weak link:**
- **Abstraction tax** — desire ("does he still love me?") must be converted into coins → minutes → package math → price. Every step is friction and emotional cooling.
- **Choice overload** — N packages invite deferral; the strongest impulse offers are a single confident yes/no.
- **Breaks the spell** — a user emotionally mid-reading is handed a commodity coin-store UI; the reading's momentum (the real conversion energy) dissipates into unit math.
- **No outcome anchoring** — it sells "coins," not "keep going with [persona] about [their question]" — the opposite of the V1 funnel, which sold a specific reading outcome.

**Stronger conversion (dev / product):**
- **Sell the outcome / continuation, not coins** — "Keep going with Evelyn" anchored to the topic they raised, in the persona's voice, at the emotional peak.
- **One confident default offer** (yes/no) instead of a 4-package grid; **hide the currency mechanic** (sell "minutes" / "a session" / "continue", or a flat time-pass / subscription).
- **Contextual, in-the-moment** paywall framed as continuing the conversation — not a trip to a coin store.
- This is an **A/B-able offer-design** problem, distinct from (and upstream of) the §3.10 payment-rail fixes.

### 3.12 Proposed fix — paywall copy rewrite (coins kept) + wireframe

> **Decision:** keep the coins / minutes / live-meter credit system (it's proven — Nebula) and fix the **communication**, not the model. Five copy agents (benefit-led · Evelyn's voice · value/anchoring · momentum · trust) were synthesized into a rewrite. Full copy set, before→after table, store-page + banner wireframes, and A/B priority live in **`docs/evelyn-paywall-copy-rewrite.md`**.

**Highest-impact copy changes:**
- Kill the fear words at the buy moment: `"Your Credits Have Run Out"` → **"Let's pick this back up."**; delete `"One-time payment is non-refundable."`
- Resolve the refund contradiction (modal "non-refundable" vs store footer "30-day goodwill refund") → one line everywhere: **"30-day money-back guarantee on unused coins — no questions asked."**
- **Lead with minutes**, not coins; honest value (chat-only — *no* phone/in-person anchor): bonus minutes free, per-minute drops to $1.33, **"idle time is free."**
- **Structural:** fix the default tier — code pre-selects the $99.99 whale (`BuyCreditsModal.tsx:41`); default the mid **1,800 / $49.99 "MOST CHOSEN"** tile. Fire the low-balance banner ~90s out (not ~60s).

**Low-balance banner (fires before zero, in-chat):**

```
┌────────────────────────────────────────────────────────────┐
│  ◔  About a minute left with Evelyn — keep the thread open.  │
│                                            [  Keep going →  ] │
└────────────────────────────────────────────────────────────┘
```

**Hero — the in-chat paywall (mobile-first):**

```
┌────────────────────────────────────┐
│                              [ ✕ ]  │
│           ( Evelyn avatar )         │
│        Let's pick this back up.     │  ← was "Your Credits Have Run Out"
│    You & Evelyn were mid-thread —   │  ← continuity / "nothing's lost"
│    add a few minutes and pick up    │
│    right where you left off.        │
│                                     │
│  ┌───────────┐    ┌───────────┐     │
│  │   9 min   │    │  15 min   │     │
│  │  $19.99   │    │  $29.99   │     │
│  │ +3 free   │    │ +6 free   │     │
│  └───────────┘    └───────────┘     │
│  ┌───────────┐    ┌───────────┐     │
│  │★MOST CHOSEN│   │ BEST VALUE │    │
│  │   30 min  │    │   75 min  │     │
│  │  $49.99 ✓ │    │  $99.99   │     │
│  │ +13 free  │    │ +41 free  │     │
│  └───────────┘    └───────────┘     │
│   Bigger packs cost less per min    │  ← value ladder, ONE line (not per-tile)
│   — as low as $1.33/min.            │
│                                     │
│   Adding 30 min  (1,800 coins)      │  ← coins shown on commit (transparency)
│  ┌─────────────────────────────┐    │
│  │   Keep going with Evelyn     │    │  ← was "Buy Coins"; mirrors selection
│  │           $49.99             │    │
│  └─────────────────────────────┘    │
│       PayPal    ·    Card           │
│                                     │
│  🛡 30-day money-back guarantee ·   │  ← single refund line (kills contradiction)
│     one-time, no subscription.      │
│  Idle time is always free.          │  ← real feature; chat-appropriate value
└────────────────────────────────────┘
```

> Ethics guardrails: every claim is true in the data (thread saved, resume replays last 4 msgs, meter real, idle free); no fake countdowns/scarcity; "for guidance" + tendencies-not-promises preserved. Publish the guarantee / "no auto-renew" lines only if the backend actually honors them.

### 3.13 How to split-test the rewrite (rollout plan)

> No general feature-flag system exists. The only in-house A/B is `persona_prompts` (`promptManager.ts:256`) — but it's **per-call `Math.random()`, not sticky per user**, so do **not** reuse it for a paywall (a user would see different copy each time). Build a sticky test instead.

**Three gotchas specific to this app:**
1. **Measure from the DB, not PostHog** — PostHog logs only ~34% of completions (§3.10); use `credit_purchases` as source of truth.
2. **Sticky per-user assignment** — hash `user.id` so a user always sees the same variant. (The paywall is post-login → clean `user.id`, no §1 identity-stitching problem.)
3. **Test the whole bundle, not each string** — at ~50 modal-opens/day there isn't traffic to isolate individual strings.

**Assignment (no new dependency) — deterministic + sticky:**
```
variant = sha256(user.id + "paywall_copy_2026")[0] % 100 < 50 ? "B" : "A"
```
Compute server-side; return from `/api/credits/pricing` (already called by CreditsPage); thread into `BuyCreditsModal`. The client renders copy A/B + the default-tier from it and **never rolls its own random**. (A PostHog feature flag could do assignment instead — but still measure from the DB.)

**Measurement:** extend the existing `/api/credits/checkout-view` to write a `paywall_views` row `{user_id, variant, persona_id, is_out_of_credits, created_at}` → a reliable **denominator**. Numerator = those users with a completed `credit_purchases` row after the view.

```sql
WITH views AS (   -- first paywall view per user during the test
  SELECT user_id, min(variant) AS variant, min(created_at) AS first_view
  FROM paywall_views WHERE created_at >= :start GROUP BY user_id)
SELECT v.variant,
       count(*) AS viewers,
       count(*) FILTER (WHERE EXISTS (
         SELECT 1 FROM credit_purchases cp
          WHERE cp.user_id = v.user_id AND cp.status='completed'
            AND cp.created_at >= v.first_view)) AS buyers
FROM views v GROUP BY v.variant;   -- conversion = buyers / viewers
```

**Primary metric:** paywall-view → first-purchase conversion, by variant.
**Guardrails:** revenue per viewer (don't "win" by pushing the cheap tier) · ARPPU / tier-mix (the mid-tier default shifts it) · refund/chargeback rate (the guarantee line can raise refunds) · checkout-completion % (keep the §3.10 plumbing constant).

**Power & duration:** baseline view→purchase ~15–20%; detecting ~16%→20% at 80% power ≈ **~1,500 viewers/arm** → at ~25/arm/day ≈ **~6 weeks**. Pre-register N + the primary metric; **no peeking / early-stop.**

**Ship vs. test:**
- **A/B:** rewrite bundle (B) vs current (A), 50/50.
- The **$99.99 whale-default** (`BuyCreditsModal.tsx:41`) is a **bug**, not a hypothesis — fold into B (it shifts revenue mix, so measure it) or just fix for everyone. Banner timing (~90s) is low-risk → ship to all.
- **Hold checkout plumbing constant** (no Apple Pay / PayPal-default change) during the copy test or it confounds the result — run that as a separate later experiment.

**Build checklist:**
- [ ] `paywallVariant(userId)` helper (deterministic hash → 'A'|'B')
- [ ] Return `variant` from `/api/credits/pricing`; thread into CreditsPage + BuyCreditsModal; render copy A/B + default-tier
- [ ] `paywall_views` table; extend `/api/credits/checkout-view` to insert the row
- [ ] All B copy behind the variant (strings from §3.12 · `docs/evelyn-paywall-copy-rewrite.md`)
- [ ] Pre-register N + primary metric; run the analysis query above

### 3.14 Build spec + acceptance criteria (enough for a one-pass build)

Resolves the ambiguities in §3.12–3.13 so an implementer doesn't have to guess.

**A. Arm definition (pin exactly what's in each arm):**
- **Arm A (control)** = today's experience verbatim, *including* the current default-tier behavior (`findLast(t => t.badge)` → $99.99 whale).
- **Arm B (variant)** = all rewritten copy (§3.12 / `docs/evelyn-paywall-copy-rewrite.md`) **+** the mid-tier (`1,800 / $49.99`) default. (Bundled on purpose — at this volume we test the bundle, not each string.)
- **Global to BOTH arms (not part of the contrast):** the low-balance **banner timing** change (~90s). Ship it to everyone so it doesn't shift the paywall-view denominator between arms. *(Banner copy* is variant-gated; banner *timing* is global.)

**B. Data contract.**

*New table* (`shared/schema.ts`):
```ts
export const paywallViews = pgTable("paywall_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  experimentKey: text("experiment_key").notNull().default("paywall_copy_2026"),
  variant: text("variant").notNull(),                 // 'A' | 'B'
  surface: text("surface").notNull(),                 // 'buy_credits_modal' | 'credits_page' | 'payment_modal'
  personaId: varchar("persona_id").references(() => personas.id, { onDelete: "set null" }),
  isOutOfCredits: boolean("is_out_of_credits").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("idx_paywall_views_user_created").on(t.userId, t.createdAt),
  index("idx_paywall_views_exp_variant").on(t.experimentKey, t.variant),
]);
```
*Pricing response* (`GET /api/credits/pricing`): add `variant: 'A'|'B'` and `experimentKey`; add `recommended?: boolean` to the `PricingTier` shape (server marks the 1,800 tier recommended). Client default-tile logic: `variant === 'B' ? tiers.find(t => t.recommended) : tiers.findLast(t => t.badge)` — and apply the same to `BuyCreditsModal`'s hardcoded `FALLBACK_TIERS`.
*Copy source of truth*: a single `client/src/lib/paywallCopy.ts` exporting `paywallCopy(variant)` → all strings keyed by surface (header out-of-credits/low, subhead, banner, rate line, refund line, trust lines, CTA). Every component reads from it; no inline strings.

**C. Assignment + kill-switch** (`server/lib/experiments.ts`):
```ts
paywallVariant(userId): 'A'|'B'  // bucket = parseInt(sha256(userId+experimentKey).slice(0,8),16) % 100
```
Gated by `system_config` key `paywall_copy_experiment` = `{ enabled: boolean, percentB: number }`. Disabled → everyone `'A'`. Enabled → `bucket < percentB ? 'B' : 'A'`. Computed server-side in `/pricing` **and** `/checkout-view` (same helper); the client only ever *receives* the variant. Ramp `percentB` 0→50; set 0 (or `enabled:false`) to kill instantly.

**D. Cohort + attribution (so the metric is unambiguous):**
- **Cohort** = users whose **first** `paywall_views` row for `experiment_key='paywall_copy_2026'` falls in the test window (first in-test exposure).
- **Conversion** = that user has a `credit_purchases` row, `status='completed'`, with `created_at` within **7 days** of their first in-test view.
- Dedup to first view per user (the §3.13 query already does). One `paywall_views` row per modal open is fine.

**E. Surfaces to variant-gate (all of them):**
- `BuyCreditsModal.tsx` — both header states (out-of-credits + "Get More Coins"), tiles, rate line, **refund line ("non-refundable" → guarantee)**, CTA, default tile.
- `CreditsPage.tsx` — balance copy, promo/hero, section header, "Buy Coins" CTA, rate line, **footer refund line**.
- `PaymentModal.tsx` — "Guaranteed secure payments" block → encryption/privacy + the single guarantee line.
- `ChatServicePage.tsx` — low-balance + free-trial banner **copy** (timing is global, per A).

**F. Test/QA override:** in non-prod (or behind an admin/test header), accept `?paywallVariant=A|B` to force the arm, bypassing the hash. Must be inert in prod for real users.

**Acceptance criteria (Definition of Done):**
- [ ] Variant is deterministic, sticky per `user.id`, ~50/50 over many ids; gated by `system_config`; kill-switch flips everyone to A.
- [ ] All surfaces in (E) render A vs B correctly; **"non-refundable" appears nowhere in B**; the single guarantee line is identical on modal + store + payment modal; B pre-selects the 1,800/$49.99 tile and the CTA price mirrors it.
- [ ] Exactly one `paywall_views` row per modal open with correct `{user_id, variant, surface, persona_id, is_out_of_credits}`.
- [ ] The §3.13 analysis query returns the correct conversion on seeded data (incl. the 7-day window + first-view dedup).
- [ ] Checkout completes under **both** variants (Stripe/PayPal sandbox); coins granted; reading resumes.
- [ ] Test cases (Layers 1–7) added to `docs/test-ideas.md` and passing; existing checkout tests still green.

### 3.15 Build status & deliverables (as of 2026-06-27)

The paywall **redesign is built and reviewable** — but **preview-only**; the **live paywall is unchanged**. Decision: validate on **Evelyn Cross via A/B first, then roll the winner out** to the rest of the roster.

**✅ Delivered (preview-only — nothing live changed):**

| Deliverable | Location |
|---|---|
| Copy source of truth (variant A/B), minutes math, `defaultTier()`, `applyBVariantBadges()` | `client/src/components/paywall/paywallCopy.ts` |
| In-chat paywall — Wireframe B (hero) — compacted to **~567px so the full card fits iPhone SE with no scroll** | `client/src/components/paywall/PaywallCard.tsx` |
| Low-balance + free-trial banner — Wireframe A | `client/src/components/paywall/LowBalanceBanner.tsx` |
| Credits store page — Wireframe C | `client/src/components/paywall/CreditsStoreView.tsx` |
| Payment sheet — single refund line, encryption/no-subscription trust | `client/src/components/paywall/PaymentSheetView.tsx` |
| **Dev demo route** (gated by `import.meta.env.DEV`) — persona picker pulls the real roster + per-persona pricing + avatars from public `GET /api/personas` / `GET /api/personas/:slug` | `client/src/pages/PaywallPreviewPage.tsx` → **`/paywall-preview`** |

- **Persona-generic + DB-wired:** name, portrait and pricing swap per persona automatically (verified across all 6). Pricing is identical across personas today (all resolve to default tiers); it diverges automatically if any persona gets `customPricing`.
- **Monday dev demo:** walk the team through all four surfaces + the persona switcher at **`http://localhost:5000/paywall-preview`** (`?surface=modal|store|banner|payment`, `?slug=<persona>`, `?variant=A|B`). Dev-only — never ships to prod.

**✅ Integrated into live — behind a DISABLED flag (2026-06-28).** The redesign is now wired into the live surfaces. **Live behaviour is unchanged**: the experiment is off, so every user resolves to variant A (today's UI, byte-identical). What shipped:
- **Server:** `server/lib/experiments.ts` — `paywallVariant()` (sticky sha256 bucket, gated by `system_config.paywall_copy_experiment`, Phase-1 persona-scoped) + non-prod `?paywallVariant=A|B` QA override. `GET /api/credits/pricing` now returns `variant`, `experimentKey`, `persona`, and variant-shaped `tiers` (B re-badged via the shared `applyBVariantBadges` in `shared/paywall.ts`; A untouched). `POST /api/credits/checkout-view` logs a `paywall_views` row with the server-authoritative variant.
- **DB:** `paywall_views` table + indexes created (additive, idempotent: `server/scripts/migratePaywall.ts`). A **disabled** `paywall_copy_experiment` config row was seeded (Evelyn-scoped, `enabled:false, percentB:50`).
- **Client:** `BuyCreditsModal`, `CreditsPage`, `PaymentModal`, and the `ChatServicePage` refill banner each branch to the redesign only when `variant==='B'`; variant A renders the existing markup verbatim. Variant is read from `GET /api/credits/pricing`.

**▶️ How to START the test (one switch, no deploy):** set the `paywall_copy_experiment` row's `config_value` to `{"enabled":true,"percentB":50,"personaId":"7f03b55e-9a35-4bb7-ac80-a5dff7228910"}`. Stop instantly with `enabled:false`; ramp via `percentB` (0→50). Server caches the config ~30s.

**🔎 How to QA without enabling:** in non-prod, append `?paywallVariant=B` (e.g. `/credits?personaId=<id>&paywallVariant=B`, or `/reading?...&paywallVariant=B`). Inert for real prod users.

**✅ Tested (this session):** TypeScript clean (no new errors vs. the 48-error baseline). New `tests/paywall-experiment.spec.ts` — **4/4 pass**: A renders the current store; B renders the redesigned minutes-led store; B payment sheet opens with the single-guarantee trust block (and "non-refundable" appears nowhere); dev preview renders. Authenticated E2E confirmed A↔B on the live `/credits` page and the B payment sheet mounting the real PayPal/Stripe slots — no console errors.
> ⚠️ `tests/credits.spec.ts` has **4 PRE-EXISTING failures** (stale assertions: old `$15 / "15 Minutes" / "3 minutes remaining"` pricing + a slug-not-UUID personaId) — unrelated to this work (variant A is byte-identical). Update them to current coin pricing in a follow-up.

**⚠️ One global change deliberately NOT shipped — needs sign-off:** the ~90s low-balance banner timing (§3.14.A) sits OUTSIDE the variant gate (affects all users), so it was left at ~60s to keep live byte-identical overnight. To adopt: `ChatServicePage.tsx` low-balance check `cpm * 1` → `cpm * 1.5` (optionally free-trial banner 30s→45s). Banner *copy* is already variant-gated (B-only).

**📅 Phased rollout:**
- **Phase 1 — Evelyn Cross only.** Enroll **only** sessions whose active persona is Evelyn (`personaId = 7f03b55e-9a35-4bb7-ac80-a5dff7228910`); every other persona stays on variant A. Run B vs A 50/50, sticky per-`user.id`, measured from `credit_purchases` (not PostHog) per §3.13 — baseline ~15–20% view→purchase, ~1,500 viewers/arm ≈ **~6 weeks**, no peeking. **Ready to start via the switch above.**
- **Phase 2 — roll the winner out to the other 5 personas.** No new design work (components are already persona-generic + DB-wired): widen `personaId` (or clear it) in the config, or run lightweight per-persona confirmation tests.

---

## 4. Why the PostHog funnel UI showed misleading numbers (history)

The "Evelyn Lander Funnel 2" investigation produced several confusing numbers — all explained:

- **Purchase step = 0** → used `purchase_completed`, which is the soulmate/V1 email-keyed event, never reached by V2 chat-service buyers.
- **Combined Action = 41** → the PostHog Action accidentally kept a default **Pageview/Autocapture match group**, so it matched ~everyone. Real number after removing it: small.
- **Stripe event alone = 0, but PayPal = 2–3** → this cohort bought via PayPal, not card.
- **`lander_view → chat_session_started` collapsed to ~0** → the identity-space boundary (Section 1) — anonymous lander person never stitched to `user.id`.
- **Funnel "2" vs. global purchases** → a funnel step is a *cohort + ordered + windowed* count, **not** a total. Use Trends/SQL for totals.

---

## 5. HogQL queries used (for reproducibility)

```sql
-- Total purchases by method + Evelyn attribution (last 7 days)
SELECT event,
       count() AS purchases,
       count(DISTINCT person_id) AS buyers,
       countIf(person.properties.signup_funnel = 'evelyn') AS evelyn_purchases
FROM events
WHERE event IN ('credit_purchase_completed','paypal_purchase_completed')
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY event;
```

```sql
-- PayPal sales by persona (names joined from chat_session_started)
SELECT coalesce(pn.persona_name,'unknown') AS persona,
       p.persona_id AS persona_id,
       count() AS purchases,
       count(DISTINCT p.person_id) AS buyers,
       round(sum(toFloat(p.price_usd_cents))/100, 2) AS revenue_usd
FROM (SELECT person_id, properties.persona_id AS persona_id, properties.price_usd_cents AS price_usd_cents
      FROM events
      WHERE event='paypal_purchase_completed' AND timestamp >= now() - INTERVAL 7 DAY) AS p
LEFT JOIN (SELECT properties.persona_id AS persona_id, any(properties.persona_name) AS persona_name
           FROM events
           WHERE event='chat_session_started' AND timestamp >= now() - INTERVAL 120 DAY
           GROUP BY properties.persona_id) AS pn
  ON p.persona_id = pn.persona_id
GROUP BY persona, persona_id
ORDER BY purchases DESC;
```

```sql
-- Acquisition blind-spot check: any client events for Evelyn-persona PayPal buyers?
SELECT count(DISTINCT person_id) AS buyers_with_client_events
FROM events
WHERE person_id IN (
    SELECT DISTINCT person_id FROM events
    WHERE event='paypal_purchase_completed'
      AND properties.persona_id = '7f03b55e-9a35-4bb7-ac80-a5dff7228910'
      AND timestamp >= now() - INTERVAL 7 DAY)
  AND event IN ('lander_view','lander_cta_clicked')   -- $pageview not in taxonomy
  AND timestamp >= now() - INTERVAL 180 DAY;
-- result: 0
```

Persona ID reference: Evelyn Cross `7f03b55e-9a35-4bb7-ac80-a5dff7228910`, Aiden Powers `c61251d8-58eb-4c8c-b271-a2a68b41e497`, Marcus Stone `44da9f79-fd7a-4f73-af9d-43dcc376711b`, Maren Soleil `1e230887-a5ac-46a1-ae35-8fc0c82960f9`, Luna Voss `d24a870f-7a1c-4675-965c-f6035f3f07b5`.

---

## 6. Recommendations (NOT implemented)

Listed for later decision — none of these have been applied.

**The four problems to solve (priority framing):**
1. **`/evelyn` lander barely converts** — ~17.9k warm-AWeber sessions/90d → 223 registrations → 3 buyers (§3.7). Leaks, by leverage: (a) **top-of-funnel bounce** — only 17.5% even send a message (the open chat box; Aiden's tap-quiz engages **84.6%** — §3.8); (b) **registration cliff** — only 9.9% of CTA-clickers finish signup; (c) verification gate — 41% of signups never verify → 0 free minutes. **Top action: port the Aiden tap-quiz mechanic to `/evelyn`** + grant free minutes at signup.
2. **Instrumentation is broken two ways** — (a) no `identify()` on auth → can't see *where* the funnel leaks; (b) no pageview/UTM → can't see *where revenue comes from* (~88% unattributed). Recs 1–3.
3. **Resend attribution is broken & under-measured** — the Evelyn nurture-drip's open/click tracking is silently dead, and Resend drives *at most* ~26% of Evelyn purchases (mostly top-up reorders, §3.6). Rec 6.
4. **Free→paid monetization is weak — the weakest link is the *offer*, not the plumbing (🚩 dev flag, §3.11 + §3.10).** At the buy moment the app sells an **abstract currency** — a multi-package "coins" grid with a "Buy Coins" CTA — instead of the outcome the user wants (continuing the reading). That weak offer is the prime suspect for low free→paid conversion (even the winning Aiden lander monetizes only ~2% of signups; Evelyn ~1.35%). *Then*, of users who do start a checkout, **~60% never complete** (PayPal 45% vs card 55%; no Apple/Google Pay; approved-but-interrupted PayPal payments can be stuck `pending`/uncredited). Both compound with problem #1.

1. **Stitch identity on auth** — call `identify(user.id)` client-side when a user authenticates (the `identifyUser` wrapper already exists in `client/src/lib/posthog.ts` but is never called on the Evelyn lander). Makes the full `lander_view → … → purchase` funnel connect for future sessions. *(This was drafted then reverted.)*
2. **Close the acquisition blind spot** — enable pageview + UTM capture in `posthog.ts` (turn on `capture_pageview`, or track pageviews on route changes). Without it, ~88% of revenue has no source attribution.
3. **Fix the purchase funnel step** — use a combined Action of `credit_purchase_completed` + `paypal_purchase_completed` (and remove any stray Pageview/Autocapture match group). Never use `purchase_completed` for the V2 chat service.
4. **Investigate the `/evelyn` lander conversion** — it's well-tracked but converts ~3 buyers/week. Worth a UX/offer review (and the identity fix will reveal where in landed→clicked→signup→buy people drop).
5. **Pending analyses** — split Stripe (`credit_purchase_completed`) by persona; 30-day revenue-by-persona to see if this week is typical; check Meta Ads / Kit for where the untracked Evelyn-persona traffic originates.
6. **Fix the Resend drip tracking bug (problem #3)** — `server/routes/webhooks.ts` updates open/click/bounce for 5 email tables but skips `evelynFollowupEmails`. Add an `evelynFollowupEmails` lookup-by-`resendEmailId` block mirroring the existing `topupEmails` case so Evelyn's #1 conversion sequence stops being blind. Until fixed, treat all `evelyn_followup_emails` engagement as **missing (not zero)**, and the ~26% Resend figure as an **upper bound**. (~10-line change; no schema change — `evelyn_followup_emails` already has `opened_at`/`clicked_at` columns.)

---

## 7. Caveats

- **Person-on-events mode** is enabled: `person.properties.*` reflect values **at event-ingest time**, not current.
- `signup_funnel` is only set at registration for evelyn/aiden/standard flows; older users have `None`.
- Numbers are a **trailing-7-day snapshot** as of 2026-06-26 (PDT); the current day is partial.
- Persona-name mapping relies on `chat_session_started`; a persona with sales but no chat sessions in the lookback window would show as `unknown`.
- "Evelyn-attributed = 3" counts users who **registered** via `/evelyn`. The count of users who **landed** on `/evelyn` (`lander_view`) is separate and larger — not yet pulled here.
