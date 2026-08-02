// Render reframe-deck drafts (emails/ or sends/<cycle>/ *.md) into AWeber broadcasts:
// body_html (canonical design, no hero image) + body_text + subject + scheduled_for.
// The `↳ THE REFRAME.` source marker is STRIPPED from the send (authoring tag only).
//
// RUN THIS WITH `tsx`, NOT PLAIN `node` — it imports a TypeScript module
// (server/lib/emailLinkCodes.ts), which node's ESM loader cannot resolve.
//
// Usage (from this scripts/ directory):
//   npx tsx --env-file=../../../../.env.test render-aweber.mjs <sendsDir> [outDir]   # local DB
//   npx tsx --env-file=../../../../.env      render-aweber.mjs <sendsDir> [outDir]   # PRODUCTION
//
//   <sendsDir> holds NN-*.md drafts and an optional schedule.json { "NN": "<ISO8601>" }.
//   Writes <outDir>/NN-<slug>.html, .txt, and index.json. Default outDir = <sendsDir>/_build.
//
// WHY A DATABASE: a draft carrying `**Continue Seed:**` frontmatter gets an
// opaque short link (`/e/<code>`) instead of the legacy `?campaign=` URL. The
// code is a row in `email_link_codes` holding the authored continuation
// content, so the lander can pick the reading back up. That row must live in
// whatever database serves the real site, which is why a REAL SEND has to be
// rendered against production. There is no ambient default: DATABASE_URL must
// be set explicitly, and the target host is printed before anything is written.
//
// Drafts WITHOUT a `**Continue Seed:**` keep the legacy `?campaign=` URL
// untouched and need no database at all — migration is per-send, opt-in.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { upsertEmailLinkCodeForCampaign } from '../../../../server/lib/emailLinkCodes.ts';
import { pool } from '../../../../server/lib/db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Flags (e.g. --mint-production) may appear anywhere; positional args are
// <sendsDir> then [outDir].
const ARGS = process.argv.slice(2).filter(a => !a.startsWith('--'));
const SRC = path.resolve(ARGS[0] || path.join(__dirname, '../sends/cycle-1'));
const OUT = path.resolve(ARGS[1] || path.join(SRC, '_build'));
const schedule = fs.existsSync(path.join(SRC, 'schedule.json'))
  ? JSON.parse(fs.readFileSync(path.join(SRC, 'schedule.json'), 'utf8')) : {};

// This deck is Evelyn's. A future persona deck gets its own renderer (or a flag).
const PERSONA_SLUG = 'evelyn-cross';

const BANNER = "https://hostedimages-cdn.aweber-static.com/NDQyNzMw/optimized/8bf6df906cab4e11b58e484fe450705a.png";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inlineHtml = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
const inlineTxt = (s) => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
// Legacy link: everything the lander needs in the query string. Used for any
// draft that hasn't been given a Continue Seed yet.
const legacyCtaUrl = (slug) =>
  `https://www.theseerwithin.com/evelyn?email={!email}&bucket=love&src=aweber` +
  `&campaign=${slug}&utm_source=aweber&utm_medium=email&utm_campaign=${slug}`;
// Short link: the campaign travels as an opaque PATH segment (query params get
// stripped by link-privacy proxies and mangled by ESP click wrappers). `email`
// stays a best-effort query param — `{!email}` is AWeber's merge tag for this
// list, and /e/:code forwards it to the lander to prefill the email field.
const shortCtaUrl = (code) => `https://www.theseerwithin.com/e/${code}?email={!email}`;
const ctaUrl = (m) => m.ctaUrl;
const ctaUrlHtml = (m) => m.ctaUrl.replace(/&/g, '&amp;');

