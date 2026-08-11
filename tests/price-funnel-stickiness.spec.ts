import { test, expect } from "@playwright/test";
import pg from "pg";

// THE $57.77 CHARGE (dcwheeler51@gmail.com, 2026-08-10) — end-to-end regression.
//
// She drew the ROOT `45` arm on 2026-05-25 while the $35/$45 test was live, came
// back through /fb-tarot on 2026-08-10 — a FIXED $35 funnel that has never run a
// price test — and was quoted, and charged, that stale $45. Plus the $12.77 order
// bump: $57.77. Nine more buyers were hit the same way in the same 30 days.
//
// The unit tests (server/lib/priceVariantPool.test.ts) pin the DECISION. This pins
// the two things they cannot see: that /api/lead actually re-stamps the stored row,
// and that the amount /api/checkout hands Stripe moves with it. `main_purchase_amount`
// is written by updateStripeData from the very `priceAmount` used as the line item's
// `unit_amount`, so asserting that column IS asserting the charge.
//
//   npm run build
//   DOTENV_CONFIG_PATH=.env.bumpwalk node dist/index.cjs
//   npx playwright test --config=playwright.price-funnel-stickiness.config.ts
//
// 🔴 LOCAL DB ONLY, and the guard below enforces it. This SEEDS conversation rows
// to simulate returning visitors — running it against production would fabricate
// price history on real customers. .env.bumpwalk points at the local sandbox
// Postgres with the TEST Stripe key and every outbound integration muted.
//
// 🔴 The sandbox `v1_price_variants` row must MIRROR PRODUCTION or these assertions
// are theatre — the whole point is that the retired arms (`45`, `59`, `55-35_palm`)
// are parked at weight 0 while /fb runs a real 35/45 split. Re-sync it if prod's
// pool changes.

const DB = process.env.SANDBOX_DATABASE_URL || "postgresql://postgres@127.0.0.1:5433/seer";
const host = new URL(DB).hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  throw new Error(`price-funnel-stickiness: refusing to run against ${host} — local sandbox only`);
}

const pool = new pg.Pool({ connectionString: DB });
const STAMP = Date.now();
let seq = 0;
const emailFor = (tag: string) => `qa+price-${tag}-${STAMP}-${seq++}@example.com`;

interface Row {
  price_variant: string | null;
  price_amount_cents: number | null;
  downsell_amount_cents: number | null;
  upsell1_amount_cents: number | null;
  main_purchase_amount: number | null;
}

