import { PostHog } from 'posthog-node';

const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST;

type PostHogLike = Pick<PostHog, 'identify' | 'capture' | 'captureException' | 'shutdown'>;

function createNoopClient(): PostHogLike {
  const noop = () => {};
  return {
    identify: noop as PostHogLike['identify'],
    capture: noop as PostHogLike['capture'],
    captureException: noop as PostHogLike['captureException'],
    shutdown: (async () => {}) as PostHogLike['shutdown'],
  };
}

export const posthog: PostHogLike = apiKey
  ? new PostHog(apiKey, {
      ...(host ? { host } : {}),
      enableExceptionAutocapture: true,
    })
  : createNoopClient();

if (!apiKey) {
  console.warn('[posthog] POSTHOG_API_KEY not set — analytics disabled (events will be no-ops).');
}

process.on('SIGINT', async () => {
  await posthog.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await posthog.shutdown();
  process.exit(0);
});
