import "dotenv/config"; // load DATABASE_URL for the seeding pool
import { test, expect } from "@playwright/test";
import pg from "pg";
import bcrypt from "bcrypt";

// Phase 4a — page-copy A/B for anonymous visitors on the unified framework.
// Visitor = ab_vid cookie; assignment + exposure logging + event conversions go
// through /api/ab. Seeds an isolated RUNNING visitor experiment (its route is not
// a real lander, so no live traffic is touched) and cleans up afterward.

const STAMP = Date.now();
const KEY = `cp_test_${STAMP}`;
const ROUTE = `cp_route_${STAMP}`;
const KEY_M = `cp_results_${STAMP}`; // directly-seeded scenario for the tally test
const T0 = new Date("2099-06-20T00:00:00.000Z");
const ADMIN_EMAIL = `cp-admin-${STAMP}@test.invalid`;
const ADMIN_PW = "CpAdmin123!";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let adminId = "";
let adminToken = "";

test.beforeAll(async ({ playwright }) => {
  const mkExp = (key: string, route: string) =>
    pool.query(
      `INSERT INTO experiments (key, name, status, subject_type, variants, scope, conversion, started_at)
       VALUES ($1, $2, 'running', 'visitor', $3::jsonb, $4::jsonb, $5::jsonb, $6)`,
      [
        key,
        `page-copy ${key}`,
        JSON.stringify([
          { key: "A", weight: 50, payload: { value: "Old CTA" } },
          { key: "B", weight: 50, payload: { value: "New CTA" } },
        ]),
        JSON.stringify({ route, element: "cta" }),
        JSON.stringify({ type: "event", name: "lander_cta" }),
        T0.toISOString(),
      ],
    );
  await mkExp(KEY, ROUTE);
  await mkExp(KEY_M, `${ROUTE}_m`);

  // Directly-seeded measurement scenario for KEY_M: A 2 exposed/1 converted,
  // B 2 exposed/2 converted.
  const ex = (subj: string, variant: string) =>
    pool.query(
      `INSERT INTO experiment_exposures (experiment_key, subject_id, variant, surface, context, created_at)
       VALUES ($1, $2, $3, 'lander', $4::jsonb, $5)`,
      [KEY_M, subj, variant, JSON.stringify({ route: `${ROUTE}_m`, element: "cta" }), T0.toISOString()],
    );
  const cv = (subj: string, variant: string) =>
    pool.query(
      `INSERT INTO experiment_conversions (experiment_key, subject_id, variant, event, value, created_at)
       VALUES ($1, $2, $3, 'lander_cta', 0, $4)`,
      [KEY_M, subj, variant, T0.toISOString()],
    );
  await Promise.all([
    ex("m-a1", "A"), ex("m-a2", "A"), ex("m-b1", "B"), ex("m-b2", "B"),
  ]);
  await Promise.all([cv("m-a1", "A"), cv("m-b1", "B"), cv("m-b2", "B")]);

  // Admin token for the results endpoint.
  const ar = await pool.query(
    `INSERT INTO admin_users (email, password_hash, role, display_name)
     VALUES ($1, $2, 'super_admin', 'CP Admin') RETURNING id`,
    [ADMIN_EMAIL, await bcrypt.hash(ADMIN_PW, 10)],
  );
  adminId = ar.rows[0].id;
  const api = await playwright.request.newContext({ baseURL: "http://localhost:5000" });
  const login = await api.post("/api/admin/login", { data: { email: ADMIN_EMAIL, password: ADMIN_PW } });
  adminToken = (await login.json()).token;
  await api.dispose();
});

test.afterAll(async () => {
  await pool.query(`DELETE FROM experiment_conversions WHERE experiment_key = ANY($1)`, [[KEY, KEY_M]]);
  await pool.query(`DELETE FROM experiment_exposures WHERE experiment_key = ANY($1)`, [[KEY, KEY_M]]);
  await pool.query(`DELETE FROM experiments WHERE key = ANY($1)`, [[KEY, KEY_M]]);
  await pool.query(`DELETE FROM admin_users WHERE id = $1`, [adminId]);
  await pool.end();
});

