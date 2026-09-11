#!/usr/bin/env node
/**
 * audit-wiring.mjs — static PostHog wiring audit for one funnel. REPORT ONLY.
 *
 * Reads the repo and reports what is missing for a funnel's clicks and revenue to be
 * attributable in PostHog. It NEVER edits a file, never touches a network, never runs a
 * build. Every finding names the file it came from so a human can go and look.
 *
 * Why this exists: the two rosters that decide a funnel's PostHog identity are UNSYNCED.
 * The client decides `funnel` for pageviews/lander_view; the server decides it for
 * purchase_completed. Register one and not the other and you get clicks with no revenue,
 * or revenue with no clicks — which is exactly what backend offer 03 shipped.
 *
 *   node .claude/skills/posthog-track-funnel/scripts/audit-wiring.mjs \
 *     --route=/tarot/twin-flame --funnel=twinflame --offer=twin-flame
 *
 *   --route   the entry path a visitor lands on            (required)
 *   --funnel  the PostHog `funnel` property it should emit (required)
 *   --offer   backend offer key, for BE offers only        (optional)
 *
 * Exit 0 = nothing to fix · 1 = findings · 2 = could not run.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync, execFileSync } from 'node:child_process';

const ROOT = process.cwd();

const FILES = {
  clientFunnel: 'client/src/lib/funnel.ts',
  clientPosthog: 'client/src/lib/posthog.ts',
  serverPosthog: 'server/lib/posthog.ts',
  beAnalytics: 'server/lib/backendPurchaseAnalytics.ts',
  webhooks: 'server/routes/webhooks.ts',
  app: 'client/src/App.tsx',
  funnelConfig: 'shared/funnelConfig.ts',
  backendOffers: 'shared/backendOffers.ts',
};

// Per-funnel EVENT CONTRACT. The rest of this audit proves the funnel NAME is wired; it does
// NOT prove the funnel fires the EVENTS an insight needs — which is exactly how Pixiu passed
// "0 critical" while checkout_initiated was missing. --events overrides this.
//   V1 + ad funnels: the LEAD is the email capture (lead_captured), then checkout, then the
//     server-side purchase. BE booking offers: a lander_view from the emailed link, then
//     checkout, then the server purchase (upsell views/purchases reuse the same event NAMES).
// These lists must cover EVERY event the Stage-5 insight recipes ask for. They did not:
// `upsell_accepted` was in both recipes and audited for neither, and `lander_view` was in the
// FE recipe only. A funnel whose upsells never fire would pass clean while insight steps 4-7
// read zero forever — the same silent hole the contract exists to close.
const V1_EVENTS = ['lander_view', 'lead_captured', 'checkout_initiated', 'purchase_completed', 'upsell_accepted'];
const BE_EVENTS = ['lander_view', 'checkout_initiated', 'purchase_completed', 'upsell_accepted'];
const EXPECTED_EVENTS = {
  v1: V1_EVENTS, fb: V1_EVENTS, fb2: V1_EVENTS, gdn: V1_EVENTS,
  palm: V1_EVENTS, tarot: V1_EVENTS, read: V1_EVENTS,
  soulmate: V1_EVENTS,
  // Lead-gen funnels into the V2 chat service, NOT purchase funnels. evelyn fires no
  // checkout_initiated at all; aiden's is step:'rescue'. Neither emits purchase_completed
  // with a funnel — their money runs through credits (credit_purchase_completed).
  evelyn: ['lander_view', 'lead_captured'],
  aiden:  ['lander_view', 'lead_captured', 'checkout_initiated'],
  twinflame: BE_EVENTS, judgement: BE_EVENTS, pixiu: BE_EVENTS,
};
// Where each event is fired, so a missing one points at the right file. purchase_completed is
// SERVER-side; the rest are client-side.
const EVENT_HINTS = {
  lead_captured: 'fire trackPH("lead_captured", { funnel, step }) at the email capture (V1: client/src/hooks/useConversation.ts).',
  checkout_initiated: 'fire trackPH("checkout_initiated", { funnel, step }) in the checkout/booking handler, before redirect.',
  lander_view: 'fired centrally by App.tsx when getPostHogFunnel() is non-null; the shared /offers/upsell/* pages fire their own (OffersUpsell*.tsx).',
  purchase_completed: 'emitted server-side by buildBackendPurchaseEvent()/posthog.capture() from the Stripe webhook.',
};

// ---------------------------------------------------------------- args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const i = a.indexOf('=');
      return i === -1 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)];
    }),
);

if (!args.route || !args.funnel) {
  console.error('usage: audit-wiring.mjs --route=/path --funnel=name [--offer=offer-key]');
  process.exit(2);
}

// 🔴 Git Bash / MSYS rewrites a leading-slash argument into a Windows path, so
// `--route=/tarot/twin-flame` silently arrives as `C:/Program Files/Git/tarot/twin-flame`
// and every route check then answers the wrong question while looking fine. Refuse rather
// than guess at the original — a wrong answer here is worse than no answer.
const rawRoute = String(args.route);
if (/^[A-Za-z]:[\\/]/.test(rawRoute)) {
  console.error('\n[posthog-audit] --route arrived as a Windows path:');
  console.error(`    ${rawRoute}`);
  console.error('\nGit Bash rewrote the leading "/". Re-run it one of these ways:');
  console.error('    MSYS_NO_PATHCONV=1 node …/audit-wiring.mjs --route=/tarot/twin-flame …');
  console.error('    node …/audit-wiring.mjs --route=tarot/twin-flame …      (leading slash optional)');
  console.error('    …or run it from PowerShell, which does not rewrite arguments.\n');
  process.exit(2);
}
const route = '/' + rawRoute.replace(/^\/+/, '').replace(/\/+$/, '');
const funnel = String(args.funnel);
const offer = args.offer ? String(args.offer) : null;

// A stale checkout produces a page of criticals that read exactly like real ones. This repo
// has had a main checkout >100 commits behind, so say it loudly before the findings.
let staleness = null;
try {
  const behind = execSync('git rev-list --count HEAD..origin/Production', {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'],
  }).toString().trim();
  if (Number(behind) > 0) staleness = { behind: Number(behind), branch };
} catch { /* not a git repo, or origin/Production unknown — carry on */ }
if (args.ref) staleness = null; // reading a ref directly, so the working tree is irrelevant

