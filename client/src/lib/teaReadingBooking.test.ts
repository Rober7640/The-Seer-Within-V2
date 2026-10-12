// Offer 04 — The Turn: both booking treatments' copy, the checkout request, and the price split
// test's client half (lib/teaReadingPrice.ts). Operator 2026-10-11: no price hike — one fixed
// price, $35 (arm A) vs $45 (arm B), decided by the server.
//
//   npx vitest run client/src/lib/teaReadingBooking.test.ts
//
// Copy sources: improve-v1/v1-one-time-BEs/copy/04/04-C1-booking-page-v2.md (page)
//               improve-v1/v1-one-time-BEs/copy/04/04-C2-booking-chat.md (chat)

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BACKEND_OFFER_CATALOG, TEA_READING_BUMP_CENTS, TEA_READING_PRICE_ARMS } from '@shared/backendOffers';
import * as booking from './teaReadingBooking';
import {
  BUMP,
  CHAT_BUMP,
  CHAT_GATE,
  CHAT_RESUME,
  CHAT_SCRIPT,
  CHAT_THREAD_TITLE,
  CHECK_LINES,
  CHECKOUT,
  PAGE_HEADER,
  PAGE_IMAGE,
  PRICE_NOTES,
  PRICE_STATES,
  READY_TICK,
  PRICE_TOKEN,
  WHAT_YOU_GET,
  chatPriceChangedNotice,
  chatStatementParts,
  pagePriceChangedNotice,
  teaReadingCheckoutRequest,
  teaReadingTotalCents,
} from './teaReadingBooking';
import {
  fetchPriceQuote,
  parsePriceChanged,
  parsePriceQuote,
  priceQuoteUrl,
  type QuoteFetch,
} from './teaReadingPrice';

const doc = (name: string) =>
  readFileSync(new URL(`../../../improve-v1/v1-one-time-BEs/copy/04/${name}`, import.meta.url), 'utf8');

