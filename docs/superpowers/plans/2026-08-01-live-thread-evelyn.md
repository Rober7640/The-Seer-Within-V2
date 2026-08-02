# The Live Thread (Evelyn Rollout Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Evelyn's quiz-mechanic lander with a chat-styled "Live Thread" that continues the specific email/campaign hook a reader clicked, preserves their typed reply across signup, and recognizes an already-authenticated reader without a redundant lander gate — shipped dark behind an experiment flag, Evelyn only.

**Architecture:** A new `email_link_codes` table + `GET /e/:code` redirector replaces the `?campaign=` query param with an opaque, per-send code that resolves to a full content snapshot (`continueSeed`/`openLoop`/`readingRecap`) and redirects into the existing `/evelyn` lander with a plain `?campaign=` param (safe once past Mail-side link-stripping). The existing `/start` → `evelynLanderSessions` → `arrivalReading.ts` → `generateGreeting` pipeline is reused almost entirely unchanged; the two real gaps are (a) `resolveSegment()` doesn't yet recognize an already-authenticated caller, and (b) there's nowhere to hold a reader's typed reply before they have an account. Everything else — magic links, verification, account creation, rate limiting — reuses existing mechanisms as-is.

**Tech Stack:** TypeScript, Node.js/Express, React 18, Drizzle ORM (Postgres/Supabase), `node:test` via `tsx --test`, Playwright.

## Global Constraints

