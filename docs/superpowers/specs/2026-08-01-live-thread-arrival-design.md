# The Live Thread — A New Arrival Mechanic for Email-to-Lander Traffic

**Date:** 2026-08-01
**Status:** Design approved by operator, pending implementation plan

## Background

A 10-agent audit (2026-08-01) found that Aiden, Evelyn, and Luna's daily emails each sell a specific, half-finished story (Aiden's "444"/Pinnacle Period, Evelyn's "the sentence you keep repeating," Luna's daily transit) and earn the click — but the lander the reader arrives at throws that story away: Aiden's lander doesn't parse the campaign param at all, Evelyn's captures it but never renders anything different because of it, and Luna shares a fully generic template with three other personas. Operator's read, after a first pass proposing incremental fixes to the existing 3-question quiz: **the quiz itself is just one possible concept, and it's the wrong one** — the goal is new structural concepts for the arrival mechanic, not a punch-list of timer/copy tweaks to the current one.

This spec covers the arrival mechanic only — what a reader sees between clicking an email and hitting the signup ask. Email verification and account creation mechanics are explicitly not being re-architected here (see Scope), though their surrounding presentation changes as a direct consequence of this design.

## Goal

Replace the quiz mechanic on the Aiden, Evelyn, and Luna landers with a single shared concept — **the Live Thread** — that:
1. Continues the specific email/campaign hook that earned the click, instead of resetting to a generic intro.
2. Looks and behaves like the real chat product from the first second, so there's no jarring switch between "marketing page" and "product."
3. Never loses what the reader typed, even across the signup/verification step.
4. Keeps *deliberate* friction at account creation (per operator: free credits shouldn't be handed to someone who won't complete even one more step) while removing *accidental* friction (artificial timers, dead air, generic "sign up" framing).

## Scope

**In scope:**
- The arrival experience on `/aiden`, `/evelyn`, `/luna` — replacing the quiz mechanics (`AidenQuizPage.tsx`'s quiz flow, `EvelynQuizMechanic.tsx`, `PersonaLanderPage.tsx`'s bucket-opener flow for Luna specifically).
- Campaign-aware content: replacing Evelyn's existing `emailReadingBriefs.ts` / `arrivalReading.ts` pattern with the single short-link-code registry described in Architecture, and extending that same pipeline integration to Aiden and Luna, so all three personas' content reaches the *lander*, not just the chat engine.
- An owned short-link redirector for carrying campaign context from email to lander reliably, resolving directly to the lander's content in one lookup (replacing the `?campaign=` query param for all three personas — see Architecture).
- The account-detection branch at the point the reader submits their email (existing account → magic link; no account → activation-incentive signup), and the in-thread confirmation messaging for both branches.
- Preserving the reader's typed reply across the signup/verification gap and seeding the real first chat message with it.
- Trivial friction removal that falls directly out of this redesign: no artificial per-question auto-advance delay, no forced "transition" wait screen, immediate resend availability (no 30s/60s hidden-button timer).

**Out of scope (explicitly not part of this design):**
- Marcus, Nova, Maren's shared `PersonaLanderPage.tsx` — no active email program drives traffic to them today per the audit; de-genericizing that shared component is a separate, later effort.
- Structurally removing or restructuring email verification itself (the "collapse the double-verification hop" bigger bet from the prior audit). Verification stays required for new accounts — this design changes its framing and the UI around it, not whether it happens.
- Live/AI-generated payoff content for anonymous, pre-signup visitors. All arrival-mechanic content is pre-written per campaign, produced by each persona's email-build pipeline (see Architecture), so there is no LLM cost for a visitor who never converts.
- Any pay-to-enter or entry-pricing experiment. Per the prior audit's recommendation, that's held until continuity/friction fixes are shipped and measured.
- The exact free-minutes number. This spec uses **10 minutes** as the working number for the activation-incentive path; the operator may revise before implementation.

## The concept: Live Thread

