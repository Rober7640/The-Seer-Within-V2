# 04-T4 — Delivery email *(The Turn — "your cup is turned")*

| | |
|---|---|
| **Subject** | `%FIRSTNAME% — your cup is turned` — ⛔ word for word what `04-T1` and `04-T3` told her to watch for |
| **Trigger** | AWeber Campaign, tag applied: `be-04-delivered`. Wait: none. The tag and `reading_url` are set in the same call |
| **List** | `theseerwithin_be_customer` (`AWEBER_BE_CUSTOMER_LIST_ID`) |
| **Carries** | the link to her PDF, *Your cup is turned* — custom field `reading_url`, written in the spec as `{{AWEBER_READING_URL}}` |
| **Purpose** | The envelope. Hand it over, repeat the one instruction that stops a refund, point at the bird, name the rim calendar, one line of admin. **Sells nothing. Summarises nothing** |

---

<!-- BEAT 1 · the subject she was told to expect, twice -->

**Subject:** %FIRSTNAME% — your cup is turned

**Preheader:** Your twenty-one days are inside. One thing before you start.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · the handover, one line -->

Your cup's turned. **[Open your reading here]({{AWEBER_READING_URL}})**

<!-- BEAT 3 · the one instruction that prevents a refund. Repeats P1's "Three things to expect" -->

Before you open it, hear this part.

The first days of the twenty-one are quiet, and they'll feel like losing ground. Expect him to go quieter as well for a few days, before anything warms up. I've put that in the reading because it happens so often, and it's exactly where women give up on the sequence, around day five. Don't stop on day five.

<!-- BEAT 4 · close T3's loop by POINTING, not answering -->

And the bird. I told you it was the first thing I'd look at, and it took me longer than anything else in the cup. I turned the cup three times before I'd commit to where it sat. What I found is near the start, before the days begin, and it changes what the days are for. Read that part first, and slowly.

<!-- BEAT 5 · the free gift, named so she reads to the end. Not described -->

Then read right to the end. Your rim calendar is the last page, and I made it for you to keep.

<!-- BEAT 6 · one line of admin -->

If the link won't open, reply to this email and I'll send it another way.

<!-- BEAT 7 · sign-off. No CTA, no next offer -->

I'm glad you didn't leave it any longer, dear.

— Evelyn

## Build notes

- **The subject is copied, not written.** `04-T1` shows it in a box and `04-T3` names it word for word. If it differs by one word, the one thing she was told to check breaks. ⚠ In AWeber, the subject needs the first-name merge typed in by hand (the renderer only merges the body). Use the `"dear"` fallback so a buyer with no name gets *"dear — your cup is turned"*, which is exactly what `04-T3`'s box showed her.
- **The handover is one line, with the link in bold.** She opened this email for one thing. `{{AWEBER_READING_URL}}` is a placeholder, not syntax: swap it for the `reading_url` custom field from AWeber's own picker, in BOTH the HTML and the plain-text version. Per D7 there are three PDFs, one per cup, so `reading_url` is a lookup on her cup pick, not a per-buyer file.
- **The refund-stopping instruction is the quiet stretch.** P1's "Three things to expect" says women abandon the sequence on day five, and that he often goes colder first. A buyer who quits there asks for her money back before she reaches the page that would have stopped her. So it goes in the envelope as well, stated plainly: expect it, don't stop on day five. Every cup starts quiet (3, 6 or 9 days), so it is true for all three PDFs. It is an instruction, not a verdict — it tells her nothing the reading says about him.
- **The loop from `04-T3` is closed by pointing.** T3 said the bird is the first thing Evelyn looks at. This says where the answer is (near the start, before the days) and that it changes what the days are for, and stops. Saying *"two months, and not about you"* here would be the most expensive sentence in the email. *"Three times before I'd commit"* is P1's own detail, so the email and the PDF agree. ⚠ If the D5 rewrite moves or changes the bird section, re-check this paragraph.
- **The rim calendar is named, not described.** Its only job here is to get her past the last of the twenty-one days. Saying what is on it spends it twice. *"The last page"* is where it sits (D9: closing section of the same PDF).
- **"Before you open it, hear this part"** replaced a first draft that copied `02-T4`'s line word for word (copy-check flagged it as device variance). Same job, 04's own words.
- **One line of admin.** Reply to this email — the one route that works without a support address. No promotions-tab line: she is reading this email, so it already arrived.
- **The sign-off thanks her judgement again** (she booked while the leaves were soft) and sells nothing. This is the highest-goodwill moment in the funnel; the next offer is a separate send, at least 7 days later (D10).
- **No times of day.** Delivery is automated and can land at any hour, so there is no *"I finished a little after three"* — a clock time would be wrong for most buyers.
- **`%FIRSTNAME%` × 2**, subject and salutation. The body is short enough that more would read as merge.
