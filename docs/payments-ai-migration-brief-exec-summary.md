# The Seer Within — Payment Migration Brief (Exec Summary)

**Merchant:** Celesora — *The Seer Within* (www.theseerwithin.com) · **Contact:** Joel — joel.chue@altiuspublishing.com · **June 2026**

**The ask:** Migrate our card processing from Stripe to payments.ai for our core sales funnel.

---

**What we are.** An AI-powered spiritual & wellness entertainment brand. Customers go through a personalized interactive reading, then buy a digital reading plus physical wellness products (ritual kit, manifestation bracelet). One-time purchases only — **no subscriptions.**

**What we sell.** Reading **$35** (downsell $25) → Upsell 1 Protection Ritual Kit **$47** → Upsell 2 Manifestation Bracelet **$47** ($30 downsell). Digital delivered instantly; physical goods shipped.

**Sales flow.** Main purchase via **hosted checkout (redirect)**, which **vaults the card**; the two upsells are charged **one-click, same session, minutes later** — no card re-entry.

**Numbers.**

| Metric | Value |
|---|---|
| Volume | ~**$5,000/day** (~$150K/mo, ~$1.8M/yr run-rate) |
| Transactions | ~90/day (~2,700/mo) · **AOV $55** |
| Chargebacks | **< 0.2%** · Refunds **< 0.5%** |
| Geography | 70% USA · 20% UK/AU/NZ/IE · 10% WW · **USD only** |
| Projection | ~$5K/day steady, room to scale |

**Stack.** React + Node/Express, Supabase (Postgres), Anthropic Claude. Payments today on Stripe (hosted Checkout + Payment Intents + vaulted cards + signed webhooks). PCI scope SAQ-A — we never touch raw card data.

**The one capability that matters.** ✅ **Off-session, merchant-initiated charges (MIT)** on a stored card — confirm immediately, customer not present — plus clean decline/3DS reasons so we can fall back to a hosted checkout. This powers our one-click upsells. If payments.ai supports it, the rest is routine.

**Migration is low-risk.** The integration is one server module + a webhook handler + a client redirect. And because upsells are **same-session**, we **don't** need to bulk-migrate existing vaulted cards — new traffic simply vaults on payments.ai. That removes the hardest part of most processor migrations.

**Three questions for you:** (1) Do you support off-session MIT with immediate confirm? (2) Webhook signing + idempotency model? (3) Underwriting/MCC + docs needed for a Singapore entity (US entity in progress)?

*Full technical & risk brief available on request.*
