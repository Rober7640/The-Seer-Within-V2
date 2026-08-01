/**
 * Schema smoke test for The Live Thread's Task 1: verifies the migration and
 * the Drizzle schema actually agree with the real database, not just with
 * each other. Queries information_schema directly instead of re-reading the
 * Drizzle table objects, so a schema.ts edit that was never pushed/migrated
 * would fail this test.
 */
import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../server/lib/db';
import { assertLocalDb } from '../server/lib/testGuards';

assertLocalDb();

after(async () => {
  await pool.end();
});

describe('email_link_codes table', () => {
  it('has the expected columns and types', async () => {
    const { rows } = await pool.query(
      `select column_name, data_type, is_nullable, column_default
       from information_schema.columns
       where table_name = 'email_link_codes'`
    );
    const byName = Object.fromEntries(rows.map((r) => [r.column_name, r]));

    assert.equal(rows.length, 7, `expected 7 columns, found ${rows.length}: ${rows.map((r) => r.column_name).join(', ')}`);

    assert.equal(byName.code?.data_type, 'character varying');
    assert.equal(byName.code?.is_nullable, 'NO');

    assert.equal(byName.persona_slug?.data_type, 'text');
    assert.equal(byName.persona_slug?.is_nullable, 'NO');

    assert.equal(byName.campaign?.data_type, 'text');
    assert.equal(byName.campaign?.is_nullable, 'NO');

    assert.equal(byName.reading_recap?.data_type, 'text');
    assert.equal(byName.reading_recap?.is_nullable, 'YES');

    assert.equal(byName.open_loop?.data_type, 'text');
    assert.equal(byName.open_loop?.is_nullable, 'YES');

    assert.equal(byName.continue_seed?.data_type, 'text');
    assert.equal(byName.continue_seed?.is_nullable, 'NO');

    assert.equal(byName.created_at?.data_type, 'timestamp without time zone');
    assert.equal(byName.created_at?.is_nullable, 'NO');
  });

  it('has code as its primary key', async () => {
    const { rows } = await pool.query(
      `select kcu.column_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on tc.constraint_name = kcu.constraint_name
        and tc.table_schema = kcu.table_schema
       where tc.table_name = 'email_link_codes'
         and tc.constraint_type = 'PRIMARY KEY'`
    );
    assert.deepEqual(rows.map((r) => r.column_name), ['code']);
  });

  it('has the campaign index', async () => {
    const { rows } = await pool.query(
      `select indexname from pg_indexes
       where tablename = 'email_link_codes' and indexname = 'idx_email_link_codes_campaign'`
    );
    assert.equal(rows.length, 1);
  });
});

describe('evelyn_lander_sessions.pending_reply column', () => {
  it('exists as a nullable text column', async () => {
    const { rows } = await pool.query(
      `select data_type, is_nullable
       from information_schema.columns
       where table_name = 'evelyn_lander_sessions' and column_name = 'pending_reply'`
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data_type, 'text');
    assert.equal(rows[0].is_nullable, 'YES');
  });
});
