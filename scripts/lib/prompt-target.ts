/**
 * Where does a persona's live prompt actually live?
 *
 * Two stores, and which one applies depends on the persona:
 *   - an experiment payload  — a `persona_prompt_*` experiment scoped to the
 *     persona (Evelyn's B11/B12 arrangement)
 *   - personas.base_system_prompt — everyone else (Aiden, Luna, …)
 *
 * Resolution mirrors server/lib/experiments.ts getActivePromptExperimentKey():
 * prefix match, scope->>'personaId' match, running before draft, newest first.
 *
 * ⚠️ Differs from the runtime in ONE way, deliberately: draft experiments count
 * here without EXPERIMENT_FORCE_RUNNING, because locally the experiment must be
 * draft for the wire script to be allowed to touch it.
 *
 * Read-only. Writing is wire-persona-prompt.ts's job.
 */
import { db } from '../../server/lib/db';
import { personas, experiments } from '@shared/schema';
import { eq, sql, desc } from 'drizzle-orm';

const PERSONA_PROMPT_KEY_PREFIX = 'persona_prompt_';

export type PromptTarget =
  | { kind: 'experiment'; personaId: string; personaSlug: string; key: string; variant: string; status: string; currentPrompt: string }
  | { kind: 'base'; personaId: string; personaSlug: string; currentPrompt: string };

export async function resolvePromptTarget(slug: string, variant = 'B'): Promise<PromptTarget> {
  const [persona] = await db
    .select({ id: personas.id, slug: personas.slug, base: personas.baseSystemPrompt })
    .from(personas)
    .where(eq(personas.slug, slug));
  if (!persona) throw new Error(`persona not found: ${slug}`);

  const rows = await db
    .select()
    .from(experiments)
    .where(
      sql`left(${experiments.key}, ${PERSONA_PROMPT_KEY_PREFIX.length}) = ${PERSONA_PROMPT_KEY_PREFIX}
          AND ${experiments.scope}->>'personaId' = ${persona.id}
          AND ${experiments.status} IN ('running', 'draft')`,
    )
    .orderBy(sql`(${experiments.status} = 'running') desc`, desc(experiments.startedAt))
    .limit(1);

  const exp = rows[0];
  if (!exp) {
    return { kind: 'base', personaId: persona.id, personaSlug: persona.slug, currentPrompt: persona.base ?? '' };
  }

  const variants = (exp.variants ?? []) as Array<{ key: string; payload?: Record<string, unknown> }>;
  const arm = variants.find(v => v.key === variant);
  if (!arm) throw new Error(`experiment ${exp.key} has no variant ${variant} (has: ${variants.map(v => v.key).join(',') || 'none'})`);

  const sp = arm.payload?.systemPrompt;
  return {
    kind: 'experiment',
    personaId: persona.id,
    personaSlug: persona.slug,
    key: exp.key,
    variant,
    status: exp.status,
    currentPrompt: typeof sp === 'string' ? sp : '',
  };
}

export function describeTarget(t: PromptTarget): string {
  return t.kind === 'experiment'
    ? `experiment ${t.key} (status=${t.status}) → variants[${t.variant}].payload.systemPrompt — ${t.currentPrompt.length} chars`
    : `personas.base_system_prompt for ${t.personaSlug} — ${t.currentPrompt.length} chars`;
}