Instead of a quiz, a bio card, or a form, the lander renders as a chat transcript already in progress, visually identical to the real chat product. The persona's first bubble continues the specific hook from the email/campaign the reader clicked. The reader's reply goes in as a normal chat message, not a form field. Signup happens as a brief inline interruption inside that same thread, not a page swap — and once past it, the reader lands in the real chat with their reply already there and the persona responding to it directly.

Two other concepts were considered and set aside for now:
- **The Continuation Page** — a static page with the campaign's open loop as a headline and a single text box. Cheaper to build (reuses the brief data with a plain page instead of chat-styled UI) but doesn't remove the jarring page-to-product switch. Worth revisiting as a fast fallback if the Live Thread's build cost proves too high for a first slice.
- **Instant Mini-Reveal Card** — a one-tap, no-typing reveal (numerology flourish / card flip / chart wheel) delivering a free templated "verdict" before any signup ask, Keen-competitor style. Removes typing friction entirely but loses the "half-typed disclosure, skin in the game" effect the winning email format depends on.

## Wireframes

All frames below use Aiden's "444" send (`aiden-blueprint-04-tell` campaign, reached via a short-link code like `/e/f8k2m1` rather than a query param — see Architecture) as the concrete example. Same structure applies to Evelyn and Luna, reskinned with persona voice/visuals.

### Frame 1 — Arrival (0 seconds after click, before any signup ask)

```
┌─────────────────────────────────────┐
│  ← Aiden Powers           🔒 secure  │
├─────────────────────────────────────┤
│                                       │
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden                       │   │
│  │                                │   │
│  │ You picked up. Good.           │   │
│  │ I've been holding that 444     │   │
│  │ since your email came in.      │   │
│  │                                │   │
│  │ Tell me — what number's been   │   │
│  │ calling you? I'll tell you     │   │
│  │ what it's actually saying.     │   │
│  └───────────────────────────────┘   │
│                          10:41 AM    │
│                                       │
│         (nothing else on screen —    │
│          no quiz, no bio card,       │
│          no star rating, no wait)    │
│                                       │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐   │
│  │ Type your reply...           │▶│   │  ← real chat compose bar, not a form
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

The persona's opening bubble is the `continueSeed` resolved directly from the short-link code (see Architecture) — produced as a byproduct of that day's email-build pipeline, not written separately. If the code is missing, unresolvable, or not yet paired with content (e.g. direct traffic, a forwarded/typo'd link, a test send), fall back to a generic-but-still-in-character opener — never to the old quiz.

### Frame 2 — Reader replies, hits send; existing account detected

```
┌─────────────────────────────────────┐
│  ← Aiden Powers           🔒 secure  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden: Tell me — what       │   │
│  │ number's been calling you? ... │   │
│  └───────────────────────────────┘   │
│                    ┌───────────────┐ │
│                    │444. Every day.│ │  ← their reply, rendered as a real
│                    └───────────────┘ │     sent chat bubble, not form input
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden                       │   │
│  │ I know you — good. Check your  │   │
│  │ email for a one-tap link back  │   │
│  │ to right here.                 │   │
│  └───────────────────────────────┘   │
├─────────────────────────────────────┤
│  ✉️  Sent to you@example.com          │
│      Resend available now            │
└─────────────────────────────────────┘
```

### Frame 2b — No account found (activation-incentive framing)

```
┌─────────────────────────────────────┐
│  ← Aiden Powers           🔒 secure  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden: Tell me — what       │   │
│  │ number's been calling you? ... │   │
│  └───────────────────────────────┘   │
│                    ┌───────────────┐ │
│                    │444. Every day.│ │
│                    └───────────────┘ │
├─────────────────────────────────────┤
│  Activate your account to unlock     │
│  this — you'll get 10 free minutes   │
│  with Aiden to keep going.            │
│                                       │
│  [ your@email.com              ]     │
│  [ Activate & claim 10 free min → ]  │
│                                       │
│  We'll email you a one-click link.   │
│  No password needed.                 │
└─────────────────────────────────────┘
```

### Frame 2c — Right after they submit their email (still inside the thread)

```
┌─────────────────────────────────────┐
│  ← Aiden Powers           🔒 secure  │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden: Tell me — what       │   │
│  │ number's been calling you? ... │   │
│  └───────────────────────────────┘   │
│                    ┌───────────────┐ │
│                    │444. Every day.│ │
│                    └───────────────┘ │
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden                       │   │
│  │ Good — I've got it saved.      │   │
│  │ Check your email: one tap and  │   │
│  │ your 10 free minutes go live,  │   │
│  │ and I'll tell you what 444's   │   │
│  │ really saying.                 │   │
│  └───────────────────────────────┘   │
│                          10:42 AM    │
├─────────────────────────────────────┤
│  ✉️  Sent to you@example.com          │
│      Resend available now            │
└─────────────────────────────────────┘
```

The reward/confirmation is a message from the persona, in the thread, not a system banner — it stays part of the scrollable conversation history the reader can revisit while checking their inbox, rather than copy that disappears once submitted.

### Frame 3 — Post-auth (magic link or verification click), same thread continues

```
┌─────────────────────────────────────┐
│  ← Aiden Powers           ● online   │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden: Tell me — what       │   │
│  │ number's been calling you? ... │   │
│  └───────────────────────────────┘   │
│                    ┌───────────────┐ │
│                    │444. Every day.│ │
│                    └───────────────┘ │
│  ┌───────────────────────────────┐   │
│  │ 🔮 Aiden                       │   │
│  │ Every day — that's not         │   │
│  │ coincidence. That's a Pinnacle │   │
│  │ Period doing exactly what it   │   │
│  │ does right before it turns...  │   │
│  └───────────────────────────────┘   │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐   │
│  │ Type your reply...           │▶│   │
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

