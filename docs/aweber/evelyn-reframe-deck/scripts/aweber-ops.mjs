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

async function schedule(buildDir) {
  const index = JSON.parse(fs.readFileSync(path.join(buildDir, 'index.json'), 'utf8'));
  for (const e of index) {
    if (!e.scheduled_for) { console.error(`STOP: #${e.num} has no scheduled_for.`); process.exit(1); }
    if (e.subject_bytes > 120) { console.error(`STOP: #${e.num} subject ${e.subject_bytes}b > 120.`); process.exit(1); }
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
