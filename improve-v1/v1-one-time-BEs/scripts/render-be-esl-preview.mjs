#!/usr/bin/env node
// Render a backend offer's ESL letter (0X-E2) into a self-contained HTML preview,
// with its real hero image embedded, for a human to actually read and compare.
//
//   node improve-v1/v1-one-time-BEs/scripts/render-be-esl-preview.mjs \
//        improve-v1/v1-one-time-BEs/copy/06/06-E2-esl-kaucim.md \
//        improve-v1/v1-one-time-BEs/assets/06-kaucim-hero.jpg
//
// Writes <source>-PREVIEW.html beside the source.
//
// ⚠ PREVIEW ONLY — not the AWeber upload pipeline. That's `render-be-email.mjs`,
// built for post-purchase emails (T3/T4), which deliberately DROPS image
// placeholders and leaves %FIRSTNAME% as AWeber Liquid. This script exists
// because neither behaviour is what a human comparing two ESL candidates wants:
// here, %FIRSTNAME% becomes a real sample name and [IMG-n] becomes a real
// image, so the file opens anywhere with no relative-path dependency and reads
// the way a recipient would actually see it. An images-JSON entry that is a
// URL (hosted on S3 via host-be-asset.cjs, resized to its actual display
// size) is linked directly; a local path is still base64-embedded, which is
// only viable for a handful of small/reference images — see the images-JSON
// convention below.
//
// Reuses the same visual shell (banner, colours, type) as render-be-email.mjs
// so a preview here isn't lying about the house style.

import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_NAME = process.argv[4] || 'Sarah';

