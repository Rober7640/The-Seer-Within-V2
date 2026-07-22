# Quiz Funnel Standalone Carve — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a standalone runnable repo (`../quiz-funnel-standalone`, pushed to private GitHub repo `cywei99/quiz-funnel-standalone`) containing only the fb-palm quiz funnel — bridge A/B/C → chat → checkout → both upsells → success — carved subtractively from The-Seer-Within-V2-Production.

**Architecture:** Subtractive carve: copy the working tree, delete V2 + other funnels, let `tsc`/`vite build` name every orphan, prune schema/deps/env mechanically, verify with kept vitest units + Playwright bridge smoke + a headless chat-flow transcript, then push.

**Tech Stack:** React 18 + Vite + wouter + Tailwind (client), Express + Drizzle + Postgres/Supabase (server), Anthropic SDK, Stripe, Playwright + vitest + node:test.

**Spec:** `docs/superpowers/specs/2026-07-22-v1-quiz-standalone-export-design.md` (in the SOURCE repo). Read it first.

## Global Constraints

- SOURCE repo (read-only for this project, except nothing — do not modify it at all): `/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/The-Seer-Within-V2-Production`. Call it `$SRC`.
- TARGET repo (all work happens here): sibling directory `/Users/joel/Library/CloudStorage/OneDrive-altius/Fun Projects/The-Seer-Within-V2-Production-joel-chue/quiz-funnel-standalone`. Call it `$DST`.
- **Port-as-is.** Only three behavior deviations are authorized: (1) experiments framework absent → woven arm unassigned → control default (client fetch left untouched; `?clearing=woven` override still works); (2) SuccessPage Luna cross-sell removed; (3) `/` redirects to `/fb-palm`. Any other behavior change is a bug.
- **Never copy `.env`** or any secret. The standalone gets a fresh `.env` (Task 9, user-provided values). Stripe TEST keys only until launch.
- Keep routes/paths byte-identical (`/fb-palm/*`), keep `shared/funnelConfig.ts` and `shared/fbPixelConfig.ts` unchanged (inert entries are fine).
- Commit in `$DST` after every green task. Commit messages: `carve: <what>`.
- All `npm` commands run in `$DST` unless stated otherwise.
- **TSC gate (amended after Task 1):** the source repo has 44 PRE-EXISTING tsc errors
  (`npm run check` was never enforced there; prod builds via vite/esbuild without
  typechecking). Inventory: `$SRC/.superpowers/sdd/tsc-baseline.txt` (by-file:
  `tsc-baseline-by-file.txt`). Wherever this plan says `npm run check` must pass or
  be clean in Tasks 2–8, the gate is: **no NEW errors** —
  `cd "$DST" && npx tsc 2>&1 | grep "error TS" | sort > /tmp/tsc-now.txt && comm -13 "$SRC/.superpowers/sdd/tsc-baseline.txt" /tmp/tsc-now.txt`
  must print NOTHING — and the total count only shrinks as error-bearing V2 files are
  deleted. 40/44 baseline errors live in files this carve deletes; the residue
  (client/src/pages/UpsellPage.tsx:92, client/src/pages/Upsell2Page.tsx:140 —
  `storage.ts`'s two die in Task 6's trim) is eliminated in Task 10 with COMPILE-ONLY
  annotations, so the FINAL repo is fully `npm run check`-clean.
- **Unit-test baseline (amended after Task 4):** the pristine copy carries 2
  PRE-EXISTING unit-test failures (one in `universalSafety.test.ts`, one
  priceVariantPool fixture), verified present before any carve edit (git-stash
  comparison). Wherever Tasks 6–9 gate on unit suites "passing", the gate is
  **no NEW failures** vs that baseline. Task 10 investigates the two: fix ONLY if
  the failure is a stale test expectation (test-only change); never alter runtime
  code to green a test.

---

### Task 1: Pristine copy + fresh git

**Files:**
- Create: `$DST` (entire tree via rsync)

**Interfaces:**
- Produces: `$DST` git repo with commit 1 = pristine filtered copy. All later tasks edit `$DST`.

- [ ] **Step 1: Record the source SHA**

```bash
cd "$SRC" && git rev-parse HEAD
```
Expected: a 40-char SHA. Save it for the commit message (call it `<SRC_SHA>`).

- [ ] **Step 2: Copy the tree, excluding junk + secrets + never-ship dirs**

```bash
rsync -a \
  --exclude '.git' --exclude 'node_modules' --exclude 'dist' \
  --include '.env.example' --exclude '.env' --exclude '.env.*' \
  --exclude 'logs' --exclude 'uploads' --exclude 'test-results' \
  --exclude 'playwright-report' --exclude 'audit-runs' \
  --exclude 'improve-v1' --exclude 'improve-v2' \
  --exclude 'evelyncross-soulmate' --exclude 'no-optin' --exclude 'exports' \
  --exclude '.claude' --exclude 'docs' --exclude 'scripts' \
  --exclude '_tmp-patch-seed.mjs' --exclude 'posthog-setup-report.md' \
  --exclude 'QUICKSTART.md' --exclude 'CLAUDE.md' --exclude 'migrations' \
  "$SRC/" "$DST/"
```
Notes: `script/` (build) is KEPT — the exclude is `scripts/` (luna batch tools). `attached_assets/` is deliberately KEPT for now (the `@assets` vite alias may be referenced; pruned in Task 10). `fb-palm/` (PRD + ledger docs) and `upsell2.md` are kept as funnel documentation. `.env.example` is kept as reference until Task 7 rewrites it.

- [ ] **Step 3: Verify the copy has no secrets and no git history**

```bash
cd "$DST" && ls -la | grep -E "^\." ; test ! -f .env && echo "NO .env OK"; test ! -d .git && echo "NO .git OK"
```
Expected: `NO .env OK`, `NO .git OK` (`.gitignore`, `.env.example` present).

- [ ] **Step 4: Fresh git + pristine commit**

```bash
cd "$DST" && git init -b main && git add -A && git commit -q -m "carve: pristine filtered copy of The-Seer-Within-V2-Production @ <SRC_SHA>" && git log --oneline
```
Expected: exactly 1 commit.

- [ ] **Step 5: Install deps (full set for now — pruned in Task 7)**

```bash
cd "$DST" && npm install 2>&1 | tail -3 && npm run check 2>&1 | tail -5
```
Expected: install succeeds. ~~`npm run check` passes~~ **AMENDED (executed 2026-07-22):**
the source itself carries 44 pre-existing tsc errors, so the baseline step is: record
the full error inventory to `$SRC/.superpowers/sdd/tsc-baseline.txt` and confirm the
copy's error set matches the source's (it does — same tree, filtered dirs are outside
the tsconfig include). The Global Constraints TSC gate governs all later tasks.

