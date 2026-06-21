// One-shot: replace the placeholder CAN-SPAM address with the real one everywhere it
// lives — local templates/snippets/outbox HTML, the assembler default, all live Kit
// broadcast drafts (GET→replace→PUT, preserving subject/preview), and sequence email #1.
//   npx tsx scripts/fix-address.ts
import 'dotenv/config';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OLD = 'The Seer Within, 123 Placeholder St, Suite 100, City, ST 00000, USA';
const NEW = 'The Seer Within, 930 Washington Avenue, Suite 210-109, Miami Beach, FL 33139, USA';
const key = process.env.KIT_API_KEY;
if (!key) { console.error('❌ KIT_API_KEY not set'); process.exit(1); }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const KIT = path.join(root, 'docs/kit/luna-voss-emails');
const OUTBOX = path.join(KIT, 'outbox');

// ── 1. Local files ──
const localFiles = [
  path.join(KIT, 'luna-email-template-A-daily-sky.html'),
  path.join(KIT, 'luna-email-template-B-visual-feature.html'),
  path.join(KIT, 'luna-email-template-C-chart-wheel.html'),
  path.join(KIT, 'luna-kit-snippets.md'),
  path.join(root, 'server/lib/lunaEmailAssembler.ts'),
  path.join(root, 'scripts/_assembler-sample.html'),
];
for (const f of readdirSync(OUTBOX)) if (f.endsWith('.html')) localFiles.push(path.join(OUTBOX, f));

let localCount = 0;
for (const f of localFiles) {
  try {
    const s = readFileSync(f, 'utf8');
    if (s.includes(OLD)) { writeFileSync(f, s.split(OLD).join(NEW)); localCount++; }
  } catch { /* missing file — skip */ }
}
console.log(`local files updated: ${localCount}`);

// ── 2. Live Kit broadcast drafts ──
const drafts: Record<string, any> = JSON.parse(readFileSync(path.join(OUTBOX, 'kit-drafts.json'), 'utf8'));
let kitOk = 0, kitSkip = 0, kitFail = 0;
for (const [date, rec] of Object.entries(drafts)) {
  const g = await fetch(`https://api.kit.com/v4/broadcasts/${rec.id}`, { headers: { 'X-Kit-Api-Key': key } });
  const b = (await g.json())?.broadcast;
  if (!b?.content?.includes(OLD)) { kitSkip++; continue; }
  const p = await fetch(`https://api.kit.com/v4/broadcasts/${rec.id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
    body: JSON.stringify({ subject: b.subject, content: b.content.split(OLD).join(NEW), preview_text: b.preview_text, public: false, send_at: null }),
  });
  if (p.ok) kitOk++; else { kitFail++; console.error(`  PUT fail ${date} (${rec.id}) HTTP ${p.status}`); }
}
console.log(`Kit broadcasts: ${kitOk} updated, ${kitSkip} skipped (no placeholder), ${kitFail} failed`);

// ── 3. Sequence email #1 (Luna Voss — Follow-up) ──
const SEQ = 2800896, EMAIL = 9987296;
const ge = await fetch(`https://api.kit.com/v4/sequences/${SEQ}/emails/${EMAIL}`, { headers: { 'X-Kit-Api-Key': key } });
const ged = await ge.json();
const se = ged?.email ?? ged?.sequence_email ?? ged;
if (se?.content?.includes(OLD)) {
  const pe = await fetch(`https://api.kit.com/v4/sequences/${SEQ}/emails/${EMAIL}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
    body: JSON.stringify({ subject: se.subject, content: se.content.split(OLD).join(NEW), preview_text: se.preview_text, published: false }),
  });
  console.log(`sequence email #1: ${pe.ok ? 'updated' : 'FAIL HTTP ' + pe.status}`);
} else {
  console.log(`sequence email #1: no placeholder found (HTTP ${ge.status})`);
}
console.log('\nDone.');
