// Offer 09 — the Heart Cleanser Love Charm: booking page copy + checkout helpers.
//
//   npx vitest run client/src/lib/heartCleanserBooking.test.ts
//
// Copy source: improve-v1/v1-one-time-BEs/docs/09/booking-page/09-C1-booking-page.md
// (ticks approved by the operator 2026-09-15 — 09-C1-ticks-rewrite.md, Version 2)

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG } from '@shared/backendOffers';
import * as booking from './heartCleanserBooking';
import {
  TAB_TITLE,
  PAGE_HEADER,
  PAGE_IMAGE,
  PAGE_STATEMENTS,
  BUMP,
  CHECKOUT,
  HEART_CLEANSER_PRICE_CENTS,
  HEART_CLEANSER_BUMP_CENTS,
  allStatementsTicked,
  formatTotal,
  heartCleanserCheckoutRequest,
  heartCleanserTotalCents,
} from './heartCleanserBooking';

const hostedAssets = JSON.parse(
  readFileSync(
    new URL('../../../improve-v1/v1-one-time-BEs/docs/09/product/hosted-assets.json', import.meta.url),
    'utf8',
  ),
) as Record<string, { url: string }>;

const C1_DOC = readFileSync(
  new URL('../../../improve-v1/v1-one-time-BEs/docs/09/booking-page/09-C1-booking-page.md', import.meta.url),
  'utf8',
);

const C3_DOC = readFileSync(
  new URL('../../../improve-v1/v1-one-time-BEs/docs/09/booking-page/09-C3-order-bump.md', import.meta.url),
  'utf8',
);

// The doc wraps lines; the page doesn't. Compare on single spaces.
const flat = (s: string) => s.replace(/\s+/g, ' ');
const C1_FLAT = flat(C1_DOC);

const ALL_COPY = JSON.stringify({ TAB_TITLE, PAGE_HEADER, PAGE_IMAGE, PAGE_STATEMENTS, BUMP, CHECKOUT });

const SHIPPING_SENTENCE =
  'ships within 2 business days, then arrives in 7–14 days in the US and 2–4 weeks everywhere else';

