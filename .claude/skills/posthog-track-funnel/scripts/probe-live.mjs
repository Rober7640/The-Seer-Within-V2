#!/usr/bin/env node
/**
 * probe-live.mjs — prove PostHog events actually ARRIVE from a deployed page. REPORT ONLY.
 *
 * Reading the source proves nothing here: every failure mode in this area is silent. A
 * missing build-time key, a dropped event, a bot-filtered browser — all of them look
 * exactly like a page that works. This drives the real deployed page and asserts on the
 * ingestion requests.
 *
 *   node .claude/skills/posthog-track-funnel/scripts/probe-live.mjs \
 *     --url=https://theseerwithin.com/tarot/twin-flame/preview-page \
 *     --funnel=twinflame --expect=lander_view,checkout_initiated \
 *     --check-all --click=button-checkout
 *
 *   --url        deployed page to probe                                  (required)
 *   --funnel     the `funnel` property every business event must carry   (optional)
 *   --expect     comma-separated event names that MUST arrive            (optional)
 *   --click      data-testid to click after load (fires deeper events)   (optional)
 *   --check-all  tick every [data-testid^="checkbox-"] first             (optional)
 *   --tag        utm_campaign value (default: a unique skillprobe_ tag)  (optional)
 *   --headed     watch it run                                            (optional)
 *   --wait       ms to wait after each step (default 9000)               (optional)
 *
 * SAFETY — what this script cannot do:
 *   · It ABORTS every checkout/payment request, so no Stripe session is ever created and
 *     nothing is ever charged. It cannot complete a purchase.
 *   · It ABORTS Facebook, Google Ads and Trackdesk, so probing production does not fire a
 *     real pixel PageView or an affiliate click into anyone's ad reporting.
 *   · It never writes a file and never touches a database.
 *
 * SAFETY — what it unavoidably DOES:
 *   · It creates REAL PostHog events on the target project. That is the entire point. They
 *     are tagged with a unique skillprobe_ campaign so they are trivial to exclude.
 *   · If the page assigns an A/B treatment on load, the visit may enrol one subject in that
 *     experiment. Prefer a /preview route when the funnel has one. The report says so.
 *
 * Exit 0 = every expectation met · 1 = expectation failed · 2 = could not run.
 */

import { chromium } from 'playwright';
import zlib from 'node:zlib';

// posthog-js isLikelyBot() drops every capture() from an automated browser: it checks the UA
// blocklist (which contains "headlesschrome"), navigator.webdriver AND
// navigator.userAgentData.brands. Spoofing the UA string alone is NOT enough — the brands
// array still says HeadlessChrome. Without masking all three, capture() silently returns and
// this probe would "prove" PostHog is broken when it is perfectly fine.
const REAL_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const BLOCK = [
  /\/api\/[^?]*checkout/i,      // our own checkout endpoints, any funnel
  /\/api\/[^?]*\/charge/i,      // 1-click upsell charges
  /checkout\.stripe\.com/i,
  /api\.stripe\.com/i,
  /js\.stripe\.com/i,
  /facebook\.com|facebook\.net/i,
  /googleadservices|googlesyndication|google-analytics/i,
  /trackdesk|tdcdn/i,
];

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const i = a.indexOf('=');
      return i === -1 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)];
    }),
);

if (!args.url) {
  console.error('usage: probe-live.mjs --url=https://… [--funnel=name] [--expect=a,b] [--click=testid] [--check-all]');
  process.exit(2);
}

const tag = args.tag ? String(args.tag) : `skillprobe_${Date.now().toString(36)}`;
const wait = Number(args.wait ?? 9000);
const expect = args.expect ? String(args.expect).split(',').map((s) => s.trim()).filter(Boolean) : [];
const target = (() => {
  const u = new URL(String(args.url));
  if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', tag);
  return u.toString();
})();

