import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../lib/db';
import { systemConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { invalidateModelCache } from '../../lib/modelConfig';
import logger from '../../lib/logger';

const router = Router();

// ============================================
// GET /api/admin/settings/models - Get model configuration
// ============================================

router.get('/models', async (_req: Request, res: Response) => {
  try {
    const keys = ['available_models', 'default_conversation_model', 'default_basic_model'];
    const rows = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, keys[0]));

    const convRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'default_conversation_model'));

    const basicRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'default_basic_model'));

    const modelsRow = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'available_models'));

    let availableModels: Array<{ id: string; label: string; tier: string }> = [];
    try {
      if (modelsRow[0]?.configValue) {
        availableModels = JSON.parse(modelsRow[0].configValue);
      }
    } catch { /* use empty */ }

    return res.json({
      availableModels,
      defaultConversationModel: convRow[0]?.configValue || 'claude-sonnet-4-5-20250929',
      defaultBasicModel: basicRow[0]?.configValue || 'claude-haiku-4-5-20251001',
    });
  } catch (error: any) {
    logger.error('Get model settings error:', error);
    return res.status(500).json({ error: 'Failed to load model settings' });
  }
});

// ============================================
// PUT /api/admin/settings/models - Update model configuration
// ============================================

const modelEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tier: z.enum(['premium', 'basic']),
});

const updateModelsSchema = z.object({
  availableModels: z.array(modelEntrySchema).min(1, 'At least one model is required'),
  defaultConversationModel: z.string().min(1),
  defaultBasicModel: z.string().min(1),
});

router.put('/models', async (req: Request, res: Response) => {
  try {
    const parseResult = updateModelsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { availableModels, defaultConversationModel, defaultBasicModel } = parseResult.data;

    // Verify defaults are in the available list
    const modelIds = availableModels.map((m) => m.id);
    if (!modelIds.includes(defaultConversationModel)) {
      return res.status(400).json({ error: 'Default conversation model must be in the available models list' });
    }
    if (!modelIds.includes(defaultBasicModel)) {
      return res.status(400).json({ error: 'Default basic model must be in the available models list' });
    }

    const adminId = (req as any).adminId;

    // Upsert each config key
    const configs = [
      { key: 'available_models', value: JSON.stringify(availableModels), type: 'json', desc: 'List of available AI models for persona selection' },
      { key: 'default_conversation_model', value: defaultConversationModel, type: 'text', desc: 'Default model for main conversation responses' },
      { key: 'default_basic_model', value: defaultBasicModel, type: 'text', desc: 'Default model for greetings and summaries' },
    ];

    for (const c of configs) {
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, c.key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(systemConfig)
          .set({
            configValue: c.value,
            description: c.desc,
            lastEditedBy: adminId,
            updatedAt: new Date(),
          })
          .where(eq(systemConfig.configKey, c.key));
      } else {
        await db.insert(systemConfig).values({
          configKey: c.key,
          configValue: c.value,
          configType: c.type,
          description: c.desc,
          lastEditedBy: adminId,
        });
      }
    }

    // Clear model cache so changes take effect immediately
    invalidateModelCache();

    return res.json({ success: true });
  } catch (error: any) {
    logger.error('Update model settings error:', error);
    return res.status(500).json({ error: 'Failed to save model settings' });
  }
});

export default router;
