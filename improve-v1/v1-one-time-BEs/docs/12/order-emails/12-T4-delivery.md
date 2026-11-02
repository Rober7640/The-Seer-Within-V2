# 12-T4 — Delivery email *(Lucky Numbers — "your lucky numbers are worked out")*

| | |
|---|---|
| **Subject** | `%FIRSTNAME% — your lucky numbers are worked out` — ⛔ word for word what [`12-T1`](../booking-page/12-T1-thank-you-page.md) and [`12-T3`](12-T3-confirmation.md) told her to watch for |
| **Trigger** | AWeber Campaign, tag applied: `be-12-delivered` *(proposed, code only)*. Wait: none. The tag and `reading_url` are set in the same call |
| **Carries** | the link to her PDF, custom field `reading_url`, written here as `{{AWEBER_READING_URL}}` |
| **Purpose** | The envelope. Hand it over, give the instruction that stops a refund, point at the stop-number, one line of admin. **Sells nothing. Summarises nothing** |

---

<!-- BEAT 1 · the subject she was told to expect -->

**Subject:** %FIRSTNAME% — your lucky numbers are worked out

**Preheader:** Start on the first page. One thing before you open it.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · the handover, one line -->

They're worked out. **[Open your reading here]({{AWEBER_READING_URL}})**

<!-- BEAT 3 · the instruction that prevents a refund -->

One thing before you use any of it. **Check your name and date on the first page.** If either one's wrong, every number after it is wrong too. Reply to this email and I'll work them out again.

Then start with your three lucky numbers. Your six, your PIN and your days are all built from them, so they make sense in that order.

<!-- BEAT 4 · T3's loop closed by POINTING -->

The number to stop using is near the end, with where to look for it. Have that scrap of paper beside you when you get there.

<!-- BEAT 5 · the promise, at the moment it matters -->

And you made me a promise. Play your numbers the way you always would. Don't spend money you need.

<!-- BEAT 6 · one line of admin -->

If the link won't open, reply to this email and I'll send it another way.

<!-- BEAT 7 · sign-off, the letters' own. No CTA, no next offer -->

Your friend, with a pen ready for your calendar,

— Evelyn

## Build notes

- **The subject is copied, not written.** ⚠ In AWeber the first-name merge in the subject is typed by hand. Use the `"dear"` fallback so it matches T3's box.
- **The refund-stopping instruction is the name and date check.** A buyer who typed her birth name wrong gets numbers that don't match the first number she worked out herself from the letter. That's the refund. So the first job is to check, and the fix is a reply.
- **"Start with your three"** stops the buyer who skips to the dates and finds nothing that explains them.
- **The loop closes by pointing.** It says where the stop-number is, and stops.
- **"That scrap of paper"** is T3's job. A buyer who skipped T3 still understands it.
- **No bump mention.** This goes to every buyer. Bump buyers find The Full Year on the last page. T1's P.S. told them.
- **No win, no sum, no date.**
- **`%FIRSTNAME%` × 2**, subject and salutation.