---

### Task 2: Server carve — routes.ts hub + index.ts + delete V2 route files

**Files:**
- Modify: `server/routes.ts` (delete V2 mounts, soulmate + luna-ty endpoints, migration calls)
- Modify: `server/index.ts` (drop creditTracking + cron init)
- Delete: `server/routes/` everything EXCEPT `webhooks.ts`; `server/api/crud.ts` (and `server/api/` dir)

**Interfaces:**
- Consumes: pristine copy from Task 1.
- Produces: `server/routes.ts` registering ONLY inline V1 endpoints + `webhooksRouter`; `server/index.ts` booting without V2 services. Task 3 carves `webhooks.ts` itself; Task 4 finishes the lib orphan loop.

- [ ] **Step 1: Delete the V2 route files**

```bash
cd "$DST" && ls server/routes/ && rm -rf server/api \
  server/routes/auth.ts server/routes/chatService.ts server/routes/credits.ts \
  server/routes/admin server/routes/personas.ts server/routes/unsubscribe.ts \
  server/routes/userStats.ts server/routes/migrate.ts server/routes/astrology.ts \
  server/routes/quiz.ts server/routes/evelynLander.ts server/routes/products.ts \
  server/routes/personaLander.ts && ls server/routes/
```
Expected final listing: `webhooks.ts` only.

- [ ] **Step 2: In `server/routes.ts`, delete the V2 router imports and mounts**

Delete these import lines (top of file, lines ~21–35): `crudRouter`, `authRouter`, `chatServiceRouter`, `creditsRouter`, `adminRouter, { abTestingPublicRouter }`, `personasRouter`, `unsubscribeRouter`, `userStatsRouter`, `migrateRouter`, `astrologyRouter`, `quizRouter`, `evelynLanderRouter`, `productsRouter`, `personaLanderRouter`. KEEP `webhooksRouter, { reportTrackdeskConversion }`.

Then find every mount and delete all except the webhooks one:
```bash
cd "$DST" && grep -n "app.use(" server/routes.ts
```
Delete each `app.use(...)` naming a deleted router (incl. `app.use("/", unsubscribeRouter)` and the `abTestingPublicRouter` mount). KEEP the `webhooksRouter` mount and any body-parser/static `app.use` lines.

- [ ] **Step 3: Delete the soulmate + luna-ty endpoints and V1→V2 migration calls**

