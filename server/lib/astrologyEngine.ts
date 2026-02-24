/**
 * astrologyEngine.ts
 *
 * Self-contained natal chart calculator.
 * Based on Jean Meeus "Astronomical Algorithms" (2nd ed.)
 *
 * Accuracy:
 *   Sun:           ±0.01°  (simplified VSOP87)
 *   Moon:          ±0.3°   (ELP2000 main series)
 *   Inner planets: ±1-2°   (heliocentric → geocentric)
 *   Outer planets: ±2-3°   (orbital elements, sufficient for sign)
 *   North Node:    ±0.1°   (mean lunar node)
 *   Ascendant:     ±1°     (via Local Sidereal Time)
 *   Houses:        —       (equal house system, 30° each from ASC)
 *
 * No external dependencies — pure JavaScript arithmetic.
 */

// ============================================================
// Types
// ============================================================

export interface PlanetPosition {
  name: string;
  sign: string;
  signSymbol: string;
  degree: number;   // degrees within sign (0–29)
  minutes: number;  // arc-minutes within degree (0–59)
  longitude: number; // ecliptic longitude 0–360
  retrograde: boolean;
  house: number;    // 1–12
}

export interface HouseCusp {
  house: number;
  sign: string;
  signSymbol: string;
  degree: number;
  longitude: number;
}

export interface AspectData {
  planet1: string;
  planet2: string;
  aspectType: string;  // Conjunction, Sextile, Square, Trine, Opposition
  aspectSymbol: string;
  orb: number;         // degrees from exact
  applying: boolean;
}

export interface NatalChart {
  planets: PlanetPosition[];
  houses: HouseCusp[];
  ascendant: { sign: string; signSymbol: string; degree: number; longitude: number };
  midheaven: { sign: string; signSymbol: string; degree: number; longitude: number };
  aspects: AspectData[];
  birthData: {
    date: string;
    time: string;
    city: string;
    lat: number;
    lon: number;
    timezone: string;
  };
}

export interface TransitPosition {
  name: string;
  sign: string;
  signSymbol: string;
  degree: number;
  retrograde: boolean;
}

export interface TransitAspect {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: string;
  aspectSymbol: string;
  orb: number;
}

export interface TransitData {
  date: string;
  positions: TransitPosition[];
  aspects: TransitAspect[];
}

// ============================================================
// Sign data
// ============================================================

