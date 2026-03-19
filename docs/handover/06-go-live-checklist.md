# Go-Live Checklist

Run through every item in order before switching traffic to the production server.

Mark each item done as you go. Do not skip items — each one has caught a real problem.

---

## Part 1: Server is running

- [ ] Server starts with `npm run start` without errors
- [ ] Health check returns healthy: `GET https://theseerwithin.com/api/health`
- [ ] No errors in server logs on startup

---

## Part 2: Environment variables

- [ ] `NODE_ENV=production` is set
- [ ] `BASE_URL=https://theseerwithin.com` (no trailing slash, with https)
- [ ] `JWT_SECRET` is a long random string (not the default placeholder)
- [ ] `DATABASE_URL` points to production Supabase instance
- [ ] `ANTHROPIC_API_KEY` is valid (test: visit any /reading page, guide should respond)
- [ ] `PAYPAL_MODE=live` (not sandbox)
- [ ] `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are live credentials
- [ ] `VITE_PAYPAL_CLIENT_ID` matches `PAYPAL_CLIENT_ID`
- [ ] `STRIPE_SECRET_KEY=sk_live_...` (not `sk_test_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` matches the live Stripe webhook signing secret
- [ ] `STRIPE_CREDITS_WEBHOOK_SECRET` matches the second live webhook signing secret
- [ ] `STRIPE_PRICE_ID_15MIN` and `STRIPE_PRICE_ID_30MIN` are live Stripe price IDs
- [ ] `RESEND_API_KEY` is valid
- [ ] `FOLLOW_UP_FROM_EMAIL=hi@theseerwithin.com`
- [ ] `FOLLOW_UP_FROM_NAME=The Seer Within`
- [ ] `CRON_TIMEZONE=America/New_York` (or correct timezone)

---

## Part 3: Database

- [ ] `npm run db:push` completed successfully on production database
- [ ] `npm run seed` completed successfully (created admin user and personas)
- [ ] Log in to admin panel — can you see the personas list?
- [ ] Check users table is empty (no test data leaked in)

---

## Part 4: Admin panel

- [ ] Can log in at `/admin/login`
- [ ] **CHANGE ADMIN PASSWORD** — current default is `ChangeMe123!` — change it immediately
  - Log in → (find profile/settings or update directly in database)
  - New password should be at least 16 characters with mixed case, numbers, symbols
  - Record it in your password manager
- [ ] Guides are visible in `/admin/personas`
- [ ] Each guide has a system prompt set
- [ ] Users list shows no unexpected test accounts

---

## Part 5: Stripe payments

- [ ] Stripe webhook endpoint configured: `https://theseerwithin.com/api/webhooks/stripe`
- [ ] Webhook events selected: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] Stripe webhook signing secret copied to `STRIPE_WEBHOOK_SECRET` in `.env`
- [ ] Test a real purchase with a real card (you can refund immediately after)
- [ ] Verify coins appear in the user's balance after purchase
- [ ] Verify the `credit_purchases` table has a record with `status = 'completed'`

---

## Part 6: PayPal payments

- [ ] `PAYPAL_MODE=live` in `.env`
- [ ] Live PayPal credentials set (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`)
- [ ] PayPal buttons appear on `/credits` page
- [ ] Test a real PayPal purchase (small amount — can refund)
- [ ] Verify coins appear in user balance after PayPal purchase

---

## Part 7: Email system (Resend)

- [ ] Domain `theseerwithin.com` verified in Resend dashboard (green checkmark)
- [ ] DNS records added at your DNS provider (DKIM + SPF)
- [ ] Test a follow-up email manually: Admin panel → Follow-ups → Trigger
- [ ] Check the email arrives and renders correctly in Gmail, Outlook, Apple Mail
- [ ] Magic link in the email works (click it — should auto-log in and go to the right guide)
- [ ] Unsubscribe link works (click it — should prevent future emails for that user)
- [ ] `FROM` name and address show correctly (e.g. "Evelyn Cross" `evelyn@theseerwithin.com`)

---

## Part 8: System 1 — Conversion Funnel

- [ ] Landing page loads at `/`
- [ ] Evelyn Cross reads and responds in `/chat`
- [ ] Stripe checkout opens and completes
- [ ] After payment, `/welcome1` (Upsell 1) loads correctly
- [ ] After Upsell 1, `/welcome2` (Upsell 2) loads correctly
- [ ] `/success` page loads
- [ ] Shipping address collection works on the upsell pages

---

## Part 9: System 2 — Chat Service

- [ ] `/personas` loads and shows all active guides
- [ ] New user can register (try this with a fresh email address)
- [ ] Verification email arrives within 5 minutes
- [ ] After verification and login, user has 180 coins (3 free minutes)
- [ ] Clicking a guide opens the pre-reading screen
- [ ] Guide responds to the first message
- [ ] Timer starts when first message is sent
- [ ] Timer stops and session ends correctly
- [ ] Session feedback modal appears after sessions ≥ 5 minutes
- [ ] Credits page loads and shows purchase options
- [ ] Stripe credit purchase works (test with live card)
- [ ] PayPal credit purchase works (test with live PayPal)

---

## Part 10: Previously known bugs — verify still fixed

These bugs were fixed during development (see `05-remaining-todos.md`). Do a quick smoke-test to confirm they haven't regressed:

- [ ] BUG-1 fixed: "Start Chat" in Love & Recommended sections works without crashing
- [ ] BUG-2 fixed: Registration form shows "Min 8 characters" and accepts 8-char passwords
- [ ] BUG-3 fixed: Visiting `/reading?persona=marcus-stone` while logged out → after login, returns to Marcus Stone (not default guide)

---

## Part 11: Final checks

- [ ] Open the site in a private/incognito browser window (to test as a completely new visitor)
- [ ] Walk through the full new user journey: land → browse → register → verify → chat → buy credits
- [ ] Check the browser console for JavaScript errors (press F12 → Console tab)
- [ ] Check server logs for errors during the test session
- [ ] Test on mobile (or use browser mobile emulation mode)
- [ ] Confirm SSL certificate is valid (padlock icon in browser, no warnings)

---

## After going live

- [ ] Monitor server logs for the first hour
- [ ] Check admin analytics after the first real user sessions
- [ ] Verify the daily cron job runs (check follow-up email logs next day)
- [ ] Set up uptime monitoring (UptimeRobot or similar — point it to `/api/ready`)