// The docs wrap lines and wrap merge fields in backticks; the screens don't. Compare on single
// spaces with the backticks gone.
const flat = (s: string) => s.replace(/`/g, '').replace(/\s+/g, ' ');
const C1 = flat(doc('04-C1-booking-page-v2.md'));
const C2 = flat(doc('04-C2-booking-chat.md'));
const C1_RAW = doc('04-C1-booking-page-v2.md');

const PAGE_COPY = JSON.stringify({
  PAGE_HEADER, PAGE_IMAGE, PRICE_NOTES, CHECK_LINES, READY_TICK, BUMP, CHECKOUT,
  PRICE_STATES, WHAT_YOU_GET, notice: pagePriceChangedNotice('{{NEW_PRICE}}'),
});
const CHAT_COPY = JSON.stringify({
  CHAT_THREAD_TITLE, CHAT_SCRIPT, CHAT_GATE, CHAT_BUMP, CHAT_RESUME,
  notice: chatPriceChangedNotice('{{NEW_PRICE}}'),
});

// The retired day ladder (operator 2026-10-11: no price hike). None of its copy — the rising
// price, "today's price", its reason-why (the drying leaves), the rung token, `?day=` — may
// appear on a booking screen or in its spec's copy.
const LADDER_COPY =
  /today'?s price|today'?s rung|TODAYS_RUNG|NEW_RUNG|\brungs?\b|ladder|price goes up|went up|goes up each day|as the leaves dry|leaves dry|\?day=|quotedDay/i;

// The three interpretations' names and the old pick's words. Operator 2026-10-11: the cup is
// DRAWN by the server, so none of these may appear on a booking screen or in its spec's copy.
const CUP_NAMES = /Turned Handle|Divided Rim|Sunken Leaf/;
const PICK_WORDS = /Which sounds like|which cup is yours|you choose|decides which reading/i;
/** A spec's copy — everything above its build notes (which may explain the change). */
const copyOf = (md: string) => md.slice(0, md.indexOf('## Build notes'));

describe('04 page copy is 04-C1 v2’s, word for word', () => {
  it('masthead, image, price notes, check lines and the one tick', () => {
    expect(C1).toContain(`**Eyebrow:** ${PAGE_HEADER.eyebrow}`);
    expect(C1).toContain(`**Title:** ${PAGE_HEADER.title}`);
    expect(C1).toContain(`**Sub-line:** ${PAGE_HEADER.subline}`);
    expect(C1).toContain(`**Alt text:** ${PAGE_IMAGE.alt}`);
    expect(C1).toContain(`**Caption:** *${PAGE_IMAGE.caption}*`);
    expect(C1).toContain(`**{{PRICE}}** | ${PRICE_NOTES.join(' / ')}`);
    expect(PRICE_NOTES).toEqual(['Paid once', 'Your reading within 24 hours']);
    for (const line of CHECK_LINES) expect(C1).toContain(`- ✓ ${line}`);
    expect(CHECK_LINES).toHaveLength(3);
    expect(C1).toContain(`**☐ ${READY_TICK}**`);
  });

  it('the button, the locked hint and the trust line', () => {
    expect(CHECKOUT.button).toBe('TURN MY CUP');
    expect(C1).toContain(`### ${CHECKOUT.button}`);
    expect(C1).toContain(`*${CHECKOUT.lockedHint}*`);
    expect(C1).toContain(`${CHECKOUT.trust.join(' · ')} · [${CHECKOUT.refundLabel}]`);
    expect(CHECKOUT.trust[0]).toBe('Paid once');
    expect(CHECKOUT.refundHref).toBe('/refund');
    expect(CHECKOUT.supportEmail).toBe('hi@theseerwithin.com');
  });

  it('⛔ no cup pick: the spec and the page copy name no cup and ask no question about one', () => {
    expect(copyOf(C1_RAW)).not.toMatch(CUP_NAMES);
    expect(copyOf(C1_RAW)).not.toMatch(PICK_WORDS);
    expect(PAGE_COPY).not.toMatch(CUP_NAMES);
    expect(PAGE_COPY).not.toMatch(PICK_WORDS);
    // The build notes say why: drawn at random on the server.
    expect(C1).toMatch(/drawn at random \*\*on the server, at checkout\*\*/);
  });

  it('the bump is the Double Turning, word for word (operator-reviewed): label, price and line', () => {
    expect(BUMP.label).toBe('Yes, double the strength of my reading');
    expect(BUMP.priceLabel).toBe('+$12.77');
    expect(BUMP.note).toBe(
      'Evelyn reads your cup a second time and puts twice the strength into your reading. Same reading, ' +
        'same 21 days. It just works twice as hard: the quiet days hold better, and your one message lands harder.',
    );
    expect(C1).toContain(`**☐ ${BUMP.label} · ${BUMP.priceLabel}**`);
    expect(C1).toContain(BUMP.note);
    expect(C1_RAW).toContain('`double_turning`');
  });

  it('the price line’s states and below the fold — and no reason-why section any more', () => {
    expect(C1).toContain(`*${PRICE_STATES.failed}* **${PRICE_STATES.retry}**`);
    expect(C1).toContain(`*${PRICE_STATES.cancelled}*`);
    expect(C1).toContain(`*${pagePriceChangedNotice('{{NEW_PRICE}}')}*`);
    expect(C1).toContain(`### ${WHAT_YOU_GET.heading}`);
    for (const item of WHAT_YOU_GET.items) expect(C1).toContain(`- ${item}`);
    expect(copyOf(C1_RAW)).not.toMatch(/Why today'?s price/i);
    expect('WHY_THE_PRICE' in booking).toBe(false);
  });

  it('copy-check’s two booking-page rules: the merge field and "24 hours"', () => {
    expect(C1_RAW).toContain('{{PRICE}}');
    expect(C1_RAW).toContain('24 hours');
  });

  it('⛔ no ladder copy: the spec’s copy and the page copy never say the price rises', () => {
    expect(copyOf(C1_RAW)).not.toMatch(LADDER_COPY);
    expect(PAGE_COPY).not.toMatch(LADDER_COPY);
    // The build notes say why, and name the test.
    expect(C1).toMatch(/No price hike/);
    expect(C1).toMatch(/be_04_price_2026/);
  });
});

