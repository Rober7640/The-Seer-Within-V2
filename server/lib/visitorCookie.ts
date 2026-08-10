// The `ab_vid` anonymous visitor cookie — the subject id for every experiment that
// has to be assigned BEFORE a visitor identifies herself.
//
// Most V1 experiments (price, commitment gate, order bump) bucket on the hashed
// email at lead capture and never need this. The /fb-tarot version test does: it
// changes the FIRST message of the chat, so it must be decided at the lander, when
// all we have is a cookie.
//
// The cookie contract (name, 1-year TTL, httpOnly, lax) was already established by
// GET /api/ab/assign for the visitor page-copy tests. It lives here so the tarot
// lander and /api/lead read and mint EXACTLY the same cookie rather than each
// carrying their own copy of the flags — a visitor who got her id from one route
// and is read by another must be the same subject, or her exposure and her purchase
// land under different ids and the join silently returns nothing.

import type { Request, Response } from 'express';
import crypto from 'crypto';

export const VISITOR_COOKIE = 'ab_vid';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Parse cookies off the raw header (this app has no cookie-parser middleware). */
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const [key, ...rest] = pair.split('=');
    if (key) out[key.trim()] = decodeURIComponent(rest.join('=').trim());
  });
  return out;
}

/**
 * The visitor's existing id, or null. READ-ONLY — never mints one.
 *
 * Use this anywhere that must not CREATE a subject: /api/lead records the id a
 * visitor already had, and minting one there would invent a subject that has no
 * exposure and can never join to anything.
 */
export function readVisitorId(req: Request): string | null {
  const id = parseCookies(req)[VISITOR_COOKIE];
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/**
 * The visitor's id, minting and setting one if this is their first visit. Use only
 * at ASSIGNMENT time (the lander), where creating the subject is the point.
 */
export function ensureVisitorId(req: Request, res: Response): string {
  const existing = readVisitorId(req);
  if (existing) return existing;
  const id = crypto.randomUUID();
  res.cookie(VISITOR_COOKIE, id, {
    httpOnly: true,
    maxAge: ONE_YEAR_MS,
    path: '/',
    sameSite: 'lax',
  });
  return id;
}
