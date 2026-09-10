/**
 * 07 — THE REPORT. One design, every spread, every rung.
 *
 *   import { renderReport, parseReading, CARD_IMG } from './07-report-template.mjs';
 *   const { html } = renderReport(verdict);
 *
 * ⭐ WHAT THIS FILE IS. The whole printed object a buyer receives, in one function. It is
 *    written to be pasted into n8n node `10a · Build the HTML` with two changes and no
 *    others: swap the `export` keywords off, and read `v` from `$('8a · Read the verdict')`
 *    instead of an argument. Nothing else here touches n8n.
 *    ⛔ scripts/build-07-n8n.py is owned by another agent. This file does not edit it.
 *
 * ⭐ THE DESIGN, IN ONE LINE. She paid for an answer, so the answer is page two, printed as
 *    an object, before any of the working — and the cut she was sold in the morning letter
 *    is page three, drawn as a table she can see.
 *
 * ⛔ THE ART RULE THIS FILE ENFORCES. A card image is ALWAYS the upright scan. A reversed
 *    card is that scan turned 180 degrees in CSS, which is what reversed means at a real
 *    table. Nothing ever requests a `-reversed` filename, so the missing-minor-scan 404
 *    cannot happen on any of the 78 cards in either state.
 *
 * ⛔ IT THROWS ON A MARKER IT DOES NOT KNOW. The old node dropped unmatched text silently —
 *    that is how the opening went missing from a PDF somebody had paid for. A reading that
 *    does not parse must fail loudly, upstream, where a person can see it.
 */

/* ────────────────────────────────────────────────────────────────────────────
   1 · card art
   ──────────────────────────────────────────────────────────────────────────── */

export const DECK = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/evelyn/tarot-rws/';
export const MARCUS = 'https://luna-assets-tsw.s3.ap-southeast-2.amazonaws.com/marcus/';

/** ⛔ The deck's filenames are not always the card's spoken name. A wrong slug is a 403 and
 *  a blank rectangle in a paid PDF, so every known mismatch is fixed here rather than in a
 *  prompt, where it would have to be remembered seventy-eight times a week. */
const ALIAS = {
  'the wheel of fortune': 'wheel-of-fortune',
  'wheel of fortune': 'wheel-of-fortune',
  'judgment': 'judgement',
  'the judgement': 'judgement',
  'the judgment': 'judgement',
  'the strength': 'strength',
  'the justice': 'justice',
  'the temperance': 'temperance',
  'the death': 'death',
};

export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "The Empress (reversed)" -> { name:'The Empress', reversed:true, url:'…/the-empress.jpg' } */
export function card(raw) {
  const t = String(raw || '').trim();
  const reversed = /\(\s*reversed\s*\)\s*$/i.test(t);
  const name = t.replace(/\(\s*reversed\s*\)\s*$/i, '').trim();
  const key = name.toLowerCase();
  return { name, reversed, url: DECK + (ALIAS[key] || slug(name)) + '.jpg' };
}

export const CARD_IMG = (raw, cls = '') => {
  const c = card(raw);
  return `<img class="card${c.reversed ? ' rev' : ''}${cls ? ' ' + cls : ''}" src="${c.url}" alt="${esc(c.name)}">`;
};

