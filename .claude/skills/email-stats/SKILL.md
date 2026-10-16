---
name: email-stats
description: Use when asked for Evelyn email/broadcast performance — clicks, opens-to-chat, buyers, or revenue for the story/daily emails or any short-link campaign; or when someone says AWeber shows 0 clicks, or wants the real numbers per campaign for a window (last week, last N days).
---

# Email Stats (Evelyn short-link campaigns)

## Overview
Real click → chat → buyer → revenue funnel per email campaign, straight from our own production DB. **AWeber's "Clicked" column is always 0 for these emails** (custom HTML + our `/e/<code>` short links) — so AWeber is NOT the source. Clicks are logged in `evelyn_lander_sessions` (a row per `/e/` arrival, tagged with the campaign); chats in `chat_sessions`; purchases in `credit_purchases`.

## Run it
From the repo root:
```bash
node .claude/skills/email-stats/stats.mjs --days 7           # story emails, last 7 days
node .claude/skills/email-stats/stats.mjs --days 30 --prefix ""   # ALL campaigns, 30 days
node .claude/skills/email-stats/stats.mjs --json             # raw JSON (for building a report/artifact)
```
Prints clicks · signed-in · chatted · buyers · revenue per campaign, plus totals. SELECT-only (sets `default_transaction_read_only`).

## Prod connection (required — read this if it returns 0 rows)
The script needs the **current production** DB. It looks for, in order: `EMAIL_STATS_DATABASE_URL` (env or `.env`), then any `DATABASE_URL` containing `supabase.com` in `.env`.

⚠ The plain `.env` Supabase line on dev machines has been **stale** (an old project with no story data) — if the run prints "No matching campaigns / likely WRONG DB", set the live read-only connection:
```
# .env  (or export in the shell)
EMAIL_STATS_DATABASE_URL=postgresql://<readonly-user>:<pw>@<current-prod-host>.pooler.supabase.com:5432/postgres
```
Get it from Railway (the app's `DATABASE_URL`) or the Supabase dashboard of the **current** project. A read-only role is ideal.

## No DB access? SQL fallback
If no prod connection is available, hand the operator these queries to run in the Supabase SQL editor and paste the result back (keep lines SHORT — their paste tool truncates long lines):
- **Clicks:** `SELECT campaign, COUNT(*) AS clicks, COUNT(DISTINCT resolved_user_id) AS signed_in FROM evelyn_lander_sessions WHERE started_at >= now() - interval '7 days' AND campaign IS NOT NULL GROUP BY campaign ORDER BY clicks DESC;`
- **Funnel + revenue:** the CTE query in `stats.mjs` (`clk` → `cht` → `buy`), same logic.

## Reading the numbers
- **clicks** = `/e/` short-link arrivals on `/evelyn` (page loads; a double-click = 2).
- **chatted / buyers / revenue** = **signed-in clickers only** (anonymous arrivals can't be traced to a purchase).
- **Attribution is directional:** a reader who clicked several emails is counted under each — good for "which email drove what", not an exact per-email revenue split.
- Revenue = completed `credit_purchases` after the click, in USD.

## Common uses
- "How did last week's Evelyn emails do?" → `--days 7`
- "Clicks for the apple-peel email?" → run, read the `story-02-apple-peel` row.
- Build a shareable report for Joel/Pauline → `--json`, then format into an artifact.
