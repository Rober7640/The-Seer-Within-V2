# 08 Marcus — design review 02: bridge page + thank-you page

Reviewed 2026-09-13 against the local harness (`local/08-marcus/index.html`, functions `bridge()` and
`thanks()`), live at 1100px and 390px, order `d5596365…`. Scope docs respected:
`bridge-page/SCOPE.md`, `thank-you/SCOPE.md`. Copy is gated by the comprehension audit — every copy
note below is a **flag**, not a rewrite. Mock of the bridge as I would change it: `02-bridge-mock.html`
(same folder). No existing file was edited.

Reader in mind throughout: a woman over 55, on her phone, who pressed "pay" about one second ago.

---

## 1. Verdict per page

### Bridge

**What works.** The page already does the three jobs in the scope and does them in the right order:
confirmed → what I have of yours → where and when it arrives → nothing next can touch it → one button.
It stays on Marcus's paper (masthead, double rule, Georgia, one red). It never shows a price, never
asks for anything, and has exactly one action. Refresh keeps the order and the page (verified); the
browser back button from Upsell 1 returns here (verified). The grey "secured" box is the right
instinct — the two facts she will re-read are in one place.

**Single biggest weakness.** It reads as a *notice*, not as a *moment*. Everything is centred, the
same weight, and evenly spaced, so the eye has nowhere to rest: the delivery email (the one fact that
answers "did it work?") is buried mid-sentence inside a grey box, and the promise that matters most
for refund risk — "Nothing on the next page changes or delays that order" — is the *last* line of
that box, farthest from the button it is meant to reassure her about. On the phone the button is
below the fold (y≈885 in an 844px viewport, measured), so the one thing she must do is not visible
when the page lands.

### Thank-you

**What works.** It is honest and complete for a receipt: name, her question, itemised lines, total,
delivery email, deadline in her local time, a status line per piece. The rule work (double rule above
the items, single rule below the total) matches the letter. Invalid order references fail closed
("Order not found", no invented data — verified).

**Single biggest weakness.** The loudest element on the page is **"Total USD $47.77"** at 27px bold.
For a woman who has just paid twice in three minutes (reading, then maybe audio), a page whose visual
centre is a big bold dollar figure feels like a bill, and a bill is what triggers "wait — was I
charged twice?" and the chargeback. The receipt should be *available*, not *dominant*. What she
actually needs — "is it coming, where, when, and what is happening right now" — is set as three
plain paragraphs of running prose with system words in them ("queued", "(simulated)"), so the
status is the least legible part of the page.

---

## 2. Aesthetic direction for the post-payment moment

The second after paying should feel like a letter being **set down on the desk and a line drawn
under it** — still, settled, already done — not like a page loading or a screen confirming. Type
does it by dropping to one calm reading size with only two things allowed to be heavier (her email,
the arrival window); space does it with one generous pause above the headline and no boxes to
decode; the one motion is a single rule that draws itself across the page under the order facts,
once, slowly (700ms), and never again.

---

## 3. Prioritised suggestions

Each: WHAT / WHY (her · trust · refund risk) / HOW (CSS-level). Ordered by expected effect.

### 3a. Bridge (see the mock)