// ---------------------------------------------------------------- helpers
const findings = [];
const passes = [];

// --ref reads the files from a git ref instead of the working tree. This is the answer to a
// stale checkout: audit what is actually DEPLOYED (`--ref=origin/Production`) rather than
// whatever your branch happens to hold. Node spawns git directly, so MSYS does not rewrite
// the `ref:path` argument the way Git Bash would.
const ref = args.ref ? String(args.ref) : null;

function read(key) {
  if (ref) {
    try {
      return execSync(`git show ${ref}:${FILES[key]}`, {
        cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
      }).toString();
    } catch {
      return null; // absent on that ref
    }
  }
  const p = resolve(ROOT, FILES[key]);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

/** A finding a human must act on. `where` is always a real path. */
function fail(severity, title, where, detail) {
  findings.push({ severity, title, where, detail });
}
function pass(title, where) {
  passes.push({ title, where });
}

// ---------------------------------------------------------------- 1. client route → funnel
const funnelTs = read('clientFunnel');
if (!funnelTs) {
  console.error(`[posthog-audit] cannot read ${FILES.clientFunnel} — run from the repo root.`);
  process.exit(2);
}

// The route can be registered literally, or via a PREFIX const. Accept either, but only
// inside getPostHogFunnel — a mention elsewhere in the file proves nothing.
const fnBody = (() => {
  const start = funnelTs.indexOf('export function getPostHogFunnel');
  if (start === -1) return '';
  const end = funnelTs.indexOf('\nexport function', start + 10);
  return funnelTs.slice(start, end === -1 ? undefined : end);
})();

const prefixConsts = [...funnelTs.matchAll(/export const (\w+)\s*=\s*["']([^"']+)["']/g)]
  .filter(([, , value]) => value === route)
  .map(([, name]) => name);

// A route reaches its funnel by one of THREE mechanisms, and only checking the first two is
// how this audit produced a confident false "not registered" for /fb-tarot:
//   1. a literal path inside getPostHogFunnel
//   2. an exported PREFIX const referenced inside getPostHogFunnel
//   3. the shared ad-funnel table (shared/funnelConfig.ts), reached via funnelDefForPath —
//      this is how every V1 ad funnel (fb, fb2, gdn, palm, tarot, read) is wired.
const cfg = read('funnelConfig') ?? '';
const cfgEntry = [...cfg.matchAll(/prefix:\s*["']([^"']+)["'][^}]*?posthog:\s*["']([^"']+)["']/g)]
  .map(([, prefix, posthog]) => ({ prefix, posthog }))
  .find((e) => e.prefix === route);
