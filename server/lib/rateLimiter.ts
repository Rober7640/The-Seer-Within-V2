import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const isTestEnv = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';
const isDevEnv = process.env.NODE_ENV === 'development';

// Auth endpoints: 5 attempts per 15 minutes per IP (production)
// In development, limit is relaxed to 100 per 15 minutes to avoid blocking during testing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevEnv ? 100 : 5,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  skip: () => isTestEnv,
  // Using default IP-based key generation (handles IPv6 correctly)
});

// Chat endpoints: 60 messages per hour per user (keyed by authenticated userId)
export const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Message limit reached. Please wait before sending more messages.' },
  keyGenerator: (req) => {
    // Prefer userId (set by requireAuth); fall back to IP so the limiter is always
    // enforced even if auth middleware fails to populate userId for any reason
    return (req as any).userId || ipKeyGenerator(req.ip ?? 'unknown');
  },
  // No skip — requireAuth will still reject unauthenticated requests before they reach handlers
  skip: () => isTestEnv,
});

// Password reset: 3 per hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
  // Using default IP-based key generation (handles IPv6 correctly)
});

// Admin endpoints: 100 requests per hour per IP (production only)
// Skipped entirely in dev/test to avoid blocking local development and test suites.
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please try again later.' },
  skip: () => isTestEnv || isDevEnv,
  // Using default IP-based key generation (handles IPv6 correctly)
});

// Admin login: stricter limit - 5 attempts per 15 minutes per IP (production)
// In development, limit is relaxed to 100 per 15 minutes
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevEnv ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  skip: () => isTestEnv,
  // Using default IP-based key generation (handles IPv6 correctly)
});

// Evelyn lander: 5 sessions per hour per IP (PRD §7.3). Relaxed in dev for testing.
export const landerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevEnv ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many lander sessions from this IP. Please try again later.' },
  skip: () => isTestEnv,
});

// Evelyn lander chat turns: 30 turns per hour per IP (prod), 200/hr in dev.
// Headroom over the 10 legit turns/hr ceiling (2 turns × 5 sessions from landerLimiter)
// so retries and refresh-resumes don't get blocked, but a hot IP is throttled.
export const landerTurnLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevEnv ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages from this IP. Please try again later.' },
  skip: () => isTestEnv,
});