| # | WHAT | WHY | HOW |
|---|------|-----|-----|
| B1 | Get the Continue button onto the first screen at 390px. | Her. On the phone the button is at y≈885 (viewport 844). The page's only action is invisible on landing; she scrolls looking for "what now?", which is exactly the moment doubt creeps in. | Tighten the phone stack: `h1{font-size:34px;line-height:1.08}`, `.review{margin-top:18px}`, paragraphs `margin:12px 0 18px`, order facts block `padding:16px 0`. The test banner alone is ~130px; in production it is gone. In the mock (no test banner) the button bottom is at y=780 and its caption's bottom at y=838, both inside a 390×844 viewport (measured). |
| B2 | Make the delivery email a *display line*, not a phrase inside a sentence. | Trust. "Did it go through, and to the right address?" is the first question after paying. The answer should be findable at a glance, and a long address must not break mid-word. | Definition-list layout: label `font-size:13px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted)` over a value `font-size:21px; font-weight:bold; overflow-wrap:anywhere`. Same pattern for "Arrives within 12 hours of payment". Keep the scope's sentence verbatim as the line above the list so no copy changes. |
| B3 | Move "Nothing on the next page changes or delays that order." to directly **under the button** as its caption. | Refund risk. That sentence is the whole reason the bridge exists (it pre-empts "the upsell page cancelled my order"). Under the button it is read at the exact moment she decides to tap. Currently it is the last line of a box she has already scrolled past. | `.under{font-size:16px;color:var(--ink);margin-top:12px;text-align:center}` — ink, not muted; it is not a disclaimer. Same words, moved. |
| B4 | Replace the grey `.status-box` with ruled paper. | Her + letter continuity. A filled grey rectangle is the one element on the page that is *not* from the letter; it reads as a form/system panel. The letter's own device is the rule. | Drop `background:var(--soft)`; use `border-top:4px double var(--ink); border-bottom:1px solid var(--rule); padding:22px 0`. Facts as a 2-column grid on desktop (`grid-template-columns:1fr 1fr; gap:24px`), stacked on phone. |
| B5 | Left-align the body; keep only the eyebrow and headline centred. | Her. Centred body paragraphs at 17–18px with ragged both edges are the hardest setting to read for older eyes; each line starts in a different place. | `.bridge-page{text-align:left}` with `.eyebrow,h1{text-align:center}`; `max-width:34em` on paragraphs. |
| B6 | Raise the eyebrow from 13px to 15px and give it a small red mark. | Her + trust. "ORDER CONFIRMED" is the first word she reads and it is currently the smallest text on the page. It deserves the single restrained use of red, which also tells her "this is the good kind of page". | `.eyebrow{font-size:15px;letter-spacing:.18em}` with a `::before` short red rule (`width:22px;height:2px;background:var(--red)`) or a red "✓" glyph before the words. Red is then used exactly twice: mark + button. |
| B7 | One load motion: staggered fade-up (3 steps) and the rule under the order facts drawing left→right. | Her. A quiet motion makes "it is done" land as a feeling instead of a sentence. One time only, no loop, no spinner (a spinner says "wait", the opposite of "secured"). | `@keyframes rise{from{opacity:0;transform:translateY(8px)}}` with `animation:rise .5s ease-out both` and `animation-delay` 0/.12/.24s; rule `transform-origin:left; animation:draw .7s .3s ease-out both` (`scaleX(0)→1`). All inside `@media(prefers-reduced-motion:no-preference)`. |
| B8 | Pin the headline break at subject / predicate: "Your personal reading" / "is now being prepared." | Her. Only the subject/predicate break reads in one pass; "Your personal / reading is…" or "…being / prepared." (which happen at in-between widths as the text reflows) make her reparse. | Wrap `is now being prepared.` in `<span class="nowrap">` (`white-space:nowrap`) at desktop widths and release it (`white-space:normal`) under 620px; `h1` 44px desktop / 34px phone; keep `text-wrap:balance`. Verified at 1100 and 390 in the mock. |
| B9 | Button: 60px tall, no hover-only state, stronger focus ring. | Her. Thumb target and visible focus for a phone-first, older reader. | `.primary{min-height:60px;font-size:20px}`; `:focus-visible{outline:3px solid #a36b31;outline-offset:4px}` (already present, keep). |
| B10 | **Copy flags (do not rewrite here).** (a) "Continue" says nothing about where; the comprehension audit should test "Continue" vs a destination word. (b) "Before you view your receipt…" — "receipt" may make her expect a charge on the next page; the audit should check whether she reads the upsell page as a bill. (c) "the personal card connected to your name" is a concept-noun she may not be able to picture yet. (d) The mock changes one phrase — "prepared for [email]" → "prepared for the address below" — so the email can sit on its own display line; that phrase and the two labels "Delivery email" / "Arrives" are proposed, not approved. | Trust / refund risk. | — |

