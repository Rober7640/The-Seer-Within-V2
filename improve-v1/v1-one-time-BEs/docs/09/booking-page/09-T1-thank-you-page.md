# 09-T1 — Thank-you page *(the Heart Cleanser Love Charm)*

| | |
|---|---|
| **Offer** | 09 the Heart Cleanser Love Charm — physical, $59, free worldwide shipping |
| **Route** | `/offers/heart-cleanser/success?s=<session_id>` — after U1 and U2, the last screen in the money sequence |
| **Archetype** | a **receipt** (P7). She gave no reply and nothing is being written for her; a charm is being packed and shipped |
| **Voice** | Evelyn's, first person. The buyer's-voice device ends at 09-C1's button |
| **Sells nothing** | no offer, no teaser, no link to anything buyable |
| **Component** | [00e §7](../../00e-FRAMEWORK-BEs.md) |

---

## The copy

<!-- BEAT 1 · confirms the order and the item, not just her name. Name falls back to "dear"
     ("Friend" is a placeholder, not a name). -->

### Thank you, %FIRSTNAME%. Your Heart Cleanser Love Charm is ordered.

<!-- BEAT 2 · thanks as her good judgement, fresh words. -->

You chose to make room for your own wish, and you didn't put it off for another day. I'm glad you
did.

<!-- BEAT 3 · what happens now: packing and shipping. Present tense, practical. -->

Here's what happens now. We pack your charm in its gift box, with its wish papers and its card, and
ship it within 2 business days.

<!-- BEAT 4 · the receipt lines. The 09 checklist (A6) asks for the amount, so it is shown. -->

### Your receipt

**Order:** one Heart Cleanser Love Charm

**Paid:** $59 (free shipping)

<!-- BEAT 4b · CONDITIONAL. Print this line ONLY when the order lookup returns bumpPurchased: true
     (she ticked the 09-C3 order bump). Otherwise print nothing — no "Added: none". -->

**Added:** Reiki charging by Evelyn before packing, $11.11

<!-- BEAT 5 · what's in the box. The operator's settled list, nothing added. -->

### What's in the box

- Your Heart Cleanser Love Charm: pink quartz, with its wish capsule
- Blank wish papers that fit the capsule
- A printed card with the instructions and care notes
- A gift box to keep it in

<!-- BEAT 6 · where it's going. The address she typed into Stripe Checkout. -->

### Where it's going

%SHIPPING_ADDRESS%

**Fallback, when no address comes back:** To the address you entered at checkout.

<!-- BEAT 7 · the real wait, word for word against 09-C1. -->

### When it arrives

Your charm ships within **2 business days**. After that, it arrives in **7–14 days** in the US and
**2–4 weeks** everywhere else.

<!-- BEAT 8 · the two emails, by exact subject. Must match 09-T3 and 09-T4 word for word. -->

### Two emails to look for

Your order confirmation is on its way to your inbox now. Its subject is:

> **Your Heart Cleanser Love Charm order is confirmed**

When your charm ships, I'll email you the tracking link. That email's subject is:

> **Your Heart Cleanser Love Charm has shipped**

Until then, there's nothing you need to do.

<!-- BEAT 9 · support, then sign-off. Not "I'm on your side in this, dear". -->

### If you need help

Write to [hi@theseerwithin.com](mailto:hi@theseerwithin.com) about anything to do with your order.
Our refund policy is at [theseerwithin.com/refund](https://theseerwithin.com/refund).

Keep your wish in mind while your charm travels to you, dear. You'll write it down when it arrives.

— Evelyn

---

## Fallback — the order can't be verified

<!-- Refresh with a bad or missing ?s=, or a session that isn't a 09 order. Never print receipt
     lines, an amount or an address that weren't verified for THIS order. -->

### Thank you, dear.

I can't show your order details on this page just now. Your confirmation email has them, with the
subject **Your Heart Cleanser Love Charm order is confirmed**.

If it hasn't arrived, write to [hi@theseerwithin.com](mailto:hi@theseerwithin.com) and we'll look
it up for you.

— Evelyn

---

## Build notes

- **The amount is shown on purpose.** 02-T1 and 06-T1 never restate the price; 09's own checklist
  (A6: "item, amount, address, shipping expectations, support and next step") asks for it. "Paid:
  $59 (free shipping)" covers the charm only. If she took U1 or U2 those have their own charges and
  are not listed here (see the open question in the report).
- **Subjects are coupled.** Beat 8 names `09-T3`'s and `09-T4`'s subjects verbatim. If either email's
  subject changes, this page changes with it. Neither subject carries her first name, so the page
  can print both exactly, with no merge and no "dear —" problem.
- **`%SHIPPING_ADDRESS%` is a page placeholder, not an AWeber token.** It needs the Stripe Checkout
  shipping address persisted for 09 and returned by `/api/backend/order/:sessionId` (09 workflow
  A7 — today the address lives only in Stripe). Print it as lines (name, street, city, region,
  postcode, country). If it isn't there, print the fallback line. Never a blank, never the literal
  token.
- **Shipping wording matches `09-C1` exactly**, and copy-check's `OFFERS['09'].sla`. Windows count
  from dispatch.
- **Refund page: linked, not quoted.** No day counts restated.
- **No reading language.** "Pack", "ship", "arrives". Nothing is described as being prepared for her.
- **No upsell-purchased block**, matching 02-T1/06-T1's scope.
- **The bump line (BEAT 4b) is the only conditional line on the receipt.** It shows only for
  `bumpPurchased: true`, word for word as `09-C3`, and names the add-on exactly as the Stripe line
  item does, so her card receipt and this page agree. ⚠ With it showing, "Paid: $59" covers the charm
  line only and "Added" carries the $11.11. If the operator wants the total on one line instead, both
  lines change together.
- **Voice rules checked:** contractions, no paragraph opening on a bare It/That/This, none of the
  deck's banned words, no "I'm on your side in this, dear".
