import { lazy, type ComponentType } from "react";

// ── Why this exists ──────────────────────────────────────────────────────────
// The app is code-split: each route is a separate hashed chunk loaded on demand.
// A deploy renames EVERY chunk and deletes the old ones. A browser that loaded the
// app BEFORE a deploy then asks for a chunk filename that no longer exists, so the
// dynamic import rejects (ChunkLoadError / "Failed to fetch dynamically imported
// module") and the whole route tree throws to the Sentry error boundary — the buyer
// sees "Something went wrong" on, worst case, the page right after she paid. She can
// fix it by refreshing (a fresh index.html points at the current chunk names), which
// is exactly what the fallback tells her to do.
//
// This makes that self-heal automatic: on the FIRST chunk failure this session, force
// ONE full reload. A sessionStorage guard makes it strictly one reload per session, so
// a genuinely-missing chunk (offline, a real 404) can't cause a reload loop — after the
// one attempt we let the error boundary render its manual "Refresh" button instead.
const RELOAD_FLAG = "chunk_reload_attempted";

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy<T>(() =>
    importer().catch((err: unknown): Promise<{ default: T }> => {
      // If sessionStorage is unavailable (private mode) we cannot guard against a loop,
      // so we deliberately do NOT auto-reload — better one manual refresh than a storm.
      let canGuard = false;
      let attempted = false;
      try {
        attempted = window.sessionStorage.getItem(RELOAD_FLAG) === "1";
        canGuard = true;
      } catch {
        canGuard = false;
      }

      if (canGuard && !attempted) {
        try {
          window.sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {
          /* ignore — best effort */
        }
        // Full reload re-fetches index.html and the current chunk names.
        window.location.reload();
        // Never resolves: hold the Suspense boundary until the reload takes over, so
        // React does not flash the error screen in the instant before navigation.
        return new Promise<{ default: T }>(() => {});
      }

      // Already tried a reload this session (or cannot guard) → let the error boundary
      // render. Its message already tells her to refresh.
      throw err;
    }),
  );
}
