---
name: posthog-track-funnel
description: "Run at the END of any funnel/lander/offer build to wire and PROVE its PostHog tracking — so a mailed link reports clicks and revenue. Audits the two unsynced funnel rosters (client getPostHogFunnel + server BACKEND_FUNNEL), runs the known-silent-killer checklist (build-time VITE_POSTHOG_API_KEY, server POSTHOG_API_KEY, non-UUID event uuid, the hosted-checkout email guard, dev/prod drift), then PROVES events actually reach PostHog from the deployed page with a real browser, and finally emits the PostHog insight config plus a paste-ready operator block for Joel. REPORT ONLY — it proposes fixes and never applies them, never purchases, never writes to a database. Use when asked to: add/check PostHog tracking for a funnel, wire UTM tracking for a mailing or partner link, verify tracking after shipping a lander, find out why events or revenue aren't showing in PostHog, or set up clicks + revenue per link."
---

# posthog-track-funnel — wire it, then prove it

Joel, 3 Sep 2026: *"Every time we finish building something, we can call a skill to look at
the view and then see what we need to append to get the PostHog working. It's just more
reliable that way."*

This is that skill. It exists because **PostHog fails silently here** — every single failure
mode in this codebase looks exactly like a page that works. Twin Flame shipped with correct
code, a correct insight, and zero revenue for a week. So the skill's centre of gravity is not
the audit; it is **stage 4, where it proves an event actually arrived**.

## Report-only contract (why this is safe to run any time)

1. **It never edits a file.** Every stage prints findings and names the file to change. A
   human applies the fix.
2. **It never purchases.** `probe-live.mjs` aborts every checkout, charge and Stripe request,
   so no Checkout Session is created and nothing is charged. It cannot complete a sale.
3. **It never writes to a database**, and never touches Railway env or a remote branch.
4. **It does create real PostHog events** — that is the point of stage 4 — tagged with a
   unique `skillprobe_…` campaign so they are trivial to exclude. It also blocks Facebook,
   Google Ads and Trackdesk so probing production fires no real pixel into ad reporting.

## The six stages

### 1 · Identify what was built

Establish four things before touching a script, and say them back to the operator:

| | example |
|---|---|
| entry route | `/tarot/twin-flame` |
| PostHog funnel name | `twinflame` |
| backend offer key (BE offers only) | `twin-flame` |
| the events this funnel should fire | see the event contract below |

The **entry route** is the one the buyer first clicks from the email. It matters more than it
looks: the UTM tag is captured on her first pageload, so tagging a mid-funnel link records
nothing.

⭐⭐ **The event contract — which events a funnel MUST fire.** Wiring the funnel *name* is not
the same as firing the *events* an insight needs: Pixiu passed "0 critical" while
`checkout_initiated` was missing entirely. `audit-wiring.mjs` now carries a per-funnel event
registry and checks the source for each one (override with `--events=a,b`):

| family | expected events |
|---|---|
| **V1 + ad funnels** (`v1`, `fb`, `fb2`, `gdn`, `palm`, `tarot`, `read`, `evelyn`, `aiden`, `soulmate`) | `lead_captured` (the email capture — this is the V1 "lead"), `checkout_initiated`, `purchase_completed` |
| **BE booking offers** (`twinflame`, `judgement`, `pixiu`) | `lander_view`, `checkout_initiated`, `purchase_completed` (upsell views/purchases reuse the same two event names, keyed by `step`) |

The V1 lead is spelled **`lead_captured`**, fired from `useConversation.ts` at email capture —
not `lead`. If you add a funnel, add its row to `EXPECTED_EVENTS` in `audit-wiring.mjs`.

### 2 · Audit the wiring

```bash
# audit what is DEPLOYED — the usual case
MSYS_NO_PATHCONV=1 node .claude/skills/posthog-track-funnel/scripts/audit-wiring.mjs \
  --ref=origin/Production --route=/tarot/twin-flame --funnel=twinflame --offer=twin-flame

# audit your own branch (drop --ref) when checking work you just wrote
MSYS_NO_PATHCONV=1 node .claude/skills/posthog-track-funnel/scripts/audit-wiring.mjs \
  --route=/tarot/twin-flame --funnel=twinflame --offer=twin-flame
```

The audit checks the funnel-name plumbing (below), the silent killers (§3), AND the event
contract (§1). One subtlety in the event check worth knowing: a bare event name appears
tree-wide (`checkout_initiated` lives in V1's shared hook and Twin Flame's page), so for a **BE
offer** it only counts an event that is co-located with a literal `funnel: '<name>'` — that is
what catches "the page never fires it for THIS offer". **V1** funnels fire from one shared hook
with a computed funnel, so there a tree-wide presence check is the correct signal.

