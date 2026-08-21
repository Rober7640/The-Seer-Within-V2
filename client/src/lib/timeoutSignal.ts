// createTimeoutSignal — a browser-safe fetch timeout.
//
// Moved here verbatim from EvelynLanderPage.tsx (Task 5) so a second consumer
// can reuse it WITHOUT importing the page: LiveThreadLander is rendered BY
// EvelynLanderPage (Task 12), so importing the helper back out of that page
// would create an import cycle. A shared lib module is the same reuse with no
// cycle. Behaviour is byte-identical to the original; nothing else changed.
//
// AbortSignal.timeout() landed in Chrome 103 / Firefox 100 / Safari 15.4 —
// but crypto.randomUUID() (used to mint the lander session token) already
// requires Safari 15.4, so Safari lacking one already lacks the other; no NEW
// Safari regression from using it. The real gap is Chrome 92–102 / Firefox
// 95–99: the page renders fine there (crypto.randomUUID is fine), but
// AbortSignal.timeout is still missing — including stale Android System
// WebView inside the Facebook in-app browser, which is this page's actual
// paid traffic. Calling AbortSignal.timeout() directly in that band throws a
// synchronous TypeError before fetch is ever issued, landing in the caller's
// catch and silently killing the request. Feature-detect and fall back to a
// manual AbortController + setTimeout so those browsers still get REAL
// timeout coverage (not just "no crash") — graceful degradation to "no
// timeout at all" would resurrect the original stall bug specifically for the
// highest-risk slice of traffic.
//
// Callers MUST invoke cleanup() in a finally block: on the fallback path it is
// what clears the pending setTimeout, so a fast-resolving request doesn't leave
// a timer (and a stray abort of an already-settled controller) behind.
export function createTimeoutSignal(ms: number): { signal: AbortSignal; cleanup: () => void } {
  if (typeof AbortSignal.timeout === "function") {
    return { signal: AbortSignal.timeout(ms), cleanup: () => {} };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
}
