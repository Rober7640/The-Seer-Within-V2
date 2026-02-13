// Persona Prompts System with Versioning & A/B Testing
// Aligned with schema: personaPrompts uses promptContent, variantLabel, trafficPercent

import { db } from './db';
import { personaPrompts, personas } from '@shared/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';

// Prompt types supported by the system
export type PromptType =
  | 'system'             // Base persona system prompt override
  | 'greeting'           // Initial chat greeting
  | 'summary'            // Session summary template
  | 'context_injection'  // How to use memory context
  | 'bucket_love'        // Love bucket-specific prompt
  | 'bucket_money'       // Money bucket-specific prompt
  | 'bucket_purpose'     // Purpose bucket-specific prompt
  | 'bucket_someone'     // Someone specific bucket prompt
  | 'reading_1'          // First reading template
  | 'reading_2'          // Deeper reading template
  | 'crisis_reveal'      // Crisis introduction
  | 'objection_handler'  // Objection handling
  | 'custom';            // Custom type

export interface CreatePromptInput {
  personaId: string;
  promptType: string;
  promptContent: string;
  variantLabel?: string;     // A/B test variant: "A", "B", "control"
  trafficPercent?: number;   // 0-100, default 100
  createdBy?: string;
}

export interface UpdatePromptInput {
  promptContent?: string;
  variantLabel?: string;
  trafficPercent?: number;
}

export interface PromptDetail {
  id: string;
  personaId: string;
  promptType: string;
  promptContent: string;
  version: number;
  isActive: boolean;
  variantLabel: string | null;
  trafficPercent: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CREATE PROMPT
// ============================================

export async function createPrompt(input: CreatePromptInput): Promise<string> {
  // Verify persona exists
  const persona = await db
    .select({ id: personas.id })
    .from(personas)
    .where(eq(personas.id, input.personaId))
    .limit(1);

  if (!persona[0]) {
    throw new Error('Persona not found');
  }

  const result = await db
    .insert(personaPrompts)
    .values({
      personaId: input.personaId,
      promptType: input.promptType,
      promptContent: input.promptContent,
      version: 1,
      isActive: false,
      variantLabel: input.variantLabel || null,
      trafficPercent: input.trafficPercent ?? 100,
      createdBy: input.createdBy || null,
    })
    .returning({ id: personaPrompts.id });

  if (!result[0]) {
    throw new Error('Failed to create prompt');
  }

  console.log(`Created prompt: type=${input.promptType} for persona ${input.personaId} (${result[0].id})`);
  return result[0].id;
}

// ============================================
// UPDATE PROMPT (creates new version if content changes)
// ============================================

export async function updatePrompt(
  promptId: string,
  updates: UpdatePromptInput,
): Promise<string> {
  const current = await db
    .select()
    .from(personaPrompts)
    .where(eq(personaPrompts.id, promptId))
    .limit(1);

  if (!current[0]) {
    throw new Error('Prompt not found');
  }

  const oldPrompt = current[0];

  // If content changed, create a new versioned row
  if (updates.promptContent && updates.promptContent !== oldPrompt.promptContent) {
    // Deactivate old version
    await db
      .update(personaPrompts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(personaPrompts.id, promptId));

    // Get latest version number
    const latestVersion = await db
      .select({ maxVersion: sql<number>`MAX(${personaPrompts.version})` })
      .from(personaPrompts)
      .where(
        and(
          eq(personaPrompts.personaId, oldPrompt.personaId),
          eq(personaPrompts.promptType, oldPrompt.promptType),
        ),
      );

    const nextVersion = (latestVersion[0]?.maxVersion || 0) + 1;

    // Create new version
    const result = await db
      .insert(personaPrompts)
      .values({
        personaId: oldPrompt.personaId,
        promptType: oldPrompt.promptType,
        promptContent: updates.promptContent,
        version: nextVersion,
        isActive: false,
        variantLabel: updates.variantLabel ?? oldPrompt.variantLabel,
        trafficPercent: updates.trafficPercent ?? oldPrompt.trafficPercent,
        createdBy: oldPrompt.createdBy,
      })
      .returning({ id: personaPrompts.id });

    console.log(`Created prompt version ${nextVersion} for type=${oldPrompt.promptType}`);
    return result[0]!.id;
  }

  // If only metadata changed, update in place
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.variantLabel !== undefined) setValues.variantLabel = updates.variantLabel;
  if (updates.trafficPercent !== undefined) setValues.trafficPercent = updates.trafficPercent;

