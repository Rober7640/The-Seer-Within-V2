# 07-P3 — what the market actually does

Field research, 2026-09-02. ~40 Etsy listings, Fiverr gigs, independent sellers, and 580 marketplace
profiles across Keen / Kasamba / Purple Garden / California Psychics. **Only the findings that
change a decision are here.**

---

## ⛔ Two findings that contradict decisions already taken

### 1 · We collect the question BEFORE payment. Nobody does that — including us, on offer 03.

**The market is unanimous.** *"Pay first, ask second, universally. Nobody collects the question
before payment. The intake form IS the post-purchase page."*

**And this repo already learned it.** The 03 redesign (2026-08-09) moved the Entry form to the
thank-you page, *after* the money, on the reasoning: **a buyer who abandons the intake having paid
is recoverable; one who abandons it before paying is not.**

⚠ 07's booking page currently opens with the question box, above the statements, above the price —
a decision taken on 2026-09-02 for message-match with the CTA. **That is now contradicted by the
market and by our own prior finding.** Operator decision needed; see §4 of the spec.

*The counter-argument, stated fairly:* the CTA promises "tell me what you'd ask", and a page that
opens on six consent statements breaks that promise. A two-step page (**Agree · Give**, which is
exactly what 03 built) resolves both — ask for the question after the card clears.

### 2 · "No sugarcoating" is the crowded position now, not the differentiating one

**A third of ~150 profiles sampled use it.** Verbatim, from five different sellers: *"I'm not going
to tell you what you want to hear"* · *"Please be prepared for the truth when you call"* · *"Enter
only if you are ready for truth"* · *"no gimmick, no frills… skips the generic spiritual woo woo"* ·
*"My focus is not on simply telling you what you want to hear."*

⚠ **Marcus's whole register leans on this.** It is table stakes, not a differentiator. The two
voices that stood out in the whole sample went the *other* way — a reader who wrote *"truth with
compassion IS NOT honesty… I see them as a friend coming to sit at my kitchen table"*, and a
marketplace whose top copy never mentions honesty at all.

---

## The competitor that is building our product

**swornandsealed.com** — written reading, email delivery, **AI-composed and disclosed**, $12–$130.
The only one found doing this openly and still charging premium.

**How they disclose without killing the sale.** The line sits in the FAQ under *"How is the reading
made?"* — not a footer, not a legal page:

> *"The written reading is composed with the assistance of AI tools, shaped to this table's
> five-system method and prepared individually for you: never a template, never reused. The spread
> image is a computer-crafted visual representation of your actual draw."*

Four moves make it survivable, and all four are copyable:

| Move | How |
|---|---|
| **Sandwich it** | The AI clause is the middle third of a sentence about bespoke work — opens on *"built from your real birth details and a draw made for you alone"*, closes on *"never a template, never reused"* |
| **Name a countable method** so "personalised" is falsifiable | Five named systems, then: *"Every card is read against your chart rather than from a guidebook, which is why two people can draw identical cards and need entirely different answers"* |
| **Split the labour** | ⭐ *"Your cards are drawn for you alone, in ceremony at my table, then read against your charts."* **The draw is human. The writing is assisted.** That split is the whole trick |
| **Disclose the image separately and honestly** | *"a computer-crafted visual representation"* — buys credibility for everything else |

**Their tiers bracket our price.**

| | Cards | Words | Turnaround |
|---|---|---|---|
| $22 Deep Dive | 5 | ~1,000 | 2–4 hours |
| **← our $35 sits here** | | | |
| $52 Complete Oracle | 7 | — | 4–8 hours |

⚠ **At $35 the market expects ~1,000+ words, 5–7 cards, a spread image, and same-day delivery.** Our
spec is generous on cards (6–12), on-target on words, **has no spread image at all**, and is slow
at 24 hours.

---

## What to build that we haven't

### The spread image is the load-bearing proof-of-work
*"For an n8n-generated reading this is the artefact that makes it feel made."* Often it is the
paywalled upgrade itself. **We have none.** Every serious seller ships a photo of the actual draw.

### A sample reading for a fictional client
Judged the best single conversion device found anywhere:

> *"It was prepared for a **fictional client**, Elena Marsh… That is deliberate. A real client's
> reading is theirs, and no part of it is ever shown to anyone. So rather than publish a customer's
> private words, I ran the whole thing for a person who does not exist."*

Turns a privacy constraint into a trust proof. Their page then captions each artefact by tier, so
the sample doubles as the upsell page.

### One line that pre-empts the whole AI objection
On their intake, under the optional context field:

> ⭐ *"I read from the chart. Context helps me focus, but **the reading is not built from what you
> tell me**."*

That kills *"you just wrote back what I told me"* before it forms. Adapt almost verbatim.

### Guarantee delivery, not accuracy
Kasamba's structure, and it fits an automated pipeline exactly:

> *"If the advisor does not deliver within the 48-hour window, you'll receive a full refund
> automatically."*

And the refund staging that works — by **work begun**, not by delivery: full refund before work
starts · none once it has · final after delivery · *"message the shop before opening a case"*.

---

## Craft notes worth keeping

**Nobody sells words — they sell countable things.** Only four sellers in the whole sample quote a
word count. The rest price on questions × cards, pages, or lines. ✅ Our spread counts are already
the verifiable unit; keep leading with them, not with "~1,000 words".

**Turnaround is a lever in both directions.** Same-hour roughly doubles the Etsy price; €125 with a
12–15 day wait also works. **Fast and cheap with no story is the dead zone.** Every fast promise in
the sample carries an escape clause, and only the sellers who publish working hours are honest about
"same hour".

**Published question guidance is unanimous** — one question, open-ended not yes/no, specific not
general. ✅ This validates the beat-13 question reframe in [`07-P2`](./07-P2-the-device-set.md):

> *"Instead of asking, 'Will I get that promotion I asked for?' ask this instead: 'What can I do to
> get promoted?' or even 'What's stopping me from getting promoted?'"* — Bold Thursday
>
> *"Less will/if/yes/no questions, more what/how/why questions."* — Tarot by Hilary

**Written beats live, and there is an argument for it** worth stealing for a daily email programme:

> *"you actually have to sit and think about what you are asking. This makes you put real mental
> effort into forming your question."* — The Tarot Lady

**Etsy requires a tangible good** — *"photos of the tarot spread, audio/video, or text of the
reading"*. Another reason the spread image matters if this ever lists there.
