// Render a backend offer's post-purchase email (`0X-T3`, `0X-T4`) into AWeber
// HTML + plain text, in the canonical Evelyn design.
//
//   node improve-v1/v1-one-time-BEs/scripts/render-be-email.mjs <copy/NN/NN-T3-*.md> [outDir]
//
// Writes <outDir>/<basename>.html and .txt. Default outDir = the source's folder.
//
// ⚠ THE SPEC FILE IS THE SOURCE. There is deliberately no second copy of the
// words: this reads `0X-T3-*.md` itself and drops the parts that are notes
// rather than email — the frontmatter table, `<!-- BEAT n -->` comments, and
// everything from `## Build notes` down. Keeping one file means the copy that
// gets reviewed is the copy that gets sent.
//
// ⛔ It does NOT talk to AWeber. Uploading is a separate, explicit step
// (`aweber-broadcast.cjs create`), for the same reason the reframe deck splits
// them: rendering should never be able to send.
//
// Differences from the reframe-deck renderer (docs/aweber/.../render-aweber.mjs),
// which this borrows its shell from:
//   - no database, no /e/ codes, no bucket — a buyer email carries no lander link
//   - no CTA block. These emails sell nothing; that is the rule, not an omission
//   - `%FIRSTNAME%` becomes an AWeber Liquid merge, salutation-aware (see below)

import fs from 'node:fs';
import path from 'node:path';

const BANNER =
  'https://hostedimages-cdn.aweber-static.com/NDQyNzMw/optimized/8bf6df906cab4e11b58e484fe450705a.png';

