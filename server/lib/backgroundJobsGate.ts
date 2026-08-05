// Decides whether THIS process may run the four background jobs (billing
// heartbeat, inactive-session cleanup, session recovery, cron). They are timers,
// not routes: they act on whatever they find in the connected database, so they
// must run in EXACTLY ONE deployment per database.
//
// The 2026-08 wallet drain proved the doorway is any stray process with a prod
// DATABASE_URL — a developer laptop qualifies. A hand-set opt-out flag
// (RUN_BACKGROUND_JOBS=false) can never close that door, because a laptop
// nobody thought about is precisely the machine where nobody set the flag.
//
// So the default is IDENTITY, not configuration:
//
//   RUN_BACKGROUND_JOBS=true   → run (explicit override, e.g. local dev
//                                 against your OWN database)
//   RUN_BACKGROUND_JOBS=false  → don't run (explicit kill switch, any machine)
//   unset                      → run ONLY if Railway says this is the
//                                 production environment
//
// RAILWAY_ENVIRONMENT_NAME is injected by Railway automatically — it is not a
// variable anyone sets by hand. Production therefore needs ZERO new config to
// keep billing (the original opt-out design's requirement), while laptops and
// preview environments are safe by default: they have no Railway identity.
//
// Deploy check: the boot log always states which path was taken — after any
// deploy, confirm Production logs "Background jobs ENABLED".

export interface BackgroundJobsDecision {
  run: boolean;
  reason: string;
}

export function shouldRunBackgroundJobs(
  env: Record<string, string | undefined> = process.env,
): BackgroundJobsDecision {
  const flag = (env.RUN_BACKGROUND_JOBS ?? "").trim();
  const railwayEnv = (env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_ENVIRONMENT || "").trim();

  if (/^(1|true|yes|on)$/i.test(flag)) {
    return { run: true, reason: "RUN_BACKGROUND_JOBS=true (explicit override)" };
  }
  if (/^(0|false|no|off)$/i.test(flag)) {
    return { run: false, reason: "RUN_BACKGROUND_JOBS=false (explicit kill switch)" };
  }
  if (railwayEnv.toLowerCase() === "production") {
    return { run: true, reason: `Railway environment "${railwayEnv}" owns billing` };
  }
  return {
    run: false,
    reason: railwayEnv
      ? `Railway environment "${railwayEnv}" is not production`
      : "no Railway identity (local machine?) — set RUN_BACKGROUND_JOBS=true to override",
  };
}
