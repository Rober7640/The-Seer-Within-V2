// Anthropic SDK wrapper with automatic key failover.
//
// Drop-in replacement for `new Anthropic({ apiKey })`. Call sites just import
// `anthropicFailover` instead of constructing their own SDK instance — the
// surface is identical (`anthropicFailover.messages.create(...)`).
//
// On retryable errors (429 rate-limit / 529 overloaded / 401-403 auth /
// 5xx server) the wrapper transparently retries the same request on the
// next configured key. The primary is always tried first (after cooldown).
// Email alerts fire on failover and recovery so the team knows which key
// is live without touching the code.
//
// V2 PROMO KEYS: `anthropicV2` (used only by the V2 chat paths) puts the
// ANTHROPIC_API_KEY_PROMO_1..3 keys — accounts whose only balance is the free
// monthly promo credit — IN FRONT of the normal paid chain, tried in that order.
// When a promo credit runs out Anthropic answers HTTP 400 "credit balance is too
// low", which is treated as a failover trigger, so V2 chat moves to the next
// promo key and finally the paid keys instead of breaking. A promo account that
// doesn't offer the requested model (404 "model: …") is skipped for that request
// only. Promo-key failures are logged only (no alert email) because running out
// of promo credit every month is expected.

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import logger from './logger';
import { thinkingOffForModel } from './modelConfig';

// ---------- Configuration ----------

interface KeyEntry {
  name: 'primary' | 'backup_1' | 'backup_2' | 'promo_1' | 'promo_2' | 'promo_3';
  apiKey: string;
  client: Anthropic;
  // Cooldown: if set to a future timestamp, this key is skipped until then.
  cooldownUntil: number;
  // Marks whether this key was the one serving the last successful request.
  // Used to detect primary-recovery transitions.
  wasLastGood: boolean;
}

const COOLDOWN_MS = 60_000; // skip a failing key for 60s before re-probing
// An out-of-credit key won't come back within a minute — re-probe far less often
// so every V2 chat doesn't pay a wasted round-trip once the promo is spent.
const CREDIT_COOLDOWN_MS = 15 * 60 * 1000;
const ALERT_DEBOUNCE_MS = 30 * 60 * 1000; // one alert per event type per 30 min

const DEFAULT_ALERT_RECIPIENTS = [
  'hi@theseerwithin.com',
  'robertoutsource88@gmail.com',
  'mike@altiuspublishing.com',
  'outsourcejoel@gmail.com',
];

function buildKeyList(): KeyEntry[] {
  const specs: { name: KeyEntry['name']; env: string }[] = [
    { name: 'primary', env: 'ANTHROPIC_API_KEY' },
    { name: 'backup_1', env: 'ANTHROPIC_API_KEY_BACKUP_1' },
    { name: 'backup_2', env: 'ANTHROPIC_API_KEY_BACKUP_2' },
  ];

  return specs
    .map(spec => ({ ...spec, apiKey: process.env[spec.env] || '' }))
    .filter(spec => spec.apiKey.length > 0)
    .map(spec => ({
      name: spec.name,
      apiKey: spec.apiKey,
      client: new Anthropic({ apiKey: spec.apiKey }),
      cooldownUntil: 0,
      wasLastGood: false,
    }));
}

const keys: KeyEntry[] = buildKeyList();

// Order matters — promo_1 is tried first.
function buildPromoKeyList(): KeyEntry[] {
  const specs: { name: KeyEntry['name']; env: string }[] = [
    { name: 'promo_1', env: 'ANTHROPIC_API_KEY_PROMO_1' },
    { name: 'promo_2', env: 'ANTHROPIC_API_KEY_PROMO_2' },
    { name: 'promo_3', env: 'ANTHROPIC_API_KEY_PROMO_3' },
  ];

  return specs
    .map(spec => ({ ...spec, apiKey: process.env[spec.env] || '' }))
    .filter(spec => spec.apiKey.length > 0)
    .map(spec => ({
      name: spec.name,
      apiKey: spec.apiKey,
      client: new Anthropic({ apiKey: spec.apiKey }),
      cooldownUntil: 0,
      wasLastGood: false,
    }));
}

// The V2 chain shares the SAME paid KeyEntry objects as `keys`, so cooldowns and
// recovery state stay consistent between V1 and V2 callers.
const v2Keys: KeyEntry[] = [...buildPromoKeyList(), ...keys];

