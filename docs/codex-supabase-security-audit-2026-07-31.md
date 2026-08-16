# Codex Supabase Security Audit — 2026-07-31

Read-only static audit of the entire repository (migrations, schema, RLS, Supabase clients, Edge Functions, storage, auth, env usage). No files modified, no migrations run, no database or deployment contacted. Full run: Codex task `task-ms87kmat-j20a8s`.

# Critical

1. **File/line:** `server/routes.ts:120-158, 1480-1608, 2068-2197, 3178-3384, 3391-3612`; `server/lib/db.ts:302-319, 379-396`; `server/lib/soulmateOrders.ts:94-125`

   **DB object:** `public.conversations`, `public.soulmate_orders`

   **Explanation:** Four unauthenticated one-click upsell endpoints accept a Stripe Checkout Session ID and create a confirmed, off-session PaymentIntent against its saved payment method. Email is optional for two endpoints, and the email comparison is skipped when absent. None atomically claim a one-time authorization before charging; the database is updated only after Stripe creates the charge, and the update has no “not previously purchased” condition. Replaying a request can therefore create multiple charges.

   **Exploitation scenario:** An attacker obtains a paid `cs_...` identifier from a leaked URL, log, analytics system, or the tracked CSV identified below. They repeatedly call `/api/upsell/charge` without an email. Each request retrieves the victim’s saved payment method and attempts another $47 off-session charge. The soulmate endpoints similarly permit repeated $47 and $79 charges.

   **Recommended fix:** Require a short-lived, one-time upsell capability bound to the checkout session, product, amount, and browser. Store only its hash, deliver it through a `Secure`, `HttpOnly`, same-site cookie, and atomically claim it before calling Stripe. Derive customer identity from Stripe, enforce a database uniqueness constraint per session/product, and use a deterministic Stripe idempotency key.

   **Patch:**
   ```diff
   -app.post("/api/upsell/charge", async (req, res) => {
   +app.post("/api/upsell/charge", requireUpsellCapability("upsell1"), async (req, res) => {
   +  const authorization = await db.update(upsellAuthorizations)
   +    .set({ usedAt: new Date(), status: "processing" })
   +    .where(and(
   +      eq(upsellAuthorizations.sessionId, req.upsell.sessionId),
   +      eq(upsellAuthorizations.product, "upsell1"),
   +      isNull(upsellAuthorizations.usedAt),
   +      gt(upsellAuthorizations.expiresAt, new Date()),
   +    ))
   +    .returning();
   +  if (!authorization[0]) return res.status(409).json({ error: "Already used" });
   +
      const session = await stripe.checkout.sessions.retrieve(
   -    req.body.checkoutSessionId,
   +    req.upsell.sessionId,
        { expand: ["payment_intent", "payment_intent.payment_method"] },
      );
   +  if (session.payment_status !== "paid") return res.sendStatus(403);
   +
      const charged = await stripe.paymentIntents.create({
        /* server-derived customer, payment method, product and amount */
   -  });
   +  }, { idempotencyKey: `upsell1:${session.id}` });
   ```

   **Verification test:** Against a fake Stripe adapter, call the endpoint without the capability and expect `401`. Then submit the same valid capability concurrently twice and assert one response succeeds, the other returns `409`, and `paymentIntents.create` was called exactly once.

2. **File/line:** `server/routes.ts:601-628, 770-804`; `server/routes/migrate.ts:44-88`; `server/lib/funnelMigration.ts:50-94, 101-195`; `server/lib/db.ts:74-138, 179-188`

   **DB object:** `public.conversations`, `public.users`, `public.user_memory`

   **Explanation:** `/api/checkout` marks an arbitrary email as purchased before Stripe is checked or payment occurs. `/api/migrate/create-account` then accepts only that email, treats the mutable `purchased` flag as proof of payment, creates an email-verified user with at least 900 credits, and returns a full JWT. No email-ownership or payment proof is required.

   **Exploitation scenario:** An attacker posts a lead using an email they control, calls `/api/checkout` but never visits or pays the Stripe session, and then calls `/api/migrate/create-account`. They receive a verified JWT and bonus credits. They can also overwrite a known purchaser’s email-based conversation and claim the migration account before the legitimate customer.

   **Recommended fix:** Remove the optimistic purchase update. Only a verified Stripe webhook with `payment_status = paid` should establish purchase eligibility. Replace email-only migration with a signed, single-use claim generated after payment and delivered to the verified purchaser.

   **Patch:**
   ```diff
   -if (email) {
   -  await markPurchased(email, type);
   -}
   +// Never establish payment state in the checkout-creation request.

   // In the verified Stripe webhook:
   +if (event.type === "checkout.session.completed") {
   +  const session = event.data.object;
   +  if (session.payment_status !== "paid") return res.sendStatus(200);
   +  await markPurchasedFromVerifiedWebhook(session.id, session.customer_details?.email);
   +  await createSingleUseMigrationClaim(session.id);
   +}

   -const emailSchema = z.object({ email: z.string().email() });
   +const claimSchema = z.object({ claim: z.string().min(43).max(128) });

   -const result = await migrateFunnelCustomer(email);
   +const verifiedClaim = await consumeMigrationClaim(parseResult.data.claim);
   +if (!verifiedClaim) return res.status(401).json({ error: "Invalid claim" });
   +const result = await migrateFunnelCustomer(verifiedClaim.email);
   ```

   **Verification test:** In an isolated test database, run:
   ```bash
   curl -X POST http://localhost:5000/api/lead \
     -H 'Content-Type: application/json' \
     -d '{"email":"attacker@example.test","firstName":"A","bucket":"love"}'

   curl -X POST http://localhost:5000/api/checkout \
     -H 'Content-Type: application/json' \
     -d '{"email":"attacker@example.test","firstName":"A","bucket":"love"}'

   curl -X POST http://localhost:5000/api/migrate/create-account \
     -H 'Content-Type: application/json' \
     -d '{"email":"attacker@example.test"}'
   ```
   After the patch, the last request must be rejected, `conversations.purchased` must remain false, and no user may be created until a signed paid webhook and valid single-use claim exist.

