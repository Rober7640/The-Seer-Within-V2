// Central Stripe-account resolver — the single switch point for the backup
// Stripe account ("cold standby"). Everything that talks to Stripe goes through
// here so flipping ONE env var (ACTIVE_STRIPE_ACCOUNT=A|B) + redeploy moves all
// new charges to the other account.
//
// Account A = the current/primary account (existing env vars, unchanged).
// Account B = the dormant backup (same vars with a `_B` suffix).
//
// While ACTIVE_STRIPE_ACCOUNT is unset or "A", behaviour is identical to before:
// getStripe() returns a client built from STRIPE_SECRET_KEY, exactly like the
// old per-file `new Stripe(...)` singletons (same sk_test_placeholder guard).
//
// IMPORTANT: the active account is fixed at process boot. Switching requires a
// redeploy (which is already the plan), so memoizing one client per account is
// safe and matches the previous module-level-singleton semantics.

import Stripe from 'stripe';
import { instrumentStripeForAlarm } from './stripeAccountAlert';

export type StripeAccountId = 'A' | 'B';

const PLACEHOLDER = 'sk_test_placeholder';

/** The account this process is currently transacting on. Defaults to 'A'. */
export function getActiveStripeAccount(): StripeAccountId {
  const v = (process.env.ACTIVE_STRIPE_ACCOUNT || 'A').trim().toUpperCase();
  return v === 'B' ? 'B' : 'A';
}

function secretKeyFor(account: StripeAccountId): string | undefined {
  return account === 'B'
    ? process.env.STRIPE_SECRET_KEY_B
    : process.env.STRIPE_SECRET_KEY;
}

/**
 * Raw secret key for the active account — for low-level probes (e.g. the health
 * check's REST call). Returns undefined / placeholder unchanged so callers keep
 * their existing "not configured" handling.
 */
export function getActiveStripeSecretKey(): string | undefined {
  return secretKeyFor(getActiveStripeAccount());
}

// One memoized client per account (null when that account isn't configured).
const clients = new Map<StripeAccountId, Stripe | null>();

function clientFor(account: StripeAccountId): Stripe | null {
  if (!clients.has(account)) {
    const key = secretKeyFor(account);
    // Instrument the client's charge methods with the account-failure smoke alarm
    // (Phase 3). One memoized client per account → instrumenting here covers every
    // charge site (V1 + V2) centrally. Transparent: wrappers rethrow unchanged.
    clients.set(
      account,
      key && key !== PLACEHOLDER ? instrumentStripeForAlarm(new Stripe(key)) : null,
    );
  }
  return clients.get(account)!;
}

/**
 * Stripe client for a specific account. Use this (not getStripe) when you must
 * talk to the account that *created* a record — e.g. refunds/reconciliation on
 * an old Account A payment after we've switched to B. Pair with the row's
 * persisted `stripeAccount` tag.
 */
export function getStripeFor(account: StripeAccountId): Stripe | null {
  return clientFor(account);
}

/**
 * Stripe client for the active account. Drop-in replacement for the old
 * `const stripe = new Stripe(...)` singletons — returns null when the active
 * account isn't configured, same as before.
 */
export function getStripe(): Stripe | null {
  return clientFor(getActiveStripeAccount());
}

/**
 * Tag to persist on every NEW Stripe record (payment intents, sessions,
 * customers) so later refund/reconciliation/dispute lookups query the account
 * that actually created the object. Stripe object IDs only resolve against
 * their creating account.
 */
export function activeStripeAccountTag(): StripeAccountId {
  return getActiveStripeAccount();
}

/**
 * Normalize a persisted `stripeAccount` value to an account id. Legacy rows
 * predating the backup-account work have NULL/'' → treat as 'A' (the only
 * account that had ever been live then).
 */
export function stripeAccountFromTag(
  tag: string | null | undefined,
): StripeAccountId {
  return (tag || '').trim().toUpperCase() === 'B' ? 'B' : 'A';
}

/**
 * Stripe client for the account that created a persisted record — the correct
 * client for refunds / reconciliation / dispute lookups. Pass the row's
 * `stripeAccount` column (NULL-safe → 'A').
 */
export function getStripeForRow(tag: string | null | undefined): Stripe | null {
  return getStripeFor(stripeAccountFromTag(tag));
}

// ---- Webhooks -------------------------------------------------------------
// Two independent endpoints, each with its own signing secret per account:
//   trackdesk -> /api/webhooks/stripe  (V1 funnel + upsells + affiliate)
//   credits   -> /api/credits/webhook  (V2 coin packs)
// On switch we verify against BOTH accounts' secrets so B's events validate
// immediately and A's late/in-flight events still validate during handover.

export type WebhookKind = 'trackdesk' | 'credits';

function webhookSecretsFor(
  kind: WebhookKind,
): Array<{ account: StripeAccountId; secret: string }> {
  const table: Record<WebhookKind, Record<StripeAccountId, string | undefined>> = {
    trackdesk: {
      A: process.env.STRIPE_TRACKDESK_WEBHOOK_SECRET,
      B: process.env.STRIPE_TRACKDESK_WEBHOOK_SECRET_B,
    },
    credits: {
      A: process.env.STRIPE_CREDITS_WEBHOOK_SECRET,
      B: process.env.STRIPE_CREDITS_WEBHOOK_SECRET_B,
    },
  };
  const active = getActiveStripeAccount();
  const order: StripeAccountId[] = active === 'B' ? ['B', 'A'] : ['A', 'B'];
  return order
    .map((account) => ({ account, secret: table[kind][account] }))
    .filter((e): e is { account: StripeAccountId; secret: string } => !!e.secret);
}

export type WebhookVerifyResult =
  | { ok: true; event: Stripe.Event; account: StripeAccountId }
  | { ok: false; reason: 'not_configured' | 'invalid_signature' };

/**
 * Verify a Stripe webhook signature against whichever configured account secret
 * matches. Signature verification is pure HMAC (key-agnostic), so any available
 * client can perform it.
 *   - not_configured   -> caller responds 500 (no secret set at all)
 *   - invalid_signature-> caller responds 400 (secret(s) set, none matched)
 */
export function verifyStripeWebhook(
  rawBody: Buffer | string,
  signature: string,
  kind: WebhookKind,
): WebhookVerifyResult {
  const candidates = webhookSecretsFor(kind);
  if (candidates.length === 0) return { ok: false, reason: 'not_configured' };

  const stripe = getStripe() ?? getStripeFor('A') ?? getStripeFor('B');
  if (!stripe) return { ok: false, reason: 'not_configured' };

  for (const { account, secret } of candidates) {
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      return { ok: true, event, account };
    } catch {
      // signature didn't match this secret — try the next account
    }
  }
  return { ok: false, reason: 'invalid_signature' };
}
