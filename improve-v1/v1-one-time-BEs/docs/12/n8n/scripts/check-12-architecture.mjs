/**
 * Structure of the built 12 workflows: nodes compile, the model request is what the plan says, the
 * forbidden parameters are absent, no build carries a secret, and the LIVE build's wiring runs
 * through to the send (every outside call faked).
 *   node scripts/check-12-architecture.mjs
 */
import { loadWf, LIVE, TESTINA, FAKETTA, MANUAL_TESTINA, MANUAL_FAKETTA, nodeOf, execute, fakeOpenAI, handActs,
  render, report, fakeVerdict, ENGINE_SRC } from './lib-12.mjs';

const live = loadWf(LIVE);
const all = [live, loadWf(TESTINA), loadWf(FAKETTA), loadWf(MANUAL_TESTINA), loadWf(MANUAL_FAKETTA)];
const code = (wf) => wf.nodes.filter((n) => n.type.endsWith('.code'));
const models = (wf) => wf.nodes.filter((n) => n.parameters.url === 'https://api.openai.com/v1/chat/completions');
const stub = { response_format: { type: 'json_schema', json_schema: { name: 'act_a', strict: true, schema: { type: 'object' } } }, voice: 'x', prompt: 'y', grade_user: 'z' };
const renderedBody = (n) => JSON.parse(render(n.parameters.jsonBody, stub, () => ({ first: () => ({ json: stub }) })));
const bodies = (wf) => models(wf).map((n) => [n.name, renderedBody(n)]);

const hand = handActs();
const session = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_n8n_testdrive_12_testina' /* same id as the test drive: rotations are seeded off it, and the hand acts follow them */, payment_status: 'paid', created: 1794322800,
  customer_details: { email: 'x@example.com' }, metadata: { product: 'be_lucky_numbers', bump: '1', bumpProduct: 'full_year', c: '11' } } } };
