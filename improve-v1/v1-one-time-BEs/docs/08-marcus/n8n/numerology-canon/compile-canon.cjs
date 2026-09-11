#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VERSION = 'marcus-numerology-canon-v1';
const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '11', '22'];
const roles = [
  {
    role: 'lifePath',
    prefix: 'LP',
    file: 'life-path.md',
    title: 'Life Path',
    sections: ['DIRECTION', 'GIFTS', 'PRESSURE', 'CHOICE', 'CONTRIBUTION', 'RELATIONSHIPS', 'PRACTICE', 'CHECKS'],
  },
  {
    role: 'expression',
    prefix: 'EX',
    file: 'expression.md',
    title: 'Expression',
    sections: ['EXPRESSION', 'GIFTS', 'PRESSURE', 'CHOICE', 'CONTRIBUTION', 'RELATIONSHIPS', 'PRACTICE', 'CHECKS'],
  },
  {
    role: 'personality',
    prefix: 'PE',
    file: 'personality.md',
    title: 'Personality',
    sections: ['STYLE', 'GIFTS', 'PROTECTION', 'CHOICE', 'CONTRIBUTION', 'RELATIONSHIPS', 'PRACTICE', 'CHECKS'],
  },
];

function words(text) {
  return (text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || []).length;
}

function parseRole(spec) {
  const source = fs.readFileSync(path.join(__dirname, spec.file), 'utf8');
  const heading = new RegExp(`^## ${spec.title} (1|2|3|4|5|6|7|8|9|11|22)\\s*$`, 'gm');
  const starts = [...source.matchAll(heading)];
  if (starts.length !== NUMBERS.length) {
    throw new Error(`${spec.file}: expected ${NUMBERS.length} entries, found ${starts.length}`);
  }

  const foundNumbers = starts.map((match) => match[1]);
  if (foundNumbers.join(',') !== NUMBERS.join(',')) {
    throw new Error(`${spec.file}: number order is ${foundNumbers.join(', ')}`);
  }

  return starts.map((match, index) => {
    const number = match[1];
    const bodyStart = match.index + match[0].length;
    const bodyEnd = starts[index + 1]?.index ?? source.length;
    const body = source.slice(bodyStart, bodyEnd);
    const sections = {};

    for (const [sectionIndex, section] of spec.sections.entries()) {
      const marker = `<!-- ${spec.prefix}${number}.${section} -->`;
      const markerIndex = body.indexOf(marker);
      if (markerIndex < 0 || body.indexOf(marker, markerIndex + marker.length) >= 0) {
        throw new Error(`${spec.file}: ${marker} must occur exactly once`);
      }
      const nextMarker = spec.sections[sectionIndex + 1]
        ? body.indexOf(`<!-- ${spec.prefix}${number}.${spec.sections[sectionIndex + 1]} -->`, markerIndex + marker.length)
        : body.length;
      const sectionBlock = body.slice(markerIndex + marker.length, nextMarker);
      const prose = sectionBlock
        .replace(/^### .+$/gm, '')
        .replace(/^\*{0,2}Word count:.*$/gm, '')
        .trim();
      if (!prose) throw new Error(`${spec.file}: ${marker} has no prose`);
      sections[`${spec.prefix}${number}.${section}`] = prose;
    }

    const prose = Object.values(sections).join('\n\n');
    const wordCount = words(prose);
    if (wordCount < 500 || wordCount > 800) {
      throw new Error(`${spec.file}: ${spec.prefix}${number} has ${wordCount} prose words`);
    }

    const contentHash = crypto.createHash('sha256').update(prose).digest('hex');
    return {
      key: `${spec.prefix}${number}`,
      role: spec.role,
      number: Number(number),
      version: VERSION,
      wordCount,
      contentHash,
      sections,
    };
  });
}

const entries = roles.flatMap(parseRole);
const keys = entries.map((entry) => entry.key);
if (new Set(keys).size !== 33) throw new Error('Canon keys are not unique.');

const artifact = {
  version: VERSION,
  status: 'editorial-review',
  supportedNumbers: NUMBERS.map(Number),
  unsupportedPreservedNumbers: [33],
  roles: roles.map(({ role, prefix }) => ({ role, prefix })),
  entries,
};

const destination = path.join(__dirname, `${VERSION}.json`);
fs.writeFileSync(destination, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({
  destination,
  entries: entries.length,
  passages: entries.reduce((total, entry) => total + Object.keys(entry.sections).length, 0),
  minWords: Math.min(...entries.map((entry) => entry.wordCount)),
  maxWords: Math.max(...entries.map((entry) => entry.wordCount)),
}));
