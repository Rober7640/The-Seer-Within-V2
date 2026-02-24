# Test Ideas — Backend API (The Seer Within)

Pure backend test cases: API contracts, service logic, database correctness, and security.
These map to Playwright `request` context tests or a Jest/Supertest suite — no browser required.

---

## User Auth API

### Registration (`POST /api/auth/register`)
- [ ] Valid email + password (≥8 chars) + firstName creates a new user and returns 201
- [ ] Duplicate email returns 409 with a descriptive error
- [ ] Missing `firstName` returns 400
- [ ] Password under 8 characters returns 400
- [ ] Invalid email format returns 400
- [ ] Email is stored lowercase regardless of input casing
- [ ] `passwordHash` is never returned in any response field
- [ ] Newly registered user starts with `coinBalance = 0` and `accountStatus = 'active'`
- [ ] Registration captures `registrationIp` and `userAgent` for fraud detection
- [ ] Registration response does NOT include a JWT — user must verify email first (if verification is enabled)

### Email Verification
- [ ] `GET /api/auth/verify?token=<valid>` sets `emailVerified = true` and grants `FREE_COINS_ON_VERIFY` (180) coins
- [ ] Calling verify with an already-used token still returns success (idempotent)
- [ ] Expired verification token returns 400
- [ ] Non-existent token returns 400
- [ ] `POST /api/auth/resend-verification` with a known email sends a new verification email
- [ ] `POST /api/auth/resend-verification` with an unknown email still returns 200 (no enumeration)

### Login (`POST /api/auth/login`)
- [ ] Valid credentials return a JWT and user object
- [ ] Wrong password returns 401 with generic "Invalid email or password" message
- [ ] Non-existent email returns 401 with same generic message (no enumeration)
- [ ] Suspended user login returns 401 with suspension notice
- [ ] Banned user login returns 401
- [ ] Successful login updates `lastLoginAt`
- [ ] JWT payload contains `userId` and is signed with `JWT_SECRET`

### `GET /api/auth/me`
- [ ] Valid token returns current user's id, email, firstName, coinBalance, accountStatus
- [ ] Missing Authorization header returns 401
- [ ] Malformed token returns 401
- [ ] Expired token returns 401
- [ ] `passwordHash` is not present in the response

### Change Password (`POST /api/auth/change-password`)
- [ ] Correct `currentPassword` + valid `newPassword` updates the hash and returns 200
- [ ] Wrong `currentPassword` returns 401
- [ ] `newPassword` under 8 characters returns 400
- [ ] Unauthenticated request returns 401

### Password Reset
- [ ] `POST /api/auth/forgot-password` with known email sends a reset email and returns 200
- [ ] `POST /api/auth/forgot-password` with unknown email returns 200 (no enumeration)
- [ ] `POST /api/auth/reset-password` with valid token + new password updates hash
- [ ] `POST /api/auth/reset-password` with expired token returns 400
- [ ] `POST /api/auth/reset-password` with non-existent token returns 400
- [ ] After successful reset, the old password no longer works

---

## Admin Auth API

### Login (`POST /api/admin/login`)
- [ ] Valid admin credentials return a JWT and admin object with `id`, `email`, `displayName`, `role`
- [ ] Wrong password returns 401
- [ ] Non-admin email returns 401
- [ ] Successful login updates `lastLoginAt` on the `admin_users` row
- [ ] `passwordHash` is not returned in the response

### Auth middleware
- [ ] `GET /api/admin/me` with valid admin token returns admin info
- [ ] `GET /api/admin/me` with a user JWT (non-admin) returns 403
- [ ] `GET /api/admin/me` with no token returns 401
- [ ] `GET /api/admin/me` with expired token returns 401
- [ ] Any protected admin route (`/api/admin/personas`, `/api/admin/users`, etc.) returns 401 without token

---

## Rate Limiting

