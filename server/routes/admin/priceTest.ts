// V1 price split test analytics
// Aggregates per-variant performance + pairwise z-test on revenue per visitor.

import { Router, Request, Response } from 'express';
import { db } from '../../lib/db';
import { conversations } from '@shared/schema';
import { sql, and, gte, lte, isNotNull } from 'drizzle-orm';
import logger from '../../lib/logger';
import { getActiveVariants } from '../../lib/priceVariant';

const router = Router();

interface VariantStats {
  variant: string;
  mainPriceDollars: number;
  downsellPriceDollars: number;
  visitorsAssigned: number;
  mainPurchases: number;
  downsellPurchases: number;
  totalPurchases: number;
  mainConversionPct: number;
  downsellConversionPct: number;
  overallConversionPct: number;
  totalRevenueCents: number;
  revenuePerVisitorCents: number;
}

interface PairwiseRow {
  a: string;
  b: string;
  revenuePerVisitorACents: number;
  revenuePerVisitorBCents: number;
  confidencePct: number | null;
  significant: boolean;
  note?: string;
}

const MIN_SAMPLE_PER_VARIANT = 100;
const SIGNIFICANCE_THRESHOLD = 95;

// Standard normal CDF (Abramowitz & Stegun 26.2.17 approximation).
// Used to convert a z-score to a one-tailed confidence percentage.
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absZ);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-absZ * absZ);
  return 0.5 * (1 + sign * y);
}

