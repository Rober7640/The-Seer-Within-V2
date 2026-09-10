# 07 — the server side, specified

**What this is.** The n8n fulfilment workflow is written and its logic is tested. It cannot run
because three endpoints and some columns do not exist. This is the schema change and the three
endpoints, written against the conventions already in this repo, precisely enough to implement
in one sitting.

**The decision chain.**

| | |
|---|---|
| The workflow is **spread-blind** — it loads a stored draw and fans out one item per paid position | So the server owes it a **draw record**, and the payload shape in [`07-fulfilment-README.md`](./07-fulfilment-README.md) is a fixed contract |
| A draw is **one cut per day**, shared by every buyer of that morning's email | So it is **its own table**, not columns on `be_orders`. §2 |
| The order carries what is **hers** — question, tier, topic, which day she bought | So `be_orders` gets five additive columns |
| "On a failed grade, regenerate once, then send anyway" | So the grade log is **its own table with a row per attempt**, and it is the only record of a bad send |

⛔ **Read §6 before implementing.** Six things in the README and the workflow do not match the
code, and two of them mean 07 cannot take a payment yet no matter what these endpoints do.

---

## 1 · Where things go, and where they mount

| | |
|---|---|
| **New route file** | `server/routes/be07.ts` |
| **Mount** | `app.use("/api/be/07", be07Router)` in `server/routes.ts`, beside the existing `app.use("/api/backend", backendOffersRouter)` (line 586) |
| **Schema** | `shared/schema.ts` — two new tables + five columns on `beOrders` |
| **Migration** | `migrations/2026-09-03-be-07-daily.sql` |

🔴 **The existing backend router is mounted at `/api/backend`, not `/api/be`.** n8n calls
`/api/be/07/…` in three nodes. Do **not** rename `/api/backend` — 02's booking, thank-you and
1-click upsell screens all call it. Mount a second router. The two are unrelated: `/api/backend`
is the browser's door (public, no auth), `/api/be/07` is n8n's (token, no browser).

---

## 2 · ⭐ Where the draw record lives, and why

### Chosen: its own table, `be_07_draws`, one row per `(spread_key, draw_date)`, positions in JSONB

Three reasons, in the order they cost money if ignored.

1. **A draw is not order-scoped. It is date-scoped.** The daily email names cards 1 and 2 by
   name to the whole list at 6:30pm. Every woman who buys that day must receive *those* cards.
   Put the draw on the order and two buyers of the same email can receive different cards —
   the one failure this offer cannot survive, and nothing in the schema would stop it.
2. **The draw exists before any order does.** The README's own sentence is *"the same record the
   email and the booking page rendered from"*. At 6:30pm there is no `be_orders` row — the row
   is written by the paid webhook. A column on `be_orders` therefore *cannot* be what the email
   rendered from; it can only be a copy made later. That rules the option out on its own.
3. **Blocks are read as a document, never queried by field.** `job` is prompt copy that goes
   verbatim into the model call. Nothing will ever `WHERE job = …`. JSONB is the honest shape.

### The trade-off rejected

**A `draw jsonb` column on `be_orders`** is fewer moving parts, one row read with no join, and —
the genuinely good argument — it *snapshots what she was sold*, so an edited draw can never
rewrite history on a delivered order.

Rejected because it duplicates the same 8–18 cards onto every order of that day and makes
divergence representable. The snapshot argument is answered without it: a draw row is written
once, when its email is built, and **is never updated after that email sends**; and
`be_orders.reading_body` already stores the exact prose she received. If an order-time snapshot
is later wanted, `ALTER TABLE be_orders ADD COLUMN draw_snapshot JSONB` is additive and changes
nothing here.

**A fully normalised `be_07_draw_positions` table** was also rejected: 8–18 rows per day, seven
days a week, bought by a join and an ordering discipline, to store fields nobody filters on.

### Why `blocks` is one JSONB column and not three

```jsonc
"blocks": { "day": [ … ], "open": [ … ] }
```

⭐ **07-C5, locked 2026-09-04.** `day` is the day's spread. `open` is the morning's six OPEN
cards — same cut, same minute, **no `name` and no `job`**, because their positions are decided
by what she asks and are written by n8n's node 4 from the tier model. ⛔ `undertow` and
`other_chair` are gone with the block ladder; no rung adds a named spread any more.
One JSONB rather than columns because the shape is still the operator's to change and it should
not cost a migration. n8n tolerates a missing key — node `4 · Build the brief` reads
`o.draw.open || []` — but at tier `pattern` or `table` it then **throws and holds the order**
rather than re-cutting.

### Why `draw_date` is `TEXT` and not `DATE`

The payload must hand n8n the string `"2026-09-03"`. A `date` column round-trips through a JS
`Date` and back out through a timezone, which is exactly how a draw ends up one day off in a
workflow that also computes a 24-hour hold. Store the calendar day as the string it is.
(`shared/schema.ts` does not import `date` today either — this stays inside the existing import
list.)

---

## 3 · The schema change

### 3a · `shared/schema.ts` — additions to `beOrders`

Add inside the existing `pgTable("be_orders", { … })`, after the `readingBody`/`readingUrl`
/`deliveredAt` block:

