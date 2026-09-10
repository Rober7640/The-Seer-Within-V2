/**
 * 07 — assert the registry and every place that restates it still agree.
 *
 *   node scripts/check-07-registry.mjs
 *
 * ⭐ This is the piece 07-spread-registry.md §3 says does not exist, and its absence is why the
 *    four definitions drifted once already: Tue and Sun were photographed with cards no email
 *    mentions, and only a manual read caught it. Nothing here is clever. It reads the registry,
 *    reads the seven other files that carry the same facts, and fails on the first disagreement.
 *
 * ⛔ Run it after ANY edit to scripts/07-spreads.json, to a daily .md, to 07-art-prompt.md or to
 *    make-07-spread-covers.py. It exits non-zero on any problem.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REGISTRY, TIER_MODEL, FLOOR, ORDER, spreads, spread, resolve, cardCounts, openDrawSize } from './07-registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

const problems = [];
const bad = (where, msg) => problems.push(`${where}  ${msg}`);

/**
 * ⚠ Files that are KNOWINGLY behind the registry, with the reason and who owns the catch-up.
 * They report as warnings and do NOT fail the run — a gate that is permanently red teaches
 * everyone to ignore it. ⛔ Delete an entry the moment its file is brought forward; an entry
 * left here is a hole in the check.
 */
const behind = [];
const KNOWN_BEHIND = {
  '07-dryrun-orders.json': '🔴 THE FIXTURE PROVES NOTHING ABOUT THE CURRENT REGISTRY. It is the ' +
    'record of what n8n was actually run against, and every spread in it was retired by the ' +
    'clean sheet of 2026-09-05. So the workflow has never been proved against a spread that is ' +
    'now sellable. ⛔ Re-cut it against a real Phase 3 draw BEFORE the first paid order — the ' +
    'job strings it asserts are the model prompt, and nothing else checks them end to end.',
};

/**
 * ⭐ STAGING, not disagreement — and the difference is the whole point of this block.
 *
 * The 30-day test builds a spread's registry entry in Phase 2, its art in Phase 3 and its
 * email in Phase 4. So between those phases a spread legitimately has positions and no
 * `built_email`, and several sections below have nothing to compare it against.
 *
 * ⛔ A skipped section must NEVER read as a pass. `unbuilt` and `skipped` are printed loudly
 *    and they suppress the bare ✅ line — a green run while 23 spreads went unchecked is
 *    exactly the failure that `keys()` used to produce silently.
 */
const unbuilt = [];
const skipped = [];
const skip = (what, why) => skipped.push(`${what} — ${why}`);

/** Sections 2, 4 and 5 are keyed on WEEKDAY, which only identifies a spread while there
 *  are seven of them. ⛔ They need rewriting per-spread when Phase 3 and Phase 4 produce
 *  the art and the emails; until then they are skipped, loudly, rather than lying. */
const SEVEN = Object.keys(REGISTRY.spreads).length === 7;
const late = (where, msg) => (KNOWN_BEHIND[where] ? behind.push(`${where}  ${msg}`) : bad(where, msg));
const eq = (where, what, got, want) => {
  if (String(got) !== String(want)) bad(where, `${what}: registry says ${want}, this says ${got}`);
};

const MAJORS = new Set(['The Fool', 'The Magician', 'The High Priestess', 'The Empress',
  'The Emperor', 'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance', 'The Devil',
  'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World']);