if (args.tag && !/^skillprobe/.test(String(args.tag))) {
  console.log(`\n!  --tag=${args.tag} is not a skillprobe_ tag. If this is a REAL campaign tag,`);
  console.log('   this run will add fake clicks to a number someone is measuring. Ctrl-C now if so.\n');
}

const events = [];
const ingest = [];
const statuses = [];
const blocked = new Set();
const consoleNotes = [];

const browser = await chromium.launch({ headless: !args.headed });
const ctx = await browser.newContext({ userAgent: REAL_UA });
const page = await ctx.newPage();

await page.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false, configurable: true });
  Object.defineProperty(Navigator.prototype, 'userAgentData', {
    get: () => ({
      brands: [
        { brand: 'Google Chrome', version: '126' },
        { brand: 'Chromium', version: '126' },
      ],
      mobile: false,
      platform: 'Windows',
    }),
    configurable: true,
  });
});

await page.route('**/*', (route) => {
  const url = route.request().url();
  const hit = BLOCK.find((re) => re.test(url));
  if (hit) {
    blocked.add(url.split('?')[0]);
    return route.abort();
  }
  return route.continue();
});

page.on('request', (req) => {
  const url = req.url();
  if (!/i\.posthog\.com/.test(url) || /us-assets/.test(url)) return;
  if (!/\/e\/|\/i\/v0\/e/.test(url)) return;
  ingest.push(url.split('?')[0]);
  const buf = req.postDataBuffer();
  const texts = [];
  if (buf) {
    try { texts.push(zlib.gunzipSync(buf).toString('utf8')); }
    catch { texts.push(buf.toString('utf8')); }
  }
  const m = (buf?.toString('utf8') ?? '').match(/(?:[?&]|^)data=([^&]+)/);
  if (m) {
    try {
      const raw = Buffer.from(decodeURIComponent(m[1]), 'base64');
      try { texts.push(zlib.gunzipSync(raw).toString('utf8')); }
      catch { texts.push(raw.toString('utf8')); }
    } catch { /* not base64 — already captured above */ }
  }
  for (const t of texts) {
    try {
      const parsed = JSON.parse(t);
      for (const e of Array.isArray(parsed) ? parsed : [parsed]) {
        if (e?.event) events.push({ event: e.event, props: e.properties ?? {} });
      }
    } catch { /* partial body — the other decode path covers it */ }
  }
});

page.on('response', (r) => {
  if (/i\.posthog\.com/.test(r.url()) && /\/e\/|\/i\/v0\/e/.test(r.url())) statuses.push(r.status());
});
page.on('console', (m) => { if (/posthog/i.test(m.text())) consoleNotes.push(`${m.type()}: ${m.text()}`); });

