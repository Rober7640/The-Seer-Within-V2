// Email verification template for new user registration.
// Sends a magic link that verifies the email and grants free credits.

import { Resend } from 'resend';
import { randomUUID } from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import { users, personas } from '@shared/schema';
import logger from './logger';
import { fireWithBreaker, resendBreaker } from './circuitBreaker';
import { LIVE_THREAD_FREE_MINUTES } from './liveThreadEngagement';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com';
const FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'The Seer Within';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// How long a freshly-minted verification token stays clickable. Security-relevant:
// shortening this window must take effect everywhere at once, so this is the single
// definition — auth.ts and soulmateLanderSignup.ts import it rather than keeping
// their own copies (they each had one before, which is exactly the drift risk).
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

/**
 * Minimal HTML entity escape for values interpolated into email bodies. Exported
 * so other senders that interpolate user-controlled fields (names) can reuse it
 * rather than each shipping an unescaped template.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Free-minutes grant shown in verification copy. Kept in sync with the actual
// coin grant in server/routes/auth.ts (DEFAULT_FREE_COINS / EVELYN_LANDER_FREE_COINS
// / LIVE_THREAD_FREE_COINS / personas.freeCoins). Mirrors the same eligibility branches:
//   - 7/7 promo signup (source=promo-7-7): 7 min — the campaign's "7 free minutes with
//     every guide". These are the promo coins already granted on /7-7 (verifying still
//     adds the usual trial coins on top, so the email never over-promises). Checked first
//     so a /7-7 signup on any guide (incl. Aiden) shows 7, not the per-persona default.
//   - /evelyn lander signup (source=evelyn-lander, persona=evelyn-cross): 5 min,
//     or LIVE_THREAD_FREE_MINUTES when the reader engaged with the Live Thread
//     (see engagedViaLiveThread below)
//   - aiden-powers persona: 10 min
//   - everyone else: 3 min default
// If the auth.ts grant logic changes, update this helper too — they must stay
// in lockstep so the email never over- or under-promises.
//
// `engagedViaLiveThread` deliberately REFINES the evelyn-lander branch rather than
// preceding every branch. It is not a global override: it is only ever true for an
// Evelyn-lander signup, and the Evelyn-lander branch is the only one whose grant it
// changes (auth.ts's grant chain resolves LIVE_THREAD_FREE_COINS only when
// isEvelynUser() also holds). Hoisting it above `promo-7-7` would quote 10 to a 7/7
// signup that will still receive 7 — the exact over-promise this helper exists to
// prevent. Callers must derive it server-side (liveThreadEngagement.ts); it must
// never be taken from a request body, or anyone could ask for the larger number.
export function getFreeMinutesForSignup(
  persona?: string,
  source?: string,
  engagedViaLiveThread: boolean = false,
): number {
  if (source === 'promo-7-7') return 7;
  if (source === 'evelyn-lander' && persona === 'evelyn-cross') {
    return engagedViaLiveThread ? LIVE_THREAD_FREE_MINUTES : 5;
  }
  if (source === 'soulmate-lander' && persona === 'evelyn-cross') return 5;
  if (persona === 'aiden-powers') return 10;
  return 3;
}

function buildVerificationHtml(firstName: string, verifyUrl: string, freeMinutes: number, minutesAlreadyGranted: boolean): string {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(verifyUrl);
  // When the free minutes were granted at registration (Task 1.1), don't tell the
  // user they must verify to "receive" them — they already have them. Verification
  // then only secures the account. Otherwise keep the original grant-on-verify copy.
  const introHtml = minutesAlreadyGranted
    ? `Welcome to The Seer Within. Your <strong>${freeMinutes} free minutes</strong> of spiritual guidance are already waiting in your account. Verify your email to keep access and secure your account.`
    : `Welcome to The Seer Within. To complete your registration and receive your <strong>${freeMinutes} free minutes</strong> of spiritual guidance, please verify your email address.`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify your email</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <style>
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    table{border-collapse:collapse!important}
    body{height:100%!important;margin:0!important;padding:0!important;width:100%!important}
    @media screen and (max-width:600px){
      .card{width:100%!important;border-radius:0!important}
      .body-cell{padding:28px 22px!important}
      .header-cell{padding:32px 22px 20px!important}
      .cta-cell{padding:0 22px 32px!important}
      .footer-cell{padding:18px 22px 24px!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0edf8;font-family:Georgia,'Times New Roman',serif;">

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
       style="background-color:#f0edf8;">
  <tr>
    <td align="center" style="padding:36px 16px;">

      <table role="presentation" cellspacing="0" cellpadding="0" border="0"
             width="560" class="card"
             style="background-color:#ffffff;border-radius:14px;overflow:hidden;
                    box-shadow:0 1px 4px rgba(0,0,0,.06),0 4px 20px rgba(0,0,0,.04);">

        <!-- Gold accent line -->
        <tr>
          <td style="height:3px;background-color:#c9a84c;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td align="center" class="header-cell" style="padding:36px 32px 24px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="padding:3px;border-radius:50%;background-color:#c9a84c;">
                  <div style="width:72px;height:72px;border-radius:50%;
                              background-color:#3b2d5e;
                              line-height:72px;font-size:28px;text-align:center;color:#e8d5a0;">&#9733;</div>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0;font-size:21px;font-weight:normal;color:#1a1a2e;
                      font-family:Georgia,'Times New Roman',serif;letter-spacing:0.02em;">
              The Seer Within</p>
          </td>
        </tr>

        <!-- Separator -->
        <tr>
          <td style="padding:0 40px;">
            <div style="border-bottom:1px solid #e8e3d8;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td class="body-cell"
              style="padding:28px 44px 32px;font-size:16px;line-height:1.8;color:#4a4a5a;
                     font-family:Georgia,'Times New Roman',serif;">
            <p style="margin:0 0 16px;color:#1a1a2e;">Dear ${safeName},</p>
            <p style="margin:0 0 16px;">${introHtml}</p>
            <p style="margin:0 0 16px;">This link will expire in 24 hours.</p>
          </td>
        </tr>

        <!-- CTA (bulletproof table-based button) -->
        <tr>
          <td align="center" class="cta-cell" style="padding:4px 44px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="background-color:#3b2d5e;border-radius:8px;">
                  <a href="${safeUrl}"
                     style="display:inline-block;background-color:#3b2d5e;color:#ffffff;
                            text-decoration:none;font-size:14px;font-weight:bold;
                            padding:15px 36px;border-radius:8px;
                            letter-spacing:0.04em;
                            font-family:Helvetica,Arial,sans-serif;
                            mso-padding-alt:0;text-underline-color:#3b2d5e;">
                    <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt" hidden>&emsp;</i><span style="mso-text-raise:11pt;"><![endif]-->
                    Verify My Email
                    <!--[if mso]></span><i style="mso-font-width:150%" hidden>&emsp;&#8203;</i><![endif]-->
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Fallback link -->
        <tr>
          <td style="padding:0 44px 24px;font-size:12px;color:#b0a998;line-height:1.6;
                     font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0;">If the button doesn&rsquo;t work, copy and paste this link into your browser:</p>
            <p style="margin:4px 0 0;word-break:break-all;"><a href="${safeUrl}" style="color:#9a8866;text-decoration:underline;">${safeUrl}</a></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" class="footer-cell"
              style="padding:20px 32px 26px;border-top:1px solid #f0ece4;
                     font-size:12px;color:#b0a998;line-height:1.7;
                     font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0;">If you did not create an account, you can safely ignore this email.</p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}

function buildVerificationText(firstName: string, verifyUrl: string, freeMinutes: number, minutesAlreadyGranted: boolean): string {
  const intro = minutesAlreadyGranted
    ? `Welcome to The Seer Within. Your ${freeMinutes} free minutes of spiritual guidance are already waiting in your account. Verify your email to keep access and secure your account by visiting:`
    : `Welcome to The Seer Within. To complete your registration and receive your ${freeMinutes} free minutes of spiritual guidance, please verify your email address by visiting:`;
  return `The Seer Within
================

Dear ${firstName},

${intro}

${verifyUrl}

This link will expire in 24 hours.

If you did not create an account, you can safely ignore this email.`;
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string,
  persona?: string,
  source?: string,
  // Task 1.1 — true when the free minutes were already granted at registration
  // (Evelyn lander + ENABLE_FREE_MINS_AT_REGISTRATION). Switches the copy from
  // "verify to receive your minutes" to "your minutes are waiting — verify to keep access".
  minutesAlreadyGranted: boolean = false,
  // True when the reader typed into the Live Thread before signing up, which earns
  // them the larger grant. Derived server-side by the caller (liveThreadEngagement.ts)
  // — never read off a request body.
  engagedViaLiveThread: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  const personaQuery = persona ? `?persona=${encodeURIComponent(persona)}` : '';
  const verifyUrl = `${BASE_URL}/verify-email/${token}${personaQuery}`;
  const freeMinutes = getFreeMinutesForSignup(persona, source, engagedViaLiveThread);

  const html = buildVerificationHtml(firstName, verifyUrl, freeMinutes, minutesAlreadyGranted);
  const text = buildVerificationText(firstName, verifyUrl, freeMinutes, minutesAlreadyGranted);

  if (!resend) {
    logger.warn(`[Email Verification] Resend not configured. Verification URL for ${email}: ${verifyUrl}`);
    return { success: true };
  }

  try {
    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: email,
        subject: 'Verify your email - The Seer Within',
        html,
        text,
        tags: [
          { name: 'type', value: 'email_verification' },
        ],
      }),
    );

    if (result.error) {
      logger.error(`[Email Verification] Resend error for ${email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    logger.info(`[Email Verification] Sent to ${email}, id: ${result.data?.id}`);
    return { success: true };
  } catch (error: any) {
    logger.error(`[Email Verification] Failed to send to ${email}:`, error);
    return { success: false, error: error?.message || 'Failed to send verification email' };
  }
}

/** The subset of a `users` row reissueVerificationEmail() needs. A full row satisfies it. */
export interface ReissueVerificationUser {
  id: string;
  email: string;
  firstName: string;
  defaultPersonaId: string | null;
  welcomeCoinsGrantedAt: Date | null;
}

