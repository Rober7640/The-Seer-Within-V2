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
      // SPA pageviews are captured MANUALLY on wouter route changes in App's Router
      // effect (task 1.6). Auto-capture would only fire on the initial load and miss
      // client-side navigations; capturing manually also avoids double-counting.
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

/** The five standard UTM params. Single source of truth for register + read. */
export const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/**
 * Register UTM params from the current URL as super-properties (task 1.6) so every
 * subsequent event — pageviews, signup, purchase — carries the traffic source,
 * closing the attribution gap for the whole session instead of only the landing
 * event. Call once per full page load (the entry URL). No-op when no utm_* present,
 * so it never clears a prior session's attribution.
 */
export function registerUTMs() {
  if (!initialized) return;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of UTM_PARAMS) {
      const value = params.get(key);
      if (value) utm[key] = value;
    }
    if (Object.keys(utm).length > 0) posthog.register(utm);
  } catch {
    // silent — analytics must never break the app
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

/**
 * The UTMs registered as super-properties on entry (registerUTMs). Read from PostHog's
 * persistence, NOT window.location — the entry URL's utm_* survive navigation to the
 * booking screen and the Stripe redirect. Joel may put his tag in ANY of the five, so
 * all five are read; only present keys are returned.
 */
export function getUTMs(): Record<string, string> {
  if (!initialized) return {};
  try {
    const out: Record<string, string> = {};
    for (const key of UTM_PARAMS) {
      const value = posthog.get_property(key);
      if (typeof value === 'string' && value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}
