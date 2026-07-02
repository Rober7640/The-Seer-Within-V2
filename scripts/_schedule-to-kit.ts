// Schedule existing Kit DRAFT broadcasts to send on their own date via the V4 API.
// Reversible: a future send_at can be reverted to draft before it fires.
// GET current draft -> PUT back identical fields + send_at -> GET to verify status:'scheduled'.
// Stops on the first failure (canary). Never touches content/sender/audience beyond preserving them.
//   npx tsx scripts/_schedule-to-kit.ts <date> [<date> ...]
// date = YYYY-MM-DD; each schedules its mapped broadcast for 08:00 America/New_York that day.
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set in .env'); process.exit(1); }

const SEND_LOCAL_TIME = '08:00:00';
const ET_OFFSET = '-04:00'; // EDT — valid for all July dates

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const drafts: Record<string, any> = JSON.parse(readFileSync(path.join(OUTBOX, 'kit-drafts.json'), 'utf8'));

const dates = process.argv.slice(2);
if (!dates.length) { console.error('usage: _schedule-to-kit.ts <date> [date ...]'); process.exit(1); }

const H = { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
// fetch with backoff on 429 (Kit rate limit) — up to 5 tries, escalating wait.
const fetchRetry = async (url: string, init?: any) => {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, init);
    if (r.status !== 429 || attempt >= 5) return r;
    const wait = 3000 * (attempt + 1);
    console.log(`   …429 rate-limited, waiting ${wait / 1000}s (try ${attempt + 1})`);
    await sleep(wait);
  }
};
const get = async (id: number) => {
  const r = await fetchRetry(`https://api.kit.com/v4/broadcasts/${id}`, { headers: H });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`GET ${id} HTTP ${r.status} ${JSON.stringify(j)}`);
  return j.broadcast;
};

for (const date of dates) {
  const meta = drafts[date];
  if (!meta?.id) { console.error(`❌ ${date}: no draft id in kit-drafts.json`); process.exit(1); }
  const id = meta.id;
  const send_at = `${date}T${SEND_LOCAL_TIME}${ET_OFFSET}`;
  console.log(`\n── ${date}  broadcast ${id}  → send_at ${send_at}`);

  const cur = await get(id);
  if (cur.status !== 'draft') {
    console.error(`❌ ${date}: status is '${cur.status}', not 'draft'. Refusing to touch. Aborting.`);
    process.exit(1);
  }
  const sender = process.env.SENDER || cur.email_address;   // optional sender override
  console.log(`   sender=${sender}${process.env.SENDER ? ` (was ${cur.email_address})` : ' (preserved)'}  template=${cur.email_template?.id}  filter=${JSON.stringify(cur.subscriber_filter)}`);

  const body = {
    subject: cur.subject,
    content: cur.content,
    description: cur.description,
    preview_text: cur.preview_text,
    public: false,                        // do NOT web-publish; just schedule the email
    send_at,
    email_address: sender,
    email_template_id: cur.email_template?.id,
    subscriber_filter: cur.subscriber_filter,
  };

  const r = await fetchRetry(`https://api.kit.com/v4/broadcasts/${id}`, { method: 'PUT', headers: H, body: JSON.stringify(body) });
  const j: any = await r.json().catch(() => null);
  if (!r.ok) { console.error(`❌ ${date}: PUT HTTP ${r.status} ${JSON.stringify(j)}`); process.exit(1); }

  const after = await get(id);
  const ok = after.status === 'scheduled' && after.send_at && after.email_address === sender;
  console.log(`   → status='${after.status}'  send_at='${after.send_at}'  sender=${after.email_address}  public=${after.public}`);
  if (!ok) {
    console.error(`❌ ${date}: did NOT schedule (status='${after.status}'). public:false may be insufficient — stopping before the rest.`);
    process.exit(2);
  }
  console.log(`   ✅ scheduled.`);
}
console.log(`\nDone. Reversible: re-draft any time before send by PUT send_at:null (or in Kit).`);
