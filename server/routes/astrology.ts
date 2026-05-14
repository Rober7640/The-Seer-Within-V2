/**
 * Astrology routes — natal chart calculation and storage.
 *
 * POST /api/astrology/natal-chart
 *   Geocodes birth city, calculates natal chart + current transits,
 *   saves the result to userMemory for the given persona, and returns
 *   the formatted chart text.
 *
 * GET /api/astrology/natal-chart/:personaId
 *   Returns the stored birth chart for the current user + persona, if any.
 */

import express, { Request, Response } from 'express';
import { requireAuth } from '../lib/auth';
import { geocodeCity, calculateNatalChart, calculateTransits, formatChartForPrompt } from '../lib/astrologyEngine';
import { db } from '../lib/db';
import { userMemory, personas } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../lib/logger';

const router = express.Router();

// ============================================================
// POST /api/astrology/natal-chart
// Body: { birthDate, birthTime, birthCity, personaId }
// ============================================================
router.post('/natal-chart', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { birthDate, birthTime, birthCity, personaId } = req.body;

  if (!birthDate || !birthTime || !birthCity || !personaId) {
    return res.status(400).json({ error: 'birthDate, birthTime, birthCity, and personaId are required' });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return res.status(400).json({ error: 'birthDate must be YYYY-MM-DD' });
  }
  if (!/^\d{2}:\d{2}$/.test(birthTime)) {
    return res.status(400).json({ error: 'birthTime must be HH:MM' });
  }

  // Verify persona exists
  const persona = await db.select().from(personas).where(eq(personas.id, personaId)).limit(1);
  if (!persona[0]) {
    return res.status(404).json({ error: 'Persona not found' });
  }

  try {
    // 1. Geocode the city
    const geo = await geocodeCity(birthCity);
    if (!geo) {
      return res.status(422).json({ error: 'Could not find that city. Try a more specific search like "London, UK" or "New York, US".' });
    }

    // 2. Calculate natal chart
    const chart = await calculateNatalChart({
      birthDate,
      birthTime,
      birthCity: geo.displayName,
      lat:      geo.lat,
      lon:      geo.lon,
      timezone: geo.timezone,
    });

    // 3. Calculate current transits
    const transits = await calculateTransits(chart);

    // 4. Format as prompt text
    const chartText = formatChartForPrompt(chart, transits);

    // Raw chart data for frontend SVG rendering (birthData included for Vedic recalculation)
    const chartData = {
      planets:   chart.planets,
      houses:    chart.houses,
      ascendant: chart.ascendant,
      midheaven: chart.midheaven,
      aspects:   chart.aspects,
      birthData: chart.birthData,
    };

    // Store as JSON envelope so both text (for Claude) and raw data (for SVG) survive
    const fullContext = JSON.stringify({ text: chartText, raw: chartData });

    // 5. Upsert into userMemory for this user+persona
    const existing = await db.select().from(userMemory)
      .where(and(
        eq(userMemory.userId, userId),
        eq(userMemory.personaId, personaId),
        eq(userMemory.memoryType, 'birth_chart'),
      ))
      .limit(1);

    const now = new Date();
    if (existing.length > 0) {
      await db.update(userMemory)
        .set({
          summary:        `Natal chart for ${birthDate} in ${geo.displayName}`,
          fullContext,
          importance:     10,
          updatedAt:      now,
          lastAccessedAt: now,
        })
        .where(eq(userMemory.id, existing[0].id));
    } else {
      await db.insert(userMemory).values({
        userId,
        personaId,
        memoryType:     'birth_chart',
        summary:        `Natal chart for ${birthDate} in ${geo.displayName}`,
        fullContext,
        importance:     10,
        category:       'astrology',
        createdAt:      now,
        updatedAt:      now,
        lastAccessedAt: now,
      });
    }

    // 6. Return the chart data to the frontend
    return res.json({
      success:     true,
      chartText,
      chartData,
      location:    geo.displayName,
      timezone:    geo.timezone,
      sunSign:     chart.planets.find(p => p.name === 'Sun')?.sign,
      moonSign:    chart.planets.find(p => p.name === 'Moon')?.sign,
      risingSign:  chart.ascendant.sign,
    });

  } catch (err) {
    logger.error('natal-chart calculation error', { error: (err as Error).message, userId });
    return res.status(500).json({ error: 'Chart calculation failed. Please try again.' });
  }
});

// ============================================================
// GET /api/astrology/natal-chart/:personaId
// Returns stored chart for current user + persona, if any.
// ============================================================
router.get('/natal-chart/:personaId', requireAuth, async (req: Request, res: Response) => {
  const userId   = (req as any).userId as string;
  const { personaId } = req.params;

  const existing = await db.select().from(userMemory)
    .where(and(
      eq(userMemory.userId, userId),
      eq(userMemory.personaId, personaId as string),
      eq(userMemory.memoryType, 'birth_chart'),
    ))
    .limit(1);

  if (!existing[0]) {
    return res.json({ exists: false });
  }

  // fullContext may be a JSON envelope { text, raw } or legacy plain text
  let chartText = existing[0].fullContext ?? '';
  let chartData = null;
  try {
    const parsed = JSON.parse(chartText);
    if (parsed?.text) {
      chartText = parsed.text;
      chartData = parsed.raw ?? null;
    }
  } catch {
    // legacy plain-text fullContext — leave chartText as-is, chartData stays null
  }

  return res.json({
    exists:    true,
    summary:   existing[0].summary,
    chartText,
    chartData,
  });
});

// ============================================================
// GET /api/astrology/city-search?q=London
// Proxies to Nominatim so the User-Agent stays server-side.
// Returns up to 5 city suggestions: [{ displayName, placeId }]
// ============================================================
router.get('/city-search', requireAuth, async (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '8');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('featuretype', 'settlement');

    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent':       'TheSeerWithin-AstrologyEngine/1.0 contact@theseerwithin.com',
        'Accept-Language':  'en',
      },
    });

    if (!resp.ok) return res.json({ results: [] });

    const data = await resp.json() as any[];

    // Build human-readable "City, State, Country" labels and deduplicate
    const seen = new Set<string>();
    const results: { displayName: string; placeId: number }[] = [];

    for (const item of data) {
      const addr    = (item.address || {}) as Record<string, string>;
      const city    = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const state   = addr.state || addr.region || '';
      const country = addr.country || '';
      const label   = [city, state, country].filter(Boolean).join(', ') || item.display_name;

      if (!seen.has(label)) {
        seen.add(label);
        results.push({ displayName: label, placeId: item.place_id });
        if (results.length >= 5) break;
      }
    }

    return res.json({ results });
  } catch (err) {
    logger.error('city-search error', { error: (err as Error).message });
    return res.json({ results: [] });
  }
});

export default router;
