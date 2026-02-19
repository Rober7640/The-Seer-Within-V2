// Responsive HTML email template for follow-up emails.

interface FollowUpHtmlParams {
  personaName: string;
  emailBody: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
  companyAddress: string;
  privacyUrl: string;
  logoUrl?: string;
}

interface FollowUpTextParams {
  personaName: string;
  emailBody: string;
  ctaUrl: string;
  unsubscribeUrl: string;
}

export function buildFollowUpHtml(params: FollowUpHtmlParams): string {
  const {
    personaName,
    emailBody,
    ctaUrl,
    unsubscribeUrl,
    preferencesUrl,
    companyAddress,
    privacyUrl,
    logoUrl,
  } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>A message from ${escapeHtml(personaName)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* Base styles */
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background-color: #0f0a1a;
      color: #e8e0f0;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1a1128;
    }

    .header {
      text-align: center;
      padding: 30px 20px 20px;
      background: linear-gradient(180deg, #1a0a2e 0%, #1a1128 100%);
    }

    .header-title {
      font-size: 24px;
      color: #c4a0ff;
      margin: 10px 0 0;
      font-weight: normal;
      letter-spacing: 1px;
    }

    .content {
      padding: 20px 30px;
      line-height: 1.7;
      font-size: 16px;
      color: #e8e0f0;
    }

    .content p {
      margin: 0 0 16px;
    }

    .cta-section {
      text-align: center;
      padding: 10px 20px 30px;
    }

    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #4A148C 100%);
      color: #ffffff !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 6px;
      font-size: 16px;
      font-family: Georgia, 'Times New Roman', serif;
      font-weight: bold;
      letter-spacing: 0.5px;
    }

    .divider {
      border: none;
      border-top: 1px solid #2d1f4e;
      margin: 0 30px;
    }

    .footer {
      text-align: center;
      padding: 20px 30px;
      font-size: 12px;
      color: #8a7aa0;
      line-height: 1.6;
    }

    .footer a {
      color: #c4a0ff;
      text-decoration: underline;
    }

    .footer-links {
      margin-bottom: 12px;
    }

    .footer-links a {
      margin: 0 8px;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #1a1128 !important;
      }
    }

    /* Mobile responsive */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 20px !important;
      }
      .header {
        padding: 20px 15px 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0a1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0a1a;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="background-color: #1a1128; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td class="header" style="text-align: center; padding: 30px 20px 20px; background: linear-gradient(180deg, #1a0a2e 0%, #1a1128 100%);">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(personaName)}" width="80" style="border-radius: 50%; margin-bottom: 10px;">` : `<div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4A148C); margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff;">&starf;</div>`}
              <div class="header-title" style="font-size: 24px; color: #c4a0ff; margin: 10px 0 0; font-weight: normal; letter-spacing: 1px;">${escapeHtml(personaName)}</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content" style="padding: 20px 30px; line-height: 1.7; font-size: 16px; color: #e8e0f0;">
              ${emailBody}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="cta-section" style="text-align: center; padding: 10px 20px 30px;">
              <a href="${escapeHtml(ctaUrl)}" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4A148C 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">Continue Your Journey</a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td>
              <hr class="divider" style="border: none; border-top: 1px solid #2d1f4e; margin: 0 30px;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="text-align: center; padding: 20px 30px; font-size: 12px; color: #8a7aa0; line-height: 1.6;">
              <div class="footer-links" style="margin-bottom: 12px;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #c4a0ff; text-decoration: underline;">Unsubscribe</a>
                <span style="color: #4a3a6a;"> | </span>
                <a href="${escapeHtml(preferencesUrl)}" style="color: #c4a0ff; text-decoration: underline;">Email Preferences</a>
                <span style="color: #4a3a6a;"> | </span>
                <a href="${escapeHtml(privacyUrl)}" style="color: #c4a0ff; text-decoration: underline;">Privacy Policy</a>
              </div>
              <p style="margin: 0; color: #6a5a8a;">${escapeHtml(companyAddress)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildFollowUpText(params: FollowUpTextParams): string {
  const { personaName, emailBody, ctaUrl, unsubscribeUrl } = params;

  // Strip HTML tags from emailBody for plain text
  const plainBody = emailBody
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return `${personaName}
${'='.repeat(personaName.length)}

${plainBody}

Continue Your Journey: ${ctaUrl}

---
To unsubscribe from these emails: ${unsubscribeUrl}`;
}

// ============================================================
// Session Timeout Email Templates
// ============================================================

interface SessionTimeoutHtmlParams {
  personaName: string;
  userName: string;
  sessionSummary: string;
  minutesUsed: number;
  ctaUrl: string;
  logoUrl?: string;
}

export function buildSessionTimeoutHtml(params: SessionTimeoutHtmlParams): string {
  const { personaName, userName, sessionSummary, minutesUsed, ctaUrl, logoUrl } = params;

  const summaryHtml = escapeHtml(sessionSummary)
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your session with ${escapeHtml(personaName)} has ended</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; background-color: #0f0a1a; color: #e8e0f0; margin: 0; padding: 0; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #1a1128; border-radius: 8px; overflow: hidden; }
    .header { text-align: center; padding: 30px 20px 20px; background: linear-gradient(180deg, #1a0a2e 0%, #1a1128 100%); }
    .header-title { font-size: 24px; color: #c4a0ff; margin: 10px 0 0; font-weight: normal; letter-spacing: 1px; }
    .content { padding: 20px 30px; line-height: 1.7; font-size: 16px; color: #e8e0f0; }
    .summary-box { background-color: #251a3a; border-left: 3px solid #7c3aed; padding: 16px 20px; margin: 16px 0; border-radius: 0 6px 6px 0; font-size: 14px; line-height: 1.6; }
    .meta { font-size: 13px; color: #8a7aa0; margin-top: 12px; }
    .cta-section { text-align: center; padding: 10px 20px 30px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4A148C 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
    .footer { text-align: center; padding: 20px 30px; font-size: 12px; color: #8a7aa0; line-height: 1.6; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0a1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0a1a;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="background-color: #1a1128; border-radius: 8px; overflow: hidden;">
          <tr>
            <td class="header" style="text-align: center; padding: 30px 20px 20px; background: linear-gradient(180deg, #1a0a2e 0%, #1a1128 100%);">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(personaName)}" width="80" style="border-radius: 50%; margin-bottom: 10px;">` : `<div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #4A148C); margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff;">&starf;</div>`}
              <div class="header-title" style="font-size: 24px; color: #c4a0ff; margin: 10px 0 0;">${escapeHtml(personaName)}</div>
            </td>
          </tr>
          <tr>
            <td class="content" style="padding: 20px 30px; line-height: 1.7; font-size: 16px; color: #e8e0f0;">
              <p style="margin: 0 0 16px;">Dear ${escapeHtml(userName)},</p>
              <p style="margin: 0 0 16px;">Your session with ${escapeHtml(personaName)} has ended due to inactivity. Here is a summary of what we discussed:</p>
              <div class="summary-box" style="background-color: #251a3a; border-left: 3px solid #7c3aed; padding: 16px 20px; margin: 16px 0; border-radius: 0 6px 6px 0; font-size: 14px; line-height: 1.6;">
                ${summaryHtml}
              </div>
              <p class="meta" style="font-size: 13px; color: #8a7aa0; margin-top: 12px;">Session duration: ${minutesUsed} minute${minutesUsed !== 1 ? 's' : ''}</p>
              <p style="margin: 16px 0 0;">Whenever you are ready to continue your journey, ${escapeHtml(personaName)} will be here for you.</p>
            </td>
          </tr>
          <tr>
            <td class="cta-section" style="text-align: center; padding: 10px 20px 30px;">
              <a href="${escapeHtml(ctaUrl)}" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4A148C 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">Start a New Session</a>
            </td>
          </tr>
          <tr>
            <td class="footer" style="text-align: center; padding: 20px 30px; font-size: 12px; color: #8a7aa0;">
              <p style="margin: 0;">This is an automated notification from your session.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildSessionTimeoutText(params: SessionTimeoutHtmlParams): string {
  const { personaName, userName, sessionSummary, minutesUsed, ctaUrl } = params;

  return `Dear ${userName},

Your session with ${personaName} has ended due to inactivity.

Here is a summary of what we discussed:

${sessionSummary}

Session duration: ${minutesUsed} minute${minutesUsed !== 1 ? 's' : ''}

Whenever you are ready to continue your journey, ${personaName} will be here for you.

Start a New Session: ${ctaUrl}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