const slugify = (card) => card.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ── 1 · the registry on its own terms ──────────────────────────────────────────────────── */
{
  // ⛔ The weekday is the OPENING SHAPE and repeats across the thirty — it is NOT the
  //    identity. What has to be unique is the key and the calendar slot.
  const WEEKDAYS = new Set(REGISTRY.days);
  const all = spreads();
  for (const [key, s] of all) {
    if (!WEEKDAYS.has(s.day)) {
      bad('07-spreads.json', `${key} runs day '${s.day}', not one of ${REGISTRY.days.join(',')}`);
    }
  }
  const slots = all.map(([, s]) => s.day_number).filter((v) => v !== undefined);
  if (slots.length && slots.length !== all.length) {
    bad('07-spreads.json', `${slots.length} of ${all.length} spreads carry day_number — all or none`);
  } else if (slots.length) {
    const want = Array.from({ length: all.length }, (_, i) => i + 1).join(',');
    const got = [...slots].sort((a, b) => a - b).join(',');
    if (got !== want) bad('07-spreads.json', `day_number must be 1..${all.length} with no gaps — got ${got}`);
  } else if (new Set(all.map(([, s]) => s.day)).size !== all.length) {
    // No calendar, so the old rule still binds: one spread per weekday, as the seven were.
    bad('07-spreads.json', `no day_number anywhere, so each spread must own a weekday — got ${all.map(([, s]) => s.day).join(',')}`);
  }

  for (const [key, s] of spreads()) {
    const at = `07-spreads.json ${key}`;
    if (s.slug_in_link !== key) bad(at, `slug_in_link '${s.slug_in_link}' is not the key`);
    // ⭐ The floor moved to WHAT SHE RECEIVES (tier_model.min_cards_per_answer), because under C5
    //    she buys her questions answered, not the rest of today's cards — resolve() tops answer 1
    //    up from the open cut. What a PLACED spread still has to be is a spread: three cards, and
    //    at least one of them free and one paid. ⛔ Two placed cards is a pair, not a reading.
    if (s.positions.length < 3) bad(at, `${s.positions.length} placed cards — a spread is at least 3`);
    s.positions.forEach((p, i) => {
      if (p.n !== i + 1) bad(at, `position ${i + 1} is numbered ${p.n} — numbers must be 1..N in order`);
      if (!p.name || !p.name.trim()) bad(at, `position ${p.n} has no name`);
      // ⛔ `job` goes VERBATIM into the model call. An empty one is a blank card in a paid PDF.
      if (!p.job || p.job.trim().length < 20) bad(at, `position ${p.n} has no usable job string`);
    });
    const names = s.positions.map((p) => p.name);
    if (new Set(names).size !== names.length) bad(at, 'two positions share a name');
    if (!s.positions.some((p) => p.free)) bad(at, 'no free position — the daily email has nothing to read');
    if (!s.positions.some((p) => !p.free)) bad(at, 'no paid position — there is nothing to sell');
    if (s.reusable_as && !s.block_key) bad(at, `reusable_as '${s.reusable_as}' with no block_key`);

    // ⭐ No `built_email` = designed but not yet shot or written. Legitimate between phases,
    //    and recorded so it cannot pass as checked.
    if (!s.built_email) { unbuilt.push(key); continue; }

    for (const c of s.built_email.face_up) {
      if (c.reversed && !MAJORS.has(c.card)) {
        // 07-server-spec §6.9: only the 22 majors have a -reversed scan.
        bad(at, `built_email face_up ${c.card} is reversed and is a MINOR — that scan 404s`);
      }
      if (slugify(c.card) !== c.slug) bad(at, `face_up '${c.card}' does not slugify to '${c.slug}'`);
    }
    const freeN = s.positions.filter((p) => p.free).length;
    eq(at, 'built_email face_up count', s.built_email.face_up.length, freeN);
    for (const f of ['art_png', 'cover_png']) {
      if (!exists(s.built_email[f])) bad(at, `${f} ${s.built_email[f]} is not on disk`);
    }
  }
}

