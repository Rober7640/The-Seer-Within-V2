/**
 * /pai/pay — pay for an upsell with a card, on a Payments.AI order.
 *
 * The Payments.AI counterpart of the HOSTED Stripe checkout a declined 1-click
 * upsell is sent to: when the saved card is refused, /api/upsell/fallback-checkout
 * sends a Payments.AI order here instead of to Stripe. She enters a card (and her
 * shipping address — it is a physical product), and continues to the same next page
 * Stripe's fallback would have sent her to.
 *
 * Reached only by Payments.AI orders (`?order=txn_…`). Stripe buyers never see it.
 */
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CosmicBackground } from '../components/CosmicBackground';
import {
  PaiCardForm,
  type PaiCardSubmit,
  type PaiFormConfig,
  type ShippingAddress,
} from '../components/PaiCardForm';

interface UpsellInfo {
  step: 'upsell1' | 'upsell2';
  type: 'full' | 'downsell';
  productName: string;
  cents: number;
  alreadyPurchased: boolean;
  needsShipping: boolean;
  next: string;
  skip: string;
}

const PENDING_KEY = 'pai-live-upsell-3ds';

interface Pending {
  orderId: string;
  step: string;
  type: string;
  transactionId: string;
  shipping?: ShippingAddress;
}

function readPending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PaiPayPage() {
  const params = new URLSearchParams(window.location.search);
  const isReturn = params.get('paiReturn') === '1';
  // Back from her bank the URL carries only ?paiReturn=1 (Payments.AI refuses a longer
  // redirect URL), so the order comes from what this tab stored before leaving.
  const [pendingAtLoad] = useState<Pending | null>(() => (isReturn ? readPending() : null));
  const orderId = params.get('order') ?? pendingAtLoad?.orderId ?? '';
  const step = params.get('step') ?? pendingAtLoad?.step ?? '';
  const type = (params.get('type') ?? pendingAtLoad?.type) === 'downsell' ? 'downsell' : 'full';

  const [info, setInfo] = useState<UpsellInfo | null>(null);
  const [config, setConfig] = useState<PaiFormConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(isReturn);

  useEffect(() => {
    (async () => {
      try {
        const q = new URLSearchParams({ order: orderId, step, type });
        const r = await fetch(`/api/pai-live/upsell/info?${q.toString()}`);
        if (!r.ok) throw new Error('not found');
        const i: UpsellInfo = await r.json();
        setInfo(i);
        if (i.alreadyPurchased && !isReturn) {
          window.location.href = i.next;
          return;
        }
        if (!isReturn) {
          const c = await fetch('/api/pai-live/config');
          if (!c.ok) throw new Error('config');
          setConfig(await c.json());
        }
      } catch {
        setFatal('We could not load this payment page. Please contact support if you were charged.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from a 3DS challenge.
  useEffect(() => {
    if (!isReturn) return;
    const pending = pendingAtLoad;
    if (!pending || pending.orderId !== orderId) {
      setConfirming(false);
      setFatal('We could not confirm this payment in this browser tab. Please contact support if you were charged.');
      return;
    }
    let tries = 0;
    const finish = async () => {
      tries++;
      const res = await fetch('/api/pai-live/upsell/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          step,
          transactionId: pending!.transactionId,
          shipping: pending!.shipping,
        }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => null) : null;
      if (data?.ok && data.redirect) {
        try {
          sessionStorage.removeItem(PENDING_KEY);
        } catch {
          /* ignore */
        }
        window.location.href = data.redirect;
        return;
      }
      if (data?.stillWaiting && tries < 5) {
        setTimeout(finish, 2000);
        return;
      }
      setConfirming(false);
      setError(data?.error ?? 'Your payment could not be completed. Please try again.');
      // Let her try again with a card.
      const c = await fetch('/api/pai-live/config').catch(() => null);
      if (c?.ok) setConfig(await c.json());
    };
    void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pay(s: PaiCardSubmit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pai-live/upsell/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, step, type, cardToken: s.cardToken, shipping: s.shipping }),
      });
      const data = await res.json();
      if (data.ok && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
      if (data.needs3ds && data.approvalLink && data.transactionId) {
        try {
          sessionStorage.setItem(
            PENDING_KEY,
            JSON.stringify({ orderId, step, type, transactionId: data.transactionId, shipping: s.shipping }),
          );
        } catch {
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
    <div className="min-h-dvh relative flex items-start justify-center p-4 sm:items-center" data-testid="page-pai-pay">
      <CosmicBackground />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#140c24]/95 p-5 text-white shadow-2xl">
        {fatal ? (
          <p className="text-center text-white/80">{fatal}</p>
        ) : !info || confirming ? (
          <div className="flex items-center justify-center gap-2 py-8 text-white/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            {confirming ? 'Confirming your payment…' : 'Loading…'}
          </div>
        ) : (
          <>
            <div className="mb-1 text-lg font-semibold">Complete your order</div>
            <p className="mb-4 text-sm text-white/60">
              Your saved card could not be used for this one. Please enter a card to finish.
            </p>
            <div className="mb-4 flex justify-between rounded-xl border border-white/10 bg-white/5 p-3 text-sm font-semibold">
              <span>{info.productName}</span>
              <span data-testid="pai-upsell-price">{money(info.cents)}</span>
            </div>
            {config ? (
              <PaiCardForm
                config={config}
                amountCents={info.cents}
                submitLabel={`Pay ${money(info.cents)}`}
                askShipping={info.needsShipping}
                busy={busy}
                error={error}
                onSubmit={pay}
                onBootFailed={() => setError('We could not load the payment form. Please refresh the page.')}
              />
            ) : (
              <div className="flex items-center gap-2 py-4 text-sm text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading secure card form…
              </div>
            )}
            <a href={info.skip} className="mt-4 block text-center text-sm text-white/50 underline" data-testid="pai-skip">
              No thanks, continue
            </a>
          </>
        )}
      </div>
    </div>
  );
}