// Mark primary as the initially-good key so the first recovery email logic
// has a sensible baseline.
if (keys.length > 0 && keys[0].name === 'primary') {
  keys[0].wasLastGood = true;
}

// ---------- Retryable error detection ----------

// Anthropic reports an empty account balance as HTTP 400 invalid_request_error
// "Your credit balance is too low to access the Anthropic API...". A plain 400 is
// a bad request (never retried), so this one is matched by its message.
export function isCreditExhaustedError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { status?: number; message?: string; error?: unknown };
  if (anyErr.status !== 400) return false;
  let text = String(anyErr.message || '');
  try { text += ' ' + JSON.stringify(anyErr.error ?? ''); } catch { /* ignore */ }
  return /credit balance is too low/i.test(text);
}

// 404 not_found_error "model: <id>" — this account can't use the requested model
// (e.g. a newer org that was never offered an older model).
export function isModelUnavailableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { status?: number; message?: string; error?: unknown };
  if (anyErr.status !== 404) return false;
  let text = String(anyErr.message || '');
  try { text += ' ' + JSON.stringify(anyErr.error ?? ''); } catch { /* ignore */ }
  return /not_found_error/.test(text) && /model:/.test(text);
}

export function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { status?: number; code?: string; name?: string };

  if (isCreditExhaustedError(err)) return true;

  // Anthropic SDK connection failures (DNS, conn reset, socket timeout) surface as
  // APIConnectionError / APIConnectionTimeoutError. These carry NO `.status` and their
  // `.name` is just 'Error', so the status/name/code checks below would all miss them
  // and the request would wrongly surface as non-retryable (no failover, no alert).
  // Catch them by type. APIUserAbortError is deliberately NOT a subclass of
  // APIConnectionError, so an intentionally-aborted request is still not retried.
  if (err instanceof Anthropic.APIConnectionError) return true;

  // Anthropic SDK errors expose `status` for HTTP errors.
  if (typeof anyErr.status === 'number') {
    const s = anyErr.status;
    if (s === 429) return true;                 // rate / spend limit
    if (s === 529) return true;                 // Anthropic overloaded
    if (s === 401 || s === 403) return true;    // key revoked / disabled
    if (s >= 500 && s < 600) return true;       // Anthropic 5xx
    return false;
  }

  // Network-level failures (fetch abort, DNS, connection reset) — treat as retryable.
  const name = anyErr.name || '';
  const code = anyErr.code || '';
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') return true;

  return false;
}

// ---------- Error → triage guidance ----------

// Turns an Anthropic/network error into a short label (for subject + body) plus a
// plain-English explanation and the SPECIFIC action to take. Keeps alert emails from
// telling people to "check billing" on a 529 overload (Anthropic-side, self-heals) or
// on a 401 (key revoked — billing won't fix it). See codes in isRetryableError above.
interface ErrorGuidance {
  codeLabel: string;   // e.g. "529 overload", "401 auth", "ECONNRESET network"
  explanation: string; // what the code means
  action: string;      // what to actually do about it
}

