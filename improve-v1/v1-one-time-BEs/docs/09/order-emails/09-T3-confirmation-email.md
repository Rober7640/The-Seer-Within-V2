# 09-T3 — Confirmation email + wait-filler *(the Heart Cleanser Love Charm)*

| | |
|---|---|
| **Offer** | 09 the Heart Cleanser Love Charm — physical, $59, free worldwide shipping |
| **Sends** | immediately, from an AWeber Campaign on the backend customer list, triggered by 09's purchase tag. **It sells nothing** |
| **Slots** | `{{AWEBER_STRIPE_ORDER_ID}}` — placeholder for the list's `stripe_order_id` custom field, swapped in AWeber's picker when the Campaign is built |
| **Register** | a real physical wait: ships within 2 business days, then 7–14 days (US) or 2–4 weeks (elsewhere). She is hopeful and has days, maybe weeks, with nothing to do. The wait-filler gives those days a job: draft the wish |
| **Component** | [00e §5](../../00e-FRAMEWORK-BEs.md) |

---

<!-- BEAT 1 · transactional subject — a receipt she'll search for later, not a broadcast hook. -->

**Subject:** Your Heart Cleanser Love Charm order is confirmed

**Preheader:** Your charm ships within 2 business days. Here's what happens next.

---

Dear %FIRSTNAME%,

<!-- BEAT 2 · thanks as her good judgement, fresh words -->

Thank you for your order. You decided your own wish deserved a place, and you did something about it today. I'm glad you did.

<!-- BEAT 3 · work has begun — packing, in the present tense -->

Your Heart Cleanser Love Charm is confirmed, and we're getting it ready to pack.

### Your order

**Item:** one Heart Cleanser Love Charm

**Order reference:** {{AWEBER_STRIPE_ORDER_ID}}

**In the box:** your charm, pink quartz with its wish capsule; blank wish papers that fit the capsule; a printed card with the instructions and care notes; and a gift box to keep it in.

**Shipping:** free, to the address you entered at checkout.

<!-- BEAT 4 · the SLA, exactly as 09-C1 books it -->

### When it arrives

Your charm ships within **2 business days**. After that, it arrives in **7–14 days** in the US and **2–4 weeks** everywhere else.

<!-- BEAT 5 · P6 — what to watch for next, by exact subject (must match 09-T4 and 09-T1) -->

When it ships, I'll email you again with your tracking link. Look for this subject:

> Your Heart Cleanser Love Charm has shipped

Until then, there's nothing you need to do. If you spot a mistake in your address, or have any question about your order, write to hi@theseerwithin.com. You can also read [our refund policy](https://theseerwithin.com/refund).

---

<!-- BEAT 6 · THE WAIT-FILLER. Derived from 09's own wait: she has days before she can write the
     wish into the capsule, so she drafts it on ordinary paper and lives with the words first. -->

### While it travels, write a first draft

You have a few days before your charm reaches you, %FIRSTNAME%. Here's a good use for them.

Tonight, write your wish on any scrap of paper. The back of an envelope will do. Keep it short, because the papers in your box are made to fit inside the capsule.

Put the scrap somewhere you'll see it in the morning, next to the kettle or on your mirror. Read it once before you look at your phone.

Ask yourself two things. Does it still sound like you? And does it say how you want to feel, as well as who you're thinking of?

Change a word if you need to. Then read it again the next morning, and the one after that.

By the day your charm arrives, you'll have words you've lived with for a while. Copy them onto one of the wish papers, and the first time you close the capsule won't feel rushed.

---

I'll write again when your charm ships.

— Evelyn

## Build notes

- **Structure follows 00e §5:** thanks-as-judgement → work begun → SLA → what to watch for next →
  wait-filler → sign-off. Wording is new; no sentence lifted from 02-T3, 03-T3 or 06-T3.
- **Subject is transactional**, per Phase C1: no emoji, no first name, no curiosity. It must match
  `09-T1` Beat 8 word for word.
- **Shipping wording matches `09-C1`**, and copy-check's `OFFERS['09'].sla`. Windows count from
  dispatch.
- **No price in this email**, following 02/03/06-T3 and 09's own C1 checklist (item, order reference,
  shipping expectations, support). The receipt page shows the amount.
- **The wait-filler is derived from 09's wait, not lifted from 06's stone lore.** Her wait is days to
  weeks of wanting to start. The one thing she can't do yet is close the capsule; the one thing she
  can do is get the words right. It makes no claim about what the charm does. It echoes E3's "how you
  want to feel" question without re-running the letter.
- **"Keep it short, because the papers are made to fit inside the capsule"** says nothing about size
  or word count, because neither is confirmed.
- **The address-mistake line** asks her to write in; it does not promise a change. See the open
  question on whether an address can be corrected before dispatch.
- **`{{AWEBER_STRIPE_ORDER_ID}}` ships as a placeholder.** The renderer warns about it on every run.
  Swap it from AWeber's personalization picker and prove it on a seed send.
- **Links are functional only:** the refund policy. The support address is plain text (email clients
  link it), because a markdown `mailto:` link prints the address twice in the plain-text part.
- **Email body paragraphs are one line each in this file** so the `.txt` part doesn't carry hard
  line breaks from the source.
- **`%FIRSTNAME%` × 2:** salutation (falls back to "friend") and the wait-filler's first line (falls
  back to "dear").
- **Order bump (`09-C3`, Reiki charging): this email does NOT change, and there is no separate
  Reiki email** (Joel, 2026-09-16: "no reiki email needed"). A bump buyer sees the "Added" line on
  the receipt page.
- **Rendered with** `node improve-v1/v1-one-time-BEs/scripts/render-be-email.mjs improve-v1/v1-one-time-BEs/docs/09/09-T3-confirmation-email.md`
  — `.html` and `.txt` land beside this file.