const SIGNS = [
  { name: 'Aries',       symbol: '♈', element: 'Fire',  modality: 'Cardinal', ruler: 'Mars'    },
  { name: 'Taurus',      symbol: '♉', element: 'Earth', modality: 'Fixed',    ruler: 'Venus'   },
  { name: 'Gemini',      symbol: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercury' },
  { name: 'Cancer',      symbol: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon'    },
  { name: 'Leo',         symbol: '♌', element: 'Fire',  modality: 'Fixed',    ruler: 'Sun'     },
  { name: 'Virgo',       symbol: '♍', element: 'Earth', modality: 'Mutable',  ruler: 'Mercury' },
  { name: 'Libra',       symbol: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Venus'   },
  { name: 'Scorpio',     symbol: '♏', element: 'Water', modality: 'Fixed',    ruler: 'Pluto'   },
  { name: 'Sagittarius', symbol: '♐', element: 'Fire',  modality: 'Mutable',  ruler: 'Jupiter' },
  { name: 'Capricorn',   symbol: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn'  },
  { name: 'Aquarius',    symbol: '♒', element: 'Air',   modality: 'Fixed',    ruler: 'Uranus'  },
  { name: 'Pisces',      symbol: '♓', element: 'Water', modality: 'Mutable',  ruler: 'Neptune' },
];

// ============================================================
// Math helpers
// ============================================================

const toRad = (d: number) => d * Math.PI / 180;
const toDeg = (r: number) => r * 180 / Math.PI;

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

function signFromLon(lon: number): { sign: string; signSymbol: string; degree: number; minutes: number } {
  const n = norm360(lon);
  const idx = Math.floor(n / 30);
  const degInSign = n % 30;
  return {
    sign: SIGNS[idx].name,
    signSymbol: SIGNS[idx].symbol,
    degree: Math.floor(degInSign),
    minutes: Math.round((degInSign - Math.floor(degInSign)) * 60),
  };
}

// Solve Kepler's equation M = E - e*sin(E) iteratively
function keplerSolve(M_deg: number, e: number): number {
  const M = toRad(M_deg);
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = (M + e * Math.sin(E) - E) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E; // in radians
}

// ============================================================
// Julian Day Number (Gregorian calendar)
// ============================================================

export function toJulianDay(year: number, month: number, day: number, hourUTC: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) +
         Math.floor(30.6001 * (month + 1)) +
         day + B - 1524.5 + hourUTC / 24;
}

// ============================================================
// Obliquity of the ecliptic
// ============================================================

function obliquity(T: number): number {
  return 23.4392911111 - 0.0130041667 * T - 0.0000001639 * T * T + 0.0000005036 * T * T * T;
}

// ============================================================
// Sun Position  (Meeus ch.25, simplified VSOP87, ±0.01°)
// Returns ecliptic longitude and also heliocentric radius (AU)
// ============================================================

function sunPosition(jd: number): { longitude: number; radius: number } {
  const T = (jd - 2451545.0) / 36525;

  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M  = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = toRad(M);

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  const sunLon = norm360(L0 + C);
  const omega = norm360(125.04 - 1934.136 * T);
  // Apparent longitude (aberration + nutation)
  const apparent = norm360(sunLon - 0.00569 - 0.00478 * Math.sin(toRad(omega)));

  // Radius vector (AU)
  const nu = norm360(M + C);
  const R = 1.000001018 * (1 - 0.016708634 * 0.016708634) / (1 + 0.016708634 * Math.cos(toRad(nu)));

  return { longitude: apparent, radius: R };
}

// ============================================================
// Moon Position  (Meeus ch.47, ELP2000 simplified, ±0.3°)
// ============================================================

function moonLongitude(jd: number): number {
  const T  = (jd - 2451545.0) / 36525;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;

  const Lprime = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841   - T4 / 65194000);
  const D      = norm360(297.8501921 + 445267.1114034  * T - 0.0018819 * T2 + T3 / 545868   - T4 / 113065000);
  const M      = norm360(357.5291092 +  35999.0502909  * T - 0.0001536 * T2 + T3 / 24490000);
  const Mprime = norm360(134.9633964 + 477198.8675055  * T + 0.0087414 * T2 + T3 / 69699    - T4 / 14712000);
  const F      = norm360( 93.2720950 + 483202.0175233  * T - 0.0036539 * T2 - T3 / 3526000  + T4 / 863310000);

  const Dr = toRad(D), Mr = toRad(M), Mpr = toRad(Mprime), Fr = toRad(F);
  const E = 1 - 0.002516 * T - 0.0000074 * T2; // eccentricity factor for M terms

  // Top periodic terms (×10⁻⁶ degrees)
  const dL =
    6288774 * Math.sin(Mpr) +
    1274027 * Math.sin(2*Dr - Mpr) +
     658314 * Math.sin(2*Dr) +
     213618 * Math.sin(2*Mpr) +
    -185116 * E * Math.sin(Mr) +
    -114332 * Math.sin(2*Fr) +
      58793 * Math.sin(2*Dr - 2*Mpr) +
      57066 * E * Math.sin(2*Dr - Mr - Mpr) +
      53322 * Math.sin(2*Dr + Mpr) +
      45758 * E * Math.sin(2*Dr - Mr) +
     -40923 * E * Math.sin(Mr - Mpr) +
     -34720 * Math.sin(Dr) +
     -30383 * E * Math.sin(Mr + Mpr) +
      15327 * Math.sin(2*Dr - 2*Fr) +
     -12528 * Math.sin(Mpr + 2*Fr) +
      10980 * Math.sin(Mpr - 2*Fr) +
      10675 * Math.sin(4*Dr - Mpr) +
      10034 * Math.sin(3*Mpr) +
       8548 * Math.sin(4*Dr - 2*Mpr) +
      -7888 * E * Math.sin(2*Dr + Mr - Mpr) +
      -6766 * E * Math.sin(2*Dr + Mr) +
      -5163 * Math.sin(Dr - Mpr) +
       4987 * E * Math.sin(Dr + Mr) +
       4036 * E * Math.sin(2*Dr - Mr + Mpr) +
       3994 * Math.sin(2*Dr + 2*Mpr) +
       3861 * Math.sin(4*Dr) +
       3665 * Math.sin(2*Dr - 3*Mpr) +
      -2689 * E * Math.sin(Mr - 2*Mpr) +
      -2602 * Math.sin(2*Dr - Mpr + 2*Fr) +
       2390 * E * Math.sin(2*Dr - Mr - 2*Mpr) +
      -2348 * Math.sin(Dr + Mpr) +
       2236 * E * Math.sin(2*Dr - 2*Mr) +
      -2120 * E * Math.sin(Mr + 2*Mpr) +
      -2069 * E * E * Math.sin(2*Mr) +
       2048 * E * Math.sin(2*Dr - 2*Mr - Mpr) +
      -1773 * Math.sin(2*Dr + Mpr - 2*Fr) +
      -1595 * Math.sin(2*Dr + 2*Fr) +
       1215 * E * Math.sin(4*Dr - Mr - Mpr) +
      -1110 * Math.sin(2*Mpr + 2*Fr) +
       -892 * Math.sin(3*Dr - Mpr) +
       -810 * E * Math.sin(2*Dr + Mr + Mpr) +
        759 * E * Math.sin(4*Dr - Mr - 2*Mpr) +
       -713 * E * E * Math.sin(2*Mr - Mpr) +
       -700 * E * Math.sin(2*Dr + 2*Mr - Mpr) +
        691 * E * Math.sin(2*Dr + Mr - 2*Mpr) +
        596 * E * Math.sin(2*Dr - Mr - 2*Fr) +
        549 * Math.sin(4*Dr + Mpr) +
        537 * Math.sin(4*Mpr) +
        520 * Math.sin(4*Dr - Mr) +
       -487 * Math.sin(Dr - 2*Mpr) +
       -399 * E * Math.sin(2*Dr + Mr - 2*Fr);

  return norm360(Lprime + dL / 1000000);
}

// ============================================================
// Mean North Node  (Meeus, ±0.1°)
// ============================================================

function northNodeLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return norm360(125.044522 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000);
}

// ============================================================
// Outer planet position via orbital elements (Meeus Table 33.a)
// Accuracy: ±0.5–3° (sufficient for sign placement of slow-movers)
//
// Returns: { longitude, radius } heliocentric ecliptic
// ============================================================

interface OrbitalElements {
  L0: number; L1: number;          // mean longitude (deg, deg/cent)
  a:  number;                      // semi-major axis (AU)
  e0: number; e1: number;          // eccentricity
  i0: number; i1: number;          // inclination
  O0: number; O1: number;          // longitude of ascending node
  w0: number; w1: number;          // longitude of perihelion
}

const PLANET_ELEMENTS: Record<string, OrbitalElements> = {
  Mercury: { L0: 252.250906, L1: 149474.0722491, a: 0.387098,
             e0: 0.20563175, e1:  0.000020407, i0: 7.004986, i1: -0.0059516,
             O0: 48.330893, O1: -0.1254229, w0: 77.456119, w1: 0.1588643 },
  Venus:   { L0: 181.979801, L1:  58519.2130302, a: 0.723330,
             e0: 0.00677188, e1: -0.000047766, i0: 3.394662, i1: -0.0008568,
             O0: 76.679920, O1: -0.2780080, w0: 131.563707, w1: 0.0048646 },
  Mars:    { L0: 355.433275, L1:  19141.6964746, a: 1.523688,
             e0: 0.09340062, e1:  0.000090483, i0: 1.849726, i1: -0.0006011,
             O0: 49.558093, O1: -0.2949846, w0: 336.060234, w1: 0.4439016 },
  Jupiter: { L0:  34.351519, L1:   3036.3027748, a: 5.202603,
             e0: 0.04849485, e1:  0.000163244, i0: 1.303270, i1: -0.0054966,
             O0: 100.464441, O1: 0.1766828, w0: 14.331309, w1: 0.2155525 },
  Saturn:  { L0:  50.077444, L1:   1223.5110686, a: 9.554909,
             e0: 0.05550825, e1: -0.000346641, i0: 2.488878, i1: -0.0037363,
             O0: 113.665524, O1: -0.2566649, w0: 93.057136, w1: 0.5665415 },
  Uranus:  { L0: 314.055005, L1:    429.8640561, a: 19.218446,
             e0: 0.04629590, e1: -0.000027337, i0: 0.773196, i1:  0.0007744,
             O0: 74.005947, O1: 0.0741461, w0: 173.005291, w1: 0.0893212 },
  Neptune: { L0: 304.348665, L1:    219.8833092, a: 30.110387,
             e0: 0.00898809, e1:  0.000006408, i0: 1.769952, i1: -0.0093082,
             O0: 131.784057, O1: -0.0061651, w0: 48.120276, w1: 0.0291866 },
  Pluto:   { L0: 238.95,     L1:    144.96,      a: 39.48,
             e0: 0.24880,    e1:  0.0,           i0: 17.14,   i1:  0.0,
             O0: 110.30,     O1:  0.0,           w0: 224.10,  w1:  0.0 },
};

function planetHeliocentric(name: string, T: number): { lon: number; lat: number; r: number } {
  const el = PLANET_ELEMENTS[name];
  if (!el) throw new Error(`Unknown planet: ${name}`);

  const L      = norm360(el.L0 + el.L1 * T);
  const e      = el.e0 + el.e1 * T;
  const bigOm  = norm360(el.O0 + el.O1 * T);
  const omega  = norm360(el.w0 + el.w1 * T);  // lon of perihelion
  const inc    = el.i0 + el.i1 * T;

  const M     = norm360(L - omega);           // mean anomaly
  const E     = keplerSolve(M, e);            // eccentric anomaly (rad)

  // True anomaly
  const nu = 2 * toDeg(Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2),
  ));

  // Radius vector
  const r = el.a * (1 - e * e) / (1 + e * Math.cos(toRad(nu)));

  // Argument of latitude in orbit plane
  const smallOm = norm360(omega - bigOm);    // argument of perihelion
  const u       = norm360(nu + smallOm);     // argument of latitude

  // Heliocentric ecliptic rectangular
  const iR = toRad(inc), OR = toRad(bigOm), uR = toRad(u);
  const x = r * (Math.cos(OR) * Math.cos(uR) - Math.sin(OR) * Math.sin(uR) * Math.cos(iR));
  const y = r * (Math.sin(OR) * Math.cos(uR) + Math.cos(OR) * Math.sin(uR) * Math.cos(iR));
  const z = r * Math.sin(uR) * Math.sin(iR);

  const lon = norm360(toDeg(Math.atan2(y, x)));
  const lat = toDeg(Math.asin(z / r));

  return { lon, lat, r };
}

