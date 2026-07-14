# Anti-fraud change — manual dev test (2026-07-09)

**Goal:** confirm on the dev site that real buyers sharing one IP are **no longer blocked** at signup, before we push this to production.

**What changed**
- **Before:** the **4th** signup from the same IP within 24h was hard-blocked with *"Too many accounts created from this location. Please try again tomorrow."*
- **After:** shared IPs are allowed (flagged for review only). A hard block now happens **only** at an extreme **25 signups/IP/24h**.

---

## ⚠️ Test on `/aiden`, NOT `/evelyn` — protects the live A/B experiment

The Evelyn quiz-vs-chatbox A/B is **running**, and dev shares the **production database**. If you tested on `/evelyn`, every visit + signup would write experiment **exposure/conversion** rows into the **same tables your live A/B reads** — skewing the live results. (Also, the `?mechanic=quiz` override does **not** work on the dev URL — it's a production build.)

`/aiden` uses the **exact same** `magic-register` signup + the same anti-fraud block, but has **no experiment** — so it tests the fraud change and touches nothing in the Evelyn A/B. **Use `/aiden`.**

Testing on the dev URL does **not** affect live *users* either way (separate deployment); the only cross-contamination risk is experiment *data* via the shared DB, and `/aiden` avoids it.

## Use exactly these

**Test URL (Aiden quiz → email gate → the `magic-register` path that had the block; no experiment):**
```
https://the-seer-within-v2-development.up.railway.app/aiden
```

**Emails** — all 5 deliver to your inbox, all are unique, all confirmed absent from the DB:
| # | Email |
|---|-------|
| 1 | `swapnil.kanmahale88@gmail.com` |
| 2 | `swapnil.kanmahale88+t2@gmail.com` |
| 3 | `swapnil.kanmahale88+t3@gmail.com` |
| 4 | `swapnil.kanmahale88+t4@gmail.com` |
| 5 | `swapnil.kanmahale88+t5@gmail.com` |

**Rules while testing:**
- Use the **same browser and same internet connection** for all 5 (so it counts as one IP).
- **Wait ~1 minute between each signup.** (Doing them back-to-back can trip a *separate* speed limiter — see the note below — which is not the thing we're testing.)

---

## ⚠️ Two different "429 / too many" messages — don't confuse them

| Message you might see | What it means | For this test |
|---|---|---|
| **"Too many accounts created from this location. Please try again tomorrow."** | The **anti-fraud IP block** — the exact thing we changed | This is the one that matters. It should **NOT** appear in signups 1–5. |
| "Too many requests" / "link unavailable" / please slow down | A generic **speed limiter** (unrelated) if you click too fast | Not a failure of our change — just wait a minute and retry. |

---

## TEST A — Signup works at all (deployment + happy path)

1. Open the Test URL above.
2. Go through the short quiz until it asks for your name + email.
3. Enter your name and **email #1** (`swapnil.kanmahale88@gmail.com`).
4. Complete the "I'm not a robot" (Turnstile) check.
5. Submit.

**PASS:** you see a **"check your email"** confirmation (signup accepted).
**FAIL:** you see any error, or a normal first signup is rejected.

---

## TEST B — Shared IP is no longer blocked (the main test)

Repeat the same quiz + email-gate flow **from the same browser**, one at a time, waiting ~1 min between each:

6. Signup with **email #2** → should reach "check your email".
7. Signup with **email #3** → should reach "check your email".
8. Signup with **email #4** → should reach "check your email".  ← *this is the one that was BLOCKED before the fix*
9. Signup with **email #5** → should reach "check your email".

**PASS:** **all four** (#2–#5) succeed, and **none** of them shows *"Too many accounts created from this location. Please try again tomorrow."*
**FAIL:** any of them shows that "Too many accounts created from this location" message.

> Why this proves it: under the old rule, the **4th** account from one IP (email #4) got the hard block. If #4 and #5 now go through, the fix works.

---

## TEST C — Admins can still see these as "flagged" (flag, not block)

10. Open `https://the-seer-within-v2-development.up.railway.app/admin/login` and log in.
11. Go to the **Fraud** dashboard (`/admin/fraud`) or **Users** (`/admin/users`) and find your `swapnil…` test accounts.

**PASS:** the accounts **exist and are active** (not blocked). From the **4th same-browser signup onward** they may carry a **`fingerprint_flagged`** review flag — that's expected: flagged for review, still allowed in.
**Note:** you will likely **not** see an `ip_flagged` flag with only 5 signups — that flag starts at **10** per IP. That's normal.

---

## After you finish

Tell me and I'll **delete all 5 test accounts** from the database the same safe, scoped way I cleaned up earlier (by the `swapnil…` email prefix), so nothing is left in production data. Or you can delete them from `/admin/users`.

---

## Results (fill in as you go)

| Test | Email | Expected | Actual | Pass? |
|------|-------|----------|--------|-------|
| A | #1 | "check your email" | | |
| B | #2 | "check your email" | | |
| B | #3 | "check your email" | | |
| B | #4 | "check your email" (was blocked before) | | |
| B | #5 | "check your email" | | |
| C | admin | accounts active, flagged-not-blocked | | |
