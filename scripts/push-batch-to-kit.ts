// Push a built batch (outbox/manifest.json + <date>.html) to Kit as DRAFT broadcasts via
// the V4 API. Always drafts (send_at:null) — scheduling/sending stays a human decision.
// Subjects come from the manifest (exact), with {firstName} converted to Kit merge syntax.
// Records the created broadcast ids in outbox/kit-drafts.json (for review/cleanup).
//   npx tsx scripts/push-batch-to-kit.ts                 # all days in the manifest
//   npx tsx scripts/push-batch-to-kit.ts 2026-06-20 2026-06-26   # an inclusive date range
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set in .env'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTBOX = path.resolve(__dirname, '../docs/kit/luna-voss-emails/outbox');
const manifest: any[] = JSON.parse(readFileSync(path.join(OUTBOX, 'manifest.json'), 'utf8'));

const from = process.argv[2];
const to = process.argv[3];
const days = manifest.filter(d => (!from || d.date >= from) && (!to || d.date <= to));
if (!days.length) { console.error('❌ no manifest entries in range'); process.exit(1); }

const KIT_FIRST_NAME = '{{ subscriber.first_name | default: "friend" }}';
const draftsFile = path.join(OUTBOX, 'kit-drafts.json');
const record: Record<string, any> = existsSync(draftsFile) ? JSON.parse(readFileSync(draftsFile, 'utf8')) : {};

console.log(`Pushing ${days.length} day(s) to Kit as drafts…\n`);
let ok = 0, fail = 0;

for (const d of days) {
  const htmlPath = path.join(OUTBOX, `${d.date}.html`);
  if (!existsSync(htmlPath)) { console.error(`  ✗ ${d.date}  (no ${d.date}.html)`); fail++; continue; }
  const html = readFileSync(htmlPath, 'utf8');
  const subject = String(d.subject).split('{firstName}').join(KIT_FIRST_NAME);

  const res = await fetch('https://api.kit.com/v4/broadcasts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
    body: JSON.stringify({
      subject,
      content: html,
      description: `Luna daily ${d.date} · template ${d.template} · ${d.blurbId}`,
      public: false,
      send_at: null,                 // draft — does NOT send
      preview_text: d.preheader ?? '',
    }),
  });
  const data: any = await res.json().catch(() => null);
  if (res.ok && data?.broadcast?.id) {
    const id = data.broadcast.id;
    record[d.date] = { id, template: d.template, subject, url: `https://app.kit.com/campaigns/${id}/draft` };
    console.log(`  ✓ ${d.date}  [${d.template}]  draft ${id}`);
    ok++;
  } else {
    console.error(`  ✗ ${d.date}  HTTP ${res.status}  ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    fail++;
  }
}

writeFileSync(draftsFile, JSON.stringify(record, null, 2));
console.log(`\nDone. ${ok} draft(s) created, ${fail} failed. Ids → ${path.relative(process.cwd(), draftsFile)}`);