const BANNER =
  'https://hostedimages-cdn.aweber-static.com/NDQyNzMw/optimized/8bf6df906cab4e11b58e484fe450705a.png';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inlineHtml = (s) =>
  esc(s)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, href) =>
        `<a href="${href.replace(/&/g, '&amp;')}" style="color:#7c3aed;text-decoration:underline;">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

function die(m) {
  console.error(`\n  ⛔ ${m}\n`);
  process.exit(1);
}

function loadImageDataUri(imgPath) {
  const buf = fs.readFileSync(imgPath);
  const ext = path.extname(imgPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** A JSON value that's already a URL (hosted on S3 via host-be-asset.cjs) is used directly as the
 *  `<img src>` — no base64 embedding. This is what makes a rendered preview production-viable:
 *  the previous behaviour (embedding every source PNG as base64, full pixel dimensions and all)
 *  produced a 47MB file for a 12-image letter, because the source art is generated far larger than
 *  its email display size. A local path is still base64-embedded, for letters whose images haven't
 *  been resized+hosted yet. */
const isUrl = (s) => /^https?:\/\//.test(s);

/** Pull the letter out of the spec file: strip comments, the frontmatter table,
 *  and everything from "## Build notes" down. Content starts after the FIRST
 *  `---` rule — same convention as render-be-email.mjs, just a table instead
 *  of Subject:/Preheader: lines ahead of it. */
function parse(file) {
  let raw = fs.readFileSync(file, 'utf8');
  raw = raw.replace(/<!--[\s\S]*?-->/g, '');

  const notesAt = raw.search(/^##\s+Build notes/m);
  if (notesAt !== -1) raw = raw.slice(0, notesAt);

  const ruleAt = raw.search(/^---\s*$/m);
  if (ruleAt === -1) die(`${path.basename(file)}: no "---" rule found to split frontmatter from body`);
  let body = raw.slice(raw.indexOf('\n', ruleAt) + 1).trim();

  if (/%[A-Z_]+%/.test(body.replace(/%FIRSTNAME%/g, ''))) {
    const stray = [...new Set(body.replace(/%FIRSTNAME%/g, '').match(/%[A-Z_]+%/g))];
    die(`${path.basename(file)}: unmerged tokens besides %FIRSTNAME%: ${stray.join(', ')}`);
  }

  return { file: path.basename(file), body };
}

/** Read the companion E1 subject-line bank and pull its ★ lead row, for a
 *  realistic subject/preheader — falls back to the letter's own headline.
 *  ⚠ Exact deterministic name mapping (06-E2-esl-<suffix> → 06-E1-subject-lines-<suffix>),
 *  NOT fuzzy substring matching — with multiple "product-*" variants coexisting, a substring
 *  match (e.g. "product") would happily match "product-sugarman"'s E2 file too. */
function findSubjectPreheader(e2Path) {
  const dir = path.dirname(e2Path);
  const base = path.basename(e2Path, '.md');
  if (!base.startsWith('06-E2-esl-')) return null;
  const suffix = base.slice('06-E2-esl-'.length);
  const e1Path = path.join(dir, `06-E1-subject-lines-${suffix}.md`);
  if (!fs.existsSync(e1Path)) return null;
  const raw = fs.readFileSync(e1Path, 'utf8');
  const leadRow = raw.split('\n').find((l) => /\|\s*\*\*\d+\s*★\*\*/.test(l));
  if (!leadRow) return null;
  const cells = leadRow.split('|').map((c) => c.trim()).filter(Boolean);
  // cells: [ "**1 ★**", subject, preheader ]
  return { subject: cells[1]?.replace(/%FIRSTNAME%/g, SAMPLE_NAME), preheader: cells[2]?.replace(/%FIRSTNAME%/g, SAMPLE_NAME) };
}

const renderBlock = (b) => {
  if (/^---+$/.test(b)) return `<hr style="background:#DEE0E8;border:0;height:1px;margin:22px 0;">`;
  if (/^#\s+/.test(b))
    return `<p style="margin:0 0 18px;font-size:24px;line-height:1.35;font-weight:bold;font-family:Georgia,'Times New Roman',serif;color:#2c2530;">${inlineHtml(
      b.replace(/^#\s+/, ''),
    )}</p>`;
  if (/^###\s+/.test(b))
    return `<p style="margin:26px 0 14px;font-size:19px;line-height:1.4;font-weight:bold;color:#2c2530;">${inlineHtml(
      b.replace(/^###\s+/, ''),
    )}</p>`;
  if (/^>/.test(b))
    return `<div style="border-left:3px solid #b79db4;background:#f6f0f5;padding:12px 16px;margin:0 0 16px;font-style:italic;color:#4a414c;">${inlineHtml(
      b.replace(/^>\s?/gm, ''),
    )}</div>`;
  if (/^—\s*Evelyn/.test(b)) return `<p style="margin:0 0 16px;line-height:1.6;">&mdash; Evelyn</p>`;
  // A block whose first line starts "- " is a bullet list — a new `<li>` starts on each line
  // beginning with "- "; any line that doesn't (a wrapped continuation, same as every other
  // paragraph in this file) is appended to the item still being built.
  const bLines = b.split('\n').map((l) => l.trim());
  if (/^-\s+/.test(bLines[0] || '')) {
    const items = [];
    for (const l of bLines) {
      if (/^-\s+/.test(l)) items.push(l.replace(/^-\s+/, ''));
      else if (items.length) items[items.length - 1] += ' ' + l;
    }
    return `<ul style="margin:0 0 16px;padding-left:20px;">${items
      .map((i) => `<li style="margin:0 0 8px;line-height:1.6;">${inlineHtml(i)}</li>`)
      .join('')}</ul>`;
  }
  if (/^\*[^*]/.test(b) && /\*$/.test(b))
    return `<p style="margin:0 0 16px;line-height:1.7;color:#4a414c;">${inlineHtml(b)}</p>`;
  return `<p style="margin:0 0 16px;line-height:1.6;">${inlineHtml(b)}</p>`;
};

// A lone IMG tag immediately followed by a plain paragraph renders as a small
// image on the left with the text running alongside it on the right — the
// "one part, one picture, one description" layout used for the anatomy and
// product breakdowns. Anything else (a heading, blockquote, another IMG tag)
// right after the image falls back to the image stacked full-width alone,
// since there's no caption to pair it with.
//
// ⚠ IMG-1 is always full-width — it's the hero every letter in this deck
// opens on, almost always followed by the salutation ("%FIRSTNAME% —"), not
// a caption, so pairing it would squeeze the opening image into a 120px
// thumbnail next to her own name.
//
// A letter can name OTHER images as full-width too via `fullWidth` (see the
// images-JSON's optional `_fullWidth` key, e.g. ["1", "12"]) — a REAL product
// photo among a set of small part-crops deserves hero treatment, not to be
// shrunk to the same size as an illustration of a bead.
function bodyHtml(body, images, fullWidth) {
  const merged = body.replace(/%FIRSTNAME%/g, SAMPLE_NAME);
  const blocks = merged
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const isPlainParagraph = (b) =>
    b &&
    !/^`?\[IMG-\d+\]`?$/.test(b) &&
    !/^---+$/.test(b) &&
    !/^#{1,3}\s+/.test(b) &&
    !/^>/.test(b) &&
    !/^—\s*Evelyn/.test(b);

  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const imgTag = b.match(/^`?\[(IMG-\d+)\]`?$/);
    if (!imgTag) {
      out.push(renderBlock(b));
      continue;
    }
    const key = imgTag[1];
    const imgHtml = images[key]
      ? `<img src="${images[key]}" alt="" style="display:block;width:100%;border-radius:4px;">`
      : (console.error(`  ⚠ ${key} referenced but no image supplied for it — leaving a visible gap`),
        `<div style="padding:20px 8px;text-align:center;background:#f6f0f5;color:#b79db4;font-size:12px;border:1px dashed #b79db4;">[${key}]</div>`);

    const next = blocks[i + 1];
    if (key === 'IMG-1' || fullWidth.has(key)) {
      // The hero (always) or an operator-flagged image (e.g. a real product photo) — full-width,
      // never paired down to a thumbnail.
      out.push(`<div style="max-width:540px;margin:0 auto 16px;">${imgHtml}</div>`);
    } else if (isPlainParagraph(next)) {
      out.push(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;">
          <tr>
            <td width="120" valign="top" style="width:120px;padding-right:16px;">${imgHtml}</td>
            <td valign="top" style="line-height:1.6;">${inlineHtml(next)}</td>
          </tr>
        </table>`);
      i++; // consume the paired paragraph
    } else {
      out.push(`<div style="max-width:220px;margin:0 0 16px;">${imgHtml}</div>`);
    }
  }
  return out.join('\n        ');
}

