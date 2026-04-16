// Cron job scheduler for automated tasks like follow-up emails
// and monthly counter resets.

import cron from 'node-cron';
import { processFollowUpQueue, resetMonthlyCounters } from './followUpEmailGenerator';
import { processTopupQueue } from './topupEmailGenerator';
import { cleanupInactiveSessions } from './creditTracking';
import { cleanupExpiredMagicLinks } from './magicLink';
import { processNextBatch } from './migrationDripProcessor';
import logger from './logger';

// Per-job concurrency guards — prevent overlapping runs if a job takes longer than its interval
let isFollowUpProcessing = false;
let isTopupProcessing = false;
let isMonthlyResetProcessing = false;
let isSessionCleanupProcessing = false;
let isMigrationDripProcessing = false;

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

  logger.info('Cron jobs initialized', { timezone });
}