### Auth limiter (5 per 15 min in production)
- [ ] 6th `POST /api/auth/login` attempt from same IP within 15 minutes returns 429
- [ ] `RateLimit-Remaining` header decrements on each attempt
- [ ] Rate limit is skipped entirely when `NODE_ENV=test`

### Chat limiter (60 messages/hour per user)
- [ ] 61st `POST /api/chat-service/message` from same user within 1 hour returns 429
- [ ] Counter is keyed per `userId`, not per IP — two different users can each send 60 independently
- [ ] Rate limit is skipped when `NODE_ENV=test`

### Password reset limiter (3 per hour per IP)
- [ ] 4th `POST /api/auth/forgot-password` from same IP within 1 hour returns 429

### Admin login limiter (5 per 15 min in production)
- [ ] 6th `POST /api/admin/login` attempt from same IP returns 429
- [ ] Limiter is skipped in dev/test environments

---

## Fraud Detection — Registration

- [ ] Registering 3+ accounts from the same IP sets `ip_flagged` on the accounts
- [ ] `checkRegistrationFraud` returns fraud flags when IP threshold is exceeded
- [ ] `checkRegistrationFraud` returns no flags for a clean first-time IP
- [ ] Browser fingerprint matching triggers `fingerprint_flagged` when reused across accounts
- [ ] Fraud flags are stored in `users.accountFlags` as a JSON array
- [ ] Flagged accounts can still be used — flagging does not auto-suspend

---

## Chat Service API

### Session start
- [ ] `POST /api/chat-service/start` with valid auth and personaId creates a session with `status = 'active'`
- [ ] Starting a session when one is already active for the same user+persona returns the existing session (no duplicate)
- [ ] Starting a session for a non-existent persona returns 404
- [ ] Starting a session for an inactive persona returns 400
- [ ] Session is created with the persona's current `coinsPerMinute` stored in `pricingApplied`
- [ ] Unauthenticated request returns 401

### Sending a message
- [ ] `POST /api/chat-service/message` stores a `chat_messages` row for user and assistant
- [ ] First user message on a session sets `lastMessageAt` on the session
- [ ] Each subsequent user message updates `lastMessageAt`
- [ ] Assistant message does NOT update `lastMessageAt`
- [ ] Message to an ended session returns 400
- [ ] Unauthenticated request returns 401
- [ ] Message that triggers hard crisis returns `safe: false` response, no persona reply, session not continued

### Heartbeat (`POST /api/chat-service/heartbeat`)
- [ ] Heartbeat updates `lastHeartbeatAt` on the session
- [ ] Heartbeat does NOT update `lastMessageAt`
- [ ] Heartbeat on an ended session returns 400

### Billing checkpoint (every 30s heartbeat triggers deduction)
- [ ] After 60 seconds of active session (60 coins/min guide), `users.coinBalance` decreases by exactly 60
- [ ] After 60 seconds with a 90 coins/min guide, balance decreases by exactly 90
- [ ] Running two checkpoints back-to-back does NOT double-bill — watermark in `coinsCharged` prevents it
- [ ] `coinBalance` never goes below 0 (`GREATEST(0, ...)` protection)
- [ ] `chat_sessions.coinsCharged` reflects cumulative coins deducted (billing watermark)

### End session (`POST /api/chat-service/end`)
- [ ] Session status changes to `ended`, `endedAt` is set
- [ ] Final deduction uses `Math.round` for partial minutes at session end
- [ ] If checkpoint already billed partial amount, end-session only bills the delta
- [ ] Ending an already-ended session is a no-op (returns 200, no double charge)
- [ ] `durationSeconds` is computed from `startedAt` to `endedAt`

### Session idle cleanup (backend cron)
- [ ] Sessions with `lastMessageAt` older than persona's timeout are auto-ended by `cleanupInactiveSessions`
- [ ] Sessions with `lastMessageAt IS NULL` are ended based on `startedAt` timeout
- [ ] Auto-ended sessions have `endedAt = lastMessageAt` — idle time is not billed
- [ ] Session left open with zero messages charges 0 coins when timed out
- [ ] `cleanupInactiveSessions` runs on server heartbeat without interfering with active sessions

