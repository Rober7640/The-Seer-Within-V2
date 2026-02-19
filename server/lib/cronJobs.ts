// Cron job scheduler for automated tasks like follow-up emails
// and monthly counter resets.

import cron from 'node-cron';
import { processFollowUpQueue, resetMonthlyCounters } from './followUpEmailGenerator';
import { cleanupInactiveSessions } from './creditTracking';
import logger from './logger';

let isProcessing = false;

/**
 * Initialize all cron jobs.
 * Call this once during server startup.
 */
export function initializeCronJobs(): void {
  const timezone = process.env.CRON_TIMEZONE || 'America/New_York';

  // Daily follow-up processing at 10 AM
  cron.schedule(
    '0 10 * * *',
    async () => {
      if (isProcessing) {
        logger.info('Cron: Follow-up processing already running, skipping');
        return;
      }

      isProcessing = true;
      logger.info('Cron: Starting daily follow-up email processing');

      try {
        const stats = await processFollowUpQueue();
        logger.info('Cron: Follow-up processing complete', stats);
      } catch (error) {
        logger.error('Cron: Follow-up processing failed', { error: (error as Error).message });
      } finally {
        isProcessing = false;
      }
    },
    { timezone },
  );

  // Monthly counter reset on the 1st at midnight
  cron.schedule(
    '0 0 1 * *',
    async () => {
      logger.info('Cron: Resetting monthly follow-up counters');
      try {
        await resetMonthlyCounters();
      } catch (error) {
        logger.error('Cron: Monthly counter reset failed', { error: (error as Error).message });
      }
    },
    { timezone },
  );

  // Session timeout cleanup every 5 minutes
  // Auto-ends idle sessions based on per-persona timeout and sends notification emails
  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        const endedCount = await cleanupInactiveSessions();
        if (endedCount > 0) {
          logger.info('Cron: Session timeout cleanup complete', { endedCount });
        }
      } catch (error) {
        logger.error('Cron: Session timeout cleanup failed', { error: (error as Error).message });
      }
    },
    { timezone },
  );

  logger.info('Cron jobs initialized', { timezone });
}