```ts
  // ── 07 · Marcus Daily Tarot only ──────────────────────────────────────────────
  // 07 is the deck's first RECURRING offer: what she bought is not "the offer", it is
  // one day's spread at one tier, against a question she typed. Nothing on this table
  // could say which. All five are NULL on 02/03 orders and on every offer that follows
  // that sells one fixed thing.
  //
  // 🔴 Nothing writes these yet — see 07-server-spec.md §6.3. The fulfilment endpoint
  // refuses (409) rather than guessing, because a guessed tier is a reading she did not
  // buy and a guessed spread is the wrong cards.
  /** Joins to be_07_draws. The day's spread, e.g. 'the-two-doors'. */
  spreadKey: text("spread_key"),
  /** 'YYYY-MM-DD'. Text, not date — it is handed to n8n as a string. */
  drawDate: text("draw_date"),
  /** spread ($35) | pattern ($57) | table ($87). ⭐ 07-C5: the rung is HOW MANY OF HER
   *  QUESTIONS get answered — 1, 2, 3. The keys are unchanged; only the meaning is. */
  tier: text("tier"),
  /** love | money. Steers the prompt, not the price. */
  topic: text("topic"),
  /** ⛔ Her words, any length. This is why it is a column and not Stripe metadata,
   *  which caps values at 500 characters and would silently truncate a real question. */
  question: text("question"),
  /** ⭐ 07-C5. Box two, typed before Stripe, required at tier 'pattern' and 'table'. */
  question2: text("question_2"),
  /** ⭐ 07-C5. Box three, required at tier 'table'. ⛔ A paid box with no text is a refund,
   *  not a reading — n8n throws rather than inventing a question she did not ask. */
  question3: text("question_3"),
```

### 3b · `shared/schema.ts` — two new tables

Append after the `BeOrder` type exports:

```ts
// ============================================================
// 07 · THE DAILY DRAW (be_07_draws)
// ============================================================
// One cut per spread per day — the record the daily email, the booking page and the
// paid reading ALL render from.
//
// 🔴 ONE ROW PER (spread_key, draw_date), enforced by a unique index. That constraint IS
// the product promise: the email names cards 1 and 2 to the whole list, so every buyer
// that day must be dealt the same cards. Storing the draw per-order would make two
// buyers of one email receiving different cards a representable state.
//
// ⛔ A row is written when the day's email is built and is NEVER updated after that email
// sends. An edited draw would rewrite a reading somebody has already read.
//
// `blocks` holds two keys: 'day' — the day's spread, every position — and 'open' — the six
// cards cut with NO position on them, which is what each question after the first is laid on.
// One JSONB rather than columns because the shape is the operator's to change and it should
// not cost a migration. ⛔ 'undertow' / 'other_chair' died with the 07-C2 block ladder.
// ============================================================

/** One position of a spread. ⛔ `job` goes VERBATIM into the model prompt. */
export interface Be07Position {
  number: number;
  name: string;
  job: string;
  card_name: string;
  reversed: boolean;
  /** Free = the email already read it. ⛔ The paid PDF must not re-explain it. */
  free: boolean;
}

/**
 * 'day' is always present. 'open' is the morning's six unplaced cards.
 * ⛔ An open card has NO `name` and NO `job` — those are written by n8n from the tier model,
 *    in the order the cards came off the cut. A writer picking which open card suits which
 *    position is not a draw, and one exception makes every reading a fake.
 */
export type Be07Blocks = {
  day: Be07Position[];
  open: Pick<Be07Position, 'number' | 'card_name' | 'reversed'>[];
};

export const be07Draws = pgTable("be_07_draws", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  /** e.g. 'the-two-doors'. Half the key of a draw, with draw_date. ⛔ n8n does NOT branch
   *  on it under 07-C5 — no rung adds a named spread, so nothing can be the day's own cut. */
  spreadKey: text("spread_key").notNull(),
  /** e.g. 'The Two Doors'. Printed on the PDF cover. */
  spreadName: text("spread_name").notNull(),
  /** 'YYYY-MM-DD'. Text — see 07-server-spec.md §2. */
  drawDate: text("draw_date").notNull(),

  blocks: jsonb("blocks").$type<Be07Blocks>().notNull(),

  /** ⭐ What the email ALREADY said about the free cards. She has read this prose;
   *  saying it back to her is the fastest way for the paid reading to look automated. */
  emailFreeRead: text("email_free_read"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_be_07_draws_spread_date").on(table.spreadKey, table.drawDate),
  index("idx_be_07_draws_date").on(table.drawDate),
]);

export type Be07Draw = typeof be07Draws.$inferSelect;
export type InsertBe07Draw = typeof be07Draws.$inferInsert;

// ============================================================
// 07 · THE GRADE LOG (be_07_reading_grades)
// ============================================================
// 🔴 THIS TABLE IS A MITIGATION, NOT BOOKKEEPING. The workflow's rule is: on a failed
// grade, regenerate ONCE, then send anyway. So a reading that failed its rubric twice is
// delivered to a paying customer, and this row is the only place that fact exists.
// Nobody is alerted. It only works if somebody READS it — daily, for the first fortnight.
//
// The audit query, which is the entire point of the table:
//   SELECT g.created_at, g.attempt, g.failed, g.why, o.email, o.tier, o.delivered_at
//   FROM be_07_reading_grades g JOIN be_orders o ON o.id = g.order_id
//   WHERE g.pass = false ORDER BY g.created_at DESC;
//
// ONE ROW PER ATTEMPT, unique on (order_id, attempt), so a retried POST cannot double-log
// and a second attempt cannot overwrite the first.
//
// ⚠ `reading` stores the full prose that was graded — up to ~2,600 words. It is here so a
// bad send can be READ, not just counted. A verdict with no text is unauditable.
// ============================================================

export const be07ReadingGrades = pgTable("be_07_reading_grades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => beOrders.id, { onDelete: "cascade" }),

  /** 1 = first pass. 2 = the one regeneration. There is never a 3. */
  attempt: integer("attempt").notNull(),
  pass: boolean("pass").notNull(),
  /** Rubric line numbers that failed, e.g. [3,6,8]. */
  failed: jsonb("failed").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  /** The grader's own words. */
  why: text("why"),
  /** The graded prose itself. See the header. */
  reading: text("reading"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uq_be_07_grades_order_attempt").on(table.orderId, table.attempt),
  // The only query that matters: find the bad sends.
  index("idx_be_07_grades_pass").on(table.pass, table.createdAt),
]);

export type Be07ReadingGrade = typeof be07ReadingGrades.$inferSelect;
export type InsertBe07ReadingGrade = typeof be07ReadingGrades.$inferInsert;
```