### 3b. Thank-you

| # | WHAT | WHY | HOW |
|---|------|-----|-----|
| T1 | Demote the receipt; promote the status. | Refund risk. See verdict. The page should answer "is it coming?" first and "what did I pay?" second. | Move the itemised block **below** the status block. `.total{font-size:20px}`; total in bold ink, not display size. Title the block with a small eyebrow ("Your order" — copy gated) so it reads as a record, not a demand. |
| T2 | Give each piece its own status row with a glyph, a state word, and a next-thing line — written and audio as separate rows, always in that order. | Her + trust. Two independent things are happening; two rows show that without a sentence explaining it. | See §4 for the full state design. Row: `display:grid; grid-template-columns:28px 1fr; gap:14px; padding:18px 0; border-bottom:1px solid var(--rule)`. |
| T3 | Kill system words in what she sees. | Her. "queued", "(simulated)" are our words. In production the label must be a plain state (see §4). | Map status → label in the render function; never print the raw enum. (Copy for the labels is gated — §4 gives intent, not final words.) |
| T4 | Put the delivery email and the deadline as display facts, same pattern as the bridge (B2). | Trust. Consistency between the two pages tells her it is one order, one promise. | Reuse the same label/value CSS. Deadline value on its own line: `Sep 14, 2026, 5:07 AM` should not wrap inside a sentence. |
| T5 | Show a correction path for the email and a support line. | Refund risk + scope item ("approved support/contact and delivery-email correction path"). Currently absent; the only exit from a wrong address is a chargeback. | Small ruled block under the facts: a `text-button` for "wrong address?" and a plain support email. Copy gated. |
| T6 | Repeat her question as a quotation, not a bare line. | Her. "What are my blind spots?" set as plain body text under "Thank you, Karen." reads like a stray sentence. It is *her* words, the thing she bought. | `blockquote{font-style:italic;font-size:20px;border-left:3px solid var(--rule);padding-left:16px;margin:14px 0 26px}`. |
| T7 | Format the deadline for a human. | Her. "5:07 AM" is correct but reads as a system timestamp. | Keep `toLocaleString` but pass `{weekday:'long', hour:'numeric', minute:'2-digit'}` and drop the year; e.g. "by Monday, 5:07 am (your time)". Words are gated; the *shape* (weekday first, no year) is the design point. |
| T8 | Refresh-safe, webhook-pending state. | Trust. If she lands here before the audio webhook has written, the page must not show "Total $47.77" and then "$64.77" on refresh with no explanation. | Render a "confirming" state for any line whose payment is `pending` (§4), and never show a total until every line is settled. Poll or re-fetch on `visibilitychange`; never re-post. |
| T9 | **Copy flags.** "Audio follows the approved written reading and is delivered separately, by the same deadline." — three ideas in one sentence; "approved" is an internal word. "Written reading status" / "Audio status" — the word "status" itself is a system word for this reader. | Her. | — |

---

## 4. Status design for the thank-you

Principles: one row per purchased piece; the written row always first; the audio row only if audio
was bought (an absent row is not a re-pitch); each row is **glyph + state word + one plain line +
optional action**. Words below describe *intent* — final labels go through the comprehension audit.

| State | Glyph (ink unless noted) | Written row says (intent) | Audio row says (intent) | Action |
|-------|--------------------------|----------------------------|--------------------------|--------|
| **paid** (payment confirmed, job not started) | ● filled dot | Paid. Marcus has your question and cards. Arrives by *deadline*. | Paid. Recorded after the written reading is finished. Arrives by *deadline*. | none |
| **processing** (job running) | ◐ half dot | Being written now. Arrives by *deadline*. | Being recorded. Arrives by *deadline*. | none |
| **ready** (file exists, email not yet sent) | ◐ half dot, label "Ready — sending" | Finished. Sending to *email* shortly. | Finished. Sending to *email* shortly. | none (private link only once delivered, to avoid a link that 404s) |
| **delivered** (email sent) | ✓ in ink | Sent to *email* at *time*. | Sent to *email* at *time*. | "Open your reading" / "Play your reading" — private tokenised link, `text-button` style |
| **failed** (job or send error) | ! in red, the only red on the page besides the masthead rule | We hit a problem preparing it. Your payment is safe and the deadline still stands. We'll email you when it's fixed. | Same, plus "your written reading is not affected" if written is fine. | Support email link |
| **pending** (webhook not yet received — audio only, in practice) | ○ hollow dot | — | Confirming your payment… | none; auto-refresh |

