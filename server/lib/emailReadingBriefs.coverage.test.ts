// server/lib/emailReadingBriefs.coverage.test.ts
// Guards email→chat continuity (#27) against silent drift: every LIVE cycle-1
// send's ?campaign= slug must resolve to a registered EmailReadingBrief. A future
// send shipped without a matching brief entry turns this test — and the build —
// red, instead of quietly falling back to a cold-start greeting in prod.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getEmailReadingBrief } from './emailReadingBriefs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SENDS_DIR = path.join(__dirname, '../../docs/aweber/evelyn-reframe-deck/sends/cycle-1');

function extractCampaignSlugs(): string[] {
  const files = readdirSync(SENDS_DIR).filter((f) => f.endsWith('.md'));
  const slugs: string[] = [];
  for (const file of files) {
    const contents = readFileSync(path.join(SENDS_DIR, file), 'utf8');
    const match = contents.match(/campaign=([a-z0-9-]+)/);
    if (!match) continue; // no campaign link in this file — skip
    slugs.push(match[1]);
  }
  return slugs;
}

describe('email reading brief coverage (cycle-1)', () => {
  const slugs = extractCampaignSlugs();

  it('found at least one campaign slug to check', () => {
    assert.ok(slugs.length > 0, `expected to find campaign slugs under ${SENDS_DIR}`);
  });

  for (const slug of slugs) {
    it(`has a reading brief for campaign=${slug}`, () => {
      const brief = getEmailReadingBrief(slug);
      assert.ok(brief, `expected a registered EmailReadingBrief for campaign=${slug}`);
    });
  }
});
