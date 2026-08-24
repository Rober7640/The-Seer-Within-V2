// server/lib/emailReadingBriefs.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getEmailReadingBrief, hasBriefsForPersona } from './emailReadingBriefs';

describe('getEmailReadingBrief', () => {
  it('returns the brief for a known campaign slug', () => {
    const brief = getEmailReadingBrief('reframe-04-serious');
    assert.ok(brief, 'expected a brief for reframe-04-serious');
    assert.equal(brief.campaign, 'reframe-04-serious');
    assert.equal(brief.personaSlug, 'evelyn-cross');
    assert.equal(brief.label, 'The tell');
    assert.match(brief.readingRecap, /twice/i);
  });

  it('returns null for an unknown campaign', () => {
    assert.equal(getEmailReadingBrief('does-not-exist'), null);
  });

  it('returns null for an empty campaign', () => {
    assert.equal(getEmailReadingBrief(''), null);
  });

  it('has a brief for the peace campaign under test', () => {
    const b = getEmailReadingBrief('reframe-05-peace');
    assert.ok(b, 'expected a brief for reframe-05-peace');
    assert.equal(b.personaSlug, 'evelyn-cross');
    assert.match(b.readingRecap, /peace|wall|space/i);
  });
});

describe('hasBriefsForPersona', () => {
  it('is true for a persona with registered briefs', () => {
    assert.equal(hasBriefsForPersona('evelyn-cross'), true);
  });

  it('is false for a persona with no registered briefs', () => {
    assert.equal(hasBriefsForPersona('marcus-stone'), false);
  });
});
