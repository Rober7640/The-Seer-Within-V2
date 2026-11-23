# Belief lanes → the `/fb` chat A/B test (`v1_fb_chat_flow_2026`)

**Date:** 2026-11-23
**Base branch:** `origin/Production` (see Constraints — the experiment code is Production-only)
**Status:** awaiting approval

## Intent & why

Joel's ask (verbatim): *"Belief lanes (manifest, generational, astrology + the others): move them onto the /fb chat engine and run the same chat A/B test (v1_fb_chat_flow_2026) on them. Keep each lane's own lander text."*

Today the belief-lane landers (`/fb?lane=<id>`) are **deliberately excluded** from the live interview-vs-reading experiment. In `useConversation.ts` the lane branch hits an early `return` *before* the code asks the server for an A/B arm, so every lane visitor always gets today's "interview" chat. Joel wants lane traffic to join the same test — measure whether the shorter "reading" flow (arm B) beats the interview flow (arm A) on lane traffic too — while each lane keeps its own landing-page copy.

## Goals

- Lane traffic enrolls in `v1_fb_chat_flow_2026` exactly like plain `/fb`: ~50% arm A (interview), ~50% arm B (reading), assigned on the visitor cookie, exposure logged once.
- Arm B carries each lane's belief: the lane `directive` rides through all four reading steps (`fbB1/2/3` + diagnosis), so an astrology-lane reading reads as astrology, not generic.
- Each lane's **lander page copy** (the `card` + `body` in `shared/beliefLanes.ts`) is byte-unchanged.
- Plain `/fb` (no lane) stays byte-identical.

## Non-goals

- No change to lander page copy, keywords, metadata, or the registry schema.
- No new lanes. (Pattern/family drafts stay separate work.)
- No change to arm A's existing behavior for plain `/fb`, nor to the A/B assignment math, endpoint, or tally.

## Anti-goals (would make this a failure even if it "works")

- The belief silently vanishing in arm B (a lane reading that's indistinguishable from plain `/fb`). This is the exact fb-palm-derail failure the `laneDirective` mechanism exists to prevent.
- A forged/stale `?lane=` id changing the prompt. The server's closed `getLane()` check must still drop unknown ids.
- Double-counting or mis-attributed exposures.

## Constraints

- **Production-only base.** The `v1_fb_chat_flow_2026` code (`fbChatFlowPrompts.ts`, `fbChatFlowB.ts`, `fbChatFlow.ts`, the `chatFlow` field, the endpoint) exists on `origin/Production` but **not** on `development` — the branches are diverged and this feature shipped straight to Production. Both lanes (manifest, astrology) are present on the Production base. → Build on a branch off `origin/Production`; PR to Production. Development has neither the experiment nor PostHog (dev sends no events), so a dev port is lower priority and tracked as a follow-up, not part of this change.
- The experiment only fires when `currentFunnel() === 'v1-fb'`. Lanes already live inside funnel `v1-fb`, so they're in scope.
- Dev DB / prod DB each need the `conversations.lane` column — already done for both (prior lane work).

## Approaches

**Approach 1 — standard arms, belief threaded via the directive (RECOMMENDED).**
Lane traffic runs the *same two flows as plain `/fb`*, openers included (arm A greeting / arm B candle+number script), with the lane's `bucket` preset so the topic step is skipped (lanes already know the topic), and the lane `directive` threaded into both arms' deepening prompts. The lane's bespoke chat opener (`laneOpenerBeforeName/AfterName/laneQuestion`) is retired — it is the lane's *chat*, not its *lander text*, so retiring it honors "keep each lane's own lander text" literally. The belief is carried into the chat by the directive, which is the mechanism built for exactly this (keeps an identity alive once the generic deepening resumes).
- *Pro:* faithful to "the same A/B test"; minimal new surface; arm B's scripted candle→smoke→diagnosis payoff stays coherent and intact; clean test (both arms share the opener package, mirroring plain `/fb`).
- *Con:* a lane visitor sees arm B's generic candle/numerology cold-open before the belief re-centers at the first reading step. Acceptable — the directive re-centers immediately, and Joel scoped preservation to the lander.

**Approach 2 — keep each lane's bespoke chat opener, fork only the deepening.**
Keep the lane opener (ad → lander → chat continuity), then branch into arm A or arm B for the deepening only. Requires making arm B's prompts candle-agnostic (the `session()` block and the diagnosis both assume the client showed the candle/smoke opener, which the lane opener does not).
- *Pro:* most lane-faithful; preserves the belief-specific opening copy.
- *Con:* guts arm B's strongest beat (the smoke-loop diagnosis payoff) for lane traffic; more surface area in `fbChatFlowPrompts.ts`; arm B for lanes diverges from arm B for plain `/fb`, muddying the comparison. Joel named only the *lander text* to keep, not the lane chat opener.

**Decision: Approach 1.** It's the literal reading of "run the same A/B test … keep each lane's own lander text," it's the smaller/safer change, and it keeps arm B coherent. Reversible toward Approach 2 if Joel later wants the bespoke opener retained.

## The how (decided)

1. **Client — enroll lanes, preset topic, retire the bespoke opener** (`client/src/hooks/useConversation.ts`):
   - In the lane block (~605–620): capture `lane` + `bucket` into `userData`, call `fetchAssignedFbChatFlow()`, store `chatFlow`, then fall through into the standard per-arm opener instead of `return`ing. Reuse the existing "preset bucket → skip topic step" path (the palm/tarot/read quiz-bridge machinery) so the known topic isn't re-asked.
   - Ensure `userData.lane` persists across the EMAIL_CAPTURE path (the map flagged it currently only persists on the no-optin branch).
2. **Server — thread the belief into arm B** (`server/lib/fbChatFlowPrompts.ts`):
   - `import { laneDirective } from './prompts'` and export `laneDirective` from `prompts.ts`.
   - In `wrap()`, append `${laneDirective(u)}` after the `session(u, earlier)` block. `laneDirective` returns `''` for non-lane traffic, so plain `/fb` arm B is byte-identical. This single point covers `fbB1/2/3` + diagnosis.
3. **No change** to the assignment logic (`resolveFbChatFlow`, the `/api/fb/chat-flow` endpoint, exposure logging) or the lane registry.
4. **Server lane validation** (`routes.ts` ~739): unchanged — the closed `getLane()` check already trusts/drops the id before the arm-B builders run.

## Tests

- Unit: `laneDirective` appears in `buildFbB1/2/3/Diagnosis` prompts when `userData.lane` is a known id, and is absent (byte-identical) for no-lane and unknown-lane.
- Unit: plain `/fb` arm-B prompts unchanged (snapshot).
- Playwright (vs dev host, `playwright.staging.config.ts` pattern): a `?lane=astrology&chatflow=b` preview walks name → reading steps → diagnosis without the belief dropping; `?lane=astrology&chatflow=a` still works; plain `/fb?chatflow=b` unchanged.
- Add entries to `docs/test-ideas.md`.

## What's left to the builder

- Exact reuse of the quiz-bridge "preset bucket / skip topic" path for lanes (palm/tarot precedent, ~line 800) vs. a minimal lane-specific skip — builder picks the smaller diff.
- Whether to keep the lane's `chat` opener beats defined in the registry (now unused for `/fb` arm flow) or leave them in place as dead-but-harmless copy — recommend leaving the registry untouched this change.
- The `development` port + any need to first back-port the experiment to dev — tracked as a follow-up, out of scope here.
