// Cron job scheduler for automated tasks like follow-up emails
// and monthly counter resets.

import cron from 'node-cron';
import { processFollowUpQueue, resetMonthlyCounters } from './followUpEmailGenerator';
import { processTopupQueue } from './topupEmailGenerator';
import { cleanupInactiveSessions } from './creditTracking';
import { cleanupExpiredMagicLinks } from './magicLink';
import { processNextBatch } from './migrationDripProcessor';
import { processAidenFollowupQueue } from './aidenFollowupEmailGenerator';
import { processVerifiedDripQueue } from './aidenVerifiedDripGenerator';
import logger from './logger';

// Per-job concurrency guards — prevent overlapping runs if a job takes longer than its interval
let isFollowUpProcessing = false;
let isTopupProcessing = false;
let isMonthlyResetProcessing = false;
let isSessionCleanupProcessing = false;
let isMigrationDripProcessing = false;
let isAidenFollowupProcessing = false;
let isAidenVerifiedDripProcessing = false;

/**
 * Initialize all cron jobs.
 * Call this once during server startup.
 */
export function initializeCronJobs(): void {
  if (process.env.DISABLE_CRONS === 'true') {
    logger.info('Cron jobs disabled (DISABLE_CRONS=true)');
    return;
  }

  const timezone = process.env.CRON_TIMEZONE || 'America/New_York';

  // Daily follow-up processing at 10 AM
  cron.schedule(
    '0 10 * * *',
    async () => {
      if (isFollowUpProcessing) {
        logger.info('Cron: Follow-up processing already running, skipping');
        return;
      }
      isFollowUpProcessing = true;
      logger.info('Cron: Starting daily follow-up email processing');
      try {
        const stats = await processFollowUpQueue();
        logger.info('Cron: Follow-up processing complete', stats);
      } catch (error) {
        logger.error('Cron: Follow-up processing failed', { error: (error as Error).message });
      } finally {
        isFollowUpProcessing = false;
      }
    },
    { timezone },
  );

  // Daily top-up email processing at 11 AM (offset from follow-up cron at 10 AM)
  cron.schedule(
    '0 11 * * *',
    async () => {
      if (isTopupProcessing) {
        logger.info('Cron: Top-up processing already running, skipping');
        return;
      }
      isTopupProcessing = true;
      logger.info('Cron: Starting daily top-up email processing');
      try {
        const stats = await processTopupQueue();
        logger.info('Cron: Top-up processing complete', stats);
      } catch (error) {
        logger.error('Cron: Top-up processing failed', { error: (error as Error).message });
      } finally {
        isTopupProcessing = false;
      }
    },
    { timezone },
  );

  // Weekly magic link cleanup — Sunday at 3 AM
  cron.schedule(
    '0 3 * * 0',
    async () => {
      try {
        await cleanupExpiredMagicLinks();
      } catch (error) {
        logger.error('Cron: Magic link cleanup failed', { error: (error as Error).message });
      }
    },
    { timezone },
  );

  // Monthly counter reset on the 1st at midnight
  cron.schedule(
    '0 0 1 * *',
    async () => {
      if (isMonthlyResetProcessing) {
        logger.info('Cron: Monthly counter reset already running, skipping');
        return;
      }
      isMonthlyResetProcessing = true;
      logger.info('Cron: Resetting monthly follow-up counters');
      try {
        await resetMonthlyCounters();
      } catch (error) {
        logger.error('Cron: Monthly counter reset failed', { error: (error as Error).message });
      } finally {
        isMonthlyResetProcessing = false;
      }
    },
    { timezone },
  );

  // Session timeout cleanup every 5 minutes
  // Auto-ends idle sessions based on per-persona timeout and sends notification emails
  cron.schedule(
    '*/5 * * * *',
    async () => {
      if (isSessionCleanupProcessing) {
        logger.info('Cron: Session cleanup already running, skipping');
        return;
      }
      isSessionCleanupProcessing = true;
      try {
        const endedCount = await cleanupInactiveSessions();
        if (endedCount > 0) {
          logger.info('Cron: Session timeout cleanup complete', { endedCount });
        }
      } catch (error) {
        logger.error('Cron: Session timeout cleanup failed', { error: (error as Error).message });
      } finally {
        isSessionCleanupProcessing = false;
      }
    },
    { timezone },
  );

  // Migration drip batch processor — every 15 minutes
  // Handles: auto-sending next Email #1 batch when due + Email #2-#8 queue processing
  cron.schedule(
    '*/15 * * * *',
    async () => {
      if (isMigrationDripProcessing) {
        logger.info('Cron: Migration drip already running, skipping');
        return;
      }
      isMigrationDripProcessing = true;
      try {
        const result = await processNextBatch();
        if (result.batchTriggered) {
          logger.info('Cron: Migration drip batch sent', { batchStats: result.batchStats });
        }
        if (result.queueStats && (result.queueStats.sent > 0 || result.queueStats.failed > 0)) {
          logger.info('Cron: Migration drip follow-up emails processed', { queueStats: result.queueStats });
        }
      } catch (error) {
        logger.error('Cron: Migration drip processing failed', { error: (error as Error).message });
      } finally {
        isMigrationDripProcessing = false;
      }
    },
    { timezone },
  );

  // Aiden follow-up emails — every 5 minutes
  // +10m / +24h / +48h nurture sequence for unverified /aiden signups.
  // No-ops when ENABLE_AIDEN_FOLLOWUPS is not 'true'.
  cron.schedule(
    '*/5 * * * *',
    async () => {
      if (isAidenFollowupProcessing) {
        logger.info('Cron: Aiden follow-up processing already running, skipping');
        return;
      }
      isAidenFollowupProcessing = true;
      try {
        const stats = await processAidenFollowupQueue();
        if (stats.processed > 0) {
          logger.info('Cron: Aiden follow-up batch complete', stats);
        }
      } catch (error) {
        logger.error('Cron: Aiden follow-up processing failed', { error: (error as Error).message });
      } finally {
        isAidenFollowupProcessing = false;
      }
    },
    { timezone },
  );

  // Aiden verified-but-not-purchased drip — every 5 minutes (offset 1 min so it
  // does not overlap the unverified batch when both run in the same tick).
  // +1h / +25h / +49h nurture for users who verified and got free minutes but
  // have not converted. No-ops when ENABLE_AIDEN_VERIFIED_DRIP is not 'true'.
  cron.schedule(
    '1-59/5 * * * *',
    async () => {
      if (isAidenVerifiedDripProcessing) {
        logger.info('Cron: Aiden verified-drip processing already running, skipping');
        return;
      }
      isAidenVerifiedDripProcessing = true;
      try {
        const stats = await processVerifiedDripQueue();
        if (stats.processed > 0) {
          logger.info('Cron: Aiden verified-drip batch complete', stats);
        }
      } catch (error) {
        logger.error('Cron: Aiden verified-drip processing failed', { error: (error as Error).message });
      } finally {
        isAidenVerifiedDripProcessing = false;
      }
    },
    { timezone },
  );

  logger.info('Cron jobs initialized', { timezone });
}
