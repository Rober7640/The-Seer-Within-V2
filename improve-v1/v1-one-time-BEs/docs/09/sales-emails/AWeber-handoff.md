# 09 — AWeber handoff

## Email 1
Subject: Wear this on your left wrist, {{ subscriber.first_name | capitalize }}
HTML: [09-E4-esl-v1-evelyn.html](09-E4-esl-v1-evelyn.html)
Text: [09-E4-esl-v1-evelyn.txt](09-E4-esl-v1-evelyn.txt)

## Email 2
Subject: Before you put his name inside, read this
HTML: [09-E4-esl-email-2-evelyn.html](09-E4-esl-email-2-evelyn.html)
Text: [09-E4-esl-email-2-evelyn.txt](09-E4-esl-email-2-evelyn.txt)

## Email 3 — selected replacement, 2026-09-16
Subject: She wrote his name. Then he called.
Source: [09-E5-email-3-anna-story.md](09-E5-email-3-anna-story.md)
Structure: item → Anna/Daniel fictional results-based story → item.
Tracking: `c=51–52`; confirmed offer URL in source.
HTML: [09-E6-esl-email-3-anna-evelyn.html](09-E6-esl-email-3-anna-evelyn.html)
Text: [09-E6-esl-email-3-anna-evelyn.txt](09-E6-esl-email-3-anna-evelyn.txt)
Built 2026-09-16 in email 2's exact shell, fictional-story framing intact (twice, in both parts). Image: the unbranded studio close-up (`rosequartz-page-570.jpg`), placed where the letter points at the capsule; 240px on mobile, 300px on desktop, verified loading at 390px and 700px.

### Superseded — DELETED 2026-09-16
The earlier Fold the Paper (c=31–33) and Leave the Date Off (c=41–43) versions, and their HTML/text builds, were deleted at Joel's instruction. Nothing to upload; `c=31–33` and `c=41–43` are free again.

⛔ **Two superseded drafts live in this folder — do not upload them.** `09-E4-esl-v1-left-wrist.html` is an earlier build of email 1 and still contains four unreplaced `{{OFFER_URL}}` links; `09-E2-esl-v1.md` is an earlier copy draft of the same email. Email 1 is `09-E4-esl-v1-evelyn.html` + `.txt`.

Use these HTML files, not the -preview files. Supply the matching plain-text part separately.

## Remaining send dependency
Offer URL wired: https://theseerwithin.com/offers/heart-cleanser (c=1–4 email 1, c=21–24 email 2, c=51–52 email 3). Still not send-ready: the offer page and checkout are not built or deployed, and no AWeber draft, seed test or purchaser suppression exists.

## Implemented
- Existing 02 Evelyn shell, branding and postal footer.
- AWeber {{ subscriber.first_name | capitalize }} personalization.
- Both footer actions use {{ subscriber.unsubscribe_link }}, AWeber's documented destination for unsubscribe/change-details. No test-email footer URLs.
- Public HTTPS JPEG product photos and animated GIF; URLs recorded in ../product/hosted-assets.json and verified HTTP 200.
- Static photos: 300px desktop, 240px mobile; demo: 280px.
- No sample name, review notice, local image paths, or price in the email files.
- Tracking: email 1 = 1–4, email 2 = 21–24; selected email 3 = 51–52 (build pending). One charm, $59 on the offer page only.
- Table-based layout, inline core styles and Outlook fixed-width wrapper.

AWeber reference: https://docs.aweber.com/message-editors/dynamic-content/personalization/personalization-variable-list

No broadcast uploaded, scheduled, or sent. Browser verification is not an AWeber seed-send or Outlook-client test. Postal address follows 02 exactly.