3. **File/line:** `server/routes.ts:915-1003, 3153-3171`; `server/lib/db.ts:74-159`; `shared/schema.ts:6-87, 1282-1338`

   **DB object:** `public.conversations`, `public.soulmate_orders`

   **Explanation:** Email addresses are used as authorization credentials. Anyone can retrieve an intimate conversation and transcript through `/api/conversation/:email`, overwrite it through `/api/save-progress`, or retrieve a customer’s full shipping address and phone through `/api/soulmate/shipping?email=...`. No authentication, ownership proof, or signed resume capability is checked.

   **Exploitation scenario:** An attacker submits a victim’s known email to the conversation endpoint and reads their relationship concerns, named person, location, and complete messages. The same attacker obtains the victim’s name, street address, postal code, country, and phone from the soulmate shipping endpoint, then overwrites the saved conversation or shipping workflow.

   **Recommended fix:** Remove all email-keyed reads and writes. Use authenticated user ownership where accounts exist. For pre-account funnels, issue a random, expiring resume/order capability, store only its hash, and require it for every read or mutation.

   **Patch:**
   ```diff
   -app.get("/api/conversation/:email", async (req, res) => {
   -  const conversation = await getConversationByEmail(req.params.email);
   +app.get("/api/conversation/resume/:id", requireResumeCapability, async (req, res) => {
   +  const conversation = await getConversationById(req.params.id);
   +  if (conversation.id !== req.resume.conversationId) return res.sendStatus(404);

   -app.post("/api/save-progress", async (req, res) => {
   -  await saveConversation({ email: req.body.userData.email, ... });
   +app.post("/api/save-progress", requireResumeCapability, async (req, res) => {
   +  await updateConversationById(req.resume.conversationId, validatedProgress);

   -app.get("/api/soulmate/shipping", async (req, res) => {
   -  const order = await getSoulmateOrderByEmail(String(req.query.email));
   +app.get("/api/soulmate/shipping", requireOrderCapability, async (req, res) => {
   +  const order = await getSoulmateOrderById(req.order.orderId);
   ```

   **Verification test:** Unauthenticated requests using a victim email must return `401` or indistinguishable `404` responses, and the underlying rows must remain unchanged:
   ```bash
   curl -i 'http://localhost:5000/api/conversation/victim@example.test'
   curl -i 'http://localhost:5000/api/soulmate/shipping?email=victim@example.test'
   curl -i -X POST http://localhost:5000/api/save-progress \
     -H 'Content-Type: application/json' \
     -d '{"userData":{"email":"victim@example.test"},"conversationState":"X","messages":[]}'
   ```

# High

