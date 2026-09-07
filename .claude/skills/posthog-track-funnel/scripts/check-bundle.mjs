#!/usr/bin/env node
/**
 * check-bundle.mjs — is the tracking actually IN the deployed JavaScript? REPORT ONLY.
 *
 * The cheapest check in the skill: plain HTTP GETs, no browser, no JavaScript executed, so
 * it creates ZERO PostHog events and cannot pollute anybody's campaign numbers. Run it
 * before probe-live.mjs.
 *
 * It answers the question the source cannot: `VITE_POSTHOG_API_KEY` and friends are inlined
 * at BUILD time, so a correct repo can still deploy a bundle with analytics disabled. If the
 * phc_ key is absent here, every track() call in production is a silent no-op and nothing
 * else in this skill matters until that is fixed.
 *
 *   node .claude/skills/posthog-track-funnel/scripts/check-bundle.mjs \
 *     --url=https://theseerwithin.com/tarot/twin-flame \
 *     --funnel=twinflame --events=lander_view,checkout_initiated,bump_offered \
 *     --chunks=TwinFlameBookingPage,TwinFlameBookingChat
 *
 *   --url      any page on the deployed site        (required)
 *   --funnel   funnel name that must appear         (optional)
 *   --events   comma-separated event names          (optional)
 *   --chunks   substrings of lazy chunk filenames   (optional)
 *
 * Exit 0 = key present and every expectation found · 1 = something missing · 2 = could not run.
 */

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const i = a.indexOf('=');
      return i === -1 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)];
    }),
);

if (!args.url) {
  console.error('usage: check-bundle.mjs --url=https://… [--funnel=name] [--events=a,b] [--chunks=Name1,Name2]');
  process.exit(2);
}

const base = new URL(String(args.url));
const events = args.events ? String(args.events).split(',').map((s) => s.trim()).filter(Boolean) : [];
const chunkWants = args.chunks ? String(args.chunks).split(',').map((s) => s.trim()).filter(Boolean) : [];

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'posthog-track-funnel/check-bundle' } });
  if (!res.ok) return { ok: false, status: res.status, body: '' };
  return { ok: true, status: res.status, body: await res.text() };
}

console.log(`\nchecking ${base.href}`);
const page = await get(base.href);
if (!page.ok) {
  console.error(`  page returned HTTP ${page.status} — nothing to inspect.`);
  process.exit(2);
}
console.log(`HTTP     ${page.status}`);

// The entry bundle is referenced straight from the HTML.
const entry = [...page.body.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
if (!entry.length) {
  console.error('  no /assets/*.js in the HTML — is this a built SPA?');
  process.exit(2);
}

const sources = new Map();
for (const path of entry) {
  const r = await get(new URL(path, base).href);
  if (r.ok) sources.set(path, r.body);
}

// Lazy chunks are not in the HTML; the entry bundle names them.
const main = [...sources.values()].join('\n');
const chunkPaths = [...new Set([...main.matchAll(/"([^"]*assets\/[A-Za-z0-9_.-]+\.js)"/g)].map((m) => m[1]))];
for (const want of chunkWants) {
  const hit = chunkPaths.find((p) => p.toLowerCase().includes(want.toLowerCase()));
  if (!hit) {
    console.log(`chunk    ${want} — no matching chunk name in the entry bundle`);
    continue;
  }
  const r = await get(new URL('/' + hit.replace(/^\//, ''), base).href);
  if (r.ok) sources.set(hit, r.body);
}

const all = [...sources.values()].join('\n');
const problems = [];

console.log(`fetched  ${sources.size} file${sources.size === 1 ? '' : 's'} (${(all.length / 1024).toFixed(0)} KB)`);
console.log('\n─ findings ' + '─'.repeat(61));

const key = all.match(/phc_[A-Za-z0-9]{20,}/);
if (key) {
  console.log(`  ✓ PostHog project key inlined  ${key[0].slice(0, 12)}…`);
} else {
  console.log('  ✗ NO PostHog project key in the deployed bundle');
  problems.push(
    'VITE_POSTHOG_API_KEY was missing AT BUILD TIME, so initPostHog() returns early and every ' +
    'track() call is a silent no-op. Set it in the deploy environment and REBUILD — an env edit ' +
    'alone does not always trigger a rebuild.',
  );
}

if (args.funnel) {
  const n = all.split(String(args.funnel)).length - 1;
  if (n > 0) console.log(`  ✓ funnel name "${args.funnel}" present (${n}×)`);
  else {
    console.log(`  ✗ funnel name "${args.funnel}" absent`);
    problems.push(`The deployed build does not know the funnel "${args.funnel}" — the route registration did not ship.`);
  }
}

for (const ev of events) {
  const present = all.includes(`"${ev}"`) || all.includes(`'${ev}'`);
  if (present) {
    console.log(`  ✓ event "${ev}" present`);
  } else if (ev === 'purchase_completed') {
    console.log(`  i event "${ev}" absent from the client — correct, it is fired SERVER-side`);
  } else {
    console.log(`  ✗ event "${ev}" absent`);
    problems.push(`"${ev}" is not in the deployed JavaScript. It cannot fire, whatever the source says.`);
  }
}

console.log('\n─ verdict ' + '─'.repeat(62));
if (problems.length) for (const p of problems) console.log(`  ✗ ${p}`);
else console.log('  ✓ the deployed bundle carries the key and everything expected.');
console.log('\nPresence in the bundle proves the code SHIPPED, not that events ARRIVE.');
console.log('Run probe-live.mjs for that.\n');

process.exit(problems.length ? 1 : 0);