describe('09 booking copy', () => {
  it('masthead is 09-C1’s', () => {
    expect(PAGE_HEADER.title).toBe('Your Heart Cleanser Love Charm');
    expect(PAGE_HEADER.deck).toBe(
      "Before checkout, please read and tick all four boxes below. Ticking the boxes doesn't charge you.",
    );
    expect(TAB_TITLE).toBe(PAGE_HEADER.title);
  });

  it('has exactly the four statements, in order, word for word', () => {
    expect(PAGE_STATEMENTS).toHaveLength(4);
    expect(PAGE_STATEMENTS).toEqual([
      {
        lead: 'Yes — I want to keep my wish for love inside my charm.',
        body:
          'My charm is the whole bracelet: pink quartz, with a small wish capsule built in. Blank wish papers ' +
          "come with my charm. I'll write my wish on one of the papers, put the paper in the capsule and close " +
          'the capsule. I can keep what I write to myself.',
      },
      {
        lead: 'Yes — I\'ll say, "I am ready to receive love, too."',
        body:
          '"Too" means I receive love as well as give it. After my wish is in the capsule, I\'ll hold my charm ' +
          'in my left palm and say that sentence.',
      },
      {
        lead: "Yes — I'll wear my pink quartz charm on my left wrist.",
        body:
          'Wearing my charm on the left stands for receiving love. The pink quartz stands for tenderness, the ' +
          "kind of love I'd like to welcome into my life.",
      },
      {
        lead: 'Yes — I want my wish to go with me through the day.',
        body:
          'As I put my charm on in the morning, I can stop for a moment and think of my wish. The paper with my ' +
          'wish stays in the capsule. When I touch the capsule, I can remember what I wrote.',
      },
    ]);
  });

  it('every statement is in the 09-C1 doc word for word', () => {
    for (const s of PAGE_STATEMENTS) {
      expect(C1_FLAT).toContain(`**${s.lead}**`);
      expect(C1_FLAT).toContain(s.body);
    }
    expect(C1_FLAT).toContain('## The four statements');
  });

  it('no statement carries logistics: no shipping, days, price, "$", checkout or subscription', () => {
    for (const s of PAGE_STATEMENTS) {
      const text = `${s.lead} ${s.body}`;
      expect(text).not.toMatch(/ship|deliver|arriv|business days?|\d+[–-]\d+|\bweeks?\b/i);
      expect(text).not.toMatch(/\$|\bprice|\bcosts?\b|\bpay|payment|\d/i);
      expect(text).not.toMatch(/checkout|subscription|address|stripe/i);
    }
  });

  it('there is no request paragraph — removed, not emptied', () => {
    expect('PAGE_REQUEST' in booking).toBe(false);
    expect(ALL_COPY).not.toContain('So please —');
    expect(C1_DOC).not.toMatch(/^## The request/m);
  });

  it('the deck and the grey hint count the statements, and the button is unchanged', () => {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
    const n = words[PAGE_STATEMENTS.length];
    expect(PAGE_HEADER.deck).toContain(`tick all ${n} boxes`);
    expect(CHECKOUT.lockedHint).toBe('Tick all four boxes above to show the button.');
    expect(CHECKOUT.lockedHint).toContain(`Tick all ${n} boxes`);
    expect(CHECKOUT.reassurance).toContain(`Once all ${n} boxes are ticked`);
    expect(CHECKOUT.button).toBe('SEND ME MY LOVE CHARM');
  });

  it('small print is 09-C1’s word for word, with the shipping sentence and every logistic', () => {
    expect(CHECKOUT.reassurance).toBe(
      'In the gift box: your charm, blank wish papers that fit the capsule, and a printed card showing how to ' +
        'use and care for your charm. Free shipping worldwide. Your charm ships within 2 business days, then ' +
        'arrives in 7–14 days in the US and 2–4 weeks everywhere else. The 7–14 days and 2–4 weeks start on ' +
        'the day your charm ships. Once all four boxes are ticked, the button above takes you to the secure ' +
        "checkout page, where you'll enter your shipping address and pay. No subscription.",
    );
    expect(CHECKOUT.reassurance).toContain(SHIPPING_SENTENCE);
    expect(C1_FLAT).toContain(`*${CHECKOUT.reassurance}*`);
    expect(CHECKOUT.reassurance).toContain('No subscription.');
    expect(CHECKOUT.reassurance).toContain('shipping address');
  });

  it('page copy never says "Stripe" or "One payment of $59"', () => {
    expect(ALL_COPY).not.toMatch(/stripe/i);
    expect(ALL_COPY).not.toMatch(/one payment of \$59/i);
    expect(ALL_COPY).not.toMatch(/one payment of/i);
  });

  it('uses the studio close-up (rosequartz, 570px) — never rosequartz3 (Wish Miracle branding) or the black-bead GIF', () => {
    expect(PAGE_IMAGE.src).toBe(hostedAssets['rosequartz-page-570.jpg'].url);
    expect(ALL_COPY).not.toMatch(/rosequartz3|black_lava|\.gif/);
    expect(PAGE_IMAGE.alt).toContain('pink quartz bracelet');
    expect(PAGE_IMAGE.caption).not.toMatch(/left wrist/i);
  });

  it('caption says which crystal is not included; the alt names it only as display', () => {
    expect(PAGE_IMAGE.caption).toBe(
      'The Heart Cleanser Love Charm, a pink quartz bracelet with a wish capsule. The clear crystal under the bracelet is not included.',
    );
    expect(C1_FLAT).toContain(`**Caption:** *${PAGE_IMAGE.caption}*`);
    expect(PAGE_IMAGE.alt).toMatch(/resting on a clear crystal\.$/);
    expect(PAGE_IMAGE.alt).not.toMatch(/includ|comes with|with a clear crystal/i);
  });

  it('links the refund page and the support address', () => {
    expect(CHECKOUT.refundHref).toBe('/refund');
    expect(CHECKOUT.supportEmail).toBe('hi@theseerwithin.com');
  });

  it('has no reading language, never 06’s bump, and not the flagged sign-off', () => {
    expect(ALL_COPY).not.toMatch(/\breading\b|clearing|closed purse/i);
    expect(ALL_COPY).not.toContain("I'm on your side in this");
  });

  it('claims stay at the letters’ level: "stands for", never makes/brings/attracts', () => {
    const text = PAGE_STATEMENTS.map((s) => `${s.lead} ${s.body}`).join(' ');
    expect(text).toContain('stands for receiving love');
    expect(text).not.toMatch(/\bmakes?\b|\bbrings?\b|attract|guarantee|proven|will come|come back to me/i);
  });
});

describe('09 price', () => {
  it('the page’s $59.00 total is the catalog’s price', () => {
    const offer = BACKEND_OFFER_CATALOG['heart-cleanser'];
    expect(offer.pricing).toEqual({ model: 'fixed', priceCents: HEART_CLEANSER_PRICE_CENTS });
    expect(HEART_CLEANSER_PRICE_CENTS).toBe(5900);
    expect(formatTotal(HEART_CLEANSER_PRICE_CENTS)).toBe('$59.00');
    expect(CHECKOUT.totalLabel).toBe('Total');
  });

  it('no statement and no small print names an amount, so both stay true with the bump ticked', () => {
    expect(JSON.stringify(PAGE_STATEMENTS)).not.toMatch(/\$/);
    expect(CHECKOUT.reassurance).not.toMatch(/\$/);
    expect(PAGE_HEADER.deck).not.toMatch(/\$/);
  });
});

describe('09 order bump (09-C3) — Reiki charging by Evelyn before packing', () => {
  it('is the checkbox label and second line from 09-C3, word for word', () => {
    expect(BUMP.label).toBe("Yes — have Evelyn charge my charm with Reiki before it's packed.");
    expect(BUMP.note).toBe(
      "Before it's packed, Evelyn holds my charm in her hands and gives it Reiki for love. So on my first morning, I'm not starting with a new stone. I'm starting with one she has already worked on for me. No extra wait.",
    );
    expect(C3_DOC).toContain(`**☐ ${BUMP.label}**`);
    expect(C3_DOC).toContain(`${BUMP.priceLabel} · ${BUMP.note}`);
  });

  it('prints its price from the catalog cents, not a literal', () => {
    expect(HEART_CLEANSER_BUMP_CENTS).toBe(BACKEND_OFFER_CATALOG['heart-cleanser'].bump!.cents);
    expect(BUMP.priceLabel).toBe(`+${formatTotal(HEART_CLEANSER_BUMP_CENTS)}`);
    expect(BUMP.priceLabel).toBe('+$11.11');
  });

  it('says what is added and when, never that the charm is lacking, and promises no outcome', () => {
    const text = `${BUMP.label} ${BUMP.note}`;
    expect(text).toContain("before it's packed");
    expect(text).toContain('No extra wait.');
    expect(text).not.toMatch(
      /without it|incomplete|weak|stronger|more powerful|activat|unlock|energy|clearing|cleanse|guarantee|proven|attract|bring (him|love)|work better/i,
    );
  });
});

describe('heartCleanserTotalCents', () => {
  it('is $59.00 unticked and $70.11 ticked — both from the catalog', () => {
    expect(heartCleanserTotalCents(false)).toBe(HEART_CLEANSER_PRICE_CENTS);
    expect(heartCleanserTotalCents(true)).toBe(HEART_CLEANSER_PRICE_CENTS + HEART_CLEANSER_BUMP_CENTS);
    expect(formatTotal(heartCleanserTotalCents(false))).toBe('$59.00');
    expect(formatTotal(heartCleanserTotalCents(true))).toBe('$70.11');
  });
});

describe('allStatementsTicked', () => {
  it('is false until every one of the four is ticked', () => {
    expect(allStatementsTicked([false, false, false, false])).toBe(false);
    expect(allStatementsTicked([true, true, true, false])).toBe(false);
    expect(allStatementsTicked([true, true, true, true])).toBe(true);
  });

  it('is false for a list that is not one tick per statement', () => {
    expect(allStatementsTicked([])).toBe(false);
    expect(allStatementsTicked([true, true, true])).toBe(false);
    expect(allStatementsTicked([true, true, true, true, true])).toBe(false);
  });
});

describe('heartCleanserCheckoutRequest', () => {
  it('is the page treatment of heart-cleanser, carrying the name AND the letter code', () => {
    expect(heartCleanserCheckoutRequest({ firstName: 'Sarah', letterCode: '21', bump: false })).toEqual({
      offer: 'heart-cleanser',
      treatment: 'page',
      bump: false,
      firstName: 'Sarah',
      letterCode: '21',
    });
  });

  it('carries bump: true only when she ticked the box', () => {
    expect(heartCleanserCheckoutRequest({ firstName: 'Sarah', letterCode: '21', bump: true }).bump).toBe(true);
    expect(heartCleanserCheckoutRequest({ firstName: 'Sarah', letterCode: '21', bump: false }).bump).toBe(false);
  });

  it('passes a missing name or code through as null', () => {
    expect(heartCleanserCheckoutRequest({ firstName: null, letterCode: null, bump: false })).toEqual({
      offer: 'heart-cleanser',
      treatment: 'page',
      bump: false,
      firstName: null,
      letterCode: null,
    });
  });
});
