// AWeber broadcast operations for the reframe deck. LIVE list — every write hits the real
// `theseerwithin_free` list. Sends stay human-gated; schedule only after a human review.
//
// Usage:
//   node aweber-ops.mjs list [status]         # list broadcasts (default: scheduled)
//   node aweber-ops.mjs cancel <id> [<id>...] # cancel scheduled broadcasts -> draft (recoverable)
//   node aweber-ops.mjs schedule <buildDir>   # create + schedule every entry in <buildDir>/index.json
//                                             # (each needs a non-null scheduled_for)
import fs from 'node:fs';
import path from 'node:path';
import { api, BASE, listId } from './aweber-lib.mjs';

const idOf = (e) => e.broadcast_id || (e.self_link || '').split('/').pop();

async function list(status = 'scheduled') {
  const r = await api('GET', `${BASE}/broadcasts?status=${status}&ws.size=100`);
  if (!r.ok) { console.error('list failed', r.status, r.text.slice(0, 300)); process.exit(1); }
  const rows = (r.json.entries || []).map(e => ({ id: idOf(e), when: e.scheduled_for, subject: e.subject }))
    .sort((a, b) => String(a.when).localeCompare(String(b.when)));
  console.log(`list ${listId} status=${status}: ${rows.length}`);
  for (const s of rows) console.log(`  ${String(s.when).slice(0, 16)}  id=${s.id}  ${(s.subject || '').replace(/\{\{[^}]*\}\}/, '{name}').slice(0, 56)}`);
}

async function cancel(ids) {
  for (const id of ids) {
    let r = await api('POST', `${BASE}/broadcasts/${id}/cancel`);
    if (!r.ok) r = await api('POST', `${BASE}/broadcasts/${id}/cancel`, { form: {} });
    const g = await api('GET', `${BASE}/broadcasts/${id}`);
    const st = g.ok ? g.json.status : `GET ${g.status}`;
    console.log(`cancel id=${id}  http=${r.status}  now=${st}`);
    if (st !== 'draft') { console.error(`STOP: id ${id} did not become draft.`); process.exit(1); }
  }
  console.log(`cancelled ${ids.length} -> draft.`);
}

// A short-linked send's /e/<code> only resolves if the code exists in the
// database the LIVE SITE reads. Everything else in this pipeline looks
// identical whether it does or not: the rendered HTML is the same bytes, the
// renderer prints `created /e/…` either way. So the last gate before an
// irreversible send asks the live site directly.
const SITE_BASE = 'https://www.theseerwithin.com';
// `minted_into` is a claim the render script made about itself. It's a cheap
// first filter with a better error message, but it cannot detect a Supabase
// project that isn't production, nor the case this whole feature is blocked on
// — migration 020 unapplied, so the table (and the code) simply isn't there.
const PRODUCTION_DB_HOST = /\.supabase\.(com|co)$/;
const RESOLVE_TIMEOUT_MS = 10_000;

/** Ask the live redirector whether this code actually resolves.
 *  A 302 to /evelyn? is the only pass. /personas is the documented
 *  "unresolvable" fallback. Anything else — non-302, wrong location, DNS
 *  failure, timeout — BLOCKS: an unverifiable link is not a verified one, and
 *  the alternative is sending it to the whole list. */
