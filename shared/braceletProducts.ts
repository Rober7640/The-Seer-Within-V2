// Catalog for the Facebook-compliance product pages (/products/:slug).
//
// WHY THIS FILE IS SHARED
// The server prices the Stripe Checkout session from this same catalog the client
// renders. The client NEVER sends a price — it sends a slug. Otherwise anyone could
// POST {priceCents: 1} and buy a bracelet for a cent.
//
// WHY THESE PAGES EXIST
// Facebook blocked the ad account: our site had no product pages with an ACTIVE buy
// button and a visible price. (wishamiracle.com's own pages show "Sold out" — that is
// precisely the violation.) The five requirements, from Joel's screenshot:
//   1. header nav        2. footer with full address + telephone
//   3. a real email      4. 3+ clickable products, each with its own page
//   5. product pages with an ACTIVE BUY button and the price shown
//
// ⚠️ PRODUCT SLUGS ARE DELIBERATELY NEW (`bracelet_*`).
// Every branch of the existing Stripe webhook is keyed on `metadata.product`, and each
// one skips an unrecognised value:
//   - resolveStripeEventName() -> null  => no Meta CAPI Purchase
//   - gadsStepForProduct()     -> null  => no Google Ads conversion
//   - buildPurchaseEvent()     -> null  => no PostHog purchase_completed
//   - the soulmate / protection_ritual / manifestation_bracelet blocks are name-gated
// So these products flow through the webhook without touching a single funnel metric.
// 🔴 NEVER put `trackdeskClickId` in a bracelet checkout's metadata — the webhook's
// Trackdesk branch defaults `conversionType` to 'sale', which would book a bracelet as
// a main-funnel affiliate sale and corrupt attribution.

export interface BraceletProduct {
  /** URL slug — /products/:slug. Also the client's only pricing input. */
  slug: string;
  /** Stripe metadata.product. Must stay OUTSIDE the funnel's known product names. */
  stripeProduct: string;
  name: string;
  /** The three-word promise printed above the title. */
  tagline: string;
  /** One line, used on the homepage card. */
  blurb: string;
  priceCents: number;
  /** Struck-through "was" price. Matches wishamiracle's own list price. */
  compareAtCents: number;
  /** Public paths under /products/. First image is the main one. */
  images: string[];
  intro: string;
  benefits: string[];
  specs: Array<{ label: string; value: string }>;
}

export const BRACELET_PRODUCTS: BraceletProduct[] = [
  {
    slug: 'black-lava-wish-bracelet',
    stripeProduct: 'bracelet_black_lava',
    name: 'Black Lava Wish Bracelet',
    tagline: 'Manifesting · Grounding · Calming',
    blurb: 'Genuine black lava stone born of volcanic eruption, set with a gold-plated wish capsule.',
    priceCents: 9900,
    compareAtCents: 19900,
    images: ['/products/lava-1.jpg', '/products/lava-2.jpg', '/products/lava-3.jpg'],
    intro:
      'Black lava stone is born of volcanic eruption — raw, assertive energy tempered by practical ' +
      'restraint. Worn as a wish bracelet, it is said to ground the wearer while the wish is carried.',
    benefits: [
      'Dissipating anger',
      'Promoting positive behavioural change',
      'Providing intense energy',
      'Easing stress and anxiety',
      'Keeping calm in busy environments',
    ],
    specs: [
      { label: 'Gender', value: 'Unisex' },
      { label: 'Bead size', value: '8 mm' },
      { label: 'Material', value: 'Genuine black lava stone, with a gold-plated stainless steel wish capsule (hexagonal etching)' },
      { label: 'Band', value: '7.5 inch quality-tested elastic' },
      { label: 'In the box', value: 'Eco-box, certificate of authenticity, wish-paper envelope, care instructions' },
    ],
  },
  {
    slug: '8-crystal-wealth-bracelet',
    stripeProduct: 'bracelet_8_crystal',
    name: '8-Crystal Wealth Bracelet',
    tagline: 'Wealth · Manifesting · Abundance',
    blurb: 'Eight genuine crystals — Aventurine, Amethyst, Tiger Eye, Citrine, Pyrite and more.',
    priceCents: 9900,
    compareAtCents: 19900,
    images: ['/products/wealth-1.png', '/products/wealth-2.webp', '/products/wealth-3.webp'],
    intro:
      'Eight crystals chosen to draw wealth and abundance, cultivate positive energy, and turn ' +
      'negativity away — Aventurine, Amethyst, Clear Quartz, Tiger Eye, Chrysoprase, Hematite, ' +
      'Citrine and Pyrite, on a single band.',
    benefits: [
      'Being financially aware',
      'Improved intuition',
      'Avoiding money regrets',
      'Increased luck',
      'Boosting self-esteem and confidence',
    ],
    specs: [
      { label: 'Gender', value: 'Unisex' },
      { label: 'Bead size', value: '8 mm' },
      { label: 'Material', value: 'Genuine Aventurine, Amethyst, Clear Quartz, Tiger Eye, Chrysoprase, Hematite, Citrine and Pyrite' },
      { label: 'Band', value: '7.5 inch quality-tested elastic' },
      { label: 'In the box', value: 'Jewellery box, certificate of authenticity, care instructions' },
    ],
  },
  {
    slug: 'rose-quartz-wish-bracelet',
    stripeProduct: 'bracelet_rose_quartz',
    name: 'Rose Quartz Wish Bracelet',
    tagline: 'Love · Self-Care · Heart-Healing',
    blurb: 'Genuine rose quartz, the stone of Aphrodite — for love given, and love returned.',
    priceCents: 9900,
    compareAtCents: 19900,
    images: ['/products/rose-3.jpg', '/products/rose-1.jpg', '/products/rose-2.jpg'],
    intro:
      'Rose quartz carries the oldest story of love there is — Aphrodite, Adonis, and a stone stained ' +
      'by devotion. Worn as a wish bracelet, it is said to open the heart to compassion, self-care ' +
      'and true partnership.',
    benefits: [
      'Compassion and self-care',
      'Manifesting true partnership',
      'Emotional mending and healing',
      'Removing negativity',
      'Maintaining long-lasting relationships',
    ],
    specs: [
      { label: 'Gender', value: 'Unisex' },
      { label: 'Bead size', value: '8 mm' },
      { label: 'Material', value: 'Genuine rose quartz, with a vintage gold-plated stainless steel wish capsule' },
      { label: 'Band', value: '7.5 inch quality-tested elastic' },
      { label: 'In the box', value: 'Eco packaging, certificate of authenticity, wish papers, care instructions' },
    ],
  },
];

export function getBraceletBySlug(slug: string | undefined): BraceletProduct | undefined {
  if (!slug) return undefined;
  return BRACELET_PRODUCTS.find((p) => p.slug === slug);
}

/** Business identity — Facebook requires all of this to be visible in the footer. */
export const BUSINESS = {
  legalName: 'Cosmo Numerology Pte Ltd',
  addressLines: ['45B Temple St', 'Singapore S058590'],
  email: 'hi@theseerwithin.com',
  phone: '+65 8022 8149',
  phoneHref: 'tel:+6580228149',
  website: 'www.theseerwithin.com',
} as const;

/** Shared shipping/returns copy — identical for all three products. */
export const FULFILMENT = {
  shipsWithin: '7 business days',
  usDelivery: 'typically 1–2 weeks from dispatch',
  intlDelivery: 'may take 21 days or more, depending on customs',
  trackingEmail: 'within 3–5 business days of dispatch',
  returnWindowDays: 60,
} as const;
