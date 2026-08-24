// server/lib/emailReadingBriefs.db.test.ts
//
// Run with: npm run test:local server/lib/emailReadingBriefs.db.test.ts
//
// Covers the 2026-08-18 change that made reading briefs resolve from
// `email_link_codes` FIRST and the hardcoded BRIEFS array only as a fallback.
// The point of that change is operational: a new email cycle used to need a CODE
// DEPLOY (mint the links, then edit-commit-push emailReadingBriefs.ts) or the
// lander would continue the reading while the chat quietly forgot it. These
// cases are what prove the deploy is no longer required — and that the old
// campaigns, which will never have a row, still work.
import 'dotenv/config';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { assertLocalDb } from './testGuards';

assertLocalDb();

import { db, pool } from './db';
import { emailLinkCodes } from '../../shared/schema';
import {
  resolveEmailReadingBrief,
  personaMayHaveBriefs,
  getEmailReadingBrief,
  __resetBriefPersonaCache,
} from './emailReadingBriefs';

const EVELYN = 'evelyn-cross';
const STAMP = Date.now();

// A cycle-2-shaped campaign: exists ONLY as a row, with no entry in the
// hardcoded registry. This is the case the whole change exists for.
const NEW_CAMPAIGN = `reframe-99-db-only-${STAMP}`;
// A campaign that is in the registry AND gets a row, to pin precedence.
const OVERLAP_CAMPAIGN = 'reframe-04-serious';
// A row carrying only the seed the LANDER needs, with no recap/open loop.
const PARTIAL_CAMPAIGN = `reframe-98-partial-${STAMP}`;

// 7 chars, matching the real generator's shape. The suffix must be SHORT enough
// that the distinguishing prefix survives — slicing the last 7 of `t1${STAMP}`
// drops the prefix entirely and mints three identical codes.
const SUFFIX = String(STAMP).slice(-5);
const CODES = [`t1${SUFFIX}`, `t2${SUFFIX}`, `t3${SUFFIX}`];
const PERSONA_CODE = `t4${SUFFIX}`;

async function clearFixtures() {
  await db.delete(emailLinkCodes).where(inArray(emailLinkCodes.code, [...CODES, PERSONA_CODE]));
  await db.delete(emailLinkCodes).where(eq(emailLinkCodes.campaign, OVERLAP_CAMPAIGN));
  __resetBriefPersonaCache();
}

