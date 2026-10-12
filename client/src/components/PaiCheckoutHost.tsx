/**
 * The Payments.AI checkout on the chat page — the half of the live split that does
 * NOT redirect to Stripe. Opened by useConversation when /api/checkout answers with
 * a Payments.AI order (lib/paiCheckout.ts); renders nothing otherwise, so Stripe
 * buyers never see it.
 *
 * Also finishes a 3DS purchase: the bank sends her back to <funnel>/chat?paiReturn=1,
 * and this confirms the payment with the server, then continues to /welcome1 exactly
 * as the Stripe redirect does.
 */
import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PaiCardForm, type PaiCardSubmit, type PaiFormConfig } from './PaiCardForm';
import {
  clearPending3ds,
  closePaiCheckout,
  readPending3ds,
  savePending3ds,
  subscribePaiCheckout,
  type PaiCheckoutRequest,
} from '@/lib/paiCheckout';

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

export function PaiCheckoutHost() {
  const [req, setReq] = useState<PaiCheckoutRequest | null>(null);
  const [config, setConfig] = useState<PaiFormConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<null | 'working' | string>(null);
  const fellBack = useRef(false);

  useEffect(() => subscribePaiCheckout(setReq), []);

  // Load the form's config whenever a checkout opens.
  useEffect(() => {
    if (!req) return;
    setError(null);
    setConfig(null);
    fellBack.current = false;
    const q = req.funnel ? `?funnel=${encodeURIComponent(req.funnel)}` : '';
    fetch(`/api/pai-live/config${q}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config ${r.status}`))))
      .then((c: PaiFormConfig) => setConfig(c))
      .catch((err) => fallBackToStripe(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  // Back from a 3DS challenge.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paiReturn') !== '1') return;
    const pending = readPending3ds();
    if (!pending) return;
    setReturning('working');
    let tries = 0;
    const finish = async () => {
      tries++;
      try {
        const res = await fetch('/api/pai-live/checkout/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderToken: pending.orderToken,
            transactionId: pending.transactionId,
            phone: pending.phone,
            ...(pending.smsConsent ? { smsConsent: pending.smsConsent } : {}),
          }),
        });
        const data: PayResponse = await res.json();
        if (data.ok && data.redirect) {
          clearPending3ds();
          window.location.href = data.redirect;
          return;
        }
        if (data.stillWaiting && tries < 5) {
          setTimeout(finish, 2000);
          return;
        }
        clearPending3ds();
        setReturning(data.error ?? 'Your payment could not be completed. Please try again.');
      } catch {
        setReturning('We could not confirm your payment. Please refresh this page.');
      }
    };
    void finish();
  }, []);

  /** The card form could not load: send her to Stripe rather than lose the sale. */
  async function fallBackToStripe(err: unknown) {
    if (!req || fellBack.current) return;
    fellBack.current = true;
    console.warn('[pai] card form unavailable — falling back to Stripe:', err);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req.stripeFallbackBody, forceStripe: true }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return;
      }
    } catch {
      /* fall through */
    }
    setError('We could not load the payment form. Please refresh the page and try again.');
  }

  async function pay(s: PaiCardSubmit) {
    if (!req) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pai-live/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderToken: req.orderToken,
          cardToken: s.cardToken,
          phone: s.phone,
          ...(s.smsConsent ? { smsConsent: s.smsConsent } : {}),
        }),
      });
      const data: PayResponse = await res.json();
      if (data.ok && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.needs3ds && data.approvalLink && data.transactionId) {
        const saved = savePending3ds({
          orderToken: req.orderToken,
          transactionId: data.transactionId,
          phone: s.phone,
          smsConsent: s.smsConsent,
          totalCents: req.totalCents,
          email: req.email,
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

  function cancel() {
    if (busy) return;
    const r = req;
    closePaiCheckout();
    r?.onCancel();
  }

  if (returning) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" data-testid="pai-returning">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#140c24] p-6 text-center text-white">
          {returning === 'working' ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Confirming your payment…
            </div>
          ) : (
            <>
              <p className="mb-4 text-white/80">{returning}</p>
              <button
                className="text-purple-300 underline"
                onClick={() => {
                  setReturning(null);
                  window.history.replaceState(null, '', window.location.pathname);
                }}
              >
                Back to the reading
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!req) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center" data-testid="pai-checkout">
      <div className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#140c24] p-5 text-white sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">Complete your order</div>
            <div className="text-xs text-white/50">{req.email}</div>
          </div>
          <button onClick={cancel} aria-label="Close" className="p-1 text-white/60 hover:text-white" data-testid="pai-close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="flex justify-between">
            <span>{req.productName}</span>
            <span>{money(req.mainCents)}</span>
          </div>
          {req.bumpCents > 0 && (
            <div className="flex justify-between text-white/80">
              <span>{req.bumpName ?? 'Second reading'}</span>
              <span>{money(req.bumpCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-1 font-semibold">
            <span>Total</span>
            <span data-testid="pai-total">{money(req.totalCents)}</span>
          </div>
        </div>

        {config ? (
          <PaiCardForm
            config={config}
            amountCents={req.totalCents}
            submitLabel={`Pay ${money(req.totalCents)}`}
            askPhone
            defaultName={req.firstName}
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
      </div>
    </div>
  );
}
