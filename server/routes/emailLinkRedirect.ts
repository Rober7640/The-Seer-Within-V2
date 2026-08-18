// Short-link redirector for marketing emails: GET /e/:code resolves an
// opaque code (minted by server/lib/emailLinkCodes.ts) back to a persona +
// campaign and redirects into that persona's existing lander, continuing the
// specific reading a reader clicked from. Mounted at the app root (see
// server/routes.ts) so the public URL is the clean https://.../e/<code>.
//
// Leaf route: nothing else in the Live Thread plan consumes this router.
// Task 13 is what will eventually generate /e/<code> URLs in real emails.

import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { resolveEmailLinkCode } from '../lib/emailLinkCodes';
import { posthog } from '../lib/posthog';
import logger from '../lib/logger';

// Only Evelyn is wired for this rollout slice; Aiden/Luna are added here
// once their pipeline integration exists (persona-by-persona rollout).
const PERSONA_LANDER_PATHS: Record<string, string> = {
  'evelyn-cross': '/evelyn',
};

export const emailLinkRedirectRouter = Router();

emailLinkRedirectRouter.get('/e/:code', async (req, res) => {
  let resolved;
  try {
    resolved = await resolveEmailLinkCode(req.params.code);
  } catch (error: any) {
    // resolveEmailLinkCode can reject on a real DB error, not just resolve
    // null. A reader must never see an unhandled rejection / crashed
    // request for a stale or malformed link -- fall back the same way an
    // unresolvable code does. But an infrastructure failure here still
    // needs to page someone: forward it to the same monitoring path the
    // global error handler uses (server/index.ts) so it doesn't just
    // disappear into application logs while every reader silently bounces
    // to /personas.
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    posthog.captureException(error);
    logger.error('email-link-redirect: resolveEmailLinkCode failed', {
      error: error?.message,
    });
    res.redirect('/personas');
    return;
  }

  if (!resolved) {
    res.redirect('/personas');
    return;
  }

  const landerPath = PERSONA_LANDER_PATHS[resolved.personaSlug];
  if (!landerPath) {
    res.redirect('/personas');
    return;
  }

  // Rebuild the query string the legacy `?campaign=` email link used to carry.
  // These are SYNTHESIZED from the resolved row, never forwarded from the
  // incoming request: the whole reason the campaign travels as a path segment
  // is that query params get stripped by link-privacy proxies and mangled by
  // ESP click wrappers, so anything we forwarded would be exactly as fragile
  // as what the short link replaced.
  //
  // `bucket` is load-bearing, not analytics — it selects Drip 1's
  // bucket-specific phrase (server/lib/evelynVerifiedDripGenerator.ts
  // BUCKET_PHRASES) via the signup destination EvelynLanderPage builds, and it
  // is recorded on the lander session. Drop it and every short-link signup
  // silently gets the generic fallback line.
  const params = new URLSearchParams({ campaign: resolved.campaign });
  if (resolved.bucket) params.set('bucket', resolved.bucket);
  if (resolved.src) {
    params.set('src', resolved.src);
    params.set('utm_source', resolved.src);
  }
  // utm_medium is a constant for this route by construction: /e/:code only
  // ever appears inside an email body. utm_campaign mirrors the campaign, as
  // the legacy link did.
  params.set('utm_medium', 'email');
  params.set('utm_campaign', resolved.campaign);

  const email = req.query.email;
  if (typeof email === 'string' && email.length > 0) {
    params.set('email', email);
  }
  res.redirect(`${landerPath}?${params.toString()}`);
});
