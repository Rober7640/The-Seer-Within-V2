// NeverBounce email validation.
// Validates that an email address is real and deliverable.
// Docs: https://developers.neverbounce.com/reference/single-check

import logger from './logger';

const NEVERBOUNCE_SINGLE_CHECK_URL = 'https://api.neverbounce.com/v4/single/check';

// NeverBounce response codes:
// 0 = valid     (safe to send)
// 1 = invalid   (do not send — bounce risk)
// 2 = disposable (throwaway email)
// 3 = catchall  (domain accepts everything, risky)
// 4 = unknown   (could not verify)

interface NeverBounceResponse {
  status: 'success' | 'auth_failure' | 'general_failure';
  result?: 'valid' | 'invalid' | 'disposable' | 'catchall' | 'unknown';
  flags?: string[];
  suggested_correction?: string;
  execution_time?: number;
  message?: string;
}

export interface EmailValidationResult {
  valid: boolean;
  result: 'valid' | 'invalid' | 'disposable' | 'catchall' | 'unknown' | 'skipped';
  suggestedCorrection?: string;
  reason?: string;
}

/**
 * Validate an email address using NeverBounce.
 * Returns valid: true if email is safe to send to.
 * If NEVERBOUNCE_API_KEY is not configured, skips validation (returns valid: true).
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const apiKey = process.env.NEVERBOUNCE_API_KEY;

  if (!apiKey) {
    logger.warn('[NeverBounce] NEVERBOUNCE_API_KEY not configured — skipping validation');
    return { valid: true, result: 'skipped' };
  }

  try {
    const url = `${NEVERBOUNCE_SINGLE_CHECK_URL}?key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    const data: NeverBounceResponse = await res.json();

    if (data.status !== 'success') {
      logger.warn('[NeverBounce] API returned error', { status: data.status, message: data.message });
      // Fail open — don't block legitimate users if NeverBounce is down or misconfigured
      return { valid: true, result: 'unknown', reason: 'API error, skipped' };
    }

    const result = data.result || 'unknown';

    // Valid and catchall are allowed. Invalid and disposable are blocked.
    // Unknown is allowed (could be a new domain not yet in their DB).
    if (result === 'invalid') {
      return {
        valid: false,
        result,
        suggestedCorrection: data.suggested_correction || undefined,
        reason: 'Email address is invalid or undeliverable',
      };
    }

    if (result === 'disposable') {
      return {
        valid: false,
        result,
        reason: 'Disposable email addresses are not accepted',
      };
    }

    return {
      valid: true,
      result,
      suggestedCorrection: data.suggested_correction || undefined,
    };
  } catch (error) {
    logger.error('[NeverBounce] Validation request failed', error);
    // Fail open
    return { valid: true, result: 'unknown', reason: 'Request failed, skipped' };
  }
}
