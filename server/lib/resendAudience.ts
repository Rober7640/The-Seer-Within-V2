// Resend Audience contact sync — categorize leads by lander.
//
// Adds each lead as a Contact to a SINGLE Resend audience, stamped with a
// `lander` custom property ("homepage" / "fb" / "fb2" / "gdn" / "fb-palm" /
// "soulmate") so the team can build per-lander Segments and send Broadcasts.
//
// This is SEPARATE from the transactional drip emails (resend.emails.send),
// which keep running unchanged for all users. Audiences only power Broadcasts.
//
// On top of the audience sync, each contact is also added to a per-lander Resend
// SEGMENT (homepage/fb/fb2/gdn/fb-palm/soulmate) so the team can send a Broadcast
// targeted at a single lander. Segments in our Resend account are manual member
// groups (no property-based filtering), so membership has to be written here.
//
// SAFETY:
//  - Fully gated: the audience sync no-ops unless BOTH RESEND_API_KEY and
//    RESEND_AUDIENCE_ID are set; the segment add no-ops unless that lander's
//    RESEND_SEGMENT_ID_* var is set. Until configured this is a pure no-op, so
//    every funnel is byte-identical.
//  - Fire-and-forget: callers invoke without awaiting and .catch() the promise.
//    The segment add is also non-blocking and never throws. Neither blocks the
//    lead/purchase flow.
//
// SETUP (Resend dashboard, one-time): create the audience, copy its id into
// RESEND_AUDIENCE_ID, and define a `lander` (string) Contact Property so the
// property is accepted and segments can filter on it. Then create one segment
// per lander and set RESEND_SEGMENT_ID_HOMEPAGE/_FB/_FB2/_GDN/_FB_PALM/_SOULMATE.

import { Resend } from 'resend';
import logger from './logger';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Per-lander Resend segment id, read from env (mirrors the AWEBER_LIST_ID_*
// pattern). "fb-palm" maps to RESEND_SEGMENT_ID_FB_PALM. Unset → that lander
// skips the segment step, leaving behavior byte-identical to before.
function landerSegmentId(lander: string): string | undefined {
  const key = `RESEND_SEGMENT_ID_${lander.toUpperCase().replace(/-/g, '_')}`;
  return process.env[key];
}

// Add a contact to its lander's Resend segment so the team can target per-lander
// Broadcasts. Uses the raw REST endpoint (POST /segments/{id}/contacts { email }),
// which is idempotent and works for both brand-new and already-existing
// contacts — covering the "already in audience" case that contacts.create skips.
// The installed Resend SDK may predate contacts.segments.add(), so REST avoids
// any version risk. Fully gated + non-blocking: no-ops unless the lander's
// segment id is configured; .catch()es everything and never throws.
async function addContactToLanderSegment(
  email: string,
  lander: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = landerSegmentId(lander);
  if (!apiKey || !segmentId || !email) {
    // Not configured for this lander — silent no-op.
    return;
  }

  try {
    const response = await fetch(
      `https://api.resend.com/segments/${segmentId}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.warn('[ResendAudience] segment add failed (non-blocking)', {
        email,
        lander,
        segmentId,
        status: response.status,
        body,
      });
      return;
    }

    logger.info('[ResendAudience] contact added to segment', {
      email,
      lander,
      segmentId,
    });
  } catch (err) {
    logger.warn('[ResendAudience] segment add error (non-blocking)', {
      email,
      lander,
      err: err instanceof Error ? err.message : err,
    });
  }
}

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
      // Still ensure it is in its lander segment (idempotent, non-blocking).
      if (msg.includes('already') || msg.includes('exists')) {
        void addContactToLanderSegment(params.email, params.lander);
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
    // Add to its lander segment for per-lander Broadcasts (non-blocking).
    void addContactToLanderSegment(params.email, params.lander);
    return { success: true };
  } catch (err) {
    logger.warn('[ResendAudience] unexpected error (non-blocking)', {
      email: params.email,
      err: err instanceof Error ? err.message : err,
    });
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
