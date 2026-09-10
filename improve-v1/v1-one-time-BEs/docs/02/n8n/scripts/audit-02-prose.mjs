#!/usr/bin/env node

/**
 * Deterministic whole-reading prose audit for 02 Markdown artifacts.
 *
 * Usage:
 *   node scripts/audit-02-prose.mjs docs/02/reading.md
 *   node scripts/audit-02-prose.mjs --json docs/02/reading.md
 *
 * This is an evidence collector, not a prose grader. Lexical signals for
 * consequential advice and unsupported biography always require human review.
 */
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const positional = args.filter((arg) => !arg.startsWith('--'));
if (positional.length !== 1) {
  console.error('Usage: node scripts/audit-02-prose.mjs [--json] READING.md');
  process.exit(2);
}

const inputPath = path.resolve(positional[0]);
if (!fs.existsSync(inputPath)) {
  console.error(`Reading not found: ${inputPath}`);
  process.exit(2);
}

const raw = fs.readFileSync(inputPath, 'utf8').replace(/\r\n?/g, '\n');

function stripMarkdown(value) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--(?:[\s\S]*?)-->/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]\s+)\s?/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^\s*[-:| ]{3,}\s*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Fixed blocks are excluded only when the artifact labels them. Unlabelled Waite
// discussion remains prose and is deliberately audited.
function removeLabelledFixedBlocks(value) {
  return value
    .replace(/<!--\s*(?:FIXED|WAITE)[^>]*START\s*-->[\s\S]*?<!--\s*(?:FIXED|WAITE)[^>]*END\s*-->/gi, ' ')
    .replace(/\[(?:FIXED|WAITE)(?:_BLOCK)?\][\s\S]*?\[\/(?:FIXED|WAITE)(?:_BLOCK)?\]/gi, ' ');
}

function words(value) {
  const plain = stripMarkdown(value).normalize('NFKC');
  return plain.match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu) ?? [];
}

