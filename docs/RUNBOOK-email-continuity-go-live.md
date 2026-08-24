# Going live: Evelyn email continuity (short links)

**Written 2026-08-18.** Follow the steps in order. Do not skip.

Anyone can follow this. You do not need to understand the code.

---

## What this feature does

Today, someone clicks a link in Evelyn's email and lands on a page that has
forgotten which email they came from. It asks them something generic.

After this goes live, the link carries which email they clicked. Evelyn opens by
continuing **that** email's story, and the reply they type is saved and waiting
for them in the chat after they sign up.

The link in the email changes from a long address to a short one:

```
https://www.theseerwithin.com/e/aB3xY9z
```

---

## Before you start — read this

**Three separate things must all be true, or readers get a broken link:**

1. The **code** must be on production
2. The **database tables** must exist on production
3. The **short link codes** must be minted into the production database

If any one is missing, everyone who clicks lands on a "browse all guides" page
instead of their reading. Nothing crashes. It just quietly fails.

The steps below do them in the safe order. **Database first, code second, links
last.** A database with tables but no code is harmless. Code with no tables is
not.

---

## Who needs to be involved

| Step | Who |
|---|---|
| 1–3 (database + deploy) | Someone with Supabase and Railway access |
| 4 (turn it on) | **Joel decides.** See the note in Step 4 |
| 5–7 (emails) | Whoever runs the AWeber sends |

---

## EVERY SQL STATEMENT, IN ONE LIST

If you only want to know "what do I have to run on production", it is this — in
this order, ready to paste. Each links to the step that explains it.