const intake0 = { fullBirthName: 'Testina Rose Testerly', dateOfBirth: '1968-07-21', firstName: 'Testina' };
const liveRun = (over = {}, intake = intake0, verdicts = [fakeVerdict(), fakeVerdict()]) => {
  const hits = [];
  const fake = fakeOpenAI({ acts: (id) => hand[id], verdicts });
  const http = (x) => { hits.push(x.node.name);
    if (x.node.name.startsWith('2a')) return { intake };
    if (x.node.name.startsWith('13a')) return { signedURL: '/object/sign/x' };
    if (x.node.name.startsWith('14 ')) return { entries: [{ self_link: 'https://api.aweber.com/x', custom_fields: {} }] };
    if (/^(8b|9|12|14a|15) /.test(x.node.name)) return {};
    return fake.http(x); };
  const r = execute(live, { start: '1 · Stripe webhook', seed: [{ json: { body: { ...session, ...over } } }], http });
  return { ...r, hits };
};
const L = liveRun();
if (process.argv.includes('--why')) console.log(L.runs['7a · Read the verdict'][0][0][0].json.verdict.why);
const SECRET = /sk-[A-Za-z0-9]{10,}|sk_live|sk_test_[A-Za-z0-9]{10,}|eyJhbGciOi|Bearer [A-Za-z0-9._-]{20,}|api_key\s*[:=]\s*["'][A-Za-z0-9]{12,}/;

const bad = report('12 · architecture', [
  ['ALL FIVE BUILDS', [
    ['every Code node compiles', () => all.every((wf) => code(wf).every((n) => { new Function('$input', '$', '$runIndex', '$json', n.parameters.jsCode); return true; }))],
    ['every build is inactive', () => all.every((w) => w.active === false)],
    ['no build carries a secret: credentials are n8n references only', () => all.every((w) => !SECRET.test(JSON.stringify(w)))],
    ['node names and ids are unique', () => all.every((w) => new Set(w.nodes.map((n) => n.name)).size === w.nodes.length && new Set(w.nodes.map((n) => n.id)).size === w.nodes.length)],
    ['every connection points at a node that exists', () => all.every((w) => { const names = new Set(w.nodes.map((n) => n.name));
      return Object.entries(w.connections).every(([k, v]) => names.has(k) && v.main.every((b) => b.every((c) => names.has(c.node)))); })],
    ['no model node sends its own auth header; the OpenAI credential is a reference', () => all.every((w) => models(w).every((n) => !n.parameters.sendHeaders && n.credentials.openAiApi.id))],
    ['no Anthropic path', () => !/api\.anthropic|claude-/i.test(JSON.stringify(live))],
    ['the engine is pasted in, byte for byte, in every build', () => all.every((w) => nodeOf(w, '3 ·').parameters.jsCode.includes(ENGINE_SRC))],
  ]],
  ['THE MODEL REQUEST', [
    ['four act calls and one grade per pass (4b, its retry 4s, and 7)', () => models(live).map((n) => n.name.split(' ')[0]).join(' ') === '4b 4s 7'],
    ['the writer (4b, 4s) uses gpt-6.1-terra; the grader (7) stays on gpt-6.1-sol', () => bodies(live).every(([n, b]) => b.model === (/^7 ·/.test(n) ? 'gpt-6.1-sol' : 'gpt-6.1-terra'))],
    ['effort is on the allowed list', () => bodies(live).every(([, b]) => ['low', 'medium', 'high', 'xhigh', 'max'].includes(b.reasoning_effort))],
    ['temperature, top_p, logprobs, top_logprobs never sent', () => bodies(live).every(([, b]) => !['temperature', 'top_p', 'logprobs', 'top_logprobs'].some((k) => k in b))],
    ['max_completion_tokens set, max_tokens not', () => bodies(live).every(([, b]) => b.max_completion_tokens > 0 && !('max_tokens' in b))],
    ['every call is a strict json_schema', () => bodies(live).every(([, b]) => b.response_format.type === 'json_schema' && b.response_format.json_schema.strict === true)],
    ['system block first on every call', () => bodies(live).every(([, b]) => b.messages[0].role === 'system' && b.messages[1].role === 'user')],
    ['HTTP retries are on, and bounded', () => models(live).every((n) => n.retryOnFail === true && n.maxTries === 2)],
  ]],
  ['THE LOOP (lessons from 01 and 02)', [
    ['act loop resets on a fresh item', () => /prose === undefined/.test(nodeOf(live, '4 ·').parameters.options.reset)],
    ['format errors take the error output', () => nodeOf(live, '4c ·').onError === 'continueErrorOutput'],
    ['regenerate goes back to the act fan-out, past the engine', () => live.connections['8c · Go round again'].main[0][0].node.startsWith('3c')],
    ['done branch goes to collect, loop branch to compose', () => { const o = live.connections['4 · Each act'].main;
      return o[0][0].node.startsWith('5') && o[1][0].node.startsWith('4a'); }],
    ['both act paths pass through the rejoin node', () => live.connections['4c · Keep the act'].main[0][0].node.startsWith('4z')
      && live.connections['4t · Validate the retried act'].main[0][0].node.startsWith('4z')],
  ]],
  ['TEST DRIVES', [
    ['test drives have no delivery or log nodes', () => all.slice(1).every((w) => !w.nodes.some((n) => /^(1|2a|8b|9|13|14|14a|15) ·/.test(n.name)))],
    ['MANUAL builds have no schedule trigger; TESTDRIVE builds tick once a minute', () => all.slice(3).every((w) => !w.nodes.some((n) => /scheduleTrigger/.test(n.type)))
      && all.slice(1, 3).every((w) => w.nodes.some((n) => /scheduleTrigger/.test(n.type)))],
    ['storage upload and signing are disabled in test drives (no --storage)', () => all.slice(1).every((w) => ['12 ·', '13a ·'].every((p) => { const n = w.nodes.find((x) => x.name.startsWith(p)); return !n || n.disabled === true; }))],
  ]],
  ['THE LIVE BUILD RUNS TO THE SEND (all fake)', [
    ['the wiring reaches node 15', () => ({ ok: L.hits.includes('15 · Mark delivered'), note: `${L.hits.length} outside calls` })],
    ['order: intake, four acts, grade, log, PDF, upload, sign, find, tag, delivered', () => {
      const short = L.hits.map((h) => h.split(' ')[0]).filter((v, i, a) => v !== a[i - 1]).join(' ');
      return { ok: short === '2a 4b 7 9 11 12 13a 14 14a 15', note: short }; }],
    ['a regenerate survives the log node and still reaches the send', () => {
      const r = liveRun({}, undefined, [fakeVerdict(false), fakeVerdict(true)]);
      return { ok: r.hits.includes('8b · Log the first failure') && r.hits.includes('15 · Mark delivered') && r.last('10 ·').attempt === 2, note: `${r.hits.length} outside calls` }; }],
    ['a different product is ignored', () => liveRun({ data: { object: { ...session.data.object, metadata: { product: 'be_other' } } } }).hits.length === 0],
    ['an unpaid session is ignored', () => liveRun({ data: { object: { ...session.data.object, payment_status: 'unpaid' } } }).hits.length === 0],
    ['missing intake holds before any model call', () => { try { liveRun({}, {}); return false; } catch (e) { return /^HOLD/.test(e.message); } }],
    ['the AWeber step is a find, never a create', () => !/POST/.test(nodeOf(live, '14 ·').parameters.method || 'GET')],
    ['the AWeber write keeps her other custom fields and adds be-12-delivered', () => { const t = JSON.stringify(nodeOf(live, '14a ·').parameters);
      return /\.\.\.\(\$json\.entries\[0\]\.custom_fields/.test(t) && /be-12-delivered/.test(t); }],
    ['the wait lands 24 hours after she paid', () => /plus\(\{ hours: 24 \}\)/.test(nodeOf(live, '13 ·').parameters.dateTime)],
    ['the live build states its own TODOs (app URL, token), and the push refuses them', () => /TODO/.test(JSON.stringify(live))],
  ]],
]);
process.exit(bad ? 1 : 0);
