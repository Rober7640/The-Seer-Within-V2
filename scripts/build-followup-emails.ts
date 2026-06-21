// Build Luna follow-up sequence emails 2–4 (Luna's voice, same shell as email 1),
// write them to outbox, and add each to the "Luna Voss — Follow-up" sequence (2800896)
// as an unpublished draft. Delays are relative to the previous email.
//   npx tsx scripts/build-followup-emails.ts
import 'dotenv/config';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }
const SEQ = 2800896;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const ADDR = 'The Seer Within, 930 Washington Avenue, Suite 210-109, Miami Beach, FL 33139, USA';

interface Email { slug: string; subject: string; preview: string; kicker: string; h1: string;
  paras: string[]; ctaLabel: string; utm: string; term: string; friction: string; ps: string; delay: number; position: number; }

function shell(e: Email): string {
  const href = `https://theseerwithin.com/luna?utm_source=kit&amp;utm_medium=email&amp;utm_campaign=luna-followup&amp;utm_content=${e.utm}&amp;utm_term=${e.term}`;
  const P = "font-family:'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:17px; line-height:28px; color:#1C2230;";
  const body = e.paras.map((p, i) => `              <p style="margin:${i === e.paras.length - 1 ? '0' : '0 0 18px 0'}; ${P}">\n                ${p}\n              </p>`).join('\n');
  return `<!DOCTYPE html>
<!-- LUNA VOSS · follow-up sequence — ${e.slug}. Subject + preview set in Kit. -->
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Inter:wght@400;700&display=swap" rel="stylesheet">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img{ -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    body{ margin:0; padding:0; width:100%!important; height:100%!important; } a{ text-decoration:none; }
    @media screen and (max-width:600px){ .lv-wrap{ width:100%!important; } .lv-gutter{ padding-left:16px!important; padding-right:16px!important; } .lv-h1{ font-size:26px!important; line-height:32px!important; } .lv-btn-a{ width:100%!important; max-width:340px!important; } .lv-btn-td{ text-align:center!important; } }
    @media (prefers-color-scheme: dark){ .lv-canvas{ background:#F1EADD!important; } }
  </style>
</head>
<body class="lv-canvas" style="margin:0; padding:0; background-color:#F1EADD;" bgcolor="#F1EADD">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#F1EADD; opacity:0;">
    ${e.preview} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F1EADD" style="background-color:#F1EADD;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" class="lv-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FBF7F0;" bgcolor="#FBF7F0">

        <tr><td align="center" bgcolor="#1C2230" background="https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/luna/constellation-watermark-600x88.png" style="background-color:#1C2230; background-image:url('https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/luna/constellation-watermark-600x88.png'); background-position:center; background-repeat:no-repeat; padding:24px 24px 20px 24px;">
          <img src="https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/luna/luna-avatar.jpg" width="72" height="72" alt="Luna Voss, astrologer" style="display:block; margin:0 auto 12px auto; width:72px; height:72px; border-radius:50%; border:2px solid #B6863C; outline:none;">
          <div style="margin:0; font-family:'Playfair Display', Georgia, serif; font-size:26px; line-height:30px; font-weight:600; letter-spacing:0.5px; color:#FBF7F0;">LUNA VOSS</div>
          <div style="margin:6px 0 0 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:11px; line-height:14px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#B6863C;">Your Natal Chart, Decoded.</div>
        </td></tr>

        <tr><td bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td>
            <td width="22" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; font-family:'Inter',Helvetica,Arial,sans-serif; font-size:11px; line-height:11px; color:#B6863C; padding:0 4px;">&#10022;</td>
            <td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td>
          </tr></table>
        </td></tr>

        <tr><td height="28" bgcolor="#FBF7F0" style="height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <div style="font-family:'Inter', Helvetica, Arial, sans-serif; font-size:11px; line-height:14px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#B6863C;">
            <span style="color:#B6863C; font-size:15px; vertical-align:middle;">&#9790;</span>&nbsp; ${e.kicker}
          </div>
        </td></tr>

        <tr><td height="14" bgcolor="#FBF7F0" style="height:14px; line-height:14px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <h1 class="lv-h1" style="margin:0; font-family:'Playfair Display', Georgia, serif; font-size:30px; line-height:36px; font-weight:600; color:#1C2230;">${e.h1}</h1>
        </td></tr>

        <tr><td height="20" bgcolor="#FBF7F0" style="height:20px; line-height:20px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" align="left" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 44px;">
${body}
        </td></tr>

        <tr><td height="28" bgcolor="#FBF7F0" style="height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>

        <tr><td height="24" bgcolor="#FBF7F0" style="height:24px; line-height:24px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-btn-td" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="15%" stroke="f" fillcolor="#C9963F"><w:anchorlock/><center style="color:#1C2230;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.5px;">${e.ctaLabel} &#8594;</center></v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <table role="presentation" class="lv-btn-a" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
            <td align="center" bgcolor="#C9963F" style="background-color:#C9963F; border-radius:8px;">
              <a href="${href}" style="display:inline-block; padding:16px 34px; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; letter-spacing:0.5px; color:#1C2230; text-decoration:none; border-radius:8px;">${e.ctaLabel} &#8594;</a>
            </td>
          </tr></table>
          <!--<![endif]-->
        </td></tr>

        <tr><td height="12" bgcolor="#FBF7F0" style="height:12px; line-height:12px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <span style="font-family:'Inter', Helvetica, Arial, sans-serif; font-style:italic; font-size:14px; line-height:20px; color:#3A4255;">${e.friction}</span>
        </td></tr>

        <tr><td height="28" bgcolor="#FBF7F0" style="height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" align="left" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 44px;">
          <p style="margin:0 0 18px 0; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:15px; line-height:24px; color:#3A4255;"><strong style="color:#1C2230;">P.S.</strong> ${e.ps}</p>
          <p style="margin:0; font-family:'Playfair Display', Georgia, serif; font-size:18px; line-height:24px; font-weight:600; color:#1C2230;">&mdash; Luna</p>
        </td></tr>

        <tr><td height="32" bgcolor="#FBF7F0" style="height:32px; line-height:32px; font-size:1px;">&nbsp;</td></tr>

        <tr><td class="lv-gutter" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#B6863C" style="background-color:#B6863C; line-height:1px; font-size:1px;">&nbsp;</td></tr></table>
        </td></tr>

        <tr><td height="18" bgcolor="#FBF7F0" style="height:18px; line-height:18px; font-size:1px;">&nbsp;</td></tr>

        <tr><td align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px;">
          <img src="https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/luna/natal-wheel-stamp-48.png" width="48" height="48" alt="Luna Voss natal-wheel mark" style="display:block; width:48px; height:48px; border:0; outline:none;">
        </td></tr>

        <tr><td height="12" bgcolor="#FBF7F0" style="height:12px; line-height:12px; font-size:1px;">&nbsp;</td></tr>

        <tr><td align="center" bgcolor="#FBF7F0" style="background-color:#FBF7F0; padding:0 40px; font-family:'Inter', Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#3A4255;">
          <div style="font-size:12px; line-height:18px; color:#3A4255;"><strong style="color:#1C2230;">Luna Voss &middot; The Seer Within</strong><br>hi@theseerwithin.com &middot; Decoded daily.</div>
          <div style="margin-top:10px; font-size:12px; line-height:18px; color:#8A8475;">You&rsquo;re getting this because you&rsquo;re on Luna&rsquo;s list at The Seer Within.</div>
          <div style="margin-top:10px; font-size:12px; line-height:18px; color:#8A8475;"><a href="{{ unsubscribe_url }}" style="color:#8A6326; text-decoration:underline;">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="{{ preferences_url }}" style="color:#8A6326; text-decoration:underline;">Update preferences</a></div>
          <div style="margin-top:10px; font-size:12px; line-height:18px; color:#8A8475;">${ADDR}</div>
        </td></tr>

        <tr><td height="28" bgcolor="#FBF7F0" style="height:28px; line-height:28px; font-size:1px;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const FN = '{{ subscriber.first_name | default: "friend" }}';
const EMAILS: Email[] = [
  {
    slug: 'followup-2-horoscope-vs-chart', delay: 2, position: 1, utm: 'email_2', term: 'horoscope-vs-chart',
    subject: `${FN}, your horoscope is wrong (your chart isn’t)`,
    preview: 'Generic sky vs. your local weather — the difference is the whole game.',
    kicker: 'Horoscope vs. chart',
    h1: 'Your horoscope is wrong. Your chart isn’t.',
    paras: [
      `Quick thing, ${FN} — most people file all of it under one word, “astrology.” Daily horoscope, birth chart, the Mercury memes. They’re not the same thing, and the difference is the whole game.`,
      `A horoscope is the generic sky. One forecast for everyone born under a sign — roughly a twelfth of the planet. It’s the “rain expected somewhere this week” of astrology. Vague on purpose.`,
      `Your chart is the local weather. Built from the exact moment and place you were born — your Sun, Moon, rising, and the rest, in an arrangement that’s yours and no one else’s. That’s the difference between “rain expected” and “grab an umbrella by 4pm.”`,
      `So when I read for you, I’m not pulling a sign off a list. I’m reading the actual map. Ask me one thing — your love life, a decision, the pattern you can’t shake — and I’ll tell you where your chart says to look.`,
    ],
    ctaLabel: 'show me my local weather',
    friction: '3 free minutes, no card. One real question is all I need.',
    ps: 'And no — I won’t tell you a tall stranger awaits on Thursday. Tendencies and timing, always.',
  },
  {
    slug: 'followup-3-no-excuses', delay: 3, position: 2, utm: 'email_3', term: 'no-excuses',
    subject: `${FN}, you don’t need your birth time`,
    preview: 'No birth time, no astrology degree, no spare hour. It still works.',
    kicker: 'No excuses left',
    h1: 'You don’t need your birth time. Just a question.',
    paras: [
      `${FN}, I know what stops most people from actually talking to me. So let me clear the three big ones.`,
      `“I don’t know my exact birth time.” Fine. We work with the date, and I’ll tell you what needs the time and what doesn’t — plenty of your chart shows up without it.`,
      `“I don’t know anything about astrology.” Honestly, perfect. You don’t need to. You bring the question, I bring the chart. It’s closer to texting a friend than studying for a test.`,
      `“I don’t have time.” It’s three minutes. On your phone, in line for coffee. One question, one real answer — not a 40-page PDF you’ll never open.`,
      `That’s it. No card, no sign-up wall, stop whenever you want.`,
    ],
    ctaLabel: 'okay, I’ve got a question',
    friction: '3 free minutes on me. Bring the question that’s been rattling around.',
    ps: 'If a name or a situation popped into your head while reading this — that’s the one. Bring it.',
  },
  {
    slug: 'followup-4-the-real-question', delay: 4, position: 3, utm: 'email_4', term: 'real-question',
    subject: `${FN}, the question you keep not-asking`,
    preview: 'Your 3 free minutes are still here. Bring the one you keep dodging.',
    kicker: 'Your open question',
    h1: 'The question you keep not-asking.',
    paras: [
      `${FN}, there’s usually one. The decision you keep turning over. The person you keep circling. The thing you almost say out loud and then don’t.`,
      `That’s the one I want. Not because I’ll hand you a fortune — I won’t — but because your chart has something genuinely useful to say about the timing and the pattern underneath it. Why now feels stuck. Whether to move or wait.`,
      `Your 3 free minutes are still sitting here, unused. No catch, no card. And the sky’s shifted since I first wrote you, so there’s a fresh layer to read.`,
      `One more thing: from here on I’ll also send you a short read on the day’s sky now and then — the collective weather, useful on its own. But the real answer is always in your chart, and that’s a conversation, not an email.`,
    ],
    ctaLabel: 'ask me the real one',
    friction: '3 free minutes. One question. That’s the whole ask.',
    ps: 'Whatever you’ve been not-asking — ask me. Worst case, you learn something about yourself.',
  },
];

let ok = 0;
for (const e of EMAILS) {
  const html = shell(e);
  writeFileSync(path.join(OUTBOX, `_${e.slug}.html`), html);
  const r = await fetch(`https://api.kit.com/v4/sequences/${SEQ}/emails`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
    body: JSON.stringify({ subject: e.subject, content: html, preview_text: e.preview, delay_value: e.delay, delay_unit: 'days', position: e.position, published: false }),
  });
  const d: any = await r.json();
  const rec = d.email ?? d.sequence_email ?? d;
  console.log(`${r.ok ? '✓' : '✗'} pos ${e.position} (+${e.delay}d)  id ${rec?.id ?? '?'}  ${e.subject}`);
  if (r.ok) ok++; else console.error('   ', JSON.stringify(d).slice(0, 300));
}
console.log(`\nAdded ${ok}/${EMAILS.length} follow-up emails to sequence ${SEQ}.`);
