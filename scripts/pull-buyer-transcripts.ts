/**
 * pull-buyer-transcripts.ts — READ-ONLY production purchase-transcript monitor.
 *
 * Pulls every completed credit purchase in a time window, plus the full chat
 * transcripts around each purchase (48h lookback, post-purchase sessions),
 * plus prompt-experiment exposures, and writes them as analyzable files.
 *
 * Safety contract (same as scripts/eval-monitor.ts on Joel's machine):
 *   1. Startup canary: a write attempted inside BEGIN TRANSACTION READ ONLY
 *      must be rejected with SQLSTATE 25006 or the run ABORTS.
 *   2. Every data query runs inside an explicit READ ONLY transaction.
 *   3. Output goes ONLY under improve-v2/transcripts/ (gitignored — raw PII).
 *
 * Usage:
 *   npx tsx scripts/pull-buyer-transcripts.ts --hours 12
 *   npx tsx scripts/pull-buyer-transcripts.ts --from 2026-07-07T03:43:00Z --to 2026-07-09T03:43:00Z --out improve-v2/transcripts/monitor/preflip-baseline
 */
import "dotenv/config";
import pg from "pg";
import fs from "fs";
import path from "path";

// Naive `timestamp` columns are stored UTC — parse them as UTC (same fix as server/lib/db.ts).
pg.types.setTypeParser(1114, (str: string) => new Date(str.replace(" ", "T") + "Z"));
pg.types.setTypeParser(1184, (str: string) => new Date(str));

const EXPERIMENT_KEY = "persona_prompt_evelyn_2026";
const LOOKBACK_HOURS = 48; // sessions to pull before each purchase
const POST_HOURS = 24; // post-purchase sessions considered "resumed after buying"

// ---------- args ----------
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}
const hours = Number(arg("hours") ?? 12);
const fromIso = arg("from");
const toIso = arg("to");
const outDir = path.resolve(
  arg("out") ?? `improve-v2/transcripts/monitor/purchases-${hours}h`,
);

// PII guard: refuse to write outside the gitignored transcripts tree.
if (!outDir.replace(/\\/g, "/").includes("improve-v2/transcripts/")) {
  console.error(`ABORT: --out must be under improve-v2/transcripts/ (gitignored). Got: ${outDir}`);
  process.exit(1);
}

// Naive-UTC strings ("YYYY-MM-DD HH:MM:SS") compare timezone-proof against
// naive timestamp columns, independent of session timezone / pooler behavior.
const naive = (d: Date) => d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
const windowTo = toIso ? new Date(toIso) : new Date();
const windowFrom = fromIso ? new Date(fromIso) : new Date(windowTo.getTime() - hours * 3600_000);
if (isNaN(windowFrom.getTime()) || isNaN(windowTo.getTime())) {
  console.error("ABORT: invalid --from/--to");
  process.exit(1);
}

const url = process.env.DATABASE_URL ?? "";
const redactedHost = url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@").split("?")[0];
if (/localhost|127\.0\.0\.1/.test(url)) {
  console.error("ABORT: DATABASE_URL points at localhost — this monitor is for production data.");
  process.exit(1);
}

// ---------- helpers ----------
const iso = (d: Date | null | undefined) => (d ? d.toISOString().replace(".000Z", "Z") : null);
const mins = (ms: number) => Math.round(ms / 6000) / 10;
const short = (id: string) => id.slice(0, 8);
const jsonOut = (file: string, data: unknown) =>
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(data, null, 2));

function initials(firstName: string | null, email: string): string {
  const a = (firstName?.trim()?.[0] ?? email[0] ?? "X").toUpperCase();
  const b = (email[0] ?? "X").toUpperCase();
  return `${a}${b}`;
}

