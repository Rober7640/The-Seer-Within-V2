// Responsive HTML email template for follow-up emails.
// Design: light and clean — white card on soft lavender background.

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
                border:3px solid #ede9fe;display:block;margin:0 auto 12px;">`
    : `<div style="width:72px;height:72px;border-radius:50%;
                   background:linear-gradient(135deg,#7c3aed,#4f46e5);
                   margin:0 auto 12px;line-height:72px;
                   font-size:28px;text-align:center;color:#fff;">✦</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>A message from ${escapeHtml(personaName)}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{border:0;height:auto;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    table{border-collapse:collapse!important}
    body{height:100%!important;margin:0!important;padding:0!important;width:100%!important;
         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
         background-color:#f5f3ff}
    @media screen and (max-width:600px){
      .card{width:100%!important;border-radius:0!important}
      .body-cell{padding:28px 20px!important}
      .cta-btn{display:block!important;text-align:center!important}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f5f3ff;">

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
       style="background-color:#f5f3ff;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0"
             width="560" class="card"
             style="background:#ffffff;border-radius:16px;
                    box-shadow:0 1px 4px rgba(109,40,217,.08),0 4px 24px rgba(0,0,0,.06);
                    overflow:hidden;">

        <!-- ── Header ── -->
        <tr>
          <td align="center" style="padding:36px 32px 24px;border-bottom:1px solid #f3f4f6;">
            ${avatarBlock}
            <p style="margin:0;font-size:18px;font-weight:600;color:#111827;
                      letter-spacing:-0.01em;">${escapeHtml(personaName)}</p>
            <p style="margin:4px 0 0;font-size:12px;font-weight:500;
                      color:#8b5cf6;text-transform:uppercase;letter-spacing:0.08em;">
              The Seer Within
            </p>
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td class="body-cell"
              style="padding:32px 40px;font-size:16px;line-height:1.75;color:#374151;">
            ${emailBody}
          </td>
        </tr>

        <!-- ── CTA ── -->
        <tr>
          <td align="center" style="padding:0 40px 36px;">
            <a href="${escapeHtml(ctaUrl)}"
               class="cta-btn"
               style="display:inline-block;background:#6d28d9;color:#ffffff!important;
                      text-decoration:none;font-size:15px;font-weight:600;
                      padding:14px 32px;border-radius:10px;
                      letter-spacing:0.01em;
                      box-shadow:0 2px 8px rgba(109,40,217,.35);">
              ${escapeHtml(buttonLabel)}
            </a>
          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td align="center"
              style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;
                     font-size:12px;color:#9ca3af;line-height:1.6;">
            <p style="margin:0 0 8px;">
              <a href="${escapeHtml(unsubscribeUrl)}"
                 style="color:#8b5cf6;text-decoration:none;">Unsubscribe</a>
              <span style="margin:0 8px;color:#d1d5db;">·</span>
              <a href="${escapeHtml(privacyUrl)}"
                 style="color:#8b5cf6;text-decoration:none;">Privacy Policy</a>
            </p>
            <p style="margin:0;">© The Seer Within</p>
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
