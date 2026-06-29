// Persona Prompts System with Versioning & A/B Testing
// Aligned with schema: personaPrompts uses promptContent, variantLabel, trafficPercent

import { db } from './db';
import { personaPrompts, personas } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from './logger';

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

  logger.info(`Created prompt: type=${input.promptType} for persona ${input.personaId} (${result[0].id})`);
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

    logger.info(`Created prompt version ${nextVersion} for type=${oldPrompt.promptType}`);
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

  logger.info(`Activated prompt ${promptId} (type=${promptType} v${prompt[0].version})`);
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
