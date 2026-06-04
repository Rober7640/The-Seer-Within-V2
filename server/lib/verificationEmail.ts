// Email verification template for new user registration.
// Sends a magic link that verifies the email and grants free credits.

import { Resend } from 'resend';
import logger from './logger';
import { fireWithBreaker, resendBreaker } from './circuitBreaker';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FOLLOW_UP_FROM_EMAIL || 'noreply@theseerwithin.com';
const FROM_NAME = process.env.FOLLOW_UP_FROM_NAME || 'The Seer Within';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Free-minutes grant shown in verification copy. Kept in sync with the actual
// coin grant in server/routes/auth.ts (DEFAULT_FREE_COINS / EVELYN_LANDER_FREE_COINS
// / personas.freeCoins). Mirrors the same eligibility branches:
//   - 6/6 promo signup (source=promo-6-6): 6 min — the campaign's "6 free minutes with
//     every guide". These are the promo coins already granted on /6-6 (verifying still
//     adds the usual trial coins on top, so the email never over-promises). Checked first
//     so a /6-6 signup on any guide (incl. Aiden) shows 6, not the per-persona default.
//   - /evelyn lander signup (source=evelyn-lander, persona=evelyn-cross): 5 min
//   - aiden-powers persona: 10 min
//   - everyone else: 3 min default
// If the auth.ts grant logic changes, update this helper too — they must stay
// in lockstep so the email never over- or under-promises.
export function getFreeMinutesForSignup(persona?: string, source?: string): number {
  if (source === 'promo-6-6') return 6;
  if (source === 'evelyn-lander' && persona === 'evelyn-cross') return 5;
  if (source === 'soulmate-lander' && persona === 'evelyn-cross') return 5;
  if (persona === 'aiden-powers') return 10;
  return 3;
}

function buildVerificationHtml(firstName: string, verifyUrl: string, freeMinutes: number): string {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(verifyUrl);

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
            <p style="margin:0 0 16px;">Welcome to The Seer Within. To complete your registration and receive your <strong>${freeMinutes} free minutes</strong> of spiritual guidance, please verify your email address.</p>
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

function buildVerificationText(firstName: string, verifyUrl: string, freeMinutes: number): string {
  return `The Seer Within
================

Dear ${firstName},

Welcome to The Seer Within. To complete your registration and receive your ${freeMinutes} free minutes of spiritual guidance, please verify your email address by visiting:

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
): Promise<{ success: boolean; error?: string }> {
  const personaQuery = persona ? `?persona=${encodeURIComponent(persona)}` : '';
  const verifyUrl = `${BASE_URL}/verify-email/${token}${personaQuery}`;
  const freeMinutes = getFreeMinutesForSignup(persona, source);

  const html = buildVerificationHtml(firstName, verifyUrl, freeMinutes);
  const text = buildVerificationText(firstName, verifyUrl, freeMinutes);

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
