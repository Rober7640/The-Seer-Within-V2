// Smoke test for the reframe-deck renderer's /e/:code minting (Live Thread Task 13).
//
// Runs the REAL script as a subprocess over fixture drafts in a temp directory,
// then asserts on what an operator actually consumes: index.json, the rendered
// HTML/text CTA, and the email_link_codes row the link resolves to.
//
// Deliberately NOT unit tests of parse()/bodyHtml() — render-aweber.mjs has no
// exports, and the behaviour worth pinning here is exactly the part with a
// side effect: which drafts mint, what they mint, and what a re-run does.
//
// Run with:  npm run test:local docs/aweber/evelyn-reframe-deck/scripts/render-aweber.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inArray } from 'drizzle-orm';
import { db, pool } from '../../../../server/lib/db';
import { emailLinkCodes } from '@shared/schema';
import { assertLocalDb } from '../../../../server/lib/testGuards';

// Module scope, per the house convention: a missing/production DATABASE_URL
// must blow up before any row is created, not partway through.
assertLocalDb();

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPTS_DIR, '../../../..');
const RENDERER = path.join(SCRIPTS_DIR, 'render-aweber.mjs');
const TSX = path.join(REPO_ROOT, 'node_modules/.bin/tsx');

// Unique per run so a crashed run can never collide with the next one.
const STAMP = String(Date.now());
const SEEDED_SLUG = `render-test-${STAMP}-seeded`;
const BARE_SLUG = `render-test-${STAMP}-bare`;

const SEED_V1 = 'You came — good. Tell me the line you keep saying.';
const SEED_V2 = 'You came back — good. Tell me the line again, slower.';
const OPEN_LOOP = 'You asked them to name the sentence they repeat.';
const READING_RECAP = 'You wrote to them about a sentence said twice being a flinch, not a preference.';

function draft(opts: {
  num: string;
  slug: string;
  continueSeed?: string;
  openLoop?: string;
  readingRecap?: string;
}) {
  const continuity = [
    opts.readingRecap ? `- **Reading Recap:** ${opts.readingRecap}` : null,
    opts.openLoop ? `- **Open Loop:** ${opts.openLoop}` : null,
    opts.continueSeed ? `- **Continue Seed:** ${opts.continueSeed}` : null,
  ].filter(Boolean).join('\n');

  return `# ${opts.num} · Fixture

- **Subject:** \`A fixture subject\`
- **Preheader:** A fixture preheader.
- **CTA:** Come talk to me → \`campaign=${opts.slug}\`
${continuity}

---

A first paragraph, dear.

> **↳ THE REFRAME.** The fixture reframe.

**→ Come talk to me**

— Evelyn
`;
}

/** Write a fresh fixture directory. Returns its path. */
function makeSendsDir(seed: string | undefined): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reframe-render-test-'));
  fs.writeFileSync(
    path.join(dir, '01-seeded.md'),
    draft({ num: '01', slug: SEEDED_SLUG, continueSeed: seed, openLoop: OPEN_LOOP, readingRecap: READING_RECAP }),
  );
  fs.writeFileSync(path.join(dir, '02-bare.md'), draft({ num: '02', slug: BARE_SLUG }));
  fs.writeFileSync(path.join(dir, 'schedule.json'), JSON.stringify({ '01': '2026-09-01T10:30:00+00:00' }));
  tempDirs.push(dir);
  return dir;
}

const tempDirs: string[] = [];

interface IndexEntry {
  num: string;
  slug: string;
  link_kind: 'short' | 'legacy';
  code: string | null;
  cta_url: string;
  html_file: string;
  text_file: string;
}

function render(sendsDir: string, env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(TSX, [RENDERER, sendsDir], {
    cwd: SCRIPTS_DIR, // tsx resolves the repo tsconfig (and its @shared/* paths) from cwd
    encoding: 'utf8',
    env,
  });
  return result;
}

function readIndex(sendsDir: string): IndexEntry[] {
  return JSON.parse(fs.readFileSync(path.join(sendsDir, '_build', 'index.json'), 'utf8'));
}

