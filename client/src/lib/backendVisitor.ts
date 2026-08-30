// A stable per-browser id for the backend funnel's A/B tests.
//
// The booking screen has no email yet (that is collected at Stripe), so the
// booking-treatment experiment is keyed on a `visitor` subject instead — this id.
// It is generated once, kept in localStorage, and threaded through checkout so a
// purchase can be attributed back to the arm she saw.
//
// Deliberately its OWN key, not PostHog's distinct id: analytics is off when no
// key is set (get_distinct_id would be undefined), and this must exist regardless.

const STORAGE_KEY = 'be_visitor_id';

/** The stable visitor id for this browser, creating and persisting one on first call. */
export function getBackendVisitorId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled: fall back to a per-session id. The test just
    // can't dedup a returning visit here — far better than blocking the booking.
    return `v-ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}
