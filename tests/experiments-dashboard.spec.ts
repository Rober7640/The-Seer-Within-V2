import "dotenv/config"; // load DATABASE_URL for the seeding pool
import { test, expect } from "@playwright/test";
import pg from "pg";
import bcrypt from "bcrypt";

// Phase 2 — read-only /admin/experiments dashboard. Seeds an isolated RUNNING
// experiment + exposures + purchases (raw SQL) and a temp admin, then asserts:
//  (1) GET /api/admin/experiments lists it,
//  (2) GET .../:key/results returns the exact per-arm numbers (DB-sourced),
//  (3) auth gating — no token => 401, regular-user token => 403,
//  (4) the page renders the seeded numbers for a logged-in admin.
// Everything is cleaned up afterwards.

const STAMP = Date.now();
const KEY = `e2e_dash_${STAMP}`;
const NAME = `E2E Dash Test ${STAMP}`;
// Second experiment: RUNNING but with NO started_at — the cohort start must
// fall back to the first logged exposure (review finding #1).
const KEY2 = `e2e_dash_nostart_${STAMP}`;
const ADMIN_EMAIL = `e2e-dash-admin-${STAMP}@test.invalid`;
const ADMIN_PW = "DashAdmin123!";
const T0 = new Date("2026-06-20T00:00:00.000Z");
const dayMs = 86_400_000;
const iso = (ms: number) => new Date(T0.getTime() + ms).toISOString();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

let evelynId = "";
let userIds: string[] = [];
let adminId = "";
let adminToken = "";
let userToken = "";

test.beforeAll(async ({ playwright }) => {
  // Personas (Evelyn = the scope).
  const ev = await pool.query(`SELECT id FROM personas WHERE slug = 'evelyn-cross' LIMIT 1`);
  evelynId = ev.rows[0]?.id;
  if (!evelynId) throw new Error("evelyn-cross persona not seeded");

  // 4 temp users: u1 A buyer, u2 A non-buyer, u3 B buyer, u4 B buyer OUTSIDE window.
  for (let i = 0; i < 4; i++) {
    const r = await pool.query(
      `INSERT INTO users (email, first_name) VALUES ($1, $2) RETURNING id`,
      [`e2e-dash-${STAMP}-${i}@test.invalid`, `Dash${i}`],
    );
    userIds.push(r.rows[0].id);
  }
  const [u1, u2, u3, u4] = userIds;

  // Temp admin (bcrypt hash matches the app's verifyPassword).
  const hash = await bcrypt.hash(ADMIN_PW, 10);
  const ar = await pool.query(
    `INSERT INTO admin_users (email, password_hash, role, display_name)
     VALUES ($1, $2, 'super_admin', 'E2E Dash Admin') RETURNING id`,
    [ADMIN_EMAIL, hash],
  );
  adminId = ar.rows[0].id;

  // A RUNNING experiment scoped to Evelyn, started at T0.
  await pool.query(
    `INSERT INTO experiments (key, name, status, subject_type, variants, scope, conversion, started_at)
     VALUES ($1, $2, 'running', 'user', $3::jsonb, $4::jsonb, $5::jsonb, $6)`,
    [
      KEY,
      NAME,
      JSON.stringify([{ key: "A", weight: 50 }, { key: "B", weight: 50 }]),
      JSON.stringify({ personaId: evelynId }),
      JSON.stringify({ type: "credit_purchase", windowDays: 7 }),
      T0.toISOString(),
    ],
  );

  // Exposures (all Evelyn, at T0) + purchases are independent — seed in parallel.
  // u1 (+1d) & u3 (+2d) are in-window; u4 (+10d) is OUTSIDE the 7-day window.
  const ctx = JSON.stringify({ personaId: evelynId, isOutOfCredits: false });
  const buy = (uid: string, ms: number, cents: number) =>
    pool.query(
      `INSERT INTO credit_purchases (user_id, package_type, coins_purchased, price_usd, status, created_at)
       VALUES ($1, 'popular', 600, $2, 'completed', $3)`,
      [uid, cents, iso(ms)],
    );
  await Promise.all([
    ...([[u1, "A"], [u2, "A"], [u3, "B"], [u4, "B"]] as const).map(([uid, variant]) =>
      pool.query(
        `INSERT INTO experiment_exposures (experiment_key, subject_id, variant, surface, context, created_at)
         VALUES ($1, $2, $3, 'credits_page', $4::jsonb, $5)`,
        [KEY, uid, variant, ctx, T0.toISOString()],
      ),
    ),
    buy(u1, 1 * dayMs, 1999),
    buy(u3, 2 * dayMs, 4999),
    buy(u4, 10 * dayMs, 4999),
  ]);

  // Second experiment — RUNNING, started_at = NULL — with its own exposures at T0.
  await pool.query(
    `INSERT INTO experiments (key, name, status, subject_type, variants, scope, conversion)
     VALUES ($1, $2, 'running', 'user', $3::jsonb, $4::jsonb, $5::jsonb)`,
    [
      KEY2,
      `E2E NoStart ${STAMP}`,
      JSON.stringify([{ key: "A", weight: 50 }, { key: "B", weight: 50 }]),
      JSON.stringify({ personaId: evelynId }),
      JSON.stringify({ type: "credit_purchase", windowDays: 7 }),
    ],
  );
  await Promise.all(
    ([[u1, "A"], [u3, "B"]] as const).map(([uid, variant]) =>
      pool.query(
        `INSERT INTO experiment_exposures (experiment_key, subject_id, variant, surface, context, created_at)
         VALUES ($1, $2, $3, 'credits_page', $4::jsonb, $5)`,
        [KEY2, uid, variant, ctx, T0.toISOString()],
      ),
    ),
  );

  // Tokens: admin via login, regular user via register.
  const api = await playwright.request.newContext({ baseURL: "http://localhost:5000" });
  const loginRes = await api.post("/api/admin/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PW },
  });
  if (!loginRes.ok()) throw new Error(`admin login failed: ${loginRes.status()}`);
  adminToken = (await loginRes.json()).token;

  const regRes = await api.post("/api/auth/register", {
    data: { email: `e2e-dash-user-${STAMP}@test.invalid`, password: "UserPass123!", firstName: "U" },
  });
  userToken = (await regRes.json()).token;
  await api.dispose();
});

