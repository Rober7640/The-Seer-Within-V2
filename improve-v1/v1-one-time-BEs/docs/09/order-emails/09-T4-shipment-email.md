# 09-T4 — Shipment email *("your charm has shipped")*

| | |
|---|---|
| **Offer** | 09 the Heart Cleanser Love Charm — a physical charm, not a reading |
| **Sends** | when we mark the order shipped, from a second AWeber Campaign on the backend customer list, triggered by 09's shipped tag. Never at purchase |
| **Slots** | `{{AWEBER_TRACKING_URL}}` — placeholder for the tracking-link custom field. Not real AWeber syntax |
| **Register** | short. It's on its way, here's the link, here's what to do when it lands |
| **Workflow name** | the 09 checklist calls this `09-T4-delivery-email`; this file is the same asset |

⚠ It does not re-run the letter. She has read the left wrist, the pink quartz, the capsule and the
seven words already. The ritual gets one short run-through, as steps.

---

**Subject:** Your Heart Cleanser Love Charm has shipped

**Preheader:** Here's your tracking link, and what to do when it arrives.

---

Dear %FIRSTNAME%,

Your Heart Cleanser Love Charm is on its way to you.

**[Track your charm here]({{AWEBER_TRACKING_URL}})**

Now that it's shipped, it arrives in **7–14 days** in the US and **2–4 weeks** everywhere else.

### When it arrives

Before you wear it, give yourself a few quiet minutes.

Open the capsule and write your wish on one of the papers. Place the paper inside and close the capsule.

Hold the charm in your left palm and say the seven words: **"I am ready to receive love, too."**

Then put it on your left wrist.

The card in the box has these steps too. Keep the spare papers for the day you want to write your wish again.

If your parcel arrives damaged, or doesn't arrive, write to hi@theseerwithin.com. You can also read [our refund policy](https://theseerwithin.com/refund).

Enjoy that first morning with it on your wrist, dear.

— Evelyn

## Build notes

- **Subject matches `09-T1` Beat 8 and `09-T3` Beat 5 word for word.** Change all three together.
- **One functional link plus support.** The tracking link and the refund policy. No offer, no
  teaser, no next product. The support address is plain text (email clients link it), because a
  markdown `mailto:` link prints the address twice in the plain-text part.
- **`{{AWEBER_TRACKING_URL}}` is a placeholder**, swapped from AWeber's custom-field picker when the
  Campaign is built. The renderer warns about it on every run. No carrier or tracking number is
  invented.
- **The arrival window is restated here**, unlike 06-T4, because 09's windows count from dispatch
  (Joel, 2026-09-15) — this is the email sent at dispatch, so it is the one place the window is
  exactly true.
- **The ritual is steps, not story:** open, write, place, close, left palm, seven words, left wrist.
  No "why the left", no pink quartz meaning, no "too" passage — all of that stays in the letters.
  "Open the capsule" says nothing about how it opens; the card will (`09-B3`, once the unit is
  checked).
- **"Keep the spare papers"** follows from the settled contents (blank wish papers, plural). No count
  stated.
- **No price, no $ anywhere.**
- **Email body paragraphs are one line each in this file** so the `.txt` part doesn't carry hard
  line breaks from the source.
- **`%FIRSTNAME%` × 1**, salutation only (falls back to "friend").
- **Rendered with** `node improve-v1/v1-one-time-BEs/scripts/render-be-email.mjs improve-v1/v1-one-time-BEs/docs/09/09-T4-shipment-email.md`.