### 3c · The migration — `migrations/2026-09-03-be-07-daily.sql`

Same header rule as `2026-08-10-be-orders.sql`: **run this file, never `npm run db:push`** — dev
and production share one database and `db:push` diffs the whole schema.

```sql
-- 07 · Marcus Daily Tarot — the draw record, the order's intake columns, the grade log.
--
-- 🔴 RUN THIS INSTEAD OF `npm run db:push`.
--    Dev and production SHARE ONE DATABASE. `db:push` diffs the WHOLE schema and applies
--    everything it finds, so unrelated drift in schema.ts would reach production with it.
--
-- Purely additive: five nullable columns, two new tables, four indexes. No existing
-- column is altered, no row is read or modified. Safe to re-run (IF NOT EXISTS throughout).

-- ── 1 · What SHE bought. NULL on every non-07 order. ────────────────────────────────
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS spread_key TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS draw_date  TEXT;   -- 'YYYY-MM-DD'
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS tier       TEXT;   -- spread | pattern | table
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS topic      TEXT;   -- love | money
-- ⛔ Her words, any length. Stripe metadata caps values at 500 chars and would truncate.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question   TEXT;
-- ⭐ 07-C5: the rung is how many of her questions get answered. Box 2 is required at
-- 'pattern' and 'table', box 3 at 'table'. Both are typed BEFORE Stripe.
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question_2 TEXT;
ALTER TABLE be_orders ADD COLUMN IF NOT EXISTS question_3 TEXT;

-- ── 2 · The day's cut. ONE per (spread_key, draw_date) — see the unique index. ──────
-- That constraint is the product promise: the email names the free cards to the whole
-- list, so every buyer that day must be dealt the same cards.
CREATE TABLE IF NOT EXISTS be_07_draws (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  spread_key       TEXT NOT NULL,          -- 'the-two-doors'
  spread_name      TEXT NOT NULL,          -- 'The Two Doors'
  draw_date        TEXT NOT NULL,          -- 'YYYY-MM-DD', text on purpose
  -- { "day":[…], "open":[…] }. A day position is
  -- { number, name, job, card_name, reversed, free } and `job` goes verbatim into the prompt.
  -- ⛔ An open card is { number, card_name, reversed } and NOTHING else — its position is
  -- decided by what she asked and is written by n8n, in the order it came off the cut.
  blocks           JSONB NOT NULL,
  -- ⭐ What the daily email already said about the free cards, so the paid reading does
  -- not say it back to her.
  email_free_read  TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT now(),
  updated_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_be_07_draws_spread_date
  ON be_07_draws (spread_key, draw_date);
CREATE INDEX IF NOT EXISTS idx_be_07_draws_date ON be_07_draws (draw_date);

-- ── 3 · The grade log. 🔴 The ONLY record that a failed reading was sent anyway. ────
CREATE TABLE IF NOT EXISTS be_07_reading_grades (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    VARCHAR NOT NULL REFERENCES be_orders(id) ON DELETE CASCADE,
  attempt     INTEGER NOT NULL,           -- 1, or 2 for the one regeneration
  pass        BOOLEAN NOT NULL,
  failed      JSONB   NOT NULL DEFAULT '[]'::jsonb,   -- rubric lines, e.g. [3,6,8]
  why         TEXT,
  reading     TEXT,                        -- the graded prose, so a bad send can be READ
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_be_07_grades_order_attempt
  ON be_07_reading_grades (order_id, attempt);
CREATE INDEX IF NOT EXISTS idx_be_07_grades_pass
  ON be_07_reading_grades (pass, created_at);

-- Verify:
--   SELECT spread_key, draw_date, jsonb_object_keys(blocks) FROM be_07_draws;
--
-- 🔴 THE QUERY THIS WHOLE MIGRATION EXISTS FOR — every reading that failed its rubric
--    and was sent anyway. Read it DAILY for the first fortnight:
--   SELECT g.created_at, g.attempt, g.failed, g.why, o.email, o.tier, o.delivered_at
--   FROM be_07_reading_grades g JOIN be_orders o ON o.id = g.order_id
--   WHERE g.pass = false ORDER BY g.created_at DESC;
```

**Down** (`migrations/2026-09-03-be-07-daily_down.sql`), matching the repo's paired-down-file
habit:

```sql
DROP TABLE IF EXISTS be_07_reading_grades;
DROP TABLE IF EXISTS be_07_draws;
ALTER TABLE be_orders DROP COLUMN IF EXISTS question_3;
ALTER TABLE be_orders DROP COLUMN IF EXISTS question_2;
ALTER TABLE be_orders DROP COLUMN IF EXISTS question;
ALTER TABLE be_orders DROP COLUMN IF EXISTS topic;
ALTER TABLE be_orders DROP COLUMN IF EXISTS tier;
ALTER TABLE be_orders DROP COLUMN IF EXISTS draw_date;
ALTER TABLE be_orders DROP COLUMN IF EXISTS spread_key;
```

---

## 4 · The three endpoints — `server/routes/be07.ts`

### The auth, and an honest note about it

⚠ **`BE_FULFILMENT_TOKEN` is used in exactly three places in this repo, and all three are the
07 n8n JSON.** No server route reads it; it is not in `.env.example`. **There is no existing
convention to copy** — the brief assumed one and it does not exist.

So this follows the nearest neighbour that does exist: `server/api/crud.ts`'s
`authenticateApiKey` — a router-level `router.use(…)`, **500 when the env var is unset**, 401 on
a mismatch. Two deliberate departures, both forced:

- **`Authorization: Bearer <token>`**, not `x-api-key`, because that is what all three n8n nodes
  already send (`{{ 'Bearer ' + $env.BE_FULFILMENT_TOKEN }}`). The header is not negotiable;
  the workflow is authored and byte-matched.
