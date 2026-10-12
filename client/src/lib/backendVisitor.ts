// A stable per-browser id for the backend funnel's A/B tests.
//
// The booking screen has no email yet (that is collected at Stripe), so the
// booking-treatment experiment (02) and the price test (04) are keyed on a `visitor`
// subject instead — this id. It is generated once, kept in localStorage, and threaded
// through checkout so a purchase can be attributed back to the arm she saw.
//
// Deliberately its OWN key, not PostHog's distinct id: analytics is off when no
// key is set (get_distinct_id would be undefined), and this must exist regardless.
//
// ⭐ MEMOISED for the life of the page. 04's price endpoint and its checkout each ask for
// this id, and the server resolves her price arm from it TWICE (once to print, once to
// charge). Without storage (private mode, storage disabled) a fresh id per call would put
// those two in different arms — a 409 "the price changed" on every press. One id per page
// load keeps them together; only a returning visit can't be recognised there.

const STORAGE_KEY = 'be_visitor_id';

let memo: string | null = null;

/** The stable visitor id for this browser, creating and persisting one on first call. */
export function getBackendVisitorId(): string {
  if (memo) return memo;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return (memo = existing);
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return (memo = id);
  } catch {
    // Private mode / storage disabled: fall back to a per-PAGE id (memoised above), so every
    // call in this page life agrees. The test just can't dedup a returning visit here — far
    // better than blocking the booking.
    return (memo = `v-ephemeral-${Math.random().toString(36).slice(2)}`);
  }
}