function describeError(err: unknown): ErrorGuidance {
  const anyErr =
    err && typeof err === 'object'
      ? (err as { status?: number; code?: string; name?: string })
      : {};
  const status = typeof anyErr.status === 'number' ? anyErr.status : undefined;

  // SDK connection failures have no HTTP status — match them by type so they don't
  // fall through to the generic "unknown error" message at the bottom.
  if (err instanceof Anthropic.APIConnectionError) {
    return {
      codeLabel: 'connection error',
      explanation:
        'The request never reached Anthropic — a network/DNS/connection failure or socket ' +
        'timeout, so no HTTP response was received.',
      action:
        "Check the host's outbound network/DNS (Railway) and https://status.claude.com. " +
        'Usually transient and self-heals; failover has already retried the other keys.',
    };
  }

  if (isCreditExhaustedError(err)) {
    return {
      codeLabel: '400 credit balance too low',
      explanation:
        'Anthropic returned 400 "credit balance is too low" — this key\'s account has run out of credit.',
      action: "Top up the account's credit balance in the Anthropic console (Billing).",
    };
  }
  if (status === 429) {
    return {
      codeLabel: '429 rate/spend limit',
      explanation:
        'Anthropic returned 429 — a rate limit or monthly spend cap was hit on this key.',
      action:
        "Check this key's usage/rate limits AND spend caps in the Anthropic console " +
        '(Billing → Limits). This is the one case where billing is the likely cause.',
    };
  }
  if (status === 529) {
    return {
      codeLabel: '529 overload',
      explanation:
        'Anthropic returned 529 — their API is temporarily overloaded (capacity). This is ' +
        'NOT a billing, rate-limit, or key problem.',
      action:
        'Check https://status.claude.com first. This is Anthropic-side and usually self-heals ' +
        'within minutes — no key or billing action is normally needed.',
    };
  }
  if (status === 401 || status === 403) {
    return {
      codeLabel: `${status} auth`,
      explanation: `Anthropic returned ${status} — the key is invalid, revoked, or disabled.`,
      action:
        'Rotate/replace this key in the environment (Railway env vars). Billing or rate-limit ' +
        'changes will NOT fix an auth error.',
    };
  }
  if (status !== undefined && status >= 500 && status < 600) {
    return {
      codeLabel: `${status} server error`,
      explanation: `Anthropic returned ${status} — a server-side error on Anthropic's end.`,
      action:
        'Check https://status.claude.com. Transient and usually self-heals — no key or billing ' +
        'action is normally needed.',
    };
  }

  // Network-level failures have no HTTP status — surface the code/name instead.
  const netCode = anyErr.code || anyErr.name;
  if (netCode) {
    return {
      codeLabel: `${netCode} network`,
      explanation:
        `A network-level failure (${netCode}) — the request never got an HTTP response from ` +
        'Anthropic.',
      action:
        "Check the host's network/DNS connectivity (Railway). Transient connection issues " +
        'usually clear on their own.',
    };
  }

  return {
    codeLabel: status !== undefined ? `status ${status}` : 'unknown error',
    explanation:
      status !== undefined
        ? `Anthropic returned status ${status}.`
        : 'An unrecognized error occurred (no HTTP status or network code).',
    action: 'Check https://status.claude.com and the Anthropic console.',
  };
}

// ---------- Email alerting ----------

const lastAlertAt: Record<string, number> = {};

// Tracks whether we're currently in a total-outage state (every key exhausted).
// Set when the "all keys down" alert fires; cleared — with a recovery email — on
// the next successful request by ANY key. The primary-recovery path below relies
// on `wasLastGood`, which never flips during a total outage (no backup ever served
// a successful request), so without this flag a momentary all-keys-529 blip would
// recover silently.
let allKeysDown = false;

function getRecipients(): string[] {
  const fromEnv = process.env.ANTHROPIC_FAILOVER_ALERT_EMAILS;
  if (fromEnv) {
    return fromEnv.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALERT_RECIPIENTS;
}

async function sendAlertEmail(subject: string, body: string, dedupeKey: string) {
  const now = Date.now();
  if (lastAlertAt[dedupeKey] && now - lastAlertAt[dedupeKey] < ALERT_DEBOUNCE_MS) {
    return; // debounced
  }
  lastAlertAt[dedupeKey] = now;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    logger.warn('[AnthropicFailover] RESEND_API_KEY missing — skipping alert email', { subject });
    return;
  }

  const recipients = getRecipients();
  if (recipients.length === 0) return;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: 'The Seer Within <hi@theseerwithin.com>',
      to: recipients,
      subject,
      text: body,
    });
    logger.info('[AnthropicFailover] Alert email sent', { subject, recipients: recipients.length });
  } catch (err) {
    logger.error('[AnthropicFailover] Failed to send alert email', { subject, err });
  }
}

// ---------- Core request runner ----------

