// Save each email's chat notes as an email_link_codes row and print its /e/<code> short link.
//
// ⚠ WRITES TO WHATEVER DATABASE `DATABASE_URL` POINTS AT — for a real send that is PRODUCTION.
//   Show the operator the 4 notes first. The target DB is printed before anything is written.
//   Idempotent per (persona, campaign): re-running keeps the same code ('reused' / 'updated').
//
// Usage (from the repo root, so tsx resolves the server imports):
//   npx tsx --env-file=<path to .env> docs/aweber/evelyn-storytelling/scripts/mint-short-links.mts \
//       docs/aweber/evelyn-storytelling/emails/03-slug.md [more.md ...]
// Then paste the printed link into the email's header as:
//   **Short Link:** `https://www.theseerwithin.com/e/<code>?email={!email}`
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const { upsertEmailLinkCodeForCampaign } = await import(path.join(ROOT, 'server/lib/emailLinkCodes.ts'));
const { pool } = await import(path.join(ROOT, 'server/lib/db.ts'));

const VALID_BUCKETS = ['love', 'money', 'purpose', 'specific']; // must match server/routes/evelynLander.ts

function field(src: string, name: string, required = true): string | undefined {
  const m = src.match(new RegExp('^\\*\\*' + name + ':\\*\\*\\s*(.+)$', 'm'));
  if (!m && required) throw new Error(`missing **${name}:**`);
  return m?.[1].trim().replace(/^`|`$/g, '');
}

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: mint-short-links.mts <email.md> [...]'); process.exit(1); }
const u = new URL(process.env.DATABASE_URL!);
console.log(`target DB: ${u.pathname.slice(1)} @ ${u.hostname}`);

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const bucket = field(src, 'Bucket')!;
  if (!VALID_BUCKETS.includes(bucket)) throw new Error(`${f}: bucket "${bucket}" not in ${VALID_BUCKETS}`);
  const r = await upsertEmailLinkCodeForCampaign({
    personaSlug: 'evelyn-cross',
    campaign: field(src, 'Campaign')!,
    continueSeed: field(src, 'Continue Seed')!,
    readingRecap: field(src, 'Reading Recap'),
    openLoop: field(src, 'Open Loop'),
    bigIdea: field(src, 'Big Idea'),
    bucket,
    src: 'aweber',
  });
  console.log(`${r.action.padEnd(8)} ${path.basename(f)}  →  https://www.theseerwithin.com/e/${r.code}?email={!email}`);
}
await pool.end();