/**
 * Convert heliocentric planet position to geocentric ecliptic longitude.
 * Uses Earth's position (derived from Sun longitude).
 */
function helioToGeoLon(
  planetLon: number, planetLat: number, planetR: number,
  earthLon: number, earthR: number,
): number {
  const pLonR  = toRad(planetLon);
  const pLatR  = toRad(planetLat);
  const eLonR  = toRad(earthLon);

  // Heliocentric rectangular (ecliptic)
  const xp = planetR * Math.cos(pLatR) * Math.cos(pLonR);
  const yp = planetR * Math.cos(pLatR) * Math.sin(pLonR);
  const zp = planetR * Math.sin(pLatR);

  // Earth (lat = 0)
  const xe = earthR * Math.cos(eLonR);
  const ye = earthR * Math.sin(eLonR);

  // Geocentric
  const dx = xp - xe;
  const dy = yp - ye;
  const dz = zp;

  const geoLon = norm360(toDeg(Math.atan2(dy, dx)));
  // We don't use geocentric latitude for sign determination (small effect)
  void dz;

  return geoLon;
}

// ============================================================
// Ascendant & MC via Local Sidereal Time  (Meeus ch.12 + 14)
// ============================================================

function localSiderealTime(jd: number, lon: number): number {
  const T = (jd - 2451545.0) / 36525;
  // Greenwich Mean Sidereal Time at 0h UT
  const GMST = norm360(100.4606184 + 36000.77004 * T + 0.000387933 * T * T - T * T * T / 38710000);
  // Local sidereal time
  return norm360(GMST + lon);
}