Independence rules:
- The rows never share a sentence. Written can be `delivered` while audio is `processing`; each row
  shows its own state and its own timestamp.
- A `failed` audio never colours the written row; a `failed` written row makes the audio row show
  "waiting for the written reading" (◐), because audio depends on it.
- The total and the itemised lines render only when every purchased line is at least `paid`; while
  any line is `pending`, show the lines that are settled and a hollow-dot row for the one that is not,
  with no total.
- Refresh is a read: the page re-fetches the order and re-renders; nothing on this page ever writes
  (scope rule "never start fulfillment or repeat charges").

Layout: rows use `border-bottom:1px solid var(--rule)`, glyph column `28px`, state word in bold ink
at body size, the plain line at body size, the action as a `text-button`. No pills, no colour-coded
badges, no progress bars — a 55+ reader on a phone should never have to decode a colour.

---

## 5. What to leave alone

- The paper shell: cream, Georgia, the masthead with the double rule, the single restrained red.
  Both pages are correctly "the letter continues".
- One button, one action on the bridge. Do not add a "skip" link, a second button, or a "back to
  receipt" link — the scope is right that Upsell 1 owns the audio argument.
- No countdown, no timer, no "hurry". The bridge currently has none and must stay that way.
- Refresh and back behaviour: both verified safe and correct on the harness. Do not change the
  routing.
- Fail-closed on a bad order reference (no invented data). Keep.
- The "Local fulfillment test" box on the thank-you: it is a harness tool, not customer UI; it simply
  does not ship. Do not restyle it.
- The itemised receipt content itself (lines and amounts) is right; only its *weight* and *position*
  change (T1).
- Production rule noted, not fixed here: order data travels in the URL (`?order=<id>`). Production
  must use a signed, expiring token or a session — flagged in `thank-you/SCOPE.md` already.

---

## Claimed vs verified

| Claim | How verified |
|-------|--------------|
| Bridge button below the fold at 390×844 on the harness | Playwright bounding box: y=885.8, height=55.8, viewport 844 (with the test banner present) |
| Refresh keeps the bridge and the order | `page.reload()` → `#to-upsell` present, URL unchanged |
| Back from Upsell 1 returns to the bridge with the button | `goBack()` → URL `/bridge?order=…`, `#to-upsell` count 1 |
| Bad order fails closed | `/thank-you?order=nope` → "Order not found.", no order data rendered |
| Eyebrow 13px, h1 49px/36px, body 18px/17px, total 27px/25px | `getComputedStyle` at both widths |
| Contrast: muted-on-paper 5.73:1, ink-on-paper 14.99:1, button text 7.97:1, rule-on-paper 1.86:1 (decorative only) | computed from the `:root` hex values |
| Mock: 6.7 KB, zero `<script>`/external URLs, no horizontal scroll at 390 (scrollWidth 390), button + caption on the first screen at 390×844 (button bottom 780, caption bottom 838), h1 breaks after "reading" at 1100 | `wc -c`, grep for script/http, Playwright bounding boxes and screenshots at 1100×950 and 390×844 |
| The reference thank-you screenshot shows audio bought ($64.77); the order I was given has no audio ($47.77) | live probe text vs. screenshot — so the audio row was reviewed from the screenshot and the `thanks()` source, not live |
| Not verified: how the page behaves on a real Stripe redirect (harness only simulates payment); real webhook timing; the portrait in the mock is a CSS monogram because the real headshot is 25 KB of base64 | — |