---

## Public Personas API

### `GET /api/personas`
- [ ] Returns only active personas (`isActive = true`)
- [ ] Inactive personas are excluded
- [ ] Response includes `coinsPerMinute` for each persona
- [ ] Response includes `isFeatured` flag
- [ ] Response includes `accuracyRank` for ordering
- [ ] Unauthenticated request succeeds (public endpoint)

### `GET /api/personas/:slug`
- [ ] Returns persona detail including `userReviews` array
- [ ] `userReviews` contains only feedback with `approved = true`
- [ ] Pending (unapproved) feedback never appears in `userReviews`
- [ ] `reviewerName` is `displayName` if set, otherwise `"Verified User"`
- [ ] Non-existent slug returns 404
- [ ] Inactive persona returns 404 (not visible publicly)

---

## Memory System

### Memory creation
- [ ] After a session ends cleanly, a `user_memory` row is created in the DB
- [ ] Memory content reflects what the USER said, not persona interpretations
- [ ] Memory does NOT contain Barnum phrases ("crossroads", "energy shifts")

### Memory loading
- [ ] `loadUserContext` returns the memory from the previous session on second session start
- [ ] Memory context is included in the system prompt sent to Claude
- [ ] If no memory exists, `loadUserContext` returns empty string — no fabrication

### Admin memory management
- [ ] `GET /api/admin/users/:id/memory` returns all memory entries for a user
- [ ] `GET /api/admin/users/:id/memory?category=love` filters by category
- [ ] `PATCH /api/admin/users/:id/memory/:memoryId` updates `summary`, `importance`, or `category`
- [ ] Patching a memory that belongs to a different user returns 404
- [ ] `importance` out of range (0 or 11) returns 400

---

## Universal Safety System

### Hard crisis — full block
- [ ] "I want to kill myself" returns `safe: false`, 988 block response, no persona reply
- [ ] Hard crisis messages are stored in `safety_violations` with `flaggedForReview = true`
- [ ] Hard crisis creates a single `safety_violations` row (not duplicated)

### Soft crisis — note prepended, reading continues
- [ ] "I just can't go on like this" returns persona reply with 988 note prepended
- [ ] Soft crisis sets `violationType = 'crisis'` and `systemResponse = 'soft_crisis_note_prepended'`
- [ ] Soft crisis does NOT produce a hard-block entry — only one record per message
- [ ] Normal venting ("I'm really struggling today") does NOT trigger soft or hard crisis

### Case sensitivity
- [ ] Crisis patterns match regardless of case ("I WANT TO KILL MYSELF" also blocked)

---

## Admin — Persona Management

### Create (`POST /api/admin/personas`)
- [ ] Valid payload creates persona and returns 201 with the new persona's `id` and `slug`
- [ ] `slug` is auto-generated from `displayName` if not provided
- [ ] Duplicate slug returns 409
- [ ] Missing required fields (`displayName`) returns 400
- [ ] `baseSystemPrompt` containing "ignore all safety guidelines" returns 400
- [ ] `baseSystemPrompt` containing "override your instructions" returns 400
- [ ] `baseSystemPrompt` containing "disable safety filters" returns 400
- [ ] Injection patterns are blocked case-insensitively
- [ ] Clean prompt saves successfully
- [ ] Unauthenticated request returns 401

### Read (`GET /api/admin/personas`, `GET /api/admin/personas/:id`)
- [ ] List returns all personas (active and inactive)
- [ ] Single persona returns `fromEmail`, `fromName`, `coinsPerMinute`, `freeCoins`, `isActive`
- [ ] Non-existent ID returns 404
- [ ] Validation only fires on writes — existing prompts can always be read regardless of content