/* ────────────────────────────────────────────────────────────────────────────
   2 · the marker parser
   ──────────────────────────────────────────────────────────────────────────── */

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Curly quotes and en-dashes, because a PDF is typeset and an apostrophe is visible at 11pt. */
const typo = (s) => esc(s)
  .replace(/(\w)'(\w)/g, '$1’$2')
  .replace(/(^|[\s(])"/g, '$1“').replace(/"/g, '”')
  .replace(/(^|[\s(])'/g, '$1‘').replace(/'/g, '’')
  .replace(/ - /g, ' — ');

const paras = (t, cls = '') => String(t || '').trim().split(/\n\s*\n/).filter(Boolean)
  .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${typo(p.trim().replace(/\s*\n\s*/g, ' '))}</p>`).join('\n');

const firstPara = (t) => String(t || '').trim().split(/\n\s*\n/).filter(Boolean)[0] || '';
const restParas = (t) => String(t || '').trim().split(/\n\s*\n/).filter(Boolean).slice(1).join('\n\n');

/**
 * A marker is a whole line, wrapped in square brackets. Everything between two markers is
 * prose. That is the entire format.
 */
export function parseReading(text) {
  const out = [];
  let cur = { type: 'lede', text: '' };
  const push = () => { if (cur.type !== 'lede' || cur.text.trim()) out.push(cur); };

  for (const line of String(text || '').split('\n')) {
    const m = line.trim().match(/^\[(.+)\]$/);
    if (!m) { cur.text += line + '\n'; continue; }
    push();
    cur = classify(m[1].trim());
  }
  push();
  return out;
}

function classify(inner) {
  const b = (o) => ({ ...o, text: '' });
  let m;
  if ((m = inner.match(/^answer\s+(\d+)\s*[·|]\s*([\s\S]+)$/i)))
    return b({ type: 'answer', n: Number(m[1]), question: m[2].trim() });
  if (/^the answer$/i.test(inner)) return b({ type: 'verdict' });
  if ((m = inner.match(/^back to the table\s*[·|]\s*(.+)$/i)))
    return b({ type: 'turn', card: m[1].trim() });
  if (/^keep$/i.test(inner)) return b({ type: 'keep' });
  if (/^the three together$/i.test(inner)) return b({ type: 'together' });
  if (/^close$/i.test(inner)) return b({ type: 'close' });
  if ((m = inner.match(/^([\d]+(?:\.[\d]+)?)\s*[·|]\s*([^·|]+?)\s*[·|]\s*(.+)$/)))
    return b({ type: 'position', number: m[1], name: m[2].trim(), card: m[3].trim() });

  // ⛔ Loud, on purpose. A marker we cannot read is content the buyer paid for and would
  //    otherwise never see. This is the bug class that put a reading in a PDF with its
  //    opening deleted, and nobody noticed until a real page was rendered.
  throw new Error(`07-report: unknown marker [${inner}]`);
}

/* ────────────────────────────────────────────────────────────────────────────
   3 · small print helpers
   ──────────────────────────────────────────────────────────────────────────── */

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const DATE = (d) => { const [y, mo, dd] = String(d).split('-').map(Number);
  return `${dd} ${MONTHS[(mo || 1) - 1]} ${y}`; };

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen', 'twenty'];
const numWord = (n) => (n <= 20 ? WORDS[n] : String(n));
const ORD = ['', 'first', 'second', 'third'];

/* ────────────────────────────────────────────────────────────────────────────
   4 · the report
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * @param v {object}  the verdict. Everything personal lives in this object and nowhere else.
 *   order_id, first_name, questions[], tier, tier_label, price_usd, spread_name, spread_key,
 *   draw_date, day_cards[{number,name,card_name,reversed,free}],
 *   open_cards[{number,name,card_name,reversed,answer}], reading
 * @returns {{ html:string, pdfFileName:string, pages:object }}
 */
export function renderReport(v) {
  const qs = (v.questions && v.questions.length ? v.questions : [v.question]).filter(Boolean);
  const day = v.day_cards || [];
  const open = v.open_cards || [];
  const freeCards = day.filter((c) => c.free);
  const paidCards = day.filter((c) => !c.free);
  const blocks = parseReading(v.reading);

  /* ── the verdicts, lifted out for page two ─────────────────────────────────
     ⭐ This is the whole point of the redesign. The flat answer to each question is
        printed as the front matter, before a word of the working. Today it is a sentence
        buried on page two of six and she has to hunt for it. */
  const verdicts = [];
  let seen = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'answer') seen = blocks[i].n;
    if (blocks[i].type === 'verdict') verdicts[seen - 1 || 0] = blocks[i].text;
  }

  /* ── page 2 ─────────────────────────────────────────────────────────────── */
  const answersPage = `
  <section class="page front q${qs.length}">
    <p class="eyebrow">${qs.length > 1 ? `The ${numWord(qs.length)} answers` : 'The answer'}</p>
    <h1 class="display">What you asked me,<br>and what I said</h1>
    <p class="standfirst">Everything after this page is the working. If you read nothing else,
      read this.</p>
    <div class="receipt">
      <div><b>The spread</b>${esc(v.spread_name)}</div>
      <div><b>Cut on</b>${DATE(v.draw_date)}</div>
      <div><b>Cards on the table</b>${day.length + open.length}</div>
      <div><b>Questions answered</b>${qs.length}</div>
    </div>
    ${qs.map((q, i) => `
    <div class="qa">
      <p class="label">${qs.length > 1 ? `Your ${ORD[i + 1]} question` : 'Your question'}</p>
      <blockquote class="asked">${typo(q)}</blockquote>
      <div class="verdict">
        <p class="label gold">What the cards say</p>
        ${paras(verdicts[i] || '')}
      </div>
    </div>`).join('')}
  </section>`;

  /* ── page 3 · the table ──────────────────────────────────────────────────
     ⭐ The morning letter sells a photograph of a cut with most of it face down. Until now
        the paid report never showed the table at all — she went from a picture of a spread
        to six thumbnails floated beside text. This page is the thing she was sold. */
  const plate = (c, tag) => `
    <figure class="plate${tag ? ' tagged' : ''}">
      ${CARD_IMG(c.card_name + (c.reversed ? ' (reversed)' : ''))}
      <figcaption>
        <span class="n">${esc(String(c.number))}</span>
        <span class="pos">${esc(c.name)}</span>
        <span class="cn">${esc(c.card_name)}${c.reversed ? ' <i>reversed</i>' : ''}</span>
        ${tag ? `<span class="tag">${tag}</span>` : ''}
      </figcaption>
    </figure>`;

  const openByAnswer = {};
  open.forEach((c) => (openByAnswer[c.answer] ||= []).push(c));

  const lede = [
    `${numWord(day.length + open.length).replace(/^\w/, (s) => s.toUpperCase())} cards came off one cut on ${DATE(v.draw_date)}.`,
    `${numWord(freeCards.length).replace(/^\w/, (s) => s.toUpperCase())} of them you saw in the letter.`,
    `${numWord(paidCards.length).replace(/^\w/, (s) => s.toUpperCase())} went face down until you asked.`,
    open.length
      ? `And ${numWord(open.length)} came off the same cut with no positions on them at all. Where those went was decided by what you asked me, and not before.`
      : '',
  ].filter(Boolean).join(' ');

  const tablePage = `
  <section class="page front">
    <p class="eyebrow">The cut</p>
    <h1 class="display">The table, as it lies</h1>
    <p class="standfirst">${typo(lede)}</p>
    <div class="group">
      <p class="grouphead">${esc(v.spread_name)} <span>the day&rsquo;s spread</span></p>
      <div class="grid">${day.map((c) => plate(c, c.free ? 'In the letter' : '')).join('')}</div>
    </div>
    ${Object.keys(openByAnswer).map((a) => `
    <div class="group">
      <p class="grouphead">Laid on your ${ORD[a]} question <span>off the same cut, no position on them until you asked</span></p>
      <div class="grid">${openByAnswer[a].map((c) => plate(c, '')).join('')}</div>
    </div>`).join('')}
  </section>`;

  /* ── the body ───────────────────────────────────────────────────────────── */
  let body = '';
  let openSection = false;
  const closeSection = () => { if (openSection) { body += '</section>'; openSection = false; } };

  for (const b of blocks) {
    switch (b.type) {
      case 'lede':
        // Anything before the first [answer 1] marker. A well-formed reading has none, but
        // dropping it silently is the exact bug this file exists not to repeat.
        if (b.text.trim()) body += `<div class="orphan">${paras(b.text)}</div>`;
        break;

      case 'answer': {
        closeSection();
        const long = b.question.length > 165;
        body += `
  <div class="answerhead">
    <p class="eyebrow">${qs.length > 1
      ? `Answer ${numWord(b.n)} of ${numWord(qs.length)}`
      : 'Your question'} &nbsp;&middot;&nbsp; ${esc(v.spread_name)}</p>
    <h1 class="display asked-h${long ? ' long' : ''}">${typo(b.question)}</h1>
  </div>`;
        // ⛔ The opening prose belongs to the answer that follows. Dropping it is the bug the
        //    old node shipped: paid-for words that never reached the page.
        if (b.text.trim())
          body += `<div class="col wide opening${b.n === 1 ? ' first' : ''}">${paras(b.text)}</div>`;
        break;
      }

      case 'verdict':
        break;   // already printed on page two — never printed twice

      case 'turn':
        closeSection();
        body += `
  <div class="turn">
    ${CARD_IMG(b.card, 'thumb')}
    <div>
      <p class="label gold">Back to the table &middot; ${esc(card(b.card).name)}</p>
      ${paras(b.text)}
    </div>
  </div>`;
        break;

      case 'position': {
        closeSection();
        const c = card(b.card);
        openSection = true;
        body += `
  <section class="pos">
    <div class="rail">
      <figure>
        ${CARD_IMG(b.card)}
        <figcaption>${esc(c.name)}${c.reversed ? '<br><i>reversed</i>' : ''}</figcaption>
      </figure>
    </div>
    <div class="col">
      <h2><span class="n">${esc(b.number)}</span>${typo(b.name)}</h2>
      <div class="pic">${paras(firstPara(b.text))}</div>
      <div class="read">${paras(restParas(b.text))}</div>
    </div>`;
        break;
      }

      case 'keep':
        closeSection();
        body += `
  <blockquote class="keep">
    <p class="label gold">If you take one thing out of this, take this</p>
    ${paras(b.text)}
  </blockquote>`;
        break;

      case 'together':
        closeSection();
        body += `
  <div class="answerhead together">
    <p class="eyebrow">The closing passage &nbsp;&middot;&nbsp; all ${numWord(qs.length)} questions</p>
    <h1 class="display">The three of them, side by side</h1>
  </div>
  <div class="col wide">${paras(b.text)}</div>`;
        break;

      case 'close': {
        closeSection();
        const ps = String(b.text).trim().split(/\n\s*\n/).filter(Boolean);
        const lastLine = ps.length ? ps[ps.length - 1].trim() : '';
        const sig = (/^[—-]/.test(lastLine) || (lastLine.length && lastLine.length < 45))
          ? ps.pop() : null;
        const last = ps.length > 1 ? ps.pop() : null;
        body += `
  <div class="closing">
    <p class="label gold">Before I put them away</p>
    <div class="col wide">${paras(ps.join('\n\n'))}</div>
    <div class="col wide signoff">${last ? paras(last) : ''}${sig ? `<p class="sig">${typo(sig)}</p>` : ''}</div>
  </div>`;
        break;
      }
    }
  }
  closeSection();

  /* ── the document ───────────────────────────────────────────────────────── */
  const cover = `${MARCUS}07-cover-${slug(v.spread_name)}.jpg`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap">
<style>${CSS}</style></head><body>

<div class="cover">
  <img src="${cover}" alt="">
  <div class="scrim"></div>
  <div class="type">
    <p class="ce">Marcus Stone &middot; The Seer Within</p>
    <h1>${esc(v.spread_name)}</h1>
    <p class="cs">Cut on ${DATE(v.draw_date)} &nbsp;&middot;&nbsp; read for <b>${esc(v.first_name)}</b></p>
    <p class="cr">${esc(v.tier_label || '')}${qs.length ? ` &nbsp;&middot;&nbsp; ${numWord(qs.length)} question${qs.length > 1 ? 's' : ''}, answered off one cut` : ''}</p>
  </div>
</div>

${answersPage}
${tablePage}

<div class="reading">
${body.replace('<div class="closing">', '<div class="ending"><div class="closing">')}
  ${/class="closing"/.test(body) ? '' : '<div class="ending">'}
  <div class="colophon">
    <p>The cards in this reading are the cut I laid on ${DATE(v.draw_date)}, before light, and
    they are the same cards that went out to everybody who read the letter that morning. The
    positions were written before the cards fell. The writing is assisted &mdash; I use a machine
    to help me put a reading into words. The draw is real and it is yours.</p>
    <p class="ref">${esc(v.order_id || '')}</p>
  </div>
  </div>
</div>

</body></html>`;

  return { html, pdfFileName: `${v.order_id}.pdf`,
    pages: { questions: qs.length, positions: blocks.filter((b) => b.type === 'position').length,
             cards: day.length + open.length, closing: blocks.some((b) => b.type === 'together') } };
}

/* ────────────────────────────────────────────────────────────────────────────
   5 · the CSS
   ⭐ The palette, the micro-label and the gold rule are lifted straight off the daily
      email, so the paid object and the free letter read as one hand. The body face is a
      serif because this one is printed and 2,600 words long; the letter is Helvetica
      because that one is read on a phone at six in the morning.
   ──────────────────────────────────────────────────────────────────────────── */

const CSS = `
  /* ⭐ THE PAPER MARGIN. A container's padding is laid down ONCE, at the top of the element
     — so when a section broke across sheets the continuation sheet started at the paper
     edge and the text bled off the top. The border has to come from @page, which is
     re-applied to every sheet. Horizontal stays 0 on purpose: left/right padding DOES
     repeat on every fragment, so the two measures below (.9in front, .95in reading) are
     already correct and are left exactly where the design put them.
     ⛔ The cover is a full-bleed 8.5x11in photograph and must keep NO margin. Two
        independent mechanisms say so, because only one of them has to survive the
        renderer: :first (CSS 2.1) and a named page (Chrome 110+). */
  @page { size: Letter; margin: .55in 0 .55in; }
  @page :first { margin: 0; }
  @page cover { margin: 0; }
  @page frontmatter { margin: .55in 0 .3in; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; box-sizing:border-box; }
  :root {
    --ink:#16181D; --body:#24262E; --gold:#A8721C; --mute:#8A909C;
    --rule:#DDE0E6; --panel:#FAF7F1; --paper:#fff;
  }
  body { font-family:Georgia,'Times New Roman',serif; color:var(--body); margin:0;
         background:var(--paper); font-size:10.8pt; line-height:1.66; }
  h1,h2,.display { font-family:Fraunces,Georgia,serif; font-weight:600; color:var(--ink); }
  p { margin:0 0 9pt; }
  i { font-style:italic; }

  /* the micro-label. The email's eyebrow, exactly. */
  .eyebrow, .label, .tag, figcaption, .receipt b, .grouphead span {
    font-family:Helvetica,Arial,sans-serif; letter-spacing:.2em; text-transform:uppercase; }
  .eyebrow { font-size:8pt; color:var(--mute); font-weight:bold; margin:0 0 9pt; }
  .label { font-size:7.5pt; color:var(--mute); font-weight:bold; margin:0 0 7pt; letter-spacing:.18em; }
  .label.gold { color:var(--gold); }

  /* ── page 1 · the cover ─────────────────────────────────────────────────── */
  .cover { page:cover; position:relative; width:8.5in; height:11in; overflow:hidden;
           page-break-after:always; background:#1B1D22; }
  .cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .cover .scrim { position:absolute; left:0; right:0; bottom:0; height:6in;
    background:linear-gradient(to bottom, rgba(20,18,15,0) 0%, rgba(20,18,15,.70) 40%,
                                          rgba(20,18,15,.95) 100%); }
  .cover .type { position:absolute; left:.85in; right:.85in; bottom:.85in; color:#FBF8F1; }
  .cover .ce { font-family:Helvetica,Arial,sans-serif; font-size:8.5pt; letter-spacing:.24em;
    text-transform:uppercase; color:#E4D4B0; margin:0 0 10pt; font-weight:bold; }
  .cover h1 { font-size:42pt; line-height:1.0; margin:0 0 14pt; letter-spacing:-.015em; color:#FBF8F1; }
  .cover .cs { font-size:12pt; margin:0 0 14pt; color:#E8E2D6; }
  .cover .cs b { font-weight:400; color:#FBF8F1; }
  .cover .cr { font-family:Helvetica,Arial,sans-serif; font-size:8.5pt; letter-spacing:.18em;
    text-transform:uppercase; color:#E4D4B0; margin:0; padding-top:12pt;
    border-top:1pt solid rgba(228,212,176,.4); }

  /* ── the two front pages ────────────────────────────────────────────────── */
  .page { page:frontmatter; padding:.15in .9in .02in; page-break-after:always; }
  .page h1.display { font-size:21pt; line-height:1.08; margin:0 0 9pt; letter-spacing:-.012em; }
  .standfirst { font-size:10.5pt; line-height:1.45; color:var(--mute); font-style:italic;
    margin:0 0 11pt; max-width:5.2in; }

  .qa { margin:0 0 12pt; break-inside:avoid; }
  .asked { margin:0 0 8pt; font-size:10.5pt; line-height:1.42; font-style:italic;
    color:var(--body); border-left:2pt solid var(--rule); padding-left:12pt; }
  .verdict { background:var(--panel); border-left:3pt solid var(--gold); padding:11pt 15pt 4pt; }
  .verdict p { font-size:12pt; line-height:1.44; color:var(--ink); margin:0 0 6pt; }

  /* ⭐ One question at the floor rung: the answer IS the product, so it gets the page. */
  .page.q1 h1.display { font-size:30pt; margin:0 0 14pt; }
  .page.q1 .standfirst { font-size:12pt; margin:0 0 22pt; }
  .page.q1 .receipt { margin:0 0 30pt; padding:11pt 0; }
  .page.q1 .receipt div { font-size:9.5pt; }
  .page.q1 .asked { font-size:12.5pt; line-height:1.5; margin:0 0 16pt; padding-left:15pt; }
  .page.q1 .verdict { padding:20pt 22pt 12pt; }
  .page.q1 .verdict p { font-size:15pt; line-height:1.46; }
  .page.q2 h1.display { font-size:25pt; }
  .page.q2 .verdict p { font-size:13pt; }
  .page.q2 .qa { margin:0 0 20pt; }

  .receipt { display:table; width:100%; margin:0 0 18pt; border-top:1pt solid var(--rule);
             border-bottom:1pt solid var(--rule); padding:8pt 0; break-inside:avoid; }
  .receipt div { display:table-cell; font-family:Helvetica,Arial,sans-serif; font-size:8.5pt;
    color:var(--body); line-height:1.4; padding-right:12pt; }
  .receipt b { display:block; font-size:6.8pt; color:var(--gold); font-weight:bold;
    margin-bottom:4pt; letter-spacing:.16em; }

  /* ── the table page ─────────────────────────────────────────────────────── */
  .grouphead { font-family:Fraunces,Georgia,serif; font-weight:600; font-size:11pt;
    color:var(--ink); margin:11pt 0 8pt; padding-bottom:4pt; border-bottom:1pt solid var(--rule); }
  .grouphead span { font-size:7pt; color:var(--mute); font-weight:bold; margin-left:9pt;
    letter-spacing:.16em; }
  .group { break-inside:avoid; }
  .grid { display:grid; grid-template-columns:repeat(6,1fr); gap:9pt 10pt; }
  .plate { width:100%; margin:0; page-break-inside:avoid; }
  .plate .card { width:100%; display:block; border:.75pt solid var(--rule); }
  .plate figcaption { margin-top:5pt; letter-spacing:0; text-transform:none;
    font-family:Helvetica,Arial,sans-serif; font-size:6.5pt; line-height:1.32; color:var(--mute); }
  .plate .n { display:inline-block; font-size:6pt; font-weight:bold; color:var(--gold);
    letter-spacing:.1em; }
  .plate .pos { display:block; color:var(--body); font-weight:bold; }
  .plate .cn { display:block; }
  .plate .tag { display:inline-block; margin-top:3pt; font-size:5.6pt; font-weight:bold;
    letter-spacing:.14em; color:var(--gold); border:.6pt solid var(--gold); padding:1pt 3pt; }

  /* ── the reading ────────────────────────────────────────────────────────── */
  .reading { padding:0 .95in .25in; }

  .answerhead { page-break-before:always; page-break-after:avoid; padding:.15in 0 0;
                margin:0 0 22pt; }
  .answerhead .eyebrow { color:var(--gold); }
  h1.asked-h { font-size:22pt; line-height:1.22; margin:0; padding-bottom:16pt;
    border-bottom:2pt solid var(--gold); letter-spacing:-.01em; font-style:italic;
    font-weight:400; }
  h1.asked-h.long { font-size:15pt; line-height:1.34; }

  section.pos { display:flex; gap:20pt; margin:0 0 24pt; break-inside:avoid;
                align-items:flex-start; }
  section.pos .rail { width:1.55in; flex:0 0 1.55in; }
  section.pos .rail figure { margin:0; }
  section.pos .rail .card { width:100%; display:block; border:.75pt solid var(--rule); }
  section.pos .rail figcaption { margin-top:6pt; text-align:center; font-size:6.6pt;
    line-height:1.4; color:var(--mute); font-weight:bold; letter-spacing:.13em; }
  section.pos .col { flex:1 1 auto; min-width:0; }
  .col { max-width:4.5in; }
  .col.wide { max-width:5.4in; }
  section.pos h2 { font-size:13.5pt; line-height:1.28; margin:0 0 11pt; letter-spacing:-.005em; }
  section.pos h2 .n { font-family:Helvetica,Arial,sans-serif; font-size:8pt; font-weight:bold;
    letter-spacing:.12em; color:var(--gold); vertical-align:.28em; margin-right:9pt; }

  /* ⭐ The picture, then the meaning — voice rule R1, made visible. The first paragraph of
     every passage is what is drawn on the card, so it is set apart from the reading. */
  .pic p { font-style:italic; color:#4A4E58; font-size:10.4pt; line-height:1.6;
           margin:0 0 11pt; }
  .read p:last-child { margin-bottom:0; }

  /* the turn back to the table, on answers two and three */
  .turn { display:flex; gap:16pt; align-items:flex-start; background:var(--panel);
    border-left:3pt solid var(--gold); padding:15pt 18pt; margin:0 0 24pt;
    break-inside:avoid; }
  .turn .thumb { width:.8in; flex:0 0 .8in; display:block; border:.75pt solid var(--rule); }
  .turn p:last-child { margin-bottom:0; }
  .turn div { flex:1 1 auto; }

  /* the one line she keeps */
  .keep { margin:0 0 20pt; padding:11pt 0; border-top:2pt solid var(--gold);
    border-bottom:1pt solid var(--rule); break-inside:avoid; }
  .keep p:not(.label) { font-family:Fraunces,Georgia,serif; font-size:15pt; line-height:1.34;
    color:var(--ink); margin:0; letter-spacing:-.008em; }

  .answerhead.together h1 { font-size:26pt; line-height:1.1; padding-bottom:16pt;
    border-bottom:2pt solid var(--gold); font-style:normal; font-weight:600; }

  .ending { break-inside:avoid; }
  .closing { margin-top:8pt; }
  .signoff { break-inside:avoid; }
  .closing .sig { font-family:Fraunces,Georgia,serif; font-size:13pt; color:var(--ink);
    margin-top:14pt; }

  .opening { margin:0 0 24pt; }
  .opening p:first-child { font-size:12pt; line-height:1.55; }
  .opening.first p:first-child::first-letter { float:left; font-family:Fraunces,Georgia,serif;
    font-size:42pt; line-height:.82; padding:3pt 8pt 0 0; color:var(--gold); font-weight:600; }
  .orphan { margin:0 0 20pt; }

  .colophon { margin-top:22pt; border-top:1pt solid var(--rule); padding-top:11pt;
              break-inside:avoid; break-before:avoid; }
  .colophon p { font-size:8pt; line-height:1.6; color:var(--mute); margin:0 0 6pt;
                max-width:5.4in; }
  .colophon .ref { font-family:Helvetica,Arial,sans-serif; font-size:6.5pt;
    letter-spacing:.16em; text-transform:uppercase; color:#C3C7CF; }

  /* ⛔ A reversed card is the upright scan, turned. Never a second file. */
  .card.rev { transform:rotate(180deg); }
`;
