# 04-T5 — Still Cup email *(the bump, delivered)*

| | |
|---|---|
| **Subject** | `Your Still Cup is ready` — transactional and searchable |
| **Trigger** | AWeber Campaign, tag applied: `be-04-bump`. Wait: 10 minutes, so it lands after `04-T3`, not on top of it |
| **List** | `theseerwithin_be_customer` (`AWEBER_BE_CUSTOMER_LIST_ID`) |
| **Carries** | the Still Cup page, a fixed URL: `https://theseerwithin.com/offers/wiccan/tea-reading/still-cup`. No custom field |
| **Purpose** | Gives the link back to the bump buyer who closed the receipt page. Start tonight, four minutes, before the reading arrives. **Sells nothing** |

---

<!-- BEAT 1 · transactional subject -->

**Subject:** Your Still Cup is ready

**Preheader:** Four minutes, starting tonight. Keep this email for the link.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · the handover, one line -->

Here's your Still Cup, so the link's somewhere you can find it again. **[Open the Still Cup here](https://theseerwithin.com/offers/wiccan/tea-reading/still-cup)**

<!-- BEAT 3 · start tonight, before the reading -->

Start it tonight. Don't wait for your reading to arrive. The hours before it lands are exactly what the Still Cup is for, and tonight's the evening you're most likely to send him something.

<!-- BEAT 4 · four minutes, nothing to buy -->

Four minutes is all it takes, tonight and then every evening of your twenty-one days. You'll need a cup, a kettle and some tea, and nothing else.

Read the page through once now, so you're not reading instructions at nine o'clock with the kettle on.

<!-- BEAT 5 · one line of admin -->

If the page won't open, reply to this email and I'll send it another way.

— Evelyn

## Build notes

- **Why this email exists.** The receipt page shows bump buyers the link, but a woman who closes that page loses it. The Still Cup was sold as *tonight*, so losing the link loses the product. This puts it in her inbox where she can find it again.
- **Subject is a receipt.** She will search for *"Still Cup"*. No hook, no first name.
- **The 10-minute wait** is so it arrives after the confirmation (`04-T3`), not in the same second. `be-04-bump` and `be-04-tea-reading` are applied together at purchase, so with no wait the two land at once and the order is random. Ten minutes still gets it to her well before evening for most buyers. If the operator prefers none, nothing in the copy breaks.
- **"Start it tonight … before your reading arrives"** is the bump's whole pitch (`04-C3` beat 4, `04-C4`'s first line) and the practical form of T3's *"Don't send it tonight"*. *"Tonight's the evening you're most likely to send him something"* ties the two together without repeating T3. It promises nothing about when the reading arrives.
- **It does not teach the practice.** The page does that. The email names only what she needs (cup, kettle, tea) so she can check now and isn't hunting at nine. ⚠ Nothing about what to send him — that is the paid reading, and the bump must never drift into it (`04-C3` build notes).
- **"Read the page through once now"** is the one practical instruction: it gets the reading-the-instructions part out of the evening, so the four minutes are four minutes.
- **One line of admin**, same as `04-T4`.
- **No weekday.** `04-C3`'s *"nine o'clock on a Tuesday"* was not reused; *"nine o'clock"* alone keeps the picture.
- **`%FIRSTNAME%` × 1**, salutation only (`"friend"` fallback).
