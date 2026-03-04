import winston from 'winston';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// Extend Express Request to carry request ID
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

// Custom log format for structured output
const structuredFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const base: Record<string, unknown> = {
    timestamp,
    level,
    message,
  };

  if (requestId) base.requestId = requestId;

  // Spread remaining meta fields
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    // Filter out internal Symbol keys from winston
    for (const key of metaKeys) {
      if (!key.startsWith('Symbol(')) {
        base[key] = meta[key];
      }
    }
  }

  return JSON.stringify(base);
});

// Console-friendly format for development
const devFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const reqPart = requestId ? ` [${requestId}]` : '';
  const metaKeys = Object.keys(meta).filter(k => !k.startsWith('Symbol('));
  const metaPart = metaKeys.length > 0
    ? ` ${JSON.stringify(Object.fromEntries(metaKeys.map(k => [k, meta[k]])))}`
    : '';
  return `${timestamp} ${level}${reqPart} ${message}${metaPart}`;
});

// Build transports
const transports: winston.transport[] = [];

if (isProduction) {
  // Production: structured JSON to stdout (captured by log aggregators)
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), errors({ stack: true }), structuredFormat),
    }),
  );

  // Error file transport with size-based rotation
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: combine(timestamp(), errors({ stack: true }), structuredFormat),
    }),
  );

  // Combined file transport
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: combine(timestamp(), errors({ stack: true }), structuredFormat),
    }),
  );
} else {
  // Development: colorized, human-readable console output
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        devFormat,
      ),
    }),
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transports,
  // Don't exit on uncaught exceptions -- let the process manager decide
  exitOnError: false,
});

// ---------- Request ID Middleware ----------

/**
 * Express middleware that attaches a unique request ID to each request
 * and logs request start/finish with duration.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID().slice(0, 8);
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      const meta: Record<string, unknown> = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      };

      // Include userId when available
      if (req.userId) meta.userId = req.userId;

      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger.log(level, `${req.method} ${req.path} ${res.statusCode} in ${duration}ms`, meta);
    }
  });

  next();
}

export default logger;
