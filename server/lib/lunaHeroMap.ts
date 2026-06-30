/**
 * Luna hero-map — renders a DailySky as a LANDSCAPE "vibe shot" hero (SVG string),
 * for email Template B ("visual feature"). 544×408 (4:3) to fit the template's
 * hero card.
 *
 * Two data-driven modes, picked per day:
 *   1. ASPECT "two luminaries" — when the day has a headline aspect, draw the two
 *      bodies as glowing orbs whose horizontal gap encodes the aspect (touching for
 *      a conjunction → opposite edges for an opposition), joined by the aspect glyph.
 *      This is literally Template B's "two stars almost touching" concept, and the
 *      orb (degrees-from-exact) is shown in the caption.
 *   2. MOON-PHASE disc — fallback when there's no headline aspect: the moon at the
 *      day's real illuminated fraction, lit on the correct side (waxing → right,
 *      waning → left from the Moon–Sun elongation).
 *
 * Like lunaSkyMap, this emits a plain SVG string (no React) so it can be rasterised
 * to PNG for email (scripts/build-luna-batch.ts), but on a night-sky palette rather
 * than the paper wheel.
 */
import type { DailySky, DailySkyAspect } from './astrologyEngine';

const W = 544;
const H = 408;

// ── Night-sky palette ──
const SKY_TOP = '#0B1026';
const SKY_MID = '#141A33';
const SKY_BOT = '#1C2230';
const PAPER = '#FBF7F0';
const BRASS = '#B6863C';
const BRASS_LT = '#D9B670';
const INK = '#1C2230';

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

// Per-body orb tint (center of the glow). Warm bodies warm, cool bodies cool.
const PLANET_TINT: Record<string, string> = {
  Sun: '#F4C66A', Moon: '#E4EAF4', Mercury: '#CBC4B6', Venus: '#F2DBA8',
  Mars: '#E08A6A', Jupiter: '#E9C892', Saturn: '#CFB985', Uranus: '#A9D2DA',
  Neptune: '#93ABDB', Pluto: '#BBA0B5',
};

// Canonical separation (degrees) of each aspect type — used to space the two orbs.
const ASPECT_ANGLE: Record<string, number> = {
  Conjunction: 0, Sextile: 60, Square: 90, Trine: 120, Opposition: 180,
};
const ASPECT_WORD: Record<string, string> = {
  Conjunction: 'meeting', Sextile: 'in easy reach of', Square: 'at odds with',
  Trine: 'flowing with', Opposition: 'facing off with',
};

const tint = (name: string) => PLANET_TINT[name] ?? '#D9CFC0';

/** Small deterministic PRNG (LCG) seeded from the date so the starfield is stable
 *  per day but differs day to day — no Math.random (keeps builds reproducible). */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