function ascendantFromLST(LST: number, lat: number, eps: number): number {
  const LSTrad  = toRad(LST);
  const latRad  = toRad(lat);
  const epsRad  = toRad(eps);

  const num = -Math.cos(LSTrad);
  const den  =  Math.sin(LSTrad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad);
  return norm360(toDeg(Math.atan2(num, den)));
}

function midheavenFromLST(LST: number, eps: number): number {
  const LSTrad = toRad(LST);
  const epsRad = toRad(eps);
  return norm360(toDeg(Math.atan2(Math.sin(LSTrad), Math.cos(LSTrad) * Math.cos(epsRad))));
}

// ============================================================
// House placement (equal house from Ascendant)
// ============================================================

function houseOf(planetLon: number, ascLon: number): number {
  const diff = norm360(planetLon - ascLon);
  return Math.floor(diff / 30) + 1;
}

// ============================================================
// Aspects
// ============================================================

interface AspectDef {
  name: string;
  symbol: string;
  angle: number;
  orb: number;
}

const ASPECT_DEFS: AspectDef[] = [
  { name: 'Conjunction',  symbol: '☌', angle:   0, orb: 10 },
  { name: 'Sextile',      symbol: '⚹', angle:  60, orb:  6 },
  { name: 'Square',       symbol: '□', angle:  90, orb:  8 },
  { name: 'Trine',        symbol: '△', angle: 120, orb:  8 },
  { name: 'Opposition',   symbol: '☍', angle: 180, orb: 10 },
];

function findAspects(positions: Array<{ name: string; longitude: number }>): AspectData[] {
  const aspects: AspectData[] = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const diff = Math.abs(norm360(positions[i].longitude - positions[j].longitude));
      const angle = diff > 180 ? 360 - diff : diff;
      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(angle - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1:      positions[i].name,
            planet2:      positions[j].name,
            aspectType:   asp.name,
            aspectSymbol: asp.symbol,
            orb:          Math.round(orb * 10) / 10,
            applying:     false, // simplified — not tracking speed here
          });
          break;
        }
      }
    }
  }
  return aspects;
}

// ============================================================
// Geocoding via OpenStreetMap Nominatim
// ============================================================

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
  timezone: string; // rough timezone offset label
}

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TheSeerWithin-AstrologyEngine/1.0 contact@theseerwithin.com' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.length === 0) return null;

  const item = data[0];
  return {
    lat:         parseFloat(item.lat),
    lon:         parseFloat(item.lon),
    displayName: item.display_name,
    timezone:    `UTC${item.lon >= 0 ? '+' : ''}${Math.round(item.lon / 15)}`,
  };
}

// ============================================================
// Main: Calculate natal chart
// ============================================================

export async function calculateNatalChart(params: {
  birthDate: string;    // YYYY-MM-DD
  birthTime: string;    // HH:MM  (local time — NOTE: treated as UTC for simplicity;
                        //  production can add timezone offset support)
  birthCity: string;
  lat: number;
  lon: number;
  timezone: string;
}): Promise<NatalChart> {
  const { birthDate, birthTime, birthCity, lat, lon, timezone } = params;

  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map(Number);

  // NOTE: The birth time entered by the user is local time.
  // We apply a simple UTC offset from the geocoded longitude (lon/15 = hours).
  // For accurate calculations, a proper timezone database should be used.
  const utcOffset = lon / 15; // rough UT offset in hours
  const hourUTC   = ((hour + minute / 60) - utcOffset + 24) % 24;

  const jd = toJulianDay(year, month, day, hourUTC);
  const T  = (jd - 2451545.0) / 36525;
  const eps = obliquity(T);

  // Earth position (heliocentric lon = Sun lon + 180°, radius from sun calc)
  const sun        = sunPosition(jd);
  const earthLon   = norm360(sun.longitude + 180);
  const earthR     = sun.radius;

  // Moon
  const moonLon = moonLongitude(jd);

  // North Node (mean)
  const northNodeLon = northNodeLongitude(jd);
  const southNodeLon = norm360(northNodeLon + 180);

  // Planets (heliocentric → geocentric)
  const outerPlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const geoLons: Record<string, number> = {};
  for (const name of outerPlanets) {
    const h = planetHeliocentric(name, T);
    geoLons[name] = helioToGeoLon(h.lon, h.lat, h.r, earthLon, earthR);
  }

  // Ascendant & Midheaven
  const LST   = localSiderealTime(jd, lon);
  const ascLon = ascendantFromLST(LST, lat, eps);
  const mcLon  = midheavenFromLST(LST, eps);

  // Build planet positions (with retrograde check using T+1 day)
  const jd1      = jd + 1;
  const T1       = (jd1 - 2451545.0) / 36525;
  const sun1     = sunPosition(jd1);
  const earthLon1 = norm360(sun1.longitude + 180);
  const earthR1   = sun1.radius;
  const moonLon1  = moonLongitude(jd1);

  function isRetrograde(name: string, lon0: number): boolean {
    if (name === 'Sun' || name === 'Moon' || name === 'North Node' || name === 'South Node') return false;
    const h1 = planetHeliocentric(name, T1);
    const lon1 = helioToGeoLon(h1.lon, h1.lat, h1.r, earthLon1, earthR1);
    const diff = norm360(lon1 - lon0);
    return diff > 180; // moved "backwards"
  }

  const allLons: Array<{ name: string; longitude: number; retrograde: boolean }> = [
    { name: 'Sun',        longitude: sun.longitude, retrograde: false },
    { name: 'Moon',       longitude: moonLon,        retrograde: false },
    { name: 'Mercury',    longitude: geoLons.Mercury, retrograde: isRetrograde('Mercury', geoLons.Mercury) },
    { name: 'Venus',      longitude: geoLons.Venus,   retrograde: isRetrograde('Venus',   geoLons.Venus) },
    { name: 'Mars',       longitude: geoLons.Mars,    retrograde: isRetrograde('Mars',    geoLons.Mars) },
    { name: 'Jupiter',    longitude: geoLons.Jupiter, retrograde: isRetrograde('Jupiter', geoLons.Jupiter) },
    { name: 'Saturn',     longitude: geoLons.Saturn,  retrograde: isRetrograde('Saturn',  geoLons.Saturn) },
    { name: 'Uranus',     longitude: geoLons.Uranus,  retrograde: isRetrograde('Uranus',  geoLons.Uranus) },
    { name: 'Neptune',    longitude: geoLons.Neptune, retrograde: isRetrograde('Neptune', geoLons.Neptune) },
    { name: 'Pluto',      longitude: geoLons.Pluto,   retrograde: isRetrograde('Pluto',   geoLons.Pluto) },
    { name: 'North Node', longitude: northNodeLon,    retrograde: false },
    { name: 'South Node', longitude: southNodeLon,    retrograde: false },
  ];

  const planets: PlanetPosition[] = allLons.map(p => {
    const s = signFromLon(p.longitude);
    return {
      name:        p.name,
      sign:        s.sign,
      signSymbol:  s.signSymbol,
      degree:      s.degree,
      minutes:     s.minutes,
      longitude:   p.longitude,
      retrograde:  p.retrograde,
      house:       houseOf(p.longitude, ascLon),
    };
  });

  // Houses (equal house system)
  const houses: HouseCusp[] = Array.from({ length: 12 }, (_, i) => {
    const hLon = norm360(ascLon + i * 30);
    const s    = signFromLon(hLon);
    return {
      house:      i + 1,
      sign:       s.sign,
      signSymbol: s.signSymbol,
      degree:     s.degree,
      longitude:  hLon,
    };
  });

  // Ascendant & MC
  const ascSign = signFromLon(ascLon);
  const mcSign  = signFromLon(mcLon);

  // Aspects (among major planets only)
  const aspectLons = allLons.filter(p =>
    !['North Node', 'South Node'].includes(p.name)
  );
  const aspects = findAspects(aspectLons);

  return {
    planets,
    houses,
    ascendant: { sign: ascSign.sign, signSymbol: ascSign.signSymbol, degree: ascSign.degree, longitude: ascLon },
    midheaven: { sign: mcSign.sign,  signSymbol: mcSign.signSymbol,  degree: mcSign.degree,  longitude: mcLon  },
    aspects,
    birthData: { date: birthDate, time: birthTime, city: birthCity, lat, lon, timezone },
  };
}

