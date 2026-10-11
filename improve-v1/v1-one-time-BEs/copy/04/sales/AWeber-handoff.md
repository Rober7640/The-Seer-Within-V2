# 04 — AWeber handoff (The Turn sales emails)

Updated 2026-10-11. Build: `python3 build-04-sales.py all` from this folder, or one stem at a time.
Never hand-edit the HTML or the .txt: change the `.md` (or the subject choice in the script), rebuild.
Output: `html/<stem>.html` + `html/<stem>.txt`. Send-ready copies: `~/Desktop/04-tea-reading-emails/sales/`.

⛔ Don't send before the developer switches 04 on. The booking page and its $35/$45 price test are
dark until then.

## The sequence

Approved by the operator 2026-10-11: email 1 → the RE: email → email 2. Each email stands alone;
only the RE: email points back (its opening line, on purpose).

| Order | Stem | First line (after the greeting) | Subject (WORKING choice) | Preheader | Links |
|---|---|---|---|---|---|
| 1 | `04-S1-your-bridge-week` | "I saw your bridge week in the tea leaves." | (a) 🌉 {{ subscriber.first_name \| capitalize }}, your bridge week is coming | For a few days in your next three weeks, what you say lands as an invitation, not pressure. | `c=61` text · `c=62` button · `c=63` P.S. |
| RE: | `04-S4-re-your-bridge-week` | "I'm writing to you about this a second time, on purpose." | RE: 🌉 {{ subscriber.first_name \| capitalize }}, your bridge week is coming | The short version, in case it got buried. | `c=91` text · `c=92` button |
| 2 | `04-S2-two-months-not-three-weeks` | "He started pulling away about two months ago." | (a) 🕊️ {{ subscriber.first_name \| capitalize }}, when did he really start pulling away? | It started about two months ago. That's why nothing has worked, and why the timing matters now. | `c=71` text · `c=72` button · `c=73` P.S. |

`04-S3-the-message-you-havent-sent` was NOT approved. The builder refuses it (`--draft` overrides).

### ⚠ Subjects are a working choice, not the operator's pick

The operator hasn't picked yet. Every build uses option (a); the RE: email always takes "RE: " +
email 1's subject. To change: set the letter in `WORKING_SUBJECT` in `build-04-sales.py`, rebuild.
The RE: subject follows email 1 by itself.

Alternates:

- **Email 1:** (b) 😶 Why does everything you say to him land wrong? · (c) 🔮 {{ subscriber.first_name | capitalize }}, I saw the week to speak to him · (d) 🤐 Before you text him again, read this
- **RE: email:** "RE: " + whichever email-1 subject is chosen (all four are listed in `04-S4-re-your-bridge-week.md`)
- **Email 2:** (b) 🤔 Why hasn't anything you've tried with him worked? · (c) ⏪ It didn't start three weeks ago · (d) 📅 {{ subscriber.first_name | capitalize }}, count back two months

## Suggested timing (operator to confirm)

| Day | Send | To |
|---|---|---|
| 0 | Email 1, at the 6:30pm SGT slot | the lists below |
| 1 | The RE: email, 6:30pm SGT | only people who did NOT open email 1: AWeber's "didn't open" segment on the email-1 broadcast |
| 3 | Email 2, 6:30pm SGT | the lists below |

Apple Mail's privacy feature marks many unread emails as opened, so the "didn't open" segment is
smaller than the real number of non-readers. That's fine for a RE:, just don't read its size as a
read rate.

## Who gets it

- **Lists:** `theseerwithin_free` + palm + tarot, the same as 09, unless the operator says otherwise.
- ⛔ **Never schedule to the customer list 6972552.**
- **Exclude everyone who has bought 04, from every send.** When she pays, she gets the tag
  `be-04-tea-reading` on the customer list 6972552 (`server/lib/backendCustomerList.ts`).
  - 6972552 also holds 02, 03, 06 and 09 buyers, told apart only by tag. Exclude by the
    `be-04-tea-reading` tag, not the whole list, or past buyers of other offers drop out too.
  - ⚠ The tag sits on her 6972552 record, not on her record in the free, palm or tarot list.
    The developer must confirm how AWeber excludes another list's subscribers (or a tag on
    another list) from a broadcast, and test it with a seed contact that has bought, before the
    first send.

