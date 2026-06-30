// "Smoke alarm" for the backup-Stripe plan (Phase 3).
//
// Watches real charge attempts for ACCOUNT-LEVEL Stripe failures — the signal
// that the active account is restricted/terminated and can no longer take money
// — as opposed to ordinary customer card declines. On detection it raises a
// throttled alert so a human can confirm in the Stripe dashboard and flip
// ACTIVE_STRIPE_ACCOUNT to the backup (the switch stays manual by design).
//
// Detection is automatic; the switch is not. See docs/backup-stripe-account-plan.md.

import type Stripe from 'stripe';
import { Resend } from 'resend';
import logger from './logger';

// Local read to avoid an import cycle with stripeAccount.ts (which imports this
// module to instrument its clients). Mirrors getActiveStripeAccount().
function activeAccount(): 'A' | 'B' {
  return (process.env.ACTIVE_STRIPE_ACCOUNT || 'A').trim().toUpperCase() === 'B'
    ? 'B'
    : 'A';
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com';
const FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'The Seer Within';
// Recipient(s) for the smoke alarm. Comma-separated. If unset, alarm is log-only.
const ALERT_TO = process.env.STRIPE_ALERT_EMAIL_TO;
// Optional Slack/generic incoming-webhook URL (receives a JSON {text}).
const ALERT_WEBHOOK_URL = process.env.STRIPE_ALERT_WEBHOOK_URL;

// Stripe error codes that mean "this ACCOUNT cannot charge" — not a card decline.
// https://stripe.com/docs/error-codes
const ACCOUNT_LEVEL_CODES = new Set([
  'account_inactive',
  'account_invalid',
  'charges_not_allowed_on_standard_account',
  'platform_account_required',
]);

/**
 * True only for ACCOUNT-level failures (account disabled / charges blocked / key
 * revoked) — deliberately NOT for StripeCardError / normal declines. Errors come
 * from the Stripe SDK (fields on the error) or its `.raw` payload.
 */
export function isAccountLevelStripeError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.raw?.code;
  const type = err.type || err.raw?.type;

  if (code && ACCOUNT_LEVEL_CODES.has(code)) return true;
  // Permission / auth errors on a key that used to work signal a revoked key or a
  // disabled account. Card errors (StripeCardError) are explicitly excluded above.
  if (type === 'StripePermissionError' || type === 'StripeAuthenticationError') {
    return true;
  }
  return false;
}

// Throttle so a blocked account doesn't fire an alert on every failed charge.
let lastAlertAt = 0;
const ALERT_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Raise the smoke alarm for an account-level Stripe failure. Always logs at
 * ERROR with a greppable marker (the durable signal); additionally emails /
 * webhooks if configured, throttled and fire-and-forget so it never blocks or
 * throws into the charge path. Call only when isAccountLevelStripeError(err).
 */
export function reportStripeAccountFailure(err: any, context: string): void {
  const account = activeAccount();
  const code = err?.code || err?.raw?.code || err?.type || 'unknown';

  logger.error(
    `[STRIPE-ACCOUNT-ALARM] Active account ${account} returned an account-level failure ` +
      `(context=${context}, code=${code}). The account may be restricted/terminated — ` +
      `confirm in Stripe and consider switching ACTIVE_STRIPE_ACCOUNT.`,
    { account, context, code, message: err?.message },
  );

  const now = Date.now();
  if (now - lastAlertAt < ALERT_THROTTLE_MS) return;
  lastAlertAt = now;

  void sendAlertEmail(account, context, String(code), err?.message).catch((e) =>
    logger.error('[STRIPE-ACCOUNT-ALARM] alert email failed', { err: String(e) }),
  );
  void sendAlertWebhook(account, context, String(code), err?.message).catch((e) =>
    logger.error('[STRIPE-ACCOUNT-ALARM] alert webhook failed', { err: String(e) }),
  );
}

async function sendAlertEmail(
  account: string,
  context: string,
  code: string,
  message?: string,
): Promise<void> {
  if (!resend || !ALERT_TO) return;
  const subject = `⚠️ Stripe Account ${account} may be BLOCKED — consider switching`;
  const html = `
    <h2>Stripe account-level failure detected</h2>
    <p>A real charge attempt on <strong>Account ${account}</strong> failed with an
    account-level error. This usually means the account is restricted or terminated
    and can no longer take payments.</p>
    <ul>
      <li><strong>Error code:</strong> ${code}</li>
      <li><strong>Where:</strong> ${context}</li>
      <li><strong>Message:</strong> ${message ? String(message) : 'n/a'}</li>
    </ul>
    <p><strong>What to do:</strong> confirm in the Stripe dashboard that the account
    is genuinely blocked (not a Stripe-wide outage), then flip
    <code>ACTIVE_STRIPE_ACCOUNT</code> to the backup (and swap
    <code>VITE_STRIPE_PUBLISHABLE_KEY</code>) and redeploy.</p>
    <p style="color:#888">Further alerts are throttled for 15 minutes.</p>
  `;
  await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: ALERT_TO.split(',').map((s) => s.trim()).filter(Boolean),
    subject,
    html,
  });
}

async function sendAlertWebhook(
  account: string,
  context: string,
  code: string,
  message?: string,
): Promise<void> {
  if (!ALERT_WEBHOOK_URL) return;
  const text =
    `⚠️ Stripe Account ${account} may be BLOCKED (account-level failure). ` +
    `code=${code} where=${context} msg=${message ?? 'n/a'}. ` +
    `Confirm in Stripe, then switch ACTIVE_STRIPE_ACCOUNT + redeploy.`;
  await fetch(ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

/**
 * Transparent wrapper around a Stripe charge operation: runs it, and if it fails
 * with an account-level error raises the smoke alarm — then RETHROWS the original
 * error unchanged so the caller's existing error handling is completely
 * unaffected. The only added effect is the side-effect alert.
 */
export async function guardStripeCharge<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isAccountLevelStripeError(err)) {
      reportStripeAccountFailure(err, context);
    }
    throw err;
  }
}

const INSTRUMENTED = Symbol.for('seer.stripeAlarmInstrumented');

/**
 * Wrap a Stripe client's charge-creating methods (paymentIntents.create,
 * checkout.sessions.create) with the smoke alarm, in place. Idempotent. This is
 * the single, central detection point: because getStripe()/getStripeFor() hand
 * out one memoized client per account, instrumenting at construction covers
 * EVERY charge site (V1 funnel + V2 credits) with no per-call-site edits. The
 * wrappers rethrow unchanged — purely a side-effect alert, no behavior change.
 */
export function instrumentStripeForAlarm(stripe: Stripe): Stripe {
  const anyStripe = stripe as any;
  if (anyStripe[INSTRUMENTED]) return stripe;

  const pi = anyStripe.paymentIntents;
  if (pi?.create) {
    const orig = pi.create.bind(pi);
    pi.create = (...args: unknown[]) =>
      guardStripeCharge(() => orig(...args), 'paymentIntents.create');
  }

  const sessions = anyStripe.checkout?.sessions;
  if (sessions?.create) {
    const orig = sessions.create.bind(sessions);
    sessions.create = (...args: unknown[]) =>
      guardStripeCharge(() => orig(...args), 'checkout.sessions.create');
  }

  anyStripe[INSTRUMENTED] = true;
  return stripe;
}
