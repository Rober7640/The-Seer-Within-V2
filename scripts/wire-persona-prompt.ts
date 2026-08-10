/**
 * wire-persona-prompt.ts — write a candidate prompt spec into whichever store
 * holds THIS persona's live prompt.
 *
 *   npx tsx scripts/wire-persona-prompt.ts --persona aiden-powers --spec improve-v2/specs/aiden-v2-prompt-A2.md
 *   …same command plus --write     # actually writes
 *
 * Supersedes _wire-evelyn-v2.ts (kept for the reproducibility of the committed
 * 2026-07-10/07-15 reports). Two differences from that script, both deliberate:
 *   - it resolves the target instead of hardcoding one experiment key
 *   - writing requires --write. The old script could only ever touch a DRAFT
 *     experiment; this one can touch personas.base_system_prompt, which IS the
 *     live prompt for Aiden/Luna/Marcus/Maren/Nova. There is no draft to hide
 *     behind, so the localhost guard plus an explicit --write are the safety.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/lib/db';
import { personas, experiments } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { resolvePromptTarget, describeTarget } from './lib/prompt-target';
import { KNOWN_PERSONA_SLUGS, isKnownPersona } from './lib/persona-registry';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const write = process.argv.includes('--write');
  const slug = arg('persona');
  const specArg = arg('spec');
  const variant = arg('variant') ?? 'B';

  // Guard 1 — localhost only. Checked BEFORE anything else, and before any DB
  // connection is opened, because everything downstream can mutate a live prompt.
  const url = process.env.DATABASE_URL ?? '';
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    console.error('REFUSING: DATABASE_URL is not localhost.');
    console.error('This script can overwrite personas.base_system_prompt, which IS a live prompt.');
    console.error(`Current host: ${url.replace(/:[^:@/]*@/, ':***@').slice(0, 80)}`);
    process.exit(1);
  }

  // Guard 2 — known persona.
  if (!slug || !isKnownPersona(slug)) {
    console.error('usage: wire-persona-prompt.ts --persona <slug> --spec <file> [--variant B] [--write]');
    console.error(`known personas: ${KNOWN_PERSONA_SLUGS.join(' ')}`);
    process.exit(1);
  }

  // Guard 3 — spec has a non-empty prompt block.
  if (!specArg) { console.error('missing --spec <file>'); process.exit(1); }
  const specPath = path.resolve(ROOT, specArg);
  if (!fs.existsSync(specPath)) { console.error(`spec file not found: ${specPath}`); process.exit(1); }
  const md = fs.readFileSync(specPath, 'utf8');
  const m = md.match(/```prompt\r?\n([\s\S]*?)\r?\n```/);
  if (!m) { console.error(`no \`\`\`prompt block found in ${specPath}`); process.exit(1); }
  const prompt = m[1].trim();
  if (!prompt.length) { console.error('the ```prompt block is empty'); process.exit(1); }

  const target = await resolvePromptTarget(slug, variant);
  console.log(`persona: ${slug}`);
  console.log(`target:  ${describeTarget(target)}`);
  console.log(`spec:    ${path.relative(ROOT, specPath)} — ${prompt.length} chars`);
  console.log(`first line: ${prompt.split('\n')[0]}`);

  // Guard 4 — experiments must be draft.
  if (target.kind === 'experiment' && target.status !== 'draft') {
    console.error(`\nREFUSING: experiment ${target.key} is '${target.status}', not draft.`);
    console.error("Editing a live test's payload is a human ship step, never this script.");
    process.exit(1);
  }

  // Guard 5 — dry by default.
  if (!write) {
    console.log('\nDRY RUN — nothing written. Re-run with --write to apply.');
    process.exit(0);
  }

  if (target.kind === 'experiment') {
    const [exp] = await db.select().from(experiments).where(eq(experiments.key, target.key));
    const variants = (exp.variants as Array<{ key: string; payload: Record<string, unknown> }>).map(v =>
      v.key === variant ? { ...v, payload: { ...v.payload, systemPrompt: prompt } } : v,
    );
    await db.update(experiments).set({ variants }).where(eq(experiments.key, target.key));
    console.log(`\nwritten to ${target.key} variant ${variant}. Experiment remains DRAFT (0% live traffic).`);
  } else {
    // Guard 6 — snapshot the prompt we are about to replace. There is no draft
    // safety net on base_system_prompt, so this file is the only undo.
    const snapDir = path.join(ROOT, 'improve-v2/specs/_snapshots');
    fs.mkdirSync(snapDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapPath = path.join(snapDir, `${slug}-base-${stamp}.md`);
    fs.writeFileSync(snapPath, `# ${slug} base_system_prompt before wire ${stamp}\n\n\`\`\`prompt\n${target.currentPrompt}\n\`\`\`\n`);
    console.log(`\nsnapshot: ${path.relative(ROOT, snapPath)} (${target.currentPrompt.length} chars)`);

    await db.update(personas).set({ baseSystemPrompt: prompt }).where(eq(personas.id, target.personaId));
    console.log(`written to personas.base_system_prompt for ${slug} on the LOCAL db.`);
    console.log(`Restore with: npx tsx scripts/wire-persona-prompt.ts --persona ${slug} --spec ${path.relative(ROOT, snapPath)} --write`);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