## Before upload

1. **Upload the photo** (from the repo root):
   `node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file improve-v1/v1-one-time-BEs/docs/04/product/images/esl/esl-cup-640.jpg evelyn/backend-04/esl-cup-640.jpg`
   All three emails point at
   `https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/backend-04/esl-cup-640.jpg`.
   Check the URL the script prints is that exact URL with GET 200. ⛔ Never a key under `evelyn/tarot/`.
2. **Test `{{ subscriber.first_name | url_encode }}` in a seed send.** Every offer link carries
   `fn=` with it, and nothing else in the estate uses that filter. Click a link in the seed: the
   URL should read `fn=<her name>` and the booking page should greet her by name. If AWeber rejects
   the filter or leaves it raw in the link, delete `&fn={{ subscriber.first_name | url_encode }}`
   from every link in the three `.md` files and rebuild. The booking page works without it and
   says "dear".
3. **Seed-test** on a phone, with images off (the alt text and the caption still say what the
   photo shows), and to a contact with no first name (the greeting, the P.S. and all three working
   subjects then show a bare comma, e.g. "🌉 , your bridge week is coming"; there is no fallback
   filter, same as every other email).
4. **Plain text:** paste each `.txt` as the plain-text part. AWeber's auto-text strips the links.
   The `.txt` writes out every link in full, and the photo's URL under its caption.
5. **Preheader:** already in the HTML (hidden). If AWeber's form has a preheader field, paste the
   same line from the table above.
6. **No price in any email.** The booking page runs a $35/$45 split test, so a price in an email
   would be wrong for half the readers. The builder fails on any `$` or a 35/45 in the copy.

## Link codes

`c=` lands in the Stripe metadata as `c` (`server/routes/backendOffers.ts`), so each sale names the
email and the link she clicked.

| Code | Email | Where |
|---|---|---|
| 61 | 1 | text link, end of "What your reading gives you" |
| 62 | 1 | button |
| 63 | 1 | P.S. |
| 91 | RE: | text link |
| 92 | RE: | button |
| 71 | 2 | text link, end of "What's in your reading" |
| 72 | 2 | button |
| 73 | 2 | P.S. |

⚠ 71–73 were the codes of the old abandon nudges (`04-E6`, now superseded). If those nudges ever
come back, give them new codes.

## What every build carries

- 09's Evelyn shell (`evelyn-shell.html`, lifted from `docs/09/sales-emails/09-E4-esl-v1-evelyn.html`):
  banner, postal footer, `{{ subscriber.unsubscribe_link }}` on both footer links, table layout,
  Outlook fixed-width wrapper.
- `{{ subscriber.first_name | capitalize }}` in the greeting (and the P.S. of emails 1 and 2).
- The cup photo: `docs/04/product/images/esl/esl-cup-640.jpg` (640×480, 117 KB), shown 540px wide,
  real alt text, caption from the `.md`.
- Links in #0000EE (footer included). The mid text link is bold and underlined; ONE solid button
  at the end, #5b2a6e, label from the `.md`; the P.S. link is text.
- Sizes (HTML): email 1 12.0 KB, RE: 6.9 KB, email 2 12.1 KB. Gmail clips at about 102 KB.
- The build stops, writing nothing, if the words in the HTML or the `.txt` differ from the `.md`,
  if a link differs from the `.md`, if there isn't exactly one button, if a merge tag other than
  first name / url_encode / unsubscribe appears, if any markdown is left over, if a price gets in,
  or if the HTML passes 100 KB.

## Sources

| Email | Copy | Notes (angle, facts, checks) |
|---|---|---|
| 1 | `04-S1-your-bridge-week.md` | its `## Notes` |
| RE: | `04-S4-re-your-bridge-week.md` | its `## Notes` |
| 2 | `04-S2-two-months-not-three-weeks.md` | its `## Notes` |

Superseded by this sequence (each carries a ⛔ line at the top): `04-E1-subject-lines.md`,
`04-E2-esl.md`, `04-E5-ladder-emails.md`, `04-E6-abandon-nudges.md`.

AWeber reference: https://docs.aweber.com/message-editors/dynamic-content/personalization/personalization-variable-list