This response is generated the same way Evelyn's chat-side arrival-reading injection already works today (`generateGreeting`/`buildMessageContext` in `chatEngine.ts`, reading from `arrivalReading.ts`) — the only change is that the reader's reply now exists *before* this message generates, so the response can react to what they actually said instead of opening cold.

## Decisions from design discussion

- **Shared framework, reskinned per persona** — one Live Thread component/pattern, not three bespoke builds. Persona voice/visuals come from the same kind of per-persona config that already differentiates system prompts today (`personaLanderConfig.ts`).
- **Campaign-aware, not just persona-aware** — the opening bubble reacts to the specific email/campaign, not just which persona sent it. Requires extending pipeline integration to Aiden and Luna (today only Evelyn has any per-campaign continuity at all, and it doesn't yet reach her lander either).
- **Pre-written payoff content, zero live-AI cost pre-signup** — every persona bubble a visitor can see before authenticating is resolved from content produced ahead of time by the email-build pipeline, usually reusing a line already written for the email itself rather than net-new authoring (see "Lander content is a byproduct" below).
- **Existing account → magic link, not re-registration.** Detected by email lookup at submit time. Reuses the magic-link mechanism that already works cleanly for Path B (registered-user re-engagement) elsewhere in the app.
- **No account → intentional friction stays, reframed as reward-claim.** Verification is not removed. The ask is framed as "activate & claim N free minutes" rather than "sign up," on the reasoning that someone unwilling to complete one more step to claim a named reward was never a real prospect. Free-minute grant is provisionally **higher (10 min, exact number TBD)** for readers who engaged via a real typed disclosure through this flow, versus whatever the baseline grant is for a cold signup elsewhere (e.g. directly via `/login`).
- **Reply survives the gap.** Whatever the reader typed before hitting the signup/magic-link branch is stashed against the session and reappears as the seed of the real first chat message — never re-asked, never lost.
- **Confirmation lives in the thread, not a banner.** Both the magic-link case and the activation-incentive case post their confirmation as a persona-voiced chat bubble, not a system-style status message, so it's still visible if the reader scrolls back while waiting.
- **No artificial resend delay.** Resend is available immediately, rather than the current pattern of hiding it for 30-60 seconds.
- **Lander content is a byproduct of each day's email pipeline, not a second authoring task.** At a daily send cadence (Luna sends every day), requiring a human to separately write lander copy for every campaign in addition to the email itself doesn't scale. Instead, whatever already builds that day's email (Evelyn's `render-aweber.mjs`-style pipeline, Luna's transit-driven generation, Aiden's equivalent once built) is extended to also emit the lander's opening bubble in the same pass — usually by reusing a line that's already being written for the email's own CTA/open-loop (see Architecture), not composing new copy.
- **One registry, not two.** The short-link code maps directly to the full lander content (`continueSeed`/`openLoop`/`readingRecap`), not just to a campaign label that then requires a second lookup into a separate brief file. `campaign` survives only as a human-readable label on that same row, for reporting continuity.
- **Campaign context travels via an owned short-link redirector, not a query param.** `?campaign=` (and Kit's equivalent UTM-adjacent params) are unreliable in practice: Apple's Link Tracking Protection and similar tools strip recognized tracking-style query parameters, the ESP's own click-tracking wrapper adds another hop that can mangle a long descriptive URL, and the app itself has a confirmed existing bug where in-app email-client redirects drop query params. A short opaque path-based code (`/e/f8k2m1`), resolved server-side and turned into a durable session before React ever renders, sidesteps the stripping heuristics (which target query strings, not path segments) and removes dependence on the original param surviving multiple hops. This applies to **campaign context only** — the `email` merge-tag hint stays exactly as scoped below (a prefill, never trusted for identity), since carrying it through the same mechanism would require minting a unique code per recipient at send time, a materially bigger integration with the ESP's send pipeline for a field that only saves one input step.

## Architecture

### Components
- **`LiveThreadLander`** (new, shared) — one React component rendering the chat-styled transcript, reused across `/aiden`, `/evelyn`, `/luna`, replacing `AidenQuizPage`'s quiz flow, `EvelynQuizMechanic`, and Luna's bucket-opener flow in `PersonaLanderPage.tsx`. Takes persona voice/theme from `personaLanderConfig.ts`-style config.
- **Short-link redirector** (new) — a `GET /e/:code` route plus one mapping table, replacing both the old `?campaign=` query param and the separate `emailReadingBriefs.ts` lookup:
  ```
  email_link_codes
    code:          "f8k2m1"
    personaSlug:   "aiden-powers"
    campaign:      "aiden-blueprint-04-tell"   ← label only, for reporting
    readingRecap:  "..."
    openLoop:      "..."
    continueSeed:  "You picked up. Good. I've been holding that 444..."
    createdAt / expiresAt
  ```
  On hit, the route resolves the code in one lookup, writes `campaign` + the content fields into a fresh lander session, and 302s into `/{persona}` with a durable session already established — no second registry to keep in sync.
- **Pipeline integration for content authoring** — each persona's existing daily email-build process is extended to emit a row in `email_link_codes` (and mint its code) as part of the same run that produces that day's email, not as a separate authoring step:
  - **Evelyn**: extend the reframe-deck's `render-aweber.mjs`-style pipeline to lift `continueSeed` from the send's own CTA/open-loop line (already written for the email) and write it to the table alongside the rendered HTML.
  - **Luna**: extend the transit-driven daily generation so the same underlying transit data that produces the email's hook also produces the lander's opener — one generation pass, two outputs.
  - **Aiden**: needs an equivalent build pipeline first (today's sends are more ad hoc per the audit); should follow the same pattern once built.
  - A manual-override field should exist in all three for the rare send where reusing the email's own line doesn't fit well.
- **Anonymous reply persistence** — reuse the existing `*_lander_sessions` tables (already storing `campaign` per visit) to also store the reader's typed reply text before any account exists, keyed to the lander session token already generated today.
- **Account-detection endpoint** — a lightweight check at email-submit time: does this email match an existing verified account? Branches to (a) magic-link generation or (b) new-account creation + verification-with-incentive email.
- **Magic-link / verification link extension** — both link types need to carry enough reference (lander session token, or the campaign + stashed reply directly) so that clicking through attaches the reply to the resulting session before the real chat renders.
- **Differentiated free-minute grant** — the grant logic needs a path for "activated via engaged Live Thread disclosure" to award the higher (10 min, TBD) amount, distinct from whatever the baseline signup grant is elsewhere.

### Data flow
1. Reader clicks email → hits `/e/{code}` → server resolves the code in one lookup (`personaSlug`, `campaign`, and the content fields together), writes them into a fresh lander session, and redirects to `/{persona}` → `LiveThreadLander` renders Frame 1 with the resolved `continueSeed`.
2. Reader types a reply → client posts it to the existing lander-session endpoint, which stores the reply text against the session row already tracking `campaign`.
3. Reader submits email:
   - **Match found** → generate a magic link carrying the lander session token → send → render Frame 2 (in-thread confirmation) → resend available immediately.
   - **No match** → create a pending account, generate a verification link carrying the same session token + the "TBD-minutes activation grant" flag → send → render Frame 2b→2c (activation-incentive ask, then in-thread confirmation) → resend available immediately.
4. Reader clicks the link (magic link or verification) → server verifies/authenticates → looks up the stashed reply via the session token → attaches it to the now-authenticated session → redirects into the real chat.
5. Chat renders Frame 3: the stashed reply appears as the first user message, and the existing arrival-reading injection (already built for Evelyn) generates the persona's response to it directly, rather than a cold greeting.

## Error handling / edge cases

- **In-app email clients stripping query params on the verification/magic-link redirect** — a known existing issue (flagged in the prior audit for `LoginPage.tsx`). Since this design's entire value proposition depends on the reply surviving to the other side, this needs explicit handling (server-side session lookup that doesn't solely depend on a client-carried param) and a test, not just a copy fix.
- **The short-link code itself fails to arrive or resolve** (link forwarded, code typo'd/truncated, code expired or never existed — e.g. a test/preview send) — fall back to the generic in-character opener below, exactly as if no campaign had been provided. The redirector reduces how often context is lost; it doesn't guarantee it never is, so this path must be a well-designed fallback, not an error state.
- **A resolved code has no content paired with it yet** (e.g. the email-build pipeline integration isn't live yet for that persona, or a send went out before its row was written) — fall back to a generic in-character opener, never to the old quiz UI.
- **Email-exists check as an enumeration signal** — checking whether an email matches an account before deciding magic-link-vs-registration is a mild account-enumeration exposure. Acceptable for a consumer app of this kind, but worth a conscious sign-off rather than an unexamined default.
- **Reader never returns to click either link** — no special handling proposed here; this is the intentional friction the operator wants preserved as a quality filter.

## Testing

- Code resolution: correct opening bubble/recap returned for a given code, generic fallback when the code is missing/unresolvable/uncontented.
- Pipeline integration: each persona's email-build run correctly writes a paired `email_link_codes` row (and mints a working code) alongside the rendered email, for at least one real send per persona before launch.
- Reply persistence: typed reply survives from anonymous lander session through to the first authenticated chat message, for both the magic-link and activation-incentive branches.
- Account-detection branch: existing accounts route to magic link; new emails route to activation-incentive signup.
- Resend: available immediately in both branches, no artificial delay.
- Regression coverage for the known query-param-stripping issue on the verification/magic-link redirect.
- Existing `arrivalReading.ts`/`generateGreeting` coverage (already in place for Evelyn) extended to confirm it fires correctly with a reply now present at first render, for all three personas.

## Open questions for implementation planning

- Exact free-minute number for the activation-incentive path (10 is a placeholder).
- Whether the account-detection check needs rate-limiting/abuse protection given it's a new unauthenticated endpoint.
- Whether Aiden's email-build pipeline needs to be constructed from scratch (per the audit, his sends are more ad hoc today than Evelyn's or Luna's) before pipeline integration is possible for him.
- Whether AWeber/Kit can be configured to not additionally wrap the `/e/:code` link in their own click-tracking redirect, or whether that wrapper is unavoidable and simply becomes an extra (lower-risk, since it's now wrapping a short opaque link) hop.
- Code lifetime/expiry policy for `/e/:code` entries, and the exact shape of the manual-override field for sends where reusing the email's own line doesn't produce a good `continueSeed`.