// ============================================================
// Calculate current transits (today vs natal chart)
// ============================================================

export async function calculateTransits(natalChart: NatalChart): Promise<TransitData> {
  const now   = new Date();
  const year  = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const day   = now.getUTCDate();
  const hour  = now.getUTCHours() + now.getUTCMinutes() / 60;

  const jd    = toJulianDay(year, month, day, hour);
  const T     = (jd - 2451545.0) / 36525;
  const sun   = sunPosition(jd);
  const earthLon = norm360(sun.longitude + 180);
  const earthR   = sun.radius;

  const transitPlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  // Check retrograde via next day
  const jd1   = jd + 1;
  const T1    = (jd1 - 2451545.0) / 36525;
  const sun1  = sunPosition(jd1);
  const el1   = norm360(sun1.longitude + 180);
  const er1   = sun1.radius;

  const transitLons: Array<{ name: string; longitude: number; retrograde: boolean }> = [
    { name: 'Sun',     longitude: sun.longitude, retrograde: false },
    { name: 'Moon',    longitude: moonLongitude(jd), retrograde: false },
  ];
  for (const name of transitPlanets) {
    const h0 = planetHeliocentric(name, T);
    const h1 = planetHeliocentric(name, T1);
    const lon0 = helioToGeoLon(h0.lon, h0.lat, h0.r, earthLon, earthR);
    const lon1 = helioToGeoLon(h1.lon, h1.lat, h1.r, el1, er1);
    const retro = norm360(lon1 - lon0) > 180;
    transitLons.push({ name, longitude: lon0, retrograde: retro });
  }
  transitLons.push({ name: 'North Node', longitude: northNodeLongitude(jd), retrograde: false });

  const positions: TransitPosition[] = transitLons.map(p => {
    const s = signFromLon(p.longitude);
    return {
      name:       p.name,
      sign:       s.sign,
      signSymbol: s.signSymbol,
      degree:     s.degree,
      retrograde: p.retrograde,
    };
  });

  // Transit aspects to natal planets (tight orb only: ≤4°)
  const transitAspects: TransitAspect[] = [];
  const natalPlanets = natalChart.planets.filter(p =>
    ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Ascendant'].includes(p.name)
  );

  for (const tPlanet of transitLons.filter(p => !['North Node'].includes(p.name))) {
    for (const nPlanet of natalPlanets) {
      const diff  = Math.abs(norm360(tPlanet.longitude - nPlanet.longitude));
      const angle = diff > 180 ? 360 - diff : diff;
      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(angle - asp.angle);
        if (orb <= 4) {
          transitAspects.push({
            transitPlanet: tPlanet.name,
            natalPlanet:   nPlanet.name,
            aspectType:    asp.name,
            aspectSymbol:  asp.symbol,
            orb:           Math.round(orb * 10) / 10,
          });
          break;
        }
      }
    }
  }

  const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  return { date: dateStr, positions, aspects: transitAspects };
}