1. **File/line:** `shared/schema.ts:6-1349`; `migrations/001_safety_violations.sql:4`; `migrations/002_intent_tables.sql:5,24`; `migrations/003_follow_up_tables.sql:5,40`; `migrations/010_suggested_questions_outreach.sql:5`; `migrations/012_evelyn_lander_sessions.sql:5`; `migrations/013_evelyn_followup_emails.sql:8`; `migrations/015_promo_grants.sql:7`; `migrations/016_persona_lander_sessions.sql:7`; `migrations/017_persona_followup_emails.sql:7`; `migrations/2026-07-14-bracelet-orders.sql:11`; `client/migrations/012_aiden_followup_emails.sql:6`; `client/migrations/014_email_suppression.sql:9`; `server/scripts/migrateExperiments.ts:22,53,72`; `server/scripts/migratePaywall.ts:21`; `server/scripts/run-migrations.ts:46`

   **DB object:** All 37 Drizzle-defined `public` tables, plus `public.outreach_messages` and `public._migrations`

   **Explanation:** Every repository-defined table is created without `ENABLE ROW LEVEL SECURITY`. The repository also contains no policies, `anon`/`authenticated` revocations, or restrictive default privileges. Sensitive rows include password hashes, raw verification/reset/magic-link tokens, chat transcripts, memories, payment identifiers, physical addresses, safety reports, and admin password hashes. On a standard Supabase Data API configuration, SQL-created `public` tables without RLS can be exposed according to the project’s role grants.

   **Exploitation scenario:** If the live project retains the usual Data API grants, an attacker using the public anon key queries `rest/v1/users`, `magic_link_tokens`, `conversations`, or `admin_users`, obtaining credentials and private customer data or modifying wallet and purchase records.

   **Recommended fix:** Because the frontend does not use Supabase directly, revoke all table/sequence/function access from `anon` and `authenticated`, enable RLS on every exposed table, and set restrictive default privileges. Add narrow policies only if a future direct client genuinely requires them.

   **Patch:**
   ```sql
   BEGIN;

   REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
     FROM anon, authenticated;
   REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
     FROM anon, authenticated;
   REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
     FROM anon, authenticated;

   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     REVOKE ALL ON TABLES FROM anon, authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     REVOKE ALL ON SEQUENCES FROM anon, authenticated;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

   DO $$
   DECLARE r record;
   BEGIN
     FOR r IN
       SELECT schemaname, tablename
       FROM pg_tables
       WHERE schemaname = 'public'
     LOOP
       EXECUTE format(
         'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
         r.schemaname, r.tablename
       );
     END LOOP;
   END $$;

   COMMIT;
   ```

   **Verification test:**
   ```sql
   SELECT c.relname, c.relrowsecurity
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relkind IN ('r','p')
     AND NOT c.relrowsecurity;  -- must return zero rows

   SELECT grantee, table_name, privilege_type
   FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND grantee IN ('anon','authenticated'); -- must return zero rows

   BEGIN;
   SET LOCAL ROLE anon;
   SELECT * FROM public.users LIMIT 1; -- must fail with permission denied
   ROLLBACK;
   ```

2. **File/line:** `server/routes/auth.ts:250-332, 394-404, 431-554, 645-655, 1009-1168`; `server/lib/auth.ts:47-120`

   **DB object:** `public.users`

   **Explanation:** Both registration endpoints issue a full seven-day JWT while `email_verified` is false, and normal login also permits unverified accounts. `requireAuth` checks account status but never checks email verification. Consequently, the “requires verification” response is only a client-side convention, not an authorization boundary.

   **Exploitation scenario:** An attacker registers a victim’s email with an attacker-controlled password and immediately obtains an authenticated token. They can occupy the identity, access protected routes, create application state under the victim’s address, and prevent the real owner from registering.

   **Recommended fix:** Do not issue a general session at registration. Use a narrowly scoped pending-registration token only for resending verification. Require `email_verified = true` in the authorization middleware for every sensitive route.

   **Patch:**
   ```diff
   -const token = generateToken(user.id, user.email);
   -res.status(201).json({ token, user, requiresVerification: true });
   +res.status(201).json({
   +  pendingVerification: true,
   +  email: user.email,
   +});

   // In requireAuth:
   +const result = await db.select({
   +  accountStatus: users.accountStatus,
   +  emailVerified: users.emailVerified,
   +  passwordChangedAt: users.passwordChangedAt,
   +}).from(users).where(eq(users.id, payload.userId)).limit(1);
   +
   +if (!user.emailVerified) {
   +  return res.status(403).json({ code: "EMAIL_NOT_VERIFIED" });
   +}
   ```

   **Verification test:** Register a new user and assert the response contains no JWT. A forged or previously returned pre-verification JWT must receive `403 EMAIL_NOT_VERIFIED` from `/api/auth/me` and `/api/chat-service/session/start`. After consuming the verification link, those routes should succeed.

