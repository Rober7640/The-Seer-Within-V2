/**
 * Create/refresh DORMANT DRAFT experiments carrying the Aiden & Luna B12+ forks,
 * so the eval harness can score them via --experiment WITHOUT going live.
 *
 * Extracts each fork's text from server/scripts/seed.ts AS TEXT (never imports it —
 * seed.ts runs seedDatabase() on import). Creates persona_prompt_aiden_2026 /
 * persona_prompt_luna_2026 as status='draft' (invisible to production traffic;
 * only resolves when the eval process force-lists the key). Idempotent upsert.
 *
 *   npx tsx scripts/_wire-persona-forks-eval.ts --dry   # verify extraction, no write
 *   npx tsx scripts/_wire-persona-forks-eval.ts         # create/refresh the drafts
 *   npx tsx scripts/_wire-persona-forks-eval.ts --drop  # delete the draft experiments
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { experiments, personas } from '@shared/schema';
import { eq } from 'drizzle-orm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'server/scripts/seed.ts');

function extractFork(src: string, fn: string): string {
  const re = new RegExp(`function ${fn}\\(\\): string \\{\\s*return \`([\\s\\S]*?)\`;\\n\\}`);
  const m = src.match(re);
  if (!m) throw new Error(`could not extract ${fn} from seed.ts`);
  let body = m[1];
  // Reverse template-literal escaping (only if present).
  if (/\\`|\\\$\{/.test(body)) body = body.replace(/\\`/g, '`').replace(/\\\$\{/g, '${').replace(/\\\\/g, '\\');
  return body;
}

const TARGETS = [
  { key: 'persona_prompt_aiden_2026', slug: 'aiden-powers', fn: 'getAidenSystemPrompt', marker: '[NUMEROLOGY_PERSONA]' },
  { key: 'persona_prompt_luna_2026',  slug: 'luna-voss',    fn: 'getLunaSystemPrompt',  marker: '[ASTROLOGY_PERSONA]' },
];

async function main() {
  const dry = process.argv.includes('--dry');
  const drop = process.argv.includes('--drop');
  const src = readFileSync(SEED, 'utf8');

  for (const t of TARGETS) {
    if (drop) {
      await db.delete(experiments).where(eq(experiments.key, t.key));
      console.log(`dropped ${t.key}`);
      continue;
    }
    const prompt = extractFork(src, t.fn);
    const [p] = await db.select({ id: personas.id }).from(personas).where(eq(personas.slug, t.slug));
    if (!p) throw new Error(`persona ${t.slug} not found`);
    const okMarker = prompt.startsWith(t.marker);
    console.log(`${t.key}: ${prompt.length} chars, personaId=${p.id}, marker@start=${okMarker}`);
    console.log(`   first line: ${prompt.split('\n')[0]}`);
    if (!okMarker) throw new Error(`${t.fn} does not start with ${t.marker}`);
    if (dry) continue;

    const variants = [
      { key: 'A', weight: 0, payload: {} },
      { key: 'B', weight: 100, payload: { systemPrompt: prompt } },
    ];
    const scope = { personaId: p.id };
    const conversion = { type: 'credit_purchase', windowDays: 7 };
    const [existing] = await db.select().from(experiments).where(eq(experiments.key, t.key));
    if (existing) {
      if (existing.status !== 'draft') throw new Error(`${t.key} is '${existing.status}', not draft — refusing to touch a live test`);
      await db.update(experiments).set({ variants, scope, conversion, updatedAt: new Date() }).where(eq(experiments.key, t.key));
      console.log(`   updated (draft)`);
    } else {
      await db.insert(experiments).values({
        key: t.key, name: `${t.slug} B12+ fork (eval only)`,
        description: 'DRAFT eval vehicle for the B12+ persona fork. Not for live rollout.',
        status: 'draft', subjectType: 'user', variants, scope, conversion,
      } as typeof experiments.$inferInsert);
      console.log(`   created (draft, 0% live)`);
    }
  }
  console.log(dry ? '\n--dry: nothing written' : '\ndone. Experiments are DRAFT (dormant).');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