router.get('/v1', async (req: Request, res: Response) => {
  try {
    // Optional date range filter — applied against conversations.created_at.
    // Empty params = all-time (the default). Both inclusive.
    const startParam = typeof req.query.startDate === 'string' ? req.query.startDate : null;
    const endParam = typeof req.query.endDate === 'string' ? req.query.endDate : null;
    const startDate = startParam ? new Date(startParam) : null;
    const endDate = endParam ? new Date(endParam) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999); // make end-of-day inclusive

    // Build the date-range WHERE fragment cleanly. Drizzle's tagged
    // template doesn't always interpolate conditional empty `sql\`\``
    // fragments correctly, so assemble explicitly.
    // Build WHERE clause with Drizzle operators so date binding is handled
    // identically to the rest of the codebase.
    const whereClauses = [isNotNull(conversations.priceVariant)];
    if (startDate) whereClauses.push(gte(conversations.createdAt, startDate));
    if (endDate) whereClauses.push(lte(conversations.createdAt, endDate));

    // Per-variant aggregate from conversations table.
    //
    // IMPORTANT: `purchased = true` is set *optimistically* at /api/checkout
    // (the moment the user clicks the button, BEFORE Stripe confirms payment).
    // The reliable "payment actually completed" signal is `upsell_offered = true`,
    // which only flips after /welcome1 verifies `stripeSession.payment_status === "paid"`.
    // We require BOTH to count a purchase, so abandoned-cart visitors are not
    // counted as buyers in this dashboard.
    const confirmedPurchase = sql`${conversations.purchased} = true AND ${conversations.upsellOffered} = true`;

    const aggregateRows = await db
      .select({
        price_variant: conversations.priceVariant,
        visitors_assigned: sql<number>`COUNT(*)::int`,
        main_purchases: sql<number>`COUNT(*) FILTER (WHERE ${confirmedPurchase} AND ${conversations.purchaseType} = 'main')::int`,
        downsell_purchases: sql<number>`COUNT(*) FILTER (WHERE ${confirmedPurchase} AND ${conversations.purchaseType} = 'downsell')::int`,
        total_revenue_cents: sql<number>`COALESCE(SUM(${conversations.mainPurchaseAmount}) FILTER (WHERE ${confirmedPurchase}), 0)::int`,
        sum_sq_revenue_cents: sql<number>`COALESCE(SUM(POWER(${conversations.mainPurchaseAmount}, 2)) FILTER (WHERE ${confirmedPurchase}), 0)::float`,
      })
      .from(conversations)
      .where(and(...whereClauses))
      .groupBy(conversations.priceVariant);

    const aggregateRowsResult = {
      rows: aggregateRows.map((r) => ({
        price_variant: r.price_variant ?? '',
        visitors_assigned: Number(r.visitors_assigned) || 0,
        main_purchases: Number(r.main_purchases) || 0,
        downsell_purchases: Number(r.downsell_purchases) || 0,
        total_revenue_cents: Number(r.total_revenue_cents) || 0,
        sum_sq_revenue_cents: Number(r.sum_sq_revenue_cents) || 0,
      })),
    };

    const activeVariants = await getActiveVariants();
    const priceLookup = new Map(activeVariants.map((v) => [v.id, v]));

    const statsByVariant = new Map<string, VariantStats & { sumSqRevenueCents: number }>();
    for (const row of aggregateRowsResult.rows) {
      const cfg = priceLookup.get(row.price_variant);
      const visitors = row.visitors_assigned;
      const total = row.main_purchases + row.downsell_purchases;
      statsByVariant.set(row.price_variant, {
        variant: row.price_variant,
        mainPriceDollars: cfg ? Math.round(cfg.priceCents / 100) : 0,
        downsellPriceDollars: cfg ? Math.round(cfg.downsellCents / 100) : 0,
        visitorsAssigned: visitors,
        mainPurchases: row.main_purchases,
        downsellPurchases: row.downsell_purchases,
        totalPurchases: total,
        mainConversionPct: visitors ? +((row.main_purchases / visitors) * 100).toFixed(2) : 0,
        downsellConversionPct: visitors ? +((row.downsell_purchases / visitors) * 100).toFixed(2) : 0,
        overallConversionPct: visitors ? +((total / visitors) * 100).toFixed(2) : 0,
        totalRevenueCents: row.total_revenue_cents,
        revenuePerVisitorCents: visitors ? Math.round(row.total_revenue_cents / visitors) : 0,
        sumSqRevenueCents: row.sum_sq_revenue_cents,
      });
    }

    // Ensure all currently-configured variants appear in the table even with zero data.
    for (const cfg of activeVariants) {
      if (!statsByVariant.has(cfg.id)) {
        statsByVariant.set(cfg.id, {
          variant: cfg.id,
          mainPriceDollars: Math.round(cfg.priceCents / 100),
          downsellPriceDollars: Math.round(cfg.downsellCents / 100),
          visitorsAssigned: 0,
          mainPurchases: 0,
          downsellPurchases: 0,
          totalPurchases: 0,
          mainConversionPct: 0,
          downsellConversionPct: 0,
          overallConversionPct: 0,
          totalRevenueCents: 0,
          revenuePerVisitorCents: 0,
          sumSqRevenueCents: 0,
        });
      }
    }

    const variantStats = Array.from(statsByVariant.values()).sort((a, b) =>
      a.variant.localeCompare(b.variant),
    );

    // Pairwise z-test on revenue per visitor.
    // Treat each visitor's revenue (0 if no purchase) as a continuous variable.
    // mean_i = total_revenue_i / n_i, var_i = (sum_sq_i - n_i * mean_i^2) / (n_i - 1).
    const pairwise: PairwiseRow[] = [];
    for (let i = 0; i < variantStats.length; i++) {
      for (let j = i + 1; j < variantStats.length; j++) {
        const a = variantStats[i];
        const b = variantStats[j];
        const meanA = a.visitorsAssigned ? a.totalRevenueCents / a.visitorsAssigned : 0;
        const meanB = b.visitorsAssigned ? b.totalRevenueCents / b.visitorsAssigned : 0;
        const varA =
          a.visitorsAssigned > 1
            ? Math.max(
                0,
                (a.sumSqRevenueCents - a.visitorsAssigned * meanA * meanA) / (a.visitorsAssigned - 1),
              )
            : 0;
        const varB =
          b.visitorsAssigned > 1
            ? Math.max(
                0,
                (b.sumSqRevenueCents - b.visitorsAssigned * meanB * meanB) / (b.visitorsAssigned - 1),
              )
            : 0;
        const seSquared =
          (a.visitorsAssigned ? varA / a.visitorsAssigned : 0) +
          (b.visitorsAssigned ? varB / b.visitorsAssigned : 0);

        const higher = meanA >= meanB ? a : b;
        const lower = meanA >= meanB ? b : a;

        let confidencePct: number | null = null;
        let note: string | undefined;
        if (seSquared <= 0 || higher.visitorsAssigned === 0 || lower.visitorsAssigned === 0) {
          note = 'insufficient data';
        } else {
          const z = Math.abs(meanA - meanB) / Math.sqrt(seSquared);
          confidencePct = +(normalCdf(z) * 100).toFixed(1);
        }

        const sampleAdequate =
          higher.visitorsAssigned >= MIN_SAMPLE_PER_VARIANT &&
          lower.visitorsAssigned >= MIN_SAMPLE_PER_VARIANT;
        const significant =
          confidencePct !== null && confidencePct >= SIGNIFICANCE_THRESHOLD && sampleAdequate;

        pairwise.push({
          a: higher.variant,
          b: lower.variant,
          revenuePerVisitorACents: Math.round(meanA >= meanB ? meanA : meanB),
          revenuePerVisitorBCents: Math.round(meanA >= meanB ? meanB : meanA),
          confidencePct,
          significant,
          note,
        });
      }
    }

    // Recommendation banner — pick the leader, summarise vs the lowest.
    const sortedByRpv = [...variantStats].sort(
      (a, b) => b.revenuePerVisitorCents - a.revenuePerVisitorCents,
    );
    const leader = sortedByRpv[0];
    const trailing = sortedByRpv[sortedByRpv.length - 1];
    const minVisitors = Math.min(...variantStats.map((v) => v.visitorsAssigned));
    const minimumSampleMet = variantStats.every((v) => v.visitorsAssigned >= MIN_SAMPLE_PER_VARIANT);

    const winnerCalled = pairwise.some(
      (p) => p.a === leader?.variant && p.significant,
    );

    let recommendation = '';
    if (!leader || leader.visitorsAssigned === 0) {
      recommendation = 'No variant data yet — insert the v1_price_variants config row and start sending traffic.';
    } else if (!minimumSampleMet) {
      recommendation = `Not enough data yet — smallest variant has ${minVisitors} visitors, need ${MIN_SAMPLE_PER_VARIANT} per variant before trusting the numbers.`;
    } else {
      const leaderPair = pairwise.find((p) => p.a === leader.variant);
      const conf = leaderPair?.confidencePct ?? 0;
      if (winnerCalled) {
        recommendation = `Variant ${leader.variant} wins at $${(leader.revenuePerVisitorCents / 100).toFixed(2)}/visitor — ${conf}% confidence vs ${trailing.variant}. Safe to call it.`;
      } else {
        recommendation = `Variant ${leader.variant} leads at $${(leader.revenuePerVisitorCents / 100).toFixed(2)}/visitor. ${conf}% confidence vs ${trailing.variant}. Keep running — aim for ${SIGNIFICANCE_THRESHOLD}%+.`;
      }
    }

    return res.json({
      summary: {
        leadingVariant: leader?.variant ?? null,
        recommendation,
        minimumSampleMet,
        minimumSamplePerVariant: MIN_SAMPLE_PER_VARIANT,
        winnerCalled,
      },
      dateRange: {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      },
      variants: variantStats.map(({ sumSqRevenueCents, ...rest }) => rest),
      pairwise,
    });
  } catch (error) {
    logger.error('Price test analytics error:', error);
    return res.status(500).json({ error: 'Price test analytics failed' });
  }
});

export default router;