async function resolvesLive(code) {
  try {
    const res = await fetch(`${SITE_BASE}/e/${code}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
    });
    const location = res.headers.get('location') || '';
    if (res.status === 302 && location.startsWith('/evelyn?')) return { ok: true };
    return { ok: false, why: `HTTP ${res.status} -> ${location || '(no location)'}` };
  } catch (err) {
    return { ok: false, why: `request failed: ${err?.message ?? err}` };
  }
}

/** Pre-flight the WHOLE index before creating anything. Scheduling is not
 *  atomic — a mid-batch abort leaves the earlier sends live — so every check
 *  that can be made before the first POST is made here, once. */
async function preflight(index) {
  for (const e of index) {
    if (!e.scheduled_for) { console.error(`STOP: #${e.num} has no scheduled_for.`); process.exit(1); }
    if (e.subject_bytes > 120) { console.error(`STOP: #${e.num} subject ${e.subject_bytes}b > 120.`); process.exit(1); }
    if (e.link_kind !== 'short') continue;

    if (!e.minted_into) {
      console.error(`STOP: #${e.num} (${e.slug}) is short-linked but its index.json has no minted_into.`);
      console.error('  It was built by an older render. Re-render it so the mint target is recorded.');
      process.exit(1);
    }
    const host = String(e.minted_into).split('@').pop();
    if (!PRODUCTION_DB_HOST.test(host)) {
      console.error(`STOP: #${e.num} (${e.slug}) was minted into ${e.minted_into}, not production.`);
      console.error(`  Its link is ${SITE_BASE}/e/${e.code} — that code does not exist in the`);
      console.error('  production database, so every reader who clicks would land on /personas.');
      console.error('  Re-render against production before scheduling:');
      console.error('    npx tsx --env-file=../../../../.env render-aweber.mjs <sendsDir> --mint-production');
      process.exit(1);
    }
  }

  // All at once: one round-trip's worth of wall time for a whole cycle, so
  // there's never a reason to want this skipped.
  const short = index.filter(e => e.link_kind === 'short');
  if (!short.length) return;
  const results = await Promise.all(short.map(e => resolvesLive(e.code)));
  let bad = 0;
  results.forEach((r, i) => {
    if (r.ok) return;
    bad += 1;
    const e = short[i];
    console.error(`STOP: #${e.num} (${e.slug}) — ${SITE_BASE}/e/${e.code} does not resolve on the live site.`);
    console.error(`  ${r.why}`);
  });
  if (bad) {
    console.error('  A short link that does not resolve sends every clicker to /personas. Check that');
    console.error('  migrations/020_email_link_codes.sql is applied in production, then re-render with');
    console.error('  --mint-production. If the site or network is unreachable, fix that and re-run —');
    console.error('  this gate does not pass on "could not check".');
    process.exit(1);
  }
  console.log(`preflight: ${short.length} short link(s) verified live against ${SITE_BASE}.`);
}

async function schedule(buildDir) {
  const index = JSON.parse(fs.readFileSync(path.join(buildDir, 'index.json'), 'utf8'));
  await preflight(index);
  for (const e of index) {
    const c = await api('POST', `${BASE}/broadcasts`, { form: {
      subject: e.subject,
      body_html: fs.readFileSync(path.join(buildDir, e.html_file), 'utf8'),
      body_text: fs.readFileSync(path.join(buildDir, e.text_file), 'utf8'),
      click_tracking_enabled: 'true',
    }});
    if (!c.ok) { console.error(`create #${e.num} failed`, c.status, c.text.slice(0, 200)); process.exit(1); }
    const id = (c.location || c.json.self_link).split('/').pop();
    const s = await api('POST', `${BASE}/broadcasts/${id}/schedule`, { form: { scheduled_for: e.scheduled_for } });
    if (!s.ok) { console.error(`schedule #${e.num} failed`, s.status, s.text.slice(0, 200)); process.exit(1); }
    const g = await api('GET', `${BASE}/broadcasts/${id}`);
    console.log(`#${e.num}  id=${id}  status=${g.json.status}  when=${g.json.scheduled_for}`);
    if (g.json.status !== 'scheduled') { console.error(`STOP: #${e.num} not scheduled.`); process.exit(1); }
  }
  console.log(`scheduled ${index.length} broadcasts.`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'list') await list(args[0]);
else if (cmd === 'cancel') await cancel(args);
else if (cmd === 'schedule') await schedule(path.resolve(args[0]));
else { console.error('usage: aweber-ops.mjs list [status] | cancel <id...> | schedule <buildDir>'); process.exit(2); }
