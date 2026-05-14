# Soulmate Sketch Funnel — Documentation

## Funnel Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    /soulmate (Landing)                       │
│                                                             │
│  Hero + testimonials + FAQ + stats                          │
│  CTA: "Yes, I want my Soulmate Drawing"                    │
│       ↓ opens popup form                                    │
│                                                             │
│  ┌─────────────── Popup Form ───────────────┐               │
│  │  1. Sexual preference                    │               │
│  │  2. Age range                            │               │
│  │  3. Ethnicity preference                 │               │
│  │  4. Birth date (month/day/year)          │               │
│  │  5. Full name (first/middle/last)        │               │
│  │  6. Email                                │               │
│  │                                          │               │
│  │  Submit → sessionStorage('soulmate_form')│               │
│  └──────────────────┬───────────────────────┘               │
└─────────────────────┼───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                /soulmate/process (Loading)                   │
│                                                             │
│  Animated sketch GIF + 3 sequential messages                │
│  Auto-redirects after 7 seconds                             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│               /soulmate/reading (Sales Page)                │
│                                                             │
│  Value copy + sketch examples + testimonials                │
│  Flexible pricing: $28 / $42 / $55                          │
│  Bonus: Manifest Your Soulmate Meditation Guide             │
│  60-day money-back guarantee                                │
│                                                             │
│  CTA: "Send Me My Soulmate Sketch →"                       │
│       ↓ POST /api/soulmate/checkout                         │
│       ↓ → Stripe Checkout                                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓ (Stripe success redirect)
┌─────────────────────────────────────────────────────────────┐
│            /soulmate/gift (Upsell 1 — Bracelet)             │
│                                                             │
│  "IMPORTANT MESSAGE FROM EVELYN CROSS"                      │
│  Rose Quartz Soulmate Attraction Bracelet                   │
│  5-step ritual + certificate + checklist                    │
│  $47 (regularly $59) — one-time offer                       │
│                                                             │
│  ┌──────────┐    ┌───────────┐                              │
│  │ Add $47  │    │  Decline  │                              │
│  └────┬─────┘    └─────┬─────┘                              │
│       │                │                                    │
│       ↓                ↓                                    │
│   1-click charge   both go to ──→                           │
│   or Stripe fallback         │                              │
└──────────────────────────────┼──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│          /soulmate/gift2 (Upsell 2 — Love Tuner)            │
│                                                             │
│  "WAIT — BEFORE YOU GO..."                                  │
│  528 Hz Frequency of Love Tuner Necklace                    │
│  Hero video + science copy + testimonials                   │
│  $79 (regularly $129) — one-time offer                      │
│                                                             │
│  ┌──────────┐    ┌───────────┐                              │
│  │ Add $79  │    │  Decline  │                              │
│  └────┬─────┘    └─────┬─────┘                              │
│       │                │                                    │
│       ↓                ↓                                    │
│   1-click charge   both go to ──→                           │
│   or Stripe fallback         │                              │
└──────────────────────────────┼──────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│             /soulmate/thank-you (Confirmation)              │
│                                                             │
│  "Your Order is Confirmed, {firstName}!"                    │
│  3-step timeline (reading → sketch → delivery)              │
│  Whitelist hi@theseerwithin.com                             │
│  Gmail / Outlook / Yahoo / Apple Mail instructions          │
│  Check spam/promotions reminder                             │
│  Support contact                                            │
└─────────────────────────────────────────────────────────────┘
```

## Pages

### 1. Landing Page — `/soulmate`

**File:** `client/src/pages/SoulmateLandingPage.tsx`

**Purpose:** Awareness and lead capture.

**Sections:**
- Logo bar (dark background)
- Hero: "I'll Use My Seer Gifts to Create a Sketch of Your Soulmate"
- Social proof: "12,973 people have already discovered..."
- Auto-rotating testimonial slider (3 testimonials, 4s interval)
- Artist profile: Evelyn Cross — Seer Artist
- Stats: 30+ years experience, 1000+ 5-star reviews, thousands of clients
- How it works (intuitive energy + birth details)
- 7-item FAQ

**Popup Form Fields:**
| Field | Type | Required |
|-------|------|----------|
| Sexual preference | Select (men/women/both) | Yes |
| Age range | Select (18-34, 35-54, 55+) | Yes |
| Ethnicity preference | Select (10 options) | Yes |
| Birth month | Select | Yes |
| Birth day | Select | Yes |
| Birth year | Select | Yes |
| First name | Text | Yes |
| Middle name | Text | No |
| Last name | Text | Yes |
| Email | Email | Yes |

Form data saved to `sessionStorage` key: `soulmate_form`

**Navigation:** Submit → `/soulmate/process`

---

### 2. Process Page — `/soulmate/process`

**File:** `client/src/pages/SoulmateProcessPage.tsx`

**Purpose:** Theatrical loading animation while "reading" is prepared.

**Behavior:**
- Shows sketch GIF animation
- 3 messages fade in sequentially (0.8s, 2.8s, 4.8s)
- Auto-redirects to `/soulmate/reading` after 7 seconds
- If no `soulmate_form` in sessionStorage → redirects to `/soulmate`

---

### 3. Sales Page — `/soulmate/reading`

**File:** `client/src/pages/SoulmateSalesPage.tsx`

**Purpose:** Main sales page — build value, present pricing, drive purchase.

**Pricing (pay-what-you-can):**
| Option | Amount | Label |
|--------|--------|-------|
| Low | $28 | Pay what you can |
| Mid (default) | $42 | Most popular |
| High | $55 | Give generously |

**Key Sections:**
- Real sketch examples (3-column + 6-column grids)
- "What your sketch reveals" value copy
- 3 client testimonials + 3 more testimonials
- "Absolute Attention" commitment section with Evelyn photo
- Complete package description (sketch + description + bonus)
- Bonus: "Manifest Your Soulmate Meditation Guide"
- Product summary with checklist
- Flexible pricing selector
- 60-day money-back guarantee

**Sticky CTA Bar:** Appears after scrolling past first CTA — mini price selector + checkout button.

**API:** `POST /api/soulmate/checkout`

---

### 4. Upsell 1: Bracelet — `/soulmate/gift`

**File:** `client/src/pages/SoulmateUpsellPage.tsx`

**Purpose:** First upsell — Rose Quartz Soulmate Attraction Bracelet.

**Product:** Rose Quartz Soulmate Attraction Bracelet
**Price:** $47 (regularly $59)

**Key Sections:**
- "IMPORTANT MESSAGE FROM EVELYN CROSS" (red dotted border)
- Bracelet product image (100% Rose Quartz)
- "Why Wear the Bracelet?" — 3 benefits
- 5-step ritual with images
- Certificate of Authenticity
- 6-item checklist (cert, wish papers, care instructions, eco-box, guarantee, free shipping)
- Special discount copy

**CTAs:**
- "Add to Cart" → 1-click charge or Stripe fallback → `/soulmate/gift2`
- Decline link → `/soulmate/gift2`

**API:**
- `POST /api/soulmate/upsell/charge` — 1-click charge ($47)
- `POST /api/soulmate/upsell/checkout` — fallback Stripe checkout

---

### 5. Upsell 2: Love Tuner — `/soulmate/gift2`

**File:** `client/src/pages/SoulmateUpsell2Page.tsx`

**Purpose:** Second upsell — 528 Hz Frequency of Love Tuner Necklace.

**Product:** 528 Hz Frequency of Love Tuner Necklace
**Price:** $79 (regularly $129)

**Key Sections:**
- "WAIT — BEFORE YOU GO..." (red dotted border)
- Hero video (`hero-loop.mp4`) — autoplay, looped, muted
- Reported miracles (5 bullet points)
- Science callout: 528 Hz DNA repair
- Sound healing explanation
- "Why 528 Hz Is Special" — 5 Solfeggio benefits
- 3 testimonials (Susan M., Laura S., Saphia N.)
- Product intro with `love-tuner.jpg`
- "No More Living With..." — 5 pain points
- Product set image (`love-tuner-set.jpg`) at "Your Purchase Includes"
- 5-item checklist (tuner necklace, silver chain, how-to card, guarantee, free shipping)
- Special discount copy

**CTAs:**
- "Yes! Add the Love Tuner to My Order — $79" → 1-click charge or Stripe fallback → `/soulmate/thank-you`
- Decline link → `/soulmate/thank-you`

**API:**
- `POST /api/soulmate/upsell2/charge` — 1-click charge ($79)
- `POST /api/soulmate/upsell2/checkout` — fallback Stripe checkout

---

### 6. Thank You — `/soulmate/thank-you`

**File:** `client/src/pages/SoulmateThankYouPage.tsx`

**Purpose:** Order confirmation and delivery instructions.

**Key Sections:**
- "Your Order is Confirmed, {firstName}!"
- 3-step timeline:
  1. "I begin your reading now"
  2. "Your sketch is carefully crafted" (2-3 hours)
  3. "Delivered to your inbox within 24 hours"
- Whitelist `hi@theseerwithin.com`
- Per-provider instructions (Gmail, Outlook, Yahoo, Apple Mail)
- Check spam/promotions warning
- Support contact section

---

## API Endpoints

### Sketch Purchase
```
POST /api/soulmate/checkout
Body: { email, firstName, priceCents }
Valid prices: 2800, 4200, 5500
Returns: { url } → Stripe Checkout
Success URL: /soulmate/gift?session_id={CHECKOUT_SESSION_ID}
Cancel URL: /soulmate
```

### Upsell 1 — Bracelet ($47)
```
POST /api/soulmate/upsell/charge
Body: { sessionId, email, firstName }
Returns: { success, fallback?, url? }
Charge: $47 (4700 cents)
Product: "Rose Quartz Soulmate Attraction Bracelet"