const viaConfig = Boolean(cfgEntry) && /funnelDefForPath/.test(fnBody);

const routeRegistered =
  fnBody.includes(`"${route}"`) ||
  fnBody.includes(`'${route}'`) ||
  prefixConsts.some((c) => fnBody.includes(c)) ||
  viaConfig;

if (viaConfig && cfgEntry.posthog !== funnel) {
  fail(
    'critical',
    `client: ${route} resolves to funnel "${cfgEntry.posthog}", not "${funnel}"`,
    FILES.funnelConfig,
    `The shared ad-funnel table maps this prefix to "${cfgEntry.posthog}". Every insight ` +
      `filtered on funnel = "${funnel}" will read empty. Fix the expectation or the table — ` +
      'but do not change a live funnel name without checking which insights already filter on it.',
  );
} else if (viaConfig) {
  pass(`client: ${route} resolves to "${funnel}" via the shared funnel table`, FILES.funnelConfig);
} else if (routeRegistered) {
  pass(`client: ${route} resolves to a funnel`, FILES.clientFunnel);
} else {
  fail(
    'critical',
    `client: ${route} is NOT registered in getPostHogFunnel`,
    FILES.clientFunnel,
    'Pageviews and lander_view will carry no `funnel` property, so CLICKS from this funnel ' +
      'cannot be attributed to a mailed link. Add a case to getPostHogFunnel (and a matching ' +
      'one in getPostHogStep). Copy how the twin-flame prefix is wired.',
  );
}

// The union type gates the value even when the case exists.
const unionMatch = funnelTs.match(/export type PostHogFunnel\s*=([\s\S]*?);/);
if (unionMatch && !new RegExp(`["']${funnel}["']`).test(unionMatch[1])) {
  fail(
    'critical',
    `client: "${funnel}" is missing from the PostHogFunnel union`,
    FILES.clientFunnel,
    'The route case cannot return a value the union does not contain — this will not compile, ' +
      'or worse, was cast around. Add it to the union.',
  );
} else if (unionMatch) {
  pass(`client: "${funnel}" is a declared PostHogFunnel`, FILES.clientFunnel);
}

// getPostHogStep decides the `step` on every client event.
const stepBody = (() => {
  const start = funnelTs.indexOf('export function getPostHogStep');
  if (start === -1) return '';
  const end = funnelTs.indexOf('\nexport function', start + 10);
  return funnelTs.slice(start, end === -1 ? undefined : end);
})();
if (stepBody && !stepBody.includes(`"${funnel}"`) && !stepBody.includes(`'${funnel}'`)) {
  fail(
    'warn',
    `client: getPostHogStep has no branch for "${funnel}"`,
    FILES.clientFunnel,
    'Client events will fall through to a default step. Funnel insights keyed on `step` ' +
      'will not line up with the server-side purchase steps.',
  );
} else if (stepBody) {
  pass(`client: getPostHogStep handles "${funnel}"`, FILES.clientFunnel);
}