after(async () => {
  // Delete exactly what we created: the rows for these two fixture campaigns.
  await db.delete(emailLinkCodes).where(inArray(emailLinkCodes.campaign, [SEEDED_SLUG, BARE_SLUG]));
  await pool.end();
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('render-aweber.mjs → /e/:code minting', () => {
  let sendsDir: string;
  let firstCode: string;

  before(() => {
    sendsDir = makeSendsDir(SEED_V1);
  });

  it('mints a code for a draft with a Continue Seed and points its CTA at /e/<code>', () => {
    const run = render(sendsDir);
    assert.equal(run.status, 0, `renderer failed:\n${run.stdout}\n${run.stderr}`);

    const index = readIndex(sendsDir);
    const seeded = index.find((e) => e.slug === SEEDED_SLUG)!;
    assert.ok(seeded, 'seeded draft missing from index.json');
    assert.equal(seeded.link_kind, 'short');
    assert.match(seeded.code!, /^[A-Za-z0-9_-]{7}$/);
    firstCode = seeded.code!;

    assert.equal(seeded.cta_url, `https://www.theseerwithin.com/e/${firstCode}?email={!email}`);

    // The link an actual subscriber clicks, in both bodies AWeber sends.
    const html = fs.readFileSync(path.join(sendsDir, '_build', seeded.html_file), 'utf8');
    assert.ok(
      html.includes(`href="https://www.theseerwithin.com/e/${firstCode}?email={!email}"`),
      'rendered HTML CTA does not point at the minted short link',
    );
    assert.ok(!html.includes('/evelyn?email='), 'rendered HTML still contains the legacy ?campaign= link');

    const text = fs.readFileSync(path.join(sendsDir, '_build', seeded.text_file), 'utf8');
    assert.ok(text.includes(`https://www.theseerwithin.com/e/${firstCode}?email={!email}`));
  });

  it('stores the authored continuity content on the minted row', async () => {
    const rows = await db.select().from(emailLinkCodes).where(inArray(emailLinkCodes.code, [firstCode]));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].personaSlug, 'evelyn-cross');
    assert.equal(rows[0].campaign, SEEDED_SLUG);
    assert.equal(rows[0].continueSeed, SEED_V1);
    assert.equal(rows[0].openLoop, OPEN_LOOP);
    assert.equal(rows[0].readingRecap, READING_RECAP);
  });

  it('leaves a draft without a Continue Seed on the legacy ?campaign= link, and says so', () => {
    const index = readIndex(sendsDir);
    const bare = index.find((e) => e.slug === BARE_SLUG)!;
    assert.equal(bare.link_kind, 'legacy');
    assert.equal(bare.code, null);
    assert.ok(bare.cta_url.includes(`/evelyn?email={!email}`));
    assert.ok(bare.cta_url.includes(`campaign=${BARE_SLUG}`));

    const run = render(sendsDir);
    assert.ok(
      run.stderr.includes('no **Continue Seed:**') && run.stderr.includes('02-bare.md'),
      `expected a loud warning naming the seedless draft; got:\n${run.stderr}`,
    );
  });

  it('is idempotent per campaign: a re-run reuses the same code, it does not mint a second row', async () => {
    const run = render(sendsDir);
    assert.equal(run.status, 0, run.stderr);
    assert.ok(run.stderr.includes(`reused  /e/${firstCode}`), `expected a 'reused' line; got:\n${run.stderr}`);

    const index = readIndex(sendsDir);
    assert.equal(index.find((e) => e.slug === SEEDED_SLUG)!.code, firstCode);

    const rows = await db.select().from(emailLinkCodes).where(inArray(emailLinkCodes.campaign, [SEEDED_SLUG]));
    assert.equal(rows.length, 1, 'a re-run minted a duplicate row for the same campaign');
  });

  it('refreshes the content in place when the draft is edited — the already-published URL keeps working', async () => {
    const edited = makeSendsDir(SEED_V2);
    const run = render(edited);
    assert.equal(run.status, 0, run.stderr);
    assert.ok(run.stderr.includes(`updated /e/${firstCode}`), `expected an 'updated' line; got:\n${run.stderr}`);

    const rows = await db.select().from(emailLinkCodes).where(inArray(emailLinkCodes.campaign, [SEEDED_SLUG]));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].code, firstCode, 'editing a draft must not change the URL already in a scheduled email');
    assert.equal(rows[0].continueSeed, SEED_V2);
  });

  it('refuses to run without DATABASE_URL rather than guessing a database', () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const run = render(sendsDir, env);
    assert.equal(run.status, 1);
    assert.ok(run.stderr.includes('DATABASE_URL is not set'), run.stderr);
    // Nothing was written on the aborted run — not even the _build/ directory.
    assert.ok(!run.stdout.includes('rendered'), 'renderer wrote output despite an unset DATABASE_URL');
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'reframe-render-test-'));
    tempDirs.push(fresh);
    fs.writeFileSync(
      path.join(fresh, '01-seeded.md'),
      draft({ num: '01', slug: SEEDED_SLUG, continueSeed: SEED_V1 }),
    );
    assert.equal(render(fresh, env).status, 1);
    assert.ok(!fs.existsSync(path.join(fresh, '_build')), 'aborted run still created _build/');
  });

  it('names the missing migration when email_link_codes does not exist in the target DB', () => {
    // The state production is in today: migration 020 written but unapplied.
    // Same local server and credentials, but the `postgres` maintenance
    // database — which exists on any PG install and has none of our tables.
    const target = new URL(process.env.DATABASE_URL!);
    target.pathname = '/postgres';
    const env = { ...process.env, DATABASE_URL: target.toString() };
    const run = render(sendsDir, env);
    assert.equal(run.status, 1);
    assert.ok(run.stderr.includes('email_link_codes table does not exist'), run.stderr);
    assert.ok(run.stderr.includes('020_email_link_codes.sql'), run.stderr);
  });

  it('needs no database at all when no draft has a Continue Seed', () => {
    const bareOnly = fs.mkdtempSync(path.join(os.tmpdir(), 'reframe-render-test-'));
    tempDirs.push(bareOnly);
    fs.writeFileSync(path.join(bareOnly, '02-bare.md'), draft({ num: '02', slug: BARE_SLUG }));

    const env = { ...process.env };
    delete env.DATABASE_URL;
    const run = render(bareOnly, env);
    assert.equal(run.status, 0, `renderer should still work with no DB when nothing needs a code:\n${run.stderr}`);
    assert.equal(readIndex(bareOnly)[0].link_kind, 'legacy');
  });
});
