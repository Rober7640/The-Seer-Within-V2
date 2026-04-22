// Cloudflare Turnstile verification.
// Validates the invisible CAPTCHA token sent from the frontend.
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

import logger from './logger';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Verify a Turnstile token with Cloudflare's API.
 * Returns true if the token is valid, false otherwise.
 * If TURNSTILE_SECRET_KEY is not configured, skips verification (returns true).
 */
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    logger.warn('[Turnstile] TURNSTILE_SECRET_KEY not configured — skipping verification');
    return true;
  }

  if (!token) {
    logger.warn('[Turnstile] No token provided');
    return false;
  }

  try {
    const body: Record<string, string> = {
      secret: secretKey,
      response: token,
    };
    if (remoteIp) {
      body.remoteip = remoteIp;
    }

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data: TurnstileVerifyResponse = await res.json();

    if (!data.success) {
      logger.warn('[Turnstile] Verification failed', { errors: data['error-codes'] });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[Turnstile] Verification request failed', error);
    // Fail open — don't block legitimate users if Cloudflare is down
    return true;
  }
}