| # | Where | What it does | Step |
|---|-------|--------------|------|
| 1 | production | Confirm you are on the production database | [Step 1](#step-1--add-the-tables-to-the-production-database) |
| 2 | production | Create `email_link_codes` + add the new columns | [Step 1](#step-1--add-the-tables-to-the-production-database) |
| 3 | production | Verify: **15 rows** | [Step 1](#step-1--add-the-tables-to-the-production-database) |
| 4 | production | Turn the Live Thread arm on — ONLY if you chose Option B | [Step 4](#step-4--decide-does-everyone-see-the-new-page) |

**This is the only copy of these statements in the runbook.** Step 1 explains
them and tells you what to check; the SQL itself lives here, once, so there is no
second version to drift out of date.

### 1. Confirm you are on production

```sql
SELECT current_database(), current_user;
```

Check with someone that this is **production**, not development. Everything below
writes to whichever project you have open.

### 2. Structure

Only adds new things. Changes and deletes nothing. Safe to run twice.

```sql
CREATE TABLE IF NOT EXISTS email_link_codes (
  code varchar PRIMARY KEY,
  persona_slug text NOT NULL,
  campaign text NOT NULL,
  reading_recap text,
  open_loop text,
  continue_seed text NOT NULL,
  bucket text,
  src text,
  created_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS bucket text;
ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS src text;
ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS big_idea text;
ALTER TABLE email_link_codes ADD COLUMN IF NOT EXISTS card_image_url text;

CREATE INDEX IF NOT EXISTS idx_email_link_codes_campaign
  ON email_link_codes (campaign);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_link_codes_persona_campaign
  ON email_link_codes (persona_slug, campaign);

ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply text;
ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply_consumed_at timestamp;
ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply_violation_type text;
ALTER TABLE evelyn_lander_sessions ADD COLUMN IF NOT EXISTS pending_reply_response text;
```

### 3. Verify — you must get exactly 15 rows

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name = 'email_link_codes'
       OR (table_name = 'evelyn_lander_sessions' AND column_name LIKE 'pending_reply%'))
ORDER BY table_name, column_name;
```

11 rows for `email_link_codes` + 4 for `evelyn_lander_sessions`. Fewer than 15
means statement 2 did not fully run — run it again. **Do not continue until you
see 15.** [Step 1c](#step-1--add-the-tables-to-the-production-database) explains
what each one is for.

### 4. Only if Joel chose Option B — turn the arm on

⚠️ Do NOT paste this one blind. Read
[Step 4](#step-4--decide-does-everyone-see-the-new-page) first: it makes the new
page live for **everyone**, and B3 must keep the option names in the order B1
shows you.

**That is the whole list. There is no SQL for the email content itself.**

That surprises people, so here is why. The nine rows in `email_link_codes` —
their opening lines and their Big Ideas — are NOT inserted by hand on
production. They are written by the render pipeline in
[Step 6](#step-6--build-the-emails-and-create-the-links), lifted straight out of
the send drafts in `docs/aweber/evelyn-reframe-deck/sends/cycle-1/`. Minting a
row by hand on production creates a destination that no email points at, which
is worse than having no row at all.

So when the CONTENT changes — a better opening line, a corrected Big Idea —
**you edit the draft and re-run Step 6.** You do not write SQL. A re-run reuses
each existing code and updates the row in place, so links already baked into a
scheduled broadcast keep working.

### Content changed on development? Nothing to carry across.

Development rows were updated directly with SQL during build-out (2026-08-19:
nine new opening lines that name each email's subject, plus the `big_idea` for
each; 2026-08-20: the Devil letter's `card_image_url`). **Do not copy those
statements to production.** The same values are in the drafts, and Step 6 puts
them on production the right way.

The things that ARE structural, and therefore ARE in the list above, are the
`big_idea` and `card_image_url` COLUMNS — statement 2 creates both. What fills
them comes from each draft's `**Big Idea:**` and `**Card Image:**` lines.

---

## STEP 1 — Add the tables to the production database

Open the **production** Supabase project.

### 1a. Make sure you are on the right database

Run statement **1** from
[EVERY SQL STATEMENT](#every-sql-statement-in-one-list) and check with someone
that what comes back is **production**, not development. Everything below writes
to whichever project you have open.

### 1b. Run the structure statement

Statement **2** from the list above. It only adds new things — it does not change
or delete any existing data, and it is safe to run twice.

What it creates, and why each part matters:

- **`email_link_codes`** — one row per email send, holding the opening line the
  lander continues from. No `/e/` link resolves without this table.
- **`big_idea`** — the ONE thing each letter is about, so the chat stays on that
  subject instead of wandering off it on the first reply.
- **`card_image_url`** — the card a letter shows in the lander thread. Null for
  most sends; only a letter built on a card has one.
- **the `pending_reply*` columns** — where a reader's typed reply is parked
  before they have an account, and where the answer they were shown is stored.
  Without these, the reply they typed is lost at sign-up.

### 1c. Check it worked

Statement **3** from the list above.

**You must get exactly 15 rows.** Count them.

- 11 rows for `email_link_codes`
- 4 rows for `evelyn_lander_sessions`

(It was 13 until 2026-08-19, when `email_link_codes.big_idea` was added — the
column that tells the chat what the email was ABOUT, so it stays on that subject
instead of wandering off it on the first reply. It became 15 on 2026-08-20 with
`email_link_codes.card_image_url`, the card a letter shows in the lander thread.
Like `big_idea`, its VALUES come from the drafts in Step 6 — there is no SQL here
that fills it.)

If you get 0 rows, the SQL above did not run. Try again.
If you get fewer than 15, run the SQL in 1b again.

**Do not continue until you see 15 rows.**

---

## STEP 2 — Put the code on production

The code is on the `development` branch. It is **not** on `Production` yet.

Normal process for this project: open a pull request from `development` into
`Production`, get it reviewed, merge it.

As of 2026-08-20, `development` is **19 commits ahead** of `Production`. Those 19
include this feature **and** other unrelated work (fb-tarot changes). Whoever
opens the PR should check with the team that all of it is meant to ship.

Re-count before you open the PR — this number goes stale every time anything
merges:

```bash
git fetch origin && git rev-list --count origin/Production..origin/development
```

---

## STEP 3 — Check the code actually deployed

Wait for Railway to finish deploying, then open this in a browser:

```
https://www.theseerwithin.com/e/thislinkdoesnotexist
```

**Expected:** you land on the "browse all guides" page (`/personas`).

That is the correct answer. It proves the new code is live and the table is
reachable. If you get a 404 or an error page instead, the deploy has not finished
or something went wrong — stop and ask.

---

## STEP 4 — Decide: does everyone see the new page?

**⚠️ This is a decision for Joel, not a step to just run.**

Right now the new page reaches **nobody**. Every visitor still sees the old quiz.
That is deliberate — it means nothing changed for customers when the code shipped.

Joel's original instruction was to **replace** the quiz. The build shipped it
switched off so it could be tested safely first.

**There are two ways to turn it on. Pick one with Joel.**

### Option A — change the default (needs a small code change + deploy)

One word changes in `client/src/pages/EvelynLanderPage.tsx`:

```
useABVariant("evelyn_lander", "mechanic", "quiz")
```
becomes
```
useABVariant("evelyn_lander", "mechanic", "live_thread")
```

Everyone gets the new page. To undo: change it back and deploy.

### Option B — use the A/B experiment (database only, no deploy)

This lets you split traffic (for example 50% new, 50% quiz) and change it later
without a deploy.

**Be aware:** the experiment is currently *paused*, and this project locks the
experiment's options once a test has been started, so the admin screen may refuse
these edits. The SQL below works regardless. Someone who understands the
experiment system should run it — it decides which visitors see what.

#### B1. Look at what is there now

```sql
SELECT key, status, variants FROM experiments WHERE key = 'evelyn_lander_mechanic';
```

Look at `variants`. If there is no `live_thread` entry, do B2. If there is, skip
to B3.

#### B2. Add the new option (only if it is missing)

```sql
UPDATE experiments
SET variants = variants || '[{"key":"live_thread","weight":0,"payload":{}}]'::jsonb,
    updated_at = now()
WHERE key = 'evelyn_lander_mechanic'
  AND jsonb_typeof(variants) = 'array'
  AND NOT (variants @> '[{"key":"live_thread"}]'::jsonb);
```

Safe on a paused or running test: it adds the option at **weight 0**, which means
nobody is sent to it. No existing visitor changes. Running it twice does nothing
the second time (`UPDATE 0`).

#### B3. Send everyone to the new page

⚠️ **Check the output of B1 first.** Keep the same option names in the same order
as what B1 showed you, and only change the numbers. Changing the order changes
which visitor sees what.

```sql
UPDATE experiments
SET variants = '[{"key":"chatbox","weight":0,"payload":{}},
                 {"key":"quiz","weight":0,"payload":{}},
                 {"key":"live_thread","weight":100,"payload":{}}]'::jsonb,
    status = 'running',
    updated_at = now()
WHERE key = 'evelyn_lander_mechanic';
```

**Both parts matter.** `status` must be `running`, or the experiment is ignored
and everyone falls back to the quiz. And `live_thread` must be `100`.

For a 50/50 split instead, use `{"key":"quiz","weight":50}` and
`{"key":"live_thread","weight":50}`.

#### B4. Wait about 30 seconds

The settings are cached for 30 seconds. Then clear your browser's `ab_vid` cookie
(each visitor is stuck to one version) and reload.

#### To undo

```sql
UPDATE experiments SET status = 'paused' WHERE key = 'evelyn_lander_mechanic';
```

Everyone is back on the quiz within 30 seconds.

**Do not guess between A and B. Ask Joel.**

---

## OPTIONAL — Try it on development first

**Recommended before touching production.** This lets you click through the whole
experience yourself without sending anything to anyone.

### D1. Do Step 1 on the DEVELOPMENT database

Same SQL as Step 1, but on the development Supabase project. Check for 15 rows.

**Already done, 2026-08-20.** Development has every column, including
`card_image_url` with the Devil card set on `dev03` — so a dev walk-through needs
no SQL at all right now.

### D2. Put nine test links in the development database

The file `dev-seed-9-links.sql` in the project root adds one row for each of
Evelyn's nine emails, using the real wording from each draft. Open it, copy all of
it, paste it into the development SQL editor, and run.

It is safe to run twice (`ON CONFLICT DO NOTHING`).

The codes are randomly generated, the same way real ones are. The file lists them
at the top, like this:

```
-- /e/7AIKaoY  ->  reframe-01-changed
-- /e/R8g74v8  ->  reframe-02-fence
```

Put the development web address in front of each:

```
https://the-seer-within-v2-development.up.railway.app/e/7AIKaoY
```

**Codes are deliberately not a readable sequence** (not `dev01`, `dev02`…). A
guessable code lets anyone step through the whole set and read campaign copy that
has not been mailed yet. Real codes are 7 random characters — about a trillion
possibilities — so they cannot be guessed by adjusting a digit.

### D3. Turn the new page on for development

Do Step 4 Option B, but on the **development** database.

### D4. Click through

Open the first two links from the file in two windows. **Each should open with a
different opening line** — that is the whole feature. One talks about a real question; the other
talks about a fence.

Also try `/e/somethingmadeup` — it should land on the browse-all-guides page.

Then walk one all the way: type a reply, enter an email address, complete signup,
and check your reply is waiting in the chat.

<a id="why-not-hand-insert"></a>

### ⚠️ Why production does NOT use this SQL

On production you use the pipeline (Step 6) instead, **not** hand-written SQL.

Inserting a row by hand only creates the *destination*. It does not put a link
into any email. You would end up with a working address that no email points at,
and emails still carrying the old-style links.

The pipeline does both at once — it creates the code **and** writes it into the
email's button, so the two can never disagree.

Use the SQL above for testing on development. Use the pipeline for real sends.

---

## STEP 5 — Set the send dates

Open:

```
docs/aweber/evelyn-reframe-deck/sends/cycle-1/schedule.json
```

It currently has **July 2026 dates**, which are in the past. Change them to the
dates you actually want to send on. Format:

```json
{
  "01": "2026-09-01T10:30:00+00:00",
  "06": "2026-09-02T10:30:00+00:00"
}
```

`10:30` UTC is 6:30pm Singapore time, which is the slot this list normally uses.

---

## STEP 6 — Build the emails and create the links

**This is the step that creates the real short links.** It must be run against
the **production** database, or every link will be dead.

Run this from the project folder:

```bash
cd docs/aweber/evelyn-reframe-deck/scripts

DATABASE_URL="<production connection string>" \
  npx tsx render-aweber.mjs ../sends/cycle-1 --mint-production
```

**About `--mint-production`:** the script refuses to write to any database that
is not on your own machine unless you type this. It is a safety catch, so you
cannot do this by accident.

**What you should see:**

```
  ⚑ minting /e/ codes into database "postgres" @ <production host>
      created /e/aB3xY9z  reframe-01-changed
      created /e/K2mQ7pL  reframe-02-fence
      ... (9 lines total)
rendered 9 broadcasts -> .../cycle-1/_build
```

Check the `⚑` line names the **production** host. If it names anything else,
stop — the links will not work.

The finished emails are now in `cycle-1/_build/` as `.html` files.

**Important:** these files are tied to the database you just minted into. Do not
save them, re-use them later, or copy them between environments. If you need to
rebuild, run the command again.

---

## STEP 7 — Schedule them in AWeber

```bash
cd docs/aweber/evelyn-reframe-deck/scripts
node aweber-ops.mjs schedule ../sends/cycle-1/_build
```

**This writes to the real AWeber list.** Before it schedules anything, it
automatically:

- checks the links were minted into production, not somewhere else
- **visits every single link on the live website** to confirm it works

If any link does not resolve, it stops and schedules **nothing**. It also refuses
to continue if it cannot perform the check at all.

This is your safety net. If this step passes, the links work.

### Useful commands

```bash
# See what is scheduled
node aweber-ops.mjs list scheduled

# Cancel a scheduled broadcast (becomes a draft, recoverable)
node aweber-ops.mjs cancel <id>
```

Credentials come from the `.env` file in the project root
(`AWEBER_BROADCAST_ACCESS_TOKEN` and `AWEBER_BROADCAST_REFRESH_TOKEN`).

---

## STEP 8 — Check one link by hand

Take any code from Step 6 and open it:

```
https://www.theseerwithin.com/e/<code>
```

**Expected:** it sends you to Evelyn's page, and the web address now contains
`?campaign=...`.

If Step 4 was done, Evelyn should open by continuing **that specific email**.
If Step 4 was not done yet, you will see the old quiz. That is expected.

---

## Quick checklist

| # | Step | Done when |
|---|---|---|
| — | *(optional)* Tried on development first | Two dev links show two different openings |
| 1 | Tables added to production database | The check query returns **15 rows** |
| 2 | Code merged to `Production` | PR merged |
| 3 | Deploy confirmed | A made-up `/e/` link lands on `/personas` |
| 4 | Turn-on decision | **Joel has chosen A or B** |
| 5 | Send dates set | `schedule.json` has future dates |
| 6 | Links created | 9 `created /e/...` lines, production host named |
| 7 | Scheduled in AWeber | The link check passed and it scheduled |
| 8 | Checked by hand | One link opens Evelyn's page |

---

## Things that are safe to get wrong

- **Running the SQL twice.** Nothing happens the second time.
- **Running Step 6 twice.** You get the same codes back, not new ones. Each email
  keeps one permanent code.
- **Deploying the code before Step 4.** Nothing changes for any visitor until
  someone turns it on.

## Things that are NOT safe

- **Skipping Step 1.** Every clicker gets the wrong page.
- **Running Step 6 against development or a laptop, then sending.** The links will
  be dead. Step 7 is designed to catch this — do not work around it if it stops you.
- **Editing an email's opening line after it has been sent.** People still
  clicking the old email will see the new wording.

---

## If something goes wrong

**Everyone lands on "browse all guides"**
The codes are not in the production database. Re-run Step 6 against production.

**Step 7 refuses to schedule**
Read what it prints — it names the exact problem. It is protecting you. Fix the
cause; do not bypass it.

**Evelyn shows the quiz, not the new page**
Step 4 has not been done, or was done on the wrong environment.

**Evelyn shows the wrong email's opening line**
This was a bug, fixed on 2026-08-18 (commit `c95fd85`). If you see it, the deploy
is older than that fix. As a temporary workaround, clear the browser's session
storage or use a private window.

---

## Honest list of what is not settled

These are open at the time of writing. Do not treat them as done.

1. **How the feature gets turned on for real visitors (Step 4).** Joel has not
   chosen between Option A and Option B.
2. **Whether all 9 cycle-1 emails should send, and when.** The dates in
   `schedule.json` are old placeholder dates.
3. **Only Evelyn is supported.** Aiden and Luna have no short-link setup. An `/e/`
   link for them would send readers to the "browse all guides" page. Do not put
   short links in their emails.
