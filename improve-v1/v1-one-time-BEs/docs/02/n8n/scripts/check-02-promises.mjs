/** Static contract for the built 02 workflow. This checks plumbing, not prose quality. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wf = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/02/02-fulfilment.n8n.json')));
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/02-houses.json')));
const node = (p) => wf.nodes.find((n) => n.name.startsWith(p));
const code = (p) => node(p).parameters.jsCode;
const draw = code('3 ·'), house = code('4a ·'), keepHouse = code('4c ·');
const joiner = code('6 ·'), keep = code('6b ·'), verdict = code('7a ·'), html = code('10 ·');
const grader = node('7 ·').parameters.jsonBody;
const obligations = spec.obligations;
const voice = JSON.parse((house.match(/voice: ("(?:[^"\\]|\\.)*")/) || [])[1] || '""');

const groups = [
  ['PROMISES', [
    ['windfall door is owed in house 2', () => /THIS ROOM IS THE DOOR/.test(obligations['2'])],
    ['second windfall and love consequence are owed in house 8', () =>
      /SECOND WINDFALL/.test(obligations['8']) && /love life/i.test(obligations['8'])],
    ['love branch, week, face and recognition are owed in house 5', () =>
      /TWIN FLAME/.test(obligations['5']) && /relative week/i.test(obligations['5'])
      && /recognition/i.test(obligations['5']) && /more attentive/i.test(obligations['5'])],
    ['Tower person and closeness are owed in house 12', () =>
      /Choose between/i.test(obligations['12']) && /how close/i.test(obligations['12'])],
    ['first sign remains inside five to seven days in the close', () =>
      /first sign inside five to seven days/i.test(joiner)],
    ['the close pays the finding-out-last promise', () => /stops finding out last/i.test(joiner)],
    ['the opening preserves discovery and explains room qualification', () =>
      /Preserve discovery/.test(joiner) && /different rooms can qualify one another/.test(joiner)],
  ]],
  ['LOCKED DRAW AND TIMING', [
    ['twelve new cards are drawn and the six spent cards are excluded', () =>
      !/fixedAt|isFixed|fixed:\s/.test(draw) && spec.draw.fixed === undefined
      && spec.draw.excluded.length === 6],
    ['promises remain pinned to rooms 2, 5, 8 and 12', () =>
      ['2', '5', '8', '12'].every((n) => typeof obligations[n] === 'string')],
    ['reversals are off while lore and rendering paths remain', () =>
      spec.draw.reversal_rate === 0
      && Object.entries(spec.card_lore).filter(([k]) => k !== '_note')
        .filter(([, v]) => v.reversed).length === 16 && /reversed/.test(html)],
    ['house 5 is the one dated room and every house receives its law', () =>
      spec.timing.dated_house === 5
      && /const isDated = p\.house === TIMING\.dated_house/.test(house)
      && /isDated \? TIMING\.law_dated : TIMING\.law_other/.test(house)],
    ['calendar dates are banned and the close explains the event-based date', () =>
      /Never use a calendar date/.test(house + joiner)
      && /timing from the event in that room/.test(joiner)],
    ['house 5 owns action timing as well as prediction timing', () =>
      /Do not put any deadline, countdown/.test(spec.timing.law_other.join(' '))
      && /with no deadline/.test(joiner)
      && /filter\(\(d\) => d\.house > 0\)\.map/.test(verdict)],
    ['promise rooms require another dealt card as evidence', () =>
      /const requiredCross = !!p\.owes/.test(house)
      && /REQUIRED EVIDENCE/.test(house) && /exact name of at least one other dealt card/.test(house)],
    ['ordinary rooms are mostly self-contained with two seeded extras', () =>
      /const optionalCross = !requiredCross/.test(house)
      && /Keep this room self-contained/.test(house)],
    ['card art is selected by draw record and house number', () =>
      /byHouse\[Number\(parts\[i\]\)\]/.test(html)],
  ]],
  ['PHASE 3 PROSE', [
    ['approved shorter target is 6,400 words with protected promise-room space', () =>
      spec.target_words === 6400 && spec.word_budget.total_min === 6100 && spec.word_budget.total_max === 6500
      && spec.word_budget.extended.target > spec.word_budget.promise.target
      && spec.word_budget.promise.target > spec.word_budget.ordinary.target],
    ['every room receives its own target and enforced word bounds', () =>
      /arch\.min_words/.test(house) && /arch\.max_words/.test(house)
      && /target_words: target/.test(draw) && /arch\.target_words/.test(house)],
    ['Waite reaches the writer as the printed source', () =>
      /lore\.waite/.test(house) && /Ground the argument in the printed source/.test(house)],
    ['reading-level architecture replaces the mandatory per-room ladder', () =>
      /const ENTRIES = \[/.test(draw) && /const DEVELOPMENTS = \[/.test(draw)
      && /customer_entry/.test(draw + house) && /do not add every other teaching device as filler/.test(house)
      && !/Only then apply the card to her/.test(house)],
    ['the card image is available but no longer a mandatory opener', () =>
      /source need not open the essay/i.test(house) && !/OPEN ON THIS DETAIL/.test(house)],
    ['old move and ending gimmicks are absent from the built prompt', () =>
      !/const MOVES|const ENDINGS|THE MOVE THIS PASSAGE|THIS IS HOW THIS ROOM ENDS/.test(house)],
    ['private facts, tallies and durations are forbidden', () =>
      /UNSUPPORTED PRIVATE FIELDS/.test(house) && /unsupported_private_fields/.test(draw)
      && /illustrative situation must stay visibly illustrative/.test(house)
      && /HISTORY RULE/.test(house) && /history_rule/.test(draw)],
    ['locked forecasts cannot manufacture surrounding biography or action dependencies', () =>
      /A locked obligation authorizes exactly the facts it names/.test(house)
      && /audit every sentence that asserts her past/.test(house)
      && /never make a forecast depend on contacting/.test(draw)],
    ['promises stay firm while ordinary-room personal applications can remain conditional', () =>
      /State the exact required promise firmly/.test(house)
      && /application to her private circumstances may remain conditional/.test(house)
      && !/final answer must be definite/.test(house)],
    ['first person is optional and refusal formulas are not required', () =>
      /First person is optional/.test(house) && !/YOU ARE IN THE ROOM/.test(house)],
    ['order seed rotates architecture without sample sentences', () =>
      /order\.order_id\}\|architecture/.test(draw) && /architecturePlan/.test(draw)
      && !/a drawer|a bill|an envelope|a coat off/.test(house)],
    ['joiner preserves essays and does not manufacture bridges', () =>
      /do not compress the essays into unsupported verdicts/.test(joiner)
      && /Do not add a routine bridge/.test(joiner)],
    ['close is structurally separated from house 12', () =>
      /exact standalone marker \[CLOSE\]/.test(joiner)
      && /readingParts.*\[CLOSE\]/s.test(html) && /class="close"/.test(html)],
    ['takeaways are seeded, validated and rendered without raw model HTML', () =>
      /emphasis_position/.test(draw + house) && /expected one TAKEAWAY line/.test(keepHouse)
      && /TAKEAWAY has.*expected 8-15/.test(keepHouse)
      && /proseParas/.test(html) && /class="takeaway"/.test(html)],
    ['the fixed gift keeps its purchased shape without proving the reading', () =>
      /Twenty-eight nights\. Four turns of seven\. One line a night/.test(html)
      && /The ledger does not owe this reading a result/.test(html)
      && !/It lands in this turn|You did\. It will be on the page/.test(html)],
  ]],
  ['AUDIT INSTRUMENTS', [
    ['keynotes are lifted and missing ones are measured', () =>
      /KEYNOTE:/.test(house) && /KEYNOTE:/i.test(keepHouse) && /keynotes_missing/.test(keep)],
    ['date, cross-reference and Majors checks remain', () =>
      /dated_room/.test(keep) && /crossrefs/.test(keep) && /majors_marvel/.test(keep)],
    ['prose metrics reach the grader', () =>
      /house_words/.test(keep + grader) && /conditional_words/.test(keep + grader)
      && /i_wont/.test(keep + grader) && /sentence_mean/.test(keep + grader)
      && /sentence_sd/.test(keep + grader) && /paragraph_mean/.test(keep + grader)
      && /generic_women/.test(keep + grader) && /repeated_8grams/.test(keep + grader)
      && /biography_candidates/.test(keep + grader) && /consequential_candidates/.test(keep + grader)
      && /withholds/.test(keep + grader)],
    ['grader checks varied teaching and room length', () =>
      /same route or ordered teaching ladder/.test(grader)
      && /house word counts/.test(grader)],
    ['renderer refuses a missing close', () => /no \[CLOSE\] marker or closing prose/.test(html)],
    ['measured length, evidence and withholds can override a green prose grade', () =>
      /h\.words < bounds\.min_words \|\| h\.words > bounds\.max_words/.test(verdict)
      && /unsupported/.test(verdict) && /m\.withholds/.test(verdict)
      && /m\.i_wont.*> 2/.test(verdict) && /m\.dear.*> 3/.test(verdict)
      && /m\.repeated_8grams/.test(verdict)],
    ['grader returns weighted prose scores without overriding hard gates', () =>
      /continuation/.test(grader) && /recommend/.test(grader)
      && /weighted_score/.test(verdict) && /score_error/.test(verdict)
      && /recommendValid/.test(verdict) && /hard\.length/.test(verdict)],
    ['token ceilings cover long houses and the full join', () =>
      node('4b ·').parameters.jsonBody.includes('"max_tokens": 24000')
      && node('6a ·').parameters.jsonBody.includes('"max_tokens": 48000')],
    ['loop still resets on regeneration', () =>
      node('4 ·').parameters.options?.reset === '={{ $json.prose === undefined }}'],
    ['house writer and joiner receive the cached Evelyn voice', () =>
      /You are Evelyn Cross/.test(voice) && /voice: "You are Evelyn Cross/.test(joiner)],
  ]],
];

let bad = 0;
for (const [title, tests] of groups) {
  console.log(`\n  ${title}\n`);
  for (const [label, fn] of tests) {
    let ok = false;
    try { ok = !!fn(); } catch { ok = false; }
    if (!ok) bad += 1;
    console.log(`   ${ok ? '✅' : '🔴'}  ${label}`);
  }
}
console.log(`\n  ${bad ? `🔴 ${bad} FAILED` : '✅ promises, locked decisions and Phase 3 mechanisms are present'}\n`);
process.exit(bad ? 1 : 0);
