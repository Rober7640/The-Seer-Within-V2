import { describe, it, expect, vi } from 'vitest';
vi.mock('../lib/db', () => ({ db: {} }));
import express from 'express';
import type { AddressInfo } from 'net';
import { registerSmsShortLinks, smsShortLinkTarget } from './smsShortLink';
import { makeShortToken, SHORT_TOKEN_LENGTH } from '../lib/magicLink';

const UTM2 = 'utm_source=sms&utm_campaign=v1-buyers&utm_content=t2';
const UTM3 = 'utm_source=sms&utm_campaign=v1-buyers&utm_content=t3';

describe('SMS short links (Joel, 24 Nov 2026)', () => {
  it('token link ⇒ her one-tap login, with the same tracking tags as before', () => {
    expect(smsShortLinkTarget('2', 'Ab3dEf6hIj9kLm')).toBe(`/magic-auth?t=Ab3dEf6hIj9kLm&${UTM2}`);
    expect(smsShortLinkTarget('3', 'Ab3dEf6hIj9kLm')).toBe(`/magic-auth?t=Ab3dEf6hIj9kLm&${UTM3}`);
  });
  it('no token ⇒ public Evelyn lander (the old fallback)', () => {
    expect(smsShortLinkTarget('2')).toBe(`/evelyn?${UTM2}`);
  });
  it('junk never reaches /magic-auth', () => {
    expect(smsShortLinkTarget('9', 'Ab3dEf6hIj9kLm')).toBe('/');
    expect(smsShortLinkTarget('2', 'x"><script>')).toBe(`/evelyn?${UTM2}`);
    expect(smsShortLinkTarget('2', 'a&t=b')).toBe(`/evelyn?${UTM2}`);
  });
  it('old long 64-hex tokens (already sent on dev) still work', () => {
    const hex = 'a'.repeat(64);
    expect(smsShortLinkTarget('2', hex)).toBe(`/magic-auth?t=${hex}&${UTM2}`);
  });
  it('express: 302 redirects, never cached', async () => {
    const app = express();
    registerSmsShortLinks(app);
    const server = app.listen(0);
    await new Promise((r) => server.once('listening', r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const r = await fetch(`${base}/s/2/Ab3dEf6hIj9kLm`, { redirect: 'manual' });
      expect(r.status).toBe(302);
      expect(r.headers.get('location')).toBe(`/magic-auth?t=Ab3dEf6hIj9kLm&${UTM2}`);
      expect(r.headers.get('cache-control')).toBe('no-store');
      const f = await fetch(`${base}/s/3`, { redirect: 'manual' });
      expect(f.headers.get('location')).toBe(`/evelyn?${UTM3}`);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
  it('short tokens: 14 letters/digits, all different', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const t = makeShortToken();
      expect(t).toMatch(new RegExp(`^[A-Za-z0-9]{${SHORT_TOKEN_LENGTH}}$`));
      seen.add(t);
    }
    expect(seen.size).toBe(2000);
  });
});
