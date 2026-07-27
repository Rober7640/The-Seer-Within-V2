# 6/6 Promo — Manual Test Cases (staging)

A step-by-step test script anyone can run **without prior context**. Every step says exactly
what to do and exactly what you should see. If any "Expected" line does not happen, the case
**fails** — note the case ID and what you saw instead.

- **Staging URL:** `https://the-seer-within-v2-development.up.railway.app`
  (write it as `[STAGING]` below — e.g. `[STAGING]/6-6`)
- **Emails are real on staging.** Verification links and passwordless sign-in links actually
  arrive in your inbox, so use a real email you can open.
- Time budget: the full script is ~45–60 min. The ⭐ cases are the must-run core.

---

## 0. Background you need (read once — 2 min)

There are **two separate free-minute systems**. They do NOT replace each other:

| | **6-minute promo (NEW)** | **3-minute trial (EXISTING)** |
|---|---|---|
| Who gets it | Only people who go through **`/6-6`** | Everyone who signs up via any other page (`/`, `/fb`, `/fb2`, `/soulmate`, `/gdn`, `/aiden`, `/evelyn`) |
| How much | **6 min per guide** (360 coins each) | 3 min total (some landers give 5 or 10) |
| When granted | The moment you reach `/6-6` **logged in** | When you **verify your email** |
| Spent | **First** | After the promo runs out |
| Expires | **End of day, June 6** | Never |

**Key rule being tested:** the 6 minutes are given **only** on `/6-6`. No other page ever gives
them. Buyers (anyone who has paid before) never get them, even with the link.

---

## 1. Set up your test accounts (do this first)

You'll need four kinds of account. Here's how to make each on staging.
Tip: from one Gmail you can make many addresses using `+` — e.g. `you+promo1@gmail.com`,
`you+pwd1@gmail.com` all land in `you@gmail.com`.