```bash
cd "$DST" && grep -n "soulmate\|luna\|migrateAndEmailFunnelUser\|isTier1State" server/routes.ts | head -40
```
Delete, in this order (bottom-up so line numbers hold):
1. Every `/api/soulmate/*` endpoint (contiguous block, `app.post("/api/soulmate/lead"...)` at ~line 2872 through the last `/api/soulmate/upsell2/checkout` handler's closing `});`).
2. The `/api/luna-ty/handoff` endpoint (~line 1258–1279).
3. Every call site of `migrateAndEmailFunnelUser(...)` / `isTier1State(...)` — these are post-purchase V1→V2 bridge triggers inside kept endpoints; delete the enclosing statement/block for each (typically a fire-and-forget call with a `.catch`), NOT the kept endpoint.
4. The now-unused imports: `funnelMigrationEmail`, `lunaThankyouGift`, `soulmateLanderSignup`, `soulmateOrders`, and the dynamic `soulmateLanderSessions` import.

KEEP: `addLeadToKit` (kit), `addContactToResendAudience` (resend), `fraudDetection`, `facebook`, `posthog`, `aweber`, `googleAds`, `priceVariant`, `stripeAccount`, `universalSafety`, `crisisHotlines`, `claude`, `db`, `storage`, `healthCheck`, `rateLimiter` (if imported), `braceletOrders`, `prompts` usage — all inline V1 endpoints stay byte-identical.

- [ ] **Step 4: Trim `server/index.ts`**

Apply these two edits:

Old:
```ts
import { startHeartbeat, recoverActiveSessions, startInactiveSessionCleanup } from "./lib/creditTracking";
import { initializeCronJobs } from "./lib/cronJobs";
```
New: (delete both lines)

Old:
```ts
  try {
    await recoverActiveSessions();
    // Start credit tracking heartbeat (checkpoints active sessions every 30s)
    startHeartbeat();
    // Start background cleanup for inactive sessions (every 5 min, auto-ends 30+ min idle)
    startInactiveSessionCleanup();
    // Initialize cron jobs (follow-up emails, monthly resets)
    initializeCronJobs();
  } catch (err) {
    logger.warn("DB unavailable — skipping session recovery and cron jobs", { error: (err as Error).message });
  }
```
New: (delete the whole block — nothing replaces it; the standalone has no background services)

- [ ] **Step 5: First tsc round**

```bash
cd "$DST" && npm run check 2>&1 | head -40
```
Expected: errors ONLY inside files we're about to delete (V2 libs importing deleted routers/each other) or in `server/routes.ts` for leftover unused imports. Fix routes.ts imports; leave lib errors for Task 4. Record the error file list.

- [ ] **Step 6: Commit**

```bash
cd "$DST" && git add -A && git commit -q -m "carve: routes.ts down to V1 endpoints + webhooks; index.ts without V2 services"
```

---

### Task 3: webhooks.ts internal carve

**Files:**
- Modify: `server/routes/webhooks.ts`

**Interfaces:**
- Consumes: Task 2's routes.ts (still imports `webhooksRouter` + `reportTrackdeskConversion`).
- Produces: webhooks.ts exporting the same two symbols, containing ONLY the `/stripe` handler + `fireGAdsForStripe` + `reportTrackdeskConversion` (+ any tiny helpers they use).

- [ ] **Step 1: Delete the V2 handlers wholesale**

Handler map (current line anchors): `/resend` (33), GET `/unsubscribe` (393), POST `/unsubscribe` (482), `autoUnsubscribe` (576), `unsubscribePageHtml` (659), `escapeHtml` (707), `/paypal` (1132). Delete all seven blocks (each from its `router.` / `function` line through matching close). KEEP: `fireGAdsForStripe` (727), `reportTrackdeskConversion` (766), `/stripe` (819).

- [ ] **Step 2: Carve the V2 branches INSIDE `/stripe`**

```bash
cd "$DST" && grep -n "recordSoulmatePurchase\|getSoulmateOrderByEmail\|soulmateLanderSessions\|migrateAndEmailFunnelUser\|creditPurchases\|credit" server/routes/webhooks.ts
```
Read the `/stripe` handler top-to-bottom and delete: soulmate purchase branches (`recordSoulmatePurchase` / `getSoulmateOrderByEmail` / soulmate AWeber fallbacks), any `migrateAndEmailFunnelUser` call, and any V2 credit-purchase (`creditPurchases`) branch. KEEP: V1 conversation purchase handling, upsell1/upsell2 attribution, `bracelet_*` handling, trackdesk reporting, gclid/gAds backfill, PostHog purchase capture, AWeber paid-subscriber + Resend funnel-tag calls.

- [ ] **Step 3: Trim imports to what remains**

Delete from the schema import line every table the file no longer touches (expected leftovers: `conversations`?, `braceletOrders`, `emailSuppression`→gone with unsubscribe — follow tsc). Delete `funnelMigrationEmail` and `soulmateOrders` imports.

- [ ] **Step 4: Verify**

```bash
cd "$DST" && npm run check 2>&1 | grep "webhooks" ; grep -cin "soulmate\|paypal\|creditPurchases\|followUpEmails\|personaFollowup" server/routes/webhooks.ts
```
Expected: zero tsc errors mentioning webhooks.ts; grep count `0`.

- [ ] **Step 5: Commit**

```bash
cd "$DST" && git add -A && git commit -q -m "carve: webhooks.ts down to /stripe + trackdesk + gads"
```

---

### Task 4: priceVariant experiments-strip + server/lib orphan loop

**Files:**
- Modify: `server/lib/priceVariant.ts` (strip logExposure shadow-writes)
- Delete: every server/lib file tsc orphans (list below)

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces: a `server/` tree where `npm run check` is CLEAN. Pricing/assignment behavior of priceVariant is byte-identical minus telemetry.

- [ ] **Step 1: Strip the experiments shadow-writes from priceVariant.ts**

```bash
cd "$DST" && grep -n "logExposure\|logConversion\|V1_MAIN_EXPERIMENT_KEY\|experiments" server/lib/priceVariant.ts
```
Delete: the import from `./experiments`, the `V1_MAIN_EXPERIMENT_KEY` constant, and each `logExposure`/`logConversion` call statement (they are fire-and-forget telemetry — the surrounding assignment/pricing logic must remain untouched). Also sweep the one other shadow-write site if present:
```bash
grep -rn "logExposure\|logConversion" server --include="*.ts" | grep -v experiments
```
Expected after edit: zero hits outside `server/lib/experiments*.ts` (which get deleted next).

- [ ] **Step 2: Delete cronJobs + the known-V2 lib set**

```bash
cd "$DST" && rm -f server/lib/cronJobs.ts server/lib/paypal.ts \
  server/lib/experiments.ts server/lib/experiments.test.ts server/lib/experimentTally.test.ts \
  server/lib/auth.ts server/lib/creditTracking.ts server/lib/magicLink.ts \
  server/lib/chatEngine.ts server/lib/chatEngine.contextWindow.test.ts server/lib/chatEngine.tagEcho.test.ts \
  server/lib/astrologyEngine.ts server/lib/astrologyForwardTransits.test.ts server/lib/birthDataParse.test.ts \
  server/lib/numerologyEngine.ts server/lib/numerologyEngine.test.ts \
  server/lib/luna*.ts server/lib/aiden*.ts server/lib/evelyn*.ts \
  server/lib/persona*.ts server/lib/marketplace.ts server/lib/memoryManager.ts server/lib/memoryTransfer.ts \
  server/lib/followUpEmailGenerator.ts server/lib/topupEmailGenerator.ts server/lib/sessionTimeoutEmail.ts \
  server/lib/migration.ts server/lib/migrationDripProcessor.ts server/lib/funnelMigration.ts server/lib/funnelMigrationEmail.ts \
  server/lib/reconciliationProcessor.ts server/lib/refundDeflection.ts server/lib/proactiveOutreach.ts \
  server/lib/panelReadings.ts server/lib/quizMemory.ts server/lib/promoCampaign.ts server/lib/promoWallet.ts server/lib/promoWallet.test.ts \
  server/lib/neverbounce.ts server/lib/neverbounce.test.ts server/lib/turnstile.ts server/lib/disposableEmailDomains.ts \
  server/lib/verificationEmail.ts server/lib/passwordResetEmail.ts server/lib/emailTemplate.ts \
  server/lib/soulmate*.ts server/lib/dailySkyEditor.ts server/lib/seedIntentConfigs.ts server/lib/seedPersona.ts \
  server/lib/e2eTest.ts server/lib/fraudDetection.test.ts \
  server/scripts/migrateExperiments.ts
```
CAUTION overrides for the globs: `server/lib/evelyn*.ts` must NOT delete anything V1 needs — check first with `ls server/lib/evelyn*` (expected: only lander/drip generators; `prompts.ts` is the V1 brain and doesn't match). `fraudDetection.test.ts` is deleted only if it tests V2 paths — if it tests `extractClientIp` (kept), KEEP it instead.

- [ ] **Step 3: The loop — run tsc, delete/trim orphans, repeat**

```bash
cd "$DST" && npm run check 2>&1 | head -30
```
For each error: if the file is V2-only (imports a deleted module and serves no kept endpoint) → `rm` it; if a KEPT file imports a deleted module → delete just that import + its usage block (record each such trim in the commit message). Repeat until clean. EXPECTED SURVIVORS in `server/lib/`: `anthropicWithFailover, aweber, braceletOrders, circuitBreaker, claude, crisisHotlines, db, facebook, fraudDetection, googleAds, healthCheck, kit, logger, modelConfig, posthog, predictionSanitizer, priceVariant, priceVariantPool(+test), prompts, purchaseAnalytics(+test — keep if webhooks/routes import it, else delete), rateLimiter, resendAudience, resendFunnelTags, s3Upload (only if a kept file imports it, else delete), stripeAccount, stripeAccountAlert (if stripeAccount imports it), supabase (only if db/storage import it, else delete), universalSafety(+test), braceletIsolation.test` — plus `storage.ts`. If a file not on this list survives, justify it in the commit message; if one on the list dies, STOP and re-check what V1 endpoint needed it.

- [ ] **Step 4: Verify clean + commit**

```bash
cd "$DST" && npm run check && echo TSC-CLEAN && ls server/lib/ | wc -l
```
Expected: `TSC-CLEAN`, roughly 25–30 files left (from ~100).

```bash
cd "$DST" && git add -A && git commit -q -m "carve: server/lib orphan sweep; priceVariant sans experiment telemetry"
```

---

### Task 5: Client carve — App.tsx rewrite, page deletions, SuccessPage excision

**Files:**
- Modify: `client/src/App.tsx` (full rewrite below)
- Modify: `client/src/pages/SuccessPage.tsx` (Luna block excision)
- Delete: all non-kept pages + orphaned components

**Interfaces:**
- Consumes: Task 4 (server clean).
- Produces: client routes = `/fb-palm{,/b,/c,/chat,/welcome1,/welcome2,/success}`, `/privacy`, `/terms`, `/refund`, `/` → redirect. `vite build` green.

- [ ] **Step 1: Replace `client/src/App.tsx` with:**

```tsx
import { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { trackPageView } from "./lib/facebook";
import { initPostHog, track as trackPH, registerUTMs } from "./lib/posthog";
import { getPostHogFunnel, getPostHogStep, skipEmail } from "./lib/funnel";
import NotFound from "@/pages/not-found";
import PalmBridge from "@/pages/PalmBridge";
import ChatPage from "@/pages/ChatPage";
import SuccessPage from "@/pages/SuccessPage";
import UpsellPage from "@/pages/UpsellPage";
import Upsell2Page from "@/pages/Upsell2Page";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import RefundPage from "@/pages/RefundPage";

function Router() {
  const [location] = useLocation();

  useEffect(() => {
    initPostHog();
    // UTM params from the ENTRY url as PostHog super-properties.
    registerUTMs();
    // No-optin: capture `?noemail` from the ENTRY url before in-funnel navigation
    // (palm bridge → /fb-palm/chat) rebuilds the query string and drops it.
    skipEmail();
  }, []);

  useEffect(() => {
    trackPH("$pageview", { path: location });

    // FB PageView pixel — palm funnel routes only.
    if (location.startsWith("/fb-palm")) {
      trackPageView();
    }

    const funnel = getPostHogFunnel(location);
    if (funnel) {
      const urlParams = new URLSearchParams(window.location.search);
      trackPH("lander_view", {
        funnel,
        step: getPostHogStep(location),
        path: location,
        sign: funnel === "palm" ? urlParams.get("sign") || "thumb" : undefined,
        utm_source: urlParams.get("utm_source") || undefined,
        utm_campaign: urlParams.get("utm_campaign") || undefined,
        utm_medium: urlParams.get("utm_medium") || undefined,
      });
    }
  }, [location]);

  return (
    <Switch>
      {/* V1-PALM funnel — palm "quiz bridge" lander (versions A/B/C). */}
      <Route path="/fb-palm" component={PalmBridge} />
      <Route path="/fb-palm/b" component={PalmBridge} />
      <Route path="/fb-palm/c" component={PalmBridge} />
      <Route path="/fb-palm/chat" component={ChatPage} />
      <Route path="/fb-palm/welcome1" component={UpsellPage} />
      <Route path="/fb-palm/welcome2" component={Upsell2Page} />
      <Route path="/fb-palm/success" component={SuccessPage} />

      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/refund" component={RefundPage} />

      {/* Bare root → the palm bridge (ad links always carry ?sign/?hook). */}
      <Route path="/">
        <Redirect to="/fb-palm" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function SentryFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-deep text-white">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-6">An unexpected error occurred. Please refresh the page.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={SentryFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
```
(Deviations from source, all authorized: PayPalScriptProvider removed; lazy/Suspense removed with the lazy pages; pixel condition reduced to the only surviving funnel; root redirect added.)

- [ ] **Step 2: Delete the non-kept pages**

```bash
cd "$DST/client/src/pages" && rm -rf admin evelyn-lander \
  LandingPage.tsx HomePage.tsx ProductPage.tsx OrderSuccessPage.tsx FAQPage.tsx \
  UpsellTestPage.tsx AidenQuizPage.tsx EvelynLanderPage.tsx PersonaLanderPage.tsx \
  LoginPage.tsx ChatServicePage.tsx CreditsPage.tsx PersonasDirectory.tsx Dashboard.tsx \
  WelcomeChatPage.tsx ForgotPasswordPage.tsx ResetPasswordPage.tsx MagicAuthPage.tsx \
  SetPasswordPage.tsx PaywallPreviewPage.tsx SuccessPage.tsx.backup \
  Soulmate*.tsx && ls
```
Expected remaining: `ChatPage.tsx PalmBridge.tsx PrivacyPage.tsx RefundPage.tsx SuccessPage.tsx TermsPage.tsx Upsell2Page.tsx UpsellPage.tsx not-found.tsx`.

- [ ] **Step 3: Excise the Luna cross-sell from SuccessPage.tsx**

Four deletions (top-down anchors; run `grep -n "luna\|Luna\|LUNA" client/src/pages/SuccessPage.tsx` first):
1. The `LUNA_UTM` constant and its comment block (lines ~9–14).
2. The `const [lunaHref, setLunaHref] = useState(...)` line (~34).
3. The entire `try { const hres = await fetch("/api/luna-ty/handoff" ... } catch ... }` block including its lead comment ("Resolve how this buyer should enter the Luna offer...") (~lines 186–210).
4. The Luna offer card in the JSX — the element subtree containing `href={lunaHref}` and `data-testid="link-luna-offer"` (~lines 280–360): delete the whole card container (its heading/copy/CTA), not just the anchor.

Acceptance:
```bash
cd "$DST" && grep -cin "luna" client/src/pages/SuccessPage.tsx
```
Expected: `0`.

- [ ] **Step 4: Client orphan loop until tsc + build are green**

```bash
cd "$DST" && npm run check 2>&1 | head -30
```
Delete orphaned components/hooks/libs the same way as Task 4 (V2-only file → rm; kept file importing a deleted module → trim). Expected client deletions include: `ChatServiceLayout`, `PaymentModal`, `BuyCreditsModal`, `PayPalCreditButton`, `OutOfCreditsModal`, `StripeCardForm`, `TeaserCreditModal`, `SiteHeader` (if only V2 pages used it), auth hooks/contexts, admin components. Expected client survivors: `useConversation.ts` (UNTOUCHED — the `/api/ab/assign` fetch stays, it degrades to control), `lib/funnel.ts`, `lib/facebook.ts`, `lib/posthog.ts`, `lib/queryClient.ts`, `content/palmReads.ts`, `types/chat.ts`, `CosmicBackground`, chat UI components, upsell page components, `components/ui/*` (prune unused ones only if trivial — otherwise leave; Task 10's orphan audit cleans up).

Then:
```bash
cd "$DST" && npm run check && npx vite build 2>&1 | tail -5
```
Expected: tsc clean; vite build succeeds.

- [ ] **Step 5: Commit**

```bash
cd "$DST" && git add -A && git commit -q -m "carve: client down to palm funnel + legal pages; SuccessPage sans Luna cross-sell"
```

---

### Task 6: Schema prune + seed rewrite + package.json scripts

**Files:**
- Modify: `shared/schema.ts` (keep 4 tables + their types)
- Rewrite: `server/scripts/seed.ts`
- Modify: `package.json` (scripts only — deps in Task 7)

**Interfaces:**
- Consumes: Tasks 2–5 (imports now reveal true table usage).
- Produces: schema with only referenced tables; `npm run seed` seeding exactly 3 system_config keys; scripts that all resolve.

- [ ] **Step 1: Generate the used-table list**

```bash
cd "$DST" && for t in conversations personas personaReviews personaPrompts users chatSessions chatMessages savedMessages userMemory creditPurchases adminUsers systemConfig safetyViolations personaIntentConfigs conversationStates followUpEmails userFollowUpPreferences magicLinkTokens promoGrants sessionFeedback topupEmails migrationDripEmails aidenFollowupEmails evelynFollowupEmails emailSuppression checkoutViews paywallViews experiments experimentExposures experimentConversions aidenQuizSessions evelynLanderSessions personaLanderSessions personaFollowupEmails soulmateLanderSessions soulmateOrders braceletOrders; do c=$(grep -rl "\b$t\b" server client shared --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "shared/schema.ts" | wc -l | tr -d ' '); [ "$c" != "0" ] && echo "KEEP $t ($c files)"; done
```
Expected KEEP set: `conversations`, `systemConfig`, `safetyViolations`, `braceletOrders` (+ possibly `conversationStates` if `save-progress` uses it — verify by reading the hit; anything else appearing = investigate the hit before deciding).

- [ ] **Step 2: Prune `shared/schema.ts`**

Keep, per kept table: the `pgTable` block, its `createInsertSchema`/`z` schemas, and its `export type` lines. Delete everything else (all other tables + their types + any `relations()` touching deleted tables). Keep the file header imports that remain used.

```bash
cd "$DST" && npm run check && grep -c "pgTable" shared/schema.ts
```
Expected: tsc clean; count equals the KEEP set size (≈4).

- [ ] **Step 3: Rewrite `server/scripts/seed.ts` with exactly:**

```ts
// Seed for the standalone quiz funnel — system_config only.
// (The source repo's multi-persona seed — admin users, personas, prompts —
// does not apply here.)
import 'dotenv/config';
import { db } from '../lib/db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

const configs = [
  {
    configKey: 'default_conversation_model',
    configValue: 'claude-sonnet-4-5-20250929',
    configType: 'text',
    description: 'Default model for main conversation responses',
  },
  {
    configKey: 'default_basic_model',
    configValue: 'claude-haiku-4-5-20251001',
    configType: 'text',
    description: 'Default model for greetings and summaries',
  },
  {
    configKey: 'v1_price_variants',
    configValue: JSON.stringify({
      variants: [
        { id: '35', priceCents: 3500, downsellCents: 2500, weight: 1 },
        { id: '45', priceCents: 4500, downsellCents: 3200, weight: 1 },
        { id: '59', priceCents: 5900, downsellCents: 4200, weight: 1 },
      ],
    }),
    configType: 'json',
    description:
      'V1 funnel price split test variants. Edit weights to adjust traffic split. Set two weights to 0 to end the test.',
  },
];

async function seed() {
  for (const config of configs) {
    const existing = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, config.configKey))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(systemConfig).values(config);
      console.log(`✅ seeded ${config.configKey}`);
    } else {
      console.log(`↔ ${config.configKey} already set — left unchanged`);
    }
  }
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
Note: the source seed stamps `lastEditedBy: adminId`; the standalone has no admin users — if `system_config.last_edited_by` is NOT NULL in the kept schema, make it nullable in the pruned schema (it references no kept table).

- [ ] **Step 4: Trim `package.json` scripts**

Delete: `seed:intents`, `migrate`, `migrate:experiments`, `test:e2e`, `test:experiments`, `luna:batch`, `luna:calendar`, `luna:sky`. Modify: `test:price` → `"tsx --test server/lib/priceVariantPool.test.ts server/lib/braceletIsolation.test.ts"` (drop `purchaseAnalytics.test.ts` if that lib was deleted in Task 4, keep if kept); `test:unit` → `"tsx --test server/lib/universalSafety.test.ts"` (drop `tests/personaIntent.test.ts`). Add: `"flow:transcript": "tsx scripts/palm-flow-transcript.ts"` (file arrives in Task 8). Keep: `dev`, `dev:client`, `build`, `start`, `check`, `db:push`, `seed`, `test`, `test:ui`, `test:headed`, `test:debug`, `test:report`, `test:unit:watch` (retarget same as test:unit), `test:vitest*`.

- [ ] **Step 5: Verify + commit**

```bash
cd "$DST" && npm run check && npm run test:unit 2>&1 | tail -3 && npm run test:price 2>&1 | tail -3
```
Expected: tsc clean; both unit suites pass.

```bash
cd "$DST" && git add -A && git commit -q -m "carve: schema down to 4 tables; system_config-only seed; scripts trimmed"
```

---

### Task 7: Dependency prune + .env.example + README

**Files:**
- Modify: `package.json` (dependencies), `package-lock.json` (via npm)
- Rewrite: `.env.example`
- Create: `README.md`

**Interfaces:**
- Consumes: final import graph from Tasks 2–6.
- Produces: minimal dep set that builds; accurate env contract; setup docs Task 9's checkpoint follows.

- [ ] **Step 1: Find unused deps mechanically**

```bash
cd "$DST" && npx depcheck --skip-missing 2>/dev/null | head -60
```
Remove each listed unused dependency from `package.json` EXCEPT: anything vite/tailwind/build-referenced (`@vitejs/*`, `tailwindcss`, `postcss`, `autoprefixer`, `@replit/*` dev plugins, `esbuild`, `tsx`, `typescript`, `drizzle-kit`, `@playwright/test`, `vitest`, `cross-env`) — depcheck false-positives config-only usage. Expected removals include: `@paypal/react-paypal-js`, `node-cron`, `@aws-sdk/client-s3` (if s3Upload died), `bcrypt`/`jsonwebtoken`/`passport*`/`express-session`/`connect-pg-simple`/`memorystore` (V2 auth/session), `multer`, `nodemailer`, `openai`, `@google/generative-ai`, `xlsx`, astrology/astronomy libs, `resend` ONLY IF resendAudience/resendFunnelTags died (they should have survived — keep `resend`).

```bash
cd "$DST" && npm install && npm run check && npm run build 2>&1 | tail -4
```
Expected: install prunes lockfile; tsc + full production build green. If build fails on a removed dep, restore it and note why.

- [ ] **Step 2: Generate the true env contract**

```bash
cd "$DST" && { grep -rhoE "process\.env\.[A-Z_]+" server shared script drizzle.config.ts vite.config.ts --include="*.ts" 2>/dev/null; grep -rhoE "import\.meta\.env\.[A-Z_]+" client/src --include="*.ts" --include="*.tsx" 2>/dev/null; } | sort -u
```

- [ ] **Step 3: Rewrite `.env.example`** — start from this template and reconcile against Step 2's output (every var in the sweep appears exactly once; delete template lines the sweep doesn't back):

```bash
# ── Required ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...        # TEST key until launch
STRIPE_WEBHOOK_SECRET=whsec_...      # Stripe webhook signing secret

# ── Server ───────────────────────────────────────────────────────────
PORT=5000
BASE_URL=http://localhost:5000       # public origin (FB CAPI event_source_url)
NODE_ENV=development

# ── Ad attribution (optional — dormant without keys) ─────────────────
FB_PIXEL_ID=
FB_ACCESS_TOKEN=
FB_TEST_EVENT_CODE=
FB_CAPI_ENDPOINT=
SGTM_GADS_ENDPOINT=
SGTM_PREVIEW_TOKEN=
POSTHOG_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com
VITE_POSTHOG_API_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com

# ── Lead list-adds (optional) ────────────────────────────────────────
AWEBER_CLIENT_ID=
AWEBER_CLIENT_SECRET=
AWEBER_ACCESS_TOKEN=
AWEBER_REFRESH_TOKEN=
AWEBER_ACCOUNT_ID=
AWEBER_LIST_ID=
AWEBER_PAID_LIST_ID=
KIT_API_KEY=
KIT_FORM_ID=
RESEND_API_KEY=
RESEND_AUDIENCE_ID=

# ── Error monitoring (optional) ──────────────────────────────────────
SENTRY_DSN=

# ── Stripe extras (optional: dual account + trackdesk affiliate) ─────
STRIPE_SECRET_KEY_B=
ACTIVE_STRIPE_ACCOUNT=
STRIPE_TRACKDESK_WEBHOOK_SECRET=
STRIPE_TRACKDESK_WEBHOOK_SECRET_B=
```

- [ ] **Step 4: Write `README.md`:**

```markdown
# Quiz Funnel — Standalone

The fb-palm "quiz bridge" conversion funnel, carved standalone from
The-Seer-Within-V2-Production (see `docs` provenance note below). One funnel:

    /fb-palm            quiz lander, Version A (result card)
    /fb-palm/b          Version B (read arrives as chat messages)
    /fb-palm/c          Version C (one open question, LLM reads the answer)
    /fb-palm/chat       Evelyn reading chat (state machine + Claude)
    /fb-palm/welcome1   Upsell 1 — Protection Ritual ($47)
    /fb-palm/welcome2   Upsell 2 — Manifestation Bracelet ($47/$30) + shipping
    /fb-palm/success    Confirmation
    /privacy /terms /refund   Legal (FB ad compliance)
    /                   302 → /fb-palm

Ad links carry `?sign=<tell>&hook=<question>` — registry in
`client/src/content/palmReads.ts` (10 signs × 6 hooks).

## Setup

    npm install
    cp .env.example .env        # fill: DATABASE_URL, ANTHROPIC_API_KEY, STRIPE (test) keys
    npm run db:push             # create the 4 tables
    npm run seed                # system_config: models + price variants
    npm run dev                 # http://localhost:5000/fb-palm

## Verify

    npm run check               # typecheck
    npm run test:unit           # safety-filter units
    npm run test:price          # price-variant pool + bracelet isolation units
    npm run test:vitest         # remaining vitest suites
    npx playwright test --config=playwright.standalone.config.ts   # bridge A/B/C walk
    npm run flow:transcript     # headless full-reading transcript (live Anthropic call)

Manual release gate (Stripe TEST mode, before pointing ads at it):
complete a checkout with 4242 4242 4242 4242 from /fb-palm chat, then walk
welcome1 → welcome2 (shipping + 1-click) → success, and confirm the Stripe
dashboard shows main + upsell payments and the webhook flipped the
conversation row to completed.

## Content swap (new niche)

| What                    | Where |
|-------------------------|-------|
| Quiz signs/hooks/reads  | `client/src/content/palmReads.ts` + `client/public/palm/*.png` |
| Persona voice + phases  | `server/lib/prompts.ts` |
| Sign vocab (server)     | `PALM_SIGN_VOCAB` in `server/lib/prompts.ts`, `validSigns` ×2 in `server/routes.ts` |
| Prices                  | `system_config.v1_price_variants` (DB) |
| Upsell products/copy    | `client/src/pages/UpsellPage.tsx`, `Upsell2Page.tsx`, `server/routes.ts` upsell endpoints |
| Pixels/attribution      | `shared/fbPixelConfig.ts`, env keys |
| Brand name/legal        | `PalmBridge.tsx` footer, legal pages |

## Notes

- QA overrides: `?clearing=woven` (alt prompt arm), `?close=55` (sliding-close
  copy preview — never complete a checkout from it), `?noemail` (skip email gate).
- The experiments framework was not ported: the chat's `/api/ab/assign` fetch
  no-ops → control arm. `?clearing=woven` still exercises the woven arm.
- Integrations are env-gated: with keys unset, AWeber/Kit/Resend/FB CAPI/PostHog/
  Google Ads/Sentry log-and-skip. Watch server logs on first boot.
- Deploy: any Node host (source ran on Railway). `npm run build` → `npm start`,
  serves client + API on `PORT`.
```

- [ ] **Step 5: Commit**

```bash
cd "$DST" && git add -A && git commit -q -m "carve: deps pruned; env contract + README"
```

---

### Task 8: Tests — keep palm smokes, port the transcript driver, add the bridge walk

**Files:**
- Delete: all non-palm tests + configs
- Create: `scripts/palm-flow-transcript.ts` (ported), `playwright.standalone.config.ts`, `tests/standalone-funnel.spec.ts`
- Modify: `playwright.config.ts` → delete (replaced by standalone config); `package.json` `"test"` script

**Interfaces:**
- Consumes: Task 5 client routes; PalmBridge testids `palm-thumb-{a,b,c}`, `palm-continue`.
- Produces: three green test layers used by Task 9: unit (vitest/node:test), bridge walk (Playwright), chat flow (transcript script).

- [ ] **Step 1: Trim the tests directory + configs**

```bash
cd "$DST" && ls tests/ && rm -f tests/system2-funnel-user.spec.ts tests/v1-landers-smoke.spec.ts tests/personaIntent.test.ts && rm -f tests/auth.spec.ts tests/credits.spec.ts tests/admin.spec.ts tests/chat.spec.ts tests/personas.spec.ts tests/memory.spec.ts 2>/dev/null; rm -f playwright.config.ts playwright.sliding-close.config.ts && ls tests/
```
Expected remaining in `tests/`: `fb-palm-fingershape-prod-smoke.spec.ts`, `fb-palm-handsize-smoke.spec.ts`, `helpers/` (+ any helper the two import). Delete any other `*.spec.ts` that imports deleted pages/routes (check each remaining file's imports). Keep `playwright.fb-palm-fingershape.config.ts` + `playwright.fb-palm-handsize.config.ts` (they take `PROD_BASE_URL` — Task 9 points them at localhost).

- [ ] **Step 2: Port the transcript driver**

```bash
cp "$SRC/.claude/skills/v1-funnel-eval/scripts/palm-flow-transcript.ts" "$DST/scripts/palm-flow-transcript.ts"
```
(`mkdir -p "$DST/scripts"` first.) Then fix its import paths — it moves from 4 dirs deep to 1:
- `'../../../../server/lib/prompts'` → `'../server/lib/prompts'`
- `'../../../../server/lib/predictionSanitizer'` → `'../server/lib/predictionSanitizer'`
- `'../../../../client/src/content/palmReads'` → `'../client/src/content/palmReads'`
- `'../../../../shared/types'` → `'../shared/types'`
Leave `OUT_DIR = 'audit-runs/v1-funnel-eval'` (the script mkdirs it; `audit-runs/` is gitignored — verify, else add to `.gitignore`).

```bash
cd "$DST" && npx tsc --noEmit scripts/palm-flow-transcript.ts 2>&1 | head -5 || npm run check
```
Expected: no new errors (full `npm run check` is the authority — the tsconfig may not include `scripts/`; if so add `"scripts"` to the tsconfig `include` array).

- [ ] **Step 3: Create `playwright.standalone.config.ts`:**

```ts
import { defineConfig, devices } from "@playwright/test";

// Local bridge walk for the standalone palm funnel. Boots the dev server
// itself; no DB/LLM/Stripe required (the bridge + handoff are pure client).
export default defineConfig({
  testDir: "./tests",
  testMatch: /standalone-funnel\.spec\.ts/,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://localhost:5000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 4: Create `tests/standalone-funnel.spec.ts`:**

```ts
import { test, expect } from "@playwright/test";

// Bridge walk for all three versions (A/B/C) + routing sanity. The chat/LLM
// path is covered headlessly by scripts/palm-flow-transcript.ts; the money
// path is the manual Stripe test-mode checklist in README.md.

const SIGN = "thumb";
const HOOK = "soulmate-timing";

test.describe("standalone palm funnel — bridge", () => {
  test("version A: pick → reading beat → result card → chat handoff", async ({ page }) => {
    await page.goto(`/fb-palm?sign=${SIGN}&hook=${HOOK}`);
    await expect(
      page.getByRole("heading", { name: "When is my soulmate coming?" }),
    ).toBeVisible();
    await page.getByTestId("palm-thumb-a").click();
    await expect(page.getByText(/Evelyn is reading your/)).toBeVisible();
    // 1.5s reading beat → result card
    await page.getByTestId("palm-continue").click({ timeout: 10_000 });
    await page.waitForURL(/\/fb-palm\/chat\?hook=soulmate-timing&thumb=a/);
  });

  test("version B: pick → straight to chat with v=b", async ({ page }) => {
    await page.goto(`/fb-palm/b?sign=${SIGN}&hook=${HOOK}`);
    await page.getByTestId("palm-thumb-b").click();
    await page.waitForURL(/\/fb-palm\/chat\?hook=soulmate-timing&thumb=b&v=b/, {
      timeout: 10_000,
    });
  });

  test("version C: pick → straight to chat with v=c", async ({ page }) => {
    await page.goto(`/fb-palm/c?sign=${SIGN}&hook=${HOOK}`);
    await page.getByTestId("palm-thumb-c").click();
    await page.waitForURL(/\/fb-palm\/chat\?hook=soulmate-timing&thumb=c&v=c/, {
      timeout: 10_000,
    });
  });

  test("root redirects to the bridge; legal pages render", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/fb-palm$/);
    const legal: Array<[string, RegExp]> = [
      ["/privacy", /privacy/i],
      ["/terms", /terms/i],
      ["/refund", /refund/i],
    ];
    for (const [path, word] of legal) {
      await page.goto(path);
      await expect(page.locator("body")).toContainText(word);
    }
  });
});
```

- [ ] **Step 5: Run it (no real DB/LLM needed — the bridge is pure client; export a dummy DATABASE_URL so module init doesn't trip)**

```bash
cd "$DST" && DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder" npx playwright test --config=playwright.standalone.config.ts 2>&1 | tail -6
```
Expected: `4 passed`. If the A test flakes on the 1.5s beat, the `palm-continue` click's 10s timeout absorbs it.

- [ ] **Step 6: Point `"test"` at the standalone config and commit**

In `package.json`: `"test": "playwright test --config=playwright.standalone.config.ts"`.

```bash
cd "$DST" && git add -A && git commit -q -m "carve: test layer — bridge walk, ported transcript driver, palm smokes kept"
```

---

### Task 9: CHECKPOINT (user) — fresh DB + live verification

**Files:**
- Create: `$DST/.env` (user-provided values; NEVER committed)

**Interfaces:**
- Consumes: everything; README's setup steps must be literally followable.
- Produces: proof the funnel runs end-to-end. Blockers here = carve bugs → fix, commit, re-run.

- [ ] **Step 1: USER ACTION — provision + fill `.env`**

Ask the user for: (a) a fresh Supabase project's `DATABASE_URL` (Transaction pooler URL, password URL-encoded), (b) Stripe TEST `sk_test_...` + webhook secret (test mode), (c) OK to reuse the existing `ANTHROPIC_API_KEY`. Fill `$DST/.env` from `.env.example` with those three groups only (leave optional keys empty).

- [ ] **Step 2: DB up**

```bash
cd "$DST" && npm run db:push 2>&1 | tail -5 && npm run seed
```
Expected: 4 tables created; `✅ seeded` ×3.

- [ ] **Step 3: Boot + health**

```bash
cd "$DST" && (npm run dev &) && sleep 8 && curl -s localhost:5000/api/health | head -c 200 && curl -s -o /dev/null -w "%{http_code}\n" localhost:5000/fb-palm
```
Expected: health JSON ok; `200`. Server log shows NO cron/scheduler lines and only env-gated "skipped: no key" style warnings.

- [ ] **Step 4: Full verification battery**

```bash
cd "$DST" && npm run check && npm run test:unit && npm run test:price && npm run test:vitest 2>&1 | tail -3 && npm test 2>&1 | tail -3
PROD_BASE_URL=http://localhost:5000 npx playwright test --config=playwright.fb-palm-handsize.config.ts 2>&1 | tail -4
npm run flow:transcript 2>&1 | tail -20
```
Expected: all green; the handsize smoke passes against localhost (its pixel asserts fire against the dev pixel config); the transcript prints a full greeting→objection conversation and writes to `audit-runs/`.

- [ ] **Step 5: Manual money-path pass (user or agent-with-browser, Stripe TEST)**

/fb-palm → tap → chat → name → email (test address) → reading → pitch → choice card → Stripe hosted checkout with `4242 4242 4242 4242` → back to `/fb-palm/welcome1` → accept upsell 1 (1-click) → `/fb-palm/welcome2` → shipping + accept → `/fb-palm/success`. Confirm in Stripe test dashboard: 1 checkout + 2 upsell payments, product names carry " - PALM". Log any failure as a carve bug; fix; commit.

- [ ] **Step 6: Production build smoke**

```bash
cd "$DST" && npm run build && (npm start &) && sleep 5 && curl -s -o /dev/null -w "%{http_code}\n" localhost:5000/fb-palm && kill %1
```
Expected: `200` from the built bundle.

- [ ] **Step 7: Commit any fixes**

```bash
cd "$DST" && git add -A && git commit -q -m "carve: verification fixes" || echo "clean"
```

---

### Task 10: Final audits — orphans, deps, token sweep, assets

**Files:**
- Delete: any orphan files, `attached_assets/` (if unreferenced), leftover configs

**Interfaces:**
- Consumes: green Task 9.
- Produces: the final tree — nothing unreachable, nothing V2-named.

- [ ] **Step 1: Import-graph orphans**

```bash
cd "$DST" && npx madge --extensions ts,tsx --orphans client/src server shared 2>/dev/null | head -40
```
Legit entry points to IGNORE: `client/src/main.tsx`, `server/index.ts`, `shared/schema.ts` (drizzle config entry), `*.test.ts`, `tests/*`, `scripts/palm-flow-transcript.ts`, config files. Everything else listed → delete, re-run `npm run check && npm run build`.

- [ ] **Step 2: attached_assets decision**

```bash
cd "$DST" && grep -rn "@assets" client/src --include="*.ts" --include="*.tsx" | head
```
Zero hits → `rm -rf attached_assets` and delete the `"@assets"` alias line from `vite.config.ts`. Any hits → keep ONLY the referenced files, delete the rest of the directory.

- [ ] **Step 3: V2-token sweep (expected ~zero)**

```bash
cd "$DST" && grep -rin "soulmate\|marcus\|luna\|aiden\|nova\|maren\|/admin\|magic-link\|creditPurchases\|paywall\|experiments" client/src server shared --include="*.ts" --include="*.tsx" | grep -v "palmReads\|prompts.ts\|node_modules" | head -20
```
Review every hit: comments referencing history are acceptable; live code paths are bugs. (`palmReads`/`prompts` are excluded — 'soulmate-timing' is a hook name there, legitimate.)

- [ ] **Step 3b: Eliminate the residual pre-existing tsc errors (compile-only)**

The baseline residue in KEPT files (expected: `client/src/pages/UpsellPage.tsx:92`,
`client/src/pages/Upsell2Page.tsx:140` — `string | null` into a `string` parameter).
Fix with compile-only changes that CANNOT alter runtime behavior (non-null assertion
`!` or `?? ""` only if provably equivalent — prefer `!` since the call sites already
assume non-null). After this step `npm run check` must be FULLY clean (zero errors):

```bash
cd "$DST" && npm run check && echo TSC-FULLY-CLEAN
```

- [ ] **Step 4: depcheck round 2 + final green**

```bash
cd "$DST" && npx depcheck --skip-missing 2>/dev/null | head -20 && npm run check && npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -3
```

- [ ] **Step 5: Commit**

```bash
cd "$DST" && git add -A && git commit -q -m "carve: final orphan/dep/token audit"
```

---

### Task 11: Push to cywei99/quiz-funnel-standalone

**Interfaces:**
- Consumes: final green tree.
- Produces: the deliverable — private GitHub repo the new project clones/imports.

- [ ] **Step 1: Confirm no secrets are tracked**

```bash
cd "$DST" && git ls-files | grep -E "^\.env$|\.env\." ; echo "exit=$? (1 = good, nothing matched)" && git log --oneline
```
Expected: no `.env*` tracked except `.env.example`; commit list = pristine + one per task.

- [ ] **Step 2: Create + push**

```bash
cd "$DST" && gh repo create cywei99/quiz-funnel-standalone --private --source=. --remote=origin --push 2>&1 | tail -3 && git remote -v && gh repo view cywei99/quiz-funnel-standalone --json url,visibility -q '.url + " (" + .visibility + ")"'
```
Expected: repo URL printed, visibility `PRIVATE`, `origin` set, `main` pushed.

- [ ] **Step 3: Fresh-clone proof (spec DoD #6)**

```bash
cd "$(mktemp -d)" && gh repo clone cywei99/quiz-funnel-standalone && cd quiz-funnel-standalone && npm install 2>&1 | tail -2 && npm run check && echo FRESH-CLONE-OK
```
Expected: `FRESH-CLONE-OK`. (The full runtime setup on a clean env — `.env` → `db:push` → `seed` → `dev` — was proven in Task 9 by following README literally; this step proves the PUSHED artifact installs + typechecks from scratch.)

- [ ] **Step 4: Report**

Give the user: the repo URL, the clone command, the Replit "Import from GitHub" note, and the reminder that `.env` values must be re-entered in the new environment (they were never in git).

---

## Self-review checklist (run after drafting, fixed inline)

- Spec coverage: boundary/routes → T5; server carve → T2–T4; webhooks → T3; cron deletion → T2/T4; priceVariant strip → T4; client + SuccessPage → T5; schema/seed → T6; env/README → T7; verification incl. transcript + smokes + manual money path → T8–T9; audits → T10; hand-off → T11. Legal pages kept (T5), FAQ cut (T5), funnelConfig/fbPixelConfig untouched (Global Constraints).
- No placeholders: every step has commands/code or exact anchors + acceptance greps.
- Type consistency: testids (`palm-thumb-*`, `palm-continue`) match PalmBridge source; script names match package.json edits; `$SRC`/`$DST` used consistently.
