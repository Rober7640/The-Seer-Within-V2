// AWeber broadcast operations for the reframe deck. LIVE list — every write hits the real
// `theseerwithin_free` list. Sends stay human-gated; schedule only after a human review.
//
// Usage:
//   node aweber-ops.mjs list [status]         # list broadcasts (default: scheduled)
//   node aweber-ops.mjs cancel <id> [<id>...] # cancel scheduled broadcasts -> draft (recoverable)
//   node aweber-ops.mjs schedule <buildDir>   # create + schedule every entry in <buildDir>/index.json
//                                             # (each needs a non-null scheduled_for)
//                                             # -> goes to EVERY list in AWEBER_DAILY_LIST_IDS
//   node aweber-ops.mjs replicate [--dry-run] # copy the source list's scheduled broadcasts onto the
//                                             # other AWEBER_DAILY_LIST_IDS lists (same bytes, same time)
//
// `list` and `cancel` take an optional --list=<id> (default: AWEBER_LIST_ID).
import fs from 'node:fs';
import path from 'node:path';
import { api, BASE, listId, dailyListIds, listBase } from './aweber-lib.mjs';

const idOf = (e) => e.broadcast_id || (e.self_link || '').split('/').pop();

async function list(status = 'scheduled', which = listId) {
  const r = await api('GET', `${listBase(which)}/broadcasts?status=${status}&ws.size=100`);
  if (!r.ok) { console.error('list failed', r.status, r.text.slice(0, 300)); process.exit(1); }
  const rows = (r.json.entries || []).map(e => ({ id: idOf(e), when: e.scheduled_for, subject: e.subject }))
    .sort((a, b) => String(a.when).localeCompare(String(b.when)));
  console.log(`list ${which} status=${status}: ${rows.length}`);
  for (const s of rows) console.log(`  ${String(s.when).slice(0, 16)}  id=${s.id}  ${(s.subject || '').replace(/\{\{[^}]*\}\}/, '{name}').slice(0, 56)}`);
}

