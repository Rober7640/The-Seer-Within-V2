# 09-C1 — Booking page *(the Heart Cleanser Love Charm)*

| | |
|---|---|
| **Offer** | 09 the Heart Cleanser Love Charm — one pink quartz bracelet with a wish capsule · **$59**, fixed, quantity 1 · free worldwide shipping · our own stock, packed and shipped by us |
| **URL** | `https://theseerwithin.com/offers/heart-cleanser` (Joel, 2026-09-15) · receipt at `/offers/heart-cleanser/success` |
| **Arrives from** | the CTAs in `../sales-emails/md/09-E2-esl-v1-left-wrist.md` (`?c=1–4`) and `../sales-emails/md/09-E3-esl-email-2-his-name.md` (`?c=21–24`); email 3 once chosen (`?c=31–33` proposed) |
| **Treatment** | Page |
| **Chat treatment** | **N/A** — physical-item, page-only pattern (06 precedent). There is no `/offers/heart-cleanser/chat` |
| **Order bump** | **Reiki charging by Evelyn before packing, $11.11**, unticked, beside the total — copy in [`09-C3`](09-C3-order-bump.md) (Joel, 2026-09-15, supersedes "none"). Its own product key `reiki_charge`; checkout must not inherit 06's Closed Purse |
| **Voice** | ⚠ the BUYER's, first person, in every statement. Evelyn is named in the third person and never speaks on this page |
| **Written against** | 09-E2 (left wrist, "too") and 09-E3 (his name, "I wish to feel…"). All four statements hold for a buyer from either letter; the E3-only "I wish to feel…" is left out |
| **Copy source** | [`09-C1-ticks-rewrite.md`](09-C1-ticks-rewrite.md) Version 2 — approved by the operator 2026-09-15, cold-read over three rounds |
| **Address** | taken on the secure Stripe Checkout page, before payment (`shipping_address_collection`, worldwide). No address form on this page, and none after payment |
| **Component** | [00e §3](../../00e-FRAMEWORK-BEs.md) |

---

## Masthead

<!-- Sits on the starfield, same as the live Pixiu page. Eyebrow "Evelyn Cross" is the existing
     component's, unchanged. -->

**Eyebrow:** Evelyn Cross

**Title:** Your Heart Cleanser Love Charm

**Deck:** *Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.*

---

## Image

<!-- Top of the white sheet, above statement 1. ~320px wide on desktop, full sheet width on a phone. -->

`[IMG-C1: rosequartz-page-570.jpg — https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/backend-09/rosequartz-page-570.jpg]`

**Alt text:** The Heart Cleanser Love Charm, a pink quartz bracelet with a gold wish capsule, resting on a clear crystal.

**Caption:** *The Heart Cleanser Love Charm, a pink quartz bracelet with a wish capsule. The clear crystal under the bracelet is not included.*

---

## The four statements

<!-- ⛔ No logistics in any statement: no shipping, price, address, checkout or subscription.
     Those live in the small print under the button. -->

<!-- STATEMENT 1 · the charm and the wish it keeps. The capsule holding her written words is both
     letters' first promise. Says the charm IS the whole bracelet, and that the papers come with it. -->

**Yes — I want to keep my wish for love inside my charm.**

My charm is the whole bracelet: pink quartz, with a small wish capsule built in. Blank wish papers
come with my charm. I'll write my wish on one of the papers, put the paper in the capsule and close
the capsule. I can keep what I write to myself.

<!-- STATEMENT 2 · the seven words, quoted, not counted. "Too" is explained straight after the quote
     (E2: affection that comes back as readily as she gives it). -->

**Yes — I'll say, "I am ready to receive love, too."**

"Too" means I receive love as well as give it. After my wish is in the capsule, I'll hold my charm
in my left palm and say that sentence.

<!-- STATEMENT 3 · the left wrist and the pink quartz, both at the letters' level: "stands for",
     never "makes" or "brings". -->

**Yes — I'll wear my pink quartz charm on my left wrist.**

Wearing my charm on the left stands for receiving love. The pink quartz stands for tenderness, the
kind of love I'd like to welcome into my life.

<!-- STATEMENT 4 · the wish carried through the day. E2 "Take the intention with you", E3 "when your
     fingers touch the capsule". The morning moment says "can", so it isn't a daily promise. -->

**Yes — I want my wish to go with me through the day.**

As I put my charm on in the morning, I can stop for a moment and think of my wish. The paper with my
wish stays in the capsule. When I touch the capsule, I can remember what I wrote.

---

## The button

> ### SEND ME MY LOVE CHARM

**Before all four are ticked (no button yet):** *Tick all four boxes above to show the button.*

**Order bump, between the last statement and the total (unticked; appears only once all four statements are ticked — Joel, 2026-09-16):** the checkbox in [`09-C3`](09-C3-order-bump.md).

