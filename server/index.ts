import "dotenv/config";
import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startHeartbeat, recoverActiveSessions, startInactiveSessionCleanup } from "./lib/creditTracking";
import { initializeCronJobs } from "./lib/cronJobs";
import logger, { requestIdMiddleware } from "./lib/logger";

// Initialize Sentry for server-side error monitoring
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    beforeSend(event) {
      // Scrub sensitive data from events
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(express.text({ type: 'text/plain' }));

// Attach request IDs and log API requests
app.use(requestIdMiddleware);

/** @deprecated Use `import logger from './lib/logger'` instead. Kept for backward compat. */
export function log(message: string, source = "express") {
  logger.info(message, { source });
}

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Capture server errors in Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }

    logger.error("Internal Server Error", { error: err.message, stack: err.stack, status });

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Recover active sessions from DB (handles server restarts gracefully)
  await recoverActiveSessions();

  // Start credit tracking heartbeat (checkpoints active sessions every 30s)
  startHeartbeat();

  // Start background cleanup for inactive sessions (every 5 min, auto-ends 30+ min idle)
  startInactiveSessionCleanup();

  // Initialize cron jobs (follow-up emails, monthly resets)
  initializeCronJobs();

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    logger.info(`Server listening on port ${port}`, { port });
  });
})();
