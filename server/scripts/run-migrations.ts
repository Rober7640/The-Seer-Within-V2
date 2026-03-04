// Migration runner for persona safety, intent & follow-up tables
// Run with: npx tsx server/scripts/run-migrations.ts [up|down] [migration_number]
//
// Examples:
//   npx tsx server/scripts/run-migrations.ts up        -- Run all pending migrations
//   npx tsx server/scripts/run-migrations.ts down 003   -- Rollback migration 003
//   npx tsx server/scripts/run-migrations.ts down all   -- Rollback all migrations (reverse order)

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");

const MIGRATION_FILES = [
  "001_safety_violations",
  "002_intent_tables",
  "003_follow_up_tables",
  "004_email_verification",
  "005_fraud_tracking",
  "006_session_recovery",
  "007_account_suspension",
  "007_session_timeout",
  "008_password_reset",
  "009_coins_system",
  "011_persona_availability",
];

async function getPool(): Promise<pg.Pool> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

async function ensureMigrationTable(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool: pg.Pool): Promise<Set<string>> {
  const result = await pool.query("SELECT name FROM _migrations ORDER BY id");
  return new Set(result.rows.map((r: { name: string }) => r.name));
}

async function runUp(pool: pg.Pool, migrationName?: string): Promise<void> {
  await ensureMigrationTable(pool);
  const applied = await getAppliedMigrations(pool);

  const toRun = migrationName
    ? MIGRATION_FILES.filter((f) => f === migrationName)
    : MIGRATION_FILES;

  if (toRun.length === 0) {
    console.log("No matching migration found.");
    return;
  }

  let ranCount = 0;
  for (const name of toRun) {
    if (applied.has(name)) {
      console.log(`  SKIP  ${name} (already applied)`);
      continue;
    }

    const sqlPath = path.join(MIGRATIONS_DIR, `${name}.sql`);
    if (!fs.existsSync(sqlPath)) {
      console.error(`  ERROR ${name}: SQL file not found at ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");
    console.log(`  RUN   ${name}...`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(`  OK    ${name}`);
      ranCount++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  FAIL  ${name}:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  if (ranCount === 0) {
    console.log("All migrations already applied.");
  } else {
    console.log(`\nApplied ${ranCount} migration(s).`);
  }
}

async function runDown(pool: pg.Pool, target: string): Promise<void> {
  await ensureMigrationTable(pool);
  const applied = await getAppliedMigrations(pool);

  const toRollback =
    target === "all"
      ? [...MIGRATION_FILES].reverse().filter((f) => applied.has(f))
      : MIGRATION_FILES.filter((f) => f === target && applied.has(f));

  if (toRollback.length === 0) {
    console.log("No matching applied migration to rollback.");
    return;
  }

  for (const name of toRollback) {
    const sqlPath = path.join(MIGRATIONS_DIR, `${name}_down.sql`);
    if (!fs.existsSync(sqlPath)) {
      console.error(`  ERROR ${name}: Rollback SQL file not found at ${sqlPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");
    console.log(`  DOWN  ${name}...`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("DELETE FROM _migrations WHERE name = $1", [name]);
      await client.query("COMMIT");
      console.log(`  OK    ${name} rolled back`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  FAIL  ${name} rollback:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log(`\nRolled back ${toRollback.length} migration(s).`);
}

async function main() {
  const [direction, target] = process.argv.slice(2);

  if (!direction || !["up", "down"].includes(direction)) {
    console.log("Usage: npx tsx server/scripts/run-migrations.ts [up|down] [migration_name|all]");
    console.log("");
    console.log("  up              Run all pending migrations");
    console.log("  up <name>       Run a specific migration");
    console.log("  down <name>     Rollback a specific migration");
    console.log("  down all        Rollback all migrations (reverse order)");
    console.log("");
    console.log("Available migrations:");
    for (const f of MIGRATION_FILES) {
      console.log(`  ${f}`);
    }
    process.exit(0);
  }

  const pool = await getPool();

  try {
    if (direction === "up") {
      console.log("Running migrations UP...\n");
      await runUp(pool, target);
    } else if (direction === "down") {
      if (!target) {
        console.error("Please specify a migration name or 'all' for rollback.");
        process.exit(1);
      }
      console.log("Running migrations DOWN...\n");
      await runDown(pool, target);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