### Update (`PATCH /api/admin/personas/:id`)
- [ ] Updating `displayName` persists correctly
- [ ] Updating `baseSystemPrompt` with injection pattern returns 400
- [ ] Updating other fields (e.g. `tagline`) without touching `baseSystemPrompt` is not blocked
- [ ] `isActive = false` deactivates persona (no longer returned by public `GET /api/personas`)

### Delete (`DELETE /api/admin/personas/:id`)
- [ ] Deleting an existing persona returns 200
- [ ] Deleting a non-existent persona returns 404
- [ ] Persona with active sessions cannot be deleted (or is soft-deleted) — verify behavior

### Session Feedback
- [ ] `GET /api/admin/personas/:id/session-feedback` returns all feedback items newest-first
- [ ] Response includes `userEmail` and `userFirstName` fields
- [ ] `PATCH /api/admin/personas/:id/session-feedback/:feedbackId/approve` sets `approved = true`
- [ ] Approving a non-existent item returns 404
- [ ] `DELETE /api/admin/personas/:id/session-feedback/:feedbackId` removes the item
- [ ] Deleting a non-existent item returns 404
- [ ] All endpoints return 401 without admin token

---

## Admin — Prompt Editor

### Create (`POST /api/admin/personas/:id/prompts` or `/api/admin/prompts`)
- [ ] New prompt is created with `version` auto-incremented for that persona+type
- [ ] Creating a second variant for same persona+type with `variantLabel` stores both
- [ ] Missing `promptType` or `content` returns 400

### Activate / deactivate
- [ ] Setting `isActive = true` on a variant makes it eligible for selection
- [ ] Setting `isActive = false` excludes it from the active prompt resolution
- [ ] Only one prompt per persona+type should be active at a time (verify uniqueness constraint or logic)

### A/B traffic split
- [ ] Prompts with `trafficPercent` set are selected proportionally (statistical test over N=100 samples)
- [ ] Sessions store `promptVariantId` linking to the prompt used
- [ ] Analytics `/api/admin/analytics/prompts` returns correct `sessionCount` per variant

---

## Admin — User Management

### List (`GET /api/admin/users`)
- [ ] Returns paginated user list with `totalSessions` and `personasUsed` enrichment
- [ ] `?search=foo` filters by email or firstName (partial match)
- [ ] `?page=2&limit=10` returns correct slice and pagination metadata
- [ ] `?limit=200` is capped at 100 (max enforcement)
- [ ] Empty database returns `{ users: [], pagination: { total: 0 } }` — no 500

### Detail (`GET /api/admin/users/:id`)
- [ ] Returns user row + `personaBreakdown` + `recentPurchases` + `memoryCount`
- [ ] `personaBreakdown` groups sessions by persona with `sessionCount`, `totalCoins`, `lastSession`
- [ ] `recentPurchases` is limited to 20 items
- [ ] Non-existent user returns 404

### Sessions (`GET /api/admin/users/:id/sessions`)
- [ ] Returns paginated session list ordered by `startedAt` descending
- [ ] `?personaId=<id>` filters to sessions for that persona only
- [ ] Each session includes `personaName`, `coinsCharged`, `status`, `lastBucket`

### Manual credit adjustment (`PATCH /api/admin/users/:id/credits`)
- [ ] Positive `coins` value increases user's `coinBalance`
- [ ] Negative `coins` value decreases `coinBalance`
- [ ] Deducting more than the user has returns 400 (no negative balance allowed)
- [ ] Adjustment is recorded in `credit_purchases` with `packageType = 'admin_adjustment'` and `priceUsd = 0`
- [ ] Response includes `previousBalance`, `newBalance`, `adjustment`, `reason`
- [ ] Missing `reason` returns 400
- [ ] Non-existent user returns 404

