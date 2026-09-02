#!/usr/bin/env node
/**
 * copy-check — the deterministic half of the backend-ESL copy audit.
 *
 * 00-TODO-BEs.md: "Hard rules go in the script, not an agent — deterministic and an LLM catches
 * them inconsistently." This is that script. The three judgment passes (brief fidelity, framework
 * compliance, copy mechanics) stay human/agent work; everything here is a regex with a verdict.
 *
 *   node scripts/copy-check.cjs            # all of copy/
 *   node scripts/copy-check.cjs copy/02    # one offer
 *
 * Exits non-zero on any FAIL.
 *
 * ⚠ RETIRED CHECKS — do not re-add (operator, 2026-08-03):
 *     · calendar-deadline regex      windows and dates are allowed
 *     · third-party-outcome regex    predictions are stated flat
 *     · em-dash counting             that is Evelyn's published cadence, not an AI tell
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const target = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(ROOT, 'copy');

// ── what each offer is allowed to say about time and money ──────────────────────────────────
const OFFERS = {
  '02': { name: 'Twin Flame Tarot', sla: /\b24 hours?\b/i, prices: ['35.00', '35', '12.77'] },
  // 03/05 are PWYW: 300 and 250 are the ANCHORS quoted on the booking page (what others pay,
  // what she was urged to hold it at), not charges. They are valid copy; the charge is the bump.
  '03': { name: 'Judgement Day',    sla: /\b(three|3) (days|nights)\b/i, prices: ['12.77', '300', '250'] },
  '04': { name: 'The Turn',         sla: /\b24 hours?\b/i, prices: ['35', '47', '57', '67', '12.77'] },
  '05': { name: 'Cut the Cord',     sla: /\b24 hours?\b/i, prices: ['12.77'] },
  // 06 is the deck's first physical offer — real manufacturing + shipping, not a digital SLA.
  // Main price is `{{PRICE}}` (merge field, genuinely undecided — see docs/06/0-WORKFLOW-06.md),
  // so it never matches the $-literal regex and needs no entry in `prices` here. The bump price
  // ($11.11) IS a literal and IS proposed, not locked — added so copy-check can run at all while
  // it's still a candidate offer; revisit if the operator picks a different number.
  '06': { name: 'the Wishing Bracelet', sla: /\b(7 business days|1[-–]2 weeks)\b/i, prices: ['11.11'] },
  // 07 is the deck's first RECURRING offer — a daily email, not a one-off letter. Lives in
  // copy/07-marcus/ (see the offer-number regex below, which allows the label suffix).
  '07': { name: 'Marcus Daily Tarot', sla: /\b24 hours?\b/i, prices: ['35.00', '35', '12.77'] },
};
const ALL_PRICES = ['35.00', '35', '47', '57', '67', '12.77', '300', '250', '11.11'];

// ── per-file rules ─────────────────────────────────────────────────────────────────────────
const BANNED = [
  { re: /\bopen communication\b/gi,  rule: "04's banned vocabulary" },
  { re: /\bseek guidance\b/gi,       rule: "04's banned vocabulary" },
  { re: /\bembrace growth\b/gi,      rule: "04's banned vocabulary" },
  { re: /\bdelve\b/gi,               rule: 'AI tell' },
  { re: /\bleverage\b/gi,            rule: 'AI tell' },
  { re: /\bcomprehensive\b/gi,       rule: 'AI tell' },
  // "tends to <verb>" hedges; "tends to her own knowing" is the care sense and is fine (02-E2:256)
  { re: /\btends? to (?!her\b|his\b|their\b|its\b|the\b|a\b|an\b|my\b|your\b|our\b)/gi,
    rule: 'hedge word — predictions are stated flat' },
  { re: /\bmay indicate\b/gi,        rule: 'hedge word — predictions are stated flat' },
  // "usually" hedges a claim; "they don't usually say that" is habitual frequency and is fine
  { re: /(?<!\b(?:don't|doesn't|didn't|do not|does not|not|never|rarely)\s)\busually\b/gi,
    rule: 'hedge word — predictions are stated flat' },
  { re: /\balmost never\b/gi,        rule: 'hedge word — predictions are stated flat' },
];

// A leading "+" makes it a SEND DELAY, not a fulfilment SLA: "+1h" / "+24h" are the abandon
// nudges' own names (02-E6). Only an unprefixed duration is a promise about when work arrives.
const SLA_ANY = /(?<![+\d])\b(24 ?h(ours?)?|(three|3) (days|nights)|(sixteen|16|eight|8) hours?|7 business days|1[-–]2 weeks)\b/i;

// A letter is an ESL or a nudge: money first appears on the booking page, after five yeses.
// 07's dailies (`07-D-<day>-<spread>`) are letters too: same rule, price and delivery
// promise live on the booking page, never in the send. Without `-D-` here the check
// silently skipped every daily — which is how a price reached one.
const isLetter = (id) => /-E[236]\b/.test(id) || /nudge/i.test(id) || /-D-/.test(id);
const isBookingPage = (id) => /-C1\b/.test(id);

// Only these assets PROMISE a delivery time, so only these can state a wrong SLA. Inside a
// product, "three days late" is prose about her life, not a claim about when work arrives.
const promisesDelivery = (id) => /-(E\d|C1|T1|T3|P4)\b/.test(id);

/**
 * Body copy only: no metadata tables, no HTML comments, nothing below the build notes.
 * Blanks removed content instead of deleting it, so offsets still map to REAL file lines —
 * a finding that points at the wrong line sends the next reader hunting through the file.
 */
