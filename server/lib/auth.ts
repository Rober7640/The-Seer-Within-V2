import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRY = '7d';

interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email } as JWTPayload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Check account status and password change invalidation
  try {
    const result = await db
      .select({
        accountStatus: users.accountStatus,
        suspensionReason: users.suspensionReason,
        passwordChangedAt: users.passwordChangedAt,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    const user = result[0];
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.accountStatus === 'suspended') {
      res.status(403).json({
        error: 'Account suspended. Contact support.',
        code: 'ACCOUNT_SUSPENDED',
        reason: user.suspensionReason || undefined,
      });
      return;
    }

    if (user.accountStatus === 'banned') {
      res.status(403).json({
        error: 'Account has been permanently banned.',
        code: 'ACCOUNT_BANNED',
      });
      return;
    }

    // Invalidate tokens issued before password was changed
    if (user.passwordChangedAt && payload.iat) {
      const changedAtSec = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedAtSec) {
        res.status(401).json({
          error: 'Password was recently changed. Please sign in again.',
          code: 'PASSWORD_CHANGED',
        });
        return;
      }
    }
  } catch (err) {
    logger.error('Account status check failed:', err);
    // Allow through on DB error to avoid locking out users during outages
  }

  // Set Sentry user context for error tracking
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({ id: payload.userId, email: payload.email });
  }

  req.userId = payload.userId;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Admin authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired admin token' });
    return;
  }

  req.userId = payload.userId;
  next();
}
