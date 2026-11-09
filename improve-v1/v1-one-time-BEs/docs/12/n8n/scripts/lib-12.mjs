/**
 * Shared by 12's free checks. Reads the BUILT workflow, never a copy of its code.
 *
 * execute() is a small stand-in for n8n's runner (copied from lib-11): it follows the real
 * connections, branch by branch, and runs each node's real jsCode. HTTP nodes never leave this
 * machine: the check supplies a fake for every one. So it proves the wiring, the loop, the retry
 * and the regenerate path. It does not prove n8n itself, or anything about a real model.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
export const N8N = path.dirname(SCRIPTS);
export const BUILD = path.join(N8N, 'build');
export const RUNS = path.join(N8N, 'runs');
export const FIXTURES = path.join(N8N, 'fixtures');
export const REPO = path.resolve(SCRIPTS, '../../../../../..');
export const SPEC = JSON.parse(fs.readFileSync(path.join(SCRIPTS, '12-acts.json'), 'utf8'));
export const ENGINE_SRC = fs.readFileSync(path.join(SCRIPTS, 'lucky-12.js'), 'utf8');
// eslint-disable-next-line no-new-func
export const engine = new Function(`${ENGINE_SRC}\nreturn luckyNumbers12;`)();

export const loadWf = (name) => JSON.parse(fs.readFileSync(path.join(BUILD, name), 'utf8'));
export const LIVE = '12-fulfilment.n8n.json';
export const TESTINA = '12-fulfilment-TESTDRIVE-TESTINA.n8n.json';
export const FAKETTA = '12-fulfilment-TESTDRIVE-FAKETTA.n8n.json';
export const MANUAL_TESTINA = '12-fulfilment-MANUAL-TESTINA.n8n.json';
export const MANUAL_FAKETTA = '12-fulfilment-MANUAL-FAKETTA.n8n.json';
export const fixture = (k) => JSON.parse(fs.readFileSync(path.join(FIXTURES, `${k}.json`), 'utf8'));

/** The hand-written stand-in for Testina's four act replies. ⛔ Not a model run. */
export const HAND_DIR = path.join(RUNS, '12-handwritten-testina');
export const handActs = () => Object.fromEntries(['A', 'B', 'C', 'D'].map((id) =>
  [id, JSON.parse(fs.readFileSync(path.join(HAND_DIR, `act-${id}.json`), 'utf8'))]));

export const nodeOf = (wf, prefix) => {
  const n = wf.nodes.find((x) => x.name.startsWith(prefix));
  if (!n) throw new Error(`no node starting "${prefix}"`);
  return n;
};
export const codeOf = (wf, prefix) => nodeOf(wf, prefix).parameters.jsCode;

export function runCode(src, { input = [], runIndex = 0, $ = () => { throw new Error('no $ in this run'); } }) {
  const $input = { first: () => input[0], all: () => input };
  // eslint-disable-next-line no-new-func
  return new Function('$input', '$', '$runIndex', '$json', src)($input, $, runIndex, input[0]?.json);
}

