// Offer 12 — Lucky Numbers: the standalone ESL web page (SalesPage.tsx). Source-level checks, like
// luckyNumbersBooking.test.ts — they lock the two things that silently break money if they drift:
// the CTA must forward the reader's ?fn=/?c=/utm_* to the booking page, and the page must be ARM A
// (never a hardcoded c=, never arm B's copy), because arm B has never been mailed.
//
//   npx vitest run client/src/lib/luckyNumbersSalesPage.test.ts

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const file = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8')
// Normalise typographic quotes too — the page uses curly ’ / “ ”, the .md source uses straight.
const flat = (s: string) =>
  s.replace(/[`*]/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ')

const PAGE = file('../pages/offers/lucky-numbers/SalesPage.tsx')
const APP = file('../App.tsx')
const ESL_A = flat(file('../../../improve-v1/v1-one-time-BEs/docs/12/sales-emails/12-E2-esl-A.md'))

describe('the CTA hands off to the existing booking flow, unchanged', () => {
  it('every CTA targets the booking page carrying the whole query string (?fn=/?c=/utm_*)', () => {
    // bookingHref = `/numerology/lucky-numbers${search}`, search = window.location.search.
    expect(PAGE).toContain('window.location.search')
    expect(PAGE).toContain('/numerology/lucky-numbers${search}')
    // Every CTA/Link uses bookingHref — no CTA builds its own path.
    expect(PAGE).toContain('href={bookingHref}')
  })

  it('reads ?fn= the same way the booking page does', () => {
    expect(PAGE).toContain("import { bookingFirstName } from '@/lib/funnel'")
  })

  it('carries NO checkout logic — it is a link page, not a form', () => {
    expect(PAGE).not.toContain('beginBackendCheckout')
    expect(PAGE).not.toContain('backendCheckout')
  })

  it('never hardcodes a ?c= — the reader’s own arm code must ride through', () => {
    // A literal ?c=<n> in a CTA would overwrite her attribution. There must be none.
    expect(PAGE).not.toMatch(/\?c=\d/)
  })
})

describe('it serves ARM A only', () => {
  it('shows arm A’s promise and lottery bullet', () => {
    expect(PAGE).toContain('small miracles in 2027')
    expect(PAGE).toContain('a scratch card that pays back')
  })

  it('shows none of arm B’s copy', () => {
    // Arm B = "the hand-over list" / "I'm not promising you a win" / codes c=11…15.
    expect(PAGE).not.toContain('not promising you a win')
    expect(PAGE).not.toContain('hand you the six numbers')
    expect(PAGE).not.toMatch(/c=1[1-5]/)
  })

  it('the letter’s words come from 12-E2-esl-A.md', () => {
    for (const line of [
      'Your lucky numbers are going to bring you small miracles in 2027.',
      'A small miracle isn’t the jackpot.',
      'On an open day, small miracles find you easily.',
      'the raffle at the fair, a scratch card that pays back, a draw that finally goes your way',
    ]) {
      expect(ESL_A).toContain(flat(line))
    }
  })
})

describe('the route is wired so lander_view fires for luckynumbers', () => {
  it('is registered at /letter, under the prefix, BEFORE the booking root', () => {
    const letter = APP.indexOf('path="/numerology/lucky-numbers/letter"')
    const booking = APP.indexOf('path="/numerology/lucky-numbers"')
    expect(letter).toBeGreaterThan(-1)
    expect(APP).toContain('component={LuckyNumbersSalesPage}')
    // Specific before root, so wouter matches /letter before the booking page.
    expect(letter).toBeLessThan(booking)
  })

  it('the catalog points at it, so the offer knows its own sales page', () => {
    const catalog = file('../../../shared/backendOffers.ts')
    expect(catalog).toContain("salesPagePath: '/numerology/lucky-numbers/letter'")
  })
})