const fullHtml = ({ subject, preheader, body, images, fullWidth }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PREVIEW — ${esc(subject || 'ESL candidate')}</title>
<style type="text/css">
  body{-webkit-font-smoothing:antialiased;font-weight:400;line-height:1.5;margin:0;padding:0;width:100%;background-color:#eee;}
  img{border:0;height:auto;line-height:100%;max-width:100%;outline:none;}
  .aw{color:#333333;font-family:Helvetica,Arial,sans-serif;font-size:16px;}
  .previewbar{background:#2c2530;color:#fff;font-family:Helvetica,Arial,sans-serif;font-size:13px;padding:10px 18px;}
  .previewbar b{color:#e5c9e0;}
</style>
</head>
<body>
<div class="previewbar"><b>PREVIEW ONLY</b> — not the AWeber render. Subject: <b>${esc(
  subject || '(none found)',
)}</b> &nbsp;·&nbsp; Preheader: ${esc(preheader || '(none found)')}</div>
<center>
<table align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eee;">
  <tr><td align="center" style="padding:24px 0;">
    <table align="center" class="aw" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#fff;">
      <tr><td align="center" style="padding:20px 0 12px;"><img src="${BANNER}" alt="The Seer Within" width="499" height="166" style="display:block;height:166px;width:499px;max-width:100%;"></td></tr>
      <tr><td style="padding:0 0 6px;"><div style="border-top:1px solid #DEE0E8;height:1px;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
      <tr><td style="padding:14px 30px 30px;font-family:Helvetica,Arial,sans-serif;font-size:16px;color:#333333;line-height:1.6;text-align:left;">
        ${bodyHtml(body, images, fullWidth)}
      </td></tr>
    </table>
  </td></tr>
</table>
</center>
</body>
</html>
`;

const src = process.argv[2];
const imgArg = process.argv[3];
if (!src)
  die(
    'usage: node render-be-esl-preview.mjs <copy/NN/NN-E2-*.md> <hero-image-path-OR-images.json> [sample-name]\n' +
      '  A single image path maps to IMG-1 (backward compatible).\n' +
      '  A path ending in .json is read as {"1": "path/to/img.png", "2": "...", ...} for multi-image letters.',
  );

const m = parse(path.resolve(src));
const images = {};
let fullWidth = new Set();
if (imgArg && imgArg.endsWith('.json')) {
  const map = JSON.parse(fs.readFileSync(path.resolve(imgArg), 'utf8'));
  if (Array.isArray(map._fullWidth)) fullWidth = new Set(map._fullWidth.map((n) => `IMG-${n}`));
  for (const [n, p] of Object.entries(map)) {
    if (n === '_fullWidth') continue;
    images[`IMG-${n}`] = isUrl(p) ? p : loadImageDataUri(path.resolve(p));
  }
} else if (imgArg) {
  images['IMG-1'] = loadImageDataUri(path.resolve(imgArg));
}

const sp = findSubjectPreheader(path.resolve(src)) || {};
const html = fullHtml({ subject: sp.subject, preheader: sp.preheader, body: m.body, images, fullWidth });

const outPath = path.resolve(src).replace(/\.md$/, '-PREVIEW.html');
fs.writeFileSync(outPath, html);

const linked = Object.values(images).filter(isUrl).length;
const embedded = Object.keys(images).length - linked;
const imgNote = linked && embedded
  ? `${linked} image(s) linked, ${embedded} embedded as base64`
  : linked
    ? `${linked} image(s) linked, none embedded`
    : `${embedded} image(s) embedded as base64`;
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`\n  ${m.file} → ${path.basename(outPath)}  (${kb} KB, ${imgNote})`);
console.log(`  subject: ${sp.subject || '(none found — check the E1 file lead row)'}\n`);
