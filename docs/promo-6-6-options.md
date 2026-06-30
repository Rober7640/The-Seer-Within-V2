# 6/6 Promotion — Options Brief

**Product:** The Seer Within V2 (per-minute multi-persona chat)
**Goal:** Get warm non-payers back into chat for a short, urgent window so the system captures their struggles/desires (`user_memory`) and the existing follow-up engines convert them. **Not framed as "free"** — the whole point is to avoid tire-kickers.
**Status:** Options only. No implementation yet.

---

## How the relevant system works (context for whoever picks up this brief)

- **Credits = "coins."** 60 coins = 1 minute of chat. New signups get 180 coins (3 min) free.
- **Granting time** is easy: an admin grant endpoint credits coins and logs a tagged `credit_purchases` row, so any promo is fully trackable by tag.
- **"Has not paid"** is cleanly queryable: no `credit_purchases` row with `status='completed'` (excluding admin adjustments).
- **One-click re-entry already exists:** magic-link tokens drop a user straight into a specific persona's chat — no password.
- **Follow-up is automatic:** the moment someone chats, their concerns are extracted into `user_memory`. Verified-no-purchase drips (up to 13 emails) and top-up segment emails already run on a cron.
- **The one gap:** there is no generic "email a segment once" broadcast tool today. A one-off campaign send would need to be built.

---

## Lever 1 — How to deliver the "free time"

| Option | How it works | Pros | Cons | Build effort |
|---|---|---|---|---|
| **A. Per-user minute grant** | Credit each targeted user N promo coins, tagged | Scopes to who you email; trackable; reuses existing infra | Coins are permanent unless removed | Low |
| **B. Grant + deadline + sweep** | Same as A, plus a job zeroes unused promo coins after the window | True use-it-or-lose-it urgency; clean reset back into nurture | Needs a sweep job | Low–Medium |
| **C. True free-billing window** | A flag makes chat charge 0 coins for everyone during the window | Feels like a real event | Hard to scope to a segment; paid users + randoms ride free; touches billing path | Medium–High |
| **D. Deep-discount instead of free** | One-time cheap credit pack (existing welcome tier ~$2.99 / 160 coins) | A tiny paid step = highest-intent filter; zero tire-kickers | Smaller response; it's a sale, not a gift | Low |

> **Note:** Since the stated reason is *avoiding tire-kickers*, **D** filters them better than any wording can — a small paid step is the strongest filter. **B** is the best "feels-like-a-gift" option.

---

## Lever 2 — Who to target

| Segment | Definition | Size / intent | Note |
|---|---|---|---|
| **Engaged-but-not-paid** | ≥1 chat session, never purchased | Smaller, warmest | We already hold `user_memory` on them → best personalization |
| **All verified non-payers** | Verified email, never paid (incl. never-chatted) | Larger | Re-activates dormant signups too |
| **Recent non-payers only** | Above, signed up in last ~30–60 days | Fresher, lower unsubscribe risk | Best deliverability |
| **Include unverified** | Add never-verified signups | Largest, lowest quality | Bounce/spam risk — not advised |

All segments above are cleanly queryable today.

---

## Lever 3 — How they get back in

| Option | Friction | Status |
|---|---|---|
| **Magic link** (one-click into the persona's chat, 30-day, no password) | Lowest | Already built — recommended |
| Password login link | High (many forgot / are passwordless) | Exists |
| "Send me a login link" request flow | Medium | Exists |

---

## Lever 4 — Positioning angle (none say "free")

| Angle | The hook |
|---|---|
| **Reserved time** | "I set aside time for you this week." |
| **Unfinished reading** | "Your reading was left open — I want to finish it." |
| **6/6 occasion** | A one-time dated moment / event. |
| **Personal pull** | "Something in your chart kept surfacing — come sit with me." |

These combine freely.

---

## Lever 5 — The follow-up handoff (the actual goal)

Mostly **automatic** — little to choose, but worth knowing what fires:

- **Session summary** — the second they chat, their struggles/desires are extracted into `user_memory`. This is the data capture you want.
- **Verified-no-purchase drip** (up to 13 emails) — already running for these users.
- **Top-up segment emails** — after a sweep zeroes their balance, they fall into the `free_tier_dropoff` segment and get nurtured automatically.

> **Option:** lean entirely on existing drips (zero new email build), **or** add a dedicated post-promo sequence that references what they said on 6/6 (more work, more relevant).

---

## Lever 6 — Window shape

| Shape | Urgency | Risk |
|---|---|---|
| **24h flash (6/6 only)** | Highest | People miss the single day unless bookended with teaser + reminder |
| **6-day window (6/6–6/12)** | Moderate | Softer urgency, fewer missed |
| **48–72h** | Strong | Balanced |

---

## Lever 7 — How many emails

| Option | Trade-off |
|---|---|
| **1 (main only)** | Simplest; with a 24h flash, anyone not checking email that morning misses it |
| **2 (main + last-call)** | Middle ground |
| **3 (teaser 6/5 → main 6/6 AM → last-call 6/6 PM)** | Recommended for a flash; bookends catch the missers |

---

## The decisions that actually matter

Most levers are already-built and low-risk. Two genuinely strategic calls:

1. **Free grant vs. tiny paid step (Lever 1B vs 1D)** — this is the real tire-kicker dial, more than framing is.
2. **Window length vs. email count (Levers 6 + 7)** — a 24h flash *requires* the 3-email bookending to work.

---

## Build-effort summary

| Component | Already exists? |
|---|---|
| Tagged minute grant | Yes (admin grant infra) |
| Segment query (engaged / non-payer) | Yes (queryable) |
| Magic-link one-click re-entry | Yes |
| Automatic struggle/desire capture + drips | Yes |
| Sweep job (use-it-or-lose-it) | Needs building (small) |
| One-off broadcast email to a segment | Needs building (the main gap) |

---

*Prepared as an options brief — no work has been started.*
