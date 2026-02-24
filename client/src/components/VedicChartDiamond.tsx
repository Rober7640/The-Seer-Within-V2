/**
 * VedicChartDiamond.tsx
 *
 * North Indian (Parashari) natal chart — the classic kundali diamond style.
 * Planets placed by Whole-Sign houses. All positions are sidereal (Lahiri).
 *
 * Layout: 360×360 SVG, 12 triangular/rectangular cells arranged clockwise
 * from the Lagna (House 1) at top-center.
 */

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VedicPlanet {
  name: string;
  abbreviation: string;
  sign: string;
  signSymbol: string;
  degree: number;
  minutes: number;
  longitude: number;
  retrograde: boolean;
  house: number;
  isMalefic: boolean;
}

export interface VedicNakshatra {
  name: string;
  pada: number;
  lord: string;
  index: number;
}

export interface VedicDasha {
  planet: string;
  startDate: string;
  endDate: string;
  yearsTotal: number;
  percentComplete: number;
  nextDasha: string;
}

export interface VedicChartData {
  chartType: 'vedic';
  planets: VedicPlanet[];
  lagna: { sign: string; signSymbol: string; degree: number; longitude: number };
  moonNakshatra: VedicNakshatra;
  sunNakshatra: VedicNakshatra;
  ayanamsha: number;
  currentDasha: VedicDasha;
  birthData: { date: string; time: string; city: string };
}

// ─── Static data ─────────────────────────────────────────────────────────────

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];
const SIGN_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

// ─── Cell geometry (S = 360) ──────────────────────────────────────────────────
//
// 12 houses, clockwise from top-center (House 1 = Lagna).
// Each cell is defined by its SVG polygon points and its text centroid.
// isRect = true for rectangular edge cells (H1, H4, H7, H10),
//          false for triangular corner cells.

interface Cell {
  points: string;
  cx: number;
  cy: number;
  isRect: boolean;
}

const CELLS: Cell[] = [
  // H1  — top center rectangle (LAGNA)
  { points: '120,0 240,0 240,120 120,120',      cx: 180, cy: 60,  isRect: true  },
  // H2  — top-right upper triangle
  { points: '240,0 360,0 240,120',              cx: 280, cy: 40,  isRect: false },
  // H3  — right upper triangle
  { points: '360,0 360,120 240,120',            cx: 320, cy: 80,  isRect: false },
  // H4  — right center rectangle
  { points: '360,120 360,240 240,240 240,120',  cx: 300, cy: 180, isRect: true  },
  // H5  — right lower triangle
  { points: '360,240 360,360 240,240',          cx: 320, cy: 280, isRect: false },
  // H6  — bottom-right triangle
  { points: '360,360 240,360 240,240',          cx: 280, cy: 320, isRect: false },
  // H7  — bottom center rectangle
  { points: '240,360 120,360 120,240 240,240',  cx: 180, cy: 300, isRect: true  },
  // H8  — bottom-left triangle
  { points: '120,360 0,360 120,240',            cx: 80,  cy: 320, isRect: false },
  // H9  — left lower triangle
  { points: '0,360 0,240 120,240',              cx: 40,  cy: 280, isRect: false },
  // H10 — left center rectangle
  { points: '0,240 0,120 120,120 120,240',      cx: 60,  cy: 180, isRect: true  },
  // H11 — left upper triangle
  { points: '0,120 0,0 120,120',                cx: 40,  cy: 80,  isRect: false },
  // H12 — top-left triangle
  { points: '0,0 120,0 120,120',                cx: 80,  cy: 40,  isRect: false },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const BG        = '#FFF9F2';
const LAGNA_BG  = '#FFF0D0';
const LINE      = '#7A2718';
const HOUSE_CLR = '#A08060';
const SIGN_CLR  = '#5C3D2E';
const MAL_CLR   = '#8B2E1B';   // malefic: maroon
const BEN_CLR   = '#1D5C3A';   // benefic: forest green
const CENTER_FG = '#3D2314';

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  data: VedicChartData;
}

