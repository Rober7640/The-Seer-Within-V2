/**
 * Reconcile stuck `pending` credit_purchases against Stripe / PayPal.
 *
 * Safe by default: prints the proposed actions but writes NOTHING.
 * Pass --apply to actually credit users + flip rows to completed.
 *
 *   npx tsx scripts/reconcile-pending-purchases.ts                   # dry-run, all stuck rows
 *   npx tsx scripts/reconcile-pending-purchases.ts --user <user_id>  # one user only
 *   npx tsx scripts/reconcile-pending-purchases.ts --row-id <id>     # one row only
 *   npx tsx scripts/reconcile-pending-purchases.ts --source paypal   # paypal only
 *   npx tsx scripts/reconcile-pending-purchases.ts --source stripe   # stripe only
 *   npx tsx scripts/reconcile-pending-purchases.ts --limit 5         # first N rows
 *   npx tsx scripts/reconcile-pending-purchases.ts --apply           # actually write
 *   npx tsx scripts/reconcile-pending-purchases.ts --cleanup-abandoned --apply
 *       (also marks NOT_CAPTURED rows older than 1h as 'abandoned')
 *
 * Reads from .env: DATABASE_URL, STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID,
 *                  PAYPAL_CLIENT_SECRET, PAYPAL_MODE
 *
 * Writes audit trail to: scripts/audit/reconciliation-<ISO>.jsonl
 */

import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { getStripeForRow } from '../server/lib/stripeAccount';
import { promises as fs } from 'fs';
import path from 'path';
import { creditPurchases, users } from '../shared/schema';

// ─── CLI flags ────────────────────────────────────────────────────────────────
type Args = {
  apply: boolean;
  cleanupAbandoned: boolean;
  user?: string;
  rowId?: string;
  source?: 'paypal' | 'stripe';
  limit?: number;
  olderThanMin: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (flag: string): boolean => argv.includes(flag);
  const sourceArg = get('--source');
  return {
    apply: has('--apply'),
    cleanupAbandoned: has('--cleanup-abandoned'),
    user: get('--user'),
    rowId: get('--row-id'),
    source: sourceArg === 'paypal' || sourceArg === 'stripe' ? sourceArg : undefined,
    limit: get('--limit') ? parseInt(get('--limit')!, 10) : undefined,
    olderThanMin: get('--older-than-min') ? parseInt(get('--older-than-min')!, 10) : 5,
  };
}

const args = parseArgs();

// ─── Boot checks ──────────────────────────────────────────────────────────────
const required = ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing required env var: ${k}`);
    process.exit(1);
  }
}

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

console.log(`\nMode:        ${args.apply ? '🔴 APPLY (will write)' : '🟢 DRY-RUN (read-only)'}`);
console.log(`PayPal env:  ${process.env.PAYPAL_MODE === 'live' ? 'LIVE' : 'SANDBOX'}`);
console.log(`Older than:  ${args.olderThanMin} min`);
if (args.user) console.log(`Filter user: ${args.user}`);
if (args.rowId) console.log(`Filter row:  ${args.rowId}`);
if (args.source) console.log(`Filter src:  ${args.source}`);
if (args.limit) console.log(`Limit:       ${args.limit}`);
console.log();

// ─── DB ───────────────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10000,
});
const db = drizzle(pool);

// ─── Stripe ───────────────────────────────────────────────────────────────────
// Tag-aware: each row is reconciled against the account that created its IDs via
// getStripeForRow(row.stripeAccount) (NULL → 'A' for legacy rows).

// ─── PayPal helpers ───────────────────────────────────────────────────────────
let cachedPayPalToken: { token: string; expiresAt: number } | null = null;

async function getPayPalToken(): Promise<string> {
  if (cachedPayPalToken && cachedPayPalToken.expiresAt > Date.now() + 30_000) {
    return cachedPayPalToken.token;
  }
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedPayPalToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

type PayPalOrder = {
  id: string;
  status: string; // CREATED | SAVED | APPROVED | VOIDED | COMPLETED | PAYER_ACTION_REQUIRED
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string; // COMPLETED, DECLINED, etc.
        amount?: { value: string; currency_code: string };
      }>;
    };
  }>;
};

async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  const token = await getPayPalToken();
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) {
    throw Object.assign(new Error('NOT_FOUND'), { code: 404 });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal getOrder failed (${res.status}): ${text}`);
  }
  return (await res.json()) as PayPalOrder;
}

