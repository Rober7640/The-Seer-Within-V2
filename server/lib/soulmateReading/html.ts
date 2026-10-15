// The reading as a self-contained, print-ready HTML document.
//
// One cover, then three parts (the reading + the seven-card spread, the
// portrait, the two bonuses), each with its own title page. Pure string
// builder — all images arrive pre-resolved as data URIs (or null → a styled
// placeholder), so the document never depends on a live network at print time.

import type { ReadingNumbers } from './numbers';
import type { ResolvedInitials } from './initials';
import type { DrawnCard } from './draw';
import type { ReadingProse } from './content';

export interface ReadingHtmlInput {
  firstName: string;
  stone: string;
  numbers: ReadingNumbers;
  initials: ResolvedInitials;
  draw: DrawnCard[];
  prose: ReadingProse;
  /** slug → data URI (base64 jpg) or null when the art could not be fetched. */
  cardImages: Record<string, string | null>;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Turn prose (paragraphs split by blank lines) into <p> blocks. */
function paras(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function cardFigure(card: DrawnCard, dataUri: string | null): string {
  const art = dataUri
    ? `<img class="card-img" src="${dataUri}" alt="${esc(card.card)}"/>`
    : `<div class="card-img card-placeholder"><span>${esc(card.card)}</span></div>`;
  return `<figure class="card">
    ${art}
    <figcaption>
      <span class="card-pos">${card.position}</span>
      <span class="card-q">${esc(card.question)}</span>
      <span class="card-name">${esc(card.card)}</span>
    </figcaption>
  </figure>`;
}

export function buildReadingHtml(input: ReadingHtmlInput): string {
  const { firstName, stone, initials, draw, prose, cardImages } = input;
  const spread = draw.map((c) => cardFigure(c, cardImages[c.slug] ?? null)).join('\n');

  const stoneSection = prose.stonePage
    ? `<section class="part">
        <div class="part-title"><h2>Your ${esc(stone)}, Charged</h2></div>
        ${paras(prose.stonePage)}
      </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(firstName)}'s Soulmate Initials Reading</title>
<style>
  @page { size: A4; margin: 24mm; }
  * { box-sizing: border-box; }
  html { margin: 0; padding: 0; background: #ffffff; }
  body {
    margin: 0; padding: 0;
    font-family: Georgia, 'Times New Roman', serif;
    color: #2b2240; background: #ffffff;
    font-size: 12.5pt; line-height: 1.7;
  }
  p { margin: 0 0 0.9em; text-align: justify; hyphens: auto; }
  h1, h2 { font-weight: normal; letter-spacing: 0.02em; }

  .cover {
    /* The one cream page: a framed panel filling the cover's content box, with
       the @page margin as its white border. Content pages stay plain white. */
    min-height: 244mm; background: #fbf7f0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    page-break-after: always;
  }
  .cover .mark { font-size: 15pt; letter-spacing: 0.5em; color: #a8863f; text-transform: uppercase; }
  .cover h1 { font-size: 34pt; margin: 0.4em 0 0.1em; color: #3a2b5c; }
  .cover .for { font-style: italic; font-size: 16pt; color: #6b5e86; }
  .cover .name { font-size: 26pt; color: #3a2b5c; margin-top: 0.1em; }
  .cover .stone { margin-top: 2em; font-size: 12pt; color: #8a7bab; letter-spacing: 0.08em; }
  .cover .rule { width: 64px; height: 2px; background: #a8863f; margin: 1.6em auto; }

  .part { page-break-before: always; }
  .part-title { text-align: center; margin: 0 0 1.6em; }
  .part-title h2 { font-size: 23pt; color: #3a2b5c; margin: 0; }
  .part-title .sub { font-style: italic; color: #8a7bab; font-size: 12pt; }
  .part-title::after { content: ""; display: block; width: 56px; height: 2px; background: #a8863f; margin: 0.8em auto 0; }

  .spread { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 0 0 1.4em; }
  .card { margin: 0; text-align: center; page-break-inside: avoid; }
  .card-img { width: 100%; height: auto; border-radius: 6px; box-shadow: 0 2px 8px rgba(58,43,92,0.25); display: block; }
  .card-placeholder {
    aspect-ratio: 11/19; background: linear-gradient(160deg,#efe7f7,#e3d8f0);
    border: 1px solid #c9b8e0; display: flex; align-items: center; justify-content: center; padding: 8px;
  }
  .card-placeholder span { font-style: italic; color: #6b5e86; font-size: 10pt; }
  figcaption { display: flex; flex-direction: column; margin-top: 6px; }
  .card-pos { font-size: 9pt; color: #a8863f; letter-spacing: 0.15em; }
  .card-q { font-size: 9.5pt; color: #6b5e86; font-style: italic; min-height: 2.4em; }
  .card-name { font-size: 10.5pt; color: #3a2b5c; }

  .initials-note { text-align: center; font-size: 13pt; color: #3a2b5c; margin: 0 0 1.4em; }
  .initials-note b { color: #a8863f; letter-spacing: 0.1em; }

  .footer-note { margin-top: 2.2em; padding-top: 1em; border-top: 1px solid #e0d5c4;
    font-size: 9pt; color: #9a8fb0; font-style: italic; text-align: center; }
</style>
</head>
<body>
  <div class="cover">
    <div class="mark">The Seer Within</div>
    <h1>Soulmate Initials</h1>
    <div class="for">a reading for</div>
    <div class="name">${esc(firstName)}</div>
    <div class="rule"></div>
    <div class="stone">your stone · ${esc(stone)}</div>
  </div>

  <section class="part">
    <div class="part-title"><h2>Your Soulmate Initials Reading</h2><div class="sub">seven cards, one story</div></div>
    <p class="initials-note">His initials come through as <b>${esc(initials.first)}</b> &middot; <b>${esc(initials.last)}</b></p>
    <div class="spread">${spread}</div>
    ${paras(prose.reading)}
  </section>

  <section class="part">
    <div class="part-title"><h2>Your Soulmate Portrait</h2><div class="sub">who he is, beneath the surface</div></div>
    ${paras(prose.portrait)}
  </section>

  <section class="part">
    <div class="part-title"><h2>Bonus · Your Heart Block Reading</h2></div>
    ${paras(prose.heartBlock)}
  </section>

  <section class="part">
    <div class="part-title"><h2>Bonus · Your Past Love Reading</h2></div>
    ${paras(prose.pastLove)}
  </section>

  ${stoneSection}

  <div class="footer-note">This reading is offered for reflection and entertainment. It speaks in tendencies, not certainties, and makes no guarantees. With warmth — Evelyn Cross.</div>
</body>
</html>`;
}
