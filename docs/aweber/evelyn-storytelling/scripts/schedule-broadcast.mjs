// One de-duped multi-list broadcast for an Evelyn storytelling email — the way 02 was sent
// (home list theseerwithin_free + 14 include_lists, segment "Active Subscribers").
//   node docs/aweber/evelyn-storytelling/scripts/schedule-broadcast.mjs create <send.html> <send.txt> "<subject>"   -> draft only, prints id + checks
//   node docs/aweber/evelyn-storytelling/scripts/schedule-broadcast.mjs schedule <id> <ISO-UTC>
//   node docs/aweber/evelyn-storytelling/scripts/schedule-broadcast.mjs list               -> scheduled on the home list (date, id, include count, subject)
// Auth + .env come from the reframe deck's aweber-lib.mjs, which reads <its repo root>/.env and persists
// rotated tokens there. ~/tsw-preview has no .env, so point AWEBER_LIB at a checkout that has one:
//   AWEBER_LIB="<repo with .env>/docs/aweber/evelyn-reframe-deck/scripts/aweber-lib.mjs" node … schedule-broadcast.mjs …
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const LIB = process.env.AWEBER_LIB || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../evelyn-reframe-deck/scripts/aweber-lib.mjs');
const { api, listBase } = await import(pathToFileURL(LIB).href);
const HOME = '6936953';
const A = 'https://api.aweber.com/1.0/accounts/442730/lists/';
const INCLUDE = ['6936955','6937139','6939683','6956485','6956486','6956488','6956490','6963139','6963143','6969209','6970613','6971693','6971828','6973431'].map(i => A + i);
const SEGMENT = A + HOME + '/segments/8';
const base = listBase(HOME);
const [cmd, ...a] = process.argv.slice(2);
if (cmd === 'create') {
  const [htmlF, txtF, subject] = a;
  const html = fs.readFileSync(htmlF, 'utf8'), text = fs.readFileSync(txtF, 'utf8');
  const drafts = await api('GET', `${base}/broadcasts?status=draft&ws.size=100`);
  if (!drafts.ok) { console.error('STOP: cannot read drafts', drafts.status); process.exit(1); }
  const dup = drafts.json.entries.find(b => b.subject === subject);
  if (dup) { console.error('STOP: a draft with this subject already exists:', dup.broadcast_id); process.exit(1); }
  const c = await api('POST', `${base}/broadcasts`, { form: {
    subject, body_html: html, body_text: text,
    click_tracking_enabled: 'true', is_archived: 'true', notify_on_send: 'true',
    include_lists: JSON.stringify(INCLUDE), segment_link: SEGMENT,
  }});
  if (!c.ok) { console.error('create failed', c.status, c.text.slice(0, 400)); process.exit(1); }
  const id = (c.location || c.json.self_link).split('/').pop();
  const g = (await api('GET', `${base}/broadcasts/${id}`)).json;
  const inc = (g.include_lists || []).map(x => x.split('/').pop()).sort();
  const want = INCLUDE.map(x => x.split('/').pop()).sort();
  console.log(`draft id=${id} status=${g.status} subject=${g.subject}`);
  console.log(`include_lists ${inc.length}/14 match=${JSON.stringify(inc) === JSON.stringify(want)}  exclude=${(g.exclude_lists||[]).length}  segment=${g.segment_name}`);
  console.log(`body_html ${g.body_html?.length} vs file ${html.length} · body_text ${g.body_text?.length} vs file ${text.length} · click_tracking=${g.click_tracking_enabled}`);
} else if (cmd === 'schedule') {
  const [id, when] = a;
  const s = await api('POST', `${base}/broadcasts/${id}/schedule`, { form: { scheduled_for: when } });
  if (!s.ok) { console.error('schedule failed', s.status, s.text.slice(0, 400)); process.exit(1); }
  const g = (await api('GET', `${base}/broadcasts/${id}`)).json;
  console.log(`id=${id} status=${g.status} when=${g.scheduled_for} include=${(g.include_lists||[]).length} subject=${g.subject}`);
} else if (cmd === 'list') {
  const r = await api('GET', `${base}/broadcasts?status=scheduled&ws.size=100`);
  if (!r.ok) { console.error('STOP: cannot read scheduled broadcasts', r.status); process.exit(1); }
  for (const b of r.json.entries.sort((x, y) => x.scheduled_for.localeCompare(y.scheduled_for))) {
    const g = (await api('GET', b.self_link)).json;
    console.log(`${b.scheduled_for.slice(0, 16)}  id=${b.broadcast_id}  include=${(g.include_lists || []).length}  ${b.subject.replace('{{ subscriber.first_name | capitalize }}', '{name}')}`);
  }
} else { console.error('usage: create <html> <txt> "<subject>" | schedule <id> <ISO> | list'); process.exit(1); }
