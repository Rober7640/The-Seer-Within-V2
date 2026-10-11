#!/usr/bin/env node
// Build the deliverable for backend offer 04 "The Turn" — Evelyn's tea-leaf reading.
//
// ONE PDF PER CUP (D7): the same file for every buyer of that cup, so there is no
// buyer name and no date anywhere in it. The rim calendar (04-P3) is the closing
// section of the same PDF, on its own page (D9). Linked, not attached (D8) —
// hosting is a separate, later step; this script never uploads anything.
//
//   node improve-v1/v1-one-time-BEs/scripts/build-04-pdf.mjs            # all three cups
//   node improve-v1/v1-one-time-BEs/scripts/build-04-pdf.mjs sunken-leaf
//
// Per cup it writes, under docs/04/product/pdf/:
//   04-the-turn-<cup>.pdf    the SHIPPING file (Playwright/Chromium print, US Letter)
//   04-the-turn-<cup>.docx   the editable twin (pandoc, same assembled content)
//   build/<cup>.md|.html     the assembled source (.html saved after pagination), kept so the gate can be re-run
// then runs the gate. The PDFs live in the repo (docs/04/product/pdf/) and are committed — no Desktop copy
// (scripts/check-04-pdf.py: text grep, calendar placement, layout heuristics,
// page PNGs + contact sheet preview-<cup>.jpg). Needs: pandoc, python3 + pymupdf.
//
// Inputs (never edited here):
//   copy/04/product/04-P1-<cup>.md   the reading: `# Your cup is turned` → before `## Build notes`
//   copy/04/product/04-P3-<cup>.md   the calendar: after the spec table's `---` → before `## Build notes`
//   docs/04/product/images/esl/*.jpg  the source letter's cup photo + a square crop of each numbered mark
//   docs/04/product/fonts/*.ttf      EB Garamond (body) + Playfair Display (headings), OFL, local

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BE = path.resolve(HERE, '..'); // improve-v1/v1-one-time-BEs
const COPY = path.join(BE, 'copy/04/product');
const PRODUCT = path.join(BE, 'docs/04/product');
const OUT = path.join(PRODUCT, 'pdf');
const BUILD = path.join(OUT, 'build');
const ALL_CUPS = ['divided-rim', 'turned-handle', 'sunken-leaf'];

// Image slots → file + alt text. The caption line beside each slot names the leaf
// in words already (images-off rule); alt describes the photograph itself.
// ⛔ Every image is the ONE real cup from the source letter (operator, 2026-10-11): the full
// photo with Evelyn's seven numbered marks, and a square crop of each mark. The generated leaf
// pictures were rejected as unrealistic. Map of what is in the photo: docs/04/product/esl-cup-map.md.
const SLOTS = {
  CUP: { file: 'esl/esl-cup.jpg', alt: 'A white teacup seen from above on red velvet, the tea drunk, wet leaves on the inside wall, seven groups of leaves circled in red and numbered 1 to 7' },
  MAP: { file: 'esl/esl-cup-tight-3x2.jpg', alt: 'Your cup from above, with the seven groups of leaves circled in red and numbered 1 to 7' },
  BIRD: { file: 'esl/mark-1-bird.jpg', alt: 'Close-up of mark 1: a tall, loose scatter of tea leaves running down the inside wall of the cup' },
  HEART: { file: 'esl/mark-2-heart.jpg', alt: 'Close-up of mark 2: two dark clumps of tea leaves low in the cup with a pale gap between them' },
  TREE: { file: 'esl/mark-3-tree.jpg', alt: 'Close-up of mark 3: a dark, branching clump of tea leaves with bare stalks, beside the handle' },
  BOAT: { file: 'esl/mark-4-boat.jpg', alt: 'Close-up of mark 4: a low, spread-out group of tea-leaf clumps on the far wall of the cup' },
  BRIDGE: { file: 'esl/mark-5-bridge.jpg', alt: 'Close-up of mark 5: a thin line of tea leaves lying along the edge of the cup under the rim' },
  LIGHTHOUSE: { file: 'esl/mark-6-lighthouse.jpg', alt: 'Close-up of mark 6: one thin, upright streak of tea leaf standing alone just under the rim' },
  BUTTERFLY: { file: 'esl/mark-7-butterfly.jpg', alt: 'Close-up of mark 7: a small two-lobed fleck of tea leaf right at the rim of the cup' },
};

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}
function must(cond, msg) {
  if (!cond) fail(msg);
}
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

// ---------------------------------------------------------------- sources → markdown