function sentenceList(value) {
  const plain = stripMarkdown(value).replace(/\n+/g, ' ').trim();
  if (!plain) return [];
  return plain.match(/[^.!?]+(?:[.!?]+[”’"']?|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

function paragraphList(value) {
  return removeLabelledFixedBlocks(value).split(/\n\s*\n/)
    .map(stripMarkdown).map((p) => p.trim()).filter(Boolean);
}

function stats(values) {
  if (!values.length) return { count: 0, mean: 0, variance: 0, sd: 0, median: 0, min: 0, max: 0 };
  const mean = values.reduce((sum, n) => sum + n, 0) / values.length;
  const variance = values.reduce((sum, n) => sum + ((n - mean) ** 2), 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { count: values.length, mean, variance, sd: Math.sqrt(variance), median, min: sorted[0], max: sorted.at(-1) };
}

function locateSections(value) {
  const houseRe = /^\[(\d{1,2})\s*[·|]\s*([^·|\]]+?)\s*[·|]\s*([^\]]+?)\]\s*$/gm;
  const markers = [...value.matchAll(houseRe)].map((m) => ({
    house: Number(m[1]), name: m[2].trim(), card: m[3].trim(), index: m.index, bodyStart: m.index + m[0].length,
  }));
  if (!markers.length) throw new Error('No house markers found. Expected lines such as [1 · yourself · the Hermit].');
  const closeMatch = /^\[CLOSE\]\s*$/m.exec(value);
  const closeIndex = closeMatch?.index ?? value.length;
  const houses = markers.map((marker, i) => {
    const nextIndex = markers[i + 1]?.index ?? closeIndex;
    return { ...marker, text: value.slice(marker.bodyStart, nextIndex).trim() };
  });
  const preamble = value.slice(0, markers[0].index);
  const divider = /\n---\s*\n/g;
  let lastDividerEnd = 0;
  for (const match of preamble.matchAll(divider)) lastDividerEnd = match.index + match[0].length;
  const opening = preamble.slice(lastDividerEnd).trim();
  const close = closeMatch ? value.slice(closeIndex + closeMatch[0].length).trim() : '';
  return { houses, opening, close, closeMarker: Boolean(closeMatch) };
}

const { houses, opening, close, closeMarker } = locateSections(raw);
const allInterpretation = houses.map((h) => h.text).join('\n\n');
const wholeReading = [opening, allInterpretation, close].filter(Boolean).join('\n\n');

function areaRecords() {
  return [
    ...(opening ? [{ area: 'opening', house: null, text: opening }] : []),
    ...houses.map((h) => ({ area: `house ${h.house}`, house: h.house, text: h.text })),
    ...(close ? [{ area: 'close', house: null, text: close }] : []),
  ];
}

const areas = areaRecords();
function sentenceEvidence(regex, records = areas) {
  const found = [];
  for (const area of records) {
    for (const sentence of sentenceList(area.text)) {
      regex.lastIndex = 0;
      if (regex.test(sentence)) found.push({ area: area.area, house: area.house, sentence });
    }
  }
  return found;
}

function normalizedTokens(value) {
  return words(value).map((token) => token.toLocaleLowerCase('en').replace(/’/g, "'"));
}

function repeatedCrossHouseNgrams(n = 8) {
  const occurrences = new Map();
  for (const house of houses) {
    const tokens = normalizedTokens(removeLabelledFixedBlocks(house.text));
    const seenHere = new Set();
    for (let i = 0; i <= tokens.length - n; i++) {
      const gram = tokens.slice(i, i + n).join(' ');
      if (seenHere.has(gram)) continue;
      seenHere.add(gram);
      if (!occurrences.has(gram)) occurrences.set(gram, []);
      occurrences.get(gram).push(house.house);
    }
  }
  return [...occurrences.entries()]
    .filter(([, hs]) => new Set(hs).size > 1)
    .map(([phrase, hs]) => ({ phrase, houses: [...new Set(hs)].sort((a, b) => a - b) }))
    .sort((a, b) => b.houses.length - a.houses.length || a.phrase.localeCompare(b.phrase));
}

const cardNames = [
  'the fool', 'the magician', 'the high priestess', 'the empress', 'the emperor', 'the hierophant',
  'the lovers', 'the chariot', 'strength', 'the hermit', 'wheel of fortune', 'justice',
  'the hanged man', 'the nameless one', 'death', 'temperance', 'the devil', 'the tower',
  'the star', 'the moon', 'the sun', 'judgment', 'judgement', 'the world',
];

function normalizedPhrase(sentence, kind) {
  let value = stripMarkdown(sentence).toLocaleLowerCase('en').replace(/[’]/g, "'");
  for (const card of cardNames) value = value.replace(new RegExp(`\\b${card.replace(/ /g, '\\s+')}\\b`, 'g'), 'cardname');
  value = value
    .replace(/\b(?:sentence|line|detail)\b/g, 'sourcedetail')
    .replace(/\b(?:decides|carries|governs|sets|anchors)\b/g, 'determines')
    .replace(/\b(?:house|room)\b/g, 'roomname')
    .replace(/\b(?:picture|image|printed description|description)\b/g, 'sourceimage')
    .replace(/\b\d+(?:st|nd|rd|th)?\b/g, 'numbertoken')
    .replace(/\s+/g, ' ').trim();
  if (kind === 'opener') {
    value = value.replace(/\b(?:the )?one about\b[\s\S]*$/, 'the one about carddetail');
    value = value.split(/[:;—]/)[0].trim();
  }
  return words(value).slice(0, 18).join(' ');
}

function jaccard(left, right) {
  const a = new Set(left.split(' '));
  const b = new Set(right.split(' '));
  const both = [...a].filter((token) => b.has(token)).length;
  return both / Math.max(1, new Set([...a, ...b]).size);
}

function rhetoricalKind(sentence, kind) {
  const s = stripMarkdown(sentence).toLocaleLowerCase('en');
  if (kind === 'opener') {
    if (/\b(?:line|sentence|detail)\b.*\b(?:decides|carries|governs|sets|anchors)\b.*\b(?:room|house)\b/.test(s)) return 'source detail determines room';
    if (/^waite\b/.test(s)) return 'Waite-led citation';
    if (/^(?:look|notice|count|consider|take)\b/.test(s)) return 'visual/directive entry';
    if (/\b(?:picture|image|figure|card)\b/.test(s)) return 'image-led entry';
    return 'other entry';
  }
  if (/^(?:ask|accept|act|choose|do|don't|guard|hold|keep|leave|move|put|send|sign|stop|take|tell|trust|wait|write)\b/.test(s)) return 'imperative exit';
  if (/\b(?:next|what arrives|the following|moving)\b/.test(s) || /\bsomeone else(?!['’]s)/.test(s)) return 'forward bridge';
  if (/^if\b|\bif you\b/.test(s)) return 'conditional exit';
  if (words(s).length <= 12) return 'short aphoristic exit';
  return 'other exit';
}

function phraseFamilies(kind) {
  const records = houses.map((house) => {
    const sentences = sentenceList(house.text);
    const sentence = kind === 'opener' ? sentences[0] : sentences.at(-1);
    return {
      house: house.house,
      sentence: sentence ?? '',
      normalized: normalizedPhrase(sentence ?? '', kind),
      kind: rhetoricalKind(sentence ?? '', kind),
    };
  });
  const parent = records.map((_, i) => i);
  const find = (i) => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const join = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[rb] = ra; };
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const sameNamedFamily = records[i].kind !== (kind === 'opener' ? 'other entry' : 'other exit')
        && records[i].kind === records[j].kind;
      if (sameNamedFamily || jaccard(records[i].normalized, records[j].normalized) >= 0.58) join(i, j);
    }
  }
  const groups = new Map();
  records.forEach((record, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(record);
  });
  return { records, repeated: [...groups.values()].filter((group) => group.length > 1) };
}

const repeated8grams = repeatedCrossHouseNgrams();
const openers = phraseFamilies('opener');
const endings = phraseFamilies('ending');
const dear = sentenceEvidence(/\bdear\b/gi);
const houseAreas = areas.filter((area) => area.house !== null);
// Keep every mention visible, but do not call a card-image woman or an individualized
// metaphor a demographic assertion. This narrower rule mirrors the workflow metric:
// population claims beginning with women, or a categorical “a woman who ...”.
const womanMentionPattern = /\b(?:woman|women)(?:['’]s)?\b/gi;
const womanMentions = sentenceEvidence(womanMentionPattern).map((item) => ({
  ...item,
  occurrences: item.sentence.match(womanMentionPattern)?.length ?? 0,
}));
const womanMentionCount = womanMentions.reduce((sum, item) => sum + item.occurrences, 0);
const demographicGeneralizations = sentenceEvidence(
  /^(?:(?:most|many|some|other|a good number of)\s+)?women\b|^a woman who\b/i,
  houseAreas,
);
const methodAnnouncements = sentenceEvidence(
  /\b(?:the (?:line|detail|sentence|phrase|image) (?:worth|to|that)|reason from|the whole argument|say it plainly|put plainly|here is where|think of)\b/i,
  houseAreas,
);
const conditionalPattern = /\b(?:if|whether|unless|depending|when|where)\b/gi;
const teachingConditionals = sentenceEvidence(conditionalPattern);
const conditionalMatches = wholeReading.match(conditionalPattern) ?? [];
const explicitWithholding = sentenceEvidence(/\b(?:I|we)\s+(?:will not|won't|cannot|can't)\s+(?:tell|say|name|read|claim|give|promise|predict)\b/gi);

const datePatterns = {
  // Deliberately case-sensitive so modal “may” is not misread as the month May.
  calendar: /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December)\b|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g,
  relative: /\b(?:(?:next|this|coming|following|past|previous)\s+(?:day|week|month|year|season|morning|afternoon|evening)|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|\d+(?:st|nd|rd|th)?)\s+(?:day|week|month|year)|(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)(?:\s+or\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+))?\s+(?:days?|weeks?|months?|years?)\s+(?:from|after|before|away|later)|within\s+(?:the\s+)?(?:next\s+)?(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)(?:\s+or\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+))?\s+(?:days?|weeks?|months?|years?))\b/gi,
  historicalDuration: /\b(?:(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+|many|several|few|a few)\s+)?(?:day|week|month|year|decade)s?\s+ago|for\s+(?:(?:about|nearly|over|under|more than|less than)\s+)?(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+|many|several|few|a few)\s+)?(?:day|week|month|year|decade)s?)\b/gi,
};

const dates = Object.fromEntries(Object.entries(datePatterns).map(([kind, regex]) => [kind, sentenceEvidence(regex)]));

const imperativeVerb = '(?:accept|act|ask|call|cancel|change|choose|contact|consult|cut|do not|don\'t|end|gather|leave|make|move|pay|quit|refuse|sell|send|separate|sign|stop|take|tell|transfer|write)';
const imperativeStart = new RegExp(`^(?:please\\s+)?${imperativeVerb}\\b`, 'i');
const imperativeAfterClause = new RegExp(`[,;:]\\s*${imperativeVerb}\\b`, 'i');
const directiveWithin = /\b(?:you\s+(?:must|need to|should|have to)|I\s+(?:want|need)\s+you\s+to)\b/i;
const highStakeDomain = /\b(?:account|asset|bank|beneficiar|business|care|cash|child|contract|credit|debt|diagnos|doctor|employ|family|financial|health|home|house|husband|job|lawyer|lease|legal|loan|marriage|medical|money|mortgage|partner|property|relationship|rent|retire|settlement|solicitor|spouse|treatment|wife|work)\b/i;
const consequentialImperatives = [];
for (const area of areas) {
  for (const paragraph of paragraphList(area.text)) {
    if (!highStakeDomain.test(paragraph)) continue;
    for (const sentence of sentenceList(paragraph)) {
      if (imperativeStart.test(sentence) || imperativeAfterClause.test(sentence) || directiveWithin.test(sentence)) {
        consequentialImperatives.push({ area: area.area, house: area.house, sentence });
      }
    }
  }
}

const biographyPatterns = {
  duration_or_history: /\b(?:years? ago|months? ago|decades? ago|since you|since he|since she|you (?:have|had)'?ve? (?:known|lived|worked|waited|been)|he (?:has|had) (?:known|lived|worked|waited|been|arrived)|she (?:has|had) (?:known|lived|worked|waited|been))\b/i,
  relationship_history: /\b(?:you|he|she|the man)\s+(?:married|divorced|separated|left|returned|came back|met|knew|has known|have known|loved|lived with|moved in|broke up)\b/i,
  possession_or_entitlement: /\byou\s+(?:own|owned|have|hold)\s+(?:a|an|the|this|that|property|account|asset|entitlement|qualification|licen[cs]e|policy|share)\b/i,
  work_or_location: /\byou\s+(?:work|worked|retired|live|lived|moved)\s+(?:as|at|in|from|near|with)\b/i,
  health_or_diagnosis: /\byou\s+(?:have|had|suffer(?:ed)? from|were diagnosed with|are diagnosed with)\s+(?:a\s+)?(?:condition|diagnosis|disease|illness|injury|disorder)\b/i,
  habitual_private_behavior: /\byou\s+(?:always|never|usually|regularly|every (?:day|week|month|year))\b/i,
};
const biographySignals = [];
for (const area of areas) {
  for (const sentence of sentenceList(area.text)) {
    for (const [signal, regex] of Object.entries(biographyPatterns)) {
      if (regex.test(sentence)) biographySignals.push({ signal, area: area.area, house: area.house, sentence });
    }
  }
}

const sentenceLengths = houses.flatMap((house) => sentenceList(house.text).map((s) => words(s).length).filter(Boolean));
const paragraphLengths = houses.flatMap((house) => paragraphList(house.text).map((p) => words(p).length).filter(Boolean));
const report = {
  schema: '02-prose-audit/v2',
  file: inputPath,
  parser: { housesFound: houses.length, houseNumbers: houses.map((h) => h.house), closeMarker },
  wordCounts: {
    opening: words(opening).length,
    houses: houses.map((h) => ({ house: h.house, name: h.name, card: h.card, words: words(h.text).length })),
    interpretationTotal: words(allInterpretation).length,
    close: words(close).length,
    deliveredProseTotal: words(wholeReading).length,
  },
  repeatedCrossHouse8grams: { count: repeated8grams.length, occurrences: repeated8grams },
  phraseFamilies: { openers, endings },
  intimacyAndDemographics: {
    dearCount: dear.reduce((sum, item) => sum + (item.sentence.match(/\bdear\b/gi)?.length ?? 0), 0),
    dearEvidence: dear,
    womanMentionCount,
    womanMentionEvidence: womanMentions,
    genericWomenAssertionCount: demographicGeneralizations.length,
    genericWomenEvidence: demographicGeneralizations,
  },
  methodAnnouncements: { count: methodAnnouncements.length, evidence: methodAnnouncements },
  rhythm: { sentences: stats(sentenceLengths), paragraphs: stats(paragraphLengths) },
  teachingConditionals: { occurrenceCount: conditionalMatches.length, sentenceCount: teachingConditionals.length, evidence: teachingConditionals },
  explicitWithholding: { count: explicitWithholding.length, evidence: explicitWithholding },
  dates,
  reviewSignals: {
    consequentialImperatives,
    potentialUnsupportedBiography: biographySignals,
    note: 'These are lexical review signals. Source support and practical consequence cannot be established from prose alone.',
  },
};

function fixed(n, digits = 1) { return Number(n).toFixed(digits); }
function quote(value, max = 220) {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}…`;
}
function printEvidence(items, max = 20) {
  for (const item of items.slice(0, max)) console.log(`    - ${item.area}: “${quote(item.sentence)}”`);
  if (items.length > max) console.log(`    … ${items.length - max} more; use --json for the complete evidence.`);
}

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\n02 WHOLE-READING PROSE AUDIT\n${inputPath}`);
  console.log(`\nPARSE\n  houses ${houses.length}: ${houses.map((h) => h.house).join(', ')} · close marker ${closeMarker ? 'present' : 'MISSING'}`);
  console.log('\nWORDS');
  console.log(`  opening ${report.wordCounts.opening} · interpretation ${report.wordCounts.interpretationTotal} · close ${report.wordCounts.close} · delivered prose ${report.wordCounts.deliveredProseTotal}`);
  console.log(`  ${report.wordCounts.houses.map((h) => `${h.house}:${h.words}`).join(' · ')}`);
  console.log(`\nCROSS-HOUSE 8-GRAMS\n  ${repeated8grams.length} exact repeated 8-grams outside labelled fixed blocks`);
  for (const item of repeated8grams.slice(0, 30)) console.log(`    - houses ${item.houses.join(', ')}: “${item.phrase}”`);
  if (repeated8grams.length > 30) console.log(`    … ${repeated8grams.length - 30} more; use --json for all.`);
  console.log('\nNORMALIZED OPENER FAMILIES');
  if (!openers.repeated.length) console.log('  none repeated');
  for (const group of openers.repeated) {
    console.log(`  ${group[0].kind} · houses ${group.map((r) => r.house).join(', ')}`);
    for (const record of group) console.log(`    - ${record.house}: ${record.normalized}`);
  }
  console.log('\nNORMALIZED ENDING FAMILIES');
  if (!endings.repeated.length) console.log('  none repeated');
  for (const group of endings.repeated) {
    console.log(`  ${group[0].kind} · houses ${group.map((r) => r.house).join(', ')}`);
    for (const record of group) console.log(`    - ${record.house}: ${record.normalized}`);
  }
  console.log(`\nINTIMACY + DEMOGRAPHIC LANGUAGE\n  dear ${report.intimacyAndDemographics.dearCount} · all woman/women mentions ${womanMentionCount} in ${womanMentions.length} sentences · demographic generalizations ${demographicGeneralizations.length}`);
  console.log('  all mentions:');
  printEvidence(womanMentions);
  console.log('  demographic generalizations:');
  printEvidence(demographicGeneralizations);
  const s = report.rhythm.sentences; const p = report.rhythm.paragraphs;
  console.log('\nRHYTHM (HOUSE PROSE)');
  console.log(`  sentences n=${s.count} mean=${fixed(s.mean)} median=${fixed(s.median)} variance=${fixed(s.variance)} sd=${fixed(s.sd)} range=${s.min}–${s.max}`);
  console.log(`  paragraphs n=${p.count} mean=${fixed(p.mean)} median=${fixed(p.median)} variance=${fixed(p.variance)} sd=${fixed(p.sd)} range=${p.min}–${p.max}`);
  console.log(`\nTEACHING CONDITIONALS\n  ${conditionalMatches.length} occurrences across ${teachingConditionals.length} sentences containing if/whether/unless/depending/when/where`);
  console.log(`\nMETHOD-ANNOUNCEMENT CANDIDATES\n  ${methodAnnouncements.length}`);
  printEvidence(methodAnnouncements);
  console.log(`\nEXPLICIT WITHHOLDING\n  ${explicitWithholding.length}`);
  printEvidence(explicitWithholding);
  console.log('\nDATE AND DURATION LANGUAGE');
  for (const [kind, items] of Object.entries(dates)) {
    console.log(`  ${kind}: ${items.length}`);
    printEvidence(items);
  }
  console.log(`\nREVIEW SIGNALS — CONSEQUENTIAL IMPERATIVES\n  ${consequentialImperatives.length} potential high-stakes directives`);
  printEvidence(consequentialImperatives);
  console.log(`\nREVIEW SIGNALS — POTENTIALLY UNSUPPORTED BIOGRAPHY\n  ${biographySignals.length} lexical signals`);
  for (const item of biographySignals.slice(0, 30)) console.log(`    - ${item.signal} · ${item.area}: “${quote(item.sentence)}”`);
  if (biographySignals.length > 30) console.log(`    … ${biographySignals.length - 30} more; use --json for all.`);
  console.log('\n  Review signals are evidence for a human audit, not proof of unsupported claims.\n');
}