describe('reading briefs resolve from email_link_codes, falling back to the registry', () => {
  before(clearFixtures);
  beforeEach(__resetBriefPersonaCache);

  after(async () => {
    await clearFixtures();
    await pool.end();
  });

  it('serves a campaign that exists ONLY as a row — no registry entry, no deploy', async () => {
    // Precondition: nothing in the hardcoded file knows this campaign. If this
    // ever fails, the fixture name has collided with a real send.
    assert.equal(getEmailReadingBrief(NEW_CAMPAIGN), null);

    await db.insert(emailLinkCodes).values({
      code: CODES[0],
      personaSlug: EVELYN,
      campaign: NEW_CAMPAIGN,
      continueSeed: 'You came back for the rest of it — good.',
      readingRecap: 'You wrote to them about the wall they call a boundary.',
      openLoop: 'You asked which one theirs is.',
    });

    const brief = await resolveEmailReadingBrief(NEW_CAMPAIGN, EVELYN);
    assert.ok(brief, 'a minted row alone must be enough to serve the chat');
    assert.equal(brief.campaign, NEW_CAMPAIGN);
    assert.equal(brief.personaSlug, EVELYN);
    assert.match(brief.readingRecap, /wall they call a boundary/);
    assert.match(brief.openLoop, /which one theirs is/);
    // No label column exists, and nothing in the registry to borrow one from.
    assert.equal(brief.label, undefined);
  });

  it('prefers the row over the registry when a campaign exists in both', async () => {
    const fromFile = getEmailReadingBrief(OVERLAP_CAMPAIGN);
    assert.ok(fromFile, 'fixture assumes reframe-04-serious is in the registry');

    await db.insert(emailLinkCodes).values({
      code: CODES[1],
      personaSlug: EVELYN,
      campaign: OVERLAP_CAMPAIGN,
      continueSeed: 'seed from the row',
      readingRecap: 'RECAP FROM THE ROW, not the file.',
      openLoop: 'OPEN LOOP FROM THE ROW.',
    });

    const brief = await resolveEmailReadingBrief(OVERLAP_CAMPAIGN, EVELYN);
    assert.ok(brief);
    // The row is what the pipeline wrote from the draft frontmatter, which is
    // the authoring source — so a correction there must reach readers.
    assert.match(brief.readingRecap, /FROM THE ROW/);
    assert.doesNotMatch(brief.readingRecap, /said twice/i);
    // ...but the human label only exists in the registry, and losing it would
    // downgrade the prompt to "your recent email" for no reason.
    assert.equal(brief.label, fromFile.label);
  });

  it('falls back to the registry for a campaign with no row (cycle 1 keeps working)', async () => {
    // The precedence case above inserted a row for this campaign, and fixtures
    // are cleared once per FILE, not per case (cases 1 and 5 share a row). So
    // remove it here explicitly — this case is defined by the row's absence, and
    // inheriting it would silently test the opposite of what it claims.
    await db.delete(emailLinkCodes).where(eq(emailLinkCodes.campaign, OVERLAP_CAMPAIGN));

    const brief = await resolveEmailReadingBrief(OVERLAP_CAMPAIGN, EVELYN);
    assert.ok(brief, 'cycle-1 sends have no row and never will');
    assert.match(brief.readingRecap, /said twice/i);
    assert.equal(brief.label, 'The tell');
  });

  it('ignores a lander-only row (seed but no recap) rather than injecting half a brief', async () => {
    // The lander needs only continue_seed; recap/open_loop are nullable. A brief
    // built from that would tell the persona she wrote something and then not
    // say what — the exact cold, inventing-details failure this prevents. So the
    // row is treated as absent and resolution falls through.
    await db.insert(emailLinkCodes).values({
      code: CODES[2],
      personaSlug: EVELYN,
      campaign: PARTIAL_CAMPAIGN,
      continueSeed: 'Enough to open the lander, not enough to brief the chat.',
      readingRecap: null,
      openLoop: null,
    });

    assert.equal(await resolveEmailReadingBrief(PARTIAL_CAMPAIGN, EVELYN), null);
  });

  it('will not hand one persona a row minted for another', async () => {
    // campaign is unique only per (persona, campaign) — the table's own index
    // says so — so an unscoped lookup could serve Evelyn's reading to Luna.
    assert.equal(await resolveEmailReadingBrief(NEW_CAMPAIGN, 'luna-voss'), null);
  });

  it('returns null for empty inputs rather than querying', async () => {
    assert.equal(await resolveEmailReadingBrief('', EVELYN), null);
    assert.equal(await resolveEmailReadingBrief(NEW_CAMPAIGN, ''), null);
  });

  describe('personaMayHaveBriefs', () => {
    it('is true for a persona with registry entries, with no row needed', async () => {
      assert.equal(await personaMayHaveBriefs(EVELYN), true);
    });

    it('becomes true for a persona that has ONLY a minted row', async () => {
      // This is the hot-path guard. Before the change it consulted the hardcoded
      // list alone, so a persona onboarded purely by minting would have been
      // short-circuited out and never got continuity at all.
      const slug = `qa-persona-${STAMP}`;
      assert.equal(await personaMayHaveBriefs(slug), false);

      await db.insert(emailLinkCodes).values({
        code: PERSONA_CODE,
        personaSlug: slug,
        campaign: `qa-campaign-${STAMP}`,
        continueSeed: 'seed',
        readingRecap: 'recap',
        openLoop: 'loop',
      });
      __resetBriefPersonaCache();

      try {
        assert.equal(await personaMayHaveBriefs(slug), true);
      } finally {
        await db.delete(emailLinkCodes).where(eq(emailLinkCodes.personaSlug, slug));
        __resetBriefPersonaCache();
      }
    });

    it('is false for a persona with neither', async () => {
      assert.equal(await personaMayHaveBriefs('marcus-stone'), false);
    });

    it('is false for an empty slug', async () => {
      assert.equal(await personaMayHaveBriefs(''), false);
    });
  });
});
