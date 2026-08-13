#!/usr/bin/env node
// Build the deck's Word REFERENCE DOCUMENT — where the page design lives.
//
//   node improve-v1/v1-one-time-BEs/scripts/make-be-reference-docx.mjs
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase B, step B5,
// "page design to settle once, then reuse".
//
// ── What a reference doc is ──────────────────────────────────────────────────────
// pandoc does not take fonts, margins or page size as options for Word output. It
// copies them from a reference .docx. So the entire look of every backend product —
// all four offers — is decided by ONE file, and this script builds it.
//
// ⚠ It writes assets/be-reference.docx. Anyone may then open that file in Word and
// adjust it by hand; nothing here needs re-running afterwards, and re-running WOULD
// discard those adjustments. That is the point of D7 (one PDF for everyone): the Word
// pass is a design step done once, not a step in every order.
//
// ── What it sets, and why ────────────────────────────────────────────────────────
//   · US Letter, 1in margins       a reading is read, not skimmed; A4 prints wrong on
//                                  US printers and most buyers are there
//   · serif body at 12pt/1.4       it is a reading, not a dashboard
//   · serif headings, no colour    the cards carry the colour; the type stays quiet
//   · a centred page number        support will be asked "page 9 says…" a month later
//   · widow/orphan control on      B7 rejects an orphan line on a final page, and
//                                  fixing those by hand across 20 pages is miserable
//
// Fonts are named rather than themed so the file behaves the same on a machine that
// has never opened our theme. Georgia ships with both Word and macOS.

import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DECK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(DECK, 'assets/be-reference.docx');

const BODY_FONT = 'Georgia';
const HEADING_FONT = 'Georgia';
const INK = '2A2622';   // warm near-black. ⛔ no leading # — Word wants a bare hex

// Word measures in twentieths of a point. 1440 = one inch.
const INCH = 1440;
const PAGE = { w: 12240, h: 15840 };  // US Letter, portrait

function patch(file, from, to) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(from, to);
  if (after === before) {
    console.error(`\n  ⛔ patch did not apply in ${path.basename(file)} — pandoc's default template changed.\n`);
    process.exit(1);
  }
  writeFileSync(file, after);
}