**Total line:** Total · $59.00 — the bump's $11.11 is added while it is ticked (the page computes
it from the catalog)

**Under the button, small:**

*In the gift box: your charm, blank wish papers that fit the capsule, and a printed card showing how to
use and care for your charm. Free shipping worldwide. Your charm ships within 2 business days, then
arrives in 7–14 days in the US and 2–4 weeks everywhere else. The 7–14 days and 2–4 weeks start on
the day your charm ships. Once all four boxes are ticked, the button above takes you to the secure
checkout page, where you'll enter your shipping address and pay. No subscription.*

*[Refund policy](https://theseerwithin.com/refund) · Questions: [hi@theseerwithin.com](mailto:hi@theseerwithin.com)*

**Footer strip (existing component, unchanged):** 🔒 Secure checkout · One-time · no subscription

---

## Build notes

- **Why the ticks changed (operator, 2026-09-15).** "The 4 ticks should focus more on product, ritual,
  the 'magic', rather than logistics." So there are **four statements, not five**, and every one is
  about the charm, the ritual and what it stands for. The **request paragraph is removed** (no
  "Evelyn — … So please —"; no block, no divider). The **logistics moved to the small print**: box
  contents, free shipping, the shipping wording word for word, what the button does and "no
  subscription". Final copy and its three-round cold read: [`09-C1-ticks-rewrite.md`](09-C1-ticks-rewrite.md) Version 2.
- **What happens after the button.** Stripe Checkout (fixed 5900 cents, quantity 1, worldwide
  `shipping_address_collection`, plus the `09-C3` bump as a second line when ticked) → U1 Protection Ritual (`09-U1a`) → U2 Manifestation
  Bracelet (`09-U2a`) → receipt (`09-T1`, `/offers/heart-cleanser/success`). The purchase tag fires
  `09-T3`; marking the order shipped fires `09-T4`.
- **Four statements, no scarcity statement.** Same reason as 06: there is no inventory cap in code,
  and a scarcity line with no code behind it gets cut, not faked (D3).
- **Box contents live in the small print**, not in a tick. Measure the built page; if it runs past
  about two phone screens, see A2's split rule before adding anything.
- **The price shows once, in the total.** No statement and no small print names an amount: the total
  is computed from the catalog (5900, plus 1111 while the bump is ticked), so nothing on the page
  goes wrong when the bump changes it. The small print says neither "One payment of $59" nor
  "Stripe", which most readers didn't know. The page posts no price; the server charges the catalog's.
- **The address line matters.** A buyer of a physical item who sees no address field on this page
  will wonder where it goes. The small print says it's taken on the secure checkout page, before she
  pays. This replaces 06-C1's "address on the next screen" pattern for 09.
- **Shipping times, word for word**, match `09-T1`, `09-T3`, `09-T4` and copy-check's
  `OFFERS['09'].sla`: "ships within 2 business days, then arrives in 7–14 days in the US and 2–4
  weeks everywhere else". Windows count from dispatch, and the small print says so. Never "soon".
- **Refund and support: link and address only.** No day counts from the refund page restated here;
  its wording may change.
- **Images.** The studio close-up only: `rosequartz-page-570.jpg`, from `../product/images/rosequartz.webp`
  at its full 570px (not upscaled). The caption says the clear crystal under the bracelet is not
  included; the alt text names the crystal only as what the charm rests on. ⛔ Not `rosequartz3`:
  its box and card say "Wish Miracle Bracelet", which would confuse
  buyers next to "Heart Cleanser Love Charm" (Joel, 2026-09-15), even though that box is what
  ships. The wrist photo (`rosequartz2`) was dropped: its original is only 492px. ⛔ Do not use
  `black_lava_steps-email.gif` on this page — it shows black beads, and this is the screen where
  she confirms what she is paying for.
- **Claim level matches the letters.** A symbolic wearing ritual: her written wish in the capsule,
  the seven words, the left wrist and the pink quartz as what they "stand for". Nothing says the
  charm makes love come, and no one else is promised to do anything. No outcome, no reunion, no
  efficacy, no "proven". No reading language anywhere.
- **Sign-off line "I'm on your side in this, dear" is not used** on this page or anywhere in the
  new 09 purchase files (flagged corpus collision).
- ⚠ **Open for engineering:** after she accepts U1, the shared engine still opens V1's shipping
  form (`useUpsellChat.ts` sets `showShippingForm` after `SUCCESS`), and `/api/backend/upsell/user-data`
  only reads an address from U1's PaymentIntent. So a U1 buyer is asked for the address she already
  gave Stripe for the charm. Decide whether to prefill or skip.
- ⚠ **Open for the operator:** the refund page's physical-products section is headed "Protection
  Stones & Ritual Items". Check it plainly covers a love charm before this page links to it.