function readCup(cup) {
  const p1 = fs.readFileSync(path.join(COPY, `04-P1-${cup}.md`), 'utf8');
  const p3 = fs.readFileSync(path.join(COPY, `04-P3-${cup}.md`), 'utf8');

  // Cup name + tagline from the spec table: | **Cup** | The Turned Handle — *he answers, but flat* |
  const cupRow = p1.match(/^\|\s*\*\*Cup\*\*\s*\|\s*(.+?)\s+—\s+\*([^*]+)\*/m);
  must(cupRow, `${cup}: no **Cup** row in the P1 spec table`);
  const [, cupName, cupTagline] = cupRow;

  // The reading: from `# Your cup is turned` to just before `## Build notes`.
  const start = p1.search(/^# Your cup is turned\s*$/m);
  const end = p1.search(/^## Build notes\s*$/m);
  must(start >= 0 && end > start, `${cup}: P1 product bounds not found`);
  let reading = stripComments(p1.slice(start, end));

  // The calendar marker: the calendar goes where it sits; nothing but rules after it.
  const marker = reading.match(/^`?\[04-P3-[^\]\n]*renders here\]`?[ \t]*$/m);
  must(marker, `${cup}: calendar marker line not found in P1`);
  const tail = reading.slice(marker.index + marker[0].length);
  must(tail.replace(/^\s*---\s*$/gm, '').trim() === '', `${cup}: product text found after the calendar marker`);
  reading = reading.slice(0, marker.index).replace(/\n\s*---\s*\n*$/, '\n'); // drop the rule above the marker

  // The calendar: after the spec table's closing `---`, before `## Build notes`.
  const calEnd = p3.search(/^## Build notes\s*$/m);
  const firstRule = p3.search(/^---\s*$/m);
  must(firstRule >= 0 && calEnd > firstRule, `${cup}: P3 calendar bounds not found`);
  let calendar = stripComments(p3.slice(firstRule, calEnd))
    .replace(/^---\s*\n/, '')
    .replace(/\n\s*---\s*\n*$/, '\n')
    .trim();
  must(calendar.startsWith('### '), `${cup}: calendar does not start with a ### heading`);
  must(!/^## /m.test(calendar), `${cup}: calendar contains a ## heading (spec/notes leaked in?)`);

  return { cupName, cupTagline, reading, calendar };
}

// Shared body markdown. Feeds BOTH the PDF (via HTML) and the .docx, so the two match.
function assembleBody(cup, { reading, calendar }) {
  let md = reading;

  // A rule straight before a `##` is redundant: every `##` starts a new page.
  md = md.replace(/\n---[ \t]*\n+(?=## )/g, '\n');

  // Image slots. Each sits right under its heading with an italic caption after it;
  // heading + image + caption become one unit so they can never be split.
  let slots = 0;
  md = md.replace(
    /^(#{1,3}) ([^\n]+)\n\n`\[IMG-([A-Z]+)\]`\n\n(\*(?:[^\n]|\n(?!\n))+?\*)[ \t]*\n/gm,
    (all, hashes, heading, slot, caption) => {
      const s = SLOTS[slot];
      must(s, `${cup}: unknown image slot [IMG-${slot}]`);
      slots += 1;
      const cls = hashes === '#' ? 'opening' : 'stretch-head';
      const width = hashes === '#' ? '3in' : '2.5in';
      // [IMG-CUP] is the cover's photo; printing it again on the facing page reads as a
      // mistake. Keep the heading and the caption (it describes HER cup, not the photo).
      // [IMG-MAP] is the full photo under "## Where your seven landed": the heading stays a
      // bare h2 (pagination keys on it), the photo + caption follow as one block.
      if (slot === 'MAP') {
        // The photo gets a page of its own (a plate) BEFORE the section, so the numbers are
        // readable and the table + its paragraph keep their own page. paginate() opens a page
        // on .map-figure as well as on h2.
        return [
          '::: {.map-figure}',
          '::: {custom-style="Plate Title"}',
          'Your cup',
          ':::',
          '',
          '::: {custom-style="Leaf Image"}',
          `![${s.alt}](images/${s.file}){width=6.3in}`,
          ':::',
          '',
          '::: {custom-style="Leaf Caption"}',
          caption.replace(/\s*\n\s*/g, ' '),
          ':::',
          ':::',
          '',
          `${hashes} ${heading}`,
          '',
        ].join('\n');
      }
      if (slot === 'CUP') {
        return [
          `::: {.${cls}}`,
          `${hashes} ${heading}`,
          '',
          '::: {custom-style="Leaf Caption"}',
          caption.replace(/\s*\n\s*/g, ' '),
          ':::',
          ':::',
          '',
        ].join('\n');
      }
      return [
        `::: {.${cls}}`,
        `${hashes} ${heading}`,
        '',
        '::: {custom-style="Leaf Image"}',
        `![${s.alt}](images/${s.file}){width=${width}}`,
        ':::',
        '',
        '::: {custom-style="Leaf Caption"}',
        caption.replace(/\s*\n\s*/g, ' '),
        ':::',
        ':::',
        '',
      ].join('\n');
    },
  );
  must(!md.includes('[IMG-'), `${cup}: an image slot was not replaced (slot not directly under a heading + caption?)`);
  must(slots === 9, `${cup}: expected 9 image slots (CUP, MAP, 7 marks), replaced ${slots}`);

  // Column proportions for the .docx (pandoc reads them from the dash counts of a
  // pipe table's rule line; the PDF lets the browser size columns to content).
  md = md.replace(/^\|(?:\s*:?-+:?\s*\|){4}\s*$/gm, '|----|--------|--|-------|');

  // The calendar: closing section, own page. The raw openxml page break is for the
  // .docx (the HTML writer drops it; CSS breaks the page in the PDF).
  md += [
    '',
    '```{=openxml}',
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    '```',
    '',
    '::: {.calendar}',
    calendar.replace(/^\|(?:\s*:?-+:?\s*\|){5}\s*$/gm, '|--|----|-|---|-----------|'),
    ':::',
    '',
  ].join('\n');
  return md;
}

// ---------------------------------------------------------------- pandoc

function pandoc(args, input) {
  return execFileSync('pandoc', args, { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}
const MD_IN = 'markdown-implicit_figures';

// ---------------------------------------------------------------- HTML for print

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function postProcessHtml(html) {
  // Pipe tables come with equal column widths; let the browser size columns to content.
  html = html.replace(/<colgroup>[\s\S]*?<\/colgroup>\s*/g, '');
  // Unwrap pandoc's custom-style divs (they only matter to the .docx writer).
  html = html.replace(/<div data-custom-style="Leaf Image">\s*<p>(<img [^>]*>)<\/p>\s*<\/div>/g, '$1');
  html = html.replace(/<div data-custom-style="Plate Title">\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g, '<p class="plate-title">$1</p>');
  html = html.replace(/<div data-custom-style="Leaf Caption">\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g, '<p class="caption">$1</p>');
  html = html.replace(/(<img [^>]*?)\s*style="[^"]*"/g, '$1'); // sizes live in the CSS

  // Stretch heads → a card: photo on the left; days / leaf / instruction on the right.
  // (pandoc turns a div that opens with a heading into a <section> carrying the heading's id.)
  let cards = 0;
  html = html.replace(
    /<(div|section)([^>]*?) class="stretch-head"([^>]*)>\s*<h3([^>]*)>([\s\S]*?)<\/h3>\s*(<img [^>]*>)\s*(<p class="caption">[\s\S]*?<\/p>)\s*<\/\1>/g,
    (all, tag, a1, a2, attrs, inner, img, caption) => {
      cards += 1;
      const parts = inner.split(/\s+·\s+/);
      must(parts.length === 3, `stretch heading not "Days · leaf · instruction": ${inner}`);
      const [days, leaf, word] = parts;
      return (
        `<${tag}${a1} class="stretch-head"${a2}>${img}<div class="sh-text">` +
        `<h3${attrs}><span class="sh-days">${days}</span><span class="sh-leaf">${leaf}</span>` +
        `<span class="sh-word">${word}</span></h3>${caption}</div></${tag}>`
      );
    },
  );
  must(cards === 7, `expected 7 stretch cards, built ${cards}`);

  // Calendar marks as drawn circles (the text fonts carry no ○ ● ◐ glyphs).
  html = html
    .replace(/○/g, '<span class="mk" role="img" aria-label="quiet"></span>')
    .replace(/●/g, '<span class="mk send" role="img" aria-label="you send one thing"></span>')
    .replace(/◐/g, '<span class="mk his" role="img" aria-label="his move"></span>');

  // Sign-off.
  html = html.replace(/<p>— Evelyn<\/p>/g, '<p class="signoff">— Evelyn</p>');
  return html;
}

function buildHtml({ cupName, cupTagline }, bodyHtml) {
  const font = (file) => `url('fonts/${file}') format('truetype')`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The Turn — ${esc(cupName)}</title>
<base href="../../">
<style>
@font-face { font-family: 'EB Garamond'; src: ${font('EBGaramond-Regular.ttf')}; font-weight: 400; font-style: normal; }
@font-face { font-family: 'EB Garamond'; src: ${font('EBGaramond-Italic.ttf')}; font-weight: 400; font-style: italic; }
@font-face { font-family: 'EB Garamond'; src: ${font('EBGaramond-SemiBold.ttf')}; font-weight: 600; font-style: normal; }
@font-face { font-family: 'EB Garamond'; src: ${font('EBGaramond-SemiBoldItalic.ttf')}; font-weight: 600; font-style: italic; }
@font-face { font-family: 'Playfair Display'; src: ${font('PlayfairDisplay-Regular.ttf')}; font-weight: 400; font-style: normal; }
@font-face { font-family: 'Playfair Display'; src: ${font('PlayfairDisplay-Italic.ttf')}; font-weight: 400; font-style: italic; }
@font-face { font-family: 'Playfair Display'; src: ${font('PlayfairDisplay-Medium.ttf')}; font-weight: 500; font-style: normal; }
@font-face { font-family: 'Playfair Display'; src: ${font('PlayfairDisplay-MediumItalic.ttf')}; font-weight: 500; font-style: italic; }

:root {
  --ink: #2a2421;
  --soft: #62564f;
  --wine: #6b1e2a;
  --gold: #a88850;
  --rule: #d9cdb8;
}

@page {
  size: 8.5in 11in;
  margin: 1in 1.1in;
  @top-center {
    content: "THE TURN";
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 7.5pt; letter-spacing: 0.32em; color: var(--gold);
    vertical-align: bottom; padding-bottom: 0.32in;
  }
  @bottom-center {
    content: counter(page);
    font-family: 'EB Garamond', Georgia, serif;
    font-size: 10pt; color: var(--soft); font-variant-numeric: lining-nums;
    vertical-align: top; padding-top: 0.3in;
  }
}
@page :first {
  margin: 1in;
  @top-center { content: none; }
  @bottom-center { content: none; }
}
@page calendar { margin: 1in; }

html { font-family: 'EB Garamond', Georgia, serif; font-size: 12.5pt; line-height: 1.38; color: var(--ink);
  font-variant-numeric: lining-nums; font-kerning: normal; }
body { margin: 0; }
p { margin: 0 0 0.5em; orphans: 3; widows: 3; text-wrap: pretty; }
.caption { text-wrap: balance; }
strong { font-weight: 600; }
h1, h2, h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; color: var(--wine);
  break-after: avoid; page-break-after: avoid; font-variant-numeric: lining-nums; }

/* ---- cover ---- */
.cover { height: 9in; display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; }
.cover .title { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 46pt; line-height: 1;
  color: var(--wine); letter-spacing: 0.02em; margin: 0; }
.cover .subtitle { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 17pt;
  color: var(--ink); margin: 0.16in 0 0; }
.cover .rule { width: 0.9in; height: 0; border-top: 1px solid var(--gold); margin: 0.32in auto; }
.cover img { width: 4.1in; height: 4.1in; object-fit: cover; display: block; border-radius: 2px; }
.cover .cup { font-family: 'Playfair Display', Georgia, serif; font-size: 16pt; color: var(--wine); margin: 0.34in 0 0; }
.cover .cup em { color: var(--ink); font-family: 'EB Garamond', Georgia, serif; font-size: 15pt; }
.cover .byline { font-size: 11pt; letter-spacing: 0.22em; text-transform: uppercase; color: var(--soft); margin: 0.14in 0 0; }

/* ---- the opening: h1 + the cup ---- */
.opening { text-align: center; break-inside: avoid; margin: 0.35in 0 0.3in; }
.opening h1 { font-size: 25pt; margin: 0 0 0.22in; line-height: 1.15; }
.opening img { width: 2.9in; height: 2.9in; display: block; margin: 0 auto 0.12in; border-radius: 2px; }
.opening .caption { font-style: italic; font-size: 11pt; color: var(--soft); max-width: 4.6in; margin: 0 auto; }

/* ---- the map: the full photo under "Where your seven landed" ---- */
.map-figure { text-align: center; break-inside: avoid; margin: 0.6in 0 0; }
.map-figure img { width: 6.3in; height: auto; display: block; margin: 0 auto 0.1in; border-radius: 2px; }
.map-figure .plate-title { font-family: 'Playfair Display', Georgia, serif; font-size: 21pt; color: var(--wine); margin: 0 0 0.3in; }
.map-figure .caption { font-style: italic; font-size: 11pt; color: var(--soft); max-width: 5in; margin: 0 auto; }

/* ---- page units (see paginate()): each opens a page; --fit tightens a unit that runs over ---- */
.unit { break-before: page; page-break-before: always; display: flow-root; width: 6.3in;
  font-size: calc(12.5pt * var(--fit, 1)); }
.unit-calendar { page: calendar; width: 6.5in; font-size: calc(11pt * var(--fit, 1)); line-height: 1.34; }
.unit > .stretch-head:first-child { margin-top: 0; padding-top: 0; border-top: 0; }

/* ---- major sections ---- */
h2 { font-size: 21pt; line-height: 1.2; margin: 0.1in 0 0.3in; }
h2::after { content: ""; display: block; width: 0.75in; border-top: 1px solid var(--gold); margin-top: 0.16in; }
hr { border: 0; height: 0; border-top: 1px solid var(--gold); width: 0.9in; margin: 0.32in auto 0.3in; }
.signoff { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 14pt; color: var(--wine);
  margin-top: 0.2in; break-before: avoid; }

/* ---- the twenty-one days: one card per stretch ---- */
.stretch-head { display: flex; align-items: center; gap: 0.3in; margin: 0.34in 0 0.22in;
  padding-top: 0.2in; border-top: 1px solid var(--rule);
  break-inside: avoid; page-break-inside: avoid; break-after: avoid; page-break-after: avoid; }
.stretch-head img { width: 2.5in; height: 2.5in; flex: 0 0 2.5in; display: block; border-radius: 2px; }
.stretch-head .sh-text { flex: 1 1 auto; }
.stretch-head h3 { margin: 0 0 0.16in; font-weight: 500; }
.stretch-head h3 span { display: block; }
.sh-days { font-size: 9pt; letter-spacing: 0.24em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.07in; }
.sh-leaf { font-size: 19pt; line-height: 1.15; }
.sh-leaf::first-letter { text-transform: uppercase; }
.sh-word { font-size: 13pt; color: var(--ink); margin-top: 0.06in; }
.sh-word em { font-style: italic; }
.stretch-head .caption { font-style: italic; font-size: 11pt; color: var(--soft); margin: 0; }

/* ---- tables ---- */
table { width: 100%; border-collapse: collapse; font-size: 10.5pt; line-height: 1.3; margin: 0.15in 0 0.25in;
  break-inside: avoid; page-break-inside: avoid; font-variant-numeric: lining-nums; }
th { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; font-size: 9pt; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--wine); text-align: left; padding: 0 0.08in 0.07in; border-bottom: 1px solid var(--gold);
  white-space: nowrap; }
td { padding: 0.07in 0.08in; vertical-align: top; border-bottom: 1px solid var(--rule); }
tr { break-inside: avoid; }
td:nth-child(3) { white-space: nowrap; }

/* ---- the rim calendar: last page, one page ---- */
.calendar p { margin: 0 0 0.5em; }
.calendar h3 { font-size: 1.22em; margin: 1.05em 0 0.4em; }
.calendar h3:first-child { font-size: 1.85em; margin: 0 0 0.55em; line-height: 1.15; }
.calendar h3:first-child::after { content: ""; display: block; width: 0.75in; border-top: 1px solid var(--gold); margin-top: 0.13in; }
.calendar table { font-size: 0.92em; margin: 0.08in 0 0.12in; }
.calendar td { padding: 0.055in 0.07in; }
.calendar td:nth-child(1) { white-space: nowrap; }
.calendar td:nth-child(2) { white-space: nowrap; }
.calendar td:nth-child(3) { text-align: center; padding-left: 0; padding-right: 0; }
.calendar td:nth-child(4) { white-space: nowrap; color: var(--wine); letter-spacing: 0.04em; }
.mk { display: inline-block; width: 0.72em; height: 0.72em; border-radius: 50%; border: 1.1pt solid var(--wine);
  vertical-align: -0.06em; box-sizing: border-box; }
.mk.send { background: var(--wine); }
.mk.his { background: linear-gradient(90deg, var(--wine) 50%, transparent 50%); }
</style>
</head>
<body>
<section class="cover">
  <p class="title">The Turn</p>
  <p class="subtitle">Your cup is turned</p>
  <div class="rule"></div>
  <img src="images/${SLOTS.CUP.file}" alt="${esc(SLOTS.CUP.alt)}">
  <p class="cup">${esc(cupName)} — <em>${esc(cupTagline)}</em></p>
  <p class="byline">A tea-leaf reading by Evelyn Cross</p>
</section>
${bodyHtml}
</body>
</html>
`;
}

// ---------------------------------------------------------------- .docx

const SHELL = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] });

// A small reference.docx: Georgia (safe on any machine), wine headings, US Letter,
// 1in margins, page break before every Heading 2, running header + page numbers
// (none on the cover: different first page).
function buildReferenceDocx() {
  const out = path.join(BUILD, 'reference.docx');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ref04-'));
  const base = path.join(tmp, 'base.docx');
  fs.writeFileSync(base, execFileSync('pandoc', ['--print-default-data-file', 'reference.docx']));
  const dir = path.join(tmp, 'x');
  fs.mkdirSync(dir);
  SHELL('unzip', ['-q', base, '-d', dir]);
  const W = (p) => path.join(dir, p);
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const GEORGIA = '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:eastAsia="Georgia" w:cs="Georgia" />';

  let styles = fs.readFileSync(W('word/styles.xml'), 'utf8');
  const editStyle = (id, fn) => {
    const re = new RegExp(`<w:style [^>]*w:styleId="${id}"[\\s\\S]*?</w:style>`);
    must(re.test(styles), `reference.docx: style ${id} missing`);
    styles = styles.replace(re, fn);
  };
  // Body: Georgia 11pt, 1.25 line spacing.
  styles = styles.replace(/<w:rPrDefault>[\s\S]*?<\/w:rPrDefault>/,
    `<w:rPrDefault><w:rPr>${GEORGIA}<w:color w:val="2A2421" /><w:sz w:val="22" /><w:szCs w:val="22" /><w:lang w:val="en-US" /></w:rPr></w:rPrDefault>`);
  editStyle('BodyText', (s) => s.replace(/<w:spacing [^>]*\/>/, '<w:spacing w:before="0" w:after="160" w:line="300" w:lineRule="auto" />'));
  const heading = (size, extraPPr = '') => (s) =>
    s.replace(/<w:pPr>/, `<w:pPr>${extraPPr}`)
      .replace(/<w:rFonts [\s\S]*?\/>/, GEORGIA)
      .replace(/<w:color [\s\S]*?\/>/, '<w:color w:val="6B1E2A" />')
      .replace(/<w:sz w:val="\d+" \/>\s*<w:szCs w:val="\d+" \/>/, `<w:sz w:val="${size}" /><w:szCs w:val="${size}" />`);
  editStyle('Heading1', heading(44, '<w:jc w:val="center" />'));
  editStyle('Heading2', heading(36, '<w:pageBreakBefore />'));
  editStyle('Heading3', (s) => heading(28)(s).replace(/<w:rPr>/, `<w:rPr>${GEORGIA}`));
  editStyle('Title', (s) => s.replace(/<w:rFonts [\s\S]*?\/>/, GEORGIA)
    .replace(/<w:spacing w:after="80"/, '<w:spacing w:before="1440" w:after="160"')
    .replace(/<w:sz w:val="56" \/>\s*<w:szCs w:val="56" \/>/, '<w:color w:val="6B1E2A" /><w:sz w:val="80" /><w:szCs w:val="80" />'));
  editStyle('Subtitle', (s) => s.replace(/<w:numPr>[\s\S]*?<\/w:numPr>/, '<w:spacing w:before="0" w:after="360" />')
    .replace(/<w:sz w:val="28" \/>/, '<w:i /><w:sz w:val="34" />'));
  editStyle('Author', (s) => s.replace('<w:keepLines />', '<w:keepLines /><w:spacing w:before="120" w:after="0" />')
    .replace(/<w:sz w:val="24" \/>/, '<w:caps /><w:color w:val="62564F" /><w:spacing w:val="30" /><w:sz w:val="20" />'));
  // Custom styles used by the assembled markdown.
  const pStyle = (id, name, pPr, rPr = '') =>
    `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${id}"><w:name w:val="${name}" /><w:basedOn w:val="BodyText" /><w:qFormat /><w:pPr>${pPr}</w:pPr>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}</w:style>`;
  styles = styles.replace('</w:styles>',
    pStyle('PlateTitle', 'Plate Title', '<w:keepNext /><w:pageBreakBefore /><w:spacing w:before="0" w:after="240" /><w:jc w:val="center" />', '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" /><w:color w:val="6B1E2A" /><w:sz w:val="40" /><w:szCs w:val="40" />') +
    pStyle('LeafImage', 'Leaf Image', '<w:keepNext /><w:spacing w:before="160" w:after="80" /><w:jc w:val="center" />') +
    pStyle('LeafCaption', 'Leaf Caption', '<w:spacing w:before="0" w:after="280" /><w:jc w:val="center" />', '<w:color w:val="62564F" /><w:sz w:val="20" /><w:szCs w:val="20" />') +
    pStyle('CoverImage', 'Cover Image', '<w:keepNext /><w:spacing w:before="240" w:after="360" /><w:jc w:val="center" />') +
    pStyle('CoverCup', 'Cover Cup', '<w:spacing w:before="0" w:after="200" /><w:jc w:val="center" />', '<w:color w:val="6B1E2A" /><w:sz w:val="32" /><w:szCs w:val="32" />') +
    '</w:styles>');
  fs.writeFileSync(W('word/styles.xml'), styles);

  // Header / footer parts. First page (the cover) gets empty ones.
  const para = (inner, rPr) => `<w:p><w:pPr><w:jc w:val="center" /></w:pPr>${inner(rPr)}</w:p>`;
  const hdrRPr = `<w:rPr>${GEORGIA}<w:caps /><w:color w:val="A88850" /><w:spacing w:val="40" /><w:sz w:val="15" /></w:rPr>`;
  const ftrRPr = `<w:rPr>${GEORGIA}<w:color w:val="62564F" /><w:sz w:val="19" /></w:rPr>`;
  fs.writeFileSync(W('word/header1.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}>${para((r) => `<w:r>${r}<w:t>The Turn</w:t></w:r>`, hdrRPr)}</w:hdr>`);
  fs.writeFileSync(W('word/footer1.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${para((r) =>
    `<w:r>${r}<w:fldChar w:fldCharType="begin" /></w:r><w:r>${r}<w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r>${r}<w:fldChar w:fldCharType="separate" /></w:r><w:r>${r}<w:t>2</w:t></w:r><w:r>${r}<w:fldChar w:fldCharType="end" /></w:r>`, ftrRPr)}</w:ftr>`);
  fs.writeFileSync(W('word/header2.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}><w:p /></w:hdr>`);
  fs.writeFileSync(W('word/footer2.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p /></w:ftr>`);

  const relT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  let rels = fs.readFileSync(W('word/_rels/document.xml.rels'), 'utf8');
  rels = rels.replace('</Relationships>',
    `<Relationship Type="${relT}/header" Id="rIdHdr1" Target="header1.xml" />` +
    `<Relationship Type="${relT}/header" Id="rIdHdr2" Target="header2.xml" />` +
    `<Relationship Type="${relT}/footer" Id="rIdFtr1" Target="footer1.xml" />` +
    `<Relationship Type="${relT}/footer" Id="rIdFtr2" Target="footer2.xml" /></Relationships>`);
  fs.writeFileSync(W('word/_rels/document.xml.rels'), rels);

  let types = fs.readFileSync(W('[Content_Types].xml'), 'utf8');
  const ct = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
  types = types.replace('</Types>',
    ['header1', 'header2'].map((h) => `<Override PartName="/word/${h}.xml" ContentType="${ct}.header+xml" />`).join('') +
    ['footer1', 'footer2'].map((f) => `<Override PartName="/word/${f}.xml" ContentType="${ct}.footer+xml" />`).join('') +
    '</Types>');
  fs.writeFileSync(W('[Content_Types].xml'), types);

  let doc = fs.readFileSync(W('word/document.xml'), 'utf8');
  if (!/xmlns:r=/.test(doc.slice(0, 2000))) doc = doc.replace('<w:document ', `<w:document xmlns:r="${relT}" `);
  doc = doc.replace(/<w:sectPr>[\s\S]*?<\/w:sectPr>/,
    '<w:sectPr><w:headerReference w:type="default" r:id="rIdHdr1" /><w:headerReference w:type="first" r:id="rIdHdr2" />' +
    '<w:footerReference w:type="default" r:id="rIdFtr1" /><w:footerReference w:type="first" r:id="rIdFtr2" />' +
    '<w:footnotePr><w:numRestart w:val="eachSect" /></w:footnotePr><w:pgSz w:w="12240" w:h="15840" />' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0" />' +
    '<w:titlePg /></w:sectPr>');
  fs.writeFileSync(W('word/document.xml'), doc);

  fs.rmSync(out, { force: true });
  SHELL('zip', ['-q', '-X', '-r', out, '[Content_Types].xml', '_rels', 'docProps', 'word'], dir);
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}

function docxMarkdown({ cupName, cupTagline }, body) {
  const cover = [
    '::: {custom-style="Title"}',
    'The Turn',
    ':::',
    '',
    '::: {custom-style="Subtitle"}',
    'Your cup is turned',
    ':::',
    '',
    '::: {custom-style="Cover Image"}',
    `![${SLOTS.CUP.alt}](images/${SLOTS.CUP.file}){width=3.9in}`,
    ':::',
    '',
    '::: {custom-style="Cover Cup"}',
    `${cupName} — *${cupTagline}*`,
    ':::',
    '',
    '::: {custom-style="Author"}',
    'A tea-leaf reading by Evelyn Cross',
    ':::',
    '',
    '```{=openxml}',
    '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    '```',
    '',
  ].join('\n');
  return cover + body;
}

// ---------------------------------------------------------------- pagination (runs in the browser)

// Every page-opening unit gets its own page: the opening letter, each `##` section,
// each stretch of the twenty-one days (days 1–3 share the page with the "Your
// twenty-one days" intro), and the calendar. A unit that runs a little over one page
// is tightened (body type down to 88%; the calendar to 80%) until it fits, so no page
// is left holding a few stray lines. A unit that cannot fit is left at full size to
// run over two pages, and reported.
function paginate({ pageH }) {
  const kids = [...document.body.children].filter((el) => !el.classList.contains('cover'));
  const groups = [];
  let seenFirstCard = false;
  let seenFirstH2 = false;
  for (const el of kids) {
    const isCard = el.classList.contains('stretch-head');
    // The first `##` ("How a cup is read") follows the short opening letter on the same
    // page — on its own, a short opening leaves page 2 nearly empty.
    const starts =
      !groups.length || (el.tagName === 'H2' && seenFirstH2) || el.classList.contains('calendar') ||
      el.classList.contains('map-figure') ||
      (isCard && seenFirstCard);
    if (isCard) seenFirstCard = true;
    if (el.tagName === 'H2') seenFirstH2 = true;
    if (starts) groups.push([]);
    groups[groups.length - 1].push(el);
  }
  const report = [];
  for (const g of groups) {
    const unit = document.createElement('div');
    const isCal = g[0].classList.contains('calendar');
    unit.className = 'unit' + (isCal ? ' unit-calendar' : '');
    g[0].before(unit);
    for (const el of g) unit.append(el);
    const minFit = isCal ? 0.8 : 0.88;
    const label = (g[0].querySelector('h1,h2,h3') || g[0]).textContent.trim().replace(/\s+/g, ' ').slice(0, 48);
    const height = (f) => {
      unit.style.setProperty('--fit', String(f));
      return unit.getBoundingClientRect().height;
    };
    let fit = 1;
    while (height(fit) > pageH - 4 && fit > minFit + 1e-9) fit = Math.round((fit - 0.01) * 100) / 100;
    let pages = 1;
    if (height(fit) > pageH - 4) {
      fit = 1;
      height(1);
      pages = 2;
    }
    report.push({ label, fit, pages });
  }
  return report;
}

// ---------------------------------------------------------------- main

const cups = process.argv.slice(2).length ? process.argv.slice(2) : ALL_CUPS;
for (const c of cups) must(ALL_CUPS.includes(c), `unknown cup "${c}" (use: ${ALL_CUPS.join(' | ')})`);
fs.mkdirSync(BUILD, { recursive: true });

const referenceDocx = buildReferenceDocx();
const browser = await chromium.launch();
const CONTENT_HEIGHT_PX = 9 * 96; // Letter (11in) minus 1in top + 1in bottom

for (const cup of cups) {
  const src = readCup(cup);
  const body = assembleBody(cup, src);
  fs.writeFileSync(path.join(BUILD, `${cup}.md`), body);

  // ---- PDF (shipping file)
  let bodyHtml = pandoc(['-f', MD_IN, '-t', 'html5', '--wrap=none'], body);
  must(!/<ol|<ul/.test(bodyHtml), `${cup}: pandoc produced a list — a hard-wrapped line starting with a number?`);
  bodyHtml = postProcessHtml(bodyHtml);
  const html = buildHtml(src, bodyHtml);
  const htmlPath = path.join(BUILD, `${cup}.html`);
  fs.writeFileSync(htmlPath, html);

  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready);
  const layout = await page.evaluate(paginate, { pageH: CONTENT_HEIGHT_PX });
  fs.writeFileSync(htmlPath, '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML)));
  const pdfPath = path.join(OUT, `04-the-turn-${cup}.pdf`);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
  await page.close();

  // ---- DOCX (editable twin)
  const docxPath = path.join(OUT, `04-the-turn-${cup}.docx`);
  pandoc(['-f', MD_IN, '-t', 'docx', `--reference-doc=${referenceDocx}`, `--resource-path=${PRODUCT}`, '-o', docxPath],
    docxMarkdown(src, body));

  console.log(`✔ ${cup}: ${path.relative(process.cwd(), pdfPath)} + .docx`);
  for (const u of layout) {
    if (u.fit !== 1 || u.pages > 1) console.log(`    ${u.pages > 1 ? '⚠ spans 2 pages' : 'tightened'}: ${u.label} → type ${Math.round(u.fit * 100)}%`);
  }
}
await browser.close();

// ---- the gate (B7): text grep, calendar placement, layout heuristics, page PNGs, contact sheet
try {
  execFileSync('python3', [path.join(HERE, 'check-04-pdf.py'), ...cups], { stdio: 'inherit' });
} catch (e) {
  fail('gate failed — see above');
}
