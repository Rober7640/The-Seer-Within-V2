import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY || '';
const host = process.env.POSTHOG_HOST;

export const posthog = new PostHog(apiKey, {
  ...(host ? { host } : {}),
  enableExceptionAutocapture: true,
});

process.on('SIGINT', async () => {
  await posthog.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await posthog.shutdown();
  process.exit(0);
});
