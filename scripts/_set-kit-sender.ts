// Switch the sending address on existing Kit broadcasts (draft or scheduled) via the V4 API,
// preserving everything else incl. send_at (so scheduled stays scheduled).
// GET -> PUT (email_address=NEW, all other fields preserved) -> GET to verify.
// Stops on the first failure (canary).
//   SENDER="contact@cosmonumerology.com" npx tsx scripts/_set-kit-sender.ts <date> [<date> ...]
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const key = process.env.KIT_API_KEY;
const SENDER = process.env.SENDER;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }
if (!SENDER) { console.error('❌ SENDER env not set (the new sending address)'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const drafts: Record<string, any> = JSON.parse(readFileSync(path.join(OUTBOX, 'kit-drafts.json'), 'utf8'));

const dates = process.argv.slice(2);
if (!dates.length) { console.error('usage: _set-kit-sender.ts <date> [date ...]'); process.exit(1); }

const H = { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key };
const get = async (id: number) => {
  const r = await fetch(`https://api.kit.com/v4/broadcasts/${id}`, { headers: H });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`GET ${id} HTTP ${r.status} ${JSON.stringify(j)}`);
  return j.broadcast;
};

console.log(`Switching sender → ${SENDER}\n`);
for (const date of dates) {
  const id = drafts[date]?.id;
  if (!id) { console.error(`❌ ${date}: no draft id`); process.exit(1); }
  const cur = await get(id);
  console.log(`── ${date}  broadcast ${id}  status=${cur.status}  send_at=${cur.send_at}`);
  console.log(`   from ${cur.email_address}  →  ${SENDER}`);

  const body = {
    subject: cur.subject,
    content: cur.content,
    description: cur.description,
    preview_text: cur.preview_text,
    public: cur.public ?? false,
    send_at: cur.send_at,                  // preserve schedule (or null if draft)
    email_address: SENDER,                 // <-- the only change
    email_template_id: cur.email_template?.id,
    subscriber_filter: cur.subscriber_filter,
  };

  const r = await fetch(`https://api.kit.com/v4/broadcasts/${id}`, { method: 'PUT', headers: H, body: JSON.stringify(body) });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) { console.error(`❌ ${date}: PUT HTTP ${r.status} ${JSON.stringify(j)}`); process.exit(1); }

  const after = await get(id);
  const ok = after.email_address === SENDER && after.status === cur.status && after.send_at === cur.send_at;
  console.log(`   → sender=${after.email_address}  status=${after.status}  send_at=${after.send_at}`);
  if (!ok) { console.error(`❌ ${date}: verification failed — stopping.`); process.exit(2); }
  console.log(`   ✅ switched.\n`);
}
console.log('Done.');