POST /api/soulmate/upsell/checkout  (fallback)
Body: { email, firstName }
Returns: { url } → Stripe Checkout
Success URL: /soulmate/gift2?session_id={sessionId}
Cancel URL: /soulmate/gift?session_id={sessionId}
```

### Upsell 2 — Love Tuner ($79)
```
POST /api/soulmate/upsell2/charge
Body: { sessionId, email, firstName }
Returns: { success, fallback?, url? }
Charge: $79 (7900 cents)
Product: "528 Hz Frequency of Love Tuner Necklace"

POST /api/soulmate/upsell2/checkout  (fallback)
Body: { email, firstName }
Returns: { url } → Stripe Checkout
Success URL: /soulmate/thank-you
Cancel URL: /soulmate/gift2
```

## Products Summary

| # | Product | Price | Regular | Delivery | Guarantee |
|---|---------|-------|---------|----------|-----------|
| 1 | Psychic Soulmate Love Sketch & Reading | $28–$55 | — | 24 hours (email) | 60-day |
| 2 | Rose Quartz Soulmate Attraction Bracelet | $47 | $59 | Free worldwide shipping | 60-day |
| 3 | 528 Hz Frequency of Love Tuner Necklace | $79 | $129 | Free worldwide shipping | 60-day |

**Max revenue per customer:** $55 + $47 + $79 = **$181**

## Assets — `client/public/soulmate/`

### Images
- `evelyn-logo-white.png` — white logo for dark header bars
- `evelyn-logo.png` — standard logo
- `evelyn-hero.png` — artist hero photo (landing page)
- `evelyn-portrait.png` — portrait photo (upsell pages)
- `evelyn-sketching.png` — Evelyn at work (sales page)
- `evelyn-icon.png` — small icon
- `sketch-example.jpg` — hero sketch (landing page)
- `real-sketch-1.jpg` through `real-sketch-9.jpg` — example sketches
- `bracelet.jpg` — bracelet product photo
- `bracelet-cert.png` — certificate of authenticity
- `bracelet-ritual.gif` — ritual animation
- `step1.png` through `step5.png` — bracelet ritual steps
- `love-tuner.jpg` — love tuner product photo
- `love-tuner-set.jpg` — love tuner complete set photo
- `check-6.png` — checkmark icon for lists
- `five-stars.png` — 5-star rating image
- `customer-review.png` — customer icon
- `question-mark-lightblue.png` — FAQ icon
- `rubie.png`, `aishwarya.png`, `mike.png` — testimonial photos

### Video
- `hero-loop.mp4` — love tuner hero video (241KB, optimized)

### Animations
- `ev-draw-soulmate.gif` — sketch drawing animation (sales page)
- `ev-draw-soulmate-full.gif` — full sketch animation
- `loading.gif` — process page loading animation

## A/B Split Testing System

### Overview

Element-level split testing across all soulmate funnel pages. Tests are managed via the admin dashboard and served to visitors via cookie-based assignment.

```
┌──────────────────────────────────────────────────────────────────┐
│                      Admin Dashboard                             │
│                    /admin/ab-testing                              │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ Create     │  │  Monitor   │  │  Declare   │                 │
│  │ Test       │  │  Results   │  │  Winner    │                 │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                 │
│        │               │               │                        │
│        ↓               ↓               ↓                        │
│  ┌─────────────────────────────────────────────────────┐        │
│  │                  ab_tests table                      │        │
│  │  page | element | variants (JSON) | traffic_split   │        │
│  │  status: draft → running → paused → completed       │        │
│  └─────────────────────┬───────────────────────────────┘        │
└────────────────────────┼────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓                               ↓
┌─────────────────┐            ┌──────────────────┐
│  GET /api/ab/   │            │  POST /api/ab/   │
│  assign?page=X  │            │  convert         │
│                 │            │                  │
│  • Cookie-based │            │  • Records       │
│    visitor ID   │            │    conversion    │
│  • Deterministic│            │    per visitor   │
│    assignment   │            │    per test      │
│  • Records      │            │  • Deduped       │
│    impression   │            │                  │
└────────┬────────┘            └────────┬─────────┘
         │                              │
         ↓                              ↓