3. **File/line:** `server/lib/magicLink.ts:16-38, 49-93`; `shared/schema.ts:545-556`; `server/routes/auth.ts:686-729, 823-844, 1438-1602`; `client/src/pages/LoginPage.tsx:45-74`; `client/src/hooks/useAuth.ts:24-45`

   **DB object:** `public.magic_link_tokens`, `public.users`

   **Explanation:** Magic-link tokens are stored in plaintext, remain valid for 30 days, and are deliberately reusable after `used_at` is set. Email-verification tokens are also retained after verification and can repeatedly generate JWTs until expiry. The verification flow places a full seven-day JWT in the redirect query string, and the frontend persists it in `localStorage`. These credentials can leak through URL history, referrers, screenshots, browser extensions, analytics, logs, or any same-origin XSS.

   **Exploitation scenario:** A mail scanner, shared device, forwarded email, browser-history sync, or log collector obtains a magic/verification URL. The token can be replayed repeatedly for up to 30 days to mint new JWTs. A leaked redirect URL provides the JWT directly.

   **Recommended fix:** Hash all action tokens at rest, make them short-lived and single-use with an atomic consume operation, and use an interstitial POST to avoid mail-prefetch consumption. Establish the application session in a `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-` cookie; never place JWTs in URLs or `localStorage`.

   **Patch:**
   ```diff
   -token: text("token").notNull().unique(),
   +tokenHash: text("token_hash").notNull().unique(),

   -eq(magicLinkTokens.token, token),
   +eq(magicLinkTokens.tokenHash, sha256(token)),
   +isNull(magicLinkTokens.usedAt),

   -const rows = await db.select().from(magicLinkTokens)...
   -await db.update(magicLinkTokens).set({ usedAt: now })...
   +const rows = await db.update(magicLinkTokens)
   +  .set({ usedAt: now })
   +  .where(and(
   +    eq(magicLinkTokens.tokenHash, sha256(token)),
   +    isNull(magicLinkTokens.usedAt),
   +    gt(magicLinkTokens.expiresAt, now),
   +  ))
   +  .returning();

   -res.redirect(`${baseUrl}/login?verified=success&token=${jwtToken}`);
   +res.cookie("__Host-seer_session", jwtToken, {
   +  httpOnly: true, secure: true, sameSite: "lax", path: "/",
   +});
   +res.redirect(`${baseUrl}/login?verified=success`);
   ```

   **Verification test:** Exchange one magic token twice. The first request must set an `HttpOnly; Secure; SameSite=Lax` cookie; the second must return `401`. The redirect `Location` header must contain no `token=` parameter, and the database must contain only a digest with `used_at` populated.

4. **File/line:** `server/routes/credits.ts:869-947`

   **DB object:** `public.credit_purchases`, `public.users`

   **Explanation:** `/api/credits/confirm-checkout` retrieves any supplied paid Stripe session, reads `purchaseId` and `totalCoins` from its metadata, updates that purchase without checking its owner, and credits `req.userId` rather than the purchase owner. The session metadata `userId`, database `user_id`, amount, currency, and Stripe Session ID are never matched to the authenticated caller.

   **Exploitation scenario:** User B obtains User A’s paid session ID before the webhook processes it and submits it with B’s JWT. A’s pending purchase is consumed while the coins are granted to B, and B may also become implicitly email-verified.

   **Recommended fix:** Require the authenticated user to match the metadata user, purchase owner, and stored session. Derive the credited amount from the pending purchase, validate Stripe amount/currency, and complete the purchase and wallet increment in one transaction.

   **Patch:**
   ```diff
   +if (checkoutSession.metadata?.userId !== req.userId) {
   +  return res.status(403).json({ error: "Session owner mismatch" });
   +}

   +const purchase = await db.select().from(creditPurchases)
   +  .where(and(
   +    eq(creditPurchases.id, purchaseId),
   +    eq(creditPurchases.userId, req.userId!),
   +    eq(creditPurchases.stripeSessionId, sessionId),
   +    eq(creditPurchases.status, "pending"),
   +  )).limit(1);
   +if (!purchase[0]) return res.status(403).json({ error: "Unauthorized" });
   +if (checkoutSession.amount_total !== purchase[0].priceUsd ||
   +    checkoutSession.currency !== "usd") return res.sendStatus(400);

   -coinBalance: sql`coin_balance + ${totalCoins}`,
   +coinBalance: sql`coin_balance + ${
   +  purchase[0].coinsPurchased + purchase[0].bonusCoins
   +}`,
   ```

   **Verification test:** Create users A and B and a paid fake Stripe session tied to A. Calling `confirm-checkout` with B’s JWT must return `403`, leave A’s purchase pending, and leave B’s balance unchanged. A’s JWT should complete it once.

