# 6/6 Promo — Manual Test Cases (both systems)

Covers **System A: the new 6/6 promo flow** and **System B: the normal/existing experience**
(regression — must be unchanged for non-promo users). Run on local first
(http://localhost:5000), then repeat the key cases on production after go-live.

## Test logins (local)
| Email | Password | State |
|---|---|---|
| `promo-tester@local.test` | `TestPromo123!` | Has 6/6 grants on every guide |
| `nopromo-tester@local.test` | `TestPromo123!` | No grant, has real coins (normal user) |
| (register a fresh email on `/6-6`) | — | Brand-new visitor |

Reset/seed helper: `npx tsx scripts/seed-promo-local-test.ts`

---

## System A — 6/6 Promo

### A1. Brand-new signup gets 6 min immediately
1. Open `/6-6` logged out. Click a guide's **Start chat** (or Sign up).
2. Sign up with a **fresh email**.
- ✅ No "verify your email" wall blocks you.
- ✅ You stay on `/6-6`; every guide card shows **🎁 6:00 free**.
- ✅ You can start a chat and the timer counts down from 6:00.

### A2. Existing user WITH password
1. On `/6-6`, log in with an existing password account.
- ✅ Stays on `/6-6`; cards show **6:00 free**; chat works.

### A3. Existing PASSWORDLESS user (lander signup)
1. On `/6-6`, enter a passwordless account's email + any password → submit.
- ✅ Message: "we sent a sign-in link to your email."
- ✅ The emailed link opens `/6-6` logged in, with **6:00 free** showing.
  (Local: Resend is off — the link is printed in the server log instead of emailed.)

### A4. Top-right "Sign in" from /6-6
1. On `/6-6`, click **Sign in** (top right) → log in on `/login`.
- ✅ You're returned to `/6-6` and the 6 min are credited (badges show).
- (Passwordless: the emailed link returns you to `/6-6` too.)

### A5. Buyer is blocked
1. Log in on `/6-6` as a user who has **bought coins before**.
- ✅ **No promo badge, no 6 min granted.** Their real balance is unchanged.

### A6. Claimed once only (no stacking)
1. As a promo user, reload `/6-6` several times; revisit it after chatting.
- ✅ Balance never jumps back up to 6:00 or beyond — it only goes **down** as used.

### A7. Spend order — promo first, then real
1. As a promo user with **0 real coins**, chat with a guide until the 6 min run out.
- ✅ Timer counts 6:00 → 0; promo is consumed first.
- ✅ At 0, you hit the normal "out of coins / buy more" wall.
2. Repeat with a promo user who **also has real coins**.
- ✅ Promo is spent first; only after promo hits 0 does the **real balance** start dropping.

### A8. Per-guide isolation
1. As a promo user, use up minutes with **one** guide.
- ✅ That guide's free time drops, but **every other guide still shows 6:00**.

### A9. Promo follows the user everywhere
1. As a promo user, after claiming on `/6-6`, open `/personas` and the `/reading` left sidebar.
- ✅ Both show the promo (**6:00 free** / 🎁), not the "3 minutes" default.

### A10. Expiry (end of June 6)
- ✅ On/after June 7, promo coins no longer count (claims refused, granted coins ignored).
  (Hard to test live without changing the clock — verify the expiry date is set on the grant.)

---

## System B — Normal / existing experience (must be UNCHANGED)

### B1. /personas is untouched for normal users
1. Log in as `nopromo-tester` (or any non-promo user) → open `/personas`.
- ✅ Cards show the normal **"… 3 mins free"** default; **no green promo badge**.

### B2. Reading sidebar unchanged for normal users
1. As a non-promo new user, start a reading → look at the left "Other Guides" sidebar.
- ✅ Shows **"3 minutes FREE"** (purple), **not** the promo badge.

### B3. Claim ONLY happens via /6-6
1. As a **fresh non-buyer**, log in via `/login` (NOT `/6-6`); open `/personas`.
- ✅ **No 6 min granted** — they only appear if you enter through `/6-6`.

### B4. Normal billing is unaffected (no promo)
1. As a normal user with real coins (e.g. `nopromo-tester`), chat with a guide.
- ✅ Real balance deducts normally (~60 coins/min); no promo involved.

### B5. Buyers / paid coins untouched
1. As a buyer, confirm their purchased balance is intact and spends normally.
- ✅ No promo granted; real coins behave exactly as before.

### B6. Existing auth flows still work
1. Normal signup via `/login` still shows the usual verification flow.
2. Normal login, magic-link login, and password reset still work as before.
- ✅ Only the `/6-6` path skips the verification wall; everywhere else is unchanged.

---

## Automated checks (already passing on local)
- `npx vitest run server/lib/promoWallet.test.ts` — spend/refund math (13)
- `npx tsx scripts/test-promo-wallet-integration.ts` — wallet vs DB (16)
- `npx tsx scripts/test-promo-billing-flow.ts` — real billing path incl. run-out (12)
- `npx tsx scripts/test-promo-claim.ts` — grant / idempotent / buyer-blocked (8)
- `node scripts/verify-6-6-render.mjs` — display: promo follows user, /personas unchanged
- `node scripts/verify-claim-e2e.mjs` — claim only via /6-6 (Point B)
- `npx tsx scripts/verify-passwordless-6-6.ts` — passwordless → magic link → /6-6 → claim
- `node scripts/verify-signup-6-6.mjs` — brand-new signup gets 6 min immediately