| Type | How to create it |
|---|---|
| **A. Brand-new non-buyer** | Just use a fresh email the first time a case tells you to "sign up." |
| **B. Existing user WITH password** | Sign up once via `[STAGING]/login` → "Create an account", set a password, open the verification email, click it. Now this email is a password account. |
| **C. Passwordless user** | These are made by the funnel landers (they don't set a password). Easiest: open `[STAGING]/` (or `/evelyn`), go through until it asks for your email, submit your email. That email is now a **passwordless** account. (If unsure one exists, ask Lewis to confirm a user row has an empty `password_hash`.) |
| **D. Buyer** | A user who has completed a purchase. On staging this needs a test Stripe purchase — **ask Lewis to either run a test checkout or flag one existing user as a completed buyer** before running case D-1. |

Write your test emails here so you don't reuse them:
- New non-buyer: `__________________`
- Password user: `__________________`
- Passwordless user: `__________________`
- Buyer: `__________________`

---

## ⭐ SECTION A — Getting the 6 minutes on `/6-6` (all the ways in)

### A1 ⭐ — Brand-new person signs up from a guide card
**Goal:** a new visitor gets 6 min and lands in the chat.
1. Open `[STAGING]/6-6` in a fresh/incognito window (logged out).
2. **Expected (page):** green banner near the top reading **"6 FREE minutes with every guide"**.
   Each guide card shows **"· 6 mins free"** (NOT "3 mins free").
3. On any guide (e.g. Evelyn Cross), click **Start Chat**.
4. **Expected (popup):** a popup opens with that guide's photo and the line
   **"You get 6 FREE minutes to get started"** (it must say **6**, not 3).
5. In the popup fill **First name**, your **new email**, a **password** (min 8 chars), click
   **Create Account & Start Reading**.
6. **Expected:**
   - No "verify your email" wall stops you.
   - You are taken **into that guide's chat** — the URL becomes `[STAGING]/reading?persona=…`.
   - Top-right shows **360** coins in a **greyed/disabled** pill, with the note
     **"Timer starts when you send your first message."**
   - The left "Other Guides" list shows **🎁 6:00 FREE** on every guide.
- **Result:** ☐ Pass ☐ Fail — notes: __PASS__________________

### A2 ⭐ — Existing password user logs in from a guide card
**Setup:** account **B** (password user), logged out.
1. Open `[STAGING]/6-6`. Click **Start Chat** on a guide.
2. In the popup, click **"Already have an account? Sign in"**.
3. Enter account B's email + password → click **Sign In**.
4. **Expected:** you land **in that guide's chat** (`/reading?persona=…`), top-right shows
   **360** (disabled pill), sidebar shows 🎁 6:00 FREE.
- **Result:** ☐ Pass ☐ Fail — notes: ________PASS____________

### A3 ⭐ — Passwordless user (the one that showed a red error before)
**Setup:** account **C** (passwordless), logged out. Have that inbox open.
1. Open `[STAGING]/6-6`. Click **Start Chat** on a guide (e.g. Evelyn).
2. Click **"Already have an account? Sign in"**.
3. Enter account C's email and **any** password → click **Sign In**.
4. **Expected (this is the fix):** a **GREEN** "Check Your Email" panel appears saying
   **"We sent a sign-in link to <email>"**.
   - ❌ It must **NOT** be red, and must **NOT** show raw text like `400:` or `NO_PASSWORD`.
5. Open the email, click the **sign-in link** *on the same device/browser*.
6. **Expected:** you are logged in and taken **into the guide you picked in step 1** (their chat),
   with **360** in the disabled pill. (See E1 for the different-device case.)
- **Result:** ☐ Pass ☐ Fail — notes: ______PASS______________

### A4 ⭐ — Aiden card behaves like the others
**Goal:** Aiden no longer jumps to the quiz funnel on `/6-6`.
1. Open `[STAGING]/6-6` logged out. Scroll to **Aiden Powers**, click **Start Chat**.
2. **Expected:** the **account popup opens right there** (same as other guides). You must
   **NOT** be redirected to `[STAGING]/aiden` (the quiz page).
3. (Optional) finish signup with a fresh email → you land in **Aiden's** chat with 360.
- **Result:** ☐ Pass ☐ Fail — notes: ____PASS________________

### A5 — Top-right "Sign In" stays on the page
**Goal:** the header "Sign In" opens the popup instead of leaving `/6-6`.
1. Open `[STAGING]/6-6` logged out. Click **Sign In** in the **top-right header**.
2. **Expected:** the account **popup opens on `/6-6`** (URL stays `…/6-6`). You must **NOT**
   be taken to the `[STAGING]/login` page.
3. Sign in/up here with a fresh or existing non-buyer email.
4. **Expected:** you get the 6 min (🎁 6:00 FREE badges appear). *(This entry stays on `/6-6`
   rather than jumping into one chat, because you didn't pick a specific guide.)*
- **Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## ⭐ SECTION B — Using the minutes (the coins behave correctly)

### B1 ⭐ — 6 minutes show immediately, before any message
**Setup:** any account that just claimed (e.g. right after A1), sitting in a guide's chat.
1. Look at the top-right **before** typing anything.
2. **Expected:** it already shows **360** in a **greyed/disabled** pill (not blank, not 0),
   with "Timer starts when you send your first message."
- **Result:** ☐ Pass ☐ Fail — notes: _____PASS_______________

### B2 ⭐ — Promo is spent first and counts down
1. In the chat, **send a message** and let the guide reply; chat for ~1 minute.
2. **Expected:** the top-right pill turns **active (green)** and **counts down** from ~360
   (≈60 coins per minute). It is the **promo** being used.
- **Result:** ☐ Pass ☐ Fail — notes: ________PASS____________

### B3 — Each guide has its own 6 minutes
1. From the chat, use the left sidebar to **switch to a different guide**.
2. **Expected:** the new guide still shows a **full 6:00 / 360** — using one guide does **not**
   drain the others.
- **Result:** ☐ Pass ☐ Fail — notes: ______PASS______________

### B4 — Running out lands on the normal "buy more" wall
**Setup:** a promo account with **no other credits**. Keep chatting one guide past 6 minutes
(or ask Lewis to lower that guide's grant for a quick test).
1. **Expected:** when the 6 promo minutes hit 0, you get the normal **out-of-credits / buy more**
   screen — nothing crashes, no negative numbers.
- **Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## ⭐ SECTION C — Other funnels must be UNCHANGED (regression)

This proves the 6-min promo did **not** leak into the rest of the site.

### C1 ⭐ — `/personas` still shows the normal 3 minutes
1. Log in as a **non-promo** user (account **B**, who has never been to `/6-6` in this browser),
   open `[STAGING]/personas`.
2. **Expected:** guide cards show the normal **"3 mins free"** (or 5/10 on special guides) and
   **no green 🎁 promo badge**.
- **Result:** ☐ Pass ☐ Fail — notes: _______PASS_____________

### C2 ⭐ — Normal signup gets 3 minutes, not 6
1. In a fresh window, sign up via `[STAGING]/login` → "Create an account" → verify email.
2. **Expected:** after verifying you have **3 free minutes** (the usual), and **no** 6-min promo
   badge anywhere.
- **Result:** ☐ Pass ☐ Fail — notes: _________PASS___________

### C3 — The promo is never granted off `/6-6`
1. As a fresh non-buyer, log in through **`[STAGING]/login`** (NOT `/6-6`) → open `/personas`.
2. **Expected:** **no 6 minutes** appear. The promo only shows up if you enter through `/6-6`.
- **Result:** ☐ Pass ☐ Fail — notes: _________PASS___________

### C4 — Top-right "Sign In" is normal everywhere else
1. On `[STAGING]/personas` (logged out), click **Sign In** top-right.
2. **Expected:** it goes to the normal `[STAGING]/login` page (popup behavior is `/6-6`-only).
- **Result:** ☐ Pass ☐ Fail — notes: _________PASS___________

---

## SECTION D — Guard rails

### D1 ⭐ — Buyers are blocked
**Setup:** account **D** (a buyer — see section 1).
1. Open `[STAGING]/6-6`, sign in as the buyer.
2. **Expected:** **NO** 🎁 6:00 badges, **no** 360 coins granted. Their existing/paid balance
   is unchanged. (Buyers must never get the promo, even with the link.)
- **Result:** ☐ Pass ☐ Fail — notes: ____________________

### D2 — Can't claim twice (no stacking)
1. As a promo user, reload `[STAGING]/6-6` a few times, and revisit it after chatting.
2. **Expected:** the balance **never jumps back up** to 6:00 or higher — it only goes **down**
   as you use it.
- **Result:** ☐ Pass ☐ Fail — notes: ____________________

### D3 — Expiry (end of June 6) — *verify by config, not by waiting*
1. Ask Lewis to confirm the grant's `expires_at` = **2026-06-07 04:00 UTC** (= end of June 6,
   New York time).
2. **Expected:** on/after June 7 the promo coins stop counting and new claims are refused.
   (No need to time-travel — just confirm the date is set.)
- **Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## SECTION E — Known limitation (expected behavior, not a bug)

### E1 — Passwordless sign-in link opened on a DIFFERENT device
1. Do A3 steps 1–4, but open the sign-in email on a **different device/browser** than where you
   clicked Start Chat.
2. **Expected:** you log in and land on **`/6-6`** (you still get your 6 min and see the badges),
   but you are **not** dropped into the specific guide's chat — because the other device doesn't
   know which guide you picked. **This is acceptable/by design**, not a failure.
- **Result:** ☐ Pass ☐ Fail — notes: ____________________

---

## Quick smoke test (if you only have 10 minutes)
Run **A1, A3, A4, B1, C1, D1**. Those cover: new signup gets 6 + lands in chat, the passwordless
green-message fix, Aiden popup, instant coin display, "other funnels unchanged", and "buyers blocked".

---

## Automated checks already passing (FYI — Lewis can re-run locally on :5000)
- `node scripts/verify-6-6-batch.mjs` — 6-min copy, Aiden popup, signup→guide chat
- `node scripts/verify-6-6-promo-pill.mjs` — 360 shows on chat entry
- `node scripts/verify-6-6-passwordless-msg.mjs` — green passwordless success (needs `seed-passwordless-test.ts`)
- `node scripts/verify-6-6-magiclink-forward.mjs` — magic link → remembered guide chat
- `node scripts/verify-6-6-signin-popup.mjs` — top-right Sign In popup, `/personas` unchanged
- `node scripts/verify-6-6-render.mjs` — promo follows the user, `/personas` unchanged
