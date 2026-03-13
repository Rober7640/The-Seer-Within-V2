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

function buildVerificationHtml(firstName: string, verifyUrl: string): string {
  const safeName = escapeHtml(firstName);
  const safeUrl = escapeHtml(verifyUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify your email</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    table{border-collapse:collapse!important}
    body{height:100%!important;margin:0!important;padding:0!important;width:100%!important;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         background-color:#f5f3ff}
    @media screen and (max-width:600px){
      .card{width:100%!important;border-radius:0!important}
      .body-cell{padding:28px 20px!important}
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3ff;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f3ff;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" class="card" style="background: #ffffff; border-radius: 16px; box-shadow: 0 1px 4px rgba(109,40,217,.08), 0 4px 24px rgba(0,0,0,.06); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 36px 32px 24px; border-bottom: 1px solid #f3f4f6;">
              <div style="width: 72px; height: 72px; border-radius: 50%; background-color: #6d28d9; margin: 0 auto 12px; line-height: 72px; font-size: 28px; text-align: center; color: #ffffff;">&#9733;</div>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827; letter-spacing: -0.01em;">The Seer Within</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="body-cell" style="padding: 32px 40px; font-size: 16px; line-height: 1.75; color: #374151;">
              <p style="margin: 0 0 16px;">Dear ${safeName},</p>
              <p style="margin: 0 0 16px;">Welcome to The Seer Within. To complete your registration and receive your <strong>3 free minutes</strong> of spiritual guidance, please verify your email address.</p>
              <p style="margin: 0 0 16px;">This link will expire in 24 hours.</p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 0 40px 36px;">
              <a href="${safeUrl}" style="display: inline-block; background: #6d28d9; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.01em; box-shadow: 0 2px 8px rgba(109,40,217,.35);">Verify My Email</a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding: 0 40px 24px; font-size: 12px; color: #9ca3af; line-height: 1.6;">
              <p style="margin: 0;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 4px 0 0; word-break: break-all;"><a href="${safeUrl}" style="color: #8b5cf6; text-decoration: underline;">${safeUrl}</a></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 32px 28px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; line-height: 1.6;">
              <p style="margin: 0;">If you did not create an account, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildVerificationText(firstName: string, verifyUrl: string): string {
  return `The Seer Within
================

Dear ${firstName},

Welcome to The Seer Within. To complete your registration and receive your 3 free minutes of spiritual guidance, please verify your email address by visiting:

${verifyUrl}

This link will expire in 24 hours.

If you did not create an account, you can safely ignore this email.`;
}

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${BASE_URL}/verify-email/${token}`;

  const html = buildVerificationHtml(firstName, verifyUrl);
  const text = buildVerificationText(firstName, verifyUrl);

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
