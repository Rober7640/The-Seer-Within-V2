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

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import logger from './logger';

// ---------- Configuration ----------

interface KeyEntry {
  name: 'primary' | 'backup_1' | 'backup_2';
  apiKey: string;
  client: Anthropic;
  // Cooldown: if set to a future timestamp, this key is skipped until then.
  cooldownUntil: number;
  // Marks whether this key was the one serving the last successful request.
  // Used to detect primary-recovery transitions.
  wasLastGood: boolean;
}

const COOLDOWN_MS = 60_000; // skip a failing key for 60s before re-probing
const ALERT_DEBOUNCE_MS = 30 * 60 * 1000; // one alert per event type per 30 min

// NOTE: Joel's email (outsourcejoel@gmail.com) intentionally omitted during
// testing — add back before production rollout.
const DEFAULT_ALERT_RECIPIENTS = [
  'hi@theseerwithin.com',
  'robertoutsource88@gmail.com',
  'mike@altiuspublishing.com',
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

// Mark primary as the initially-good key so the first recovery email logic
// has a sensible baseline.
if (keys.length > 0 && keys[0].name === 'primary') {
  keys[0].wasLastGood = true;
}

// ---------- Retryable error detection ----------

function isRetryableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { status?: number; code?: string; name?: string };

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

// ---------- Email alerting ----------

const lastAlertAt: Record<string, number> = {};

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
): Promise<T> {
  if (keys.length === 0) {
    throw new Error('Anthropic failover: no API keys configured. Set ANTHROPIC_API_KEY.');
  }

  const now = Date.now();
  let lastErr: unknown;

  for (let i = 0; i < keys.length; i++) {
    const entry = keys[i];

    // Skip keys still in cooldown, unless this is the last available key
    // (we try anyway as a best-effort rather than failing outright).
    if (entry.cooldownUntil > now && i < keys.length - 1) {
      continue;
    }

    try {
      const result = await operation(entry.client);

      // Success — clear any stale cooldown and detect primary recovery.
      entry.cooldownUntil = 0;

      const wasUsingFallback = keys[0].cooldownUntil > 0 || !keys[0].wasLastGood;
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
      keys.forEach(k => { k.wasLastGood = (k === entry); });

      return result;
    } catch (err) {
      lastErr = err;

      if (!isRetryableError(err)) {
        // Non-retryable (bad input, content-filtered, etc.) — surface immediately.
        throw err;
      }

      // Retryable: park this key in cooldown, try the next one.
      entry.cooldownUntil = Date.now() + COOLDOWN_MS;
      const status = (err as { status?: number }).status;
      logger.warn('[AnthropicFailover] Key failed — rotating', {
        key: entry.name,
        status,
        nextKey: keys[i + 1]?.name || 'none',
      });

      // If we're rotating AWAY from primary (i.e. primary just failed), alert.
      if (entry.name === 'primary' && keys.length > 1) {
        const nextKey = keys[i + 1]?.name || 'none';
        void sendAlertEmail(
          `[Seer] Anthropic primary key failed — now using ${nextKey}`,
          `At ${new Date().toISOString()}, the primary Anthropic key (ANTHROPIC_API_KEY) ` +
            `returned status ${status ?? 'unknown'}.\n\n` +
            `Failover activated — traffic is now served by ${nextKey}. ` +
            `The primary will be re-probed automatically after a 60-second cooldown.\n\n` +
            `Please check the primary key's billing and rate-limit status in the Anthropic console.`,
          'failover:primary',
        );
      }

      // Continue to next key in the loop.
    }
  }

  // All keys exhausted.
  logger.error('[AnthropicFailover] All keys exhausted', { lastErr });
  void sendAlertEmail(
    '[Seer] All Anthropic keys are down',
    `At ${new Date().toISOString()}, every configured Anthropic key failed with a retryable ` +
      `error. Users will see fallback responses until at least one key recovers.\n\n` +
      `Check Anthropic status page + each key's billing/rate-limits immediately.`,
    'all_keys_down',
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
export const anthropicFailover = {
  messages: {
    create: ((params: any, options?: any) =>
      runWithFailover(client => client.messages.create(params, options))) as Anthropic['messages']['create'],
  },
};

// Exposed for tests / health checks.
export function getConfiguredKeyNames(): string[] {
  return keys.map(k => k.name);
}
