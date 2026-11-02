# 11-T4 — Delivery email *(The Unsent Letter — "your letter is written out")*

| | |
|---|---|
| **Subject** | `%FIRSTNAME% — your letter is written out` — ⛔ word for word what [`11-T1`](../booking-page/11-T1-thank-you-page.md) and [`11-T3`](11-T3-confirmation.md) told her to watch for |
| **Trigger** | AWeber Campaign, tag applied: `be-11-delivered` *(proposed)*. Wait: none. The tag and `reading_url` are set in the same call |
| **Carries** | the link to her PDF, custom field `reading_url`, written here as `{{AWEBER_READING_URL}}`. One PDF per buyer (11-D) |
| **Purpose** | The envelope. Hand it over, give the one instruction that stops a refund, point at the fork, one line of admin. **Sells nothing. Summarises nothing** |

---

<!-- BEAT 1 · the subject she was told to expect -->

**Subject:** %FIRSTNAME% — your letter is written out

**Preheader:** Start at card one. One thing before you open it.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · the handover, one line -->

It's written out. **[Open your reading here]({{AWEBER_READING_URL}})**

<!-- BEAT 3 · the one instruction that prevents a refund -->

One rule before you do. **Start at the first card and read in order.** The letter's on the last page and you'll want to go straight to it. Don't. It only comes back whole.

<!-- BEAT 4 · the low point, inoculated, and T3's loop closed by POINTING -->

Cards seven to nine are the hardest part. Don't stop there. The fork I told you about is settled in those three, so that's where your answer is.

<!-- BEAT 5 · the no-contact line, at the moment it matters -->

When you've read it, you don't reply to anyone. If this person hurt you, you owe them no reply.

Read it when you've got the house to yourself.

<!-- BEAT 6 · one line of admin -->

If the link won't open, reply to this email and I'll send it another way.

<!-- BEAT 7 · sign-off. No CTA, no next offer -->

They've had it long enough, dear.

— Evelyn

## Build notes

- **The subject is copied, not written.** ⚠ In AWeber the first-name merge in the subject is typed by hand. Use the `"dear"` fallback so it matches T3's box.
- **The refund-stopping instruction.** The buyer most likely to ask for her money back is the one who skips to the letter and finds it doesn't land, or who stops at the low point. So both warnings go in the envelope, before the copy inside that would have stopped her.
- **Cards seven to nine** comes from 11-DELIVERABLES, Act 3: the low point, with "Giving it back, or trying to get you back?" answered there. ⚠ If the product moves that answer, change this line.
- **The loop closes by pointing.** It says where the answer is and stops. Saying which way it went here would be the most expensive line in the email.
- **No free gift.** 0-WORKFLOW-11 C2 says to name one, but 11-DELIVERABLES has none, and it wins. The letter is the thing she reads to the end for.
- **No bump mention.** This goes to every buyer. Bump buyers find it on the last page of the PDF, see `11-C3`. Her T1 P.S. told her.
- **The sign-off is the letter's own last line.** It sells nothing.
- **No times of day.** Delivery can land at any hour.
- **`%FIRSTNAME%` × 2**, subject and salutation.
- ⛔ **Not said here:** what they took, whether they'll act, which way the fork went. Every answer in this email is a reason not to open the PDF.
