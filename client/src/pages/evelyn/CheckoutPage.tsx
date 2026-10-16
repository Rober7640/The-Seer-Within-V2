import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { stoneLabel, DELIVERY_PROMISE, type StoneKey } from '@shared/evelynVsl';
import { SOULMATE_INITIALS_PRICE_CENTS, SOULMATE_INITIALS_BUMP_CENTS } from '@shared/backendOffers';
import { beginBackendCheckout } from '@/lib/backendCheckout';
import { trackInitiateCheckout } from '@/lib/facebook';
import { track as trackBase } from '@/lib/posthog';
import { resolveStone, validateIntake } from './checkoutIntake';

const STORAGE_KEY = 'evelyn_vsl_v1';
const SUPPORT_EMAIL = 'hi@theseerwithin.com';

// Tag every checkout event funnel=evelynvsl so it groups with the VSL + purchase
// events in PostHog (see backendPurchaseAnalytics for the server-side value).
const trackPH = (event: string, props: Record<string, unknown> = {}) =>
  trackBase(event, { ...props, funnel: 'evelynvsl' });

// Reviews are hidden until real ones exist (spec §4 item 6) — an empty array
// means the block below renders nothing, not a placeholder.
const REVIEWS: Array<{ name: string; quote: string }> = [];

const WHATS_INSIDE = [
  'His initials',
  'Someone new, or someone you already know',
  "Where and when you're likely to meet",
  "What he's like",
  'A picture of your seven-card spread',
  'Ask me questions by email',
];

const FAQS = [
  {
    q: 'Who is Evelyn?',
    a: "Evelyn Cross is the spiritual guide you just watched — she reads your cards and writes every reading herself.",
  },
  {
    q: 'How and when will I get it?',
    a: `Your reading arrives ${DELIVERY_PROMISE}.`,
  },
  {
    q: 'Is there a monthly fee?',
    a: 'No. This is one payment, one time — there is no subscription.',
  },
  {
    q: "What if it doesn't resonate?",
    a: "You're covered by a 60-day money-back guarantee, and you can always email me with questions.",
  },
];

function readQueryStone(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('stone');
  } catch {
    return null;
  }
}

function readStoredStone(): string | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.stone === 'string' ? parsed.stone : null;
  } catch {
    return null;
  }
}

/**
 * Stash the validated first name into the same `evelyn_vsl_v1` blob the stone
 * pick already lives in (spec §6) — ThankYouPage's fulfilment lookup 401s in
 * the browser (n8n's Bearer-gated door) and the `?s=` lookup usually yields
 * nothing, so this is the fallback that lets the thank-you page greet by name
 * on the common path instead of falling all the way back to "dear". Merges
 * onto the existing object so `stone`/`ctaShown`/`pitchPos`/etc. survive;
 * tolerant of a missing or malformed existing value, like the readers above.
 */
function storeFirstName(firstName: string): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let existing: Record<string, unknown> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') existing = parsed;
      } catch {
        existing = {};
      }
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, firstName }));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — non-fatal.
  }
}

/**
 * /evelyn/checkout — the Soulmate Initials Reading sales page + intake pop-up
 * (spec §4). Mia's structure, our words: no countdown, no pre-ticked add-on,
 * no subscription language, "cards" never "tarot".
 */
