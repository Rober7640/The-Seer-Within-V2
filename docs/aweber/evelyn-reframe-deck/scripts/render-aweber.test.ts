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
  /** Extra continuation line after the Continue Seed, to fake a wrapped value. */
  seedWrapTail?: string;
}) {
  const continuity = [
    opts.readingRecap ? `- **Reading Recap:** ${opts.readingRecap}` : null,
    opts.openLoop ? `- **Open Loop:** ${opts.openLoop}` : null,
    opts.continueSeed ? `- **Continue Seed:** ${opts.continueSeed}` : null,
    opts.seedWrapTail ?? null,
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

const tempDirs: string[] = [];

function newTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reframe-render-test-'));
  tempDirs.push(dir);
  return dir;
}

/** Write a fresh fixture directory: one seeded draft, one bare. */
function makeSendsDir(seed: string | undefined, shortLinks?: string[]): string {
  const dir = newTempDir();
  fs.writeFileSync(
    path.join(dir, '01-seeded.md'),
    draft({ num: '01', slug: SEEDED_SLUG, continueSeed: seed, openLoop: OPEN_LOOP, readingRecap: READING_RECAP }),
  );
  fs.writeFileSync(path.join(dir, '02-bare.md'), draft({ num: '02', slug: BARE_SLUG }));
  fs.writeFileSync(path.join(dir, 'schedule.json'), JSON.stringify({ '01': '2026-09-01T10:30:00+00:00' }));
  if (shortLinks) fs.writeFileSync(path.join(dir, 'short-links.json'), JSON.stringify(shortLinks));
  return dir;
}

interface IndexEntry {
  num: string;
  slug: string;
  link_kind: 'short' | 'legacy';
  code: string | null;
  cta_url: string;
  minted_into: string | null;
  html_file: string;
  text_file: string;
}

function render(sendsDir: string, env: NodeJS.ProcessEnv = process.env, flags: string[] = []) {
  const result = spawnSync(TSX, [RENDERER, sendsDir, ...flags], {
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
    // The lander context the legacy query string used to carry. `bucket` is
    // load-bearing (Drip 1's bucket-specific phrase); without it on the row
    // the /e/ redirector cannot rebuild it and every signup gets generic copy.
    assert.equal(rows[0].bucket, 'love');
    assert.equal(rows[0].src, 'aweber');
  });

  it('prints the database it minted into, and stamps it into index.json', () => {
    // The only operator-facing signal about where the codes actually went.
    const run = render(sendsDir);
    assert.match(run.stderr, /⚑ minting \/e\/ codes into database "seer_local" @ localhost/);

    const seeded = readIndex(sendsDir).find((e) => e.slug === SEEDED_SLUG)!;
    assert.equal(seeded.minted_into, 'seer_local@localhost');
    // Legacy sends have no code, so no mint target to record.
    assert.equal(readIndex(sendsDir).find((e) => e.slug === BARE_SLUG)!.minted_into, null);
  });

  it('refuses a non-local database unless --mint-production is passed', () => {
    // Never actually reached: the gate runs before the first connection.
    const env = { ...process.env, DATABASE_URL: 'postgresql://u:p@db.invalid.example:5432/prod' };

    const blocked = render(sendsDir, env);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /refusing to mint \/e\/ codes into a non-local database/);
    assert.match(blocked.stderr, /--mint-production/);

    // With the flag the gate lets it through — it then fails on the (fake)
    // host, which is what proves the gate itself was the thing blocking it.
    const allowed = render(sendsDir, env, ['--mint-production']);
    assert.match(allowed.stderr, /⚑ minting \/e\/ codes into database "prod" @ db\.invalid\.example/);
    assert.doesNotMatch(allowed.stderr, /refusing to mint/);
  });

  it('treats --mint-production as a flag, not as the outDir positional', () => {
    const out = newTempDir();
    const run = render(sendsDir, process.env, ['--mint-production', out]);
    assert.equal(run.status, 0, run.stderr);
    assert.ok(fs.existsSync(path.join(out, 'index.json')), 'outDir positional was consumed by the flag');
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

  // A cycle can declare which sends MUST be short-linked. Without it the ⚠
  // block fires on nearly every run and stops being read — which is exactly
  // when a mistyped `**Continue Seed:**` label, silently downgrading a send to
  // the legacy link, would be hiding inside it.
  describe('short-links.json manifest', () => {
    it('confirms the declared set instead of warning, when the drafts match', () => {
      const dir = makeSendsDir(SEED_V1, ['01']);
      const run = render(dir);
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stderr, /✓ short links as declared in short-links\.json: #01/);
      assert.doesNotMatch(run.stderr, /⚠ 1 draft\(s\) have no/);
    });

    it('hard-fails when a declared send lost its Continue Seed to a typo', () => {
      const dir = newTempDir();
      fs.writeFileSync(
        path.join(dir, '01-seeded.md'),
        // The realistic failure: label misspelled, so pick() finds nothing.
        draft({ num: '01', slug: SEEDED_SLUG }).replace('# 01 · Fixture', '# 01 · Fixture\n\n- **Contnue Seed:** oops'),
      );
      fs.writeFileSync(path.join(dir, 'short-links.json'), JSON.stringify(['01']));
      const run = render(dir);
      assert.equal(run.status, 1);
      assert.match(run.stderr, /#01 is declared short-linked but has no \*\*Continue Seed:\*\*/);
      assert.match(run.stderr, /case-sensitive/);
    });

    it('hard-fails when an undeclared send has a Continue Seed', () => {
      const dir = makeSendsDir(SEED_V1, []); // declares nothing, but 01 has a seed
      const run = render(dir);
      assert.equal(run.status, 1);
      assert.match(run.stderr, /#01 .* has a \*\*Continue Seed:\*\* but is not declared/);
    });
  });

  it('refuses a cycle where two drafts share a campaign slug', () => {
    // check.mjs only gates that a slug exists, never that it is unique — so
    // two sends would share one code and one reader would get the other
    // email's continuation.
    const dir = newTempDir();
    fs.writeFileSync(path.join(dir, '01-a.md'), draft({ num: '01', slug: BARE_SLUG }));
    fs.writeFileSync(path.join(dir, '02-b.md'), draft({ num: '02', slug: BARE_SLUG }));
    const run = render(dir);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /duplicate campaign slug/);
    assert.ok(run.stderr.includes('01-a.md') && run.stderr.includes('02-b.md'), run.stderr);
  });

  it('warns when a frontmatter value wraps onto the next line', async () => {
    // pick() is single-line, so a wrapped seed would silently truncate into a
    // production row. It must not do that quietly.
    const dir = newTempDir();
    fs.writeFileSync(
      path.join(dir, '01-seeded.md'),
      draft({ num: '01', slug: SEEDED_SLUG, continueSeed: SEED_V1, seedWrapTail: '  and this half is lost.' }),
    );
    const run = render(dir);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stderr, /\*\*Continue Seed:\*\* looks wrapped onto the next line/);
    assert.match(run.stderr, /and this half is lost/);

    // And it really is truncated — the warning is telling the truth.
    const code = readIndex(dir).find((e) => e.slug === SEEDED_SLUG)!.code!;
    const rows = await db.select().from(emailLinkCodes).where(inArray(emailLinkCodes.code, [code]));
    assert.equal(rows[0].continueSeed, SEED_V1);
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