/**
 * Reissue an existing UNVERIFIED account's verification email: mint a fresh token,
 * stamp it (and its expiry) on the user row, resolve the persona context, and send.
 *
 * Extracted verbatim from POST /api/auth/resend-verification (auth.ts:877-904) so
 * VERIFICATION_TOKEN_EXPIRY_HOURS and the NOW() + INTERVAL expression have exactly
 * one definition. Callers: that route, and the Evelyn lander's /check-email
 * unverified_match branch.
 *
 * The caller decides nothing about the token — only the two optional overrides:
 *   personaSlug — takes priority over the user's defaultPersonaId. Preserves persona
 *                 context on the resent link; without it the verify-email redirect
 *                 loses the persona query and lands the user on /login instead of
 *                 the persona-specific chat.
 *   source      — funnel tag; only affects the free-minutes number the copy quotes
 *                 (getFreeMinutesForSignup above). Omit it unless the caller knows
 *                 the reader is genuinely eligible for that funnel's grant, or the
 *                 email will over-promise.
 *   engagedViaLiveThread
 *               — same contract as `source`, one tier up: only pass it when the
 *                 caller has established server-side (liveThreadEngagement.ts) that
 *                 this reader will genuinely receive the Live Thread grant. It has
 *                 no effect without source='evelyn-lander' and an Evelyn persona,
 *                 mirroring the grant chain.
 */