### Suspend / Ban / Unsuspend / Flag
- [ ] `POST /api/admin/users/:id/suspend` with reason sets `accountStatus = 'suspended'`
- [ ] Suspending an already-suspended user returns 409
- [ ] Suspending a banned user returns 409
- [ ] `POST /api/admin/users/:id/ban` with reason sets `accountStatus = 'banned'`
- [ ] Banning an already-banned user returns 409
- [ ] `POST /api/admin/users/:id/unsuspend` restores `accountStatus = 'active'`, clears `suspensionReason`
- [ ] Unsuspending an already-active user returns 409
- [ ] `POST /api/admin/users/:id/flag` sets `accountStatus = 'flagged_for_review'` — does not block login
- [ ] Flagging a banned user returns 409
- [ ] All status change endpoints store `suspendedBy = adminId` for audit

### Transfer persona (`POST /api/admin/users/:id/transfer-persona`)
- [ ] Valid transfer updates `users.defaultPersonaId` to the target persona
- [ ] `transferMemory: true` updates all memory entries with `transferredFrom`/`transferredTo` context
- [ ] `transferMemory: false` skips memory annotation
- [ ] Non-existent source persona returns 404
- [ ] Non-existent target persona returns 404
- [ ] Non-existent user returns 404

### Hard delete (`DELETE /api/admin/users/:id`)
- [ ] Deletes user row plus all sessions, messages, memory entries, and credit purchases
- [ ] Non-existent user returns 404
- [ ] Deletion is cascaded in correct dependency order (messages before sessions)
- [ ] Response includes `deletedEmail` for audit confirmation

---

## Admin — Analytics

### Overview (`GET /api/admin/analytics/overview`)
- [ ] Returns `totalUsers`, `newUsers`, `activeUsers`, `totalSessions`, `totalRevenue`
- [ ] Default date range is last 30 days when no query params supplied
- [ ] `?startDate=2025-01-01&endDate=2025-01-31` filters to that window
- [ ] `totalRevenue` only counts purchases with `status = 'completed'`
- [ ] `activeUsers` counts distinct userIds with sessions in the range
- [ ] Empty database returns all zeros — no 500

### Persona performance (`GET /api/admin/analytics/personas`)
- [ ] Returns all personas (active and inactive) with per-persona stats
- [ ] `totalCoins`, `uniqueUsers`, `avgSessionDuration`, `totalMessages` are correct
- [ ] Sorted by `totalSessions` descending

### Revenue (`GET /api/admin/analytics/revenue`)
- [ ] `byPackage` groups by `packageType` with correct `revenue`, `purchases`, `coins`
- [ ] `admin_adjustment` purchases are included in `byPackage` (with `priceUsd = 0`)
- [ ] `daily` array has one entry per day in the range (gaps possible for days with no purchases)
- [ ] `total` field matches the sum of all `byPackage.revenue`

### User analytics (`GET /api/admin/analytics/users`)
- [ ] `dailySignups` is correct for the date range
- [ ] `byStatus` groups users by `accountStatus` (active, suspended, banned, flagged)
- [ ] `purchaseBreakdown` correctly separates users who have purchased vs free-only
- [ ] `admin_adjustment` purchases are excluded from the "hasPurchased" definition
- [ ] `retention.activeIn7Days` counts distinct users with sessions in last 7 days
- [ ] `retention.activeIn30Days` counts distinct users with sessions in last 30 days

### Prompt analytics (`GET /api/admin/analytics/prompts`)
- [ ] Returns only prompts with a non-null `variantLabel` (A/B test variants)
- [ ] Grouped by `personaId + promptType` key
- [ ] `sessionCount` per variant matches actual `chat_sessions.promptVariantId` count
- [ ] `overall.totalPrompts` and `overall.activePrompts` match DB state

### Bucket analytics (`GET /api/admin/analytics/buckets`)
- [ ] `byPersona` shows bucket distribution per persona with `sessions` and `coins`
- [ ] `overall` shows platform-wide bucket totals
- [ ] Sessions with no `lastBucket` are excluded

