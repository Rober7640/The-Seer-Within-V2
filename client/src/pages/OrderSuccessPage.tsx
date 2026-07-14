import { useEffect, useState } from "react";
import { Link } from "wouter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BUSINESS, FULFILMENT } from "@shared/braceletProducts";

// The thank-you page. /order/success?session_id=cs_...
//
// This exists because the first cut of the storefront sent the buyer back to the PRODUCT
// page after paying — a page that ignored the ?purchase=success param entirely. So someone
// would pay $99, get redirected, and land on a page that looked exactly as before. They
// would reasonably conclude the payment failed and try again.
//
// The order details come from OUR server (/api/products/order/:sessionId), which verifies
// payment_status against Stripe. A session id in a query string proves nothing on its own.

interface Order {
  reference: string;
  productSlug: string;
  productName: string;
  quantity: number;
  amountCents: number;
  email: string | null;
  customerName: string | null;
  shipping: string | null;
  status: string;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Order confirmed — The Seer Within";
  }, []);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("session_id");
    if (!sessionId) {
      setError("We couldn't find that order.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products/order/${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data?.order) throw new Error(data?.error || "We couldn't load your order.");
        setOrder(data.order);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "We couldn't load your order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1020] via-[#0F1729] to-[#1B2A4A] font-sans">
      <SiteHeader />

      <main className="mx-auto max-w-[1120px] px-5 py-14">
        <div className="mx-auto max-w-[680px] rounded-3xl bg-slate-50 px-6 py-12 shadow-[0_24px_60px_-28px_rgba(2,6,23,0.55)] md:px-11">
          {loading && (
            <p data-testid="order-loading" className="text-center text-slate-500">
              Confirming your order…
            </p>
          )}

          {!loading && error && (
            <div className="text-center">
              <h1 className="font-serif text-3xl font-semibold text-slate-900">
                We couldn&apos;t find that order
              </h1>
              <p data-testid="order-error" className="mt-3 text-slate-500">{error}</p>
              <p className="mt-4 text-slate-500">
                If you were charged, your payment is safe — email{" "}
                <a href={`mailto:${BUSINESS.email}`} className="font-semibold text-violet-600 hover:underline">
                  {BUSINESS.email}
                </a>{" "}
                or call{" "}
                <a href={BUSINESS.phoneHref} className="font-semibold text-violet-600 hover:underline">
                  {BUSINESS.phone}
                </a>{" "}
                and we will sort it out immediately.
              </p>
              <Link
                href="/home#catalog"
                className="mt-7 inline-block rounded-xl border-[1.5px] border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 hover:border-violet-600 hover:text-violet-600"
              >
                Back to the catalog
              </Link>
            </div>
          )}

          {!loading && order && (
            <div data-testid="order-confirmed">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
                  ✓
                </div>
                <h1 className="font-serif text-[30px] font-semibold text-slate-900 md:text-[38px]">
                  Thank you{order.customerName ? `, ${order.customerName.split(" ")[0]}` : ""}.
                </h1>
                <p className="mt-3 text-slate-500">
                  Your order is confirmed and we&apos;re preparing it now.
                  {order.email && (
                    <> A confirmation is on its way to <strong className="text-slate-700">{order.email}</strong>.</>
                  )}
                </p>
              </div>

              <dl className="mt-9 divide-y divide-slate-200 border-y border-slate-200">
                <div className="flex justify-between gap-4 py-3.5">
                  <dt className="text-slate-500">Order</dt>
                  <dd data-testid="order-ref" className="font-bold text-slate-900">#{order.reference}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3.5">
                  <dt className="text-slate-500">Item</dt>
                  <dd className="text-right text-slate-900">
                    {order.productName} × {order.quantity}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-3.5">
                  <dt className="text-slate-500">Total paid</dt>
                  <dd data-testid="order-total" className="font-bold text-slate-900">{money(order.amountCents)}</dd>
                </div>
                {order.shipping && (
                  <div className="flex justify-between gap-4 py-3.5">
                    <dt className="shrink-0 text-slate-500">Ships to</dt>
                    <dd className="text-right text-slate-900">{order.shipping}</dd>
                  </div>
                )}
              </dl>

              <div className="mt-7 rounded-xl bg-violet-50 px-5 py-4 text-[14.5px] text-slate-600">
                Your order ships within <strong className="text-slate-900">{FULFILMENT.shipsWithin}</strong>,
                and a tracking email follows {FULFILMENT.trackingEmail}. Returns are accepted
                for {FULFILMENT.returnWindowDays} days.
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="/"
                  className="rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 px-7 py-3.5 font-bold text-white shadow-[0_12px_30px_-12px_rgba(124,58,237,0.85)] transition-transform hover:-translate-y-0.5"
                >
                  Begin a Reading
                </a>
                <Link
                  href="/home#catalog"
                  className="rounded-xl border-[1.5px] border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 hover:border-violet-600 hover:text-violet-600"
                >
                  Back to the catalog
                </Link>
              </div>

              <p className="mt-7 text-center text-[13px] text-slate-500">
                Questions? Email{" "}
                <a href={`mailto:${BUSINESS.email}`} className="text-violet-600 hover:underline">{BUSINESS.email}</a>
                {" "}or call{" "}
                <a href={BUSINESS.phoneHref} className="text-violet-600 hover:underline">{BUSINESS.phone}</a>.
              </p>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
