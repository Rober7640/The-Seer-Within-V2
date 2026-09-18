# 08-Marcus — Order confirmation email

| | |
|---|---|
| **Offer** | 08 Marcus Stone — written reading on `{{QUESTION}}` · $35 main · optional speed upgrade +$12.77 |
| **Sends** | once, on verified main payment, whatever she does next (audio or not). **It sells nothing** |
| **Deadline** | `{{DEADLINE_HOURS}}` = 12 if she bought the speed upgrade, 24 if not. `{{DUE_AT_LOCAL}}` = that clock time in her zone |
| **Register** | Marcus at the table. Short, plain, objects and actions. He has her details; he says so once and never repeats them |
| **Shape** | `copy/02/02-T3-confirmation-email.md` — six beats. The beat shape is copied, not the words |
| **Revision** | draft 4 — passed `COLD-READ-04.md` (four rounds; see `COLD-READ-01..04.md`). She does not remember the daily letter, so the spread and her card each get a one-clause explanation on first mention. Cap raised 220 → 250 → 265 across rounds 2 and 4 because the explanations she needed cost words |

---

<!-- BEAT 1 · transactional subject. A receipt she can search for, not a hook. No emoji -->

**Subject:** Your reading is confirmed — {{QUESTION}}

**Preheader:** I have what I need. {{N_PAID}} cards, inside {{DEADLINE_HOURS}} hours.

---

%FIRSTNAME%,

<!-- BEAT 2 · thanks as HER judgement -->

Marcus. Your reading's confirmed.

A lot of people read the free cards, nod, and leave the rest face down. You didn't. Good.

<!-- BEAT 3 · work has begun. He has what he needs — said once, nothing echoed back. The spread explained in one clause. The order of work stated ONCE, in the future tense: find her card, then turn the paid cards. Her card = one more card, found from her name, not drawn by chance -->

You gave me your name and your date of birth. That's everything I need. The date does its own job in the reading.

The {{SPREAD_NAME}}, the shape I laid the cards in this morning, is still on my table. The {{N_PAID}} you paid for are still face down. Before I turn them, I'll find one more card: your own, found from your name, not drawn by chance. Then I'll turn the {{N_PAID}}, with your card laid beside them.

<!-- BEAT 4 · restate the deadline. Names "the reading" (never a bare "it" after the card sentence). Clock tied to payment. The title sits last with no full stop after it, and must match WRITTEN-DELIVERY's subject word for word -->

You'll have the reading inside **{{DEADLINE_HOURS}} hours** from your payment, so by {{DUE_AT_LOCAL}}. The {{N_PAID}} and your card, written out, in the order they get turned. It comes to {{DELIVERY_EMAIL}} as a link, in an email titled *Your reading is ready — {{QUESTION}}*

<!-- BEAT 5 · open a loop the delivery closes. Honest to the timeline: he hasn't found her card yet (beat 3 is future tense, so this is consistent) -->

One thing I'll tell you now. I don't know yet which card your name points to. I'll know before the first of the {{N_PAID}} is turned, and I'll name it in the reading. Not here.

<!-- BEAT 6 · a short wait-filler. Practical, about the free cards in the email she bought from — named so it cannot be this email. Sells nothing -->

While you wait, %FIRSTNAME%, one thing to do. Go back to the email with the cards you've already seen, the one you bought this reading from. Look at the pictures, not the words under them. Find one thing you didn't see the first time. There's always one. It's small, and it was there the whole time. When the reading lands, do the same with every card in it.

If you want it sent to a different address, or need help, write to {{SUPPORT_EMAIL}}.

Marcus

---

## Build notes

- **It sells nothing.** No booking link, no audio mention, no next offer. The audio has its own confirmation (`AUDIO-ORDER-CONFIRMATION.md`) and this email does not know whether she bought it.
- **The subject is a receipt, not a hook.** `Your reading is confirmed — {{QUESTION}}`. No emoji, no first-name-first. She is expecting it, and support will ask her to find it later. Do not "improve" it. (Cold read: all three readers first glanced at the question as Marcus asking it, then settled on "the title of what I bought". Accepted.)
- **She does not remember the daily letter.** Every first mention carries its own clause: the spread is "the shape I laid the cards in this morning"; the free cards live in "the email with the cards you've already seen, the one you bought this reading from" — named so it cannot be read as this email or a paper letter.
- **Her card: count and origin settled in ONE place, beat 3.** "One more card: your own, found from your name, not drawn by chance … with your card laid beside them." That is the whole explanation — never letters, numbers, or how. Beat 5 does not repeat the count.
- **The order of work is said once, in the future tense.** "I'll find … Then I'll turn …" Present-tense "I find" read as already done and contradicted "I don't know yet". Do not change it back.
- **The deadline is one merge field, not two sentences.** `{{DEADLINE_HOURS}}` carries the 12/24 difference. Do not write "12 hours" or "24 hours" as a literal, and do not add a line about the speed upgrade — the price difference lives in the header table for the builder, not in the body.
- **He has her details and says so once.** "Your name and your date of birth" — never the birth name itself, never the date itself. This email only confirms he has what he asked for.
- **The loop is opened, not closed.** "I don't know yet which card your name points to … I'll name it in the reading." `WRITTEN-DELIVERY.md` closes it by pointing at the reading, never by naming the card in an email. ⚠ This assumes the PDF names her personal card. Verify against the report build before send.
- **Nothing sounds posted.** The reading "comes as a link". The habit is named by the sentences around it (look at the pictures, find one thing, there's always one) and the ask is "do the same with every card in the reading" — not "when the cards come".
- **The title promised in beat 4 must match `WRITTEN-DELIVERY.md`'s subject exactly.** If one changes, change both.
- **The support line never tells her the address she is reading at is wrong.** "If you want it sent to a different address".
- **`%FIRSTNAME%` × 2** — salutation and mid-sentence in beat 6. Cap is three.
- **The deadline names the thing and its reason.** "You'll have the reading inside {{DEADLINE_HOURS}} hours from your payment, so by {{DUE_AT_LOCAL}}." A bare "it" after the card sentence read as "the card by 9:40"; a bare clock time made readers ask why.
- **Body length:** under 250 words (see track report for the count).
