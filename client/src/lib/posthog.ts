import posthog from 'posthog-js';

const apiKey = import.meta.env.VITE_POSTHOG_API_KEY as string | undefined;
const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (!apiKey) {
    console.warn('[posthog] VITE_POSTHOG_API_KEY not set — analytics disabled.');
    return;
  }
  try {
    posthog.init(apiKey, {
      api_host: host,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
    });
    initialized = true;
  } catch (err) {
    console.warn('[posthog] init failed:', err);
  }
}

export function track(event: string, properties: Record<string, unknown> = {}) {
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // silent — analytics must never break the app
  }
}

export function identifyUser(distinctId: string, properties: Record<string, unknown> = {}) {
  if (!initialized) return;
  try {
    posthog.identify(distinctId, properties);
  } catch {
    // silent
  }
}

export function getDistinctId(): string | undefined {
  if (!initialized) return undefined;
  try {
    return posthog.get_distinct_id();
  } catch {
    return undefined;
  }
}