- **Constant-time compare.** `crud.ts` uses `!==`. This token is long-lived, internet-reachable
  and guards a write path, so it gets `timingSafeEqual`. That is an upgrade, not a new pattern.

```ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { beOrders, be07Draws, be07ReadingGrades } from '@shared/schema';
import { getBeOrderBySession, recordBackendOrder } from '../lib/beOrders';
import { getStripe } from '../lib/stripeAccount';
import logger from '../lib/logger';

// n8n's door into 07's fulfilment. Three endpoints, one caller: the workflow in
// improve-v1/v1-one-time-BEs/docs/07-marcus/07-fulfilment.n8n.json.
//
// ── Why this is not on /api/backend ──────────────────────────────────────────────
// /api/backend is the BROWSER's door — booking, thank-you, 1-click upsell, no auth,
// and 02's live screens call it. This is a MACHINE's door: shared-secret only, no
// browser ever touches it. Mounting them together would mean one router where half
// the routes need a token and half must not have one.
//
// ── The payload is a contract ────────────────────────────────────────────────────
// GET /fulfilment/:sessionId returns the exact shape documented in
// docs/07-marcus/07-fulfilment-README.md. n8n's `4 · Build the brief` reads
// draw.day, draw.open, tier, question, question_2, question_3, topic, paid_at and
// bump_product_key by name. ⛔ Renaming a key here breaks the workflow silently —
// a missing `day` reads as an empty array, so she gets a SHORT reading, not an error.
// ⭐ A missing `open` is the one that IS loud: node 4 throws and holds the order rather than
// writing a rung she paid for out of cards that were never cut.

const router = Router();

/**
 * The shared secret n8n sends on all three calls.
 *
 * 500, not 401, when the variable is unset: an unconfigured server is OUR bug, and a
 * 401 would send whoever is debugging it looking for a wrong token. Same call
 * server/api/crud.ts makes.
 */
function requireFulfilmentToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.BE_FULFILMENT_TOKEN;
  if (!expected) {
    logger.error('be07: BE_FULFILMENT_TOKEN is not configured — refusing every call');
    return res.status(500).json({ error: 'Fulfilment token not configured on server' });
  }

  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !safeEqual(token, expected)) {
    logger.warn('be07: unauthorized fulfilment call', { path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

/** Constant-time. Length is compared first because timingSafeEqual throws on a mismatch. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

router.use(requireFulfilmentToken);
```

---

### 4a · `GET /api/be/07/fulfilment/:sessionId`

`:sessionId` is the **Stripe Checkout session** (`cs_…`) — n8n passes
`$json.body.data.object.id` straight from the webhook. The node retries 3× with a 30s timeout.

```ts
/**
 * The order joined to the day's draw, in the shape the workflow expects.
 *
 * ⚡ It records the order if the row is not there yet. n8n is started by the SAME Stripe
 * event as our own webhook, so its GET regularly wins the race — exactly the case
 * /api/backend/order/:sessionId already handles for the thank-you page, and the same
 * backstop: read the session from Stripe, record it, carry on. `recordBackendOrder`
 * upserts on the unique stripe_session_id, so whoever lands first there is one row.
 *
 * ⛔ It REFUSES rather than guesses. A missing tier or a missing draw is a 409 with the
 * reason named, which surfaces in the n8n execution log. The alternative — defaulting a
 * tier, or fulfilling against yesterday's cut — sends her a reading she did not buy.
 */
router.get('/fulfilment/:sessionId', async (req: Request, res: Response) => {
  const sessionId = String(req.params.sessionId || '');
  if (!sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session.' });
  }

  try {
    let order = await getBeOrderBySession(sessionId);

    if (!order) {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ error: 'Unavailable.' });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        // 402, not 404 — this is "not yet", and n8n's 3 retries may still catch it.
        return res.status(402).json({ error: 'This order has not been paid.' });
      }
      if (session.metadata?.product !== 'be_marcus_daily') {
        return res.status(404).json({ error: 'Order not found.' });
      }
      order = await recordBackendOrder(session);
    }

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // ⛔ Never fulfil another offer's order off this endpoint, and never fulfil a
    // refunded one — a refund that still posts a reading is money out and product out.
    if (order.offerNumber !== '07') {
      logger.warn('be07: fulfilment asked for a non-07 order', {
        session: sessionId, offer: order.offer,
      });
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'paid') {
      return res.status(409).json({ error: 'Order is not paid', status: order.status });
    }

    // 🔴 The intake. See §6.3 — nothing writes these columns yet, so this branch is the
    // one that fires today. Name the missing fields; a 409 with a list is debuggable,
    // a 500 is not.
    // ⭐ 07-C5: a rung IS how many of her questions get answered, so the question boxes the
    //    rung sold are required fields. n8n throws on an empty one rather than inventing a
    //    question, and a 409 here is far cheaper than a refund and a support ticket.
    const NEEDED_QUESTIONS: Record<string, number> = { spread: 1, pattern: 2, table: 3 };
    const missing = ([
      'spreadKey', 'drawDate', 'tier', 'question',
      ...(NEEDED_QUESTIONS[order.tier ?? ''] >= 2 ? ['question2' as const] : []),
      ...(NEEDED_QUESTIONS[order.tier ?? ''] >= 3 ? ['question3' as const] : []),
    ] as const)
      .filter((k) => !order![k as keyof typeof order]);
    if (missing.length) {
      logger.error('be07: order has no intake — cannot fulfil', {
        session: sessionId, order: order.id, missing,
      });
      return res.status(409).json({ error: 'Order is not ready to fulfil', missing });
    }

    const [draw] = await db
      .select()
      .from(be07Draws)
      .where(and(
        eq(be07Draws.spreadKey, order.spreadKey!),
        eq(be07Draws.drawDate, order.drawDate!),
      ))
      .limit(1);

    if (!draw) {
      // She paid for a specific morning's cards and they are not stored. Loud: this is a
      // buyer who cannot be fulfilled at all, not a retryable blip.
      logger.error('be07: NO DRAW RECORD — buyer paid and cannot be fulfilled', {
        session: sessionId, order: order.id,
        spreadKey: order.spreadKey, drawDate: order.drawDate,
      });
      return res.status(409).json({
        error: 'No draw record for that spread and date',
        spread_key: order.spreadKey, draw_date: order.drawDate,
      });
    }

    const blocks = draw.blocks || {};
    if (!Array.isArray(blocks.day) || blocks.day.length === 0) {
      logger.error('be07: draw has no day block', { drawId: draw.id });
      return res.status(409).json({ error: 'Draw record has no day block' });
    }

    // ⛔ snake_case throughout — n8n reads these key names literally.
    return res.json({
      order_id: order.id,
      email: order.email,
      first_name: order.firstName,
      // The Wait node does DateTime.fromISO(paid_at).plus({hours:24}), so this MUST be
      // ISO-8601. The row is written by the paid webhook, so created_at is the payment
      // moment to within seconds. ⚠ See §6.6 on the timezone.
      paid_at: order.createdAt.toISOString(),
      question: order.question,
      // ⭐ 07-C5. Present only on the rung that sold them; node 4 slices to the tier's count
      //    and throws if one it needs is empty.
      question_2: order.question2,
      question_3: order.question3,
      topic: order.topic,
      tier: order.tier,
      bump_product_key: order.bumpProductKey,
      email_free_read: draw.emailFreeRead,
      draw: {
        spread_name: draw.spreadName,
        // Carried for logging. ⛔ Under 07-C5 n8n no longer branches on it — no rung adds a
        // named spread, so nothing can be the day's own cut, and a spread invented tomorrow
        // needs no workflow change.
        spread_key: draw.spreadKey,
        draw_date: draw.drawDate,
        // ⭐ `blocks` now carries `day` and `open` — the day's spread, and the morning's six
        //    OPEN cards, cut off the same deck with no positions written on them. ⛔ The open
        //    cards carry no `name` and no `job`: the position is decided by what she asked and
        //    is written by node 4, in the order the cards came off the cut.
        //    ⚠ 07-C5 §2 leaves ONE thing undecided and it must be settled before this takes
        //    money: two orders from the same woman on the same morning land the same open
        //    three on both second questions. Either allocate by a running index per buyer per
        //    draw, or draw nine and rotate the third slot.
        ...blocks,
      },
    });
  } catch (err) {
    logger.error('be07/fulfilment failed', {
      session: sessionId,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: 'Could not load the order.' });
  }
});
```

