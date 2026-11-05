/**
 * Structure of the built workflows: nodes compile, model request is what the plan says, the
 * forbidden parameters are absent, and the LIVE build's wiring runs through to the send.
 *   node scripts/check-11-architecture.mjs
 */
import { loadWf, LIVE, GETBACK, GIVING, nodeOf, execute, fakeOpenAI, goldReading, render, report, SPEC, DIANE_TWELVE, fakeVerdict } from './lib-11.mjs';

const live = loadWf(LIVE), get = loadWf(GETBACK), giv = loadWf(GIVING);
const code = (wf) => wf.nodes.filter((n) => n.type.endsWith('.code'));
const models = (wf) => wf.nodes.filter((n) => n.parameters.url === 'https://api.openai.com/v1/chat/completions');
const renderedBody = (n) => { const stub = { voice: 'x', prompt: 'y', grade_user: 'z' }; return JSON.parse(render(n.parameters.jsonBody, stub)); };
const bodies = (wf) => models(wf).map((n) => [n.name, renderedBody(n)]);

const session = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_live_wiring', payment_status: 'paid', created: 1793620800,
  customer_details: { email: 'x@example.com' }, metadata: { product: 'be_unsent_letter', bump: '0' } } } };
const handDeal = (items) => { const j = items[0].json;
  j.deal = j.deal.map((d, i) => ({ ...d, card: DIANE_TWELVE[i], card_name: SPEC.cards[DIANE_TWELVE[i]].name })); return items; };
const liveRun = (over = {}, intake = { fullBirthName: 'Diane Ruth Marshall', dateOfBirth: '1967-09-02', firstName: 'Diane' }, verdicts = [fakeVerdict(), fakeVerdict()]) => {
  const hits = [];
  const fake = fakeOpenAI({ sections: (k) => goldReading()[k], verdicts });
  const http = (x) => { hits.push(x.node.name);
    if (x.node.name.startsWith('2a')) return { intake };
    if (x.node.name.startsWith('13a')) return { signedURL: '/object/sign/x' };
    if (x.node.name.startsWith('14 ')) return { entries: [{ self_link: 'https://api.aweber.com/x', custom_fields: {} }] };
    if (/^(8b|9|12|14a|15) /.test(x.node.name)) return {};
    return fake.http(x); };
  const r = execute(live, { start: '1 · Stripe webhook', seed: [{ json: { body: { ...session, ...over } } }], http,
    patch: { '3 · Numbers, answers, the deal': handDeal } });
  return { ...r, hits };
};
const L = liveRun();