test.afterAll(async () => {
  await pool.query(`DELETE FROM credit_purchases WHERE user_id = ANY($1)`, [userIds]);
  await pool.query(`DELETE FROM experiment_exposures WHERE experiment_key = ANY($1)`, [[KEY, KEY2]]);
  await pool.query(`DELETE FROM experiments WHERE key = ANY($1)`, [[KEY, KEY2]]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds]);
  // The regular user registered via /api/auth/register isn't in userIds — clean by email.
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`e2e-dash-user-${STAMP}@test.invalid`]);
  await pool.query(`DELETE FROM admin_users WHERE id = $1`, [adminId]);
  await pool.end();
});

test("GET /api/admin/experiments lists the experiment (admin)", async ({ request }) => {
  const res = await request.get("/api/admin/experiments", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const found = body.experiments.find((e: any) => e.key === KEY);
  expect(found).toBeTruthy();
  expect(found.status).toBe("running");
  expect(found.name).toBe(NAME);
});

test("GET .../:key/results returns the exact per-arm numbers (admin)", async ({ request }) => {
  const res = await request.get(`/api/admin/experiments/${KEY}/results`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.started).toBe(true);
  const byVariant = Object.fromEntries(body.rows.map((r: any) => [r.variant, r]));
  // A: u1,u2 exposed; u1 bought $19.99.  B: u3,u4 exposed; u3 bought $49.99 (u4 outside window).
  expect(byVariant.A).toMatchObject({ viewers: 2, buyers: 1, conversionPct: 50, revenueUsd: 19.99 });
  expect(byVariant.B).toMatchObject({ viewers: 2, buyers: 1, conversionPct: 50, revenueUsd: 49.99 });
  expect(body.srm).toBeTruthy();
  expect(body.significance).toBeTruthy();
});

test("results respects a ?windowDays override (admin)", async ({ request }) => {
  // A 3-day window still includes u1(+1d)/u3(+2d) but never u4(+10d) — B unchanged.
  const res = await request.get(`/api/admin/experiments/${KEY}/results?windowDays=3`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  expect(body.params.windowDays).toBe(3);
  const byVariant = Object.fromEntries(body.rows.map((r: any) => [r.variant, r]));
  expect(byVariant.B).toMatchObject({ viewers: 2, buyers: 1, revenueUsd: 49.99 });
});

test("running experiment with no started_at uses first exposure as the cohort start", async ({ request }) => {
  const res = await request.get(`/api/admin/experiments/${KEY2}/results`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.started).toBe(true); // NOT reported as "not started" despite null started_at
  expect(body.params.startISO).toBe(T0.toISOString()); // = MIN(exposure.created_at)
  const byVariant = Object.fromEntries(body.rows.map((r: any) => [r.variant, r]));
  expect(byVariant.A).toMatchObject({ viewers: 1, buyers: 1 });
  expect(byVariant.B).toMatchObject({ viewers: 1, buyers: 1 });
});

test("invalid ?start override returns 400, not an opaque 500", async ({ request }) => {
  const res = await request.get(`/api/admin/experiments/${KEY}/results?start=not-a-date`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  expect(res.status()).toBe(400);
});

test("SRM check compares observed split to configured weights", async ({ request }) => {
  const res = await request.get(`/api/admin/experiments/${KEY}/results`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const body = await res.json();
  // Balanced 2/2 against a 50/50 config — no mismatch.
  expect(body.srm.expectedBSharePct).toBe(50);
  expect(body.srm.ok).toBe(true);
});

test("auth gating — no token => 401, regular user => 403", async ({ request }) => {
  const noAuth = await request.get("/api/admin/experiments");
  expect(noAuth.status()).toBe(401);

  const asUser = await request.get(`/api/admin/experiments/${KEY}/results`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  expect(asUser.status()).toBe(403);
});

test("dashboard page renders the seeded experiment + results (admin)", async ({ page, context }) => {
  await context.addInitScript(
    ([k, t]) => localStorage.setItem(k as string, t as string),
    ["seer_admin_token", adminToken],
  );
  await page.goto("/admin/experiments");

  // Registry shows the running experiment.
  await expect(page.getByText(NAME)).toBeVisible();

  // Open its results and confirm the DB-sourced numbers render.
  await page.getByRole("row", { name: new RegExp(KEY) }).getByRole("button", { name: /Results/ }).click();
  await expect(page.getByText(/day attribution window/)).toBeVisible();
  await expect(page.getByText(/B share/)).toBeVisible();
  // Both arms convert at 50% on the seeded data.
  await expect(page.getByRole("cell", { name: "50%" }).first()).toBeVisible();
});