// ============================================================
// Format chart as a prompt-ready text block for Claude
// ============================================================

export function formatChartForPrompt(chart: NatalChart, transits: TransitData): string {
  const lines: string[] = [];

  lines.push(`Birth Data: ${chart.birthData.date} at ${chart.birthData.time}, ${chart.birthData.city}`);
  lines.push(`Coordinates: ${chart.birthData.lat.toFixed(2)}°N, ${chart.birthData.lon.toFixed(2)}°E\n`);

  lines.push('PLACEMENTS');
  lines.push('----------');

  // Big Three first
  const bigThree = ['Sun', 'Moon'];
  const asc = `Rising: ♈→${chart.ascendant.signSymbol} ${chart.ascendant.sign} ${chart.ascendant.degree}° (House 1)`;
  for (const name of bigThree) {
    const p = chart.planets.find(x => x.name === name);
    if (!p) continue;
    const retro = p.retrograde ? ' Rx' : '';
    lines.push(`${name}: ${p.signSymbol} ${p.sign} ${p.degree}°${p.minutes > 0 ? p.minutes + "'" : ''} (House ${p.house})${retro}`);
  }
  lines.push(asc);
  lines.push('');

  // Personal planets
  const personal = ['Mercury', 'Venus', 'Mars'];
  lines.push('Personal Planets:');
  for (const name of personal) {
    const p = chart.planets.find(x => x.name === name);
    if (!p) continue;
    const retro = p.retrograde ? ' Rx' : '';
    lines.push(`  ${name}: ${p.signSymbol} ${p.sign} ${p.degree}° (House ${p.house})${retro}`);
  }
  lines.push('');

  // Social / outer planets
  const social = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  lines.push('Generational & Social Planets:');
  for (const name of social) {
    const p = chart.planets.find(x => x.name === name);
    if (!p) continue;
    const retro = p.retrograde ? ' Rx' : '';
    lines.push(`  ${name}: ${p.signSymbol} ${p.sign} ${p.degree}° (House ${p.house})${retro}`);
  }
  lines.push('');

  // Nodes
  const nn = chart.planets.find(x => x.name === 'North Node');
  const sn = chart.planets.find(x => x.name === 'South Node');
  if (nn && sn) {
    lines.push(`Nodes: North Node ${nn.signSymbol} ${nn.sign} (House ${nn.house}) | South Node ${sn.signSymbol} ${sn.sign} (House ${sn.house})`);
  }

  // Midheaven
  lines.push(`Midheaven (MC): ${chart.midheaven.signSymbol} ${chart.midheaven.sign} ${chart.midheaven.degree}° (House 10)`);
  lines.push('');

  // Key aspects
  if (chart.aspects.length > 0) {
    lines.push('NATAL ASPECTS (within orb)');
    lines.push('--------------------------');
    // Show max 12 aspects, tightest first
    const sorted = [...chart.aspects].sort((a, b) => a.orb - b.orb).slice(0, 12);
    for (const asp of sorted) {
      lines.push(`  ${asp.planet1} ${asp.aspectSymbol} ${asp.planet2} (${asp.aspectType}, orb ${asp.orb}°)`);
    }
    lines.push('');
  }

  // Current transits
  lines.push(`CURRENT TRANSITS (as of ${transits.date})`);
  lines.push('---------------------------------------------');
  const keyTransitPlanets = ['Sun', 'Moon', 'Mars', 'Jupiter', 'Saturn'];
  for (const name of keyTransitPlanets) {
    const p = transits.positions.find(x => x.name === name);
    if (!p) continue;
    const retro = p.retrograde ? ' Rx' : '';
    lines.push(`  Transit ${name}: ${p.signSymbol} ${p.sign} ${p.degree}°${retro}`);
  }

  if (transits.aspects.length > 0) {
    lines.push('');
    lines.push('Active Transit Aspects (within 4°):');
    const topTransits = transits.aspects.slice(0, 8);
    for (const ta of topTransits) {
      lines.push(`  Transit ${ta.transitPlanet} ${ta.aspectSymbol} Natal ${ta.natalPlanet} (${ta.aspectType}, orb ${ta.orb}°)`);
    }
  }

  return lines.join('\n');
}

// ============================================================
// Vedic / Jyotish Calculation Layer
// ============================================================

// 27 Nakshatras with Vimshottari dasha lords and durations (years)
const NAKSHATRAS = [
  { name: 'Ashwini',            lord: 'Ketu',    years: 7  },
  { name: 'Bharani',            lord: 'Venus',   years: 20 },
  { name: 'Krittika',           lord: 'Sun',     years: 6  },
  { name: 'Rohini',             lord: 'Moon',    years: 10 },
  { name: 'Mrigashira',         lord: 'Mars',    years: 7  },
  { name: 'Ardra',              lord: 'Rahu',    years: 18 },
  { name: 'Punarvasu',          lord: 'Jupiter', years: 16 },
  { name: 'Pushya',             lord: 'Saturn',  years: 19 },
  { name: 'Ashlesha',           lord: 'Mercury', years: 17 },
  { name: 'Magha',              lord: 'Ketu',    years: 7  },
  { name: 'Purva Phalguni',     lord: 'Venus',   years: 20 },
  { name: 'Uttara Phalguni',    lord: 'Sun',     years: 6  },
  { name: 'Hasta',              lord: 'Moon',    years: 10 },
  { name: 'Chitra',             lord: 'Mars',    years: 7  },
  { name: 'Swati',              lord: 'Rahu',    years: 18 },
  { name: 'Vishakha',           lord: 'Jupiter', years: 16 },
  { name: 'Anuradha',           lord: 'Saturn',  years: 19 },
  { name: 'Jyeshtha',           lord: 'Mercury', years: 17 },
  { name: 'Mula',               lord: 'Ketu',    years: 7  },
  { name: 'Purva Ashadha',      lord: 'Venus',   years: 20 },
  { name: 'Uttara Ashadha',     lord: 'Sun',     years: 6  },
  { name: 'Shravana',           lord: 'Moon',    years: 10 },
  { name: 'Dhanishta',          lord: 'Mars',    years: 7  },
  { name: 'Shatabhisha',        lord: 'Rahu',    years: 18 },
  { name: 'Purva Bhadrapada',   lord: 'Jupiter', years: 16 },
  { name: 'Uttara Bhadrapada',  lord: 'Saturn',  years: 19 },
  { name: 'Revati',             lord: 'Mercury', years: 17 },
];

