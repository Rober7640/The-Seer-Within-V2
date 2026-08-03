# Reframe Deck — pipeline scripts

The reframe-deck pipeline — checks, renders, and schedules reframe-deck emails to the
Evelyn AWeber list. This is the engine the **`evelyn-reframe` skill** (`.claude/skills/evelyn-reframe/`)
orchestrates; first proven on **cycle 1** (Jul 23–31 2026). Node ≥ 18 (uses global `fetch`). No deps.

> **`render-aweber.mjs` runs under `tsx`, not plain `node`.** It imports a TypeScript
> module (`server/lib/emailLinkCodes.ts`) to mint `/e/<code>` short links, and node's
> ESM loader cannot resolve a `.ts` import. `check.mjs` and `aweber-ops.mjs` are
> unchanged — still plain `node`.

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

   **This step can write to a database.** Any draft with a `**Continue Seed:**` in its
   frontmatter gets an opaque `/e/<code>` short link instead of the legacy `?campaign=`
   URL, and `<code>` is a row in `email_link_codes` carrying the continuation content the
   lander reads. The code only resolves in the database it was minted into, so a **real
   send has to be minted into production** — otherwise every reader who clicks bounces to
   `/personas`, and the rendered HTML looks perfect either way.
   ```
   # DEFAULT — local. Use this for every render during authoring and review.
   npx tsx --env-file=../../../../.env.test render-aweber.mjs ../sends/cycle-1

   # PRODUCTION — only after the human "go", immediately before scheduling.
   npx tsx --env-file=../../../../.env render-aweber.mjs ../sends/cycle-1 --mint-production
   ```
   Both write `../sends/cycle-1/_build/`. Guardrails, in the order they fire:
   - `DATABASE_URL` unset → exit 1. The script will not fall through to pg's defaults.
   - non-local `DATABASE_URL` without `--mint-production` → exit 1. Both directions of the
     mistake have to be deliberate.
   - the target is printed: `⚑ minting /e/ codes into database "…" @ host`.
   - the target is recorded per send in `index.json` as `minted_into`, and
     `aweber-ops.mjs schedule` **refuses** any short-linked send not minted into
     production. That is the backstop for the one failure mode with no other signal.

   Drafts with no `**Continue Seed:**` keep the legacy `?campaign=` link and need no
   database at all.

   Re-running is safe: codes are keyed on `(persona, campaign)` — enforced by a unique
   index, not just convention — so a re-render reuses the existing code (and refreshes its
   content if the draft changed) rather than minting a new one. The URL inside an
   already-scheduled broadcast never moves under you.

   **`short-links.json`** (optional, per cycle) declares which draft numbers must be
   short-linked — `["04"]`, or `{ "note": "…", "sends": ["04"] }` when the file needs a
   comment. With it present the renderer hard-fails on any deviation — a declared send that
   lost its seed to a typo, or an undeclared send that has one. Without it you get a `⚠`
   block listing every legacy draft, which fires on almost every run and stops being read.

   **Campaign slugs must be globally unique, not just unique within a cycle.** The code is
   keyed on `(persona, campaign)` for all time, so reusing an earlier cycle's slug would
   *repoint that cycle's live row* — a reader still holding the older, already-sent email
   would click it and get the new cycle's continuation. Draft numbers restart each cycle
   and the names rhyme (`reframe-01-…`), so the renderer reads every sibling directory
   under `sends/` and hard-fails on a collision, naming both files.

   **Hard parse errors** (render stops, nothing written): a `**Bucket:**` outside
   `love` / `money` / `purpose` / `specific` — the lander parses it with a `z.enum` and
   discards the *entire* payload on failure, so a bad value voids the send rather than
   degrading it; and a `**Continue Seed:**` wrapped onto a second line, which would put
   half a sentence in the reader's opening bubble. A wrapped `**Open Loop:**` or
   `**Reading Recap:**` only warns.

4. **Schedule** — create each broadcast as a draft, then schedule it. **Live + human-gated:**
   only run after a human has reviewed the rendered emails. If the cycle has any
   short-linked send, re-render with `--mint-production` first (step 3).

   `schedule` pre-flights the whole `index.json` **once, before the first broadcast is
   created**: schedule times, subject bytes, `minted_into`, and then — for every short link
   — a live `GET https://www.theseerwithin.com/e/<code>`, requiring a `302` to `/evelyn?`.
   That last check is the only one that proves the thing that actually matters: not that
   the render script *says* it wrote to a Supabase box, but that the live site can resolve
   the link. It catches an unapplied migration 020, an undeployed `/e/` route, and a
   non-production Supabase project alike. All the requests go out concurrently (~one
   round-trip for a whole cycle), and it **blocks on a failed check** — including a network
   error, because an unverifiable link is not a verified one.
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
  **Run under `tsx`; mints `/e/<code>` rows into `DATABASE_URL`.** `index.json` records
  `link_kind` (`short`/`legacy`), `code`, `cta_url` and `minted_into` per send.
- `render-aweber.test.ts` — smoke test for the minting behaviour. DB-touching, so:
  `npm run test:local docs/aweber/evelyn-reframe-deck/scripts/render-aweber.test.ts`
  (from the repo root).
- `aweber-ops.mjs` — `list` / `cancel` / `schedule` against the live list. `schedule`
  pre-flights the whole index (schedule times, subject bytes, and `minted_into` for every
  short link) before creating a single broadcast.
- `../sends/cycle-1/` — the 9 cycle-1 drafts + `schedule.json` + `short-links.json`
  (source of truth for what shipped).

`_build/` render output is disposable (regenerate any time) and gitignored.