async function main() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  console.log(`DB: ${redactedHost}`);
  console.log(`Window (UTC): ${naive(windowFrom)} → ${naive(windowTo)}`);

  // ---------- 1. CANARY: a write inside READ ONLY must be rejected ----------
  let canary = "NOT RUN";
  await client.query("BEGIN TRANSACTION READ ONLY");
  try {
    // A definite write command that would touch zero rows even if enforcement failed.
    await client.query("UPDATE users SET id = id WHERE false");
    canary = "WRITE WAS ACCEPTED — READ ONLY NOT ENFORCED";
  } catch (e: any) {
    canary = e?.code === "25006" ? "rejected (SQLSTATE 25006) ✔" : `rejected (unexpected: ${e?.code} ${e?.message})`;
  } finally {
    await client.query("ROLLBACK");
  }
  console.log(`Canary write: ${canary}`);
  if (!canary.startsWith("rejected")) {
    console.error("ABORT: canary write was not rejected. Refusing to run.");
    await client.end();
    process.exit(1);
  }

  // ---------- 2. All data reads in one explicit READ ONLY transaction ----------
  await client.query("BEGIN TRANSACTION READ ONLY");
  await client.query("SET LOCAL timezone = 'UTC'");
  await client.query("SET LOCAL statement_timeout = 30000");

  const dbNow = (await client.query("SELECT now() AT TIME ZONE 'UTC' AS now")).rows[0].now as Date;

  const experiment = (
    await client.query(
      `SELECT key, name, status, subject_type, variants, started_at, ended_at, winner_variant
       FROM experiments WHERE key = $1`,
      [EXPERIMENT_KEY],
    )
  ).rows[0] ?? null;
  const flipAt: Date | null = experiment?.started_at ?? null;

  const purchases = (
    await client.query(
      `SELECT cp.id, cp.user_id, cp.persona_id, cp.package_type, cp.coins_purchased,
              cp.bonus_coins, cp.price_usd, cp.status, cp.created_at,
              (cp.stripe_session_id IS NOT NULL OR cp.stripe_payment_intent_id IS NOT NULL) AS via_stripe,
              (cp.paypal_order_id IS NOT NULL) AS via_paypal,
              u.email, u.first_name, u.coin_balance, u.signup_funnel,
              u.created_at AS user_created_at,
              p.slug AS persona_slug, p.display_name AS persona_name
       FROM credit_purchases cp
       JOIN users u ON u.id = cp.user_id
       LEFT JOIN personas p ON p.id = cp.persona_id
       WHERE cp.status = 'completed'
         AND cp.created_at >= $1::timestamp AND cp.created_at < $2::timestamp
         AND lower(u.email) NOT LIKE '%@eval.internal'
       ORDER BY cp.created_at`,
      [naive(windowFrom), naive(windowTo)],
    )
  ).rows;

  const userIds = [...new Set(purchases.map((p) => p.user_id))];
  console.log(`Completed purchases in window: ${purchases.length} (${userIds.length} unique buyers)`);

  let sessions: any[] = [];
  let messages: any[] = [];
  let exposures: any[] = [];
  if (userIds.length) {
    const sessFrom = naive(new Date(windowFrom.getTime() - LOOKBACK_HOURS * 3600_000));
    sessions = (
      await client.query(
        `SELECT s.id, s.user_id, s.persona_id, p.slug AS persona_slug,
                s.started_at, s.ended_at, s.duration_seconds, s.coins_charged,
                s.promo_coins_charged, s.status, s.last_topic, s.last_bucket,
                s.last_message_at, s.prompt_variant_id
         FROM chat_sessions s
         LEFT JOIN personas p ON p.id = s.persona_id
         WHERE s.user_id = ANY($1) AND s.started_at >= $2::timestamp
         ORDER BY s.user_id, s.started_at`,
        [userIds, sessFrom],
      )
    ).rows;

    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length) {
      messages = (
        await client.query(
          `SELECT m.session_id, m.role, m.content, m.input_tokens, m.output_tokens,
                  COALESCE(m.sent_at, m.created_at) AS at
           FROM chat_messages m
           WHERE m.session_id = ANY($1)
           ORDER BY m.session_id, COALESCE(m.sent_at, m.created_at), m.id`,
          [sessionIds],
        )
      ).rows;
    }

    exposures = (
      await client.query(
        `SELECT subject_id, variant, surface, created_at, context
         FROM experiment_exposures
         WHERE experiment_key = $1 AND subject_id = ANY($2)
         ORDER BY created_at`,
        [EXPERIMENT_KEY, userIds],
      )
    ).rows;
  }
  await client.query("COMMIT");
  await client.end();

  // ---------- 3. Assemble per-buyer views (pure JS, no DB) ----------
  fs.mkdirSync(path.join(outDir, "buyers"), { recursive: true });

  const msgsBySession = new Map<string, any[]>();
  for (const m of messages) {
    if (!msgsBySession.has(m.session_id)) msgsBySession.set(m.session_id, []);
    msgsBySession.get(m.session_id)!.push(m);
  }
  const sessionsByUser = new Map<string, any[]>();
  for (const s of sessions) {
    if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
    sessionsByUser.get(s.user_id)!.push(s);
  }
  const sessionEnd = (s: any): Date =>
    s.ended_at ?? s.last_message_at ?? s.started_at;

  const buyers = new Map<string, any>();
  for (const p of purchases) {
    if (!buyers.has(p.user_id))
      buyers.set(p.user_id, {
        user_id: p.user_id,
        email: p.email,
        first_name: p.first_name,
        signup_funnel: p.signup_funnel,
        user_created_at: p.user_created_at,
        coin_balance_now: p.coin_balance,
        purchases: [],
      });
    buyers.get(p.user_id)!.purchases.push(p);
  }

  const summaryLines: string[] = [];
  let bi = 0;
  for (const buyer of buyers.values()) {
    bi++;
    const tag = `${String(bi).padStart(2, "0")}-${initials(buyer.first_name, buyer.email)}`;
    buyer.tag = tag;
    const dir = path.join(outDir, "buyers", tag);
    fs.mkdirSync(dir, { recursive: true });
    const bSessions = sessionsByUser.get(buyer.user_id) ?? [];

    // Relate each session to each purchase
    for (const p of buyer.purchases) {
      const pt = (p.created_at as Date).getTime();
      const before = bSessions.filter(
        (s) => sessionEnd(s).getTime() <= pt && pt - sessionEnd(s).getTime() <= LOOKBACK_HOURS * 3600_000,
      );
      const preSession = before.sort((a, b) => sessionEnd(b).getTime() - sessionEnd(a).getTime())[0] ?? null;
      // Session running AT purchase time (started before, ended/last-activity after)
      const duringSession =
        bSessions.find(
          (s) => (s.started_at as Date).getTime() <= pt && sessionEnd(s).getTime() > pt,
        ) ?? null;
      const after = bSessions.filter(
        (s) => (s.started_at as Date).getTime() >= pt && (s.started_at as Date).getTime() - pt <= POST_HOURS * 3600_000,
      );
      const postSession = after.sort((a, b) => (a.started_at as Date).getTime() - (b.started_at as Date).getTime())[0] ?? null;
      p._pre_session_id = preSession?.id ?? null;
      p._pre_gap_min = preSession ? mins(pt - sessionEnd(preSession).getTime()) : null;
      p._during_session_id = duringSession?.id ?? null;
      p._post_session_id = postSession?.id ?? null;
      p._post_gap_min = postSession ? mins((postSession.started_at as Date).getTime() - pt) : null;
    }

    // Write one transcript per session
    const sessionLines: string[] = [];
    for (const s of bSessions) {
      const msgs = msgsBySession.get(s.id) ?? [];
      const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
      const endsOnQuestion = lastAssistant ? /\?\s*$/.test((lastAssistant.content ?? "").trim()) : null;
      const preFlip = flipAt ? (s.started_at as Date).getTime() < flipAt.getTime() : null;

      const rel: string[] = [];
      for (const p of buyer.purchases) {
        if (p._pre_session_id === s.id) rel.push(`ended ${p._pre_gap_min}m BEFORE purchase ${short(p.id)} (${p.package_type})`);
        if (p._during_session_id === s.id) rel.push(`RUNNING AT purchase ${short(p.id)} (${p.package_type})`);
        if (p._post_session_id === s.id) rel.push(`started ${p._post_gap_min}m AFTER purchase ${short(p.id)}`);
      }

      const head = [
        `# ${tag} — session ${short(s.id)} (${s.persona_slug ?? "?"})`,
        ``,
        `- session_id: ${s.id}`,
        `- started: ${iso(s.started_at)}  ended: ${iso(s.ended_at)}  status: ${s.status}  duration_s: ${s.duration_seconds ?? ""}`,
        `- last_message_at: ${iso(s.last_message_at)}  coins_charged: ${s.coins_charged}  promo_coins: ${s.promo_coins_charged}`,
        `- topic: ${s.last_topic ?? ""}  bucket: ${s.last_bucket ?? ""}  prompt_variant_id: ${s.prompt_variant_id ?? "null"}`,
        `- started ${preFlip === null ? "?" : preFlip ? "PRE-flip (old prompt possible)" : "POST-flip (prompt B)"}${flipAt ? ` (flip=${iso(flipAt)})` : ""}`,
        `- messages: ${msgs.length} (${msgs.filter((m) => m.role === "user").length} user / ${msgs.filter((m) => m.role === "assistant").length} assistant)`,
        `- last assistant message ends on question: ${endsOnQuestion}`,
        rel.length ? `- relation to purchases: ${rel.join("; ")}` : `- relation to purchases: (none in window)`,
        ``,
        `---`,
        ``,
      ];
      const body = msgs.map(
        (m) => `**${(m.role as string).toUpperCase()}** (${iso(m.at)}):\n${m.content ?? ""}\n`,
      );
      fs.writeFileSync(path.join(dir, `session-${short(s.id)}.md`), head.concat(body).join("\n"));
      sessionLines.push(
        `| ${short(s.id)} | ${s.persona_slug} | ${iso(s.started_at)} | ${iso(sessionEnd(s))} | ${s.status} | ${msgs.length} | ${s.coins_charged} | ${endsOnQuestion} | ${rel.join("; ") || ""} |`,
      );
    }

    const buyerExposures = exposures.filter((e) => e.subject_id === buyer.user_id);
    fs.writeFileSync(
      path.join(dir, "buyer.md"),
      [
        `# Buyer ${tag}`,
        ``,
        `- email: ${buyer.email}  first_name: ${buyer.first_name ?? ""}`,
        `- user_id: ${buyer.user_id}  signup_funnel: ${buyer.signup_funnel ?? ""}  registered: ${iso(buyer.user_created_at)}`,
        `- coin_balance now: ${buyer.coin_balance_now}`,
        ``,
        `## Purchases in window`,
        ...buyer.purchases.map(
          (p: any) =>
            `- ${iso(p.created_at)} — ${p.package_type} — ${p.coins_purchased}+${p.bonus_coins} coins — $${(p.price_usd / 100).toFixed(2)} — persona: ${p.persona_slug ?? "?"} — ${p.via_paypal ? "paypal" : "stripe"}\n  pre-session: ${p._pre_session_id ? `${short(p._pre_session_id)} (${p._pre_gap_min}m before)` : "NONE"}  during: ${p._during_session_id ? short(p._during_session_id) : "-"}  post-session: ${p._post_session_id ? `${short(p._post_session_id)} (${p._post_gap_min}m after)` : "NONE"}`,
        ),
        ``,
        `## Prompt-B exposures (${EXPERIMENT_KEY})`,
        buyerExposures.length
          ? buyerExposures.map((e) => `- ${iso(e.created_at)} variant=${e.variant} surface=${e.surface ?? ""}`).join("\n")
          : `- NONE RECORDED`,
        ``,
        `## Sessions pulled (${LOOKBACK_HOURS}h lookback window)`,
        `| session | persona | started | last activity | status | msgs | coins | ends-on-? | purchase relation |`,
        `|---|---|---|---|---|---|---|---|---|`,
        ...sessionLines,
        ``,
      ].join("\n"),
    );

    for (const p of buyer.purchases) {
      summaryLines.push(
        `| ${tag} | ${iso(p.created_at)} | ${p.package_type} | $${(p.price_usd / 100).toFixed(2)} | ${p.persona_slug ?? "?"} | ${p._pre_session_id ? `${p._pre_gap_min}m` : p._during_session_id ? "DURING" : "none"} | ${p._post_session_id ? `${p._post_gap_min}m` : "none"} | ${buyerExposures.some((e) => e.variant === "B") ? "B" : buyerExposures.map((e) => e.variant).join(",") || "no exposure"} |`,
      );
    }
  }

  // ---------- 4. Raw JSON + index ----------
  jsonOut("00-run-meta.json", {
    ran_at: new Date().toISOString(),
    db: redactedHost,
    db_now_utc: iso(dbNow),
    canary,
    window_utc: { from: naive(windowFrom), to: naive(windowTo) },
    lookback_hours: LOOKBACK_HOURS,
    experiment: experiment && {
      ...experiment,
      started_at: iso(experiment.started_at),
      ended_at: iso(experiment.ended_at),
    },
    counts: {
      purchases: purchases.length,
      buyers: buyers.size,
      sessions: sessions.length,
      messages: messages.length,
      exposures: exposures.length,
    },
    revenue_usd: purchases.reduce((a, p) => a + p.price_usd, 0) / 100,
  });
  jsonOut("01-purchases.json", purchases);
  jsonOut("02-sessions.json", sessions);
  jsonOut("03-exposures.json", exposures);

  fs.writeFileSync(
    path.join(outDir, "INDEX.md"),
    [
      `# Purchase pull — ${naive(windowFrom)} → ${naive(windowTo)} UTC`,
      ``,
      `- Canary: ${canary}`,
      `- Experiment ${EXPERIMENT_KEY}: status=${experiment?.status} flip(started_at)=${iso(flipAt)}`,
      `- Purchases: ${purchases.length} · Buyers: ${buyers.size} · Revenue: $${(purchases.reduce((a, p) => a + p.price_usd, 0) / 100).toFixed(2)}`,
      ``,
      `| buyer | purchased at (UTC) | package | price | persona | pre-session gap | post-session gap | exposure |`,
      `|---|---|---|---|---|---|---|---|`,
      ...summaryLines,
      ``,
      `Full transcripts under buyers/<tag>/session-*.md — PII, never commit.`,
    ].join("\n"),
  );

  console.log(`\nWrote ${outDir}`);
  console.log(`  purchases=${purchases.length} buyers=${buyers.size} sessions=${sessions.length} messages=${messages.length}`);
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});
