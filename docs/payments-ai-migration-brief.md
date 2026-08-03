# The Seer Within — Payment Processing Overview & Migration Brief

**Prepared for:** payments.ai (technical & underwriting review)
**Merchant:** Celesora — *The Seer Within* (www.theseerwithin.com)
**Contact:** Joel — joel.chue@altiuspublishing.com
**Date:** June 2026
**Purpose:** Give your team what's needed to (a) assess fit/risk and (b) scope a migration of our card processing from Stripe to payments.ai.

---

## 1. Business Overview

The Seer Within is an AI-powered spiritual & wellness entertainment brand. Customers engage in a personalized, interactive reading experience and can then purchase a digital reading plus related physical wellness products (ritual kits, manifestation jewelry).

| | |
|---|---|
| **Legal entity** | Celesora — currently a **Singapore-registered company**; **US entity (USA) being established** |
| **Website** | www.theseerwithin.com |
| **Time processing (Stripe)** | ~5 months (live since ~Jan 2026) |
| **Business model** | One-time purchases — digital reading + physical-goods upsells. **No subscriptions / no recurring billing.** |
| **Settlement currency** | USD only |

---

## 2. What We Sell

| Product | Type | Price |
|---|---|---|
| Personalized reading (main offer) | Digital service | **$35** (or **$25** downsell) |
| Protection Ritual Kit (incl. volcanic/black lava stone) — Upsell 1 | Physical good (shipped) | **$47** |
| Manifestation Bracelet — Upsell 2 | Physical good (shipped) | **$47** (or **$30** downsell) |

Digital readings are delivered instantly; physical products are fulfilled and shipped. A published refund policy is in place (www.theseerwithin.com/refund).

---

## 3. Sales Flow / Customer Journey

A single guided funnel with a main purchase followed by two one-click upsells:

1. **Reading experience** → customer interacts and enters email (lead captured).
2. **Main offer ($35 / $25 downsell)** → **hosted checkout (redirect)**. Card is **securely vaulted at this step** for use later in the same session.
3. **Upsell 1 — Protection Ritual ($47)** → presented immediately after purchase. **One-click charge to the card already on file** (no re-entry). Shipping address collected.
4. **Upsell 2 — Manifestation Bracelet ($47 / $30 downsell)** → same **one-click** mechanism; shipping reused or collected.
5. **Confirmation / fulfillment.**

> **Key characteristic:** the upsells happen **within the same session, minutes after the main purchase**. The stored card is used short-term, not across days/weeks. (This materially simplifies migration — see §8.)

---

## 4. Transaction & Risk Profile

| Metric | Value |
|---|---|
| **Daily volume** | ~**$5,000 USD/day** |
| **Monthly volume** | ~**$150,000 USD/month** (~$1.8M annualized run-rate) |
| **Transactions** | ~**90/day** (~2,700/month) |
| **Average order value (AOV)** | **$55** |
| **Chargeback / dispute rate** | **< 0.2%** |
| **Refund rate** | **< 0.5%** |
| **Projected volume (next 6–12 mo)** | ~**$5,000/day** steady, with headroom to scale |
| **Geography** | **70% USA**, **20% UK / AU / NZ / Ireland**, **10% rest of world** |
| **Payment types** | One-time only; card-present-not-required (card-on-file 1-click for upsells) |

Both dispute and refund rates are comfortably within normal card-network thresholds.

---

## 5. Current Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (SPA) |
| Backend | Node.js + Express (RESTful API under `/api/*`) |
| Database | Supabase (PostgreSQL) via Drizzle ORM |
| AI | Anthropic Claude |
| **Payments (today)** | **Stripe** — Node SDK v20 (server) + Stripe.js (client) |
| Webhooks | HMAC-signed, raw-body signature verification |

---

## 6. Current Stripe Integration (primitives we rely on)

This is the surface payments.ai would need to map to. Listed in order of migration importance:

