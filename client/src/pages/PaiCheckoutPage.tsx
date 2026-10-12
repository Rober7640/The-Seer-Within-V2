/**
 * `<funnel>/checkout` — the Payments.AI checkout page of the live gateway split.
 *
 * The counterpart of Stripe's hosted checkout: a Stripe-arm buyer is redirected to
 * Stripe, a Payments.AI-arm buyer is redirected here. Same shape as Stripe's page —
 * the order itemised (offer + order bump), then her card, phone and the SMS question
 * — and on success the same next page, `<funnel>/welcome1?session_id=…`.
 *
 * The order comes from this tab's sessionStorage (lib/paiCheckout.ts), put there by
 * the chat. Opened any other way it has nothing to sell and says so.
 *
 * Also finishes a 3DS purchase: her bank sends her back here with ?paiReturn=1.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CosmicBackground } from '../components/CosmicBackground';
import { PaiCardForm, type PaiCardSubmit, type PaiFormConfig } from '../components/PaiCardForm';
import {
  clearPaiOrder,
  clearPending3ds,
  readPaiOrder,
  readPending3ds,
  savePending3ds,
  type PaiCheckoutOrder,
} from '@/lib/paiCheckout';
import { funnelPath } from '@/lib/funnel';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface PayResponse {
  ok: boolean;
  redirect?: string;
  needs3ds?: boolean;
  approvalLink?: string;
  transactionId?: string;
  declined?: boolean;
  stillWaiting?: boolean;
  error?: string;
}

export default function PaiCheckoutPage() {
  const [order] = useState<PaiCheckoutOrder | null>(() => readPaiOrder());
  const isReturn = new URLSearchParams(window.location.search).get('paiReturn') === '1';
  const [config, setConfig] = useState<PaiFormConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(isReturn);
  const fellBack = useRef(false);

  const backUrl = order?.backUrl ?? `${funnelPath('/chat')}?cancelled=true`;

  useEffect(() => {
    if (!order) return;
    const q = order.funnel ? `?funnel=${encodeURIComponent(order.funnel)}` : '';
    fetch(`/api/pai-live/config${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config ${r.status}`))))
      .then((c: PaiFormConfig) => setConfig(c))
      .catch((err) => fallBackToStripe(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from her bank's 3DS check.
  useEffect(() => {
    if (!isReturn || !order) {
      setConfirming(false);
      return;
    }
    const pending = readPending3ds();
    if (!pending) {
      setConfirming(false);
      return;
    }
    let tries = 0;
    const finish = async () => {
      tries++;
      try {
        const res = await fetch('/api/pai-live/checkout/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderToken: order.orderToken,
            transactionId: pending.transactionId,
            phone: pending.phone,
            ...(pending.smsConsent ? { smsConsent: pending.smsConsent } : {}),
          }),
        });
        const data: PayResponse = await res.json();
        if (data.ok && data.redirect) {
          clearPending3ds();
          clearPaiOrder();
          window.location.href = data.redirect;
          return;
        }
        if (data.stillWaiting && tries < 5) {
          setTimeout(finish, 2000);
          return;
        }
        clearPending3ds();
        setError(data.error ?? 'Your payment could not be completed. Please try again.');
      } catch {
        setError('We could not confirm your payment. Please refresh this page.');
      }
      setConfirming(false);
    };
    void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The card form could not load: send her to Stripe rather than lose the sale. */
  async function fallBackToStripe(err: unknown) {
    if (!order || fellBack.current) return;
    fellBack.current = true;
    console.warn('[pai] card form unavailable — falling back to Stripe:', err);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order.stripeFallbackBody, forceStripe: true }),
      });
      const { url } = await res.json();
      if (url) {
        clearPaiOrder();
        window.location.href = url;
        return;
      }
    } catch {
      /* fall through */
    }
    setError('We could not load the payment form. Please refresh the page and try again.');
  }

  async function pay(s: PaiCardSubmit) {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pai-live/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderToken: order.orderToken,
          cardToken: s.cardToken,
          phone: s.phone,
          ...(s.smsConsent ? { smsConsent: s.smsConsent } : {}),
        }),
      });
      const data: PayResponse = await res.json();
      if (data.ok && data.redirect) {
        clearPaiOrder();
        window.location.href = data.redirect;
        return;
      }
      if (data.needs3ds && data.approvalLink && data.transactionId) {
        const saved = savePending3ds({
          transactionId: data.transactionId,
          phone: s.phone,
          smsConsent: s.smsConsent,
        });
        if (!saved) {
          setError('Your browser blocked a step this card needs. Please try a different card.');
          setBusy(false);
          return;
        }
        window.location.href = data.approvalLink;
        return;
      }
      setError(data.error ?? 'Your payment could not be completed. Please try again.');
    } catch {
      setError('Your payment could not be completed. Please check your connection and try again.');
    }
    setBusy(false);
  }

  return (
    <div className="min-h-dvh relative flex items-start justify-center p-4 sm:items-center" data-testid="page-pai-checkout">
      <CosmicBackground />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#140c24]/95 p-5 text-white shadow-2xl">
        {!order ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-white/80">This checkout has expired. Please go back to your reading and try again.</p>
            <a href={backUrl} className="text-purple-300 underline">Back to the reading</a>
          </div>
        ) : confirming ? (
          <div className="flex items-center justify-center gap-2 py-10 text-white/70" data-testid="pai-confirming">
            <Loader2 className="h-5 w-5 animate-spin" /> Confirming your payment…
          </div>
        ) : (
          <>
            <a
              href={backUrl}
              className="mb-3 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80"
              data-testid="pai-back"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </a>
            <div className="mb-1 text-lg font-semibold">Complete your order</div>
            {order.email && <div className="mb-4 text-xs text-white/50">{order.email}</div>}

            <div className="mb-5 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm" data-testid="pai-order-summary">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">{order.productName}</div>
                  {order.productDescription && (
                    <div className="text-xs text-white/50">{order.productDescription}</div>
                  )}
                </div>
                <div className="whitespace-nowrap">{money(order.mainCents)}</div>
              </div>
              {order.bumpCents > 0 && (
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{order.bumpName ?? 'Second reading'}</div>
                    {order.bumpDescription && (
                      <div className="text-xs text-white/50">{order.bumpDescription}</div>
                    )}
                  </div>
                  <div className="whitespace-nowrap">{money(order.bumpCents)}</div>
                </div>
              )}
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
                <span>Total due today</span>
                <span data-testid="pai-total">{money(order.totalCents)}</span>
              </div>
            </div>

            {config ? (
              <PaiCardForm
                config={config}
                amountCents={order.totalCents}
                submitLabel={`Pay ${money(order.totalCents)}`}
                askPhone
                defaultName={order.firstName}
                busy={busy}
                error={error}
                onSubmit={pay}
                onBootFailed={fallBackToStripe}
              />
            ) : error ? (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
            ) : (
              <div className="flex items-center gap-2 py-6 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading secure checkout…
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
