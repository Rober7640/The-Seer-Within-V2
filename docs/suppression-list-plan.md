# Email Suppression Table + Partner Unsubscribe Link — Implementation Plan

**Date:** 2026-04-23
**Context:** GPBL (Jade / opta-mkt91.com) asked for a suppression list + unsubscribe link for emails they send on our behalf. Physical address is already in-hand. Scope is deliberately minimal — build only what's necessary, export the list manually when needed.
**Status:** Draft — pending approval before implementation

---

## 1. Goal (minimal)

1. New database table that stores every unsubscribed email from any source.
2. Public unsubscribe URL that GPBL can embed in their emails — clicking it inserts the email into the table.
3. Existing unsubscribe flows (our own emails + bounces + spam complaints) also write to this table.
4. When a partner asks for the list, we export the table to CSV manually via Supabase / psql.

No admin endpoints, no export API, no scheduled jobs, no signer utilities. Keep it lean.

---

## 2. What's being built

### A. New table `email_suppression`

Single source of truth for all unsubscribes.

```typescript
// shared/schema.ts
export const emailSuppression = pgTable("email_suppression", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),   // lowercased + trimmed before insert
  reason: text("reason").notNull(),
  // 'user_unsubscribed' | 'bounced' | 'spam_complaint' | 'partner_unsub'
  source: text("source").notNull(),
  // 'theseerwithin' | 'gpbl' | 'resend' | 'aweber_import' | 'other'
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  suppressedAt: timestamp("suppressed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_email_suppression_suppressed_at").on(table.suppressedAt),
]);
```

Migration: `migrations/012_email_suppression.sql`

```sql
CREATE TABLE IF NOT EXISTS email_suppression (
  id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL UNIQUE,
  reason         TEXT NOT NULL,
  source         TEXT NOT NULL,
  user_id        VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  suppressed_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_suppression_suppressed_at ON email_suppression(suppressed_at);
```

Plus `012_email_suppression_down.sql` to drop the table.

### B. Public unsubscribe endpoint with confirmation button

**Single template URL** Jade embeds in GPBL's emails:
```
https://www.theseerwithin.com/unsubscribe?email={EMAIL}&src=gpbl
```

**Two-step unsub flow** (confirmation button — not auto-unsub):

1. **`GET /unsubscribe?email=…&src=…`** → renders a confirmation page. Does NOT write to DB. Shows:
   > *"You are about to unsubscribe `alice@example.com` from The Seer Within emails."*
   > **[Confirm Unsubscribe]** button

2. **`POST /unsubscribe`** (from that button) → writes to `email_suppression` table, shows success page.

**Why this design (not auto-unsub on GET):**
- Gmail/Outlook/Apple Mail sometimes pre-fetch links to generate previews (link-scanners, "SafeLinks") — a plain `GET` would falsely unsub everyone who just received the email
- Prevents drive-by abuse where someone guesses URLs programmatically — they'd need to click the button, not just hit the URL
- Better UX — prevents accidental unsubs from fat-finger / preview clicks
- No HMAC needed, no signing script, single template URL for Jade

```typescript
// server/routes/unsubscribe.ts  (new file)
import { Router, Request, Response } from 'express';
import { db } from '../db';
import { emailSuppression } from '@shared/schema';
import { logger } from '../lib/logger';

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Step 1: Confirmation page (no DB write)
router.get('/unsubscribe', async (req: Request, res: Response) => {
  const email = (req.query.email as string || '').toLowerCase().trim();
  const src = (req.query.src as string) || 'partner_unsub';

  if (!email || !isValidEmail(email)) {
    return res.status(400).send(renderInvalidPage());
  }

  return res.status(200).send(renderConfirmPage(email, src));
});

// Step 2: User clicks Confirm button — actually unsubscribe
router.post('/unsubscribe', async (req: Request, res: Response) => {
  const email = ((req.body?.email || req.query.email) as string || '').toLowerCase().trim();
  const src = ((req.body?.src || req.query.src) as string) || 'partner_unsub';

  if (!email || !isValidEmail(email)) {
    return res.status(400).send(renderInvalidPage());
  }

  await db.insert(emailSuppression).values({
    email,
    reason: 'user_unsubscribed',
    source: src,
  }).onConflictDoNothing();

  logger.info(`[suppression] Unsubscribed: ${email} (source=${src})`);
  return res.status(200).send(renderSuccessPage(email));
});

export default router;
```

