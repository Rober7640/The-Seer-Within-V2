/**
 * TEMP (Sprint 0.5) — wire the Evelyn v2 prompt into the persona_prompt_evelyn_2026
 * experiment's variant B payload. Reads the fenced ```prompt block from
 * improve-v2/specs/evelyn-v2-prompt-B1.md (the reviewed source of truth) and
 * updates ONLY variants[B].payload.systemPrompt. The experiment row stays
 * status='draft' (off — production keeps the base prompt, byte-identical);
 * the eval harness exercises it via --experiment + EXPERIMENT_FORCE_RUNNING.
 *
 *   npx tsx scripts/_wire-evelyn-v2.ts            # show current state + write
 *   npx tsx scripts/_wire-evelyn-v2.ts --dry      # show what would be written
 *
 * Delete this script when the spike concludes (repo convention for _ scripts).
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { experiments } from '@shared/schema';
import { eq } from 'drizzle-orm';

const KEY = 'persona_prompt_evelyn_2026';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = path.join(ROOT, 'improve-v2/specs/evelyn-v2-prompt-B5.md');

async function main() {
  const dry = process.argv.includes('--dry');

  const md = readFileSync(SPEC, 'utf8');
  const m = md.match(/```prompt\n([\s\S]*?)\n```/);
  if (!m) throw new Error(`no \`\`\`prompt block found in ${SPEC}`);
  const prompt = m[1].trim();

  const [exp] = await db.select().from(experiments).where(eq(experiments.key, KEY));
  if (!exp) throw new Error(`experiment ${KEY} not found`);
  if (exp.status !== 'draft') {
    throw new Error(`experiment ${KEY} is '${exp.status}', not draft — refusing to edit a live test's payload`);
  }

  const variants = (exp.variants as Array<{ key: string; weight: number; payload: Record<string, unknown> }>).map(
    (v) => (v.key === 'B' ? { ...v, payload: { ...v.payload, systemPrompt: prompt } } : v),
  );
  if (!variants.some((v) => v.key === 'B')) throw new Error('no variant B on the experiment');

  console.log(`experiment: ${KEY} (status=${exp.status})`);
  console.log(`variant B systemPrompt: ${prompt.length} chars (was ${((exp.variants as any[]).find((v) => v.key === 'B')?.payload?.systemPrompt ?? '').length})`);
  console.log(`first line: ${prompt.split('\n')[0]}`);
  if (dry) { console.log('\n--dry: nothing written'); process.exit(0); }

  await db.update(experiments).set({ variants }).where(eq(experiments.key, KEY));
  console.log('written. Experiment remains DRAFT (0% live traffic).');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