function bodyOf(raw) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  let s = raw.replace(/<!--[\s\S]*?-->/g, blank);
  const cut = s.search(/^##+ +(?:Build notes|Audit record|Variance notes|Open, for)/m);
  if (cut !== -1) s = s.slice(0, cut) + blank(s.slice(cut));
  s = s.replace(/^# .*$/m, blank);                   // the asset-title H1 is metadata, never copy
  // Convention: a paragraph opening ⚠ or ⛔ is a note TO THE BUILDER, not copy for the buyer.
  // Without this, a file that forbids a phrase gets flagged for containing the phrase it forbids.
  s = s.replace(/(^|\n\n)([ \t]*[⚠⛔][\s\S]*?)(?=\n\n|$)/g, (m, sep, para) => sep + blank(para));
  return s
    .split('\n')
    .map((l) => (l.trimStart().startsWith('|') ? '' : l))   // tables are spec, never copy
    .join('\n');
}

function lineOf(body, index) {
  return body.slice(0, index).split('\n').length;
}

// ── collect ────────────────────────────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md') && e.name !== 'README.md') out.push(p);
  }
  return out;
}

const files = fs.statSync(target).isDirectory() ? walk(target) : [target];
const findings = [];
const sentencesByOffer = new Map();   // normalised sentence -> Set(offer)
const sentenceSource = new Map();     // normalised sentence -> "offer file"

