/**
 * Daily Sky Editor — the "editor" stage of the Luna daily-email pipeline.
 *
 * Takes the raw sky from getDailySky() and decides the ONE thing worth writing
 * about each day: a headline aspect (relatable + solidly in orb) mapped to a
 * content pillar, plus plain-English talking points the content generator turns
 * into Luna-voiced copy. Also flags timing days (major moon phase, retrograde
 * stations). Deterministic given the date(s).
 *
 * Compliance baked in: talking points only describe the COLLECTIVE sky and always
 * carry the "which house this hits is per-reader → chat hook" note — never a
 * personal placement. Borderline (near-orb-edge) aspects are penalised so the
 * headline doesn't flip with the time of day.
 */
import { getDailySky, type DailySky, type DailySkyAspect } from './astrologyEngine';

export type Pillar = "Today's Sky" | 'Your Timing Window';

const PERSONAL = new Set(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars']);

// Orb limits — must mirror ASPECT_DEFS in astrologyEngine.ts
const ORB_LIMIT: Record<string, number> = {
  Conjunction: 10, Sextile: 6, Square: 8, Trine: 8, Opposition: 10,
};

// Plain-language meaning per body (what a normal reader actually cares about)
const PLANET_THEME: Record<string, string> = {
  Sun: 'identity, vitality, what you shine at',
  Moon: 'mood, needs, what you actually feel',
  Mercury: 'how you think, talk, and decide',
  Venus: 'love, attraction, money, self-worth',
  Mars: 'drive, desire, anger, the push to act',
  Jupiter: 'luck, growth, taking up space',
  Saturn: 'limits, discipline, the long game',
  Uranus: 'disruption, freedom, the unexpected',
  Neptune: 'dreams, intuition, blur and escapism',
  Pluto: 'power, obsession, deep change',
};

// Aspect tone: a human label + valence (-1 friction .. +1 flow)
const ASPECT_TONE: Record<string, { label: string; valence: number }> = {
  Conjunction: { label: 'fused — the two act as one', valence: 0 },
  Sextile:     { label: 'an easy opening if you reach for it', valence: 0.6 },
  Square:      { label: 'friction that wants to be used', valence: -0.8 },
  Trine:       { label: 'natural flow, the path of least resistance', valence: 0.9 },
  Opposition:  { label: 'a push-pull you can finally see clearly', valence: -0.5 },
};

const MAJOR_PHASES = new Set(['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter']);

/** Relatability score for an aspect as a daily-email headline. Higher = better. */
export function scoreAspect(a: DailySkyAspect): number {
  const p1 = PERSONAL.has(a.planet1);
  const p2 = PERSONAL.has(a.planet2);
  if (!p1 && !p2) return 0; // outer-outer = generational, not a daily-email story

  let score = (p1 ? 1 : 0) + (p2 ? 1 : 0);                 // personal involvement (1–2)
  if (a.planet1 === 'Moon' || a.planet2 === 'Moon') score += 1.5; // Moon = most "today"

  const limit = ORB_LIMIT[a.aspectType] ?? 8;
  score += (1 - a.orb / limit) * 2;                        // tightness: exact=+2, edge=0
  if (a.orb > limit - 1.5) score -= 2;                     // borderline → unstable, avoid

  if (['Conjunction', 'Square', 'Opposition'].includes(a.aspectType)) score += 0.5; // punchier story
  return score;
}

/** Rank the day's aspects; return the headline (best) + the ordered rest. */
export function pickHeadline(sky: DailySky): { headline: DailySkyAspect | null; ranked: DailySkyAspect[] } {
  const ranked = sky.aspects
    .map(a => ({ a, s: scoreAspect(a) }))
    .filter(x => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .map(x => x.a);
  return { headline: ranked[0] ?? null, ranked };
}

function aspectLabel(a: DailySkyAspect): string {
  return `${a.planet1} ${a.aspectType.toLowerCase()} ${a.planet2}`;
}

function aspectTalkingPoints(a: DailySkyAspect): string[] {
  const tone = ASPECT_TONE[a.aspectType] ?? { label: 'in contact', valence: 0 };
  return [
    `${a.planet1} (${PLANET_THEME[a.planet1]}) ${a.aspectSymbol} ${a.planet2} (${PLANET_THEME[a.planet2]}) — ${tone.label}.`,
    tone.valence < 0
      ? 'Energy runs hot/tense — name it instead of reacting to it; the move is the pause before the reaction.'
      : tone.valence > 0
        ? 'Energy is supportive — a small, deliberate move goes further than usual today.'
        : 'Energy is concentrated — whatever these two touch gets amplified; aim it on purpose.',
    'WHICH area of life it lands in is per-reader (their chart/house) — that is the chat hook; never state a house in the email.',
  ];
}

export interface DayPlan {
  date: string;                       // YYYY-MM-DD (ET)
  zone: string;                       // EDT | EST
  pillar: Pillar;
  headline: string | null;           // e.g. "Moon square Mars"
  headlineAspect: DailySkyAspect | null;
  talkingPoints: string[];
  moonPhase: { name: string; illumination: number };
  retrogrades: string[];
  stations: string[];                 // bodies that changed direction vs the prior day
  timingNote: string | null;         // populated on "Your Timing Window" days
}

/** Plan a single day. `prev` (the prior day's sky) enables station detection. */
export function planDay(date: string, prev?: DailySky): DayPlan {
  const sky = getDailySky(date);
  const { headline } = pickHeadline(sky);

  // Retrograde stations = bodies whose direction flipped vs the prior day
  const stations: string[] = [];
  if (prev) {
    const today = sky.retrogrades;
    const yday = prev.retrogrades;
    for (const b of today) if (!yday.includes(b)) stations.push(`${b} stations retrograde`);
    for (const b of yday) if (!today.includes(b)) stations.push(`${b} stations direct`);
  }

  const isMajorPhase = MAJOR_PHASES.has(sky.moonPhase.name);
  const isTimingDay = stations.length > 0 || isMajorPhase;

  let timingNote: string | null = null;
  if (stations.length) timingNote = stations.join('; ') + ' today';
  else if (isMajorPhase) timingNote = `${sky.moonPhase.name} today (~${sky.moonPhase.illumination}% lit)`;

  const talkingPoints = headline
    ? aspectTalkingPoints(headline)
    : ['Quiet sky — no tight personal-planet aspect. Lean on the Moon’s sign/phase or run an evergreen pillar.'];

  if (timingNote) talkingPoints.unshift(`Timing: ${timingNote}.`);

  return {
    date: sky.date,
    zone: sky.zone,
    pillar: isTimingDay ? 'Your Timing Window' : "Today's Sky",
    headline: headline ? aspectLabel(headline) : null,
    headlineAspect: headline,
    talkingPoints,
    moonPhase: { name: sky.moonPhase.name, illumination: sky.moonPhase.illumination },
    retrogrades: sky.retrogrades,
    stations,
    timingNote,
  };
}

/** Build an N-day transit calendar starting at `startDate` (YYYY-MM-DD, ET). */
export function buildCalendar(startDate: string, days: number): DayPlan[] {
  const [y, m, d] = startDate.split('-').map(Number);
  const out: DayPlan[] = [];
  let prev: DailySky | undefined;
  for (let i = 0; i < days; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    out.push(planDay(iso, prev));
    prev = getDailySky(iso);
  }
  return out;
}
