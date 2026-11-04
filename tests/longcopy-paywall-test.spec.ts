// Long-copy + bonus-pack paywall test ("updated test 1", Evelyn-only).
//
// These run the experiment ON (beforeAll sets status='running', afterAll resets to
// 'draft') and prove, at the API that drives the money:
//   • an ENROLLED first-timer gets the 3-pack ladder with $20 FLAT and no $100
//   • an ENROLLED repeat buyer gets the 5-pack ladder incl. the $100 pack (70 min)
//   • a CONTROL-arm user is untouched (default 4 packs, no longCopyTest descriptor)
//   • an enrolled custom top-up is STORED with the honest bonus (credited = shown)
//
// Serial suite (workers:1, fullyParallel:false), so flipping the shared experiment
// never races another spec. afterAll always restores 'draft'.

import { test, expect, type Page } from "@playwright/test";
import pg from "pg";

const KEY = "improve_v2_paywall_2026";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function setStatus(status: "running" | "draft") {
  await pool.query(`UPDATE experiments SET status = $1 WHERE key = $2`, [status, KEY]);
}

async function evelynId(page: Page): Promise<string> {
  const personas = await (await page.request.get("/api/personas")).json();
  const list = Array.isArray(personas) ? personas : personas.personas;
  return list.find((p: any) => p.slug === "evelyn-cross").id;
}

async function register(page: Page): Promise<string> {
  const email = `lc-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const reg = await page.request.post("/api/auth/register", {
    data: { email, password: "TestPass123!", firstName: "LC" },
  });
  expect(reg.ok(), "registration should succeed").toBeTruthy();
  return (await reg.json()).token as string;
}

function userIdFromToken(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
  return payload.userId;
}

async function makeRepeatBuyer(userId: string) {
  await pool.query(
    `INSERT INTO credit_purchases (user_id, package_type, coins_purchased, bonus_coins, price_usd, status)
     VALUES ($1, 'popular', 1000, 0, 1000, 'completed')`,
    [userId],
  );
}

async function pricing(page: Page, token: string, ev: string) {
  const res = await page.request.get(`/api/credits/pricing?personaId=${ev}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/** Register fresh users until one lands in the enrolled (test) arm. */
async function registerEnrolled(page: Page, ev: string): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const token = await register(page);
    const p = await pricing(page, token, ev);
    if (p.longCopyTest?.active) return token;
  }
  throw new Error("no user landed in the test arm after 25 tries");
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // Ensure the experiment row exists (seed is idempotent elsewhere; guard CI), then run it.
  const ev = (await pool.query(`SELECT id FROM personas WHERE slug = 'evelyn-cross' LIMIT 1`)).rows[0]?.id ?? null;
  await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ($1, 'Improve V2 paywall (test spec)', 'long-copy test', 'draft', 'user',
       $2::jsonb, $3::jsonb, $4::jsonb)
     ON CONFLICT (key) DO NOTHING`,
    [
      KEY,
      JSON.stringify([{ key: "A", weight: 50, payload: {} }, { key: "B", weight: 50, payload: {} }]),
      JSON.stringify({ personaId: ev, freezeAssignment: true }),
      JSON.stringify({ type: "credit_purchase", windowDays: 7 }),
    ],
  );
  await setStatus("running");
});

test.afterAll(async () => {
  await setStatus("draft");
  await pool.end();
});

test("ON: an enrolled FIRST-TIMER gets the 3-pack ladder — $20 flat, no $100", async ({ page }) => {
  const ev = await evelynId(page);
  const token = await registerEnrolled(page, ev);
  const p = await pricing(page, token, ev);

  expect(p.longCopyTest).toMatchObject({ active: true, mode: "first_timer" });
  const types = p.tiers.map((t: any) => t.packageType);
  expect(types).toEqual(["popular", "best_value", "premium"]); // 3 packs, no $50/$100
  const byType = Object.fromEntries(p.tiers.map((t: any) => [t.packageType, t]));
  expect(byType.best_value.totalCoins).toBe(2000); // $20 FLAT (no bonus)
  expect(byType.premium.totalCoins).toBe(4495); // $30 test value (incl. +5 free)
  expect(types).not.toContain("whale_100");
});

test("ON: an enrolled REPEAT buyer gets the 5-pack ladder incl. the $100 pack (70 min)", async ({ page }) => {
  const ev = await evelynId(page);
  const token = await registerEnrolled(page, ev);
  await makeRepeatBuyer(userIdFromToken(token));

  const p = await pricing(page, token, ev);
  expect(p.longCopyTest).toMatchObject({ active: true, mode: "repeat" });
  const byType = Object.fromEntries(p.tiers.map((t: any) => [t.packageType, t]));
  expect(byType.whale_100).toBeTruthy();
  expect(byType.whale_100.totalCoins).toBe(20930); // $100 = 70:00 exactly
});

test("ON: a CONTROL-arm user is untouched — default 4 packs, no descriptor", async ({ page }) => {
  const ev = await evelynId(page);
  // Find a control-arm user (not enrolled).
  let token = "";
  for (let i = 0; i < 25; i++) {
    const t = await register(page);
    const p = await pricing(page, t, ev);
    if (!p.longCopyTest) { token = t; break; }
  }
  expect(token, "should find a control-arm user").toBeTruthy();
  const p = await pricing(page, token, ev);
  expect(p.longCopyTest ?? null).toBeNull();
  const types = p.tiers.map((t: any) => t.packageType);
  expect(types).toEqual(["popular", "best_value", "premium", "whale"]); // today's 4 packs
  expect(types).not.toContain("whale_100");
});

test("ON: an enrolled CUSTOM $60 is stored with the honest bonus (6000 + 4764 = 36 min)", async ({ page }) => {
  // quoteCustomAmount prices every custom amount against the full 5-pack ladder, so
  // $60 gets the $50-pack rate whether the buyer is a first-timer or repeat.
  const ev = await evelynId(page);
  const token = await registerEnrolled(page, ev);
  const uid = userIdFromToken(token);

  const res = await page.request.post("/api/credits/create-payment-intent", {
    headers: { Authorization: `Bearer ${token}` },
    data: { packageType: "custom", customAmountUsd: 6000, personaId: ev },
  });
  expect(res.ok(), "create-payment-intent should succeed").toBeTruthy();

  const row = (await pool.query(
    `SELECT coins_purchased, bonus_coins FROM credit_purchases
     WHERE user_id = $1 AND package_type = 'custom' ORDER BY created_at DESC LIMIT 1`,
    [uid],
  )).rows[0];
  expect(Number(row.coins_purchased)).toBe(6000);
  expect(Number(row.bonus_coins)).toBe(4764); // total 10764 = exactly 36.0 min
});
