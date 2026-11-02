/**
 * Static contract for the built 11 workflow: every loop the sales letter opens has a named place
 * it closes, every ban is stated, and no reading text leaked into a prompt.
 *   node scripts/check-11-promises.mjs
 * Checks plumbing and prompts, never prose quality.
 */
import fs from 'fs';
import path from 'path';
import { loadWf, GETBACK, codeOf, nodeOf, SPEC, SCRIPTS, report, execute, fakeOpenAI, goldReading, START } from './lib-11.mjs';

const wf = loadWf(GETBACK);
const act = codeOf(wf, '4a ·'), plan = codeOf(wf, '3a ·'), measure = codeOf(wf, '6 ·'), verdict = codeOf(wf, '7a ·'), html = codeOf(wf, '10 ·');
const rubric = nodeOf(wf, '7 ·').parameters.jsonBody;
const voice = JSON.parse(act.match(/voice: ("(?:[^"\\]|\\.)*")/)[1]);
const S = SPEC.sections;
const flat = (k) => JSON.stringify(S[k]);
const firstLine = (k) => S[k].opens_flat === true && !!(S[k].answer || S[k].answer_giving);

const norm = (t) => t.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean);
const grams = (t, n) => { const w = norm(t), s = new Set(); for (let i = 0; i <= w.length - n; i++) s.add(w.slice(i, i + n).join(' ')); return s; };
const gold = Object.values(goldReading()).join('\n\n');
const goldGrams = grams(gold, 9);
// Row data has to be handed over (§4 and §5), and the exact lines are required word for word.
const allowed = new Set();
for (const r of Object.values(SPEC.soul_urge)) for (const v of [r.unsaid, r.took, r.do, r.regret]) for (const g of grams(v, 9)) allowed.add(g);
const handed = [...Object.values(SPEC.flat.reason), ...Object.values(SPEC.sections).map((x) => x.answer).filter(Boolean),
  "It's back. What you do with it is on you.", 'Your birth name and date set how I lay your twelve cards',
  'nothing here asks her to contact them, wait for them or forgive them'];
for (const t of handed) for (const g of grams(t, 9)) allowed.add(g);
const fake = fakeOpenAI({ sections: (k) => goldReading()[k] });
execute(wf, { start: START, http: fake.http });
const firstAct = fake.calls.find((c) => !c.schema).body.messages;
const composed = `${firstAct[0].content}\n${firstAct[1].content}`;
const specText = JSON.stringify(SPEC.sections) + JSON.stringify(SPEC.devices);
const leaks = (text) => [...grams(text, 9)].filter((g) => goldGrams.has(g) && !allowed.has(g));

