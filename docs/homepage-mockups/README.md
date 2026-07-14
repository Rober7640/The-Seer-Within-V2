# Homepage mockups — Facebook compliance (for approval BEFORE implementation)

Joel's own step 3, after his first design pass got rejected:
> *"design is nt what i want. can we do **mockup htmls for preview before implementation**.
> use /frontend-design to help you too."*

So: **nothing is implemented yet.** These are throwaway HTML files. Open them in a browser.

| File | What it is |
|---|---|
| `home.html` | The NEW standalone homepage (proposed URL **`/home`**) |
| `product-black-lava.html` | One product page (the other two are identical in structure) |
| `_preview-*.png` | Rendered previews, if you don't want to open the HTML |

**The existing lander at `/` is NOT touched.** Per Lewis: separate page, separate URL, no changes
to `LandingPage.tsx` or any funnel lander (`/fb-palm`, `/evelyn`, `/gdn`).

---

## How each Facebook requirement is met

FB's five requirements (from Claude's readback of Joel's screenshot in the 7/13 recording):

| # | Requirement | Where it lives |
|---|---|---|
| 1 | Header with basic parts (Home, About Us, Catalog, Contact) | Sticky header, both pages |
| 2 | Footer with full info — website, email, **full address, telephone** | Footer, both pages — ⚠️ **address + phone are TODO** |
| 3 | A real `xxxx@domain` email displayed | `hi@theseerwithin.com`, header/contact/footer |
| 4 | 3+ products, clickable, each opening its own page | Catalog section → `/products/:slug` |
| 5 | Product page with an **ACTIVE** BUY button + price shown | "Buy Now — $99.00", active |

**Requirement 5 is the crux.** wishamiracle's own pages show **"Sold out"** — that *is* the
violation. Ours is a live button that opens Stripe Checkout on our site.

---

## ✅ Resolved (Lewis, 2026-07-14)

- **Theme** — restyled to match the LIVE root lander: navy starfield page, **near-white card
  surfaces**, **purple** (`#7C3AED`) primary buttons, gold reserved for the wordmark. The first
  pass was all-dark with gold CTAs; that was wrong.
- **Fake reviews REMOVED.** The product mockup had "★★★★★ 4.8 · 312 reviews", which I had
  invented as a layout placeholder. Fake review counts are exactly what an FB/FTC review punishes,
  on a page whose whole job is to pass one. Gone from both files.
- **Real business details in** (both pages, contact block + footer):
  Cosmo Numerology Pte Ltd · 45B Temple St, Singapore S058590 ·
  hi@theseerwithin.com · +65 8022 8149

## 🔴 Still open — the one that can waste the whole build

1. **Which URL did Facebook actually flag?** Our ads run to `/fb-palm/c`, `/evelyn`, `/gdn` —
   **not** to `/`. And Facebook most likely reviews the **root domain**. If so, a compliant page
   at `/home` **will not unblock the ad account**. Built standalone, so promoting it to `/` later
   is a one-line route change — but somebody needs to confirm the target with Joel/Facebook.

## ⚠️ Decisions needed before it can take money

2. **$99 conflicts with the funnel.** Upsell 2 already sells a **Manifestation Bracelet at
   $47/$30**. A product page selling the 8-Crystal bracelet at **$99** is the same category of
   item at double the price, both live at once. Which price wins?

3. **These become REAL orders.** FB requires the BUY button to be active, so $99 charges are
   real, for physical bracelets. **Who fulfils and ships them?** (wishamiracle ships in 7 business
   days — do we inherit that, and their 60-day returns?)

4. **Product photography rights.** The images are pulled straight from wishamiracle.com. Fine if
   that's our own company/supplier — confirm before publishing.

5. **Nav targets.** "About Us" / "Catalog" / "Contact" currently anchor to sections on the same
   page. If Facebook wants genuinely separate pages, that's 3 more routes — cheap, but say so now.

---

## Once approved — the implementation plan

Following Joel's architecture (it's sound):

- **`shared/braceletProducts.ts`** — the catalog. The server prices the Stripe session from this,
  so **the client never sends a price**. `{ slug, name, tagline, priceCents, images[] }`
- **`client/src/components/SiteFooter.tsx`** + `SiteHeader.tsx` — used **only** by the new
  homepage and product pages. Must not leak onto the funnel landers.
- **`client/src/pages/HomePage.tsx`** at `/home`, **`ProductPage.tsx`** at `/products/:slug`.
- Stripe Checkout wired for the 3 products (which Stripe account? prod runs LIVE keys).

**Hold it.** Joel: *"get that page ready, but **please don't live it**"* — target **the 18th**.
