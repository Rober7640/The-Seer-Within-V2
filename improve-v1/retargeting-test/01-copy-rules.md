# 01 — copy rules

The brief every writer on this bank works from.

## 1. Who she is
A woman who has already met Evelyn — she landed from a Facebook ad, pulled a card, had a reading,
did not buy. Mostly 45–65, mostly love. **She reads**; long body text outperforms short here.
She remembers Evelyn, the cards and the feeling. She does NOT remember the brand, the price or
what the offer was called.

## 2. What the ad may and may not know
**One audience can hold two very different people** — someone who dropped out in the first minute
and someone who reached the buy button. Unless the audience itself proves the touch, no ad can
tell them apart.

| Allowed | Banned |
|---|---|
| "If we spoke this week…" | "You stopped at the last step" |
| Talking about Evelyn, the cards, the reading | Her marriage, her age, her loneliness, her ex |
| A doubt named as a general doubt | A doubt named as *her* doubt |

Two hard reasons: Meta's personal-attributes policy bans implying private knowledge of the
reader, and half the audience did not do the thing — an ad that claims she did reads as a
mistake and kills the click for everyone it is wrong about.

**⛔ Nothing personal may be load-bearing.** Every line must work if we know nothing. Anything we
do know is a quiet bonus that costs nothing when missing or wrong. Never name her card.

## 3. Hard bans

> **Removed 2026-10-07 (operator):** "No outcome promises. No timeline on another person's
> behaviour." Predictions are stated flat. This was a self-imposed guardrail, not a platform
> rule — do not reinstate it from caution. The bans below are each tied to a named external
> rule or a live-site conflict, which is why they stay.

- ⛔ No numbers, counts or life-facts about her — a number disqualifies everyone whose number differs.
- ⛔ No testimonials or customer quotes. No verified customer words exist; inventing them runs at
  the FTC's 2024 endorsement rule.
- ⛔ No refund or guarantee claim. ⚠️ Live site and `/refund` already disagree — see §8.
- ⛔ No price. The main price is a live weighted split (`35_fb2` / `45_fb2`), locked per
  conversation, so any stated number is wrong for part of the audience.
- ⛔ No health, financial-status or relationship-status claim in the second person. The
  descriptive form is fine; "Are you…?" is the banned shape.
- ⛔ `tarot` is on FUNNEL.md's FB-flagged list. Say **cards**. Also banned: psychic, fortune,
  spell, magic, prediction, witch, horoscope, astrology.

## 4. Voice
Evelyn's, not the cold-ad voice — she has met Evelyn, so the voice IS the reason she returns.
Picture before meaning · never open on a bare It/That/This · spoken, ~40% contractions · no
aphorisms, balanced clauses or appositive tails · she is the subject, the card figure is a prop ·
warm, unhurried, certain. Evelyn does not sell, plead or apologise for the interruption.

## 5. The guilt rule
**"I was worried about you", NEVER "you ignored me".** Evelyn as the injured party kills the
funnel's core product — relief from self-blame is the strongest thing it sells. Make the guilt
about her abandoning HERSELF, then absolve it. **Release the blame BEFORE the guilt lands.**
Worry needs four things: time has passed · she has been on Evelyn's mind · a specific OBJECT of
the worry · reluctance. "I noticed" is not worry.

## 6. The arc (AUDIENCE.md)
**Recognition → Relief → Hope → Action.** A hook that skips Recognition dies on the scroll.
Test any hook three ways: does it make her feel **seen** or **sold**? Does it name a **wound** or
a demographic? Does it offer **relief from self-blame** or more advice? Miss all three and it is
not her hook.

## 7. Destinations and tracking
**UTM only. Do not invent a `src` value** — `src` is a hard-coded marker in `server/routes.ts`
checked by equality and written into Stripe metadata; a new value does nothing until the server
learns it. ⚠️ Whoever ships the resume entry must give it its own marker, not reuse
`src=recovery`, or paid retargeting revenue merges into the AWeber email-recovery numbers.

## 8. Open compliance issue
Five CTA components promise a 30-day guarantee and `ClearingChoiceCard.tsx:43` says "every penny
returned", but `/refund` describes a 30-day **pro-rata goodwill refund on unused purchased
minutes** — the V2 minutes policy, for a product that sells a one-off clearing. FUNNEL.md says
60-day. **Three different promises.** Live exposure, independent of these ads.
