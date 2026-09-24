# 09-C3 — Order bump *(Reiki charging by Evelyn)*

| | |
|---|---|
| **Offer** | 09 the Heart Cleanser Love Charm |
| **Price** | ✅ `$11.11` (Joel, 2026-09-15). Same number as 06's bump. Code reads it from the catalog (1111 cents), never from this file |
| **Decision** | ✅ Joel, 2026-09-15 — **supersedes "no order bump"**. A REAL service: someone really charges each bump buyer's charm with Reiki before it is packed, inside the 2-business-day dispatch window |
| **Renders** | on `09-C1`, right after the fourth tick and directly above "Total" — **only once all four ticks are ticked**, together with the button (Joel, 2026-09-16); unticking a statement hides it again and resets it to unticked. ⛔ Unticked. Never pre-checked |
| **Voice** | ⚠ the buyer's, first person, like the rest of the page. Evelyn stays in the third person |
| **Product key** | `reiki_charge` (`shared/backendOffers.ts`). Stripe line item: `+ Reiki charging by Evelyn before packing` |
| **Fulfilment** | by hand, before packing. The parcel row carries `bump_purchased = true` and the operator alert leads with **⚡ REIKI CHARGE BEFORE PACKING** |
| **Tags** | `be-09-bump`, on the order-bump list 6972554 (06's pattern) |
| **Component** | [00e §4](../../00e-FRAMEWORK-BEs.md) |

---

## The copy

<!-- LINE 1 · the checkbox label. Her words, her ask. Says what is ADDED, never what is missing. -->

**☐ Yes — have Evelyn charge my charm with Reiki before it's packed.**

<!-- LINE 2 · the price, then the two facts she needs: when it happens, and that it adds no wait.
     The price is rendered from the catalog cents. -->

+$11.11 · Before it's packed, Evelyn holds my charm in her hands and gives it Reiki for love. So on my first morning, I'm not starting with a new stone. I'm starting with one she has already worked on for me. No extra wait.

---

## On the receipt (goes into `09-T1`)

<!-- ONLY when the order lookup returns bumpPurchased: true. Otherwise print nothing at all. -->

**Added:** Reiki charging by Evelyn before packing, $11.11

---

## No bump email

Joel, 2026-09-16: "no reiki email needed". A bump buyer sees the "Added" line on the receipt page; nothing else is sent.

## Build notes

- **A real service, not a self-performed practice.** The deck's rule that "a bump is something she
  does, never something that ships" (02-C3, 06-C3) is overridden for 09 by Joel's decision of
  2026-09-15. The ten no-fulfilment alternatives stay on file in `09-C3-order-bump-brainstorm.md`.
- **No limit line.** 00e §4 opens a bump by naming the main product's limit. For a charging service
  any limit line reads as "the charm is incomplete without it", which this bump must never say. The
  label says what is added. Nothing on the page says what is missing.
- **Claim level: what is done, never what it does.** Reiki charging, by Evelyn, before packing. No
  outcome, no "stronger", no "activated", no "energy", no promise about love. Rule 3's banned words
  (clearing, energy field, our conversation) are absent. The code test checks the label for these.
- **It adds no wait, and must not.** 09-C1 statement 4, 09-T1, 09-T3 and 09-T4 all promise dispatch
  within 2 business days. The charging happens inside that window, so every one of them stays true.
  ⛔ Never hold a parcel past 2 business days for it.
- ⚠ **"By Evelyn" is a claim.** The label, the Stripe line item, the receipt line and the proposed
  email all say Evelyn does it. Make sure that is true of whoever charges the charms, or change the
  wording in all four places and in `shared/backendOffers.ts` together.
- ⚠ **Overlap with U2.** U2 sells a bracelet whose stones are attuned before shipping (`09-U2a`).
  Different object, but the same kind of act. Read U2's opening beats once more with a bump buyer in
  mind, so it doesn't sound like the same service sold twice in one order.
- **Never pre-checked.** A pre-selected paid add-on is a negative option under FTC and card-network
  rules. The checkout request carries `bump: true` only when she ticked it.
- **Total line.** "Total" shows $59.00 unticked, and adds the bump's $11.11 while ticked. The
  small print says "One payment." (no amount), so it stays true either way.

### For the person who packs

1. Every paid order emails the operator. A bump order's subject and first line start with
   **⚡ REIKI CHARGE BEFORE PACKING**, and the body says `Reiki charging by Evelyn before packing: YES`.
   A 09 order without the bump says `NO — pack as normal`.
2. `GET /api/admin/shipments?status=pending&offer=heart-cleanser` returns `bumpPurchased` and
   `bumpProductKey` (`reiki_charge`) on every row.
3. Charge the charm before it goes into its gift box. Then pack and ship as usual, still within 2
   business days, and mark it shipped through the admin API as usual.
4. ⚠ **Refunding only the $11.11 is a partial refund.** Nothing changes automatically: the parcel stays
   pending and still says `bump_purchased = true`. Tell the packer by hand. A full refund cancels the
   parcel and sends DO NOT SHIP, as before.

### AWeber

- `be-09-bump` is applied on list 6972554 so bump buyers can be found later. ⛔ Build no Campaign on it — there is no Reiki email (Joel, 2026-09-16).
- At payment, list 6972554 receives `be-customer`, `be-09-heart-cleanser` and `be-09-bump`; the purchase write to 6972552 is unchanged. ⛔ So the confirmation Campaign must live on 6972552 only — a Campaign on 6972554 triggered by `be-09-heart-cleanser` would send her the confirmation twice.
