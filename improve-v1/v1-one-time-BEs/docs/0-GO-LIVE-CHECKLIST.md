# BE offer — go-live checklist (every phase, nothing dropped)

`0-WORKFLOW.md` covers the funnel + AWeber lists. It stops there — which is how offer 04 nearly
shipped with **no PostHog tracking** and a **broken sales-email image**. This is the full list.
The agent version (gated, with commands) is the **`be-offer-launch`** skill
(`.claude/skills/be-offer-launch/SKILL.md`) — run it when taking a new offer live.

## 1 · Build & test local
- [ ] Funnel + product + unit tests built (per `docs/0N/HANDOVER.md`).
- [ ] Local: vitest suites green · walk-through scripts pass · clicked the journey as a customer · V1 `/` unaffected.

## 2 · Dev
- [ ] PR feature → `development` (clean merge).
- [ ] Product PDFs hosted (Supabase `BE_Reading`, public) + `BE0N_READING_URL_*` env vars set on dev.
- [ ] `BACKEND_CHECKOUT_TEST_MODE=true` + a `sk_test_` key on dev.
- [ ] AWeber **transactional** Campaigns (confirmation + delivery) built on the `be-0N-*` tags; per-buyer reading link uses the offer's OWN custom field (not the shared `reading_url`).
- [ ] Test purchase (test mode) → tag lands · link field populated · both emails arrive.
- [ ] **PostHog** — run the `posthog-track-funnel` skill; prove `lander_view` / `checkout_initiated` / `purchase_completed` land; **CREATE the Funnel + revenue Trends insights.** (Firing events ≠ having insights.)

## 3 · Production (diverged branches → squashed cherry-pick, NOT a merge)
- [ ] Cherry-pick the feature onto a branch off `Production`, flip `readyForMoney:true`, resolve conflicts (keep Production's evolution; watch duplicate `case`/wiring).
- [ ] Re-run suites + typecheck **on the prod branch**; fix any "ships-dark" tripwire tests the flip invalidates.
- [ ] PR → `Production`; `git merge-tree` shows no conflicts.
- [ ] Prod env: `BE0N_READING_URL_*` · `VITE_BACKEND_CHECKOUT_LIVE=true` · `be_orders` columns present · delivery cron flag NOT set if delivery writes at purchase.
- [ ] Verify: one real purchase (own card) via a UTM link → emails + field + PostHog revenue → **refund + delete test contact.**

## 4 · Sales-email send (the part that sells it)
- [ ] Joel confirms the lists (default free + palm + tarot). ⛔ Never the customer list `6972552`.
- [ ] **Upload the sales photo to S3** (`host-be-asset.cjs`), public, **curl a 200**. *(04 gap: was 403.)*
- [ ] **UTM on every sales link — HTML and `.txt`** (`utm_campaign=be0N_<stem>`); the `c=` codes alone don't reach PostHog.
- [ ] **Cross-list buyer exclusion** seed-tested (the `be-0N-*` tag is on `6972552`, not the prospect list).
- [ ] Copy approved (Claude artifact: previews + tracked HTML/`.txt`).
- [ ] Built in AWeber + seed-tested (phone, images off, no first name) + scheduled. **No price in any email.**

## Tracking tools
- **PostHog** — clicks + revenue; fails silently; needs wiring on both sides + UTM + the insights.
- **AWeber** — sending + tags; one shared account (dev + prod).
- **Trackdesk** — affiliate attribution; **intentionally OFF for BE offers** (they sell via email, not affiliate clicks; adding it mis-credits affiliates).
