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

// ⚠ enableExceptionAutocapture was REMOVED: posthog-node v5.21.2's exception capture
// emits a batch item with no event name, so PostHog rejects the WHOLE /batch/ request
// with HTTP 400 ("non-engage request missing event name attribute") — silently dropping
// every valid event (page views, purchases) batched alongside it. Server errors are
// already captured by Sentry (server/index.ts) and the logger, so nothing is lost.
export const posthog: PostHogLike = apiKey
  ? new PostHog(apiKey, {
      ...(host ? { host } : {}),
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
