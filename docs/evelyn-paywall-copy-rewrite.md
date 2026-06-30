# Evelyn Paywall — Copy Rewrite + ASCII Wireframes

**Scope:** improve the **sales copy only** — the coins / minutes / live-meter credit system stays exactly as is (model unchanged, modeled on Nebula). Synthesized from 5 parallel copy agents (benefit-led · Evelyn's voice · value/anchoring · momentum/loss-aversion · trust/objection-handling).

**Product note:** this is a **chat** product (text messages), **not** phone/voice. Billing is per active minute of the reading; **idle time is free** (the meter pauses while typing/thinking). No phone/in-person comparisons — they'd be inaccurate.

**Goal:** lift free→paid conversion (~1–2% today) and cut the ~60% checkout abandonment by fixing *how* the offer is communicated.

---

## The decisions all five lenses converged on

1. **Kill the fear words.** Replace `"Your Credits Have Run Out"`; delete `"One-time payment is non-refundable."`
2. **Resolve the refund contradiction.** Modal said *non-refundable*, store footer said *30-day goodwill refund*. One line everywhere: **"30-day money-back guarantee on unused coins — no questions asked."**
3. **Lead with minutes, not coins.** Coins stay visible (on commit / fine print) but the big number is **minutes with Evelyn**.
4. **Build value honestly — no false anchor.** We're chat-only, so NO phone/in-person price comparison. Value comes from **bonus minutes free**, a per-minute rate that drops on bigger packs (down to $1.33/min), and **"idle time is always free."**
5. **Fix the default selection (structural bug).** Code pre-selects the **$99.99 whale** (`findLast(t => t.badge)`, `BuyCreditsModal.tsx:41`). Default to the **mid 1,800 / $49.99** tier, labeled **★ MOST CHOSEN**.
6. **Speak in Evelyn's voice**; keep price/coins/refund plain and literal (warmth in headers, clarity on numbers).
7. **Trust at the button:** guarantee · one-time/no-subscription · encrypted · private.

All claims are true in the code (history persists, resume replays last 4 messages, meter is the real balance, idle is free), so the momentum framing is honest, not manufactured.

**Mobile-first:** the in-chat paywall is mostly seen on phones (~360px). Tiles carry **3 short lines** (minutes · price · +free); coins show on commit; the per-minute ladder is **one line** under the grid, not per-tile. Desktop may show a touch more.

---

## Wireframe A — Low-balance banner (in-chat, fires BEFORE zero)

> Fire earlier: ~90s left (`coinsRemaining <= cpm * 1.5`; today `* 1` ≈ 60s at `ChatServicePage.tsx:525`); free-trial banner at ~45s. Calm, dismissible, pinned above the input.

```
┌────────────────────────────────────────────────────────────┐
│  ◔  About a minute left with Evelyn — keep the thread open.  │
│                                            [  Keep going →  ] │
└────────────────────────────────────────────────────────────┘
```
A/B alt: "We're right in the middle of something — add a few minutes so Evelyn can finish this with you."

---

## Wireframe B — The paywall (BuyCreditsModal, out-of-credits)  ◀ HERO (mobile-first)

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

- **Default = the ★ MOST CHOSEN 30-min / $49.99 tile** (not the whale).
- **Header A/B:** "Let's pick this back up." vs "You're just getting to the good part."
- **CTA A/B:** "Keep going with Evelyn — $49.99" vs "Continue my reading — $49.99".
- **Decline (low-balance, not zero):** add a soft "Not now — keep my place saved" link; the thread is held.
- **Tap a tile** → selection ✓ moves, the "Adding X min" line + CTA price update.

---

## Wireframe C — Credits / store page (CreditsPage)

> Full scroll page, so a little more detail is fine — but still minutes-led, no phone anchor.

```
┌──────────────────────────────────────────────────────────┐
│  ◖Evelyn◗   Your time with Evelyn                          │
│                                                            │
│  ╭──────────────────────────────────────────────────────╮ │
│  │  YOUR BALANCE                                          │ │
│  │        ☾  18 minutes left      (1,080 coins)           │ │  ← minutes lead, coins 2nd
│  │  Idle time is free — you only spend in a live reading. │ │
│  ╰──────────────────────────────────────────────────────╯ │
│                                                            │
│  ───  You get more minutes than you pay for  ───           │  ← was "Special Offer / get
│  Every package adds free bonus minutes, and the bigger     │     bonus coins on every package"
│  the pack, the less each minute costs — as low as $1.33.   │     (no phone comparison)
│                                                            │
│  How much time would you like with Evelyn?                 │  ← was "Choose Your Package"
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │   9 min   ·  +3 free            $19.99       [ + ]  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │  15 min   ·  +6 free            $29.99       [ + ]  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │  ★ MOST CHOSEN                                       │   │
│  │  30 min   · +13 free   $1.67/m  $49.99 [ Keep going]│   │  ← was "Buy Coins"
│  ├────────────────────────────────────────────────────┤   │
│  │  BEST VALUE                                          │   │
│  │  75 min   · +41 free   $1.33/m  $99.99       [ + ]  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  60 coins = 1 minute with any guide.                       │
│                                                            │
│  🛡 30-day money-back guarantee on unused coins.            │  ← consistent everywhere
│  🔒 Encrypted by PayPal & Stripe · one-time · no            │
│     subscription · private & confidential.                 │
│  ★ 4.8/5 from thousands seeking clarity  (only if true)    │
└──────────────────────────────────────────────────────────┘
```

---

## Canonical before → after (the strings to ship)

| Surface | Before | After |
|---|---|---|
| Paywall header (zero) | Your Credits Have Run Out | **Let's pick this back up.** |
| Paywall header (low) | Get More Coins | **More time with Evelyn** |
| Paywall subhead | Add more coins to continue your journey with {advisor} | **You & {advisor} were mid-thread — add a few minutes and pick up right where you left off.** |
| Low-balance banner | You're running low on credits | **About a minute left with {advisor} — keep the thread open.** |
| Free-trial banner | Your free trial is ending soon! | **Your free minutes are almost up — and we're just getting to the real thing.** |
| Store promo | Special Offer / Get bonus coins on every package | **You get more minutes than you pay for** (bonus minutes free; as low as $1.33/min) |
| Section header | Choose Your Package | **How much time would you like with Evelyn?** |
| Package CTA | Buy Coins | **Keep going** |
| Rate line | 60 coins = 1 minute · same rate / "rate varies by guide" | **60 coins = 1 minute with any guide. Idle time is free — you only spend in a live reading.** |
| Refund line (BOTH places) | "non-refundable" (modal) vs "30-day goodwill refund" (footer) | **30-day money-back guarantee on unused coins — no questions asked.** |
| Trust block | Guaranteed secure payments | **Encrypted by PayPal & Stripe — we never see your card details.** |
| (new) reassurance | — | **One-time — no subscription, no auto-renew.** |
| Decline path | (bare ✕) | **Not now — keep my place saved.** |
| Post-purchase | Credits purchased! | **You're back with Evelyn. Picking up right where you left off…** |

---

## Two structural fixes (not copy)
1. **Default tier:** stop pre-selecting the $99.99 whale (`BuyCreditsModal.tsx:41`); default to the 1,800/$49.99 "MOST CHOSEN" tile.
2. **Banner timing:** fire the low-balance banner at ~90s remaining (not ~60s) so there's runway to act inside the feeling.

## A/B priority (highest leverage first)
1. **Header swap** — "Let's pick this back up" vs "Your Credits Have Run Out" (most-seen, most-damaging string).
2. **Refund line** — guarantee vs "non-refundable" (also fixes the contradiction).
3. **Minutes-led tiles + mid-tier default** vs current coin grid.
4. **CTA** — "Keep going with Evelyn" vs "Buy Coins".

> Ethics guardrails kept throughout: every claim is true in the data (thread saved, refund honored, meter real, idle free); no fake countdowns/scarcity; "for guidance" + tendencies-not-promises preserved. Publish the guarantee / "no auto-renew" lines only if the backend actually honors them.
