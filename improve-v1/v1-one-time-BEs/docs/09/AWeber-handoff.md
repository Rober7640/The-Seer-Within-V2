# 09 — AWeber handoff

## Email 1
Subject: Wear this on your left wrist, {{ subscriber.first_name | capitalize }}
HTML: [09-E4-esl-v1-evelyn.html](09-E4-esl-v1-evelyn.html)
Text: [09-E4-esl-v1-evelyn.txt](09-E4-esl-v1-evelyn.txt)

## Email 2
Subject: Before you put his name inside, read this
HTML: [09-E4-esl-email-2-evelyn.html](09-E4-esl-email-2-evelyn.html)
Text: [09-E4-esl-email-2-evelyn.txt](09-E4-esl-email-2-evelyn.txt)

Use these HTML files, not the -preview files. Supply the matching plain-text part separately.

## Remaining send dependency
The offer-page URL has been requested. Replace only the literal {{OFFER_URL}} token in both HTML and text files; preserve the tracking query and AWeber subscriber tags. Until this is supplied, these are not send-ready.

## Implemented
- Existing 02 Evelyn shell, branding and postal footer.
- AWeber {{ subscriber.first_name | capitalize }} personalization.
- Both footer actions use {{ subscriber.unsubscribe_link }}, AWeber's documented destination for unsubscribe/change-details. No test-email footer URLs.
- Public HTTPS JPEG product photos and animated GIF; URLs recorded in hosted-assets.json and verified HTTP 200.
- Static photos: 300px desktop, 240px mobile; demo: 280px.
- No sample name, review notice, local image paths, or price in the email files.
- Four CTA slots per email: 1–4 and 21–24. One charm, $59 on the offer page only.
- Table-based layout, inline core styles and Outlook fixed-width wrapper.

AWeber reference: https://docs.aweber.com/message-editors/dynamic-content/personalization/personalization-variable-list

No broadcast uploaded, scheduled, or sent. Browser verification is not an AWeber seed-send or Outlook-client test. Postal address follows 02 exactly.
