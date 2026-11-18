# Wiring: making `/fb` serve lanes

Only after the operator has approved the lane's copy. Line numbers are from Production on
2026-11-17 and will drift, so grep before you trust them.

**Where to work.** Use a fresh clone outside OneDrive (e.g. `~/tsw-lanes`), on a branch off
`origin/Production`, with `.env` copied over. The OneDrive checkout has had its git state
overwritten mid-session before, wiping uncommitted files.

## Is the one-time build done?

`git show "origin/Production:shared/beliefLanes.ts"`. If the file exists, skip to **Adding a
lane**. If not, do the one-time build below first, as one PR.

## One-time build

Each piece reuses something `/fb` already does. Nothing here is copied from the tarot code.

| Piece | Build it on | Notes |
|---|---|---|
| **Registry** `shared/beliefLanes.ts` | the lane JSON shape (`lane-json.md`) | Client and server both import it. The server already uses `@shared/…` imports (e.g. `@shared/landerBumpRouting`). Unknown ids return `undefined` |
| **Card** | the `?v=` variants in `client/src/pages/LandingPage.tsx` (map ~9–35, read at ~40) | A lane fills the four spots. Below-card sections, FAQ and second button render only when a lane is set. |
| **Button keeps the lane** | `client/src/components/CTAButton.tsx:27`: `funnelPath('/chat')` drops the query string | With a valid lane, go to `/fb/chat?lane=<id>`. Without one, the link is unchanged |
| **Server HTML for Meta** | `server/static.ts:16` (prod, one `index.html` for every route) and `server/vite.ts:~51` (dev, after `transformIndexHtml`) | A pure function rewrites `<title>`, `og:title` and `og:description`, adds `meta description`, and puts a static copy of the card text and below-card copy inside `<div id="root">`. `createRoot` (`client/src/main.tsx:33`) replaces it on mount. HTML-escape everything. No hidden text |
| **Opener** | the `/fb-read` branch in `client/src/hooks/useConversation.ts` (~862–880: parse params → skip topic buttons → set bucket → store the hook) | Beat 1 replaces the greeting at ~590–603 only when a lane is set. Keep "What's your first name, dear?". Read the state machine to place beat 6 as the first deepening input, and record where. **Don't model it on the tarot branch (~800–812).** That one deliberately keeps the deep flow generic (`improve-v1/11-fb-tarot-identity-carry-SCOPE.md`) |
| **Lane in later steps** | `readDirective()` in `server/lib/prompts.ts:~424` (and `palmDirective` ~385), injected into `buildReading1Prompt`, `buildReading2Prompt` and the others | `laneDirective(userData)` returns the lane's `directive`, injected wherever `readDirective` is. `userData.lane` sits beside `readHook` in `client/src/types/chat.ts:~125`. The server accepts it as it accepts `readHook` (`server/routes.ts:~711`) and validates it against the registry |
| **Tracking** | `client/src/lib/tarotAttribution.ts` (record once, keep for the tab in sessionStorage) | Stripe gets an additive metadata key `lane`, and `product` stays `energy_clearing_ritual` (`server/routes.ts` ~1112). AWeber gets an additive tag `lane-<id>` (see `fbifyAweberTags` ~420). PostHog gets a `lane` property on `lander_view` and the funnel events. Same pixel, same UTMs |
| **DB** | an existing `conversations` column if one fits; otherwise a hand-applied `improve-v1/add-conversations-lane-column-<date>.sql` | Never `db:push`. Apply to prod **before** the code deploy (the BE deploy trap) |

**Tests in the same PR.** No-lane `/fb` stays byte-identical. A copy-rule test runs over every
registry string. A server HTML unit test (`npx tsx --test`). A Playwright test with JavaScript
off shows the lane text, and plain `/fb` keeps the original title. The derail replay, adapted from
`improve-v1/evidence/fb-palm-derail-replay.mjs`.

## Adding a lane (once the build exists)

1. Add the registry entry from the approved JSON. The card is `card.v2`; ignore `parked`.
2. Run the tests. The registry tests cover the new lane automatically.
3. Do the stage 7 proofs for this lane.
4. Release: local, then dev, then Production, each step only with the operator's go.
