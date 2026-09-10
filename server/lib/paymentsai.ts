/**
 * Payments.AI API client — DEV FUNNEL ONLY.
 *
 * Backs the `/fb-tarot/pai` dummy lander, which mirrors the live tarot funnel
 * (main + order bump -> upsell 1 -> upsell 2) onto Payments.AI so we can find out
 * whether their answers survive contact with how we actually operate.
 *
 * This module is NEVER reached by the live Stripe funnel. Nothing in routes.ts's
 * existing handlers calls into it.
 *
 * ── MONEY UNITS ────────────────────────────────────────────────────────────────
 * Our codebase carries money in CENTS everywhere. Payments.AI's transaction API
 * accepts DECIMAL DOLLARS on the request (`amount: 47.77` — proven approved in
 * scripts/audit rounds 12-15), while their webhook payload shows `"amount": 2000`
 * for a $20 charge, which reads as minor units. Request and delivery may not use
 * the same scale, and they have not confirmed it in writing.
 *
 * So: this module takes CENTS at its own boundary and converts once, here, in
 * `toApiAmount`. Every caller stays in cents like the rest of the app. If their
 * scale turns out to differ, this is the single line that changes.
 *
 * ── THE MIT GUARD ──────────────────────────────────────────────────────────────
 * Tim reproduced this on their PRODUCTION with his own card (2026-09-09 call,
 * 59:31): a customer-initiated transaction declined on a wrong CVV, and a
 * follow-up merchant-initiated charge on the same instrument was APPROVED anyway.
 * Payments.AI does not enforce the rule. MasterCard begins enforcing 23 October.
 * His own advice was that checking the originating CIT is "sufficient enough".
 *
 * `assertCitApproved` is that guard. Both upsell paths call it before charging.
 */
import logger from './logger';

const STAGING_BASE = 'https://staging-api.payments.ai';

export interface PaiTransaction {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  result?: string;
  combinedStatus?: string;
  type?: string;
  metadata?: Record<string, string>;
  paymentInstrument?: { id?: string; method?: string };
  paymentInstrumentId?: string;
  customer?: { id?: string; email?: string };
  gatewayName?: string;
  gatewaySlug?: string;
  parentTransactionId?: string | null;
}

export interface PaiResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  raw?: string;
}

function config() {
  const apiKey = process.env.PAYMENTSAI_API_KEY;
  const orgId = process.env.PAYMENTSAI_ORG_ID;
  // Deliberately defaults to staging. A production base must be set explicitly.
  const base = process.env.PAYMENTSAI_BASE || STAGING_BASE;
  return { apiKey, orgId, base };
}

/** True only when we have credentials AND are pointed at a sandbox. */
export function paymentsAiReady(): { ready: boolean; reason?: string } {
  const { apiKey, orgId, base } = config();
  if (!apiKey) return { ready: false, reason: 'PAYMENTSAI_API_KEY not set' };
  if (!orgId) return { ready: false, reason: 'PAYMENTSAI_ORG_ID not set' };
  if (!base.includes('staging')) {
    return { ready: false, reason: `refusing a non-staging base (${base})` };
  }
  return { ready: true };
}

/**
 * Cents -> the scale their API accepts on a request.
 *
 * THE SINGLE PLACE THIS CONVERSION HAPPENS. If pai-r18-authorize-capture.mjs
 * shows their API actually wants minor units, change this line and nothing else.
 */
function toApiAmount(cents: number): number {
  return Math.round(cents) / 100;
}

async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<PaiResult<T>> {
  const { apiKey, orgId, base } = config();
  const ready = paymentsAiReady();
  if (!ready.ready) {
    return { ok: false, status: 0, error: ready.reason };
  }

  const url = `${base}/v1/public-api/organizations/${orgId}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `ApiKey ${apiKey}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body — keep the raw text for the caller */
    }
    const data = (json?.data ?? json) as T | undefined;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json?.message || `HTTP ${res.status}`,
        raw: text.slice(0, 600),
        data,
      };
    }
    return { ok: true, status: res.status, data, raw: text.slice(0, 2000) };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

export async function createCustomer(params: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<PaiResult<{ id: string }>> {
  return call('POST', '/customers', {
    email: params.email,
    ...(params.firstName ? { firstName: params.firstName } : {}),
    ...(params.lastName ? { lastName: params.lastName } : {}),
  });
}

export async function getTransaction(id: string): Promise<PaiResult<PaiTransaction>> {
  return call('GET', `/transactions/${id}`);
}

/**
 * Poll until the transaction leaves `pending`. Their orchestrator settles
 * asynchronously — the same reason the audit scripts poll rather than trusting
 * the create response.
 */
export async function settleTransaction(
  id: string,
  attempts = 6,
  delayMs = 1500,
): Promise<PaiTransaction | null> {
  let final: PaiTransaction | null = null;
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const back = await getTransaction(id);
    if (back.data) final = back.data;
    const r = String(final?.result ?? '').toLowerCase();
    if (r && r !== 'pending') break;
  }
  return final;
}

