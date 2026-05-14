/**
 * NatalChartWheel.tsx
 *
 * Co-Star-style minimal SVG natal chart wheel.
 * Renders the 12 zodiac signs, house cusps, planet glyphs, and aspect lines
 * from raw NatalChart data returned by the astrology engine.
 */

import React from 'react';

// ─── Types (mirror server/lib/astrologyEngine.ts) ─────────────────────────

export interface ChartPlanet {
  name: string;
  sign: string;
  signSymbol: string;
  degree: number;      // 0–29 within sign
  minutes: number;
  longitude: number;   // ecliptic 0–360
  retrograde: boolean;
  house: number;
}

export interface ChartHouseCusp {
  house: number;
  sign: string;
  signSymbol: string;
  degree: number;
  longitude: number;
}

export interface ChartAspect {
  planet1: string;
  planet2: string;
  aspectType: string;
  aspectSymbol: string;
  orb: number;
  applying: boolean;
}

export interface NatalChartData {
  planets: ChartPlanet[];
  houses: ChartHouseCusp[];
  ascendant: { sign: string; signSymbol: string; degree: number; longitude: number };
  midheaven: { sign: string; signSymbol: string; degree: number; longitude: number };
  aspects: ChartAspect[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const SIZE   = 380;
const CX     = SIZE / 2;
const CY     = SIZE / 2;

// Radii for each ring layer
const R_ZODIAC_OUTER  = 175;
const R_ZODIAC_INNER  = 148;
const R_SIGN_LABEL    = 162;   // zodiac glyph sits here
const R_HOUSE_OUTER   = 148;   // = R_ZODIAC_INNER
const R_HOUSE_LABEL   = 133;   // house numbers
const R_HOUSE_TICK    = 142;
const R_PLANET        = 115;   // planet glyph radius
const R_ASPECT        = 90;    // aspect line endpoints

// 12 zodiac sign start longitudes and their Unicode glyphs
const ZODIAC_SIGNS = [
  { name: 'Aries',       lon: 0,   glyph: '♈' },
  { name: 'Taurus',      lon: 30,  glyph: '♉' },
  { name: 'Gemini',      lon: 60,  glyph: '♊' },
  { name: 'Cancer',      lon: 90,  glyph: '♋' },
  { name: 'Leo',         lon: 120, glyph: '♌' },
  { name: 'Virgo',       lon: 150, glyph: '♍' },
  { name: 'Libra',       lon: 180, glyph: '♎' },
  { name: 'Scorpio',     lon: 210, glyph: '♏' },
  { name: 'Sagittarius', lon: 240, glyph: '♐' },
  { name: 'Capricorn',   lon: 270, glyph: '♑' },
  { name: 'Aquarius',    lon: 300, glyph: '♒' },
  { name: 'Pisces',      lon: 330, glyph: '♓' },
];

// Element colours for sign segments (fire/earth/air/water pattern)
const SIGN_FILL: Record<string, string> = {
  Aries:       'rgba(220,80,60,0.12)',
  Taurus:      'rgba(80,160,80,0.10)',
  Gemini:      'rgba(180,180,60,0.10)',
  Cancer:      'rgba(80,140,200,0.12)',
  Leo:         'rgba(220,80,60,0.12)',
  Virgo:       'rgba(80,160,80,0.10)',
  Libra:       'rgba(180,180,60,0.10)',
  Scorpio:     'rgba(80,140,200,0.12)',
  Sagittarius: 'rgba(220,80,60,0.12)',
  Capricorn:   'rgba(80,160,80,0.10)',
  Aquarius:    'rgba(180,180,60,0.10)',
  Pisces:      'rgba(80,140,200,0.12)',
};

const PLANET_GLYPHS: Record<string, string> = {
  Sun:          '☉',
  Moon:         '☽',
  Mercury:      '☿',
  Venus:        '♀',
  Mars:         '♂',
  Jupiter:      '♃',
  Saturn:       '♄',
  Uranus:       '♅',
  Neptune:      '♆',
  Pluto:        '♇',
  'North Node': '☊',
  'South Node': '☋',
};

const ASPECT_COLOR: Record<string, string> = {
  Conjunction: '#a78bfa',   // violet
  Sextile:     '#34d399',   // teal
  Square:      '#f87171',   // red
  Trine:       '#6ee7b7',   // green
  Opposition:  '#fbbf24',   // amber
};

const ASPECT_DASH: Record<string, string> = {
  Conjunction: 'none',
  Sextile:     '3 3',
  Square:      'none',
  Trine:       'none',
  Opposition:  '5 3',
};

// ─── Geometry helpers ──────────────────────────────────────────────────────

/**
 * Convert an ecliptic longitude to an SVG angle (radians).
 * ASC is placed at 9-o'clock (π radians). Ecliptic increases counter-clockwise
 * in astrology, which is the reverse of SVG's clockwise convention.
 */
function lonToAngle(lon: number, ascLon: number): number {
  const rel = ((lon - ascLon) % 360 + 360) % 360;
  return Math.PI - (rel * Math.PI / 180);
}

function polar(angle: number, r: number): { x: number; y: number } {
  return {
    x: CX + r * Math.cos(angle),
    y: CY + r * Math.sin(angle),
  };
}

/** SVG arc path for a ring segment between two angles. */
function arcPath(
  r: number,
  startAngle: number,
  endAngle: number,
  innerR?: number,
): string {
  const p1 = polar(startAngle, r);
  const p2 = polar(endAngle,   r);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  // Direction: we go "clockwise" in SVG coords for our counter-clockwise ecliptic
  const sweep = endAngle < startAngle ? 0 : 1;

  if (innerR === undefined) {
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y}`;
  }

  const p3 = polar(endAngle,   innerR);
  const p4 = polar(startAngle, innerR);
  const sweepInner = sweep === 1 ? 0 : 1;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${r} ${r} 0 ${largeArc} ${sweep} ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} ${sweepInner} ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

// ─── Planet overlap avoidance ──────────────────────────────────────────────

/**
 * Nudge planet angles so glyphs don't pile on top of each other.
 * Simple iterative repulsion — runs a few passes until all gaps ≥ minGap.
 */
function spreadPlanets(
  angles: { name: string; angle: number }[],
  minGapRad = 0.22,   // ~12.6°
  passes = 20,
): { name: string; angle: number; original: number }[] {
  const pts = angles.map(p => ({ ...p, original: p.angle }));
  for (let pass = 0; pass < passes; pass++) {
    pts.sort((a, b) => a.angle - b.angle);
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      let gap = next.angle - pts[i].angle;
      if (i === pts.length - 1) gap += 2 * Math.PI;
      if (gap < minGapRad) {
        const half = (minGapRad - gap) / 2;
        pts[i].angle  -= half;
        next.angle    += half;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pts;
}

// ─── Component ─────────────────────────────────────────────────────────────

interface Props {
  data: NatalChartData;
  /** Optional extra class names on the wrapper div */
  className?: string;
}

const NatalChartWheel: React.FC<Props> = ({ data, className }) => {
  const ascLon = data.ascendant.longitude;

  // ── Zodiac sign segments ──────────────────────────────────────────────────
  const zodiacSegments = ZODIAC_SIGNS.map(sign => {
    const startAngle = lonToAngle(sign.lon,      ascLon);
    const endAngle   = lonToAngle(sign.lon + 30, ascLon);
    const midAngle   = lonToAngle(sign.lon + 15, ascLon);
    const labelPos   = polar(R_SIGN_LABEL, midAngle);
    return { sign, startAngle, endAngle, midAngle, labelPos };
  });

  // ── House cusp lines ──────────────────────────────────────────────────────
  const houseCusps = data.houses.map(h => {
    const angle = lonToAngle(h.longitude, ascLon);
    const inner = polar(angle, 10);
    const outer = polar(angle, R_HOUSE_OUTER);
    // House number at midpoint between this and next cusp
    const nextH = data.houses[(h.house % 12)]; // house.house is 1-indexed
    const midLon = h.longitude + (((nextH?.longitude ?? h.longitude + 30) - h.longitude + 360) % 360) / 2;
    const labelPos = polar(lonToAngle(midLon, ascLon), R_HOUSE_LABEL);
    return { ...h, angle, inner, outer, labelPos };
  });

  // ── Planet positions ──────────────────────────────────────────────────────
  const planetAngles = data.planets.map(p => ({
    name:  p.name,
    angle: lonToAngle(p.longitude, ascLon),
  }));
  const spread = spreadPlanets(planetAngles);
  const spreadMap = Object.fromEntries(spread.map(s => [s.name, s]));

  // ── Aspect lines ──────────────────────────────────────────────────────────
  const aspectLines = data.aspects
    .filter(a => ['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition'].includes(a.aspectType))
    .map(a => {
      const p1 = data.planets.find(p => p.name === a.planet1);
      const p2 = data.planets.find(p => p.name === a.planet2);
      if (!p1 || !p2) return null;
      const a1 = lonToAngle(p1.longitude, ascLon);
      const a2 = lonToAngle(p2.longitude, ascLon);
      return {
        key:   `${a.planet1}-${a.planet2}-${a.aspectType}`,
        from:  polar(a1, R_ASPECT),
        to:    polar(a2, R_ASPECT),
        color: ASPECT_COLOR[a.aspectType] ?? '#888',
        dash:  ASPECT_DASH[a.aspectType]  ?? 'none',
        type:  a.aspectType,
        orb:   a.orb,
      };
    })
    .filter(Boolean) as NonNullable<ReturnType<typeof data.aspects.map>[number]>[];

  // ── ASC / MC markers ─────────────────────────────────────────────────────
  const ascAngle = lonToAngle(ascLon, ascLon); // = π  → left
  const mcAngle  = lonToAngle(data.midheaven.longitude, ascLon);

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ''}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ width: '100%', height: 'auto', maxWidth: 360, display: 'block' }}
        aria-label="Natal chart wheel"
      >
        {/* ── Background ── */}
        <circle cx={CX} cy={CY} r={R_ZODIAC_OUTER} fill="#0a0818" stroke="#4a3f7a" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={R_ZODIAC_INNER} fill="#0a0818" stroke="#3a3060" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={10}              fill="#0a0818" stroke="#3a3060" strokeWidth="1" />

        {/* ── Zodiac sign segments ── */}
        {zodiacSegments.map(({ sign, startAngle, endAngle, labelPos }) => (
          <g key={sign.name}>
            <path
              d={arcPath(R_ZODIAC_OUTER, startAngle, endAngle, R_ZODIAC_INNER)}
              fill={SIGN_FILL[sign.name] ?? 'transparent'}
              stroke="#3a3060"
              strokeWidth="0.8"
            />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#9988cc"
              style={{ fontFamily: 'serif', userSelect: 'none' }}
            >
              {sign.glyph}
            </text>
          </g>
        ))}

        {/* ── House cusp lines ── */}
        {houseCusps.map(h => (
          <g key={h.house}>
            <line
              x1={h.inner.x} y1={h.inner.y}
              x2={h.outer.x} y2={h.outer.y}
              stroke={h.house === 1 || h.house === 4 || h.house === 7 || h.house === 10
                ? '#8878cc' : '#3a3060'}
              strokeWidth={h.house === 1 || h.house === 4 || h.house === 7 || h.house === 10 ? 1.5 : 0.8}
            />
            <text
              x={h.labelPos.x}
              y={h.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fill="#4a4a70"
              style={{ userSelect: 'none' }}
            >
              {h.house}
            </text>
          </g>
        ))}

        {/* ── Aspect lines ── */}
        <g opacity="0.55">
          {aspectLines.map(line => (
            <line
              key={line.key}
              x1={line.from.x} y1={line.from.y}
              x2={line.to.x}   y2={line.to.y}
              stroke={line.color}
              strokeWidth="0.8"
              strokeDasharray={line.dash}
            />
          ))}
        </g>

        {/* ── Planet glyphs ── */}
        {data.planets.map(planet => {
          const spread = spreadMap[planet.name];
          if (!spread) return null;
          const pos     = polar(spread.angle, R_PLANET);
          const glyph   = PLANET_GLYPHS[planet.name] ?? planet.name[0];
          // Leader line from spread position back toward true position
          const truePos = polar(spread.original, R_PLANET - 18);
          const showLeader = Math.abs(spread.angle - spread.original) > 0.05;

          return (
            <g key={planet.name}>
              {showLeader && (
                <line
                  x1={pos.x} y1={pos.y}
                  x2={truePos.x} y2={truePos.y}
                  stroke="#3a3a60"
                  strokeWidth="0.6"
                />
              )}
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="13"
                fill="#c0b8e8"
                style={{ fontFamily: 'serif', userSelect: 'none' }}
                aria-label={`${planet.name} in ${planet.sign}`}
              >
                {glyph}
              </text>
              {planet.retrograde && (
                <text
                  x={pos.x + 8}
                  y={pos.y - 6}
                  fontSize="7"
                  fill="#f87171"
                  style={{ userSelect: 'none' }}
                >
                  ℞
                </text>
              )}
            </g>
          );
        })}

        {/* ── ASC label ── */}
        {(() => {
          const p = polar(ascAngle, R_ZODIAC_OUTER + 12);
          return (
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#a0a0d0" fontWeight="bold" style={{ userSelect: 'none' }}>
              ASC
            </text>
          );
        })()}

        {/* ── MC label ── */}
        {(() => {
          const p = polar(mcAngle, R_ZODIAC_OUTER + 12);
          return (
            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fill="#a0a0d0" fontWeight="bold" style={{ userSelect: 'none' }}>
              MC
            </text>
          );
        })()}
      </svg>

      {/* ── Legend ── */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2">
        {Object.entries(ASPECT_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <span
              className="inline-block w-4 h-px"
              style={{
                background: color,
                borderBottom: ASPECT_DASH[type] !== 'none'
                  ? `1px dashed ${color}`
                  : `1px solid ${color}`,
              }}
            />
            <span className="text-xs" style={{ color, opacity: 0.8 }}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NatalChartWheel;