const bad = report('11 · architecture', [
  ['ALL BUILDS', [
    ['every Code node compiles', () => [live, get, giv].every((wf) => code(wf).every((n) => { new Function('$input', '$', '$runIndex', '$json', n.parameters.jsCode); return true; }))],
    ['every build is inactive', () => [live, get, giv].every((w) => w.active === false)],
    ['node names are unique and ids are unique', () => [live, get, giv].every((w) => new Set(w.nodes.map((n) => n.name)).size === w.nodes.length && new Set(w.nodes.map((n) => n.id)).size === w.nodes.length)],
    ['no node carries a pinned model key or an auth header to OpenAI', () => models(live).every((n) => !n.parameters.sendHeaders && n.credentials.openAiApi.id === 'de6vaPn0hPs3icyh')],
    ['no Anthropic path is left over', () => !/anthropic|claude-/i.test(JSON.stringify(live))],
    ['no joiner: nothing rewrites the reading after the acts', () => !live.nodes.some((n) => /joiner|join into/i.test(n.name))],
  ]],
  ['THE MODEL REQUEST', [
    ['all four model nodes use gpt-6.1-sol', () => { const m = bodies(live); return m.length === 4 && m.every(([, b]) => b.model === 'gpt-6.1-sol'); }],
    ['effort is on the allowed list', () => bodies(live).every(([, b]) => ['low', 'medium', 'high', 'xhigh', 'max'].includes(b.reasoning_effort))],
    ['temperature, top_p, logprobs, top_logprobs never sent', () => bodies(live).every(([, b]) => !['temperature', 'top_p', 'logprobs', 'top_logprobs'].some((k) => k in b))],
    ['max_completion_tokens set, max_tokens not', () => bodies(live).every(([, b]) => b.max_completion_tokens > 0 && !('max_tokens' in b))],
    ['plan and grade use strict json_schema', () => { const s = bodies(live).filter(([, b]) => b.response_format);
      return s.length === 2 && s.every(([, b]) => b.response_format.json_schema.strict === true); }],
    ['system block first on every call', () => bodies(live).every(([, b]) => b.messages[0].role === 'system' && b.messages[1].role === 'user')],
    ['a model request is valid JSON after n8n fills it in', () => bodies(get).length === 4],
    ['HTTP retries are on, and bounded', () => models(live).every((n) => n.retryOnFail === true && n.maxTries === 2)],
  ]],
  ['THE LOOP (lessons from 02)', [
    ['act loop resets on a fresh item', () => /prose === undefined/.test(nodeOf(live, '4 ·').parameters.options.reset)],
    ['format errors take the error output', () => nodeOf(live, '4c ·').onError === 'continueErrorOutput'],
    ['regenerate returns to the plan, past the deal', () => live.connections['8c · Go round again'].main[0][0].node.startsWith('3a')],
    ['done branch goes to collect, loop branch to compose', () => { const o = live.connections['4 · Each act'].main;
      return o[0][0].node.startsWith('5') && o[1][0].node.startsWith('4a'); }],
    ['both act paths pass through the rejoin node', () => live.connections['4c · Keep the prose'].main[0][0].node.startsWith('4z')
      && live.connections['4t · Validate the retried act'].main[0][0].node.startsWith('4z')],
  ]],
  ['THE LIVE BUILD RUNS TO THE SEND (all fake)', [
    ['the wiring reaches node 15', () => ({ ok: L.hits.includes('15 · Mark delivered'), note: `${L.hits.length} outside calls` })],
    ['order: load intake, plan, acts, grade, log, PDF, upload, sign, find, tag, delivered', () => {
      const short = L.hits.map((h) => h.split(' ')[0]).filter((v, i, a) => v !== a[i - 1]).join(' ');
      return { ok: short === '2a 3b 4b 7 9 11 12 13a 14 14a 15', note: short }; }],
    ['a regenerate survives the log node in between and still reaches the send', () => {
      const r = liveRun({}, undefined, [fakeVerdict(false), fakeVerdict(true)]);
      return { ok: r.hits.includes('8b · Log the first failure') && r.hits.includes('15 · Mark delivered')
        && r.hits.filter((h) => h.startsWith('3b')).length === 2 && r.last('10 ·').attempt === 2, note: `${r.hits.length} outside calls` }; }],
    ['a different product is ignored', () => { const r = liveRun({ data: { object: { ...session.data.object, metadata: { product: 'be_other' } } } }); return r.hits.length === 0; }],
    ['an unpaid session is ignored', () => { const r = liveRun({ data: { object: { ...session.data.object, payment_status: 'unpaid' } } }); return r.hits.length === 0; }],
    ['missing intake holds before any model call', () => { try { liveRun({}, {}); return false; } catch (e) { return /^HOLD/.test(e.message); } }],
    ['the send is a find, never a create', () => !/POST/.test(nodeOf(live, '14 ·').parameters.method || 'GET')],
    ['AWeber write keeps her other custom fields', () => /\.\.\.\(\$json\.entries\[0\]\.custom_fields/.test(JSON.stringify(nodeOf(live, '14a ·').parameters))],
    ['the wait lands 24 hours after she paid', () => /plus\(\{ hours: 24 \}\)/.test(nodeOf(live, '13 ·').parameters.dateTime)],
    ['live build states its own TODOs, and the push refuses them', () => /TODO/.test(JSON.stringify(live))],
  ]],
]);
process.exit(bad ? 1 : 0);