export interface ChargeParams {
  customerId: string;
  amountCents: number;
  metadata: Record<string, string>;
  idempotencyKey: string;
  /** A fresh FramePay token (customer-initiated) … */
  token?: string;
  /** … or a stored instrument (merchant-initiated upsell). */
  paymentInstrumentId?: string;
  isMerchantInitiated: boolean;
  currency?: string;
}

export async function charge(params: ChargeParams): Promise<PaiResult<PaiTransaction>> {
  if (!params.token && !params.paymentInstrumentId) {
    return { ok: false, status: 0, error: 'charge needs a token or a paymentInstrumentId' };
  }
  return call<PaiTransaction>('POST', '/transactions', {
    type: 'sale',
    customerId: params.customerId,
    currency: params.currency ?? 'USD',
    amount: toApiAmount(params.amountCents),
    idempotencyKey: params.idempotencyKey,
    isMerchantInitiated: params.isMerchantInitiated,
    paymentInstruction: params.token
      ? { token: params.token }
      : { paymentInstrumentId: params.paymentInstrumentId },
    metadata: params.metadata,
  });
}

/**
 * 🔴 THE 23-OCTOBER GUARD. Never fire a merchant-initiated charge unless the
 * originating customer-initiated transaction settled `approved`.
 *
 * Their platform does not enforce this — a declined CIT still leaves an
 * instrument that an MIT will happily bill. Until MasterCard enforces it on
 * 23 October, this function is the only thing standing between a declined card
 * and a billed upsell.
 */
export async function assertCitApproved(
  citTransactionId: string,
): Promise<{ approved: boolean; reason?: string; tx?: PaiTransaction }> {
  const res = await getTransaction(citTransactionId);
  if (!res.ok || !res.data) {
    return { approved: false, reason: res.error || 'could not read the originating transaction' };
  }
  const result = String(res.data.result ?? '').toLowerCase();
  if (result !== 'approved') {
    logger.warn(
      `[pai] MIT GUARD BLOCKED an upsell — CIT ${citTransactionId} result="${res.data.result}"`,
    );
    return { approved: false, reason: `originating transaction is "${res.data.result}"`, tx: res.data };
  }
  return { approved: true, tx: res.data };
}

/**
 * The instrument an approved CIT leaves behind, for the upsell MITs to reuse.
 * This is the whole join between a buyer's main purchase and her upsells —
 * Payments.AI has no session object, so there is nothing else tying them.
 */
export function instrumentIdOf(tx: PaiTransaction | null | undefined): string | null {
  return tx?.paymentInstrument?.id ?? tx?.paymentInstrumentId ?? null;
}

/**
 * Every metadata key our live V1 funnel writes to Stripe today, so a dev run can
 * report exactly which ones Payments.AI keeps.
 *
 * 🔴 FIVE OF THESE ARE STILL DROPPED SILENTLY: app, priceVariant,
 * posthogDistinctId, bumpBucket, bumpAmount. Their written answer (Q20a/Q20d)
 * promises all 17 registered in PRODUCTION on 22 September, and says nothing
 * about staging; unregistered fields are dropped with no error on an approved
 * charge, so a run before then LOOKS clean while the data that matters is gone.
 *
 * `auditMetadata` exists so the dev funnel reports that explicitly rather than
 * letting a green run mislead us.
 */
export const EXPECTED_METADATA_KEYS = [
  'product', 'type', 'funnel', 'bucket', 'firstName', 'email',
  'originalSession', 'trackdeskClickId', 'gclid', 'noemail', 'flow', 'bumpProduct',
  // the five believed unregistered
  'app', 'priceVariant', 'posthogDistinctId', 'bumpBucket', 'bumpAmount',
] as const;

export const KNOWN_UNREGISTERED_KEYS = [
  'app', 'priceVariant', 'posthogDistinctId', 'bumpBucket', 'bumpAmount',
] as const;

export function auditMetadata(
  sent: Record<string, string>,
  stored: Record<string, string> | undefined,
): {
  kept: string[];
  dropped: string[];
  unexpectedlyDropped: string[];
  expectedDropped: string[];
} {
  const back = stored ?? {};
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const k of Object.keys(sent)) {
    (k in back ? kept : dropped).push(k);
  }
  const known = new Set<string>(KNOWN_UNREGISTERED_KEYS as readonly string[]);
  return {
    kept,
    dropped,
    // These are the ones that would be a NEW problem, not the five we know about.
    unexpectedlyDropped: dropped.filter((k) => !known.has(k)),
    expectedDropped: dropped.filter((k) => known.has(k)),
  };
}
