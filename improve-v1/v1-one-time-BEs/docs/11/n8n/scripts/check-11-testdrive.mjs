/**
 * Proves by inspection that a test-drive build has no path to a buyer.
 *   node scripts/check-11-testdrive.mjs
 * Walks the connections from every trigger, then inspects every reachable node. Then it runs the
 * chain with a fake network that records each address, as a second, independent proof.
 */
import fs from 'fs';
import path from 'path';
import { loadWf, GETBACK, GIVING, BUILD, execute, fakeOpenAI, goldReading, START, report, runCode, nodeOf } from './lib-11.mjs';

const files = [GETBACK, GIVING];
const manual = '11-fulfilment-MANUAL-GETBACK.n8n.json';
if (fs.existsSync(path.join(BUILD, manual))) files.push(manual);
const ALLOWED = new Set(['api.openai.com', 'api.pdfshift.io']);
const FORBIDDEN_TYPE = /webhook$|\.wait$|emailSend|gmail|sendGrid|mailchimp|aweber|stripe|postgres|supabase/i;
const FORBIDDEN_TEXT = /aweber|api\.stripe|TODO-|\/api\/be\/|self_link|reading_url|be-11-delivered/i;
const SECRETS = [/sk-[A-Za-z0-9_-]{16,}/, /whsec_[A-Za-z0-9]{8,}/, /rk_live_/, /sk_live_/, /Bearer\s+[A-Za-z0-9._-]{12,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, /service_role/, /X-N8N-API-KEY/i, /postgres(?:ql)?:\/\//];
const hostOf = (u) => { try { return new URL(String(u).replace(/^=/, '').replace(/\{\{[\s\S]*?\}\}/g, 'x')).host; } catch { return `?${u}`; } };

const groups = [];
let printed = false;
for (const file of files) {
  const wf = loadWf(file);
  const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
  const triggers = wf.nodes.filter((n) => /Trigger$/.test(n.type));
  const seen = new Set(), stack = triggers.map((t) => t.name);
  while (stack.length) { const n = stack.pop(); if (seen.has(n)) continue; seen.add(n);
    for (const br of wf.connections[n]?.main || []) for (const c of br) stack.push(c.node); }
  const reach = [...seen].map((n) => byName[n]);
  const enabled = reach.filter((n) => n && !n.disabled);
  const http = enabled.filter((n) => n.type.endsWith('.httpRequest'));
  const text = JSON.stringify(wf);
  const liveText = JSON.stringify(enabled);
  const item = runCode(nodeOf(wf, 'T1 ·').parameters.jsCode, {})[0].json;
  const s = item.body.data.object;
  const urls = [];
  const fake = fakeOpenAI({ sections: (k) => goldReading()[k] });
  const http2 = (x) => { urls.push(x.url); return fake.http(x); };
  const r = execute(wf, { start: wf.nodes.find((n) => n.name === START) ? START : triggers[0].name, http: http2 });
  if (!printed) { printed = true;
    console.log(`\n  test-drive nodes (${wf.nodes.length}):`);
    for (const n of wf.nodes) console.log(`    ${n.disabled ? '[off] ' : '      '}${n.name}`); }
  groups.push([file, [
    ['every connection lands on a real node', () => Object.entries(wf.connections).every(([k, o]) => byName[k]
      && o.main.flat().every((c) => byName[c.node]))],
    ['every node is reachable from a trigger', () => { const orphans = wf.nodes.filter((n) => !seen.has(n.name)).map((n) => n.name);
      return orphans.length ? { ok: false, note: orphans.join(', ') } : true; }],
    ['workflow is inactive', () => wf.active === false],
    ['no delivery, log, wait, webhook or intake node exists at all', () => { const bad = wf.nodes.filter((n) => /^(1|2a|2b|8b|9|13|14|14a|15) ·/.test(n.name) || n.type.endsWith('.webhook') || n.type.endsWith('.wait'));
      return bad.length ? { ok: false, note: bad.map((n) => n.name).join(', ') } : true; }],
    ['no reachable node has a forbidden type', () => !enabled.some((n) => FORBIDDEN_TYPE.test(n.type))],
    ['enabled network calls go to OpenAI and PDFShift only', () => { const hosts = [...new Set(http.map((n) => hostOf(n.parameters.url)))];
      return { ok: hosts.every((h) => ALLOWED.has(h)), note: hosts.join(', ') }; }],
    ['storage upload and link nodes are present and disabled', () => wf.nodes.filter((n) => /^(12|13a) ·/.test(n.name)).every((n) => n.disabled === true)
      && wf.nodes.filter((n) => /^(12|13a) ·/.test(n.name)).length === 2],
    ['nothing after the PDF is enabled', () => { const after = wf.connections['11 · PDFShift → PDF'].main.flat().map((c) => byName[c.node]);
      return after.every((n) => n.disabled); }],
    ['no enabled node mentions AWeber, Stripe, our API or the send', () => { const m = liveText.match(FORBIDDEN_TEXT);
      return m ? { ok: false, note: `found ${m[0]}` } : true; }],
    ['enabled nodes use only the OpenAI and PDFShift credentials', () => { const creds = [...new Set(enabled.flatMap((n) => Object.values(n.credentials || {})).map((c) => c.name))];
      return { ok: creds.length === 2 && creds.includes('OpenAi account') && creds.includes('pdfshift-header-auth'), note: creds.join(', ') }; }],
    ['no secret anywhere in the JSON', () => { const hit = SECRETS.find((re) => re.test(text)); return hit ? { ok: false, note: String(hit) } : true; }],
    ['triggers are as expected', () => { const t = triggers.map((n) => n.type.split('.')[1]).sort().join();
      return file === manual ? t === 'manualTrigger' : t === 'manualTrigger,scheduleTrigger'; }],
    ['the tick is the clock-aligned one the driver needs', () => { const n = triggers.find((x) => /schedule/.test(x.type));
      return !n || n.parameters.rule.interval[0].expression === '0 * * * * *'; }],
    ['fixture is plainly fake: test order, example.com, invented name', () => /^cs_test_/.test(s.id) && /@example\.com$/.test(s.customer_details.email) && /Test|Fake/.test(item.intake.fullBirthName)],
    ['fixture has the bump off', () => s.metadata.bump === '0'],
    ['fixture is a paid 11 order, so it passes node 2', () => s.payment_status === 'paid' && s.metadata.product === 'be_unsent_letter'],
    ['a full fake run called OpenAI and PDFShift and nothing else', () => { const hosts = [...new Set(urls.map(hostOf))];
      return { ok: hosts.every((h) => ALLOWED.has(h)) && hosts.length === 2 && !!r.last('11 ·'), note: `${urls.length} calls: ${hosts.join(', ')}` }; }],
  ]]);
}
const bad = report('11 · test drive has no path to a buyer', groups);
process.exit(bad ? 1 : 0);