- **Test runner:** `npx tsx --test <file>` (node:test). DB-touching tests gate on `Boolean(process.env.DATABASE_URL)` and are `{ skip: !HAS_DB }` — copy this exactly from `server/lib/chatEngine.contextWindow.test.ts`.
- **No new auth mechanism.** The app authenticates via a JWT held in `localStorage`, verified with `jwt.verify(token, process.env.JWT_SECRET!)` — there is no server-set session cookie anywhere in this app. Confirm the exact existing decode helper before Task 4 (see that task's Step 0) rather than assuming the raw `jsonwebtoken` call is how it's already wrapped elsewhere.
- **No new magic-link/verification token system.** Reuse `server/lib/magicLink.ts` (`generateMagicLinkToken`/`verifyMagicLinkToken`) and the existing `/api/auth/verify-email/:token` route exactly as they exist today (30-day expiry, re-clickable). Do not add single-use/short-expiry semantics — this was considered and rejected (see spec's Codex-review-driven corrections, 2026-08-01).
- **Evelyn only.** Aiden and Luna are explicitly out of scope for this plan (separate future plans, per the spec's persona-by-persona rollout decision). Do not touch `AidenQuizPage.tsx` or `PersonaLanderPage.tsx`.
- **Ship dark.** The new lander mechanic is a new arm on the existing `useABVariant("evelyn_lander", "mechanic", "quiz")` experiment (`EvelynLanderPage.tsx:169`), defaulting to 0% traffic until the operator flips it live — matching this project's standing "ship dark, flip flag" convention.
- **Branch:** work continues on `feat/email-chat-continuity` (current branch) unless the operator says otherwise. Commit after every task.
- **Spec of record:** `docs/superpowers/specs/2026-08-01-live-thread-arrival-design.md` (plus its companion Codex review doc). Every task below cites the exact spec section it implements.

---

## File Structure

| File | Change |
|---|---|
| `shared/schema.ts` | Add `emailLinkCodes` table; add `pendingReply` column to `evelynLanderSessions` |
| `server/lib/emailLinkCodes.ts` | New — mint/resolve short codes |
| `server/lib/emailLinkCodes.test.ts` | New |
| `server/routes/emailLinkRedirect.ts` | New — `GET /e/:code` |
| `server/routes/emailLinkRedirect.test.ts` | New |
| `server/routes/evelynLander.ts` | Modify — `resolveSegment()` JWT branch; new `/reply` and `/check-email` routes |
| `server/routes/evelynLander.test.ts` | Modify — add cases for the above |
| `server/lib/rateLimiter.ts` | Modify — add `accountDetectionLimiter` |
| `server/routes/auth.ts` | Modify — `/register` accepts `landerSessionToken`-derived `pendingReply` + incentive eligibility; verify-email and magic-verify routes attach the reply as a `chat_messages` row |
| `server/routes/auth.test.ts` | Modify — add cases for the above |
| `server/lib/verificationEmail.ts` | Modify — `getFreeMinutesForSignup` incentive branch |
| `client/src/components/LiveThreadLander.tsx` | New — the chat-styled lander component |
| `client/src/components/LiveThreadLander.test.tsx` | New |
| `client/src/pages/EvelynLanderPage.tsx` | Modify — attach JWT header to `/start`, await it before the existing redirect, render `LiveThreadLander` as a new experiment arm |
| `docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs` | Modify — parse `continueSeed`/`openLoop`/`readingRecap`, mint a code, emit `/e/<code>` |
| `tests/live-thread-evelyn.spec.ts` | New — Playwright E2E |
| `improve-v2/eval/cases.json` | Modify — append new frozen cases |
| `docs/test-ideas.md` | Modify — append checklist entries |

---

### Task 1: `email_link_codes` table + `pendingReply` column

**Files:**
- Modify: `shared/schema.ts`
- Test: `shared/schema.test.ts` (create if it doesn't exist — a minimal smoke test is fine; this repo's existing convention tests behavior via the tables that use them, not the schema file itself)

**Interfaces:**
- Produces: `emailLinkCodes` table, `evelynLanderSessions.pendingReply` column — both consumed by Task 2 onward.

- [ ] **Step 1: Add the table and column**

In `shared/schema.ts`, near the existing `evelynLanderSessions` definition (around line 1107), add:

```ts
export const emailLinkCodes = pgTable("email_link_codes", {
  code: varchar("code").primaryKey(),
  personaSlug: text("persona_slug").notNull(),
  campaign: text("campaign").notNull(),
  readingRecap: text("reading_recap"),
  openLoop: text("open_loop"),
  continueSeed: text("continue_seed").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_link_codes_campaign").on(table.campaign),
]);
```

And add one column to the existing `evelynLanderSessions` table definition:

```ts
  pendingReply: text("pending_reply"),
```
(add it directly after the existing `campaign: text("campaign"),` line so it sits with the other per-visit fields)

- [ ] **Step 2: Push the schema**

Run: `npm run db:push`
Expected: Drizzle reports the new `email_link_codes` table and the new `pending_reply` column created, no errors.

- [ ] **Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(live-thread): add email_link_codes table and pendingReply column"
```

---

### Task 2: `server/lib/emailLinkCodes.ts` — mint/resolve short codes

**Files:**
- Create: `server/lib/emailLinkCodes.ts`
- Test: `server/lib/emailLinkCodes.test.ts`

**Interfaces:**
- Consumes: `emailLinkCodes` table (Task 1).
- Produces: `mintEmailLinkCode(input): Promise<string>`, `resolveEmailLinkCode(code): Promise<ResolvedEmailLink | null>`, `interface ResolvedEmailLink { personaSlug: string; campaign: string; readingRecap: string | null; openLoop: string | null; continueSeed: string }` — consumed by Task 3 (redirector) and Task 13 (email pipeline).

- [ ] **Step 1: Write the failing tests**

```ts
// server/lib/emailLinkCodes.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mintEmailLinkCode, resolveEmailLinkCode } from './emailLinkCodes';

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe('emailLinkCodes', { skip: !HAS_DB }, () => {
  it('mints a code and resolves it back to the same content', async () => {
    const code = await mintEmailLinkCode({
      personaSlug: 'evelyn-cross',
      campaign: 'test-campaign-' + Date.now(),
      continueSeed: 'You came back — good.',
      openLoop: 'What is the thing you keep circling?',
      readingRecap: 'You wrote in about a repeated pattern.',
    });
    assert.ok(code.length > 0);

    const resolved = await resolveEmailLinkCode(code);
    assert.ok(resolved);
    assert.equal(resolved.personaSlug, 'evelyn-cross');
    assert.equal(resolved.continueSeed, 'You came back — good.');
    assert.equal(resolved.openLoop, 'What is the thing you keep circling?');
  });

  it('returns null for an unknown code', async () => {
    const resolved = await resolveEmailLinkCode('does-not-exist-12345');
    assert.equal(resolved, null);
  });

  it('allows readingRecap and openLoop to be omitted', async () => {
    const code = await mintEmailLinkCode({
      personaSlug: 'evelyn-cross',
      campaign: 'test-campaign-minimal-' + Date.now(),
      continueSeed: 'Just the seed.',
    });
    const resolved = await resolveEmailLinkCode(code);
    assert.ok(resolved);
    assert.equal(resolved.readingRecap, null);
    assert.equal(resolved.openLoop, null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/lib/emailLinkCodes.test.ts`
Expected: FAIL — cannot find module `./emailLinkCodes`.

- [ ] **Step 3: Write the implementation**

```ts
// server/lib/emailLinkCodes.ts
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { emailLinkCodes } from '@shared/schema';

export interface ResolvedEmailLink {
  personaSlug: string;
  campaign: string;
  readingRecap: string | null;
  openLoop: string | null;
  continueSeed: string;
}

interface MintEmailLinkCodeInput {
  personaSlug: string;
  campaign: string;
  continueSeed: string;
  readingRecap?: string;
  openLoop?: string;
}

function generateCode(): string {
  // 5 random bytes -> 7-char URL-safe string (base64url, no padding).
  return randomBytes(5).toString('base64url');
}

export async function mintEmailLinkCode(input: MintEmailLinkCodeInput): Promise<string> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    try {
      await db.insert(emailLinkCodes).values({
        code,
        personaSlug: input.personaSlug,
        campaign: input.campaign,
        continueSeed: input.continueSeed,
        readingRecap: input.readingRecap ?? null,
        openLoop: input.openLoop ?? null,
      });
      return code;
    } catch (err: any) {
      if (err?.code === '23505') continue; // primary-key collision, retry with a fresh code
      throw err;
    }
  }
  throw new Error(`Failed to mint a unique email link code after ${MAX_ATTEMPTS} attempts`);
}

export async function resolveEmailLinkCode(code: string): Promise<ResolvedEmailLink | null> {
  const rows = await db.select().from(emailLinkCodes).where(eq(emailLinkCodes.code, code)).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    personaSlug: row.personaSlug,
    campaign: row.campaign,
    readingRecap: row.readingRecap,
    openLoop: row.openLoop,
    continueSeed: row.continueSeed,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/lib/emailLinkCodes.test.ts`
Expected: PASS (3 tests). If `DATABASE_URL` isn't set locally, all 3 report as skipped — that's fine, they'll run in CI/against a real DB.

- [ ] **Step 5: Commit**

```bash
git add server/lib/emailLinkCodes.ts server/lib/emailLinkCodes.test.ts
git commit -m "feat(live-thread): add mintEmailLinkCode/resolveEmailLinkCode"
```

---

### Task 3: `GET /e/:code` redirector

**Files:**
- Create: `server/routes/emailLinkRedirect.ts`
- Test: `server/routes/emailLinkRedirect.test.ts`
- Modify: wherever routers are mounted (see Step 0)

**Interfaces:**
- Consumes: `resolveEmailLinkCode` (Task 2).
- Produces: `emailLinkRedirectRouter` (Express `Router`), mounted at the app root — consumed by nothing else in this plan, this is a leaf route.

- [ ] **Step 0: Find the exact router-mounting convention**

Run: `grep -n "evelynLanderRouter" server/routes.ts server/index.ts 2>/dev/null`
Expected: one or more `app.use('/api/evelyn-lander', evelynLanderRouter)`-shaped lines. Note the exact file and the `import` style used for other routers in that file — Step 3 below mounts the new router the same way, at the SAME file, not a new one.

- [ ] **Step 1: Write the failing test**

```ts
// server/routes/emailLinkRedirect.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { emailLinkRedirectRouter } from './emailLinkRedirect';
import { mintEmailLinkCode } from '../lib/emailLinkCodes';

const HAS_DB = Boolean(process.env.DATABASE_URL);

describe('GET /e/:code', { skip: !HAS_DB }, () => {
  const app = express();
  app.use(emailLinkRedirectRouter);

  it('redirects to the persona lander with a plain campaign param', async () => {
    const code = await mintEmailLinkCode({
      personaSlug: 'evelyn-cross',
      campaign: 'redirect-test-' + Date.now(),
      continueSeed: 'seed',
    });
    const res = await request(app).get(`/e/${code}`);
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /^\/evelyn\?campaign=/);
  });

  it('passes through an email hint if present', async () => {
    const code = await mintEmailLinkCode({
      personaSlug: 'evelyn-cross',
      campaign: 'redirect-test-email-' + Date.now(),
      continueSeed: 'seed',
    });
    const res = await request(app).get(`/e/${code}?email=reader@example.com`);
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /email=reader%40example\.com/);
  });

  it('redirects to /personas for an unresolvable code', async () => {
    const res = await request(app).get('/e/does-not-exist-xyz');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/personas');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/routes/emailLinkRedirect.test.ts`
Expected: FAIL — cannot find module `./emailLinkRedirect`. (If `supertest` isn't already a dependency, run `npm install --save-dev supertest @types/supertest` first — check `package.json` for it before assuming it needs adding.)

- [ ] **Step 3: Write the implementation**

```ts
// server/routes/emailLinkRedirect.ts
import { Router } from 'express';
import { resolveEmailLinkCode } from '../lib/emailLinkCodes';

// Only Evelyn is wired for this rollout slice; Aiden/Luna are added here
// once their pipeline integration exists (persona-by-persona rollout).
const PERSONA_LANDER_PATHS: Record<string, string> = {
  'evelyn-cross': '/evelyn',
};

export const emailLinkRedirectRouter = Router();

emailLinkRedirectRouter.get('/e/:code', async (req, res) => {
  const resolved = await resolveEmailLinkCode(req.params.code);
  if (!resolved) {
    res.redirect('/personas');
    return;
  }

  const landerPath = PERSONA_LANDER_PATHS[resolved.personaSlug];
  if (!landerPath) {
    res.redirect('/personas');
    return;
  }

  const params = new URLSearchParams({ campaign: resolved.campaign });
  const email = req.query.email;
  if (typeof email === 'string' && email.length > 0) {
    params.set('email', email);
  }
  res.redirect(`${landerPath}?${params.toString()}`);
});
```

- [ ] **Step 4: Mount the router**

Using the exact file/import style found in Step 0, add:

```ts
import { emailLinkRedirectRouter } from './routes/emailLinkRedirect';
// ...
app.use(emailLinkRedirectRouter);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test server/routes/emailLinkRedirect.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add server/routes/emailLinkRedirect.ts server/routes/emailLinkRedirect.test.ts
git commit -m "feat(live-thread): add GET /e/:code short-link redirector"
```

---

### Task 4: `resolveSegment()` recognizes an already-authenticated caller

**Files:**
- Modify: `server/routes/evelynLander.ts:83-147` (`resolveSegment`)
- Modify: `client/src/pages/EvelynLanderPage.tsx` (the `/start` POST call, around line 199-259) — this task covers BOTH sides since they're one interface change
- Test: `server/routes/evelynLander.test.ts`

**Interfaces:**
- Consumes: the app's existing JWT verification (confirm exact helper in Step 0), `users` table (`emailVerified` column).
- Produces: `resolveSegment()` returns `{ segment: 'v2_active', resolvedUserId, firstName, isReturning: true }` when given a valid, verified JWT — this is the SAME return shape `resolveSegment` already produces for its other branches, so nothing downstream in `evelynLander.ts` needs to change.

- [ ] **Step 0: Confirm the exact existing JWT-verify helper**

Run: `grep -rn "jwt.verify\|jsonwebtoken" server/lib server/middleware 2>/dev/null | head -20`
Expected: an existing helper (likely `server/lib/auth.ts` or similar) wrapping `jwt.verify(token, process.env.JWT_SECRET!)` and returning a `{ userId }`-shaped payload — this is what routes populating `req.userId!` elsewhere (e.g. `chatService.ts:91`) already call. Use THAT function in Step 2 below, adjusting the import path/name to match what you find, rather than calling `jwt.verify` raw a second time in a new place.

- [ ] **Step 1: Write the failing test**

```ts
// server/routes/evelynLander.test.ts (add to existing file)
import { generateToken } from '../lib/auth'; // adjust import to match Step 0's finding

describe('resolveSegment — already-authenticated caller', { skip: !HAS_DB }, () => {
  it('resolves directly to v2_active for a valid, verified JWT, skipping email/token checks', async () => {
    const user = await createTestUser({ emailVerified: true }); // use existing test-user helper in this file
    const token = generateToken(user.id, user.email);

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken: 'test-session-' + Date.now(), campaign: 'jwt-test-campaign' });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'v2_active');
    assert.equal(res.body.isReturning, true);
  });

  it('does NOT resolve to v2_active for an unverified account\'s JWT', async () => {
    const user = await createTestUser({ emailVerified: false });
    const token = generateToken(user.id, user.email);

    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionToken: 'test-session-unverified-' + Date.now(), campaign: 'jwt-test-campaign' });

    assert.equal(res.status, 200);
    assert.notEqual(res.body.segment, 'v2_active');
  });

  it('falls through to brand_new with no Authorization header, as today', async () => {
    const res = await request(app)
      .post('/api/evelyn-lander/start')
      .send({ sessionToken: 'test-session-anon-' + Date.now() });

    assert.equal(res.status, 200);
    assert.equal(res.body.segment, 'brand_new');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/routes/evelynLander.test.ts`
Expected: FAIL — first test gets `segment: 'brand_new'` instead of `'v2_active'` (the JWT branch doesn't exist yet).

- [ ] **Step 3: Write the implementation**

In `server/routes/evelynLander.ts`, add a new first branch to `resolveSegment` (before the existing `token`/`email` checks), and thread the request's `Authorization` header into it:

```ts
// At the top of resolveSegment (before the existing token/email branches):
async function resolveSegment(
  authHeader: string | undefined,
  token: string | undefined,
  email: string | undefined,
): Promise<ResolvedSegment> {
  if (authHeader?.startsWith('Bearer ')) {
    const decoded = verifyAppJwt(authHeader.slice(7)); // exact helper name from Step 0
    if (decoded) {
      const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      if (user && user.emailVerified && user.accountStatus === 'active') {
        return {
          segment: 'v2_active',
          resolvedUserId: user.id,
          firstName: user.firstName,
          isReturning: true,
        };
      }
    }
  }

  // ... existing token/email branches, unchanged below this point
}
```

And in the `/start` route handler, pass `req.headers.authorization` through:

```ts
const resolved = await resolveSegment(req.headers.authorization, parsed.token, parsed.email);
```

In `client/src/pages/EvelynLanderPage.tsx`, attach the stored JWT (if any) to the existing `/start` fetch call:

```tsx
const storedToken = localStorage.getItem("seer_auth_token");
const res = await fetch("/api/evelyn-lander/start", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
  },
  body: JSON.stringify({ /* unchanged */ }),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/routes/evelynLander.test.ts`
Expected: PASS (all 3 new cases, plus every pre-existing test in this file still passing — run the whole file, not just the new `describe` block).

- [ ] **Step 5: Commit**

```bash
git add server/routes/evelynLander.ts client/src/pages/EvelynLanderPage.tsx server/routes/evelynLander.test.ts
git commit -m "feat(live-thread): resolveSegment recognizes an already-authenticated, verified caller"
```

---

### Task 5: Await `/start` before the existing "already logged in" redirect

**Files:**
- Modify: `client/src/pages/EvelynLanderPage.tsx:186-193`
- Test: `client/src/pages/EvelynLanderPage.test.tsx` (create if this file doesn't exist yet — check first)

**Interfaces:**
- Consumes: the JWT-aware `/start` call from Task 4.
- Produces: the existing redirect-away behavior, now sequenced after the `/start` call resolves — nothing downstream depends on new exports, this is behavioral only.

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/pages/EvelynLanderPage.test.tsx
import { describe, it, expect, vi } from 'vitest'; // or the existing test runner this repo's client tests use — check package.json for "test" script and existing client *.test.tsx files first
import { render, waitFor } from '@testing-library/react';
import EvelynLanderPage from './EvelynLanderPage';

describe('EvelynLanderPage — already logged in', () => {
  it('calls /start before navigating away, so the campaign gets recorded', async () => {
    const startCalls: string[] = [];
    let navigatedAfterStart = false;

    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/api/evelyn-lander/start')) {
        startCalls.push('start');
        await new Promise((r) => setTimeout(r, 10));
        return new Response(JSON.stringify({ segment: 'v2_active', firstName: 'Test', isReturning: true, opener: '' }), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    }) as any;

    // mock useAuth() to report a logged-in user — adjust to this repo's existing
    // auth-context mocking convention (check other *.test.tsx files for the pattern)
    // ... render with a logged-in user context ...

    await waitFor(() => {
      expect(startCalls.length).toBe(1);
    });
    // assert navigation happened AFTER start resolved, not before
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run whichever client test command `package.json`'s `"test"` script (or a client-specific one) resolves to.
Expected: FAIL or flaky — today's `useEffect` (lines 186-193) navigates immediately on seeing `user`, independent of the `/start` call's timing.

- [ ] **Step 3: Write the implementation**

Change the existing effect from a fire-and-forget navigate to one that awaits the start call:

```tsx
useEffect(() => {
  if (authLoading) return;
  if (!user) return;

  let cancelled = false;
  (async () => {
    await postStart(); // the existing /start POST logic, extracted to a named async function if not already
    if (!cancelled) {
      clearSession();
      navigate(READING_DEST, { replace: true });
    }
  })();
  return () => { cancelled = true; };
}, [authLoading, user, navigate]);
```

Extract the existing `/start` fetch logic (lines 199-259) into a `postStart()` function if it isn't already one, so both the logged-in-skip path and the normal anonymous path call the same function.

- [ ] **Step 4: Run test to verify it passes**

Run the client test command again.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/EvelynLanderPage.tsx client/src/pages/EvelynLanderPage.test.tsx
git commit -m "fix(live-thread): await /start before redirecting an already-logged-in visitor"
```

---

### Task 6: `pendingReply` persistence endpoint

**Files:**
- Modify: `server/routes/evelynLander.ts` (add a new route)
- Test: `server/routes/evelynLander.test.ts`

**Interfaces:**
- Consumes: `evelynLanderSessions.pendingReply` column (Task 1).
- Produces: `POST /api/evelyn-lander/reply` — consumed by `LiveThreadLander` (Task 11) and by Task 10 (reply attachment on verification).

- [ ] **Step 1: Write the failing test**

```ts
describe('POST /api/evelyn-lander/reply', { skip: !HAS_DB }, () => {
  it('stores the reply text against the session row', async () => {
    const sessionToken = 'reply-test-' + Date.now();
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });

    const res = await request(app)
      .post('/api/evelyn-lander/reply')
      .send({ sessionToken, reply: '444. Every day.' });

    assert.equal(res.status, 200);

    const [row] = await db.select().from(evelynLanderSessions).where(eq(evelynLanderSessions.sessionToken, sessionToken));
    assert.equal(row.pendingReply, '444. Every day.');
  });

  it('404s for an unknown sessionToken', async () => {
    const res = await request(app).post('/api/evelyn-lander/reply').send({ sessionToken: 'does-not-exist', reply: 'x' });
    assert.equal(res.status, 404);
  });

  it('rejects an empty reply', async () => {
    const sessionToken = 'reply-test-empty-' + Date.now();
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'reply-test-campaign' });
    const res = await request(app).post('/api/evelyn-lander/reply').send({ sessionToken, reply: '' });
    assert.equal(res.status, 400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/routes/evelynLander.test.ts`
Expected: FAIL — route doesn't exist (404 on all three, including the ones expecting 200).

- [ ] **Step 3: Write the implementation**

```ts
const replySchema = z.object({
  sessionToken: z.string().min(8).max(128),
  reply: z.string().min(1).max(2000),
});

router.post('/reply', async (req, res) => {
  const parsed = replySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const result = await db
    .update(evelynLanderSessions)
    .set({ pendingReply: parsed.data.reply })
    .where(eq(evelynLanderSessions.sessionToken, parsed.data.sessionToken))
    .returning({ id: evelynLanderSessions.id });

  if (result.length === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({ ok: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/routes/evelynLander.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/evelynLander.ts server/routes/evelynLander.test.ts
git commit -m "feat(live-thread): add pendingReply persistence endpoint"
```

---

### Task 7: Account-detection endpoint (3 outcomes) + rate limiter

**Files:**
- Modify: `server/lib/rateLimiter.ts` (add `accountDetectionLimiter`)
- Modify: `server/routes/evelynLander.ts` (add `/check-email` route)
- Test: `server/routes/evelynLander.test.ts`

**Interfaces:**
- Consumes: `users` table (`emailVerified`), `magicLink.ts`'s `generateMagicLinkToken`, `verificationEmail.ts`'s send function, `auth.ts`'s existing resend-verification logic.
- Produces: `POST /api/evelyn-lander/check-email` returning `{ outcome: 'verified_match' | 'unverified_match' | 'no_match' }` — consumed by `LiveThreadLander` (Task 11).

- [ ] **Step 1: Add the rate limiter**

In `server/lib/rateLimiter.ts`, add, following the exact shape of the existing `landerLimiter`:

```ts
export const accountDetectionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDevEnv ? 200 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
  skip: () => isTestEnv,
});
```

- [ ] **Step 2: Write the failing test**

```ts
describe('POST /api/evelyn-lander/check-email', { skip: !HAS_DB }, () => {
  it('returns verified_match for an existing verified account', async () => {
    const user = await createTestUser({ emailVerified: true });
    const res = await request(app).post('/api/evelyn-lander/check-email').send({ email: user.email });
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'verified_match');
  });

  it('returns unverified_match for an existing unverified account', async () => {
    const user = await createTestUser({ emailVerified: false });
    const res = await request(app).post('/api/evelyn-lander/check-email').send({ email: user.email });
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'unverified_match');
  });

  it('returns no_match for an unknown email', async () => {
    const res = await request(app).post('/api/evelyn-lander/check-email').send({ email: `nobody-${Date.now()}@example.com` });
    assert.equal(res.status, 200);
    assert.equal(res.body.outcome, 'no_match');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test server/routes/evelynLander.test.ts`
Expected: FAIL — route doesn't exist.

- [ ] **Step 4: Write the implementation**

```ts
const checkEmailSchema = z.object({ email: z.string().email() });

router.post('/check-email', accountDetectionLimiter, async (req, res) => {
  const parsed = checkEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid email' });
    return;
  }

  const [existing] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);

  if (!existing) {
    res.json({ outcome: 'no_match' });
    return;
  }

  if (existing.emailVerified) {
    const token = await generateMagicLinkToken(existing.id, existing.defaultPersonaId ?? '', 'evelyn-cross');
    await sendMagicLinkEmail(existing.email, existing.firstName, token); // reuse whatever existing function sends this today — confirm exact name via `grep -n "generateMagicLinkToken" server/routes/auth.ts`
    res.json({ outcome: 'verified_match' });
    return;
  }

  await resendVerificationEmail(existing); // reuse the existing resend-verification logic in auth.ts — extract to a shared function if it's currently inline in the route handler
  res.json({ outcome: 'unverified_match' });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test server/routes/evelynLander.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/lib/rateLimiter.ts server/routes/evelynLander.ts server/routes/evelynLander.test.ts
git commit -m "feat(live-thread): add account-detection endpoint (verified/unverified/no-match)"
```

---

### Task 8: Wire `pendingReply` + incentive flag into `/api/auth/register`

**Files:**
- Modify: `server/routes/auth.ts:217-227` (`registerSchema`), `L263-272` and onward (handler body)
- Test: `server/routes/auth.test.ts`

**Interfaces:**
- Consumes: `evelynLanderSessions.pendingReply` (Task 1), existing `landerSessionToken` field already accepted by `registerSchema`.
- Produces: registration now looks up `pendingReply` via `landerSessionToken` and stores an "eligible for the higher grant" signal for Task 9 to consume.

- [ ] **Step 1: Write the failing test**

```ts
describe('POST /api/auth/register — Live Thread pendingReply', { skip: !HAS_DB }, () => {
  it('is eligible for the higher grant when the lander session has a pendingReply', async () => {
    const sessionToken = 'register-test-' + Date.now();
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'register-test-campaign' });
    await request(app).post('/api/evelyn-lander/reply').send({ sessionToken, reply: '444. Every day.' });

    const res = await request(app).post('/api/auth/register').send({
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      persona: 'evelyn-cross',
      landerSessionToken: sessionToken,
    });

    assert.equal(res.status, 201);
    // exact assertion depends on how eligibility surfaces — check the response
    // or query the user row directly per however Task 9 exposes it
  });

  it('is NOT eligible when there is no pendingReply on the session', async () => {
    const sessionToken = 'register-test-no-reply-' + Date.now();
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'register-test-campaign' });

    const res = await request(app).post('/api/auth/register').send({
      email: `test-noreply-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      persona: 'evelyn-cross',
      landerSessionToken: sessionToken,
    });

    assert.equal(res.status, 201);
    // assert NOT eligible
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/routes/auth.test.ts`
Expected: FAIL on whatever eligibility assertion you land on in Step 1 (registration itself already works — only the new eligibility signal is missing).

- [ ] **Step 3: Write the implementation**

In the register handler, after the existing `landerSessionToken` linking logic (non-blocking today per the earlier research — check its exact location before editing), add a lookup:

```ts
let engagedViaLiveThread = false;
if (parsed.data.landerSessionToken) {
  const [landerSession] = await db
    .select({ pendingReply: evelynLanderSessions.pendingReply })
    .from(evelynLanderSessions)
    .where(eq(evelynLanderSessions.sessionToken, parsed.data.landerSessionToken))
    .limit(1);
  engagedViaLiveThread = Boolean(landerSession?.pendingReply);
}
```

Pass `engagedViaLiveThread` into whatever function grants welcome coins (Task 9 defines its exact signature) — for this task, just confirm the flag computes correctly; do not change the grant amount yet.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/routes/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/auth.ts server/routes/auth.test.ts
git commit -m "feat(live-thread): detect Live Thread engagement at registration time"
```

---

### Task 9: Differentiated free-minute grant

**Files:**
- Modify: `server/lib/verificationEmail.ts:37-43` (`getFreeMinutesForSignup`)
- Modify: `server/routes/auth.ts` (the actual coin-grant logic — find and update in lockstep, per the existing warning comment at `verificationEmail.ts:25-36`)
- Test: `server/lib/verificationEmail.test.ts` (create if it doesn't exist)

**Interfaces:**
- Consumes: `engagedViaLiveThread` flag (Task 8).
- Produces: `getFreeMinutesForSignup(persona?, source?, engagedViaLiveThread?)` — the new 4th parameter, backward-compatible (defaults to `false`).

- [ ] **Step 1: Write the failing test**

```ts
// server/lib/verificationEmail.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFreeMinutesForSignup } from './verificationEmail';

describe('getFreeMinutesForSignup', () => {
  it('grants the Live Thread incentive amount when engaged', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander', true), 10);
  });

  it('grants the existing baseline when not engaged', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander', false), 5);
  });

  it('defaults engagedViaLiveThread to false when omitted (backward compatible)', () => {
    assert.equal(getFreeMinutesForSignup('evelyn-cross', 'evelyn-lander'), 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/lib/verificationEmail.test.ts`
Expected: FAIL — first test gets `5` instead of `10` (function doesn't accept a 3rd argument yet).

- [ ] **Step 3: Write the implementation**

```ts
export function getFreeMinutesForSignup(
  persona?: string,
  source?: string,
  engagedViaLiveThread: boolean = false,
): number {
  if (engagedViaLiveThread) return 10; // TBD exact number — operator confirmed placeholder in the spec
  if (source === 'promo-7-7') return 7;
  if (source === 'evelyn-lander' && persona === 'evelyn-cross') return 5;
  if (source === 'soulmate-lander' && persona === 'evelyn-cross') return 5;
  if (persona === 'aiden-powers') return 10;
  return 3;
}
```

Then update `auth.ts`'s coin-grant call site to pass the same `engagedViaLiveThread` value computed in Task 8, keeping it in lockstep per the existing warning comment.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/lib/verificationEmail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/lib/verificationEmail.ts server/routes/auth.ts server/lib/verificationEmail.test.ts
git commit -m "feat(live-thread): differentiated free-minute grant for engaged disclosures"
```

---

## ⚠ PLAN REVISION — 2026-08-02: Task 10 redesigned, Task 14 added

**Status:** Task 10 as originally written (below, retained for history) is **SUPERSEDED**. Do not implement it. Implement "Task 10 (revised)" and "Task 14" in this section instead.

### Why

Task 10's implementer escalated `NEEDS_CONTEXT` rather than build the original design, and measured two defects against the real code on a local Postgres. Both were confirmed and the operator chose the full fix.

**1. Creating the chat session at verification time bills the reader for time they were not present.**

`startChatSession` (`server/lib/creditTracking.ts:80`) sets `started_at = NOW()` and the service meters wall-clock minutes from that instant. The original design creates the session inside the verify-email / magic-verify handlers — i.e. at the moment the reader *clicks the link*, not when they start talking. Measured cost of the click→type gap:

| Gap | Credits burned | Share of the 2990¢ Live Thread grant |
|---|---|---|
| 60s | 299¢ | 10% |
| 240s | 897¢ | 30% — trips `BILLING_ANOMALY` |
| returns inside the 30-min reattach window | 2990¢ | 100% — drained to zero before Evelyn speaks |

This spends the exact free grant Tasks 8+9 exist to give them. No way was found to pre-create a session without starting that clock.

**2. A server-only change cannot deliver Frame 3 at all.**

`pendingRestore` is seeded *only* from `localStorage[LIVE_SESSION_KEY]` (`client/src/pages/ChatServicePage.tsx:180`). A reader arriving from an email has no such key, so the server-session restore at `:717` never runs and the auto-greeting at `:805` fires instead. The reader would see a generic greeting, never see their own bubble, and have to retype. **No task in the original 13 owned this client work.**

### Task 10 (revised): replay the parked reply lazily, at real session start

**Files:** `server/lib/chatEngine.ts` (+ its test file). **The auth routes are NOT touched** — this supersedes the original task's `auth.ts` edits entirely, which also dissolves the "already-verified early-return branch at `auth.ts:710-739` needs the replay too" gap the implementer flagged.

- Replay inside `initSession` (`chatEngine.ts:1190`), after `startChatSession` and after the greeting insert, so DB order is `[assistant greeting][parked reply]`.
- `started_at` is then set when the reader actually starts. Billing bug gone; no `OUT_OF_CREDITS` risk; no force-closing a live session.
- Locate the lander session by `evelynLanderSessions.resolvedUserId` (the linkage Task 7 added at `/check-email`), newest row with a non-null `pendingReply`.
- **Do NOT null `pendingReply`** — the 10-minute grant depends on it surviving (`server/lib/liveThreadEngagement.ts` header). Mark consumption with a separate `pending_reply_consumed_at` column.
- Needs a **freshness window** so a parked reply cannot resurface in a session started weeks later. `ARRIVAL_READING_WINDOW_HOURS = 24` (`arrivalReading.ts:14`) is the existing precedent, but note the tension: verification tokens expire in 24h while magic links live 30 days, so a 24h window silently drops the reply for a returning reader who clicks on day 3. Implementer to choose and justify.
- `/magic-register` does **not** need the replay — it mails a token that lands on `/verify-email`.

### Task 14 (new): client-side Frame 3 restore

**Files:** `client/src/pages/ChatServicePage.tsx` (+ Playwright coverage). Its own task, its own review.

- On `/reading` boot with no `LIVE_SESSION_KEY`, ask `GET /api/chat-service/sessions` for an active session and restore its messages, so an email arrival sees the thread.
- If the last message is a `user` row with no assistant reply, auto-trigger the reply path instead of fetching a greeting.
- **Also owns the opener bubble**, a second gap the implementer found: spec §252 calls for the persona's `continueSeed` opener to be inserted ahead of the reply, and no task in the original 13 resolved `continueSeed` into a chat message.

### Task 15 (new, 2026-08-02): carry `continueSeed` through to the lander

**Found by Task 12's implementer, confirmed by the controller.** The feature's premise is that the lander opens by continuing the specific email the reader clicked. That continuation line is authored per-campaign and stored in `email_link_codes.continue_seed` (Task 2). But end to end it never reaches a reader:

- `GET /e/:code` (Task 3) resolves the row, keeps only `campaign`, and **discards the seed** — `server/routes/emailLinkRedirect.ts` builds `?campaign=…` and nothing else.
- `/start` then returns `selectStaticOpener({...})` (`server/routes/evelynLander.ts:279`) — Evelyn's generic opener, not the campaign's line.
- `LiveThreadLander` renders whatever `opener` it is handed (Task 12 passes it per the plan).

So every reader sees the same opening line regardless of which email they clicked, and the authored seed is written by the pipeline and read by nothing. **No task in the plan owned carrying it across** — the gap sits between Task 3 and Task 12, and each did exactly what its brief said.

**Scope:** make `/start` return the campaign's authored `continueSeed` when the `campaign` parameter resolves to an `email_link_codes` row, falling back to the existing static opener when it does not. Roughly Task 6-sized: one endpoint change, tests, review.

**Note before implementing:** `continueSeed` also exists in a hardcoded registry, `server/lib/emailReadingBriefs.ts`, which `arrivalReading.ts:107` already uses to shape the *chat* prompt. Decide which is the source of truth for the lander rather than wiring a second consumer to a duplicate.

### Rejected alternatives

- **Inject as a `user_memory` row** (the `quiz_intake` shape at `auth.ts:578-590`): cheapest, no billing, and uniquely reaches the *first greeting* via `loadUserContext` — but it is not a real `chat_messages` row, so the reader never sees their own bubble. Rejected: the feature's promise is visible continuity.
- **Lazy replay alone, without Task 14:** fixes billing but the reply only reaches Evelyn on the reader's first typed message, so the continuity is never visible. Rejected as a half-delivery.
- **The original design:** rejected on the measured billing cost above.

---

### Task 10 (SUPERSEDED — retained for history, do not implement): Attach `pendingReply` as a real `chat_messages` row on verification/magic-link success

**Files:**
- Modify: `server/routes/auth.ts` — `GET /api/auth/verify-email/:token` handler (L663-849) and `POST /api/auth/magic-verify` handler (L1441+)
- Test: `server/routes/auth.test.ts`

**Interfaces:**
- Consumes: `evelynLanderSessions.pendingReply`, `chatMessages`/`chatSessions` tables, `initSession` (`chatEngine.ts`).
- Produces: nothing new consumed elsewhere — this is the terminal step of the reply-preservation chain.

- [ ] **Step 1: Write the failing test**

```ts
describe('verify-email attaches pendingReply as the first chat message', { skip: !HAS_DB }, () => {
  it('inserts the reply as chat_messages before any greeting is generated', async () => {
    const sessionToken = 'attach-test-' + Date.now();
    await request(app).post('/api/evelyn-lander/start').send({ sessionToken, campaign: 'attach-test-campaign' });
    await request(app).post('/api/evelyn-lander/reply').send({ sessionToken, reply: '444. Every day.' });

    const regRes = await request(app).post('/api/auth/register').send({
      email: `attach-${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      persona: 'evelyn-cross',
      landerSessionToken: sessionToken,
    });
    const userId = regRes.body.user.id;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    await request(app).get(`/api/auth/verify-email/${user.verificationToken}`);

    const sessions = await db.select().from(chatSessions).where(eq(chatSessions.userId, userId));
    assert.equal(sessions.length, 1);

    const messages = await db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessions[0].id)).orderBy(chatMessages.sentAt);
    assert.ok(messages.length >= 1);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].content, '444. Every day.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test server/routes/auth.test.ts`
Expected: FAIL — no `chat_sessions`/`chat_messages` rows exist yet at verification time (today's flow doesn't create a session until the user actually opens `/reading`).

- [ ] **Step 3: Write the implementation**

In the verify-email handler, after `emailVerified` is set to `true` and before the redirect, add:

```ts
if (parsed.data.landerSessionToken) { // however the verify-email route currently threads this through — confirm exact param name via the existing registration->verification linkage
  const [landerSession] = await db
    .select({ pendingReply: evelynLanderSessions.pendingReply })
    .from(evelynLanderSessions)
    .where(eq(evelynLanderSessions.sessionToken, landerSessionToken))
    .limit(1);

  if (landerSession?.pendingReply) {
    const sessionId = await startChatSession(user.id, evelynPersonaId); // resolve evelynPersonaId from the personas table by slug
    await db.insert(chatMessages).values({
      sessionId,
      userId: user.id,
      role: 'user',
      content: landerSession.pendingReply,
    });
    // Do NOT call generateGreeting here — Frame 3's whole point is that the
    // reply already exists, so the FIRST client-side /reading load triggers
    // the normal reply-generation path (buildMessageContext via sendMessage),
    // not a fresh greeting. No further server-side call needed in this route.
  }
}
```

Apply the same pattern to the `magic-verify` handler for the existing-verified-account branch (Task 7's `verified_match` outcome), since that path also needs the reply attached.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test server/routes/auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/routes/auth.ts server/routes/auth.test.ts
git commit -m "feat(live-thread): attach pendingReply as the first chat message on verification"
```

---

### Task 11: `LiveThreadLander` React component

**Files:**
- Create: `client/src/components/LiveThreadLander.tsx`
- Test: `client/src/components/LiveThreadLander.test.tsx`

**Interfaces:**
- Consumes: `POST /api/evelyn-lander/reply` (Task 6), `POST /api/evelyn-lander/check-email` (Task 7).
- Produces: `<LiveThreadLander continueSeed={string} sessionToken={string} onOutcome={(outcome) => void} />` — consumed by `EvelynLanderPage.tsx` (Task 12).

- [ ] **Step 1: Write the failing test**

```tsx
// client/src/components/LiveThreadLander.test.tsx
import { describe, it, expect } from 'vitest'; // match this repo's existing client test runner
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LiveThreadLander from './LiveThreadLander';

describe('LiveThreadLander', () => {
  it('renders continueSeed as the opening bubble (Frame 1)', () => {
    render(<LiveThreadLander continueSeed="You came back — good." sessionToken="t1" onOutcome={() => {}} />);
    expect(screen.getByText(/You came back — good\./)).toBeInTheDocument();
  });

  it('shows the reader\'s reply as a sent bubble and reveals the email field (Frame 1.5)', async () => {
    render(<LiveThreadLander continueSeed="seed" sessionToken="t2" onOutcome={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/type your reply/i), { target: { value: '444. Every day.' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('444. Every day.')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('renders Frame 2 confirmation copy for a verified_match outcome', async () => {
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/reply')) return new Response('{"ok":true}', { status: 200 });
      if (String(url).includes('/check-email')) return new Response('{"outcome":"verified_match"}', { status: 200 });
      return new Response('{}', { status: 200 });
    }) as any;

    render(<LiveThreadLander continueSeed="seed" sessionToken="t3" onOutcome={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/type your reply/i), { target: { value: 'reply' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => screen.getByPlaceholderText(/email/i));
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run whichever command runs client component tests in this repo (check `package.json`).
Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Write the implementation**

```tsx
// client/src/components/LiveThreadLander.tsx
import { useState } from 'react';

type Outcome = 'verified_match' | 'unverified_match' | 'no_match';

interface Props {
  continueSeed: string;
  sessionToken: string;
  onOutcome: (outcome: Outcome, email: string) => void;
}

export default function LiveThreadLander({ continueSeed, sessionToken, onOutcome }: Props) {
  const [reply, setReply] = useState('');
  const [replySent, setReplySent] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSendReply() {
    if (!reply.trim()) return;
    setSending(true);
    await fetch('/api/evelyn-lander/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, reply }),
    });
    setReplySent(reply);
    setSending(false);
  }

  async function handleSubmitEmail() {
    if (!email.trim()) return;
    setSending(true);
    const res = await fetch('/api/evelyn-lander/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setOutcome(data.outcome);
    setSending(false);
    onOutcome(data.outcome, email);
  }

  return (
    <div>
      <div>{continueSeed}</div>

      {replySent && <div>{replySent}</div>}

      {outcome === 'verified_match' && <div>I know you — good. Check your email for a one-tap link back to right here.</div>}
      {outcome === 'unverified_match' && <div>Good — I've got it saved. Check your email: one tap and you're back.</div>}
      {outcome === 'no_match' && <div>Good — I've got it saved. Check your email: one tap and your free minutes go live.</div>}
      {outcome && <div>Sent to {email}. Resend available now.</div>}

      {!replySent && (
        <>
          <input placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} disabled={sending} />
          <button onClick={handleSendReply} disabled={sending}>Send</button>
        </>
      )}

      {replySent && !outcome && (
        <>
          <input placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={sending} />
          <button onClick={handleSubmitEmail} disabled={sending}>Continue</button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run the client test command again.
Expected: PASS (all 3 tests). Note: this is a functional skeleton matching the wireframes' behavior contract, not final visual styling — visual polish (matching the exact chat-bubble look of the real `/reading` UI) is a follow-up pass before shipping live, not blocking for the dark-launch behind the experiment flag.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/LiveThreadLander.tsx client/src/components/LiveThreadLander.test.tsx
git commit -m "feat(live-thread): add LiveThreadLander component"
```

---

### Task 12: Wire `LiveThreadLander` into `EvelynLanderPage.tsx` as a new experiment arm

**Files:**
- Modify: `client/src/pages/EvelynLanderPage.tsx:169` (`useABVariant` call) and the render logic around line 422-433

**Interfaces:**
- Consumes: `LiveThreadLander` (Task 11).
- Produces: nothing new — this is the final integration point.

- [ ] **Step 1: Add the new arm to the experiment**

Change:
```tsx
const mechanic = useABVariant("evelyn_lander", "mechanic", "quiz");
```
to include a `live_thread` arm, and confirm via whatever admin/experiments mechanism this project uses (`/admin/experiments`) that it defaults to 0% traffic — do NOT flip it live as part of this task.

- [ ] **Step 2: Render `LiveThreadLander` for that arm**

```tsx
{mechanic === "live_thread" && (
  <LiveThreadLander
    continueSeed={opener}
    sessionToken={sessionToken}
    onOutcome={(outcome, submittedEmail) => {
      // ⚠ CORRECTED 2026-08-02 (Task 11 review). The original comment here read
      // "no additional navigation needed since LiveThreadLander already renders
      // its own confirmation copy". That is TRUE for verified_match and
      // unverified_match — and FALSE for no_match, which is the majority of a
      // cold email list.
      //
      // On no_match the component's terminal state renders a static line
      // ("We'll email you a one-click link") with no button and no link, so a
      // brand-new reader is STRANDED. Task 12 MUST navigate for that outcome.
      //
      // Destination: reuse the one handleCta's register branch already builds
      // (EvelynLanderPage.tsx:503-521) —
      //   /login?mode=signup&email=<submittedEmail>&persona=evelyn-cross
      //     &source=evelyn-lander&landerSessionToken=<sessionToken>
      // Passing landerSessionToken is what carries the parked reply and the
      // Live Thread grant eligibility through registration.
    }}
  />
)}
```

- [ ] **Step 3: Manual verification (dev environment, dark)**

Run: `npm run dev`, visit `/evelyn?campaign=<a-real-test-campaign>` with the experiment arm manually forced to `live_thread` (via whatever query-param or admin override this project's `useABVariant` supports — check its implementation for a force-arm mechanism before assuming one exists).
Expected: Frame 1 renders with the real `continueSeed` for that campaign; typing a reply and submitting an email produces the correct Frame 2/2b/2c confirmation.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/EvelynLanderPage.tsx
git commit -m "feat(live-thread): wire LiveThreadLander as a new dark experiment arm"
```

---

### Task 13: `render-aweber.mjs` pipeline extension

**Files:**
- Modify: `docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs`
- Test: add a smoke-test invocation (this pipeline has no existing automated test — add one, following the pattern of piping a fixture `.md` file through and asserting on `index.json` + the DB row)

**Interfaces:**
- Consumes: `mintEmailLinkCode` (Task 2).
- Produces: `email_link_codes` rows for real sends — the terminal step of the content-authoring chain.

- [ ] **Step 1: Add new frontmatter fields to the parser**

In `parse()`, add extraction for `continueSeed`, `openLoop`, `readingRecap` alongside the existing `subject`/`preheader`/`slug`/`ctaLabel` fields — same regex-against-frontmatter-block pattern already used for those:

```js
const continueSeed = pick(/\*\*Continue Seed:\*\*\s*(.+)/);
const openLoop = pick(/\*\*Open Loop:\*\*\s*(.+)/);
const readingRecap = pick(/\*\*Reading Recap:\*\*\s*(.+)/);
```

Add matching frontmatter lines to `docs/aweber/evelyn-reframe-deck/sends/cycle-1/04-serious.md` (and future sends) — for `04-serious.md` specifically, since it already has a corresponding entry in `emailReadingBriefs.ts`, the values can be lifted directly from that existing brief (`continueSeed`, `openLoop`, `readingRecap` fields already written there) rather than composed fresh.

- [ ] **Step 2: Mint the code and change the CTA URL**

After parsing a send, before writing the HTML file:

```js
import { mintEmailLinkCode } from '../../../../server/lib/emailLinkCodes.ts'; // adjust relative path to actual location

const code = await mintEmailLinkCode({
  personaSlug: 'evelyn-cross',
  campaign: slug,
  continueSeed,
  openLoop,
  readingRecap,
});
```

Change `ctaUrl(slug)` to build `https://www.theseerwithin.com/e/${code}?email={!email}` instead of the current `?campaign=${slug}` form.

- [ ] **Step 3: Manual verification**

The script imports a `.ts` module, so it runs under `tsx`, not plain `node`. From
`docs/aweber/evelyn-reframe-deck/scripts/`:

```bash
npx tsx --env-file=../../../../.env.test render-aweber.mjs ../sends/cycle-1
```

Expected: rendered HTML's CTA link points to `/e/<code>`; querying `email_link_codes` shows a matching row with the correct `continueSeed`/`openLoop`/`readingRecap`.

**Never render against production during development.** A real send is minted with
`--env-file=../../../../.env … --mint-production`, only after the human "go" — see
`docs/aweber/evelyn-reframe-deck/scripts/README.md`.

- [ ] **Step 4: Commit**

```bash
git add docs/aweber/evelyn-reframe-deck/scripts/render-aweber.mjs docs/aweber/evelyn-reframe-deck/sends/cycle-1/04-serious.md
git commit -m "feat(live-thread): render-aweber.mjs mints /e/:code links with full content"
```

---

## Success Criteria

Tied directly to the spec's stated Goal (four numbered points) and the operator's original complaint (poor email→lander→activation→purchase conversion):

1. **Continuity reaches the lander, measurably.** For sessions arriving via a resolved `/e/:code` (Evelyn, `live_thread` arm), the lander's opening bubble matches that campaign's authored `continueSeed` — verified by the Task 3/11 tests, and confirmed live by comparing `email_link_codes.campaign` against the resolved lander session's `campaign` for a sample of real dark-launch traffic.
2. **No reply is ever lost.** Zero instances, across a 2-week dark-launch sample, of a `chat_messages` first-row missing where `evelynLanderSessions.pendingReply` was non-null and the account subsequently verified — this is the core promise ("never loses what the reader typed") and should be checked directly against production data before flipping the experiment live, not just inferred from passing tests.
3. **Already-logged-in readers get zero extra friction.** For sessions where `/start` resolves `v2_active`, time from `/e/:code` click to first message in `/reading` should be dominated by network/redirect latency only — no lander UI paint should be observable in a real browser trace (confirmed manually in Task 12, Step 3, and again via the Playwright spec below).
4. **Activation lift, once live.** The actual success metric the operator cares about: for the `live_thread` arm vs. the existing `quiz` arm (via the existing experiment framework's stats), a measurable lift in lander→first-chat-message activation rate, with the `quiz` arm as the live control. This can only be measured after the experiment is flipped live at some non-zero traffic split — set that split and measurement window with the operator before flipping, it's explicitly not part of this plan's scope (per "ship dark").
5. **No regression on the existing anonymous paths.** Every pre-existing test in `evelynLander.test.ts` and `auth.test.ts` still passes — the `quiz` arm, magic-link re-engagement (Path B), and V1-migration segments are untouched by this work.

## Eval Strategy

Following the `persona-iterate` pattern (frozen cases + reproduce/prove, not a numeric pass bar) — this feature doesn't change Evelyn's *prompt*, so the existing `improve-v2/eval/cases.json` harness applies with new cases targeting the reply-attachment behavior specifically, since that's the one place this plan touches actual conversational output:

- [ ] Add a new frozen case to `improve-v2/eval/cases.json` modeled on the existing `email-arrival` case (id `email-arrival`, quoted in full during research — this plan's Task 10 makes that exact scenario work end-to-end for the first time, since today the reply doesn't exist as a real message before the greeting fires). New case:
  ```json
  {
    "id": "live-thread-reply-continuation",
    "persona": "evelyn-cross",
    "firstName": "Priya",
    "title": "Reader's Live Thread disclosure (444 example, 2026-08-01 Live Thread plan) must be answered directly, not re-asked",
    "tests": [
      "does not ask the reader to repeat what they already said in their first message",
      "responds specifically to the content of that first message, not a generic opener",
      "never fabricates details beyond what the reader actually wrote"
    ],
    "turns": [
      "444. Every day."
    ]
  }
  ```
- [ ] Run `npx tsx scripts/eval-chat.ts --label 2026-08-01-live-thread-pre --case live-thread-reply-continuation --experiment persona_prompt_evelyn_2026 --variant B` against the CURRENT (pre-Task-10) behavior to capture a baseline — expect it to fail the first `tests[]` criterion, since today's flow can't actually produce this scenario (no reply exists before the greeting).
- [ ] After Task 10 ships, run the same command with `--label 2026-08-01-live-thread-post` and confirm all 3 `tests[]` criteria pass.
- [ ] Do not edit this case after baseline capture — per the persona-iterate hard rule, only append new cases in future rounds.
- [ ] Run the existing full `improve-v2/eval/cases.json` suite once (not just the new case) to confirm no frozen case regresses — this feature shouldn't touch Evelyn's system prompt at all, so a regression here would indicate an unintended side effect.

## Playwright Coverage

New file `tests/live-thread-evelyn.spec.ts`, following `fb-palm-commitment-gate.spec.ts`'s house style (a `harness(page)` helper stubbing network calls for determinism, `data-testid` locators, a `beforeAll` localhost-only safety gate):

- [ ] **Anonymous happy path (no account):** navigate to `/e/<test-code>` (seeded via a test-only mint call in `beforeAll`) with the `live_thread` arm forced on → assert Frame 1 shows the seeded `continueSeed` text → type a reply, assert it renders as a sent bubble → submit a new email → assert Frame 2b copy appears → assert (via a stubbed `/check-email` response) the correct outcome-specific confirmation renders.
- [ ] **Existing verified account:** same flow, but stub `/check-email` to return `verified_match` → assert Frame 2's "I know you" copy renders, not Frame 2b's.
- [ ] **Already-logged-in reader:** set an auth token in `localStorage` before navigating to `/e/<test-code>` → assert the lander UI never paints (no Frame 1 visible) and the page ends on `/reading` — this is the harness's hardest case to get deterministic, since it depends on Task 5's await-before-redirect fix; use `expect.poll` on the final URL rather than a fixed `waitForTimeout`.
- [ ] **Unresolvable code:** navigate to `/e/does-not-exist` → assert redirect to `/personas`.
- [ ] **Reply survives a real signup round-trip (this is the one true end-to-end test, network-real for the auth parts):** type a reply, submit a brand-new email, extract the verification link from a stubbed/captured email send, visit it, assert the reply appears as the first message when `/reading` loads.
- [ ] Add all five as checklist entries to `docs/test-ideas.md` under a new `## Live Thread (Evelyn)` section, matching the file's existing `### <sub-topic>` → `- [ ]` convention, even before the spec file above is fully written out — the convention is to record the intent immediately per this project's stated rule ("add to this file whenever a new feature is implemented").

---

## Self-Review

**Spec coverage:** Frame 1/1.5 (Tasks 6, 11), Frame 2/2b/2c (Tasks 7, 11), Frame 3 (Task 10), the already-authenticated tier (Tasks 4-5), the short-link redirector (Tasks 2-3), pipeline integration (Task 13), the differentiated grant (Tasks 8-9) — all covered. Explicitly NOT covered by this plan, per its stated scope: Aiden/Luna pipeline integration, the exact free-minute number (still 10 as a placeholder, flagged inline at Task 9), rate-limit threshold tuning beyond the initial values chosen, and visual polish of `LiveThreadLander` beyond a functional skeleton.

**Placeholder scan:** No TBD/TODO left unresolved except the deliberately-flagged "10 minutes, operator may revise" (matches the spec's own open question, not a plan gap) and Task 0-steps that ask the implementer to `grep` for an exact existing helper before wiring it in — these are concrete, actionable discovery steps, not vague "handle appropriately" placeholders.

**Type consistency:** `ResolvedEmailLink` (Task 2) is used identically in Task 3 and Task 13. `sessionToken` is the same string type/field name from `EvelynLanderPage.tsx`'s existing client-generated value through Tasks 6, 7, 10, 11 — no renaming across tasks. `Outcome` union (`verified_match`/`unverified_match`/`no_match`) is defined once in Task 11 and matches Task 7's response shape exactly.
