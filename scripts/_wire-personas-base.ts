/**
 * SHIP: write the Aiden & Luna B12+ forks to personas.base_system_prompt — and ONLY
 * those two rows. Extracts each fork's text from server/scripts/seed.ts AS TEXT (never
 * imports it — seed.ts runs seedDatabase() on import). This is the scoped alternative
 * to `npm run seed`, which would overwrite EVERY persona from its template.
 *
 *   npx tsx scripts/_wire-personas-base.ts --dry   # show what would change, no write
 *   npx tsx scripts/_wire-personas-base.ts         # write the two rows
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { personas } from '@shared/schema';
import { eq } from 'drizzle-orm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'server/scripts/seed.ts');

function extractFork(src: string, fn: string): string {
  const re = new RegExp(`function ${fn}\\(\\): string \\{\\s*return \`([\\s\\S]*?)\`;\\n\\}`);
  const m = src.match(re);
  if (!m) throw new Error(`could not extract ${fn} from seed.ts`);
  let body = m[1];
  if (/\\`|\\\$\{/.test(body)) body = body.replace(/\\`/g, '`').replace(/\\\$\{/g, '${').replace(/\\\\/g, '\\');
  return body;
}

const TARGETS = [
  { slug: 'aiden-powers', fn: 'getAidenSystemPrompt', marker: '[NUMEROLOGY_PERSONA]' },
  { slug: 'luna-voss',    fn: 'getLunaSystemPrompt',  marker: '[ASTROLOGY_PERSONA]' },
];

async function main() {
  const dry = process.argv.includes('--dry');
  const src = readFileSync(SEED, 'utf8');
  for (const t of TARGETS) {
    const prompt = extractFork(src, t.fn);
    if (!prompt.startsWith(t.marker)) throw new Error(`${t.fn} does not start with ${t.marker}`);
    const [p] = await db.select({ id: personas.id, len: personas.baseSystemPrompt }).from(personas).where(eq(personas.slug, t.slug));
    if (!p) throw new Error(`persona ${t.slug} not found`);
    console.log(`${t.slug}: was ${String(p.len).length} chars → ${prompt.length} chars (marker ok, first line: ${prompt.split('\n')[0]})`);
    if (dry) continue;
    await db.update(personas).set({ baseSystemPrompt: prompt, updatedAt: new Date() }).where(eq(personas.slug, t.slug));
    console.log(`   ✅ written to base_system_prompt`);
  }
  console.log(dry ? '\n--dry: nothing written' : '\ndone. Prompts are LIVE (served on next request). Remember: deploy the code for full capability.');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