🔴 **Two Windows traps, both of which produce a confident wrong answer:**

- **Git Bash rewrites a leading-slash argument into a Windows path**, so
  `--route=/tarot/twin-flame` silently arrives as `C:/Program Files/Git/tarot/twin-flame`
  and every route check then answers the wrong question. Prefix with `MSYS_NO_PATHCONV=1`,
  drop the leading slash, or run from PowerShell. The script refuses rather than guess.
- **Without `--ref` the audit reads your WORKING TREE.** A stale checkout produces a page of
  criticals that look exactly like real ones — this checkout has been 189 commits behind
  before now. The script prints a loud banner when it detects that, but `--ref` is the real
  answer: audit the branch that is actually serving traffic.

⭐⭐ **A route reaches its funnel by one of three mechanisms** — check the right one before
concluding anything is missing:

1. a **literal path** inside `getPostHogFunnel` (`/soulmate`, `/evelyn`, `/7-7`)
2. an exported **PREFIX const** referenced there (`TWIN_FLAME_PREFIX`)
3. the **shared ad-funnel table** `shared/funnelConfig.ts`, reached via `funnelDefForPath` —
   this is how every V1 ad funnel is wired (`/fb`, `/fb2`, `/gdn`, `/fb-palm`, `/fb-tarot`,
   `/fb-read`), and its `posthog:` field is the funnel name

🔴🔴 **The two rosters are unsynced, and each owns half the answer:**

- **client** `getPostHogFunnel` + `getPostHogStep` + the `PostHogFunnel` union
  (`client/src/lib/funnel.ts`) decide the `funnel` on pageviews and `lander_view` — that is
  **clicks**.
- **server** `BACKEND_FUNNEL` + `BACKEND_STEP`
  (`server/lib/backendPurchaseAnalytics.ts`) decide it on `purchase_completed` — that is
  **revenue**.

Register one and not the other and you get clicks with no revenue, or revenue with no
clicks. **Backend offer 03 shipped exactly that bug**: the server maps `judgement-day →
judgement`, the client registers nothing, so it records revenue and no clicks. Always fix both.

### 3 · The known silent killers

The audit prints these; confirm each one deliberately rather than skimming.

| Trap | Symptom | Where |
|---|---|---|
| `VITE_POSTHOG_API_KEY` missing **at build time** | `initPostHog()` returns early, every `track()` is a no-op. One console warning, **no network request** | `client/src/lib/posthog.ts` — prove with stage 4, not the repo |
| `POSTHOG_API_KEY` missing server-side | `posthog-node` becomes a no-op client; all server revenue vanishes | `server/lib/posthog.ts` — deploy env, not visible in code |
| **A non-UUID event `uuid`** | PostHog **silently drops the event at ingest**. Webhook returns 200, order row and email still write, revenue never appears | `server/lib/backendPurchaseAnalytics.ts` — fix is a deterministic UUIDv5 |
| Hosted-checkout email guard | With `customer_creation:'always'` Stripe leaves `customer_email` **NULL** (address is in `customer_details.email`); an empty guard skips the event while the order records | `server/routes/webhooks.ts` |
| **dev/prod drift** | The fix is live on one branch only, so testing the other produces a false negative | compare branches before believing any test |

⭐⭐ The UUID one is the subtlest: **every other funnel passes no `uuid` and lets PostHog
generate one**, which is why only backend offers were affected. If you ever pass a `uuid` to
`posthog.capture`, it must be a real UUID.

### 4 · Prove the events arrive — the stage that matters

Bundle first (no browser, creates no events):

```bash
node .claude/skills/posthog-track-funnel/scripts/check-bundle.mjs \
  --url=https://theseerwithin.com/tarot/twin-flame \
  --funnel=twinflame --events=lander_view,checkout_initiated,bump_offered
```

Then the live probe:

```bash
node .claude/skills/posthog-track-funnel/scripts/probe-live.mjs \
  --url=https://theseerwithin.com/tarot/twin-flame/preview-page \
  --funnel=twinflame --expect=lander_view,checkout_initiated \
  --check-all --click=button-checkout
```

🔴🔴 **posthog-js drops every event from an automated browser.** `isLikelyBot()` checks the
UA blocklist, `navigator.webdriver` **and** `navigator.userAgentData.brands` — spoofing the UA
string alone is not enough, because the brands array still says HeadlessChrome. The drop is
completely silent: no warning, no queue entry, no request. `probe-live.mjs` masks all three.
**A headless run without masking will "prove" PostHog is dead when it is perfectly fine — this
has caused a false alarm here twice.**

Two practical notes:

