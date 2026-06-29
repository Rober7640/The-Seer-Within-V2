# Structural A/B tests — the one-time dev pattern

**Related:** `docs/ab-testing-framework-prd.md` §4 (worked example), §3 (architecture).

A **config test** (copy/price/threshold) is zero-dev — you define variant payloads in
`/admin/experiments` and the code reads `assign(key, id).payload.*`. A **structural
test** varies *what the UI/flow is* (a redesigned modal, quiz-vs-chatbox) — no
dashboard can author a React component, so a developer wires it **once**, then it is
run/ramped/measured from the dashboard like any other test. Phase 4c is the worked
example: the `/evelyn` lander mechanic (open **chatbox** vs 3-tap **quiz**).

## The five pieces (all you ever write)

1. **A variant component** — the new UI/flow as its own component.
   _Example:_ `client/src/pages/evelyn-lander/EvelynQuizMechanic.tsx`. Keep it
   self-contained and have it converge on the **same** downstream action as the
   control (here: the same LoginPage signup), so the test compares the *mechanic*,
   not the destination.

2. **A branch in the host page**, gated on the assigned **variant key** via the
   visitor-path hook:
   ```ts
   const { variant, ready } = useABVariant("evelyn_lander", "mechanic", "chatbox");
   if (!ready) return <Spinner/>;              // hold to avoid a flash between arms
   if (variant === "quiz") return <QuizMechanic .../>;
   // else: the control (default) flow — byte-identical when the test is OFF
   ```
   `useABVariant(page, element, default)` (`client/src/hooks/useABTest.ts`) returns
   the arm **key** (not a copy value), defaulting + timing out to `default` so a
   missing/slow test never changes or hangs the page.

3. **A single registration** — one draft experiment (seeded in
   `server/scripts/migrateExperiments.ts`, or created in the dashboard):
   - `subjectType: 'visitor'` (landers are pre-login; the subject is the `ab_vid`
     cookie, minted by `GET /api/ab/assign`).
   - `scope: { route: '<page>', element: '<element>' }` — **`element` is required**;
     the public `/api/ab/assign` skips visitor tests that don't set one.
   - `variants: [{ key:'<control>' }, { key:'<treatment>' }]` — control is
     `variants[0]`; payloads are usually `{}` (the *key* drives the branch).
   - `conversion: { type:'event', name:'<metric>' }`.

4. **A conversion call** at the success site: `trackABConversion("<page>")`. For a
   cross-page metric (e.g. signup happens on `/login`), call it there — the `ab_vid`
   cookie + the prior lander exposure still attribute it to the right arm. Both arms
   should fire the same call so control conversions are counted too.

5. **Measurement** — none to write. The `event` tally
   (`tallyEvent` → exposures ⋈ deduped `experiment_conversions`) is reused; results
   show in `/admin/experiments`.

## Safety / preview

- **OFF ⇒ byte-identical.** Draft ⇒ `/api/ab/assign` returns no arm ⇒ `useABVariant`
  yields the default ⇒ the control flow renders exactly as before.
- **Preview without enrolling:** the host page honours a non-prod `?<element>=<variant>`
  override (e.g. `/evelyn?mechanic=quiz` in dev) so you can self-audit each arm
  before the test is ever started.
- **To run:** author/seed the draft, then **Start** in `/admin/experiments`. Primary
  metric should be **pre-stitch** (signup), since visitor→user purchase attribution
  needs the identity stitch (the open §1 gap in the findings doc).