console.log(`\nprobing  ${target}`);
let status = 0;
try {
  const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  status = resp ? resp.status() : 0;
  console.log(`HTTP     ${status}`);
  await page.waitForTimeout(wait);

  if (args['check-all']) {
    const boxes = page.locator('[data-testid^="checkbox-"] input[type=checkbox], input[type=checkbox][data-testid^="checkbox-"]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check({ timeout: 5000 }).catch(() => {});
    console.log(`gate     ticked ${n} checkbox${n === 1 ? '' : 'es'}`);
  }

  if (args.click) {
    try {
      await page.getByTestId(String(args.click)).click({ timeout: 15000 });
      console.log(`clicked  ${args.click}`);
      await page.waitForTimeout(wait);
    } catch (e) {
      console.log(`clicked  ${args.click} — NOT FOUND (${String(e.message).split('\n')[0].slice(0, 90)})`);
      console.log('         a gated CTA often does not RENDER until every agreement is ticked; try --check-all');
    }
  }
} finally {
  await browser.close();
}

// ---------------------------------------------------------------- report
const names = [...new Set(events.map((e) => e.event))];
const business = events.filter((e) => !e.event.startsWith('$'));

console.log('\n─ ingestion ' + '─'.repeat(60));
console.log(`requests   ${ingest.length}${ingest.length ? '  → ' + [...new Set(ingest)].join(', ') : '  (NONE)'}`);
console.log(`HTTP       ${statuses.join(', ') || '(none)'}`);
console.log(`events     ${names.join(', ') || '(NONE)'}`);

if (business.length) {
  console.log('\n─ business events ' + '─'.repeat(54));
  for (const e of business) {
    console.log(
      `  ${e.event.padEnd(22)} funnel=${String(e.props.funnel ?? '—').padEnd(12)} ` +
      `step=${String(e.props.step ?? '—').padEnd(10)} utm_campaign=${e.props.utm_campaign ?? '—'}`,
    );
  }
}
if (consoleNotes.length) console.log(`\nconsole    ${consoleNotes.join(' | ')}`);

const problems = [];
if (ingest.length === 0) {
  problems.push(
    'NO ingestion requests at all. In order of likelihood: the build-time VITE_POSTHOG_API_KEY ' +
    'is missing from the deployed bundle (grep the served JS for phc_); the page never called ' +
    'initPostHog(); or a blocker sits in front of us.i.posthog.com.',
  );
}
if (statuses.some((s) => s >= 400)) problems.push(`PostHog rejected a request (HTTP ${statuses.filter((s) => s >= 400).join(', ')}).`);

for (const want of expect) {
  if (!names.includes(want)) problems.push(`expected event "${want}" never arrived.`);
}
// Only the ROUTE-LEVEL events prove route registration: they are fired centrally from the
// router, so a missing `funnel` on one of them means getPostHogFunnel returned null. A
// component-level event (tarot_bridge_view, palm_bridge_view…) fires from inside a page and
// legitimately passes its own properties without a funnel — treating that as a failure makes
// the probe cry wolf on every V1 ad funnel.
const ROUTE_LEVEL = new Set(['lander_view', '$pageview']);
const notes = [];
if (args.funnel) {
  for (const e of business) {
    if (e.props.funnel && e.props.funnel !== args.funnel) {
      problems.push(`${e.event} carries funnel="${e.props.funnel}", expected "${args.funnel}".`);
    } else if (!e.props.funnel) {
      if (ROUTE_LEVEL.has(e.event)) {
        problems.push(`${e.event} carries NO funnel property — the route is not registered in getPostHogFunnel.`);
      } else {
        notes.push(`${e.event} carries no funnel property. Fine for a component-level event, but it cannot be filtered by funnel — keep it out of funnel insights.`);
      }
    }
  }
  if (!business.some((e) => ROUTE_LEVEL.has(e.event))) {
    notes.push('no route-level event (lander_view) arrived, so route registration was not exercised.');
  }
}
for (const e of business) {
  if (!e.props.utm_campaign) {
    problems.push(`${e.event} lost the UTM tag — check registerUTMs() runs before the first event fires.`);
  }
}

console.log('\n─ verdict ' + '─'.repeat(62));
if (problems.length) {
  for (const p of [...new Set(problems)]) console.log(`  ✗ ${p}`);
} else {
  console.log('  ✓ events reached PostHog and were accepted, carrying the expected funnel and UTM tag.');
}
for (const n of [...new Set(notes)]) console.log(`  i ${n}`);

console.log('\n─ what this run did to real data ' + '─'.repeat(39));
console.log(`  · created real PostHog events tagged utm_campaign=${tag}`);
console.log(`  · blocked ${blocked.size} payment/pixel request${blocked.size === 1 ? '' : 's'} — no checkout, no charge, no pixel fired`);
console.log('  · if this page assigns an A/B treatment on load, one exposure row may exist.');
console.log('    Prefer a /preview route where the funnel has one.');
console.log('\nThis proves events were SENT and accepted. Confirming they are queryable in the');
console.log('PostHog UI is a separate step — a fixed date range returns nothing, and');
console.log('"filter out internal and test users" defaults ON.\n');

process.exit(problems.length ? 1 : 0);
