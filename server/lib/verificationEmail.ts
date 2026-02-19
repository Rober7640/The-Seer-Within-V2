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
  <title>Verify your email</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; background-color: #0f0a1a; color: #e8e0f0; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #1a1128; }
    @media screen and (max-width: 600px) { .email-container { width: 100% !important; } }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0a1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0a1a;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="background-color: #1a1128; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding: 30px 20px 20px; background: linear-gradient(180deg, #1a0a2e 0%, #1a1128 100%);">
              <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4A148C); margin: 0 auto 10px; font-size: 32px; color: #fff; line-height: 80px;">&starf;</div>
              <div style="font-size: 24px; color: #c4a0ff; margin: 10px 0 0; font-weight: normal; letter-spacing: 1px;">The Seer Within</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 20px 30px; line-height: 1.7; font-size: 16px; color: #e8e0f0;">
              <p style="margin: 0 0 16px;">Dear ${safeName},</p>
              <p style="margin: 0 0 16px;">Welcome to The Seer Within. To complete your registration and receive your <strong>3 free minutes</strong> of spiritual guidance, please verify your email address.</p>
              <p style="margin: 0 0 16px;">This link will expire in 24 hours.</p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="text-align: center; padding: 10px 20px 30px;">
              <a href="${safeUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4A148C 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">Verify My Email</a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding: 0 30px 20px; font-size: 12px; color: #8a7aa0; line-height: 1.6;">
              <p style="margin: 0;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin: 4px 0 0; word-break: break-all;"><a href="${safeUrl}" style="color: #c4a0ff; text-decoration: underline;">${safeUrl}</a></p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td>
              <hr style="border: none; border-top: 1px solid #2d1f4e; margin: 0 30px;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; padding: 20px 30px; font-size: 12px; color: #8a7aa0; line-height: 1.6;">
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
  const verifyUrl = `${BASE_URL}/api/auth/verify-email/${token}`;

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
