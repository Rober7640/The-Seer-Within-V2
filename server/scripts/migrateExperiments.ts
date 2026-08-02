// Additive, idempotent migration for the unified A/B experiment framework
// (PRD: docs/ab-testing-framework-prd.md §3). Mirrors migratePaywall.ts.
//
//   npx tsx server/scripts/migrateExperiments.ts            # create + seed
//   npx tsx server/scripts/migrateExperiments.ts --rollback # drop the new tables
//
// Creates `experiments` + `experiment_exposures` (+ indexes) and seeds the
// paywall test as a DISABLED (status='draft') experiment scoped to Evelyn —
// draft ⇒ assign() returns the control arm for everyone, so live UI is
// unchanged. To START: set the row's status='running' (ramp via variant weights).
//
// Additive + reversible: only CREATE ... IF NOT EXISTS / INSERT ... ON CONFLICT
// DO NOTHING here (safe to run repeatedly); --rollback DROPs ONLY these two
// experiment-only tables and touches nothing else (users, credit_purchases,
// system_config, paywall_views are all left intact).

import 'dotenv/config';
import pg from 'pg';

async function up(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'draft',
      subject_type text NOT NULL DEFAULT 'user',
      variants jsonb NOT NULL,
      scope jsonb,
      conversion jsonb,
      started_at timestamp,
      ended_at timestamp,
      winner_variant text,
      created_by varchar REFERENCES admin_users(id),
      updated_by varchar REFERENCES admin_users(id),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
  // Phase 4b — at most ONE running persona_prompt_* test per persona (the chat
  // resolver assumes a single active prompt test). A partial unique index on the
  // scoped persona makes this race-proof (the /start pre-check is just a nicer
  // error). Other experiment types are excluded by the key-prefix predicate.
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_running_persona_prompt_per_persona
       ON experiments ((scope->>'personaId'))
       WHERE status = 'running' AND left(key, 15) = 'persona_prompt_';`,
  );
  console.log('✓ experiments table + running-prompt uniqueness index ready');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiment_exposures (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      experiment_key text NOT NULL,
      subject_id text NOT NULL,
      variant text NOT NULL,
      surface text NOT NULL,
      context jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_experiment_exposures_key_subject ON experiment_exposures (experiment_key, subject_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_experiment_exposures_key_variant ON experiment_exposures (experiment_key, variant);`,
  );
  console.log('✓ experiment_exposures table + indexes ready');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiment_conversions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      experiment_key text NOT NULL,
      subject_id text NOT NULL,
      variant text NOT NULL,
      event text,
      value integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_experiment_conversions_key_subject ON experiment_conversions (experiment_key, subject_id);`,
  );
  console.log('✓ experiment_conversions table + index ready');

  // Seed the paywall test as a DRAFT experiment (Evelyn-scoped), mirroring the
  // existing disabled system_config.paywall_copy_experiment row.
  const evelyn = await pool.query(`SELECT id FROM personas WHERE slug = 'evelyn-cross' LIMIT 1`);
  const evelynId: string | undefined = evelyn.rows[0]?.id;
  if (!evelynId) {
    // Refuse to seed an UNSCOPED paywall experiment: scope {personaId:null} would
    // let assign() enrol every persona once started (Phase-1 is Evelyn-only). The
    // tables are already created above; just seed personas first, then re-run.
    throw new Error(
      "persona 'evelyn-cross' not found — run `npm run seed` first so the paywall experiment can be scoped to Evelyn. Tables were created; re-run this migration after seeding.",
    );
  }

  const variants = JSON.stringify([
    { key: 'A', weight: 50, payload: {} },
    { key: 'B', weight: 50, payload: {} },
  ]);
  const scope = JSON.stringify({ personaId: evelynId });
  const conversion = JSON.stringify({ type: 'credit_purchase', windowDays: 7 });

  const result = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('paywall_copy_2026', 'Paywall copy redesign (Problem 4)',
       'Variant B = redesigned minutes-led paywall. Phase 1: Evelyn only. To start, set status=running.',
       'draft', 'user', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [variants, scope, conversion],
  );
  if (result.rowCount && result.rowCount > 0) {
    console.log('✓ seeded DRAFT paywall experiment (Evelyn):', { variants, scope, conversion });
  } else {
    console.log('• paywall experiment already exists — left unchanged');
  }

  // Phase 3b — Upsell-1 price test ($47 control vs $37 treatment). Draft = OFF,
  // so the Upsell-1 price stays the legacy $47 until started from the dashboard.
  const u1Variants = JSON.stringify([
    { key: 'A', weight: 50, payload: { upsell1Cents: 4700 } },
    { key: 'B', weight: 50, payload: { upsell1Cents: 3700 } },
  ]);
  const u1Conversion = JSON.stringify({ type: 'upsell1_funnel' });
  const u1 = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('u1_price_2026', 'Upsell-1 price ($47 vs $37)',
       'Upsell-1 (Protection Ritual) price test. A=$47 (control, today), B=$37. Sticky per email; assigned at lead capture, stored on conversations.upsell1AmountCents. To start, set status=running.',
       'draft', 'email', $1::jsonb, NULL, $2::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [u1Variants, u1Conversion],
  );
  if (u1.rowCount && u1.rowCount > 0) {
    console.log('✓ seeded DRAFT Upsell-1 price experiment:', { u1Variants });
  } else {
    console.log('• u1_price_2026 experiment already exists — left unchanged');
  }

  // Phase 4a — a visitor page-copy test on the /soulmate lander CTA (event metric).
  // Draft = OFF, so useABTest returns the lander's default copy (control 'A').
  const cpVariants = JSON.stringify([
    { key: 'A', weight: 50, payload: { value: 'Yes, I want my Soulmate Drawing' } },
    { key: 'B', weight: 50, payload: { value: 'Reveal My Soulmate Now' } },
  ]);
  const cpScope = JSON.stringify({ route: 'soulmate_landing', element: 'cta' });
  const cpConversion = JSON.stringify({ type: 'event', name: 'lander_cta' });
  const cp = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('soulmate_landing_cta_2026', 'Soulmate lander CTA copy',
       'Visitor page-copy test on the /soulmate CTA button. A = current copy. Conversion = CTA click. To start, set status=running.',
       'draft', 'visitor', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [cpVariants, cpScope, cpConversion],
  );
  if (cp.rowCount && cp.rowCount > 0) {
    console.log('✓ seeded DRAFT page-copy experiment (soulmate CTA)');
  } else {
    console.log('• soulmate_landing_cta_2026 experiment already exists — left unchanged');
  }

  // Phase 4b — sticky per-user system-prompt A/B for Evelyn (live AI path). Draft
  // = OFF, so the chat engine uses Evelyn's base prompt for everyone. B ships as an
  // EMPTY placeholder: author the alternate prompt in payload.systemPrompt (the
  // dashboard variant editor) before starting — the start guard refuses to launch
  // a test whose treatment arm has no prompt (it would render identical to control).
  const ppVariants = JSON.stringify([
    { key: 'A', weight: 50, payload: {} },
    { key: 'B', weight: 50, payload: { systemPrompt: '' } },
  ]);
  const ppScope = JSON.stringify({ personaId: evelynId });
  const ppConversion = JSON.stringify({ type: 'credit_purchase', windowDays: 7 });
  const pp = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('persona_prompt_evelyn_2026', 'Evelyn system-prompt A/B',
       'Sticky per-user system-prompt test for Evelyn. A = current base prompt (control), B = author an alternate in payload.systemPrompt before starting. Conversion = credit_purchase (7d). To start, use Start in /admin/experiments (the start guard validates the arms + single-running-test-per-persona) — do NOT flip status=running by hand, which bypasses those checks.',
       'draft', 'user', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [ppVariants, ppScope, ppConversion],
  );
  if (pp.rowCount && pp.rowCount > 0) {
    console.log('✓ seeded DRAFT persona-prompt experiment (Evelyn)');
  } else {
    console.log('• persona_prompt_evelyn_2026 experiment already exists — left unchanged');
  }

  // Phase 4c — STRUCTURAL test on the /evelyn lander: which MECHANIC the visitor
  // sees. control 'chatbox' = the open 2-turn chat (today); 'quiz' = a 3-tap quiz
  // that hands off to the same signup. Visitor-cookie subject; primary metric =
  // signup (clean, pre-stitch). Draft = OFF ⇒ useABVariant returns the default
  // 'chatbox' ⇒ lander byte-identical. element='mechanic' is REQUIRED (the public
  // /api/ab/assign skips visitor tests with no scope.element).
  //
  // Third arm 'live_thread' (Live Thread plan, Task 12) ships DARK at weight 0.
  // A zero-weight arm is never assigned by pickVariant (server/lib/experiments.ts:
  // 67-77 — it sums only positive weights and a bucket of at most 99 can never
  // reach the running total), so the arm exists to be configured but reaches no
  // visitor until an operator raises its weight in /admin/experiments. It is
  // listed LAST deliberately: pickVariant walks weights in listed order, so
  // appending a zero-weight arm leaves every existing bucket→arm mapping
  // untouched.
  const lmVariants = JSON.stringify([
    { key: 'chatbox', weight: 50, payload: {} },
    { key: 'quiz', weight: 50, payload: {} },
    { key: 'live_thread', weight: 0, payload: {} },
  ]);
  const lmScope = JSON.stringify({ route: 'evelyn_lander', element: 'mechanic' });
  const lmConversion = JSON.stringify({ type: 'event', name: 'signup' });
  const lm = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('evelyn_lander_mechanic', 'Evelyn lander mechanic (chatbox vs quiz vs live thread)',
       'Structural A/B on /evelyn: control chatbox (open chat) vs quiz (3-tap) vs live_thread (email arrival thread, seeded at weight 0 = dark). Primary metric = signup. Visitor-cookie subject. To start, set status=running; to expose live_thread, give it a positive weight in the variant editor first.',
       'draft', 'visitor', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [lmVariants, lmScope, lmConversion],
  );
  if (lm.rowCount && lm.rowCount > 0) {
    console.log('✓ seeded DRAFT lander-mechanic experiment (Evelyn quiz vs chatbox vs live_thread)');
  } else {
    // The row predates the Live Thread arm on every environment that has run this
    // script before, and ON CONFLICT DO NOTHING above will never update it — so
    // the arm has to be back-filled explicitly or `live_thread` would exist only
    // in code and be un-selectable in /admin/experiments forever.
    //
    // Safe to run against a RUNNING test: appending a weight-0 arm at the end of
    // the list changes neither the positive-weight total nor the order the
    // buckets are walked in, so no already-assigned visitor moves arms. Guarded
    // by a containment check so re-runs are idempotent and an operator's own
    // weight change is never stomped back to 0.
    const lmBackfill = await pool.query(
      `UPDATE experiments
          SET variants = variants || '[{"key":"live_thread","weight":0,"payload":{}}]'::jsonb,
              updated_at = now()
        WHERE key = 'evelyn_lander_mechanic'
          AND jsonb_typeof(variants) = 'array'
          AND NOT (variants @> '[{"key":"live_thread"}]'::jsonb)`,
    );
    if (lmBackfill.rowCount && lmBackfill.rowCount > 0) {
      console.log('✓ evelyn_lander_mechanic existed — appended DARK live_thread arm (weight 0)');
    } else {
      console.log('• evelyn_lander_mechanic experiment already exists — left unchanged');
    }
  }

  // Phase 3b-rest — V1 MAIN/downsell price test on the framework. Draft = OFF, so the
  // legacy system_config.v1_price_variants splits keep running byte-identical. It folds
  // into priceVariant.assignVariantIfMissing as a GATED OVERRIDE over pickWeighted.
  // scope is null here: SET scope.funnel (e.g. 'v1-fb') in the dashboard before
  // starting — the start guard refuses a v1_main_funnel test with no funnel (it would
  // override every funnel's price). A=$35/$25 (control), B=$45/$32.
  const vmVariants = JSON.stringify([
    { key: 'A', weight: 50, payload: { mainCents: 3500, downsellCents: 2500 } },
    { key: 'B', weight: 50, payload: { mainCents: 4500, downsellCents: 3200 } },
  ]);
  const vmConversion = JSON.stringify({ type: 'v1_main_funnel' });
  const vm = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('v1_main_price_2026', 'V1 main price ($35/$25 vs $45/$32)',
       'V1 main+downsell price test. A=$35/$25 (control), B=$45/$32. Sticky per email; folded into priceVariant.assignVariantIfMissing as a gated override over the legacy system_config split. SET scope.funnel (e.g. v1-fb) before starting — it overrides that ONE funnel only. To start, set status=running.',
       'draft', 'email', $1::jsonb, NULL, $2::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [vmVariants, vmConversion],
  );
  if (vm.rowCount && vm.rowCount > 0) {
    console.log('✓ seeded DRAFT V1 main price experiment');
  } else {
    console.log('• v1_main_price_2026 experiment already exists — left unchanged');
  }

  // fb-palm COMMITMENT GATE — the 3-checkbox commitment card that replaces the
  // purchase button on arm B. UI ONLY: both arms keep the visitor's existing
  // price, so this is a straight conversion-rate read, not a price test (that is
  // why the arms carry no cents payload — only v1_main_price_2026's arms do).
  //
  // scope.funnel is PRE-SET to 'v1-palm' (unlike the price test above, whose
  // funnel is a live choice) because this test is defined as "every fb-palm
  // lander" — Joel, 2026-07-27: "I say in all FB-palm pages". No scope.sign, so it
  // runs on thumb, thumb-angle, hand-size, finger-shape and every other sign.
  //
  // Draft = OFF: assign() returns the control arm for everyone and never logs an
  // exposure, so shipping this code shows the gate to NOBODY. Starting it is a
  // separate, reversible decision made in /admin/experiments.
  //
  // targetN = 1200 exposures PER ARM before the verdict unhides. Live fb-palm runs
  // ~1720 new + ~519 returning sessions per 6 days, so the 70/30 split reaches
  // that on the treatment arm in roughly 2-3 weeks — deliberately pre-registered
  // so nobody calls the test at n=40 the way the sliding close was read.
  const gateVariants = JSON.stringify([
    { key: 'A', weight: 70, payload: {} },
    { key: 'B', weight: 30, payload: { gate: true } },
  ]);
  const gateScope = JSON.stringify({ funnel: 'v1-palm' });
  const gateConversion = JSON.stringify({ type: 'v1_main_funnel', targetN: 1200 });
  const gate = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('v1_palm_commitment_gate_2026', 'fb-palm commitment gate (3 checkboxes before the buy button)',
       'UI-only A/B on EVERY fb-palm lander. A=control, today''s purchase button (70%). B=commitment gate (30%): three checkboxes render in place of the button and the button does not exist in the DOM until all three are ticked — no fallback, no timeout, that is the point of the test. Identical price on both arms, so this is a pure conversion-rate read. Subject = email hash, so returning visitors are re-split across BOTH arms (a price-pool arm could never draw them, which would have inflated the control with 57% of all palm buyers). Measured on confirmed main/downsell purchase + revenue. To start, set status=running.',
       'draft', 'email', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [gateVariants, gateScope, gateConversion],
  );
  if (gate.rowCount && gate.rowCount > 0) {
    console.log('✓ seeded DRAFT fb-palm commitment gate experiment (70/30, every sign)');
  } else {
    console.log('• v1_palm_commitment_gate_2026 experiment already exists — left unchanged');
  }

  // V1 PROMPT A/B — clearing-theme rewrite (control vs woven), fb-palm ONLY.
  // STRUCTURAL/prompt test: the arm KEY drives prompt+copy branches in
  // prompts.ts (buildShadowSummaryPrompt / buildValueExplainPrompt) and the
  // client pitch (useConversation.handlePermission). Visitor-cookie subject;
  // scope.route='v1_chat_palm' — only fb-palm chat calls /api/ab/assign for that
  // page, so it is naturally funnel-scoped without a scope.funnel. element is
  // REQUIRED. Draft = OFF ⇒ /api/ab/assign returns no arm ⇒ promptVariant stays
  // undefined ⇒ control ⇒ byte-identical. Primary metric = purchase (fired
  // client-side from /welcome1, same session so ab_vid is present).
  const clrVariants = JSON.stringify([
    { key: 'control', weight: 50, payload: {} },
    { key: 'woven', weight: 50, payload: {} },
  ]);
  const clrScope = JSON.stringify({ route: 'v1_chat_palm', element: 'clearing' });
  const clrConversion = JSON.stringify({ type: 'event', name: 'purchase' });
  const clr = await pool.query(
    `INSERT INTO experiments (key, name, description, status, subject_type, variants, scope, conversion)
     VALUES ('v1_clearing_theme_palm_2026', 'V1 clearing-theme prompt (control vs woven) — fb-palm',
       'V1 prompt A/B on fb-palm. control = today''s flow; woven = the clearing theme threaded through shadowSummary + valueExplain + the pitch (see improve-v1/08,09). Visitor-cookie subject; scope.route=v1_chat_palm (fb-palm only). The arm key drives the prompt/copy branch (no payload). Primary metric = purchase (fired from /welcome1). Preview without enrolling: /fb-palm/c?hook=soulmate-timing&thumb=a&clearing=woven. To start, set status=running.',
       'draft', 'visitor', $1::jsonb, $2::jsonb, $3::jsonb)
     ON CONFLICT (key) DO NOTHING
     RETURNING id`,
    [clrVariants, clrScope, clrConversion],
  );
  if (clr.rowCount && clr.rowCount > 0) {
    console.log('✓ seeded DRAFT V1 clearing-theme prompt experiment (fb-palm)');
  } else {
    console.log('• v1_clearing_theme_palm_2026 experiment already exists — left unchanged');
  }
}

async function down(pool: pg.Pool) {
  // Experiment-only tables: dropping them removes no other data.
  await pool.query(`DROP TABLE IF EXISTS experiment_conversions;`);
  await pool.query(`DROP TABLE IF EXISTS experiment_exposures;`);
  await pool.query(`DROP TABLE IF EXISTS experiments;`);
  console.log('✓ dropped experiment_conversions + experiment_exposures + experiments (rollback)');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const rollback = process.argv.includes('--rollback');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  if (rollback) {
    await down(pool);
  } else {
    await up(pool);
  }
  await pool.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('migrateExperiments failed:', err);
  process.exit(1);
});