| Status | When | What n8n does |
|---|---|---|
| `200` | Order paid, intake present, draw found | Proceeds |
| `400` | `:sessionId` is not `cs_…` | Fails the execution |
| `401` | Missing/wrong bearer token | Fails after 3 retries |
| `402` | Stripe says not paid | Retries 3×, then fails |
| `404` | Not a 07 order, or no such session | Fails |
| `409` | Paid, but intake or draw missing — **the reason is in the body** | Fails, loudly, with the reason in the execution log |
| `500` | Token unset, or a DB/Stripe error | Retries 3×, then fails |

⭐ Every failure here stops the workflow **before** any model call. Nothing is charged and
nothing is sent. That is the correct failure: a woman with a stuck order is recoverable, a woman
with the wrong reading is not.

---

### 4b · `POST /api/be/07/grade-log`

Body n8n posts (node `10 · Log the verdict`, verbatim):

```json
{ "order_id": "…", "attempt": 1, "pass": true, "failed": [], "why": "…", "reading": "…" }
```

```ts
/**
 * 🔴 THE MITIGATION. The workflow's rule is: on a failed grade, regenerate ONCE, then
 * send anyway. So a row here with pass=false is a reading that FAILED ITS RUBRIC AND WAS
 * DELIVERED TO A PAYING CUSTOMER. Nothing alerts. This row and the error log line below
 * are the only trace, and they only work if somebody reads them — daily, for a fortnight.
 *
 * ⚠ Two holes that are in the WORKFLOW, not here, and cannot be closed from this endpoint
 * (see 07-server-spec.md §6.5): the FIRST failure is never posted (only the final verdict
 * is), and node 10 is set onError:continueRegularOutput, so if this endpoint is down the
 * reading is sent unlogged. Keep this handler cheap and hard to fail for that reason.
 *
 * Idempotent on (order_id, attempt): a retried POST updates its own row rather than
 * double-logging, and attempt 2 can never overwrite attempt 1.
 */
router.post('/grade-log', async (req: Request, res: Response) => {
  const body = req.body ?? {};

  const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
  const attempt = Number.isInteger(body.attempt) ? (body.attempt as number) : null;
  if (!orderId) return res.status(400).json({ error: 'Missing order_id' });
  if (attempt === null || attempt < 1) return res.status(400).json({ error: 'Missing attempt' });
  if (typeof body.pass !== 'boolean') return res.status(400).json({ error: 'Missing pass' });

  const pass = body.pass as boolean;
  // ⚠ Tolerant on purpose. The grader's JSON is model output; a malformed `failed` must
  // not cost us the whole log entry, which is the one thing that makes a bad send findable.
  const failed = Array.isArray(body.failed)
    ? (body.failed as unknown[]).filter((n): n is number => Number.isInteger(n))
    : [];
  const why = typeof body.why === 'string' ? body.why.slice(0, 4000) : null;
  const reading = typeof body.reading === 'string' ? body.reading : null;

  try {
    // The FK would reject an unknown order with a 500. Check it here so the answer is a
    // 404 that says which id was wrong.
    const [order] = await db
      .select({ id: beOrders.id, email: beOrders.email, tier: beOrders.tier })
      .from(beOrders)
      .where(eq(beOrders.id, orderId))
      .limit(1);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await db
      .insert(be07ReadingGrades)
      .values({ orderId, attempt, pass, failed, why, reading })
      .onConflictDoUpdate({
        target: [be07ReadingGrades.orderId, be07ReadingGrades.attempt],
        set: { pass, failed, why, reading },
      });

    if (!pass) {
      // ⛔ The one line an operator must be able to grep for. Deliberately error-level:
      // a customer is about to receive a reading that failed its own quality gate.
      logger.error('be07: FAILED GRADE, SENDING ANYWAY — read this', {
        order: orderId, email: order.email, tier: order.tier, attempt, failed, why,
      });
    } else {
      logger.info('be07: grade logged', { order: orderId, attempt, pass });
    }

    return res.json({ ok: true });
  } catch (err) {
    logger.error('be07/grade-log failed — a reading may be sent with NO audit record', {
      order: orderId, attempt,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: 'Could not write the grade log' });
  }
});
```