async function cancel(ids, which = listId) {
  const base = listBase(which);
  for (const id of ids) {
    let r = await api('POST', `${base}/broadcasts/${id}/cancel`);
    if (!r.ok) r = await api('POST', `${base}/broadcasts/${id}/cancel`, { form: {} });
    const g = await api('GET', `${base}/broadcasts/${id}`);
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

// Create + schedule one broadcast per (email x list). Every list in
// `dailyListIds` gets its own copy: AWeber broadcasts belong to exactly one
// list, so reaching N audiences means N broadcasts of the same bytes.
async function scheduleOne(base, e, buildDir, label) {
  const c = await api('POST', `${base}/broadcasts`, { form: {
    subject: e.subject,
    body_html: fs.readFileSync(path.join(buildDir, e.html_file), 'utf8'),
    body_text: fs.readFileSync(path.join(buildDir, e.text_file), 'utf8'),
    click_tracking_enabled: 'true',
  }});
  if (!c.ok) { console.error(`create #${e.num} [${label}] failed`, c.status, c.text.slice(0, 200)); process.exit(1); }
  const id = (c.location || c.json.self_link).split('/').pop();
  const s = await api('POST', `${base}/broadcasts/${id}/schedule`, { form: { scheduled_for: e.scheduled_for } });
  if (!s.ok) { console.error(`schedule #${e.num} [${label}] failed`, s.status, s.text.slice(0, 200)); process.exit(1); }
  const g = await api('GET', `${base}/broadcasts/${id}`);
  console.log(`#${e.num}  list=${label}  id=${id}  status=${g.json.status}  when=${g.json.scheduled_for}`);
  if (g.json.status !== 'scheduled') { console.error(`STOP: #${e.num} [${label}] not scheduled.`); process.exit(1); }
  return id;
}

async function schedule(buildDir) {
  const index = JSON.parse(fs.readFileSync(path.join(buildDir, 'index.json'), 'utf8'));
  await preflight(index);
  const targets = dailyListIds.length ? dailyListIds : [listId];
  console.log(`scheduling to ${targets.length} list(s): ${targets.join(', ')}`);
  let n = 0;
  for (const e of index) {
    for (const t of targets) { await scheduleOne(listBase(t), e, buildDir, t); n++; }
  }
  console.log(`scheduled ${n} broadcasts (${index.length} email(s) x ${targets.length} list(s)).`);
}

// Copy the broadcasts already scheduled on `from` onto every other daily list,
// preserving subject, both bodies and the exact send time. Used once, to fold
// the ad-funnel lists into a rotation that was already queued on the shared list.
async function replicate({ from = listId, dryRun = false, only = null } = {}) {
  let targets = dailyListIds.filter(id => id !== from);
  if (only) targets = targets.filter(id => only.includes(id));
  if (!targets.length) { console.error('no target lists: set AWEBER_DAILY_LIST_IDS'); process.exit(1); }
  const r = await api('GET', `${listBase(from)}/broadcasts?status=scheduled&ws.size=100`);
  if (!r.ok) { console.error('read source failed', r.status, r.text.slice(0, 300)); process.exit(1); }
  const src = [];
  for (const e of (r.json.entries || [])) {
    const d = await api('GET', `${listBase(from)}/broadcasts/${idOf(e)}`);
    if (!d.ok) { console.error('read broadcast failed', idOf(e), d.status); process.exit(1); }
    src.push(d.json);
  }
  src.sort((a, b) => String(a.scheduled_for).localeCompare(String(b.scheduled_for)));
  console.log(`source list ${from}: ${src.length} scheduled`);
  console.log(`targets: ${targets.join(', ')}  =>  ${src.length * targets.length} new broadcast(s)`);
  for (const b of src) {
    console.log(`  ${String(b.scheduled_for).slice(0, 16)}  ${(b.subject || '').replace(/\{\{[^}]*\}\}/, '{name}').slice(0, 58)}`);
  }
  if (dryRun) { console.log('\nDRY RUN — nothing written.'); return; }
  if (!src.length) { console.log('nothing to replicate.'); return; }

  // Idempotency: a list that already carries this exact subject at this exact
  // send time is skipped. Re-running after adding lists to AWEBER_DAILY_LIST_IDS
  // must not double-book the lists that were already filled.
  // A scan that FAILS must never be read as "this list has nothing scheduled" —
  // that is exactly how duplicates get created. Any read error here is fatal.
  const already = new Map();
  for (const t of targets) {
    const r2 = await api('GET', `${listBase(t)}/broadcasts?status=scheduled&ws.size=100`);
    if (!r2.ok) {
      console.error(`STOP: cannot read scheduled broadcasts for list ${t} (${r2.status}).`);
      console.error('Refusing to continue — an unreadable list cannot be checked for duplicates.');
      process.exit(1);
    }
    const seen = new Set();
    for (const e of (r2.json.entries || [])) {
      const d = await api('GET', `${listBase(t)}/broadcasts/${idOf(e)}`);
      if (!d.ok) {
        console.error(`STOP: cannot read broadcast ${idOf(e)} on list ${t} (${d.status}).`);
        process.exit(1);
      }
      seen.add(`${d.json.subject}|${d.json.scheduled_for}`);
    }
    already.set(t, seen);
    console.log(`  [${t}] already scheduled: ${seen.size} — those will be skipped`);
  }

  let n = 0, skipped = 0;
  const failed = [];
  for (const b of src) {
    for (const t of targets) {
      if (already.get(t).has(`${b.subject}|${b.scheduled_for}`)) { skipped++; continue; }
      const c = await api('POST', `${listBase(t)}/broadcasts`, { form: {
        subject: b.subject,
        body_html: b.body_html,
        body_text: b.body_text,
        click_tracking_enabled: 'true',
      }});
      if (!c.ok) { console.error(`  create [${t}] FAILED ${c.status} ${c.text.slice(0, 120)}`); failed.push(`${t}:create`); continue; }
      const id = (c.location || c.json.self_link).split('/').pop();
      const sc = await api('POST', `${listBase(t)}/broadcasts/${id}/schedule`, { form: { scheduled_for: b.scheduled_for } });
      if (!sc.ok) { console.error(`  schedule [${t}] id=${id} FAILED ${sc.status} ${sc.text.slice(0, 120)}`); failed.push(`${t}:schedule:${id}`); continue; }
      const g = await api('GET', `${listBase(t)}/broadcasts/${id}`);
      if (!g.ok || g.json.status !== 'scheduled') { console.error(`  [${t}] id=${id} did NOT reach scheduled`); failed.push(`${t}:verify:${id}`); continue; }
      console.log(`  list=${t} id=${id} when=${g.json.scheduled_for}  OK`);
      n++;
    }
  }
  console.log(`replicated ${n}, skipped ${skipped} (already present), failed ${failed.length}.`);
  if (failed.length) {
    console.error('FAILURES:', failed.join(', '));
    console.error('An empty list cannot take a broadcast — that is the usual cause. Re-run after fixing; existing copies are skipped.');
    process.exitCode = 1;
  }
}

const argv = process.argv.slice(2);
const flag = (name) => argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const has = (name) => argv.includes(`--${name}`);
const [cmd, ...args] = argv.filter(a => !a.startsWith('--'));
const whichList = flag('list') || listId;
if (cmd === 'list') await list(args[0], whichList);
else if (cmd === 'cancel') await cancel(args, whichList);
else if (cmd === 'schedule') await schedule(path.resolve(args[0]));
else if (cmd === 'replicate') await replicate({ from: flag('from') || listId, dryRun: has('dry-run'), only: flag('only')?.split(',').map(x => x.trim()).filter(Boolean) || null });
else { console.error('usage: aweber-ops.mjs list [status] | cancel <id...> | schedule <buildDir>'); process.exit(2); }
