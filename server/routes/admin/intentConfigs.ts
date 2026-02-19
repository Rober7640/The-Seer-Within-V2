// Admin Persona Intent Config Routes
// CRUD endpoints for managing per-persona intent configurations

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { personaIntentConfigs, personas } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import logger from '../../lib/logger';

const router = Router();

// GET /api/admin/intent-configs - List all intent configs (optionally filtered by persona)
router.get('/', async (req: Request, res: Response) => {
  try {
    const personaId = req.query.personaId as string | undefined;
    const activeOnly = req.query.activeOnly !== 'false'; // default true

    const conditions = [];
    if (personaId) {
      conditions.push(eq(personaIntentConfigs.personaId, personaId));
    }
    if (activeOnly) {
      conditions.push(eq(personaIntentConfigs.isActive, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const configs = await db
      .select({
        id: personaIntentConfigs.id,
        personaId: personaIntentConfigs.personaId,
        specialty: personaIntentConfigs.specialty,
        conversationBuckets: personaIntentConfigs.conversationBuckets,
        intents: personaIntentConfigs.intents,
        characterRules: personaIntentConfigs.characterRules,
        version: personaIntentConfigs.version,
        isActive: personaIntentConfigs.isActive,
        createdAt: personaIntentConfigs.createdAt,
        updatedAt: personaIntentConfigs.updatedAt,
      })
      .from(personaIntentConfigs)
      .where(whereClause)
      .orderBy(desc(personaIntentConfigs.updatedAt));

    // Parse JSON fields for response
    const parsed = configs.map(c => ({
      ...c,
      conversationBuckets: safeJsonParse(c.conversationBuckets, []),
      intents: safeJsonParse(c.intents, []),
      characterRules: safeJsonParse(c.characterRules, {}),
    }));

    return res.json({ configs: parsed });
  } catch (error: any) {
    logger.error('Admin intent configs list error:', error);
    return res.status(500).json({ error: 'Failed to fetch intent configs' });
  }
});

// GET /api/admin/intent-configs/:id - Get single intent config
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const config = await db
      .select()
      .from(personaIntentConfigs)
      .where(eq(personaIntentConfigs.id, id) as any)
      .limit(1);

    if (!config[0]) {
      return res.status(404).json({ error: 'Intent config not found' });
    }

    return res.json({
      config: {
        ...config[0],
        conversationBuckets: safeJsonParse(config[0].conversationBuckets, []),
        intents: safeJsonParse(config[0].intents, []),
        characterRules: safeJsonParse(config[0].characterRules, {}),
      },
    });
  } catch (error: any) {
    logger.error('Admin intent config get error:', error);
    return res.status(500).json({ error: 'Failed to fetch intent config' });
  }
});

// POST /api/admin/intent-configs - Create new intent config
const createSchema = z.object({
  personaId: z.string().min(1),
  specialty: z.string().min(1),
  conversationBuckets: z.array(z.any()),
  intents: z.array(z.any()),
  characterRules: z.record(z.any()),
  isActive: z.boolean().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = createSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.errors,
      });
    }

    const { personaId, specialty, conversationBuckets, intents, characterRules, isActive } = parseResult.data;

    // Get next version number for this persona
    const existing = await db
      .select({ version: personaIntentConfigs.version })
      .from(personaIntentConfigs)
      .where(eq(personaIntentConfigs.personaId, personaId))
      .orderBy(desc(personaIntentConfigs.version))
      .limit(1);

    const nextVersion = (existing[0]?.version ?? 0) + 1;

    const inserted = await db
      .insert(personaIntentConfigs)
      .values({
        personaId,
        specialty,
        conversationBuckets: JSON.stringify(conversationBuckets),
        intents: JSON.stringify(intents),
        characterRules: JSON.stringify(characterRules),
        version: nextVersion,
        isActive: isActive ?? true,
      })
      .returning();

    return res.status(201).json({
      config: {
        ...inserted[0],
        conversationBuckets,
        intents,
        characterRules,
      },
    });
  } catch (error: any) {
    logger.error('Admin intent config create error:', error);
    return res.status(500).json({ error: 'Failed to create intent config' });
  }
});

// PUT /api/admin/intent-configs/:id - Update intent config
const updateSchema = z.object({
  specialty: z.string().min(1).optional(),
  conversationBuckets: z.array(z.any()).optional(),
  intents: z.array(z.any()).optional(),
  characterRules: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.errors,
      });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    const data = parseResult.data;
    if (data.specialty !== undefined) updateData.specialty = data.specialty;
    if (data.conversationBuckets !== undefined) updateData.conversationBuckets = JSON.stringify(data.conversationBuckets);
    if (data.intents !== undefined) updateData.intents = JSON.stringify(data.intents);
    if (data.characterRules !== undefined) updateData.characterRules = JSON.stringify(data.characterRules);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await db
      .update(personaIntentConfigs)
      .set(updateData)
      .where(eq(personaIntentConfigs.id, id) as any)
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Intent config not found' });
    }

    return res.json({
      config: {
        ...updated[0],
        conversationBuckets: safeJsonParse(updated[0].conversationBuckets, []),
        intents: safeJsonParse(updated[0].intents, []),
        characterRules: safeJsonParse(updated[0].characterRules, {}),
      },
    });
  } catch (error: any) {
    logger.error('Admin intent config update error:', error);
    return res.status(500).json({ error: 'Failed to update intent config' });
  }
});

// DELETE /api/admin/intent-configs/:id - Delete intent config
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const deleted = await db
      .delete(personaIntentConfigs)
      .where(eq(personaIntentConfigs.id, id) as any)
      .returning({ id: personaIntentConfigs.id });

    if (!deleted[0]) {
      return res.status(404).json({ error: 'Intent config not found' });
    }

    return res.json({ message: 'Intent config deleted' });
  } catch (error: any) {
    logger.error('Admin intent config delete error:', error);
    return res.status(500).json({ error: 'Failed to delete intent config' });
  }
});

function safeJsonParse(str: string, fallback: any): any {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default router;