export async function reissueVerificationEmail(
  user: ReissueVerificationUser,
  opts: { personaSlug?: string; source?: string; engagedViaLiveThread?: boolean } = {},
): Promise<{ personaSlug?: string; freeMinutesQuoted: number }> {
  // Generate new token
  const verificationToken = randomUUID();

  await db.update(users)
    .set({
      verificationToken,
      verificationTokenExpiry: sql`NOW() + INTERVAL '${sql.raw(String(VERIFICATION_TOKEN_EXPIRY_HOURS))} hours'`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(users.id, user.id));

  // Priority: explicit override > user's defaultPersonaId.
  let personaSlug: string | undefined = opts.personaSlug;
  if (!personaSlug && user.defaultPersonaId) {
    const personaRow = await db.select({ slug: personas.slug })
      .from(personas)
      .where(eq(personas.id, user.defaultPersonaId))
      .limit(1);
    personaSlug = personaRow[0]?.slug;
  }

  // If the welcome minutes were already granted (at registration, Task 1.1), the
  // resent email says "your minutes are waiting — verify to keep access" rather than
  // "verify to receive them". Uses the actual grant marker, so it's accurate regardless
  // of the flag's current state.
  await sendVerificationEmail(
    user.email,
    user.firstName,
    verificationToken,
    personaSlug,
    opts.source,
    user.welcomeCoinsGrantedAt != null,
    opts.engagedViaLiveThread ?? false,
  );

  // Report back the number the copy actually quoted (same inputs sendVerificationEmail
  // resolves it from). Callers that decide `source` conditionally need this to log —
  // and to assert — that the quote matches the grant the reader will really receive.
  return {
    personaSlug,
    freeMinutesQuoted: getFreeMinutesForSignup(
      personaSlug,
      opts.source,
      opts.engagedViaLiveThread ?? false,
    ),
  };
}