const work = mkdtempSync(path.join(tmpdir(), 'be-ref-'));
try {
  // 1 · start from pandoc's own default, so every style id it writes exists here
  const base = path.join(work, 'base.docx');
  execSync(`pandoc --print-default-data-file reference.docx > "${base}"`, { shell: '/bin/bash' });
  const x = path.join(work, 'x');
  mkdirSync(x);
  execFileSync('unzip', ['-o', '-q', base, '-d', x]);

  const doc = path.join(x, 'word/document.xml');
  const styles = path.join(x, 'word/styles.xml');

  // 2 · page size, margins, and the footer that carries the page number
  patch(
    doc,
    /<w:sectPr>[\s\S]*?<\/w:sectPr>/,
    `<w:sectPr>` +
      `<w:footerReference w:type="default" r:id="rIdBeFooter"/>` +
      `<w:pgSz w:w="${PAGE.w}" w:h="${PAGE.h}"/>` +
      `<w:pgMar w:top="${INCH}" w:right="${INCH}" w:bottom="${INCH}" w:left="${INCH}" ` +
      `w:header="720" w:footer="720" w:gutter="0"/>` +
      `<w:footnotePr><w:numRestart w:val="eachSect"/></w:footnotePr>` +
    `</w:sectPr>`,
  );

  // 3 · the footer itself — centred page number, quiet, small
  writeFileSync(
    path.join(x, 'word/footer1.xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:p><w:pPr><w:jc w:val="center"/><w:rPr>` +
        `<w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}"/><w:sz w:val="18"/>` +
        `<w:color w:val="7A7A7A"/></w:rPr></w:pPr>` +
      `<w:r><w:rPr><w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}"/>` +
        `<w:sz w:val="18"/><w:color w:val="7A7A7A"/></w:rPr>` +
        `<w:fldChar w:fldCharType="begin"/></w:r>` +
      `<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>` +
      `<w:r><w:fldChar w:fldCharType="end"/></w:r>` +
    `</w:p></w:ftr>`,
  );

  patch(
    path.join(x, 'word/_rels/document.xml.rels'),
    /<\/Relationships>/,
    `<Relationship Id="rIdBeFooter" ` +
      `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" ` +
      `Target="footer1.xml"/></Relationships>`,
  );

  patch(
    path.join(x, '[Content_Types].xml'),
    /<\/Types>/,
    `<Override PartName="/word/footer1.xml" ` +
      `ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`,
  );

  // 4 · the body face, line height, and widow/orphan control, set once at the root
  patch(
    styles,
    /<w:rFonts w:asciiTheme="minorHAnsi"[^/]*\/>/,
    `<w:rFonts w:ascii="${BODY_FONT}" w:hAnsi="${BODY_FONT}" w:cs="${BODY_FONT}"/>`,
  );
  patch(
    styles,
    /<w:pPrDefault>\s*<w:pPr>\s*<w:spacing w:after="200" \/>\s*<\/w:pPr>\s*<\/w:pPrDefault>/,
    `<w:pPrDefault><w:pPr>` +
      `<w:widowControl w:val="true"/>` +
      `<w:spacing w:after="180" w:line="336" w:lineRule="auto"/>` +
    `</w:pPr></w:pPrDefault>`,
  );

  // 5 · headings in the same serif and the same ink, so the document reads as one voice.
  //
  // 🔴 THIS IS THE ONE THAT LOOKED WRONG IN THE FIRST PROOF. pandoc's default reference
  // sets every heading to the Word THEME's major font (a sans) and to accent-blue
  // (#0F4761). Body text was Georgia and the headings were blue Aptos — so a reading
  // from a psychic opened looking like a quarterly report. Nobody would have caught it
  // from the .docx alone; it took exporting a PDF and looking at page one.
  //
  // ⚠ Patched by value, not by style id, because the same two declarations appear in
  // every Heading style and in their linked character styles. The XML is pretty-printed,
  // hence the tolerant whitespace.
  let s = readFileSync(styles, 'utf8');
  const before = s;
  s = s.replace(
    /<w:rFonts\s+w:asciiTheme="majorHAnsi"[\s\S]*?\/>/g,
    `<w:rFonts w:ascii="${HEADING_FONT}" w:hAnsi="${HEADING_FONT}" w:cs="${HEADING_FONT}"/>`,
  );
  s = s.replace(
    /<w:color\s+w:val="0F4761"[\s\S]*?\/>/g,
    `<w:color w:val="${INK}"/>`,
  );
  if (s === before) {
    console.error(`\n  ⛔ heading patch did not apply — pandoc's default template changed.\n`);
    process.exit(1);
  }
  writeFileSync(styles, s);
  // ⚠ pandoc's own defaults already carry keepNext/keepLines on every Heading, so a
  // patch adding them was duplicating elements. Left to pandoc.

  // 6 · zip it back up. mimetype ordering does not matter for docx, unlike epub.
  if (existsSync(OUT)) rmSync(OUT);
  mkdirSync(path.dirname(OUT), { recursive: true });
  execFileSync('zip', ['-q', '-r', '-X', OUT, '.'], { cwd: x });

  console.log(`\n  reference document written`);
  console.log(`    ${path.relative(path.resolve(DECK, '../..'), OUT)}`);
  console.log(`    US Letter · 1in margins · ${BODY_FONT} 12pt/1.4 · centred page number`);
  console.log(`    headings keep with the card that follows them\n`);
  console.log(`  Next: rebuild the product so it picks this up —`);
  console.log(`    node improve-v1/v1-one-time-BEs/scripts/build-be-product.mjs 02\n`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