┌─────────────────────────────────────────────────────┐
│                  ab_events table                     │
│  test_id | variant_id | visitor_id | event_type     │
│  event_type: "impression" or "conversion"           │
└─────────────────────────────────────────────────────┘
```

### Architecture

**Cookie:** `ab_vid` — httpOnly, 1-year expiry, set on first `/api/ab/assign` call. Ensures same visitor always sees same variant.

**Assignment:** Deterministic hash of `visitorId + testId`, respecting traffic split percentages. No randomness — same visitor always gets same variant for a given test.

**Deduplication:** Impressions and conversions are recorded once per visitor per test. Repeat visits don't inflate numbers.

### Database Tables

#### ab_tests
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| page | text | Page identifier (e.g., `soulmate_landing`) |
| element | text | Element being tested (e.g., `headline`, `cta_text`) |
| name | text | Human-readable test name |
| variants | text (JSON) | Array of `{id, label, value}` objects |
| traffic_split | text | Split ratio (e.g., `50/50`, `70/30`) |
| status | text | `draft` / `running` / `paused` / `completed` |
| winner_variant_id | text | Set when test is completed |
| created_at | timestamp | |
| updated_at | timestamp | |

#### ab_events
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (UUID) | Primary key |
| test_id | varchar | FK → ab_tests.id (cascade delete) |
| variant_id | text | e.g., `a`, `b` |
| visitor_id | text | From `ab_vid` cookie |
| event_type | text | `impression` or `conversion` |
| page | text | Page where event occurred |
| metadata | text | Optional JSON |
| created_at | timestamp | |

**Indexes:**
- `idx_ab_events_test_variant` on (test_id, variant_id, event_type)
- `idx_ab_events_visitor` on (visitor_id, test_id)

### Page Identifiers

| Page | Identifier |
|------|------------|
| Landing | `soulmate_landing` |
| Sales | `soulmate_reading` |
| Upsell 1 (Bracelet) | `soulmate_gift` |
| Upsell 2 (Love Tuner) | `soulmate_gift2` |

### API Endpoints

#### Public (no auth)
```
GET /api/ab/assign?page={page}
  → Sets ab_vid cookie if none exists
  → Returns { assignments: { [testId]: { variantId, value } } }
  → Records impression (deduped)

