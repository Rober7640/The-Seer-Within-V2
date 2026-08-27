#!/usr/bin/env node
/**
 * Derive the plain-text part of a backend ESL from its built HTML.
 *
 * AWeber stores body_html and body_text as SEPARATE fields, and the proven live path
 * (evelyn-reframe-deck/scripts/aweber-ops.mjs) reads text from its own file — it never
 * derives it. aweber-broadcast.cjs DOES derive it, and its htmlToText is unusable here:
 * `&[a-z]+;` -> ' ' turns every &rsquo; into a space ("I don t draw for people"), and
 * stripping <a> tags loses the CTA URLs entirely, so a text-only reader gets no way
 * through to the booking page. Hence this.
 *
 * Conventions copied from the hand-made 02-E4-esl-v1.txt so the deck stays uniform:
 *   - em-dash renders as " - "; apostrophes survive as '
 *   - a link renders as its label inline, then the bare URL on its own line
 *   - {{BOOKING_URL}} and {{ subscriber.first_name | capitalize }} both pass through
 *     untouched — substituting the first and preserving the second is the caller's job
 *
 *   node improve-v1/v1-one-time-BEs/scripts/esl-to-text.cjs <in.html> [out.txt]
 */
const fs = require('fs');

const ENTITIES = {
  '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"',
  '&mdash;': '-', '&ndash;': '-', '&nbsp;': ' ', '&amp;': '&',
  '&zwnj;': '', '&rarr;': '->', '&hellip;': '...', '&lt;': '<', '&gt;': '>',
};
const decode = s => s.replace(/&[a-z]+;/g, m => (m in ENTITIES ? ENTITIES[m] : m));

// Pull the two regions that carry copy: the main content cell, and the footer cell.
// Sliced on markers rather than matched with <td ...>([\s\S]*?)</td> — the content cell
// contains the recap TABLE, whose own </td> ends a non-greedy match early and silently
// drops every block after it (the last three CTAs among them).
function regions(html) {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const FOOT = /<td align="center"[^>]*font-size:12px[^>]*>/i;
  const start = body.search(/<td class="px"[^>]*>/i);
  const footM = body.match(FOOT);
  const footAt = footM ? body.indexOf(footM[0]) : -1;
  if (start === -1) return [body, ''];
  const afterOpen = body.indexOf('>', start) + 1;
  const main = body.slice(afterOpen, footAt === -1 ? body.length : footAt);
  const foot = footAt === -1 ? ''
    : body.slice(footAt + footM[0].length).split(/<\/td>/i)[0];
  return [main, foot];
}

// Inline: keep link labels, remember their hrefs in order of appearance.
function inline(frag) {
  const urls = [];
  let s = frag.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, label) => {
    urls.push(href);
    return label;
  });
  s = s.replace(/<br\s*\/?>/gi, '\n')
       .replace(/<[^>]+>/g, '');
  // collapse AFTER decoding: &mdash; -> '-' between two spaces would otherwise leave a gap
  s = decode(s)
       .replace(/[ \t]+/g, ' ')
       .split('\n').map(l => l.trim()).join('\n')
       .trim();
  return { text: s, urls };
}

function convert(html) {
  const [main, foot] = regions(html);
  const out = [];

  // Block-level walk, in document order.
  const BLOCK = /<p\b[^>]*>([\s\S]*?)<\/p>|<div\b[^>]*>([\s\S]*?)<\/div>|<hr\b[^>]*>|<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = BLOCK.exec(main)) !== null) {
    if (m[0].startsWith('<hr')) { out.push('---'); continue; }

    if (m[3] !== undefined) {                              // the recap table
      const rows = [...m[3].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      for (const r of rows) {
        const tds = [...r[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(t => inline(t[1]).text);
        if (tds.length >= 2 && (tds[0] || tds[1])) out.push(`${tds[0]}: ${tds[1]}`);
      }
      continue;
    }

    const frag = m[1] !== undefined ? m[1] : m[2];
    const { text, urls } = inline(frag);
    if (!text && !urls.length) continue;                   // image-only paragraph
    if (text) out.push(text);
    for (const u of urls) out.push(u);                     // URL on its own line
  }

  const f = inline(foot);
  if (f.text) {
    out.push('---');
    out.push(f.text.replace(/\s*\|\s*/g, '\n'));
    // the footer's two links are Unsubscribe / Change Subscriber Options
    f.urls.slice(0, 1).forEach(u => out.push(`Unsubscribe: ${u}`));
  }

  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const [, , inFile, outFile] = process.argv;
if (!inFile) { console.error('usage: esl-to-text.cjs <in.html> [out.txt]'); process.exit(1); }
const txt = convert(fs.readFileSync(inFile, 'utf8'));
if (outFile) { fs.writeFileSync(outFile, txt); console.error(`wrote ${outFile} (${txt.length} chars)`); }
else process.stdout.write(txt);