export default function CheckoutPage() {
  const stone = useMemo<StoneKey | null>(
    () => resolveStone(readQueryStone(), readStoredStone()),
    [],
  );
  const stoneAddOnLabel = stoneLabel(stone);

  const [showStickyBar, setShowStickyBar] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bump, setBump] = useState(false); // ⛔ never pre-ticked (negative option)
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Your Soulmate Initials Reading — The Seer Within';
    trackPH('checkout_view', { stone });
  }, [stone]);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Re-arm the button if Stripe's Back returns this page from the bfcache mid-redirect.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const openPopup = useCallback(() => {
    setFieldError(null);
    setSubmitError(null);
    setPopupOpen(true);
  }, []);

  const closePopup = useCallback(() => {
    if (busy) return;
    setPopupOpen(false);
  }, [busy]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (busy) return;

      const result = validateIntake({ email, firstName, dateOfBirth });
      if (!result.ok) {
        setFieldError({ field: result.field, message: result.message });
        return; // no network call on a failed validation
      }
      setFieldError(null);
      setSubmitError(null);
      setBusy(true);
      storeFirstName(firstName);

      const priceCents = bump ? SOULMATE_INITIALS_PRICE_CENTS + SOULMATE_INITIALS_BUMP_CENTS : SOULMATE_INITIALS_PRICE_CENTS;
      trackPH('checkout_initiated', { price_cents: priceCents, bump });
      trackInitiateCheckout(priceCents / 100, 'USD', 'Soulmate Initials Reading');

      const outcome = await beginBackendCheckout({
        offer: 'soulmate-initials',
        treatment: 'page',
        bump,
        firstName,
        email,
        dateOfBirth,
        stone: stone ?? undefined,
      });

      if (outcome.status === 'error') {
        setSubmitError('Something went wrong — please try again.');
        setBusy(false);
        return;
      }
      if (outcome.status !== 'redirecting') {
        setBusy(false);
      }
    },
    [busy, email, firstName, dateOfBirth, bump, stone],
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-purple-950 via-purple-900 to-black">
      {/* Sticky top bar — appears on scroll, same CTA as the hero. */}
      {showStickyBar && (
        <div
          className="fixed top-0 inset-x-0 z-40 bg-purple-950/95 backdrop-blur border-b border-purple-400/30 px-4 py-2.5 flex items-center justify-between"
          data-testid="sticky-checkout-bar"
        >
          <span className="text-white text-sm font-medium truncate pr-3">
            Soulmate Initials Reading — <span className="line-through opacity-60">$74</span> $19
          </span>
          <button
            type="button"
            onClick={openPopup}
            data-testid="button-sticky-get-reading"
            className="shrink-0 rounded-md bg-purple-500 hover:bg-purple-400 transition-colors text-white font-semibold text-sm py-2 px-4"
          >
            Get my reading
          </button>
        </div>
      )}

      <div className="max-w-md mx-auto px-4 py-10">
        {/* 1. Headline + product image placeholder (operator open item #5). */}
        <header className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-white mb-3" data-testid="text-checkout-headline">
            Your Soulmate Initials Reading is almost ready.
          </h1>
          <div
            className="mx-auto w-full aspect-[4/5] max-w-xs rounded-xl border border-dashed border-purple-400/40 bg-purple-950/60 flex items-center justify-center text-purple-300/70 text-sm"
            data-testid="placeholder-product-image"
          >
            [ product image — Evelyn with the cards ]
          </div>
        </header>

        {/* 2. Offer box. */}
        <section
          className="rounded-2xl bg-white/97 p-6 shadow-2xl ring-1 ring-white/20 mb-6"
          data-testid="section-offer"
        >
          <p className="text-gray-900 font-serif text-lg mb-1">Soulmate Initials Reading</p>
          <p className="text-gray-600 text-sm mb-4">+ Heart Block Reading + Past Love Reading</p>
          <p className="text-center mb-4">
            <span className="line-through text-gray-400 mr-2">$74</span>
            <span className="text-3xl font-serif text-gray-900" data-testid="text-price">$19</span>
            <span className="block text-gray-500 text-sm mt-1">today · one payment · no subscription</span>
          </p>
          <button
            type="button"
            onClick={openPopup}
            data-testid="button-get-reading"
            className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-4 px-4 shadow-lg hover:shadow-xl transition-all"
          >
            Get my reading
          </button>
        </section>

        {/* 3. What's inside. */}
        <section className="mb-6" data-testid="section-whats-inside">
          <h2 className="text-white font-serif text-lg mb-3">What's inside</h2>
          <ul className="space-y-2">
            {WHATS_INSIDE.map((line) => (
              <li key={line} className="flex items-start gap-2 text-purple-100 text-sm">
                <span className="text-purple-400 mt-0.5">✦</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Guarantee. */}
        <section
          className="mb-6 rounded-xl border border-purple-400/30 bg-purple-950/50 p-5 text-center"
          data-testid="section-guarantee"
        >
          <p className="text-white font-serif text-base mb-1">60-Day Money-Back Guarantee</p>
          <p className="text-purple-200 text-sm">
            If your reading doesn't resonate, email us within 60 days for a full refund.
          </p>
        </section>

        {/* 5. FAQ. */}
        <section className="mb-6" data-testid="section-faq">
          <h2 className="text-white font-serif text-lg mb-3">Questions</h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} data-testid={`faq-${q}`}>
                <p className="text-purple-100 font-medium text-sm mb-1">{q}</p>
                <p className="text-purple-300 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Reviews — hidden until real reviews exist. */}
        {REVIEWS.length > 0 && (
          <section className="mb-6" data-testid="section-reviews">
            {REVIEWS.map((r) => (
              <div key={r.name}>
                <p>{r.quote}</p>
                <p>{r.name}</p>
              </div>
            ))}
          </section>
        )}

        <div className="mb-8">
          <button
            type="button"
            onClick={openPopup}
            data-testid="button-get-reading-bottom"
            className="w-full rounded-lg bg-purple-500 hover:bg-purple-400 transition-colors text-white font-semibold py-3.5 px-4"
          >
            Get my reading — <span className="line-through opacity-70 mr-1">$74</span> $19
          </button>
        </div>

        {/* 7. Footer. */}
        <footer className="text-center text-purple-300/70 text-xs space-y-2" data-testid="footer-checkout">
          <p>
            Questions?{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-purple-200">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>
            Readings are intended for entertainment purposes only and may not be unique.
          </p>
          <p className="flex justify-center gap-3">
            <Link href="/terms"><span className="hover:text-purple-200 cursor-pointer">Terms</span></Link>
            <span>·</span>
            <Link href="/privacy"><span className="hover:text-purple-200 cursor-pointer">Privacy</span></Link>
            <span>·</span>
            <Link href="/refund"><span className="hover:text-purple-200 cursor-pointer">Refund</span></Link>
          </p>
        </footer>
      </div>

      {/* Pop-up (opens from any "Get my reading" button). */}
      {popupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          data-testid="popup-intake"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={closePopup}
              aria-label="Close"
              data-testid="button-close-popup"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h2 className="font-serif text-xl text-gray-900 mb-4">Get my reading</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="checkout-email" className="block text-sm text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  autoComplete="email"
                />
                {fieldError?.field === 'email' && (
                  <p className="mt-1 text-sm text-red-600" data-testid="error-email" role="alert">
                    {fieldError.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-first-name" className="block text-sm text-gray-700 mb-1">
                  First name
                </label>
                <input
                  id="checkout-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  data-testid="input-first-name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  autoComplete="given-name"
                />
                {fieldError?.field === 'firstName' && (
                  <p className="mt-1 text-sm text-red-600" data-testid="error-first-name" role="alert">
                    {fieldError.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="checkout-dob" className="block text-sm text-gray-700 mb-1">
                  Birth date
                </label>
                <input
                  id="checkout-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  data-testid="input-dob"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
                {fieldError?.field === 'dateOfBirth' && (
                  <p className="mt-1 text-sm text-red-600" data-testid="error-dob" role="alert">
                    {fieldError.message}
                  </p>
                )}
              </div>

              {/* ⛔ Unticked by default — a pre-selected paid add-on is a negative option. */}
              <label className="flex items-start gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3" data-testid="checkbox-bump">
                <input
                  type="checkbox"
                  checked={bump}
                  onChange={() => setBump((v) => !v)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600"
                />
                <span className="text-sm text-gray-700 leading-snug">
                  <strong className="text-amber-900">YES, charge my {stoneAddOnLabel} for me</strong>
                  {' '}— I'll charge your {stoneAddOnLabel.toLowerCase()} under tonight's moon and seal its
                  energy into your reading, doubling its pull toward him.{' '}
                  <strong className="whitespace-nowrap">Only $11.11</strong>
                </span>
              </label>

              {submitError && (
                <p className="text-sm text-red-600 text-center" data-testid="error-submit" role="alert">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="button-continue-checkout"
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold py-3.5 px-4 shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
              >
                Continue to secure payment
              </button>
              <p className="text-center text-xs text-gray-500">
                Card, Apple Pay, or Google Pay — secure checkout.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