**Confirmation page** — simple HTML form posting back to `/unsubscribe`:

```html
<!-- rendered by renderConfirmPage(email, src) -->
<form method="POST" action="/unsubscribe">
  <input type="hidden" name="email" value="{{email}}">
  <input type="hidden" name="src" value="{{src}}">
  <p>You are about to unsubscribe <strong>{{email}}</strong> from The Seer Within emails.</p>
  <button type="submit">Confirm Unsubscribe</button>
</form>
```

Style to match existing `unsubscribePageHtml()` in `server/routes/webhooks.ts:460` (cosmic/purple theme).

Mount at root in `server/routes.ts`:
```typescript
import unsubscribeRouter from './routes/unsubscribe';
app.use('/', unsubscribeRouter);
```

### C. Update existing `autoUnsubscribe()` — `server/routes/webhooks.ts:428`

Today it only updates `userFollowUpPreferences`. Add a write to the new central table so our own unsubs (token-link clicks, bounces, spam complaints) also flow in:

```typescript
async function autoUnsubscribe(userId: string, reason: string): Promise<void> {
  // existing userFollowUpPreferences logic stays unchanged

  // NEW: also write to central suppression
  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user[0]?.email) {
    await db.insert(emailSuppression).values({
      email: user[0].email.toLowerCase().trim(),
      reason,                     // 'user_unsubscribed' | 'bounced' | 'spam_complaint'
      source: 'theseerwithin',
      userId,
    }).onConflictDoNothing();
  }

  logger.info(`User ${userId} unsubscribed (reason: ${reason})`);
}
```

This covers, without any new code:
- Token-based clicks on our own follow-up / top-up / drip / aiden emails
- Resend bounces
- Resend spam complaints

---

## 3. Manual export (no code needed)

When Jade asks for the list, run in Supabase SQL editor or psql:

```sql
SELECT email FROM email_suppression ORDER BY suppressed_at;
```

Click "Download CSV" in Supabase dashboard, or pipe to file via psql:

```bash
psql $DATABASE_URL -c "\COPY (SELECT email FROM email_suppression ORDER BY suppressed_at) TO 'suppression-2026-04-23.csv' CSV HEADER"
```

Email CSV to Jade. Done. No endpoint, no script.

---

## 4. What Jade puts in her emails

Single template URL — her ESP fills in `{EMAIL}` at send time:

```
https://www.theseerwithin.com/unsubscribe?email={EMAIL}&src=gpbl
```

