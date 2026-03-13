// Responsive HTML email template for follow-up and top-up emails.
// Design: white card on soft lavender background, gold accents, serif typography.

interface FollowUpHtmlParams {
  personaName: string;
  emailBody: string;      // HTML written by Claude Haiku
  ctaUrl: string;         // magic link URL
  ctaText?: string;       // defaults to "Return to {personaName}"
  unsubscribeUrl: string;
  privacyUrl: string;
  avatarUrl?: string;     // persona photo (circular)
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
    ctaText,
    unsubscribeUrl,
    privacyUrl,
    avatarUrl,
  } = params;

  const buttonLabel = ctaText || `Return to ${personaName}`;

  const avatarBlock = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(personaName)}"
         width="72" height="72"
         style="width:72px;height:72px;border-radius:50%;object-fit:cover;
                border:3px solid #c9a84c;display:block;margin:0 auto 14px;">`
    : `<div style="width:72px;height:72px;border-radius:50%;
                   background-color:#3b2d5e;
                   margin:0 auto 14px;line-height:72px;
                   font-size:28px;text-align:center;color:#e8d5a0;
                   border:3px solid #c9a84c;">&#9733;</div>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>A message from ${escapeHtml(personaName)}</title>
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

      <!-- Card -->
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
            ${avatarBlock}
            <p style="margin:0;font-size:21px;font-weight:normal;color:#1a1a2e;
                      font-family:Georgia,'Times New Roman',serif;letter-spacing:0.02em;">
              ${escapeHtml(personaName)}</p>
            <p style="margin:5px 0 0;font-size:11px;font-weight:normal;
                      color:#9a8866;text-transform:uppercase;letter-spacing:0.16em;
                      font-family:Helvetica,Arial,sans-serif;">
              The Seer Within
            </p>
          </td>
        </tr>

        <!-- Separator -->
        <tr>
          <td style="padding:0 40px;">
            <div style="border-bottom:1px solid #e8e3d8;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="body-cell"
              style="padding:28px 44px 32px;font-size:16px;line-height:1.8;color:#4a4a5a;
                     font-family:Georgia,'Times New Roman',serif;">
            ${emailBody}
          </td>
        </tr>

        <!-- CTA (bulletproof table-based button) -->
        <tr>
          <td align="center" class="cta-cell" style="padding:4px 44px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="background-color:#3b2d5e;border-radius:8px;">
                  <a href="${escapeHtml(ctaUrl)}"
                     style="display:inline-block;background-color:#3b2d5e;color:#ffffff;
                            text-decoration:none;font-size:14px;font-weight:bold;
                            padding:15px 36px;border-radius:8px;
                            letter-spacing:0.04em;
                            font-family:Helvetica,Arial,sans-serif;
                            mso-padding-alt:0;text-underline-color:#3b2d5e;">
                    <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt" hidden>&emsp;</i><span style="mso-text-raise:11pt;"><![endif]-->
                    ${escapeHtml(buttonLabel)}
                    <!--[if mso]></span><i style="mso-font-width:150%" hidden>&emsp;&#8203;</i><![endif]-->
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" class="footer-cell"
              style="padding:20px 32px 26px;border-top:1px solid #f0ece4;
                     font-size:12px;color:#b0a998;line-height:1.7;
                     font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0 0 6px;">
              <a href="${escapeHtml(unsubscribeUrl)}"
                 style="color:#9a8866;text-decoration:none;">Unsubscribe</a>
              <span style="margin:0 10px;color:#e0dbd2;">&middot;</span>
              <a href="${escapeHtml(privacyUrl)}"
                 style="color:#9a8866;text-decoration:none;">Privacy Policy</a>
            </p>
            <p style="margin:0;">&copy; The Seer Within</p>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td>
  </tr>
</table>

</body>
</html>`;
}

export function buildFollowUpText(params: FollowUpTextParams): string {
  const { personaName, emailBody, ctaUrl, unsubscribeUrl } = params;

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

  return `${personaName} — The Seer Within
${'─'.repeat(40)}

${plainBody}

─────────────────────────────────────
Return to ${personaName}: ${ctaUrl}

Unsubscribe: ${unsubscribeUrl}
© The Seer Within`;
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

  const avatarBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(personaName)}" width="72" height="72" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #c9a84c;display:block;margin:0 auto 14px;">`
    : `<div style="width:72px;height:72px;border-radius:50%;background-color:#3b2d5e;margin:0 auto 14px;line-height:72px;font-size:28px;text-align:center;color:#e8d5a0;border:3px solid #c9a84c;">&#9733;</div>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your session with ${escapeHtml(personaName)} has ended</title>
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
            ${avatarBlock}
            <p style="margin:0;font-size:21px;font-weight:normal;color:#1a1a2e;
                      font-family:Georgia,'Times New Roman',serif;letter-spacing:0.02em;">
              ${escapeHtml(personaName)}</p>
            <p style="margin:5px 0 0;font-size:11px;font-weight:normal;
                      color:#9a8866;text-transform:uppercase;letter-spacing:0.16em;
                      font-family:Helvetica,Arial,sans-serif;">
              The Seer Within
            </p>
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
          <td class="body-cell" style="padding:28px 44px 32px;font-size:16px;line-height:1.8;color:#4a4a5a;
                     font-family:Georgia,'Times New Roman',serif;">
            <p style="margin:0 0 16px;color:#1a1a2e;">Dear ${escapeHtml(userName)},</p>
            <p style="margin:0 0 16px;">Your session with ${escapeHtml(personaName)} has ended due to inactivity. Here is a summary of what we discussed:</p>
            <div style="background-color:#f8f6f1;border-left:3px solid #c9a84c;padding:16px 20px;margin:16px 0;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;color:#4a4a5a;">
              ${summaryHtml}
            </div>
            <p style="font-size:13px;color:#b0a998;margin-top:12px;">Session duration: ${minutesUsed} minute${minutesUsed !== 1 ? 's' : ''}</p>
            <p style="margin:16px 0 0;color:#4a4a5a;">Whenever you are ready to continue your journey, ${escapeHtml(personaName)} will be here for you.</p>
          </td>
        </tr>

        <!-- CTA (bulletproof table-based button) -->
        <tr>
          <td align="center" class="cta-cell" style="padding:0 44px 40px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="background-color:#3b2d5e;border-radius:8px;">
                  <a href="${escapeHtml(ctaUrl)}"
                     style="display:inline-block;background-color:#3b2d5e;color:#ffffff;
                            text-decoration:none;font-size:14px;font-weight:bold;
                            padding:15px 36px;border-radius:8px;
                            letter-spacing:0.04em;
                            font-family:Helvetica,Arial,sans-serif;
                            mso-padding-alt:0;text-underline-color:#3b2d5e;">
                    <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt" hidden>&emsp;</i><span style="mso-text-raise:11pt;"><![endif]-->
                    Start a New Session
                    <!--[if mso]></span><i style="mso-font-width:150%" hidden>&emsp;&#8203;</i><![endif]-->
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" class="footer-cell"
              style="padding:20px 32px 26px;border-top:1px solid #f0ece4;
                     font-size:12px;color:#b0a998;line-height:1.7;
                     font-family:Helvetica,Arial,sans-serif;">
            <p style="margin:0;">This is an automated notification from your session.</p>
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
