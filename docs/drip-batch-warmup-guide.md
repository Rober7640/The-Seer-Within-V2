# Drip Campaign — Batch Warm-Up System Guide

## Problem

The current drip campaign system sends Email #1 to ALL eligible users at once when the admin clicks "Send Campaign". With 6K+ migrated users and a cold email domain, this will destroy deliverability. We need to send in controlled batches.

## Current State

### What exists:
- Admin page: `Email Drip — Migrated V1` at `/admin/email-drip/migrated-v1`
- "Send Migration Emails" button triggers ALL eligible users at once
- 100ms delay between sends (rate limiting, not batch limiting)
- Cron every 6 hours handles Email #2 and #3 (24hr gap between each)
- Skip logic: users who log into v2 (`lastLoginAt` set) are skipped for remaining emails
- Tracking: sent/opened/clicked per email, with Resend webhook updates

### What's missing:
- No batch size limit
- No auto-scheduling of next batch
- No batch progress tracking in admin UI
- No pause/resume control
- No "remaining users" count

## Desired Behavior

### Flow:
1. Admin opens Email Drip page, sets **batch size** (e.g. 500)
2. Admin clicks **"Start Campaign"** once — sends first batch (500 users get Email #1)
3. System records the trigger time (e.g. 5:00 PM)
4. **24 hours later** (5:00 PM next day), system automatically:
   - Sends Email #2 to Batch 1 users (who haven't joined v2)
   - Sends Email #1 to next 500 users (Batch 2)
5. This rolling pattern continues daily until all users are processed
6. Admin can **pause/resume** or **change batch size** at any time

### Rolling Schedule Example (batch size = 500, 6K users = 12 batches):

```
Day 1  (5 PM): Batch 1 → Email #1  (500 users)
Day 2  (5 PM): Batch 1 → Email #2  |  Batch 2 → Email #1
Day 3  (5 PM): Batch 1 → Email #3  |  Batch 2 → Email #2  |  Batch 3 → Email #1
Day 4  (5 PM): Batch 1 done        |  Batch 2 → Email #3  |  Batch 3 → Email #2  |  Batch 4 → Email #1
...
Day 14 (5 PM): All 12 batches fully processed
```

### Key Rules:
- Each batch runs exactly **24 hours** after the previous one (not on fixed cron)
- Email #2 sends **24 hours after** that user's Email #1
- Email #3 sends **24 hours after** that user's Email #2
- If a user logs into v2 after Email #1 or #2, skip remaining emails (already working)
- Batch size is adjustable — start at 500, increase to 1000+ as domain warms up

## Implementation Plan

### 1. Database Changes

Add to `system_config` or a new table:

```
drip_batch_config:
  batchSize: number (default 500)
  status: 'idle' | 'running' | 'paused'
  startedAt: timestamp (when admin first triggered)
  lastBatchAt: timestamp (when last batch was sent)
  nextBatchAt: timestamp (when next batch should fire)
  currentBatchNumber: number
  totalBatches: number (calculated: ceil(eligible / batchSize))
```

Add to `migration_drip_emails` table:
```
  batchNumber: integer (which batch this user was in)
```

### 2. Backend Changes

**File: `server/lib/migrationDripProcessor.ts`**

Modify `sendMigrationEmail1()`:
- Accept `batchSize` parameter
- LIMIT query to `batchSize` users who haven't received Email #1 yet
- Tag each email with `batchNumber`
- After sending, update `lastBatchAt` and calculate `nextBatchAt` (+24 hours)

New function: `processNextBatch()`:
- Check if `nextBatchAt <= now` and `status === 'running'`
- If yes, call `sendMigrationEmail1(batchSize)`
- If no more eligible users, set status to `'idle'` (campaign complete)

**File: `server/lib/cronJobs.ts`**

Change or add a cron that runs every 15–30 minutes:
- Checks if `nextBatchAt` has passed
- If yes, runs `processNextBatch()` (sends next Email #1 batch)
- Also runs `processMigrationDripQueue()` (existing Email #2/#3 logic)
- This means batch timing is accurate to within 15–30 min of the target time

**File: `server/routes/admin/emailDrip.ts`**

New/modified endpoints:
- `POST /api/admin/email-drip/start-campaign` — Sets status='running', sends first batch, records startedAt and nextBatchAt
- `POST /api/admin/email-drip/pause-campaign` — Sets status='paused', clears nextBatchAt
- `POST /api/admin/email-drip/resume-campaign` — Sets status='running', recalculates nextBatchAt
- `PATCH /api/admin/email-drip/batch-size` — Updates batch size (takes effect next batch)
- `GET /api/admin/email-drip/batch-status` — Returns current batch info for admin UI

### 3. Admin UI Changes

**File: `client/src/pages/admin/EmailDripMigratedV1.tsx`**

#### New: Batch Progress Section (above stats)

```
┌─────────────────────────────────────────────────────────┐
│  Campaign Status: RUNNING          [Pause] [Change Size]│
│                                                         │
│  ████████████░░░░░░░░░░░░  Batch 4 of 12               │
│                                                         │
│  Batch size: 500    │  Sent: 2,000  │  Remaining: 4,500 │
│  Started: Mar 28    │  Next batch: Mar 31, 5:00 PM      │
└─────────────────────────────────────────────────────────┘
```

#### Modified: Stats Row
Add two new cards:
- **Remaining** — eligible users who haven't received Email #1 yet (totalEligible - email1Sent)
- **Batches** — "4 / 12" (completed / total)

#### Modified: "Send Migration Emails" Button
Replace with:
- **"Start Campaign"** button (when idle) — opens dialog to set batch size, then starts
- **"Pause"** button (when running)
- **"Resume"** button (when paused)

#### New: Batch Size Input
- Number input with current batch size
- "Update" button to change (takes effect next batch)
- Show note: "Increase gradually as domain reputation builds (500 → 1000 → 2000)"

### 4. Warm-Up Schedule Recommendation

| Days | Batch Size | Daily Total Emails* |
|------|-----------|-------------------|
| 1–3 | 500 | 500 |
| 4–7 | 500 | ~1,000 (Email #1 + #2s) |
| Week 2 | 1,000 | ~2,000 |
| Week 3+ | 2,000 | ~4,000 |

*Includes Email #2 and #3 sends for previous batches

## Files to Modify

| File | Change |
|------|--------|
| `shared/schema.ts` | Add `batchNumber` to `migrationDripEmails`, add batch config to `systemConfig` or new table |
| `server/lib/migrationDripProcessor.ts` | Add batch limit, batch number tagging, `processNextBatch()` |
| `server/lib/cronJobs.ts` | Add batch check cron (every 15-30 min) |
| `server/routes/admin/emailDrip.ts` | New endpoints: start/pause/resume/batch-size/batch-status |
| `client/src/pages/admin/EmailDripMigratedV1.tsx` | Batch progress UI, pause/resume, batch size control |

## Testing Checklist

- [ ] Admin can set batch size and start campaign
- [ ] First batch sends correct number of Email #1s
- [ ] Next batch auto-triggers ~24 hours later
- [ ] Email #2 sends 24 hours after each user's Email #1
- [ ] Email #3 sends 24 hours after each user's Email #2
- [ ] Users who log into v2 are skipped (existing logic)
- [ ] Admin can pause campaign — no more batches fire
- [ ] Admin can resume — next batch fires 24 hours after resume
- [ ] Admin can change batch size mid-campaign
- [ ] Admin UI shows: batch progress, remaining count, next batch time
- [ ] Campaign auto-completes when all users are processed
- [ ] Stats (sent/opened/clicked/loggedIn) continue working correctly
