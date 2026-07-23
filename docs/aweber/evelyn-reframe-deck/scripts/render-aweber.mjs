// Render reframe-deck drafts (emails/ or sends/<cycle>/ *.md) into AWeber broadcasts:
// body_html (canonical design, no hero image) + body_text + subject + scheduled_for.
// The `↳ THE REFRAME.` source marker is STRIPPED from the send (authoring tag only).
//
// Usage: node render-aweber.mjs <sendsDir> [outDir]
//   <sendsDir> holds NN-*.md drafts and an optional schedule.json { "NN": "<ISO8601>" }.
//   Writes <outDir>/NN-<slug>.html, .txt, and index.json. Default outDir = <sendsDir>/_build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.argv[2] || path.join(__dirname, '../sends/cycle-1'));
const OUT = path.resolve(process.argv[3] || path.join(SRC, '_build'));
fs.mkdirSync(OUT, { recursive: true });
const schedule = fs.existsSync(path.join(SRC, 'schedule.json'))
  ? JSON.parse(fs.readFileSync(path.join(SRC, 'schedule.json'), 'utf8')) : {};

const BANNER = "https://hostedimages-cdn.aweber-static.com/NDQyNzMw/optimized/8bf6df906cab4e11b58e484fe450705a.png";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inlineHtml = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
const inlineTxt = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
const ctaUrl = (slug) =>
  `https://www.theseerwithin.com/evelyn?email={!email}&bucket=love&src=aweber` +
  `&campaign=${slug}&utm_source=aweber&utm_medium=email&utm_campaign=${slug}`;
const ctaUrlHtml = (slug) => ctaUrl(slug).replace(/&/g, '&amp;');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const i = raw.indexOf('\n---\n');
  const front = raw.slice(0, i), body = raw.slice(i + 5).trim();
  const pick = (re) => (front.match(re) || [])[1]?.trim() || '';
  return {
    num: (front.match(/^#\s*(\d+)/m) || [])[1] || '',
    subject: pick(/\*\*Subject:\*\*\s*`([^`]+)`/),
    preheader: pick(/\*\*Preheader:\*\*\s*(.+)/),
    slug: (front.match(/campaign=([a-z0-9-]+)/) || [])[1] || 'reframe',
    ctaLabel: pick(/\*\*CTA:\*\*\s*(.+?)\s*→/) || 'Come talk to me',
    body,
  };
}
const blocks = (m) => m.body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

function bodyHtml(m) {
  return blocks(m).map((b) => {
    if (/^>\s*\*\*↳ THE REFRAME/.test(b)) {
      const rf = b.replace(/^>\s?/, '').replace(/^\*\*↳ THE REFRAME\.\*\*\s*/, '');
      return `<div style="border-left:3px solid #7a4f7a;background:#f4ecf4;padding:14px 18px;margin:6px 0 18px;font-size:17px;line-height:1.55;color:#2c2530;">${inlineHtml(rf)}</div>`;
    }
    if (/^>/.test(b)) return `<div style="border-left:3px solid #b79db4;background:#f6f0f5;padding:12px 16px;margin:0 0 16px;font-style:italic;color:#4a414c;">${inlineHtml(b.replace(/^>\s?/, ''))}</div>`;
    if (/^\*\*→/.test(b)) {
      const label = (b.match(/\[([^\]]+)\]/) || b.match(/→\s*([^*\[]+)/) || [, m.ctaLabel])[1].trim();
      return `<hr style="background:#DEE0E8;border:0;height:1px;margin:18px 0;">\n        <p style="margin:0 0 16px;line-height:1.6;"><a href="${ctaUrlHtml(m.slug)}" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;font-weight:bold;">&rarr; ${esc(label)}</a></p>`;
    }
    if (/^—\s*Evelyn/.test(b)) return `<p style="margin:0 0 16px;line-height:1.6;">&mdash; Evelyn</p>`;
    return `<p style="margin:0 0 16px;line-height:1.6;">${inlineHtml(b)}</p>`;
  }).join('\n        ');
}
function bodyText(m) {
  return blocks(m).map((b) => {
    if (/^>\s*\*\*↳ THE REFRAME/.test(b)) return inlineTxt(b.replace(/^>\s?/, '').replace(/^\*\*↳ THE REFRAME\.\*\*\s*/, ''));
    if (/^>/.test(b)) return inlineTxt(b.replace(/^>\s?/, ''));
    if (/^\*\*→/.test(b)) { const label = (b.match(/\[([^\]]+)\]/) || b.match(/→\s*([^*\[]+)/) || [, m.ctaLabel])[1].trim(); return `→ ${label}\n${ctaUrl(m.slug)}`; }
    return inlineTxt(b);
  }).join('\n\n');
}
const fullHtml = (m) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>The Seer Within &mdash; Evelyn</title>
<style type="text/css">
  body{-webkit-font-smoothing:antialiased;font-weight:400;line-height:1.5;margin:0;padding:0;width:100%;background-color:#ffffff;}
  img{border:0;height:auto;line-height:100%;max-width:100%;outline:none;}
  table,td{border-collapse:collapse;border-spacing:0;border:0;}
  .aw{color:#333333;font-family:Helvetica,Arial,sans-serif;font-size:16px;}
  .aw a{color:#0000ff;text-decoration:underline;}
  .aw p{margin:0 0 16px;line-height:1.6;}
  @media only screen and (max-width:600px){ .container{width:100%!important;} .px{padding-left:18px!important;padding-right:18px!important;} }
</style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${esc(m.preheader)}</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr><td align="center">
    <table align="center" class="container aw" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
      <tr><td align="center" style="padding:0 0 12px;"><img src="${BANNER}" alt="The Seer Within" width="499" height="166" style="display:block;height:166px;width:499px;max-width:100%;"></td></tr>
      <tr><td style="padding:0 0 6px;"><div style="border-top:1px solid #DEE0E8;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
      <tr><td class="px" style="padding:14px 30px 8px;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#333333;line-height:1.6;text-align:left;">
        ${bodyHtml(m)}
      </td></tr>
      <tr><td align="center" style="padding:24px 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;color:#000000;">
        140 Broadway, Manhattan,<br>New York New York 10005<br>USA<br><br>
        <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">Unsubscribe</a>
        &nbsp;|&nbsp;
        <a href="https://www.aweber.com/z/r/?ThisIsATestEmail" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">Change Subscriber Options</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</center>
</body></html>`;

const files = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.md$/.test(f)).sort();
const index = [];
for (const f of files) {
  const m = parse(path.join(SRC, f));
  const base = `${m.num}-${m.slug}`;
  fs.writeFileSync(path.join(OUT, base + '.html'), fullHtml(m));
  fs.writeFileSync(path.join(OUT, base + '.txt'), bodyText(m));
  const subjectBytes = Buffer.byteLength(m.subject, 'utf8');
  if (subjectBytes > 120) console.error(`  ⚠ #${m.num} subject is ${subjectBytes} bytes (>120 AWeber limit)`);
  index.push({ num: m.num, slug: m.slug, subject: m.subject, subject_bytes: subjectBytes,
               scheduled_for: schedule[m.num] || null, html_file: base + '.html', text_file: base + '.txt' });
}
index.sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)));
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2));
console.log(`rendered ${index.length} broadcasts -> ${OUT}`);
for (const e of index) console.log(`  ${e.scheduled_for || '(unscheduled)'}  #${e.num}  ${e.subject_bytes}b  ${e.subject.slice(0, 50)}`);