  await db
    .update(personaPrompts)
    .set(setValues)
    .where(eq(personaPrompts.id, promptId));

  return promptId;
}

// ============================================
// ACTIVATE PROMPT
// ============================================

export async function activatePrompt(promptId: string): Promise<void> {
  const prompt = await db
    .select()
    .from(personaPrompts)
    .where(eq(personaPrompts.id, promptId))
    .limit(1);

  if (!prompt[0]) {
    throw new Error('Prompt not found');
  }

  const { personaId, promptType, variantLabel } = prompt[0];

  // If no A/B variant label, deactivate all other prompts of same persona+type
  if (!variantLabel) {
    await db
      .update(personaPrompts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(personaPrompts.personaId, personaId),
          eq(personaPrompts.promptType, promptType),
        ),
      );
  }

  // Activate this prompt
  await db
    .update(personaPrompts)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(personaPrompts.id, promptId));

  console.log(`Activated prompt ${promptId} (type=${promptType} v${prompt[0].version})`);
}

// ============================================
// GET ACTIVE PROMPTS FOR PERSONA
// ============================================

export async function getActivePrompts(
  personaId: string,
  promptType?: string,
): Promise<PromptDetail[]> {
  let conditions = and(
    eq(personaPrompts.personaId, personaId),
    eq(personaPrompts.isActive, true),
  );

  if (promptType) {
    conditions = and(conditions, eq(personaPrompts.promptType, promptType));
  }

  const prompts = await db
    .select()
    .from(personaPrompts)
    .where(conditions)
    .orderBy(personaPrompts.promptType, desc(personaPrompts.version));

  return prompts.map(formatPromptDetail);
}

// ============================================
// SELECT PROMPT FOR SESSION (A/B test logic)
// ============================================

export async function selectPromptForSession(
  personaId: string,
  promptType: string,
): Promise<PromptDetail | null> {
  const activePrompts = await db
    .select()
    .from(personaPrompts)
    .where(
      and(
        eq(personaPrompts.personaId, personaId),
        eq(personaPrompts.promptType, promptType),
        eq(personaPrompts.isActive, true),
      ),
    );

  if (activePrompts.length === 0) return null;

  // Single active prompt -- return directly
  if (activePrompts.length === 1) {
    return formatPromptDetail(activePrompts[0]);
  }

  // A/B test: select based on trafficPercent (weighted random)
  const totalTraffic = activePrompts.reduce((sum, p) => sum + p.trafficPercent, 0);
  const roll = Math.random() * totalTraffic;

  let cumulative = 0;
  for (const prompt of activePrompts) {
    cumulative += prompt.trafficPercent;
    if (roll <= cumulative) {
      return formatPromptDetail(prompt);
    }
  }

  // Fallback to first
  return formatPromptDetail(activePrompts[0]);
}

// ============================================
// LIST ALL PROMPTS FOR PERSONA
// ============================================

export async function listPromptsForPersona(
  personaId: string,
  options?: {
    promptType?: string;
    includeInactive?: boolean;
  },
): Promise<PromptDetail[]> {
  let conditions = eq(personaPrompts.personaId, personaId);

  if (options?.promptType) {
    conditions = and(conditions, eq(personaPrompts.promptType, options.promptType))!;
  }

  if (!options?.includeInactive) {
    conditions = and(conditions, eq(personaPrompts.isActive, true))!;
  }

  const prompts = await db
    .select()
    .from(personaPrompts)
    .where(conditions)
    .orderBy(personaPrompts.promptType, desc(personaPrompts.version));

  return prompts.map(formatPromptDetail);
}

// ============================================
// GET PROMPT PERFORMANCE (A/B test comparison)
// ============================================

export interface PromptPerformance {
  promptId: string;
  promptType: string;
  version: number;
  variantLabel: string | null;
  trafficPercent: number;
  isActive: boolean;
  // Session-based metrics (computed from chatSessions.promptVariantId)
  sessionCount: number;
}

export async function getPromptPerformance(
  personaId: string,
  promptType: string,
): Promise<PromptPerformance[]> {
  const prompts = await db
    .select()
    .from(personaPrompts)
    .where(
      and(
        eq(personaPrompts.personaId, personaId),
        eq(personaPrompts.promptType, promptType),
      ),
    )
    .orderBy(desc(personaPrompts.version));

  // For each prompt variant, count sessions that used it
  const results: PromptPerformance[] = [];
  for (const p of prompts) {
    const sessionCount = await db
      .select({ count: count() })
      .from(chatSessions)
      .where(eq(chatSessions.promptVariantId, p.id));

    results.push({
      promptId: p.id,
      promptType: p.promptType,
      version: p.version,
      variantLabel: p.variantLabel,
      trafficPercent: p.trafficPercent,
      isActive: p.isActive,
      sessionCount: sessionCount[0]?.count || 0,
    });
  }

  return results;
}

