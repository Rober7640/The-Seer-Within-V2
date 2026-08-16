// creative-cascade — read the BUILT territory out of the registries.
//
// WHY THIS FILE EXISTS. cascade-map.mjs (what is built?) and cascade-stack.mjs (what
// earns?) must agree on which hook belongs to which angle. If each carried its own
// copy of that map they would drift, and the gap report would name an angle the
// revenue report files somewhere else — two sources of truth, which is worse than none.
//
// Everything is DERIVED from source, never hardcoded, so adding a hook or an angle to
// tarotReads.ts shows up here on the next run with no edit to this skill.
import fs from 'node:fs';

const listOf = (src, name, type) => {
  const m = src.match(new RegExp(`export const ${name}: ${type}\\[\\] = \\[([\\s\\S]*?)\\]`));
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]) : [];
};

const headlinesOf = (src) => {
  const m = src.match(/export const HEADLINES:[^=]*= \{([\s\S]*?)\n\}/);
  const out = new Map();
  if (m) for (const h of m[1].matchAll(/'([a-z0-9-]+)':\s*(['"`])((?:\\.|(?!\2).)*)\2/g)) {
    out.set(h[1], h[3].replace(/\\'/g, "'"));
  }
  return out;
};

const unionType = (src, name) => {
  const m = src.match(new RegExp(`export type ${name} =([^\\n]*(?:\\n\\s*\\|[^\\n]*)*)`));
  return m ? [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]) : [];
};

export function readRegistry({
  tarot = 'client/src/content/tarotReads.ts',
  palm = 'client/src/content/palmReads.ts',
  app = 'client/src/App.tsx',
} = {}) {
  for (const f of [tarot, palm, app]) {
    if (!fs.existsSync(f)) { console.error(`🔴 not found: ${f} — run scripts from the repo root`); process.exit(2); }
  }
  const tarotSrc = fs.readFileSync(tarot, 'utf8');
  const palmSrc = fs.readFileSync(palm, 'utf8');
  const appSrc = fs.readFileSync(app, 'utf8');

  // The angle of a hook is decided by angleForHook(), which tests membership of the
  // *_HOOKS arrays in order then falls through. Parsing that function rather than
  // hardcoding a table is what stops this skill disagreeing with the running app.
  const arrayToAngle = new Map();
  for (const m of tarotSrc.matchAll(/if\s*\(([A-Z_0-9]+)\.includes\(hook\)\)\s*return\s*'([a-z0-9-]+)'/g)) {
    arrayToAngle.set(m[1], m[2]);
  }
  const fallbackAngle = (tarotSrc.match(/\n\s{2}return\s*'([a-z0-9-]+)'\n\}/) || [, 'decode-him'])[1];

  const hookAngle = new Map();
  for (const [arrName, angle] of arrayToAngle) {
    const body = tarotSrc.match(new RegExp(`export const ${arrName}: TarotHook\\[\\] = \\[([\\s\\S]*?)\\]`));
    if (!body) continue;
    for (const h of body[1].matchAll(/'([a-z0-9-]+)'/g)) hookAngle.set(h[1], angle);
  }

  const tarotHooks = listOf(tarotSrc, 'TAROT_HOOKS', 'TarotHook');
  const palmHooks = listOf(palmSrc, 'PALM_HOOKS', 'PalmHook');
  for (const h of tarotHooks) if (!hookAngle.has(h)) hookAngle.set(h, fallbackAngle);

  const byAngle = new Map();
  for (const h of tarotHooks) {
    const a = hookAngle.get(h);
    if (!byAngle.has(a)) byAngle.set(a, []);
    byAngle.get(a).push(h);
  }

  // A FORMAT is a delivery shape, not art. /fb-tarot shows a static reveal card then a
  // greeting; /b drops the card and reveals in chat; /c is interactive. Same registry
  // entry, three different ads. Derived from the routes so a new one cannot be missed.
  const formats = [];
  for (const m of appSrc.matchAll(/<Route path="\/fb-(tarot|palm)(\/[bc])?" component=\{(Tarot|Palm)Bridge\}/g)) {
    formats.push(`${m[1]}-${m[2] ? m[2].slice(1) : 'a'}`);
  }
  if (/<Route path="\/" component=\{LandingPage\}/.test(appSrc)) formats.push('bare');

  return {
    tarotHooks, palmHooks, hookAngle, byAngle, formats,
    tarotFormats: formats.filter((f) => f.startsWith('tarot-')),
    palmFormats: formats.filter((f) => f.startsWith('palm-')),
    tarotHeadlines: headlinesOf(tarotSrc),
    palmHeadlines: headlinesOf(palmSrc),
    decks: unionType(tarotSrc, 'TarotDeck'),
    signs: unionType(palmSrc, 'PalmSign'),
    defaultDeck: (tarotSrc.match(/export const DEFAULT_DECK: TarotDeck = '([a-z0-9-]+)'/) || [])[1],
    // A hook slug seen in the DB tells you which funnel it came from, because the two
    // rosters share no slugs. Used to split tarot from palm traffic in cascade-stack.
    funnelOf(hook) {
      if (tarotHooks.includes(hook)) return 'tarot';
      if (palmHooks.includes(hook)) return 'palm';
      return 'unknown';
    },
    // The reporting group for a hook. Palm has NO angle layer in code, so palm hooks
    // group under themselves — stated rather than faked, because inventing a palm angle
    // map here would be this skill quietly disagreeing with the app.
    groupOf(hook) {
      if (tarotHooks.includes(hook)) return hookAngle.get(hook) || fallbackAngle;
      if (palmHooks.includes(hook)) return `palm:${hook}`;
      return `unknown:${hook}`;
    },
  };
}
