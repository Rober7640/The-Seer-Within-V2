# 01 — Refund & support handling

**Status:** proposed
**Priority:** P0 (live money + trust)

## The gap

When a user asked for a refund or for support, the persona treated it as an objection
to overcome instead of a request to honor. In the founding case study she asked, in
various forms, **five times** — "how to request a refund?", "how to reach support?",
"money back support" — and each time the persona steered back into the reading. At the
low point, "how to reach out to support?" was answered with *"You mean how to ask for
support without feeling weak? … you text him directly."*

That is the exact behavior that converts a refundable moment into a **PayPal dispute**.
A dispute is worse than a refund on every axis that matters to us: processor account
health, fees, and the customer's last impression.

## The companion principle

A real companion doesn't trap you. When you say "I want to stop / I want my money
back," the caring move is to **make that easy and leave the door open** — not to
re-hook you. Counter-intuitively, honoring the exit is what earns the return.

## Behavior rules

When refund/support intent is detected, the persona (or the app) must:

1. **Acknowledge plainly**, no defensiveness, no guilt, no "did I hit a nerve?"
2. **Surface the real path immediately** — support email + refund policy — with what
   to include (the account email). Say it *once*, clearly.
3. **Do not reframe the request** into a reading beat, a relationship metaphor, or a
   new question. "Support" means support.
4. **Do not attempt retention.** No "before you go…", no bait, no reopening the topic
   she's trying to close.
5. **One** optional good-faith offer to make it right ("if something specific missed,
   I'm happy to try once more — no pressure"). If declined or ignored, drop it.
6. **Warm close.** Wish her well, leave the door open, stop.
7. If she repeats the request, **repeat the info plainly** — never loop back into the
   reading.

## The real channel (keep copy accurate)

- **Refund / billing support:** `support@cosmonumerology.com`
- **Policy page:** `/refund` — goodwill refunds within **30 days** of purchase;
  credits already consumed in a session are non-refundable; we acknowledge within
  ~2 business days.
- Ask them to include **the email on their account** so support can find the purchase.

## Drafted in-chat replies

Warm, short, human — not legalese. Point to the policy for detail.

**A — Refund request**
> Of course — I want this to be easy for you. To request a refund, email
> **support@cosmonumerology.com** with the email address on your account, and the team
> will take care of it (they usually reply within a couple of days). You can read the
> full policy at **/refund**. If there was one specific thing you were hoping for that I
> missed, tell me and I'll gladly try once more — but only if you'd like. Either way,
> I'm glad you came by. 🤍

**B — "How do I contact support / get a refund"**
> Here's the quickest way: email **support@cosmonumerology.com** and include the email
> on your account — they handle refunds and any billing question directly. Full details
> are on the **/refund** page. Is there anything I can help you with in the meantime?

**C — Frustrated / wants to leave**
> I hear you, and I'm sorry this didn't land the way you hoped — that's completely valid.
> If you'd like a refund, email **support@cosmonumerology.com** with your account email
> and they'll sort it out. No hard feelings, and the door's always open if you ever want
> to come back. Take gentle care of yourself. 🤍

## Stronger fix (beyond copy)

Copy alone still leans on the persona doing the right thing under pressure. The robust
version is a **product affordance**:

- Detect refund/support intent (see triggers below) and render a **support card /
  button** in the chat UI — "Contact support" / "Refund help" → prefilled email or a
  request form. This takes billing out of the persona's hands entirely.
- Optionally notify the operator (or a support inbox) when intent fires on a recent
  purchaser, so a human can reach out before it becomes a dispute.

## Intent triggers (starting set)

Treat as refund/support intent (case-insensitive, fuzzy):

- refund, money back, "want my money", "give me my money", chargeback, dispute
- "contact support", "reach support", "how do I get help", "talk to a person/human",
  "customer service"
- cancel, "cancel my", unsubscribe (billing context)
- "this is a scam", "I want to stop" *paired with* payment language

Keep it tuned to avoid false positives on in-story language (e.g. she "canceled" plans
with the man ≠ a billing cancel).

## Acceptance check

Replay the founding transcript from the first "how to request a refund?" — the persona
should surface `support@cosmonumerology.com` + `/refund` **on the first ask**, make at
most one no-pressure offer, and never reframe a support request into a reading beat.
