# 08-Marcus — Audio order confirmation email

| | |
|---|---|
| **Offer** | 08 Marcus Stone — audio narration of the written reading on `{{QUESTION}}` · price `{{AUDIO_PRICE}}` (undecided until D3, never a literal number) |
| **Sends** | once, on verified audio purchase. Separate from `ORDER-CONFIRMATION.md`, which has already sent or is sending. **It sells nothing** |
| **What it is** | the same written reading, read aloud by Marcus. Same cards, same order. It never implies the written reading is short without it |
| **Timing** | the written reading never waits for the audio. The audio may land in its own email, separately |
| **Register** | Marcus, second note, shorter than the first. Folds the second item in the way `copy/06/06-T3-confirmation-email-with-U1.md` does — one order, two pieces — without joining their timelines |
| **Words** | the written reading is always "the written reading" or "the written one". The audio is "the recording", a file she downloads. "The page" on its own is never used |
| **Revision** | draft 5 — D3 download wording, passed `COLD-READ-05.md` |

---

<!-- BEAT 1 · transactional subject. A receipt. No emoji -->

**Subject:** Your audio is confirmed — {{QUESTION}}

**Preheader:** Same reading, read aloud. Same cards, same order.

---

%FIRSTNAME%,

<!-- BEAT 2 · thanks as HER judgement — a second good call, on top of the first, never instead of it -->

Marcus again. The audio you added and paid for is confirmed.

Some readings get read once and put in a drawer. One you can hear gets played on a walk, in the car, at the sink. Now you've got that one as well.

<!-- BEAT 3 · what the second item is, plainly. Never "the written one is incomplete without it" -->

Here's what it is, so there's no surprise. It's me reading your written reading out loud. Same cards. Same order. Nothing is in the audio that isn't in the written one, and nothing from the written one is missing from the audio. The written one stands on its own. This is the same thing in my voice.

<!-- BEAT 4 · the timelines, kept apart. The written deadline is restated; the audio has none stated -->

The written reading comes first, inside **{{DEADLINE_HOURS}} hours**, as I said. The audio doesn't hold it up. The audio comes to {{DELIVERY_EMAIL}} in its own email, titled *Your audio is ready — {{QUESTION}}*, with a link to download the recording. It may land after the written one. That's normal.

<!-- BEAT 5 · open a small loop — the same "your card" loop, heard instead of read. Her card explained in one clause -->

In the written reading you'll see which tarot card is yours — the one your name points to. On the audio you'll hear me say it. Hearing your card named is not the same as reading its name.

<!-- BEAT 6 · wait-filler, practical. "Nothing new" — the first email gave her one thing to do -->

Nothing new to do while you wait, %FIRSTNAME%. Read the written one when it lands. When the audio comes, put the written one down and listen.

If you want it sent to a different address, or need help, write to {{SUPPORT_EMAIL}}.

Marcus

---

## Build notes

- **A second email, not a branch of the first.** `ORDER-CONFIRMATION.md` sends on the main payment regardless. This one sends only on a verified audio purchase, whenever that is. It must read as "a second note from the same man", so beat 2 opens "Marcus again."
- **It confirms a purchase.** "The audio you added and paid for is confirmed." Readers of draft 2 could not tell whether she had paid or been given it. Still no price.
- **The audio is on top of the written, never instead of it.** "Now you've got that one as well." Nothing in beat 2 can be read as "you chose audio over written".
- **Same-content claim is said from the audio's side, both directions.** Nothing in the audio the written one lacks; nothing from the written one missing from the audio.
- **No price in the body.** `{{AUDIO_PRICE}}` is undecided (D3). It lives in the header table for the builder. Never write a number.
- **No audio deadline is stated.** The only deadline fact we have is the written one (`{{DEADLINE_HOURS}}`). The audio is "in its own email" and "may land after". Do not add an hours figure for the audio.
- **The written reading is never made smaller.** "Stands on its own", "nothing left out of the written one", "same thing in my voice". No "the full reading", no "the complete version", no "you'll get more from it".
- **One word, one job.** "The page" is never used on its own. Written = "the written reading" / "the written one". Audio = "the recording" / "a link to download the recording".
- **The subject is a receipt.** `Your audio is confirmed — {{QUESTION}}`. Same pattern as the main confirmation so the two sit together in her inbox search.
- **The title promised in beat 4 must match `AUDIO-DELIVERY.md`'s subject exactly.**
- **The loop is the same one as the main confirmation, heard instead of read.** It does not open a second loop that would need a second close. Her card gets its one-clause explanation here too — she may open this email without having read the first.
- **`%FIRSTNAME%` × 2** — salutation and beat 6. Cap is three.
- **Body length:** under 220 words (see track report).
