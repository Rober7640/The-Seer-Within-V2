import rateLimit from 'express-rate-limit';

// Auth endpoints: 5 attempts per 15 minutes per IP
// Protects login and register from brute force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
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
    // Use userId if authenticated (set by requireAuth middleware)
    // If not authenticated, express-rate-limit will use default IP key generation
    return (req as any).userId;
  },
  skip: (req) => {
    // Only apply rate limiting if user is authenticated
    // Unauthenticated requests will be handled by other limiters
    return !(req as any).userId;
  },
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

// Admin endpoints: 100 requests per hour per IP
export const adminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please try again later.' },
  // Using default IP-based key generation (handles IPv6 correctly)
});

// Admin login: stricter limit - 5 attempts per 15 minutes per IP
// Separate from general admin limiter to prevent brute force on admin login
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  // Using default IP-based key generation (handles IPv6 correctly)
});