describe('04 chat copy is 04-C2’s, word for word', () => {
  it('thread title says confirm, never confirmed', () => {
    expect(C2).toContain(`**${CHAT_THREAD_TITLE}**`);
    expect(CHAT_THREAD_TITLE).toMatch(/confirm your booking/);
    expect(CHAT_THREAD_TITLE).not.toMatch(/confirmed|receipt|your order/i);
  });

  it('every Evelyn line is in the doc, ONE SENTENCE per line', () => {
    const lines = CHAT_SCRIPT.flatMap((b) => (b.kind === 'evelyn' ? b.lines : []));
    for (const line of lines) {
      expect(C2).toContain(`> ${line}`);
      // One sentence per turn: no full stop/question mark followed by another sentence.
      expect(line.replace(/[.?!]$/, '')).not.toMatch(/[.?!]\s+[A-Z]/);
    }
    for (const line of [...CHAT_RESUME.refreshed, ...CHAT_RESUME.cancelled]) expect(C2).toContain(`> ${line}`);
  });

  it('the script is greeting → card → "Good." → bump — no cup turn', () => {
    expect(CHAT_SCRIPT.map((b) => b.kind)).toEqual(['evelyn', 'gate', 'evelyn', 'bump']);
    const afterCard = CHAT_SCRIPT[2];
    expect(afterCard.kind === 'evelyn' && afterCard.lines).toEqual(['Good.', 'One more thing before I start.']);
  });

  it('the card: heading, deck, three statements in her voice, price third', () => {
    expect(C2).toContain(`**Heading:** *${CHAT_GATE.heading}*`);
    expect(C2).toContain(`**Deck:** *${CHAT_GATE.deck}*`);
    expect(CHAT_GATE.statements).toHaveLength(3);
    for (const s of CHAT_GATE.statements) expect(C2).toContain(`- **☐** ${s}`);
    expect(CHAT_GATE.statements.findIndex((s) => s.includes(PRICE_TOKEN))).toBe(2);
    expect(PRICE_TOKEN).toBe('{{PRICE}}');
    expect(CHAT_GATE.smallPrint).toBe("Paid once. Your reading arrives within 24 hours. You don't need to send anything.");
    expect(C2).toContain(`*${CHAT_GATE.lockedHint}*`);
    expect(C2).toContain(`*${CHAT_GATE.smallPrint}*`);
    expect(CHAT_GATE.smallPrint).toContain('within 24 hours');
  });

  it('the card statement carrying the price is just the price — "Yes — I’ll pay <price>, once."', () => {
    expect(CHAT_GATE.statements[2]).toBe("Yes — I'll pay {{PRICE}}, once.");
    expect(chatStatementParts(CHAT_GATE.statements[2])).toEqual({ before: "Yes — I'll pay ", after: ', once.' });
    expect(chatStatementParts(CHAT_GATE.statements[0])).toBeNull();
  });

  it('⛔ no ladder copy: the spec’s copy and the chat copy never say the price rises', () => {
    const C2_RAW = doc('04-C2-booking-chat.md');
    expect(copyOf(C2_RAW)).not.toMatch(LADDER_COPY);
    expect(CHAT_COPY).not.toMatch(LADDER_COPY);
    expect(C2).toMatch(/no price hike/);
  });

  it('⛔ no cup turn: the spec and the chat copy name no cup and ask no question about one', () => {
    const C2_RAW = doc('04-C2-booking-chat.md');
    expect(copyOf(C2_RAW)).not.toMatch(CUP_NAMES);
    expect(copyOf(C2_RAW)).not.toMatch(PICK_WORDS);
    expect(CHAT_COPY).not.toMatch(CUP_NAMES);
    expect(CHAT_COPY).not.toMatch(PICK_WORDS);
    expect(C2).toMatch(/drawn at random on the server at checkout/);
  });

  it('the pick’s helpers are gone from the module', () => {
    for (const name of ['CUP_PICK', 'TEA_CUP_COPY', 'CHAT_CUP', 'CHAT_CUP_REPLIES', 'pickedCup', 'TEA_CUPS', 'TEA_CUP_DEFAULT']) {
      expect(name in booking, name).toBe(false);
    }
  });

  it('the bump as Evelyn’s question, with both answers and the 409 line', () => {
    expect(CHAT_BUMP.body).toBe(
      'I can read your cup a second time, to put twice the strength into your reading. ' +
        'Same reading, same twenty-one days, just working twice as hard for you. Shall I do that?',
    );
    expect(CHAT_BUMP.accept).toBe('Yes, double the strength');
    expect(CHAT_BUMP.decline).toBe('No, just my reading');
    expect(C2).toContain(CHAT_BUMP.body);
    expect(CHAT_BUMP.body.trim().endsWith('?')).toBe(true);
    expect(C2).toContain(`> **${CHAT_BUMP.accept}**`);
    expect(C2).toContain(`> ${CHAT_BUMP.decline}`);
    expect(CHAT_BUMP.priceLine).toBe('+ $12.77');
    expect(C2).toContain(`*${chatPriceChangedNotice('{{NEW_PRICE}}')}*`);
  });

  it('a refresh is not a return; only the checkout round-trip says nothing was taken', () => {
    expect(CHAT_RESUME.refreshed.join(' ')).not.toMatch(/again|back|taken/i);
    expect(CHAT_RESUME.cancelled.join(' ')).toMatch(/Nothing has been taken/);
  });
});