5. **File/line:** `server/routes.ts:363-392, 1075-1264, 1813-1953, 1986-2022, 2493-2624`; `server/routes/products.ts:143-193`; `server/lib/db.ts:325-358, 402-430`

   **DB object:** `public.conversations`, `public.bracelet_orders`; Stripe Checkout Session

   **Explanation:** Multiple unauthenticated endpoints treat a Stripe Session ID as a permanent bearer credential. They return email, payment intent, metadata, physical shipping details, and customer identifiers or overwrite shipping addresses. The diagnostic endpoint returns substantially more Stripe data than any customer flow needs.

   **Exploitation scenario:** A session ID copied from a success URL or leaked through a log lets an attacker read the buyer’s email and address, overwrite the delivery address, or gather the information needed to invoke the critical one-click charge endpoints.

   **Recommended fix:** Remove the diagnostic route. Replace Session-ID-only access with an expiring, scoped order capability or authenticated ownership, return only minimal data, and require the same authorization for shipping changes.

   **Patch:**
   ```diff
   -app.get("/api/upsell/test-session/:sessionId", async (...) => { ... });
   +// Remove diagnostic endpoint from production.

   -app.get("/api/upsell/user-data", async (req, res) => {
   +app.get("/api/upsell/user-data", requireOrderCapability, async (req, res) => {
   +  if (req.order.sessionId !== req.query.session_id) return res.sendStatus(404);

   -return res.json({ email, stripeCustomerId, paymentIntent, shipping, ... });
   +return res.json({ firstName, bucket, displayAmount });

   -app.post("/api/shipping/save", async (req, res) => {
   +app.post("/api/shipping/save", requireOrderCapability, async (req, res) => {
   ```

   **Verification test:** Requests with a valid session ID but without its separate order capability must return `401`/`404`; the diagnostic route must return `404`; a valid capability must reveal only the minimal fields and must be unable to access another session.

6. **File/line:** `.gitignore:64-67`; `exports/conversations_export.csv:1-10`

   **DB object:** `public.conversations`

   **Explanation:** A tracked CSV contains nine real customer records. Its columns include email, name, Stripe Session ID, purchase amounts, and full shipping-address fields. The repository itself acknowledges that the file contains real PII and remains tracked. Static counting found five populated Stripe Session IDs.

   **Exploitation scenario:** Anyone with current or historical repository access can copy the customer data. A leaked paid Session ID also feeds directly into the unauthenticated order and one-click charge endpoints.

   **Recommended fix:** Remove the file from the current tree and all reachable Git history through a coordinated history rewrite. Invalidate exposed order/session capabilities, audit repository access, notify affected parties if required, and store exports in an access-controlled encrypted data system.

   **Patch:**
   ```diff
   diff --git a/exports/conversations_export.csv b/exports/conversations_export.csv
   deleted file mode 100644
   --- a/exports/conversations_export.csv
   +++ /dev/null
   @@
   -[real customer export removed]
   ```
   The existing `exports/` ignore rule should remain. History remediation must be coordinated separately.

   **Verification test:** A repository-history DLP scan must find no email addresses, shipping data, or `cs_...` identifiers in any reachable commit. `git log --all -- exports/conversations_export.csv` and a blob-content scan should return no result after the coordinated rewrite.

7. **File/line:** `server/routes.ts:10-16, 701-702, 1772-1773, 2469-2470, 3141-3142`; `server/routes/credits.ts:111-117, 445-450`; `server/routes/products.ts:42-45, 93-94`

   **DB object:** Stripe Checkout Session

   **Explanation:** Stripe success and cancellation URLs are built from untrusted `Origin`, `X-Forwarded-Host`, or `Host` headers. An arbitrary client can cause Stripe to redirect a payer to an attacker-controlled domain, including the Checkout Session ID in the redirect.

   **Exploitation scenario:** An attacker creates a legitimate Checkout Session using `Origin: https://attacker.example`, sends the Stripe-hosted payment link to a victim, and waits for payment. Stripe redirects the victim to the attacker with `session_id`, which can then be used against the unauthenticated PII and one-click charge endpoints.

   **Recommended fix:** Use a validated, immutable application origin from configuration. Reject startup when it is missing or non-HTTPS in production. Never derive payment redirects from request headers.

   **Patch:**
   ```diff
   -function getBaseUrl(req: Request): string {
   -  const origin = req.headers.origin;
   -  if (origin) return origin;
   -  ...
   -}
   +const APP_ORIGIN = (() => {
   +  const value = process.env.BASE_URL;
   +  if (!value) throw new Error("BASE_URL is required");
   +  const url = new URL(value);
   +  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
   +    throw new Error("BASE_URL must use HTTPS");
   +  }
   +  return url.origin;
   +})();
   ```

   **Verification test:** With a mocked Stripe client, create checkout using malicious `Origin`, `Host`, and `X-Forwarded-Host` headers. Assert every recorded `success_url` and `cancel_url` still starts with the configured canonical `APP_ORIGIN`.

# Medium

1. **File/line:** `server/lib/auth.ts:62-120`

   **DB object:** `public.users`

   **Explanation:** When the database account-status check throws, `requireAuth` logs the error and explicitly allows the request through. A valid token belonging to a suspended, banned, deleted, or password-reset user may therefore be accepted during a transient database failure.

   **Exploitation scenario:** A suspended user repeatedly sends requests while inducing or waiting for a status-query timeout. If that query fails but later route queries succeed, the middleware restores access that should have remained revoked.

   **Recommended fix:** Fail closed. Return `503` on status-check infrastructure errors and never call `next()` unless the user row and authorization state were successfully verified.

   **Patch:**
   ```diff
   } catch (err) {
     logger.error("Account status check failed:", err);
   - // Allow through on DB error
   + return res.status(503).json({
   +   error: "Authentication service temporarily unavailable",
   + });
   }
   ```

   **Verification test:** Mock `db.select()` in `requireAuth` to reject. A protected handler must not execute, and the response must be `503`.