`{EMAIL}` = GPBL's ESP merge-field for the recipient's email (e.g., `{{recipient.email}}` in Mailchimp, `%%emailaddr%%` in SFMC, etc. — Jade knows her ESP's syntax).

`src=gpbl` is for tracking which partner's list the unsub came from — ends up in the `source` column, so you can tell apart GPBL unsubs vs other partners' unsubs later.

When the recipient clicks, they land on our confirmation page and must click "Confirm Unsubscribe" to actually unsubscribe — this prevents email link-prefetchers (Gmail/Outlook SafeLinks) from accidentally unsubbing everyone who just received the email.

---

## 5. Environment variables

**None.** No new env vars needed for this minimal version.

---

## 6. Implementation steps (ordered)

1. Add `emailSuppression` to `shared/schema.ts`
2. Create `migrations/012_email_suppression.sql` + down migration
3. `npm run db:push` → verify in Supabase
4. Create `server/routes/unsubscribe.ts` — GET (confirmation page), POST (actual unsubscribe) + branded HTML renderers (copy style from existing `unsubscribePageHtml()` in `server/routes/webhooks.ts:460`)
5. Mount in `server/routes.ts`: `app.use('/', unsubscribeRouter)`
6. Update `autoUnsubscribe()` in `server/routes/webhooks.ts:428` to also write to central table
7. Test locally: GET `?email=test@x.com` → confirmation page (NO DB row yet). Click button → POST → DB row appears
8. Test locally: unsubscribe via our existing token flow → row appears in `email_suppression` via `autoUnsubscribe()`
9. Deploy to `rober/Production`
10. Test on production: single test URL end-to-end (page + button), single test token unsub
11. Send Jade the reply (see §8)

---

## 7. Testing

**Manual checks:**

- [ ] `GET /unsubscribe?email=test@example.com` → 200, confirmation page rendered, **NO DB row yet**
- [ ] Click "Confirm Unsubscribe" button → POST fires → DB row appears with `source='partner_unsub'` or `src=gpbl`
- [ ] Hit GET multiple times without clicking button → still NO DB row (link-prefetcher simulation)
- [ ] Click "Confirm" twice → second click no-ops (unique constraint), still shows success
- [ ] `GET /unsubscribe` with no email → 400, no DB row
- [ ] Invalid email format (`foo`) → 400, no DB row
- [ ] `POST /unsubscribe` with no email → 400, no DB row
- [ ] Click unsub link in our own follow-up email (existing token-based flow) → DB row appears with `source='theseerwithin'`
- [ ] Trigger a Resend bounce webhook → DB row appears with `reason='bounced'`
- [ ] `SELECT email FROM email_suppression` returns all of the above

**Add to `docs/test-ideas.md`:**

```
### Suppression table
- [ ] GET /unsubscribe shows confirmation page, does NOT write to DB
- [ ] POST /unsubscribe (button click) writes to email_suppression
- [ ] Link-prefetcher simulation (repeated GET) does not create suppression rows
- [ ] Own-email token unsub writes to email_suppression (via autoUnsubscribe)
- [ ] Bounce writes to email_suppression
- [ ] Spam complaint writes to email_suppression
- [ ] Duplicate unsub (same email confirmed twice) is idempotent (no error)
```

---

## 8. Jade reply template

> Hi Jade,
>
> Here's everything for CAN-SPAM compliance:
>
> **1. Suppression list** — I'll send this as a CSV when you're ready to mail. Let me know when you need the first export, and how often you want refreshes (weekly / before each campaign).
>
> **2. Unsubscribe link** — use this in your email footers:
> ```
> https://www.theseerwithin.com/unsubscribe?email={EMAIL}&src=gpbl
> ```
> Replace `{EMAIL}` with your ESP's recipient-email merge tag. Unsubs land in our central suppression list immediately and will be in your next refresh.
>
> **3. Physical postal address** — include in every email footer:
> ```
> Cosmo Numerology Pte Ltd
> 45B Temple St, S058590, Singapore
> ```
> Let me know if your US sources specifically require a US-based postal address.
>
> Cheers

---

## 9. Explicitly out of scope

- Admin export endpoint (CSV streaming API) — manual Supabase export is enough
- Admin bulk-add endpoint
- Scheduled suppression email to partners
- HMAC-signed unsub URLs — rejected because it would require pre-signing each email per send (GPBL wants a single template URL, not a pre-signed list). Confirmation button covers most abuse concerns without the operational overhead.
- Signer script / utility (made obsolete by Option 2)
- AWeber unsub backfill / seed script (boss can manually import later if needed via `INSERT ... ON CONFLICT DO NOTHING`)
- Send-path suppression check (our own emails going to suppressed addresses) — separate concern, can be added later if bounces stay noisy
- Admin UI at `/admin/suppression`

---

## 10. Estimated effort

- Schema + migration: 30 min
- Public unsub route (GET confirm page + POST handler) + 3 branded HTML renderers: 1.5 hr
- `autoUnsubscribe()` tweak: 15 min
- Testing: 30 min
- Deploy + Jade reply: 15 min

**Total: ~3 hours.**
