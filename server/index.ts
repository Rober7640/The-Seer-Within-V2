import "dotenv/config";
import * as Sentry from "@sentry/node";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startHeartbeat, recoverActiveSessions, startInactiveSessionCleanup } from "./lib/creditTracking";
import { shouldRunBackgroundJobs } from "./lib/backgroundJobsGate";
import { initializeCronJobs } from "./lib/cronJobs";
import logger, { requestIdMiddleware } from "./lib/logger";
import { posthog } from "./lib/posthog";

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

// Trust Railway's edge proxy so req.ip and X-Forwarded-For reflect the real
// client IP. Required for express-rate-limit to bucket per visitor instead
// of lumping all traffic under the proxy IP. Value `1` trusts only the
// immediate upstream hop — does NOT trust arbitrary forwarded headers.
app.set('trust proxy', 1);

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

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Capture server errors in Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }

    posthog.captureException(err);

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
  // ---------------------------------------------------------------------------
  // BACKGROUND JOBS — must run in EXACTLY ONE deployment per database.
  //
  // These four jobs are timers, not routes: they act on whatever they find in the
  // database, with no idea which environment created it. `startHeartbeat` selects
  // `WHERE status='active'` and nothing else. So a second deployment sharing the
  // same DATABASE_URL bills the first one's live customers even with zero traffic
  // of its own — which is exactly what happened on 2026-08-04, when Development
  // and Production shared one database and two meters drained real wallets.
  // See docs/root-cause-1800-wallet-drain-2026-08-04.md.
  //
  // Gating is by IDENTITY, not a hand-set flag: jobs run only where Railway's
  // auto-injected environment name says "production", with RUN_BACKGROUND_JOBS
  // as an explicit two-way override (true = local dev on your OWN database,
  // false = kill switch anywhere). A laptop has no Railway identity, so it is
  // safe by default — the August drain came through exactly such a machine.
  // Decision logic + matrix: server/lib/backgroundJobsGate.ts.
  // ---------------------------------------------------------------------------
  const jobsDecision = shouldRunBackgroundJobs();
  const deploymentLabel =
    process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || "unknown";

  if (!jobsDecision.run) {
    logger.warn(
      "Background jobs DISABLED for this deployment — no billing heartbeat, no " +
      "session cleanup, no cron. This must be true of every deployment except " +
      "the one that owns the database.",
      { deployment: deploymentLabel, reason: jobsDecision.reason },
    );
  } else {
    logger.info("Background jobs ENABLED — this deployment owns billing for its database", {
      deployment: deploymentLabel,
      reason: jobsDecision.reason,
    });
    // Recover active sessions from DB (handles server restarts gracefully)
    try {
      await recoverActiveSessions();
      // Start credit tracking heartbeat (checkpoints active sessions every 30s)
      startHeartbeat();
      // Start background cleanup for inactive sessions (every 5 min, auto-ends 30+ min idle)
      startInactiveSessionCleanup();
      // Initialize cron jobs (follow-up emails, monthly resets)
      initializeCronJobs();
    } catch (err) {
      logger.warn("DB unavailable — skipping session recovery and cron jobs", { error: (err as Error).message });
    }
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    logger.info(`Server listening on port ${port}`, { port });
  });
})();