2. **File/line:** `server/lib/auth.ts:10-41`; `.env.example:4-5`; `server/lib/healthCheck.ts:259-268`

   **DB object:** N/A

   **Explanation:** If `JWT_SECRET` is missing, the application silently uses the public string `dev-secret-change-in-prod`. Readiness checks report a missing environment variable, but the process continues signing and verifying tokens with the predictable fallback.

   **Exploitation scenario:** A deployment missing `JWT_SECRET` starts successfully. An attacker signs `{userId,email}` with the known fallback and impersonates any user whose identifier they know.

   **Recommended fix:** Fail startup when the secret is absent, placeholder-like, or too short. Keep development secrets explicit rather than embedded in source.

   **Patch:**
   ```diff
   -const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";
   +const JWT_SECRET = process.env.JWT_SECRET;
   +if (!JWT_SECRET || JWT_SECRET.length < 32 ||
   +    JWT_SECRET === "dev-secret-change-in-prod") {
   +  throw new Error("A strong JWT_SECRET is required");
   +}
   ```

   **Verification test:** Start the built server with `JWT_SECRET` unset and assert it exits before listening. Start with a 32-byte random secret and assert a JWT signed with the old fallback receives `401`.

3. **File/line:** `server/routes/webhooks.ts:29-60, 73-120`; `.env.example:53-54`

   **DB object:** `public.follow_up_emails`, `public.migration_drip_emails`, `public.topup_emails`, `public.aiden_followup_emails`, `public.evelyn_followup_emails`, `public.persona_followup_emails`, `public.email_suppression`

   **Explanation:** Resend webhook verification is conditional: if `RESEND_WEBHOOK_SECRET` is absent, arbitrary JSON is trusted. The example environment file does not document the required webhook secret. Forged bounce or complaint events can mutate delivery data and unsubscribe users.

   **Exploitation scenario:** In a deployment missing the secret, an attacker posts a forged `email.complained` event containing a known Resend email ID. The application marks the message complained/bounced and auto-unsubscribes the user.

   **Recommended fix:** Require the secret at startup or fail the webhook closed. Always verify the raw body before parsing or processing an event.

   **Patch:**
   ```diff
   +RESEND_WEBHOOK_SECRET=whsec_...

   const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
   -if (webhookSecret) {
   +if (!webhookSecret) {
   +  return res.status(503).json({ error: "Webhook not configured" });
   +}
   +{
      // mandatory Svix verification
   }
   ```

   **Verification test:** With the secret unset, an unsigned webhook must return `503` and make no database changes. With it configured, unsigned or incorrectly signed requests must return `400`; a correctly signed fixture must succeed.

4. **File/line:** `server/routes/auth.ts:996,1086`; `server/lib/passwordResetEmail.ts:182-194`; `server/lib/funnelMigration.ts:261-279`; `server/lib/soulmateLanderSignup.ts:108-123`; `server/routes.ts:1829-1833, 2513-2517, 2709-2725`; `server/lib/logger.ts:55-81`

   **DB object:** `public.users`, `public.magic_link_tokens`, `public.conversations`

   **Explanation:** When email delivery is unavailable, the application logs complete magic URLs, password-reset URLs, and temporary passwords. Several payment/shipping routes also log full address objects. Production logging persists to stdout and rotating files without redaction.

   **Exploitation scenario:** An operator, compromised log aggregator, support export, or accidental log bundle obtains reusable login/reset credentials and customer addresses, enabling account takeover and privacy loss.

   **Recommended fix:** Never log action tokens, temporary passwords, email URLs, full addresses, or payment identifiers. Return delivery failure instead of pretending success, add logger-wide sensitive-field redaction, and use irreversible identifiers where correlation is needed.

   **Patch:**
   ```diff
   -logger.warn("Resend not configured, magic link URL:", magicUrl);
   +logger.error("Magic-link delivery unavailable", { userId: user.id });

   -logger.warn(`[Password Reset] ... ${resetUrl}`);
   -return { success: true };
   +logger.error("Password-reset delivery unavailable", { userId });
   +return { success: false, error: "delivery_unavailable" };

   -logger.info("Upsell shipping saved to DB:", { sessionId, address });
   +logger.info("Upsell shipping saved", {
   +  sessionRef: sha256(sessionId).slice(0, 12),
   +  country: address.country,
   +});
   ```

   **Verification test:** Run the email helpers with Resend disabled and capture logger output. Assert it contains none of the supplied token, reset URL, temporary password, email, street, postal code, or Stripe identifier.

