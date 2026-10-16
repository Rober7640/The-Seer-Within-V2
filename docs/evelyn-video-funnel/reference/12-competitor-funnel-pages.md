# Mia's funnel PAGES — walked 2026-10-11

Walked in Chrome, read-only: no form filled, no choice clicked, nothing bought. Page facts come from the
live DOM and the VideoAsk page data (`window.__NEXT_DATA__`). Screenshots: `competitor_checkout/`.

## 1. Landing — `readings.spiritualsociety.co/mini-reading/`
- **Built in Unbounce.** Headline "Are you ready to meet your soulmate?", one vertical video, then
  "Press Play to request your **in-depth** tarot reading from Mia". Privacy + Terms links.
- **Ad pixel: AppLovin (Axon)**, not Meta — this traffic is AppLovin app-install-style ads.
- Two hidden links on the page (not shown in the walk): "Tap Here To Request Your Reading" →
  `try.aryareadings.com/quizwt3086nq` (another brand's quiz) and "Yes, I Want A Psychic Reading" →
  `tel:` a phone line. Likely fallbacks/other variants; the live path is the video.

## 2. The video IS the funnel — VideoAsk (Typeform), embedded at `video.spiritualsociety.co/fm5n44exz`
A 2-step VideoAsk form, "[RbM] 0305 New Intro V2":

| step | video | on-video buttons | appear at | goes to |
|---|---|---|---|---|
| 1 "Pick a card - Janet" | 58s intro | **A Rose Quartz 🌹 · B Green Goldstone 🟢 · C Moonstone 🌙** | **50s** (`answer_reveal_delay_time: 50`) | every choice → step 2 |
| 2 "MIA - mini reading - 0407 addon" | 7:03 pitch | one button **"Get Your Reading Now"** | **6:46** (`answer_reveal_delay_time: 406`) | URL `checkout.spiritualsociety.co/reading-and-sic-v2/?affId=…&c1=…` |

- The stone pick is **inside the player** (VideoAsk answer buttons over/next to the video), not page
  buttons. Same pitch video for all three stones.
- Step 2 has `disable_data_collection: true`; the form-level contact capture (name/email/phone) is
  configured but the URL jump skips it — **no email asked before checkout**.
- Buy button only at 6:46 of 7:03 — i.e. after the whole pitch.

## 3. Checkout — `checkout.spiritualsociety.co/reading-and-sic-v2/` ("Mia Soulmate Reading")
A **sales page first, card form in a pop-up**:
1. Sticky top bar: **"PAGE EXPIRES 09:58" countdown** (10 min) + "GET MY READING" button.
2. "Get a Soulmate Reading by Mia" + product image (Mia + a tarot deck box, "Mia's Soulmate Reading").
3. "Your personalized soulmate reading is almost ready!"
4. Offer box: "SPECIAL OFFER · Personalized reading for **$19.99** · Total today $19.99 ·
   Includes 7 days of free follow-up readings ~~$33.33~~ $0".
5. **Checkbox, unticked by default: "Yes activate my free 7 days of unlimited follow-up questions &
   readings!"** = their app subscription. FAQ: "After 7 days, it renews at **$33.33/month**. Cancel
   anytime. If you uncheck the box: you will pay a one-time fee."
6. Pulsing "GET MY READING" → opens the payment pop-up.
7. "What's inside your reading" — Soulmate Identity (known or not, **including initials**) ·
   Personality & Appearance (incl. **zodiac sign**, career) · Timing Details (places/dates) ·
   Spiritual Guidance (follow-up questions).
8. 3 named, dated testimonials (one: "the guy in my reading is now my husband").
9. **60-day money-back guarantee** ("over 3,000 women"; "email our support team within 60 days").
10. FAQ (5): legit? / will I recognise him? / **delivery: "digital report… to the email you
    provide… within 24 hours"** / monthly fee? / refund.
11. Footer: support email + phone, "entertainment purposes only" disclaimer, Terms | Privacy.

**Payment pop-up** (custom PHP checkout, `ajax.php?method=downsell1`, `campaigns[1..3]` — a CRM
template, not Stripe): "You will be charged $19.99 today" · email ("What email should I send your
reading to") · first + last name · card type (Visa/Mastercard) · card number · CVV · expiry.
- **Order bump, unticked: "YES, I WILL TAKE IT! ONE TIME OFFER… I will channel messages from your
  soulmate and what he wants to tell you right now (at least 1,000 words). Only $11.11."**
- Legal line under the button: "…You also agree to be enrolled in the Spiritual Society app… free for
  7 days, then $33.33 a month. Cancel anytime."
- Card logos + McAfee/Norton badges. No PayPal, no Apple/Google Pay.
- **No birth date asked anywhere up to payment** — only email + name. (Birth details, if used, come
  after purchase; post-purchase pages not visible without buying.)

## What this means for us
- The "clickable video" the operator wants is exactly Mia's set-up — VideoAsk answer buttons. We can
  use VideoAsk ourselves or build the same overlay in our own player.
- Her monetisation is three-layer: $19.99 front · $11.11 bump · $33.33/mo app subscription (opt-in
  box). Our script promises email follow-up questions (no app), so there is nothing to subscribe to.
- ⚠ The subscription box + "you also agree to be enrolled" small print is a negative-option risk
  (FTC "click-to-cancel" / ROSCA) — don't copy without a compliance call.