// ---------------------------------------------------------------- 2. server offer → funnel
if (offer) {
  const be = read('beAnalytics');
  if (!be) {
    fail(
      'warn',
      `${FILES.beAnalytics} does not exist in this working tree`,
      FILES.beAnalytics,
      staleness
        ? `All backend checks were SKIPPED. Your checkout is ${staleness.behind} commits behind ` +
          'origin/Production, so this is far more likely to be a stale tree than a missing file.'
        : 'All backend checks were SKIPPED. Either this is not a backend offer, or the branch ' +
          'predates the backend analytics module.',
    );
  } else {
    const funnelMap = be.match(/BACKEND_FUNNEL[^=]*=\s*\{([\s\S]*?)\};/);
    if (funnelMap && new RegExp(`['"]${offer}['"]`).test(funnelMap[1])) {
      pass(`server: offer "${offer}" maps to a PostHog funnel`, FILES.beAnalytics);
    } else {
      fail(
        'critical',
        `server: offer "${offer}" is NOT in BACKEND_FUNNEL`,
        FILES.beAnalytics,
        `purchase_completed will fall back to the raw offer key or 'backend', so REVENUE will ` +
          `not group under "${funnel}". Add '${offer}': '${funnel}'.`,
      );
    }

    const stepMap = be.match(/BACKEND_STEP[^=]*=\s*\{([\s\S]*?)\};/);
    if (stepMap) {
      const mapped = [...stepMap[1].matchAll(/(\w+):\s*['"](\w+)['"]/g)].map(([, k]) => k);
      pass(`server: BACKEND_STEP knows ${mapped.length} products (${mapped.join(', ')})`, FILES.beAnalytics);
      fail(
        'info',
        `server: confirm every be_ product for "${offer}" is in BACKEND_STEP`,
        FILES.beAnalytics,
        `Anything missing emits step:'other' — revenue is never dropped, but it will not land ` +
          `on a funnel step, so the sales/upsell1/upsell2 breakdown will be wrong. ` +
          `Currently mapped: ${mapped.join(', ')}.`,
      );
    }
  }
}

// ---------------------------------------------------------------- 2b. the event contract
// Files matching an ERE across the given pathspecs, ref-aware. `git grep -l` prefixes each
// line with "<ref>:" when a ref is given, so strip that for a clean path.
function grepFiles(pattern, pathspecs) {
  const gitArgs = ['grep', '-lE', pattern];
  if (ref) gitArgs.push(ref);
  gitArgs.push('--', ...pathspecs);
  try {
    const out = execFileSync('git', gitArgs, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return (out ? out.split('\n').map((l) => (ref ? l.slice(l.indexOf(':') + 1) : l)) : [])
      .filter((f) => !/\.(test|spec)\./.test(f)); // a name in a test file is not a wired call site

  } catch {
    return []; // git grep exits 1 on no match
  }
}

// A tree-wide grep for an event name answers "does SOME funnel fire it", not "does THIS funnel
// fire it" — checkout_initiated lives in V1's shared hook and Twin Flame's page, so a naive grep
// falsely passes it for Pixiu. So:
//   · central events (lander_view, purchase_completed) are already bound to the funnel by the
//     route/offer checks above — presence is enough.
//   · V1 + ad funnels fire from ONE shared hook with a COMPUTED funnel, so tree-wide presence
//     is the correct signal (the literal "v1" never appears in a track call).
//   · a BE offer fires page-level events with a LITERAL funnel: '<name>', so the event must be
//     co-located with that literal — this is what catches Pixiu's missing checkout_initiated.
// Fired by SHARED code that derives the funnel from a roster already checked above, so
// presence is the right test and the BE co-location test would false-fail them:
// lander_view from App.tsx, purchase_completed server-side, upsell_accepted from
// useUpsellChat/useUpsell2Chat via backendOfferFunnel(offer) / getPostHogFunnel().
const CENTRAL = new Set(['lander_view', '$pageview', 'purchase_completed', 'upsell_accepted']);

// Which funnels are BE booking offers? Read it from the SERVER map that already decides exactly
// this for revenue — BACKEND_FUNNEL in backendPurchaseAnalytics.ts — rather than keeping a list
// here. A BE offer MUST appear in that map to record revenue at all, so a new offer classifies
// itself and there is no second roster to forget. Falls back to the registry if it cannot be read.
function backendFunnelsFromServer() {
  const src = read('beAnalytics') ?? '';
  const at = src.indexOf('const BACKEND_FUNNEL');
  if (at === -1) return new Set();
  const end = src.indexOf('};', at);
  const body = src.slice(at, end === -1 ? undefined : end);
  return new Set([...body.matchAll(/:\s*['"]([a-z0-9-]+)['"]/gi)].map((m) => m[1]));
}
// UNION, never a replacement. The server map auto-detects a new offer; the registry rows keep
// a known BE funnel scoped even at a ref where the server side had not landed yet. Using the
// map ALONE let the two disagree: pixiu at c54dcf7 drew its BE contract from the registry but
// FE scoping from the absent map, so checkout_initiated passed TREE-WIDE — a false pass on the
// exact event that was missing.
const BE_FUNNELS = (() => {
  const set = backendFunnelsFromServer();
  for (const f of Object.keys(EXPECTED_EVENTS)) {
    if (EXPECTED_EVENTS[f] === BE_EVENTS) set.add(f);
  }
  return set;
})();
const isBE = BE_FUNNELS.has(funnel) || Boolean(offer);

function checkEvent(ev) {
  const pathspecs = ev === 'purchase_completed' ? ['server/lib', 'server/routes'] : ['client/src'];
  const eventFiles = grepFiles(`["']${ev}["']`, pathspecs);
  if (!eventFiles.length) return { verdict: 'missing' };
  if (CENTRAL.has(ev)) return { verdict: 'central', file: eventFiles[0] };
  // Non-BE: V1 + ad funnels fire from ONE shared hook with a COMPUTED funnel, so the literal
  // name never appears and a tree-wide hit is the only signal available. Say so rather than
  // claim proof — for a funnel NOT wired to that hook this is exactly where a false pass hides.
  if (!isBE) return { verdict: 'treewide', file: eventFiles[0] };
  const funnelFiles = grepFiles(`funnel:[[:space:]]*["']${funnel}["']`, ['client/src']);
  const both = eventFiles.filter((f) => funnelFiles.includes(f));
  return both.length ? { verdict: 'present', file: both[0] } : { verdict: 'wrongfunnel', file: eventFiles[0] };
}

// Does this offer carry an order BUMP? Read from the catalog, so a new offer needs no edit here.
// A bump that never announces itself leaves the take-rate without a denominator: you can count
// who TOOK it, never who SAW it.
function offerHasBump() {
  if (!offer) return false;
  const src = read('backendOffers') ?? '';
  const at = src.indexOf("'" + offer + "':");
  if (at === -1) return false;
  const open = src.indexOf('{', at);
  if (open === -1) return false;
  let i = open + 1, depth = 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return /\bbump\s*:\s*\{/.test(src.slice(open, i));
}

// THE CONTRACT. EXPECTED_EVENTS is an OVERRIDE list, not the whole world: any funnel not named
// there falls back to its FAMILY's events, so a brand-new funnel is audited from its very first
// run. Before this, an unknown funnel checked ZERO events and still printed "0 critical" — a
// clean-looking pass that proves nothing, which is the exact failure this section exists to stop.
const CORE_EVENTS = args.events
  ? String(args.events).split(',').map((s) => s.trim()).filter(Boolean)
  : (EXPECTED_EVENTS[funnel] ?? (isBE ? BE_EVENTS : V1_EVENTS));

// Advisory events are worth having but never blocking — a missing one costs a denominator,
// not revenue. Skipped entirely when the caller names the events explicitly.
const ADVISORY_EVENTS = args.events ? [] : offerHasBump() ? ['bump_offered'] : [];

const ADVICE = {
  bump_offered:
    'fire trackPH("bump_offered", { funnel, step }) where the bump renders — see ' +
    'TwinFlameBookingPage.tsx. Without it you can measure bump TAKE but not bump EXPOSURE.',
};

function reportEvent(ev, severity) {
  const r = checkEvent(ev);
  if (r.verdict === 'present') return pass(`event: "${ev}" fires for "${funnel}"`, r.file);
  if (r.verdict === 'central') return pass(`event: "${ev}" present (funnel binding checked above)`, r.file);
  if (r.verdict === 'treewide')
    return pass(`event: "${ev}" present tree-wide, not proven for "${funnel}"`, r.file);
  const hint = EVENT_HINTS[ev] ?? ADVICE[ev] ?? `Add a track("${ev}", …) call.`;
  if (r.verdict === 'wrongfunnel') {
    return fail(
      severity,
      `event: "${ev}" fires in the app but NOT for "${funnel}"`,
      FILES.app,
      `No track("${ev}", { funnel: "${funnel}" }) exists — it fires for other funnels only. ` + hint,
    );
  }
  return fail(
    severity,
    `event: "${ev}" is never fired anywhere`,
    ev === 'purchase_completed' ? FILES.webhooks : FILES.app,
    hint + ' Without it the funnel/insight step for this event stays empty.',
  );
}

// The family decides WHICH contract is applied, so say so when it was a guess rather than a
// lookup. Certain only when the SERVER map names it, --offer names it, it resolves through the
// shared ad-funnel table, or it has an explicit registry row. A half-registered funnel — client
// side done, server side not — is precisely how backend offer 03 shipped, and it would other-
// wise be audited as a V1 funnel and checked for a lead_captured a BE offer never fires.
const familyCertain =
  Boolean(offer) ||
  BE_FUNNELS.has(funnel) ||
  viaConfig ||
  Object.prototype.hasOwnProperty.call(EXPECTED_EVENTS, funnel);
if (!args.events && !familyCertain) {
  fail(
    'warn',
    `event contract: family ASSUMED for "${funnel}", not looked up`,
    FILES.clientFunnel,
    `Audited as ${isBE ? 'a BE booking offer' : 'a V1/ad funnel'} because this funnel is in ` +
      'neither roster, so the events checked below may be the wrong contract entirely. ' +
      'If it IS a backend offer, re-run with --offer=<key>; otherwise state the contract ' +
      'outright with --events=a,b,c. Treat the event findings as provisional until you do.',
  );
}

if (!CORE_EVENTS.length) {
  // Belt and braces: the family could not be worked out. BLOCKING on purpose — a pass with zero
  // event checks looks identical to a healthy funnel and is worse than no answer at all.
  fail(
    'critical',
    `could not determine the event contract for funnel "${funnel}"`,
    FILES.clientFunnel,
    'Pass --events=a,b,c, or add a row to EXPECTED_EVENTS in audit-wiring.mjs.',
  );
} else {
  for (const ev of CORE_EVENTS) reportEvent(ev, 'critical');
  for (const ev of ADVISORY_EVENTS) reportEvent(ev, 'warn');
}

// ---------------------------------------------------------------- 3. the silent killers
const clientPh = read('clientPosthog');
if (clientPh) {
  if (/if\s*\(\s*!\s*apiKey\s*\)/.test(clientPh) && /!initialized/.test(clientPh)) {
    fail(
      'info',
      'BUILD-TIME kill switch: VITE_POSTHOG_API_KEY',
      FILES.clientPosthog,
      'If the key is absent AT BUILD TIME, initPostHog() returns early and every track() call ' +
        'becomes a silent no-op — one console warning, no network request, no error. This is a ' +
        'property of the deployed BUNDLE, not of the source: prove it with probe-live.mjs, ' +
        'which greps the served JS for the phc_ key.',
    );
  }
  if (/registerUTMs/.test(clientPh)) {
    pass('client: registerUTMs() promotes utm_* to super-properties', FILES.clientPosthog);
  } else {
    fail('warn', 'client: no registerUTMs()', FILES.clientPosthog,
      'Without it only the landing event carries the UTM tag, so later events (and revenue) lose attribution.');
  }
}

const serverPh = read('serverPosthog');
if (serverPh && /createNoopClient|POSTHOG_API_KEY not set/.test(serverPh)) {
  fail(
    'info',
    'RUNTIME kill switch: POSTHOG_API_KEY (server)',
    FILES.serverPosthog,
    'Absent server key ⇒ posthog-node is replaced by a no-op client and every server-side ' +
      'purchase_completed silently vanishes. Cannot be checked from the repo — verify the ' +
      'deploy environment has it.',
  );
}

// The two incidents that cost this project days. Both are file-state checks.
const be = read('beAnalytics');
if (be) {
  if (/dedupeUuid/.test(be)) {
    pass('trap: purchase events derive a VALID uuid (dedupeUuid)', FILES.beAnalytics);
  } else if (/uuid:/.test(be)) {
    fail(
      'critical',
      'trap: a non-UUID event `uuid` is SILENTLY DROPPED at ingest',
      FILES.beAnalytics,
      'PostHog stores the event uuid in a ClickHouse UUID column. Passing a raw Stripe id ' +
        '(cs_live_… / pi_…) makes PostHog drop the event on ingest: the webhook still returns 200, ' +
        'the order row and the customer email still write, and the revenue event never appears. ' +
        'Fix = a deterministic UUIDv5 derived from the Stripe id, so retries still dedupe.',
    );
  }
}

const hooks = read('webhooks');
if (hooks && offer) {
  if (/beEmail/.test(hooks)) {
    pass('trap: hosted-checkout email resolved from customer_details', FILES.webhooks);
  } else {
    fail(
      'critical',
      'trap: the hosted-checkout email guard is empty',
      FILES.webhooks,
      "With customer_creation:'always' Stripe leaves session.customer_email NULL and puts the " +
        'address in customer_details.email. A revenue guard reading customer_email is therefore ' +
        'empty and skips the event while the order still records — the "order saved, no analytics" ' +
        'symptom. Resolve customer_details?.email || customer_email || metadata.email.',
    );
  }
}

// ---------------------------------------------------------------- report
const W = (s, n) => String(s).padEnd(n);
const ICON = { critical: '✗', warn: '!', info: 'i' };

console.log('');
console.log(`PostHog wiring audit — ${route}  →  funnel "${funnel}"${offer ? `  (offer ${offer})` : ''}`);
console.log('─'.repeat(78));

if (staleness) {
  console.log('');
  console.log(`!  STALE CHECKOUT — "${staleness.branch}" is ${staleness.behind} commits behind origin/Production.`);
  console.log('   This audit reads your WORKING TREE, so findings below may describe code that was');
  console.log('   fixed weeks ago. Rebase, or re-read the file on the deployed branch:');
  console.log('       MSYS_NO_PATHCONV=1 git show origin/Production:<path>');
}

if (passes.length) {
  console.log('\nAlready wired:');
  for (const p of passes) console.log(`  ✓ ${W(p.title, 58)} ${p.where}`);
}

const order = { critical: 0, warn: 1, info: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);

if (findings.length) {
  console.log('\nFindings:');
  for (const f of findings) {
    console.log(`\n  ${ICON[f.severity]} [${f.severity}] ${f.title}`);
    console.log(`     ${f.where}`);
    for (const line of wrap(f.detail, 72)) console.log(`     ${line}`);
  }
}

const blocking = findings.filter((f) => f.severity === 'critical').length;
console.log('\n' + '─'.repeat(78));
console.log(
  `${passes.length} wired · ${blocking} critical · ` +
    `${findings.filter((f) => f.severity === 'warn').length} warn · ` +
    `${findings.filter((f) => f.severity === 'info').length} info`,
);
console.log('This audit only reads the SOURCE. It cannot prove an event reaches PostHog —');
console.log('run scripts/probe-live.mjs against the deployed URL for that.\n');

process.exit(blocking > 0 ? 1 : 0);

function wrap(text, width) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      lines.push(line.trim());
      line = w;
    } else {
      line += ' ' + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