// Vimshottari dasha planet sequence (120-year cycle)
const DASHA_SEQUENCE = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

// Vedic planet abbreviations (Sanskrit-derived)
const VEDIC_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mercury: 'Me', Venus: 'Ve', Mars: 'Ma',
  Jupiter: 'Ju', Saturn: 'Sa', 'North Node': 'Ra', 'South Node': 'Ke',
  Uranus: 'Ur', Neptune: 'Ne', Pluto: 'Pl',
};

// Vedic malefics (Krura grahas)
const VEDIC_MALEFICS = new Set(['Saturn', 'Mars', 'North Node', 'South Node', 'Sun']);

export interface VedicPlanetPosition {
  name: string;
  abbreviation: string;
  sign: string;
  signSymbol: string;
  degree: number;
  minutes: number;
  longitude: number;   // sidereal
  retrograde: boolean;
  house: number;       // whole-sign house 1–12
  isMalefic: boolean;
}

export interface VedicNakshatraInfo {
  name: string;
  pada: number;        // 1–4
  lord: string;
  index: number;       // 0–26
}

export interface VimshottariDasha {
  planet: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;
  yearsTotal: number;
  percentComplete: number;
  nextDasha: string;
}

export interface VedicNatalChart {
  chartType: 'vedic';
  planets: VedicPlanetPosition[];
  lagna: { sign: string; signSymbol: string; degree: number; longitude: number };
  moonNakshatra: VedicNakshatraInfo;
  sunNakshatra: VedicNakshatraInfo;
  ayanamsha: number;
  currentDasha: VimshottariDasha;
  birthData: { date: string; time: string; city: string; lat: number; lon: number };
}

/**
 * Lahiri (Chitrapaksha) ayanamsha in degrees for a given Julian Day.
 * Accuracy ±0.01° for dates 1900–2100.
 */
export function lahiriAyanamsha(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;  // Julian centuries from J2000.0
  return 23.85267 + 1.39562 * T;
}

function toSiderealLon(tropicalLon: number, ayanamsha: number): number {
  return norm360(tropicalLon - ayanamsha);
}

/**
 * Get nakshatra info for a given sidereal longitude (typically Moon).
 */
export function getNakshatra(siderealLon: number): VedicNakshatraInfo {
  const nakWidth  = 360 / 27;       // 13.333…°
  const padaWidth = nakWidth / 4;   // 3.333…°
  const idx       = Math.min(26, Math.floor(norm360(siderealLon) / nakWidth));
  const posInNak  = norm360(siderealLon) % nakWidth;
  const pada      = Math.min(4, Math.floor(posInNak / padaWidth) + 1);
  return { name: NAKSHATRAS[idx].name, pada, lord: NAKSHATRAS[idx].lord, index: idx };
}

function addYearsToDate(date: Date, years: number): Date {
  const d = new Date(date);
  const wholeYears = Math.floor(years);
  const fracDays   = Math.round((years - wholeYears) * 365.25);
  d.setFullYear(d.getFullYear() + wholeYears);
  d.setDate(d.getDate() + fracDays);
  return d;
}

/**
 * Calculate the current Vimshottari maha-dasha from the Moon's nakshatra at birth.
 */
export function getVimshottariDasha(
  birthJD: number,
  moonNakIdx: number,
  siderealMoonLon: number,
): VimshottariDasha {
  const nakWidth   = 360 / 27;
  const posInNak   = norm360(siderealMoonLon) % nakWidth;
  const moonProg   = posInNak / nakWidth;           // 0–1 through birth nakshatra

  const startPlanetIdx  = moonNakIdx % 9;
  const startPlanet     = DASHA_SEQUENCE[startPlanetIdx];
  const firstDashaYears = DASHA_YEARS[startPlanet];

  // Cursor = when the first dasha actually began (before birth)
  const birthDate  = new Date((birthJD - 2440587.5) * 86400000);
  let cursor = addYearsToDate(birthDate, -(moonProg * firstDashaYears));

  const today = new Date();

  for (let i = 0; i < 27; i++) {   // max 3 full 120-year cycles
    const planetIdx  = (startPlanetIdx + i) % 9;
    const planet     = DASHA_SEQUENCE[planetIdx];
    const years      = DASHA_YEARS[planet];
    const dashaEnd   = addYearsToDate(cursor, years);

    if (dashaEnd > today) {
      const nextIdx  = (planetIdx + 1) % 9;
      const totalMs  = dashaEnd.getTime() - cursor.getTime();
      const elapsedMs = today.getTime() - cursor.getTime();
      return {
        planet,
        startDate: cursor.toISOString().split('T')[0],
        endDate:   dashaEnd.toISOString().split('T')[0],
        yearsTotal: years,
        percentComplete: Math.min(100, Math.round((elapsedMs / totalMs) * 100)),
        nextDasha: DASHA_SEQUENCE[nextIdx],
      };
    }
    cursor = dashaEnd;
  }

  // Fallback (shouldn't happen for any realistic birth date)
  return {
    planet: startPlanet,
    startDate: birthDate.toISOString().split('T')[0],
    endDate:   addYearsToDate(birthDate, firstDashaYears).toISOString().split('T')[0],
    yearsTotal: firstDashaYears,
    percentComplete: 0,
    nextDasha: DASHA_SEQUENCE[(startPlanetIdx + 1) % 9],
  };
}

