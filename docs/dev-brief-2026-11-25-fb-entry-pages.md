# Dev brief: the two /fb sales pages (25 Nov 2026)

Build both pages and split-test them against today's /fb chat. Where this brief and `plan-2026-11-22-fb-salespage-test.md` disagree, this brief wins. The plan still holds for everything this brief doesn't change: assignment, exclusions, the main measure, the stats and the build order.

| | Mockup in this branch | Shared canvas (anyone with the link) |
|---|---|---|
| **Salespage 1** | `docs/fb-salespage-mockup/` | https://claude.ai/artifact/Kqff47fe9zWevAoJETW2Sm |
| **Salespage 2** | `docs/fb-salespage-2-mockup/` | https://claude.ai/artifact/9D1ghRbagUJarSy4JmE21H (build the top row only; the drafts below it are parked) |

The mockup files are the spec for copy, colours and spacing. Pictures: Salespage 2's four Codex pictures are in `docs/fb-salespage-2-mockup/images/` (full-size PNG + web JPG; the README says which goes where). Evelyn's photo, on both pages, is `uploads/avatars/hi-def/evelyn.png`. "Jules" is a sample name throughout.

## What changed since the 22 Nov plan

- **Two pages, three arms.** a = today's /fb chat, b = Salespage 1, c = Salespage 2.
- **No email step on either page.** Stripe's checkout page takes her email.
- **The product is the Energy Clearing Ritual** ($35): Evelyn finds where it started, cuts a black cord and seals both ends with wax. Her reading (5–7 pages) arrives by email. The page never sells "a letter".
- **The bump is the Double-Strength Clearing** ("Yes, go twice as deep tonight", +$12.77, six hours instead of three), not a second letter.
- **Both pages close the same way.** The chat's own gate (CommitmentGateCard.tsx, word for word): the line "{name}, before I prepare this for you, I need to know you're truly ready." and three ticks. Until all three are ticked, only "Tick all three to continue" shows. Then the bump box and "Begin my Energy Clearing · $35" appear together ($47.77 with the box ticked).

## The split

- Key `v1_fb_entry_2026`, variants `a` (chat), `b` (Salespage 1), `c` (Salespage 2). Assigned on /fb load by `ab_vid`, as in the plan.
- **Shares: the operator sets them on the experiment row.** The plan's timing section still applies: the chat-flow test (`v1_fb_chat_flow_2026`) runs inside arm a, so the more traffic the pages take, the longer it runs.
- Exclusions as in the plan (`?lane=`, `?lang=`, `?resume=`, previews). Add previews for both pages, e.g. `?entry=page1` and `?entry=page2`, never logged.
- Redirect with a replace navigation before the lander paints. If the assignment call fails, she gets the chat.

## Salespage 1: `/fb/reading`

One route, no reload between steps.

1. **Name** (`Hero.dc.html`).
2. **Her words** (`Step2.dc.html`), with tap-to-start lines.
3. **The offer** (`Step3.dc.html`): what Evelyn does tonight, what arrives, the guarantee. No price and no button here.

**Below every step** (`Page.dc.html`), in this order: how it works, why only your first name, the comparison table, **the close**, the questions, the footer. The button comes before the questions.

The close's spot follows her step, and never asks for something she's already given:
- on step 1: the name box again;
- on step 2: "Thank you, {name}. I'm still here, just up the page." with **Back to Evelyn** (scrolls up);
- on step 3: the gate, as above.

`CloseTicked.dc.html` shows the close after all three ticks. The wording for steps 1 and 2 is in `fb-salespage-copy-draft-2026-11-22.md`.

## Salespage 2: `/fb/clearing` → `/fb/clearing/letter`

1. **C1, her name.** "Send to Evelyn" goes to the letter.
2. **C2b, the candle letter**, with her first name through it. Tapping A, B or C shows one line answering her pick. It ends on one button, "Yes, begin my clearing".
3. **C3 opens in place** under the letter when she taps Yes: the gate, then the bump and the button.

## Checkout (both pages)

- `POST /api/checkout` with `funnel: 'v1-fb'`, `firstName`, `bucket: 'love'`, no email, and `noemail: true`. That is the existing no-optin path: Stripe makes a fresh customer, collects the email on its page, and saves the card for the 1-click upsells.
- **The bump needs a new rule.** Today the bump only applies when `resolveV1Bump(email, …)` puts her in the bump arm (`server/routes.ts` ~1096). With no email, `bumpArm.bump` is false, so a ticked box would charge nothing. /fb's own bump test (`v1_fb_order_bump_2026`) also ended on "no bump". So, for page orders: if she ticked the box, add the $12.77 line. Use product key `double_reading` (the key n8n branches on) and the Double-Strength copy from `shared/orderBump.ts`.
- Stripe metadata: `entry: 'page1'` or `'page2'`, so stats can split the arms. The cancel URL goes back to the page she came from, not `/fb/chat`.
- ⛔ `product` stays `energy_clearing_ritual`. The n8n router matches it exactly.
- The Meta pixel already covers `/fb/*` (`location.startsWith('/fb')` in `client/src/App.tsx`).

## What the reading needs

The n8n reading must close each page's loop. Make 3–5 sample readings from page-style inputs before launch.

| | Inputs | It must deliver |
|---|---|---|
| Salespage 1 | first name, her sentence (or the tap-to-start line), bucket | what keeps happening; where it started; what was cleared overnight and what pushed back; the next 30 days, week by week, and three small things to do |
| Salespage 2 | first name, her A/B/C pick, bucket `love` | the same, plus which way the flame bent (door, window or floor), the afternoon it took hold, and the cord and wax |
| Bump buyers | as above | the six hours she paid for |

Known live bug (from the plan): the English "Prepare data" node reads camelCase fields, but the rows are snake_case.

## Open before launch (operator)

- "By morning" (the ads and both pages) vs "within 24 hours" (the chat). Time a real order from payment to inbox, and keep whichever is true.
- Salespage 2's Christmas lines run out on 24 Dec.
- The cord photo on Salespage 2 shows red wax.
- Salespage 1's tap-to-start line "Money won't stay." doesn't fit love-only ads.
- Salespage 2 is built on a candle. Check that Upsell 1's opening doesn't clash with it, or refer to "our chat".
- A woman who doesn't pay leaves only her first name. Accepted: only women who start checkout can be emailed.
- /fb traffic: chat starts fell to 10 on 24 Nov, from 64–94 a day. Check it before setting the shares.

No reviews, no invented numbers, on either page.
