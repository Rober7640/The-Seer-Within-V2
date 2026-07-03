# Pending Tasks — Backlog (as of 2026-07-03)

Canonical pending-work tracker, reconciled from the PRD
[`docs/posthog-evelyn-purchase-findings.md`](./posthog-evelyn-purchase-findings.md)
("audit post hoc"), the 2026-07-03 boss meeting transcript, **and**
[`docs/tasks-mike-robert-2026-06-30.md`](./tasks-mike-robert-2026-06-30.md)
(Mike's handover — precise code pointers folded into P2/P3 below).

**19 code/product tasks pending + 1 external.** Update the checkboxes as items complete.

> ⚠️ **Obsolete — do NOT action:** Mike's Task A said to run `migrate:experiments` on prod
> and Start the `evelyn_lander_mechanic` (chatbox-vs-quiz) 50/50 test. That is **superseded** —
> the quiz **directly replaced** the chatbox (hard-pinned in `EvelynLanderPage.tsx`), so the
> `evelyn_lander_mechanic` experiment is **dead code** and starting it does nothing. Only the
> quiz-question review survives (task 2.2). Mike's "prod migrations still needed" note is also
> resolved (applied when the paywall A/B went live on prod).

> **North star:** close the revenue disconnect — ~$9k/day FB spend vs $400–1k/day backend.
> Root causes: (1) landing page, (2) paywall/payment, (3) V2 AI purchase-effectiveness.

---

## ✅ Done (do NOT re-open)

- Aiden **tap-quiz mechanic** ported to `/evelyn` + **inline name/email capture** (fixes the registration cliff)
- **Paywall redesign + copy rewrite + integration**, migrated to the experiments framework (`paywall_copy_2026`)
- **Paywall Phase-1 Evelyn A/B — STARTED / LIVE (2026-07-03)** _(= Mike Task B)_
- **iOS blank-card fix** (removed `display:none` on Stripe's `__stripeJSBridgeFrame`)
- **Universal `/credits` variant** resolution (works from the nav tab, not just persona URLs)
- **Mobile bottom-sheet** payment layout
- **fb-palm upsell → $47-only** _(= "lock in upsell 47"; owned by Lewis per Mike's doc)_
- **A/B dashboard** live on prod
- **Stripe backup account** (V1)
- Production deploy `f5630fd` + test-data cleanup

---

## ⏳ Pending

### P0 — do now / imminent
- [ ] **0.2 — Robust PayPal capture + audit paid-but-stuck `pending` orders** (webhook backstop). PayPal completes only ~45%; approved-but-interrupted payments can be stuck `pending`/uncredited. _Elevated from Mike's "checkout leaks — do after A–D" to P0 because of a live signal: a $99.99 `pending` row seen 2026-07-03. (PRD §3.10.)_

### P1 — highest-leverage revenue fixes
- [ ] **1.1 — Grant free minutes at *registration*, verify async.** Currently granted at `/verify-email` → 41% never verify → 0 minutes. _(PRD §3.7; confirmed in `server/routes/auth.ts`.)_
- [ ] **1.2 — Audit + fix the Evelyn AWeber email** (subject/creative/segment vs what the lander delivers; soft-sell → hard-sell). Warm email engages 17.5% vs Luna 40.5%. _(PRD §3.9; transcript.)_
- [ ] **1.3 — Tag every email link** (`?src=aweber&campaign=<id>&utm_*`) for attribution + A/B. _(PRD §3.9.)_
- [ ] **1.4 — Pass `bucket` + `email`/`token` into `/evelyn` links** so it opens on topic and recognizes warm subscribers. _(PRD §3.9.)_
- [ ] **1.5 — PostHog `identify(user.id)` on auth** (identity stitching). `identifyUser` exists in `client/src/lib/posthog.ts` but isn't called on the lander. _Owner: Lewis (PostHog cluster 1.5–1.7 owned by Lewis per Mike's doc). (PRD Rec 1.)_
- [ ] **1.6 — PostHog: enable pageview + UTM capture** (`capture_pageview` currently off). ~88% of revenue unattributed; also fixes "Rabow email read as /evelyn." _(PRD Rec 2.)_
- [ ] **1.7 — PostHog: fix purchase-funnel event** (combined card+PayPal action; never `purchase_completed` for V2). _(PRD Rec 3.)_

### P2 — important, next
- [ ] **2.1 — Resend webhook → update `evelynFollowupEmails`** (open/click). Confirmed dead: `server/routes/webhooks.ts:8` import lists `followUp/migration/topup/aiden/persona` email tables but **not `evelynFollowupEmails`**, so Evelyn's #1 drip records 0 opens/clicks. **Fix (Mike):** copy the `topupEmails` open/click block (`webhooks.ts` ~L177–222), swap the table name, and add `evelynFollowupEmails` to the L8 import; `evelyn_followup_emails.opened_at/clicked_at` already exist (no schema change). _Owner: Robert. (PRD §3.6; Mike Task D — verified 2026-07-03.)_
- [ ] **2.2 — Review/refine the 3 Evelyn quiz questions** in `client/src/lib/evelynQuizData.ts` (taps are engagement-only — safe to reword, no downstream signup/pricing impact). Prompt Claude against PRD §3.7/§3.8 to check they match real buyer behaviour + supported buckets. _Owner: Mike (approve wording), Robert (apply). (transcript; Mike Task A — quiz mechanic already live via direct replacement.)_
- [ ] **2.3 — Relax the anti-fraud IP block** (likely blocking real mobile/CGNAT buyers). The 4th account from one IP in 24h is hard-blocked. **Verified:** `fraudDetection.ts:11` `MAX_ACCOUNTS_PER_IP_24H` (default `3`, **already reads env**); enforced at `fraudDetection.ts:80/99`; block message at `auth.ts:466`. **Policy (Mike decides):** (1 rec) raise 3→~10 **and** change hard-block → flag-for-review; (2) raise to ~10, rely on Turnstile + email verify; (3) tune via the `MAX_ACCOUNTS_PER_IP_24H` env var. **💡 Quick win:** since it already reads env, raising the threshold is a **zero-code Railway env change today**; only block→flag needs code (`auth.ts` ~L466). Other layers already exist (Turnstile, NeverBounce, disposable-email blocklist). _Owner: Mike (policy) + Robert (edit). (transcript; Mike Task C — verified 2026-07-03.)_
- [ ] **2.4 — Add Apple Pay / Google Pay express buttons**; re-test PayPal-vs-card default. _(PRD §3.10.)_
- [ ] **2.5 — Investigate Stripe ~$50 sales failing** (near the $49.99 tier). _(transcript.)_
- [ ] **2.6 — In-product free→paid funnel report** (signup → chat → minutes exhausted → paywall shown → purchase). _(PRD §3.13.)_

### P3 — later / conditional
- [ ] **3.1 — Paywall Phase 2:** roll the A/B winner to the other 5 personas (widen `scope.personaId`). _(after Phase 1 concludes.)_
- [ ] **3.2 — Paywall v3:** explicit $/min ("$1.33/min"). _(A per-minute label already exists.)_
- [ ] **3.3 — 90s low-balance banner timing** — one-line change in `ChatServicePage.tsx`, needs sign-off. _(PRD §3.14.A.)_
- [ ] **3.4 — Templatize the quiz mechanic** to the other persona landers (traffic-gated; only Luna has volume). _(PRD Problem 1.)_
- [ ] **3.5 — Renumber PRDs by date** (01 = oldest → highest = latest). _(transcript.)_

### External / business (not our codebase)
- [ ] **Payments.AI eval for V1** (Yong call) → possible 50/50 Stripe-vs-Payments.AI routing → maybe adopt for V2. _(transcript.)_

### Monitoring (not a discrete build task)
- After P0–P2 land, if revenue is still flat → examine **cause #3: V2 AI purchase-encouragement effectiveness.**
- Run the 1–2 week landing + paywall test; watch A/B results in the dashboard; flag any code-level blockers.
