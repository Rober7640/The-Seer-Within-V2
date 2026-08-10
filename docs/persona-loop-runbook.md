# Persona Loop — Runbook

How to run `/persona-audit` and `/persona-iterate` on your own machine.

**The one rule that matters:** the two skills need **opposite** databases. Audit reads production.
Iterate writes, so it must never see production. You flip `.env` between them.

---

## The daily sequence

| # | Do this | Then run |
|---|---|---|
| 1 | **Enable** the live (production) `DATABASE_URL` | `/persona-audit` |
| 2 | **Disable** live, **enable** localhost `DATABASE_URL` | `/persona-iterate --persona <slug>` |
| 3 | **Leave it on localhost** when you're done | — |

Step 3 is not optional. The danger is never the audit itself — it's forgetting to flip back and
then running something that writes.

---

## Step 0 — One-time setup on a new machine

1. `npm install`
2. Create `.env` with **three** `DATABASE_URL` lines, two of them commented out. Ask the team lead
   for the values — they live in the **Railway Variables panel**, not in the repo.

   ```
   #DATABASE_URL=postgresql://...@aws-1-us-east-2.pooler.supabase.com:5432/postgres   <- production
   DATABASE_URL=postgresql://...@localhost:5432/seerwithin                            <- localhost
   #DATABASE_URL=postgresql://...@aws-0-us-east-2.pooler.supabase.com:5432/postgres   <- dev
   ```

   🔴 Production must end in **`:5432`**. Never `6543` — that port intermittently fails to see
   tables and voids the billing guard.

   🔴 Production and dev differ by **one character**: `aws-**1**` is production, `aws-**0**` is dev.
   Read it twice.

3. Add `ANTHROPIC_API_KEY=...` (needed by `/persona-iterate` only).
4. Have **local Postgres running on 5432** with the schema pushed (needed by `/persona-iterate` only).
5. Make sure `RUN_BACKGROUND_JOBS` is **commented out or absent**. See the golden rules below.

---

## Step 1 — Run the audit (production, read-only)

1. Edit `.env`: **comment out localhost**, **uncomment production**.
2. Check exactly one is active:
   ```bash
   grep -n "^DATABASE_URL" .env
   ```
   You should see **one** line, containing `aws-1-us-east-2`.
3. Run the skill:
   ```
   /persona-audit
   ```
   Or the two commands by hand:
   ```bash
   npx tsx scripts/pull-buyer-transcripts.ts --hours 24 --out improve-v2/transcripts/monitor/daily-YYYY-MM-DD
   npx tsx scripts/analyze-buyer-pull.ts improve-v2/transcripts/monitor/daily-YYYY-MM-DD "YYYY-MM-DD"
   ```
4. In `daily-YYYY-MM-DD/00-run-meta.json`, confirm the canary reads **`rejected (SQLSTATE 25006)`**.
   That is the database proving it refused a test write — it's how you know the pull was genuinely
   read-only. **Anything else: stop and escalate.**
5. Read the per-persona table. It tells you which persona is leaking money.
6. **Flip back to localhost now**, before you do anything else.

The audit only ever reads. It cannot change production.

---

## Step 2 — Run the fix loop (localhost, writes)

1. Edit `.env`: **comment out production**, **uncomment localhost**.
2. Check:
   ```bash
   grep -n "^DATABASE_URL" .env
   ```
   You should see **one** line, containing `localhost`.
3. Pick the worst persona from the audit's scoreboard and run:
   ```
   /persona-iterate --persona aiden-powers
   ```
   Valid slugs: `evelyn-cross` · `aiden-powers` · `luna-voss` · `marcus-stone` · `maren-soleil` · `nova-sharma`
4. **One persona per run.** A prompt change has to be proven before-and-after. Six changes shipped
   the same day means you can't tell which one moved the numbers.
5. The skill never ships to production. It hands you a tested change; a human ships it.

---

## Golden rules

**🔴 Never have production `DATABASE_URL` and `RUN_BACKGROUND_JOBS=true` active at the same time.**
That combination turns your laptop into a second billing meter charging live customers. It is
exactly what drained real wallets in August 2026. Either one alone is harmless.

**🔴 While production is the active database, never run:**

| Command | Why |
|---|---|
| `npm run dev` | Per-message billing isn't gated — one chat debits a real customer's wallet |
| `npm run db:push` | Alters the live schema |
| `npm run seed` | Overwrites Aiden's and Luna's live prompts with old unguarded versions |
| `/persona-iterate` | It writes |
| `/v1-funnel-audit` | Boots the app and walks the funnel as a user |

**✅ Safe with production active:** `/persona-audit` and `/v1-funnel-live-audit`. Both are
read-only and abort if a test write ever succeeds.

**🔴 Never run `npm run seed` at any point during this work**, on any database.

---

## Troubleshooting

**`ABORT: DATABASE_URL points at localhost — this monitor is for production data.`**
You're on step 1 with localhost still active. Flip to production.

**`REFUSING: DATABASE_URL is not localhost.`**
You're on step 2 with production still active. Flip to localhost. This is the wire script's
safety guard doing its job.

**`password authentication failed for user "postgres"`**
Your production password is stale. Get the current one from the **Railway Variables panel**.

**`relation ... does not exist` at random**
You're on port `6543`. Change it to `5432`.

**A command hangs forever and never exits**
If it's a test that touches the database, it's missing `await pool.end()` in its teardown.

---

## What each skill does, in one line

- **`/persona-audit`** — reads yesterday's real buyers and their chats, and tells you **which
  persona is leaking money and how**. Finds problems. Never fixes.
- **`/persona-iterate --persona <slug>`** — takes one problem, changes that persona's prompt, and
  proves the change helped before you ship it. Fixes one persona at a time.

Both work for all six personas. Iterate figures out on its own where each persona's prompt lives
(Evelyn's is inside an A/B experiment, everyone else's is on the persona row) — you don't need
to know which.