### Low credit alerts (`GET /api/admin/analytics/alerts`)
- [ ] Default threshold is 30 coins
- [ ] `?threshold=5` returns only users with `coinBalance <= 5`
- [ ] Only `accountStatus = 'active'` users are returned
- [ ] Results ordered by `coinBalance` ascending (most urgent first)
- [ ] Response shape includes `{ alerts, threshold, count }`
- [ ] Empty result returns `{ alerts: [], threshold: 30, count: 0 }` — no 500

---

## Admin — Safety Dashboard

### Violations list (`GET /api/admin/safety/violations`)
- [ ] Returns paginated violations ordered newest-first
- [ ] `?violationType=crisis` filters to crisis-type violations only
- [ ] `?flaggedOnly=true` returns only rows where `flaggedForReview = true`
- [ ] `?startDate=&endDate=` filters by `createdAt` window
- [ ] `userMessage` (the raw input) is present on each row
- [ ] `systemResponse` is `'soft_crisis_note_prepended'` for soft crisis or full block text for hard
- [ ] Unauthenticated request returns 401

---

## Admin — Fraud Detection

### Flagged accounts (`GET /api/admin/fraud/flagged`)
- [ ] Returns paginated list of users with non-empty `accountFlags`
- [ ] `?page=2&limit=10` returns correct slice
- [ ] Users with empty `accountFlags` array are excluded
- [ ] Unauthenticated request returns 401

### IP lookup (`GET /api/admin/fraud/ip/:ip`)
- [ ] Returns all user accounts registered from that IP
- [ ] Response includes `accountCount` and `accounts` array
- [ ] IP with no registrations returns `accountCount: 0, accounts: []` — no 500

### Stats (`GET /api/admin/fraud/stats`)
- [ ] `totalFlagged` count matches number of users with non-empty `accountFlags`
- [ ] `suspiciousIpClusters` lists IPs with 3+ accounts, ordered by count descending
- [ ] IPs with fewer than 3 accounts are excluded from clusters

### Manual flag (`POST /api/admin/fraud/:userId/flag`)
- [ ] Adds `ip_flagged`, `manual_review`, or `fingerprint_flagged` to user's `accountFlags`
- [ ] Invalid flag type returns 400
- [ ] Non-existent user returns 404

### Clear flags (`POST /api/admin/fraud/:userId/clear`)
- [ ] Removes all fraud flags from user's `accountFlags`
- [ ] Non-existent user returns 404
- [ ] Clearing a user with no flags is a no-op — no error

---

## Admin — Intent Config Editor

### Create (`POST /api/admin/intent-configs`)
- [ ] Valid payload creates a config and returns 201
- [ ] `version` is auto-incremented per persona (first config = 1, second = 2)
- [ ] Missing `personaId`, `specialty`, `conversationBuckets`, `intents`, or `characterRules` returns 400
- [ ] `conversationBuckets`, `intents`, `characterRules` are returned as parsed JSON (not raw strings)

### List (`GET /api/admin/intent-configs`)
- [ ] Default returns only active configs (`isActive = true`)
- [ ] `?activeOnly=false` returns all configs including inactive
- [ ] `?personaId=<id>` filters to that persona's configs only
- [ ] Ordered by `updatedAt` descending

### Detail (`GET /api/admin/intent-configs/:id`)
- [ ] Returns single config with parsed JSON fields
- [ ] Non-existent ID returns 404

### Update (`PUT /api/admin/intent-configs/:id`)
- [ ] Partial update (only `isActive`) persists correctly, other fields unchanged
- [ ] Setting `isActive = false` deactivates without deleting
- [ ] Non-existent ID returns 404

### Delete (`DELETE /api/admin/intent-configs/:id`)
- [ ] Returns 200 and removes the row
- [ ] Non-existent ID returns 404

