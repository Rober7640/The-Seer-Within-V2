/**
 * Sync the Evelyn tarot email schedule into system_config.email_canon — the
 * per-persona "Today's letter" anchor the chat engine injects into
 * [RUNTIME_CONTEXT] prompts (improve-v2 #27: a client arriving from an email
 * gets the payoff instead of a disowned "automated email").
 *
 * Source of truth: docs/aweber/evelyn-tarot-emails/STATE.md (the send ledger)
 * + the NN-slug.html files (preheader = the hook line). Only SENT/SCHEDULED
 * rows are synced; DRAFT/held rows are skipped. The whole calendar is written
 * at once, so this only needs re-running after a batch is (re)scheduled —
 * there is no daily job. The engine picks the newest entry whose send time
 * (sentAtUtc) has passed and is ≤48h old.
 *
 *   npx tsx scripts/sync-email-canon.ts --dry   # show what would be written
 *   npx tsx scripts/sync-email-canon.ts         # write system_config.email_canon
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EMAIL_DIR = path.join(ROOT, 'docs/aweber/evelyn-tarot-emails');
const STATE = path.join(EMAIL_DIR, 'STATE.md');
const SLUG = 'evelyn-cross';
const YEAR = 2026;               // the STATE.md ledger only shows month+day
const SEND_UTC = '10:30';        // daily slot: 6:30pm SGT = 10:30 UTC
const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function cardName(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w === 'of' || w === 'the' ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/^the /, 'The ');
}

function preheader(file: string): string {
  const raw = readFileSync(file, 'utf8');
  const text = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ');
  // Preheader sits between the inlined CSS and the invisible-padding run (U+200C).
  const beforePad = text.split('‌')[0];
  return beforePad.slice(beforePad.lastIndexOf('}') + 1).trim();
}

async function main() {
  const dry = process.argv.includes('--dry');
  const state = readFileSync(STATE, 'utf8');

  type Entry = { date: string; sentAtUtc: string; card: string; subject: string; essence: string; promise: string };
  const entries: Entry[] = [];

  // Ledger rows: | NN — Mon D | `slug` | state | subject | hook | **STATUS** … |
  const rowRe = /^\|\s*(\d{2})\s*—\s*~{0,2}([A-Z][a-z]{2})\s+(\d{1,2})~{0,2}\s*\|\s*`([a-z-]+)`\s*\|[^|]*\|([^|]*)\|[^|]*\|([^|]*)\|/;
  for (const line of state.split('\n')) {
    const m = line.match(rowRe);
    if (!m) continue;
    const [, nn, mon, day, slug, subjectRaw, statusRaw] = m;
    if (!/\*\*(SENT|SCHEDULED)\*\*/.test(statusRaw)) continue; // skip DRAFT/held
    const date = `${YEAR}-${MONTHS[mon]}-${day.padStart(2, '0')}`;
    const file = path.join(EMAIL_DIR, `${nn}-${slug}.html`);
    if (!existsSync(file)) {
      console.warn(`skip ${nn}-${slug}: html file missing`);
      continue;
    }
    const card = cardName(slug);
    const subject = subjectRaw.replace(/\{first\},?\s*/g, '').trim();
    const hook = preheader(file);
    entries.push({
      date,
      sentAtUtc: `${date}T${SEND_UTC}:00Z`,
      card,
      subject,
      essence: `The daily tarot letter drew ${card}. Its message: ${hook}`,
      promise: `Come sit with me and I will read what ${card} is asking of your situation specifically.`,
    });
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  console.log(`parsed ${entries.length} SENT/SCHEDULED letters (${entries[0]?.date} … ${entries[entries.length - 1]?.date})`);
  const now = Date.now();
  const current = [...entries].reverse().find(
    (e) => now >= Date.parse(e.sentAtUtc) && now - Date.parse(e.sentAtUtc) <= 48 * 3600 * 1000,
  );
  console.log('current anchor at this moment:', current ? `${current.date} — ${current.card}` : 'none (no letter in the last 48h)');

  if (dry) {
    entries.forEach((e) => console.log(` ${e.date} ${e.card.padEnd(18)} "${e.subject}"`));
    return process.exit(0);
  }

  const value = JSON.stringify({ [SLUG]: entries });
  const existing = await db.select().from(systemConfig).where(eq(systemConfig.configKey, 'email_canon')).limit(1);
  if (existing[0]) {
    await db.update(systemConfig).set({ configValue: value }).where(eq(systemConfig.configKey, 'email_canon'));
  } else {
    await db.insert(systemConfig).values({
      configKey: 'email_canon',
      configValue: value,
      configType: 'json',
      description: 'Per-persona daily email anchors (slug → [{date, sentAtUtc, card, subject, essence, promise}]); the chat engine injects the newest ≤48h entry as "Today\'s letter" into [RUNTIME_CONTEXT] prompts (improve-v2 #27). Re-run scripts/sync-email-canon.ts after scheduling a batch.',
    });
  }
  console.log(`email_canon written: ${entries.length} entries for ${SLUG}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