async function readRow(email: string): Promise<Row> {
  const { rows } = await pool.query(
    `SELECT price_variant, price_amount_cents, downsell_amount_cents,
            upsell1_amount_cents, main_purchase_amount
       FROM conversations WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  return rows[0];
}

/**
 * Plant a returning visitor: a conversation row that already carries a price,
 * dated months ago. This is the exact shape of the row behind the $57.77 charge —
 * `conversations` is keyed by email and saveConversation UPDATEs rather than
 * inserting, so one row like this follows a person forever.
 */
async function seedReturningVisitor(
  email: string,
  variant: string,
  priceCents: number,
  downsellCents: number,
) {
  await pool.query(
    `INSERT INTO conversations (email, first_name, bucket, price_variant,
                                price_amount_cents, downsell_amount_cents,
                                created_at, updated_at)
     VALUES ($1, 'QA', 'love', $2, $3, $4, now() - interval '90 days', now() - interval '90 days')`,
    [email, variant, priceCents, downsellCents],
  );
}

async function lead(
  request: import("@playwright/test").APIRequestContext,
  email: string,
  funnel?: string,
  sign?: string,
) {
  const res = await request.post("/api/lead", {
    data: {
      email,
      firstName: "QA",
      bucket: "love",
      ...(funnel ? { funnel } : {}),
      ...(sign ? { sign } : {}),
    },
  });
  expect(res.status(), "POST /api/lead").toBe(200);
  return res.json() as Promise<{ priceDollars: number; downsellDollars: number; priceVariant: string }>;
}

test.afterAll(async () => {
  await pool.query(`DELETE FROM conversations WHERE email LIKE $1`, [`qa+price-%-${STAMP}-%@example.com`]);
  await pool.end();
});

test.describe("returning visitor keeps a price her funnel does not offer", () => {
  // Each case is a real overcharge shape read out of production on 2026-08-11.

  test("THE BUG: root $45 from May meets /fb-tarot in August → quoted AND charged $35", async ({ request }) => {
    const email = emailFor("tarot-45");
    await seedReturningVisitor(email, "45", 4500, 3200);

    // Before: exactly the row Douglas was carrying.
    expect((await readRow(email)).price_amount_cents).toBe(4500);

    const body = await lead(request, email, "v1-tarot");
    expect(body.priceDollars, "the price she is QUOTED in chat").toBe(35);
    expect(body.downsellDollars).toBe(25);

    const row = await readRow(email);
    expect(row.price_variant).toBe("35_tarot");
    expect(row.price_amount_cents).toBe(3500);
    expect(row.downsell_amount_cents).toBe(2500);

    // …and the amount that actually reaches Stripe as the line item.
    const checkout = await request.post("/api/checkout", {
      data: { email, firstName: "QA", bucket: "love", type: "main", funnel: "v1-tarot" },
    });
    expect(checkout.status(), "POST /api/checkout").toBe(200);
    expect((await readRow(email)).main_purchase_amount, "the CHARGE").toBe(3500);
  });

  test("a retired $59 arm cannot reach /fb-tarot either (one buyer paid this)", async ({ request }) => {
    const email = emailFor("tarot-59");
    await seedReturningVisitor(email, "59", 5900, 4200);
    expect((await lead(request, email, "v1-tarot")).priceDollars).toBe(35);
    expect((await readRow(email)).price_amount_cents).toBe(3500);
  });

  test("another funnel's price cannot reach /fb-tarot — 45_palm from June", async ({ request }) => {
    const email = emailFor("tarot-45palm");
    await seedReturningVisitor(email, "45_palm", 4500, 3200);
    expect((await lead(request, email, "v1-tarot")).priceDollars).toBe(35);
    expect((await readRow(email)).price_variant).toBe("35_tarot");
  });

  test("the retired $55 sliding close cannot reach /fb-palm — nobody is re-shown $55", async ({ request }) => {
    const email = emailFor("palm-5535");
    await seedReturningVisitor(email, "55-35_palm", 5500, 3500);
    expect((await lead(request, email, "v1-palm", "thumb")).priceDollars).toBe(35);
    const row = await readRow(email);
    expect(row.price_variant).toBe("35_palm_u47");
    expect(row.price_amount_cents).toBe(3500);
  });

  test("a retired root arm is re-priced on the root funnel too — \"we stopped that test\"", async ({ request }) => {
    const email = emailFor("root-45");
    await seedReturningVisitor(email, "45", 4500, 3200);
    expect((await lead(request, email)).priceDollars).toBe(35);
    expect((await readRow(email)).price_variant).toBe("35");
  });
});

test.describe("nothing else moves — the live funnels keep behaving exactly as they do now", () => {
  test("a LIVE $35/$45 split stays sticky on /fb — her price never changes under her", async ({ request }) => {
    // The reason the stickiness guard exists. Both /fb arms are drawing (weight 1),
    // so 45_fb is still servable and must be handed straight back — repeatedly.
    const email = emailFor("fb-45");
    await seedReturningVisitor(email, "45_fb", 4500, 3200);
    for (let i = 0; i < 5; i++) {
      const body = await lead(request, email, "v1-fb");
      expect(body.priceDollars, `call ${i + 1}`).toBe(45);
      expect(body.downsellDollars).toBe(32);
    }
    const row = await readRow(email);
    expect(row.price_variant).toBe("45_fb");
    expect(row.price_amount_cents).toBe(4500);
  });

  test("the $35 arm of that same split is equally sticky", async ({ request }) => {
    const email = emailFor("fb-35");
    await seedReturningVisitor(email, "35_fb", 3500, 2500);
    expect((await lead(request, email, "v1-fb")).priceDollars).toBe(35);
    expect((await readRow(email)).price_variant).toBe("35_fb");
  });

  test("a returning /fb-tarot visitor already on 35_tarot is untouched", async ({ request }) => {
    const email = emailFor("tarot-sticky");
    await seedReturningVisitor(email, "35_tarot", 3500, 2500);
    expect((await lead(request, email, "v1-tarot")).priceDollars).toBe(35);
    expect((await readRow(email)).price_variant).toBe("35_tarot");
  });

  test("a returning /fb-palm visitor already on the live control is untouched", async ({ request }) => {
    const email = emailFor("palm-sticky");
    await seedReturningVisitor(email, "35_palm_u47", 3500, 2500);
    expect((await lead(request, email, "v1-palm", "thumb")).priceDollars).toBe(35);
    expect((await readRow(email)).price_variant).toBe("35_palm_u47");
  });

  test("a brand new /fb-tarot lead is unchanged: 35_tarot at $35", async ({ request }) => {
    const email = emailFor("tarot-new");
    expect((await lead(request, email, "v1-tarot")).priceDollars).toBe(35);
    const row = await readRow(email);
    expect(row.price_variant).toBe("35_tarot");
    expect(row.upsell1_amount_cents).toBe(4700);
  });

  test("a brand new /fb-palm lead is unchanged: 35_palm_u47 at $35", async ({ request }) => {
    const email = emailFor("palm-new");
    expect((await lead(request, email, "v1-palm", "thumb")).priceDollars).toBe(35);
    expect((await readRow(email)).price_variant).toBe("35_palm_u47");
  });

  test("IDEMPOTENT: repeat /api/lead calls never re-roll a price (no flapping)", async ({ request }) => {
    // The failure mode a careless version of this fix would introduce: a stored
    // price judged against a different set than the one it was drawn from, so every
    // page load re-rolls and the customer's price moves mid-conversation.
    for (const [funnel, sign] of [
      ["v1-tarot", undefined], ["v1-palm", "thumb"], ["v1-fb", undefined], [undefined, undefined],
    ] as const) {
      const email = emailFor(`idem-${funnel ?? "root"}`);
      const first = await lead(request, email, funnel, sign);
      for (let i = 0; i < 4; i++) {
        const again = await lead(request, email, funnel, sign);
        expect(again.priceDollars, `${funnel ?? "root"} call ${i + 2}`).toBe(first.priceDollars);
        expect(again.priceVariant).toBe(first.priceVariant);
      }
    }
  });
});