1. **Hosted Checkout (redirect) for the first purchase** — `mode: payment`, one-time. PCI scope kept minimal (we never touch raw card data; SAQ-A).
2. **Card vaulting at first purchase** — Stripe `setup_future_usage: "off_session"` saves the card against a Customer.
3. **Off-session, merchant-initiated charges (MIT) for upsells** — `off_session: true, confirm: true` charges the vaulted card with no customer interaction. **This is the critical capability.**
4. **Graceful decline / SCA fallback** — if the off-session charge requires authentication or is declined (`requires_action`, `card_declined`, `authentication_required`), we automatically fall back to a hosted checkout so the sale isn't lost.
5. **Customer objects keyed by email** (created/looked-up per buyer).
6. **Webhooks** — we consume payment-success events (both hosted-checkout completion and API-charge success), signature-verified, idempotent.
7. **Transaction metadata pass-through** — we attach tracking identifiers (Facebook CAPI, Google Ads, affiliate, product analytics) to each transaction and read them back off the webhook for attribution. **Metadata must survive round-trip.**
8. **Shipping address collection** on hosted checkout for physical-goods upsells; card geographies above.

**Not used today** (so not required from payments.ai): subscriptions/recurring, Stripe Prices/Products (we pass amounts inline), and programmatic refunds (handled manually in dashboard today — an API would be a nice-to-have).

---

## 7. What We Need From payments.ai

A capability checklist for your team to confirm:

- [ ] **Hosted/redirect checkout** for first purchase (SAQ-A PCI scope on our side).
- [ ] **Card-on-file vaulting** at first purchase.
- [ ] ✅ **Off-session merchant-initiated transactions (MIT)** — charge a stored card, customer not present, confirm immediately. *(Make-or-break item.)*
- [ ] **Clear decline reasons + 3DS/SCA handling**, so we can fall back to an authenticated checkout when an off-session charge needs it.
- [ ] **Customer object** model (lookup/create by email).
- [ ] **Signed, idempotent webhooks** for payment success across both hosted and API charges.
- [ ] **Custom metadata** on transactions, retrievable via API and webhook.
- [ ] **One-time USD charges**, international card acceptance (US + UK/AU/NZ/IE + WW), shipping-address collection.
- [ ] **Refund API** (we'd move off manual dashboard refunds).
- [ ] **Sandbox/test environment**, idempotency keys, and a **retrieve-payment-by-ID** endpoint for reconciliation.

---

## 8. Migration Scope, Effort & Open Questions

**In scope for this brief:** the core funnel — main offer ($35/$25) + the two one-click upsells. Other payment surfaces in our platform (a secondary "Soulmate" funnel, in-app chat credits, a PayPal path, and a Stripe Connect marketplace) are **out of scope here** and can be scoped separately if needed.

**Expected effort:** modest. The integration is concentrated in a single server payment module + one webhook handler + a client redirect. The only non-trivial piece to replicate is the **off-session MIT + decline-to-hosted-fallback** logic.

**Migration advantage — no card-vault migration needed:** because upsells are charged **within the same session** as the main purchase, we do **not** depend on a long-lived stored-card vault across sessions. That means we do **not** need to bulk-migrate existing Stripe-vaulted cards — new traffic simply vaults on payments.ai going forward. This removes the riskiest/most regulated part of most processor migrations.

**Open questions for payments.ai:**
1. Do you support **off-session MIT** on stored cards with immediate confirmation? Any constraints/exemptions?
2. **PCI scope** of your hosted checkout — is it SAQ-A for us?
3. **3DS/SCA** behavior on first purchase, and exemption handling for follow-on MIT charges.
4. **Webhook** event catalog, signing scheme, and idempotency guarantees.
5. **Settlement & payouts** — USD payout, schedule, supported card geographies (incl. UK/AU/NZ/IE + WW).
6. **Underwriting** requirements/MCC for AI spiritual-wellness digital services + physical goods, and any documentation you need from a Singapore entity (with US entity in progress).
7. **Sandbox** availability and a recommended **cutover plan** (run in parallel vs. hard switch).
