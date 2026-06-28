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
// Phase 3 — created/edited/lifecycled via the write API in the tests themselves.
const KEY3 = `e2e_p3_${STAMP}`;
// Renamed arms (control/treatment) — proves stats generalize past literal A/B.
const KEY4 = `e2e_p3_named_${STAMP}`;
const ADMIN_EMAIL = `e2e-dash-admin-${STAMP}@test.invalid`;
const ADMIN_PW = "DashAdmin123!";
const T0 = new Date("2026-06-20T00:00:00.000Z");
// Far-future cohort start for the U1 conversations scenario, so the global
// conversations tally (no key filter) sees ONLY our seeded rows, not real funnel
// traffic since T0.
const U1_T0 = new Date("2099-06-20T00:00:00.000Z");
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

  // Third experiment — arms named control/treatment (not A/B), running, started at T0.
  await pool.query(
    `INSERT INTO experiments (key, name, status, subject_type, variants, scope, conversion, started_at)
     VALUES ($1, $2, 'running', 'user', $3::jsonb, $4::jsonb, $5::jsonb, $6)`,
    [
      KEY4,
      `E2E Named ${STAMP}`,
      JSON.stringify([{ key: "control", weight: 50 }, { key: "treatment", weight: 50 }]),
      JSON.stringify({ personaId: evelynId }),
      JSON.stringify({ type: "credit_purchase", windowDays: 7 }),
      T0.toISOString(),
    ],
  );
  await Promise.all(
    ([[u1, "control"], [u3, "treatment"]] as const).map(([uid, variant]) =>
      pool.query(
        `INSERT INTO experiment_exposures (experiment_key, subject_id, variant, surface, context, created_at)
         VALUES ($1, $2, $3, 'credits_page', $4::jsonb, $5)`,
        [KEY4, uid, variant, ctx, T0.toISOString()],
      ),
    ),
  );

  // Phase 3b — U1 (Upsell-1) price test measures from the EXPOSURE LOG joined to
  // conversations (arm = exposure.variant, not the stored price). Seed exposures
  // for the real `u1_price_2026` key, each linked to a conversation:
  //   A: a0 buyer($47), a1 non-buyer.  B: b2 buyer($37), b3 non-buyer.
  //   b4 has an exposure but its conversation never reached the offer (excluded).
  const mkConv = async (i: number, offered: boolean, purchased: boolean, amount: number | null) => {
    const r = await pool.query(
      `INSERT INTO conversations (email, first_name, upsell_offered, upsell_purchased, upsell_amount, created_at)
       VALUES ($1, 'U1', $2, $3, $4, $5) RETURNING id`,
      [`u1c-${STAMP}-${i}@test.invalid`, offered, purchased, amount, U1_T0.toISOString()],
    );
    return r.rows[0].id as string;
  };
  const mkExp = (subj: number, variant: string, convId: string) =>
    pool.query(
      `INSERT INTO experiment_exposures (experiment_key, subject_id, variant, surface, context, created_at)
       VALUES ('u1_price_2026', $1, $2, 'upsell1_assigned', $3::jsonb, $4)`,
      [`u1sub-${STAMP}-${subj}`, variant, JSON.stringify({ conversationId: convId }), U1_T0.toISOString()],
    );
  const [a0, a1, b2, b3, b4] = await Promise.all([
    mkConv(0, true, true, 4700),
    mkConv(1, true, false, null),
    mkConv(2, true, true, 3700),
    mkConv(3, true, false, null),
    mkConv(4, false, false, null),
  ]);
  await Promise.all([
    mkExp(0, 'A', a0),
    mkExp(1, 'A', a1),
    mkExp(2, 'B', b2),
    mkExp(3, 'B', b3),
    mkExp(4, 'B', b4),
  ]);

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
  await pool.query(`DELETE FROM experiment_exposures WHERE experiment_key = ANY($1)`, [[KEY, KEY2, KEY3, KEY4]]);
  await pool.query(`DELETE FROM experiments WHERE key = ANY($1)`, [[KEY, KEY2, KEY3, KEY4]]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1)`, [userIds]);
  // The regular user registered via /api/auth/register isn't in userIds — clean by email.
  await pool.query(`DELETE FROM users WHERE email LIKE $1`, [`e2e-dash-user-${STAMP}@test.invalid`]);
  await pool.query(`DELETE FROM admin_users WHERE id = $1`, [adminId]);
  await pool.query(`DELETE FROM experiment_exposures WHERE subject_id LIKE $1`, [`u1sub-${STAMP}-%`]);
  await pool.query(`DELETE FROM conversations WHERE email LIKE $1`, [`u1c-${STAMP}-%@test.invalid`]);
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

// ── Phase 3 — self-serve write paths ─────────────────────────────────────────

const adminHeaders = () => ({ Authorization: `Bearer ${adminToken}` });
const validBody = {
  key: KEY3,
  name: "P3 lifecycle test",
  subjectType: "user",
  variants: [
    { key: "A", weight: 50, payload: {} },
    { key: "B", weight: 50, payload: { mainCents: 4700 } },
  ],
  scope: { personaId: "" }, // filled per-test
  conversion: { type: "credit_purchase", windowDays: 7 },
};

test("POST creates a draft; bad input is rejected (400/409)", async ({ request }) => {
  // Valid create → 201 draft.
  const ok = await request.post("/api/admin/experiments", {
    headers: adminHeaders(),
    data: { ...validBody, scope: null },
  });
  expect(ok.status()).toBe(201);
  expect((await ok.json()).experiment.status).toBe("draft");

  // Duplicate key → 409.
  const dup = await request.post("/api/admin/experiments", {
    headers: adminHeaders(),
    data: { ...validBody, scope: null },
  });
  expect(dup.status()).toBe(409);

  // Only one variant → 400.
  const oneArm = await request.post("/api/admin/experiments", {
    headers: adminHeaders(),
    data: { ...validBody, key: `${KEY3}_x`, variants: [{ key: "A", weight: 100 }] },
  });
  expect(oneArm.status()).toBe(400);

  // All-zero weights → 400.
  const zero = await request.post("/api/admin/experiments", {
    headers: adminHeaders(),
    data: {
      ...validBody,
      key: `${KEY3}_z`,
      variants: [
        { key: "A", weight: 0 },
        { key: "B", weight: 0 },
      ],
    },
  });
  expect(zero.status()).toBe(400);

  // Bad key slug → 400.
  const badKey = await request.post("/api/admin/experiments", {
    headers: adminHeaders(),
    data: { ...validBody, key: "Not A Slug!" },
  });
  expect(badKey.status()).toBe(400);
});

test("lifecycle: start → pause → declare-winner transitions", async ({ request }) => {
  // declare-winner on a draft that never ran → 409.
  const draftWin = await request.post(`/api/admin/experiments/${KEY3}/declare-winner`, {
    headers: adminHeaders(),
    data: { variant: "B" },
  });
  expect(draftWin.status()).toBe(409);

  // start: draft → running, sets started_at.
  const started = await request.post(`/api/admin/experiments/${KEY3}/start`, { headers: adminHeaders() });
  expect(started.status()).toBe(200);
  const startedExp = (await started.json()).experiment;
  expect(startedExp.status).toBe("running");
  expect(startedExp.startedAt).toBeTruthy();

  // ASSIGNMENT FREEZE once started: renaming, re-weighting, or re-scoping a running
  // test is rejected (would re-bucket enrolled users) — 409.
  const rename = await request.patch(`/api/admin/experiments/${KEY3}`, {
    headers: adminHeaders(),
    data: { variants: [{ key: "A", weight: 50 }, { key: "C", weight: 50 }] },
  });
  expect(rename.status()).toBe(409);
  const reweight = await request.patch(`/api/admin/experiments/${KEY3}`, {
    headers: adminHeaders(),
    data: { variants: [{ key: "A", weight: 20 }, { key: "B", weight: 80 }] },
  });
  expect(reweight.status()).toBe(409);

  // but name/description ARE editable while running → 200.
  const rename2 = await request.patch(`/api/admin/experiments/${KEY3}`, {
    headers: adminHeaders(),
    data: { name: "P3 lifecycle (renamed)" },
  });
  expect(rename2.status()).toBe(200);
  expect((await rename2.json()).experiment.name).toBe("P3 lifecycle (renamed)");

  // pause: running → paused.
  const paused = await request.post(`/api/admin/experiments/${KEY3}/pause`, { headers: adminHeaders() });
  expect(paused.status()).toBe(200);
  expect((await paused.json()).experiment.status).toBe("paused");

  // declare-winner with an unknown variant → 400.
  const badWin = await request.post(`/api/admin/experiments/${KEY3}/declare-winner`, {
    headers: adminHeaders(),
    data: { variant: "Z" },
  });
  expect(badWin.status()).toBe(400);

  // declare-winner B → done + winner set.
  const win = await request.post(`/api/admin/experiments/${KEY3}/declare-winner`, {
    headers: adminHeaders(),
    data: { variant: "B" },
  });
  expect(win.status()).toBe(200);
  const done = (await win.json()).experiment;
  expect(done.status).toBe("done");
  expect(done.winnerVariant).toBe("B");

  // a concluded test cannot be restarted → 409.
  const restart = await request.post(`/api/admin/experiments/${KEY3}/start`, { headers: adminHeaders() });
  expect(restart.status()).toBe(409);
});

test("stats generalize past A/B — control/treatment arms get lift + SRM + significance", async ({
  request,
}) => {
  const res = await request.get(`/api/admin/experiments/${KEY4}/results`, {
    headers: adminHeaders(),
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const byVariant = Object.fromEntries(body.rows.map((r: any) => [r.variant, r]));
  // control = first arm (lift null); treatment gets a server-computed lift vs control.
  expect(byVariant.control.liftPct).toBeNull();
  expect(typeof byVariant.treatment.liftPct).toBe("number");
  expect(body.srm).toBeTruthy();
  expect(body.srm.expectedBSharePct).toBe(50);
  expect(body.significance).toBeTruthy(); // computed despite non-A/B keys
});

test("U1 price test results tally from the conversations funnel (upsell1_funnel)", async ({
  request,
}) => {
  // Draft experiment + ?start override lets us preview results over seeded data.
  const res = await request.get(
    `/api/admin/experiments/u1_price_2026/results?start=${encodeURIComponent(U1_T0.toISOString())}`,
    { headers: adminHeaders() },
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.started).toBe(true);
  const byVariant = Object.fromEntries(body.rows.map((r: any) => [r.variant, r]));
  // A ($47): u1c-0 buyer, u1c-1 non-buyer.  B ($37): u1c-2 buyer, u1c-3 non-buyer.
  // u1c-4 (not offered) is excluded from the denominator.
  expect(byVariant.A).toMatchObject({ viewers: 2, buyers: 1, conversionPct: 50, revenueUsd: 47 });
  expect(byVariant.B).toMatchObject({ viewers: 2, buyers: 1, conversionPct: 50, revenueUsd: 37 });
});

test("upsell1_funnel guards: only u1_price_2026 key, and arms need a valid price", async ({
  request,
}) => {
  // A second upsell1_funnel under a different key would be inert → rejected (400).
  const wrongKey = await request.post("/api/admin/experiments", {
    headers: adminHeaders(),
    data: {
      key: `${KEY3}_u1`,
      name: "inert u1",
      subjectType: "email",
      variants: [
        { key: "A", weight: 50, payload: { upsell1Cents: 4700 } },
        { key: "B", weight: 50, payload: { upsell1Cents: 3700 } },
      ],
      scope: null,
      conversion: { type: "upsell1_funnel" },
    },
  });
  expect(wrongKey.status()).toBe(400);

  // Editing the real (draft) u1_price_2026 with an arm missing upsell1Cents → 400,
  // so a payload typo can't silently charge the legacy $47. (400 ⇒ no mutation.)
  const badPayload = await request.patch("/api/admin/experiments/u1_price_2026", {
    headers: adminHeaders(),
    data: {
      variants: [
        { key: "A", weight: 50, payload: { upsell1Cents: 4700 } },
        { key: "B", weight: 50, payload: {} },
      ],
    },
  });
  expect(badPayload.status()).toBe(400);
});

test("write paths are admin-only (401 no token, 403 regular user)", async ({ request }) => {
  const noAuth = await request.post("/api/admin/experiments", { data: { ...validBody, key: `${KEY3}_na` } });
  expect(noAuth.status()).toBe(401);
  const asUser = await request.post("/api/admin/experiments", {
    headers: { Authorization: `Bearer ${userToken}` },
    data: { ...validBody, key: `${KEY3}_u` },
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
