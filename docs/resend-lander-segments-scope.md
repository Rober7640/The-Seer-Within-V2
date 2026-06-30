# Scope: Auto-populate per-lander Resend segments

**Created:** 2026-06-26 · **Status:** PLAN ONLY — not built, awaiting go-ahead (target: Monday 2026-06-29)

**Goal:** Make per-lander broadcasts self-serve for the team by automatically adding each
lead to a Resend segment matching its `lander` value — so segments fill themselves and the
team just picks a segment and sends.

**Background / why this approach:** Resend's segments in our account are **manual groups, not
property-filtered** — there is no "filter Segment by `lander = X`" feature in our version
(confirmed via API: a segment object is just `{id, name, created_at}`, no conditions field; the
dashboard Contacts view filters only by subscription + email/name, not custom properties). So
the original dashboard-filter plan does not work. Instead we proved the supported path
end-to-end on the live account: tag contact → add to a segment via API → broadcast targeted at
that segment → delivered to the right inbox (not spam). This scope turns that manual proof into
automatic, gated production code.

**Proof already done (2026-06-26, live account):**
- `POST https://api.resend.com/segments/{segId}/contacts { email }` → 201, segment 0→1 member
  (note: requires `email`; `contact_id` returns 422).
- `POST /broadcasts { name, audience_id:<segId>, from, subject, html }` → `POST /broadcasts/{id}/send`
  → status queued→sent; landed in INBOX from `The Seer Within <hi@theseerwithin.com>` (verified
  domain `theseerwithin.com`).
- Guarantee is logical: a broadcast's recipients == the segment's members, and we proved we
  control membership.

---

## 1. One-time dashboard setup (no code)
Create 6 segments in Resend and copy their IDs:
`lander-homepage`, `lander-fb`, `lander-fb2`, `lander-gdn`, `lander-fb-palm`, `lander-soulmate`

## 2. Env vars (Railway dev + prod)
Add 6, mirroring the existing `AWEBER_LIST_ID_*` pattern:
`RESEND_SEGMENT_ID_HOMEPAGE / _FB / _FB2 / _GDN / _FB_PALM / _SOULMATE`
- If a lander's var is unset, that lander silently skips the segment step (behavior identical
  to today — fully backward compatible).

## 3. Code change — single file: `server/lib/resendAudience.ts`
- Add a small `landerSegmentId(lander)` resolver mapping the lander string → its env var
  (handle `fb-palm` → `FB_PALM`).
- Inside the existing `addContactToResendAudience()`, **after** the current `contacts.create`
  (audience sync stays exactly as-is), add **one** fire-and-forget call to add the contact to
  its lander segment.
- **Recommended mechanic:** the **raw REST call already proven** —
  `POST https://api.resend.com/segments/{segId}/contacts { email }`.
  - Why REST not SDK: installed Resend SDK is **v6.12.3**; `contacts.segments.add()` may
    post-date it. Using the proven REST endpoint (via `fetch`) sidesteps SDK-version risk and
    needs no dependency bump. (Alternative: confirm the SDK exposes the method and use it — but
    REST is the safe default.)
- **Idempotent + robust:** `segments/{id}/contacts` by `email` works for both brand-new and
  already-existing contacts, so it covers the "already in audience" case that `contacts.create`
  skips.
- **Gating/safety:** only runs if that lander's segment ID is configured; non-blocking,
  `.catch`, never throws. When unset → byte-identical to current behavior.

**No call-site changes** — both `/api/lead` and `/api/soulmate/lead` already call
`addContactToResendAudience(...)` with `lander`, so soulmate is covered automatically.

## 4. What is NOT touched
No auth, payment, webhook, AWeber, or drip code. No change to the existing audience sync. Pure
additive write.

## 5. Test plan (dev first)
1. Create the 6 segments + set the 6 env vars on dev.
2. Run one test lead per lander → confirm the contact lands in **its** segment (0→1) and **not**
   the others.
3. Confirm "unset env" path = unchanged (no segment write).
4. `tsc` (expect 48 == 48), `vitest`.
5. Optional: one real test broadcast to a populated segment (as already proven).
6. Then merge dev → Production + set the same 6 env vars on prod.

## 6. Known limits to state up front
- **No backfill** — only leads *after* deploy land in segments. (Optional separate one-time
  backfill script could read each existing contact's `lander` and assign it — doable but extra
  work; the bulk list API does not expose `lander`, so it would be per-contact lookups.)
- **First-touch** — a person who hit two landers sits only in their first lander's segment (same
  as existing Resend `lander`-property behavior: `resend.contacts.create` on an already-existing
  email is a no-op and does not update properties).

## 7. Effort
Small: ~1–2 hrs code + the dashboard/env setup + dev verification. Roughly a half-day end-to-end
including prod rollout.

## 8. Risk
Low — additive, gated, non-blocking, single file, mechanism already proven on the live account.
Worst case if a segment write fails: that lead just is not in its segment; the funnel and audience
sync are unaffected.

---

## Team runbook (after segments are populated) — how to send a lander-specific broadcast
Dashboard-only, no code:
1. Resend → **Broadcasts → Create Broadcast**.
2. **Audience/Segment:** select the target lander segment, e.g. `lander-fb`. *(This step is the targeting.)*
3. **Sanity-check the recipient count** Resend shows — it should match that segment's size. If it
   says "all contacts" or a number far bigger than expected, stop — wrong segment selected.
4. **From:** a verified-domain sender — `The Seer Within <hi@theseerwithin.com>` (or a persona
   address like `evelyn@theseerwithin.com`).
5. **Subject + content:** write the email (or start from a Template); optional personalization tokens.
6. **Send a test to yourself first** (the "Send test email" option) — confirm rendering + links.
7. **Send now** or **Schedule**.
8. **Verify after:** Broadcasts list shows status `sent`; **Metrics** shows opens/clicks.

**Golden rule:** lander targeting is controlled entirely by which segment is picked in Step 2 —
always confirm the segment name + recipient count before sending.

## Test artifacts to clean up (from the 2026-06-26 proof)
- Resend segment `test-lander-fbpalm` (id `e9af8b28-2f31-4796-848d-ef39d537b5c1`), now has 1 member.
- Sent test broadcast `c267762b-e538-43e0-a9b9-2e7ac602379d`.
- Test contacts/accounts: `swapnil...+test1/+test2/+soulmate1`, `lewis@altiuspublishing.com`
  (across shared prod DB + Resend + AWeber).