| Status | When |
|---|---|
| `200` | Logged (inserted or updated) |
| `400` | `order_id`, `attempt` or `pass` missing/wrong type |
| `401` | Bad token |
| `404` | No such order |
| `500` | DB error — ⚠ n8n **continues anyway**; §6.5 |

---

### 4c · `POST /api/be/07/delivered`

Body n8n posts (node `15 · Mark delivered`, verbatim):

```json
{ "order_id": "…", "reading_url": "…", "reading_body": "…" }
```

⚠ **The README says this endpoint writes `reading_url` + `delivered_at`. The workflow also sends
`reading_body`** — the full prose. `be_orders.reading_body` already exists for exactly that
("stores what was ACTUALLY sent, so a re-send is identical"), so store it.

```ts
/**
 * The last step: she has been tagged on AWeber, which IS the send. Stamp the order.
 *
 * ⚠ SUPABASE RETURNS A RELATIVE `signedURL`. Absolutise it here so support and any
 * re-send have a link they can click, and so the storage host lives in one place.
 *
 * ⛔ delivered_at is COALESCEd, never overwritten. The FIRST delivery is the truth; a
 * retried POST must not move the timestamp and make a re-send look like the original.
 */
router.post('/delivered', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
  const rawUrl = typeof body.reading_url === 'string' ? body.reading_url.trim() : '';
  const readingBody = typeof body.reading_body === 'string' ? body.reading_body : null;

  if (!orderId) return res.status(400).json({ error: 'Missing order_id' });
  if (!rawUrl) return res.status(400).json({ error: 'Missing reading_url' });

  const readingUrl = absoluteReadingUrl(rawUrl);

  try {
    const [row] = await db
      .update(beOrders)
      .set({
        readingUrl,
        // Only when sent — never blank prose we already hold.
        ...(readingBody ? { readingBody } : {}),
        deliveredAt: sql`COALESCE(${beOrders.deliveredAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(beOrders.id, orderId))
      .returning();

    if (!row) return res.status(404).json({ error: 'Order not found' });

    logger.info('be07: delivered', {
      order: orderId, email: row.email, tier: row.tier, deliveredAt: row.deliveredAt,
    });
    return res.json({ ok: true, delivered_at: row.deliveredAt });
  } catch (err) {
    logger.error('be07/delivered failed — she HAS the reading, the row is not stamped', {
      order: orderId,
      err: err instanceof Error ? err.message : String(err),
    });
    return res.status(500).json({ error: 'Could not stamp the order' });
  }
});

/** Supabase's /object/sign returns a path, not a URL. Prefix it once, here. */
function absoluteReadingUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  if (!base) {
    logger.warn('be07: SUPABASE_URL unset — storing a relative reading_url', { url });
    return url;
  }
  return `${base}/storage/v1/${url.replace(/^\/+/, '')}`;
}

export default router;
```

| Status | When |
|---|---|
| `200` | Stamped. Returns `delivered_at` |
| `400` | `order_id` or `reading_url` missing |
| `401` | Bad token |
| `404` | No such order |
| `500` | DB error — she already has the reading; the row can be stamped by hand |

---

## 5 · How to verify

Set `BE_FULFILMENT_TOKEN` locally first. `$T` below is that token, `$S` a real `cs_…`,
`$O` the `order_id` the first call returns.

```bash
# 1 · Auth is on. Expect 401.
curl -s -o /dev/null -w '%{http_code}\n' \
  http://localhost:5000/api/be/07/fulfilment/cs_test_123
# → 401

# 2 · Bad session shape. Expect 400.
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $T" \
  http://localhost:5000/api/be/07/fulfilment/not-a-session
# → 400

# 3 · A real paid 07 order with no intake columns yet. Expect 409 + the field list.
curl -s -H "Authorization: Bearer $T" \
  "http://localhost:5000/api/be/07/fulfilment/$S" | jq
# → 409 {"error":"Order is not ready to fulfil","missing":["spreadKey","drawDate","tier","question"]}

# 4 · The happy path, once §6.3 and a be_07_draws row exist. Expect 200 and — the only
#     assertion that matters — draw.spread_key present.
curl -s -H "Authorization: Bearer $T" \
  "http://localhost:5000/api/be/07/fulfilment/$S" \
  | jq '{tier, question: (.question|length), spread_key: .draw.spread_key,
         day: (.draw.day|length), free: [.draw.day[]|select(.free)]|length}'
# → 200, spread_key non-null, day non-empty

# 5 · Grade log — a PASS.
curl -s -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$O\",\"attempt\":1,\"pass\":true,\"failed\":[],\"why\":\"ok\",\"reading\":\"…\"}" \
  http://localhost:5000/api/be/07/grade-log
# → 200 {"ok":true}

# 6 · Grade log — idempotent. Same attempt again, updated not duplicated.
#     Re-run 5, then: SELECT count(*) FROM be_07_reading_grades WHERE order_id = '<O>';  → 1