function parse(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const i = raw.indexOf('\n---\n');
  const front = raw.slice(0, i), body = raw.slice(i + 5).trim();
  const name = path.basename(file);
  // Frontmatter values are SINGLE-LINE. A wrapped value would silently
  // truncate at the newline and land half a sentence in a production row, so
  // any continuation line (one that isn't blank and doesn't start a new
  // `- **Field:**`) is called out rather than quietly eaten.
  const pick = (re, label) => {
    const m = front.match(re);
    if (!m) return '';
    if (label) {
      const rest = front.slice(m.index + m[0].length);
      const next = rest.split('\n')[1];
      if (next !== undefined && next.trim() !== '' && !/^\s*-\s*\*\*/.test(next) && !/^---/.test(next.trim())) {
        console.error(`  ⚠ ${name}: **${label}:** looks wrapped onto the next line — only the first line is used.`);
        console.error(`      dropped: ${next.trim().slice(0, 60)}…`);
      }
    }
    return m[1]?.trim() || '';
  };
  return {
    file: name,
    num: (front.match(/^#\s*(\d+)/m) || [])[1] || '',
    subject: pick(/\*\*Subject:\*\*\s*`([^`]+)`/),
    preheader: pick(/\*\*Preheader:\*\*\s*(.+)/),
    slug: (front.match(/campaign=([a-z0-9-]+)/) || [])[1] || 'reframe',
    ctaLabel: pick(/\*\*CTA:\*\*\s*(.+?)\s*→/) || 'Come talk to me',
    // Live Thread continuity content, snapshotted into email_link_codes at
    // render time. continueSeed is the trigger: no seed => no code, no DB.
    continueSeed: pick(/\*\*Continue Seed:\*\*\s*(.+)/, 'Continue Seed'),
    openLoop: pick(/\*\*Open Loop:\*\*\s*(.+)/, 'Open Loop'),
    readingRecap: pick(/\*\*Reading Recap:\*\*\s*(.+)/, 'Reading Recap'),
    // Lander context that used to ride in the legacy link's query string and
    // now rides on the minted row (the /e/ redirector rebuilds the query
    // string from it). `bucket` is load-bearing: it selects Drip 1's
    // bucket-specific phrase. This deck is love-weighted, hence the default.
    bucket: pick(/\*\*Bucket:\*\*\s*(.+)/) || 'love',
    body,
  };
}

// Hosts where minting is unremarkable. Anything else is a real, shared
// database and needs the operator to say so out loud (--mint-production).
const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1', '::1'];
const MINT_PRODUCTION_FLAG = '--mint-production';

/** Resolve — and gate — the database this run will write to.
 *
 *  Two ways to get this wrong, and both are silent without a gate:
 *   - DATABASE_URL unset: pg falls back to libpq defaults and writes to
 *     whatever local database shares the OS user's name.
 *   - DATABASE_URL pointing somewhere real by accident: a build that looks
 *     perfect but whose codes only exist in a database the live site can't
 *     see. That one ends with ~59k readers bouncing to /personas.
 *
 *  So: a non-local host requires an explicit --mint-production flag, and the
 *  resolved target is stamped into index.json (`minted_into`) so
 *  aweber-ops.mjs can refuse to schedule a build minted into the wrong place. */
function requireDatabaseTarget() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL is not set, and these drafts need /e/ codes minted.');
    console.error('  Codes are rows in email_link_codes — this script will not guess a database.');
    console.error('  Local:      npx tsx --env-file=../../../../.env.test render-aweber.mjs <sendsDir>');
    console.error(`  PRODUCTION: npx tsx --env-file=../../../../.env      render-aweber.mjs <sendsDir> ${MINT_PRODUCTION_FLAG}`);
    process.exit(1);
  }
  let host, name;
  try {
    const u = new URL(url);
    host = u.hostname;
    name = u.pathname.replace(/^\//, '') || '(default)';
  } catch {
    console.error(`ERROR: DATABASE_URL is not a valid URL: ${url}`);
    process.exit(1);
  }

  if (!LOCAL_DB_HOSTS.includes(host) && !process.argv.includes(MINT_PRODUCTION_FLAG)) {
    console.error(`ERROR: refusing to mint /e/ codes into a non-local database (${name} @ ${host}).`);
    console.error('  This writes rows every reader of the send depends on. If that is what you');
    console.error(`  mean to do, say so explicitly by adding ${MINT_PRODUCTION_FLAG} to the command.`);
    process.exit(1);
  }

  const target = `${name}@${host}`;
  console.error(`  ⚑ minting /e/ codes into database "${name}" @ ${host}`);
  return target;
}
const blocks = (m) => m.body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

function bodyHtml(m) {
  return blocks(m).map((b) => {
    if (/^>\s*\*\*↳ THE REFRAME/.test(b)) {
      const rf = b.replace(/^>\s?/, '').replace(/^\*\*↳ THE REFRAME\.\*\*\s*/, '');
      return `<div style="border-left:3px solid #7a4f7a;background:#f4ecf4;padding:14px 18px;margin:6px 0 18px;font-size:17px;line-height:1.55;color:#2c2530;">${inlineHtml(rf)}</div>`;
    }
    if (/^>/.test(b)) return `<div style="border-left:3px solid #b79db4;background:#f6f0f5;padding:12px 16px;margin:0 0 16px;font-style:italic;color:#4a414c;">${inlineHtml(b.replace(/^>\s?/, ''))}</div>`;
    if (/^\*\*→/.test(b)) {
      const label = (b.match(/\[([^\]]+)\]/) || b.match(/→\s*([^*\[]+)/) || [, m.ctaLabel])[1].trim();
      return `<hr style="background:#DEE0E8;border:0;height:1px;margin:18px 0;">\n        <p style="margin:0 0 16px;line-height:1.6;"><a href="${ctaUrlHtml(m)}" target="_blank" rel="noopener noreferrer" style="color:#0000ff;text-decoration:underline;font-weight:bold;">&rarr; ${esc(label)}</a></p>`;
    }
    if (/^—\s*Evelyn/.test(b)) return `<p style="margin:0 0 16px;line-height:1.6;">&mdash; Evelyn</p>`;
    return `<p style="margin:0 0 16px;line-height:1.6;">${inlineHtml(b)}</p>`;
  }).join('\n        ');
}
function bodyText(m) {
  return blocks(m).map((b) => {
    if (/^>\s*\*\*↳ THE REFRAME/.test(b)) return inlineTxt(b.replace(/^>\s?/, '').replace(/^\*\*↳ THE REFRAME\.\*\*\s*/, ''));
    if (/^>/.test(b)) return inlineTxt(b.replace(/^>\s?/, ''));
    if (/^\*\*→/.test(b)) { const label = (b.match(/\[([^\]]+)\]/) || b.match(/→\s*([^*\[]+)/) || [, m.ctaLabel])[1].trim(); return `→ ${label}\n${ctaUrl(m)}`; }
    return inlineTxt(b);
  }).join('\n\n');
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
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${esc(m.preheader)}</div>
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
</body></html>`;

const files = fs.readdirSync(SRC).filter(f => /^\d\d-.*\.md$/.test(f)).sort();
const sends = files.map(f => parse(path.join(SRC, f)));

// A campaign slug is the identity a code is keyed on, so two drafts sharing
// one would cross-wire: the second overwrites the first's row, both emails
// ship the same code, and one email's reader gets the other's continuation.
// check.mjs only gates that a slug EXISTS, so this is the first place the
// collision could be caught — before phase 1 touches the database.
const bySlug = new Map();
for (const m of sends) {
  if (bySlug.has(m.slug)) {
    console.error(`ERROR: duplicate campaign slug "${m.slug}" in this cycle:`);
    console.error(`      ${bySlug.get(m.slug).file}`);
    console.error(`      ${m.file}`);
    console.error('  Two sends sharing a slug would share one /e/ code, so a reader of one');
    console.error("  email would get the other email's continuation. Give each send its own");
    console.error('  `campaign=` slug in its **CTA:** frontmatter line.');
    process.exit(1);
  }
  bySlug.set(m.slug, m);
}

// Phase 1 — resolve every CTA URL BEFORE writing anything. Minting can fail
// (unreachable DB, missing email_link_codes table) and a half-written _build/
// alongside half-minted rows is the worst place to stop.
const needCodes = sends.filter(m => m.continueSeed);
const missingSeed = sends.filter(m => !m.continueSeed);

// Optional manifest: `short-links.json` = ["04", "07"], the draft numbers this
// cycle INTENDS to short-link. Without it the ⚠ block below fires on every run
// (8 of 9 cycle-1 drafts are legacy), which trains an operator to skip reading
// it — and that's exactly when a `**Contnue Seed:**` typo, silently downgrading
// a send to the legacy link, would be sitting in the middle of it. With it, a
// deviation in either direction is a hard failure and the ⚠ block means
// "as declared".
const MANIFEST = path.join(SRC, 'short-links.json');
if (fs.existsSync(MANIFEST)) {
  const declared = new Set(JSON.parse(fs.readFileSync(MANIFEST, 'utf8')).map(String));
  const actual = new Set(needCodes.map(m => m.num));
  const missing = [...declared].filter(n => !actual.has(n)).sort();
  const unexpected = [...actual].filter(n => !declared.has(n)).sort();
  if (missing.length || unexpected.length) {
    console.error(`ERROR: this cycle's short-links.json does not match the drafts.`);
    for (const n of missing) {
      const m = sends.find(s => s.num === n);
      console.error(`  #${n} is declared short-linked but has no **Continue Seed:**` +
        (m ? ` (${m.file}) — check the label spelling, it is exact and case-sensitive.` : ' — no such draft.'));
    }
    for (const n of unexpected) {
      const m = sends.find(s => s.num === n);
      console.error(`  #${n} (${m.file}) has a **Continue Seed:** but is not declared in short-links.json.`);
    }
    console.error(`  ${MANIFEST}`);
    process.exit(1);
  }
  console.error(`  ✓ short links as declared in short-links.json: ${[...declared].sort().map(n => '#' + n).join(' ') || '(none)'}`);
  if (missingSeed.length) {
    console.error(`    ${missingSeed.length} draft(s) on the legacy ?campaign= link, as expected.`);
  }
} else if (missingSeed.length) {
  console.error(`  ⚠ ${missingSeed.length} draft(s) have no **Continue Seed:** — keeping the legacy ?campaign= link:`);
  for (const m of missingSeed) console.error(`      ${m.file}  (${m.slug})`);
  console.error('    Add **Continue Seed:** (and optionally **Open Loop:** / **Reading Recap:**) to the');
  console.error('    frontmatter to give a draft a /e/ short link. Add a short-links.json listing the');
  console.error('    draft numbers that SHOULD be short-linked to turn this warning into a hard gate.');
}
for (const m of missingSeed) m.ctaUrl = legacyCtaUrl(m.slug);

let mintedInto = null;
if (needCodes.length) {
  mintedInto = requireDatabaseTarget();
  for (const m of needCodes) {
    let result;
    try {
      result = await upsertEmailLinkCodeForCampaign({
        personaSlug: PERSONA_SLUG,
        campaign: m.slug,
        continueSeed: m.continueSeed,
        openLoop: m.openLoop || undefined,
        readingRecap: m.readingRecap || undefined,
        bucket: m.bucket || undefined,
        src: 'aweber',
      });
    } catch (err) {
      // Codes minted before this point stay in the database. That's harmless:
      // minting is campaign-idempotent, so a re-run picks them back up.
      console.error(`\nERROR: minting a /e/ code for ${m.file} (${m.slug}) failed.`);
      if (err?.code === '42P01') {
        console.error('  The email_link_codes table does not exist in this database.');
        console.error('  Apply migrations/020_email_link_codes.sql there first.');
      }
      console.error(`  ${err?.message ?? err}`);
      await pool.end();
      process.exit(1);
    }
    m.code = result.code;
    m.codeAction = result.action;
    m.ctaUrl = shortCtaUrl(result.code);
    console.error(`      ${result.action.padEnd(7)} /e/${result.code}  ${m.slug}`);
  }
}
await pool.end();

// Phase 2 — write the build output. (Only now, so an aborted phase 1 doesn't
// even leave an empty _build/ behind.)
fs.mkdirSync(OUT, { recursive: true });
const index = [];
for (const m of sends) {
  const base = `${m.num}-${m.slug}`;
  fs.writeFileSync(path.join(OUT, base + '.html'), fullHtml(m));
  fs.writeFileSync(path.join(OUT, base + '.txt'), bodyText(m));
  const subjectBytes = Buffer.byteLength(m.subject, 'utf8');
  if (subjectBytes > 120) console.error(`  ⚠ #${m.num} subject is ${subjectBytes} bytes (>120 AWeber limit)`);
  index.push({ num: m.num, slug: m.slug, subject: m.subject, subject_bytes: subjectBytes,
               scheduled_for: schedule[m.num] || null, html_file: base + '.html', text_file: base + '.txt',
               link_kind: m.code ? 'short' : 'legacy', code: m.code || null, cta_url: m.ctaUrl,
               // Which database this send's code actually lives in. aweber-ops.mjs
               // refuses to schedule a short-linked send minted anywhere but
               // production — a build minted locally looks perfect and would send
               // every clicker to /personas.
               minted_into: m.code ? mintedInto : null });
}
index.sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)));
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2));
console.log(`rendered ${index.length} broadcasts -> ${OUT}`);
for (const e of index) console.log(`  ${e.scheduled_for || '(unscheduled)'}  #${e.num}  ${e.subject_bytes}b  ${e.link_kind.padEnd(6)} ${e.subject.slice(0, 50)}`);