// AWeber Liquid, matching what the rest of the estate already sends.
//
// ⚠ TWO fallbacks, on purpose. "Dear %FIRSTNAME%," with a "dear" fallback
// renders "Dear dear," for every buyer whose first name we never captured —
// which is a real share of them, because `?fn=` only arrives from the AWeber
// letter. So the salutation falls back to "friend" and everything mid-sentence
// falls back to "dear", which is Evelyn's own word for a woman she is talking to.
const MERGE_SALUTATION = '{{ subscriber.first_name | default: "friend" }}';
const MERGE_INLINE = '{{ subscriber.first_name | default: "dear" }}';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inlineHtml = (s) =>
  esc(s)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, href) =>
        `<a href="${href.replace(/&/g, '&amp;')}" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
const inlineTxt = (s) =>
  s
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1: $2')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');

/** Pull the email out of the spec file, leaving the notes behind. */
function parse(file) {
  let raw = fs.readFileSync(file, 'utf8');

  // Notes, in three shapes.
  raw = raw.replace(/<!--[\s\S]*?-->/g, '');
  const notesAt = raw.search(/^##\s+Build notes/m);
  if (notesAt !== -1) raw = raw.slice(0, notesAt);

  const subjectMatch = raw.match(/^\*\*Subject:\*\*\s*(.+)$/m);
  if (!subjectMatch) {
    console.error(`ERROR: ${path.basename(file)} has no **Subject:** line.`);
    process.exit(1);
  }
  const subject = subjectMatch[1].trim();

  const preheaderMatch = raw.match(/^\*\*Preheader:\*\*\s*(.+)$/m);

  // The email starts after the rule that follows the subject line.
  const afterSubject = raw.slice(subjectMatch.index + subjectMatch[0].length);
  const ruleAt = afterSubject.search(/^---\s*$/m);
  let body = ruleAt === -1 ? afterSubject : afterSubject.slice(afterSubject.indexOf('\n', ruleAt) + 1);

  // A lone `[IMG — …]` slot the copy marks optional. Dropped, loudly: an unfilled
  // image slot that ships is a broken box in her inbox.
  body = body.replace(/^`\[IMG[^\n]*`\s*$/gm, () => {
    console.error(`  ⚠ dropped an optional [IMG …] slot — no image is being sent`);
    return '';
  });

  // Slots AWeber fills from a custom field. The syntax for those is chosen in
  // AWeber's own field picker while the Campaign is being built, so it is not
  // typed here — the token ships as an obvious placeholder and the upload step
  // swaps it. Warned about every render so it cannot go out as literal text.
  const aweberSlots = [...new Set(body.match(/\{\{AWEBER_[A-Z_]+\}\}/g) || [])];

  if (/%[A-Z_]+%/.test(body.replace(/%FIRSTNAME%/g, ''))) {
    const stray = body.replace(/%FIRSTNAME%/g, '').match(/%[A-Z_]+%/g);
    console.error(`ERROR: ${path.basename(file)} still has unmerged tokens: ${[...new Set(stray)].join(', ')}`);
    console.error('  Never send a blank where a detail should be — cut the sentence instead.');
    process.exit(1);
  }

  return {
    file: path.basename(file),
    subject,
    preheader: preheaderMatch ? preheaderMatch[1].trim() : '',
    body: body.trim(),
    aweberSlots,
  };
}

/** `%FIRSTNAME%` → Liquid. A salutation gets the "friend" fallback. */
function merge(block) {
  const salutation = /^(Dear|Hello|Hi)\s+%FIRSTNAME%\s*,/.test(block.trim());
  if (salutation) {
    return block.replace(/%FIRSTNAME%/, MERGE_SALUTATION).replace(/%FIRSTNAME%/g, MERGE_INLINE);
  }
  return block.replace(/%FIRSTNAME%/g, MERGE_INLINE);
}

const blocks = (m) =>
  m.body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(merge);

function bodyHtml(m) {
  return blocks(m)
    .map((b) => {
      if (/^---+$/.test(b))
        return `<hr style="background:#DEE0E8;border:0;height:1px;margin:22px 0;">`;
      if (/^###\s+/.test(b))
        return `<p style="margin:26px 0 14px;font-size:19px;line-height:1.4;font-weight:bold;color:#2c2530;">${inlineHtml(
          b.replace(/^###\s+/, ''),
        )}</p>`;
      if (/^>/.test(b))
        return `<div style="border-left:3px solid #b79db4;background:#f6f0f5;padding:12px 16px;margin:0 0 16px;font-style:italic;color:#4a414c;">${inlineHtml(
          b.replace(/^>\s?/gm, ''),
        )}</div>`;
      if (/^—\s*Evelyn/.test(b))
        return `<p style="margin:0 0 16px;line-height:1.6;">&mdash; Evelyn</p>`;
      // A wholly italic paragraph is the parable voice — set it apart without a box.
      if (/^\*[^*]/.test(b) && /\*$/.test(b))
        return `<p style="margin:0 0 16px;line-height:1.7;color:#4a414c;">${inlineHtml(b)}</p>`;
      return `<p style="margin:0 0 16px;line-height:1.6;">${inlineHtml(b)}</p>`;
    })
    .join('\n        ');
}

function bodyText(m) {
  return blocks(m)
    .map((b) => {
      if (/^---+$/.test(b)) return '—————————————————';
      if (/^###\s+/.test(b)) return inlineTxt(b.replace(/^###\s+/, '')).toUpperCase();
      if (/^>/.test(b)) return inlineTxt(b.replace(/^>\s?/gm, ''));
      return inlineTxt(b);
    })
    .join('\n\n');
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
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${esc(
  m.preheader,
)}</div>
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
</body>
</html>
`;

const src = process.argv[2];
if (!src) {
  console.error('usage: node render-be-email.mjs <copy/NN/NN-T3-*.md> [outDir]');
  process.exit(1);
}
const m = parse(path.resolve(src));
const outDir = path.resolve(process.argv[3] || path.dirname(path.resolve(src)));
const base = m.file.replace(/\.md$/, '');
const html = fullHtml(m);
const text = bodyText(m);

fs.writeFileSync(path.join(outDir, `${base}.html`), html);
fs.writeFileSync(path.join(outDir, `${base}.txt`), text);

const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`${m.file}`);
console.log(`  subject : ${m.subject}`);
console.log(`  html    : ${base}.html  (${kb} KB${kb > 102 ? '  ⚠ OVER GMAIL CLIP' : ''})`);
console.log(`  text    : ${base}.txt`);
if (!m.preheader) console.log(`  ⚠ no **Preheader:** — the inbox will show the first line of the body`);
if (m.aweberSlots.length) {
  console.log(`  ⛔ ${m.aweberSlots.length} slot(s) AWeber must fill: ${m.aweberSlots.join(', ')}`);
  console.log(`     Replace each one from AWeber's personalization picker when you build the`);
  console.log(`     Campaign, then send yourself a seed test and confirm it resolves. Shipped`);
  console.log(`     unswapped, the buyer reads the token.`);
}
