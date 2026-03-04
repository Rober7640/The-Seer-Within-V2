import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { checkMigrationEligibility, migrateFunnelCustomer } from '../lib/funnelMigration';
import { generateToken } from '../lib/auth';
import { authLimiter } from '../lib/rateLimiter';
import { db } from '../lib/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger';

const router = Router();

const emailSchema = z.object({
  email: z.string().email(),
});

// POST /api/migrate/check-eligibility
// Check if a funnel customer email is eligible for auto-migration
router.post('/check-eligibility', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = emailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email } = parseResult.data;
    const result = await checkMigrationEligibility(email);

    res.json({
      eligible: result.eligible,
      alreadyMigrated: result.alreadyMigrated || false,
      firstName: result.firstName || null,
      reason: result.reason,
    });
  } catch (error) {
    logger.error('Check eligibility error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

// POST /api/migrate/create-account
// Auto-create a chat service account from a funnel purchase
router.post('/create-account', authLimiter, async (req: Request, res: Response) => {
  try {
    const parseResult = emailSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: parseResult.error.errors.map(e => e.message).join(', '),
      });
      return;
    }

    const { email } = parseResult.data;
    const result = await migrateFunnelCustomer(email);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Auto-login: generate a JWT token so the user can immediately use the service
    const token = generateToken(result.userId!, email.toLowerCase());

    // Fetch the created user for auto-login response
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, result.userId!))
      .limit(1);

    const user = userResult[0];

    res.status(201).json({
      success: true,
      token,
      user: user ? {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        coinBalance: user.coinBalance,
        emailVerified: user.emailVerified,
      } : null,
      coinBalance: result.coinBalance,
      message: `Account created with ${result.coinBalance} bonus coins! Check your email for login credentials.`,
    });
  } catch (error) {
    logger.error('Create account error:', error);
    res.status(500).json({ error: 'Account creation failed' });
  }
});

export default router;
