# 05 — Post-purchase copy for retarget buyers (for review)

**Who sees this:** only buyers from the retargeting offer page (`/fb-tarot/b?src=retarget`).
The server checks this on the order itself: a paid Stripe checkout with `src = retarget` on
the tarot funnel. Every other buyer sees exactly what they saw before.

**What she has told us:** her first name (typed on the page) and love or money (from the ad
hook). Nothing else. She never chatted with Evelyn before buying.

| Page | What changes for her | New copy? |
|---|---|---|
| Upsell 1 — Protection Ritual, $47 | Nothing. Live page, live copy, live price. | No |
| Upsell 2 — Manifestation Bracelet, $47 / downsell $30 | Two short beats that Claude normally writes from what she said in the chat are replaced by fixed lines (below). The rest is live. | **Yes — 2 beats × love/money** |
| Thank-you page | The chat card offers Evelyn (15 free minutes) instead of Luna, like `/fb` buyers. Same card copy as `/fb`. | No |
| Evelyn's chat after the thank-you | She already knows the buyer's first name, love/money, that she came back through the returning-reader offer, the ritual, and any upsells taken. | Brief only (not shown to the buyer) |

Source of truth for the copy: `client/src/lib/upsellCopy/retargetUpsell2.ts`.

---

## Upsell 2 — the two fixed beats

**Why not reuse the existing fallback?** The page already has one non-AI line for when the AI
call fails: *"I see something beyond the block, {firstName}... something trying to reach
you."* It is a one-bubble error placeholder and says nothing about love or money. Too thin
for a beat every retarget buyer sees, so new lines were written.

**How they were written:** to the same brief Claude gets for this beat (2–3 bubbles, each
under 25 words; love = "a connection forming… they can't feel you yet"; money = "an opening…
abundance circling your field… it's close"; love stones = Green Aventurine + Amethyst; money
stones = Citrine + Pyrite). "What's been holding love back / holding your money still" is the
offer page's own phrase. No guarantee, refund, result or timing claim. No invented people.

`{firstName}` = her first name.

### Beat 1 — the reveal (right after the opening)

**Love**
> I saw something past what's been holding love back from you, {firstName}.
>
> A connection forming. Someone whose energy already fits with yours... but they can't feel you yet.
>
> Once the way is clear, love has a path to you. It still needs a signal to follow.

**Money**
> I saw something past what's been holding your money still, {firstName}.
>
> An opening. A flow of abundance that's been circling your field, looking for a way in. It's close.
>
> Once the way is clear, money has a path to you. It still needs a signal to follow.

### Beat 2 — her stone (right after "did any of them stand out?")

**Love**
> For you, {firstName}, it's Green Aventurine. It draws love toward you, whether that's someone new or a connection coming back to life.
>
> And Amethyst beside it, so you recognize the right person when they appear.
>
> Picture wearing it and noticing how people start to respond to you. That's the shift I mean.

**Money**
> For you, {firstName}, it's Citrine. The merchant's stone. It pulls money and opportunity toward you.
>
> And Pyrite beside it, sending that abundance signal out further than you could on your own.
>
> Picture doors opening and offers arriving, and money starting to flow toward you instead of past you.

### Live lines she still sees that assume a chat (flagged, NOT changed)

The operator decision was "keep the live U1/U2 copy". These live lines lean on a chat she
didn't have. They still read acceptably (she did start a reading with Evelyn before she
left), but they are the first place to look if retarget buyers' U2 take-rate is low:

- U2 opening, declined U1: *"there's something else I saw during our reading"*
- U2 after "Tell me more": *"Let me connect them to what you told me earlier"*
- U2 what you receive: *"it will already carry the frequency of what you told me you want most"*
- U1 ritual: *"Using the energy signature from our conversation"*

---

## Evelyn's reading brief (what her chat knows — never shown to the buyer)

Built in `server/lib/evelynThankyouGift.ts` (`retargetFacts`). Example — love, bought both
upsells:

```
- First name: Ann
- What they came to you about: love
- How they came back: they started a tarot reading with you on the site a while ago and left
  before it was finished. They have now come back through your returning-reader offer.
- When they came back, you told them something has been holding love back from them, and
  that you would clear it yourself.
- They chose the Energy Clearing Ritual to clear it. What it is, exactly:
  - YOU perform the ritual for them yourself, on the night they ordered it: 2-3 hours …
  - Within 24 hours … written reading by email (5-7 pages) …
  - There is nothing for them to light, burn, wear, hold or do for the clearing, and nothing
    physical is sent for it. …
- They also chose the Protection Ritual: you charge a volcanic lava stone for them, and it is
  shipped to them to wear on their left wrist.
- They also chose the Manifestation Bracelet: eight stones, shipped to them, to wear on their
  right wrist.
- What you do NOT know: anything they told you in that first reading, which card they turned,
  their situation, or anyone's name. Never guess at it or pretend to remember it. …
```

Her first message from Evelyn: 1–2 sentences, under 35 words, names love/money and the ritual
(written reading by email), never prices, never claims to remember what she said, ends with
one open question about what's on her mind now.

**Different from the `/fb` brief on purpose:** the `/fb` brief has no upsell lines and says
"nothing physical is sent" without limit. That is unchanged (and is a gap for `/fb` buyers who
take the lava stone or bracelet — flagged, not fixed here).
