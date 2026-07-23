# Reframe Deck — pipeline scripts

Prototype tooling that generates, checks, renders, and schedules reframe-deck emails to the
Evelyn AWeber list. Built for **cycle 1** (Jul 23–31 2026); these are the seed of a future
`.claude/skills/evelyn-reframe/`. Node ≥ 18 (uses global `fetch`). No deps.

## The pipeline

```
draft (.md)  →  check.mjs  →  render-aweber.mjs  →  aweber-ops.mjs schedule
 sends/<cycle>/   (gate)        (md → AWeber HTML)      (create + schedule, live)
```

1. **Write drafts** in `../sends/<cycle>/NN-*.md`, one per email, in the gold-email shape
   (frontmatter block + `---` + body). Keep the `> **↳ THE REFRAME.**` marker — the tooling
   keys off it (and it is **stripped from the send**). Add a `schedule.json` mapping each
   draft's number to an ISO8601 send time.

2. **Check** — mechanical pre-send gate (the countable bars from `../PLAYBOOK.md`; judgment
   bars are human review). The 7 `../emails/*.md` golds are the fixtures — the check must pass
   them.
   ```
   node check.mjs ../sends/cycle-1/*.md
   node check.mjs ../emails/*.md          # fixtures: all 7 must PASS
   ```

3. **Render** — each draft → a full AWeber `body_html` (canonical white/Helvetica design,
   hosted banner, `140 Broadway` footer, no hero image) + `body_text` + subject. Warns if a
   subject exceeds **120 bytes** (AWeber's hard limit — the `{{ subscriber.first_name |
   capitalize }}` tag counts ≈40 bytes, so keep the rest ≤ ~80).
   ```
   node render-aweber.mjs ../sends/cycle-1        # writes ../sends/cycle-1/_build/
   ```

4. **Schedule** — create each broadcast as a draft, then schedule it. **Live + human-gated:**
   only run after a human has reviewed the rendered emails.
   ```
   node aweber-ops.mjs list                       # what's queued now
   node aweber-ops.mjs cancel <id> <id> ...        # unschedule old → draft (recoverable)
   node aweber-ops.mjs schedule ../sends/cycle-1/_build
   ```

## AWeber API notes (learned the hard way)

- **Auth:** OAuth2 broadcast token in `.env` (`AWEBER_BROADCAST_ACCESS_TOKEN` / `_REFRESH_TOKEN`).
  The refresh token **rotates on every refresh** — `aweber-lib.mjs` backs up `.env` first, then
  persists the new pair. `.env.bak*` is gitignored (it holds live secrets). The access token
  lasts ~2h; `api()` refreshes on 401 automatically.
- **Create:** `POST /accounts/{acct}/lists/{list}/broadcasts` (form: `subject`, `body_html`,
  `body_text`, `click_tracking_enabled`) → returns a draft.
- **Schedule:** `POST /broadcasts/{id}/schedule` (form: `scheduled_for`, ISO8601 e.g.
  `2026-07-23T10:30:00+00:00` = 10:30 UTC = 6:30pm SGT).
- **Unschedule:** `POST /broadcasts/{id}/cancel` → reverts to draft (recoverable; not deleted).
- **Subject limit:** 120 bytes, tag included. **Personalization:** `{{ subscriber.first_name |
  capitalize }}` (matches the live program). **Body** stays "dear", no name.
- List: `theseerwithin_free` (6936953). One send/day at 10:30 UTC.

## Files

- `aweber-lib.mjs` — creds + `api()` with refresh-on-401 and `.env` backup/rotate.
- `check.mjs` — mechanical pre-send check (dear 2–4, one reframe, ≤2 em-dash, tagged CTA slug,
  no underline, ~280–420 words). Takes draft paths as args; exit 1 on any fail.
- `render-aweber.mjs` — drafts → AWeber `body_html`/`body_text`/subject + `index.json`.
- `aweber-ops.mjs` — `list` / `cancel` / `schedule` against the live list.
- `../sends/cycle-1/` — the 9 cycle-1 drafts + `schedule.json` (source of truth for what shipped).

`_build/` render output is disposable (regenerate any time) and gitignored.