describe('04 copy rules', () => {
  const ALL = `${PAGE_COPY} ${CHAT_COPY}`;

  it('no price but the bump’s: her arm’s price is printed from the server, never typed', () => {
    const dollars = ALL.match(/\$\d[\d.,]*/g) ?? [];
    expect(new Set(dollars)).toEqual(new Set(['$12.77']));
  });

  it('timing: only "within 24 hours" about the reading — no tonight, tomorrow, by morning or weekdays', () => {
    expect(ALL).toMatch(/24 hours/);
    expect(ALL).not.toMatch(/tonight|tomorrow|by morning|overnight|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
  });

  it('⭐ the bump is intangible: nothing to open, download or wait for — and no Still Cup', () => {
    const bump = JSON.stringify({ BUMP, CHAT_BUMP });
    expect(bump).not.toMatch(/still cup|link|email|download|page|every evening|four minutes|tonight/i);
    expect(bump).toMatch(/a second time/);
    expect(ALL).not.toMatch(/still cup/i);
    expect('TEA_READING_STILL_CUP_PATH' in booking).toBe(false);
  });

  it('none of 04’s banned words, and never "buy"', () => {
    expect(ALL).not.toMatch(/open communication|seek guidance|embrace growth|clearing|energy field|our conversation/i);
    expect(ALL).not.toMatch(/\bbuy\b/i);
  });

  it('page voice: Evelyn is named in the third person, never speaks', () => {
    const page = JSON.stringify({ PAGE_HEADER, CHECK_LINES, WHAT_YOU_GET, BUMP });
    expect(page).not.toMatch(/\b(I'll|I've|I am|I will) (read|turn|send)/);
    expect(page).toContain('Evelyn');
  });

  it('British spelling where it shows', () => {
    expect(ALL).not.toMatch(/\bcolor|favorite|realize|apologize\b/i);
  });
});

describe('the bump and the total', () => {
  it('bump price is the catalog’s', () => {
    expect(BACKEND_OFFER_CATALOG['tea-reading'].bump?.cents).toBe(TEA_READING_BUMP_CENTS);
    expect(TEA_READING_BUMP_CENTS).toBe(1277);
  });

  it('total = her arm’s price, plus $12.77 only while the bump is ticked', () => {
    expect(teaReadingTotalCents(TEA_READING_PRICE_ARMS.A, false)).toBe(3500);
    expect(teaReadingTotalCents(TEA_READING_PRICE_ARMS.A, true)).toBe(4777);
    expect(teaReadingTotalCents(TEA_READING_PRICE_ARMS.B, false)).toBe(4500);
    expect(teaReadingTotalCents(TEA_READING_PRICE_ARMS.B, true)).toBe(5777);
  });
});

describe('teaReadingCheckoutRequest', () => {
  const base = {
    treatment: 'page' as const,
    firstName: 'Sarah',
    letterCode: '61',
    bump: false,
    quote: { arm: 'B' },
  };

  it('is the tea-reading offer, carrying name, letter code and quotedArm — and NO price, NO cup', () => {
    const req = teaReadingCheckoutRequest(base);
    expect(req).toEqual({
      offer: 'tea-reading',
      treatment: 'page',
      bump: false,
      firstName: 'Sarah',
      letterCode: '61',
      quotedArm: 'B',
    });
    expect('quotedDay' in req).toBe(false);
    expect('amountCents' in req).toBe(false);
    expect('tier' in req).toBe(false);
    expect('cup' in req).toBe(false);
  });

  it('carries the chat treatment when the chat sends it (so a cancel returns to the chat)', () => {
    expect(teaReadingCheckoutRequest({ ...base, treatment: 'chat' }).treatment).toBe('chat');
    expect(BACKEND_OFFER_CATALOG['tea-reading'].bookingPath).toEqual({
      page: '/offers/wiccan/tea-reading',
      chat: '/offers/wiccan/tea-reading/chat',
    });
  });

  it('bump: true only for a literal true', () => {
    expect(teaReadingCheckoutRequest({ ...base, bump: true }).bump).toBe(true);
    expect(teaReadingCheckoutRequest({ ...base, bump: 'yes' as never }).bump).toBe(false);
  });

  it('quotedArm is the arm the screen printed; no price yet → null (the server answers 409 with its price)', () => {
    expect(teaReadingCheckoutRequest({ ...base, quote: { arm: 'A' } }).quotedArm).toBe('A');
    expect(teaReadingCheckoutRequest({ ...base, quote: null }).quotedArm).toBeNull();
    expect(teaReadingCheckoutRequest({ ...base, quote: { arm: '' } }).quotedArm).toBeNull();
    expect(teaReadingCheckoutRequest({ ...base, quote: { arm: 3 } as never }).quotedArm).toBeNull();
  });

  it('⛔ never sends a cup, even if a caller hands it one — the server draws it', () => {
    const req = teaReadingCheckoutRequest({ ...base, cup: 'sunken-leaf' } as never);
    expect('cup' in req).toBe(false);
    expect(JSON.stringify(req)).not.toMatch(/sunken-leaf/);
  });

  it('passes a missing name or letter code through as null', () => {
    const req = teaReadingCheckoutRequest({ ...base, firstName: null, letterCode: null });
    expect(req.firstName).toBeNull();
    expect(req.letterCode).toBeNull();
  });
});

describe('priceQuoteUrl', () => {
  it('asks for her arm’s price with her visitor id', () => {
    expect(priceQuoteUrl('tea-reading', 'visitor-1')).toBe('/api/backend/offers/tea-reading/price?subject=visitor-1');
    expect(priceQuoteUrl('tea-reading', 'visitor-1', '?c=61&fn=Sarah')).toBe('/api/backend/offers/tea-reading/price?subject=visitor-1');
    expect(priceQuoteUrl('tea-reading', 'v ✓&x=1')).toBe('/api/backend/offers/tea-reading/price?subject=v+%E2%9C%93%26x%3D1');
  });

  it('passes a page’s ?arm=A|B through for previews (any case), and nothing else', () => {
    expect(priceQuoteUrl('tea-reading', 'v', '?arm=B&c=61')).toBe('/api/backend/offers/tea-reading/price?subject=v&arm=B');
    expect(priceQuoteUrl('tea-reading', 'v', '?arm=a')).toBe('/api/backend/offers/tea-reading/price?subject=v&arm=A');
    for (const arm of ['C', 'AB', '1', '', '4500']) {
      expect(priceQuoteUrl('tea-reading', 'v', `?arm=${arm}`), arm).toBe('/api/backend/offers/tea-reading/price?subject=v');
    }
    // The retired ladder preview is not forwarded.
    expect(priceQuoteUrl('tea-reading', 'v', '?day=3')).toBe('/api/backend/offers/tea-reading/price?subject=v');
  });
});

describe('parsePriceQuote / fetchPriceQuote', () => {
  const body = { offer: 'tea-reading', arm: 'B', cents: 4500, label: '$45' };

  it('turns the endpoint’s body into a quote, re-printing the label from the cents', () => {
    expect(parsePriceQuote(body, 'tea-reading')).toEqual({ arm: 'B', cents: 4500, label: '$45', preview: false });
    expect(parsePriceQuote({ ...body, label: 'FREE' }, 'tea-reading')?.label).toBe('$45');
    expect(parsePriceQuote({ ...body, arm: 'A', cents: 3500, preview: true }, 'tea-reading')).toEqual({
      arm: 'A', cents: 3500, label: '$35', preview: true,
    });
  });

  it('refuses another offer’s body, an old ladder body, or one without an arm and positive cents', () => {
    expect(parsePriceQuote({ ...body, offer: 'judgement-day' }, 'tea-reading')).toBeNull();
    expect(parsePriceQuote({ offer: 'tea-reading', day: 2, cents: 4700, label: '$47', startSet: true }, 'tea-reading')).toBeNull();
    expect(parsePriceQuote({ ...body, arm: '' }, 'tea-reading')).toBeNull();
    expect(parsePriceQuote({ ...body, arm: 'B; drop' }, 'tea-reading')).toBeNull();
    expect(parsePriceQuote({ ...body, cents: -1 }, 'tea-reading')).toBeNull();
    expect(parsePriceQuote({ ...body, cents: '4500' }, 'tea-reading')).toBeNull();
    expect(parsePriceQuote(null, 'tea-reading')).toBeNull();
  });

  it('fetch: ok → the quote; a 404, a bad body or offline → error, never a guess', async () => {
    const ok: QuoteFetch = async () => ({ ok: true, json: async () => body });
    expect(await fetchPriceQuote('tea-reading', 'v', '', ok)).toEqual({
      kind: 'ok',
      quote: { arm: 'B', cents: 4500, label: '$45', preview: false },
    });
    const notFound: QuoteFetch = async () => ({ ok: false, json: async () => ({ error: 'nope' }) });
    expect(await fetchPriceQuote('tea-reading', 'v', '', notFound)).toEqual({ kind: 'error' });
    const junk: QuoteFetch = async () => ({ ok: true, json: async () => ({ hello: 1 }) });
    expect(await fetchPriceQuote('tea-reading', 'v', '', junk)).toEqual({ kind: 'error' });
    const offline: QuoteFetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(await fetchPriceQuote('tea-reading', 'v', '', offline)).toEqual({ kind: 'error' });
  });

  it('fetch: asks the URL with her visitor id and the preview arm', async () => {
    let asked = '';
    const spy: QuoteFetch = async (url) => {
      asked = url;
      return { ok: true, json: async () => body };
    };
    await fetchPriceQuote('tea-reading', 'visitor-9', '?arm=B', spy);
    expect(asked).toBe('/api/backend/offers/tea-reading/price?subject=visitor-9&arm=B');
  });
});

describe('parsePriceChanged — checkout’s 409', () => {
  const moved = {
    error: 'The price has changed since this page was opened. Please check it and press the button again.',
    code: 'price_changed',
    current: { arm: 'B', cents: 4500, label: '$45' },
  };

  it('a 409 price_changed → the server’s price, ready to print and to re-send as quotedArm', () => {
    expect(parsePriceChanged(409, moved)).toEqual({ arm: 'B', cents: 4500, label: '$45', preview: false });
  });

  it('anything else is not a price change', () => {
    expect(parsePriceChanged(400, moved)).toBeNull();
    expect(parsePriceChanged(200, { url: 'https://checkout.stripe.com/x' })).toBeNull();
    expect(parsePriceChanged(409, { ...moved, code: 'conflict' })).toBeNull();
    expect(parsePriceChanged(409, { ...moved, current: { arm: 'B' } })).toBeNull();
    // An old ladder-shaped 409 (a day, no arm) is not one either.
    expect(parsePriceChanged(409, { ...moved, current: { day: 3, cents: 5700, label: '$57' } })).toBeNull();
    expect(parsePriceChanged(409, { code: 'price_changed' })).toBeNull();
    expect(parsePriceChanged(409, null)).toBeNull();
  });

  it('the notices name the server’s price and ask her to press again — and never say "today" or "went up"', () => {
    expect(pagePriceChangedNotice('$45')).toBe(
      'The price is now $45. It changed while this page was open. Press TURN MY CUP again to go on at $45.',
    );
    expect(chatPriceChangedNotice('$45')).toBe(
      'The price moved to $45 while we were talking. Press your answer again to go on at $45.',
    );
    for (const notice of [pagePriceChangedNotice('$35'), chatPriceChangedNotice('$35')]) {
      expect(notice).not.toMatch(/today|went up|rung/i);
    }
  });
});

describe('the retired ladder client is gone', () => {
  it('no ladderPrice module, no ladder helpers on the booking module', async () => {
    const modules = import.meta.glob('./*.ts');
    expect(Object.keys(modules)).not.toContain('./ladderPrice.ts');
    expect(Object.keys(modules)).toContain('./teaReadingPrice.ts');
    for (const name of ['RUNG_TOKEN', 'WHY_THE_PRICE']) expect(name in booking, name).toBe(false);
  });
});
