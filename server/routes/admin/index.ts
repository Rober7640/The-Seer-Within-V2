// Admin Routes Index
// Registers all admin sub-routes with authentication middleware

import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../lib/db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';
import personaRoutes from './personas';
import promptRoutes from './prompts';
import userRoutes from './users';
import analyticsRoutes from './analytics';
import pricingRoutes from './pricing';

const router = Router();

// ============================================
// ADMIN AUTH MIDDLEWARE
// ============================================

// Extend Express Request with adminId
declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      adminEmail?: string;
    }
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  // Import auth module dynamically to avoid circular deps
  try {
    const { verifyToken } = await import('../../lib/auth');
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired admin token' });
    }

    // Verify this user is actually an admin
    const admin = await db
      .select({ id: adminUsers.id, email: adminUsers.email, role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.userId))
      .limit(1);

    if (!admin[0]) {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    req.adminId = admin[0].id;
    req.adminEmail = admin[0].email;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// ============================================
// ADMIN LOGIN ROUTE (no auth required)
// ============================================

import { z } from 'zod';

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = adminLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid email or password format' });
    }

    const { email, password } = parseResult.data;

    // Find admin user
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1);

    if (!admin[0]) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const { verifyPassword, generateToken } = await import('../../lib/auth');
    const valid = await verifyPassword(password, admin[0].passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(admin[0].id, admin[0].email);

    // Update last login
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, admin[0].id));

    return res.json({
      token,
      admin: {
        id: admin[0].id,
        email: admin[0].email,
        displayName: admin[0].displayName,
        role: admin[0].role,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// PROTECTED ADMIN ROUTES
// ============================================

// Apply admin auth middleware to all routes below
router.use(requireAdmin);

// GET /api/admin/me - Get current admin info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const admin = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
        lastLoginAt: adminUsers.lastLoginAt,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, req.adminId!))
      .limit(1);

    if (!admin[0]) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    return res.json({ admin: admin[0] });
  } catch (error: any) {
    console.error('Get admin error:', error);
    return res.status(500).json({ error: 'Failed to get admin info' });
  }
});

// Mount sub-routes
router.use('/personas', personaRoutes);
router.use('/personas', pricingRoutes); // Handles /personas/:personaId/pricing
router.use('/pricing', pricingRoutes);  // Handles /pricing/all
router.use('/', promptRoutes);          // Handles both /personas/:id/prompts and /prompts/:promptId
router.use('/users', userRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