5. **File/line:** `server/routes/evelynLander.ts:74-139, 149-222`; `server/routes/personaLander.ts:105-173, 175-250`

   **DB object:** `public.users`, `public.evelyn_lander_sessions`, `public.persona_lander_sessions`

   **Explanation:** Public lander start endpoints query arbitrary emails and return whether an account exists, whether it uses a password or migrated/passwordless login, the account’s first name, and a returning-user indicator. An IP limiter slows but does not remove the enumeration channel.

   **Exploitation scenario:** An attacker tests leaked or targeted email lists across distributed IPs and identifies registered customers, their names, and authentication type for phishing or credential-stuffing campaigns.

   **Recommended fix:** Return an identical generic response for known and unknown emails. Reveal account state and personalization only after a valid signed email link or authenticated session.

   **Patch:**
   ```diff
   -res.json({
   -  segment: resolved.segment,
   -  firstName: resolved.firstName,
   -  isReturning: resolved.isReturning,
   -  opener,
   -});
   +res.json({
   +  segment: "continue",
   +  opener: selectGenericOpener(data.bucket),
   +});
   ```
   
   **Verification test:** Submit one registered and one unknown email. Status, JSON shape, response size, and normalized timing must be indistinguishable, and neither response may contain a name or authentication type.

6. **File/line:** `server/routes/chatService.ts:117-137`; `server/lib/creditTracking.ts:386-469`

   **DB object:** `public.chat_sessions`

   **Explanation:** `/api/chat-service/session/end-beacon` is unauthenticated and accepts only a session UUID. Although the comment says ownership is validated, no ownership or capability check occurs before ending and billing the session.

   **Exploitation scenario:** An attacker who learns another user’s session UUID from a URL, log, browser, or database exposure repeatedly ends the victim’s live reading, causing disruption and premature billing finalization.

   **Recommended fix:** Generate a short-lived close capability at session start, store its hash bound to the session and user, and require it in the beacon body. Make consumption one-time.

   **Patch:**
   ```diff
   const body = JSON.parse(req.body);
   -await endChatSession(body.sessionId);
   +const valid = await consumeSessionCloseCapability(
   +  body.sessionId,
   +  body.closeToken,
   +);
   +if (!valid) return res.status(403).json({ error: "Invalid capability" });
   +await endChatSession(body.sessionId);
   ```

   **Verification test:** A beacon containing another session ID or an invalid token must return `403` and leave the session active. The correct token must end the session once; replay must fail.

7. **File/line:** `server/api/crud.ts:77-98`

   **DB object:** `public.conversations`

   **Explanation:** The full-privilege conversations CRUD API accepts its API key through `?api_key=` as well as a header. Query-string credentials are exposed to browser history, copied URLs, reverse-proxy/access logs, monitoring systems, and referrers. A stolen key permits complete read, write, and delete access to customer conversations.

   **Exploitation scenario:** A legitimate integration invokes `/api/v1/conversations?api_key=...`. Its proxy or monitoring logs retain the URL, and an attacker replays the key to export or delete all conversation records.

   **Recommended fix:** Remove query-string authentication immediately, rotate the key, accept an authorization header only, use timing-safe comparison, and scope integrations to the minimum required operations.

   **Patch:**
   ```diff
   -const apiKey = req.headers["x-api-key"] || req.query.api_key;
   +const apiKey = req.headers["x-api-key"];
   +if (typeof apiKey !== "string") return res.sendStatus(401);
   +if (!crypto.timingSafeEqual(
   +  Buffer.from(apiKey),
   +  Buffer.from(validApiKey),
   +)) return res.sendStatus(401);
   ```

   **Verification test:** A request with only `?api_key=correct-key` must return `401`. The rotated key in `X-API-Key` should work, and an access-log test must confirm no credential appears in the URL.