// ============================================
// TEST PROMPT (render with sample data)
// ============================================

export async function testPrompt(
  promptId: string,
  sampleData: {
    firstName?: string;
    bucket?: string;
    concern?: string;
    personName?: string;
  },
): Promise<string> {
  const prompt = await db
    .select()
    .from(personaPrompts)
    .where(eq(personaPrompts.id, promptId))
    .limit(1);

  if (!prompt[0]) {
    throw new Error('Prompt not found');
  }

  let rendered = prompt[0].promptContent;
  rendered = rendered.replace(/\$\{firstName\}/g, sampleData.firstName || 'Sarah');
  rendered = rendered.replace(/\$\{bucket\}/g, sampleData.bucket || 'love');
  rendered = rendered.replace(/\$\{concern\}/g, sampleData.concern || 'I feel stuck in my relationship');
  rendered = rendered.replace(/\$\{personName\}/g, sampleData.personName || 'Alex');
  rendered = rendered.replace(/\[NAME\]/g, sampleData.personName || 'Alex');

  return rendered;
}

// ============================================
// BUILD FULL PROMPT FOR CHAT SESSION
// Combines base system prompt + bucket prompt + action prompt
// ============================================

export async function buildPersonaPrompt(
  personaId: string,
  options: {
    promptType: string;
    bucket?: string;
    memoryContext?: string;
    userData: {
      firstName: string;
      bucket?: string;
      concern?: string;
      personName?: string;
      subBucket?: string;
      desires?: string;
      timeOfDay?: string;
    };
  },
): Promise<{ promptContent: string; promptVariantId: string | null } | null> {
  // Get the persona's base system prompt
  const persona = await db
    .select()
    .from(personas)
    .where(eq(personas.id, personaId))
    .limit(1);

  if (!persona[0]) return null;

  let fullPrompt = persona[0].baseSystemPrompt;

  // Get bucket-specific prompt if applicable
  if (options.bucket) {
    const bucketPrompt = await selectPromptForSession(personaId, `bucket_${options.bucket}`);
    if (bucketPrompt) {
      fullPrompt += '\n\n' + bucketPrompt.promptContent;
    }
  }

  // Add memory context
  if (options.memoryContext) {
    fullPrompt += '\n\n## Previous Conversation Memory\n' + options.memoryContext;
  }

  // Get the action-specific prompt
  const actionPrompt = await selectPromptForSession(personaId, options.promptType);
  let promptVariantId: string | null = null;
  if (actionPrompt) {
    fullPrompt += '\n\n' + actionPrompt.promptContent;
    promptVariantId = actionPrompt.id;
  }

  // Replace template variables
  const { userData } = options;
  fullPrompt = fullPrompt.replace(/\$\{firstName\}/g, userData.firstName || 'Friend');
  fullPrompt = fullPrompt.replace(/\$\{bucket\}/g, userData.bucket || 'general');
  fullPrompt = fullPrompt.replace(/\$\{concern\}/g, userData.concern || '');
  fullPrompt = fullPrompt.replace(/\$\{personName\}/g, userData.personName || '');
  fullPrompt = fullPrompt.replace(/\$\{subBucket\}/g, userData.subBucket || '');
  fullPrompt = fullPrompt.replace(/\$\{desires\}/g, userData.desires || '');
  fullPrompt = fullPrompt.replace(/\$\{timeOfDay\}/g, userData.timeOfDay || 'today');
  fullPrompt = fullPrompt.replace(/\[NAME\]/g, userData.personName || '');

  return { promptContent: fullPrompt, promptVariantId };
}

// ============================================
// HELPER: Format DB row to PromptDetail
// ============================================

function formatPromptDetail(row: typeof personaPrompts.$inferSelect): PromptDetail {
  return {
    id: row.id,
    personaId: row.personaId,
    promptType: row.promptType,
    promptContent: row.promptContent,
    version: row.version,
    isActive: row.isActive,
    variantLabel: row.variantLabel,
    trafficPercent: row.trafficPercent,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
