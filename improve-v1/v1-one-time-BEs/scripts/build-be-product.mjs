#!/usr/bin/env node
// Assemble a backend offer's PRODUCT and convert it to a Word document.
//
//   node improve-v1/v1-one-time-BEs/scripts/build-be-product.mjs 02
//   node improve-v1/v1-one-time-BEs/scripts/build-be-product.mjs 02 --md-only
//
// Workflow: improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md — Phase B, steps B4 and B5.
//
// ── What it does ─────────────────────────────────────────────────────────────────
// The copy spec IS the source. There is deliberately no second copy of the words, so
// this script does the four mechanical jobs that stand between the spec and a document:
//
//   1. strips the spec's own scaffolding — the metadata table at the top and the build
//      notes at the bottom are notes to us, not words for the buyer;
//   2. inlines the FREE GIFT at its marker, because the gift is a second act of the same
//      document and never a separate send (00e §6c);
//   3. replaces every [IMG-…] token with the real card, from the public-domain deck we
//      already hold in assets/tarot-rws/;
//   4. puts a page break before every section, so twelve houses are twelve openings.
//
// Then pandoc turns it into a .docx a human can open and adjust.
//
// ── D7: ONE PDF FOR EVERYONE ─────────────────────────────────────────────────────
// Decided 2026-08-13 (operator). The document therefore carries NO merge tokens — the
// personal address lives in the covering email instead. This script FAILS if it finds a
// %TOKEN% surviving, because a printed "%FIRSTNAME%" is the one defect a buyer cannot
// un-see, and one document reaches every buyer at once.
//
// ⛔ It also fails on a surviving [IMG-…], for the same reason: a missing card is a hole
// in the middle of the thing she paid for. Both are B7 gate items, enforced here rather
// than left to somebody's eyes at the end.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DECK = path.join(ROOT, 'improve-v1/v1-one-time-BEs');
const CARDS = path.join(ROOT, 'assets/tarot-rws');

// ── Per-offer config. A new offer is a row here, not a new script. ───────────────
const OFFERS = {
  '02': {
    name: 'Twin Flame Tarot',
    // What the DOCUMENT is called. ⚠ Not the email subject — that one still merges
    // her first name and must keep matching 02-T1/02-T3/02-T4 word for word.
    title: 'Your twelve are laid',
    // ⚠ No subtitle line: the spread wheel on the cover carries its own title and
    // standfirst in the middle of it, and printing the same words twice on one page
    // reads as a mistake.
    subtitle: null,
    product: 'copy/02/02-P1-the-twelve.md',
    gift: 'copy/02/02-P3-attention-ledger.md',
    // Where the gift is spliced in, and where its own copy starts.
    giftMarker: '[02-P3 — the twenty-eight-night attention ledger renders here, as the second act]',
    giftStartsAt: '### And now the second part',
    // A page break goes before every heading that matches this.
    sectionHeading: /^## House \d+/,
    // The SPREAD is the cover — `make-zodiac-spread.mjs` draws it from the same
    // house→card table the copy is written against.
    //
    // ⛔ Not the face-down fan. A fanned, face-down deck says "not yet turned", which
    // is the booking page's job, not the delivered reading's — she has paid and they
    // ARE turned. It also does the one thing an ecover cannot: it PROVES there is a
    // spread, on the page she opens first, and doubles as the map she flips back to.
    // Path is relative to the deck root, not to the card folder.
    cover: 'assets/02-zodiac-spread.png',
    // ⛔ Slugs are NOT what you would guess: most majors carry a `the-` prefix, and
    // `judgement` is spelled the British way in the deck we hold.
    images: {
      'IMG-MAGICIAN':   ['the-magician',       'The Magician'],
      'IMG-WHEEL':      ['wheel-of-fortune',   'The Wheel of Fortune'],
      'IMG-HIEROPHANT': ['the-hierophant',     'The Hierophant'],
      'IMG-TEMPERANCE': ['temperance',         'Temperance'],
      'IMG-CHARIOT':    ['the-chariot',        'The Chariot'],
      'IMG-STRENGTH':   ['strength',           'Strength'],
      'IMG-HANGEDMAN':  ['the-hanged-man',     'The Hanged Man'],
      'IMG-DEATH':      ['death',              'Death — the Nameless One'],
      'IMG-JUSTICE':    ['justice',            'Justice'],
      'IMG-JUDGMENT':   ['judgement',          'Judgement'],
      'IMG-DEVIL':      ['the-devil',          'The Devil'],
      'IMG-PRIESTESS':  ['the-high-priestess', 'The High Priestess'],
    },
  },
};