POST /api/ab/convert
  Body: { page }
  → Records conversion for visitor's assigned variants (deduped)
  → Returns { success: true }
```

#### Admin (requires auth)
```
GET    /api/admin/ab-testing           — List all tests
POST   /api/admin/ab-testing           — Create test
PUT    /api/admin/ab-testing/:id       — Update test
DELETE /api/admin/ab-testing/:id       — Delete test + events
GET    /api/admin/ab-testing/:id/results — Aggregated results per variant
```

### Frontend Usage

**Hook:** `client/src/hooks/useABTest.ts`

```typescript
import { useABTest, trackABConversion } from "@/hooks/useABTest";

// In component — returns variant value or default
const headline = useABTest("soulmate_landing", "headline", "I'll Use My Seer Gifts...");
const ctaText = useABTest("soulmate_reading", "cta_text", "Send Me My Soulmate Sketch →");

// On conversion event (e.g., after successful checkout)
trackABConversion("soulmate_reading");
```

### Admin Dashboard

**Route:** `/admin/ab-testing`
**File:** `client/src/pages/admin/ABTestingDashboard.tsx`

**Views:**
- **Test list** — table with name, page, element, status badges, actions (run/pause/edit/delete)
- **Create/edit modal** — page dropdown, element input, variant editor (auto-lettered IDs, label + value textarea), traffic split
- **Results view** — per-variant cards (impressions, conversions, rate %), winner highlighting (30+ impressions threshold), "Declare Winner" button

### Example Test Configuration

```json
{
  "page": "soulmate_reading",
  "element": "cta_text",
  "name": "Sales page CTA button text",
  "variants": [
    { "id": "a", "label": "Control", "value": "Send Me My Soulmate Sketch →" },
    { "id": "b", "label": "Urgency", "value": "Yes! Draw My Soulmate Now →" }
  ],
  "trafficSplit": "50/50",
  "status": "running"
}
```

---

## Design System

| Element | Value |
|---------|-------|
| Primary blue | `#41a7ec` |
| Dark background | `#1b1b1e` |
| Cream background | `#fdf8f0` |
| Body text | `#333` / `#444` |
| Heading font | Merriweather, serif |
| Cursive accent | Great Vibes, cursive |
| Stats font | Oswald, sans-serif |
| CTA button | `#41a7ec` bg, Merriweather 26px bold, 3px top/bottom borders |
| Max content width | 800px |
| Red accent (urgent) | `#df1414` |
| Star color | `#f5a623` |