# 7 · Grade log — a FAIL. Check the server log for "FAILED GRADE, SENDING ANYWAY".
curl -s -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$O\",\"attempt\":2,\"pass\":false,\"failed\":[3,6,8],\"why\":\"hedges\",\"reading\":\"…\"}" \
  http://localhost:5000/api/be/07/grade-log
# → 200, and an error-level log line

# 8 · Grade log — unknown order. Expect 404.
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"order_id":"00000000-0000-0000-0000-000000000000","attempt":1,"pass":true}' \
  http://localhost:5000/api/be/07/grade-log
# → 404

# 9 · Delivered, with the RELATIVE path Supabase actually returns.
curl -s -X POST -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d "{\"order_id\":\"$O\",\"reading_url\":\"object/sign/readings/07/$O/reading.pdf?token=abc\",\"reading_body\":\"…\"}" \
  http://localhost:5000/api/be/07/delivered
# → 200 {"ok":true,"delivered_at":"…"}
#   Then check reading_url is ABSOLUTE:
#   SELECT reading_url, delivered_at FROM be_orders WHERE id = '<O>';

# 10 · Delivered twice — delivered_at must NOT move. Re-run 9 and compare the timestamp.

# 11 · The audit query. Run it after 7.
#   SELECT g.created_at, g.attempt, g.failed, g.why, o.email, o.tier, o.delivered_at
#   FROM be_07_reading_grades g JOIN be_orders o ON o.id = g.order_id
#   WHERE g.pass = false ORDER BY g.created_at DESC;
```

Also re-run the two existing checks — neither is touched by this change, and both should stay
green: `node improve-v1/v1-one-time-BEs/scripts/test-07-brief.mjs` and
`npx vitest run server/lib/beOrders.test.ts`.

---

## 6 · 🔴 What contradicts the README

Nine things. Two of them (6.2 and 6.3) mean **07 cannot take a payment even with all three
endpoints built**, and neither is mentioned as a blocker anywhere.

### 6.1 · The route prefix does not exist

The README and the workflow both say `/api/be/07/…`. The repo's backend router is mounted at
**`/api/backend`** (`server/routes.ts:586`). This is not a rename — 02's live screens call
`/api/backend/checkout`, `/order/:sessionId`, `/upsell/user-data`, `/upsell/charge`. Mount a
second router (§1). Nothing else in the repo answers on `/api/be`.

### 6.2 · 🔴 `be_marcus_daily` is NOT a one-line addition — 07 has three prices and the catalog cannot express that

The README's checklist reads *"`be_marcus_daily` product key — `BackendOfferKey` is still
`'twin-flame' | 'judgement-day'`"*, as if it were a string. It is not:

| What 07 needs | What `shared/backendOffers.ts` has |
|---|---|
| **Three prices** — Spread $35, Pattern $57, Table $87 | `BackendPricing = { model:'fixed' } \| { model:'pwyw' }`. **There is no tiered model.** `priceBackendOffer()` returns exactly one `readingCents` |
| Bump product key **`marcus_same_day`** ($12.77) | Fits `BackendOfferBump` as-is. ⛔ It must be that exact string — node 4 tests `o.bump_product_key === 'marcus_same_day'` |
| `number: '07'` | The field's type is `'02' \| '03'` |
| Two days sell only **two** rungs (Thu has no Pattern, Sat has no Table) | Nothing in the catalog can express a per-day price ladder |

So adding 07 means extending `BackendPricing` with a tiered model and teaching
`resolveBackendCharge` to take a tier from the request — while keeping the file's one security
rule (*the browser never sends a price*). A tier **key** from the browser is fine; a tier
**price** is not. That is a real piece of design work and it is not on any checklist.

⛔ And per [`07-spread-registry.md`](./07-spread-registry.md), the same pricing code is where
Thursday's Pattern and Saturday's Table must be refused. Today only the n8n Code node refuses
them — **after** she has paid. The refusal belongs in `priceBackendOffer`, before Stripe.

### 6.3 · 🔴 Nothing fills the intake columns, and the question cannot ride Stripe metadata

The README is right that the question is too long for metadata (500-char cap) and correct that
the workflow fetches it from our API. But **nothing writes it to our API either.** There is no
07 booking page in `client/`, no 07 route, and `/api/backend/checkout` accepts only
`{ offer, treatment, bump, amountCents, firstName }` — no question, no tier, no topic, no day.

Three candidate mechanisms, none of them decided:

| | How | Cost |
|---|---|---|
| **A — intake row keyed on the Stripe session** *(recommended)* | `/api/backend/checkout` creates the session, then writes `{spread_key, draw_date, tier, topic, question}` to a small `be_order_intake` table keyed on the returned `session.id`. `recordBackendOrder` copies them onto `be_orders` on the paid webhook | One extra table. **No new endpoint, no new token in a URL, and the "a be_orders row means she paid" invariant is untouched** |
| **B — intake token** | New `POST /api/be/07/intake` returns a uuid; the uuid rides in Stripe metadata (36 chars, safe); the webhook resolves it | Mirrors the existing `soulmate_lander_sessions.intake_token` pattern, but adds a fourth endpoint and a token to expire and revoke |
| **C — pending `be_orders` row at checkout** | Insert the row up front with `status='pending'`; the webhook's existing upsert flips it to paid | Cheapest to write and **the most dangerous**: `getBeOrderBySession` and `/api/backend/order/:sessionId` do not filter on status, so an abandoned checkout would render a thank-you page as if paid |

Until one lands, `GET /fulfilment/:sessionId` answers `409 {"missing":[…]}` on every real order.
That is the correct behaviour, and it is also why 07 cannot go live on these endpoints alone.

### 6.4 · ✅ RESOLVED 2026-09-04 — the `job` strings now have a home, and it is not `07-P1`

**What was wrong.** The README says *"`job` is the position's job **verbatim from `07-P1`**"*, but
[`07-P1-the-seven-spreads.md`](../../copy/07-marcus/07-P1-the-seven-spreads.md) has **no `job`
column** — position numbers, position names and free/paid, and the word "job" does not appear in
it. The field the prompt depends on was being sourced from a file that never carried it.

**What it is now.** [`scripts/07-spreads.json`](../../scripts/07-spreads.json) — the registry —
carries all **55 positions across all seven spreads**, each with its `job`, and
`node scripts/check-07-registry.mjs` asserts every one still matches
`scripts/07-dryrun-orders.json`, the fixture n8n was actually proved against. ⛔ **Read `job` from
the registry, never from `07-P1`.** `scripts/07-registry.mjs`'s `resolve(key, tier)` returns the
flat ordered `positions[]` a `be_07_draws` row needs, already deduplicated and floor-checked.

⚠ **What is still open: nothing writes `be_07_draws`.** The registry supplies the half that never
changes — positions, jobs, free flags. The half that changes every morning is the **cards**, and
those exist today only inside the built HTML emails and the registry's `built_email.face_up`
block, which is one fixed week. Build order step 8 is now a small script over the registry instead
of a copy task, but it does not exist yet.

### 6.5 · ⚠ "The log is the entire mitigation" — but the workflow can skip it twice over

Two holes, both in the n8n JSON, neither mentioned in the README:

1. **The first failure is never logged.** Trace the connections: `9 · Passed?` → `10 · Log` on
   pass; `9a · First failure?` → `9b · Go round again` on the first fail, and only its *second*
   fail reaches node 10. So a reading that failed once and passed on retry logs `pass:true,
   attempt:2` — you can infer that a first attempt failed, but **never why**. If the point is
   spotting a systematically bad rubric line, that is the data you most want.
2. **A logging failure does not stop the send.** Node 10 is `onError: "continueRegularOutput"`.
   If the endpoint is down, the reading is rendered, uploaded and sent — unlogged.

Both are one-line changes in `scripts/build-07-n8n.py`: post the verdict from the `9b` branch
too, and drop `continueRegularOutput` on node 10 if the log really is the mitigation. **They are
workflow changes, not server changes** — flagged here because the README's claim is stronger
than what the JSON does.

### 6.6 · ⚠ `paid_at` feeds a 24-hour timer off a timezone-naive column

Node `13a · Hold to the 24h mark` does `DateTime.fromISO(paid_at).plus({hours: 24})`. This spec
fills `paid_at` from `be_orders.created_at`, which is `TIMESTAMP` **without** time zone
(as is every timestamp in that table). Postgres on Supabase defaults to UTC so this is expected
to be right — but **verify it once** before activating, because if the database's clock is not
UTC the same-day bump ($12.77, a real product) arrives hours off. One query:
`SELECT now(), created_at FROM be_orders ORDER BY created_at DESC LIMIT 1;`
A `paid_at TIMESTAMPTZ` column would remove the doubt; it was left out here to keep the migration
purely additive and the table's types consistent.

### 6.7 · `/delivered` receives more than the README says

README: *"`/delivered` writes `reading_url` + `delivered_at`"*. Node 15 also posts
`reading_body`. `be_orders.reading_body` exists for it and its own comment says it should hold
what was actually sent, so §4c stores it. Harmless, but the README undercounts the contract.

### 6.8 · The env list is stale in one place and short in three

README §4 lists `ANTHROPIC_API_KEY · APP_BASE_URL · BE_FULFILMENT_TOKEN · PDF_RENDER_URL ·
AWEBER_*`.

- **`PDF_RENDER_URL` is dead.** The same README's §1a says PDFShift replaced the self-hosted
  renderer, and node 11 posts to `api.pdfshift.io` with a stored credential. No node reads it.
- **Missing:** `SUPABASE_URL` and `SUPABASE_BUCKET` (nodes 12 and 12a, and §4c's absolutiser).
- **None of `BE_FULFILMENT_TOKEN`, `APP_BASE_URL`, `SUPABASE_URL` or `PDF_RENDER_URL` is in
  `.env.example`.** Whoever deploys this has no list to work from.

### 6.9 · A reversed minor arcana has no art

Not a server issue, but it lands in a PDF this endpoint's data produces. Node 10a's own comment:
*"Only the 22 majors have a `-reversed` scan. A reversed MINOR has no art and 404s."* So any
`be_07_draws` row with `reversed: true` on a minor card ships a broken image to a paying
customer. **Whatever seeds the draw table must reject that**, since nothing downstream does.

---

## 7 · Build order

| # | | Why it is here |
|---|---|---|
| 1 | Run the migration (§3c) | Everything below needs the columns |
| 2 | Add the schema definitions (§3a, §3b) | Types for the route file |
| 3 | Build `server/routes/be07.ts` + mount it (§4, §1) | The three endpoints. Verifiable on their own with §5 |
| 4 | Set `BE_FULFILMENT_TOKEN` and add it to `.env.example` with `APP_BASE_URL`, `SUPABASE_URL`, `SUPABASE_BUCKET` | §6.8 |
| 5 | ~~Write the `job` strings for the six spreads that lack them~~ | ✅ done — all 55 are in `scripts/07-spreads.json`. §6.4 |
| 6 | 🔴 Decide and build the intake path (§6.3, option A) | Until this, every order 409s |
| 7 | 🔴 Extend `BackendPricing` with a tiered model; refuse Thu-Pattern and Sat-Table **before** Stripe | §6.2 — 07 cannot be sold without it |
| 8 | Seed `be_07_draws` from the registry | `resolve()` gives the positions; the day's CARDS still have no source outside the built emails. §6.4 |
| 9 | Close the two grade-log holes in `build-07-n8n.py` | §6.5 — do it before the first real send, not after |

Steps 1–4 are this spec and fit in one sitting. Step 5 is done. **Steps 6 and 7 are now the
reason 07 is not close to live**, and neither of them is a server endpoint.
