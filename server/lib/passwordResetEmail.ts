// Password reset email template.
// Sends a magic link to reset the user's password (1 hour expiry).

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

function buildResetHtml(firstName: string, resetUrl: string): string {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(resetUrl);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset your password</title>
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
            <p style="margin:0 0 16px;">We received a request to reset your password. Click the button below to choose a new password.</p>
            <p style="margin:0 0 16px;">This link will expire in <strong>1 hour</strong>.</p>
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
                    Reset Password
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
            <p style="margin:0;">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}

function buildResetText(firstName: string, resetUrl: string): string {
  return `The Seer Within
================

Dear ${firstName},

We received a request to reset your password. Visit the link below to choose a new password:

${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email. Your password will not be changed.`;
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${BASE_URL}/reset-password/${token}`;

  const html = buildResetHtml(firstName, resetUrl);
  const text = buildResetText(firstName, resetUrl);

  if (!resend) {
    logger.warn(`[Password Reset] Resend not configured. Reset URL for ${email}: ${resetUrl}`);
    return { success: true };
  }

  try {
    const result = await fireWithBreaker(resendBreaker, () =>
      resend!.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: email,
        subject: 'Reset your password - The Seer Within',
        html,
        text,
        tags: [
          { name: 'type', value: 'password_reset' },
        ],
      }),
    );

    if (result.error) {
      logger.error(`[Password Reset] Resend error for ${email}:`, result.error);
      return { success: false, error: result.error.message };
    }

    logger.info(`[Password Reset] Sent to ${email}, id: ${result.data?.id}`);
    return { success: true };
  } catch (error: any) {
    logger.error(`[Password Reset] Failed to send to ${email}:`, error);
    return { success: false, error: error?.message || 'Failed to send reset email' };
  }
}