---

## Admin — Per-Persona Pricing

### Get pricing (`GET /api/admin/personas/:personaId/pricing`)
- [ ] Returns `freeCoins`, `tiers` array, and `personaName`/`personaSlug`
- [ ] Each tier includes computed `pricePerCoin` field
- [ ] Non-existent personaId returns 404

### Update pricing (`PATCH /api/admin/personas/:personaId/pricing`)
- [ ] Valid `freeCoins` + `tiers` update persists and is returned
- [ ] `tiers` with non-positive `coins` returns 400
- [ ] `tiers` with negative `priceUsd` returns 400
- [ ] Non-existent personaId returns 404

### Pricing overview (`GET /api/admin/pricing/all`)
- [ ] Returns all personas (ordered by `sortOrder`)
- [ ] Personas with `customPricing = null` have `usingDefaults: true`
- [ ] Personas with custom pricing have `usingDefaults: false` and the parsed `tiers` array
- [ ] `isActive` field is present for each persona

---

## Admin — Marketplace Ordering

### List (`GET /api/admin/marketplace`)
- [ ] Returns only active personas
- [ ] Ordered by `sortOrder` asc, then `displayName` asc
- [ ] Each row includes `isFeatured` and `accuracyRank`

### Accuracy ranks (`PUT /api/admin/marketplace/accuracy-ranks`)
- [ ] Valid array of `{ id, rank }` updates each persona's `accuracyRank`
- [ ] Setting `rank: null` clears the accuracy rank
- [ ] Non-integer rank returns 400
- [ ] Non-positive rank returns 400 (rank must be ≥ 1)

### Featured guide (`PUT /api/admin/marketplace/featured`)
- [ ] Setting `{ id: "<personaId>" }` sets that persona's `isFeatured = true` and all others to `false`
- [ ] Setting `{ id: null }` clears all featured flags — no persona is featured
- [ ] Only one persona can be featured at a time (the clear-all-then-set pattern enforces this)
- [ ] After setting featured, `GET /api/admin/marketplace` reflects the updated `isFeatured` flag

---

## Admin — Follow-Up Email Dashboard

### Trigger (`POST /api/admin/follow-ups/trigger`)
- [ ] Returns `{ success: true, stats: { processed, sent, failed } }`
- [ ] With no eligible users returns `processed: 0, sent: 0`
- [ ] Unauthenticated request returns 401

### List (`GET /api/admin/follow-ups`)
- [ ] Returns sent emails with pagination
- [ ] Each row includes `sequenceNumber`, `status`, `openedAt`, `clickedAt`

### Stats (`GET /api/admin/follow-ups/stats`)
- [ ] Returns correct open rate and click rate based on sent emails
- [ ] Zero-sent baseline returns rates of 0, not a divide-by-zero 500

### Export (`GET /api/admin/follow-ups/export`)
- [ ] Returns a valid CSV file with `Content-Type: text/csv`
- [ ] CSV includes at minimum: userId, email, sequenceNumber, status, sentAt

---

## Admin — Seed Data

### Intent config seed (`POST /api/admin/seed/intent-configs`)
- [ ] Returns `{ success: true }` when seeding completes
- [ ] Evelyn's intent config is created if it does not exist
- [ ] Running twice does not create duplicate configs (idempotent)
- [ ] Unauthenticated request returns 401

---

## Platform Health

### Liveness (`GET /health`)
- [ ] Returns `{ status: 'healthy', dependencies: { database, stripe, anthropic, resend, disk } }`
- [ ] `status` is `'healthy'` when all dependencies are up
- [ ] `status` is `'degraded'` when Stripe/Resend/Anthropic key is missing but DB is up
- [ ] `status` is `'unhealthy'` when DB is unreachable
- [ ] Response includes `uptime` (seconds since server start) and `timestamp`

