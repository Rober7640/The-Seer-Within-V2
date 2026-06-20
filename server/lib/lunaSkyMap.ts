/**
 * Luna sky-map — renders a DailySky as an on-brand COLLECTIVE sky wheel (SVG string).
 *
 * Shows the 12 zodiac signs, the planets at their real ecliptic degrees, and the
 * day's aspect lines (headline aspect emphasised). NO house cusps / Ascendant —
 * houses are per-person; this is "where everything is in the sky right now," the
 * same for everyone, which keeps it compliant for a broadcast.
 *
 * Geometry mirrors client/src/components/NatalChartWheel.tsx but re-themed to the
 * editorial brass-on-paper palette and emitted as a plain SVG string (no React),
 * so it can be rasterised to PNG for email (scripts/build-luna-batch.ts).
 */
import type { DailySky } from './astrologyEngine';

const SIZE = 380;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_OUTER = 176;
const R_INNER = 150;
const R_SIGN = 163;
const R_PLANET = 118;
const R_ASPECT = 102;

const INK = '#1C2230';
const BRASS = '#B6863C';
const BRASS_DEEP = '#8A6326';
const PAPER = '#FBF7F0';
const RULE = '#E4DACB';

const ZODIAC = [
  '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓',
];
const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};
const DRAW_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

// 0° Aries at 9 o'clock, ecliptic increases counter-clockwise (astrology convention).
const lonToAngle = (lon: number) => Math.PI - (lon * Math.PI) / 180;
const px = (angle: number, r: number) => CX + r * Math.cos(angle);
const py = (angle: number, r: number) => CY + r * Math.sin(angle);

/** Iterative repulsion so planet glyphs don't pile up. */
function spread(items: { name: string; angle: number }[], minGap = 0.22, passes = 24) {
  const pts = items.map(p => ({ ...p }));
  for (let pass = 0; pass < passes; pass++) {
    pts.sort((a, b) => a.angle - b.angle);
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      let gap = next.angle - pts[i].angle;
      if (i === pts.length - 1) gap += 2 * Math.PI;
      if (gap < minGap) { const h = (minGap - gap) / 2; pts[i].angle -= h; next.angle += h; moved = true; }
    }
    if (!moved) break;
  }
  return Object.fromEntries(pts.map(p => [p.name, p.angle]));
}

export interface SkyMapOptions {
  size?: number;                                  // output viewBox size (default 380)
  headline?: { planet1: string; planet2: string } | null; // aspect to emphasise
}

export function buildSkyMapSvg(sky: DailySky, opts: SkyMapOptions = {}): string {
  const headline = opts.headline ?? null;
  const planets = sky.placements.filter(p => DRAW_ORDER.includes(p.name));
  const lonOf: Record<string, number> = Object.fromEntries(planets.map(p => [p.name, p.longitude]));
  const spreadAngle = spread(planets.map(p => ({ name: p.name, angle: lonToAngle(p.longitude) })));

  const parts: string[] = [];

  // Discs
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_OUTER}" fill="${PAPER}" stroke="${BRASS}" stroke-width="1.5"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_INNER}" fill="none" stroke="${RULE}" stroke-width="1"/>`);
  parts.push(`<circle cx="${CX}" cy="${CY}" r="${R_ASPECT}" fill="none" stroke="${RULE}" stroke-width="0.75"/>`);

  // Zodiac: 12 spokes + glyphs
  for (let i = 0; i < 12; i++) {
    const a = lonToAngle(i * 30);
    parts.push(`<line x1="${px(a, R_INNER).toFixed(1)}" y1="${py(a, R_INNER).toFixed(1)}" x2="${px(a, R_OUTER).toFixed(1)}" y2="${py(a, R_OUTER).toFixed(1)}" stroke="${RULE}" stroke-width="0.75"/>`);
    const m = lonToAngle(i * 30 + 15);
    parts.push(`<text x="${px(m, R_SIGN).toFixed(1)}" y="${py(m, R_SIGN).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="13" fill="${BRASS}" font-family="Georgia, 'Times New Roman', serif">${ZODIAC[i]}︎</text>`);
  }

  // Aspect lines (true positions). Headline emphasised in brass-deep.
  for (const asp of sky.aspects) {
    if (lonOf[asp.planet1] === undefined || lonOf[asp.planet2] === undefined) continue;
    const a1 = lonToAngle(lonOf[asp.planet1]);
    const a2 = lonToAngle(lonOf[asp.planet2]);
    const isHead = !!headline &&
      ((asp.planet1 === headline.planet1 && asp.planet2 === headline.planet2) ||
       (asp.planet1 === headline.planet2 && asp.planet2 === headline.planet1));
    parts.push(`<line x1="${px(a1, R_ASPECT).toFixed(1)}" y1="${py(a1, R_ASPECT).toFixed(1)}" x2="${px(a2, R_ASPECT).toFixed(1)}" y2="${py(a2, R_ASPECT).toFixed(1)}" stroke="${isHead ? BRASS_DEEP : RULE}" stroke-width="${isHead ? 1.8 : 0.8}" opacity="${isHead ? 1 : 0.85}"/>`);
  }

  // Planets (spread glyphs) + small degree tick toward true position
  for (const p of planets) {
    const a = spreadAngle[p.name];
    const x = px(a, R_PLANET), y = py(a, R_PLANET);
    const trueA = lonToAngle(p.longitude);
    if (Math.abs(a - trueA) > 0.04) {
      parts.push(`<line x1="${px(trueA, R_INNER - 3).toFixed(1)}" y1="${py(trueA, R_INNER - 3).toFixed(1)}" x2="${px(a, R_PLANET + 10).toFixed(1)}" y2="${py(a, R_PLANET + 10).toFixed(1)}" stroke="${RULE}" stroke-width="0.6"/>`);
    }
    parts.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="15" fill="${INK}" font-family="Georgia, 'Times New Roman', serif">${PLANET_GLYPH[p.name]}︎</text>`);
    if (p.retrograde) {
      parts.push(`<text x="${(x + 9).toFixed(1)}" y="${(y - 8).toFixed(1)}" font-size="8" fill="${BRASS_DEEP}" font-family="Georgia, serif">℞</text>`);
    }
  }

  const size = opts.size ?? SIZE;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${size}" height="${size}" role="img" aria-label="Today's sky: zodiac wheel with planet positions">\n${parts.join('\n')}\n</svg>`;
}