- **Prefer a `/preview` route where the funnel has one.** The live entry route may assign an
  A/B treatment on load, which enrols a subject in a running experiment.
- **A gated CTA often does not render until every agreement is ticked** — that is what
  `--check-all` is for. "Button not found" usually means gated, not missing.

### 5 · Emit the insight config

Hand the operator the exact PostHog setup, because a correct pipeline still reads as zero
through a wrong query.

**Funnel** — one step per business event, all filtered `funnel = <name>`:

```
1  lander_view
2  checkout_initiated
3  purchase_completed   step = sales
4  upsell_accepted      step = upsell1
5  purchase_completed   step = upsell1
6  upsell_accepted      step = upsell2
7  purchase_completed   step = upsell2
```

**Trends (revenue per link)** — `purchase_completed`, *Property value sum* of `amount_cents`,
filtered `funnel = <name>`, broken down by the UTM param the operator used.
For a per-step split, add one series per `step` value rather than a second breakdown.

Rules that keep it honest:

- **Never duplicate a step.** A buyer purchases once, so a repeated `purchase_completed` step
  pins the funnel at 0% forever and hides every step below it.
- **Leave engagement micro-steps out** — anything that fires on render for one treatment and
  mid-conversation for another counts the arms differently and distorts the whole chain.
- `amount_cents` is **cents**. Divide by 100.

🔴🔴 **The four UI traps**, each of which has cost an hour here:

1. A **fixed date range silently returns nothing** (project timezone). Use a rolling window.
2. **"Filter out internal and test users" defaults ON** and hides real traffic.
3. Filtering by **email address matches nothing** — the email is the *distinct id*, not a
   person property. Use Distinct ID or People search.
4. A breakdown takes a **property, not a value**.

### 6 · Emit the operator block

Joel tags the links himself, so end every run with a paste-ready block for him — and update
`docs/posthog-utm-tracking.md` rather than writing a rival copy of it:

```
Link to mail:  https://theseerwithin.com/<entry route>?utm_campaign=<offer>_<source>
Clicks:        Trends → $pageview (or lander_view), filter funnel=<name>, breakdown by your UTM param
Revenue:       Trends → purchase_completed, Sum of amount_cents (÷100), filter funnel=<name>, same breakdown
Cross-check:   AWeber's click count for the broadcast should be close to PostHog's. A big gap means
               a missing tag or a tracking outage — check the tag first.
```

⭐⭐ **Do not impose a UTM convention.** All five UTM params are captured and stamped on every
revenue event; Joel picks whichever one he likes and stays consistent. Keep values lowercase
with no spaces — two spellings split one campaign into two rows.

## Proven on

Both scripts were dry-run against real cases before this skill was written up, and the
expected exit codes are part of the contract:

| case | expected |
|---|---|
| `audit-wiring --ref=origin/Production` twin-flame | 11 wired (incl. the 3 event checks), 0 critical, **exit 0** |
| `audit-wiring` Pixiu at the commit before `checkout_initiated` shipped | event contract flags `checkout_initiated fires but NOT for "pixiu"` (**warn**), everything else clean |
| `audit-wiring --route=/ --funnel=v1` | event contract confirms `lead_captured` fires for V1, **exit 0** |
| `audit-wiring` on `/fb-tarot`, `/fb-palm`, `/fb-read`, `/soulmate` | all clean, **exit 0** |
| `audit-wiring --route=/fb-tarot --funnel=palm` (deliberate mismatch) | catches it, **exit 1** |
| `audit-wiring --route=/tarot/…` under Git Bash without `MSYS_NO_PATHCONV=1` | refuses, **exit 2** |
| `check-bundle` against live twin-flame and `/fb-tarot` | key + funnel + expected events, **exit 0** |
| `probe-live` against `/tarot/twin-flame/preview-page` | `lander_view`, `bump_offered`, `checkout_initiated` all HTTP 200 with `funnel=twinflame` and the probe tag, 6 payment/pixel requests blocked, **exit 0** |
| `probe-live` against `/fb-tarot` | `lander_view` `funnel=tarot step=landing` HTTP 200, **exit 0** with a note about `tarot_bridge_view` |

If a change to this skill breaks one of those, the skill is wrong — not the case.

## What this skill will not tell you

It proves events were **sent and accepted**. It cannot confirm they are **queryable in the
PostHog UI**, because we have no PostHog read access — that last mile needs Joel or Mike to
look. Say so plainly in the report rather than implying the loop is closed.

Related: `docs/posthog-utm-tracking.md` · `.claude/skills/v1-funnel-audit` (flow health, local
only) · `.claude/skills/v1-funnel-live-audit` (real data, read-only).