/** Render an n8n "=..." parameter. `{{ }}` blocks are real JS against $json and $. */
export function render(value, $json, $ = () => { throw new Error('no $'); }) {
  if (typeof value !== 'string' || !value.startsWith('=')) return value;
  const body = value.slice(1);
  const evalIt = (expr) => new Function('$json', '$', `return (${expr});`)($json, $);
  const whole = body.match(/^\{\{([\s\S]*)\}\}$/);
  if (whole && !whole[1].includes('}}')) return evalIt(whole[1]);
  return body.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr) => {
    const v = evalIt(expr);
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

const testIf = (node, item, $) => {
  const c = node.parameters.conditions;
  const results = c.conditions.map((x) => {
    const left = render(x.leftValue, item.json, $);
    const { operation } = x.operator;
    if (operation === 'equals') return left === x.rightValue;
    if (operation === 'true') return left === true;
    if (operation === 'lt') return Number(left) < Number(x.rightValue);
    throw new Error(`mini-runner: unknown IF operator ${operation}`);
  });
  return c.combinator === 'and' ? results.every(Boolean) : results.some(Boolean);
};

export function execute(wf, { start, http, patch = {}, seed = [{ json: {} }], maxSteps = 600 }) {
  const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
  const runs = {};
  const batches = {};
  const trail = [];
  const $ = (name) => {
    const list = runs[name];
    if (!list) throw new Error(`Referenced node "${name}" has not run`);
    const latest = list[list.length - 1];
    return {
      first: () => (latest.find((b) => b.length) || [])[0],
      all: (branch = 0, run = list.length - 1) => {
        if (!list[run]) throw new Error(`no run ${run} of ${name}`);
        return list[run][branch] || [];
      },
    };
  };
  const queue = [{ name: start, items: seed }];
  let steps = 0;
  while (queue.length) {
    if (++steps > maxSteps) throw new Error('mini-runner: too many steps, a loop never ended');
    const { name, items } = queue.shift();
    const node = byName[name];
    if (!node) throw new Error(`mini-runner: connection to a missing node "${name}"`);
    trail.push(name);
    let out;
    const runIndex = (runs[name] || []).length;
    if (node.disabled) {
      out = [items];
    } else if (/manualTrigger|scheduleTrigger|\.webhook$|\.wait$/.test(node.type)) {
      out = [items];
    } else if (node.type.endsWith('.code')) {
      try {
        out = [runCode(node.parameters.jsCode, { input: items, runIndex, $ })];
        if (patch[name]) out[0] = patch[name](out[0]);
      } catch (e) {
        if (node.onError !== 'continueErrorOutput') { e.node = name; e.trail = trail; e.runs = runs; throw e; }
        out = [[], [{ json: { error: e.message } }]];
      }
    } else if (node.type.endsWith('.if')) {
      const yes = [], no = [];
      for (const it of items) (testIf(node, it, $) ? yes : no).push(it);
      out = [yes, no];
    } else if (node.type.endsWith('.splitInBatches')) {
      const st = batches[name];
      const reset = render(node.parameters.options.reset, items[0].json, $) === true;
      if (!st || reset) batches[name] = { left: items.slice(), done: [] };
      else st.done.push(...items);
      const s = batches[name];
      out = s.left.length ? [[], s.left.splice(0, node.parameters.batchSize)] : [s.done.slice(), []];
    } else if (node.type.endsWith('.aggregate')) {
      out = [[{ json: { data: items.map((i) => i.json) } }]];
    } else if (node.type.endsWith('.noOp')) {
      out = [items];
    } else if (node.type.endsWith('.httpRequest')) {
      const p = node.parameters;
      const url = render(p.url, items[0].json, $);
      const body = p.jsonBody ? JSON.parse(render(p.jsonBody, items[0].json, $)) : null;
      out = [[{ json: http({ node, url, body, item: items[0] }) }]];
    } else {
      throw new Error(`mini-runner: no handler for ${node.type} (${name})`);
    }
    (runs[name] = runs[name] || []).push(out);
    const conns = wf.connections[name]?.main || [];
    out.forEach((branch, i) => {
      if (!branch.length) return;
      for (const c of conns[i] || []) queue.push({ name: c.node, items: branch });
    });
  }
  return { runs, trail, last: (prefix) => {
    const k = Object.keys(runs).find((x) => x.startsWith(prefix));
    if (!k) return null;
    const l = runs[k][runs[k].length - 1];
    return (l.find((b) => b.length) || [])[0]?.json;
  } };
}

export const replyOf = (content, finish = 'stop') => ({ choices: [{ finish_reason: finish,
  message: { role: 'assistant', content } }], usage: { prompt_tokens: 0, completion_tokens: 0 } });
export const fakeVerdict = (pass = true, over = {}) => JSON.stringify({ pass, failed: pass ? [] : [7],
  why: pass ? 'clean' : 'months read alike', recommend: 8,
  scores: { continuation: 8, trust: 8, variation: 8, usefulness: 8, relevance: 8, clarity: 8 }, ...over });

/** Plain filler for a buyer with no hand-written text: passes FORMAT, not the measures. */
export const fillerAct = (sections) => Object.fromEntries(sections.map((k) => [k, "Filler text for this section. Plain words only."]));

/**
 * A fake OpenAI endpoint. `acts(id, sections)` supplies the act's JSON object (or a string).
 * Records every call with its body.
 */
export const fakeOpenAI = ({ acts = (id, sections) => fillerAct(sections), verdicts = [], onAct } = {}) => {
  const calls = [];
  const http = ({ node, url, body }) => {
    if (!url.startsWith('https://api.openai.com/')) {
      if (url.includes('pdfshift')) return { pdf: true };
      throw new Error(`a call left for ${url} from ${node.name}`);
    }
    const schema = body.response_format?.json_schema?.name;
    calls.push({ node: node.name, schema, in_chars: body.messages[0].content.length + body.messages[1].content.length, body });
    if (schema === 'verdict') { const v = verdicts.shift(); return replyOf(v === undefined ? fakeVerdict() : v); }
    const id = schema.replace('act_', '').toUpperCase();
    const sections = body.response_format.json_schema.schema.required;
    const custom = onAct && onAct({ node, id, sections, body, calls });
    if (custom) return custom;
    const a = acts(id, sections);
    return replyOf(typeof a === 'string' ? a : JSON.stringify(a));
  };
  return { http, calls };
};

/** Make a test-drive workflow carry a different session + intake. */
export function withFixture(wf, session = {}, intake = {}) {
  const copy = JSON.parse(JSON.stringify(wf));
  const n = copy.nodes.find((x) => x.name === 'T1 · the fixture session');
  const base = runCode(n.parameters.jsCode, {})[0].json;
  const it = JSON.parse(JSON.stringify(base));
  Object.assign(it.body.data.object, session);
  if (session.metadata) it.body.data.object.metadata = { ...base.body.data.object.metadata, ...session.metadata };
  Object.assign(it.intake, intake);
  n.parameters.jsCode = `return [{ json: ${JSON.stringify(it)} }];`;
  return copy;
}

export const START = 'T0 · press Execute (manual test)';

/** Run Testina's test drive with the hand-written acts. Returns the run + fake calls. */
export function handRun(over = {}) {
  const hand = handActs();
  const fake = fakeOpenAI({ acts: (id) => hand[id], ...over });
  const r = execute(loadWf(TESTINA), { start: START, http: fake.http });
  return { ...r, calls: fake.calls, hand };
}

export function report(title, groups) {
  let bad = 0, total = 0;
  console.log(`\n  ${title}`);
  for (const [head, rows] of groups) {
    console.log(`\n    ${head}`);
    for (const [label, fn] of rows) {
      total += 1;
      let ok, note = '';
      try {
        const r = fn();
        ok = r === true || (r && r.ok === true);
        if (r && typeof r === 'object' && 'note' in r) note = ` — ${r.note}`;
        if (r !== true && !(r && typeof r === 'object' && 'ok' in r)) note = ` — got ${JSON.stringify(r)}`;
      } catch (e) { ok = false; note = ` — ${e.message}`; }
      if (!ok) bad += 1;
      console.log(`      ${ok ? 'ok  ' : 'FAIL'} ${label}${note}`);
    }
  }
  console.log(`\n    ${total - bad}/${total} passed\n`);
  if (bad) process.exitCode = 1;
  return bad;
}
