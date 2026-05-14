// Admin Seed Data Route
// Triggers seeding of initial data (intent configs, etc.)

import { Router, Request, Response } from 'express';
import { seedEvelynIntentConfig } from '../../lib/seedIntentConfigs';
import logger from '../../lib/logger';

const router = Router();

// POST /api/admin/seed/intent-configs - Seed intent configurations
router.post('/intent-configs', async (req: Request, res: Response) => {
  try {
    logger.info('Seeding intent configs...');
    await seedEvelynIntentConfig();

    return res.json({
      success: true,
      message: 'Intent configs seeded successfully'
    });
  } catch (error: any) {
    logger.error('Seed intent configs error:', error);
    return res.status(500).json({
      error: 'Failed to seed intent configs',
      details: error.message
    });
  }
});

export default router;