8. **File/line:** `server/routes.ts:404-531, 2029-2065, 2815-2884`; `server/lib/rateLimiter.ts:18-32`

   **DB object:** N/A

   **Explanation:** The public V1 chat and upsell-reading endpoints invoke Anthropic without authentication, a route-specific rate limiter, Turnstile proof, or comprehensive server-side length limits. `/api/fb-event` similarly proxies arbitrary event names and values to Meta. The existing `chatLimiter` applies only to authenticated System 2 messages.

   **Exploitation scenario:** An attacker scripts thousands of chat/reading requests to consume Anthropic quota and cost. They also submit forged high-value `Purchase` events to corrupt ad attribution and optimization.

   **Recommended fix:** Apply IP/device rate limits, validated bounded schemas, abuse challenges, and per-session quotas to public AI calls. Restrict Meta events to a strict allowlist and derive purchase events and amounts from verified server-side payment records.

   **Patch:**
   ```diff
   +const funnelChatSchema = z.object({
   +  action: z.enum(["reading1", "reading2", "futureValidation", /* ... */]),
   +  input: z.string().max(2000).optional(),
   +  userData: z.object({ /* bounded fields */ }).strict(),
   +  turnstileToken: z.string().min(1),
   +}).strict();

   -app.post("/api/chat", async (req, res) => {
   +app.post("/api/chat", publicAiLimiter, async (req, res) => {
   +  const parsed = funnelChatSchema.safeParse(req.body);
   +  if (!parsed.success) return res.sendStatus(400);
   +  if (!await verifyTurnstileToken(parsed.data.turnstileToken, req.ip)) {
   +    return res.sendStatus(403);
   +  }

   -eventName: z.string().min(1),
   +eventName: z.enum(["PageView", "Lead", "InitiateCheckout"]),
   +// Purchase events are emitted only from verified payment handlers.
   ```

   **Verification test:** An oversized input must return `400`; requests exceeding the configured public quota must return `429`; an arbitrary or client-originated `Purchase` Meta event must return `400`/`403` and must not call either external provider.

# Low

1. **File/line:** `server/routes.ts:274-319`; `server/lib/healthCheck.ts:53-67, 211-242, 271-402`

   **DB object:** `public.users`, `public.chat_sessions`, `public.credit_purchases`, `public.safety_violations`

   **Explanation:** Public health and metrics endpoints disclose environment, dependency configuration and error messages, memory statistics, total users, active sessions, aggregate wallet values, completed purchases, and safety-violation counts. `/api/health` also makes live requests to Stripe, Anthropic, and Resend for each unauthenticated call.

   **Exploitation scenario:** An attacker monitors operational state and business volume, identifies outages or provider configuration gaps, and repeatedly invokes the comprehensive health check to generate unnecessary provider traffic.

   **Recommended fix:** Keep the public liveness endpoint minimal. Restrict detailed health and Prometheus metrics to a private network or authenticated monitoring principal, and return generic dependency errors.

   **Patch:**
   ```diff
   app.get("/api/health-check", (_req, res) =>
     res.json({ status: "ok" })
   );

   -app.get("/api/health", async (_req, res) => { ... });
   -app.get("/api/metrics", async (_req, res) => { ... });
   +app.get("/internal/health", requireMonitoringAuth, detailedHealth);
   +app.get("/internal/metrics", requireMonitoringAuth, metricsHandler);
   ```

   **Verification test:** Unauthenticated `/api/health-check` must return only a generic status. `/internal/health` and `/internal/metrics` must return `401` externally and succeed only with the monitoring credential.

# Needs verification / could not confirm from static inspection

1. No `supabase/` directory, Supabase configuration, Edge Function code, storage policy, RLS policy, grant/revoke migration, view, RPC, trigger, or `SECURITY DEFINER` function exists in this repository. A read-only live catalog export is required to determine whether any objects or controls were created through the Supabase dashboard or deployed from another repository. Required catalog data:

   ```sql
   SELECT * FROM pg_policies;
   SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relkind IN ('r','p','v','m');

   SELECT * FROM information_schema.role_table_grants
   WHERE grantee IN ('anon','authenticated');

   SELECT n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace;

   SELECT * FROM information_schema.views
   WHERE table_schema NOT IN ('pg_catalog','information_schema');
   ```

2. Supabase Storage could not be assessed because there is no repository usage or policy definition. Confirm from a read-only production export:

   ```sql
   SELECT id, name, public FROM storage.buckets;
   SELECT * FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename IN ('objects','buckets');
   ```

3. No frontend Supabase client or service-role key was found. `server/lib/supabase.ts:3-109` is an apparently unreferenced, server-only anon client that queries `conversations` by email. Confirm that no separately deployed artifact imports it and that no dashboard-managed anon grants make those operations possible.

4. Production environment state was not accessed. Confirm that `JWT_SECRET` is strong, `RESEND_WEBHOOK_SECRET` is set, `NODE_ENV=production`, `DISABLE_RATE_LIMIT` is absent/false, `BASE_URL` is canonical HTTPS, and the database connection enforces TLS.

5. `docs/kit/luna-voss-emails/RESUME-PROMPT.md:140-141` identifies an old leaked AWS access-key ID and says its deletion still needs confirmation. IAM read access is required to verify that the credential was revoked and that CloudTrail shows no unauthorized use.

6. The repository’s remote visibility and collaborator history were not available. Confirm who could access the tracked customer export and whether forks, caches, CI artifacts, or cloned copies retain it.

This audit was entirely static and read-only: no files were modified, no migrations were run, and no local or production database or deployment was contacted.