for (const file of files) {
  const rel = path.relative(ROOT, file);
  // A folder may carry a human label after the number — copy/07-marcus/ is still offer 07.
  // Without the optional suffix the match fails, `offer` is undefined, and the price, SLA and
  // device-variance checks below all silently skip. The script then prints PASS on anything.
  const offer = (rel.match(/copy\/(\d{2})(?:-[a-z-]+)?\//) || [])[1];
  const id = path.basename(file, '.md');
  const body = bodyOf(fs.readFileSync(file, 'utf8'));

  // 1 — banned vocabulary, AI tells, hedges
  for (const { re, rule } of BANNED) {
    for (const m of body.matchAll(re)) {
      findings.push({ file: rel, line: lineOf(body, m.index), rule, detail: `"${m[0]}"` });
    }
  }

  // 2 — price consistency: every dollar figure must be a real price in the deck
  for (const m of body.matchAll(/\$ ?([\d,]+(?:\.\d{2})?)/g)) {
    const val = m[1].replace(/,/g, '');
    if (!ALL_PRICES.includes(val)) {
      findings.push({ file: rel, line: lineOf(body, m.index), rule: 'price not in the deck', detail: `$${val}` });
    } else if (offer && OFFERS[offer] && !OFFERS[offer].prices.includes(val)) {
      findings.push({
        file: rel, line: lineOf(body, m.index), rule: `price not valid for ${offer}`,
        detail: `$${val} — ${offer} allows ${OFFERS[offer].prices.map((p) => '$' + p).join(', ')}`,
      });
    }
  }

  // 3 — SLA consistency: an offer may only state its own decided SLA
  if (offer && OFFERS[offer] && promisesDelivery(id)) {
    for (const m of body.matchAll(new RegExp(SLA_ANY, 'gi'))) {
      if (!OFFERS[offer].sla.test(m[0])) {
        findings.push({
          file: rel, line: lineOf(body, m.index), rule: `wrong SLA for ${offer}`,
          detail: `"${m[0]}" — ${offer} is ${String(OFFERS[offer].sla).replace(/[/\\bi]|\(|\)|\?|:/g, '').trim()}`,
        });
      }
    }
  }

  // 4 — no price and no DELIVERY PROMISE in a letter. Statement 6 is the first mention of money.
  //     A duration used as CRAFT ("the working takes three nights") is allowed and is often
  //     required: 03's whole mechanism is three nights, and beat 14 cannot justify the price
  //     without saying so. What may not appear is a promise about when the product ARRIVES.
  if (isLetter(id)) {
    const price = body.match(/\$ ?[\d,]+/);
    if (price) findings.push({ file: rel, line: lineOf(body, price.index), rule: 'PRICE IN A LETTER', detail: price[0] });
    const D = '(?:24 ?h(?:ours?)?|(?:three|3) (?:days|nights))';
    const promise = body.match(new RegExp(
      `\\b(?:within|inside)\\s+${D}\\b|\\b${D}\\b[^.]{0,40}?\\b(?:to reach you|reaches you|arrives?|delivered|in your inbox)\\b`, 'i'));
    if (promise) findings.push({ file: rel, line: lineOf(body, promise.index), rule: 'DELIVERY PROMISE IN A LETTER', detail: promise[0].trim() });
  }

  // 5 — a booking page must state both, or the ladder has no top rung.
  //     A ladder offer states it as a MERGE FIELD ({{TODAYS_RUNG}}) resolved server-side per S9 —
  //     hard-coding a number there breaks silently for anyone arriving from an older email.
  if (isBookingPage(id)) {
    const statesPrice = /\$ ?[\d,]/.test(body) || /\{\{\s*(TODAYS_RUNG|PRICE)\s*\}\}/.test(body);
    if (!statesPrice) findings.push({ file: rel, line: 0, rule: 'booking page states no price', detail: 'statement 6' });
    if (!SLA_ANY.test(body)) findings.push({ file: rel, line: 0, rule: 'booking page states no SLA', detail: 'statement 5' });
  }

  // 6 — device variance: harvest sentences for the corpus-wide pass.
  //     Subject banks are excluded: their copy lives in tables (already stripped), so all that
  //     remains is shared spec prose ("run one challenger per send") which is not a device.
  if (offer && !/-E1\b/.test(id)) {
    const prose = body
      .replace(/^#.*$/gm, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/`[^`]*`/g, '');
    for (const s of prose.split(/(?<=[.!?])\s+|\n{2,}/)) {
      const norm = s.toLowerCase().replace(/%firstname%|\{\{[^}]*\}\}/g, '').replace(/[^a-z ]/g, ' ')
        .replace(/\s+/g, ' ').trim();
      if (norm.split(' ').length < 8) continue;
      if (!sentencesByOffer.has(norm)) { sentencesByOffer.set(norm, new Set()); sentenceSource.set(norm, `${offer} ${id}`); }
      sentencesByOffer.get(norm).add(offer);
    }
  }
}

for (const [norm, offers] of sentencesByOffer) {
  if (offers.size >= 2) {
    findings.push({
      file: `[corpus] ${[...offers].sort().join(' + ')}`, line: 0, rule: 'DEVICE VARIANCE',
      detail: `"${norm.slice(0, 90)}…" — first seen ${sentenceSource.get(norm)}`,
    });
  }
}

// ── report ─────────────────────────────────────────────────────────────────────────────────
const offersSeen = [...new Set(files.map((f) => (path.relative(ROOT, f).match(/copy\/(\d{2})(?:-[a-z-]+)?\//) || [])[1]).filter(Boolean))];
console.log(`copy-check — ${files.length} file(s), offers ${offersSeen.sort().join(', ') || '—'}\n`);

if (!findings.length) {
  console.log('  ✅ PASS — no findings');
  if (offersSeen.length < 4) {
    console.log(`\n  ⚠ device variance is only meaningful with all four offers in view (have ${offersSeen.length}).`);
  }
  process.exit(0);
}

const byRule = findings.reduce((m, f) => ((m[f.rule] = m[f.rule] || []).push(f), m), {});
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`  ❌ ${rule} — ${list.length}`);
  for (const f of list) console.log(`       ${f.file}${f.line ? ':' + f.line : ''}  ${f.detail}`);
  console.log('');
}
console.log(`FAIL — ${findings.length} finding(s)`);
process.exit(1);
