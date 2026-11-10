# 11-C3 — Order bump *(Closing the Door)*

| | |
|---|---|
| **Offer** | 11 The Unsent Letter |
| **Price** | $12.77, added to the $35 at checkout |
| **Renders** | on [`11-C1`](11-C1-booking-page.md), above the total, from the start. It's the only box on the page and it's optional. ⛔ **Never pre-checked.** A pre-selected paid add-on is a negative option under FTC and card-network rules |
| **Voice** | Hers, first person |
| **Product code** | `closing_the_door` (in `shared/backendOffers.ts`). ⚠ It needs its own code: the fulfilment robot matches on exact text, so a reused code sends the wrong thing |
| **Stripe line item** | Closing the Door |
| **Adjacency** | 11 gives back what was taken. The bump shuts the way it left |
| **Deliverable** | ✅ A one-page ritual, [`11-C4`](11-C4-closing-the-door.md) (written 2026-11-06). The last page of her PDF, on its own page. Proven on n8n run 52613 |
| **Component** | [00e §4](../../00e-FRAMEWORK-BEs.md) |

---

## The copy

<!-- BEAT 1 · YES + benefit + permanence -->

**☐ Yes, I want that door shut for good · +$12.77**

<!-- RULE 3 · names the main offer's limit, BEAT 2 · named mechanism, BEAT 3 · what's left open, BEAT 4 · ease -->

The letter gives me back what's mine. Shutting the door they left by is my job. **Closing the Door** is one page, done once, after I've read the letter. Nobody sees it, and I don't write to anyone.

---

## Thank-you page line, bump buyers only

Lives in [`11-T1`](11-T1-thank-you-page.md).

---

## Build notes

- **Why it's short.** It sits above the total, so it's a label and two lines, like 04's. It adds about 120px with the total, see `11-C1`.
- **Rule 1, adjacent.** The reading hands it back. The bump deals with the way it went. They don't compete.
- **Rule 2, she does it herself.** The upsells are things Evelyn does or ships. This is one page she does alone.
- **Rule 3, the limit is the first line.** It says the letter can't shut the door, without saying the letter falls short. "It comes back when you read it" stays true: the door is a separate job.
- **Rule 4, it protects the product.** It picks up the product's last line: "It's back. What you do with it is on you."
- **Timing lives on the label.** "After I've read the letter" stops her doing it first. It's also why T1 can't hand it over the way 02 does: she has nothing to read yet.
- **How it reaches her (decided 2026-11-06: the last page of her PDF, automatic, the bump stays paid).** T3 and T4 go to every buyer, so neither can carry it. I've assumed it's the last page of her PDF, which works because there's one PDF per buyer (11-D). T1 says so. If that's wrong, change T1.
- ⛔ **Notes for whoever writes 11-C4.**
  - No contact: no letter sent, no call, no looking them up, nothing that needs them.
  - The reading's last card gives "the one thing to do". This must be a different thing.
  - Keep clear of the other bumps: 02 is salt and a threshold, 03 burns, 04's old bump was nightly, 05 is a written audit. A "door" sits close to 02's threshold, so it needs care.
  - "One page, done once" is promised above. Change one, change both.
