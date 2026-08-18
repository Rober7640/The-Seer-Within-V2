// Real-HTTP behaviour of the /fb-tarot/c → /fb-tarot/b redirect.
//
// The unit tests next door cover the target string. THIS file exists for the part
// a string test cannot answer: what Express itself does. Express 5 moved to
// path-to-regexp v8, which changed trailing-slash matching — so "does /fb-tarot/c/
// hit the route at all" is a question about the framework, not about our code, and
// the only honest way to answer it is to drive a real server.
//
// It boots a bare Express app with ONLY the redirect mounted, exactly as
// registerRoutes mounts it. No DB, no Stripe, no Anthropic — so this runs
// anywhere and can never touch a live service.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { TAROT_C_PATH, tarotBTarget } from './tarotRedirect';

let server: Server;
let base = '';

beforeAll(async () => {
  const app = express();
  // Mounted exactly as in registerRoutes.
  app.get(TAROT_C_PATH, (req, res) => res.redirect(302, tarotBTarget(req.originalUrl)));
  // Stand-ins for the SPA catch-all, so "was NOT redirected" is observable.
  app.get('/fb-tarot/b', (_req, res) => { res.status(200).send('bridge-b'); });
  app.get('/fb-palm/c', (_req, res) => { res.status(200).send('palm-c'); });
  app.get('/fb-tarot', (_req, res) => { res.status(200).send('bridge-a'); });
  // Stands in for the SPA catch-all — serveStatic in production, setupVite in dev
  // — which index.ts mounts AFTER registerRoutes. Present so the ordering
  // guarantee is asserted rather than assumed: Express matches in registration
  // order, so the redirect must win. Were it mounted the other way round,
  // /fb-tarot/c would be served the SPA shell and the redirect would never fire.
  app.use((_req, res) => { res.status(200).send('spa-catch-all'); });

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** One hop only — never follow, so we can assert on the redirect itself. */
const hop = (path: string, method = 'GET') =>
  fetch(`${base}${path}`, { redirect: 'manual', method });

describe('GET /fb-tarot/c', () => {
  it('answers 302 (not 301 — a 301 would be cached past any rollback)', async () => {
    const r = await hop('/fb-tarot/c?hook=cards-return');
    expect(r.status).toBe(302);
  });

  it('points Location at /b with the query string intact', async () => {
    const r = await hop('/fb-tarot/c?hook=cards-return&fbclid=IwAR9');
    expect(r.headers.get('location')).toBe('/fb-tarot/b?hook=cards-return&fbclid=IwAR9');
  });

  it('redirects a bare /c with no query string', async () => {
    const r = await hop('/fb-tarot/c');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/fb-tarot/b');
  });

  it('lands on the real /b route when followed (no loop, no 404)', async () => {
    const r = await fetch(`${base}/fb-tarot/c?hook=cards-feels`, { redirect: 'follow' });
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('bridge-b');
    expect(new URL(r.url).pathname).toBe('/fb-tarot/b');
    expect(new URL(r.url).searchParams.get('hook')).toBe('cards-feels');
  });
});

describe('what the redirect must NOT touch', () => {
  it('leaves /fb-tarot/b alone — no redirect loop', async () => {
    const r = await hop('/fb-tarot/b?hook=cards-return');
    expect(r.status).toBe(200);
  });

  it('leaves bare /fb-tarot (Version A) alone', async () => {
    const r = await hop('/fb-tarot?hook=cards-return');
    expect(r.status).toBe(200);
  });

  // 🔴 The one that would be a live content change: on fb-palm the URL, not the
  // server, decides the opener, so redirecting palm /c would switch real traffic
  // from the interactive LLM opener to the pre-written one.
  it('leaves /fb-palm/c alone', async () => {
    const r = await hop('/fb-palm/c?sign=thumb&hook=palm-love');
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('palm-c');
  });
});

// Express 5's own matching, pinned by test rather than assumed. Ad URLs are typed
// by hand and pasted between tools, so the sloppy variants genuinely occur; and
// path-to-regexp v8 (new in Express 5) changed trailing-slash handling, so an
// upgrade could silently drop a slice of ad traffic onto the SPA catch-all.
describe('URL variants Express still matches', () => {
  it('redirects a trailing slash', async () => {
    const r = await hop('/fb-tarot/c/?hook=cards-return');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/fb-tarot/b?hook=cards-return');
  });

  it('redirects regardless of case', async () => {
    const r = await hop('/FB-Tarot/C?hook=cards-return');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/fb-tarot/b?hook=cards-return');
  });

  it('does NOT swallow a deeper path under /fb-tarot/c', async () => {
    const r = await hop('/fb-tarot/c/extra');
    expect(r.status).not.toBe(302);
  });

  // The ordering guarantee itself: registerRoutes runs before the SPA catch-all
  // is mounted (index.ts), and Express matches in registration order.
  it('beats the SPA catch-all mounted after it', async () => {
    const r = await hop('/fb-tarot/c?hook=cards-return');
    expect(r.status).toBe(302);
    // Sanity: the catch-all IS live for anything the redirect does not claim.
    const other = await hop('/some/other/page');
    expect(other.status).toBe(200);
    expect(await other.text()).toBe('spa-catch-all');
  });
});