/* ── 2 · 07-P1, the prose contract ──────────────────────────────────────────────────────── */
// ⛔ 07-P1 documents THE SEVEN, which the 30-day test retires. Its rows are keyed on weekday,
//    so it cannot describe a registry where a weekday runs four different spreads.
if (!SEVEN) skip('§2 · 07-P1', 'it documents the retired seven; the 30-day test replaces it') ;
else {
  const md = read('copy/07-marcus/07-P1-the-seven-spreads.md');
  const rows = [...md.matchAll(/^\| (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \| ([^|]+?) \| (\d+) \| \+(\d+) \| (\d+) \| ([^|]+?) \|$/gm)];
  eq('07-P1', 'summary table rows', rows.length, 7);
  for (const [, dayCap, name, free, paid, total, question] of rows) {
    const day = dayCap.toLowerCase();
    const hit = spreads().find(([, s]) => s.day === day);
    if (!hit) { bad('07-P1', `no registry spread on ${day}`); continue; }
    const [key, s] = hit;
    const at = `07-P1 ${dayCap}`;
    eq(at, 'name', name.trim(), s.name);
    eq(at, 'free', free, s.positions.filter((p) => p.free).length);
    eq(at, 'paid', paid, s.positions.filter((p) => !p.free).length);
    eq(at, 'total', total, s.positions.length);
    eq(at, 'question', question.trim(), s.question);
    if (key !== s.slug_in_link) bad(at, 'key drift');
  }
}

/* ── 3 · the seven daily emails, .md and built .html ────────────────────────────────────── */
for (const [key, s] of spreads()) {
  if (!s.built_email) continue;   // counted once, in §1
  const src = s.built_email.email_md;
  if (!exists(src)) { bad(src, 'missing'); continue; }
  const md = read(src);
  const cell = (k) => (md.match(new RegExp(`^\\|\\s*\\*\\*${k}\\*\\*\\s*\\|(.+?)\\|\\s*$`, 'm')) || [, ''])[1];
  const at = `${path.basename(src)}`;

  eq(at, 'Free', (cell('Free').match(/\*\*(\d+)\*\*/) || [])[1], s.positions.filter((p) => p.free).length);
  eq(at, 'Paid', (cell('Paid').match(/\*\*\+?(\d+)\*\*/) || [])[1], s.positions.filter((p) => !p.free).length);
  eq(at, '&s= slug', (cell('Links').match(/s=([a-z0-9-]+)/) || [])[1], s.slug_in_link);
  const cards = [...cell('Cards').matchAll(/`([a-z0-9/-]+)`/g)].map((m) => m[1].split('/').pop());
  eq(at, 'Cards', cards.join(' · '), s.built_email.face_up.map((c) => c.slug).join(' · '));
  if (!md.split('\n')[0].includes(s.name)) bad(at, `title line does not name ${s.name}`);

  const built = src.replace(/\.md$/, '.html');
  if (!exists(built)) { bad(built, 'not built — run build-07-daily-v2.py'); continue; }
  const html = read(built);
  const slugs = new Set([...html.matchAll(/&amp;s=([a-z0-9-]+)/g)].map((m) => m[1]));
  if (slugs.size !== 1 || !slugs.has(s.slug_in_link)) {
    bad(path.basename(built), `links carry s=${[...slugs].join(',')}, registry says ${s.slug_in_link}`);
  }
  for (const a of ['hero_asset', 'facedown_asset']) {
    if (!html.includes(s.built_email[a])) bad(path.basename(built), `does not use ${s.built_email[a]}`);
  }
}

/* ── 4 · the art prompt — how many face up, how many face down, and which cards ─────────── */
// ⭐ REWRITTEN KEY-BASED 2026-09-06. The blocks used to be headed `### Monday · …` and this
//    section looked the spread up by weekday, which stopped identifying anything the moment a
//    weekday ran more than one spread. Both the doc and make-07-day-art.py are now keyed on
//    the spread key, and so is this.
{
  const md = read('docs/07-marcus/07-art-prompt.md');
  // ⛔ Only blocks ABOVE the superseded section count. The retired seven are kept in the file
  //    on purpose, for their reasoning, and must not be checked against a registry they left.
  const cut = md.indexOf('*(superseded');
  const live = cut === -1 ? md : md.slice(0, cut);

  const blocks = [...live.matchAll(
    /^### ([a-z0-9][a-z0-9-]*) · ([^\n—]+) — (\d+) face up, (\d+) face down → `([^`]+)`\n\n```\n(.*?)\n```/gms)];

  const shot = new Set();
  for (const [, key, name, up, down, out, cards] of blocks) {
    const at = `07-art-prompt.md ${key}`;
    if (shot.has(key)) { bad(at, 'two blocks carry this key — make-07-day-art.py throws on that'); continue; }
    shot.add(key);

    let sp;
    try { sp = spread(key); } catch { bad(at, `'${key}' is not a registry key`); continue; }

    eq(at, 'name', name.trim(), sp.name);
    eq(at, 'face up', up, sp.positions.filter((p) => p.free).length);
    eq(at, 'face down', down, sp.positions.filter((p) => !p.free).length);
    // ⛔ One PNG per spread, named for the spread. A weekday-named path would have five
    //    spreads writing over one file.
    eq(at, 'output', out, `assets/07-${key}-rws.png`);

    // The face-up cards are named in CAPS in the paragraph. This is the check that caught Tue
    // and Sun being shot with cards no email mentions. ⛔ It needs `built_email`, which Phase 4
    // writes — until then the art is the thing that LOCKS the cards, not the thing checked
    // against them.
    if (sp.built_email) {
      for (const c of sp.built_email.face_up) {
        if (!cards.toUpperCase().includes(c.card.toUpperCase())) {
          bad(at, `the prompt never names ${c.card}, which the email shows face up`);
        }
      }
    }
  }

  // ⭐ A card shown face up to the whole list twice in one run reads as a deck that is not
  //    being cut. Checked across every block that exists, because no single one can see it.
  const CARD_RE = /\b((?:ACE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|PAGE|KNIGHT|QUEEN|KING) OF (?:CUPS|WANDS|SWORDS|PENTACLES))\b/g;
  const seenCard = new Map();
  for (const [, key, , , , , cards] of blocks) {
    for (const m of new Set([...cards.matchAll(CARD_RE)].map((x) => x[1]))) {
      if (seenCard.has(m) && seenCard.get(m) !== key) {
        bad('07-art-prompt.md', `${m} is face up in both ${seenCard.get(m)} and ${key}`);
      } else seenCard.set(m, key);
    }
  }

  const noArt = spreads().filter(([k]) => !shot.has(k)).map(([k]) => k);
  if (noArt.length) {
    skip('§4 · 07-art-prompt.md',
      `${noArt.length} of ${spreads().length} spreads have no art block yet — ${blocks.length} checked`);
  }
}

/* ── 5 · make-07-spread-covers.py — the cover art's own copy of day/name/free/paid/cards ─── */
// ⛔ Its rows carry a three-letter weekday per spread and it asserts exactly seven of them.
if (!SEVEN) skip('§5 · make-07-spread-covers.py', 'it asserts seven weekday rows — Phase 3 rewrites it');
else {
  const py = read('scripts/make-07-spread-covers.py');
  const rows = [...py.matchAll(/^ "([a-z-]+)": \("(\w{3})", "([^"]+)", (\d+), (\d+),\s*\n?\s*"([^"]+)"/gm)];
  eq('make-07-spread-covers.py', 'spread rows', rows.length, 7);
  for (const [, key, day, name, up, down, cards] of rows) {
    const at = `make-07-spread-covers.py ${key}`;
    let s;
    try { s = spread(key); } catch { bad(at, 'not a registry key'); continue; }
    eq(at, 'day', day, s.day);
    eq(at, 'name', name, s.name);
    eq(at, 'face up', up, s.positions.filter((p) => p.free).length);
    eq(at, 'face down', down, s.positions.filter((p) => !p.free).length);
    eq(at, 'cards', cards, s.built_email.face_up.map((c) => c.card).join(' · '));
  }
  const order = (py.match(/^ORDER = \[([\s\S]*?)\]/m) || [, ''])[1];
  for (const [key] of spreads()) {
    if (!order.includes(`"${key}"`)) bad('make-07-spread-covers.py', `ORDER is missing ${key}`);
  }
}

/* ── 6 · the dry-run fixture — what n8n was actually proved against ─────────────────────── */
{
  const fx = JSON.parse(read('scripts/07-dryrun-orders.json'));
  const retiredInFixture = new Set();
  for (const [name, o] of Object.entries(fx)) {
    const d = o.draw;
    if (!d || !d.spread_key) continue;
    let s;
    // ⛔ A fixture key that is no longer in the registry is not nine separate faults — it is one
    //    fact about the workflow, reported once below.
    try { s = spread(d.spread_key); } catch { retiredInFixture.add(d.spread_key); continue; }
    const at = `fixture ${name}`;
    eq(at, 'spread_name', d.spread_name, s.name);
    eq(at, 'day positions', (d.day || []).length, s.positions.length);
    (d.day || []).forEach((p, i) => {
      const r = s.positions[i];
      if (!r) return;
      eq(`${at} pos ${p.number}`, 'number', p.number, r.n);
      eq(`${at} pos ${p.number}`, 'name', p.name, r.name);
      // ⛔ The job string IS the prompt. A fixture that drifts from the registry proves nothing.
      eq(`${at} pos ${p.number}`, 'job', p.job, r.job);
      eq(`${at} pos ${p.number}`, 'free', !!p.free, !!r.free);
      if (p.reversed && !MAJORS.has(p.card_name)) {
        bad(`${at} pos ${p.number}`, `${p.card_name} reversed is a MINOR — no art, it 404s`);
      }
    });

    // ⭐ The open six — 07-C5's cards for her second and third questions. They reach the same
    //    PDF as the day's cards, so they carry the same two ways to ship a broken paid product.
    const open = d.open || [];
    if (open.length && open.length !== TIER_MODEL.open_draw_size) {
      bad(at, `${open.length} open cards, the morning cuts ${TIER_MODEL.open_draw_size}`);
    }
    const dayCards = new Set((d.day || []).map((p) => p.card_name));
    open.forEach((c, i) => {
      if (c.reversed && !MAJORS.has(c.card_name)) {
        bad(`${at} open ${i + 1}`, `${c.card_name} reversed is a MINOR — no art, it 404s`);
      }
      // ⛔ An open card that is already face up in the day's spread reads as a second cut.
      if (dayCards.has(c.card_name)) {
        bad(`${at} open ${i + 1}`, `${c.card_name} is already in the day's spread`);
      }
    });
    // A paid rung with no question text is a refund, not a reading — node 4 holds the order.
    const rung = TIER_MODEL.tiers[o.tier];
    if (rung && open.length < (rung.questions - 1) * TIER_MODEL.open_per_question) {
      bad(at, `tier '${o.tier}' needs ${(rung.questions - 1) * TIER_MODEL.open_per_question} open cards, the draw has ${open.length}`);
    }
    for (let q = 2; q <= (rung ? rung.questions : 1); q++) {
      if (!(o[`question_${q}`] || '').trim()) bad(at, `tier '${o.tier}' is missing question_${q}`);
    }
  }

  if (retiredInFixture.size) {
    late('07-dryrun-orders.json',
      `every fixture order names a RETIRED spread (${[...retiredInFixture].join(', ')}) — ` +
      'nothing in it was checked against the registry');
  }
}

/* ── 7 · the ladder — 07-C5, sold as how many of her questions get answered ─────────────── */
{
  // 07-C5 §1, verbatim. If this table and the registry ever disagree, the booking page is
  // printing a number the fulfilment cannot deliver, which is the one failure 07 cannot survive.
  const C5 = {
    mon: [6, 9, 12], tue: [8, 11, 14], wed: [6, 9, 12], thu: [7, 10, 13],
    fri: [9, 12, 15], sat: [7, 10, 13], sun: [12, 15, 18],
  };
  for (const [key, s] of spreads()) {
    const got = ORDER.map((t) => {
      const r = resolve(key, t);
      if (!r.ok) { bad(`ladder ${key}`, `${t} is refused: ${r.reason}`); return null; }

      const names = r.positions.map((p) => `${p.block}:${p.answer || 1}:${p.n}`);
      if (new Set(names).size !== names.length) bad(`ladder ${key}/${t}`, 'a position is written twice');
      // Answer 1 establishes and carries the day's paid cards; every later answer is 3 open ones.
      // ⭐ Answer 1 is the day's paid cards PLUS the top-up from the open cut when the day spread
      //    is small — see resolve(). On every spread with 5+ paid cards the top-up is zero and this
      //    is the same assertion it always was.
      const topUp1 = Math.max(0, (TIER_MODEL.min_cards_per_answer ?? FLOOR) - r.counts.paid);
      if (r.answers[0].positions.length !== r.counts.paid + topUp1) {
        bad(`ladder ${key}/${t}`, 'answer 1 is not the day spread plus its top-up');
      }
      for (const a of r.answers.slice(1)) {
        if (a.positions.length !== TIER_MODEL.open_per_question) {
          bad(`ladder ${key}/${t}`, `answer ${a.index} has ${a.positions.length} open cards, expected ${TIER_MODEL.open_per_question}`);
        }
      }
      // ⛔ Per-spread now. A small day spread draws MORE loose cards, not fewer — see openDrawSize().
      if (r.counts.open > openDrawSize(key)) {
        bad(`ladder ${key}/${t}`, `needs ${r.counts.open} open cards, this morning cuts ${openDrawSize(key)}`);
      }
      if ((t === TIER_MODEL.closing_passage_tier) !== r.closing_passage) {
        bad(`ladder ${key}/${t}`, 'the closing passage is on the wrong rung');
      }
      return r.counts.total;
    });
    // ⛔ This table is 07-C5 §1 verbatim and is written per WEEKDAY, so it describes the seven
    //    and nothing else. Every other assertion in this section is per-spread and still runs.
    if (SEVEN) eq(`ladder ${key}`, '07-C5 card totals', got.join('/'), C5[s.day].join('/'));
  }

  // ⭐ Under C5 no rung adds a named spread, so nothing can be the day's own cut. Thursday keeps
  //    its $57 and Saturday its $87 — the two holes 07-C2 had, closed by construction.
  for (const [key, s] of spreads()) {
    for (const t of ORDER) if (!resolve(key, t).ok) bad('ladder', `${key} has no ${t} rung — C5 says every spread has all three`);
  }

  // ⭐ The live booking page states no count in its copy — every number is a token filled from a
  //    generated island. So its guard is the generator's own --check, run HERE so that one
  //    command still covers everything. Two gates is how the four definitions drifted last time.
  // ⭐ THE booking page, chosen by the operator 2026-09-04: g1, the port of his own artifact
  //    (docs/07-marcus/07-C1-TARGET-artifact-two-doors.html) onto the registry. Every other
  //    candidate — v1-v5, v3h, f1-f5, g2-g5, the two mockups — is in copy/07-marcus/
  //    archive-booking-pages/ and is deliberately NOT checked. ⛔ If the live page is renamed
  //    or replaced, change this line; a missing file here fails the run, which is the point.
  const live = 'copy/07-marcus/07-C1-booking-page-h2.html';
  if (!exists(live)) {
    bad(live, 'missing — the booking page the registry feeds does not exist');
  } else {
    try {
      execFileSync('node', [path.join(ROOT, 'scripts/build-07-booking-data.mjs'), '--check'],
        { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      // ⛔ Report the lines that FAILED, never just the first line of stdout — the generator
      //    prints a ✅ for each page that is current before it prints the ⛔, so line 1 is
      //    usually a success and quoting it names the wrong file.
      const out = `${e.stdout || ''}${e.stderr || ''}`.toString();
      const why = out.split('\n').filter((l) => /⛔|STALE|missing|mismatch/i.test(l)).map((l) => l.trim());
      bad('the booking page island', why.length
        ? `${why.join(' · ')}\n      run: node scripts/build-07-booking-data.mjs`
        : `build-07-booking-data.mjs --check failed with no diagnosis (exit ${e.status})`);
    }
  }
}

/* ── 8 · n8n's own copy of the ladder ───────────────────────────────────────────────────── */
{
  const py = read('scripts/build-07-n8n.py');
  // ⛔ 07-C5 §7.1 deleted IS_SPREAD outright — node 4 moved to the question ladder on
  //    2026-09-04. If it ever comes back, node 4 is on the old ladder and this is a failure,
  //    not a warning. test-07-brief.mjs will say so too, louder.
  if (/^const IS_SPREAD = /m.test(py)) {
    bad('build-07-n8n.py', 'IS_SPREAD is back — node 4 has fallen off the 07-C5 question ladder');
  }

  // ⭐ The three open-position `job` strings go VERBATIM into a paid PDF. build-07-n8n.py
  //    writes them into node 4 from THIS registry at build time, so they cannot drift — but
  //    only if the workflow on disk was regenerated after the registry last changed.
  const wf = read('docs/07-marcus/07-fulfilment.n8n.json');
  for (const p of TIER_MODEL.open_positions) {
    if (!wf.includes(JSON.stringify(p.job).slice(1, -1))) {
      bad('07-fulfilment.n8n.json', `node 4 does not carry the open position '${p.name}' — ` +
        'run python3 scripts/build-07-n8n.py');
    }
  }
  const asked = (py.match(/^const N_ASKED = \{([^}]*)\};$/m) || [, ''])[1];
  if (asked) {
    for (const t of ORDER) {
      const n = (asked.match(new RegExp(`${t}:\\s*(\\d+)`)) || [])[1];
      eq('build-07-n8n.py N_ASKED', t, n, TIER_MODEL.tiers[t].questions);
    }
  }

  const words = (py.match(/^const WORDS = \{([^}]*)\};$/m) || [, ''])[1];
  for (const t of ORDER) {
    const n = (words.match(new RegExp(`${t}:\\s*(\\d+)`)) || [])[1];
    eq('build-07-n8n.py WORDS', t, n, TIER_MODEL.tiers[t].target_words);
  }
  const share = (py.match(/^const POSITION_SHARE = ([\d.]+);$/m) || [])[1];
  eq('build-07-n8n.py', 'POSITION_SHARE', share, TIER_MODEL.position_share);
}

/* ── 9 · the SERVER's copy of the ladder — shared/backendOffers.ts ──────────────────────── */
// 🔴 The prices exist twice on purpose. `shared/` is bundled into the browser and cannot read
//    a build script's JSON, so the catalog carries its own copy of 07-C5's rungs. Two copies
//    of one fact is exactly how the four definitions drifted before — so they are pinned here.
//    ⛔ If you change a price in either place, this fails until the other matches.
{
  const rel = '../../shared/backendOffers.ts';
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    bad('shared/backendOffers.ts', 'not found — the server catalog moved; fix this check');
  } else {
    const ts = fs.readFileSync(abs, 'utf8');
    const block = (ts.match(/MARCUS_DAILY_TIER_CENTS\s*=\s*\{([\s\S]*?)\}/) || [, ''])[1];
    for (const t of ORDER) {
      const got = (block.match(new RegExp(`${t}\\s*:\\s*(\\d+)`)) || [])[1];
      const want = TIER_MODEL.tiers[t].price_usd * 100;
      eq('shared/backendOffers.ts', `${t} price (cents)`, got, want);
    }
    const bumpKey = (ts.match(/MARCUS_DAILY_BUMP_PRODUCT_KEY\s*=\s*'([^']+)'/) || [])[1];
    // ⛔ n8n exact-matches this string to decide what to fulfil. A rename sends the wrong thing.
    eq('shared/backendOffers.ts', 'bump product key', bumpKey, 'marcus_same_day');

    // ⭐ 07-C5: the rung is HOW MANY OF HER QUESTIONS. If the catalog and the registry ever
    //    disagree on that, the booking page sells a number the fulfilment will not deliver.
    for (const t of ORDER) {
      const q = (ts.match(new RegExp(`${t}:\\s*\\{[^}]*questions:\\s*(\\d+)`)) || [])[1];
      eq('shared/backendOffers.ts', `${t} questions`, q, TIER_MODEL.tiers[t].questions);
    }

    // ⛔ Money must stay shut until the intake path, the booking route and a re-proved n8n
    //    fixture all exist. This check is here so flipping it is a deliberate, visible act.
    if (/'marcus-daily':[\s\S]*?readyForMoney:\s*true/.test(ts)) {
      bad('shared/backendOffers.ts',
        '🔴 marcus-daily is readyForMoney:TRUE — nothing writes the intake columns, the booking ' +
        'page is a mockup, and the n8n fixture names only retired spreads');
    }
  }
}

/* ── report ────────────────────────────────────────────────────────────────────────────── */
const n = spreads().length;
if (behind.length) {
  console.log(`⚠ ${behind.length} file(s) knowingly behind the registry — each has an owner:\n`);
  for (const b of behind) console.log(`   ${b}`);
  for (const [k, why] of Object.entries(KNOWN_BEHIND)) {
    if (behind.some((b) => b.startsWith(k))) console.log(`\n   ${k}\n      ${why}`);
  }
  console.log('');
}
if (problems.length) {
  console.log(`❌ ${problems.length} disagreement(s) with scripts/07-spreads.json\n`);
  for (const p of problems) console.log(`   ${p}`);
  process.exit(1);
}
const positions = spreads().reduce((a, [, s]) => a + s.positions.length, 0);

// 🔴 A run that skipped sections, or that let spreads through with no art and no email, is NOT
//    a pass — say so in the first character. A green tick over unchecked work is how twenty-three
//    spreads went missing from `keys()` without anybody noticing.
const staged = unbuilt.length || skipped.length;
console.log(`${staged ? '⚠' : '✅'} ${n} spreads · ${positions} positions · ladder = ${TIER_MODEL.id}`);

if (unbuilt.length) {
  console.log(`\n   ${unbuilt.length} spread(s) DESIGNED BUT NOT BUILT — no art, no email, nothing to check them against:`);
  console.log(`      ${unbuilt.join(' · ')}`);
}
if (skipped.length) {
  console.log(`\n   ${skipped.length} section(s) SKIPPED — these checks did not run:`);
  for (const sk of skipped) console.log(`      ${sk}`);
}

if (staged) {
  console.log('\n   Nothing DISAGREES with the registry. That is not the same as everything being');
  console.log('   checked — the lines above say what was not looked at.');
} else {
  console.log('   07-P1 · 7 daily .md · 7 built .html · 07-art-prompt.md · make-07-spread-covers.py');
  console.log('   07-dryrun-orders.json · the C5 ladder · build-07-n8n.py · the booking page island');
  console.log(behind.length ? '   all agree, except the files listed above.' : '   all agree with the registry.');
}