async function runWithFailover<T>(
  operation: (client: Anthropic) => Promise<T>,
  chain: KeyEntry[] = keys,
): Promise<T> {
  if (chain.length === 0) {
    throw new Error('Anthropic failover: no API keys configured. Set ANTHROPIC_API_KEY.');
  }

  const now = Date.now();
  let lastErr: unknown;

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    const isPromo = entry.name.startsWith('promo');

    // Skip keys still in cooldown, unless this is the last available key
    // (we try anyway as a best-effort rather than failing outright).
    if (entry.cooldownUntil > now && i < chain.length - 1) {
      continue;
    }

    try {
      const result = await operation(entry.client);

      // Success — clear any stale cooldown and detect recovery.
      entry.cooldownUntil = 0;

      // Total-outage recovery: if every key had been exhausted, the first key to
      // respond again — primary OR backup — means service is restored. Fires once
      // per outage (flag is cleared here). Distinct from the primary-recovery email
      // below, which only covers a partial failover where a backup kept serving.
      if (allKeysDown) {
        allKeysDown = false;
        logger.info('[AnthropicFailover] Recovered from total outage', { key: entry.name });
        void sendAlertEmail(
          '[Seer] Anthropic keys recovered — service restored after total outage',
          `At ${new Date().toISOString()}, the ${entry.name} Anthropic key responded ` +
            `successfully again after every configured key had been failing. Normal ` +
            `operation has resumed and users are no longer seeing fallback responses. ` +
            `No further action needed.`,
          'recovery:all_keys',
        );
      }

      // Promo keys sit outside the paid primary/backup recovery bookkeeping — a promo
      // success must not flip the paid primary's wasLastGood, or the next paid call
      // would send a false "primary recovered" email.
      if (isPromo) {
        logger.debug('[AnthropicFailover] Served by promo key', { key: entry.name });
        return result;
      }

      // Paid entries of this chain — for the real V2 chain these are the same
      // objects as `keys`, so recovery state is shared with V1 callers.
      const paid = chain.filter(k => !k.name.startsWith('promo'));
      const wasUsingFallback = paid[0].cooldownUntil > 0 || !paid[0].wasLastGood;
      if (entry.name === 'primary' && wasUsingFallback) {
        // Primary just came back after a failover window.
        logger.info('[AnthropicFailover] Primary key recovered', { key: entry.name });
        void sendAlertEmail(
          '[Seer] Anthropic primary key recovered — resumed normal operation',
          `At ${new Date().toISOString()}, the primary Anthropic key (ANTHROPIC_API_KEY) ` +
            `responded successfully again. Backup keys are idle. No further action needed.`,
          'recovery:primary',
        );
      }

      // Reset wasLastGood flags so recovery detection works on the next failover.
      paid.forEach(k => { k.wasLastGood = (k === entry); });

      return result;
    } catch (err) {
      lastErr = err;

      // A promo account that doesn't offer this model: skip it for THIS request
      // only (no cooldown — the key still serves other models). Paid keys keep the
      // old behaviour: a missing model is a real config error and surfaces.
      if (isPromo && isModelUnavailableError(err)) {
        logger.warn('[AnthropicFailover] Promo key lacks model — skipping', {
          key: entry.name,
          nextKey: chain[i + 1]?.name || 'none',
        });
        continue;
      }

      if (!isRetryableError(err)) {
        // Non-retryable (bad input, content-filtered, etc.) — surface immediately.
        throw err;
      }

      // Retryable: park this key in cooldown, try the next one.
      const creditOut = isCreditExhaustedError(err);
      entry.cooldownUntil = Date.now() + (creditOut ? CREDIT_COOLDOWN_MS : COOLDOWN_MS);
      const status = (err as { status?: number }).status;
      logger.warn('[AnthropicFailover] Key failed — rotating', {
        key: entry.name,
        status,
        creditOut,
        nextKey: chain[i + 1]?.name || 'none',
      });

      // Promo key failing (normally: monthly promo credit used up) is expected —
      // log only, no alert email; the paid chain behind it takes over.
      if (isPromo) continue;

      // If we're rotating AWAY from primary (i.e. primary just failed), alert.
      if (entry.name === 'primary' && chain.length > 1) {
        const nextKey = chain[i + 1]?.name || 'none';
        const g = describeError(err);
        void sendAlertEmail(
          `[Seer] Anthropic primary key failed (${g.codeLabel}) — now using ${nextKey}`,
          `At ${new Date().toISOString()}, the primary Anthropic key (ANTHROPIC_API_KEY) failed.\n\n` +
            `What happened: ${g.explanation}\n\n` +
            `Failover activated — traffic is now served by ${nextKey}. ` +
            `The primary will be re-probed automatically after a 60-second cooldown.\n\n` +
            `What to do: ${g.action}`,
          // Code-aware dedupe: repeated same-code failures stay debounced for 30 min, but a
          // DIFFERENT code (e.g. a 401 key-revoked after an earlier 529 overload) breaks
          // through immediately so a more serious error isn't masked by an earlier blip.
          `failover:primary:${g.codeLabel}`,
        );
      }

      // Continue to next key in the loop.
    }
  }

  // All keys exhausted. Flag the total-outage state so the next successful request
  // (by any key) emits a "service restored" recovery email. Set unconditionally —
  // independent of whether the alert email below is debounced.
  allKeysDown = true;
  logger.error('[AnthropicFailover] All keys exhausted', { lastErr });
  const g = describeError(lastErr);
  void sendAlertEmail(
    `[Seer] All Anthropic keys are down (${g.codeLabel})`,
    `At ${new Date().toISOString()}, every configured Anthropic key failed with a retryable ` +
      `error. Users will see fallback responses until at least one key recovers.\n\n` +
      `Last error: ${g.explanation}\n\n` +
      `What to do: ${g.action}\n\n` +
      `If the keys are failing with different codes, also check https://status.claude.com and ` +
      `each key in the Anthropic console.`,
    // Code-aware dedupe (see failover:primary) — a new exhausting code re-alerts.
    `all_keys_down:${g.codeLabel}`,
  );
  // Always throw a wrapper error so callers can reliably detect total exhaustion.
  // The original SDK error (including `status`) is preserved on `.cause` and mirrored
  // on the wrapper so any caller that inspected `err.status` in the old code path
  // continues to work.
  const exhaustedErr = new Error('Anthropic failover: all keys exhausted');
  (exhaustedErr as any).allKeysExhausted = true;
  (exhaustedErr as any).cause = lastErr;
  if (lastErr && typeof lastErr === 'object' && 'status' in (lastErr as any)) {
    (exhaustedErr as any).status = (lastErr as any).status;
  }
  throw exhaustedErr;
}

