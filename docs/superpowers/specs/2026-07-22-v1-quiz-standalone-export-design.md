# Standalone fb-palm Quiz Funnel Export — Design

**Date:** 2026-07-22
**Status:** Approved (design); spec pending user review
**Owner decision context:** explore exporting the V1 quiz system into another project (new niche/brand clone)

## Purpose

Produce a **standalone runnable repo** containing only the V1 quiz funnel — the fb-palm
quiz-bridge landers, the chat reading experience, and the full monetization chain —
so the machine can be cloned into a new niche/brand later by swapping content.
Evelyn content ships as the working example; no content restructuring in this pass.

## Decision log

| Decision | Choice |
|---|---|
| Destination purpose | New niche/brand clone (architecture kept, content swapped later) |
| Funnel depth | Full chain incl. both upsells and shipping |
| Lander families | fb-palm quiz bridge ONLY (no base `/` lander, no /fb //fb2 /gdn pages, no soulmate) |
| Deliverable | Standalone runnable repo, end-to-end |
| Templating | Port as-is — zero behavior changes; niche swap = edit registries later |
| Peripherals | Keep, env-gated: ad attribution (FB Pixel+CAPI, Google Ads, PostHog) + lead list-adds (AWeber/Kit/Resend). **Corrected 2026-07-22:** the "follow-up email engine + cron" opted for earlier turned out to be V2-only — all 13 cron jobs (incl. the Evelyn-named generators, which serve the V2 `/evelyn` lander) and the reconciliation sweep (V2 `credit_purchases`) belong to V2. V1's email marketing is external AWeber automations triggered by the kept tag calls, so the cron scheduler ships nothing and is cut entirely |
| Woven prompt A/B | **Control-only** (operator decision 2026-07-22): experiments framework NOT ported. The client's `/api/ab/assign` fetch already degrades gracefully to control; the `?clearing=woven` URL override remains for QA/self-test; `priceVariant.ts`'s `logExposure` shadow-writes are stripped |
| Skills/tooling port | **Full port** (operator decision 2026-07-22, added during execution): the three funnel-specific skills ship in the standalone — v1-funnel-audit (as BOTH `scripts/audit/*` + `npm run audit:*` entries AND an adapted `.claude/skills/` entry), fb-palm-add-sign, v1-funnel-eval (adapted `.claude/skills/` entries). Paths adapted to the standalone's `/fb-palm`-mounted routes; V2-subject skills stay cut. Amends the original "project skills" line in the cut list |
| New repo | `cywei99/quiz-funnel-standalone` (private, created + pushed via gh CLI) |
| Always ships | Safety filtering (`universalSafety`) + crisis hotlines |
| Extraction method | **Subtractive carve**: clone repo → delete V2/other funnels → let TypeScript name orphans → prune → verify |
| Git history | Fresh history, one initial commit; this repo remains the archaeological record |

## Verified facts (grounding)

- **Corrected:** V1 palm chat DOES touch the experiments framework in two places:
  (1) `useConversation.ts:437` fetches `/api/ab/assign?page=v1_chat_palm` to resolve
  the live 'clearing' (woven context-class) prompt A/B — with a graceful fallback to
  control when the endpoint is absent, plus a `?clearing=woven|control` URL override;
  (2) `priceVariant.ts:302` shadow-logs price-test exposures via `logExposure`.
  Decision: the standalone ships **control-only** — no framework; the client fetch is
  left untouched (fails → control), the `logExposure` call sites are stripped.
  `prompts.ts` itself branches only on `userData.promptVariant` (server-validated,
  client-supplied) — those branches survive unchanged, so `?clearing=woven` still works.
- Prices come from the legacy `system_config` split via `server/lib/priceVariant.ts`
  (`conversations` + `systemConfig` tables), including the 55-35 sliding-close variants.
- Known-core V1 tables: `conversations`, `system_config`, `bracelet_orders`.
  Final table list is inventoried at plan time (cron/fraud/reconciliation may add tables).
- `server/routes.ts` (3,649 lines) defines the V1 endpoints inline AND mounts all V2
  routers — the carve is mostly deleting mounts and trimming imports.
- `server/routes/webhooks.ts` is shared: V1 needs its sale/upsell1/upsell2 purchase
  branches, trackdesk conversion reporting, gclid backfill, and `bracelet_*` handling;
  the soulmate branches and `migrateAndEmailFunnelUser` (V1→V2 bridge) are cut.
- fb-palm A/B/C = routes `/fb-palm`, `/fb-palm/b`, `/fb-palm/c` → `PalmBridge.tsx`;
  version A shows a static result card, B delivers the read as chat messages, C asks one
  open question and has the LLM read the answer. Registry: `client/src/content/palmReads.ts`
  (10 signs × 6 hooks, 976 lines).
- `server/routes/quiz.ts` is the **V2 Aiden quiz** (aidenQuizSessions) — cutting it does
  not touch fb-palm. The palm server-side sign rosters all live in surviving files:
  `validSigns` ×2 in `server/routes.ts`, `PALM_SIGN_VOCAB` in `server/lib/prompts.ts`,
  and the pricing-safety `OTHER_SIGNS` roster in `server/lib/priceVariantPool.test.ts`.

## 1. System boundary

The new repo serves exactly one funnel:

| Route | Page |
|---|---|
| `/` | 302 → `/fb-palm` |
| `/fb-palm`, `/fb-palm/b`, `/fb-palm/c` | `PalmBridge` (A/B/C versions) |
| `/fb-palm/chat` | `ChatPage` (V1 state machine + palm handoff) |
| `/fb-palm/welcome1` | `UpsellPage` (Protection Ritual $47) |
| `/fb-palm/welcome2` | `Upsell2Page` (bracelet $47/$30, shipping, 1-click charge) |
| `/fb-palm/success` | `SuccessPage` |
| `/privacy`, `/terms`, `/refund` | Legal pages (FB ad compliance) |
| anything else | `not-found` |

`shared/funnelConfig.ts` and `shared/fbPixelConfig.ts` ship **unchanged**; the
fb/fb2/gdn entries become inert because their routes no longer exist. This keeps the
palm attribution logic (product suffix " - PALM", aweber tag `-palm`, PostHog `palm`,
price-variant token parsing) byte-identical.

## 2. Client carve

- **Pages kept:** `PalmBridge`, `ChatPage`, `UpsellPage`, `Upsell2Page`, `SuccessPage`,
  `PrivacyPage`, `TermsPage`, `RefundPage`, `not-found`.
- **`App.tsx`:** trimmed to the routes above (incl. the root redirect); everything else
  (login, reading, credits, personas, admin, soulmate, evelyn-lander, product pages) deleted.
- **Supporting code kept untouched:** `useConversation.ts`, `lib/funnel.ts`,
  `content/palmReads.ts`, `types/chat.ts`, UI components they import,
  `client/public/palm/` art strips, and any other static assets the kept pages reference.
- **`SuccessPage.tsx` carve:** the Luna thank-you cross-sell block is removed — the
  `LUNA_UTM` constant, `lunaHref` state, the `/api/luna-ty/handoff` fetch, and the
  Luna offer card (`data-testid="link-luna-offer"`). It is the V1→V2 bridge, cut by scope.
- **`App.tsx`** also drops the `PayPalScriptProvider` wrapper (PayPal is V2-only).
- **Removed client code:** everything only reachable from deleted pages. Discovery is
  mechanical — delete the routes, then remove files until `tsc` + `vite build` are clean
  and a final import-graph audit shows no orphans.

## 3. Server carve

- **`server/routes.ts` keeps** its inline V1 endpoints: `/api/health*`, `/api/metrics`,
  `/api/chat`, `/api/location`, `/api/checkout`, `/api/lead`, `/api/save-progress`,
  `/api/conversation/:email`, `/api/conversation/resume/:id`, `/api/upsell/*`,
  `/api/shipping/save`, `/api/upsell2/*`, `/api/fb-event`.
- **`server/routes.ts` drops:** every V2 router mount (auth, chatService, credits, admin,
  personas, userStats, migrate, astrology, quiz, evelynLander, products, personaLander,
  crud), the soulmate endpoints, the luna-ty handoff, and the V1→V2 funnel-migration calls.
- **`server/routes/webhooks.ts`:** carved internally per Verified facts above.
- **`server/lib/cronJobs.ts`: deleted entirely** (corrected — every job is V2; see
  Decision log). `server/index.ts` drops `initializeCronJobs` and the
  `creditTracking` session-recovery/heartbeat calls (V2), keeping the rest of boot.
- **PayPal: removed everywhere** — client `PayPalScriptProvider` (all client PayPal
  usage is V2: credits/products/paywall), the `/paypal` webhook handler, and
  `server/lib/paypal.ts`. V1 checkout + upsells are Stripe-only.
- **`server/lib/priceVariant.ts`:** the `logExposure` shadow-write call sites are
  stripped (experiments framework not ported); assignment/pricing logic byte-identical.
- **`server/lib/` survivors** are discovered mechanically (delete mounts → TypeScript
  names every orphan). Expected core: claude/anthropic failover + model config +
  circuit breaker, `prompts.ts`, `universalSafety`, `crisisHotlines`, `priceVariant` +
  `priceVariantPool`, `stripeAccount`, `braceletOrders`, `aweber`, `kit`,
  `resendAudience`, `resendFunnelTags`, `facebook`, `googleAds`, `posthog`,
  `fraudDetection`, `predictionSanitizer`, `logger`, `db`, `storage`, `healthCheck`.
- **`server/index.ts`:** unchanged boot flow; `initializeCronJobs` now registers only
  the surviving V1 jobs.

## 4. Database & config

- **Fresh Supabase project** (any Postgres works; Supabase keeps parity with current ops).
- **`shared/schema.ts`** pruned to tables referenced by surviving server code.
  Known core: `conversations`, `system_config`, `bracelet_orders`. The plan-phase
  inventory greps every surviving file for schema imports to finalize the list.
- **Seed:** carved seed script — `system_config` price-variant defaults only
  (no admin user, no personas).
- **`.env.example` rewritten** to the true required set:
  `DATABASE_URL`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  plus optional gated keys (`AWEBER_*`, `KIT_*`, `RESEND_*`, `FB_PIXEL_ID`,
  `FB_ACCESS_TOKEN`, `FB_TEST_EVENT_CODE`, `SGTM_GADS_ENDPOINT`/`SGTM_PREVIEW_TOKEN`,
  `POSTHOG_API_KEY`/`VITE_POSTHOG_API_KEY`, `SENTRY_DSN`, Stripe dual-account/trackdesk
  extras). NeverBounce/Turnstile confirmed V2-only — cut. `JWT_SECRET` and
  `VITE_PAYPAL_CLIENT_ID` dropped. Final list is generated mechanically by sweeping
  surviving code for `process.env.*` / `import.meta.env.*`.
- **npm scripts / build unchanged:** vite + esbuild, `db:push`, `dev`, `start`.
  `package.json` dependencies pruned to what the survivors import.

## 5. Carve procedure (ordered)

1. Clone the repo into a sibling directory `quiz-funnel-standalone/` (rename freely);
   delete `.git`, `git init`, initial commit of the pristine copy (rollback anchor).
2. Delete V2 route mounts + soulmate/luna/migration endpoints from `server/routes.ts`;
   delete non-palm routes from `App.tsx`.
3. Loop: `npm run check` (tsc) → delete newly-orphaned files/imports → repeat until clean.
4. Carve the partial files: `webhooks.ts`, `cronJobs.ts`, seed script, `schema.ts` prune.
5. Prune `package.json` deps; rewrite `.env.example`; write a short README
   (setup: install → env → db:push → seed → dev).
6. Delete non-code baggage: `improve-v1/`, `improve-v2/`, `audit-runs/`,
   `attached_assets/`, `evelyncross-soulmate/`, `no-optin/`, `exports/`, analysis docs,
   `.claude/` project skills, keeping only docs that describe the quiz funnel
   (`fb-palm/docs/`, e.g. the PRD).
7. Trim `tests/` + Playwright configs to the surviving suites; fix references.
8. Run full verification (below); final import-graph audit for dead code.
9. **Hand-off to the new project:** push the carved repo to **`cywei99/quiz-funnel-standalone`**
   (private, `gh repo create`) and clone/import from there (Replit: "Import from GitHub"). If a file
   transfer is required instead, produce it with `git archive --format=zip` from the
   carved repo — tracked files only, so `.env` secrets and `node_modules` can never
   ride along. Never zip the original working directory (1.2 GB, contains live keys).

## 6. Verification — definition of done

1. `npm run check` and production build pass clean.
2. Surviving vitest units pass (e.g. `priceVariantPool.test`, `braceletIsolation.test`,
   `universalSafety.test`, chat-engine tests are V2 and go away).
3. The existing fb-palm Playwright suites pass against the standalone repo
   (`playwright.fb-palm-fingershape.config.ts`, `playwright.fb-palm-handsize.config.ts`).
4. Full-funnel flow pass in the style of the v1-funnel-audit skill, against a local
   sandbox with muted pixels and Stripe test mode: quiz tap (each of A/B/C once) →
   chat reading → checkout → upsell 1 → upsell 2 incl. shipping → success.
5. Headless chat-flow verification: `scripts/palm-flow-transcript.ts` (ported from the
   v1-funnel-eval skill) replays greeting → palm reflect → deepening → crisis → pitch →
   objection with the REAL prompt builders + live Anthropic call, printing the transcript.
   (No crons ship — boot must show zero schedulers and no `node-cron` references remain.)
6. Fresh-clone test: on a clean checkout with only `.env` populated, README steps
   (install → db:push → seed → dev) produce a working funnel.

## 7. Explicit cut list

All of V2 (accounts, credits, personas, chat service, admin UI, experiments framework,
magic links, marketplace, promo wallet, migration bridge), base `/` lander,
/fb //fb2 /gdn lander routes, soulmate funnel (pages + endpoints + tables),
evelyn-lander email funnel, luna/aiden daily-email programs, astrology/numerology
engines, persona lander/drip systems, the entire cron scheduler + all drip/follow-up
generators, PayPal (client + server + webhook), NeverBounce/Turnstile, the Resend
email-event webhook + unsubscribe pages, FAQ page, `improve-v1/`, `improve-v2/`,
`audit-runs/`, analysis docs, project skills.

## 8. Risks & mitigations

- **Partial-file carves are the risky edits** (`routes.ts`, `webhooks.ts`,
  `cronJobs.ts`, seed): covered by the Playwright full-funnel pass + webhook
  test-mode purchase events.
- **Schema prune misses a runtime-only table** (nothing imports it at compile time
  but SQL touches it): covered by the cron dry-run + full-funnel pass against the
  fresh DB.
- **Dead-code leftovers** (subtractive carve's known weakness): final mechanical
  import-graph audit from the entry points; anything unreachable is deleted.
- **Env-gated branches hide breakage** (integration code that only runs with keys):
  each gated integration gets a one-line smoke note in the README (what turns it on,
  what to expect in logs).

## Out of scope (deferred)

- Niche content swap itself (new sign art, prompts, product copy) — happens in the
  clone by editing `palmReads.ts`, `prompts.ts`, upsell page copy.
- "Content-pack" restructuring — explicitly deferred until a first real clone proves
  what actually varies.
- Any behavior change, however tempting, during the carve.