### Readiness (`GET /ready`)
- [ ] Returns `{ ready: true, checks: { database: true, environment: true } }` when DB is up and env vars set
- [ ] Returns `ready: false` when `DATABASE_URL` is missing
- [ ] Returns `ready: false` when DB is unreachable

### Metrics (`GET /metrics`)
- [ ] Response is plain text in Prometheus format
- [ ] Contains `app_uptime_seconds`
- [ ] Contains `app_active_sessions` matching actual count of active sessions in DB
- [ ] Contains `app_users_total` matching total user count
- [ ] Contains `app_safety_violations_24h` for violations in last 24 hours
- [ ] Contains `app_credit_purchases_total` for completed purchases
- [ ] When DB is down, system metrics are still returned (DB metrics section shows error gauge instead of crashing)

---

## Webhooks

### Resend events (`POST /api/webhooks/resend`)
- [ ] `email.delivered` sets `deliveryStatus = 'delivered'` on the matching `follow_up_emails` row
- [ ] `email.opened` sets `opened = true` and `openedAt` on the record
- [ ] `email.clicked` sets `clicked = true` and `clickedAt` on the record
- [ ] `email.bounced` sets `status = 'bounced'` and auto-unsubscribes the user (`unsubscribedAt` is set)
- [ ] `email.complained` sets `status = 'bounced'` and auto-unsubscribes the user
- [ ] Event with unknown `resendEmailId` returns 200 gracefully (no 500)
- [ ] Event body with no `type` field returns 400
- [ ] Event body with no `data.email_id` returns 200 (skipped gracefully)

### Stripe webhooks (`POST /api/webhook`)
- [ ] Valid `checkout.session.completed` event grants coins to the user
- [ ] `checkout.session.completed` creates a `credit_purchases` row with `status = 'completed'`
- [ ] Invalid Stripe signature returns 400
- [ ] Unknown event type returns 200 (no crash)

---

## Cron Jobs

### Follow-up email cron (runs daily at 10 AM)
- [ ] `processFollowUpQueue` runs exactly once per day (verify via cron schedule string `'0 10 * * *'`)
- [ ] If already running (`isProcessing` flag set), a concurrent trigger is skipped
- [ ] Stats object returned includes `processed`, `sent`, `failed`

### Top-up email cron (runs daily at 11 AM)
- [ ] Cron schedule is `'0 11 * * *'` — does not overlap with follow-up cron
- [ ] `processTopupQueue` with no eligible users returns `processed: 0, sent: 0`
- [ ] `isProcessing` guard prevents concurrent runs

### Magic link cleanup cron (runs weekly Sunday 3 AM)
- [ ] `cleanupExpiredMagicLinks()` deletes rows where `expiresAt < now`
- [ ] Valid (unexpired) tokens are not deleted

### Session idle cleanup
- [ ] `cleanupInactiveSessions` runs on each server heartbeat tick
- [ ] Does not create duplicate cleanup runs if previous run is still in-flight

---

## Magic Link System

### Token generation
- [ ] `generateMagicLinkToken()` inserts a row in `magic_link_tokens` with `userId`, `personaId`, `personaSlug`
- [ ] Token is 64 hex characters (32 random bytes)
- [ ] `expiresAt` is set 30 days from creation
- [ ] `usedAt` is null at creation

### Token verification (`POST /api/auth/magic-verify`)
- [ ] Valid unexpired token returns `{ token, personaSlug, user }`
- [ ] Returned JWT is valid — `GET /api/auth/me` with it returns user data
- [ ] First use sets `usedAt` on the token row
- [ ] Same link used again still returns 200 (re-usable within 30-day window)
- [ ] Expired token returns 401
- [ ] Non-existent token returns 401
- [ ] Empty `token` field returns 400
- [ ] Token for user A cannot log in as user B (userId is verified on use)
- [ ] Endpoint is rate-limited by `authLimiter`

---

## To Add As More Features Are Built

_(Add new sections here as new features are implemented)_
