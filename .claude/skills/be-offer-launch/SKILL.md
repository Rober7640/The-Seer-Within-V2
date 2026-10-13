---
name: be-offer-launch
description: "The master end-to-end checklist for taking a NEW backend (BE) offer live — build → local test → dev → Production (squashed cherry-pick) → the two AWeber transactional emails → the sales-email send → PostHog. Use it whenever a new BE offer (the next 02/03/04/06/07/08/09-style one-time offer) is being shipped, when asked to 'take BE offer N live', 'launch the new backend offer', 'go-live checklist for the offer', or to verify nothing was missed before/after a BE go-live. It exists because the repo's 0-WORKFLOW.md stops at the funnel + AWeber lists, which is how offer 04 nearly shipped with NO PostHog tracking and a broken sales-email image. It gates each phase and calls out the silent killers (PostHog insights, the sales photo on S3, UTM on every sales link, cross-list buyer exclusion). It COORDINATES other skills (posthog-track-funnel, v1-funnel-audit) and never skips the sales-send + tracking that the funnel checklist forgets."
---

# BE offer launch — nothing gets forgotten

A BE offer isn't live when the funnel works. It's live when it **takes money in Production, delivers, AND reports clicks + revenue**, and only sells because an **email went out**. `0-WORKFLOW.md` covers the funnel and the AWeber lists; the parts teams forget are **PostHog** and the **sales-email send**. Walk the phases in order; don't declare a phase done until its gate passes.

## Phase 1 — Build & test local
Funnel (booking page + chat, cup/card draw, order bump, upsell1→upsell2, receipt) + product files + unit tests. Then **on a laptop**: `npx vitest run` the offer's suites, run the offer's `walk-*` scripts, and click the preview journey as a customer. Per the offer's own `improve-v1/v1-one-time-BEs/docs/0N/HANDOVER.md`.
**Gate:** offer suites green, walk-throughs pass, V1 funnel `/` unaffected.

## Phase 2 — Dev
- PR feature → `development` (it branches off development, so it's a clean merge).
- **Host the product PDFs** (Supabase bucket `BE_Reading`, path `0N-<slug>/…`, public) and set the `BE0N_READING_URL_*` env vars on the dev Railway service.
- Dev env also needs `BACKEND_CHECKOUT_TEST_MODE=true` + a `sk_test_` Stripe key (lifts the `readyForMoney:false` gate for test cards only).
- **AWeber transactional emails** (by hand — the API can't build Campaigns): confirmation + delivery Campaigns on the `be-0N-*` tags, on list `6972552`. If the reading link is per-buyer, create the offer's OWN custom field (e.g. `0N_<slug>_reading_url`, **not** the shared `reading_url` — multi-offer buyers overwrite each other) and merge it in the delivery email.
- **Test purchase** (test mode) → confirm: tag lands on `6972552`, the reading-link field is populated, and both emails arrive.
- ⭐⭐ **PostHog — the forgotten half.** Run the **`posthog-track-funnel`** skill against the dev booking URL: prove `lander_view` / `checkout_initiated` / `purchase_completed` land for the offer's funnel (client `getPostHogFunnel` + server `BACKEND_FUNNEL` must BOTH name it), then **CREATE the two insights** — a Funnel, and a Trends = Sum of `amount_cents` broken down by `utm_campaign`. **Firing events ≠ having insights.** (04 proved events and still had no insights.)

**Gate:** a dev test purchase tags + delivers + fires revenue, and the two PostHog insights exist.

## Phase 3 — Production (⚠ branches are diverged ~146 commits → squashed cherry-pick, NOT a merge)
- Branch off `origin/Production`, apply the feature as ONE squashed commit, **flip `readyForMoney:true`** for the offer.
- Resolve conflicts keeping Production's own evolution and adding only the new offer — watch for a **duplicate `case`/wiring** (04 would have double-registered `judgement`). Re-run the offer's vitest suites + typecheck **on the prod branch**; update any "ships-dark" tripwire tests that the `readyForMoney` flip invalidates.
- PR → `Production`; confirm `git merge-tree` shows no conflicts before merge.
- Prod Railway env: the `BE0N_READING_URL_*` vars; confirm `VITE_BACKEND_CHECKOUT_LIVE=true` (already on for live offers); `be_orders` has the base columns. If delivery is written at purchase, **do NOT set the delivery cron flag**.
- AWeber is ONE shared account → the transactional Campaigns from Phase 2 already serve Production.
- **Verify live:** there is no test mode on prod, so do ONE real purchase (own card) through a UTM-tagged link → emails + reading-link field + PostHog revenue → **refund yourself + delete the test AWeber contact.**

**Gate:** a real prod purchase delivers + reports revenue, then is refunded.

## Phase 4 — The sales-email send (traffic) — the part that actually sells it
1. **Joel confirms the lists** (default `theseerwithin_free` + palm + tarot). ⛔ Never the customer list `6972552`.
2. ⭐ **Upload the sales-email photo to S3** (`node improve-v1/v1-one-time-BEs/scripts/host-be-asset.cjs file <img> evelyn/backend-0N/<img>`), PUBLIC, and **curl the URL for a 200** before sending. (04 gap: it was 403/unuploaded.)
3. ⭐ **Add `utm_source=aweber&utm_medium=email&utm_campaign=be0N_<stem>` to EVERY sales link — in the HTML AND the `.txt` twin.** The `c=` codes only give Stripe attribution; PostHog's revenue-by-campaign insight needs the UTM.
4. ⭐ **Cross-list buyer exclusion.** The buyer tag `be-0N-*` sits on `6972552`, not on the prospect list — so **seed-test** that AWeber excludes a tagged buyer from a broadcast to the prospect lists, with a real bought contact, before send.
5. **Get copy approval first** — publish a Claude artifact with the rendered previews + pasteable HTML/plain-text (both tracked), send for sign-off.
6. Build in AWeber (HTML + `.txt`), seed-test (phone, images off, no-first-name), schedule (e.g. day 0 → day 1 to non-openers → day 3). **No price in any sales email** (the booking page runs a price split test).

**Gate:** photo 200, every link UTM-tagged, exclusion seed-tested, copy approved, lists confirmed.

## The three tracking tools — know which does what
- **PostHog** = clicks + revenue. Needs the funnel name wired on BOTH sides, UTM on links, AND the insights created. This is the one that fails silently.
- **AWeber** = sending + tags. ONE account, dev and prod shared — so transactional Campaigns + custom fields built once serve both.
- **Trackdesk** = affiliate attribution, and it is **intentionally OFF for BE offers** (guarded in code). BE sells to the existing list via email, not from affiliate clicks; attaching a Trackdesk click id to a BE sale mis-credits an affiliate. Do not add it.

## References
- `improve-v1/v1-one-time-BEs/docs/0-WORKFLOW.md` (the funnel + AWeber-lists half) and each offer's `docs/0N/HANDOVER.md`.
- Skills: `posthog-track-funnel` (prove + wire tracking), `v1-funnel-audit` (flow health, local), `v1-funnel-live-audit` (real data, read-only).
- `docs/0-GO-LIVE-CHECKLIST.md` (the human-facing one-page version of this).