/**
 * Convert a Western tropical NatalChart to a Vedic sidereal chart.
 * Uses Lahiri ayanamsha and whole-sign house system.
 */
export function calculateVedicChart(natalChart: NatalChart, birthJD: number): VedicNatalChart {
  const ayanamsha      = lahiriAyanamsha(birthJD);
  const siderealAscLon = toSiderealLon(natalChart.ascendant.longitude, ayanamsha);
  const lagnaSignIdx   = Math.floor(siderealAscLon / 30);
  const lagnaSign      = signFromLon(siderealAscLon);

  const vedicPlanets: VedicPlanetPosition[] = natalChart.planets
    .filter(p => !['Uranus', 'Neptune', 'Pluto'].includes(p.name))  // Vedic uses classical 9 grahas
    .map(p => {
      const siderealLon   = toSiderealLon(p.longitude, ayanamsha);
      const s             = signFromLon(siderealLon);
      const planetSignIdx = Math.floor(siderealLon / 30);
      const house         = ((planetSignIdx - lagnaSignIdx + 12) % 12) + 1;
      return {
        name:         p.name,
        abbreviation: VEDIC_ABBR[p.name] || p.name.slice(0, 2),
        sign:         s.sign,
        signSymbol:   s.signSymbol,
        degree:       s.degree,
        minutes:      s.minutes,
        longitude:    siderealLon,
        retrograde:   p.retrograde,
        house,
        isMalefic:    VEDIC_MALEFICS.has(p.name),
      };
    });

  const moon           = natalChart.planets.find(p => p.name === 'Moon');
  const siderealMoonLon = moon ? toSiderealLon(moon.longitude, ayanamsha) : 0;
  const moonNakshatra  = getNakshatra(siderealMoonLon);

  const sun            = natalChart.planets.find(p => p.name === 'Sun');
  const siderealSunLon = sun ? toSiderealLon(sun.longitude, ayanamsha) : 0;
  const sunNakshatra   = getNakshatra(siderealSunLon);

  const currentDasha = getVimshottariDasha(birthJD, moonNakshatra.index, siderealMoonLon);

  return {
    chartType: 'vedic',
    planets:   vedicPlanets,
    lagna: {
      sign:       lagnaSign.sign,
      signSymbol: lagnaSign.signSymbol,
      degree:     lagnaSign.degree,
      longitude:  siderealAscLon,
    },
    moonNakshatra,
    sunNakshatra,
    ayanamsha: Math.round(ayanamsha * 1000) / 1000,
    currentDasha,
    birthData: {
      date: natalChart.birthData.date,
      time: natalChart.birthData.time,
      city: natalChart.birthData.city,
      lat:  natalChart.birthData.lat,
      lon:  natalChart.birthData.lon,
    },
  };
}

/**
 * Format a Vedic chart as prompt-ready text for Claude (Nova Sharma).
 */
export function formatVedicChartForPrompt(chart: VedicNatalChart): string {
  const lines: string[] = [];

  lines.push(`[VEDIC_BIRTH_CHART — NORTH INDIAN JYOTISH]`);
  lines.push(`Birth: ${chart.birthData.date} ${chart.birthData.time} — ${chart.birthData.city}`);
  lines.push(`Lahiri Ayanamsha: ${chart.ayanamsha}°\n`);

  lines.push(`LAGNA: ${chart.lagna.signSymbol} ${chart.lagna.sign} ${chart.lagna.degree}° (Whole-Sign House 1)\n`);

  lines.push('PLANETARY POSITIONS (Sidereal · Whole-Sign Houses)');
  const order = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'North Node', 'South Node'];
  for (const name of order) {
    const p = chart.planets.find(x => x.name === name);
    if (!p) continue;
    const retro = p.retrograde ? ' (R)' : '';
    lines.push(`  ${p.abbreviation} ${name}: ${p.signSymbol} ${p.sign} ${p.degree}°${p.minutes > 0 ? p.minutes + "'" : ''} — H${p.house}${retro}`);
  }

  lines.push('');
  lines.push('NAKSHATRA');
  lines.push(`  Moon: ${chart.moonNakshatra.name} Pada ${chart.moonNakshatra.pada} (Lord: ${chart.moonNakshatra.lord})`);
  lines.push(`  Sun:  ${chart.sunNakshatra.name} Pada ${chart.sunNakshatra.pada} (Lord: ${chart.sunNakshatra.lord})`);

  lines.push('');
  lines.push('VIMSHOTTARI MAHA-DASHA');
  lines.push(`  Current: ${chart.currentDasha.planet} Dasha`);
  lines.push(`  Period:  ${chart.currentDasha.startDate} → ${chart.currentDasha.endDate} (${chart.currentDasha.yearsTotal} yrs, ${chart.currentDasha.percentComplete}% complete)`);
  lines.push(`  Next:    ${chart.currentDasha.nextDasha} Dasha`);

  return lines.join('\n');
}
