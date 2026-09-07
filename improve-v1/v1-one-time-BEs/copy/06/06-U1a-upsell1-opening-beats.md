# 06-U1a — U1 opening beats *(the Wishing Bracelet → Protection Ritual)*

| | |
|---|---|
| **Engine** | `S20`, config-driven clone of `useUpsellChat.ts`. Everything from `SOLUTION` onward reuses V1 verbatim |
| **Rewritten here** | `CONFIRMATION` · `GAP` · `RISK` · `QUESTION_1` + `AFTER_Q1` — everything downstream of `SOLUTION` is V1's, unchanged |
| **Why** | V1's beats hang off *"your Energy Clearing Ritual,"* a working 06's buyer never had performed. 02's hang off the Tower's warning, which the buyer didn't draw either. 06's bridge hangs off something none of the other offers have: a **real shipping wait** — Bixie is a physical object that has to travel to reach the buyer, not a working or a spread that lands the moment they say yes |
| **Product sold** | the Protection Ritual + charged lava stone — unchanged. `S21` suppression still applies: never offer an object the buyer already owns |
| **Source** | `client/src/lib/upsellMessages.ts:43-106` |
| **Bridge decision** | locked in `../../docs/06/0-WORKFLOW-06.md`'s U1/U2 row: *"U1's bridge uses 06's real shipping wait as the vulnerability window, which 02–04 don't have"* |

⚠ **The beat structure is proven and is not being changed.** Confirmation → gap → risk → a
question that makes the risk personal → solution. Only the *content* of the first four moves,
same convention `02-U1a` established.

---

## `UPSELL_CONFIRMATION` — 3 messages

> It's done, {firstName}. Bixie's ordered — he's being packed to come find you.

> He still has real ground to cover before he's actually on your wrist, though. That part isn't
> instant, however much I wish it were.

> But before I let you go, dear, there's something about that stretch of road I need to say.

---

## `UPSELL_GAP` — 4 messages

> Once he's on your wrist, Bixie does exactly what I told you he does. No exit. What reaches you
> stays reached. I'm not walking one word of that back.

> But here's what most people don't understand about a guardian that has to be shipped,
> {firstName}...

> A creature sitting in a box, somewhere between here and your door, isn't guarding anything yet.
> He can't be. He isn't on you.

> He becomes what I promised the moment he arrives. Not one day sooner.

---

## `UPSELL_RISK` — 5 messages

> And nobody tells you the honest part of a wait like this one.

> For however many days it takes him to reach you, you're not one bit safer than you were an hour
> ago. If anything, less — because now you believe it's already handled.

> That belief is its own kind of danger, {firstName}. Thinking you're covered is exactly when you
> stop doing the small, ordinary things that were covering you before.

> I've watched it happen more times than I can count. Someone makes the decision that will finally
> hold what reaches them, feels the relief of having made it, and lets their guard down in the very
> days before it arrives.

> Bixie promised you a guardian. He never promised you one for the wait.

---

## `UPSELL_QUESTION_1`

> Tell me honestly, {firstName} — has something ever reached right up close to your hand, close
> enough to feel it, and then not been there when you closed your fingers?

**`UPSELL_QUESTION_1_REPLIES`**

| Text | Value |
|---|---|
| Yes — more than once | `yes` |
| I think so, yes | `maybe` |
| I'm not sure | `unsure` |

---

## `UPSELL_AFTER_Q1`

**`yes`**

> I thought you might say that. It's the most common answer there is.

> That's not bad luck, {firstName}. Reaching your hand isn't the same as closing it around
> something — and until now, nobody's ever handed you a way to do the second part.

> I don't want you spending this particular wait without one.

**`maybe`**

> Most people don't notice it until they're looking back at a whole year of it.

> Something that was almost yours, more than once, in ways that felt like coincidence at the time.
> It wasn't.

> That's what I want stopped before Bixie ever reaches your door.

**`unsure`**

> It's quiet work, the kind that doesn't announce itself. You just notice, one day, that things
> never quite hold the way they should.

> Either way, I'd rather not leave the days ahead of you to chance.

> Not while there's still a gap for anything to slip through.

**`default`**

> I can tell you know exactly what I mean.

> Reaching for a thing and keeping it are two different pieces of work, and Bixie only takes over
> once he's actually on you.

> Let me cover the part he can't reach yet.

---

## Build notes

- **Same beat structure, new mechanism.** V1 argues *removal leaves a wound open for 30 days*; 02
  argues *sight is not protection*; 06 argues *cargo is not a guardian* — no sentence repeats
  across offers, which is what the corpus device-variance pass is checking for.
- **The gap is 06's own established fact, not an invented one.** The letter's own climax is "he has
  no way out... not because he's loyal. Because he's built that way" — the gap beat only adds the
  one thing the letter never had to address: *built that way* still needs him physically present
  to do anything.
- ⚠ **The risk beat is 06's honest, specific vulnerability window — real, not fear-mongering.**
  Unlike V1 (a working with a stated 30-day energetic aftermath) or 02 (a spread that lands
  digitally inside 24 hours), 06 sells a physical object that has to travel. That's a genuine gap
  between "they said yes" and "they're protected" regardless of copy — the beat names it honestly,
  the same way the letter itself states what Bixie can't do ("What this can't do").
- **No day-count or SLA stated anywhere in this file, deliberately.** 06's shipping window is still
  being finalized (`docs/06/0-WORKFLOW-06.md`); a hard number here would risk drifting out of sync
  with whatever the booking page and delivery email ultimately promise. "However many days it
  takes," "real ground to cover" carry the mechanism without committing to a figure — matching the
  deck rule that only the booking page and delivery-facing assets state an SLA.
- **Q1 converts the risk from Evelyn's claim into the buyer's memory**, same job 02's does — the
  buyer supplies the evidence, not Evelyn. Written generic on purpose: nothing here draws on
  anything collected about them in the funnel, matching the deck-wide rule.
- ⚠ **Nothing here mentions a price or restates 06's own price.** Both live in `SOLUTION` onward,
  which is V1's copy unchanged, and 06's own price already lives on its own booking page — don't
  pull either forward into these beats.
- **"Bixie" carried over as a name, not a personal detail.** The letter names him in Beat 4 (the
  two-horned guardian, "the guardian, not the puller") — using it here is continuity with the
  product the buyer just bought, not information collected about them.
- **`{firstName}` × 4 across the block** (`CONFIRMATION` ×1, `GAP` ×1, `RISK` ×1, `AFTER_Q1`-yes
  ×1), matching V1/02's density in the same slots.
- **Banned constructions avoided:** no "clearing," no "energy field," no hedge words, no AI tells.
  Predictions stated flat, matching Evelyn's voice in `06-E2-esl-product-creature-a-close-c.md`.
- **De-gendered, 2026-09-02 — operator: the be-customer list includes men, and this offer skews
  more male than female.** The RISK beat was the real offender — "a woman who thinks she's covered,"
  "most women don't understand," "most women don't notice" were all actual buyer-facing quoted
  copy, not internal notes. Rewritten to direct "you" address where the sentence was already
  talking to `{firstName}` (the danger-of-false-security line), and to singular "someone... they"
  where it was a third-person illustrative pattern ("I've watched it happen"). No claim changed,
  only who it's attributed to. Same pass applied across the whole offer — see
  `docs/06/0-WORKFLOW-06.md` for the full file list.