// ─── Categorisation ───────────────────────────────────────────────────────────
type Category = 'CAPTURED' | 'NOT_CAPTURED' | 'NOT_FOUND' | 'ERROR';

type Reconciled = {
  rowId: string;
  userId: string;
  email: string;
  source: 'paypal' | 'stripe';
  externalId: string;
  category: Category;
  externalStatus: string;
  captureId?: string;
  coinsTotal: number;
  amountUsd: number;
  createdAt: Date;
  errorMessage?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const cutoff = new Date(Date.now() - args.olderThanMin * 60_000);

  // Fetch stuck rows joined with user email
  const baseConditions = [
    eq(creditPurchases.status, 'pending'),
    lt(creditPurchases.createdAt, cutoff),
  ];
  if (args.user) baseConditions.push(eq(creditPurchases.userId, args.user));
  if (args.rowId) baseConditions.push(eq(creditPurchases.id, args.rowId));
  if (args.source === 'paypal') baseConditions.push(isNotNull(creditPurchases.paypalOrderId));
  if (args.source === 'stripe')
    baseConditions.push(isNotNull(creditPurchases.stripePaymentIntentId));

  const rowsQuery = db
    .select({
      id: creditPurchases.id,
      userId: creditPurchases.userId,
      email: users.email,
      coinBalance: users.coinBalance,
      coinsPurchased: creditPurchases.coinsPurchased,
      bonusCoins: creditPurchases.bonusCoins,
      priceUsd: creditPurchases.priceUsd,
      paypalOrderId: creditPurchases.paypalOrderId,
      stripePaymentIntentId: creditPurchases.stripePaymentIntentId,
      stripeAccount: creditPurchases.stripeAccount,
      createdAt: creditPurchases.createdAt,
    })
    .from(creditPurchases)
    .innerJoin(users, eq(users.id, creditPurchases.userId))
    .where(and(...baseConditions))
    .orderBy(creditPurchases.createdAt);

  const rows = args.limit ? await rowsQuery.limit(args.limit) : await rowsQuery;

  console.log(`Found ${rows.length} stuck pending row(s) to reconcile.`);
  if (rows.length === 0) {
    console.log('Nothing to do.');
    await pool.end();
    return;
  }
  console.log();

  // Reconcile each one against the source
  const results: Reconciled[] = [];
  let consecutiveErrors = 0;

  for (const row of rows) {
    const isPayPal = !!row.paypalOrderId;
    const isStripe = !!row.stripePaymentIntentId;
    if (!isPayPal && !isStripe) {
      console.log(`Skipping row ${row.id}: no payment provider ID set`);
      continue;
    }
    const source: 'paypal' | 'stripe' = isPayPal ? 'paypal' : 'stripe';
    const externalId = (isPayPal ? row.paypalOrderId : row.stripePaymentIntentId)!;
    const coinsTotal = (row.coinsPurchased ?? 0) + (row.bonusCoins ?? 0);

    let category: Category = 'ERROR';
    let externalStatus = '';
    let captureId: string | undefined;
    let errorMessage: string | undefined;

    try {
      if (isPayPal) {
        const order = await getPayPalOrder(externalId);
        externalStatus = order.status;
        const cap = order.purchase_units?.[0]?.payments?.captures?.[0];
        if (cap?.status === 'COMPLETED') {
          category = 'CAPTURED';
          captureId = cap.id;
        } else if (
          ['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'PAYER_ACTION_REQUIRED'].includes(
            order.status,
          )
        ) {
          category = 'NOT_CAPTURED';
        } else if (order.status === 'COMPLETED' && !cap) {
          // COMPLETED order with no capture in payload — treat as captured but without ID
          category = 'CAPTURED';
        } else {
          category = 'NOT_CAPTURED';
        }
      } else {
        const rowStripe = getStripeForRow(row.stripeAccount);
        if (!rowStripe) {
          throw new Error(
            `Stripe account '${row.stripeAccount ?? 'A'}' not configured for row ${row.id}`,
          );
        }
        const intent = await rowStripe.paymentIntents.retrieve(externalId);
        externalStatus = intent.status;
        if (intent.status === 'succeeded') {
          category = 'CAPTURED';
          captureId = intent.latest_charge as string | undefined;
        } else if (
          [
            'requires_payment_method',
            'requires_confirmation',
            'requires_action',
            'canceled',
          ].includes(intent.status)
        ) {
          category = 'NOT_CAPTURED';
        } else if (intent.status === 'processing' || intent.status === 'requires_capture') {
          category = 'NOT_CAPTURED'; // not yet final
        } else {
          category = 'NOT_CAPTURED';
        }
      }
      consecutiveErrors = 0;
    } catch (err: any) {
      if (err.code === 404 || /NOT_FOUND/i.test(err.message)) {
        category = 'NOT_FOUND';
        externalStatus = 'NOT_FOUND';
      } else {
        category = 'ERROR';
        errorMessage = err.message ?? String(err);
        consecutiveErrors++;
      }
    }

    results.push({
      rowId: row.id,
      userId: row.userId,
      email: row.email,
      source,
      externalId,
      category,
      externalStatus,
      captureId,
      coinsTotal,
      amountUsd: row.priceUsd / 100,
      createdAt: row.createdAt,
      errorMessage,
    });

    if (consecutiveErrors >= 5) {
      console.error('\n⚠️  5 consecutive API errors — stopping early. Investigate before retrying.');
      break;
    }

    await sleep(200); // gentle rate limit
  }

  // ─── Dedup serial retriers (multiple CAPTURED for same user/amount within 30 min) ─
  const captured = results.filter((r) => r.category === 'CAPTURED');
  const dupGroups = new Map<string, Reconciled[]>(); // key = userId|amountUsd|amountBucket(30min)
  for (const r of captured) {
    const bucket = Math.floor(r.createdAt.getTime() / (30 * 60_000));
    const key = `${r.userId}|${r.amountUsd}|${bucket}`;
    const arr = dupGroups.get(key) ?? [];
    arr.push(r);
    dupGroups.set(key, arr);
  }

  const toCredit = new Set<string>(); // rowIds we'll actually credit
  const duplicates = new Set<string>(); // rowIds we suspect are duplicate retries
  for (const arr of dupGroups.values()) {
    if (arr.length === 1) {
      toCredit.add(arr[0].rowId);
    } else {
      // Keep the most recent (most likely the one that "stuck"); flag the rest
      arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      toCredit.add(arr[0].rowId);
      for (let i = 1; i < arr.length; i++) duplicates.add(arr[i].rowId);
    }
  }

  // ─── Print summary ────────────────────────────────────────────────────────────
  const byCat = new Map<string, Reconciled[]>();
  for (const r of results) {
    const k = duplicates.has(r.rowId) ? 'DUPLICATE_RETRY' : r.category;
    byCat.set(k, [...(byCat.get(k) ?? []), r]);
  }
  console.log('─── Summary by category ─────────────────────────────────────');
  for (const [cat, arr] of byCat.entries()) {
    const dollars = arr.reduce((s, r) => s + r.amountUsd, 0);
    const coins = arr.reduce((s, r) => s + r.coinsTotal, 0);
    console.log(`  ${cat.padEnd(18)} ${arr.length.toString().padStart(3)} rows   $${dollars.toFixed(2).padStart(8)}   ${coins} coins`);
  }
  console.log();

  console.log('─── Detail ──────────────────────────────────────────────────');
  console.log(
    'Action      Source   Cat            User email                      Amount     Coins   Row ID',
  );
  for (const r of results) {
    const dup = duplicates.has(r.rowId);
    const action =
      r.category === 'CAPTURED' && !dup
        ? args.apply
          ? '✅ CREDIT'
          : '   would-credit'
        : r.category === 'CAPTURED' && dup
          ? '⚠️  DUP-skip'
          : r.category === 'NOT_CAPTURED'
            ? args.cleanupAbandoned && args.apply
              ? '🧹 abandon'
              : '   abandoned-cart'
            : r.category === 'NOT_FOUND'
              ? '❓ skip-NF'
              : '⚠️  skip-err';
    console.log(
      [
        action.padEnd(18),
        r.source.padEnd(8),
        r.externalStatus.padEnd(14),
        r.email.padEnd(32),
        ('$' + r.amountUsd.toFixed(2)).padStart(8),
        r.coinsTotal.toString().padStart(6),
        r.rowId,
      ].join(' '),
    );
    if (r.errorMessage) console.log(`    error: ${r.errorMessage.slice(0, 200)}`);
  }
  console.log();

  // ─── Audit file path ──────────────────────────────────────────────────────────
  const auditDir = path.join('scripts', 'audit');
  await fs.mkdir(auditDir, { recursive: true });
  const auditFile = path.join(
    auditDir,
    `reconciliation-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`,
  );

  if (!args.apply) {
    console.log('🟢 DRY-RUN — no changes written. Re-run with --apply to make changes.');
    console.log(`(Audit file would be written to: ${auditFile})`);
    await pool.end();
    return;
  }

  // ─── APPLY MODE ───────────────────────────────────────────────────────────────
  console.log('🔴 APPLY MODE — writing changes...');
  const auditEntries: any[] = [];
  let creditedCount = 0;
  let creditedDollars = 0;
  let abandonedCount = 0;

  for (const r of results) {
    if (r.category === 'CAPTURED' && toCredit.has(r.rowId)) {
      try {
        // Idempotent: only act if row is still pending (might have flipped if the new webhook caught up)
        await db.transaction(async (tx) => {
          const updated = await tx
            .update(creditPurchases)
            .set({
              status: 'completed',
              paypalCaptureId:
                r.source === 'paypal' && r.captureId
                  ? r.captureId
                  : sql`paypal_capture_id`,
              stripePaymentIntentId:
                r.source === 'stripe' ? r.externalId : sql`stripe_payment_intent_id`,
              updatedAt: new Date(),
            })
            .where(
              and(eq(creditPurchases.id, r.rowId), eq(creditPurchases.status, 'pending')),
            )
            .returning({ id: creditPurchases.id });

          if (updated.length === 0) {
            // Already processed by webhook in the meantime
            auditEntries.push({
              ts: new Date().toISOString(),
              action: 'SKIPPED_ALREADY_COMPLETED',
              rowId: r.rowId,
              userId: r.userId,
              email: r.email,
            });
            return;
          }

          const balanceUpdate = await tx
            .update(users)
            .set({
              coinBalance: sql`coin_balance + ${r.coinsTotal}`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, r.userId))
            .returning({ coinBalance: users.coinBalance });

          auditEntries.push({
            ts: new Date().toISOString(),
            action: 'CREDITED',
            rowId: r.rowId,
            userId: r.userId,
            email: r.email,
            source: r.source,
            externalId: r.externalId,
            captureId: r.captureId,
            coinsCredited: r.coinsTotal,
            amountUsd: r.amountUsd,
            newBalance: balanceUpdate[0]?.coinBalance,
          });
          creditedCount++;
          creditedDollars += r.amountUsd;
          console.log(
            `  ✅ Credited ${r.coinsTotal} coins to ${r.email} (new balance: ${balanceUpdate[0]?.coinBalance})`,
          );
        });
      } catch (err: any) {
        auditEntries.push({
          ts: new Date().toISOString(),
          action: 'FAILED',
          rowId: r.rowId,
          userId: r.userId,
          email: r.email,
          error: err.message,
        });
        console.error(`  ❌ FAILED to credit ${r.email} row ${r.rowId}: ${err.message}`);
      }
    } else if (
      r.category === 'NOT_CAPTURED' &&
      args.cleanupAbandoned &&
      Date.now() - r.createdAt.getTime() > 60 * 60_000
    ) {
      // mark abandoned (>1h old)
      try {
        await db
          .update(creditPurchases)
          .set({ status: 'abandoned', updatedAt: new Date() })
          .where(and(eq(creditPurchases.id, r.rowId), eq(creditPurchases.status, 'pending')));
        auditEntries.push({
          ts: new Date().toISOString(),
          action: 'MARKED_ABANDONED',
          rowId: r.rowId,
          userId: r.userId,
          email: r.email,
          source: r.source,
          externalId: r.externalId,
        });
        abandonedCount++;
      } catch (err: any) {
        console.error(`  ❌ Failed to mark abandoned ${r.rowId}: ${err.message}`);
      }
    } else if (duplicates.has(r.rowId)) {
      auditEntries.push({
        ts: new Date().toISOString(),
        action: 'FLAGGED_DUPLICATE',
        rowId: r.rowId,
        userId: r.userId,
        email: r.email,
        source: r.source,
        externalId: r.externalId,
        amountUsd: r.amountUsd,
        note: 'Duplicate retry within 30 min — review for refund decision',
      });
    }
  }

  // Write audit
  await fs.writeFile(auditFile, auditEntries.map((e) => JSON.stringify(e)).join('\n') + '\n');

  console.log();
  console.log('─── Apply summary ───────────────────────────────────────────');
  console.log(`  Credited:           ${creditedCount} users  ($${creditedDollars.toFixed(2)})`);
  if (args.cleanupAbandoned) console.log(`  Marked abandoned:   ${abandonedCount} rows`);
  console.log(`  Flagged duplicates: ${duplicates.size} rows (review needed)`);
  console.log(`  Audit written:      ${auditFile}`);
  console.log();

  await pool.end();
}

main().catch(async (err) => {
  console.error('\nFATAL:', err);
  await pool.end();
  process.exit(1);
});