export default function VedicChartDiamond({ data }: Props) {
  const { planets, lagna, moonNakshatra, sunNakshatra, currentDasha, birthData, ayanamsha } = data;

  const lagnaSignIdx = Math.max(0, SIGNS.indexOf(lagna.sign));

  // Map house number → planets
  const byHouse = new Map<number, VedicPlanet[]>();
  for (let h = 1; h <= 12; h++) byHouse.set(h, []);
  for (const p of planets) {
    if (p.house >= 1 && p.house <= 12) byHouse.get(p.house)!.push(p);
  }

  function houseSignSymbol(houseNum: number): string {
    const idx = ((lagnaSignIdx + houseNum - 1) % 12 + 12) % 12;
    return SIGN_SYMBOLS[idx];
  }

  function houseSignName(houseNum: number): string {
    const idx = ((lagnaSignIdx + houseNum - 1) % 12 + 12) % 12;
    return SIGNS[idx];
  }

  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', fontFamily: "'Georgia', serif" }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: HOUSE_CLR, textTransform: 'uppercase' }}>
          Janma Kundali · North Indian · Sidereal
        </div>
        <div style={{ fontSize: 11, color: SIGN_CLR }}>
          {birthData.city} · {birthData.date} {birthData.time}
        </div>
      </div>

      {/* SVG chart */}
      <svg viewBox="0 0 360 360" width="100%" style={{ display: 'block', border: `2px solid ${LINE}` }}>

        {/* Base background */}
        <rect width="360" height="360" fill={BG} />

        {/* 12 house cells */}
        {CELLS.map((cell, i) => {
          const houseNum    = i + 1;
          const isLagna     = houseNum === 1;
          const housePlanets = byHouse.get(houseNum) || [];
          const signSym     = houseSignSymbol(houseNum);

          // Text Y positions
          const houseNumY  = isLagna
            ? cell.cy - 30 : cell.isRect ? cell.cy - 28 : cell.cy - 18;
          const signSymY   = isLagna
            ? cell.cy - 12 : cell.isRect ? cell.cy - 10 : cell.cy - 4;
          const planetsStartY = isLagna
            ? cell.cy + 8  : cell.isRect ? cell.cy + 10 : cell.cy + 10;
          const planetStep = cell.isRect ? 13 : 11;

          return (
            <g key={houseNum}>
              <polygon
                points={cell.points}
                fill={isLagna ? LAGNA_BG : BG}
                stroke={LINE}
                strokeWidth="1.5"
              />

              {/* House number */}
              <text
                x={cell.cx} y={houseNumY}
                textAnchor="middle" fontSize="8" fill={HOUSE_CLR}
                style={{ userSelect: 'none' }}
              >
                {houseNum}
              </text>

              {/* Sign symbol */}
              <text
                x={cell.cx} y={signSymY}
                textAnchor="middle" fontSize="11" fill={SIGN_CLR}
                style={{ userSelect: 'none' }}
              >
                {signSym}
              </text>

              {/* Planets */}
              {housePlanets.map((p, pi) => (
                <text
                  key={p.name}
                  x={cell.cx}
                  y={planetsStartY + pi * planetStep}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={p.isMalefic ? MAL_CLR : BEN_CLR}
                  style={{ userSelect: 'none' }}
                >
                  {p.abbreviation}{p.retrograde ? '℞' : ''}
                </text>
              ))}

              {/* Lagna label */}
              {isLagna && (
                <text
                  x={cell.cx + 44} y={cell.cy + 34}
                  textAnchor="middle" fontSize="8"
                  fill="#C27A3B" fontStyle="italic"
                  style={{ userSelect: 'none' }}
                >
                  Lagna
                </text>
              )}
            </g>
          );
        })}

        {/* Center box */}
        <rect x="120" y="120" width="120" height="120" fill={BG} stroke={LINE} strokeWidth="1.5" />

        {/* Center content */}
        <text x="180" y="155" textAnchor="middle" fontSize="11" fontWeight="600" fill={CENTER_FG} style={{ userSelect: 'none' }}>
          {lagna.signSymbol} {lagna.sign}
        </text>
        <text x="180" y="170" textAnchor="middle" fontSize="9" fill={HOUSE_CLR} style={{ userSelect: 'none' }}>
          Lagna {lagna.degree}°
        </text>
        <text x="180" y="186" textAnchor="middle" fontSize="9" fill={CENTER_FG} style={{ userSelect: 'none' }}>
          ☽ {moonNakshatra.name}
        </text>
        <text x="180" y="199" textAnchor="middle" fontSize="8" fill={HOUSE_CLR} style={{ userSelect: 'none' }}>
          Pada {moonNakshatra.pada}
        </text>
        <text x="180" y="216" textAnchor="middle" fontSize="9" fontWeight="600" fill={CENTER_FG} style={{ userSelect: 'none' }}>
          {currentDasha.planet} Dasha
        </text>
        <text x="180" y="229" textAnchor="middle" fontSize="7" fill={HOUSE_CLR} style={{ userSelect: 'none' }}>
          until {currentDasha.endDate.slice(0, 7)}
        </text>
      </svg>

      {/* Info panel */}
      <div style={{
        marginTop: 8,
        padding: '10px 14px',
        background: '#FFF3DC',
        border: `1px solid ${LINE}`,
        borderRadius: 4,
        fontSize: 11,
        color: CENTER_FG,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {/* Moon nakshatra */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: HOUSE_CLR, textTransform: 'uppercase', marginBottom: 3 }}>
            Moon Nakshatra
          </div>
          <div><strong>{moonNakshatra.name}</strong> Pada {moonNakshatra.pada}</div>
          <div style={{ color: SIGN_CLR, fontSize: 10 }}>Lord: {moonNakshatra.lord}</div>
          <div style={{ color: HOUSE_CLR, fontSize: 9, marginTop: 2 }}>
            Sun: {sunNakshatra.name} P{sunNakshatra.pada}
          </div>
        </div>

        {/* Dasha */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: HOUSE_CLR, textTransform: 'uppercase', marginBottom: 3 }}>
            Vimshottari Dasha
          </div>
          <div><strong>{currentDasha.planet}</strong> Mahadasha</div>
          <div style={{ color: SIGN_CLR, fontSize: 10 }}>
            Ends {currentDasha.endDate.slice(0, 7)}
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 5, background: '#E8D5C0', borderRadius: 3, height: 4, width: '100%' }}>
            <div style={{
              background: '#C27A3B',
              height: 4,
              borderRadius: 3,
              width: `${Math.min(100, currentDasha.percentComplete)}%`,
            }} />
          </div>
          <div style={{ fontSize: 9, color: HOUSE_CLR, marginTop: 2 }}>
            {currentDasha.percentComplete}% → {currentDasha.nextDasha} Dasha next
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 4, fontSize: 9, color: '#9B7B6A', textAlign: 'center' }}>
        Lahiri Ayanamsha {ayanamsha}° · Whole Sign Houses · North Indian Style
      </div>
    </div>
  );
}