test("assign is sticky per visitor, returns the arm's copy, logs one exposure", async ({ request }) => {
  const get = (vid: string) =>
    request.get(`/api/ab/assign?page=${ROUTE}`, { headers: { Cookie: `ab_vid=${vid}` } });

  const r1 = await get("vis-1");
  expect(r1.ok()).toBeTruthy();
  const a1 = (await r1.json()).assignments.cta;
  expect(["A", "B"]).toContain(a1.variantId);
  expect(a1.value).toBe(a1.variantId === "B" ? "New CTA" : "Old CTA");

  // Sticky: same visitor → same variant.
  const a2 = (await (await get("vis-1")).json()).assignments.cta;
  expect(a2.variantId).toBe(a1.variantId);

  // Exactly one exposure row for this visitor.
  const ex = await pool.query(
    `SELECT count(*)::int n, max(variant) v FROM experiment_exposures WHERE experiment_key=$1 AND subject_id='vis-1'`,
    [KEY],
  );
  expect(ex.rows[0].n).toBe(1);
  expect(ex.rows[0].v).toBe(a1.variantId);
});

test("convert logs one conversion, idempotent, only for an assigned visitor", async ({ request }) => {
  // Assign first, then convert.
  await request.get(`/api/ab/assign?page=${ROUTE}`, { headers: { Cookie: `ab_vid=vis-conv` } });
  const c1 = await request.post("/api/ab/convert", {
    headers: { Cookie: `ab_vid=vis-conv` },
    data: { page: ROUTE },
  });
  expect(c1.ok()).toBeTruthy();
  // Second convert is a no-op (one per visitor per test).
  await request.post("/api/ab/convert", { headers: { Cookie: `ab_vid=vis-conv` }, data: { page: ROUTE } });
  const conv = await pool.query(
    `SELECT count(*)::int n FROM experiment_conversions WHERE experiment_key=$1 AND subject_id='vis-conv'`,
    [KEY],
  );
  expect(conv.rows[0].n).toBe(1);

  // A visitor who was never assigned can't convert.
  await request.post("/api/ab/convert", { headers: { Cookie: `ab_vid=never-seen` }, data: { page: ROUTE } });
  const none = await pool.query(
    `SELECT count(*)::int n FROM experiment_conversions WHERE experiment_key=$1 AND subject_id='never-seen'`,
    [KEY],
  );
  expect(none.rows[0].n).toBe(0);
});

test("event results tally from exposures ⋈ conversions (admin)", async ({ request }) => {
  const res = await request.get(
    `/api/admin/experiments/${KEY_M}/results?start=${encodeURIComponent(T0.toISOString())}`,
    { headers: { Authorization: `Bearer ${adminToken}` } },
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  const byVariant = Object.fromEntries(body.rows.map((r: any) => [r.variant, r]));
  // A: 2 exposed, 1 converted (50%). B: 2 exposed, 2 converted (100%).
  expect(byVariant.A).toMatchObject({ viewers: 2, buyers: 1, conversionPct: 50 });
  expect(byVariant.B).toMatchObject({ viewers: 2, buyers: 2, conversionPct: 100 });
});

test("OFF: a draft visitor test yields no assignment (lander keeps default copy)", async ({ request }) => {
  // The seeded soulmate_landing_cta_2026 ships draft → /assign returns nothing.
  const res = await request.get(`/api/ab/assign?page=soulmate_landing`, {
    headers: { Cookie: `ab_vid=off-check` },
  });
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).assignments).toEqual({});
});

test("DONE + winner: /assign serves the winner's copy to every visitor", async ({ request }) => {
  // Declare winner B via the admin endpoint (sets done + winner + invalidates the
  // assign() cache); assign() then rolls B out → all visitors get 'New CTA'.
  const dec = await request.post(`/api/admin/experiments/${KEY}/declare-winner`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { variant: "B" },
  });
  expect(dec.ok()).toBeTruthy();
  for (const vid of ["win-1", "win-2", "win-3"]) {
    const a = (await (await request.get(`/api/ab/assign?page=${ROUTE}`, {
      headers: { Cookie: `ab_vid=${vid}` },
    })).json()).assignments.cta;
    expect(a.variantId).toBe("B");
    expect(a.value).toBe("New CTA");
  }
});