// ---------- Public API (drop-in for `new Anthropic()`) ----------

// Mirrors the shape of the SDK client so call sites can do a simple import swap:
//   import Anthropic from '@anthropic-ai/sdk';
//   const anthropic = new Anthropic({ apiKey: ... });
// becomes:
//   import { anthropicFailover as anthropic } from './anthropicWithFailover';
// and `anthropic.messages.create(...)` works unchanged.
// The cast preserves the SDK's exact overload set (non-streaming returns
// `Message`, streaming returns `Stream<RawMessageStreamEvent>`). Without the
// cast, TS widens the return type and call sites that read `.content` fail
// to compile. Runtime behaviour is identical.
// Claude 5-generation models (e.g. Sonnet 5.5 / Haiku 5.5) run adaptive
// thinking ON when `thinking` is omitted — which wastes our low max_tokens
// budget and can blank a content[0] reply. Inject the correct per-model
// off-switch here, once, for every caller — but only when the caller hasn't
// set `thinking` itself. No-op for 4.x models (returns {}). See
// thinkingOffForModel for the per-family mapping.
export function withThinkingOff(params: any): any {
  if (params && params.thinking === undefined) {
    const off = thinkingOffForModel(params.model);
    if (off.thinking !== undefined) return { ...params, thinking: off.thinking };
  }
  return params;
}

export const anthropicFailover = {
  messages: {
    create: ((params: any, options?: any) => {
      const p = withThinkingOff(params);
      return runWithFailover(client => client.messages.create(p, options));
    }) as Anthropic['messages']['create'],
  },
};

// V2 chat only: same surface (and same thinking-off handling), but tries the
// promo keys (if configured) first, in order. With no ANTHROPIC_API_KEY_PROMO_*
// set it behaves exactly like anthropicFailover.
export const anthropicV2 = {
  messages: {
    create: ((params: any, options?: any) => {
      const p = withThinkingOff(params);
      return runWithFailover(client => client.messages.create(p, options), v2Keys);
    }) as Anthropic['messages']['create'],
  },
};

// Exposed for tests / health checks.
export function getConfiguredKeyNames(): string[] {
  return keys.map(k => k.name);
}

export function getV2KeyNames(): string[] {
  return v2Keys.map(k => k.name);
}

// Test-only: run an operation over a fake chain of named clients.
export function __runChainForTest<T>(
  fakes: { name: KeyEntry['name']; client: unknown }[],
  operation: (client: any) => Promise<T>,
): Promise<T> {
  const chain: KeyEntry[] = fakes.map(f => ({
    name: f.name, apiKey: 'test', client: f.client as Anthropic, cooldownUntil: 0, wasLastGood: false,
  }));
  return runWithFailover(operation, chain);
}