const bad = report('11 · promises, bans and prompt rules', [
  ['EVERY LOOP THE LETTER OPENS (11-P1-plan §3)', [
    ['What did they take? first line of 1', () => firstLine(1) && /first sentence names what they took/.test(S[1].job)],
    ['Her guess, most women guess wrong: 1', () => /guess wrong/.test(S[1].job)],
    ['What do they regret? first line of 6, and in the letter', () => firstLine(6) && /regret/.test(S.letter.job)],
    ['What was left unsaid? first line of 11, and in the letter', () => firstLine(11) && /sentence left unsaid/.test(S.letter.job)],
    ['Giving or getting back? first line of 9', () => firstLine(9) && S[9].bold],
    ['Why so long? first line of 5', () => firstLine(5)],
    ['Will they act? first line of 10', () => firstLine(10) && S[10].bold],
    ['Stop the pull: 12', () => /Stop going back/.test(S[12].stop) && /twenty minutes/.test(S[12].stop)],
    ['Should she answer? no, already back: 11', () => /already back/.test(S[11].job)],
    ['"Writing their half": 11', () => /writing their half/.test(S[11].job)],
    ['"They get what\'s left": 7', () => /what's left/.test(S[7].job)],
    ['"Ten years, thirty years": 8', () => /ten years or thirty/.test(S[8].job)],
    ['5–7 days, about her, never them turning up: 12', () => /five to seven days/.test(S[12].job) && /says nothing about them turning up/.test(S[12].job)],
    ['Rereading promise squared: 12', () => /habit takes a week/.test(S[12].stop)],
    ['The message: the letter hands it back', () => /name the thing and give it back/.test(S.letter.job)],
    ['Next time someone reaches for her, someone is there: 12', () => /next time someone reaches for her/.test(S[12].promise)],
    ['The thing to stop and to do sit in the last of her twelve', () => !!(S[12].stop && S[12].do)],
    ['Every buyer ends on the exact last line', () => /It's back\. What you do with it is on you\./.test(S.close.job) && /last_line/.test(verdict + measure)],
  ]],
  ['THE TWO PATHS (§5)', [
    ['6 changes on the get-back path', () => /regret losing what they had from her/.test(S[6].job_get_back)],
    ['9: presence stays, part of her is glad', () => /glad/.test(S[9].job_get_back) && /stay there/.test(S[9].night_get_back)],
    ['9 giving: presence leaves', () => /They've gone/.test(S[9].night_giving)],
    ['10: holds it out, Evelyn stops answering', () => /stop answering that pull/.test(S[10].job_get_back)],
    ['12 warns of the ask, do nothing', () => /letter ends with an ask/.test(S[12].job_get_back)],
    ['Letter gives back in full first, ask comes last', () => /hand it back in full first/.test(S.letter.job_get_back) && /comes last/.test(S.letter.job_get_back)],
    ['Close says she left the ask in', () => /left the ask in/.test(S.close.job_get_back)],
    ['Giving letter asks for nothing', () => /ask her for nothing/.test(S.letter.job_giving)],
  ]],
  ['SAFETY AND HONESTY', [
    ['never tells her to contact, answer, look up, wait or forgive', () => /never tell her to contact them, answer them, look them up, wait for them or forgive them/.test(voice)],
    ['they never turn up on any path', () => /They never turn up in this reading, on any path/.test(voice)],
    ['this is someone living: opening, and where Death lands', () => /this is someone living/i.test(flat('opening')) && /someone living/.test(act) && /nobody's died/.test(act)],
    ['you owe them no reply: opening and 11', () => /owes them no reply/.test(S.opening.job) && /owes them no reply/.test(S[11].job)],
    ['row 4 gets the safety line, in card 12', () => /a\.safety/.test(act) && !!SPEC.soul_urge['4'].safety],
    ['hit what she does, never who she is', () => /what she does, never who she is/.test(voice) && /never blame her/.test(voice)],
    ['numerology never named; the birth-date line is the only reason given', () => /that's all she ever hears/.test(voice) && S.opening.exact[0].startsWith('Your birth name and date')],
    ['no past clients, no invented people', () => /Past clients/.test(voice) && /clients/.test(measure)],
    ['how long the writing took never appears', () => /How long the writing took/.test(voice) && /writing_time/.test(measure)],
    ['years only at 8, long time elsewhere', () => /Say a long time/.test(voice) && /years/.test(measure)],
    ['the hundred-women test is in the voice', () => /a hundred women/.test(voice)],
    ['American words in her life', () => /plain American words/.test(voice)],
    ['they/them, no word for what they were', () => /they, them and their/.test(voice) && /no ex, husband/.test(voice)],
    ['free cards stay off the spread', () => /never fall in this spread/.test(voice) && SPEC.excluded.length === 3],
    ['the buyer sees the machine-help disclosure', () => /machine help/.test(html)],
  ]],
  ['THE MODEL IS GIVEN THINGS CODE DECIDED', [
    ['fork, excuse, reason, took, saw and pattern all come from code', () => ['fork', 'excuse', 'reason', 'took', 'saw', 'pattern'].every((k) => new RegExp(`\\b${k}\\b`).test(codeOf(wf, '3 ·')))],
    ['the plan is told it writes these, it does not choose', () => /You write them, you don't choose them/.test(plan)],
    ['the grader gets the answers and the measures', () => /THE ANSWERS THIS BUYER WAS GIVEN/.test(measure) && /MEASURED FOR YOU/.test(measure)],
    ['the grader is told flat predictions are correct here', () => /flat answers are the product/.test(rubric)],
  ]],
  ['PROMPT RULES (§10, memory: examples get copied)', [
    ['no nine-word run from the test reading in the composed prompt', () => { const l = leaks(composed);
      return l.length ? { ok: false, note: l.slice(0, 3).join(' | ') } : true; }],
    ['none in the section briefs either', () => { const l = leaks(specText); return l.length ? { ok: false, note: `${l.length}: ${l.slice(0, 3).join(' | ')}` } : true; }],
    ['the system block carries no section numbers (rules are scoped)', () => !/\b(?:card|section|house) \d+\b/i.test(voice)],
    ['a per-section rule says where it applies', () => /in this section only/.test(act) && /Bold: none in this section/.test(act)],
    ['Diane never reaches a prompt', () => !/Diane/.test(composed + specText)],
  ]],
  ['THE PDF', [
    ['one PDF per buyer, cards by deal record', () => /\$\{S3\}\$\{d\.card\}\.jpg/.test(html)],
    ['Death crop follows the one flag', () => typeof SPEC.death_crop === 'boolean' && /CROP_DEATH/.test(html)],
    ['bump without 11-C4 stops the order', () => /HOLD: this buyer took the bump/.test(html)],
  ]],
]);
process.exit(bad ? 1 : 0);