// Card width on the page. The source art is 350×600, so 2.2in lands at ~159dpi —
// sharp on screen and fine from a home printer, short of press quality. Going wider
// buys size at the cost of softness; going narrower makes the payoff look mean.
const CARD_WIDTH = '1.9in';  // ⚠ 2.2in left House 1 spilling three lines onto an otherwise blank page; 1.9in also lifts the art to ~184dpi
const COVER_WIDTH = '5.5in';   // the spread is square; 5.5in leaves room for the title beneath it

/** A Word page break, as raw OOXML pandoc passes straight through. */
const PAGE_BREAK = '```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```';

function die(message) {
  console.error(`\n  ⛔ ${message}\n`);
  process.exit(1);
}

/** Everything between the document's own H1 and its build notes — the buyer's half. */
function bodyOf(markdown, startsWith) {
  const lines = markdown.split('\n');
  const from = lines.findIndex((l) => l.startsWith(startsWith));
  if (from === -1) die(`could not find the start of the copy ("${startsWith}")`);
  let to = lines.findIndex((l, i) => i > from && l.startsWith('## Build notes'));
  if (to === -1) to = lines.length;
  return lines.slice(from, to).join('\n').trim();
}

function build(offerKey) {
  const offer = OFFERS[offerKey];
  if (!offer) die(`no config for offer ${offerKey}. Add a row to OFFERS.`);

  const productPath = path.join(DECK, offer.product);
  const giftPath = path.join(DECK, offer.gift);
  for (const p of [productPath, giftPath]) {
    if (!existsSync(p)) die(`missing copy: ${path.relative(ROOT, p)}`);
  }

  // 1 · the buyer's half of each spec.
  // ⚠ Start at the DOCUMENT's own H1, not the first `# ` in the file — that one is the
  // spec's title, and everything under it (the metadata table, the structural-fix note)
  // is written to us, not to her. Getting this wrong drags %FIRSTNAME% and a pile of
  // build commentary into the product; the token gate below caught exactly that.
  let body = bodyOf(readFileSync(productPath, 'utf8'), `# ${offer.title}`);
  const gift = bodyOf(readFileSync(giftPath, 'utf8'), offer.giftStartsAt);

  // The H1 becomes the title page, set below — not a heading in the flow.
  body = body.replace(/^#[^\n]*\n/, '').trim();

  // The specs carry <!-- BEAT n · … --> markers naming the device each passage runs.
  // They are notes to whoever is writing, and they must never reach a buyer. Pandoc's
  // docx writer drops raw HTML anyway; stripping them here means the assembled markdown
  // is also readable as the product, which is what anybody proofing it wants.
  body = body.replace(/<!--[\s\S]*?-->\n?/g, '');

  // 2 · the gift, spliced in as the second act
  if (!body.includes(offer.giftMarker)) die('the gift marker is not in the product copy');
  body = body.replace('`' + offer.giftMarker + '`', `${PAGE_BREAK}\n\n${gift}`);

  // 3 · the cards
  const missing = [];
  body = body.replace(/`\[(IMG-[A-Z]+)\]`/g, (_, token) => {
    const entry = offer.images[token];
    if (!entry) { missing.push(`${token} — no slug mapped`); return `[${token}]`; }
    const [slug] = entry;
    const file = path.join(CARDS, `${slug}.png`);
    if (!existsSync(file)) { missing.push(`${token} → ${slug}.png not on disk`); return `[${token}]`; }
    // ⛔ NO alt text, deliberately. Pandoc promotes an image WITH alt to a figure and
    // prints the alt as a visible caption — so the first proof read "The Magician" in
    // italics directly beneath a heading that had just said "the Magician". The
    // heading names every card already; a caption is duplication, and the figure
    // wrapper is what drew corner marks around the picture.
    return `![](${file}){width=${CARD_WIDTH}}`;
  });
  if (missing.length) die(`cards could not be placed:\n     ${missing.join('\n     ')}`);

  // 4 · one house, one opening
  body = body
    .split('\n')
    .flatMap((line) => (offer.sectionHeading.test(line) ? [PAGE_BREAK, '', line] : [line]))
    .join('\n');

  // ── 4b · the two things the specs leave behind ────────────────────────────────
  // Both of these reached a printed proof before anybody noticed. Line-based, because
  // the first attempt was `body.replace(/\n---\n/g, '\n')` and the LAST rule in the
  // document has no newline after it — `bodyOf` trims — so it survived to the final
  // page, under Evelyn's signature, looking like a mark on the paper.
  const cleaned = [];
  body = body
    .split('\n')
    .filter((line) => {
      // The spec uses --- as a scene rule between houses. With a page break before
      // every house it is a stray line at the foot of a page.
      if (line.trim() === '---') return false;
      return true;
    })
    .map((line) => {
      // ⚠ / ⛔ / 🔴 at the head of a line are notes to WHOEVER IS WRITING, and the
      // specs are full of them. Where the marker sits on a real sentence of copy the
      // sentence must stay and the marker must go — 02's gift shipped a proof with
      // "⚠ Your reading said the first sign shows itself inside five to seven days",
      // a yellow warning triangle in the middle of a psychic reading.
      const stripped = line.replace(/^\s*(?:⚠|⛔|🔴|📎|⚡|🙋)\s+/, '');
      if (stripped !== line) cleaned.push(stripped.slice(0, 64));
      return stripped;
    })
    .join('\n');
  if (cleaned.length) {
    console.log(`    ⚠ ${cleaned.length} spec marker(s) stripped from the copy:`);
    cleaned.forEach((l) => console.log(`        "${l}…"`));
    console.log(`      Check each is a real sentence, not a note that should be deleted.`);
  }

  // 5 · the title page
  const coverFile = path.join(DECK, offer.cover);
  if (!existsSync(coverFile)) {
    die(`cover image missing: ${offer.cover}\n` +
        `     If this is the spread, draw it first:\n` +
        `       node improve-v1/v1-one-time-BEs/scripts/make-zodiac-spread.mjs ${offerKey}`);
  }
  const cover = [
    `![](${coverFile}){width=${COVER_WIDTH}}`,
    '',
    `# ${offer.title}`,
    ...(offer.subtitle ? ['', `*${offer.subtitle}*`] : []),
    '',
    '**Evelyn Cross** · The Seer Within',
    '',
    PAGE_BREAK,
    '',
  ].join('\n');

  const assembled = `${cover}\n${body}\n`;

  // ── The two gate checks that cannot wait until B7 ──────────────────────────────
  const tokens = assembled.match(/%[A-Z_]+%/g);
  if (tokens) {
    die(`merge tokens survived into a document that reaches EVERY buyer: ${[...new Set(tokens)].join(', ')}\n` +
        `     D7 is "one PDF for everyone" — the personal address belongs in the covering email.`);
  }
  const orphans = assembled.match(/\[IMG-[A-Z]+\]/g);
  if (orphans) die(`unreplaced image tokens: ${[...new Set(orphans)].join(', ')}`);

  // 6 · write it out
  const outDir = path.join(DECK, 'build', offerKey);
  mkdirSync(outDir, { recursive: true });
  const mdOut = path.join(outDir, `${offerKey}-product.md`);
  writeFileSync(mdOut, assembled);

  const words = assembled.split(/\s+/).filter(Boolean).length;
  console.log(`\n  ${offer.name} — assembled`);
  console.log(`    ${Object.keys(offer.images).length} cards placed · gift inlined · ~${words} words`);
  console.log(`    ${path.relative(ROOT, mdOut)}`);

  if (process.argv.includes('--md-only')) return;

  // 7 · pandoc → Word
  const docxOut = path.join(outDir, `${offerKey}-product.docx`);
  const reference = path.join(DECK, 'assets/be-reference.docx');
  const args = ['-f', 'markdown', '-t', 'docx', '--resource-path', CARDS, mdOut, '-o', docxOut];
  if (existsSync(reference)) {
    args.push(`--reference-doc=${reference}`);
  } else {
    console.log(`    ⚠ no reference doc at ${path.relative(ROOT, reference)} — using pandoc's defaults.`);
    console.log(`      Styles, fonts, margins, page numbers and the running header live in THAT file.`);
  }
  try {
    execFileSync('pandoc', args, { stdio: 'pipe' });
  } catch (err) {
    die(`pandoc failed:\n     ${err.stderr?.toString() || err.message}`);
  }
  console.log(`    ${path.relative(ROOT, docxOut)}\n`);
}

const offerKey = process.argv[2];
if (!offerKey || offerKey.startsWith('--')) {
  console.error('\n  usage: build-be-product.mjs <offer>   e.g. 02\n');
  process.exit(1);
}
build(offerKey);
