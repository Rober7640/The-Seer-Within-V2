#!/usr/bin/env node

const canon = require('./marcus-numerology-canon-v1.json');

const [lifePathRaw, expressionRaw, personalityRaw] = process.argv.slice(2);
const requested = {
  lifePath: Number(lifePathRaw),
  expression: Number(expressionRaw),
  personality: Number(personalityRaw),
};

if (Object.values(requested).some((value) => !Number.isInteger(value))) {
  throw new Error('Usage: node select-canon.cjs <lifePath> <expression> <personality>');
}

const entries = Object.entries(requested).map(([role, number]) => {
  const entry = canon.entries.find((candidate) => candidate.role === role && candidate.number === number);
  if (!entry) throw new Error(`${role} ${number} is not supported by ${canon.version}`);
  return entry;
});

process.stdout.write(`${JSON.stringify({
  canonVersion: canon.version,
  numbers: requested,
  canonKeys: entries.map((entry) => entry.key),
  entries,
}, null, 2)}\n`);
