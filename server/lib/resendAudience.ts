// Resend Audience contact sync — categorize leads by lander.
//
// Adds each lead as a Contact to a SINGLE Resend audience, stamped with a
// `lander` custom property ("homepage" / "fb" / "fb2" / "gdn" / "fb-palm" /
// "soulmate") so the team can build per-lander Segments and send Broadcasts.
//
// This is SEPARATE from the transactional drip emails (resend.emails.send),
// which keep running unchanged for all users. Audiences only power Broadcasts.
//
// SAFETY:
//  - Fully gated: no-ops unless BOTH RESEND_API_KEY and RESEND_AUDIENCE_ID are
//    set. Until then this is a pure no-op, so every funnel is byte-identical.
//  - Fire-and-forget: callers invoke without awaiting and .catch() the promise.
//    Never throws to the caller and never blocks the lead/purchase flow.
//
// SETUP (Resend dashboard, one-time): create the audience, copy its id into
// RESEND_AUDIENCE_ID, and define a `lander` (string) Contact Property so the
// property is accepted and segments can filter on it.

import { Resend } from 'resend';
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface AddAudienceContactParams {
  email: string;
  firstName?: string;
  lastName?: string;
  // Lander category used for Resend segmentation.
  lander: string;
}

export async function addContactToResendAudience(
  params: AddAudienceContactParams,
): Promise<{ success: boolean; error?: string }> {
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!resend || !audienceId) {
    // Not configured — silent no-op so behavior is unchanged.
    return { success: false, error: 'Resend audience not configured' };
  }
  if (!params.email) {
    return { success: false, error: 'No email provided' };
  }

  try {
    const { error } = await resend.contacts.create({
      audienceId,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      unsubscribed: false,
      properties: { lander: params.lander },
    });

    if (error) {
      const msg = (error.message || '').toLowerCase();
      // A contact already in the audience is not a failure for our purposes.
      if (msg.includes('already') || msg.includes('exists')) {
        return { success: true };
      }
      logger.warn('[ResendAudience] contact create failed (non-blocking)', {
        email: params.email,
        lander: params.lander,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    logger.info('[ResendAudience] contact added', {
      email: params.email,
      lander: params.lander,
    });
    return { success: true };
  } catch (err) {
    logger.warn('[ResendAudience] unexpected error (non-blocking)', {
      email: params.email,
      err: err instanceof Error ? err.message : err,
    });
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