function dateSeed(iso: string): number {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) { h ^= iso.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Faint scattered stars + a couple of brass twinkles. */
function starfield(seed: number): string {
  const rnd = seeded(seed);
  const out: string[] = [];
  for (let i = 0; i < 54; i++) {
    const x = (rnd() * W).toFixed(1);
    const y = (rnd() * (H - 60)).toFixed(1);   // keep stars out of the caption band
    const r = (0.4 + rnd() * 1.3).toFixed(2);
    const o = (0.15 + rnd() * 0.55).toFixed(2);
    out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${PAPER}" opacity="${o}"/>`);
  }
  // four-point brass sparkles
  for (let i = 0; i < 3; i++) {
    const x = +(40 + rnd() * (W - 80)).toFixed(1);
    const y = +(30 + rnd() * (H - 130)).toFixed(1);
    const a = (3 + rnd() * 2).toFixed(1);
    out.push(`<path d="M ${x} ${y - +a} L ${x} ${y + +a} M ${x - +a} ${y} L ${x + +a} ${y}" stroke="${BRASS_LT}" stroke-width="0.8" opacity="0.7"/>`);
  }
  return out.join('\n');
}

/** Background gradient + frame + stars. */
function backdrop(seed: number): string {
  return `
  <defs>
    <linearGradient id="lv-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SKY_TOP}"/>
      <stop offset="0.62" stop-color="${SKY_MID}"/>
      <stop offset="1" stop-color="${SKY_BOT}"/>
    </linearGradient>
    <radialGradient id="lv-horizon" cx="0.5" cy="1.05" r="0.9">
      <stop offset="0" stop-color="#3A4368" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#3A4368" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#lv-sky)"/>
  <rect width="${W}" height="${H}" fill="url(#lv-horizon)"/>
${starfield(seed)}
  <rect x="10.5" y="10.5" width="${W - 21}" height="${H - 21}" fill="none" stroke="${BRASS}" stroke-width="1" opacity="0.45"/>`;
}

/** A glowing luminary orb with its glyph; optional retrograde mark. */
function orb(cx: number, cy: number, r: number, name: string, retro: boolean, idPrefixIndex: number): string {
  const id = `lv-orb-${idPrefixIndex}`;
  const c = tint(name);
  const glyph = PLANET_GLYPH[name] ?? '✦';
  return `
  <defs>
    <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${c}" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="${c}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${c}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}-body" cx="0.4" cy="0.38" r="0.7">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.45" stop-color="${c}"/>
      <stop offset="1" stop-color="${c}" stop-opacity="0.82"/>
    </radialGradient>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${(r * 2.1).toFixed(1)}" fill="url(#${id}-glow)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}-body)" stroke="${PAPER}" stroke-width="1" stroke-opacity="0.45"/>
  <text x="${cx}" y="${(cy + 1).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${(r * 0.92).toFixed(1)}" fill="${INK}" font-family="Georgia, 'Times New Roman', serif">${glyph}︎</text>
  ${retro ? `<text x="${(cx + r * 0.72).toFixed(1)}" y="${(cy - r * 0.62).toFixed(1)}" font-size="13" fill="${BRASS_LT}" font-family="Georgia, serif">℞</text>` : ''}`;
}

function capsLabel(cx: number, y: number, text: string, size: number, fill: string, spacing = 2.4): string {
  return `<text x="${cx}" y="${y}" text-anchor="middle" font-size="${size}" letter-spacing="${spacing}" font-weight="bold" fill="${fill}" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif">${esc(text.toUpperCase())}</text>`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Mode 1: aspect "two luminaries" ──
function aspectScene(sky: DailySky, asp: DailySkyAspect): string {
  const cy = 184;
  const r = 52;
  const angle = ASPECT_ANGLE[asp.aspectType] ?? 90;
  // Gap between orb centers grows with the aspect angle: touching at 0°, near the
  // frame edges at 180°.
  const minGap = r * 1.78;                 // conjunction: orbs overlapping/kissing
  const maxGap = W - 2 * (r + 26);         // opposition: pushed to the margins
  const gap = minGap + (maxGap - minGap) * (angle / 180);
  const x1 = W / 2 - gap / 2;
  const x2 = W / 2 + gap / 2;

  const retroOf = (n: string) => !!sky.placements.find(p => p.name === n)?.retrograde;
  const parts: string[] = [];

  // connector + aspect glyph roundel at the midpoint
  parts.push(`<line x1="${(x1).toFixed(1)}" y1="${cy}" x2="${(x2).toFixed(1)}" y2="${cy}" stroke="${BRASS}" stroke-width="1" stroke-dasharray="2 4" opacity="0.7"/>`);
  parts.push(orb(x1, cy, r, asp.planet1, retroOf(asp.planet1), 1));
  parts.push(orb(x2, cy, r, asp.planet2, retroOf(asp.planet2), 2));
  parts.push(`<circle cx="${W / 2}" cy="${cy}" r="17" fill="${SKY_TOP}" stroke="${BRASS}" stroke-width="1"/>`);
  parts.push(`<text x="${W / 2}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central" font-size="18" fill="${BRASS_LT}" font-family="Georgia, 'Times New Roman', serif">${esc(asp.aspectSymbol)}︎</text>`);

  // body name labels under each orb
  parts.push(capsLabel(x1, cy + r + 24, asp.planet1, 13, PAPER, 2));
  parts.push(capsLabel(x2, cy + r + 24, asp.planet2, 13, PAPER, 2));

  // bottom caption: how close to exact
  const orbTxt = `${asp.orb.toFixed(1)}° from exact`;
  parts.push(capsLabel(W / 2, H - 30, orbTxt, 12, BRASS_LT, 3));
  return parts.join('\n');
}

// ── Mode 2: moon-phase disc ──
/** SVG path for the LIT region of a moon, lit on the right side, illuminated
 *  fraction f∈[0,1]. The bright limb is the right outer semicircle; the terminator
 *  is a semi-ellipse whose width is R·|1−2f| and which bulges right for a crescent
 *  (f<0.5) or left for a gibbous (f>0.5). Caller mirrors for a waning moon. */
function moonLitPath(cx: number, cy: number, R: number, f: number): string {
  const rx = Math.abs(R * (1 - 2 * f));
  const termSweep = f < 0.5 ? 0 : 1;
  return `M ${cx} ${(cy - R).toFixed(1)} `
       + `A ${R} ${R} 0 0 1 ${cx} ${(cy + R).toFixed(1)} `
       + `A ${rx.toFixed(1)} ${R} 0 0 ${termSweep} ${cx} ${(cy - R).toFixed(1)} Z`;
}

function moonScene(sky: DailySky): string {
  const mp = sky.moonPhase;
  const f = Math.max(0, Math.min(1, mp.illumination / 100));
  const waxing = mp.elongation <= 180;     // Moon–Sun angle: 0–180 waxing, 180–360 waning
  const cx = W / 2, cy = 182, R = 96;
  const litId = 'lv-moon-lit';
  const parts: string[] = [];

  parts.push(`
  <defs>
    <radialGradient id="lv-moon-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#Cdd6ea" stop-opacity="0.5"/>
      <stop offset="0.55" stop-color="#AEB9D6" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#AEB9D6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${litId}" cx="0.4" cy="0.36" r="0.75">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.5" stop-color="#EEF1F8"/>
      <stop offset="1" stop-color="#C7CFE0"/>
    </radialGradient>
  </defs>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R * 1.9}" fill="url(#lv-moon-halo)"/>`);
  // dark lunar body
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="#252C44" stroke="${PAPER}" stroke-width="1" stroke-opacity="0.28"/>`);
  // lit region (mirror for waning so the light sits on the left)
  const path = `<path d="${moonLitPath(cx, cy, R, f)}" fill="url(#${litId})"/>`;
  parts.push(waxing ? path : `<g transform="translate(${2 * cx} 0) scale(-1 1)">${path}</g>`);
  // faint craters on the dark body for texture, clipped to the disc
  parts.push(`
  <defs><clipPath id="lv-moon-clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs>
  <g clip-path="url(#lv-moon-clip)" fill="#1C2238" opacity="0.30">
    <circle cx="${cx - 30}" cy="${cy - 34}" r="11"/>
    <circle cx="${cx + 18}" cy="${cy + 26}" r="15"/>
    <circle cx="${cx + 40}" cy="${cy - 18}" r="7"/>
    <circle cx="${cx - 12}" cy="${cy + 44}" r="6"/>
  </g>`);
  // thin limb so the disc edge always reads, even at new moon
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${PAPER}" stroke-width="1" stroke-opacity="0.30"/>`);

  // waxing/waning is meaningless at the extremes (full = the turn, new = dark)
  const extreme = mp.name === 'Full Moon' || mp.name === 'New Moon';
  const sub = extreme ? `${Math.round(mp.illumination)}% lit` : `${Math.round(mp.illumination)}% lit · ${waxing ? 'waxing' : 'waning'}`;
  parts.push(capsLabel(cx, H - 52, mp.name, 14, PAPER, 3));
  parts.push(capsLabel(cx, H - 30, sub, 11.5, BRASS_LT, 2.6));
  return parts.join('\n');
}

export interface HeroSvgOptions {
  headlineAspect?: DailySkyAspect | null;
}

/** Build the landscape hero SVG. Aspect mode when a headline aspect is given,
 *  else the moon-phase disc. */
export function buildHeroSvg(sky: DailySky, opts: HeroSvgOptions = {}): string {
  const asp = opts.headlineAspect ?? null;
  const scene = asp ? aspectScene(sky, asp) : moonScene(sky);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Tonight's sky">
${backdrop(dateSeed(sky.date))}
${scene}
</svg>`;
}

/** Message-bearing alt text for the hero <img> (carries the read if images are off). */
export function heroAlt(sky: DailySky, opts: HeroSvgOptions = {}): string {
  const asp = opts.headlineAspect ?? null;
  if (asp) {
    const word = ASPECT_WORD[asp.aspectType] ?? 'meeting';
    return `Tonight's sky: ${asp.planet1} ${word} ${asp.planet2} — ${asp.aspectType.toLowerCase()}, ${asp.orb.toFixed(1)}° from exact.`;
  }
  const mp = sky.moonPhase;
  return `Tonight's moon: a ${mp.name.toLowerCase()}, ${Math.round(mp.illumination)}% lit.`;
}
